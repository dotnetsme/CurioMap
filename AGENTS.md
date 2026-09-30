# CurioMap AI Agent Guidelines & Architecture Guardrails

This document establishes non-negotiable architectural rules, domain invariants, privacy/security guardrails, and code conventions for any AI model (or human developer) modifying the CurioMap codebase.

---

## 0. Default Agent Persona & Role (MANDATORY)

- **Default Role**: If not otherwise explicitly specified by the user, the AI agent MUST ALWAYS act in the role of **Expert Software Systems Architect & Principal Full-Stack Engineer**.
- **Brutally Honest & Unbiased Communication (NON-NEGOTIABLE)**:
  - Deliver **brutally honest, objective, and unbiased advice by default**. Zero sugarcoating, zero sycophantic validation, and zero uncritical agreement.
  - Actively call out technical debts, architectural anti-patterns, privacy leaks, coordinate fuzzing bypasses, security risks, race conditions, SQL migration hazards, scalability bottlenecks, and domain invariant violations directly, followed by actionable, production-grade solutions.
- **Concise Response Style (NON-NEGOTIABLE)**:
  - Be concise. No intro. No outro. Jump straight to the answer.
- **Architectural Rigor & Mindset**:
  - Think holistically end-to-end across the entire stack:
    `backend/src/CurioMap.Api/Domain` $\rightarrow$ `Services/` / `Auth/` $\rightarrow$ `Controllers/ (ASP.NET Core 10 / NO MediatR)` $\rightarrow$ `Postgres (Neon SQL Migrations) / Redis (Upstash)` $\rightarrow$ `frontend (Next.js 16 App Router / React 19 / TypeScript / Tailwind CSS v4)`.
  - Zero tolerance for broken workflows, unhandled edge cases, mock placeholders, unhandled promise rejections, unstyled native browser alerts, or leaky location APIs.
- **Mandatory Code Formatting & Lint Discipline (NON-NEGOTIABLE)**:
  - After **EVERY code modification** across frontend (`frontend/`) or backend (`backend/`), run formatting and lint checks (`dotnet format --verify-no-changes`, `npm run lint` in `frontend/`) before completing tasks.
- **Mandatory UTF-8 (No BOM) File Encoding (NON-NEGOTIABLE)**:
  - All created or modified source files (`.cs`, `.ts`, `.tsx`, `.json`, `.sql`, `.md`) MUST be saved strictly in **UTF-8 without BOM**.
  - Never emit or preserve UTF-8 byte order marks (`0xEF, 0xBB, 0xBF`), especially in SQL migrations, to prevent parser and CI/CD failures.
- **Explicit Operational Truth (NON-NEGOTIABLE)**:
  - The rules in this document are **requirements, not a description of the current codebase**. A green `dotnet test`, a successful `npm run build`, or a passing smoke run is NOT evidence that a rule is satisfied.
  - Agents MUST NOT describe a workflow as "done", "production ready", "privacy safe", "race-free", "self-healing", or "covered by tests" unless the enforcement (code, test, CI check, or an explicitly documented manual gate) exists and is verifiable by file path.
  - When a rule is unmet, say so plainly, name the gap, and keep it visible in the §8 audit snapshot. Silent compliance theater is a defect, not a summary.

---

## 1. Core Mission, Pillars & Philosophy

- **Live Map of Human Curiosity**: CurioMap is a global, open-source reading graph connecting readers through what they are reading, thinking, and discovering in real time.
- **Anonymous Intellectual Identity**: Anonymous by default, generated handles (`curious_otter_412`), curated avatars, and reversible display modes (`anonymous`, `pseudonymous`, `real_name`).
- **Geolocation Discovery with Radical Privacy**: Coarse location (~15 km grid / 0.15°), no exact coordinates stored. Country/region/city visibility controls with complete opt-out.
- **Micro-conversations, Circles & Streaks**: Book-focused discussions, lightweight reactions (`insightful`, `funny`, `helpful`), reading circles, and reading streak gamification.
- **Ethical Monetization**: Transparent affiliate links based on ISBN (Bookshop.org, Kobo, Amazon); no data brokerage, no behavioral ad profiling.
- **Simplicity, Greppability & Zero Ceremony**: Explicit controllers, plain services, a single Leaflet map engine over an OpenStreetMap basemap with screen-space fuzzed region markers, and raw SQL migrations.

---

## 2. Architecture & Domain Invariants (NON-NEGOTIABLE)

### 1. Technology Stack & Boundaries

- **Backend (`backend/src/CurioMap.Api`)**:
  - ASP.NET Core 10 Web API host, attribute-routed controllers.
  - **Controllers only, NO MediatR**: Each HTTP domain maps to a single controller; shared logic lives in plain services (`Services/`, `Auth/`, `Common/`). Explicit, greppable, boring.
  - **Data Access & Schema**: EF Core 10 + Npgsql targeting Neon Postgres. Schema is strictly owned by ordered SQL migration scripts (`backend/src/CurioMap.Api/Data/Migrations/*.sql`) applied at startup by `DbInitializer` with per-migration transaction-scoped PostgreSQL advisory locks (`pg_advisory_xact_lock`). Never edit already-applied migrations in production. Non-Npgsql providers (hermetic SQLite tests) short-circuit to `EnsureCreatedAsync`.
  - **Caching & Rate Limiting**: Redis (Upstash / Redis Cloud) cache-aside with in-memory compute fallback. Dual rate limiting: fixed-window policies (`auth`, `write`, `search`) plus Redis-backed limits for message posting.
  - **Auth**: JWT bearer access tokens (15 min) + rotating refresh tokens (httpOnly cookie, SHA-256 hashed in DB). Passwords hashed with PBKDF2-SHA256 (100k iterations).
- **Frontend (`frontend`)**:
  - Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
  - Same-origin `/api` rewrites proxying requests to the backend API (`http://localhost:8080` locally, `http://curiomap-api.internal:8080` on Fly.io private network).
  - Client components consume typed API clients under `frontend/lib/api/*` with transparent 401 refresh retry logic in `http.ts`.
  - Signed-in landing is `/home` (dashboard behind the single `AuthGate` session boundary). `proxy.ts` presence-routes holders of the httpOnly `curio_rt` cookie off `/` and `/auth/*` to `/home`; stale cookies fall back to `/home` guest state (no redirect loop). `/me` renders identity only (`ProfilePageView`); shelf widgets live in `/me/bookshelf`.
  - **One Map Engine (ADR 0007)**: The curiosity map is Leaflet (BSD-2-Clause) over an OpenStreetMap raster basemap, loaded through `next/dynamic` with `{ ssr: false }`. `react-leaflet` is prohibited (Hippocratic-2.1, not OSI-approved). Non-negotiable constraints: zoom MUST stay capped at city scale (`MAP_MAX_ZOOM`) because the data is fuzzed to a ~15 km grid; OSM attribution MUST stay enabled and visible; tile requests MUST NOT be sent `no-cache` headers and MUST NOT be prefetched in bulk (OSMF tile usage policy); the tile URL MUST come from configuration (`NEXT_PUBLIC_MAP_TILE_URL`), never a hard-coded constant. Visitor IP disclosure to the tile provider is accepted debt recorded in ADR 0007, not a solved problem.
  - **Dependency Governance (Anti-Bloat)**: Every new runtime dependency (NuGet or npm) MUST be justified against the "hand-rolled, greppable, dependency-free" default. The change description MUST state what it replaces and what it costs (bundle weight, supply-chain surface, maintenance, SSR/hydration risk).
  - **Dead Dependency Removal**: Any package declared in `frontend/package.json` or `backend/**/*.csproj` that no first-party file imports MUST be removed in the change that notices it. Closed on 2026-09-22: `leaflet` is now genuinely imported by `components/discover/ObservatoryMap.tsx` (ADR 0007) and the unused, Hippocratic-2.1 `react-leaflet` dependency was removed. Audit new dependencies against the "hand-rolled, greppable" default on every change.
