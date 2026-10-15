import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  alternates: { canonical: "https://aniwatchorder.cc/terms" },
  title: "Terms of Service — MyAniWatchOrder",
  description: "The rules for using MyAniWatchOrder, in plain language.",
};

const SECTIONS = [
  {
    title: "Accepting these terms",
    body: "By using MyAniWatchOrder, you agree to these terms. They're intentionally short: use the service for its purpose, don't abuse it, and understand that watch orders are recommendations generated from community databases and AI assistance — not absolute truth about how you must watch something.",
  },
  {
    title: "What the service provides",
    body: "MyAniWatchOrder generates suggested viewing orders for anime franchises. Orders are compiled from public databases (AniList, MyAnimeList) with AI-assisted arrangement. Episode counts, air dates, and metadata come from those databases; the ordering logic and tiering are our interpretation. Recommendations may contain errors or become outdated as new entries air.",
  },
  {
    title: "Your account",
    body: "Accounts are optional. If you create one, you're responsible for keeping your credentials secure and for activity under your account. You can delete your account at any time, which removes your stored progress and history from our servers. You must be old enough to consent to data processing in your jurisdiction, or have a guardian's permission.",
  },
  {
    title: "Acceptable use",
    body: "Don't attempt to disrupt the service, overload its APIs, scrape at scale, or resell access. The underlying anime data belongs to AniList and MyAnimeList and their respective rights holders — MyAniWatchOrder is a client of those services and claims no ownership of their content, cover images, or metadata.",
  },
  {
    title: "Availability and changes",
    body: "The service is provided as-is, free of charge, without uptime guarantees. We depend on third-party services (hosting, databases, AI providers, AniList) and inherit their outages. Features may change, and we may discontinue aspects of the service. Watch orders are for personal planning — no warranty is provided for their accuracy or fitness for a particular purpose.",
  },
  {
    title: "Limitation of liability",
    body: "To the maximum extent permitted by law, MyAniWatchOrder and its creator are not liable for any indirect or consequential damages arising from use of the service. If you rely on a watch order and it spoils something — the tiering is spoiler-aware but not spoiler-proof; check the warnings on each path.",
  },
  {
    title: "Contact and changes to these terms",
    body: "Questions, disputes, or feedback: the Feedback button on any page or the community Discord in the header. We may update these terms as the service evolves; continued use after an update constitutes acceptance. Last revision: September 2026.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-dvh relative flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-chrono-border/20">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#a8a3b8] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to MyAniWatchOrder
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-chrono-primary">
          Legal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
          Terms of Service
        </h1>
        <p className="text-xs text-chrono-text-dim mt-2">
          Last updated: September 2026
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section, i) => (
            <section key={section.title} className="glass-card rounded-2xl border border-chrono-border/20 p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-3">
                <span className="text-[11px] font-mono text-chrono-primary/70">{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              <p className="text-sm text-chrono-text-muted leading-relaxed mt-3">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 glass-card rounded-2xl border border-chrono-border/20 p-6 text-center">
          <p className="text-xs text-chrono-text-dim">
            See also the{" "}
            <Link href="/privacy" className="text-chrono-primary font-semibold hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
