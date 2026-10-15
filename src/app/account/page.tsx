import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { queryAniList } from "@/lib/anilist-client";
import { FranchisePassport } from "@/components/FranchisePassport";
import { GenerationHistorySection } from "@/components/account/GenerationHistorySection";
import { ConnectedAccountsSection } from "@/components/account/ConnectedAccountsSection";
import { SettingsSection } from "@/components/account/SettingsSection";
import { ArrowLeft, Clock, Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Anime Journey",
  robots: { index: false, follow: false },
};

const MEDIA_INFO_QUERY = `
  query($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji native }
        coverImage { large color }
        episodes
        format
      }
    }
  }
`;

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?signin=1");

  const { data: profile } = await supabase
    .from("user_progress")
    .select("progress_data, generation_history, settings")
    .eq("id", user.id)
    .single();

  const progressData = profile?.progress_data || {};
  const franchises = Object.entries(progressData)
    .map(([franchiseId, raw]: [string, any]) => {
      const anilistId = parseInt(franchiseId.replace("fr_", ""), 10);
      const entries = Object.values(raw.entries || {}) as any[];
      const totalWatched = entries.reduce((sum, entry) => sum + (entry.episodesWatched || 0), 0) || raw.totalWatched || 0;
      const inferredTotal = entries.reduce((sum, entry) => sum + (entry.maxEpisodes || 0), 0);
      return {
        franchiseId,
        anilistId,
        totalWatched,
        totalEpisodes: Math.max(raw.totalEpisodes || 0, inferredTotal),
        totalEntries: Math.max(raw.totalEntries || 0, entries.length),
        watchedEntries: entries.filter((entry) => entry.watched).length,
        lastUpdated: raw.lastUpdated,
        startedAt: raw.startedAt,
        title: raw.title,
        imageUrl: raw.imageUrl,
        coverColor: raw.coverColor,
      };
    })
    .filter((franchise) => !isNaN(franchise.anilistId) && franchise.anilistId > 0);

  const history = profile?.generation_history ?? [];
  const ids = [...new Set([
    ...franchises.map((franchise) => franchise.anilistId),
    ...history.map((entry: any) => entry.anilistId).filter(Boolean),
  ])];
  const mediaMap: Record<number, any> = {};
  if (ids.length) {
    try {
      const response = await queryAniList(MEDIA_INFO_QUERY, { ids });
      for (const media of response?.Page?.media || []) mediaMap[media.id] = media;
    } catch {
      // The dashboard remains useful with cached progress if AniList is unavailable.
    }
  }

  const enrichedFranchises = franchises.map((franchise) => ({
    ...franchise,
    title: franchise.title || mediaMap[franchise.anilistId]?.title?.english || mediaMap[franchise.anilistId]?.title?.romaji || `Anime #${franchise.anilistId}`,
    imageUrl: franchise.imageUrl || mediaMap[franchise.anilistId]?.coverImage?.large || "",
    coverColor: franchise.coverColor || mediaMap[franchise.anilistId]?.coverImage?.color || "#6366f1",
  }));
  const enrichedHistory = history.map((entry: any) => ({
    ...entry,
    imageUrl: mediaMap[entry.anilistId]?.coverImage?.large || "",
    coverColor: mediaMap[entry.anilistId]?.coverImage?.color || "#6366f1",
  }));

  const totalFranchises = enrichedFranchises.length;
  const completedFranchises = enrichedFranchises.filter((franchise) => franchise.totalEpisodes > 0 && franchise.totalWatched >= franchise.totalEpisodes).length;
  const totalEpisodesWatched = enrichedFranchises.reduce((sum, franchise) => sum + franchise.totalWatched, 0);
  const totalHoursInvested = Math.round(totalEpisodesWatched * 24 / 60);

  return (
    <main className="min-h-dvh relative flex flex-col">
      <header className="sticky top-0 z-50 border-b border-chrono-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-chrono-text-muted hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to finder
          </a>
          <a href="/?tab=discover" className="inline-flex items-center gap-2 rounded-full border border-chrono-primary/25 bg-chrono-primary/10 px-3 py-1.5 text-xs font-bold text-chrono-primary hover:bg-chrono-primary/20 transition-colors">
            <Compass className="w-3.5 h-3.5" /> Discover anime
          </a>
        </div>
      </header>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <FranchisePassport
          franchises={enrichedFranchises}
          userEmail={user.email || ""}
          stats={{ totalFranchises, completedFranchises, totalEpisodesWatched, totalHoursInvested }}
        />
        <GenerationHistorySection history={enrichedHistory} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConnectedAccountsSection />
          <SettingsSection initialSettings={profile?.settings ?? null} />
        </div>
        <p className="flex items-center justify-center gap-2 text-[11px] text-chrono-text-dim">
          <Clock className="w-3.5 h-3.5" /> Your journey is saved locally first, then synced in the background when you are signed in.
        </p>
      </div>
    </main>
  );
}
