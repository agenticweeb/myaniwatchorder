"use client";
import { groupByHeuristic } from "@/lib/grouping/heuristic-grouper";
import { CollapsibleArc } from "@/components/CollapsibleArc";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import TrailerButton from "@/components/TrailerButton";
import { FranchisePulse } from "@/components/FranchisePulse";
import { AiringCountdown } from "@/components/AiringCountdown";
import { BeyondHorizon } from "@/components/BeyondHorizon";
import { FlagTooltip } from "@/components/FlagTooltip";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Clock,
  Star,
  AlertTriangle,
  Info,
  Share2,
  Play,
  SkipForward,
  CalendarDays,
  X,
  Target,
  Map,
  Layers,
  Sparkles,
  Tv,
  Film,
  ArrowLeft,
  CalendarCheck2,
  ShieldCheck, // <--- ADD THIS
  MessageCircle,
  Mail,
  Send,
  Facebook,
  Twitter,
  Copy,
} from "lucide-react";
import {
  WatchOrderResultV2,
  WatchOrderEntryV2,
  EntryTier,
  CustomSchedule,
} from "@/types/intelligent";
import {
  calculateTimeBudget,
  paceFromTimeBudget,
} from "@/lib/time-calculator";
import { TimeBudgetCard } from "@/components/TimeBudgetCard";
import { useProgress } from "@/hooks/useProgress";
import { cn, generateShareText } from "@/lib/utils";
import { SuggestionImage } from "@/components/SuggestionImage";
import {
  generateWatchCalendarIcs,
  downloadIcsFile,
} from "@/lib/calendar-generator";
import { buildFocusedResult } from "@/lib/focus-entry";
import { ShareCard } from "@/components/ShareCard";
import { FranchiseDNA } from "@/components/FranchiseDNA";
import { computeDNA } from "@/lib/dna";

interface FlowchartV2Props {
  data: WatchOrderResultV2;
  timeBudget?: string;
  onBackFromFocus?: () => void;
  customSchedule?: CustomSchedule;
}

function getYoutubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (match?.[1])
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  if (url.includes("youtube.com/embed/"))
    return url.includes("?") ? `${url}&autoplay=1` : `${url}?autoplay=1`;
  return null;
}

const tierConfig: Record<
  EntryTier,
  { label: string; color: string; bg: string; border: string; badge: string; shadow: string }
> = {
  essential: {
    label: "Essential",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    shadow: "shadow-[0_0_15px_rgba(52,211,153,0.12)]",
  },
  recommended: {
    label: "Recommended",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    shadow: "shadow-[0_0_15px_rgba(56,189,248,0.12)]",
  },
  optional: {
    label: "Optional",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    shadow: "shadow-[0_0_15px_rgba(251,191,36,0.12)]",
  },
  skip: {
    label: "Skip",
    color: "text-zinc-500",
    bg: "bg-zinc-800/40",
    border: "border-zinc-700/50",
    badge: "bg-zinc-800 text-zinc-500 border-zinc-700/50",
    shadow: "shadow-none",
  },
};

const easeSpring = [0.16, 1, 0.3, 1] as const;

