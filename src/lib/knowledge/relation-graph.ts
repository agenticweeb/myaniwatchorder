/**
 * MyAniWatchOrder Relation Graph Builder - V6 (Soft Flagging Architecture)
 * 
 * CRITICAL FIX: Eliminates ALL hard rejection gates.
 * Validation now only FLAGS suspicious entries; AI decides inclusion.
 * Works for ALL anime types: studio-switchers, long-runners, generic-word franchises.
 */

import { RawRelationNode, RelationGraph, AllowedTitle, EntryFormat } from "@/types/intelligent";
import { redis } from "@/lib/redis";

function parseFormat(f?: string | null, ty?: string | null): EntryFormat {
  const raw = (f || ty || "TV").toUpperCase();
  if (raw === "MOVIE") return "MOVIE";
  if (raw === "OVA") return "OVA";
  if (raw === "ONA") return "ONA";
  if (raw === "SPECIAL") return "SPECIAL";
  if (raw === "TV_SHORT") return "TV" as any;
  if (raw === "MUSIC") return "SPECIAL";
  if (["MANGA", "NOVEL", "LIGHT_NOVEL", "ONE_SHOT", "DOUJIN", "DOUJINSHI", "MANHWA", "MANHUA"].includes(raw)) return "MANGA" as any;
  return "TV";
}

function isAnimeFormat(f?: string | null) {
  if (!f) return true;
  const x = f.toUpperCase();
  return !["MANGA", "NOVEL", "LIGHT_NOVEL", "ONE_SHOT", "DOUJIN", "DOUJINSHI", "MANHWA", "MANHUA", "MUSIC"].includes(x);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

const ENDPOINT = "https://graphql.anilist.co";

const MEDIA_Q = `query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native} format episodes duration status averageScore popularity description genres startDate{year} coverImage{large medium color} trailer{id site} nextAiringEpisode{episode} studios{edges{isMain node{name id}}} relations{edges{relationType node{id idMal title{romaji english native} format episodes duration status averageScore popularity startDate{year} coverImage{large medium color} description genres trailer{id site} nextAiringEpisode{episode} studios{edges{isMain node{name id}}}}}}}}`;

const SEARCH_Q = `query($search:String,$perPage:Int){Page(perPage:$perPage){media(search:$search,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native} format episodes duration status averageScore popularity startDate{year} coverImage{large medium color} description genres trailer{id site} nextAiringEpisode{episode} studios{edges{isMain node{name id}}}}}}`;

/**
 * Thrown when AniList itself is failing (outage, persistent 5xx/429,
 * network unreachable) — as opposed to a legitimate "not found" result.
 * Callers must NEVER convert this into "No anime found" messages.
 */
export class AniListUnavailableError extends Error {
  constructor(detail: string) {
    super(`AniList is unavailable right now (${detail}). Please try again in a few minutes.`);
    this.name = "AniListUnavailableError";
  }
}

async function fetchWithRetry(body: any, retries = 3) {
  let lastError = "unknown error";
  for (let a = 0; a <= retries; a++) {
    try {
      try {
        const cooldown = await redis.get<string>("anilist:relation-cooldown");
        if (cooldown) throw new AniListUnavailableError("temporarily rate limited — using the verified graph frontier instead");
      } catch (error) {
        if (error instanceof AniListUnavailableError) throw error;
        /* Redis outage must not block the live request. */
      }
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        next: { revalidate: 3600 } as any
      });

      if (res.ok) {
        const j = await res.json();
        // GraphQL-level failure: HTTP 200 but an errors array with no data —
        // e.g. "The AniList API has been temporarily disabled due to severe
        // stability issues." Surface the REAL reason, never swallow it.
        if (j?.errors?.length && !j?.data) {
          throw new AniListUnavailableError(j?.errors?.[0]?.message || "GraphQL error");
        }
        // A null here is a legitimate "not found" (e.g. unknown media id)
        return j?.data ?? null;
      }

      // Retryable statuses
      if (res.status === 429) {
        try { await redis.set("anilist:relation-cooldown", "1", { ex: 20 }); } catch { /* best effort */ }
        const w = Math.min(800 + Math.pow(2, a) * 600 + Math.random() * 400, 7000);
        console.warn(`AniList 429 retry ${a + 1} wait ${Math.round(w)}ms`);
        await sleep(w);
        lastError = "rate limited (429)";
        continue;
      }
      if (res.status >= 500 && a < retries) {
        await sleep(400 * (a + 1));
        lastError = `server error (${res.status})`;
        continue;
      }

      // Non-retryable HTTP failure (403 outage, 400, ...) — extract
      // AniList's own message when the body carries one.
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        const msg = errBody?.errors?.[0]?.message;
        if (msg) detail = msg;
      } catch { /* non-JSON body */ }
      throw new AniListUnavailableError(detail);
    } catch (e: any) {
      if (e instanceof AniListUnavailableError) throw e; // never retry a hard failure
      lastError = e?.message || "network error";
      if (a === retries) break;
      await sleep(350 * (a + 1));
    }
  }
  throw new AniListUnavailableError(
    lastError.includes('rate limited')
      ? `rate limited — this franchise's relation graph is very large. Please try again in a minute.`
      : `unreachable after retries — ${lastError}`
  );
}

