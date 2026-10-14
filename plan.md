# MyAniWatchOrder — Anime Journey Upgrade

## Outcome
Make MyAniWatchOrder feel like the definitive anime watch-order and finder: preserve the grounded generation engine, make the signed-in experience useful every time a fan returns, improve data reliability, and reduce friction from discovery to resuming a franchise.

## Scope and constraints
- Work on the existing Next.js App Router application; do not rewrite the AniList/AI orchestration.
- Preserve anonymous use and existing localStorage progress formats.
- Do not require a Supabase schema migration for the first pass.
- Keep changes reversible and isolated to account, progress synchronization, metadata registration, and shared navigation.
- Do not add social/gamification/billing features.

## Implementation approach
1. Add backward-compatible progress metadata registration from the existing timeline so the account can calculate meaningful totals and continue actions.
2. Add a client-side progress bridge that merges local and cloud progress at sign-in and debounces cloud writes after local changes. Local updates remain immediate and never wait for Supabase.
3. Rebuild the account page hierarchy around resume/continue watching, library progress, and recent generated orders; move connection/settings controls below the content.
4. Enrich generation history with AniList covers and stable AniList-ID deep links.
5. Remove the misleading non-functional theme choice; retain only settings that are currently real.
6. Add route metadata for the managed website workflow and validate with TypeScript, production build, and source-clean checks.

## Project structure used
- `src/lib/store.ts`: browser-persisted watch state and backward-compatible metadata actions.
- `src/components/ProgressSync.tsx`: auth-aware local/cloud merge and debounced persistence bridge.
- `src/components/FlowchartV2.tsx`: registers the currently rendered timeline with the progress store.
- `src/app/account/page.tsx`: server-side account aggregation and AniList enrichment.
- `src/components/FranchisePassport.tsx`: progress-first dashboard and library cards.
- `src/components/account/*`: history, sign-in methods, and real account settings.
- `public/manus-routes.json`: page route manifest.

## Design direction
- **Style options:** Cinematic command center (0.06), editorial anime atlas (0.08), neon arcade dashboard (0.04).
- **Chosen style — Cinematic command center:** an anime journey control room that makes the next action obvious without becoming a game UI.
- **Design movement:** editorial streaming-service dashboard fused with sci-fi navigation instrumentation.
- **Core principles:** resume first; information-rich but calm; cover art carries identity; every card leads to a real next action.
- **Color philosophy:** keep the existing violet/fuchsia Chrono palette as the ownable signal, add cyan for active navigation and emerald for completed states, and reserve amber for time/milestones.
- **Layout paradigm:** asymmetric command header, a dominant resume rail, then a two-column content flow; avoid a centered stack of equal administrative cards.
- **Signature elements:** progress rails, cover-art glow derived from AniList colors, and small “next action” labels.
- **Interaction philosophy:** clicking a card resumes the existing generator route; no new dead-end dashboard interactions.
- **Animation:** restrained entrance motion, progress fill transitions, and hover lift only on actionable surfaces; respect reduced motion through existing CSS conventions.
- **Typography:** preserve Inter; use compact uppercase labels for metadata and larger high-contrast titles for the journey state.
- **Brand essence:** the spoiler-safe anime route planner that turns confusing franchises into a personal path; precise, cinematic, useful.
- **Brand voice:** direct and fan-aware. Example: “Pick up where the story paused.” / “Find the right route. Skip the noise.”
- **Wordmark/mark:** retain the existing clock mark because it communicates time, order, and journey.
- **Signature brand color:** Chrono violet `#6366f1`, used as the navigation signal rather than a blanket gradient.

## Acceptance intent
The dashboard must surface what to watch next, show trustworthy progress for legacy and new records, preserve data across sign-in/device changes as far as the current table permits, and leave the existing generator/build behavior intact.
