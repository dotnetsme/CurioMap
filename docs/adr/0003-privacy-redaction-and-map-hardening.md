# ADR 0003: Privacy redaction breadth, dependency-free map, and bounded query hardening

Status: Proposed  
Date: 2026-09-14  
Replaces: none  
Supersedes rule clause: `AGENTS.md` §2.3.2 (streak freeze day-gap formula)  
Related: `AGENTS.md`, `docs/adr/0001-adr-agent-governance.md`, `docs/adr/0002-integration-and-e2e-testing.md`

## Context

A full-stack audit against `AGENTS.md` invariants found that several non-negotiable
privacy guarantees were only partially enforced: they were correct in the places
that used the shared mapping helpers, but bypassed wherever a controller built
DTOs by hand. In parallel, the frontend carried a mapping-library dependency set
(`leaflet`, `leaflet.heat`, `react-leaflet`, `@types/leaflet`) that directly
contradicts the "Zero Mapping Libraries" pillar, and several collection
endpoints and outbound HTTP clients exceeded the documented bounds.

## Problems found

1. **Location redaction bypass.** `DiscoverController.MapReaders` filtered
   `LocationVisibility.Hidden` but then projected `Country/Region/City` verbatim,
   so a reader set to country-only visibility had their city and region
   published on the public map. `DiscoverController.Nearby` built
   `new LocationDto(country, region, city)` for every candidate, ignoring the
   candidate's own visibility setting entirely.
2. **Discovery exclusion bypass.** `Nearby` and `GlobalDiscovery` did not exclude
   private-bookshelf readers; the global heatmap aggregated region names from
   country-only readers, leaking region granularity back through aggregation.
3. **Identity separation bypass.** `DisplayName.Resolve` was applied to the
   display label but the raw `handle` field was still returned on
   `PublicProfileDto`, `UserStubDto` (via feed/circles/messages/admin),
   `CircleMemberDto`, and `LeaderboardEntryDto` — so `anonymous` display mode
   leaked a stable, correlatable handle.
4. **Streak freeze off-by-one.** `StreakMath.TryConsumeFreeze` consumed a freeze
   when `today == last + 1`, which is a *consecutive* day that `AdvanceStreak`
   already handles. The result: normal daily activity burned freezes instead of
   advancing the streak, and the documented "shield one missed day" behaviour
   never occurred.
5. **Applied-migration mutation.** `0002_ratings.sql` and `0003_challenge.sql`
   were edited in place (TEXT→uuid, `IF NOT EXISTS`) while the SQLite-only
   compatibility work lived in them. The repair already existed in
   `0008_fix_ratings_challenges.sql`, so the edits were redundant and violate
   "never edit already-applied migrations".
6. **Unbounded queries.** `BookshelfController.PublicShelf` (`Take(200)`),
   `ReadingCirclesController.ListMessages` (200), `DiscoverController.MapReaders`
   (150), `AdminController.Reports` (100), follow lists and conversations
   (100) all exceeded the documented `MaxPageSize` of 50.
7. **LIKE injection.** `BooksController.Search` and
   `ReadingCirclesController.List` interpolated user input into
   `EF.Functions.ILike` patterns without escaping `%` / `_` / `\`.
8. **Missing profanity gates.** Circle name/description, conversation title, and
   profile `realName`/`bio` were persisted without passing `ProfanityFilter`,
   contrary to `AGENTS.md` §2.4.1.
9. **Outbound timeout drift.** `OpenLibraryService` and `GeoResolveService` were
   configured with 10s client timeouts plus an 8s inner CTS, exceeding the
   documented 3–5s bound; neither validated its resolved host.
10. **Mapping library dependency.** 870 lines of Leaflet/`leaflet.heat` plus a
    hand-rolled `CanvasHeatLayer`, an ambient `leaflet-heat.d.ts`, four
    packages, and a runtime CDN tile dependency.
11. **Unreproducible restore / vulnerable native dependency.** Restore resolved
    machine-level NuGet sources, including an unreachable third-party feed
    (`nuget.telerik.com`), whose audit failure aborted `dotnet format`'s MSBuild
    load. The test project also pulled the known-vulnerable
    `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 (GHSA-2m69-gcr7-jv3q).
12. **BOM-contaminated source files.** Several tracked source files were saved
    as UTF-8 *with* BOM, contrary to the repository's no-BOM mandate.

## Decision

Adopt the following, all enforced in code and covered by tests:

1. **Single redaction path.** All public user projections must go through
   `Mapping.ToStub` / `Mapping.ToPublicLocation` / `Mapping.ToPublicHandle`.
   `Mapping.ToStub` returns `handle = "anonymous"` when
   `DisplayNameMode == DisplayMode.Anonymous`; `ToPublicHandle` does the same for
   public profiles (self always sees the real handle). Controllers must not
   hand-build `UserStubDto` or `LocationDto` for other readers. The one
   exception is the moderation surface (`/admin/*`), which uses
   `Mapping.ToAdminStub` and keeps the generated handle — moderators need it to
   identify a report author, and `/admin` is not a public surface.
2. **Aggregation-safe redaction.** `GlobalDiscovery` and `TopBooks` bucket
   country-only readers under an empty region (`Redact(region, visibility)`) so
   region granularity cannot be reconstructed by grouping. Private-bookshelf and
   hidden-location readers are excluded from all discovery aggregates.