async function fetchAniListMedia(id: number): Promise<any | null> {
  const cacheKey = `anilist:relation-media:v1:${id}`;
  try {
    const cached = await redis.get<any>(cacheKey);
    if (cached) return cached;
  } catch {
    /* Redis is an optimization; live AniList remains the source of truth. */
  }
  const data = await fetchWithRetry({ query: MEDIA_Q, variables: { id } });
  const media = data?.Media || null;
  if (media) {
    try {
      await redis.set(cacheKey, media, { ex: 86400 });
    } catch {
      /* Ignore cache write failures. */
    }
  }
  return media;
}

async function searchAniListForRoot(search: string, perPage = 5): Promise<any | null> {
  const data = await fetchWithRetry({ query: SEARCH_Q, variables: { search, perPage } });
  const results = (data?.Page?.media || []).filter((m: any) => isAnimeFormat(m.format));
  return results[0] || null;
}

function anilistToRaw(node: any, depth: number, relType?: string, src?: number): RawRelationNode {
  const title = node.title?.english || node.title?.romaji || node.title?.native || "Unknown";
  return {
    anilistId: node.id,
    malId: node.idMal || undefined,
    title,
    titleEnglish: node.title?.english || undefined,
    titleRomaji: node.title?.romaji || undefined,
    titleNative: node.title?.native || undefined,
    format: node.format || undefined,
    type: node.format || undefined,
    episodes: node.episodes ?? undefined,
    duration: node.duration ?? undefined,
    status: node.status || undefined,
    averageScore: node.averageScore ?? undefined,
    popularity: node.popularity || 0,
    coverImage: node.coverImage || undefined,
    genres: node.genres || [],
    description: node.description || undefined,
    trailer: node.trailer || null,
    relationType: relType || undefined,
    sourceId: src,
    depth,
    year: node.startDate?.year || undefined,
    nextAiringEpisode: node.nextAiringEpisode || null,
    studios: node.studios?.edges?.filter((e: any) => e.isMain).map((e: any) => e.node?.name).filter(Boolean) || [],
  } as any;
}

const FRANCHISE_RELATIONS = [
  'SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY', 
  'SPIN_OFF', 'ALTERNATIVE', 'ADAPTATION'
];

// Node budget for the BFS. Deep CHAINS (Gintama: 7-deep sequel line, ~25 nodes)
// need maxDepth 8 — but DENSE graphs (Detective Conan: 20+ movies, Magic Kaito,
// Lupin III crossover webs) explode combinatorially at that depth. Verified
// working envelope: ~40-node graphs generate cleanly. 70 caps the worst case
// inside it with margin, preventing the sequential fetch storm that trips
// AniList's rate limit (sustained 429s -> retries exhausted -> false
// "AniList unavailable" errors) and the Vercel function timeout.
const MAX_GRAPH_NODES = 70;

