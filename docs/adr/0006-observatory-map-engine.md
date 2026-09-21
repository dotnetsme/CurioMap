# ADR 0006: Observatory map engine — superseding ADR 0003 rule 9

- **Status**: Accepted
- **Date**: 2026-09-19
- **Supersedes**: [ADR 0003](0003-privacy-redaction-and-map-hardening.md) rule 9 ("No mapping libraries, ever")
- **Scope**: Frontend map rendering only; privacy, redaction, and API behavior in ADR 0003 remain fully in force.

## Context

ADR 0003 mandated "No mapping libraries, ever" — the curiosity map must be a
dependency-free SVG equirectangular projection. For a period the codebase
violated its own invariant: `frontend/components/discover/CuriosityMap.tsx`
imported `leaflet` + `react-leaflet` and rendered **default OpenStreetMap
raster street tiles**. That carried three concrete costs:

1. **Invariant violation.** AGENTS.md §1 and ADR 0003 both prohibit mapping
   libraries; the shipped code contradicted both.
2. **Privacy leak.** Every visitor's browser fetched tiles from OSM's
   third-party servers, exposing visitor IPs on a privacy-first product.
3. **Brand mismatch.** Generic gray/green street imagery (roads, parking,
   POI labels) implied street-level precision the product deliberately does
   not have — coordinates are fuzzed to a ~15 km grid (ADR 0003 rule 2).
   A pin "on a street" is a visual lie; a glowing blob over "Lisbon, Portugal"
   is honest.

## Options considered

1. **Keep Leaflet, swap to a dark tile provider (CARTO), rewrite ADR 0003.**
   Fast, but keeps a runtime third-party dependency, the visitor-IP leak,
   raster mush on retina, and requires weakening an accepted invariant.
2. **Finish the dependency-free SVG engine properly.** Own the whole visual:
   curated landmass, vector heat, persona markers; delete Leaflet entirely.
   Slower to build, but restores the invariant, removes the leak, and gives
   a unique brand surface no tile provider can match.

## Chosen option

**Option 2 — the Observatory engine.** Concretely:

1. **One engine, zero libraries.** The map renders via
   `components/discover/ObservatoryMap.tsx` on a dependency-free SVG
   equirectangular projection (`observatory-viewport.ts`) with a curated
   low-poly world silhouette (`world-landmass.ts`). No tiles, no third-party
   requests, no pan/zoom library — viewport math is plain `viewBox` state
   (wheel-at-cursor zoom, pointer drag, keyboard pan, animated fly-to).
2. **Leaflet is deleted.** `CuriosityMap.tsx` and the `leaflet`,
   `react-leaflet`, `@types/leaflet` packages were removed. The bundle no
   longer contains any mapping library, restoring ADR 0003's original intent.
3. **Zoom ceiling is designed, not accidental.** The deepest zoom is
   city-area scale. Beyond that the fuzzed ~15 km grid is the data — showing
   street-level imagery would promise precision the API does not expose.
4. **Persona layer rides the same projection.** Anonymous reader avatars
   (`MapReader`, limit ≤ 50, Redis-cached 2 min) render at their fuzzed
   coordinates as part of the same SVG. The "Reading now" rail and popovers
   are standard DOM overlays, keyboard-focusable, and honor
   `DisplayName.Resolve` and location redaction exactly as before.
5. **Observatory dark theme is the brand surface.** Heat runs
   cyan → violet → magenta; no separate light/dark map modes.

## Consequences

- Positive: invariant restored; visitor IPs no longer sent to tile servers;
  ~150 KB removed from the client bundle; unique branded map; SSR-safe
  rendering with no tile loading waterfall.
- Positive: privacy guarantees are identical — fuzzed coordinates only,
  aggregation-safe redaction untouched.
- Negative: vector coastline detail is simplified versus photorealistic
  tiles at deep zoom. Accepted: the design zoom cap (city-area) is where
  the data ends, and a stylized silhouette hides simplification better
  than raw street tiles would.
- Migration note: `focusOnVisitor` / `navigateOnSelect` remain accepted by
  `CuriosityMapShell` for API compatibility but are inert; the landing map
  deep-links to `/discover/global` instead of navigating away on click.

## References

- [ADR 0003 — Privacy redaction and map hardening](0003-privacy-redaction-and-map-hardening.md)
- AGENTS.md §1 "Zero Mapping Libraries"
