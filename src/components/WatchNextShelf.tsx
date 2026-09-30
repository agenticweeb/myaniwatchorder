"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";

interface Recommendation {
  anilistId: number;
  title: string;
  coverImage: string;
  score: number | null;
  format: string;
}

interface Props {
  sourceAnilistId: number;
  sourceTitle: string;
}

const RECS_QUERY = `
  query Recs($id: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(perPage: 6, sort: RATING_DESC) {
        nodes {
          mediaRecommendation {
            id
            title { english romaji }
            coverImage { large }
            averageScore
            format
            status
          }
        }
      }
    }
  }
`;

export function WatchNextShelf({ sourceAnilistId, sourceTitle }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["watchnext", sourceAnilistId],
    queryFn: async () => {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: RECS_QUERY,
          variables: { id: sourceAnilistId },
        }),
      });
      const json = await res.json();
      const nodes = json?.data?.Media?.recommendations?.nodes || [];
      return nodes
        .map((n: any) => n?.mediaRecommendation)
        .filter((m: any) => m?.id && m?.status !== "NOT_YET_RELEASED")
        .slice(0, 6);
    },
    staleTime: 1000 * 60 * 60,
    enabled: mounted && !!sourceAnilistId,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="mt-10 relative group/shelf">
      {/* Header — more prominent, matches the shelf style */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-chrono-accent" />
          <h3 className="text-base font-extrabold tracking-tight text-white">
            Finished {sourceTitle}?
          </h3>
          <span className="text-sm font-bold text-gradient">Watch next</span>
        </div>
      </div>

      {/* Edge fades for the carousel feel */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-chrono-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-chrono-bg to-transparent" />

        {/* Scrollable card track — wider cards, richer info */}
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.map((rec: any) => {
            const title = rec.title?.english || rec.title?.romaji || "Unknown";
            return (
              <motion.a
                key={rec.id}
                href={`/?q=${encodeURIComponent(title)}`}
                className="group relative w-[150px] sm:w-[170px] shrink-0 rounded-xl overflow-hidden
                           border border-chrono-border/20 hover:border-chrono-primary/40
                           transition-all cursor-pointer text-left"
                whileHover={{ scale: 1.04 }}
              >
                <div className="relative aspect-[2/3] bg-chrono-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rec.coverImage?.large || ""}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {rec.averageScore ? (
                    <span className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-chrono-primary/80 px-2 py-0.5 text-[10px] font-bold text-white">
                      ★ {(rec.averageScore / 10).toFixed(1)}
                    </span>
                  ) : null}
                  {/* Hover reveal — same pattern as DiscoverCard */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/90 to-transparent p-2.5 pt-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{title}</p>
                    <span className="text-[10px] font-extrabold text-chrono-primary uppercase tracking-wide">
                      Get Watch Order →
                    </span>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-chrono-text-dim mt-2 px-1">
        AniList community picks — what people who liked {sourceTitle} watched next
      </p>
    </section>
  );
