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
    <section className="mt-8">
      <div className="glass-card rounded-2xl border border-chrono-border/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-chrono-primary" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Finished {sourceTitle}? Watch next:
          </h3>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.map((rec: any) => (
            <motion.a
              key={rec.id}
              href={`/?q=${encodeURIComponent(rec.title?.english || rec.title?.romaji || "")}`}
              className="group relative w-[120px] shrink-0 rounded-xl overflow-hidden
                         border border-chrono-border/20 hover:border-chrono-primary/40
                         transition-all cursor-pointer"
              whileHover={{ scale: 1.04 }}
            >
              <div className="aspect-[2/3] bg-chrono-surface relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rec.coverImage?.large || ""}
                  alt={rec.title?.english || rec.title?.romaji || ""}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {rec.averageScore ? (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-amber-400">
                    ★ {(rec.averageScore / 10).toFixed(1)}
                  </span>
                ) : null}
              </div>
              <div className="p-2">
                <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                  {rec.title?.english || rec.title?.romaji || "Unknown"}
                </p>
                <p className="text-[9px] text-chrono-text-dim mt-0.5">
                  {rec.format || "TV"} · Get watch order →
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        <p className="text-[10px] text-chrono-text-dim mt-3">
          AniList community recommendations — what people who liked {sourceTitle} watched next
        </p>
      </div>
    </section>
  );
}
