# Graph Report - CurioMap  (2026-10-18)

## Corpus Check
- 293 files · ~151,911 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 11, .example 2, .toml 2)

## Summary
- 2250 nodes · 6342 edges · 121 communities (101 shown, 20 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 567 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `905c2b94`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CurioMap.Api.Common
- user.ts
- HomeDashboard.tsx
- .Resolve
- ActionResult
- ObservatoryMap.tsx
- api
- CircleDetail.tsx
- index.ts
- frontend/package.json
- react
- ProfilePageView.tsx
- Avatar
- BooksController
- Book
- ReadingCircle
- BookDetail.tsx
- Options.cs
- IReadOnlyList
- BadgeKind
- Message
- AppDbContext
- Fact
- .OnModelCreating
- Enforced today
- AccountDeletionTests
- User
- ILogger
- WorkflowIntegrationTests
- BookshelfEntry
- dependencies
- DateTime
- devDependencies
- Apple Design
- CircleReaction
- ActivityEvent
- StreakCard.tsx
- CurioMap.Api.Tests.csproj
- Fact
- Draft
- .ConfigureWebHost
- compilerOptions
- ResendEmailSender
- Contributing to CurioMap
- Location
- verify-map-live.mjs
- RefreshToken
- verify-route-coverage.mjs
- CurioMap AI Agent Guidelines & Architecture Guardrails
- 20261010000943_InitialCreate.Designer.cs
- CurrentUser
- CircleReaction
- verify-map-engine.mjs
- InlineData
- Terms of Use
- scripts
- dev.mjs
- MessageReport
- gen_seed_demo.py
- Guid
- ADR 0001: ADR agent and LLM-assisted review governance
- ILogger
- scripts
- ADR 0002: In-memory test factory integration and end-to-end smoke verification
- Deployment (Fly.io + Neon + Upstash)
- UserContracts.cs
- .Update
- Design system
- HandleGenerator
- http
- Decisions
- API reference
- adr/README.md
- Roadmap
- EmailOptions
- CLAUDE.md
- ADR 0005: Signed-in home dashboard, cookie-presence routing, and single auth gate
- Architecture Decision Records
- Data model
- layout.tsx
- CurioMap
- StreakActivity
- Contributor Covenant Code of Conduct
- ADR 0007: OpenStreetMap basemap via Leaflet (supersedes ADR 0006)
- StreakController
- .ToNpgsql
- ADR 0003: Privacy redaction breadth, dependency-free map, and bounded query hardening
- eslint.config.mjs
- AuthResponse
- Privacy policy
- proxy.ts
- Security Policy
- Local development guide
- Options considered
- country-names.ts
- ClientIpResolver
- docs/README.md
- 2026-09-10-day-1.md
- ConversationContracts.cs
- frontend/AGENTS.md
- postcss.config.mjs
- .TryHandleAsync
- Maintainer guide
- Governance
- .BadgesFor
- ChallengeMathTests
- CircleStreakStats
- [Unreleased]
- ADR 0006: Observatory map engine — superseding ADR 0003 rule 9
- Consequences
- next.config.ts
- infra/README.md
- Getting help

## God Nodes (most connected - your core abstractions)
1. `AppDbContext` - 98 edges
2. `api()` - 83 edges
3. `User` - 74 edges
4. `lucide-react` - 56 edges
5. `react` - 55 edges
6. `AppException` - 54 edges
7. `next` - 48 edges
8. `WorkflowIntegrationTests` - 47 edges
9. `CurioMap.Api.Common` - 44 edges
10. `Button()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `Smoke Persona Phases (target coverage)` --references--> `AdminController`  [INFERRED]
  AGENTS.md → backend/src/CurioMap.Api/Controllers/AdminController.cs
- `4D. Advanced Fitness Functions Matrix (CI/CD Automated Invariants)` --references--> `AppDbContext`  [INFERRED]
  AGENTS.md → backend/src/CurioMap.Api/Data/AppDbContext.cs
- `3. Session lock retained + `try/finally` unlock in `DbInitializer`` --references--> `DbInitializer`  [INFERRED]
  docs/adr/0004-readonly-reads-archival-and-concurrency.md → backend/src/CurioMap.Api/Data/DbInitializer.cs
- `Account deletion` --references--> `AccountDeletionService`  [INFERRED]
  docs/api.md → backend/src/CurioMap.Api/Services/AccountDeletionService.cs
- `3. Gamification, Streak & Challenge Invariants` --references--> `ChallengeService`  [INFERRED]
  AGENTS.md → backend/src/CurioMap.Api/Services/ChallengeService.cs

## Import Cycles
- None detected.

## Communities (121 total, 20 thin omitted)

### Community 0 - "CurioMap.Api.Common"
Cohesion: 0.06
Nodes (18): ConversationPrompt, DotEnv, EnumStrings, Prompts, RatingStats, Average, Count, RedisUrl (+10 more)

### Community 1 - "user.ts"
Cohesion: 0.12
Nodes (17): AdminReport, FeedBook, FeedConversation, FeedEvent, FeedPage, LocationDto, UpdateLocationPayload, MessagesPage (+9 more)

### Community 2 - "HomeDashboard.tsx"
Cohesion: 0.11
Nodes (39): Consequences, Context, Negative / Trade-offs, Positive, Privacy check (per AGENTS.md §2.2), GlobalMapPage(), StatPill(), NearbyBody() (+31 more)

### Community 4 - "ActionResult"
Cohesion: 0.12
Nodes (14): JwtTokenService, AppException, Status, AuthUserDto, LogoutResponse, RefreshRequest, TermsStatusDto, ChallengeStatsDto (+6 more)

### Community 5 - "ObservatoryMap.tsx"
Cohesion: 0.09
Nodes (41): ADR-0006, LiveMap, GlobalMap(), project(), TopReadersStrip(), clampNum(), HEAT_COLD, HEAT_GRADIENT (+33 more)

### Community 6 - "api"
Cohesion: 0.07
Nodes (48): submit(), TermsGate(), accept(), kinds, MessageRow(), DeleteAccountSection(), confirmDelete(), AuthContext (+40 more)

### Community 7 - "CircleDetail.tsx"
Cohesion: 0.10
Nodes (40): CirclePage(), CirclesPage(), CircleCard(), CircleDetail(), toggleMembership(), CircleList(), container, item (+32 more)

### Community 8 - "index.ts"
Cohesion: 0.07
Nodes (38): 3. Frontend & UI/UX PRO MAX Rules, SearchPage(), PublicBookshelfPage(), BookCard(), BookCover(), SearchPageClient(), TopBooksRail(), toStub() (+30 more)

### Community 9 - "frontend/package.json"
Cohesion: 0.12
Nodes (16): name, private, version, class-variance-authority, clsx, embla-carousel-react, @eslint/eslintrc, react-dom (+8 more)

### Community 10 - "react"
Cohesion: 0.11
Nodes (25): AdminPage(), LoginForm(), LoginPage(), RegisterForm(), RegisterPage(), GlobalError(), SettingsForm(), SettingsPage() (+17 more)

### Community 11 - "ProfilePageView.tsx"
Cohesion: 0.13
Nodes (20): Decision, FeedPage(), FeedView(), loadMore(), MyBookshelfPage(), MyProfilePage(), PublicProfilePage(), AuthGate() (+12 more)

### Community 12 - "Avatar"
Cohesion: 0.09
Nodes (34): Components, dynamic, fallbackVectors, features, LandingPage(), ObservatoryLegend(), ADR-0007, defs (+26 more)

### Community 13 - "BooksController"
Cohesion: 0.24
Nodes (4): BookDto, BooksController, BookDetailResult, OpenLibraryBook

### Community 14 - "Book"
Cohesion: 0.07
Nodes (30): 4. Content Moderation & Open Catalog Invariants, Book, AffiliateLinks, Author, Conversations, CoverUrl, CreatedAt, Description (+22 more)

### Community 15 - "ReadingCircle"
Cohesion: 0.06
Nodes (35): CircleMessage, Author, AuthorId, Circle, CircleId, Content, CreatedAt, Id (+27 more)

### Community 16 - "BookDetail.tsx"
Cohesion: 0.10
Nodes (36): ConversationThreadPage(), BookConversationsPage(), BookPage(), ReportsBoard(), BookDetail(), rate(), readRatings(), BuyLinks() (+28 more)

### Community 17 - "Options.cs"
Cohesion: 0.11
Nodes (17): AdminOptions, Emails, AffiliateOptions, AmazonTag, GoogleBooksOptions, ApiKey, Enabled, JwtOptions (+9 more)

### Community 18 - "IReadOnlyList"
Cohesion: 0.09
Nodes (27): BookStubDto, PagedResult, UserStubDto, ConversationDto, MessagesPage, AdminReportDto, FollowListDto, GlobalDiscoveryDto (+19 more)

### Community 19 - "BadgeKind"
Cohesion: 0.08
Nodes (26): BadgeKind, CircleStreak30, CircleStreak7, EarlyBird, FiftyBooks, FirstBook, FirstCircle, FirstMessage (+18 more)

### Community 20 - "Message"
Cohesion: 0.06
Nodes (34): Conversation, Book, BookId, CreatedAt, CreatedBy, Creator, Draft, DraftId (+26 more)

### Community 21 - "AppDbContext"
Cohesion: 0.07
Nodes (23): AppDbContext, ActivityEvents, Books, BookshelfEntries, Challenges, CircleMemberships, CircleMessages, CircleReactions (+15 more)

### Community 22 - "Fact"
Cohesion: 0.14
Nodes (3): StreakMath, ProductionEnvironmentTests, StreakMathTests

### Community 23 - ".OnModelCreating"
Cohesion: 0.12
Nodes (16): 8. Current State vs Required State (Audit Snapshot), Maintenance rule, Open gaps (must be named, never hidden), Follow, CreatedAt, Followed, FollowedId, Follower (+8 more)

### Community 24 - "Enforced today"
Cohesion: 0.14
Nodes (8): Program, CurioMapTestFactory, NeutralizeRateLimits, TestEnvironment, ProductionApiTestFactory, TestEnvironment, RateLimitedTestFactory, NeutralizeRateLimits

### Community 25 - "AccountDeletionTests"
Cohesion: 0.33
Nodes (3): DeleteAccountRequest, AccountDeletionTests, Reader

### Community 26 - "User"
Cohesion: 0.06
Nodes (31): ReadingStreak, CurrentStreak, FreezeCount, LastActivityAt, LongestStreak, UpdatedAt, User, UserId (+23 more)

### Community 27 - "ILogger"
Cohesion: 0.12
Nodes (15): 5. Production Security & Resilience Guardrails, ConversationArchiver, 1. Keep lazy archival on reads, 2. Read-only reads + hourly `ConversationArchiver` worker (chosen), 3. Session lock retained + `try/finally` unlock in `DbInitializer`, 4. Transaction-scoped advisory lock per migration (chosen), 5. `SELECT ... FOR UPDATE` on the refresh-token row + family wipe on reuse (chosen), ADR 0004: Read-only conversation reads, hourly archival worker, and hardened startup/refresh concurrency (+7 more)

### Community 28 - "WorkflowIntegrationTests"
Cohesion: 0.12
Nodes (5): SearchResponse, AddBookshelfRequest, IpGeoDto, WorkflowIntegrationTests, Verification

### Community 29 - "BookshelfEntry"
Cohesion: 0.10
Nodes (20): Enforced today, BookshelfEntry, Book, BookId, CreatedAt, FinishedAt, Id, StartedAt (+12 more)

### Community 30 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, class-variance-authority, clsx, embla-carousel-react, leaflet, lucide-react, motion, next (+3 more)

### Community 31 - "DateTime"
Cohesion: 0.24
Nodes (9): CircleDetailDto, CircleDto, CircleMemberDto, CircleMessageDto, CircleMessagesPage, CreateCircleMessageRequest, CreateCircleRequest, CircleStreakStatsDto (+1 more)

### Community 32 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, tailwindcss, @tailwindcss/postcss, @types/leaflet, @types/node (+3 more)

### Community 33 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 34 - "CircleReaction"
Cohesion: 0.08
Nodes (24): CircleMembership, Circle, CircleId, Id, JoinedAt, Role, User, UserId (+16 more)

### Community 35 - "ActivityEvent"
Cohesion: 0.14
Nodes (14): ActivityEvent, Actor, ActorId, Book, BookId, BookshelfEntryId, Conversation, ConversationId (+6 more)

### Community 36 - "StreakCard.tsx"
Cohesion: 0.16
Nodes (19): BadgeToast(), diffNewBadges(), ReadingHeatmap(), StreakCard(), RANK_STYLES, StreakLeaderboard(), getMyStreakCalendar(), getStreak() (+11 more)

### Community 37 - "CurioMap.Api.Tests.csproj"
Cohesion: 0.11
Nodes (17): net10.0, net10.0, coverlet.collector (6.0.4), EFCore.NamingConventions (10.0.1), Microsoft.AspNetCore.Authentication.JwtBearer (10.0.12), Microsoft.AspNetCore.Mvc.Testing (10.0.3), Microsoft.AspNetCore.OpenApi (10.0.12), Microsoft.EntityFrameworkCore.Design (10.0.3) (+9 more)

### Community 38 - "Fact"
Cohesion: 0.12
Nodes (5): 2. Privacy & Geolocation Safety Invariants (CRITICAL), Like, GeoFuzz, GeoFuzzTests, PrivacyMappingTests

### Community 39 - "Draft"
Cohesion: 0.07
Nodes (28): Draft, Author, AuthorId, Chapters, CreatedAt, Description, Id, Status (+20 more)

### Community 40 - ".ConfigureWebHost"
Cohesion: 0.13
Nodes (6): RedisCacheService, Db, IRedisRateLimiter, RedisRateLimiter, InMemoryTestCacheService, TestRateLimiter

### Community 41 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 42 - "ResendEmailSender"
Cohesion: 0.39
Nodes (7): 1. Technology Stack & Boundaries, IEmailSender, ResendEmailSender, SmtpEmailSender, TestEmailSender, SentEmails, 4. Hybrid Email Delivery (`IEmailSender`)

### Community 43 - "Contributing to CurioMap"
Cohesion: 0.12
Nodes (16): AI-assisted contributions, Coding conventions, Contents, Contributing to CurioMap, Database changes, Dev logs, Easy first contributions, Ground rules (+8 more)

### Community 44 - "Location"
Cohesion: 0.20
Nodes (9): Location, City, Country, CreatedAt, Id, LatFuzzed, LngFuzzed, Region (+1 more)

### Community 45 - "verify-map-live.mjs"
Cohesion: 0.15
Nodes (12): API, args, cdpConnect(), check(), CHROME, getJson(), log(), main() (+4 more)

### Community 46 - "RefreshToken"
Cohesion: 0.18
Nodes (11): RefreshTokenService, RefreshToken, CreatedAt, ExpiresAt, Id, RevokedAt, TokenHash, User (+3 more)

### Community 47 - "verify-route-coverage.mjs"
Cohesion: 0.16
Nodes (16): allControllers, allRoutes, CTRL, extractControllerRoutes(), extractTestCoverage(), norm(), readText(), ROOT (+8 more)

### Community 48 - "CurioMap AI Agent Guidelines & Architecture Guardrails"
Cohesion: 0.12
Nodes (16): 0. Default Agent Persona & Role (MANDATORY), 1. Core Mission, Pillars & Philosophy, 2. Architecture & Domain Invariants (NON-NEGOTIABLE), 3. Gamification, Streak & Challenge Invariants, 4. Testing, Verification & Code Review Pipeline (MANDATORY), 4B. Live API Endpoint Synchronization & Route Drift Prevention (MANDATORY), 4D. Advanced Fitness Functions Matrix (CI/CD Automated Invariants), 4E. Post-Deploy Verification & Rollback Protocol (MANDATORY) (+8 more)

### Community 49 - "20261010000943_InitialCreate.Designer.cs"
Cohesion: 0.11
Nodes (6): InitialCreate, AlignSchemaWithSeedScripts, BackfillBookTopics, NormalizeSeededEnumValues, AppDbContextModelSnapshot, CurioMap.Api.Migrations

### Community 50 - "CurrentUser"
Cohesion: 0.08
Nodes (20): 4C. Architectural Fitness Functions Protocol (CI/CD Quality Gate), CurrentUser, IsAdmin, IsAuthenticated, Principal, UserId, FeedBookDto, FeedConversationDto (+12 more)

### Community 51 - "CircleReaction"
Cohesion: 0.17
Nodes (12): CircleReaction, CreatedAt, Id, Kind, Message, MessageId, User, UserId (+4 more)

### Community 52 - "verify-map-engine.mjs"
Cohesion: 0.14
Nodes (11): check(), CSS, MAP, MAP_CODE, ADR-0007, mustMatch(), mustNotMatch(), results (+3 more)

### Community 53 - "InlineData"
Cohesion: 0.11
Nodes (9): DisplayName, DisplayMode, Anonymous, Pseudonymous, RealName, PageBoundsTests, SeedCatalogTests, ProfanityFilterTests (+1 more)

### Community 54 - "Terms of Use"
Cohesion: 0.14
Nodes (14): 10. Third-party services, 11. Governing law and dispute resolution, 12. General provisions, 13. Contact, 1. Eligibility and accounts, 2. Acceptable use, 3. Your content, 4. Affiliate links and no ads (+6 more)

### Community 55 - "scripts"
Cohesion: 0.13
Nodes (14): description, engines, node, name, private, scripts, audit:routes, audit:routes:strict (+6 more)

### Community 56 - "dev.mjs"
Cohesion: 0.15
Nodes (12): apiDir, children, envFile, executable(), nextArgs, nextCli, onlyUi, rawArgs (+4 more)

### Community 57 - "MessageReport"
Cohesion: 0.15
Nodes (13): MessageReport, CreatedAt, Id, Message, MessageId, Reason, Reporter, ReporterId (+5 more)

### Community 58 - "gen_seed_demo.py"
Cohesion: 0.18
Nodes (3): _fuzz(), main(), _sq()

### Community 59 - "Guid"
Cohesion: 0.08
Nodes (22): ConversationOptions, AutoArchiveDays, RatingsController, RatingStatsDto, AccountDeletionService, ActivityService, ChallengeService, ChallengeStats (+14 more)

### Community 60 - "ADR 0001: ADR agent and LLM-assisted review governance"
Cohesion: 0.22
Nodes (8): ADR 0001: ADR agent and LLM-assisted review governance, Agent roles we may use, Context, Decision, How this changes day-to-day work, Open questions, Problem, What agents must not do

### Community 61 - "ILogger"
Cohesion: 0.19
Nodes (5): 4A. Support, Operations & Incident Change Protocol (MANDATORY), DbInitializer, GeoResolveService, GoogleBooksService, OpenLibraryService

### Community 62 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:ui, lint, start, verify:map

### Community 63 - "ADR 0002: In-memory test factory integration and end-to-end smoke verification"
Cohesion: 0.13
Nodes (13): PasswordHasher, PasswordHasherTests, 1. External Docker / Testcontainers Only, 2. Unit Testing Controllers with Mocks, 3. Hermetic `WebApplicationFactory` with SQLite In-Memory & Test Cache + Real Live Smoke Runner, ADR 0002: In-memory test factory integration and end-to-end smoke verification, Consequences, Context (+5 more)

### Community 64 - "Deployment (Fly.io + Neon + Upstash)"
Cohesion: 0.22
Nodes (9): Architecture, Deploy, Deployment (Fly.io + Neon + Upstash), Environment, First-run admin, Local development, Map basemap tiles (ADR 0007), Rate-limit client identity (`Proxy:TrustedNetworks`) (+1 more)

### Community 65 - "UserContracts.cs"
Cohesion: 0.67
Nodes (3): BookshelfSummaryDto, PublicProfileDto, UpdateProfileRequest

### Community 66 - ".Update"
Cohesion: 0.48
Nodes (3): BookshelfEntryDto, UpdateBookshelfRequest, BookshelfController

### Community 67 - "Design system"
Cohesion: 0.29
Nodes (7): Accessibility checklist, Design system, Motion, Principles, Theming, Tokens, Typography

### Community 69 - "http"
Cohesion: 0.20
Nodes (9): ASPNETCORE_ENVIRONMENT, applicationUrl, commandName, dotnetRunMessages, environmentVariables, launchBrowser, profiles, http (+1 more)

### Community 70 - "Decisions"
Cohesion: 0.22
Nodes (9): 1. EF Core Code-First Migrations, 2. Neon Connection String Separation, 3. Fly.io Migration Bundle & Release Command, 5. Local GitHub Actions via Docker (`act`), ADR 0009: EF Core Code-First Migrations, Hybrid Email Delivery, Neon Database Separation, and Fly.io CI/CD Pipeline, Consequences, Context, Decisions (+1 more)

### Community 71 - "API reference"
Cohesion: 0.18
Nodes (11): Account deletion, API reference, Auth, Auth, Books & bookshelf, Conversations & messages, Discovery, Gamification — streaks & badges (+3 more)

### Community 72 - "adr/README.md"
Cohesion: 0.40
Nodes (4): 2. Curiosity Vectors Architecture (Roadmap), ADR 0008: Curiosity Vectors and Discovery Query Hardening, Consequences, Decisions

### Community 73 - "Roadmap"
Cohesion: 0.22
Nodes (9): Phase 0 — Foundation ✅, Phase 1 — Core user & bookshelf ✅, Phase 2 — Geolocation & discovery ✅, Phase 3 — Micro-conversations ✅, Phase 4 — Social graph & feed ✅, Phase 5 — Affiliate integration 🔨, Phase 6 — Hardening & community (ongoing), Phase 7 — Self-publishing foundation (exploratory) (+1 more)

### Community 74 - "EmailOptions"
Cohesion: 0.14
Nodes (14): EmailOptions, FromEmail, FromName, Provider, Resend, Smtp, ResendOptions, ApiKey (+6 more)

### Community 75 - "CLAUDE.md"
Cohesion: 0.25
Nodes (6): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, 5. UI/UX Changes, graphify

### Community 76 - "ADR 0005: Signed-in home dashboard, cookie-presence routing, and single auth gate"
Cohesion: 0.25
Nodes (7): 1. Client-only redirect in each authed page, 2. Validate `curio_rt` in middleware via API round-trip (rejected), 3. Cookie-presence `proxy.ts` + `AuthGate` + `/home` dashboard (chosen), ADR 0005: Signed-in home dashboard, cookie-presence routing, and single auth gate, Options considered, Problem, Verification

### Community 77 - "Architecture Decision Records"
Cohesion: 0.25
Nodes (8): Agent roles in this repo, Agents and ADRs, Architecture Decision Records, How ADRs are written, Index, Source of truth, Status labels, What belongs here

### Community 78 - "Data model"
Cohesion: 0.29
Nodes (7): Books & bookshelf, Conversations & messages, Data model, Discovery & feed, Privacy invariants (enforced in code, not just docs), Self-publishing foundation (Phase 7), Users & identity

### Community 79 - "layout.tsx"
Cohesion: 0.19
Nodes (10): Architecture, Backend design, Frontend design, Non-functional, System overview, inter, metadata, RootLayout() (+2 more)

### Community 80 - "CurioMap"
Cohesion: 0.18
Nodes (11): Contributing, Credits and data sources, CurioMap, Documentation, Features, How it fits together, License, Privacy, in one paragraph (+3 more)

### Community 81 - "StreakActivity"
Cohesion: 0.29
Nodes (7): StreakActivity, BookAdded, BookFinished, CircleCreated, CircleMessage, DirectMessage, Rating

### Community 82 - "Contributor Covenant Code of Conduct"
Cohesion: 0.29
Nodes (7): Attribution, Contributor Covenant Code of Conduct, Enforcement, Enforcement Responsibilities, Our Pledge, Our Standards, Scope

### Community 83 - "ADR 0007: OpenStreetMap basemap via Leaflet (supersedes ADR 0006)"
Cohesion: 0.29
Nodes (7): ADR 0007: OpenStreetMap basemap via Leaflet (supersedes ADR 0006), Chosen option, Consequences, Context, Open follow-ups (not covered by this ADR), Options considered, Verification

### Community 84 - "StreakController"
Cohesion: 0.30
Nodes (5): BadgeDto, LeaderboardEntryDto, StreakCalendarDto, StreakStatsDto, StreakController

### Community 85 - ".ToNpgsql"
Cohesion: 0.16
Nodes (4): CurioAvatars, DbUrl, CommonTests, DbUrlTests

### Community 87 - "ADR 0003: Privacy redaction breadth, dependency-free map, and bounded query hardening"
Cohesion: 0.33
Nodes (6): ADR 0003: Privacy redaction breadth, dependency-free map, and bounded query hardening, Consequences, Context, Negative / Trade-offs, Open follow-ups (not covered by this ADR), Positive

### Community 88 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 89 - "AuthResponse"
Cohesion: 0.11
Nodes (13): AcceptTermsRequest, AuthResponse, LoginRequest, RegisterRequest, ImportBookRequest, SetChallengeTargetRequest, ResolveReportRequest, UpdateLocationRequest (+5 more)

### Community 90 - "Privacy policy"
Cohesion: 0.33
Nodes (6): Data retention, Location visibility, Privacy policy, What public profiles never include, What we do not do, What we store

### Community 91 - "proxy.ts"
Cohesion: 0.40
Nodes (5): AUTH_ROUTES, config, INDEXABLE_PREFIXES, isIndexableRoute(), proxy()

### Community 92 - "Security Policy"
Cohesion: 0.25
Nodes (8): Disclosure, For maintainers and self-hosters, Reporting a vulnerability, Safe harbour, Scope, Security Policy, Supported versions, What to expect

### Community 93 - "Local development guide"
Cohesion: 0.14
Nodes (14): Accounts, demo data and admin access, Configuration, Database, Local development guide, Option A: one command (recommended), Option B: three terminals, Option C: everything in Docker, Ports and URLs (+6 more)

### Community 94 - "Options considered"
Cohesion: 0.50
Nodes (4): 1. No formal process for agent assistance, 2. Soft documentation only, no ADR discipline, 3. ADR-based governance with agents as drafters and reviewers, Options considered

### Community 97 - "ClientIpResolver"
Cohesion: 0.25
Nodes (4): ProxyOptions, ClientIpHeaders, TrustedNetworks, ClientIpResolver

### Community 99 - "docs/README.md"
Cohesion: 0.19
Nodes (7): Affiliate & ads policy, Documentation, Vision, Checklist, How to test, Notes for reviewers, What and why

### Community 101 - "ConversationContracts.cs"
Cohesion: 0.24
Nodes (8): CreateConversationRequest, CreateMessageRequest, MessageDto, ReactionResult, ReactionSummaryDto, ReportCreatedDto, ReportRequest, SetMessageStatusRequest

### Community 109 - "Maintainer guide"
Cohesion: 0.20
Nodes (10): Before you make the repository public, Day to day: triage and review, GitHub repository settings, Labels, Look after yourself, Maintainer guide, Releases, Replacing the placeholder repository URL (+2 more)

### Community 110 - "Governance"
Cohesion: 0.29
Nodes (7): Becoming a maintainer, Changing this document, Governance, How decisions are made, Principles, Releases, Roles

### Community 114 - "CircleStreakStats"
Cohesion: 0.33
Nodes (6): CircleStreakStats, ActiveToday, CurrentStreak, FreezeCount, LastActivityAt, LongestStreak

### Community 115 - "[Unreleased]"
Cohesion: 0.33
Nodes (5): Added, Changed, Changelog, Fixed, [Unreleased]

### Community 116 - "ADR 0006: Observatory map engine — superseding ADR 0003 rule 9"
Cohesion: 0.33
Nodes (6): ADR 0006: Observatory map engine — superseding ADR 0003 rule 9, Chosen option, Consequences, Context, Options considered, References

### Community 117 - "Consequences"
Cohesion: 0.50
Nodes (4): Consequences, Negative, Positive, Risks

## Knowledge Gaps
- **372 isolated node(s):** `Principal`, `UserId`, `IsAuthenticated`, `IsAdmin`, `Status` (+367 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 839 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppDbContext` connect `AppDbContext` to `CurioMap.Api.Common`, `ActionResult`, `BooksController`, `Book`, `ReadingCircle`, `IReadOnlyList`, `Message`, `.OnModelCreating`, `Enforced today`, `AccountDeletionTests`, `User`, `ILogger`, `WorkflowIntegrationTests`, `BookshelfEntry`, `DateTime`, `CircleReaction`, `ActivityEvent`, `Draft`, `Location`, `RefreshToken`, `CurioMap AI Agent Guidelines & Architecture Guardrails`, `CurrentUser`, `CircleReaction`, `MessageReport`, `Guid`, `ILogger`, `.Update`, `HandleGenerator`, `layout.tsx`, `StreakController`, `Local development guide`, `ConversationContracts.cs`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `AppDbContext` (e.g. with `4C. Architectural Fitness Functions Protocol (CI/CD Quality Gate)` and `4D. Advanced Fitness Functions Matrix (CI/CD Automated Invariants)`) actually correct?**
  _`AppDbContext` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Principal`, `UserId`, `IsAuthenticated` to the rest of the system?**
  _372 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CurioMap.Api.Common` be split into smaller, more focused modules?**
  _Cohesion score 0.05982905982905983 - nodes in this community are weakly interconnected._
- **Why does `search()` connect `index.ts` to `api`, `ResendEmailSender`, `layout.tsx`, `BookDetail.tsx`, `Local development guide`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `user.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Why does `Working on the API` connect `Local development guide` to `index.ts`, `AppDbContext`, `api`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._