- **Infrastructure (`infra`, `docker-compose.yml`)**:
  - Docker Compose for local PostgreSQL (port 5433) and Redis (port 6380).
  - Fly.io multi-machine deployment on a shared private network (`fly.api.toml`, `fly.web.toml`).

### 2. Privacy & Geolocation Safety Invariants (CRITICAL)

1. **API-Enforced Location Fuzzing**:
   - Location coordinates MUST ALWAYS be fuzzed to a 0.15° (~15 km) grid prior to database storage via `GeoFuzz`. Exact GPS or IP coordinates MUST NEVER be persisted.
2. **Public Location Redaction**:
   - `Mapping.ToPublicLocation` MUST NEVER return raw coordinates. If a user sets visibility to country-only, city and region details must be stripped.
3. **Discovery Exclusion**:
   - Users with `hidden` location visibility MUST be excluded from nearby reader lookups and the global curiosity heatmap.
4. **Bookshelf Privacy**:
   - Private shelf entries (`visibility == 'private'`) MUST NEVER be exposed in public profile responses or feeds.
5. **PII Zero-Leak Rule**:
   - Public user profile endpoints (`/users/:id`) MUST NEVER expose email addresses, password hashes, or exact coordinates.
6. **Identity & Display Name Separation**:
   - `DisplayName.Resolve` must be respected in all public endpoints and feeds: anonymous display mode must never leak handle or real name.

### 3. Gamification, Streak & Challenge Invariants

1. **Deterministic UTC Calendar Math**:
   - Reading streaks, streak freezes, and daily activity checks (`StreakMath.cs`) MUST be evaluated strictly against UTC date boundaries (`DateOnly today`). The server maintains zero client-local time dependencies.
2. **Streak Freeze Cap & Consumption**:
   - A reader can hold a maximum of 2 freezes (`MaxFreezesHeld = 2`). Freezes accrue only on 7-day streak advancements (`newStreak % 7 == 0`) and only shield an **exact 1-day missed gap** (`today.DayNumber == lastActivityDay.DayNumber + 2`, i.e. Monday → missed Tuesday → Wednesday). A consecutive day (`+1`) advances the streak and must never consume a freeze; a gap of `+3` or more resets regardless (see ADR 0003).
3. **Challenge Metric Clamping**:
   - Annual challenge percentages (`ChallengeService`) MUST clamp between `0` and `100%` (`Math.Min(100, ...)`), preventing visual overflow in UI progress bars.
4. **Lightweight Reactions Only**:
   - Reactions are strictly bounded to domain `ReactionKind` (`Insightful`, `Funny`, `Helpful`). Freeform emoji reactions or reaction spam are prohibited.

### 4. Content Moderation & Open Catalog Invariants

1. **Automated Content Guardrails**:
   - User handles, bio fields, circle descriptions, and messages must pass through `ProfanityFilter` to prevent toxic/hateful content before persistence.
2. **Moderation Audit State**:
   - Reported messages (`MessageReport`) support `Open`, `ResolvedActioned`, and `ResolvedDismissed`. Soft-deleted or muted messages (`MessageStatus.Muted`, `MessageStatus.Deleted`) must be excluded from public thread queries.
3. **External Catalog Resiliency & Fallback**:
   - Book catalog lookups via `OpenLibraryService` must enforce strict timeouts (3-5s), clamp page queries, and fallback gracefully to existing database catalog records without crashing thread creation.
4. **Ethical Affiliate Enrichment**:
   - Affiliate link generation (`AffiliateLinkService`) must format links exclusively with configured partner tags, strip empty affiliate keys, and sanitize ISBN values.

### 5. Concurrency, Race Condition Prevention & Data Integrity

- **Database Concurrency & Advisory Locks**:
  - Startup migrations use per-migration transaction-scoped PostgreSQL advisory locks (`pg_advisory_xact_lock`) to prevent race conditions across horizontally scaled Fly.io instances. The lock is always released on commit/rollback by Postgres itself.
  - **Reads never mutate**: conversation staleness is derived in memory on reads; only write paths and the hourly `ConversationArchiver` worker persist the archived flag (see ADR 0004).
- **Single-Use Refresh Token Rotation**:
  - Refresh tokens are single-use. Rotation locks the token row (`SELECT ... FOR UPDATE` on Npgsql, transaction-serialized on SQLite/test providers). Each rotation revokes the previous token. Stolen/reused tokens trigger complete token family invalidation (see ADR 0004).
- **Self-Follow & Duplication Constraints**:
  - Self-follows are blocked at the database level by SQL `CHECK` constraints (`follower_id != followed_id`).
  - Shelf entries enforce uniqueness per `(user_id, book_id)`.
  - Message reactions enforce uniqueness per `(message_id, user_id, kind)`.
  - Circle memberships enforce uniqueness per `(circle_id, user_id)`.

### 6. ADR Governance & Knowledge Graph Discipline (ADR 0001)

- **Agents are Contributors, Not Authorities**: Agents draft ADRs, proposals, code, and trace impact; human maintainers accept or reject decisions.
- **Explicit Written Rationale**: Decisions touching auth, privacy, data models, or moderation must be fully understandable from the written record alone without hidden prompt context.
- **Immutability of Accepted ADRs**: Once accepted, ADRs are immutable. New decisions supersede old ADRs with links.
- **Codebase Memory Synchronization**:
  - After significant architectural, data model, or workflow changes, refresh the codebase-memory knowledge graph and persist artifacts (`.codebase-memory/graph.db.zst`).

---

## 3. Frontend & UI/UX PRO MAX Rules

