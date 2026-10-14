"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWatchStore } from "@/lib/store";
import type { UserProgress } from "@/types";

function mergeProgress(
  local: Record<string, UserProgress>,
  remote: Record<string, UserProgress> | null | undefined
): Record<string, UserProgress> {
  const merged = { ...remote, ...local } as Record<string, UserProgress>;
  for (const [id, cloud] of Object.entries(remote || {})) {
    const browser = local[id];
    if (!browser) {
      merged[id] = cloud;
      continue;
    }
    const entries = { ...cloud.entries };
    for (const [entryId, cloudEntry] of Object.entries(cloud.entries || {})) {
      const browserEntry = browser.entries?.[entryId];
      if (!browserEntry) continue;
      const browserCount = browserEntry.episodesWatched || 0;
      const cloudCount = cloudEntry.episodesWatched || 0;
      entries[entryId] = browserCount >= cloudCount ? browserEntry : cloudEntry;
    }
    for (const [entryId, browserEntry] of Object.entries(browser.entries || {})) {
      if (!entries[entryId]) entries[entryId] = browserEntry;
    }
    const totalWatched = Object.values(entries).reduce((sum, entry) => sum + (entry.episodesWatched || 0), 0);
    merged[id] = {
      ...cloud,
      ...browser,
      entries,
      totalWatched,
      totalEpisodes: Math.max(cloud.totalEpisodes || 0, browser.totalEpisodes || 0),
      totalEntries: Math.max(cloud.totalEntries || 0, browser.totalEntries || 0),
      lastUpdated: new Date(Math.max(Date.parse(cloud.lastUpdated || ""), Date.parse(browser.lastUpdated || ""))).toISOString(),
    };
  }
  return merged;
}

export function ProgressSync() {
  const progressMap = useWatchStore((state) => state.progressMap);
  const replaceProgressMap = useWatchStore((state) => state.replaceProgressMap);
  const hydratedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const hydrate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      userIdRef.current = user?.id ?? null;
      if (!user) {
        hydratedRef.current = true;
        return;
      }
      const { data } = await supabase
        .from("user_progress")
        .select("progress_data")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      const current = useWatchStore.getState().progressMap;
      const merged = mergeProgress(current, data?.progress_data || {});
      replaceProgressMap(merged);
      hydratedRef.current = true;
      await supabase
        .from("user_progress")
        .update({ progress_data: merged, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    };
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void hydrate();
      if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        hydratedRef.current = true;
      }
      if (session?.user) userIdRef.current = session.user.id;
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [replaceProgressMap]);

  useEffect(() => {
    if (!hydratedRef.current || !userIdRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase
        .from("user_progress")
        .update({ progress_data: progressMap, updated_at: new Date().toISOString() })
        .eq("id", userIdRef.current);
    }, 900);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [progressMap]);

  return null;
}
