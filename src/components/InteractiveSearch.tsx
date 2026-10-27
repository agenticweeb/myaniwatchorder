"use client";

import React, { 
  useState, 
  useTransition, 
  useDeferredValue, 
  useEffect, 
  useCallback, 
  useId, 
  useRef, 
  useMemo 
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAniListInfiniteQuery } from "@/hooks/useAniListInfiniteQuery";
import {
  AlertTriangle,
  Clock,
  Eye,
  Loader2,
  Map,
  RotateCcw,
  Search,
  X,
  Compass,
  LayoutGrid,
  List,
  Check,
  Star,
  SlidersHorizontal,
  Send,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { generateWatchOrderAction, searchAnimeAction, discoverAnimeAction } from "@/app/actions";
import { PreferencePanel } from "@/components/PreferencePanel";
import { SuggestionImage } from "@/components/SuggestionImage";
import { VisualFlowchart } from "@/components/VisualFlowchart";
import { cn } from "@/lib/utils";
import type { AnimeSearchResult, UserPreferences } from "@/types";
import type { WatchOrderResultV2, CustomSchedule } from "@/types/intelligent";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useAudioCue } from "@/hooks/useAudioCue";
import { SEO_TIERS } from "@/lib/seo/tiers";
import { PipelineLoader } from "@/components/PipelineLoader";
import { AiringCarousel } from "@/components/AiringCarousel";
import { DiscoverShelves } from "@/components/DiscoverShelves";
import { CinematicHero } from "@/components/CinematicHero";
import { HomepageDiscovery } from "@/components/HomepageDiscovery";
import { DiscoveryFeedback } from "@/components/DiscoveryFeedback";
import { VibeSearch } from "@/components/VibeSearch";
import { DiscoverCard } from "@/components/DiscoverCard";
import type { DiscoverCardData } from "@/lib/discover/shelf-recipes";


const DEFAULT_PREFERENCES: UserPreferences = {
  timeBudget: "regular",
  mood: ["all"],
  skipPreference: "smart-skip",
  includeMovies: true,
  includeOVAs: true,
  includeSpecials: true,
  includeRecaps: false,
  preferredPath: "optimal",
  language: "english",
  paceType: "duration",
  episodesPerDay: 2,
};

// FIX: Use ONLY official AniList genres to prevent 0-result API errors
const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", 
  "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller", "Mecha"
];

const GENERATION_STAGES = [
  { step: "01/05", label: "Querying AniList & Jikan Graph nodes..." },
  { step: "02/05", label: "Resolving recursive light-novel crossover leaks..." },
  { step: "03/05", label: "Classifying anime shapes & branching routes..." },
  { step: "04/05", label: "Synthesizing optimal path & smart-skip timelines..." },
  { step: "05/05", label: "Validating structural hashes against grounded DB IDs..." },
];

const LANGUAGES = [
  { code: "All", label: "Any Origin" },
  { code: "JP", label: "Japanese (Anime)" },
  { code: "CN", label: "Chinese (Donghua)" },
  { code: "KR", label: "Korean (Hanguk)" },
  { code: "US", label: "English (US/Global)" },
  { code: "FR", label: "French (Co-productions)" },
];
// "Filter the slop" — fatigue mutes. AniList taxonomy matters here:
// Isekai/Harem/Reverse Harem/Shounen are TAGS; Ecchi is a GENRE.
// Each chip routes to the correct GraphQL filter (tag_not_in vs genre_not_in).
const EXCLUDE_OPTIONS: { name: string; kind: "tag" | "genre" }[] = [
  { name: "Isekai", kind: "tag" },
  { name: "Harem", kind: "tag" },
  { name: "Reverse Harem", kind: "tag" },
  { name: "Shounen", kind: "tag" },
  { name: "Ecchi", kind: "genre" },
];
interface InteractiveSearchProps {
  initialSuggestions: any[]; 
  airingAnime?: any[];
}

