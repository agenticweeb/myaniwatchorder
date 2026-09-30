"use server";

import { z } from "zod";
import { generateIntelligentWatchOrder } from "@/lib/ai/orchestrator";
import { queryAniList, searchAniList } from "@/lib/anilist-client";
import { redis } from "@/lib/redis";
import type { AnimeSearchResult } from "@/types";
import type { WatchOrderResultV2 } from "@/types/intelligent";
import { AniListUnavailableError } from "@/lib/knowledge/relation-graph";
import { findCuratedFranchise, curatedToV2Result } from "@/lib/knowledge/curated-franchises";
import { fetchShelfPage } from "@/lib/discover/shelf-service";
import type { ShelfPageData } from "@/lib/discover/shelf-recipes";

const SearchSchema = z
  .string()
  .trim()
  .min(1, "Query required")
  .max(100, "Query too long");

const DailyScheduleSchema = z.object({
  enabled: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

const CustomScheduleSchema = z.object({
  enabled: z.boolean(),
  monday: DailyScheduleSchema,
  tuesday: DailyScheduleSchema,
  wednesday: DailyScheduleSchema,
  thursday: DailyScheduleSchema,
  friday: DailyScheduleSchema,
  saturday: DailyScheduleSchema,
  sunday: DailyScheduleSchema,
});

const PreferencesSchema = z.object({
  timeBudget: z.enum(["casual", "regular", "dedicated", "binge"]).or(z.string()),
  mood: z.array(z.string()).default(["all"]),
  skipPreference: z.enum([
    "smart-skip",
    "watch-everything",
    "canon-only",
    "skip-all-filler",
  ]),
  includeMovies: z.boolean(),
  includeOVAs: z.boolean(),
  includeSpecials: z.boolean(),
  includeRecaps: z.boolean(),
  preferredPath: z.enum(["release", "chronological", "optimal", "manga"]),
  language: z.enum(["english", "japanese", "both"]),
  customSchedule: CustomScheduleSchema.optional(),
  paceType: z.enum(["duration", "episodes"]).optional(),
  episodesPerDay: z.number().optional(),
});

const GenerateWatchOrderSchema = z.object({
  animeName: z.string().trim().min(1).max(120),
  anilistId: z.number().int().positive().optional(),
  malId: z.number().int().positive().optional(),
  scope: z.enum(["season", "franchise"]).default("franchise"),
  preferences: PreferencesSchema,
});

export type GenerateWatchOrderInput = z.infer<typeof GenerateWatchOrderSchema>;

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type SearchActionResult = ActionResult<AnimeSearchResult[]>;

export type GenerateActionResult = ActionResult<{
  dataV2: WatchOrderResultV2;
  provider: string;
  latency: number;
  debug: unknown;
}>;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join("; ") || "Validation failed";
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function searchAnimeAction(
  query: string
): Promise<SearchActionResult> {
  try {
    const validatedQuery = SearchSchema.parse(query);

    const cacheKey = `search_v2:${validatedQuery.toLowerCase()}`;
    const cached = await redis.get<AnimeSearchResult[]>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for search: ${validatedQuery}`);
      return { success: true, data: cached };
    }

    const anilistResults = await searchAniList(validatedQuery, 8);
    
    if (anilistResults.length === 0) {
      return { success: true, data: [] };
    }

    const list = anilistResults.slice(0, 8);
    
    // FIX: Never cache empty arrays
    if (list.length > 0) {
      await redis.set(cacheKey, list, { ex: 3600 });
    } else {
      await redis.del(cacheKey);
    }
    
    // ANALYTICS: Increment the search term score in a Redis sorted set
    await redis.zincrby("analytics:searches", 1, validatedQuery.toLowerCase());

    return { success: true, data: list };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Search execution failed"),
    };
  }
}

// ── Discover Grid (Phase 2 — paginated + slop mutes) ──────────
// Static, safe GraphQL (no string concatenation). Pagination contract:
// nextPage derives ONLY from pageInfo.hasNextPage (AniList's total/lastPage
// are unreliable by design).
const DISCOVER_QUERY = `
  query(
    $page: Int,
    $perPage: Int,
    $genres: [String],
    $excludedGenres: [String],
    $excludedTags: [String],
    $scoreGreater: Int,
    $yearGreater: FuzzyDateInt,
    $yearLesser: FuzzyDateInt,
    $countryOfOrigin: CountryCode,
    $sort: [MediaSort]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage hasNextPage }
      media(
        type: ANIME
        isAdult: false
        genre_in: $genres
        genre_not_in: $excludedGenres
        tag_not_in: $excludedTags
        averageScore_greater: $scoreGreater
        startDate_greater: $yearGreater
        startDate_lesser: $yearLesser
        countryOfOrigin: $countryOfOrigin
        sort: $sort
      ) {
        id idMal title { english romaji native } format episodes coverImage { large } averageScore description startDate { year } status popularity genres
        relations { edges { relationType } }
      }
    }
  }
`;

const DiscoverFiltersSchema = z.object({
  genres: z.array(z.string()).default([]),
  excludedGenres: z.array(z.string()).default([]),
  excludedTags: z.array(z.string()).default([]),
  minRating: z.number().min(0).max(10).default(0),
  yearEra: z.string().default("All Time"),
  sortBy: z.string().default("popularity"),
  language: z.string().default("All"),
});
const DiscoverPageSchema = z.number().int().min(1).max(100);

export interface DiscoverPageData {
  items: AnimeSearchResult[];
  pageInfo: { currentPage: number; hasNextPage: boolean };
}
export type DiscoverPageResult = ActionResult<DiscoverPageData>;

export async function discoverAnimeAction(
  filters: {
    genres: string[];
    excludedGenres?: string[];
    excludedTags?: string[];
    minRating: number;
    yearEra: string;
    sortBy: string;
    language: string;
  },
  page: number = 1
): Promise<DiscoverPageResult> {
  try {
    // Fail-fast validation, matching this file's other actions
    const f = DiscoverFiltersSchema.parse(filters);
    const pageNo = DiscoverPageSchema.parse(page);

    // v6 key: new page-aware shape — orphaned v5 keys expire naturally within 1h
    const cacheKey = `discover_v6:${JSON.stringify(f)}:${pageNo}`;
    const cached = await redis.get<DiscoverPageData>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for discover filters page ${pageNo}`);
      return { success: true, data: cached };
    }

    // SINGLE-FLIGHT LOCK: prevent stampede on cache miss
    const lockKey = `lock:${cacheKey}`;
    let gotLock = false;
    try {
    gotLock = (await redis.set(lockKey, "1", { nx: true, px: 10000 })) !== null;
    } catch {
      /* Redis failure — proceed without lock */
    }

    if (!gotLock) {
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 300));
        try {
          const retryCached = await redis.get<DiscoverPageData>(cacheKey);
          if (retryCached) {
            console.log(`✅ Cache HIT (after single-flight wait): discover page ${pageNo}`);
            return { success: true, data: retryCached };
          }
        } catch {
          /* ignore */
        }
      }
    }

    const { getEraDates } = await import("@/lib/eras");
    const eraDates = f.yearEra !== "All Time" 
      ? getEraDates(f.yearEra) 
      : { startDateGreater: undefined, startDateLesser: undefined };

    const variables: Record<string, any> = {
      page: pageNo,
      perPage: 25,
      genres: f.genres?.length > 0 && !f.genres.includes("All") 
        ? f.genres 
        : undefined,
      excludedGenres: f.excludedGenres?.length > 0 ? f.excludedGenres : undefined,
      excludedTags: f.excludedTags?.length > 0 ? f.excludedTags : undefined,
      scoreGreater: f.minRating > 0 ? Math.round(f.minRating * 10) : undefined,
      yearGreater: eraDates.startDateGreater,
      yearLesser: eraDates.startDateLesser,
      countryOfOrigin: f.language !== "All" ? f.language : undefined,
      sort: f.sortBy === "score" || f.sortBy === "underrated" 
        ? ["SCORE_DESC", "POPULARITY_DESC"] 
        : f.sortBy === "title" 
          ? ["TITLE_ROMAJI"] 
          : ["POPULARITY_DESC"],
    };

    // Remove undefined values so AniList doesn't receive nulls
    const cleanVariables = Object.fromEntries(
      Object.entries(variables).filter(([, v]) => v !== undefined)
    );

    // Phase 2: hardened fetcher (429 backoff, 5xx retry) instead of raw fetch
    const data = await queryAniList(DISCOVER_QUERY, cleanVariables);
    const pageInfo = data?.Page?.pageInfo ?? {};
    const mediaList = data?.Page?.media || [];

    let mapped: AnimeSearchResult[] = mediaList.map((item: any) => ({
      malId: item.idMal || item.id,
      anilistId: item.id,
      title: item.title?.english || item.title?.romaji || item.title?.native,
      titleJapanese: item.title?.native,
      imageUrl: item.coverImage?.large || "",
      type: item.format,
      episodes: item.episodes,
      score: (item.averageScore || 0) / 10,
      synopsis: item.description?.replace(/<[^>]*>/g, "") || "",
      genres: item.genres || [], // FIX: Stop dropping genres
      aired: item.startDate?.year ? `${item.startDate.year}` : "",
      status: item.status || undefined, // FIX: Null-safe status fallback
      isFranchise: (item.relations?.edges?.length || 0) > 0,
      popularity: item.popularity || 0,
    }));

    // Per-page penalty re-sort (preserved behavior). With pagination the
    // global order remains AniList's SCORE_DESC; the penalty reorders each page.
    if (f.sortBy === "underrated") {
      const { computeGemScore } = await import("@/lib/discover/scoring");
      mapped = mapped
        .map((item: any) => ({ ...item, _gemScore: computeGemScore(item) }))
        .sort((a: any, b: any) => (b._gemScore || 0) - (a._gemScore || 0));
    }

    const result: DiscoverPageData = {
      items: mapped,
      pageInfo: {
        currentPage: pageInfo.currentPage ?? pageNo,
        hasNextPage: Boolean(pageInfo.hasNextPage),
      },
    };

    // FIX: Never cache empty arrays
    if (result.items.length > 0) {
      await redis.set(cacheKey, result, { ex: 3600 });
    } else {
      await redis.del(cacheKey);
    }

    // Release single-flight lock
    if (gotLock) {
      try {
        await redis.del(lockKey);
      } catch {
        /* ignore */
      }
    }

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Discover compilation failed"),
    };
  }
}


