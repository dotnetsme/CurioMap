# Deployment (Fly.io + Neon + Upstash)

## Secrets checklist (do this BEFORE first prod deploy)

```bash
# Generate a fresh secret per environment — NEVER reuse the dev constant
# from .env.example (it is public in the repo by design).
python -c "import secrets; print(secrets.token_hex(48))"  # 96 hex chars

fly secrets set -a curiomap-api \
  DATABASE_URL='postgres://user:pass@ep-...neon.tech/curiomap?sslmode=require' \
  REDIS_URL='rediss://:token@upstash-redis.upstash.io:6379' \
  JWT__SECRET='<output-of-the-command-above>' \
  ADMIN__EMAILS='["you@example.com"]' \
  AFFILIATE__AMAZONTAG='your-tag-20' \
  SEED__DEMOREADERS='false'

fly secrets set -a curiomap-web \
  API_INTERNAL_URL='http://curiomap-api.internal:8080'
```

Rules:

- `JWT__SECRET`: fresh random ≥64 chars per environment. The API refuses to boot
  without one outside Development (fail-closed); the `.env.example` value only
  works for local `docker compose` dev and is logged as forgeable when active.
- `SEED__DEMOREADERS`: **must be `false` in prod.** `true` inserts ~100 fake demo
  reader accounts (plus sample ratings/challenges) into the database at startup.
  Book catalog seeds (`0010–0012`) always apply — books are product data.
- Double-underscore `__` maps to nested config (`SEED__DEMOREADERS` →
  `Seed:DemoReaders`). Do not use single underscores.
- GitHub Actions prod deploys additionally require a human approval of the
  `fly` environment (Settings → Environments → `fly` → Required reviewers).

## Rate-limit client identity (`Proxy:TrustedNetworks`)

Rate limits partition on the authenticated `sub` claim, else on the client IP resolved
by `Services/ClientIpResolver.cs`. Forwarded headers (`Fly-Client-IP`,
`X-Forwarded-For`) are honored **only** when the socket peer is inside
`Proxy:TrustedNetworks`, which defaults to Fly.io's 6PN (`fdaa::/16`) plus loopback —
correct out of the box on Fly, safe by default elsewhere.

If the API ever sits behind a different trusted proxy, override explicitly (no
wildcards):

```bash
fly secrets set -a curiomap-api \
  PROXY__TRUSTEDNETWORKS__0='10.0.0.0/8' \
  PROXY__TRUSTEDNETWORKS__1='fdaa::/16'
```

To trust nobody (partition anonymous traffic purely by socket address), set
`Proxy:TrustedNetworks` to an empty list.

## Architecture

Two Fly apps on one org, same private network:

| app | image | port |
|---|---|---|
| `curiomap-api` | `infra/api.Dockerfile` | 8080 |
| `curiomap-web` | `infra/web.Dockerfile` | 3000 |

Postgres = **Neon** (serverless), Redis = **Upstash**. No infra addons needed.

## Environment

```bash
fly secrets set -a curiomap-api \
  DATABASE_URL='postgres://user:pass@ep-...neon.tech/curiomap?sslmode=require' \
  REDIS_URL='rediss://:token@upstash-redis.upstash.io:6379' \
  JWT__SECRET='<long-random-string>' \
  ADMIN__EMAILS='["you@example.com"]' \
  AFFILIATE__AMAZONTAG='your-tag-20' \
  SEED__DEMOREADERS='false'

fly secrets set -a curiomap-web \
  API_INTERNAL_URL='http://curiomap-api.internal:8080'
```

> `SEED__DEMOREADERS` must be `false` in production (see Secrets checklist
> above). The double underscore maps to the nested `Seed:DemoReaders` setting.

### Map basemap tiles (ADR 0007)

The web image bakes its basemap provider in at build time, because Next inlines
`NEXT_PUBLIC_*` values during `npm run build`:

```bash
flyctl deploy --config fly.web.toml \
  --build-arg NEXT_PUBLIC_MAP_TILE_URL='https://your-tiles.example/{z}/{x}/{y}.png'
```

- Default when unset: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Setting it as a **runtime** env var/secret on `curiomap-web` does nothing —
  the value is already compiled in.
- OSM's tile service is best-effort with no SLA and may be rate-limited or
  blocked without notice; the policy also forbids bulk/prefetch use. Before
  real traffic, move to a self-hosted or paid OSM-derived provider.
- Any replacement must keep visible attribution and must not be fetched in
  bulk. Never hide or remove the attribution control.
- The web app must NOT set a restrictive `Referrer-Policy`: OSM requires the
  Referer header to reach the tile host.

## Deploy

```bash
flyctl deploy --config fly.api.toml
flyctl deploy --config fly.web.toml
# or let GitHub Actions do it on push to main (needs FLY_API_TOKEN secret).
```

## First-run admin

Register your account with the email in `Admin.Emails` — it is promoted to admin
automatically, unlocking `/admin` moderation.

## Local development

```bash
docker compose up -d                  # Postgres 5433, Redis 6380
dotnet run --project backend/src/CurioMap.Api
npm --prefix frontend run dev         # :3000, /api → :8080
```

Migrations + seed apply automatically at API startup. To wipe local data:
`docker compose down -v`.