3. **Freeze gap is `+2`.** One missed day is Monday → missed Tuesday → Wednesday
   (`today.DayNumber == lastActivityDay.DayNumber + 2`). `+1` advances the streak
   and never consumes. `AGENTS.md` §2.3.2 is corrected accordingly; this ADR is
   the written record of that change.
4. **Migrations are append-only.** `0002` and `0003` were reverted to their
   committed state; all corrective work remains in `0008`. New schema or data
   repair requires a new ordered `NNNN_*.sql` file.
5. **`MaxPageSize = 50` everywhere.** Every collection endpoint clamps to
   `Math.Clamp(value, 1, 50)`, including admin reports, circle messages, public
   shelves, follow lists, conversations, messages, feed, and map readers.
6. **`Like.Escape` is mandatory** for any user-supplied `ILike` / `Like` pattern.
7. **Profanity gates** extended to circle name/description, conversation title,
and `TILES` runtime usage are removed.

## Consequences

### Positive
- Country-only readers can no longer be triangulated through map markers, nearby
  lists, or region aggregation.
- Anonymous display mode is now a real privacy boundary: no stable handle is
  exposed publicly, only the generated `displayName`.
- Streaks behave as documented; freezes are actually consumed on a missed day.
- Every collection endpoint is bounded by `MaxPageSize = 50`.
- The frontend bundle loses Leaflet (and its runtime CDN tile dependency),
  removing a third-party request per map view.
- Migration history is reproducible from `0001` forward.

### Negative / Trade-offs
- Removed the "real basemap" visual; the SVG projection is a stylized world with
  no coastlines. This is intentional per the pillar but is a visible product
  change.
- Redacting `handle` to the literal string `"anonymous"` means public profile
  links by handle are not resolvable for anonymous readers. Profiles remain
  addressable by id (`/users/{id}`), which is unaffected.
- `HasNextPage`/pagination clients that previously requested `limit=80` or
  `limit=200` are silently clamped to 50; callers must page instead.
- `DisplayName.Resolve` remains the only display label; anything that wanted a
  handle for routing must use id or a resolved `displayName`.

## Verification

- `dotnet test backend/` — 101/101 passing, including
  `Location_Privacy_Coordinates_Are_Fuzzed_And_Redacted_In_Public_Profiles`
  (now also asserting the anonymous handle is redacted), the freeze `+2` /
  consecutive-day cases in `StreakMathTests`, and the new suite:
  `Discover_Global_Redacts_Region_For_Country_Only_Readers`,
  `Discover_Global_Excludes_Hidden_And_Private_Shelf_Readers`,
  `Discover_MapReaders_Redacts_Anonymous_Handle_And_Country_Only_Location`,
  `Discover_MapReaders_Clamps_Limit_To_MaxPageSize`,
  `Discover_Nearby_Redacts_Country_Only_Candidates_And_Excludes_Private_Shelves`,
  `Streak_Leaderboard_Redacts_Anonymous_Handles`, and
  `PrivacyMappingTests` (ToStub/ToPublicLocation/ToPublicHandle/GeoFuzz/Like).
- `dotnet format backend/ --verify-no-changes` — exits 0.
- `frontend`: `npm run lint` and `npm run build` clean; `npm uninstall leaflet
  leaflet.heat react-leaflet @types/leaflet` applied (0 vulnerabilities).
- `frontend/package.json` contains no mapping library.
- `dotnet restore backend/` — clean, zero NU1900/NU1903 warnings.
- BOM scan across `.cs`/`.ts`/`.tsx`/`.json`/`.sql`/`.md`/`.csproj`: zero hits.

## Open follow-ups (not covered by this ADR)

- `scripts/smoke.ps1` was not executed (requires live Docker/Postgres/Redis).
- `.codebase-memory/graph.db.zst` has not been re-indexed for this change.
- Frontend `dev`/`dev:ui` scripts and `dev.ps1` were not exercised.
   and profile real name/bio.
8. **External boundaries.** Open Library 5s, Open-Meteo 4s (client timeout and
   inner CTS), plus explicit host allowlist checks on `BaseAddress` as an SSRF
   guard. Failure remains best-effort with graceful fallback.
9. **No mapping libraries, ever.** The curiosity map is a dependency-free SVG
   equirectangular projection (`CuriosityMap.tsx`), rendering region bubbles,
   per-reader fuzzed dots, and the drill-down panel. `leaflet`,
   `leaflet.heat`, `react-leaflet`, `@types/leaflet`, `types/leaflet-heat.d.ts`,
   and `TILES` runtime usage are removed.
10. **Repo-pinned NuGet sources.** A repository-root `NuGet.config` `<clear />`s
    all inherited feeds and pins `nuget.org` plus the Visual Studio offline
    packages folder, so restores and `dotnet format` MSBuild loads are
    reproducible and cannot fail on unreachable machine-level feeds.
11. **Vulnerable native dependency pinned forward.** The test project explicitly
    references `SQLitePCLRaw.bundle_e_sqlite3` 2.1.13, overriding the vulnerable
    2.1.11 transitive default. Any future pin must keep
    `SQLitePCLRaw.lib.e_sqlite3` at a version not covered by
    GHSA-2m69-gcr7-jv3q.
12. **UTF-8 without BOM is enforced.** All source files in scope were rewritten
    BOM-free; the repository scan for `EF BB BF` prefixes returns zero for
    `.cs`, `.ts`, `.tsx`, `.json`, `.sql`, `.md`, `.csproj`.