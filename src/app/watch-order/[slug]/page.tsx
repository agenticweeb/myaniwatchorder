import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SEO_FRANCHISES, getFranchiseBySlug } from "@/lib/seo/franchises";
import { findCuratedFranchise, curatedToV2Result } from "@/lib/knowledge/curated-franchises";
import { generateWatchOrderAction } from "@/app/actions";
import FlowchartV2 from "@/components/FlowchartV2";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Compass } from "lucide-react";

// ISR: page renders at build time (or first request), then re-renders
// at most every 6 hours. Googlebot gets instant HTML from the cache.
// The action's internal Redis cache (7-day TTL) handles data freshness.
export const revalidate = 21600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const franchise = getFranchiseBySlug(slug);
  if (!franchise) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myaniwatchorder-zeta.vercel.app";
  const canonicalUrl = `${siteUrl}/watch-order/${franchise.slug}`;

  // OG card with cover art overlay — content-relevant image for Google's
  // search-result thumbnail selection. Falls back to branded card if no cover.
  const ogCoverParam = franchise.coverImage ? `&cover=${encodeURIComponent(franchise.coverImage)}` : "";
  const ogImageUrl = `${siteUrl}/api/og?franchise=${encodeURIComponent(franchise.name)}&entries=0&hours=0&tier=Essential${ogCoverParam}`;

  return {
    title: franchise.h1,
    description: franchise.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: franchise.h1,
      description: franchise.description,
      url: canonicalUrl,
      type: "article",
      images: [{ url: ogImageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: franchise.h1,
      description: franchise.description,
      images: [{ url: ogImageUrl }],
    },
  };
}

export default async function WatchOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const franchise = getFranchiseBySlug(slug);
  if (!franchise) notFound();

  const defaultPrefs = {
    timeBudget: "regular",
    mood: ["all"],
    skipPreference: "smart-skip" as const,
    includeMovies: true,
    includeOVAs: true,
    includeSpecials: true,
    includeRecaps: false,
    preferredPath: "optimal" as const,
    language: "english" as const,
  };

  let result;
  try {
    const actionResult = await generateWatchOrderAction({
      animeName: franchise.name,
      anilistId: franchise.anilistId,
      scope: "franchise",
      preferences: defaultPrefs,
    });
    
    if (!actionResult.success) {
      throw new Error(actionResult.error || "Failed to generate watch order");
    }
    result = actionResult.data.dataV2;
  } catch (e) {
    console.error(`Failed to generate SEO page for ${franchise.name}:`, e);
    const curated = findCuratedFranchise(franchise.name);
    if (curated) {
      result = curatedToV2Result(curated);
      result.warnings = [
        "Served from curated ground truth — live data enrichment is temporarily unavailable.",
      ];
      console.log(`🛟 Curated fallback rendered for slug page: ${franchise.name}`);
    } else {
      return (
        <main className="min-h-dvh relative flex flex-col">
          <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-chrono-border/20">
            <div className="max-w-5xl mx-auto w-full px-4 py-3">
              <div className="flex items-center gap-4">
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Link>
                <Link href="/?tab=discover" className="inline-flex items-center gap-1.5 text-xs font-semibold text-chrono-primary hover:text-white transition-colors bg-chrono-primary/10 px-3 py-1 rounded-full border border-chrono-primary/20">
                  <Compass className="w-3.5 h-3.5" />
                  Discover
                </Link>
              </div>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <h1 className="text-3xl font-extrabold mb-4">{franchise.h1}</h1>
            <p className="text-chrono-text-muted">We're currently calculating the optimal path for this franchise. Please check back shortly.</p>
          </div>
        </main>
      );
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myaniwatchorder-zeta.vercel.app";
  const canonicalUrl = `${siteUrl}/watch-order/${franchise.slug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What is the correct order to watch ${franchise.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `MyAniWatchOrder recommends using the ${result.paths[0]?.name || 'Optimal'} path to preserve story reveals and skip filler. The complete guide and timeline are provided above.`
        }
      },
      {
        "@type": "Question",
        "name": `How many episodes are in ${franchise.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `There are ${result.totalEpisodes} watchable episodes across ${result.totalEntries} entries in this franchise, taking approximately ${result.totalDuration} to complete.`
        }
      }
    ]
  };
  
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Watch Orders",
        "item": `${siteUrl}/watch-order`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": franchise.name,
        "item": canonicalUrl
      }
    ]
  };

  // Tells Google which image to prefer for search-result thumbnails
  // (ogImageUrl lives in generateMetadata scope — rebuild it here with
  // the same construction, using the franchise's coverImage)
  const schemaCoverParam = franchise.coverImage ? `&cover=${encodeURIComponent(franchise.coverImage)}` : "";
  const schemaImageUrl = `${siteUrl}/api/og?franchise=${encodeURIComponent(franchise.name)}&entries=${result.totalEntries}&hours=${Math.round(result.totalDurationMinutes / 60)}&tier=Essential${schemaCoverParam}`;
  const imageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": canonicalUrl,
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": schemaImageUrl,
      "width": 1200,
      "height": 630,
    },
  };
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
        />

        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-3">
            {franchise.h1}
          </h1>
          <p className="text-chrono-text-muted max-w-2xl mx-auto">
            {franchise.description} Generated by MyAniWatchOrder's AI-powered relation graph engine.
          </p>
        </div>

        <ErrorBoundary>
          <FlowchartV2 data={result} timeBudget="regular" />
        </ErrorBoundary>

        {/* Visible FAQ for LLM Ingestion */}
        <div className="max-w-3xl mx-auto mt-16 space-y-6">
          <h2 className="text-2xl font-bold text-white text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="glass-card p-5 rounded-xl border border-chrono-border/30">
              <h3 className="font-bold text-white mb-2">What is the best watch order for {franchise.name}?</h3>
              <p className="text-sm text-chrono-text-muted">
                MyAniWatchOrder recommends the {result.paths[0]?.name || "Optimal"} path. This order preserves major story reveals and character development arcs. The complete guide and interactive timeline are provided above.
              </p>
            </div>
            <div className="glass-card p-5 rounded-xl border border-chrono-border/30">
              <h3 className="font-bold text-white mb-2">How many episodes are in {franchise.name}?</h3>
              <p className="text-sm text-chrono-text-muted">
                The franchise contains {result.totalEpisodes} watchable episodes across {result.totalEntries} entries, taking approximately {result.totalDuration} to complete.
              </p>
            </div>
            <div className="glass-card p-5 rounded-xl border border-chrono-border/30">
              <h3 className="font-bold text-white mb-2">Can I skip filler in {franchise.name}?</h3>
              <p className="text-sm text-chrono-text-muted">
                Yes. MyAniWatchOrder uses a 4-tier Smart Skip system (Essential, Recommended, Optional, Skip). By default, the timeline only shows Essential nodes. You can toggle "Recommended" or "Optional" in the timeline filters above to reveal more content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
