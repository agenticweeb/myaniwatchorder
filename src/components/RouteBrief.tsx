"use client";

import { Clock, Film, Play, Route, ShieldCheck } from "lucide-react";
import { SuggestionImage } from "@/components/SuggestionImage";

interface RouteEntry {
  title: string;
  imageUrl?: string;
  tier: string;
  episodeCount?: number;
  timeEstimate?: string;
  whyWatch?: string;
  trailerUrl?: string | null;
}

interface RouteBriefProps {
  franchise: string;
  summary?: string;
  firstEntry?: RouteEntry;
  totalEntries: number;
  totalEpisodes: number;
  totalTime: string;
  essentialEntries: number;
  optionalEntries: number;
  progress: number;
  onPlayTrailer: (url: string) => void;
}

export function RouteBrief({ franchise, summary, firstEntry, totalEntries, totalEpisodes, totalTime, essentialEntries, optionalEntries, progress, onPlayTrailer }: RouteBriefProps) {
  if (!firstEntry) return null;
  const trailerUrl = firstEntry.trailerUrl || null;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-chrono-primary/30 bg-gradient-to-br from-chrono-primary/15 via-chrono-surface/80 to-fuchsia-950/20 p-4 sm:p-5" aria-labelledby="route-brief-title">
      <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-chrono-primary/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:w-[42%] sm:min-w-0">
          <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-xl">
            <SuggestionImage src={firstEntry.imageUrl} alt={firstEntry.title} franchise={firstEntry.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-chrono-primary"><Route className="h-3.5 w-3.5" /> Route brief</p>
            <h2 id="route-brief-title" className="mt-1 text-lg font-black text-white">{progress === 100 ? "Journey complete" : "Your first move"}</h2>
            <p className="truncate text-sm font-semibold text-white/80">{firstEntry.title}</p>
            <span className="mt-1 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">{firstEntry.tier}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm leading-relaxed text-chrono-text-muted">{firstEntry.whyWatch || summary || `Start with ${firstEntry.title} to establish the core story before the connected branches.`}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-chrono-text-dim">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-chrono-primary" /> {firstEntry.timeEstimate || `${firstEntry.episodeCount || 1} eps`}</span>
            <span>{essentialEntries} essential</span><span>{optionalEntries} optional</span><span>{totalEntries} titles · {totalEpisodes} eps</span>
          </div>
          {progress === 100 ? <p className="text-[11px] font-semibold text-emerald-300">You finished this route. Explore the next universe below.</p> : progress > 0 && <p className="text-[11px] font-semibold text-emerald-300">You are already {progress}% through this route.</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          {trailerUrl ? <button type="button" onClick={() => onPlayTrailer(trailerUrl)} className="btn-primary inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs"><Play className="h-3.5 w-3.5 fill-current" /> Preview start</button> : <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${firstEntry.title} official trailer`)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs"><Film className="h-3.5 w-3.5" /> Find preview</a>}
          <span className="inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-300/80"><ShieldCheck className="h-3.5 w-3.5" /> Verified route data</span>
        </div>
      </div>
      <p className="relative mt-3 border-t border-white/10 pt-3 text-[10px] text-chrono-text-dim">{totalTime} commitment · Preview the first move, then follow the route without hunting through five conflicting guides.</p>
    </section>
  );
}
