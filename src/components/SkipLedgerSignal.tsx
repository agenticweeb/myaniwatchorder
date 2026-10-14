"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

type LedgerRow = { mediaId: number; total: number; top: string | null; reliable: boolean };

export function SkipLedgerSignal({ mediaIds }: { mediaIds: number[] }) {
  const [rows, setRows] = useState<LedgerRow[]>([]);

  useEffect(() => {
    const ids = [...new Set(mediaIds)].filter(Boolean).slice(0, 40);
    if (!ids.length) return;
    fetch(`/api/skip-ledger?mediaIds=${ids.join(",")}`)
      .then((response) => response.json())
      .then((payload) => setRows(payload.success ? payload.rows || [] : []))
      .catch(() => setRows([]));
  }, [mediaIds]);

  const reliable = rows.filter((row) => row.reliable && row.top);
  if (!reliable.length) return null;
  const skipCount = reliable.filter((row) => row.top === "skip").length;
  const pct = Math.round((skipCount / reliable.length) * 100);

  return (
    <div className="mt-4 rounded-2xl border border-chrono-border/20 bg-chrono-surface/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chrono-primary/15 text-chrono-primary"><BarChart3 className="h-4 w-4" /></div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-chrono-primary">Skip Ledger signal</p>
          <p className="mt-1 text-xs leading-relaxed text-chrono-text-muted">Based on repeated route decisions, not a single opinion. {skipCount > 0 ? `${pct}% of entries with a reliable signal currently lean Skip.` : "No reliable skip consensus has formed yet."}</p>
          <p className="mt-1 text-[10px] text-chrono-text-dim">Only entries with at least 20 independent signals are included.</p>
        </div>
      </div>
    </div>
  );
}
