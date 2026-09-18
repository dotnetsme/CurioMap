# ADR 0005: Signed-in home dashboard, cookie-presence routing, and single auth gate

Status: Proposed
Date: 2026-09-18
Replaces: none
Related: `AGENTS.md` §1/§3, `docs/adr/0001-adr-agent-governance.md`

## Context

Until this cycle CurioMap had no signed-in landing surface: login pushed to `/feed`,
`/me` mixed profile + shelf + streak widgets, and logged-out visitors hitting authed
pages fired doomed fetches (401 → error states). The uncommitted working tree adds:

- `frontend/app/home/page.tsx` + `frontend/components/home/*` — signed-in dashboard
  (`HomeDashboard`, `HomeSearchBar`, `HomeStatsStrip`, `ShelfGlance`,
  `DiscussionPanel`, `TrendingPanel`, `GenreChips`, `DashboardPanel`).
- `frontend/proxy.ts` — cookie-*presence* routing: requests to `/`, `/auth/login`,
  `/auth/register` carrying the httpOnly `curio_rt` cookie redirect to `/home`.
- `frontend/components/auth/AuthGate.tsx` — single gate for all signed-in-only
  surfaces; children never mount while the session is resolving/absent.
- `SiteHeader` auth-aware nav (`/home` entry, `authOnly` filtering, logo → `/home`
  when signed in); auth forms push to `/home`; `/me` slimmed to `ProfilePageView`;
  `NearbyReadersList` gains `compact` + `limit` dashboard mode; smoke suite covers
  `FRONT_HOME_DASHBOARD`.

## Problem

1. No coherent post-login destination; dashboard widgets scattered across `/me`.
2. Per-page ad-hoc "if (!user) show sign-in" blocks duplicated auth logic and still
   mounted authed children (wasted 401s, error-state flashes).
3. Middleware cannot validate the httpOnly refresh cookie (opaque random token, no
   JWT claims) — any routing decision must be presence-only and loop-safe.

## Options considered

### 1. Client-only redirect in each authed page
Pros: no middleware. Cons: N copies of the logic; first-paint flash; still fires
fetches before redirecting.

### 2. Validate `curio_rt` in middleware via API round-trip (rejected)
Pros: authoritative. Cons: adds a blocking fetch to every navigation; leaks
session-validation into edge runtime; failure modes (API down) break routing.

### 3. Cookie-presence `proxy.ts` + `AuthGate` + `/home` dashboard (chosen)
- `proxy.ts` checks **presence only** of `curio_rt` on GET/HEAD to `/`, `/auth/*`
  and redirects to `/home`. If the token is stale, `/home` renders its own guest
  state via `AuthGate` — no redirect loop by construction.
- `AuthGate` is the single signed-in boundary: loading → skeleton, absent → branded
  sign-in panel, present → children. Authed fetches never fire for visitors.
- `/home` composes only existing privacy-safe contracts (`/stats`, `/discover/*`,
  `/me/bookshelf`, `/feed`): each panel degrades independently
  (`Promise.all` + per-call `.catch(() => null)`), so a hidden location or cold
  cache never blanks the dashboard.

## Decision

1. `/home` is the canonical signed-in landing page (login/register push here).
2. `proxy.ts` does presence-only routing; `AuthGate` owns session gating.
3. `/me` renders identity only (`ProfilePageView`); shelf widgets live in
   `/me/bookshelf`, discovery widgets in `/home`.
4. Dashboard panels reuse public typed clients; no new backend endpoints.

## Consequences

### Positive
- One auth boundary to audit; zero wasted authed fetches for logged-out visitors.
- No redirect loops (stale cookie → `/home` guest state, not bounce).
- Private shelf rows stay visible to their owner in `ShelfGlance` (uses `myShelf()`,
  not the public shelf endpoint) with explicit `private` badges.

### Negative / Trade-offs
- Presence-routing can send a logged-out-but-cookie-stale visitor to `/home` first
  (one extra hop vs. landing directly on marketing). Accepted: correctness over
  one-hop optimality.
- `HomeDashboard` fires 3 parallel calls on mount; on slow networks the skeletons
  show until all settle (no streaming Suspense boundaries yet).

### Privacy check (per AGENTS.md §2.2)
- `/home` renders `user.displayName` (already `DisplayName.Resolve`d by the API).
- Nearby panel reuses redacted `NearbyReader` DTOs; fuzzed-to-~15km copy is
  restated next to the scope label.
- `ShelfGlance` calls the owner-only `myShelf()` endpoint; private rows never hit
  a public contract.

## Verification
- `cd frontend && npm run lint && npm run build`.
- `scripts/smoke.ps1` includes `FRONT_HOME_DASHBOARD`.
