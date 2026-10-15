export interface EditorialSection {
  heading: string;
  body: string;
}

export interface EditorialGuide {
  slug: string;
  eyebrow: string;
  intro: string;
  sections: EditorialSection[];
  related: Array<{ slug: string; label: string }>;
}

/**
 * Franchise-specific editorial notes are intentionally separate from the
 * generated timeline. They give each public guide a useful human-readable
 * explanation instead of relying on interchangeable programmatic copy.
 */
export const EDITORIAL_GUIDES: Record<string, EditorialGuide> = {
  "fate-series": {
    slug: "fate-series",
    eyebrow: "Editorial route notes",
    intro: "Fate is not one straight sequel chain. The safest starting point depends on whether you want the central Stay Night story first, the darker prequel context, or a broad tour of the wider franchise.",
    sections: [
      {
        heading: "Where most first-time viewers should start",
        body: "Start with Unlimited Blade Works, then continue into the Heaven's Feel films. This keeps the main character and rules of the Holy Grail War understandable before you branch into Fate/Zero, Grand Order, or the alternate worlds.",
      },
      {
        heading: "Why Fate watch orders disagree",
        body: "The franchise mixes routes, prequels, adaptations, and alternate universes. Fate/Zero is a prequel in story chronology, but watching it first can reveal information that the Stay Night routes intend to reveal later. That is why release-aware and spoiler-safe paths can differ.",
      },
      {
        heading: "What to treat as optional",
        body: "Grand Order, Apocrypha, Prisma Illya, and the cooking spin-off are not required to understand the core Stay Night route. Add them after the main path when you want more of the setting or specific characters.",
      },
    ],
    related: [
      { slug: "steins-gate", label: "Steins;Gate timeline guide" },
      { slug: "monogatari-series", label: "Monogatari nonlinear watch order" },
      { slug: "neon-genesis-evangelion", label: "Evangelion alternate-reality guide" },
    ],
  },
  "monogatari-series": {
    slug: "monogatari-series",
    eyebrow: "Editorial route notes",
    intro: "Monogatari rewards a deliberate order because its arcs are released out of chronological sequence. The release order is usually the best first experience, while a chronological path is better for a second pass.",
    sections: [
      {
        heading: "The recommended first watch",
        body: "Use the release-oriented path beginning with Bakemonogatari. The franchise introduces its mysteries, character voices, and visual language in the order the audience originally received them.",
      },
      {
        heading: "Release order versus chronology",
        body: "Chronological order can place backstory before the series has established why it matters. For a first watch, that can flatten reveals and make character arcs harder to follow. Choose chronology when you already know the major mysteries and want to study the timeline.",
      },
      {
        heading: "The small entries matter",
        body: "Short specials, recap material, and side stories vary in importance. The timeline separates essential story arcs from optional extras so you can keep the narrative intact without treating every bonus as mandatory.",
      },
    ],
    related: [
      { slug: "fate-series", label: "Fate route and universe guide" },
      { slug: "haruhi-suzumiya", label: "Haruhi broadcast-order guide" },
      { slug: "danganronpa", label: "Danganronpa split-order guide" },
    ],
  },
  "steins-gate": {
    slug: "steins-gate",
    eyebrow: "Editorial route notes",
    intro: "Steins;Gate is easier when the first series is allowed to establish the time-travel rules before Steins;Gate 0 expands the alternate worldline. The order is about preserving emotional context as much as chronology.",
    sections: [
      {
        heading: "The clean first route",
        body: "Watch the original Steins;Gate series before treating Steins;Gate 0 as a separate continuation. The first series gives the central cast, terminology, and turning points their intended weight.",
      },
      {
        heading: "Where 0 belongs",
        body: "Steins;Gate 0 explores the worldline created by the events around the original series' late turning point. It works best after you understand the original route rather than being used as an opening chapter.",
      },
      {
        heading: "Movies, OVAs, and specials",
        body: "The movie and short specials add character and side-story material, but they should not interrupt the core escalation on a first viewing. The generated timeline keeps them visible while distinguishing them from the main story.",
      },
    ],
    related: [
      { slug: "monogatari-series", label: "Monogatari nonlinear order" },
      { slug: "haruhi-suzumiya", label: "Haruhi timeline guide" },
      { slug: "fate-series", label: "Fate's branching routes" },
    ],
  },
  "gundam-uc": {
    slug: "gundam-uc",
    eyebrow: "Editorial route notes",
    intro: "Universal Century Gundam is a history of connected conflicts, not a single short series. A good first route should establish the One Year War before moving through the major political and character consequences.",
    sections: [
      {
        heading: "A practical starting point",
        body: "Begin with the original Mobile Suit Gundam story, using the compilation films if you prefer a shorter entry. Then move through Zeta Gundam, Double Zeta, and Char's Counterattack before the later Universal Century entries that assume that history.",
      },
      {
        heading: "Why release context matters",
        body: "Many UC side stories are set between major events, but they were not all designed as entry points. Watching a side story first can introduce factions and technology without explaining the conflict that gives them meaning.",
      },
      {
        heading: "How to handle side stories",
        body: "Treat OVAs and short side stories as optional expansions until the main conflict is familiar. The timeline keeps them available without forcing a new viewer to complete every branch before reaching the central UC milestones.",
      },
    ],
    related: [
      { slug: "legend-of-the-galactic-heroes", label: "Legend of the Galactic Heroes space-opera guide" },
      { slug: "ghost-in-the-shell", label: "Ghost in the Shell timeline guide" },
      { slug: "code-geass", label: "Code Geass split-timeline guide" },
    ],
  },
  "one-piece": {
    slug: "one-piece",
    eyebrow: "Editorial route notes",
    intro: "One Piece is long because its main story is long, not because every episode is required. The useful question is where to protect the manga-canon story while making filler and movie material easy to identify.",
    sections: [
      {
        heading: "The best first-time approach",
        body: "Follow the main television story in order and use the smart-skip tiers when you want to remove non-essential detours. Skipping by broad season labels can be risky because some mixed episodes contain canon material.",
      },
      {
        heading: "Movies and specials",
        body: "Most theatrical films are optional side experiences rather than prerequisites for the main plot. Their best placement depends on which characters and abilities they assume, so the timeline presents them near the relevant story era instead of treating every film as a required chapter.",
      },
      {
        heading: "Why an episode-range guide is safer",
        body: "A simple list of filler arcs can miss mixed-canon episodes and recap segments. MyAniWatchOrder keeps the episode-level entries grounded in source metadata, then exposes Essential, Recommended, Optional, and Skip tiers so you can choose how complete your journey should be.",
      },
    ],
    related: [
      { slug: "naruto", label: "Naruto filler-aware watch order" },
      { slug: "bleach", label: "Bleach smart-skip guide" },
      { slug: "dragon-ball", label: "Dragon Ball franchise guide" },
    ],
  },
};

export function getEditorialGuide(slug: string): EditorialGuide | undefined {
  return EDITORIAL_GUIDES[slug];
}
