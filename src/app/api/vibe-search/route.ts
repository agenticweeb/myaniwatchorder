import { NextRequest, NextResponse } from "next/server";
import { queryAniList } from "@/lib/anilist-client";

export const dynamic = "force-dynamic";

const VIBE_QUERY = `
  query Vibe($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, isAdult: false, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
        id idMal title { english romaji native } format episodes duration averageScore popularity
        description genres tags { name rank }
        startDate { year } coverImage { large }
        recommendations(perPage: 30, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id idMal title { english romaji native } format episodes duration averageScore popularity
              description genres tags { name rank } startDate { year } coverImage { large }
            }
          }
        }
      }
    }
  }
`;

const BROWSE_QUERY = `
  query BrowseVibe($page: Int, $perPage: Int, $genre: String, $tag: String) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, isAdult: false, genre: $genre, tag: $tag, sort: [SCORE_DESC, POPULARITY_DESC]) {
        id idMal title { english romaji native } format episodes duration averageScore popularity
        description genres tags { name rank } startDate { year } coverImage { large }
      }
    }
  }
`;

type Media = {
  id: number;
  idMal?: number;
  title?: { english?: string; romaji?: string; native?: string };
  format?: string;
  episodes?: number | null;
  duration?: number | null;
  averageScore?: number | null;
  popularity?: number | null;
  description?: string | null;
  genres?: string[];
  tags?: { name: string; rank?: number }[];
  startDate?: { year?: number | null };
  coverImage?: { large?: string };
  recommendations?: { nodes?: { mediaRecommendation?: Media }[] };
};

type Constraint = { genre?: string; tag?: string; exclude?: string[]; maxEpisodes?: number; minScore?: number; year?: string };