- **Accessibility & Contrast**:
  - All interactive controls must support keyboard navigation, visible focus rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`), and accessible labels (`aria-label`).
- **Dark Glass Aesthetic & Styling**:
  - Tailwind CSS v4 CSS-first configuration, dark glass aesthetic (`backdrop-blur`, subtle borders, curated HSL color schemes).
- **Zero Native Browser Dialogs**:
  - **NEVER use `window.alert()`, `window.confirm()`, or `window.prompt()`**. Always use modern UI dialogs, modals, or accessible toast notifications.
- **Iconography Anti-Patterns**:
  - **NEVER use raw emojis as UI icons**. Use standard SVG icon libraries (`lucide-react`).
- **RSC & Client Boundary Discipline**:
  - Server components for landing page and static boundaries; push `'use client'` down to interactive leaves.
  - Client state hydrated safely without SSR hydration mismatches (use mounted guards for browser-dependent projections).
- **Optimistic UI & Resilient Feedback**:
  - Provide instant loading skeletons, spinners, and optimistic feedback on reactions, shelf updates, and streak claims.
- **Touch, Responsive & Overflow Discipline**:
  - Interactive targets MUST be at least 44x44 px on touch viewports, and every clickable element MUST expose `cursor-pointer` and a visible `focus-visible` ring.
  - Zero horizontal overflow at 375 px width. Prefer responsive cards, wrapping rails, and scroll containers over shrinking type.
- **Dynamic Imports for Heavy Client Leaves**:
  - Heavy or browser-only client code (`ObservatoryMap`, `motion`, `embla-carousel-react`, any canvas/camera work) MUST be loaded via `next/dynamic` with `{ ssr: false }`, exactly as `components/discover/CuriosityMapShell.tsx` already does. Do not widen the first-load JS of a route for a non-critical visual.
- **Granular Error Boundaries & Suspense**:
  - Every data-bound route segment (home dashboard, feed, discover map, circles, book detail/conversations, profile) MUST provide a `loading.tsx` skeleton and an `error.tsx` boundary with a retry action. A blank or silently empty screen on a failed fetch is a defect.
- **Single `<h1>` & Semantic Hierarchy**:
  - Every route MUST render exactly one primary `<h1>`. Headings owned by shared components (`HomeDashboard`, `BookDetail`, `CircleDetail`, `ProfileHeader`, `SearchPageClient`, `AuthGate`) count toward the route total; never stack a page-level `<h1>` on a component `<h1>`.
- **Strict TypeScript Discipline**:
  - Zero tolerance for `any`, `as any`, `unknown as any`, `@ts-ignore`, or `@ts-expect-error` outside a narrowly scoped, commented shim. Shared response shapes live in `frontend/types` and MUST mirror backend `Contracts/` DTOs.
- **Server/Client Module Boundary**:
  - Server-only helpers (`frontend/lib/server-api.ts`) and Node built-ins MUST NEVER be imported from a `"use client"` file or from anything it transitively imports. Session state stays inside `components/providers/AuthProvider.tsx`; access tokens live in memory only and are never written to `localStorage`/`sessionStorage`.

---

## 4. Testing, Verification & Code Review Pipeline (MANDATORY)

After EVERY code modification, execute the verification pipeline before concluding tasks. A task is not complete while any step below is skipped, red, or unrun.

- **Add or Update Test Coverage (NON-NEGOTIABLE)**: every behavioral change ships with tests in the same change: domain math (streaks, freezes, challenge clamping), services, controller routes, authorization outcomes, and privacy invariants. HTTP-level coverage belongs in `backend/tests/CurioMap.Api.Tests/WorkflowIntegrationTests.cs` driven by the hermetic `CurioMapTestFactory` (in-memory SQLite); pure logic belongs in the focused `Services/`, `Auth/`, and `Common/` suites.
- **No Mock-the-Mock Tests**: asserting that a stub returned what the stub was told to return is worthless. Assert real invariants, persisted state, HTTP status codes (200, 201, 400, 401, 403, 404, 409, 429), and response shapes.
- **Regression Rule**: every corrected bug MUST land with a failing-first test that would have caught it. A bug fix without a test is a future bug report.

1. **Backend Integration & Unit Verification (ADR 0002)**:
   - Run hermetic in-memory integration test suite (`CurioMapTestFactory`) alongside domain unit tests:
     ```bash
     dotnet test backend/CurioMap.slnx --nologo
     dotnet format backend/ --verify-no-changes
     ```
   - **Critical Workflow Test Coverage**:
     - **Auth Lifecycle**: Registration, unique handle generation (`^[a-z]+_[a-z]+_\d{3,4}$`), password hashing, 409 conflict on duplicate email, JWT authentication, and clean logout.
     - **Privacy & Location Fuzzing**: Geo coordinate grid fuzzing (~15 km / 0.15°), coordinate redaction, and PII zero-leakage in public profile responses.
     - **Bookshelf Privacy**: Verification that private bookshelves return HTTP 403 Forbidden to other users.
     - **Gamification & Streaks**: UTC calendar math, streak stats, freeze count, and badge eligibility.
     - **Reading Circles**: Circle creation, membership join/leave, circle messages, and message count integrity.
2. **Frontend Verification**:
   ```bash
   cd frontend && npm run lint && npm run build
   ```
   - `npm run lint` runs ESLint **and** `scripts/verify-map-engine.mjs` (the ADR 0007 map guardrails: attribution enabled/visible, `MAP_MAX_ZOOM <= 12` wired through, no tile cache-busting or prefetch, tile URL from configuration, `react-leaflet` ban, `textContent` tooltips). CI runs this script, so a map-policy regression fails the build that introduces it.
   - `npm run build` compiles all 24 routes.
   - The other guardrail checks in §4C (h1 cardinality, native dialogs, raw emoji icons, server/client boundary) are required targets, not current reality - never report them as passing.
   - **Live map interaction probe** (requires a running stack — `npm run dev` first):
     ```bash
     npm run verify:map    # root: static guardrails + headless-Chrome CDP probe
     ```
     `scripts/verify-map-live.mjs` asserts tile loading, visible in-frame attribution, bloom rendering + heartbeat animation, click-to-select fly-to (zoom 9), reader popover open/shelf-link/no-email/dismiss, the zoom-ceiling plateau at 12 (climb then press past it), keyboard focusability, and 40px+ persona touch targets — 22 checks, exit 0 locally on 2026-09-22. It is **not** wired into CI (no seeded stack or browser guarantee on the runner, §8.11).
3. **End-to-End Live Smoke Test Protocol (`scripts/smoke.ps1`)**:
   - For live deployment or local container testing with Docker:
     ```bash
     npm run smoke
     # equivalent: powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
     ```
   - Validates live services end-to-end: Health -> Auth -> Geo -> Search -> Shelf -> Conversations -> Circles -> Streaks -> Discovery -> Frontend SSR Pages (`/`, `/home`, `/books/:id`, `/circles`, `/discover/global`).
   - **Single Source of Truth (NON-NEGOTIABLE)**: `scripts/smoke.ps1` (wired to `npm run smoke`) is the only maintained runner. The root `smoke.ps1` is a stale, divergent fork (frontend port `3123`, parses `body.token` instead of `body.accessToken`) and MUST NOT be extended - consolidate or delete it in the change that touches either file. Divergent smoke runners hide real regressions.
4. **Mandatory Systematic Code Review Protocol**:
   - **Privacy Check**: Ensure no unfuzzed coordinates, emails, or private shelf items leak through new or modified DTOs.
   - **Authorization Check**: Confirm the `[Authorize]`/`[AllowAnonymous]` posture of every touched action, and that object-level scoping uses the authenticated `CurrentUser` (`backend/src/CurioMap.Api/Auth/CurrentUser.cs`) rather than a route/body identifier.
   - **Next.js Audit**: Check for missing `'use client'` directives, SSR hydration risks, broken imports, or missing keys in `.map()`.
   - **SQL Migration Audit**: Verify any schema change is accompanied by an ordered, idempotent `.sql` script in `backend/src/CurioMap.Api/Data/Migrations/`.
   - **Contract Audit**: Verify every touched endpoint is reflected in `frontend/lib/api/*`, `docs/api.md`, the integration suite, and `scripts/smoke.ps1` (see §4B).
   - **Honesty Audit**: Update the §8 audit snapshot whenever a rule moves between unimplemented and enforced. Stale gap lists are worse than no gap list.

---

## 4A. Support, Operations & Incident Change Protocol (MANDATORY)

After EVERY code change, assess explicitly whether the change affects detectability, diagnosis, or remediation of a live incident. Applicable surfaces in this repo:

- health signals (`Controllers/HealthController.cs`),
- Redis cache / rate-limit degradation and the in-memory fallback path (`Services/RedisCacheService.cs`, `Services/RedisRateLimiter.cs`),
- background work (`Services/ConversationArchiver.cs`),
- external integrations (`OpenLibraryService`, `GoogleBooksService`, `GeoResolveService`),
- moderation and reporting operations (`MessagesController` reports, `components/admin/ReportsBoard.tsx`, `components/admin/BackfillButton.tsx`),
- affiliate configuration (`AffiliateLinkService`, `Affiliate__AmazonTag`),
- gamification data integrity (streaks, freezes, badges, challenge counters).

When applicable:

1. Update the operational documentation that describes the signal, the safe action, the verification step, and the escalation path (`docs/deployment.md`, `docs/architecture.md`, or an ADR).
2. Add or update focused regression coverage for the failure path, not only the happy path.
3. Refresh the codebase-memory graph (§2.6) when the operational or architectural model changed.
4. Never describe a failure mode as self-healing unless detection, bounded action, idempotency, timeout/retry behavior, post-action verification, audit capture, and escalation are all implemented and tested.

**Agent Authority Limit (NON-NEGOTIABLE)**: Agents may classify, summarize, correlate, and draft operator communication. Agents MUST NOT unilaterally execute destructive or production-state mutations: admin backfills (`AdminController`), moderation deletion/mute actions, badge or streak data repairs, user deletion or credential changes, or any data mutation outside the request path of a reviewed feature. Deterministic policy plus explicit human approval stays authoritative. The operational safety order is non-negotiable:

`Signal -> Evidence -> Eligibility/Safety Check -> Action -> Verification -> Audit -> Resolve, Retry, or Escalate`

---

## 4B. Live API Endpoint Synchronization & Route Drift Prevention (MANDATORY)

Every endpoint addition, change, rename, or deletion in `backend/src/CurioMap.Api/Controllers/*.cs` MUST land atomically with all of the following:

1. **Typed client parity**: update (or create) the matching client in `frontend/lib/api/` - `auth.ts`, `books.ts`, `bookshelf.ts`, `circles.ts`, `conversations.ts`, `discover.ts`, `feed.ts`, `follow.ts`, `messages.ts`, `streak.ts`, `users.ts`, `challenge.ts`, `admin.ts` - plus every component that consumes it. Transport concerns (base URL, bearer header, single-flight 401 refresh retry) stay in `lib/api/http.ts`; no component may hand-roll a raw `fetch` with an inline untyped body.
2. **Documentation parity**: update `docs/api.md` (route, auth requirement, bounded page size, request/response shape).
3. **Test parity**: extend `backend/tests/CurioMap.Api.Tests/WorkflowIntegrationTests.cs` with success plus failure outcomes (400 malformed, 401 unauthenticated, 403 forbidden/private, 404 unknown id, 409 conflict, 429 rate limited).
4. **Smoke parity**: extend `scripts/smoke.ps1` so the route is exercised against a live stack (§4.3).
5. **Contract sanity**: confirm the action still resolves in OpenAPI (`/openapi/v1.json` in Development) and that the route attribute matches the documented path.

### Route Drift Audit (required CI gate - see the §8 snapshot for current status)

- A static auditor MUST verify that every public action in `Controllers/*.cs` is covered by an integration test or a smoke assertion, and MUST fail CI on unverified drift. Required additions: `scripts/verify-route-coverage.mjs` plus root `package.json` scripts `audit:routes` (report) and `audit:routes:strict` (non-zero exit on drift), wired into `.github/workflows/ci.yml`.
- Never hand-maintain a second list of routes anywhere. Controllers are the source of truth; every other artifact is derived from them.

### Smoke Persona Phases (target coverage)

1. **Phase 0 - Liveness**: `GET /health` returns 200 (or 503 with `checks.database = down`) and `GET /` returns service metadata.
2. **Persona 1 - Anonymous reader**: registration/login, catalog search, public global discovery, public profile read, SSR pages render.
3. **Persona 2 - Privacy & authorization gate**: 401 on protected routes without a token; 403 when another reader requests a private shelf; `/users/:id` never returns email or raw coordinates; malformed or unknown ids return 400/404 rather than 500; tampered or expired JWT is rejected.
4. **Persona 3 - Authenticated reader**: geolocation update (fuzzed), shelf add/update/remove, conversation + message + reaction + report, circle create/join/message, streak stats and calendar.
5. **Persona 4 - Admin**: `AdminController` actions succeed for an admin and return 403 for a non-admin reader.

---

## 4C. Architectural Fitness Functions Protocol (CI/CD Quality Gate)

Architectural rules in this document are only real when a machine checks them. The following fitness suites MUST exist, run inside `dotnet test backend/CurioMap.slnx` / `npm run lint`, and stay 100% green:

1. **Backend layer & convention fitness** (`backend/tests/CurioMap.Api.Tests/Architecture/LayerBoundaryFitnessTests.cs`):
   - `Domain/`, `Services/`, and `Contracts/` MUST NOT reference `Microsoft.AspNetCore.Mvc` or `Microsoft.AspNetCore.Http`; HTTP concerns stay in `Controllers/`.
   - Every controller class MUST derive from `ControllerBase`, carry `[ApiController]` plus an explicit `[Route]`, and declare zero `async void` actions.
   - **Deliberate Architecture Note**: CurioMap controllers intentionally depend on `AppDbContext` directly (no pass-through service or repository ceremony). That decision stands. The enforceable requirement is **scoping, not indirection**: every query MUST be filtered by the authenticated `CurrentUser` (or be an explicitly public projection) and MUST NEVER trust a client-supplied identifier for authorization.
2. **Security & authorization posture fitness** (`Architecture/SecurityPostureFitnessTests.cs`):
   - Every action MUST be covered by a class-level `[Authorize]` or an explicit action-level `[Authorize]`/`[AllowAnonymous]`. An unattributed action fails the build.
   - `AdminController` MUST require `[Authorize(Policy = "Admin")]` on every action. (`Roles =` can never match here: the JWT carries a raw `role` claim and no `RoleClaimType` mapping exists, so the policy form is the only working spelling.)
   - Anonymous access is restricted to a documented allow-list: `AuthController` (register/login/refresh/logout), `HealthController`, public `BooksController` reads, public `DiscoverController` reads, public `UsersController` profile reads, public `ReadingCirclesController` reads, public `FeedController` reads. Adding an anonymous route requires updating this list in the same change.
3. **Privacy redaction fitness** (`Architecture/PrivacyFitnessTests.cs`):
   - No response record reachable by an anonymous or third-party caller may declare raw `Latitude`/`Longitude`, `Email`, `PasswordHash`, or refresh-token material.
   - Location projection MUST flow through `Mapping.ToPublicLocation`, and fuzzing MUST stay centralized in `Services/GeoFuzz.cs`.
4. **Query & pagination fitness** (`Architecture/QueryBoundsFitnessTests.cs`):
   - Every collection endpoint MUST clamp page size and offset through `Common/PageBounds.cs` (`ClampPageSize` / `ClampOffset`; `MaxPageSize = 50`, `MaxOffset = 10_000`) - no raw `Math.Clamp` literals in controllers and no `Skip`/`Take` fed directly by unbounded user input.
   - Every foreign key used in a join MUST be backed by an explicit index in `AppDbContext.OnModelCreating`.
5. **Frontend module boundary fitness** (frontend guardrail script, executed by `npm run lint`):
   - No Node-only modules (`fs`, `child_process`, `net`, `tls`, `dns`, `cluster`) reachable from `app/` or `components/`.
   - `lib/server-api.ts` MUST NOT be imported from any `"use client"` module.
6. **Frontend UI guardrail fitness** (frontend guardrail script, executed by `npm run lint`):
   - Zero `window.alert()`, `window.confirm()`, `window.prompt()`.
   - Zero raw emoji characters used as icons in JSX (`lucide-react` only).
   - Exactly one `<h1>` per rendered route, auditing `app/**/page.tsx` together with the components it renders.

Where a suite does not exist yet, creating it is part of finishing the work that first needs it (§8 tracks current status).

---

## 4D. Advanced Fitness Functions Matrix (CI/CD Automated Invariants)

Beyond the boundary suites in §4C, these invariants MUST be asserted automatically on every commit:

1. **EF Core foreign-key indexing** (`Architecture/QueryBoundsFitnessTests.EfCoreModel_AllForeignKeys_MustHaveConfiguredIndices`):
   - Every foreign key on non-owned entities in `AppDbContext` MUST have an explicit index (`entity.HasIndex(...)`). Unindexed keys become full-table scans during joins and cascade deletes.
2. **Explicit HTTP verb routing parity** (`Architecture/LayerBoundaryFitnessTests.AllControllerActions_MustDeclareExplicitHttpVerbAttribute`):
   - Every public action MUST declare `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpPatch]`, or `[HttpDelete]`. Unattributed actions are unroutable or reachable through unintended verb matching.
3. **UTC discipline & timestamp naming** (`Architecture/TimeDisciplineFitnessTests`):
   - `DateTime`/`DateTime?` properties on domain models MUST use the `*At` suffix (`CreatedAt`, `UpdatedAt`, `JoinedAt`, `LastActivityAt`) and assign from `DateTime.UtcNow`.
   - `DateTime.Now`, `DateTime.Today`, `DateTimeOffset.Now`, and local-time arithmetic are prohibited outside tests. Calendar logic (streaks, freezes, badges, challenges) uses `DateOnly` UTC dates per §2.3.
4. **Single `<h1>` semantic hierarchy** (frontend guardrail script): every rendered route exposes exactly one `<h1>` for SEO and WCAG 2.1 heading order.
5. **Privacy projection fitness** (`Architecture/PrivacyFitnessTests`): discovery, profile, feed, and map payloads MUST be produced through the sanctioned redaction helpers, and no anonymous payload may contain a reader's email or exact coordinate pair.

---

## 4E. Post-Deploy Verification & Rollback Protocol (MANDATORY)

1. **Health-gated deploys**: `fly.api.toml` and `fly.web.toml` MUST declare `[[http_service.checks]]` (API `/health`, web `/`) with sane `interval`, `timeout`, and `grace_period`, so a bad release cannot spread across machines. Neither file declares checks today (see §8).
2. **Post-deploy verification**: the `deploy` job in `.github/workflows/ci.yml` MUST be followed by bounded-retry readiness polling and a smoke run against the deployed URLs (`scripts/smoke.ps1 -ApiUrl ... -FrontendUrl ...`). A release is not "done" because `flyctl deploy` exited 0.
3. **Automated rollback path**: when verification fails, the pipeline MUST trigger `flyctl releases rollback` for the failed surface and report which release was restored. The command MUST be documented in `docs/deployment.md` and exercised at least once outside an incident.
4. **Migration compatibility**: a release MUST be deployable and rollback-able while the previous release is still serving - forward-only, additive migrations, and no destructive DDL in the same release as code that cannot tolerate both old and new shapes.
5. **Deploy approval stays human**: the `fly` GitHub Environment reviewer gate MUST stay enabled. No alternative path (local `flyctl deploy`, comment triggers, untracked tokens) may bypass it.

---

## 5. Production Security & Resilience Guardrails

1. **Authoritative JWT Claims**:
   - `UserId` and roles extracted from cryptographically verified JWT claims are authoritative. Never trust client-supplied user IDs in request bodies for authorization.
2. **Client-Supplied Identity Is Never Authorization**:
   - Resource identifiers arriving from the route or body are untrusted input. Role checks alone are insufficient: every mutation MUST be scoped by the authenticated `CurrentUser`, and cross-user reads MUST return the documented outcome (403 for a private shelf per ADR 0002) rather than leaking data.
3. **Location Trust Boundary**:
   - Coordinates are server-derived and always fuzzed before persistence; a client MAY submit country/region/city (resolved by `GeoResolveService` against the pinned `geocoding-api.open-meteo.com` host with a 4s timeout), but client-sent latitude/longitude MUST be ignored or rejected.
   - Forwarded-IP headers may only be trusted behind a configured proxy: `ClientIpResolver` honors `Fly-Client-IP` / `X-Forwarded-For` only when the socket peer sits inside `Proxy:TrustedNetworks` (rate limiting, `/geo/ip`). `UseForwardedHeaders` middleware is still absent (§8.6).
4. **CORS & Origin Discipline**:
   - Origins come exclusively from the `Cors:Origins` configuration list with exact matching. Naive suffix/substring matching is prohibited, and `AllowAnyOrigin()` combined with `AllowCredentials()` is never permitted.
5. **API Documentation & Admin Surface**:
   - `/openapi/v1.json`, the Scalar docs page (`/docs`), and the root metadata doc links MUST be Development-only (`Program.cs` gates `MapOpenApi`, static files, and the `/docs` fallback on the environment); production returns 404 for all three.
   - `AdminController` MUST require `[Authorize(Policy = "Admin")]` on every action (`Roles=` never matches the unmapped `role` claim), and the `/admin` web route MUST NOT rely on obscurity for protection (the API is the enforcement point).
6. **Inbound Callback Rule (future integrations)**:
   - Any future webhook or external callback MUST verify its signature before parsing, enforce a timestamp tolerance window, deduplicate on a durable event id inside a transaction, and acknowledge only after safe processing. CurioMap has no inbound webhooks today; adding one without these controls is prohibited.
7. **Token Storage & Rotation**:
   - Access tokens live in memory only (15 minutes, never `localStorage`/`sessionStorage`, never in a URL). Refresh tokens are httpOnly cookies, SHA-256 hashed at rest, single-use, rotated under a row lock (`FOR UPDATE`), and a reuse attempt invalidates the whole token family (ADR 0004). Token material MUST NOT appear in logs or in any response outside the auth endpoints.
8. **Secrets & Configuration**:
   - Production MUST supply a real `JWT__SECRET`; the built-in development fallback logs a warning today and SHOULD fail closed (refuse to boot) outside Development.
   - Secrets never appear in logs, docs, ADRs, or committed `.env` files. `Admin__Emails` promotion is a privileged configuration change and MUST be treated as auditable.
9. **Request & Response Bounds**:
   - Every collection endpoint clamps page size and offset through `Common/PageBounds.cs` (`MaxPageSize = 50`, `MaxOffset = 10_000`) plus request-size and timeout bounds. Unbounded `Take(userInput)` and deep-pagination `Skip` are prohibited.
10. **Concurrency & Read-Modify-Write Discipline**:
    - Uniqueness and self-follow invariants are database-enforced (unique indexes, `CHECK` constraints) and refresh rotation locks rows.
    - Any NEW read-modify-write path (message counts, streak day advancement, freeze consumption, badge award, reaction tallies, challenge progress) MUST use a transaction with a scoped lock or a single atomic SQL statement. Blind read-then-write under concurrency is a defect. This codebase has no `xmin`/`RowVersion` concurrency token today (§8) - do not assume the platform will save you.
11. **Immutable Audit & Consent Records**:
    - Moderation report resolution, terms consent (migration `0015_terms_consent.sql`), and admin actions are append-only. No application code may `UPDATE` or hard-`DELETE` audit records.
12. **Structured Logging & Correlation**:
    - Logs never contain passwords, refresh tokens, auth headers, emails, or raw coordinates, and every request/worker cycle carries a correlation id propagated through related log lines.
13. **External Integration Resilience**:
    - The Open Library, Google Books, and Open-Meteo clients already pin a 4-5s timeout and a pinned host; they MUST also bound retries with backoff and jitter, degrade to the local catalog / null coordinates, and never throw an integration failure into a user write path. No resilience or circuit-breaker policy is wired today (§8).
14. **Background Worker Discipline**:
    - Workers derive from `BackgroundService`, are cancellation-aware, idempotent, and safe to resume after termination. Reads never mutate: only write paths and `ConversationArchiver` persist the archived flag (ADR 0004).
15. **Migration Discipline**:
    - Migrations are ordered, idempotent, advisory-locked, forward-only, and never edited after being applied. Each schema change ships with matching `AppDbContext` mapping and a forward/rollback note.
16. **Health & Readiness**:
    - Liveness (process) MUST be separate from readiness (Postgres + Redis reachability), with bounded probe timeouts and no secrets, connection strings, or user data in the payload. Only a single `/health` exists today (§8).
17. **Observability & SLOs**:
    - Track error rate, p50/p95/p99 latency, Postgres pool saturation, Redis-fallback rate, external API failure rate, worker failures, and 429 volume. Publish numeric SLOs and alert thresholds before claiming operational readiness.
18. **Backups & Recovery**:
    - Neon point-in-time recovery MUST be enabled and restore-tested, with a documented recovery runbook in `docs/deployment.md`.
19. **Supply Chain & Release Controls**:
    - NuGet and npm dependencies are lockfile-pinned, container base images in `infra/*.Dockerfile` are pinned and minimal, production images run non-root without dev tooling, and CI (format, lint, tests, build) must be green before deploy.
20. **Second-Review Rule**:
    - Changes touching authentication, privacy fuzzing, refresh-token rotation, moderation, or SQL migrations require human review or an ADR. Agents may not self-approve these.
21. **Bounded Queries & Pagination**:
    - All collection endpoints (conversations, messages, feed, discover) must enforce strict maximum page sizes (`MaxPageSize = 50` or `100`). Unbounded queries are strictly prohibited.

22. **Security Headers**:
    - Every response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Content-Security-Policy` (`default-src 'none'` for the JSON API; a scoped policy for the dev-only `/docs` viewer), plus `Strict-Transport-Security` outside Development. Enforced by `Common/SecurityHeadersMiddleware.cs`.

---

## 6. Search Engine, Bot Defense & Crawler Governance (MANDATORY)

Status: neither `frontend/app/robots.ts` nor `frontend/public/robots.txt` exists today (see §8). This section defines the required end state; the first change touching SEO, metadata, routing, or public page structure MUST create them.

1. **Two-file rule**: `frontend/app/robots.ts` (dynamic Next.js MetadataRoute) and `frontend/public/robots.txt` (static fallback) MUST both exist and agree. Divergence between them is a defect.
2. **Non-production lockdown (NON-NEGOTIABLE)**: when `NODE_ENV !== "production"` or `NEXT_PUBLIC_ALLOW_INDEXING !== "true"`, every crawler receives `User-agent: *` / `Disallow: /`, and HTML responses carry `X-Robots-Tag: noindex`. Local, demo, and preview deployments MUST NEVER be indexed.
3. **AI scraper blocklist**: always disallow `GPTBot`, `ChatGPT-User`, `CCBot`, `anthropic-ai`, `Claude-Web`, `Google-Extended`, `Bytespider`, `Diffbot`, `PerplexityBot`, and `Amazonbot`.
4. **Indexable scope (privacy-driven, not only SEO)**: production indexation is limited to `/`, `/policy/terms`, `/policy/privacy`, `/policy/affiliates`, `/books/search`, and `/books/[id]`.
   - Disallowed: `/home`, `/me/*`, `/feed`, `/discover/*`, `/circles/*`, `/users/*`, `/admin*`, `/auth/*`, `/api/*`.
   - Rationale: reader profiles, circle threads, and discovery aggregates carry pseudonymous identity and fuzzed-location data. Indexing them widens the re-identification and scraping surface that §2.2 exists to prevent.
5. **Sitemap discipline**: `app/sitemap.ts` MUST list only the indexable routes above and MUST NEVER emit user, circle, conversation, or discovery URLs.
6. **Defense in depth**: robots rules are advisory. Authenticated and personal routes MUST ALSO be protected by server-side authorization; crawler exclusion is never access control.
7. **API responses**: `/api/*` MUST NOT be indexable, and no API response may be shared-cacheable while containing per-user data.

---

## 7. Site Optimization, Core Web Vitals, Load Testing & Performance Fitness (MANDATORY)

1. **Core Web Vitals budgets** for `/`, `/home`, `/books/[id]`, `/discover/global`, and `/feed`: LCP < 2.5s, INP < 200ms, CLS < 0.1 on a mid-tier mobile profile. Regressions are defects; measure before and after any change to a route's critical path.
2. **`next.config.ts` change control**: `images.unoptimized: true` is a deliberate trade-off for a single-region Fly deploy whose runtime image has no image optimizer. Any change to it, to `output`, rewrites, or compression MUST be justified in writing and measured - not "cleaned up" opportunistically.
3. **No critical-path bloat**: a new client dependency MUST NOT land in the first-load bundle of a public route; heavy leaves are dynamic-imported per §3. Check route sizes from `next build` for every touched route.
4. **Image & layout stability**: give every cover/image explicit dimensions (`width`/`height` or `aspect-ratio`) so CLS stays under budget, and lazy-load below-the-fold media.
5. **Caching discipline**: static assets are immutable-cacheable; authenticated and API responses are `no-store`/`private` and MUST NEVER be shared-cacheable. A per-user payload served from a shared cache is a privacy incident, not a performance win.
6. **Database performance telemetry**: any query above roughly 100ms MUST be observable. No EF `DbCommandInterceptor` is registered today (§8): a slow-query interceptor (duration plus command hash, never parameter values or PII) is required alongside the index fitness rule in §4D.1.
7. **Query shape review**: no N+1 loops, no accidental full-table scans, no unbounded `.ToListAsync()`, and list endpoints project onto lightweight DTOs.
8. **Redis is an accelerator, never a dependency**: a Redis outage MUST degrade to the in-memory fallback path (slower), never to 500s. `HealthController` already distinguishes `disabled` from `down` - preserve that distinction.
9. **Load & stress testing**: a Node ESM load runner (`scripts/load.mjs`, wired as `npm run test:load`) MUST exist before any traffic-sensitive feature ships, run against a seeded local stack, and enforce p95 < 250ms, p99 < 500ms, and failure budget < 0.1% on read endpoints. Not implemented today (§8).
10. **Budget verification**: until automated Lighthouse/load gates exist, the change description MUST state the measured result - or explicitly state that no measurement was taken. Unmeasured performance claims are prohibited.

---

## 8. Current State vs Required State (Audit Snapshot)

Per §0 (Explicit Operational Truth), this snapshot records what is actually enforced today versus what is merely required. "Enforced" means a file path proves it. Everything else is an open gap that agents MUST name in task summaries instead of implying compliance.

Snapshot date: 2026-09-22 (map engine: ADR 0007 superseded ADR 0006).

### Enforced today

- **Location fuzzing and public location redaction**: `backend/src/CurioMap.Api/Services/GeoFuzz.cs`, `backend/src/CurioMap.Api/Contracts/Mapping.cs` (`ToPublicLocation`), and `backend/tests/CurioMap.Api.Tests/Services/PrivacyMappingTests.cs` plus `WorkflowIntegrationTests.Location_Privacy_Coordinates_Are_Fuzzed_And_Redacted_In_Public_Profiles`.
- **Hermetic HTTP integration coverage**: `backend/tests/CurioMap.Api.Tests/CurioMapTestFactory.cs` plus `WorkflowIntegrationTests.cs` (auth lifecycle, privacy, bookshelf 403, streaks, circles).
- **CI build/test/lint/build gates**: `.github/workflows/ci.yml` runs `dotnet build`, `dotnet test`, `npm run lint`, `npm run build`, and all four are green on 2026-09-22 (`npx tsc --noEmit`, `npm run lint` and `npm run build` compile all 24 routes). History: commit `2929a44` left the SVG `frontend/components/discover/ObservatoryMap.tsx` half-refactored (dangling `clampViewbox` reference, missing `useCallback` import, React-19 `useRef` arity error, dropped `PersonaPopover`), which was repaired on 2026-09-21; that engine was then replaced wholesale by ADR 0007, so the SVG-specific defects no longer exist in the tree.
- **Leaflet + OpenStreetMap map engine (ADR 0007)**: `frontend/components/discover/ObservatoryMap.tsx` (map created inside an effect from a dynamic `import("leaflet")`, `maxZoom = MAP_MAX_ZOOM` = 12, `attributionControl: true`, screen-space `circleMarker` region blooms, `textContent`-built tooltips), `frontend/components/discover/map-style.ts` (`OSM_TILE_URL` read from `NEXT_PUBLIC_MAP_TILE_URL`, `OSM_ATTRIBUTION`, pixel radius helpers), `frontend/components/discover/CuriosityMapShell.tsx` (`next/dynamic` + `ssr: false`), and `frontend/components/discover/ObservatoryLegend.tsx` (Leaflet-free so `/` and `/discover/global` keep their first-load JS). Verified by measurement: `.next/static/chunks` holds exactly one Leaflet chunk (148,486 bytes raw) referenced only by lazy chunk loaders, never by prerendered HTML. `react-leaflet` was removed (unused and Hippocratic-2.1 against this Apache-2.0 repo); `leaflet` (BSD-2-Clause) is the only mapping dependency. **Guardrails**: `scripts/verify-map-engine.mjs` (19 static checks, wired into `frontend` `npm run lint`, hence CI) enforces attribution, zoom ceiling, tile-cache policy, configured tile URL, the `react-leaflet` ban and `textContent` tooltips; `scripts/verify-map-live.mjs` (22 headless-Chrome CDP checks, exit 0 locally on 2026-09-22) asserts the runtime behaviour — tiles, attribution rendering, bloom heartbeat, click-to-select fly-to, reader popover, zoom-ceiling plateau, keyboard/touch affordances — and caught (then proved fixed) the region-click-then-immediate-deselect bug caused by Leaflet propagating layer clicks to the map handler. CI runs the static guardrails but not the live probe (§8.11).
- **Refresh-token rotation with reuse invalidation**: `Auth/RefreshTokenService.cs`, `Auth/RefreshTokenServiceTests.cs`, and the row-locking rule in ADR 0004.
- **Database-level invariants**: self-follow `CHECK`, shelf uniqueness per `(user_id, book_id)`, reaction uniqueness, circle membership uniqueness, and unique handles in `AppDbContext.OnModelCreating`.
- **Zero native browser dialogs**: verified across `frontend/**/*.tsx`.
- **Trusted-proxy client identity + isolated 429 coverage**: `Common/ProxyOptions.cs`, `Services/ClientIpResolver.cs` (headers trusted only from configured networks, with unit matrix in `tests/Auth/ClientIpResolverTests.cs`), `Program.cs` partition key, `/geo/ip` fail-closed on untrusted remotes with two integration tests in `WorkflowIntegrationTests.cs`, `RateLimitedTestFactory` + `RateLimitIntegrationTests.cs` asserting the real `auth`-policy 429, and an explicit `Proxy:TrustedNetworks` section in `docs/deployment.md`. Caveat (§8.6): forwarded headers are trusted only by the resolver; there is still no `UseForwardedHeaders` middleware, so `HttpContext.Connection.RemoteIpAddress` and the request scheme remain the raw socket values elsewhere.
- **Enum casing normalized at the store**: migration `0017_normalize_enum_casing.sql` rewrites legacy lowercase enum spellings to the PascalCase members EF persists, repoints the lowercase `0001`/`0004` defaults, rebuilds `ix_shelf_reading_public` for `'Reading'`/`'Public'`, and pins every enum domain (`display_name_mode`, `location_visibility`, `bookshelf_visibility`, shelf `status`/`visibility`, topics, message/report/reaction states and kinds, membership roles, badge kinds) with `CHECK` constraints; a hermetic test documents that a legacy lowercase row fails EF materialization (the reason the migration + CHECKs exist). Verified live on seeded Postgres: `bookshelf_entries.visibility` collapsed from 872 `'public'` + 5 `'Public'` to 879 `'Public'`, `discover/global` grew to 87 regions, `discover/map-readers` returned 50 readers, and a seeded reader's public profile resolves its `pseudonymous` handle.
- **Security posture: headers, dev-only docs, bounded pagination, token minimization, handle filter**: `Common/SecurityHeadersMiddleware.cs` (nosniff / DENY / strict-origin-when-cross-origin / CSP - `default-src 'none'` for the JSON API, a scoped policy for the dev-only `/docs` viewer - plus HSTS outside Development), registered first in `Program.cs`; `app.MapOpenApi()`, the static docs page, and the root metadata doc links are gated to Development, with `tests/ProductionEnvironmentTests.cs` booting the real pipeline under `Production` to assert OpenAPI/docs 404 + HSTS; `Common/PageBounds.cs` (`MaxPageSize = 50`, `MaxOffset = 10_000`) replaced every raw `Math.Clamp(limit, 1, 50)` and unbounded-offset site (19 call sites across Books/Conversations/Discover/Feed/Follow/ReadingCircles plus the `.Take(50)` caps in Bookshelf/Admin), unit-covered in `tests/Common/PageBoundsTests.cs` and integration-covered by `WorkflowIntegrationTests.Book_Search_Clamps_Limit_And_Offset`; JWTs carry only `sub`/`jti`/`role` with `ValidAlgorithms` pinned to HS256 (`Auth/JwtTokenService.cs`, `Program.cs`); handles pass `ProfanityFilter` (`UsersController.UpdateMe`, asserted by `WorkflowIntegrationTests.Handle_Profanity_Is_Rejected`).
- **Feed privacy for private shelf entries**: `Services/ActivityService.cs` (`IsFeedVisible`, visibility snapshots, `SyncBookshelfActivity`, `PurgeBookshelfActivity`), `Controllers/FeedController.cs` (shelf-visibility and message-status filters), `Controllers/BookshelfController.cs` (write gate, retro-hide, purge), migration `0016_activity_shelf_visibility.sql`, and the four `Feed_*` tests in `WorkflowIntegrationTests.cs`. Verified live against Postgres: a private add is hidden, a public add is visible, a flip to private retro-hides the historical event, and a reader-level private shelf yields zero shelf events.
- **Deliberate direct-`AppDbContext` controller architecture**: `Controllers/*.cs` (see the §4C.1 note - scoping is enforced, indirection deliberately is not).

### Open gaps (must be named, never hidden)

1. `dotnet format --verify-no-changes` is mandated by §0 but is NOT part of `.github/workflows/ci.yml`.
2. No `Architecture/` fitness suite exists under `backend/tests/CurioMap.Api.Tests/` - §4C and §4D are unenforced rules.
3. No general frontend test runner: `frontend/package.json` exposes `dev`, `dev:ui`, `build`, `start`, `lint` (lint now includes the map guardrail script) and `verify:map`, so §4C.5, §4C.6, and §4D.4 (h1 cardinality, native-dialog/emoji bans, server/client boundary) remain unenforced.
4. No route-coverage auditor; root `package.json` exposes `dev`, `dev:only-ui`, `smoke`, `verify:map` (§4B).
5. Duplicate, divergent smoke runners: root `smoke.ps1` (frontend port `3123`, reads `body.token`) versus `scripts/smoke.ps1` (port `3000`, reads `body.accessToken`, broader coverage). Consolidate on `scripts/smoke.ps1`.
6. `UseForwardedHeaders` middleware is still absent: forwarded client IP metadata is trusted only inside `ClientIpResolver` (see "Enforced today"); `HttpContext.Connection.RemoteIpAddress` and the request scheme remain raw socket values elsewhere in the pipeline. Any new code that reads the client IP or scheme for auth, geo, or redirects MUST go through the resolver (or get middleware added deliberately), never read forwarded headers directly.
7. Single `/health` endpoint with no liveness/readiness split; `fly.api.toml` and `fly.web.toml` declare no `[[http_service.checks]]`; CI has no post-deploy verification or rollback step (§4E, §5.16).
8. No `app/robots.ts`, no `public/robots.txt`, no `app/sitemap.ts` (§6).
9. No EF slow-query interceptor and no systematic foreign-key index coverage in `AppDbContext.OnModelCreating` (§7.6, §4D.1).
10. No `xmin`/`RowVersion` concurrency tokens anywhere; correctness currently depends on unique constraints plus `FOR UPDATE` in refresh rotation. New read-modify-write paths must not assume the same safety for free (§5.10).
11. **Map live probe is not a CI gate (ADR 0007)**: the static guardrails (`scripts/verify-map-engine.mjs`, 19 checks, wired into `frontend` `npm run lint` which CI runs) now fail the build if attribution is hidden, `MAP_MAX_ZOOM` is raised or de-wired, tile cache-busting/prefetch creeps in, the tile URL stops coming from `NEXT_PUBLIC_MAP_TILE_URL`, `react-leaflet` returns, or tooltips stop being `textContent`-built. Runtime behaviour is asserted by `scripts/verify-map-live.mjs` (22 headless-Chrome CDP checks) — **locally only**: no CI job runs it because the runner has no seeded stack (Postgres/Redis + API + demo data) or browser guarantee, so tile loading, marker animation, popover flow, the zoom-ceiling plateau and keyboard/touch affordances are verified only when someone runs `npm run verify:map` against `npm run dev`. Closing this gap means a `map-e2e` CI job with docker services + a Chrome step. `react-leaflet` MUST NOT return: it is Hippocratic-2.1, not OSI-approved (now enforced by the guardrails).
12. No load/stress harness, no measured Core Web Vitals budgets, no Lighthouse gate (§7.9, §7.10).
13. No inbound webhook exists today, so §5.6 is forward-looking guidance; it becomes a hard requirement the moment any inbound callback is added.
14. Seed/demo scripts still write lowercase enum spellings (e.g. `0013_seed_demo_readers.sql` literals `'pseudonymous'`, `'region_city'`, `'public'`): harmless on databases that run 0017+, because the migration rewrites them and the CHECKs accept only the PascalCase members, but the stale literals invite confusion and any future seed bypassing the migration would reintroduce drift. Updating the seed literals is accepted cleanup - normalize them to the PascalCase `Enums.cs` members, and unit/update `gen_seed_demo.py` + `fix_seed_script.py` so regeneration does not recreate the drift.

### Maintenance rule

This snapshot is part of the definition of done. When a gap closes, move the item to "Enforced today" and cite the file path that proves it. When a new gap is discovered, add it in the same change that discovers it. Never delete a gap to make the document look cleaner.
