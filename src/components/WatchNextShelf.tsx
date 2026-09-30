"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchRecommendationsAction, type RecommendationCard } from "@/app/actions";
import { DiscoverCard } from "@/components/DiscoverCard";
import type { DiscoverCardData } from "@/lib/discover/shelf-recipes";

interface Props {
  sourceAnilistId: number;
  sourceTitle: string;
  onSelect?: (card: DiscoverCardData) => void;
}

/**
 * "Because you generated X" shelf — the exact Discover-quality experience,
 * mounted below the watch order result. Same card components, same shelf feel,
 * same hover reveals, same edge fades, same arrow controls.
 *
 * Unlike the Discover version (which reads localStorage for the last
 * generated franchise), this variant receives the franchise directly —
 * because in the results page, we already know what was generated.
 */
export function WatchNextShelf({ sourceAnilistId, sourceTitle, onSelect }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<RecommendationCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchRecommendationsAction(sourceAnilistId);
        if (!cancelled && res.success && res.data) {
          setCards(res.data);
        }
      } catch {
        /* fail silently — the watch order is the main content, not this */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sourceAnilistId]);

  const scroll = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({
      left: dir * trackRef.current.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  // Don't render if no cards (fail silently — the watch order is what matters)
  if (!loading && cards.length === 0) return null;

  return (
    <section className="group/shelf relative">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:text-lg">
            Because you generated {sourceTitle}
          </h2>
          <p className="mt-0.5 text-[11px] text-chrono-text-dim">
            AniList's crowd-sourced "people who liked this also liked"
          </p>
        </div>
        <div className="hidden shrink-0 gap-1.5 opacity-0 transition-opacity group-hover/shelf:opacity-100 sm:flex">
          <button
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${sourceTitle} recommendations left`}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/25 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            aria-label={`Scroll ${sourceTitle} recommendations right`}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/25 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-chrono-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-chrono-bg to-transparent" />

        <div
          ref={trackRef}
          className="flex snap-x gap-3 overflow-x-auto scroll-smooth px-0.5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-[140px] sm:w-[160px] shrink-0">
                  <div className="skeleton aspect-[2/3] rounded-xl border border-chrono-border/10" />
                  <div className="skeleton mt-2 h-3 w-3/4 rounded" />
                </div>
              ))
            : cards.map((card) => {
                const shelfCard: DiscoverCardData = {
                  ...card,
                  franchiseEntries: 0,
                };
                return (
                  <DiscoverCard
                    key={card.anilistId ?? card.title}
                    card={shelfCard}
                    onSelect={onSelect || (() => {})}
                  />
                );
              })}
        </div>
      </div>
    </section>
  );
}
