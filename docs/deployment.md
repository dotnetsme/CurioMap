# Deployment (Fly.io + Neon + Upstash)

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
  AFFILIATE__AMAZONTAG='your-tag-20'

fly secrets set -a curiomap-web \
  API_INTERNAL_URL='http://curiomap-api.internal:8080'
```

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