export async function generateWatchOrderAction(
  payload: GenerateWatchOrderInput
): Promise<GenerateActionResult> {
  try {
    const validated = GenerateWatchOrderSchema.parse(payload);

    const prefHash = JSON.stringify(validated.preferences);
    const cacheKey = `watchorder_v2:${validated.anilistId || validated.animeName}:${validated.scope}:${prefHash}`;
    const cached = await redis.get<{ result: WatchOrderResultV2; provider: string; latency: number }>(cacheKey);
    
    if (cached) {
      console.log(`✅ Cache HIT for watch order: ${validated.animeName}`);
      return { success: true, data: { dataV2: cached.result, provider: cached.provider, latency: 0, debug: { cached: true } } };
    }

    let result: Awaited<ReturnType<typeof generateIntelligentWatchOrder>>;
    try {
      result = await generateIntelligentWatchOrder({
        animeName: validated.animeName,
        anilistId: validated.anilistId,
        malId: validated.malId,
        scope: validated.scope,
        preferences: {
          timeBudget: validated.preferences.timeBudget,
          mood: validated.preferences.mood,
          skipPreference: validated.preferences.skipPreference,
          includeMovies: validated.preferences.includeMovies,
          includeOVAs: validated.preferences.includeOVAs,
          includeSpecials: validated.preferences.includeSpecials,
          includeRecaps: validated.preferences.includeRecaps,
          preferredPath: validated.preferences.preferredPath,
          language: validated.preferences.language,
          customSchedule: validated.preferences.customSchedule,
          paceType: validated.preferences.paceType,
          episodesPerDay: validated.preferences.episodesPerDay,
        },
      });
    } catch (genError) {
      // OUTAGE FALLBACK — curated franchises never fail.
      // If AniList is down but we hold curated ground truth for this title,
      // serve the verified order without live enrichment (no images/scores/
      // synopses). Deliberately NOT cached — the fully enriched version
      // regenerates automatically once AniList recovers.
      if (genError instanceof AniListUnavailableError) {
        const curated = findCuratedFranchise(validated.animeName);
        if (curated) {
          const fallback = curatedToV2Result(curated);
          fallback.warnings = [
            "Served from curated ground truth — live AniList enrichment is temporarily unavailable.",
          ];
          console.log(`🛟 Curated outage fallback served for: ${validated.animeName}`);
          return {
            success: true,
            data: {
              dataV2: fallback,
              provider: "curated-outage-fallback",
              latency: 0,
              debug: { curatedOutageFallback: true },
            },
          };
        }
      }
      throw genError;
    }

    // SKIP LEDGER — passive tier-signal aggregation from fresh generations.
    // Only runs on cache misses (a cached re-serve is not a new decision) and
    // after real generation (the curated outage fallback returns early above
    // and is deliberately excluded — degraded mode isn't a signal).
    // Entries deduped per generation (allEntriesFlat repeats titles across
    // paths; first occurrence's tier wins). Fire-and-forget: analytics must
    // never break generation.
    try {
      const seenLedger = new Map<number, string>();
      for (const entry of result.result.allEntriesFlat) {
        if (!entry.anilistId || !entry.tier) continue;
        if (!seenLedger.has(entry.anilistId)) {
          seenLedger.set(entry.anilistId, entry.tier);
        }
      }
      if (seenLedger.size > 0) {
        await Promise.all(
          [...seenLedger.entries()].map(([mediaId, tier]) =>
            redis.hincrby(`skiptier:${mediaId}`, tier, 1)
          )
        );
      }
    } catch {
      /* ledger is analytics — never break generation */
    }

    // ENRICHMENT QUALITY GATE: results with missing images are cached
    // SHORT (1h) so they self-heal when AniList is responsive again.
    // Fully enriched results get the full 7-day cache.
    const totalEntries = result.result.allEntriesFlat?.length || 0;
    const entriesWithImages = result.result.allEntriesFlat?.filter(
      (e: any) => e.imageUrl || e.coverImage?.large
    ).length || 0;
    const enrichmentRate = totalEntries > 0 ? entriesWithImages / totalEntries : 0;

    const cacheTtl = enrichmentRate < 0.5 ? 3600 : 604800;

    if (enrichmentRate < 0.5) {
      console.warn(
        `⚠️ Low enrichment for ${validated.animeName}: ${entriesWithImages}/${totalEntries} entries have images — caching 1h for self-heal`
      );
    }

    await redis.set(cacheKey, { result: result.result, provider: result.provider, latency: result.latency }, { ex: cacheTtl });

    return {
      success: true,
      data: {
        dataV2: result.result,
        provider: result.provider,
        latency: result.latency,
        debug: result.debug,
      },
    };
  } catch (err) {
    console.error("[generateWatchOrderAction]", err);
    return {
      success: false,
      error: errorMessage(err, "Generation execution failed"),
    };
  }
}

