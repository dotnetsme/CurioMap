# Local development guide

Everything you need to run, test and debug CurioMap on your own machine. If you only want to
look around, jump to [Option C: everything in Docker](#option-c-everything-in-docker).

- [Prerequisites](#prerequisites)
- [Three ways to run it](#three-ways-to-run-it)
- [Ports and URLs](#ports-and-urls)
- [Configuration](#configuration)
- [Accounts, demo data and admin access](#accounts-demo-data-and-admin-access)
- [Database](#database)
- [Running the checks](#running-the-checks)
- [Working on the API](#working-on-the-api)
- [Working on the web app](#working-on-the-web-app)
- [Troubleshooting](#troubleshooting)

## Prerequisites

| Tool | Version | Needed for | Check |
|---|---|---|---|
| [Docker](https://docs.docker.com/get-docker/) (with Compose v2) | any recent | Postgres, Redis, optional full stack | `docker compose version` |
| [.NET SDK](https://dotnet.microsoft.com/download) | **10.0** | API (Options A and B) | `dotnet --version` |
| [Node.js](https://nodejs.org/) | **24** recommended (20.9+ works) | web app (Options A and B) | `node --version` |
| Git | any recent | cloning | `git --version` |

`.nvmrc` pins Node 24 (`nvm use` / `fnm use`) and `global.json` pins the .NET SDK band, so the versions
CI uses are the ones you get. Docker Desktop on Windows/macOS or Docker Engine on Linux both work.
You do **not** need to install Postgres or Redis; Docker provides them.

## Three ways to run it

### Option A: one command (recommended)

```bash
git clone https://github.com/curiomap/curiomap.git
cd curiomap
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
(cd frontend && npm install)    # once; installs the web app's dependencies
npm run dev
```

`npm run dev` (from the repo root) does three things and stops all of them on Ctrl+C:

1. `docker compose up -d`: starts Postgres and Redis (and smtp4dev).
2. starts the API with `dotnet run` and applies migrations plus seed data on first boot.
3. starts the Next.js dev server.

The first start takes a minute: the API restores packages, builds, creates the schema and seeds the
catalog. Then open <http://localhost:3000>.

Flags: `npm run dev -- --no-docker` (infrastructure already running), `--no-api` (UI only, pointing at an API
you run elsewhere), `--only-ui`.

### Option B: three terminals

Use this when you want separate logs, or to attach a debugger.

```bash
# 1. Infrastructure
docker compose up -d

# 2. API (migrations + seed run at startup)
cd backend/src/CurioMap.Api
dotnet run --launch-profile http          # http://localhost:8080

# 3. Web app
cd frontend
npm install
npm run dev:ui                            # http://localhost:3000, proxies /api to the API
```

(`npm run dev` inside `frontend/` is the same orchestrator as Option A; `dev:ui` is just Next.js.)

### Option C: everything in Docker

No .NET SDK or Node.js needed. Slower feedback (every change means a rebuild), but a good way to try the
project or reproduce a "works on my machine" report.

```bash
docker compose --profile app up -d --build
```

Then open <http://localhost:3000>. The API container runs in `Development` mode (public dev-only JWT
secret, demo readers seeded) and both containers run as unprivileged users. Stop it with
`docker compose --profile app down`.

## Ports and URLs

| What | URL / port | Notes |
|---|---|---|
| Web app | <http://localhost:3000> | Next.js; `/api/*` is proxied to the API |
| API | <http://localhost:8080> | `GET /health` for status |
| API reference | <http://localhost:8080/docs> | Scalar UI (Development only) |
| OpenAPI spec | <http://localhost:8080/openapi/v1.json> | |
| Postgres | `localhost:5433` | user/password/db: `curiomap` |
| Redis | `localhost:6380` | |
| smtp4dev (mail catcher) | <http://localhost:5000> | SMTP on `2525`. Email sending (SMTP or Resend) is wired up, but no current feature sends mail yet, so you can ignore it |

The Postgres and Redis ports are deliberately **non-default** (5433, 6380) so they do not collide with a
Postgres or Redis you already run. If something else uses 3000, 8080 or 5000, stop it or change the mapping
in `docker-compose.yml` (and `PORT` / `API_INTERNAL_URL` in `.env`).

Connect to the database with any client, e.g. `psql postgres://curiomap:curiomap@localhost:5433/curiomap`
(these credentials are for local development only).

## Configuration

Copy `.env.example` to `.env` (git-ignored). The API walks up from its working directory looking for `.env`
and `npm run dev` loads it too, so a single file at the repo root configures both.

| Variable | Default (dev) | Purpose |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Development` | Enables `/docs`, dev JWT fallback, demo seed |
| `DATABASE_URL` | `postgres://curiomap:curiomap@localhost:5433/curiomap` | Postgres. Append `?sslmode=disable\|prefer\|require` to override TLS; loopback hosts default to no TLS, remote hosts to `require` |
| `REDIS_URL` | `localhost:6380` | Cache and distributed rate limiting |
| `JWT__SECRET` | public dev constant | **Never reuse outside local dev.** Production must set a fresh random value (the API refuses to boot without one) |
| `JWT__ISSUER`, `JWT__AUDIENCE`, `JWT__ACCESSTOKENMINUTES`, `JWT__REFRESHTOKENDAYS` | see file | Token settings (15 min access, 30 day rotating refresh) |
| `Seed__DemoReaders` | `true` in Development | Seeds ~300 fake readers so the map has life. **Must be `false` in production** |
| `Admin__Emails__0` ... | `admin@curiomap.local` | Emails promoted to moderator **at registration** |
| `Affiliate__AmazonTag` | `curiomap-20` | Affiliate tag appended to buy links |
| `API_INTERNAL_URL` | `http://localhost:8080` | Where the Next.js server proxies `/api` |
| `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap standard tiles | Map basemap. See the note in `.env.example` about the OSM tile usage policy before real traffic |

Double underscores (`__`) map to nested .NET configuration (`Seed__DemoReaders` is `Seed:DemoReaders`).
Production configuration and secrets are covered in [deployment.md](deployment.md).

## Accounts, demo data and admin access

- **Register normally** at <http://localhost:3000/auth/register>. Local mail is not required; there is no email
  verification step yet.
- **Demo readers** (`seed.demo.*@curiomap.demo`) populate the map and activity. They are deliberately **not**
  loginable; they only exist as data. Turn them off with `Seed__DemoReaders=false` before the *first* start.
- **Admin / moderation:** register an account using an email listed in `Admin__Emails__*` (the default
  `admin@curiomap.local` works locally). That account sees the moderation queue at `/admin`. Promotion happens
  at registration only, so list the email *before* you sign up with it.
- **Book catalog:** about 50 curated books always seed. Searching for a book that is not in the catalog imports
  it live from [Open Library](https://openlibrary.org/), which needs internet access.

## Database

Two things live in the database layer, and they are managed differently:

| | Where | Applied |
|---|---|---|
| **Schema** | EF Core migrations in `backend/src/CurioMap.Api/Migrations/` | At API startup in Development; via the migration bundle on deploy |
| **Seed data** | Ordered SQL in `backend/src/CurioMap.Api/Data/Migrations/*_seed_*.sql` | Only when the `books` table is empty (a brand-new database) |

**Add a schema change:**

```bash
dotnet tool install --global dotnet-ef --version 10.0.10   # once
dotnet ef migrations add DescribeTheChange --project backend/src/CurioMap.Api
```

Review the generated file, run the API to apply it, and commit the migration *and* the updated model snapshot.
**Never edit a migration or seed file that has already shipped; add a new one.** Seed files only run on an
empty database, so to change data in *existing* databases add an EF migration (see
`20261018000100_BackfillBookTopics.cs`, which runs the same embedded SQL a fresh database gets).

**Reset your local database** (this deletes everything in it):

```bash
docker compose down -v        # removes the Postgres and Redis volumes
docker compose up -d
```

The next API start recreates the schema and seeds it again.

## Running the checks

CI runs exactly these; run them before you open a pull request.

```bash
# API
dotnet test backend/CurioMap.slnx                 # unit + integration tests (in-memory SQLite, no Docker needed)
dotnet format backend/ --verify-no-changes        # drop --verify-no-changes to auto-fix

# Web
cd frontend
npm run lint
npx tsc --noEmit
npm run build

# Repo-level
npm run audit:routes:strict                       # every API route must be covered by a test or the smoke script
```

Optional browser probes (need Chrome and a running stack): `npm run verify:map` and `npm run smoke`.

The API tests use an isolated in-memory SQLite database and a fake cache, so they run anywhere with only the
.NET SDK installed. Behaviour that depends on real Postgres (for example `ON CONFLICT` upserts or retrying
transactions) is not covered by them. Mention in your PR how you checked it.

## Working on the API

- Layout: controllers call services, services use EF Core (`AppDbContext`); no MediatR. See
  [architecture.md](architecture.md) and the [ADRs](adr/).
- Add or change a route: update `docs/api.md` and add a test. `npm run audit:routes:strict` fails otherwise.
- Rate limiting is per policy (`auth`, `refresh`, `write`, `search`); heavy local testing may hit `429`.
  Wait a minute, or restart the API to reset the in-memory counters.
- Enums cross the wire as lowercase snake_case; the database is snake_case throughout.
- Do not log personal data (emails, tokens, coordinates).

## Working on the web app

- Next.js App Router in `frontend/app`; pages are thin and compose `components/`. All API access goes through
  `frontend/lib/api/*`; never call `fetch` from a component.
- Follow the [design system](design-system.md): theme tokens only, check light **and** dark, respect reduced
  motion.
- The browser calls `/api/*` on the same origin and Next.js proxies it to the API, so there is no CORS to
  configure in development. The proxy target is baked in at build time (`API_INTERNAL_URL`).

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `docker: command not found` / cannot connect to the daemon | Start Docker Desktop (or the Docker service) and retry |
| `port is already allocated` | Something else uses 3000, 5000, 5433, 6380 or 8080. Stop it or change the mapping in `docker-compose.yml` |
| API exits at start with `Failed to connect` / `Connection refused` on 5433 | Postgres is not up yet. Check `docker compose ps` (it should say *healthy*) and retry |
| API: `SSL connection requested. No SSL enabled connection` | The database host has no TLS. Append `?sslmode=disable` to `DATABASE_URL` |
| `npm run dev`: `Cannot find module .../next/dist/bin/next` | Run `npm install` in `frontend/` first |
| Browser shows *Bad gateway* / `ECONNREFUSED` on `/api/...` | The API is not running (or still booting). Watch its terminal for `Now listening on` |
| Map tiles are grey or blank | Tiles load from OpenStreetMap, so you need internet access. See `NEXT_PUBLIC_MAP_TILE_URL` |
| `429 Too Many Requests` while testing | Per-minute rate limits. Wait a minute or restart the API |
| Signed out after a long idle | Access tokens last 15 minutes and refresh silently via cookie. If it persists, clear cookies for `localhost` |
| Changed `.env` but nothing happened | Restart the API / `npm run dev`; configuration is read at start |
| Recreated the database but the map / stats still look empty or stale | Aggregations are cached in Redis for 5 minutes and Redis outlives your database. Clear it with `docker exec curiomap-redis redis-cli FLUSHALL` (or `docker compose down -v`) |
| `container name "/curiomap-postgres" is already in use` | Another checkout of CurioMap has its containers running. Stop that stack (`docker compose down` in its folder) or run `docker ps` and stop the containers it names |
| `docker compose --profile app down` also stopped Postgres | Expected: `down` removes the whole stack (your data stays in the named volumes). Start the infrastructure again with `docker compose up -d` |
| Want to start completely clean | `docker compose down -v`, delete `frontend/.next`, run again |

Still stuck? Open a [discussion](https://github.com/curiomap/curiomap/discussions) with your OS, the command you ran and the first error
you see. Redact anything personal.
