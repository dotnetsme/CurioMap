# Architecture

## System overview

```
                    ┌─────────────────────────────┐
                    │  Next.js 16 (React 19) web   │
                    │  App Router, Tailwind 4      │
                    │  /api/* → same-origin proxy  │
                    └──────────────┬──────────────┘
                                   │ /api (JSON, JWT in Authorization header,
                                   │       httpOnly refresh cookie)
                    ┌──────────────▼──────────────┐
                    │  .NET 10 API (CurioMap.Api)  │  ← controllers (no MediatR)
                    │  EF Core 10 · Npgsql         │
                    └──────┬───────────────┬───────┘
                           │               │
              ┌────────────▼─────┐   ┌─────▼──────────────┐
              │  Neon Postgres   │   │  Redis (Upstash)   │
              │  (schema via     │   │  cache + rate      │
              │   EF migrations) │   │  limiting          │
              └──────────────────┘   └────────────────────┘
```

- **Fly.io** hosts both apps as two machines on the same private network; the web app
  reaches the API at `http://curiomap-api.internal:8080`.
- **Postgres** is Neon (serverless Postgres, `postgres://` URL accepted directly).
- **Redis** is external (Upstash / Redis Cloud); `redis://` / `rediss://` URLs accepted.
- **External integrations**: Open Library (catalog search + covers, no key), Open-Meteo
  geocoding (city → fuzzed coordinates, no key), OpenLibrary covers for images.

## Backend design

- **Controllers only, no MediatR.** Each HTTP domain maps to one controller; shared logic
  lives in plain services (`Services/`, `Auth/`, `Common/`). Explicit, greppable, boring.
- **Data access**: EF Core over an `AppDbContext`; schema is owned by EF Core
  code-first migrations in `Migrations/` (see ADR 0009), run on deploy through a migration
  bundle. Seed data lives in ordered SQL scripts (`Data/Migrations/*.sql`) applied at
  startup by `DbInitializer` (advisory-locked so multiple Fly machines never race).
- **Auth**: JWT bearer access token (15 min) + rotating refresh tokens (httpOnly cookie).
  Only the SHA-256 hash of a refresh token is stored; each refresh revokes the previous
  token (reuse detection). Passwords hashed with PBKDF2-SHA256 (100k iterations).
- **Location privacy is enforced in the API, not the UI**: coordinates are fuzzed to a
  0.15° (~15 km) grid before storage; `Mapping.ToPublicLocation` never returns coordinates
  and drops city when visibility is country-only; `hidden` users are excluded from nearby
  and the global map.
- **Caching**: Redis `GetOrSet` for `/stats/summary` and `/discover/*`; failures fall back
  to a fresh compute so the API stays up if Redis blips.
- **Rate limiting**: per-instance fixed-window policies (`auth`, `write`, `search`) plus a
  Redis-backed limiter on message posting so limits hold across machines.

## Frontend design

- **Server components for the landing page** (direct `fetch` to the API); everything else
  is client components over the typed `lib/api/*` layer (same-origin `/api` rewrites).
- **Auth state**: `AuthProvider` bootstraps from `/auth/refresh`; `lib/api/http.ts`
  transparently refreshes once on a 401 and retries.
- **Map**: Leaflet (BSD-2-Clause) over an OpenStreetMap raster basemap, loaded
  through `next/dynamic` with `ssr: false` so it never enters a route's first-load
  JS. Region blooms are screen-space markers at fuzzed coordinates, zoom is capped
  at city scale, attribution stays visible, and the tile URL is configuration
  (`NEXT_PUBLIC_MAP_TILE_URL`) — see [ADR 0007](adr/0007-openstreetmap-basemap.md).
- **Design**: Tailwind CSS v4 (CSS-first config), dark glass aesthetic.

## Non-functional

- **Performance**: heavy aggregations cached 5–10 min; conversations paginated; book
  search uses `pg_trgm` GIN indexes.
- **Security**: JWT + PBKDF2, `MapInboundClaims=false` so raw claims reach policies,
  admin policy via `role` claim, CORS restricted, 429s enforced.
- **Scalability**: tables carry indexes for the hot paths (shelf, messages, follows,
  activity, regions); fly machines scale horizontally behind the private network.