export async function fetchCurrentlyAiring() {
  const query = `
    query {
      Page(page: 1, perPage: 12) {
        media(
          type: ANIME
          status: RELEASING
          sort: [POPULARITY_DESC]
          format_in: [TV, TV_SHORT]
          isAdult: false
        ) {
          id
          title { english romaji userPreferred }
          episodes
          coverImage { large medium }
          nextAiringEpisode { airingAt episode }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://anilist.co/'
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600, tags: ['airing'] },
    });
    if (!res.ok) throw new Error('AniList HTTP error');
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data.Page.media.map((m: any) => ({
      id: m.id,
      title: m.title.english || m.title.romaji || m.title.userPreferred,
      coverImage: m.coverImage.large || m.coverImage.medium || '',
      episodes: m.episodes ?? null,
      nextAiringEpisode: m.nextAiringEpisode ? { airingAt: m.nextAiringEpisode.airingAt, episode: m.nextAiringEpisode.episode } : null,
    }));
  } catch (e) {
    console.error('Failed to fetch currently airing:', e);
    return [];
  }
}
// ── Discovery Shelves (Phase 0 — Discovery Tab Overhaul) ──────
const ShelfIdSchema = z.string().trim().min(1).max(40);
const ShelfPageSchema = z.number().int().min(1).max(100);

export type ShelfPageResult = ActionResult<ShelfPageData>;

export async function fetchShelfPageAction(
  shelfId: string,
  page: number
): Promise<ShelfPageResult> {
  try {
    const id = ShelfIdSchema.parse(shelfId);
    const pageNo = ShelfPageSchema.parse(page);
    const data = await fetchShelfPage(id, pageNo);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Shelf fetch failed"),
    };
  }
}
// ── Personalized Recommendations (Phase 4) ───────────────────
const RECOMMENDATIONS_QUERY = `
  query($id: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            id
            idMal
            title { english romaji native }
            format
            episodes
            averageScore
            popularity
            coverImage { large color }
            genres
            startDate { year }
            status
            seasonYear
            nextAiringEpisode { airingAt episode }
            relations { edges { relationType } }
          }
        }
      }
    }
  }
