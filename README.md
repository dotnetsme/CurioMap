# CurioMap

> **A live map of human curiosity** — a global, open-source, geolocation-based reading graph.

CurioMap connects readers through *what they are curious about right now*: anonymous
intellectual identities, coarse-location discovery, and short, focused book
conversations — wrapped in privacy-first defaults and radical transparency.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## Pillars

| Pillar | What ships |
|---|---|
| 🕶️ Anonymous intellectual identity | Curated avatars, generated handles (`curious_otter_412`), anonymous-by-default display modes, opt-in & reversible real name |
| 📍 Geolocation discovery | "Readers near you", a global curiosity heatmap (fuzzed ~15 km grid), country/region/city visibility controls with full opt-out |
| 💬 Micro-conversations | Prompt-driven book threads, lightweight reactions (Insightful/Funny/Helpful), ephemeral auto-archiving, reporting + moderation |
| 📖 Open source (Apache 2.0) | Public roadmap, dev logs, OpenAPI spec, contribution guides |
| 💰 Ethical monetization | ISBN-driven affiliate links (Amazon/Bookshop/Kobo), transparent policy, no data selling |
| ✍️ Self-publishing foundation | Drafts + draft chapters + author flag tables live from day one (features in Phase 7) |

## Stack

- **API** — .NET 10, ASP.NET Core controllers (no MediatR), EF Core 10 + Npgsql (Neon Postgres), Redis (cache + distributed rate limiting), JWT auth with rotating refresh tokens
- **Web** — Next.js (App Router) + React 19 + TypeScript + Tailwind CSS, same-origin `/api` proxy
- **Infra** — Docker, Fly.io (both apps), GitHub Actions CI/CD
- **Data** — EF Core code-first migrations (applied via a Fly release command / migration bundle, Neon-compatible) plus ordered SQL seed scripts applied at startup, pg_trgm book search

## Repository layout

```
backend/            .NET 10 API (CurioMap.Api) + xUnit tests
frontend/           Next.js web app
infra/              Fly.io configs + deployment notes
docs/               vision, architecture, design system, data model, API, roadmap, policies, dev logs
docker-compose.yml  local Postgres (5433) + Redis (6380)
```

## Quickstart (local)

Prerequisites: .NET 10 SDK, Node 20+, Docker.

```bash
# 1. Infrastructure
docker compose up -d

# 2. API — migrations + seed run at startup
cd backend/src/CurioMap.Api && dotnet run
#    → http://localhost:8080  (health: /health, API reference: /docs)

# 3. Web app
cd frontend && npm install && npm run dev
#    → http://localhost:3000 (proxies /api → localhost:8080)
```

The first registered account whose email is in `Admin:Emails` (default
`admin@curiomap.app`) becomes a moderator.

## API

REST + JWT. Machine-readable spec: **`/openapi/v1.json`**, human reference: **`/docs`** (Scalar).
Domains: `auth`, `users`, `books`, `bookshelf`, `geo`, `discover`, `stats`,
`conversations`, `messages`, `follow`, `feed`, `admin`. See [docs/api.md](docs/api.md).

## Privacy, in one paragraph

Accounts are anonymous by default. We store **no exact coordinates** — location is
country/region/city plus a coordinate fuzzed to a ~15 km grid. Display mode
(anonymous / pseudonymous / real name) is reversible. You can hide your bookshelf,
limit location sharing to country-only, or opt out of discovery entirely. Public
profiles never expose email or precise location. See
[docs/privacy-policy.md](docs/privacy-policy.md).

## Contributing

We love first issues. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the
[roadmap](docs/roadmap.md). Good first contributions: new curated avatars,
conversation prompts, UI polish, book sources.

## License

[Apache 2.0](LICENSE) © CurioMap contributors
