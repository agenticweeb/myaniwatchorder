import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Tv } from "lucide-react";
import {
  getSeasonAnime,
  parseSeasonSlug,
  getCurrentSeasonSlug,
  getPreviousSeasonSlug,
} from "@/lib/anilist/get-season-anime";
import { SuggestionImage } from "@/components/SuggestionImage";
import { SEO_FRANCHISES } from "@/lib/seo/franchises";

export const revalidate = 86400;
export const dynamicParams = true;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: getCurrentSeasonSlug() }, { slug: getPreviousSeasonSlug() }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSeasonSlug(slug);
  if (!parsed) return {};
  const seasonName = parsed.season.charAt(0).toUpperCase() + parsed.season.slice(1);

  return {
    title: `${seasonName} ${parsed.seasonYear} Anime Watch Orders — MyAniWatchOrder`,
    description: `Every notable ${seasonName} ${parsed.seasonYear} anime with instant spoiler-safe watch order generation. Scores, genres, airing status, and smart-skip tiers for ${seasonName} ${parsed.seasonYear} shows.`,
    alternates: {
      canonical: `https://aniwatchorder.cc/season/${slug}`,
    },
    openGraph: {
      title: `${seasonName} ${parsed.seasonYear} Anime — Watch Orders`,
      description: `Spoiler-safe watch orders for ${seasonName} ${parsed.seasonYear} anime. Any show, one click.`,
      type: "article",
    },
  };
}

export default async function SeasonPage({ params }: Props) {
  const { slug } = await params;
  const parsed = parseSeasonSlug(slug);
  if (!parsed) notFound();

  const seasonName = parsed.season.charAt(0).toUpperCase() + parsed.season.slice(1);
  const shows = await getSeasonAnime(parsed.season, parsed.seasonYear);

  const isCurrent = slug === getCurrentSeasonSlug();

  return (
    <main className="min-h-dvh relative flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-chrono-border/20">
        <div className="max-w-5xl mx-auto w-full px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to MyAniWatchOrder
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-chrono-primary">
            {isCurrent ? "Currently Airing" : "Archive"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
            {seasonName} {parsed.seasonYear} Anime — Watch Orders
          </h1>
          <p className="text-chrono-text-muted text-sm mt-3 max-w-2xl leading-relaxed">
            Every notable {seasonName} {parsed.seasonYear} anime with instant spoiler-safe
            watch order generation. Click any show to get its full order — filler
            skipping, episode counts, and real finish dates included.
          </p>
          {isCurrent && (
            <p className="text-[11px] text-chrono-text-dim mt-2">
              Updated automatically as the season progresses · {shows.length} shows tracked
            </p>
          )}
        </div>

        {shows.length === 0 ? (
          <div className="glass-card rounded-2xl border border-chrono-border/30 p-8 text-center">
            <p className="text-sm text-chrono-text-muted">
              No shows indexed for {seasonName} {parsed.seasonYear} yet — check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shows.map((show) => (
              <a
                key={show.anilistId}
                href={SEO_FRANCHISES.find((franchise) => franchise.anilistId === show.anilistId)?.slug
                  ? `/watch-order/${SEO_FRANCHISES.find((franchise) => franchise.anilistId === show.anilistId)?.slug}`
                  : `/?q=${encodeURIComponent(show.title)}`}
                className="glass-card rounded-2xl overflow-hidden text-left border border-chrono-border/30
                           hover:border-chrono-primary/50 transition-all group"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-chrono-surface">
                  <SuggestionImage
                    src={show.coverImage}
                    alt={show.title}
                    franchise={show.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    {show.score ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-white">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {(show.score / 10).toFixed(1)}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-[10px] font-bold text-white/70 uppercase">
                      {show.format}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-chrono-primary transition-colors line-clamp-2 leading-tight">
                    {show.title}
                  </h3>
                  <p className="text-[11px] text-chrono-text-dim line-clamp-2 leading-relaxed">
                    {show.description}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Tv className="w-3 h-3 text-chrono-primary" />
                    <span className="text-[11px] font-bold text-chrono-primary">
                      Get Watch Order
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-12 glass-card rounded-2xl border border-chrono-border/20 p-6 text-center">
          <p className="text-sm text-chrono-text-muted">
            Looking for a franchise not listed here?{" "}
            <Link href="/" className="text-chrono-primary font-bold hover:underline">
              Search any anime
            </Link>{" "}
            — we cover every franchise, obscure or mainstream.
          </p>
        </div>
      </div>
    </main>
  );
}
