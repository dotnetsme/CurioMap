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

---

## 1. Core Mission, Pillars & Philosophy

- **Live Map of Human Curiosity**: CurioMap is a global, open-source reading graph connecting readers through what they are reading, thinking, and discovering in real time.
- **Anonymous Intellectual Identity**: Anonymous by default, generated handles (`curious_otter_412`), curated avatars, and reversible display modes (`anonymous`, `pseudonymous`, `real_name`).
- **Geolocation Discovery with Radical Privacy**: Coarse location (~15 km grid / 0.15°), no exact coordinates stored. Country/region/city visibility controls with complete opt-out.
- **Micro-conversations, Circles & Streaks**: Book-focused discussions, lightweight reactions (`insightful`, `funny`, `helpful`), reading circles, and reading streak gamification.
- **Ethical Monetization**: Transparent affiliate links based on ISBN (Bookshop.org, Kobo, Amazon); no data brokerage, no behavioral ad profiling.
- **Simplicity, Greppability & Zero Ceremony**: Explicit controllers, plain services, dependency-free SVG equirectangular map projection, and raw SQL migrations.

---

## 2. Architecture & Domain Invariants (NON-NEGOTIABLE)

### 1. Technology Stack & Boundaries

- **Backend (`backend/src/CurioMap.Api`)**:
  - ASP.NET Core 10 Web API host, attribute-routed controllers.
  - **Controllers only, NO MediatR**: Each HTTP domain maps to a single controller; shared logic lives in plain services (`Services/`, `Auth/`, `Common/`). Explicit, greppable, boring.
  - **Data Access & Schema**: EF Core 10 + Npgsql targeting Neon Postgres. Schema is strictly owned by ordered SQL migration scripts (`backend/src/CurioMap.Api/Data/Migrations/*.sql`) applied at startup by `DbInitializer` with PostgreSQL advisory locks. Never edit already-applied migrations in production.
  - **Caching & Rate Limiting**: Redis (Upstash / Redis Cloud) cache-aside with in-memory compute fallback. Dual rate limiting: fixed-window policies (`auth`, `write`, `search`) plus Redis-backed limits for message posting.
  - **Auth**: JWT bearer access tokens (15 min) + rotating refresh tokens (httpOnly cookie, SHA-256 hashed in DB). Passwords hashed with PBKDF2-SHA256 (100k iterations).
- **Frontend (`frontend`)**:
  - Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
  - Same-origin `/api` rewrites proxying requests to the backend API (`http://localhost:8080` locally, `http://curiomap-api.internal:8080` on Fly.io private network).
  - Client components consume typed API clients under `frontend/lib/api/*` with transparent 401 refresh retry logic in `http.ts`.
  - **Zero Mapping Libraries**: Curiosity map is a dependency-free SVG equirectangular projection of fuzzed region coordinates.
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
  - Startup migrations use PostgreSQL advisory locks (`pg_advisory_xact_lock`) to prevent race conditions across horizontally scaled Fly.io instances.
- **Single-Use Refresh Token Rotation**:
  - Refresh tokens are single-use. Each token rotation revokes the previous token family entry. Stolen/reused tokens trigger complete token family invalidation.
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

---

## 4. Testing, Verification & Code Review Pipeline (MANDATORY)

After EVERY code modification, execute the verification pipeline before concluding tasks:

1. **Backend Integration & Unit Verification (ADR 0002)**:
   - Run hermetic in-memory integration test suite (`CurioMapTestFactory`) alongside domain unit tests:
     ```bash
     dotnet test backend/
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
3. **End-to-End Live Smoke Test Protocol (`scripts/smoke.ps1`)**:
   - For live deployment or local container testing with Docker:
     ```bash
     powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1
     ```
   - Validates live services end-to-end: Health -> Auth -> Geo -> Search -> Shelf -> Conversations -> Circles -> Streaks -> Discovery -> Frontend SSR Pages.
4. **Mandatory Systematic Code Review Protocol**:
   - **Privacy Check**: Ensure no unfuzzed coordinates, emails, or private shelf items leak through new or modified DTOs.
   - **Next.js Audit**: Check for missing `'use client'` directives, SSR hydration risks, broken imports, or missing keys in `.map()`.
   - **SQL Migration Audit**: Verify any schema change is accompanied by an ordered, idempotent `.sql` script in `backend/src/CurioMap.Api/Data/Migrations/`.

---

## 5. Production Security & Resilience Guardrails

1. **Authoritative JWT Claims**:
   - `UserId` and roles extracted from cryptographically verified JWT claims are authoritative. Never trust client-supplied user IDs in request bodies for authorization.
2. **SSRF & External Integration Boundaries**:
   - External calls (Open Library, Open-Meteo) must enforce timeouts, resilient fallbacks, and validate external URLs to prevent SSRF and unbounded latency.
3. **Structured Logging & Secret Redaction**:
   - Logs must never contain passwords, refresh tokens, auth headers, or raw coordinates.
4. **Bounded Queries & Pagination**:
   - All collection endpoints (conversations, messages, feed, discover) must enforce strict maximum page sizes (`MaxPageSize = 50` or `100`). Unbounded queries are strictly prohibited.
