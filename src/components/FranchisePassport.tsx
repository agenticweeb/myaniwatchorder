"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, Play, PlayCircle, Search, Sparkles, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

interface FranchiseData {
  franchiseId: string;
  anilistId: number;
  title: string;
  imageUrl: string;
  coverColor: string;
  totalWatched: number;
  totalEpisodes: number;
  totalEntries: number;
  watchedEntries: number;
  lastUpdated?: string;
  startedAt?: string;
}
interface Stats {
  totalFranchises: number;
  completedFranchises: number;
  totalEpisodesWatched: number;
  totalHoursInvested: number;
}

function progressOf(franchise: FranchiseData) {
  if (!franchise.totalEpisodes) return 0;
  return Math.min(100, Math.round((franchise.totalWatched / franchise.totalEpisodes) * 100));
}
function dateLabel(value?: string) {
  if (!value) return "Ready when you are";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FranchisePassport({ franchises, userEmail, stats }: { franchises: FranchiseData[]; userEmail: string; stats: Stats }) {
  const active = franchises.filter((franchise) => progressOf(franchise) < 100).sort((a, b) => Date.parse(b.lastUpdated || b.startedAt || "") - Date.parse(a.lastUpdated || a.startedAt || ""));
  const completed = franchises.filter((franchise) => progressOf(franchise) === 100);
  const primary = active[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-chrono-primary/25 bg-gradient-to-br from-chrono-primary/20 via-chrono-surface/80 to-fuchsia-950/30 p-6 sm:p-8 shadow-2xl shadow-chrono-primary/10">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-chrono-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-chrono-primary/30 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-chrono-primary">
              <Sparkles className="h-3.5 w-3.5" /> Anime journey control room
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Pick up where the story paused.</h1>
            <p className="max-w-xl text-sm leading-relaxed text-chrono-text-muted">Your watch orders, progress, and next routes in one place. Find the right path, skip the noise, and keep moving through the worlds you started.</p>
            <p className="text-xs font-semibold text-chrono-text-dim">{userEmail}</p>
          </div>
          {primary ? (
            <a href={`/?id=${primary.anilistId}`} className="btn-primary shrink-0 px-5 py-3 text-sm"><Play className="h-4 w-4 fill-current" /> Resume {primary.title}</a>
          ) : (
            <a href="/" className="btn-primary shrink-0 px-5 py-3 text-sm"><Search className="h-4 w-4" /> Find your next route</a>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Journey summary">
        <StatCard icon={<Tv />} value={stats.totalFranchises} label="Routes started" tone="sky" />
        <StatCard icon={<PlayCircle />} value={stats.completedFranchises} label="Routes finished" tone="emerald" />
        <StatCard icon={<CheckCircle2 />} value={stats.totalEpisodesWatched} label="Episodes watched" tone="violet" />
        <StatCard icon={<Clock3 />} value={`${stats.totalHoursInvested}h`} label="Estimated time" tone="amber" />
      </section>

      {franchises.length === 0 ? (
        <section className="glass-card rounded-3xl border border-chrono-border/40 p-8 sm:p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-chrono-primary to-fuchsia-600 shadow-lg shadow-chrono-primary/25"><Search className="h-7 w-7 text-white" /></div>
          <h2 className="text-2xl font-black text-white">Your next great watch starts here.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-chrono-text-muted">Search any anime or open Discover. We will map the franchise, explain what matters, and give you a path worth following.</p>
          <a href="/" className="btn-primary mt-6 inline-flex text-sm"><Sparkles className="h-4 w-4" /> Explore anime watch orders</a>
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-chrono-primary">Your next move</p><h2 className="mt-1 text-2xl font-black text-white">Continue watching</h2></div><span className="text-xs text-chrono-text-dim">{active.length} active {active.length === 1 ? "route" : "routes"}</span></div>
            {active.length ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{active.slice(0, 4).map((franchise, index) => <JourneyCard key={franchise.franchiseId} franchise={franchise} index={index} />)}</div> : <div className="glass-card rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" /><h3 className="mt-3 text-lg font-bold text-white">Every route is complete.</h3><p className="mt-1 text-sm text-chrono-text-muted">Ready to find another universe?</p><a href="/?tab=discover" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-chrono-primary hover:text-white">Open Discover <ArrowRight className="h-3.5 w-3.5" /></a></div>}
          </section>
          {completed.length > 0 && <section className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Milestones</p><h2 className="mt-1 text-xl font-black text-white">Finished journeys</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{completed.map((franchise) => <JourneyCard key={franchise.franchiseId} franchise={franchise} compact />)}</div></section>}
        </>
      )}
    </div>
  );
}

function JourneyCard({ franchise, index = 0, compact = false }: { franchise: FranchiseData; index?: number; compact?: boolean }) {
  const progress = progressOf(franchise);
  const complete = progress === 100;
  return <motion.a href={`/?id=${franchise.anilistId}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={cn("group relative overflow-hidden rounded-2xl border border-chrono-border/40 bg-chrono-surface/60 transition-all hover:-translate-y-0.5 hover:border-chrono-primary/50 hover:bg-chrono-surface-hover", compact ? "p-3" : "flex min-h-[190px] items-end p-5")}>
    {franchise.imageUrl && <img src={franchise.imageUrl} alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105", compact ? "opacity-45" : "opacity-50")} referrerPolicy="no-referrer" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" style={{ backgroundColor: franchise.imageUrl ? undefined : franchise.coverColor }} />
    <div className="relative w-full space-y-2">
      <div className="flex items-center justify-between gap-2"><span className={cn("rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider", complete ? "bg-emerald-500/20 text-emerald-300" : "bg-chrono-primary/20 text-violet-200")}>{complete ? "Complete" : `${progress}% in progress`}</span>{!compact && <span className="text-[10px] font-semibold text-white/60">Updated {dateLabel(franchise.lastUpdated)}</span>}</div>
      <h3 className={cn("font-black text-white group-hover:text-chrono-primary transition-colors", compact ? "line-clamp-2 text-sm" : "text-xl")}>{franchise.title}</h3>
      <div className="flex items-center justify-between text-[11px] text-white/65"><span>{franchise.totalWatched}/{franchise.totalEpisodes || "?"} episodes</span><span>{franchise.watchedEntries}/{franchise.totalEntries || "?"} entries</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className={cn("h-full rounded-full transition-all", complete ? "bg-emerald-400" : "bg-gradient-to-r from-chrono-primary to-fuchsia-500")} style={{ width: `${progress}%` }} /></div>
      {!compact && <div className="flex items-center gap-1.5 pt-1 text-xs font-bold text-white/80">{complete ? "Revisit route" : "Resume route"}<ArrowRight className="h-3.5 w-3.5 text-chrono-primary transition-transform group-hover:translate-x-1" /></div>}
    </div>
  </motion.a>;
}

function StatCard({ icon, value, label, tone }: { icon: React.ReactNode; value: string | number; label: string; tone: "sky" | "emerald" | "violet" | "amber" }) {
  const colors = { sky: "text-sky-400 border-sky-500/20", emerald: "text-emerald-400 border-emerald-500/20", violet: "text-violet-400 border-violet-500/20", amber: "text-amber-400 border-amber-500/20" };
  return <div className={cn("glass-card rounded-2xl border bg-gradient-to-br from-white/[0.04] to-transparent p-4", colors[tone])}><div className="mb-2 h-4 w-4">{icon}</div><div className="text-2xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-chrono-text-dim">{label}</div></div>;
}