`;

export interface RecommendationCard {
  malId?: number;
  anilistId: number;
  title: string;
  imageUrl: string;
  type?: string;
  episodes?: number | null;
  score?: number;
  genres: string[];
  aired?: string;
  status?: string;
  popularity?: number;
  coverColor?: string;
  seasonYear?: number | null;
  nextAiringEpisode?: { airingAt: number; episode: number } | null;
  isFranchise?: boolean;
}

export type RecommendationResult = ActionResult<RecommendationCard[]>;

export async function fetchRecommendationsAction(
  anilistId: number
): Promise<RecommendationResult> {
  try {
    const cacheKey = `recommendations_v1:${anilistId}`;
    const cached = await redis.get<RecommendationCard[]>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for recommendations: ${anilistId}`);
      return { success: true, data: cached };
    }

    const data = await queryAniList(RECOMMENDATIONS_QUERY, { id: anilistId });
    const nodes = data?.Media?.recommendations?.nodes || [];

    const mapped: RecommendationCard[] = nodes
      .map((node: any) => {
        const m = node?.mediaRecommendation;
        if (!m) return null;
        const relationCount = m.relations?.edges?.length || 0;
        return {
          malId: m.idMal || m.id,
          anilistId: m.id,
          title: m.title?.english || m.title?.romaji || m.title?.native || "Untitled",
          imageUrl: m.coverImage?.large || "",
          type: m.format ?? undefined,
          episodes: m.episodes ?? null,
          score: m.averageScore ? m.averageScore / 10 : 0,
          genres: m.genres || [],
          aired: m.startDate?.year ? `${m.startDate.year}` : "",
          status: m.status ?? undefined,
          popularity: m.popularity || 0,
          coverColor: m.coverImage?.color ?? undefined,
          seasonYear: m.seasonYear ?? null,
          nextAiringEpisode: m.nextAiringEpisode
            ? { airingAt: m.nextAiringEpisode.airingAt, episode: m.nextAiringEpisode.episode }
            : null,
          isFranchise: relationCount > 0,
        };
      })
      .filter((c: any) => c !== null)
      .slice(0, 12);

    if (mapped.length > 0) {
      await redis.set(cacheKey, mapped, { ex: 86400 }); // 24h cache
    }

    return { success: true, data: mapped };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Failed to fetch recommendations"),
    };
  }
}
// ── Off Your Usual Path (Phase 4 — Anti-Filter-Bubble) ───────
const OFF_PATH_QUERY = `
  query($genres: [String], $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      pageInfo { currentPage hasNextPage }
      media(
        type: ANIME
        isAdult: false
        genre_in: $genres
        averageScore_greater: 75
        format_in: [TV]
        sort: [POPULARITY_DESC]
      ) {
        id idMal
        title { english romaji native }
        format episodes
        coverImage { large color }
        averageScore popularity
        genres
        startDate { year }
        status
        seasonYear
        nextAiringEpisode { airingAt episode }
        relations { edges { relationType } }
      }
    }
  }
`;