function computeLexicalScore(rootTitle: string, candidateTitle: string): number {
  const rootWords = rootTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  const candWords = candidateTitle.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  const generic = new Set(['the', 'and', 'story', 'tale', 'saga', 'chronicle', 'legend', 'movie', 'special']);
  let score = 0;
  for (const rw of rootWords) {
    if (generic.has(rw)) continue;
    if (candWords.some(cw => cw.includes(rw) || rw.includes(cw))) {
      score += rw.length;
    }
  }
  return score;
}

function flagSuspiciousEntries(root: RawRelationNode, nodes: Map<number, RawRelationNode>): Map<number, string[]> {
  const flags = new Map<number, string[]>();
  const rootTitle = root.titleEnglish || root.titleRomaji || root.title || "";
  const rootStudios = new Set((root as any).studios || []);

  for (const [id, node] of nodes) {
    if (node.depth === 0) continue;
    const nodeFlags: string[] = [];
    const relType = (node.relationType || "").toUpperCase();

    // FIX: Flag studio mismatch for ALL entries and include the actual studio names
    const nodeStudios = (node as any).studios || [];
    if (rootStudios.size > 0 && nodeStudios.length > 0) {
      const hasOverlap = nodeStudios.some((s: string) => rootStudios.has(s));
      if (!hasOverlap) {
        const rootStudio = Array.from(rootStudios).find(Boolean) || 'Unknown';
        const nodeStudio = nodeStudios.find(Boolean) || 'Unknown';
        nodeFlags.push(`different-studio:${rootStudio}:${nodeStudio}`);
      }
    }

    if (relType !== 'SEQUEL' && relType !== 'PREQUEL') {
      const score = computeLexicalScore(rootTitle, node.title || "");
      if (score === 0) nodeFlags.push('no-title-overlap');
    }

    if (nodeFlags.length > 0) flags.set(id, nodeFlags);
  }
  return flags;
}

export interface BuildGraphParams { 
  title: string; 
  anilistId?: number; 
  malId?: number; 
  scope: "season" | "franchise"; 
  maxDepth?: number; 
}

