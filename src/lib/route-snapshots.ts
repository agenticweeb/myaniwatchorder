export interface RouteSnapshotEntry {
  id: string;
  title: string;
  tier: string;
  episodeCount?: number;
  timeEstimate?: string;
  whyWatch?: string;
  trailerUrl?: string | null;
}

export interface RouteSnapshot {
  franchiseId: string;
  franchise: string;
  generatedAt: string;
  pathId: string;
  entries: RouteSnapshotEntry[];
}

const STORAGE_KEY = "myaniwatchorder-route-snapshots-v1";

export function saveRouteSnapshot(snapshot: RouteSnapshot) {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    current[snapshot.franchiseId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // A full or unavailable browser storage must never interrupt generation.
  }
}

export function getRouteSnapshot(franchiseId: string): RouteSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")[franchiseId] || null;
  } catch {
    return null;
  }
}
