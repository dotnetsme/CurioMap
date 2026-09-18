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