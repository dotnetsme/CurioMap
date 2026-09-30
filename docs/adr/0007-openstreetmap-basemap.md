# ADR 0007: OpenStreetMap basemap via Leaflet (supersedes ADR 0006)

- **Status**: Accepted
- **Date**: 2026-09-22
- **Supersedes**: [ADR 0006](0006-observatory-map-engine.md) (Observatory SVG-only map engine)
- **Decision owner**: Maintainer (explicit instruction: "use the OpenStreetMap as before and keep other features on the map as it is")
- **Scope**: Frontend map rendering only. Privacy, redaction, and API behavior from ADR 0003 remain fully in force.

## Context

ADR 0006 removed Leaflet and the OpenStreetMap (OSM) raster basemap on the
grounds that it (a) violated the "Zero Mapping Libraries" pillar, (b) leaked
every visitor's IP to OSMF tile servers, and (c) showed street-level imagery
that overstates the ~15 km coordinate fuzz. The SVG Observatory engine that
replaced it was fully built, but the maintainer has decided the basemap is worth
those costs: readers need geographic context to make the fuzzed heat layer
legible.

This ADR records that reversal rather than pretending the trade-off disappeared.
The costs ADR 0006 measured are still real; they are now accepted debt with
mitigations, not solved problems.

## Options considered

1. **Keep ADR 0006 (SVG-only).** No third-party requests, no licence risk, no
   provider dependency — but no recognizable geography, which was the objection.
2. **Restore Leaflet + `react-leaflet` + OSM tiles, exactly as before.** Fastest
   path, but `react-leaflet` v5 and `@react-leaflet/core` are Hippocratic-2.1
   (not OSI-approved) against this repo's Apache-2.0 licence, and only a handful
   of wrapper lines were ever needed.
3. **Restore Leaflet (BSD-2-Clause) with a hand-written React wrapper + OSM
   raster tiles.** One runtime dependency, no licence conflict, full control of
   attribution, zoom ceiling and marker layer. Chosen.
4. **Hand-roll raster tiles into the existing SVG engine.** Same third-party
   requests and IP disclosure as option 3, but requires re-implementing tile
   pyramids, wrap-around and zoom snapping — strictly worse than using Leaflet
   for the identical privacy cost.
5. **Proxy tiles through the Next server.** Hides visitor IPs from OSMF, but the
   OSMF policy explicitly does *not* recommend caching proxies in front of
   `tile.openstreetmap.org`, and it adds an egress/cache tier to own. Deferred:
   revisit if traffic ever justifies a paid or self-hosted tile provider.

## Chosen option

**Option 3.** Concretely:

1. **Engine.** `frontend/components/discover/ObservatoryMap.tsx` owns a Leaflet
   map created imperatively inside an effect; `leaflet` is imported dynamically
   (`await import("leaflet")`) so it can never be evaluated during SSR, and the
   component itself is loaded through `next/dynamic` with `{ ssr: false }` from
   `CuriosityMapShell.tsx` (AGENTS.md §3). `ObservatoryLegend` was split into its
   own module (`ObservatoryLegend.tsx`) so `/` and `/discover/global` render the
   legend without pulling Leaflet into their first-load JS.
2. **Basemap.** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, overridable
   with `NEXT_PUBLIC_MAP_TILE_URL` (the policy asks consumers not to hard-code a
   provider). Tile requests are never sent with `Cache-Control: no-cache`, and
   no prefetch/offline feature may be added (policy §4).
3. **Attribution is mandatory and visible**: `attributionControl` stays enabled,
   the control is styled for contrast but never hidden, and it carries the
   copyright link plus the `fixthemap` link. The map's own control bar moved to
   the bottom-left so it cannot cover the attribution.
4. **Zoom ceiling `MAP_MAX_ZOOM = 12`.** Deeper zoom would expose street-level
   detail the ~15 km fuzz grid does not support. `MAX_TILE_ZOOM = 19` remains the
   native pyramid depth only as the tile layer's own limit.
5. **Screen-space region markers.** Region blooms are `L.circleMarker` radii in
   CSS pixels, not `L.circle` metres: a 15 km metric circle is sub-pixel at world
   zoom, which would have hidden the entire heat layer on first paint. A
   screen-space marker at a fuzzed point is also the honest claim — it marks
   *where* readers are without asserting ground radius.
