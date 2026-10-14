"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, History } from "lucide-react";
import type { GeneratedFranchise } from "@/lib/discover/taste-graph";

type HistoryEntry = GeneratedFranchise & { imageUrl?: string; coverColor?: string };

export function GenerationHistorySection({ history }: { history: HistoryEntry[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-chrono-primary">Your map room</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white"><History className="h-5 w-5 text-chrono-primary" /> Recent watch orders</h2>
        </div>
        <a href="/?tab=discover" className="hidden items-center gap-1.5 text-xs font-bold text-chrono-text-muted hover:text-white sm:flex">Find another <Compass className="h-3.5 w-3.5" /></a>
      </div>
      {history.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-chrono-border/50 p-6 text-sm text-chrono-text-muted">Your recent generated routes will appear here. Start with any franchise — the engine will handle the confusing parts.</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {history.map((entry, index) => {
            const href = entry.anilistId ? `/?id=${entry.anilistId}` : `/?q=${encodeURIComponent(entry.title)}`;
            return <motion.a key={`${entry.anilistId}-${entry.generatedAt}`} href={href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="group flex items-center gap-3 rounded-2xl border border-chrono-border/30 bg-white/[0.025] p-3 transition-all hover:border-chrono-primary/40 hover:bg-white/[0.05]">
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: entry.coverColor || "#25213b" }}>{entry.imageUrl ? <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-lg font-black text-white/25">{entry.title.charAt(0)}</div>}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white group-hover:text-chrono-primary">{entry.title}</p><p className="mt-1 truncate text-[10px] text-chrono-text-dim">{new Date(entry.generatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{entry.genres?.length ? ` · ${entry.genres.slice(0, 2).join(" · ")}` : ""}</p></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-chrono-text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-chrono-primary" />
            </motion.a>;
          })}
        </div>
      )}
    </section>
  );
}