export function InteractiveSearch({ initialSuggestions, airingAnime = [] }: InteractiveSearchProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { play } = useAudioCue();
  const tabContentRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleTabSwitch = (tab: "builder" | "discover", opts?: { scroll?: boolean }) => {
    if (tab === activeTab) return;
    if (activeTab === "discover") saveDiscoverScroll();
    setActiveTab(tab);
    if (tab === "discover") setHasVisitedDiscover(true);
    if (opts?.scroll === false) return;
    // Wait for the incoming tab's layout to mount/expand BEFORE scrolling —
    // scrolling mid-layout animates toward a moving target (the janky
    // "fuzzy" landing). Double rAF = after the next paint completes.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (tab === "discover" && discoverScrollRef.current > 0) {
          // Returning to Discover: land exactly where the user left off —
          // same behavior as the generate→back round-trip.
          window.scrollTo({ top: discoverScrollRef.current, behavior: "smooth" });
        } else {
          tabContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  };

  // Read the 'tab' URL param to allow the header button to switch tabs
  const [tabParam] = useQueryState('tab', parseAsString.withDefault('builder'));
  const [activeTab, setActiveTab] = useState<"builder" | "discover">(tabParam === 'discover' ? 'discover' : 'builder');

  // Phase 3 — Discover keep-alive: once opened, its content stays mounted
  // (CSS-hidden) so tab switches and generate→back round-trips preserve the
  // loaded grid pages, carousel positions, and page scroll.
  const [hasVisitedDiscover, setHasVisitedDiscover] = useState(false);
  const discoverScrollRef = useRef(0);
  const saveDiscoverScroll = useCallback(() => {
    discoverScrollRef.current = window.scrollY;
  }, []);

  useEffect(() => {
    if (tabParam === 'discover') {
      setHasVisitedDiscover(true);
      setActiveTab('discover');
      // Clean the URL so clicking Discover again works
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [tabParam, hasVisitedDiscover]);

  const [query, setQuery] = useState("");
  
  // Dynamic placeholder to prove we handle obscure titles
  const OBSCURE_TITLES = [
    "Try: Katanagatari",
    "Try: Umineko",
    "Try: Mushishi",
    "Try: Aria the Animation",
    "Try: Spice and Wolf",
    "Try: Seirei no Moribito"
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % OBSCURE_TITLES.length);
    }, 4000); // Rotate every 4 seconds
    return () => clearInterval(timer);
  }, []);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);

  // Debounce the API call, not the UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350); // 350ms delay
    return () => clearTimeout(timer);
  }, [query]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // history: 'push' — each selection becomes a REAL history entry, so browser
  // Back steps back INSIDE the app (deselects, returns to the previous view)
  // instead of exiting the site. nuqs' default ('replace') overwrites the
  // current entry, so Back jumped straight past the site to the page before it.
  const [selectedId, setSelectedId] = useQueryState(
    'id',
    parseAsInteger.withOptions({ history: 'push' })
  );


  const [selected, setSelected] = useState<AnimeSearchResult | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [generating, startGenerating] = useTransition();
  const [finalData, setFinalData] = useState<WatchOrderResultV2 | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default to list view — cleaner scan-ability; grid remains one toggle away
  const [discoverLayout, setDiscoverLayout] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"popularity" | "score" | "title" | "underrated">("popularity");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [includedTags, setIncludedTags] = useState<string[]>([]);
  const [maxEpisodes, setMaxEpisodes] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<string>("All Time");
  const [selectedLang, setSelectedYearLang] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(true);
  const [vibeInterpretation, setVibeInterpretation] = useState("");
  const [vibeMatches, setVibeMatches] = useState<(DiscoverCardData & { vibeReasons?: string[] })[]>([]);
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState("");

  // Phase 2 — slop mutes (single source of truth; tag/genre split derived below)
  const [slopFilters, setSlopFilters] = useState<string[]>([]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"bug" | "suggestion">("suggestion");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);


    // Search Query (uses debouncedQuery to prevent spamming AniList)
  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchAnimeAction(debouncedQuery),
    enabled: debouncedQuery.length >= 3, 
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev, // Keep old results visible while loading new ones
  });

  useEffect(() => {
    if (searchData && searchData.success) {
      setResults(searchData.data);
      setDropdownOpen(true);
      setHighlight(0);
      play("click");
    } else if (searchData && !searchData.success) {
      setResults([]);
    }
  }, [searchData, play]);
  // Scroll to results ONLY when finalData is actually rendered
  useEffect(() => {
    if (finalData && resultsRef.current) {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [finalData]);
  // Slop mutes, split by AniList taxonomy
  const excludedTags = useMemo(
    () => EXCLUDE_OPTIONS.filter((o) => o.kind === "tag" && slopFilters.includes(o.name)).map((o) => o.name),
    [slopFilters]
  );
  const excludedGenres = useMemo(
    () => EXCLUDE_OPTIONS.filter((o) => o.kind === "genre" && slopFilters.includes(o.name)).map((o) => o.name),
    [slopFilters]
  );

  // Discover Query (Phase 2 — paginated infinite scroll; filters in the key
  // reset pagination automatically)
  const {
    cards: discoverList,
    fetchNextPage: discoverFetchNextPage,
    hasNextPage: discoverHasNextPage,
    isFetchingNextPage: discoverFetchingMore,
    isLoading: discoverLoading,
    isError: discoverIsError,
    refetch: discoverRefetch,
  } = useAniListInfiniteQuery<AnimeSearchResult>(
    ["discover_v8", selectedGenres, includedTags, maxEpisodes, minRating, selectedYear, sortBy, selectedLang, slopFilters],
    (page) => discoverAnimeAction(
      {
        genres: selectedGenres,
        includedTags,
        maxEpisodes,
        excludedTags,
        excludedGenres,
        minRating,
        yearEra: selectedYear,
        sortBy,
        language: selectedLang,
      },
      page
    ),
    {
      enabled: activeTab === "discover",
      staleTime: 1000 * 60 * 5,
      maxPages: 10,
    }
  );

  const handleSlopToggle = (name: string) => {
    setSlopFilters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const runGroundedVibeSearch = async (prompt: string) => {
    setVibeLoading(true);
    setVibeError("");
    setVibeMatches([]);
    try {
      const response = await fetch(`/api/vibe-search?q=${encodeURIComponent(prompt)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Vibe Search could not find grounded matches.");
      setVibeMatches(payload.data || []);
      const reference = payload.interpretation?.reference;
      const count = payload.interpretation?.resultCount || 0;
      setVibeInterpretation(`${reference ? `Matches ${reference}` : "Matches AniList metadata"} · ${count} grounded results`);
    } catch (error) {
      setVibeMatches([]);
      setVibeError(error instanceof Error ? error.message : "Vibe Search is temporarily unavailable.");
    } finally {
      setVibeLoading(false);
    }
  };

  const handleVibeSearch = (prompt: string) => {
    void runGroundedVibeSearch(prompt);
    const value = prompt.toLowerCase();
    const genres = new Set<string>();
    let interpretation = "Popular anime, with the advanced filters ready to refine further";
    setMaxEpisodes(undefined);
    setMinRating(0);
    setSelectedYear("All Time");
    if (/villain|bad guy|evil protagonist|antagonist|anti[- ]?hero|morally grey|morally gray/.test(value)) {
      // AniList's useful indexed concept here is Anti-Hero; “Villain” is not
      // consistently populated as an anime tag, so do not query it directly.
      setIncludedTags(["Anti-Hero"]);
      interpretation = "Villain-like and antihero protagonists → AniList Anti-Hero tag";
    } else if (/dark|grim|disturbing|horror/.test(value)) {
      genres.add("Horror");
      setIncludedTags([]);
      interpretation = "Dark stories → Horror routes";
    } else if (/mystery|detective|puzzle/.test(value)) {
      genres.add("Mystery");
      setIncludedTags([]);
      interpretation = "Mystery-driven stories → Mystery routes";
    } else if (/psychological|mind[- ]?bending|deep/.test(value)) {
      genres.add("Psychological");
      setIncludedTags(["Psychological"]);
      interpretation = "Mind-bending stories → Psychological routes";
    } else if (/sci[- ]?fi|space|future/.test(value)) {
      genres.add("Sci-Fi");
      setIncludedTags([]);
      interpretation = "Science-fiction stories → Sci-Fi routes";
    } else if (/mecha|robot/.test(value)) {
      genres.add("Mecha");
      setIncludedTags([]);
      interpretation = "Robot and mecha stories → Mecha routes";
    } else if (/romance|romantic|love/.test(value)) {
      genres.add("Romance");
      setIncludedTags([]);
      interpretation = "Romance-led stories → Romance routes";
    } else if (/sports|sport/.test(value)) {
      genres.add("Sports");
      setIncludedTags([]);
      interpretation = "Sports anime → Sports routes";
    } else if (/fantasy|magic/.test(value)) {
      genres.add("Fantasy");
      setIncludedTags([]);
      interpretation = "Fantasy and magic stories → Fantasy routes";
    } else {
      setIncludedTags([]);
    }
    setSelectedGenres([...genres]);
    if (/female lead|female protagonist|woman lead|women lead/.test(value)) {
      setIncludedTags(["Female Protagonist"]);
      interpretation += " · Female Protagonist tag";
    } else if (/male lead|male protagonist|man lead/.test(value)) {
      setIncludedTags(["Male Protagonist"]);
      interpretation += " · Male Protagonist tag";
    }
    if (/revenge|vengeance|avenging/.test(value)) {
      setIncludedTags(["Revenge"]);
      interpretation += " · Revenge tag";
    }
    if (/time travel|time loop|timeline/.test(value)) {
      setIncludedTags(["Time Travel"]);
      interpretation += " · Time Travel tag";
    }
    if (/short|quick|under 26|one cour/.test(value)) {
      setMaxEpisodes(26);
      interpretation += " · at most 26 episodes";
    }
    if (/very short|mini|under 13/.test(value)) {
      setMaxEpisodes(13);
      interpretation += " · at most 13 episodes";
    }
    if (/highly rated|well rated|top rated|masterpiece|excellent/.test(value)) {
      setMinRating(8);
      interpretation += " · 8/10 minimum";
    }
    const era = value.match(/(1990s|2000s|2010s|2020s)/)?.[1];
    if (era) {
      setSelectedYear(era);
      interpretation += ` · ${era}`;
    }
    const muted = EXCLUDE_OPTIONS.filter((option) => value.includes(option.name.toLowerCase()));
    if (muted.length) setSlopFilters((previous) => [...new Set([...previous, ...muted.map((option) => option.name)])]);
    setVibeInterpretation(interpretation);
    setShowFilters(true);
    if (activeTab !== "discover") handleTabSwitch("discover");
    window.setTimeout(() => document.querySelector("[data-vibe-results]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  };

  // Infinite-scroll sentinel — fetches BEFORE the user reaches the bottom
  const discoverSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = discoverSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && discoverHasNextPage && !discoverFetchingMore) {
          discoverFetchNextPage();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [discoverHasNextPage, discoverFetchingMore, discoverFetchNextPage]);
  const handleSelect = useCallback((anime: AnimeSearchResult) => {
    setSelected(anime);
    setSelectedId(anime.anilistId || null);
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    setFinalData(null);
    setError(null);
    setProvider(null);
    setLatency(null);
  }, [setSelectedId]);

  const handleSelectSuggestion = useCallback((s: typeof initialSuggestions[number] | AnimeSearchResult) => {
    const item = s as any;
    handleSelect({
      malId: item.malId,
      anilistId: item.anilistId,
      title: item.title,
      type: "TV",
      imageUrl: item.imageUrl,
      score: item.score,
      synopsis: item.synopsis || item.desc || "",
      genres: [],
      status: item.status || "Finished Airing",
      isFranchise: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [handleSelect, initialSuggestions]);
  // Shelf-card handoff — same flow as handleSelectSuggestion, but preserves
  // the card's real format/score/status instead of hardcoded values.
  const handleSelectDiscoverCard = useCallback(
    (card: DiscoverCardData) => {
      handleSelect({
        // Coalesce exactly like the existing discover mapper (item.idMal || item.id)
        malId: card.malId ?? card.anilistId,
        anilistId: card.anilistId,
        title: card.title,
        type: card.type || "TV",
        imageUrl: card.imageUrl,
        score: card.score ?? 0,
        synopsis: "",
        genres: card.genres || [],
        status: card.status || "Finished Airing",
        isFranchise: card.isFranchise ?? true,
      });
      saveDiscoverScroll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [handleSelect, saveDiscoverScroll]
  );
  const handleGenerate = useCallback(() => {
    if (!selected) return;
    play("click");
    startGenerating(async () => {
      setError(null);
      const startTime = Date.now();

      const actionPromise = generateWatchOrderAction({
        animeName: selected.title,
        anilistId: selected.anilistId,
        malId: selected.malId || undefined,
        scope: "franchise",
        preferences: {
          timeBudget: preferences.timeBudget,
          mood: preferences.mood,
          skipPreference: preferences.skipPreference,
          includeMovies: preferences.includeMovies,
          includeOVAs: preferences.includeOVAs,
          includeSpecials: preferences.includeSpecials,
          includeRecaps: preferences.includeRecaps,
          preferredPath: preferences.preferredPath,
          language: preferences.language,
          customSchedule: preferences.customSchedule,
        },
      });

      const delayPromise = new Promise((resolve) => setTimeout(resolve, 3500));
      const [res] = await Promise.all([actionPromise, delayPromise]);

      if (res.success) {
        setFinalData(res.data.dataV2);
        setProvider(res.data.provider);
        setLatency(Date.now() - startTime);
        // Scroll is now handled by the useEffect below when finalData is painted.
        // PHASE 4: Record generation for personalized recommendations
        try {
          const { recordGeneration } = await import("@/lib/discover/taste-graph");
          const { syncGenerationToServer } = await import("@/lib/supabase/sync-generation-history");
          const generatedEntry = {
            anilistId: selected.anilistId || 0,
            title: selected.title,
            genres: [
              ...(selected.genres || []),
              ...(res.data.dataV2?.allEntriesFlat?.flatMap((e: any) => e.genres || []) || []),
            ].filter(Boolean),
            generatedAt: Date.now(),
          };
          recordGeneration(generatedEntry);           // anonymous (localStorage)
          void syncGenerationToServer(generatedEntry); // logged-in (Supabase) — fire-and-forget
        } catch {
          /* non-fatal */
        }
      } else {
        setError(res.error || "Generation execution failed");
      }
    });
  }, [selected, preferences, play]);

  const handleReset = useCallback(() => {
    setSelected(null);
    // 'replace': resetting is not a navigation step — must not stack a
    // duplicate history entry for the state the user is already leaving.
    setSelectedId(null, { history: "replace" });
    setFinalData(null);
    setQuery("");
    setError(null);
    setProvider(null);
    setLatency(null);
    setPreferences(DEFAULT_PREFERENCES);
    // Phase 3 — return the user to their exact browsing position
    if (hasVisitedDiscover && activeTab === "discover") {
      requestAnimationFrame(() =>
        window.scrollTo({ top: discoverScrollRef.current })
      );
    }
    inputRef.current?.focus();
  }, [setSelectedId, hasVisitedDiscover, activeTab]);

  // Browser Back support: when Back removes the ?id param, restore the
  // previous in-app view instead of leaving the user stuck on the selection
  // panel (which would make their SECOND Back press exit the site).
  useEffect(() => {
    if (selectedId === null && selected) {
      setSelected(null);
      setFinalData(null);
      setError(null);
      setProvider(null);
      setLatency(null);
    }
  }, [selectedId, selected]);

  // Deep-link support: /?q=<title> auto-selects that anime. Tier cards without
  // slugs, Franchise Passport, and Generation History all link here with ?q= —
  // previously nothing consumed it, so those clicks looked "ignored".
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    // Clean the URL so refresh/back doesn't re-trigger the auto-select
    window.history.replaceState({}, "", window.location.pathname);
    let cancelled = false;
    (async () => {
      try {
        const res = await searchAnimeAction(q);
        if (cancelled || !res.success || res.data.length === 0) return;
        // AniList orders search results by best match first
        handleSelect(res.data[0]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        /* non-fatal — user can search manually */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setDropdownOpen(false);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      // ONLY auto-select if the user explicitly used arrow keys to highlight an item.
      // If nothing is highlighted (highlight === -1), do nothing except keep the list open.
      if (highlight >= 0 && results[highlight]) {
        handleSelect(results[highlight]);
      } else {
        setDropdownOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setDropdownOpen(true);
      setHighlight((h) => (h === -1 ? 0 : Math.min(h + 1, results.length - 1)));
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;
    setFeedbackSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType,
          message: feedbackMsg,
          contact: feedbackContact,
          context: selected?.title || finalData?.franchise || "General",
        }),
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
        setFeedbackMsg("");
        setFeedbackContact("");
        setTimeout(() => {
          setFeedbackSubmitted(false);
          setFeedbackOpen(false);
        }, 2200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleGenreToggle = (genre: string) => {
    if (genre === "All") {
      setSelectedGenres([]);
      return;
    }
    setSelectedGenres((prev) => {
      const current = prev.filter((g) => g !== "All");
      if (current.includes(genre)) {
        return current.filter((g) => g !== genre);
      } else {
        return [...current, genre];
      }
    });
  };

  return (
    <div className="space-y-8 w-full relative">
      {/* Tabs Selector */}
      {!selected && !finalData && (
        <div className="flex justify-center border-b border-chrono-border/20 max-w-md mx-auto relative z-50">
          <button
            type="button"
            onClick={() => handleTabSwitch("builder")}
            className={cn(
              "flex-1 py-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "builder"
                ? "border-chrono-primary text-chrono-primary"
                : "border-transparent text-chrono-text-dim hover:text-chrono-text"
            )}
          >
            <Search className="w-4 h-4" />
            Find Your Path
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("discover")}
            className={cn(
              "flex-1 py-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "discover"
                ? "border-chrono-primary text-chrono-primary"
                : "border-transparent text-chrono-text-dim hover:text-chrono-text"
            )}
          >
            <Compass className="w-4 h-4" />
            Discover Library
          </button>
        </div>
      )}


      {/* Tab Content Wrapper for Auto-Scroll */}
      <div ref={tabContentRef} className="scroll-mt-20">

      {/* Search-first landing stage: the primary action comes before the supporting story. */}
      {activeTab === "builder" && !selected && !finalData && (
        <div className="relative z-50 mx-auto w-full max-w-3xl animate-fade-in">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chrono-primary">Start here</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">Search any anime</h2>
              <p className="mt-1 text-xs text-chrono-text-muted sm:text-sm">Find a franchise, then get the watch order that makes sense.</p>
            </div>
            <span className="hidden rounded-full border border-chrono-primary/25 bg-chrono-primary/10 px-3 py-1.5 text-[10px] font-bold text-violet-200 sm:inline-flex">10,000+ titles</span>
          </div>
          <label htmlFor="chrono-search" className="sr-only">Search any anime title</label>
          <div role="search" aria-label="Search for an anime watch order" className="rounded-2xl border border-chrono-primary/35 bg-chrono-surface/70 p-2 shadow-2xl shadow-chrono-primary/10 ring-1 ring-white/5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chrono-primary pointer-events-none" />
              <input
                ref={inputRef}
                id="chrono-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder={OBSCURE_TITLES[placeholderIdx]}
                // ...
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true); // Ensure dropdown opens immediately on type
              }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={dropdownOpen}
              aria-controls={listboxId}
              aria-label="Search any anime title"
              className="input-field w-full pl-12! pr-12! py-4! text-base sm:text-lg font-semibold shadow-none placeholder:text-chrono-text-dim/80"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-chrono-primary animate-spin" />
            )}
            {query && !isSearching && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-chrono-text-dim hover:text-chrono-text"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          </div>
          <p className="mt-2 px-1 text-[11px] text-chrono-text-dim">Try a franchise name, even an obscure one. Select a result to customize your route.</p>

          {dropdownOpen && (results.length > 0 || isSearching) && (
            <ul id={listboxId} role="listbox" className="absolute top-[calc(100%+0.5rem)] left-0 right-0 glass-card rounded-2xl overflow-hidden shadow-2xl z-[70] max-h-96 overflow-y-auto p-1.5">
              {isSearching && results.length === 0 && (
                <li className="p-4 text-center text-chrono-text-dim text-sm">
                  <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                  Searching AniList...
                </li>
              )}
              {results.map((item, i) => (
                <li key={`${item.anilistId}-${i}`} role="presentation">
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                      highlight === i ? "bg-chrono-primary/20 ring-1 ring-chrono-primary/40" : "hover:bg-white/5"
                    )}
                  >
                    <div className="w-10 h-14 rounded-md overflow-hidden bg-chrono-surface border border-white/5 shrink-0">
                      <SuggestionImage src={item.imageUrl} alt="" franchise={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-white block truncate">{item.title}</span>
                      <p className="text-xs text-chrono-text-dim mt-1">★ {item.score.toFixed(1)}</p>
                    </div>
                  </button>
                </li>
              ))}
              {/* Keyboard Hints Footer */}
              {results.length > 0 && (
                <li className="border-t border-chrono-border/20 mt-1.5 pt-1.5 px-1.5">
                  <div className="flex items-center justify-center gap-2 text-[11px] text-chrono-text-dim py-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-chrono-surface border border-chrono-border">↑↓</kbd>
                    <span>to navigate</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-chrono-surface border border-chrono-border">↵</kbd>
                    <span>to select</span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Grounded Intelligence hero — supporting context follows the primary action. */}
      {activeTab === "builder" && !selected && !finalData && <CinematicHero />}

      {/* Tab 2 Discover Stage with IMDb-Grade Filter controls */}
      {hasVisitedDiscover && (
        <div
          className={cn(
            // z-index removed: this container used to share z-50 with the sticky
            // site header and (being later in the DOM) painted ABOVE it — content
            // slid over the header while scrolling, worst on mobile. Without it,
            // the header (z-50) cleanly overlays all Discover content.
            "space-y-6 max-w-5xl mx-auto relative",
            // No animate-fade-in here: CSS animations RESTART on
            // display:none -> block, so preserved shelves/grid visibly
            // re-faded on every tab return — the "fuzzy" flash. Keep-alive
            // content should reappear instantly; that's its entire point.
            activeTab === "discover" && !selected && !finalData
              ? "block"
              : "hidden"
          )}
        >
          <VibeSearch onApply={handleVibeSearch} interpretation={vibeInterpretation} />

          {(vibeLoading || vibeError || vibeMatches.length > 0) && (
            <section className="rounded-2xl border border-chrono-primary/20 bg-chrono-primary/5 p-4 sm:p-5" aria-labelledby="grounded-vibe-results">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-chrono-primary">Grounded matches</p>
                  <h3 id="grounded-vibe-results" className="mt-1 text-base font-black text-white">Results that actually follow your request</h3>
                  <p className="mt-1 text-[11px] text-chrono-text-dim">Matched from AniList metadata and recommendations, not a popularity guess.</p>
                </div>
                {vibeLoading && <Loader2 className="mt-1 h-4 w-4 animate-spin text-chrono-primary" />}
              </div>
              {vibeError && <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{vibeError}</p>}
              {!vibeLoading && !vibeError && vibeMatches.length === 0 && <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">No candidates met every constraint. Try relaxing one requirement instead of showing misleading near-matches.</p>}
              {vibeMatches.length > 0 && <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{vibeMatches.map((card) => <div key={card.anilistId} className="w-[140px] shrink-0 sm:w-[160px]"><DiscoverCard card={card} onSelect={handleSelectDiscoverCard} /><div className="mt-2 space-y-1">{card.vibeReasons?.slice(0, 2).map((reason) => <p key={reason} className="text-[10px] leading-snug text-chrono-text-dim">✓ {reason}</p>)}</div></div>)}</div>}
            </section>
          )}

          {/* Zone 1 — Curated shelves (identical for every visitor; ignore the filter bar) */}
          <DiscoverShelves onSelect={handleSelectDiscoverCard} />

          <DiscoveryFeedback
            onChoose={(message) => {
              setFeedbackType("suggestion");
              setFeedbackMsg(message);
              setFeedbackOpen(true);
            }}
          />
          {/* CTA: Direct users to the filter section */}
          <div className="relative overflow-hidden rounded-2xl border border-chrono-primary/30 bg-gradient-to-r from-chrono-primary/10 to-fuchsia-600/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white">Find your next favorite</h3>
                <p className="text-xs text-chrono-text-muted mt-1">
                  Filter 10,000+ anime by genre, score, era, and language — your discovery, your rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const filterBar = document.querySelector('[data-filter-bar]');
                  filterBar?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center gap-2 text-xs font-bold text-white bg-chrono-primary px-4 py-2.5 rounded-full hover:bg-chrono-primary/90 transition-colors cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Open Advanced Filters</span>
                <span className="sm:hidden">Filters</span>
              </button>
            </div>
          </div>

          <div data-filter-bar className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-chrono-surface/30 p-4 rounded-2xl border border-chrono-border/10">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary py-2.5 px-4 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-chrono-primary" />
              <span>{showFilters ? "Hide Dynamic Filters" : "Show Deep Filters"}</span>
            </button>

            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-chrono-surface border border-chrono-border text-chrono-text text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-chrono-primary cursor-pointer font-bold"
              >
                <option value="popularity">Sort by Popularity</option>
                <option value="score">Sort by Score</option>
                <option value="underrated">Sort by Underrated Gems ★</option>
                <option value="title">Sort by Title</option>
              </select>

              <div className="flex items-center rounded-xl bg-chrono-surface border border-chrono-border p-1">
                <button
                  type="button"
                  onClick={() => setDiscoverLayout("grid")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", discoverLayout === "grid" ? "bg-chrono-primary/20 text-chrono-primary" : "text-chrono-text-dim hover:text-chrono-text")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDiscoverLayout("list")}
                  className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", discoverLayout === "list" ? "bg-chrono-primary/20 text-chrono-primary" : "text-chrono-text-dim hover:text-chrono-text")}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl border border-chrono-border/20">
                  {/* Genre multi-select selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">Genres (Multi-select)</label>
                    <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => handleGenreToggle("All")}
                        className={cn("px-2.5 py-1 text-xs rounded-full border cursor-pointer", selectedGenres.length === 0 ? "bg-chrono-primary/20 border-chrono-primary text-chrono-primary font-bold" : "bg-black/10 border-chrono-border text-chrono-text-dim")}
                      >
                        All
                      </button>
                      {GENRES.map((g) => {
                        const isSelected = selectedGenres.includes(g);
                        return (
                          <button
                            type="button"
                            key={g}
                            onClick={() => handleGenreToggle(g)}
                            className={cn("px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-all", isSelected ? "bg-chrono-primary/20 border-chrono-primary text-chrono-primary font-bold shadow-lg shadow-chrono-primary/5" : "bg-black/10 border-chrono-border text-chrono-text-dim")}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimum Rating */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#f1f0f7] uppercase tracking-wider block">Minimum Rating</label>
                    <div className="flex flex-wrap gap-1 max-h-44 overflow-y-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                        const isSelected = minRating === rating;
                        return (
                          <button
                            type="button"
                            key={rating}
                            onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer",
                              isSelected
                                ? "bg-chrono-accent/20 border-chrono-accent text-chrono-accent shadow-lg shadow-chrono-accent/10 font-extrabold"
                                : "bg-black/10 border-chrono-border text-chrono-text-dim hover:text-chrono-text"
                            )}
                          >
                            <Star className={cn("w-3 h-3 shrink-0", isSelected ? "fill-chrono-accent text-chrono-accent animate-pulse" : "text-chrono-text-dim")} />
                            <span>{rating}★+</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Era Selector & Language Selection Matrix */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">Production Era</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-chrono-surface border border-chrono-border text-chrono-text text-xs rounded-xl w-full p-2.5 cursor-pointer font-semibold"
                      >
                        <option value="All Time">All Time</option>
                        <option value="2020s">2020s (Modern)</option>
                        <option value="2010s">2010s (Golden Era)</option>
                        <option value="2000s">2000s (Classic)</option>
                        <option value="1990s">1990s (Retro)</option>
                        <option value="Classic (Pre-1990)">Pre-1990 (Vintage)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">Original Language (Origin)</label>
                      <select
                        value={selectedLang}
                        onChange={(e) => setSelectedYearLang(e.target.value)}
                        className="bg-chrono-surface border border-chrono-border text-chrono-text text-xs rounded-xl w-full p-2.5 cursor-pointer font-semibold"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filter the slop — fatigue mutes (Phase 2) */}
                  <div className="md:col-span-3 space-y-2 pt-4 border-t border-chrono-border/10">
                    <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">
                      Filter the slop — hide what you're tired of
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EXCLUDE_OPTIONS.map((opt) => {
                        const active = slopFilters.includes(opt.name);
                        return (
                          <button
                            type="button"
                            key={opt.name}
                            onClick={() => handleSlopToggle(opt.name)}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-all",
                              active
                                ? "bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold"
                                : "bg-black/10 border-chrono-border text-chrono-text-dim hover:text-chrono-text"
                            )}
                          >
                            {active ? "✕ " : ""}{opt.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-chrono-text-dim">
                      Muted categories vanish from this grid. Isekai, Harem &amp; Shounen are AniList tags; Ecchi is a genre — each routes to the right filter.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dynamic Results Grid (FIXED: removed nested grids to prevent layout collapse) */}
          <div data-vibe-results className={cn(
            discoverLayout === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "space-y-2",
            discoverLoading && !discoverFetchingMore && discoverList.length > 0 && "opacity-50 pointer-events-none transition-opacity duration-200"
          )}>
            {discoverLoading && discoverList.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className={cn("skeleton h-44 border border-chrono-border/10 shadow-lg", discoverLayout === "grid" ? "rounded-2xl" : "rounded-xl")} />
              ))
            ) : discoverList.length === 0 ? (
              discoverIsError ? (
                <div className="glass-card p-8 text-center space-y-3 rounded-2xl md:col-span-3">
                  <p className="text-sm text-chrono-text-muted">Couldn't reach AniList just now.</p>
                  <button
                    type="button"
                    onClick={() => discoverRefetch()}
                    className="btn-secondary text-xs cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="glass-card p-8 text-center text-chrono-text-muted rounded-2xl md:col-span-3">
                  No anime found matching your dynamic filter criteria. Try expanding your search.
                </div>
              )
            ) : (
              <>
                {discoverList.map((s) => (
                  <div
                    key={s.anilistId}
                    onClick={() => handleSelectSuggestion(s)}
                    className={cn(
                      "glass-card cursor-pointer border border-chrono-border/10 hover:border-chrono-primary/30 group",
                      discoverLayout === "grid" ? "overflow-hidden rounded-2xl" : "p-3 flex items-center justify-between gap-4 rounded-xl"
                    )}
                  >
                    {discoverLayout === "grid" ? (
                      <>
                        <div className="aspect-[16/10] relative overflow-hidden bg-chrono-surface">
                          <SuggestionImage src={s.imageUrl} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-chrono-primary/80 text-white">
                            ★ {s.score.toFixed(1)}
                          </span>
                        </div>
                        <div className="p-4 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-white group-hover:text-chrono-primary transition-colors text-sm truncate">{s.title}</h4>
                            <span className="text-[10px] bg-zinc-800 text-chrono-text-muted px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border border-zinc-700/50">{s.type}</span>
                          </div>
                          <p className="text-xs text-chrono-text-dim line-clamp-2 leading-relaxed">{s.synopsis}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-chrono-surface border border-white/5 shrink-0">
                            <SuggestionImage src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white group-hover:text-chrono-primary transition-colors text-sm">{s.title}</h4>
                            <p className="text-xs text-chrono-text-dim line-clamp-1 mt-1">{s.synopsis}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-[10px] bg-zinc-800 text-chrono-text-muted px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-zinc-700">{s.type}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-chrono-primary/10 text-chrono-primary border border-chrono-primary/20">★ {s.score.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Infinite-scroll sentinel + accessible manual load-more */}
          <div ref={discoverSentinelRef} className="h-10" aria-hidden="true" />
          <div className="flex justify-center">
            {discoverHasNextPage ? (
              <button
                type="button"
                onClick={() => discoverFetchNextPage()}
                disabled={discoverFetchingMore}
                className="btn-secondary text-xs font-bold inline-flex items-center gap-2 px-5 py-2.5 cursor-pointer"
              >
                {discoverFetchingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{discoverFetchingMore ? "Loading more…" : "Load more"}</span>
              </button>
            ) : discoverList.length > 0 && !discoverLoading ? (
              <p className="text-[11px] uppercase tracking-widest text-chrono-text-dim py-4">
                You've reached the end of these filters
              </p>
            ) : null}
          </div>
        </div>
      )}
      </div>

      {/* Pipeline Loader Overlay */}
      <AnimatePresence>
        {generating && (
          <PipelineLoader isComplete={!!finalData} onFinished={() => {}} />
        )}
      </AnimatePresence>

      {/* Selected Config preferences */}
      {selected && !finalData && !generating && (
        <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
          <div className="glass-card p-4 flex items-center justify-between gap-4 border-l-4 border-chrono-primary">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-chrono-surface border border-white/5 shrink-0">
                <SuggestionImage src={selected.imageUrl} alt="" franchise={selected.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-chrono-accent uppercase tracking-widest block">Building your route for</span>
                <h3 className="font-bold text-white text-base truncate">{selected.title}</h3>
                <p className="text-[11px] text-chrono-text-dim mt-0.5 font-medium">Choose your pace, path, and skip strategy below.</p>
              </div>
            </div>
            <button type="button" onClick={handleReset} className="btn-secondary py-2 px-3 text-xs shrink-0 flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <PreferencePanel preferences={preferences} onChange={setPreferences} />

          <div className="text-center">
            <button
              type="button"
              onClick={handleGenerate}
              className="btn-primary text-base px-8 py-4 shadow-xl shadow-chrono-primary/25 cursor-pointer"
            >
              <Clock className="w-5 h-5" />
              <span>Build my watch order</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Block */}
      {error && (
        <div className="max-w-2xl mx-auto glass-card p-5 border-l-4 border-rose-500 animate-fade-in space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-300">Generation failed</h3>
              <p className="text-sm text-chrono-text-muted mt-1">{error}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleGenerate} className="btn-primary text-sm cursor-pointer">Retry</button>
            <button type="button" onClick={handleReset} className="btn-secondary text-sm cursor-pointer">Start over</button>
          </div>
        </div>
      )}

      {/* VisualFlowchart Result Block */}
      {finalData && (
        <div ref={resultsRef} className="max-w-5xl mx-auto space-y-5 animate-slide-up scroll-mt-20">
          {/* Sticky Contextual Toolbar */}
          <div className="sticky top-16 z-40 -mx-4 px-4 py-3 mb-2 bg-chrono-bg/90 backdrop-blur-xl border-b border-chrono-border/20">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setFinalData(null);
                  setError(null);
                }}
                className="btn-secondary text-sm cursor-pointer"
              >
                ← Adjust preferences
              </button>
              <div className="flex items-center gap-4">
                {provider && latency != null && (
                  <span className="text-[11px] text-chrono-text-dim">via {provider} · {latency}ms</span>
                )}
                <button type="button" onClick={handleReset} className="text-sm text-[#a8a3b8] hover:text-white transition-colors cursor-pointer font-bold">
                  {activeTab === "discover" ? "Back to browsing" : "New search"}
                </button>
              </div>
            </div>
          </div>
          <VisualFlowchart data={finalData} timeBudget={preferences.timeBudget} customSchedule={preferences.customSchedule} />
        </div>
      )}

      {/* CTA: Direct users to Discover filters */}
      {activeTab === "builder" && !selected && !finalData && (
        <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
          <button
            type="button"
            onClick={() => {
              handleTabSwitch("discover", { scroll: false });
              setTimeout(() => {
                const filterBar = document.querySelector('[data-filter-bar]');
                filterBar?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
            }}
            className="w-full glass-card rounded-2xl border border-chrono-border/30 p-4 flex items-center justify-between gap-4 hover:border-chrono-primary/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chrono-primary/15 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5 text-chrono-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Not sure what to search?</h3>
                <p className="text-xs text-chrono-text-dim">Browse 10,000+ anime by genre, score, and era</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-chrono-text-dim shrink-0" />
          </button>
        </div>
      )}

      {activeTab === "builder" && !selected && !finalData && (
        <HomepageDiscovery
          items={initialSuggestions}
          onSelect={handleSelectSuggestion}
          onOpenLibrary={() => handleTabSwitch("discover")}
        />
      )}

      {/* Currently Airing Carousel */}
      {activeTab === "builder" && !selected && !finalData && airingAnime.length > 0 && (
        <div className="max-w-7xl mx-auto animate-fade-in mb-8">
          <AiringCarousel 
            anime={airingAnime} 
            onSelect={(item) => {
              handleSelect({
                malId: 0,
                anilistId: item.id,
                title: item.title,
                type: "TV",
                imageUrl: item.coverImage,
                score: 0,
                synopsis: "",
                genres: [],
                status: "Finished Airing",
                isFranchise: true,
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      {/* Landing SEO Tier Blocks */}
      {activeTab === "builder" && !selected && !finalData && (
        <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Map className="w-4 h-4" />, title: "Spoiler-safe paths", desc: "Optimal order preserves reveals. Chronological when you want lore." },
              { icon: <Eye className="w-4 h-4" />, title: "Smart skip", desc: "Keep story, skip pure filler & recaps. Canon-only when ruthless." },
              { icon: <Clock className="w-4 h-4" />, title: "Real finish dates", desc: "Casual → Binge paces. Exact minutes, not rounded fluff." },
            ].map((f) => (
              <div key={f.title} className="glass-card p-4 border border-chrono-border/30 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-lg bg-chrono-primary/15 text-chrono-primary flex items-center justify-center shrink-0">{f.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-chrono-text">{f.title}</h3>
                  <p className="text-xs text-chrono-text-dim mt-1.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {SEO_TIERS.map((tier) => (
            <div key={tier.id} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <p className="text-xs text-[#a8a3b8] mt-1">{tier.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {tier.anime.map((a) => {
                  const suggestion = initialSuggestions.find(s => s.title === a.title);
                  const imageUrl = suggestion?.imageUrl || "";
                  const href = a.slug ? `/watch-order/${a.slug}` : `/?q=${encodeURIComponent(a.title)}`;
                  return (
                    <a
                      key={a.title}
                      href={href}
                      className="glass-card p-0 overflow-hidden text-left group border border-chrono-border/30 hover:border-chrono-primary/40 transition-all cursor-pointer"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden bg-chrono-surface">
                        <SuggestionImage src={imageUrl} alt={a.title} franchise={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-chrono-primary/80 text-white">{a.tag}</span>
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-bold text-white group-hover:text-chrono-primary transition-colors line-clamp-1">{a.title}</h4>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating feedback system */}
      <div className="fixed bottom-5 left-5 z-[100]">
        {feedbackOpen ? (
          <div className="glass-card w-[min(100vw-2rem,22rem)] p-4 shadow-2xl animate-slide-up border border-chrono-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Feedback</h3>
              <button type="button" onClick={() => setFeedbackOpen(false)} className="text-chrono-text-dim hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {feedbackSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <Check className="w-8 h-8 text-chrono-success mx-auto" />
                <p className="text-sm text-chrono-text-muted">Thanks — sent.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <div className="flex gap-2">
                  {(["suggestion", "bug"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeedbackType(t)}
                      className={cn("flex-1 text-xs py-1.5 rounded-lg font-semibold border transition-colors cursor-pointer", feedbackType === t ? "bg-chrono-primary/20 border-chrono-primary/40 text-chrono-primary" : "border-chrono-border text-[#6b6580]")}
                    >
                      {t === "bug" ? "Bug" : "Idea"}
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  required
                  rows={3}
                  placeholder="What should we improve?"
                  className="input-field text-sm resize-none"
                />
                <input
                  type="text"
                  value={feedbackContact}
                  onChange={(e) => setFeedbackContact(e.target.value)}
                  placeholder="Contact (optional)"
                  className="input-field text-sm"
                />
                <button type="submit" disabled={feedbackSubmitting || !feedbackMsg.trim()} className="btn-primary w-full text-sm py-2.5 cursor-pointer">
                  {feedbackSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </form>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-br from-chrono-primary to-fuchsia-600 text-white shadow-lg shadow-chrono-primary/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold">Feedback</span>
          </button>
        )}
      </div>
    </div>
  );
}
