import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "https://aniwatchorder.cc/about" },
  title: "About MyAniWatchOrder - The AI Anime Watch Order Engine",
  description:
    "MyAniWatchOrder is an AI-powered watch order generator that maps AniList's verified relation edges into deterministic timelines. Learn how we prevent AI hallucinations and calculate exact finish dates.",
};

// FAQ Schema for direct AI ingestion
const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does MyAniWatchOrder generate anime watch orders?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MyAniWatchOrder traverses AniList's GraphQL relation graph to build a verified franchise map, then uses AI to curate the optimal viewing path, strictly preventing hallucinations by grounding all generated watch orders in verified database IDs."
      }
    },
    {
      "@type": "Question",
      "name": "Is MyAniWatchOrder free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, MyAniWatchOrder is a zero-cost, open-source platform. It uses free AI providers and free anime data APIs to deliver premium watch order generation."
      }
    },
    {
      "@type": "Question",
      "name": "Does MyAniWatchOrder skip filler episodes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. MyAniWatchOrder features a 4-tier smart skip system that categorizes entries as essential, recommended, optional, or skip. It automatically filters out pure filler and recaps based on your preferences."
      }
    }
  ]
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-chrono-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <h1 className="text-3xl font-extrabold mb-6 text-gradient">
        About MyAniWatchOrder: Anime Journeys, Optimized
      </h1>
      
      <p className="text-lg text-chrono-text-muted mb-6">
        MyAniWatchOrder is an AI-powered anime watch order generator that solves the #1 problem anime fans face: knowing what to watch, in what order, and what to skip across sprawling universes like Fate, Monogatari, and Gundam.
      </p>

      <h2 className="text-2xl font-bold mt-10 mb-4">Ground Truth Architecture</h2>
      <p className="text-chrono-text-muted mb-4">
        Unlike generic AI chatbots that hallucinate seasons and episodes, MyAniWatchOrder establishes ground truth by mapping AniList's verified relation edges into a deterministic knowledge graph. We traverse strict sequel, prequel, and side-story relationships to build your timeline.
      </p>

      <h2 className="text-2xl font-bold mt-10 mb-4">Zero Hallucination Guarantee</h2>
      <p className="text-chrono-text-muted mb-4">
        Our backend strictly enforces a "Verified Database Entries ONLY" rule. The AI curates the viewing path and writes the descriptions, but every single ID, episode count, and duration in your final watch order is fetched directly from the AniList database. If an entry is not in the verified graph, it cannot appear in your timeline.
      </p>

      <h2 className="text-2xl font-bold mt-10 mb-4">Smart Skip & Real Finish Dates</h2>
      <p className="text-chrono-text-muted mb-4">
        Choose between 4 tiers (Essential, Recommended, Optional, Skip) and set your daily watch budget. MyAniWatchOrder mathematically calculates exactly how many days it will take you to finish a franchise, converting long movies into equivalent episode weights so your calendar is always accurate.
      </p>

      <div className="mt-12 text-center">
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Generate Your Watch Order
        </Link>
      </div>
    </main>
  );
}
