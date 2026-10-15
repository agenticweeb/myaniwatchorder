import Link from "next/link";
import { SEO_FRANCHISES } from "@/lib/seo/franchises";
import { Clock } from "lucide-react";
import { InteractiveSearch } from "@/components/InteractiveSearch";
import { fetchCurrentlyAiring } from "@/app/actions";
import { TopBanner } from "@/components/TopBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { getBatchMediaImages } from "@/lib/anilist-client";
import { SEO_TIERS } from "@/lib/seo/tiers";
import { HowItWorks } from "@/components/HowItWorks";
import { HeaderActions } from "@/components/HeaderActions";
import { getCurrentSeasonSlug } from "@/lib/anilist/get-season-anime";

export const dynamic = "force-dynamic";

// 1. Define the base suggestions on the server
const BASE_SUGGESTIONS = [
  { title: "Fate Series", malId: 10087, anilistId: 10087, imageUrl: "/suggestions/fate.jpg", score: 8.3, tag: "Multiverse", desc: "Routes are parallel realities, not sequels.", slug: "fate-series" },
  { title: "Monogatari Series", malId: 5081, anilistId: 5081, imageUrl: "/suggestions/monogatari.jpeg", score: 8.4, tag: "Non-Linear", desc: "Release vs chronological is a real debate.", slug: "monogatari-series" },
  { title: "Steins;Gate", malId: 9253, anilistId: 9253, imageUrl: "/suggestions/Steins;Gate.jpeg", score: 9.1, tag: "Time Travel", desc: "Routes are not linear sequels.", slug: "steins-gate" },
  { title: "JoJo's Bizarre Adventure", malId: 14719, anilistId: 14719, imageUrl: "/suggestions/JoJo's Bizarre Adventure.jpeg", score: 8.2, tag: "Generational", desc: "Each Part shifts art, genre, and protagonist.", slug: "jojo-bizarre-adventure" },
  { title: "Neon Genesis Evangelion", malId: 30, anilistId: 30, imageUrl: "/suggestions/Neon Genesis Evangelion.jpeg", score: 8.3, tag: "Alt Reality", desc: "TV, End of Eva, and Rebuilds — three endings.", slug: "neon-genesis-evangelion" },
  { title: "Gundam (Universal Century)", malId: 80, anilistId: 80, imageUrl: "/suggestions/Gundam (Universal Century).jpeg", score: 7.8, tag: "Decades", desc: "40+ years of UC media. Jump carefully.", slug: "gundam-uc" },
  { title: "One Piece", malId: 21, anilistId: 21, imageUrl: "", score: 9.0, tag: "Long Runner", desc: "1100+ episodes. Skip filler, keep G-8.", slug: "one-piece" },
  { title: "Naruto", malId: 20, anilistId: 20, imageUrl: "", score: 8.5, tag: "Filler Heavy", desc: "Skip massive multi-season blocks of filler.", slug: "naruto" },
  { title: "Bleach", malId: 269, anilistId: 269, imageUrl: "", score: 8.2, tag: "Filler Heavy", desc: "Cut away from canonical battles to skip filler.", slug: "bleach" },
  { title: "Dragon Ball", malId: 223, anilistId: 223, imageUrl: "", score: 8.0, tag: "Decades", desc: "Mix of main stories, non-canon films, and Kai.", slug: "dragon-ball" },
  { title: "Code Geass", malId: 1575, anilistId: 1575, imageUrl: "", score: 8.7, tag: "Split Timeline", desc: "Film trilogy rewrites key deaths for modern sequels.", slug: "code-geass" },
  { title: "Haruhi Suzumiya", malId: 849, anilistId: 849, imageUrl: "", score: 8.0, tag: "Non-Linear", desc: "Broadcast order intentionally jumps through time.", slug: "haruhi-suzumiya" },
  { title: "Durarara!!", malId: 6746, anilistId: 6746, imageUrl: "", score: 8.0, tag: "Multi-POV", desc: "Non-linear narrative chunks with confusing suffixes.", slug: "durarara" },
  { title: "Toaru (Index & Railgun)", malId: 4654, anilistId: 4654, imageUrl: "", score: 7.5, tag: "Overlap", desc: "Spin-offs take place simultaneously from different POVs.", slug: "toaru-series" },
  { title: "Horimiya", malId: 42897, anilistId: 124080, imageUrl: "", score: 8.1, tag: "Intercut", desc: "Second season adapts chapters skipped in the first.", slug: "horimiya" },
  { title: "My Hero Academia", malId: 31964, anilistId: 21459, imageUrl: "", score: 8.0, tag: "Canon Movies", desc: "Know exactly which episode to pause to watch movies.", slug: "my-hero-academia" },
  { title: "Baccano!", malId: 2251, anilistId: 2251, imageUrl: "", score: 8.5, tag: "Anachronistic", desc: "Skips across multiple different decades simultaneously.", slug: "baccano" },
  { title: "Danganronpa", malId: 16592, anilistId: 16592, imageUrl: "", score: 7.5, tag: "Swap Order", desc: "Swap back and forth between two airing seasons.", slug: "danganronpa" },
  { title: "Clannad", malId: 2167, anilistId: 2167, imageUrl: "", score: 8.5, tag: "Alt Routes", desc: "OVA episodes completely change the final outcome.", slug: "clannad" },
  { title: "Haikyu!!", malId: 20583, anilistId: 20464, imageUrl: "", score: 8.7, tag: "Canon Movies", desc: "Critical story progression hidden between seasons.", slug: "haikyu" },
];

