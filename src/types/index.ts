/**
 * MyAniWatchOrder Type Definitions
 * Single source of truth for all data structures
 */

// ── AI Provider Configuration ──────────────────────────────
export interface AIProvider {
  name: string;
  endpoint: string;
  model: string;
  apiKeyEnv: string;
  priority: number;
  headers: Record<string, string>;
  bodyModifier?: (body: any) => any;
}

// ── Entry Type Classification ──────────────────────────────
export type EntryType =
  | "TV"
  | "OVA"
  | "Movie"
  | "Special"
  | "ONA"
  | "Spin-off"
  | "Recap"
  | "Side-story";

export type EntryTier = "essential" | "recommended" | "optional" | "skip";

export type FillerType =
  | "none"
  | "recap"
  | "side-story"
  | "character-intro"
  | "world-building"
  | "fanservice"
  | "transition"
  | "mixed";

export type ContentTag =
  | "Action"
  | "Adventure"
  | "Comedy"
  | "Drama"
  | "Fantasy"
  | "Horror"
  | "Mystery"
  | "Psychological"
  | "Romance"
  | "Sci-Fi"
  | "Slice of Life"
  | "Sports"
  | "Supernatural"
  | "Thriller"
  | "Mecha"
  | "Isekai"
  | "Shounen"
  | "Seinen"
  | "Shoujo"
  | "Josei";

// ── Watch Order Entry ──────────────────────────────────────
export interface WatchOrderEntry {
  id: string;
  malId?: number;
  anilistId?: number;
  title: string;
  titleJapanese?: string;
  type: EntryType;
  tier: EntryTier;
  episodeCount?: number;
  durationMinutes?: number;
  timeEstimate: string;
  position: number;
  prerequisites: string[];
  unlocks: string[];
  contentTags: ContentTag[];
  arcName?: string;
  isFiller: boolean;
  fillerClassification?: FillerType;
  fillerReason?: string;
  whyWatch: string;
  skipWarning?: string;
  watchIf: string[];
  imageUrl?: string;
  bannerUrl?: string;
  malScore?: number;
  anilistScore?: number;
  popularity?: number;
  memberCount?: number;
  synopsis?: string;
  genres?: string[];
  aired?: string;
  status?: string;
  watched?: boolean;
  progress?: number;
  userRating?: number;
  notes?: string;
  trailerUrl?: string | null;
}

// ── Watch Path (Alternative Orderings) ─────────────────────
export interface WatchPath {
  name: string;
  description: string;
  entries: string[];
  totalTime: string;
  bestFor: string[];
}

// ── Watch Order Result ─────────────────────────────────────
export interface WatchOrderResult {
  franchise: string;
  franchiseId: string;
  description: string;
  totalEntries: number;
  totalEpisodes: number;
  totalDuration: string;
  entries: WatchOrderEntry[];
  paths: WatchPath[];
  generatedAt: string;
  aiProvider: string;
  confidence: number;
}

// ── User Preferences ───────────────────────────────────────
// How the user watches — never "what" to watch.
// timeBudget = daily pace only (finish dates). Never changes order.
export interface UserPreferences {
  timeBudget: TimeBudget;
  mood: Mood[];
  skipPreference: SkipPreference;
  includeMovies: boolean;
  includeOVAs: boolean;
  includeSpecials: boolean;
  includeRecaps: boolean;
  preferredPath: PathType;
  language: "english" | "japanese" | "both";
  customSchedule?: CustomSchedule;
  // NEW COHERENCE FIELDS:
  paceType?: "duration" | "episodes";
  episodesPerDay?: number;
}

/** Daily viewing pace — maps to minutes/day for finish-date math only */
export type TimeBudget =
  | "casual"
  | "regular"
  | "dedicated"
  | "binge";

export type Mood =
  | "action"
  | "feels"
  | "mindfuck"
  | "comedy"
  | "horror"
  | "mystery"
  | "romance"
  | "adventure"
  | "all";

export type SkipPreference =
  | "smart-skip"
  | "watch-everything"
  | "canon-only";

/** Optimal = release order that preserves reveals (default) */
export type PathType =
  | "release"
  | "chronological"
  | "optimal";

// ── Search Result ──────────────────────────────────────────
export interface AnimeSearchResult {
  malId: number;
  anilistId?: number;
  title: string;
  titleJapanese?: string;
  imageUrl: string;
  type: string;
  episodes?: number;
  score: number;
  synopsis: string;
  genres: string[];
  aired?: string;
  status: string;
  isFranchise: boolean;
  franchiseEntries?: number;
}

// ── Enrichment Data ────────────────────────────────────────
export interface EnrichmentData {
  malId: number;
  score: number;
  popularity: number;
  members: number;
  synopsis: string;
  genres: string[];
  studios: string[];
  aired: string;
  duration: string;
  rating: string;
  imageUrl: string;
  trailerUrl?: string;
  relations: Relation[];
  status?: string;
}

export interface Relation {
  relation: string;
  entry: {
    malId: number;
    type: string;
    title: string;
  };
}

// ── User Progress ──────────────────────────────────────────
export interface UserProgress {
  franchiseId: string;
  entries: Record<string, EntryProgress>;
  startedAt: string;
  lastUpdated: string;
  totalWatched: number;
  totalEpisodes: number;
  totalEntries?: number;
  title?: string;
  imageUrl?: string;
  coverColor?: string;
  shareCode?: string;
}

export interface EntryProgress {
  watched: boolean;
  episodesWatched: number;
  maxEpisodes: number; // <--- ADD THIS
  rating?: number;
  notes?: string;
  watchedAt?: string;
}

// ── AI Response Types ──────────────────────────────────────
export interface AIGeneratedEntry {
  title: string;
  type: EntryType;
  tier: EntryTier;
  position: number;
  episodeCount?: number;
  durationMinutes?: number;
  timeEstimate: string;
  prerequisites: string[];
  isFiller: boolean;
  fillerClassification?: FillerType;
  fillerReason?: string;
  whyWatch: string;
  skipWarning?: string;
  watchIf: string[];
  contentTags: ContentTag[];
  arcName?: string;
}

export interface AIGeneratedOrder {
  franchise: string;
  description: string;
  confidence: number;
  entries: AIGeneratedEntry[];
  paths: WatchPath[];
  warnings?: string[];
}

// ── API Response Types ─────────────────────────────────────
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
  cached?: boolean;
  latency?: number;
}

// ── Cache Types ────────────────────────────────────────────
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  provider: string;
}

export interface DailySchedule {
  enabled: boolean;
  startTime: string; // e.g., "20:00"
  endTime: string;   // e.g., "22:00"
}

export interface CustomSchedule {
  enabled: boolean;
  monday: DailySchedule;
  tuesday: DailySchedule;
  wednesday: DailySchedule;
  thursday: DailySchedule;
  friday: DailySchedule;
  saturday: DailySchedule;
  sunday: DailySchedule;
}

// Update UserPreferences to optionally accept customSchedule
export interface UserPreferences {
  timeBudget: TimeBudget;
  mood: Mood[];
  skipPreference: SkipPreference;
  includeMovies: boolean;
  includeOVAs: boolean;
  includeSpecials: boolean;
  includeRecaps: boolean;
  preferredPath: PathType;
  language: "english" | "japanese" | "both";
  customSchedule?: CustomSchedule; // Added
}
