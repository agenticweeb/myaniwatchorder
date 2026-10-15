import Link from "next/link";
import { ArrowRight, BookOpenCheck, Network } from "lucide-react";
import type { EditorialGuide } from "@/lib/seo/editorial-guides";

export function EditorialGuideSection({ guide }: { guide: EditorialGuide }) {
  return (
    <section
      className="max-w-4xl mx-auto mt-16 space-y-8"
      aria-labelledby="editorial-guide-title"
    >
      <div className="rounded-3xl border border-chrono-primary/20 bg-chrono-primary/[0.06] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-chrono-primary">
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          {guide.eyebrow}
        </div>
        <h2 id="editorial-guide-title" className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
          The practical way to approach this franchise
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-chrono-text-muted sm:text-base">
          {guide.intro}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {guide.sections.map((section) => (
            <article key={section.heading}>
              <h3 className="text-sm font-bold leading-snug text-white">{section.heading}</h3>
              <p className="mt-2 text-sm leading-6 text-chrono-text-dim">{section.body}</p>
            </article>
          ))}
        </div>
      </div>

      <nav aria-labelledby="related-guides-title" className="rounded-2xl border border-chrono-border/25 bg-chrono-surface/35 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-chrono-primary" aria-hidden="true" />
          <h2 id="related-guides-title" className="text-sm font-extrabold uppercase tracking-wider text-white">
            Related watch-order problems
          </h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {guide.related.map((related) => (
            <Link
              key={related.slug}
              href={`/watch-order/${related.slug}`}
              className="group inline-flex items-center justify-between gap-2 rounded-xl border border-chrono-border/25 bg-black/10 px-3 py-3 text-xs font-bold text-chrono-text-muted transition-colors hover:border-chrono-primary/50 hover:text-white"
            >
              <span>{related.label}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-chrono-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
