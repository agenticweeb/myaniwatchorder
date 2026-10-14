"use client";

import { useCallback, useMemo } from "react";
import { useWatchStore } from "@/lib/store";
import { UserProgress, WatchOrderEntry } from "@/types";

export function useProgress(franchiseId: string) {
  const progress = useWatchStore((state) => state.progressMap[franchiseId] || null);
  const toggleWatchedStore = useWatchStore((state) => state.toggleWatched);
  const updateProgressStore = useWatchStore((state) => state.updateProgress);
  const rateEntryStore = useWatchStore((state) => state.rateEntry);
  const addNoteStore = useWatchStore((state) => state.addNote);
  const registerTimelineStore = useWatchStore((state) => state.registerTimeline);

  const toggleWatched = useCallback(
    (entryId: string, entry: WatchOrderEntry) => {
      toggleWatchedStore(franchiseId, entryId, entry.episodeCount || 1);
    },
    [franchiseId, toggleWatchedStore]
  );

  const updateProgress = useCallback(
    (entryId: string, episodesWatched: number, entry: WatchOrderEntry) => {
      updateProgressStore(franchiseId, entryId, episodesWatched, entry.episodeCount || 1);
    },
    [franchiseId, updateProgressStore]
  );

  const rateEntry = useCallback(
    (entryId: string, rating: number) => {
      rateEntryStore(franchiseId, entryId, rating);
    },
    [franchiseId, rateEntryStore]
  );

  const addNote = useCallback(
    (entryId: string, note: string) => {
      addNoteStore(franchiseId, entryId, note);
    },
    [franchiseId, addNoteStore]
  );

  const registerTimeline = useCallback(
    (metadata: { totalEpisodes: number; totalEntries: number; title?: string; imageUrl?: string; coverColor?: string }) => {
      registerTimelineStore(franchiseId, metadata);
    },
    [franchiseId, registerTimelineStore]
  );

  const getCompletionRate = useCallback((totalTimelineEpisodes: number = 0) => {
    if (!progress) return 0;
    const entries = Object.values(progress.entries);
    if (entries.length === 0 && totalTimelineEpisodes === 0) return 0;
    
    // Use the total episodes passed from the timeline, not just what's in the store
    const total = totalTimelineEpisodes > 0 ? totalTimelineEpisodes : entries.reduce((sum, e) => sum + (e.maxEpisodes || 1), 0);
    if (total === 0) return 0;
    
    const watchedEpisodes = entries.reduce((sum, e) => sum + (e.watched ? (e.maxEpisodes || 1) : (e.episodesWatched || 0)), 0);
    
    return Math.min(100, Math.round((watchedEpisodes / total) * 100));
  }, [progress]);
  const generateShareCode = useCallback(() => {
    if (!progress) return "";
    const code = btoa(
      JSON.stringify({
        f: progress.franchiseId,
        e: Object.entries(progress.entries).map(([id, p]) => [
          id,
          p.watched,
          p.episodesWatched,
        ]),
      })
    );
    return code;
  }, [progress]);

  return {
    progress,
    toggleWatched,
    updateProgress,
    rateEntry,
    addNote,
    registerTimeline,
    getCompletionRate,
    generateShareCode,
  };
}