export default function FlowchartV2({
  data: initialData,
  timeBudget = "regular",
  customSchedule,
}: FlowchartV2Props) {
  const [focusEntry, setFocusEntry] = useState<WatchOrderEntryV2 | null>(null);

  const data = useMemo(() => {
    if (!focusEntry) return initialData;
    return buildFocusedResult(focusEntry, initialData.franchise);
  }, [focusEntry, initialData]);

  const isFocused = !!focusEntry;

  const [activePathId, setActivePathId] = useState<string>(
    data.recommendedPathId || data.paths[0]?.id
  );

  useEffect(() => {
    setActivePathId(data.recommendedPathId || data.paths[0]?.id);
    setExpandedGroups(
      new Set(
        [data.paths[0]?.groups[0]?.id, data.paths[0]?.groups[1]?.id].filter(
          Boolean
        ) as string[]
      )
    );
  }, [data.franchiseId, data.recommendedPathId]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () =>
      new Set(
        [data.paths[0]?.groups[0]?.id, data.paths[0]?.groups[1]?.id].filter(
          Boolean
        ) as string[]
      )
  );
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(
    new Set()
  );
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(
    null
  );
  // Show ALL tiers by default — the "Smart Windowing" (initial 6 entries
  // + "Show full path") handles progressive disclosure instead. The old
  // essential-only default hid most of the timeline and the tier toggles
  // read as "remove" filters when they should reveal.
  const [visibleTiers, setVisibleTiers] = useState<Set<string>>(
    new Set(["essential", "recommended", "optional", "skip"])
  );

  const toggleTier = (tier: string) => {
    setVisibleTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      // Safety: never hide ALL tiers — reset to full view instead of empty
      if (next.size === 0) {
        return new Set(["essential", "recommended", "optional", "skip"]);
      }
      return next;
    });
  };
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [liveTimeBudget, setLiveTimeBudget] = useState<string>(timeBudget || "regular");
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [_, startTimelineTransition] = useTransition();
  const INITIAL_VISIBLE_COUNT = 6;
  const [calStartDate, setCalStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [calEpsPerDay, setCalEpsPerDay] = useState(2);
  const [calStartTime, setCalStartTime] = useState("20:00");

  const activePath =
    data.paths.find((p) => p.id === activePathId) || data.paths[0];

  const heroImage =
    data.franchiseImage ||
    activePath?.groups?.[0]?.entries?.[0]?.imageUrl ||
    activePath?.groups?.[0]?.entries?.[0]?.coverImage?.large ||
    "";

  const pathEntries =
    activePath?.groups.flatMap((g) => g.entries) || data.allEntriesFlat || [];

  const { progress, toggleWatched, getCompletionRate } = useProgress(
    data.franchiseId
  );
  // Calculate the total episodes in the current timeline path
  const totalTimelineEpisodes = pathEntries.reduce((sum, e) => sum + (e.episodeCount || 1), 0);
  const completionRate = getCompletionRate(totalTimelineEpisodes);

  const timeData = useMemo(
    () =>
      calculateTimeBudget(
        data.franchise,
        pathEntries.map((e) => {
          // FIX: Strictly use releasedEpisodeCount for math to exclude upcoming episodes
          const releasedCount = typeof (e as any).releasedEpisodeCount === "number" 
            ? (e as any).releasedEpisodeCount 
            : e.episodeCount ?? 1;
            
          return {
            title: e.title,
            episodes: releasedCount, // Pass released count as primary episodes for math
            releasedEpisodes: releasedCount,
            durationMin: e.durationMinutes ?? 24,
            tier: e.tier,
            isFiller: e.isFiller && e.tier === "skip",
          };
        }),
        new Date(),
        { customSchedule } 
      ),
    [data.franchise, pathEntries, customSchedule]
  );
    const preferredPace = paceFromTimeBudget(timeBudget);
  
  // Find the active pace data based on the liveTimeBudget state (defaults to Regular)
  const activePace = timeData?.paces?.find(p => p.label.toLowerCase() === liveTimeBudget) || timeData?.paces?.[1] || timeData?.paces?.[0] || { finishDate: '', durationShort: '', relativeLabel: '' };
  
  // Format the finish date safely
  const formattedFinishDate = activePace.finishDate 
    ? new Date(`${activePace.finishDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
    : 'Calculating...';

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `MyAniWatchOrder - ${data.franchise} Watch Order`,
      text: `Check out my watch order for ${data.franchise} on MyAniWatchOrder!`,
      url: url,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return;
      }
    }
    
    setIsShareOpen(true);
  };

  const shareToPlatform = (platform: string) => {
    const url = window.location.href;
    const title = `MyAniWatchOrder - ${data.franchise} Watch Order`;
    let shareUrl = '';
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
        break;
    }
    
    if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setIsShareOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => {
      setLinkCopied(false);
      setIsShareOpen(false);
    }, 1500);
  };

  const handleExportCalendar = () => {
    const legacyEntries = pathEntries.map((e) => ({
      title: e.title,
      episodes: e.episodeCount ?? 1,
      durationMin: e.durationMinutes ?? 24,
      tier: e.tier,
    }));
    const icsContent = generateWatchCalendarIcs(
      data.franchise,
      legacyEntries as any,
      {
        startDate: calStartDate,
        episodesPerDay: calEpsPerDay,
        watchStartTime: calStartTime,
        customSchedule,
      }
    );
    const slug = data.franchise.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadIcsFile(`myaniwatchorder-${slug}-schedule.ics`, icsContent);
    setIsCalOpen(false);
  };

  if (!data?.paths?.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="text-white font-semibold">No watch order generated</h3>
      </div>
    );
  }

  // Extract color and fallback to indigo if missing
  const themeColor = data.franchiseColor || "#a78bfa";

  return (
    // Inject CSS variable scoped to this component
    <div 
      className="w-full max-w-5xl mx-auto space-y-6" 
      style={{ "--theme-accent": themeColor } as React.CSSProperties}
    >
      {/* Focus banner */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-chrono-primary/30 bg-chrono-primary/10 px-4 py-3"
          >
            <button
              onClick={() => setFocusEntry(null)}
              className="btn-secondary py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to {initialData.franchise}
            </button>
            <p className="text-xs text-chrono-text-muted">
              Focused season only — same cover & data as the card you clicked. No
              re-search.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero header */}
      {/* Dynamic border and ambient glow using --theme-accent */}
      <div 
        className="glass-card overflow-hidden relative border rounded-2xl transition-colors duration-500" 
        style={{ 
          borderColor: `${themeColor}40`, 
          boxShadow: `0 0 80px -20px ${themeColor}` 
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {heroImage && (
            <div
              className="absolute inset-0 opacity-20 blur-2xl scale-110"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-chrono-bg via-chrono-bg/95 to-chrono-primary/20" />
        </div>

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {heroImage && (
              <div className="w-28 h-40 sm:w-32 sm:h-48 rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0 mx-auto sm:mx-0">
                <SuggestionImage
                  src={heroImage}
                  alt={data.franchise}
                  franchise={data.franchise}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {data.franchise}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-chrono-primary/20 text-violet-200 border border-violet-500/30 uppercase tracking-wider">
                  {data.classification.replace(/_/g, " ")}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-chrono-text-muted leading-relaxed max-w-3xl">
                {data.summary}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-chrono-text-dim">
                <span className="inline-flex items-center gap-2 rounded-full border border-chrono-border/60 bg-white/5 px-3 py-1.5 text-chrono-text">
                  <Sparkles className="w-3.5 h-3.5 text-chrono-primary" />
                  {data.classification.replace(/_/g, " ")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-chrono-border/60 bg-chrono-primary/10 px-3 py-1.5 text-chrono-primary">
                  Confidence {Math.round(data.confidence)}%
                </span>
                {/* Verified Trust Signal */}
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified: {data.graphStats?.totalNodesDiscovered || 0} AniList Relations
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/80 max-w-3xl leading-relaxed mb-1">
                Grounded in verified database IDs. Zero AI hallucinations.
              </p>
              {data.classificationReason && (
                <p className="text-xs text-chrono-text-muted max-w-3xl leading-relaxed">
                  {data.classificationReason}
                </p>
              )}

              {data.whyConfusing && (
                <div className="flex gap-2 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 max-w-3xl">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-100/85">
                    <span className="font-semibold text-amber-300">
                      Why it confuses people:{" "}
                    </span>
                    {data.whyConfusing}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-chrono-text-dim">
                <span className="inline-flex items-center gap-1.5 text-chrono-text-muted">
                  <Clock className="w-3.5 h-3.5 text-chrono-primary" />
                  <strong className="text-chrono-text">
                    {activePath?.totalTime || data.totalDuration}
                  </strong>{" "}
                  this path
                </span>
                <span>
                  {activePath?.totalEntries || data.totalEntries} titles
                </span>
                <span>
                  {activePath?.totalEpisodes || data.totalEpisodes} episodes
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-4 mt-2 border-t border-white/5">
                {/* Finish Date & Pace */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-chrono-text-dim uppercase tracking-wider mb-1">Estimated Finish</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-extrabold text-white">
                      {formattedFinishDate}
                    </span>
                    <span className="text-xs text-chrono-text-muted">
                      {activePace.relativeLabel ? `${activePace.relativeLabel} · ` : ''}{activePace.durationShort || ''}
                    </span>
                  </div>
                  
                  {/* Inline Pace Toggle */}
                  <div className="flex gap-1.5 mt-2">
                    {["casual", "regular", "dedicated", "binge"].map((p) => (
                      <button 
                        key={p} 
                        onClick={() => setLiveTimeBudget(p)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer capitalize",
                          liveTimeBudget === p 
                            ? "bg-chrono-primary border-chrono-primary text-white" 
                            : "border-chrono-border text-chrono-text-dim hover:bg-white/5"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="w-full sm:w-auto sm:flex sm:flex-col sm:items-end gap-2">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsCalOpen(true)}
                      className="btn-secondary py-2 px-3 text-xs inline-flex items-center gap-1.5 border-chrono-primary/30 text-chrono-primary cursor-pointer"
                    >
                      <CalendarDays className="w-3.5 h-3.5" /> Schedule
                    </button>
                    <button
                      onClick={handleShare}
                      className="btn-secondary py-2 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      {linkCopied ? "Copied!" : "Share"}
                    </button>
                  </div>
                  <div className="w-full sm:w-40">
                    <div className="flex justify-between text-[11px] text-chrono-text-muted mb-1">
                      <span>Progress</span>
                      <span>{completionRate}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-chrono-primary to-chrono-accent transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time experience for active path */}
      <TimeBudgetCard data={timeData} preferredPaceLabel={customSchedule?.enabled ? "Custom" : preferredPace} />

      {/* Franchise DNA - Structural Complexity Report */}
      <FranchiseDNA dna={computeDNA(data)} franchiseName={data.franchise} />

      {/* Shareable Card Integration */}
      <ShareCard result={data} />

      {/* Path picker */}
      {data.paths.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-chrono-text-dim font-bold px-1">
            Choose a path
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {data.paths.map((path) => {
              const isActive = path.id === activePathId;
              return (
                <button
                  key={path.id}
                  onClick={() => setActivePathId(path.id)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-start gap-1.5 px-4 py-3 rounded-2xl border text-left transition-all min-w-[210px] max-w-[280px] cursor-pointer",
                    isActive
                      ? "bg-white text-black border-white shadow-xl"
                      : "bg-chrono-surface/80 text-zinc-300 border-chrono-border hover:border-chrono-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[13px]">{path.name}</span>
                    {path.isRecommended && (
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                          isActive
                            ? "bg-black/10"
                            : "bg-violet-500/20 text-violet-300"
                        )}
                      >
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs line-clamp-2 leading-snug",
                      isActive ? "text-black/60" : "text-zinc-500"
                    )}
                  >
                    {path.description}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] mt-0.5 font-bold",
                      isActive ? "text-black/50" : "text-zinc-600"
                    )}
                  >
                    {path.totalTime}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Groups timeline with premium transitions */}
      {activePath && (
        <div className="space-y-3">
          {/* Tier Disclosure Controls */}
          <div className="flex flex-wrap gap-2 items-center justify-center mb-4">
            <span className="text-xs text-chrono-text-dim font-bold uppercase tracking-wider mr-2">Showing:</span>
            <button onClick={() => toggleTier("essential")} className={cn("px-3 py-1 text-xs rounded-full border cursor-pointer transition-all", visibleTiers.has("essential") ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "bg-black/10 border-chrono-border text-chrono-text-dim")}>
              Essential
            </button>
            <button onClick={() => toggleTier("recommended")} className={cn("px-3 py-1 text-xs rounded-full border cursor-pointer transition-all", visibleTiers.has("recommended") ? "bg-sky-500/20 border-sky-500/50 text-sky-300" : "bg-black/10 border-chrono-border text-chrono-text-dim")}>
              Recommended
            </button>
            <button onClick={() => toggleTier("optional")} className={cn("px-3 py-1 text-xs rounded-full border cursor-pointer transition-all", visibleTiers.has("optional") ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-black/10 border-chrono-border text-chrono-text-dim")}>
              Optional
            </button>
            <button onClick={() => toggleTier("skip")} className={cn("px-3 py-1 text-xs rounded-full border cursor-pointer transition-all", visibleTiers.has("skip") ? "bg-zinc-700/40 border-zinc-600 text-zinc-400" : "bg-black/10 border-chrono-border text-chrono-text-dim")}>
              Skip
            </button>
          </div>

          {activePath.groups.map((group, gIdx) => {
            const isOpen = expandedGroups.has(group.id);
            const isMain = group.timelineType === "main_timeline";
            return (
              <div
                key={group.id}
                className={cn(
                  "rounded-2xl border overflow-hidden backdrop-blur-sm transition-all duration-300",
                  isMain
                    ? "border-chrono-primary/25 bg-chrono-surface/50"
                    : "border-chrono-border/50 bg-chrono-surface/30"
                )}
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        isMain
                          ? "bg-chrono-primary/20 text-violet-200"
                          : "bg-zinc-800 text-zinc-400"
                      )}
                    >
                      {isMain ? (
                        <Map className="w-4 h-4" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-chrono-text-dim font-mono">
                          {String(gIdx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-bold text-white text-[15px]">
                          {group.name}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-white">
                        {group.totalEntries} titles
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {group.totalTime}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "p-1 rounded-lg transition-transform duration-300",
                        isOpen && "rotate-90"
                      )}
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: easeSpring }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4 bg-black/25 border-t border-white/5 relative film-stripe">
                        {group.orderNote && (
                          <div className="flex gap-2 text-xs text-sky-200/90 bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{group.orderNote}</span>
                          </div>
                        )}
                        <div className="relative">
                          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-chrono-primary/40 to-transparent hidden sm:block" />
                          <div className="space-y-4">
                            {(() => {
                              // 1. Filter and slice the entries (Smart Windowing)
                              const windowedEntries = group.entries
                                .filter((e) => visibleTiers.has(e.tier))
                                .slice(0, isTimelineExpanded ? undefined : INITIAL_VISIBLE_COUNT);
                              
                              // 2. Group the windowed entries into Arcs (Heuristic Grouping)
                              // Safely extract the numeric AniList ID from the franchiseId string (e.g., "fr_21" -> 21)
const rootAnilistId = data.franchiseId?.startsWith('fr_') ? parseInt(data.franchiseId.replace('fr_', ''), 10) : undefined;
const arcGroups = groupByHeuristic(windowedEntries, rootAnilistId);
                              
                              // 3. Render the Collapsible Arcs (or flat if only 1 group)
                              if (arcGroups.length === 1) {
                                // If only 1 group, render flat to avoid an unnecessary wrapper
                                return arcGroups[0].entries.map((entry, idx) => (
                                  <EntryNode
                                    key={`flat-${entry.id}-${idx}`}
                                    entry={entry}
                                    index={idx + 1}
                                    isExpanded={expandedEntries.has(entry.id)}
                                    onToggle={() => toggleEntry(entry.id)}
                                    isWatched={!!progress?.entries[entry.id]?.watched}
                                    onToggleWatched={() => toggleWatched(entry.id, entry as any)}
                                    onPlayTrailer={setActiveTrailerUrl}
                                    onFocus={() => {
                                      setFocusEntry(entry);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    showFocus={!isFocused}
                                    isLast={idx === windowedEntries.length - 1}
                                  />
                                ));
                              }

                              // If multiple groups, render as Collapsible Arcs
                              return arcGroups.map((arc, arcIdx) => {
                                const startIndex = windowedEntries.findIndex(e => e.id === arc.entries[0].id);
                                
                                return (
                                  <CollapsibleArc key={arc.id} arc={arc} defaultOpen={arcIdx === 0}>
                                    {arc.entries.map((entry, idx) => (
                                      <EntryNode
                                        key={`${arc.id}-${entry.id}-${idx}`}
                                        entry={entry}
                                        index={startIndex + idx + 1}
                                        isExpanded={expandedEntries.has(entry.id)}
                                        onToggle={() => toggleEntry(entry.id)}
                                        isWatched={!!progress?.entries[entry.id]?.watched}
                                        onToggleWatched={() => toggleWatched(entry.id, entry as any)}
                                        onPlayTrailer={setActiveTrailerUrl}
                                        onFocus={() => {
                                          setFocusEntry(entry);
                                          window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        showFocus={!isFocused}
                                        isLast={startIndex + idx === windowedEntries.length - 1}
                                      />
                                    ))}
                                  </CollapsibleArc>
                                );
                              });
                            })()}
                            
                            {/* Smart Windowing Controls (Outside the arcs) */}
                            {group.entries.filter((e) => visibleTiers.has(e.tier)).length > INITIAL_VISIBLE_COUNT && (
                              <div className="flex justify-center pt-2 gap-3">
                                {!isTimelineExpanded ? (
                                  <button
                                    onClick={() => startTimelineTransition(() => setIsTimelineExpanded(true))}
                                    className="min-h-[44px] rounded-full bg-chrono-primary/15 px-5 text-sm font-medium text-chrono-primary transition-opacity hover:bg-chrono-primary/25 cursor-pointer"
                                  >
                                    Show full path ({group.entries.filter((e) => visibleTiers.has(e.tier)).length - INITIAL_VISIBLE_COUNT} more)
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setIsTimelineExpanded(false)}
                                    className="min-h-[44px] rounded-full border border-white/10 px-5 text-sm text-white/70 hover:bg-white/5 cursor-pointer"
                                  >
                                    Collapse
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar modal */}
      {isCalOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <div className="glass-card w-full max-w-md overflow-hidden shadow-2xl border border-chrono-border rounded-2xl">
              <div className="p-5 border-b border-chrono-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-chrono-primary" />
                  <h3 className="text-lg font-bold">Export schedule</h3>
                </div>
                <button
                  onClick={() => setIsCalOpen(false)}
                  className="p-1.5 rounded-lg bg-chrono-surface hover:bg-chrono-surface-hover cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {customSchedule?.enabled ? (
                  <div className="flex gap-2.5 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 leading-relaxed">
                    <CalendarCheck2 className="w-5 h-5 flex-shrink-0 text-indigo-400" />
                    <div>
                      <span className="font-bold text-white block mb-0.5">Custom Schedule Active</span>
                      Calendar events will be scheduled precisely within your active days and hours as configured in your preferences. Daily pace is overridden.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-chrono-text-muted">Pace</span>
                        <span className="text-chrono-primary font-bold">
                          {calEpsPerDay} ep/day
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 4, 8].map((v) => (
                          <button
                            key={v}
                            onClick={() => setCalEpsPerDay(v)}
                            className={cn(
                              "py-2 rounded-lg text-xs font-semibold border cursor-pointer",
                              calEpsPerDay === v
                                ? "bg-chrono-primary border-chrono-primary text-white"
                                : "bg-chrono-surface border-chrono-border/50 text-chrono-text-dim"
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">
                        Daily start time
                      </label>
                      <input
                        type="time"
                        value={calStartTime}
                        onChange={(e) => setCalStartTime(e.target.value)}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-chrono-text-muted uppercase tracking-wider block">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={calStartDate}
                    onChange={(e) => setCalStartDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-chrono-border/40 flex justify-end gap-3 bg-chrono-surface/20">
                <button
                  onClick={() => setIsCalOpen(false)}
                  className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportCalendar}
                  className="btn-primary py-2.5 px-5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" /> Download .ics
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Trailer modal */}
      {activeTrailerUrl &&
        typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden relative border border-zinc-800 shadow-2xl bg-black">
              <button
                onClick={() => setActiveTrailerUrl(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white z-50 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              {getYoutubeEmbedUrl(activeTrailerUrl) ? (
                <iframe
                  src={getYoutubeEmbedUrl(activeTrailerUrl)!}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-zinc-400">
                  <Play className="w-12 h-12 mb-3" />
                  <a
                    href={activeTrailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-chrono-primary underline text-sm"
                  >
                    {activeTrailerUrl}
                  </a>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Custom Share Modal */}
      {isShareOpen && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]" onClick={() => setIsShareOpen(false)}>
          <div className="glass-card w-full max-w-sm overflow-hidden shadow-2xl border border-chrono-border rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-chrono-border/40 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-chrono-primary" />
                Share Timeline
              </h3>
              <button onClick={() => setIsShareOpen(false)} className="p-1.5 rounded-lg bg-chrono-surface hover:bg-chrono-surface-hover cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-chrono-text-muted text-center mb-4">
                Share your {data.franchise} watch order with your friends!
              </p>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => shareToPlatform('whatsapp')} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">WhatsApp</span>
                </button>
                <button onClick={() => shareToPlatform('twitter')} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                    <Twitter className="w-5 h-5 text-sky-400" />
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">X / Twitter</span>
                </button>
                <button onClick={() => shareToPlatform('facebook')} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Facebook className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">Facebook</span>
                </button>
                <button onClick={() => shareToPlatform('telegram')} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                    <Send className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">Telegram</span>
                </button>
                <button onClick={() => shareToPlatform('email')} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Mail className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">Email</span>
                </button>
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-chrono-surface transition-colors cursor-pointer group">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${linkCopied ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-violet-500/10 border border-violet-500/20 group-hover:bg-violet-500/20'}`}>
                    {linkCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-violet-400" />}
                  </div>
                  <span className="text-[11px] text-chrono-text-dim font-medium">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* BEYOND HORIZON - RECOMMENDATIONS (Hidden for standalone movies) */}
      {data.classification !== "single_core" && (
        <BeyondHorizon 
          currentDNA={computeDNA(data)} 
          currentName={data.franchise} 
          currentSlug={(data as any).franchiseId?.replace('fr_', '')} 
        />
      )}

    </div> // <--- This is the final closing div of the FlowchartV2 component
  );
}
function StudioFlagBadge({ flag }: { flag: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Parse flag string like "different-studio:WIT:MAPPA"
  const parts = flag.split(':');
  const oldStudio = parts[1] || 'Previous';
  const newStudio = parts[2] || 'New';

  const openTooltip = () => {
    const el = badgeRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    // Center the 256px (w-64) tooltip on the badge, clamped inside the viewport
    const left = Math.min(
      Math.max(r.left + r.width / 2 - 128, 8),
      window.innerWidth - 264
    );
    // Prefer above the badge; flip below when the badge is near the viewport top
    const above = r.top > 130;
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above });
    setShow(true);
  };

  // Close on scroll/resize (a fixed tooltip must never detach from its badge)
  // and on outside click (mobile taps).
  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    const onDocClick = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("click", onDocClick);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("click", onDocClick);
    };
  }, [show]);

  return (
    <>
      <div
        ref={badgeRef}
        className="inline-flex"
        onMouseEnter={openTooltip}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (show) setShow(false);
          else openTooltip();
        }}
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full cursor-pointer touch-manipulation">
          <AlertTriangle className="w-3 h-3" /> Studio Change
        </span>
      </div>

      {show && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: pos.above ? "translateY(-100%)" : undefined,
            }}
            className="z-[99999] w-64 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl text-xs text-slate-400 leading-relaxed pointer-events-none"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Animation Studio Changed
            </div>
            <p>
              Production moved from{" "}
              <span className="text-slate-200 font-medium">{oldStudio}</span> to{" "}
              <span className="text-slate-200 font-medium">{newStudio}</span>.
              This may affect art style and pacing.
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
// ... EntryNode function starts here ...
function EntryNode({
  entry,
  index,
  isExpanded,
  onToggle,
  isWatched,
  onToggleWatched,
  onPlayTrailer,
  onFocus,
  showFocus,
  isLast,
}: {
  entry: WatchOrderEntryV2;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isWatched: boolean;
  onToggleWatched: () => void;
  onPlayTrailer: (url: string) => void;
  onFocus: () => void;
  showFocus: boolean;
  isLast: boolean;
}) {
  const tier = tierConfig[entry.tier] || tierConfig.optional;
  const FormatIcon =
    entry.format === "MOVIE" ? Film : entry.format === "TV" ? Tv : Sparkles;
  const airing =
    entry.status === "Airing" ||
    entry.status === "RELEASING" ||
    entry.status === "Upcoming";

  return (
    <div className={cn("relative pl-12 sm:pl-16", !isLast && "pb-1")}>
      {/* Node Dot with pulsing active glows */}
      <div
        className={cn(
          "absolute left-4 sm:left-6 top-6 w-4 h-4 rounded-full border-2 z-10 flex items-center justify-center text-[8px] font-bold transition-all duration-300",
          tier.shadow,
          isWatched
            ? "bg-chrono-success border-chrono-success text-white"
            : entry.tier === "essential"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : entry.tier === "recommended"
                ? "bg-sky-500 border-sky-500 text-white"
                : entry.tier === "optional"
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-zinc-600 border-zinc-600 text-white"
        )}
      >
        {isWatched ? <Check className="w-2.5 h-2.5" /> : index}
      </div>

      <div
        className={cn(
          "glass-card mb-3 transition-all border rounded-2xl duration-300",
          tier.border,
          tier.bg,
          tier.shadow,
          isWatched && "opacity-55",
          // FIX: Visually mute non-essential nodes to make the main path dominant
          (entry.tier === "optional" || entry.tier === "skip") && !isWatched && "opacity-60 hover:opacity-100 scale-[0.98]"
        )}
        style={{ boxShadow: entry.tier === "essential" || entry.tier === "recommended" ? `0 0 30px -15px var(--theme-accent, #6366f1)` : 'none' }}
      >
        <div
          className="p-3.5 sm:p-4 cursor-pointer flex gap-4 touch-manipulation active:bg-white/5 active:scale-[0.99] transition-all duration-150"
          onClick={onToggle}
        >
          {/* Card Poster with premium watermark */}
          <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0 relative">
            <SuggestionImage
              src={entry.imageUrl}
              alt={entry.title}
              franchise={entry.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-1">
              <span
                className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-md",
                  tier.badge
                )}
              >
                {tier.label.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <FormatIcon className="w-3 h-3" /> {entry.format}
              </span>
              {airing && (
                <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  {entry.status === "Upcoming" ? "UPCOMING" : "AIRING"}
                </span>
              )}
              {entry.arcName && (
                <span className="text-[10px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">
                  {entry.arcName}
                </span>
              )}
              {entry.episodeRange && (
                <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                  Eps {entry.episodeRange}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <h3 className="font-bold text-white line-clamp-2 leading-snug">
                {entry.title}
              </h3>
              {entry.flags?.some(f => f.startsWith("different-studio")) && (
                <StudioFlagBadge flag={entry.flags.find(f => f.startsWith("different-studio"))!} />
              )}
            </div>
            {/* Visceral Tier Reason Pill */}
            {entry.tier !== "essential" && (
              <div className={cn(
                "mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit",
                entry.tier === "recommended" && "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                entry.tier === "optional" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                entry.tier === "skip" && "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {entry.tier === "recommended" && "Enhances main story"}
                {entry.tier === "optional" && `Optional · Adds ${entry.timeEstimate}`}
                {entry.tier === "skip" && "Skip · Filler / Recap"}
              </div>
            )}
            {entry.status === "RELEASING" && (entry as any).nextAiringEpisode && (
              <AiringCountdown 
                airingAt={(entry as any).nextAiringEpisode.airingAt} 
                episode={(entry as any).nextAiringEpisode.episode} 
              />
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {entry.timeEstimate}
              </span>
              {entry.episodeCount ? (
                <span>· {entry.episodeCount} eps</span>
              ) : null}
              {entry.year ? <span>· {entry.year}</span> : null}
              {entry.malScore || entry.anilistScore ? (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {(entry.malScore || entry.anilistScore || 0).toFixed(1)}
                </span>
              ) : null}
            </div>

            <p className="text-[13px] text-chrono-text-muted mt-2 line-clamp-2 leading-relaxed">
              {entry.whyWatch}
            </p>

            {entry.watchAfter && (
              <div className="mt-2 text-xs text-sky-300 bg-sky-500/10 border border-sky-500/25 rounded-lg px-2.5 py-1 w-fit inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entry.watchAfter}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatched();
              }}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer touch-manipulation",
                isWatched
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 active:scale-95"
              )}
              title="Mark watched"
            >
              <Check className="w-4 h-4" />
            </button>
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
              isExpanded ? "bg-chrono-primary/20 rotate-180" : "bg-zinc-800/50"
            )}>
              <ChevronDown className={cn("w-4 h-4 transition-colors", isExpanded ? "text-chrono-primary" : "text-zinc-500")} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: easeSpring }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-black/20 rounded-b-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Info className="w-4 h-4 text-chrono-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          Why watch
                        </p>
                        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                          {entry.whyWatch}
                        </p>
                        {entry.tierReason && (
                          <p className="text-xs text-zinc-500 mt-2">
                            <span className="text-zinc-400 font-medium">
                              Tier reason:{" "}
                            </span>
                            {entry.tierReason}
                          </p>
                        )}
                      </div>
                    </div>
                    {entry.skipWarning && (
                      <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-400 uppercase">
                            If you skip
                          </p>
                          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                            {entry.skipWarning}
                          </p>
                        </div>
                      </div>
                    )}
                    {entry.fillerReason && (
                      <div className="flex gap-2">
                        <SkipForward className="w-4 h-4 text-zinc-500 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-zinc-400 uppercase">
                            Filler note
                          </p>
                          <p className="text-sm text-zinc-400 leading-relaxed">
                            {entry.fillerReason}
                          </p>
                        </div>
                      </div>
                    )}
                    {entry.innerOrder && entry.innerOrder.ranges.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <Layers className="w-3 h-3" /> Arc map
                        </p>
                        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                          {entry.innerOrder.ranges.slice(0, 20).map((r, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/50 gap-2"
                            >
                              <span className="font-mono text-zinc-300 shrink-0">
                                {r.start}-{r.end}
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                  r.type === "canon" || r.type === "none"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : String(r.type).includes("filler")
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-amber-500/20 text-amber-300"
                                )}
                              >
                                {String(r.type).replace(/_/g, " ")}
                              </span>
                              <span className="text-zinc-500 truncate flex-1 text-right">
                                {r.title || ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {entry.synopsis && (
                      <div>
                        <p className="text-xs font-bold text-white uppercase">
                          Synopsis
                        </p>
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-4 leading-relaxed font-medium">
                          {entry.synopsis}
                        </p>
                      </div>
                    )}
                    {entry.genres && entry.genres.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-white uppercase mb-1">
                          Genres
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {entry.genres.map((g) => (
                            <span
                              key={g}
                              className="text-[11px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.watchIf && entry.watchIf.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-white uppercase mb-1">
                          Watch if
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {entry.watchIf.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Community Consensus (Franchise Pulse) */}
                    {entry.anilistId && (
                      <FranchisePulse mediaId={entry.anilistId} currentTier={entry.tier} />
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <TrailerButton 
                        trailer={entry.trailerUrl ? { id: entry.trailerUrl.split('v=')[1], site: 'youtube' } : null} 
                        title={entry.title} 
                        englishTitle={entry.titleEnglish} 
                        onPlayTrailer={onPlayTrailer}
                      />
                      {showFocus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocus();
                          }}
                          className="btn-secondary py-2 px-3 text-xs font-semibold inline-flex items-center gap-1.5 border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 cursor-pointer"
                        >
                          <Target className="w-3.5 h-3.5" /> Focus this season
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
