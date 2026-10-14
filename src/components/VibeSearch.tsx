"use client";

import { useState } from "react";
import { WandSparkles } from "lucide-react";

interface VibeSearchProps {
  onApply: (prompt: string) => void;
}

const EXAMPLES = [
  "something like Made in Abyss but shorter",
  "a dark mystery without harem or isekai",
  "a highly rated sci-fi from the 2010s",
];

export function VibeSearch({ onApply }: VibeSearchProps) {
  const [value, setValue] = useState("");
  const submit = (prompt = value) => {
    const clean = prompt.trim();
    if (!clean) return;
    setValue(clean);
    onApply(clean);
  };

  return (
    <section className="rounded-2xl border border-chrono-primary/25 bg-gradient-to-r from-chrono-primary/10 to-fuchsia-600/10 p-4 sm:p-5" aria-labelledby="vibe-search-title">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chrono-primary/20 text-chrono-primary"><WandSparkles className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h2 id="vibe-search-title" className="text-sm font-extrabold text-white">Describe the anime mood you want</h2>
          <p className="mt-1 text-[11px] text-chrono-text-dim">Vibe Search turns plain language into transparent filters. You can adjust everything below.</p>
          <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={EXAMPLES[0]} className="min-w-0 flex-1 rounded-xl border border-chrono-border/40 bg-black/20 px-3 py-2.5 text-xs text-white outline-none placeholder:text-chrono-text-dim focus:border-chrono-primary" aria-label="Describe the anime you want" />
            <button type="submit" className="rounded-xl bg-chrono-primary px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-chrono-primary/90">Apply vibe</button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => <button type="button" key={example} onClick={() => submit(example)} className="rounded-full border border-chrono-border/30 px-2.5 py-1 text-[10px] text-chrono-text-muted hover:border-chrono-primary/50 hover:text-white">Try “{example}”</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
