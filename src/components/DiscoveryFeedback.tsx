"use client";

import { MessageSquare, Sparkles } from "lucide-react";

const OPTIONS = [
  { label: "Vibe Search", value: "I want mood-based discovery, like: something like Made in Abyss but shorter." },
  { label: "Community Skip Ledger", value: "I want community consensus on what is actually safe to skip." },
  { label: "Chat integrations", value: "I want watch orders available inside Discord or Telegram." },
];

interface DiscoveryFeedbackProps {
  onChoose: (message: string) => void;
}

export function DiscoveryFeedback({ onChoose }: DiscoveryFeedbackProps) {
  return (
    <section className="rounded-2xl border border-chrono-border/20 bg-chrono-surface/30 p-4 sm:p-5" aria-labelledby="discovery-feedback-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chrono-primary/15 text-chrono-primary"><MessageSquare className="h-4 w-4" /></div>
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-chrono-primary"><Sparkles className="h-3 w-3" /> Shape what comes next</p>
            <h2 id="discovery-feedback-title" className="mt-1 text-sm font-bold text-white">What would make discovery more useful?</h2>
            <p className="mt-1 text-[11px] text-chrono-text-dim">These are ideas, not promises. Tell us which one would actually help you.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {OPTIONS.map((option) => <button key={option.label} type="button" onClick={() => onChoose(option.value)} className="rounded-full border border-chrono-border/40 bg-black/10 px-3 py-1.5 text-[11px] font-bold text-chrono-text-muted transition-colors hover:border-chrono-primary/50 hover:text-white">{option.label}</button>)}
        </div>
      </div>
    </section>
  );
}