6. **Feature parity with the previous engine.** Heat / bubbles / dark modes and
   their palette, top-3 pulse halos, animated fly-to on region selection,
   click-to-deselect, persona avatars with gradient chips and book-count badges,
   the active-reader popover, the "Reading now" rail, the trending rail, overlay
   stats, zoom/reset controls, keyboard pan/zoom, and 44 px touch targets all
   remain. `focusOnVisitor` and `navigateOnSelect` are no longer inert: `/home`
   and `/` can fly to the visitor's fuzzed area (own coordinates first, else IP
   country), and embedded maps can hand region clicks to `/discover/global`.
   Tooltips and popovers are built from `textContent`, never HTML strings.

## Consequences

- **Negative — privacy.** Every map view sends tile requests to OSMF servers,
  disclosing visitor IPs and Referers, and OSMF publishes aggregated usage data
  for the apps using its service. This is the cost ADR 0006 named; it is now
  accepted for basemap legibility. Progressive fuzzing of coordinates, location
  redaction, and `hidden`-user exclusion are unchanged.
- **Negative — availability.** The tile service is best-effort, has no SLA, and
  may be rate-limited or blocked without notice; commercial and donation-seeking
  services are explicitly at risk. Mitigation: the tile URL is configuration, so
  switching to a self-hosted or paid provider needs no code change.
- **Negative — bundle.** Leaflet adds a lazy client chunk (148,486 bytes raw / 42,648 bytes gzip, measured
  in `.next/static/chunks`). Verified not to sit in first-load JS:
  the chunk is referenced only by other lazy chunks, never by prerendered HTML.
- **Negative — licence surface.** One more runtime dependency to audit; it is
  BSD-2-Clause, and `react-leaflet` was removed rather than adopted.
- **Positive — geographic legibility**, attribution compliant with the policy,
  and a heat layer visible at every zoom level.
- **Neutral — dead code removed**: `observatory-viewport.ts`, `world-landmass.ts`
  and `WorldLandmass.tsx` are deleted rather than left orphaned.

## Verification

- `npm run lint`, `npx tsc --noEmit`, `npm run build` — clean; all 24 routes
  compile.
- `.next/static/chunks` contains exactly one Leaflet chunk, referenced only by
  lazy chunk loaders, not by any prerendered HTML (no critical-path bloat).
- `npm uninstall react-leaflet` applied; `npm install` reports 0 vulnerabilities.
- **Static guardrails**: `scripts/verify-map-engine.mjs` (19 checks) runs inside
  `frontend` `npm run lint`, which CI runs — attribution, zoom ceiling, tile
  cache/prefetch policy, configured tile URL, `react-leaflet` ban and
  `textContent` tooltips now fail the build when violated.
- **Live interaction probe**: `scripts/verify-map-live.mjs` (22 headless-Chrome
  CDP checks) passed exit 0 against the seeded local stack on 2026-09-22 —
  tiles, in-frame attribution, bloom heartbeat, click-to-select fly-to,
  popover open/shelf-link/no-email/dismiss, zoom-ceiling plateau at 12,
  keyboard focusability, 40px+ persona touch targets.
- **Regression caught red→green**: the probe's first run failed
  `region click flies to selection zoom` (zoom snapped 9 → 2) because Leaflet
  propagates a layer's click to the map's own `click` handler in the same
  dispatch, so selecting a region immediately fired the background-deselect
  handler. Fixed with a one-microtask `layerClickGuardRef`
  (`ObservatoryMap.tsx`); the probe now passes.

## Open follow-ups (not covered by this ADR)

- **The live probe is not a CI gate**: `scripts/verify-map-live.mjs` needs a
  seeded stack (Postgres/Redis + API + demo data) and a browser, so it runs
  locally via `npm run verify:map` only. A `map-e2e` CI job with docker
  services + a Chrome step is still required before CI can assert tile
  loading, marker animation, popover flow, the zoom plateau or the
  keyboard/touch affordances (AGENTS.md §8.11).
- No Next `Referrer-Policy` is set (correct: the policy forbids a restrictive
  value that suppresses the Referer). If one is ever added, it must keep the
  Referer flowing to `tile.openstreetmap.org`.
- Production tile strategy for real traffic (self-hosted or paid provider) is
  undecided; OSM's own policy says access may be withdrawn at any time.
- `.codebase-memory/graph.db.zst` has not been re-indexed for this change.