export async function buildRelationGraph(params: BuildGraphParams) {
  const warnings: string[] = [];
  const maxDepth = params.maxDepth ?? (params.scope === "franchise" ? 6 : 0);
  
  let root: RawRelationNode | null = null;
  let rootMedia: any | null = null;
  
  if (params.anilistId) {
    const media = await fetchAniListMedia(params.anilistId);
    if (media && isAnimeFormat(media.format)) {
      rootMedia = media;
      root = anilistToRaw(media, 0);
    }
  }
  
  if (!root) {
    const bestMatch = await searchAniListForRoot(params.title, 5);
    if (!bestMatch) throw new Error(`No anime found for "${params.title}"`);
    const media = await fetchAniListMedia(bestMatch.id);
    if (media && isAnimeFormat(media.format)) {
      rootMedia = media;
      root = anilistToRaw(media, 0);
    }
  }
  
  if (!root) throw new Error(`Failed to fetch root node for "${params.title}"`);

  const nodes = new Map<number, RawRelationNode>();
  const edges: Array<{ from: number; to: number; type: string }> = [];
  const visited = new Set<number>();
  const queue: Array<{ id: number; depth: number }> = [{ id: root.anilistId, depth: 0 }];
  
  nodes.set(root.anilistId, root);
  
  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift()!;
    
    if (visited.has(currentId) || depth >= maxDepth) continue;
    visited.add(currentId);

    // Node budget: stop expanding once the graph is large enough. The root's
    // core franchise (sequel chains + direct relations) always fits well
    // inside this budget; only distant crossover webs get cut.
    if (visited.size > MAX_GRAPH_NODES) {
      warnings.push(`Graph capped at ${MAX_GRAPH_NODES} nodes — distant crossover relations skipped`);
      break;
    }
    
    let media: any | null = null;
    try {
      // The root was already fetched during resolution. Reusing that response
      // saves one expensive request and avoids immediately rate-limiting a
      // large franchise before traversal even starts.
      media = currentId === root.anilistId && rootMedia
        ? rootMedia
        : await fetchAniListMedia(currentId);
    } catch (error) {
      if (error instanceof AniListUnavailableError && nodes.size >= 3) {
        warnings.push("AniList rate-limited graph expansion. Stopped at the verified relation frontier; no unverified titles were added.");
        break;
      }
      throw error;
    }
    if (!media) {
      warnings.push(`Failed to fetch relations for ID ${currentId}`);
      continue;
    }
    
    if (!nodes.has(media.id)) {
      nodes.set(media.id, anilistToRaw(media, depth));
    }
    
    for (const edge of media.relations?.edges || []) {
      const relationType = (edge.relationType || "unknown").toUpperCase();
      const relatedNode = edge.node;
      
      if (!relatedNode?.id) continue;
      if (!isAnimeFormat(relatedNode.format)) {
        warnings.push(`Skipped non-anime ${relatedNode.format}: ${relatedNode.title?.romaji}`);
        continue;
      }
      
      if (!FRANCHISE_RELATIONS.includes(relationType)) {
        if (relationType === 'CHARACTER' || relationType === 'OTHER') {
          warnings.push(`Crossover pruned: ${relatedNode.title?.romaji} (${relationType})`);
        }
        continue;
      }
      
      edges.push({ from: currentId, to: relatedNode.id, type: relationType });
      
      if (!nodes.has(relatedNode.id)) {
        nodes.set(relatedNode.id, anilistToRaw(relatedNode, depth + 1, relationType, currentId));
      }
      
      if (!visited.has(relatedNode.id)) {
        queue.push({ id: relatedNode.id, depth: depth + 1 });
      }
    }
  }

  const flags = flagSuspiciousEntries(root, nodes);
  const flaggedCount = flags.size;
  if (flaggedCount > 0) {
    warnings.push(`${flaggedCount} entries flagged for AI review (studio/title mismatch)`);
  }
  
  const allowed = Array.from(nodes.values())
    .filter(n => isAnimeFormat(n.format as any))
    .map(node => {
      const nodeFlags = flags.get(node.anilistId) || [];
      const aliases = [
        node.titleEnglish || "", 
        node.titleRomaji || "", 
        node.titleNative || "", 
        node.title || ""
      ].filter(Boolean) as string[];
      
      return {
        id: `ani_${node.anilistId}`,
        anilistId: node.anilistId,
        malId: node.malId,
        title: node.title,
        normalizedTitle: node.title.toLowerCase().replace(/[^a-z0-9]/g, ""),
        aliases: Array.from(new Set(aliases)),
        format: parseFormat(node.format, node.type),
        episodes: node.episodes,
        duration: node.duration,
        year: (node as any).year,
        popularity: node.popularity || 0,
        relationType: node.relationType,
        isMainEntry: node.depth === 0,
        status: (node as any).status,
        nextAiringEpisode: (node as any).nextAiringEpisode,
        flags: nodeFlags,
      };
    });
  
  allowed.sort((a, b) => {
    const na = nodes.get(a.anilistId);
    const nb = nodes.get(b.anilistId);
    const d = (na?.depth || 0) - (nb?.depth || 0);
    if (d !== 0) return d;
    return (b.popularity || 0) - (a.popularity || 0);
  });
  
  const graph = { 
    root: root!, 
    nodes, 
    edges, 
    totalDiscovered: nodes.size, 
    maxDepth 
  };
  
  return { graph, allowedTitles: allowed, root: root!, warnings };
}

export function findAllowedTitleById(a: any[], id: string | number) {
  const s = String(id);
  return a.find(x => x.id === s || String(x.anilistId) === s || (x.malId && String(x.malId) === s));
}

export function findAllowedTitleByFuzzy(a: any[], q: string) {
  const n = q.toLowerCase().replace(/[^a-z0-9]/g, "");
  return a.find(x => x.normalizedTitle === n || x.aliases.some((al: string) => al.toLowerCase().replace(/[^a-z0-9]/g, "") === n));
}