// 2. Make the page an async Server Component
export default async function Page() {
  // Removed useState — that belongs in the HeaderActions client component!
  
  // Fetch missing cover images on the server before rendering
  const airingAnime = await fetchCurrentlyAiring(); 
  
  // Combine BASE_SUGGESTIONS with all anime from SEO_TIERS to ensure we fetch images for all of them
  const tierAnime = SEO_TIERS.flatMap(t => t.anime).map(a => {
    const seoFranchise = SEO_FRANCHISES.find(f => f.slug === a.slug);
    return {
      title: a.title,
      malId: seoFranchise?.anilistId || 0,
      anilistId: seoFranchise?.anilistId || 0,
      imageUrl: "",
      score: 0,
      tag: a.tag,
      desc: "",
      slug: a.slug || ""
    };
  });

  const uniqueTitles = new Set();
  const allSuggestions = [...BASE_SUGGESTIONS, ...tierAnime].filter(s => {
    if (uniqueTitles.has(s.title)) return false;
    uniqueTitles.add(s.title);
    return true;
  });

  // 1. Collect all AniList IDs that need images
  const idsToFetch = allSuggestions
    .filter(s => !s.imageUrl && s.anilistId)
    .map(s => s.anilistId as number);

  // 2. Fetch ALL missing images in a single API call to prevent rate limits
  const imageMap = await getBatchMediaImages(idsToFetch);

  // 3. Merge the fetched images into our suggestions array
  const suggestionsWithImages = allSuggestions.map(suggestion => {
    if (suggestion.imageUrl) return suggestion;
    if (suggestion.anilistId && imageMap[suggestion.anilistId]) {
      return { ...suggestion, imageUrl: imageMap[suggestion.anilistId] };
    }
    return suggestion; // Fallback to monogram if still missing
  });

  return (
    <main className="min-h-dvh relative flex flex-col">
      {/* Dismissible Brand Marquee Banner */}
      <TopBanner />

      <header className="sticky top-0 z-50 border-b border-chrono-border/20 bg-background/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-chrono-primary to-fuchsia-600 flex items-center justify-center shadow-lg shadow-chrono-primary/25"
              aria-hidden="true"
            >
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                MyAniWatchOrder
              </span>
              <span className="text-[10px] text-[#a8a3b8] uppercase tracking-widest font-semibold">
                Grounded Watch Orders
              </span>
            </div>
          </div>

          {/* Use the HeaderActions client component here */}
          <HeaderActions />
        </div>
      </header>

      {/* Primary Experience Container */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        <ErrorBoundary>
          <InteractiveSearch initialSuggestions={suggestionsWithImages} airingAnime={airingAnime} />
        </ErrorBoundary>
      </section>

      {/* How It Works — onboarding for new users (Runway #2) */}
      <HowItWorks />

      {/* Fully Informative Footer System */}
      <footer className="border-t border-chrono-border/20 bg-chrono-surface/20 py-10 backdrop-blur-md mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="font-extrabold text-sm tracking-tight text-white block">
              Database-Grounded Navigation
            </span>
            <p className="text-xs text-[#a8a3b8] leading-relaxed max-w-xs">
              This system does not rely on static artificial intelligence memory. MyAniWatchOrder constructs interactive timelines directly from live GraphQL relation graphs, eliminating information errors on new and ongoing releases.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#a8a3b8] uppercase tracking-wider mb-3">
              Developer Info
            </h2>
            <ul className="space-y-2 text-xs text-[#a8a3b8]">
              <li>
                <a
                  href="https://x.com/agenticweeb"
                  className="hover:text-chrono-primary transition-colors font-bold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow @agenticweeb on X
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agenticweeb/myaniwatchorder"
                  className="hover:text-chrono-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <Link
                  href={`/season/${getCurrentSeasonSlug()}`}
                  className="hover:text-chrono-primary transition-colors"
                >
                  This Season's Anime — Watch Orders
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-chrono-primary transition-colors">
                  How our watch orders are built
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#a8a3b8] uppercase tracking-wider mb-3">
              Technical Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Next.js 16 App Router",
                "React 19 Server Actions",
                "Tailwind CSS v4",
                "Dynamic Graph Compilation",
              ].map((label) => (
                <span
                  key={label}
                  className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full text-[#a8a3b8] border border-chrono-border/60"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-chrono-border/10 text-center space-y-2 select-none">
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold">
            <Link href="/privacy" className="text-[#a8a3b8] hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="text-chrono-border" aria-hidden="true">·</span>
            <Link href="/terms" className="text-[#a8a3b8] hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-[10px] text-chrono-text-dim">
            © {new Date().getFullYear()} MyAniWatchOrder • Optimized by @agenticweeb
          </p>
        </div>
      </footer>
    </main>
  );
}
