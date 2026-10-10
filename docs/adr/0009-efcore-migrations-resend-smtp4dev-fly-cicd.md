# ADR 0009: EF Core Code-First Migrations, Hybrid Email Delivery, Neon Database Separation, and Fly.io CI/CD Pipeline

- **Status**: Accepted
- **Date**: 2026-10-10
- **Decision owner**: Principal Full-Stack Architect
- **Scope**: Database schema lifecycle, email delivery architecture, Fly.io deployment, and local CI validation via Docker (`act`).

## Context

1. **Database Schema Lifecycle**:
   CurioMap previously tracked database changes via sequential, hand-written `.sql` scripts executed at application startup using PostgreSQL advisory locks. As the domain model expanded with check constraints (`ck_follow_no_self`), composite unique indexes, and trigram search indexes, manually maintaining parity between C# entities, `AppDbContext.cs`, SQLite test schemas, and raw SQL files became error-prone and lacked compile-time verification.
2. **Neon PostgreSQL Pooler Incompatibilities**:
   Neon provides two connection endpoints:
   - **Pooled (Port 6543 / PgBouncer)**: Transaction-level pooling designed for high-concurrency HTTP workloads, but incompatible with DDL transactions, session locks, and advisory locks.
   - **Direct (Port 5432)**: Session-level PostgreSQL connection required for schema migrations and DDL.
   Executing migrations on application startup against a pooled connection leads to transaction failures and connection resets.
3. **Multi-Machine Fly.io Startup Hazards**:
   Executing migrations inside `Program.cs` on horizontally autoscaled Fly.io machines causes concurrent migration races. Fly.io provides an isolated `release_command` lifecycle designed specifically to run migrations prior to rolling out new application machines.
4. **Email Delivery**:
   Development workflows require inspecting outbound authentication/invitation emails locally without risk of external delivery. Production environments require reliable email transport that circumvents cloud provider TCP port 25/587 throttling.
5. **Local CI/CD Testing**:
   Developers need the ability to validate GitHub Actions workflows locally inside Docker containers prior to pushing commits.

## Decisions

### 1. EF Core Code-First Migrations
- Replaced hand-written DDL SQL scripts with standard EF Core code-first migrations located in `backend/src/CurioMap.Api/Migrations/`.
- Domain invariants (self-follow check constraints, unique constraints on `(user_id, book_id)`, `(message_id, user_id, kind)`, `(circle_id, user_id)`, `email`, `handle`, `token_hash`) are configured explicitly in `AppDbContext.OnModelCreating`.
- Seed scripts (`0010_seed_books_1.sql` through `0014_seed_ratings_challenges.sql`) remain embedded and execute conditionally via `DbInitializer` when catalog tables are unseeded.

### 2. Neon Connection String Separation
- **Runtime Traffic (`DATABASE_URL`)**: Connects to Neon's pooled endpoint (`*.pooler.neon.tech:6543`) with `NpgsqlDataSourceBuilder.EnableDynamicJson()` for application queries.
- **Migration Execution (`DATABASE_MIGRATION_URL`)**: Connects directly to Neon's direct endpoint (`*.neon.tech:5432`) for running DDL statements and migration tracking.

### 3. Fly.io Migration Bundle & Release Command
- `infra/api.Dockerfile` installs `dotnet-ef` and compiles an executable migration bundle (`efbundle`) into `/publish/efbundle` during image build.
- `fly.api.toml` configures `[deploy] release_command = "sh -c './efbundle --connection \"${DATABASE_MIGRATION_URL:-$DATABASE_URL}\"'"`.
- Fly runs this command in a single ephemeral machine before swapping traffic to new machine instances. If migration fails, deployment halts safely without impacting existing machines.

### 4. Hybrid Email Delivery (`IEmailSender`)
- Defined `IEmailSender` abstraction in `Services/Email/`.
- **Local Development**: `SmtpEmailSender` routes through `smtp4dev:v3` running in Docker Compose (port 2525 for SMTP, port 5000 for the web mailbox UI).
- **Production**: `ResendEmailSender` posts directly to Resend's HTTPS API (`POST https://api.resend.com/emails`) with API key authentication, avoiding outbound SMTP port restrictions.
- **Hermetic Tests**: `CurioMapTestFactory` injects an in-memory `TestEmailSender` verifying outbound notifications without external dependencies.

### 5. Local GitHub Actions via Docker (`act`)
- Configured `.actrc` with `catthehacker/ubuntu:act-22.04` runner images.
- Added `.secrets.example` template (ignored in `.gitignore`) allowing engineers to test CI workflows locally with `act push` or `act -j api`.
- Updated `.github/workflows/ci.yml` with automated EF Core migration bundle verification.

## Consequences

- **Positive**:
  - Parity between C# entity models and PostgreSQL schema is verified at compile time.
  - Zero migration race conditions across auto-scaled Fly.io instances.
  - Safe DDL execution against Neon direct connection while application runtime benefits from pooled connections.
  - Emails are inspectable locally in real-time via `http://localhost:5000` with zero cloud dependencies.
  - Developers can run and debug GitHub Actions workflows locally inside Docker before pushing.
- **Negative / Constraints**:
  - Docker images require building the EF migration bundle during CI/CD.
  - Developers modifying domain entities must generate migrations using `dotnet ef migrations add <Name>`.
