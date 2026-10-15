import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  alternates: { canonical: "https://aniwatchorder.cc/privacy" },
  title: "Privacy Policy — MyAniWatchOrder",
  description: "What MyAniWatchOrder stores, what it doesn't, and the choices you have.",
};

const SECTIONS = [
  {
    title: "The short version",
    body: "MyAniWatchOrder works without an account. If you never log in, everything you do — watch progress, searches, preferences — stays in your own browser's local storage. Nothing is uploaded anywhere. If you do create an account, we additionally sync your watch progress and recent generation history so it follows you across devices.",
  },
  {
    title: "What we store locally (no account)",
    body: "Watch progress, generation history (last 5), and cache live in your browser's localStorage under keys like myaniwatchorder-progress-v2. This data never leaves your device, and clearing your browser data erases it completely. We use Microsoft Clarity for anonymous, cookieless usage analytics (heatmaps and session recordings) to understand how the site is used. Clarity masks all input content by default.",
  },
  {
    title: "What we store when you sign up",
    body: "Your email address and password (handled by Supabase Auth — we never see your raw password), your OAuth identity if you sign in with Google or Discord, your watch progress, and your last 5 generated watch orders. That's the entire list. We do not ask for or store your real name, payment details, or any third-party service credentials.",
  },
  {
    title: "What we never do",
    body: "We don't sell, rent, or share your data with advertisers. We don't run third-party ad networks or tracking pixels. We don't send marketing emails — you'll only ever receive transactional email (account confirmation, password reset).",
  },
  {
    title: "Deleting your account and data",
    body: "At the bottom of your Account page, account deletion removes your user record and all associated progress from our database. Local (browser) data can be cleared any time through your browser settings.",
  },
  {
    title: "Third-party services",
    body: "The site displays content and cover images from AniList (their API and CDN) and MyAnimeList via Jikan. Authentication runs on Supabase. Emails are sent through Resend. These services process only the minimal data required to deliver their function. Full AniList, Google, and Discord privacy terms apply to their own sign-in flows.",
  },
  {
    title: "Contact",
    body: "Questions about this policy or your data: reach out via the Feedback button on any page, or through the community Discord linked in the site header. This policy may be updated as the service evolves; material changes will be reflected on this page.",
  },
];

export default function PrivacyPage() {
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
          Privacy Policy
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
      </div>
    </main>
  );
}
