# MyAniWatchOrder Upgrade Outcomes

## Progress integrity and continuity
- [x] Existing local progress remains readable; timeline registration records enough backward-compatible metadata for meaningful totals and resume cards.
- [x] A signed-in user’s local and cloud progress are merged without blocking the timeline, and later local changes are persisted with a debounced background sync.
- [x] Legacy records with missing totals do not render misleading completion percentages or completed states.

## Anime journey dashboard
- [x] The account page opens with a progress-first journey header and clear resume actions.
- [x] In-progress franchises appear before administrative settings, with cover art, progress, watched/total information, last activity, and a real resume link.
- [x] Completed franchises and the wider library remain available without overwhelming the first screen.
- [x] Generation history uses cover art and stable AniList-ID deep links where available.
- [x] Sign-in methods, real settings, and account deletion remain available below the primary journey content.

## Product polish and efficiency
- [x] Remove or implement controls that do not currently affect the application; do not expose a misleading theme selector.
- [x] Preserve the current watch-order generation engine, anonymous experience, route behavior, and existing account deletion protection.
- [x] Add the page route manifest required by the managed website workflow.

## Validation
- [x] TypeScript validation passes.
- [x] Production build passes.
- [x] Working branch contains only intentional source/config/documentation changes.