export type OffPathResult = ActionResult<RecommendationCard[]>;

export async function fetchOffPathAction(
  genres: string[]
): Promise<OffPathResult> {
  try {
    if (!genres || genres.length === 0) {
      return { success: true, data: [] };
    }

    const cacheKey = `offpath_v1:${genres.sort().join(",")}`;
    const cached = await redis.get<RecommendationCard[]>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for off-path: ${genres.join(", ")}`);
      return { success: true, data: cached };
    }

    const data = await queryAniList(OFF_PATH_QUERY, {
      genres,
      perPage: 15,
    });

    const mediaList = data?.Page?.media || [];
    const mapped: RecommendationCard[] = mediaList.map((item: any) => {
      const relationCount = item.relations?.edges?.length || 0;
      return {
        malId: item.idMal || item.id,
        anilistId: item.id,
        title: item.title?.english || item.title?.romaji || item.title?.native || "Untitled",
        imageUrl: item.coverImage?.large || "",
        type: item.format ?? undefined,
        episodes: item.episodes ?? null,
        score: item.averageScore ? item.averageScore / 10 : 0,
        genres: item.genres || [],
        aired: item.startDate?.year ? `${item.startDate.year}` : "",
        status: item.status ?? undefined,
        popularity: item.popularity || 0,
        coverColor: item.coverImage?.color ?? undefined,
        seasonYear: item.seasonYear ?? null,
        nextAiringEpisode: item.nextAiringEpisode
          ? { airingAt: item.nextAiringEpisode.airingAt, episode: item.nextAiringEpisode.episode }
          : null,
        isFranchise: relationCount > 0,
      };
    });

    if (mapped.length > 0) {
      await redis.set(cacheKey, mapped, { ex: 86400 });
    }

    return { success: true, data: mapped };
  } catch (err) {
    return {
      success: false,
      error: errorMessage(err, "Off-path fetch failed"),
    };
  }
}
