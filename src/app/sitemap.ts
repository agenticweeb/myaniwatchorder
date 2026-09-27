import type { MetadataRoute } from 'next';
import { SEO_FRANCHISES } from '@/lib/seo/franchises';
import { redis } from '@/lib/redis';
import { getCurrentSeasonSlug, getPreviousSeasonSlug } from '@/lib/anilist/get-season-anime';

// Revalidate every hour — reads fresh Redis data (airing titles) without a deploy.
// Without this, Next treats the sitemap as static and freezes it at build time.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aniwatchorder.cc';

  // 1. Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  // 2. The 20 Programmatic SEO Franchise Pages
  const franchisePages: MetadataRoute.Sitemap = SEO_FRANCHISES.map(franchise => ({
    url: `${baseUrl}/watch-order/${franchise.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // 3. Season pages (current + previous) — content pages targeting
  //    "fall 2026 anime" style queries, self-refreshing via ISR
  const seasonPages: MetadataRoute.Sitemap = [
    getCurrentSeasonSlug(),
    getPreviousSeasonSlug(),
  ].map(slug => ({
    url: `${baseUrl}/season/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // 4. Airing titles — REMOVED from sitemap as ?q= deep-links (parameterized
  //    URLs are non-canonical, read as thin/duplicate content per Google's
  //    sitemap guidelines). The airing shows are captured on the SEASON PAGE,
  //    which IS a proper canonical URL with real content. The cron still
  //    writes to Redis for the season page's reference — the sitemap simply
  //    doesn't emit individual ?q= entries anymore.
  // 
  // If we want airing shows as individual indexed URLs later, the correct
  // approach is dedicated content pages (/anime/<slug>), not query params.

  return [...staticPages, ...franchisePages, ...seasonPages, ...airingEntries];
}