function parsePrompt(prompt: string): { reference?: string; constraints: Constraint; words: string[] } {
  const value = prompt.trim();
  const lower = value.toLowerCase();
  const referenceMatch = lower.match(/(?:like|similar to|same vibe as)\s+(.+?)(?=\s+but\s+|\s+with\s+|$)/i);
  const reference = referenceMatch?.[1]?.replace(/["“”]/g, "").trim();
  const constraints: Constraint = {};
  const genres = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller", "Mecha"];
  const genre = genres.find((item) => lower.includes(item.toLowerCase()) || (item === "Sci-Fi" && /science fiction|sci fi|scifi|sicfi/.test(lower)));
  if (genre) constraints.genre = genre;
  const tagMap: Array<[RegExp, string]> = [
    [/anti[- ]?hero|villain|bad guy|evil protagonist|morally (?:grey|gray)/, "Anti-Hero"],
    [/female lead|female protagonist|woman lead/, "Female Protagonist"],
    [/male lead|male protagonist|man lead/, "Male Protagonist"],
    [/revenge|vengeance|avenging/, "Revenge"],
    [/time travel|time loop|timeline/, "Time Travel"],
    [/isekai/, "Isekai"],
    [/harem/, "Harem"],
  ];
  const excluded = tagMap.filter(([pattern]) => /without|no |exclude|not |avoid/.test(lower) && pattern.test(lower)).map(([, name]) => name);
  if (excluded.length) constraints.exclude = excluded;
  const tag = tagMap.find(([pattern, name]) => pattern.test(lower) && !excluded.includes(name));
  if (tag) constraints.tag = tag[1];
  if (/very short|mini|under 13|one cour/.test(lower)) constraints.maxEpisodes = 13;
  else if (/short|shorter|quick|under 26/.test(lower)) constraints.maxEpisodes = 26;
  if (/highly rated|well rated|top rated|masterpiece|excellent/.test(lower)) constraints.minScore = 8;
  const year = lower.match(/(1990s|2000s|2010s|2020s)/)?.[1];
  if (year) constraints.year = year;
  const words = lower.split(/\s+/).filter((word) => word.length > 2 && !["something", "anime", "with", "from", "that", "want"].includes(word));
  return { reference, constraints, words };
}

function titleOf(media: Media) { return media.title?.english || media.title?.romaji || media.title?.native || "Untitled"; }
function mapMedia(media: Media, reasons: string[], matchScore: number) {
  return {
    id: media.id,
    malId: media.idMal || media.id,
    anilistId: media.id,
    title: titleOf(media),
    titleJapanese: media.title?.native,
    imageUrl: media.coverImage?.large || "",
    type: media.format || "TV",
    episodes: media.episodes ?? null,
    score: (media.averageScore || 0) / 10,
    synopsis: (media.description || "").replace(/<[^>]*>/g, ""),
    genres: media.genres || [],
    aired: media.startDate?.year ? String(media.startDate.year) : "",
    status: "",
    isFranchise: false,
    popularity: media.popularity || 0,
    vibeReasons: reasons,
    vibeMatchScore: Math.round(matchScore),
  };
}

export async function GET(request: NextRequest) {
  const prompt = new URL(request.url).searchParams.get("q")?.trim();
  if (!prompt) return NextResponse.json({ success: false, error: "Query 'q' required" }, { status: 400 });
  try {
    const parsed = parsePrompt(prompt);
    let candidates: Media[] = [];
    let reference: Media | undefined;
    if (parsed.reference) {
      const data = await queryAniList(VIBE_QUERY, { search: parsed.reference, page: 1, perPage: 5 });
      reference = data?.Page?.media?.[0];
      const recommendations = (reference?.recommendations?.nodes || []).map((node: any) => node.mediaRecommendation).filter(Boolean);
      candidates = recommendations;
      if (!candidates.length) candidates = (data?.Page?.media || []).slice(1);
    } else {
      const data = await queryAniList(BROWSE_QUERY, { page: 1, perPage: 50, genre: parsed.constraints.genre, tag: parsed.constraints.tag });
      candidates = data?.Page?.media || [];
    }
    const referenceEpisodes = reference?.episodes || undefined;
    const referenceGenres = new Set(reference?.genres || []);
    const referenceTags = new Set((reference?.tags || []).filter((tag) => (tag.rank || 0) >= 50).map((tag) => tag.name));
    const results = candidates
      .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
      .filter((candidate) => {
        const tags = new Set((candidate.tags || []).map((tag) => tag.name));
        const genres = new Set(candidate.genres || []);
        if (parsed.constraints.exclude?.some((name) => tags.has(name))) return false;
        if (parsed.constraints.genre && !genres.has(parsed.constraints.genre)) return false;
        if (parsed.constraints.tag && !tags.has(parsed.constraints.tag)) return false;
        if (parsed.constraints.maxEpisodes && (!candidate.episodes || candidate.episodes > parsed.constraints.maxEpisodes)) return false;
        if (referenceEpisodes && /shorter|short|brief|quick/.test(prompt.toLowerCase()) && (!candidate.episodes || candidate.episodes >= referenceEpisodes)) return false;
        if (parsed.constraints.minScore && (candidate.averageScore || 0) / 10 < parsed.constraints.minScore) return false;
        if (parsed.constraints.year && candidate.startDate?.year && String(candidate.startDate.year) !== parsed.constraints.year.replace("s", "")) return false;
        return true;
      })
      .map((candidate) => {
        const candidateGenres = new Set(candidate.genres || []);
        const candidateTags = new Set((candidate.tags || []).map((tag) => tag.name));
        const genreOverlap = [...referenceGenres].filter((genre) => candidateGenres.has(genre)).length;
        const tagOverlap = [...referenceTags].filter((tag) => candidateTags.has(tag)).length;
        let score = (candidate.averageScore || 0) / 10;
        score += genreOverlap * 1.8 + tagOverlap * 0.7;
        const reasons: string[] = [];
        if (reference) reasons.push(`shares ${genreOverlap || 1} core genre${genreOverlap === 1 ? "" : "s"} with ${titleOf(reference)}`);
        if (referenceEpisodes && candidate.episodes && candidate.episodes < referenceEpisodes) reasons.push(`${candidate.episodes} episodes vs ${referenceEpisodes} for ${titleOf(reference!)}`);
        if (parsed.constraints.genre && candidateGenres.has(parsed.constraints.genre)) reasons.push(parsed.constraints.genre);
        if (parsed.constraints.tag && candidateTags.has(parsed.constraints.tag)) reasons.push(parsed.constraints.tag);
        if ((candidate.averageScore || 0) >= 80) reasons.push(`${((candidate.averageScore || 0) / 10).toFixed(1)} AniList score`);
        return mapMedia(candidate, reasons.slice(0, 3), score);
      })
      .sort((a, b) => (b.vibeMatchScore || 0) - (a.vibeMatchScore || 0) || (b.score || 0) - (a.score || 0))
      .slice(0, 12);
    return NextResponse.json({ success: true, data: results, interpretation: { reference: reference ? titleOf(reference) : undefined, constraints: parsed.constraints, resultCount: results.length } });
  } catch (error) {
    console.error("Vibe search failed", error);
    return NextResponse.json({ success: false, error: "Vibe Search could not reach AniList right now." }, { status: 502 });
  }
}
