import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, GitBranch, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "How MyAniWatchOrder Works — Sources and Methodology",
  description: "Learn how MyAniWatchOrder combines AniList relation data, deterministic graph rules, AI-assisted arrangement, and editorial checks to build anime watch orders.",
  alternates: { canonical: "https://aniwatchorder.cc/methodology" },
};

const steps = [
  {
    icon: Database,
    title: "1. Start with source data",
    body: "The engine begins with public anime metadata and relation edges from AniList, with supplementary search support where appropriate. A title cannot appear in a generated route unless it exists in the verified data graph used for that request.",
  },
  {
    icon: GitBranch,
    title: "2. Build a relation graph",
    body: "Sequel, prequel, side-story, compilation, and related-media edges are mapped into a franchise graph. The graph is bounded so distant crossovers do not quietly turn a focused guide into an unrelated mega-list.",
  },
  {
    icon: Sparkles,
    title: "3. Arrange the route with AI assistance",
    body: "AI helps classify franchise shape, explain why a route is confusing, and arrange eligible entries into useful paths. It does not get to invent IDs, episode counts, or titles outside the verified graph.",
  },
  {
    icon: ShieldCheck,
    title: "4. Apply deterministic safeguards",
    body: "Validation checks the root entry, required timeline groups, entry coverage, crossover tiers, and user filters. If AI output is incomplete, the system falls back to a deterministic graph order instead of presenting an empty or unsupported route.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-dvh relative flex flex-col">
      <div className="sticky top-0 z-50 border-b border-chrono-border/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-chrono-text-muted transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to MyAniWatchOrder
          </Link>
        </div>
      </div>

      <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-chrono-primary">Sources &amp; methodology</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">How MyAniWatchOrder builds a watch order</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-chrono-text-muted">
          MyAniWatchOrder is designed for anime fans who want more than a generic chatbot answer. It combines a verified relation graph with deterministic validation and AI-assisted explanation, then presents the result as a route you can actually follow.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {steps.map(({ icon: Icon, title, body }) => (
            <section key={title} className="rounded-2xl border border-chrono-border/25 bg-chrono-surface/35 p-6">
              <Icon className="h-5 w-5 text-chrono-primary" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-chrono-text-muted">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-chrono-border/25 bg-chrono-surface/25 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">What “human-reviewed” means here</h2>
          <p className="mt-3 text-sm leading-7 text-chrono-text-muted">
            The editorial route notes on the Fate, Monogatari, Steins;Gate, Gundam Universal Century, One Piece, Naruto, Bleach, Dragon Ball, Evangelion, and JoJo pages are deliberately separate from generated timeline output. They explain the viewing problem in plain language and should be checked against the displayed route whenever a franchise changes. The generated graph remains the source for current entry metadata; editorial notes explain how to choose a path.
          </p>
          <p className="mt-3 text-sm leading-7 text-chrono-text-muted">
            If you spot a wrong relationship, missing entry, or misleading recommendation, use the feedback control on the site. Corrections are more valuable than adding another generic page.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Explore the guides</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {["fate-series", "monogatari-series", "steins-gate", "gundam-uc", "one-piece", "naruto", "bleach", "dragon-ball", "neon-genesis-evangelion", "jojo-bizarre-adventure"].map((slug) => (
              <Link key={slug} href={`/watch-order/${slug}`} className="inline-flex items-center gap-2 rounded-full border border-chrono-primary/25 bg-chrono-primary/10 px-4 py-2 text-xs font-bold text-chrono-primary hover:bg-chrono-primary/20">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {slug.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
