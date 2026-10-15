"use client";

import { ArrowRight, Compass, Sparkles } from "lucide-react";
import Link from "next/link";
import { SuggestionImage } from "@/components/SuggestionImage";

interface DiscoveryItem {
  title: string;
  anilistId: number;
  malId: number;
  imageUrl: string;
  score: number;
  tag: string;
  desc: string;
  slug?: string;
}

interface HomepageDiscoveryProps {
  items: DiscoveryItem[];
  onSelect: (item: DiscoveryItem) => void;
  onOpenLibrary: () => void;
}

export function HomepageDiscovery({ items, onSelect, onOpenLibrary }: HomepageDiscoveryProps) {
  const picks = items.slice(0, 6);
  return (
    <section className="max-w-5xl mx-auto space-y-3" aria-labelledby="homepage-discovery-title">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-chrono-primary"><Compass className="h-3.5 w-3.5" /> Start with a route problem</p>
          <h2 id="homepage-discovery-title" className="mt-1 text-lg font-extrabold text-white sm:text-xl">Not sure what to search?</h2>
          <p className="mt-1 text-xs text-chrono-text-dim">Pick a confusing universe and see how the engine untangles it.</p>
        </div>
        <button type="button" onClick={onOpenLibrary} className="hidden shrink-0 items-center gap-1 text-xs font-bold text-chrono-primary hover:text-white sm:inline-flex">Browse everything <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map((item) => (
          <div key={item.anilistId} className="w-[238px] shrink-0 snap-start sm:w-[270px]">
            <button type="button" onClick={() => onSelect(item)} className="group flex w-full items-center gap-3 rounded-2xl border border-chrono-border/25 bg-chrono-surface/45 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-chrono-primary/50 hover:bg-chrono-surface">
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-chrono-surface shadow-lg"><SuggestionImage src={item.imageUrl} alt={item.title} franchise={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-chrono-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-200"><Sparkles className="h-2.5 w-2.5" /> {item.tag}</span>
              <h3 className="mt-1 line-clamp-1 text-sm font-bold text-white group-hover:text-chrono-primary">{item.title}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-chrono-text-dim">{item.desc}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-chrono-primary">Explore route <ArrowRight className="h-3 w-3" /></span>
            </div>
            </button>
            {item.slug && <Link href={`/watch-order/${item.slug}`} className="mt-2 inline-flex items-center gap-1 px-1 text-[10px] font-extrabold text-chrono-primary hover:text-white">Open full guide <ArrowRight className="h-3 w-3" /></Link>}
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpenLibrary} className="inline-flex items-center gap-1 px-1 text-xs font-bold text-chrono-primary hover:text-white sm:hidden">Browse the full discovery library <ArrowRight className="h-3.5 w-3.5" /></button>
    </section>
  );
}
