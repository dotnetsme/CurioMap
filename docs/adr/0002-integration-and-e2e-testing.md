# ADR 0002: In-memory test factory integration and end-to-end smoke verification

Status: Accepted  
Date: 2026-09-14  
Replaces: none  
Related: `docs/architecture.md`, `docs/adr/0001-adr-agent-governance.md`, `AGENTS.md`

## Context

CurioMap has critical invariants that cross multiple controllers and services:
- anonymous intellectual identity and display mode resolution,
- fuzzed geolocation with public coordinate redaction,
- privacy-isolated bookshelves (preventing 403 leaks to other readers),
- rotating refresh tokens with reuse invalidation,
- gamification with deterministic UTC streaks, freezes, and badges,
- reading circles and realtime message threads.

Previously, unit tests only covered isolated mathematical helpers (`StreakMathTests`, `CommonTests`, `PasswordHasherTests`), while end-to-end smoke testing depended exclusively on live external Docker containers. Without automated HTTP pipeline tests in CI, regressions in middleware, route binding, rate limiting, and authorization policies could escape detection.

## Problem

Testing the full ASP.NET Core 10 pipeline against a live Neon Postgres cluster and Redis instance in standard local runs or ephemeral CI runners introduces flakiness, latency, and credential exposure hazards. We needed:
1. Fast, hermetic, zero-external-dependency HTTP integration testing that boots the real ASP.NET Core pipeline.
2. Full coverage of showstopper workflows: auth lifecycle, geolocation fuzzing, bookshelf privacy, reading streaks, and circle interactions.
3. An expanded multi-surface E2E smoke test suite for live local and staging deployments.

## Options considered

### 1. External Docker / Testcontainers Only
- Pros: Exercises identical PostgreSQL and Redis engines.
- Cons: Docker engine is not guaranteed to be running in all local development environments (e.g. lightweight developer laptops without Docker Desktop daemon active), causing immediate test aborts and blocking rapid feedback.

### 2. Unit Testing Controllers with Mocks
- Pros: Fast execution.
- Cons: Bypasses ASP.NET Core middleware, route parameter constraints, model binding, authorization policies, exception handlers, and JSON serialization. Known as "mock-the-mock" anti-pattern.

### 3. Hermetic `WebApplicationFactory` with SQLite In-Memory & Test Cache + Real Live Smoke Runner
- Pros:
  - Boots the entire ASP.NET Core 10 pipeline (controllers, middleware, auth handlers, validation).
  - Uses an isolated in-memory SQLite connection per test factory run (`DataSource=:memory:`), requiring zero external databases or containers.
  - Replaces Redis rate limiter and cache with in-memory test doubles that verify contract compliance.
  - Complemented by `scripts/smoke.ps1` for live multi-machine Docker and Fly.io deployment verification.
- Cons: Requires multi-provider EF Core compatibility guards for provider-specific column types (e.g., PostgreSQL `jsonb` / `smallint`).

This repo chooses option 3.

## Decision

1. **`CurioMapTestFactory` (`backend/tests/CurioMap.Api.Tests/CurioMapTestFactory.cs`)**:
   - Implements `WebApplicationFactory<Program>` with an in-memory SQLite database connection.
   - Provides `InMemoryTestCacheService` and `TestRateLimiter` to decouple from Redis during automated test runs.
   - Executes full HTTP requests against real controllers and DB context.

2. **Integration Test Suite (`backend/tests/CurioMap.Api.Tests/WorkflowIntegrationTests.cs`)**:
   - `Root_And_Health_Endpoints_Return_Ok`: Verifies root metadata and decoupled health check response.
   - `Auth_Lifecycle_Register_Login_Me_Logout_Works`: Tests account registration, unique handle generation (`^[a-z]+_[a-z]+_\d{3,4}$`), duplicate email rejection (409 Conflict), JWT Bearer authentication, and logout.
   - `Location_Privacy_Coordinates_Are_Fuzzed_And_Redacted_In_Public_Profiles`: Validates that geographic updates store fuzzed grid coordinates and public user profile responses never leak raw coordinates or email addresses.
   - `Bookshelf_Privacy_Private_Shelf_Is_Forbidden_To_Others`: Confirms that setting bookshelf visibility to private returns HTTP 403 Forbidden to unauthorized third-party callers.
   - `Gamification_Streaks_And_Badge_Endpoint_Lifecycle`: Validates streak stats retrieval, calendar generation, and freeze metrics.
   - `Reading_Circles_Creation_Listing_And_Joining`: Exercises circle creation, handle assignment, circle message posting, and multi-user membership.

3. **End-to-End Smoke Test Expansion (`scripts/smoke.ps1`)**:
   - Extended to verify the entire live user journey: Health -> Register -> Geo Update -> Book Search -> Shelf Add -> Conversation Thread -> Message Post -> Message Report -> Reading Circle Create -> Circle Message Post -> Streak Stats -> Discovery Map -> Frontend SSR Pages (`/`, `/books/:id`, `/circles`, `/discover/global`).

## Consequences

### Positive
- 100% automated test execution in `< 3s` without requiring Docker or network connectivity.
- Critical privacy invariants (location fuzzing, bookshelf isolation, PII redaction) are verified continuously on every build.
- Live E2E smoke tests cover both API and Next.js frontend pages.

### Negative / Trade-offs
- `AppDbContext.cs` must remain aware of database provider differences (`Database.IsNpgsql()`) when configuring provider-specific JSONB columns.

## Verification
- Backend integration suite executed and verified via `dotnet test backend/`.
- Pre-push code formatting verified via `dotnet format backend/ --verify-no-changes`.
