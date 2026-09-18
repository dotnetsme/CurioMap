# ADR 0004: Read-only conversation reads, hourly archival worker, and hardened startup/refresh concurrency

Status: Proposed
Date: 2026-09-18
Replaces: none
Related: `AGENTS.md` §2.5, `docs/adr/0001-adr-agent-governance.md`, `docs/adr/0002-integration-and-e2e-testing.md`

## Context

Two concurrency/correctness defects shipped in the `d4f0625` refactoring cycle:

1. **GET endpoints mutated state.** `ConversationsController.List`/`Get` lazily archived
   stale threads via `ExecuteUpdateAsync` on the read path. Reads that write break
   HTTP semantics, race with concurrent readers, and defeat output caching.
2. **Lock lifetime bug in `DbInitializer`.** The original code took a session-scoped
   `pg_advisory_lock(742019)` once, then committed each migration in its own
   transaction. A session lock held across commits serializes correctly but is never
   released until disconnect — on Fly multi-machine deploys a crashed applier could
   wedge every other instance behind the lock.
3. **Refresh rotation TOCTOU.** `RefreshTokenService.RotateAsync` read-then-wrote the
   token row without a row lock: two concurrent uses of the same token could both pass
   the `RevokedAt is null` check and mint two sessions. Reuse (theft signal) only
   returned `null` without wiping the token family.

## Options considered

### 1. Keep lazy archival on reads
Pros: no background infra, archival always fresh on view.
Cons: GET-with-side-effect anti-pattern; write amplification on every list call;
races between concurrent readers; incompatible with response caching.

### 2. Read-only reads + hourly `ConversationArchiver` worker (chosen)
Pros: reads are pure and cacheable; one writer (the worker) owns the transition;
startup sweep covers cold deploys; skipped on non-relational providers so the
SQLite hermetic suite stays hermetic.
Cons: up to 1h staleness between archival sweeps (mitigated: staleness is derived
in-memory per request via `IsArchived || LastActivityAt < cutoff`, so display is
always fresh even before the flag flips).

### 3. Session lock retained + `try/finally` unlock in `DbInitializer`
Pros: minimal diff.
Cons: still couples lock lifetime to connection lifetime; crash paths need care.

### 4. Transaction-scoped advisory lock per migration (chosen)
Each migration runs in its own transaction that first acquires
`pg_advisory_xact_lock(742019)`: concurrent Fly machines serialize on the lock and
the lock is **always** released on commit/rollback by Postgres itself. No unlock
code to forget, no wedge on crash.

### 5. `SELECT ... FOR UPDATE` on the refresh-token row + family wipe on reuse (chosen)
The rotation opens a transaction and locks the token row (`FOR UPDATE` on Npgsql;
transaction-serialized on SQLite/test providers). A reused (already revoked) token
now revokes the whole live family for that user before returning `null`, matching
the `AGENTS.md` §2.5 single-use rotation invariant.

## Decision

1. **Reads never mutate.** `ConversationsController` derives staleness in memory;
   persistence happens on write paths plus the hourly `ConversationArchiver`
   (`BackgroundService` + `PeriodicTimer(1h)`, startup sweep first).
2. **`DbInitializer` uses per-migration `pg_advisory_xact_lock`** and short-circuits
   to `EnsureCreatedAsync` on non-Npgsql providers (SQLite tests).
3. **`RefreshTokenService` locks the token row and wipes the family on reuse.**
4. **Null-body hardening:** `CreateForBook`/`PostMessage` take nullable request DTOs
   and return 400 with an explicit message instead of a 500 on empty bodies.

## Consequences

### Positive
- GET endpoints are pure, cacheable, and race-free.
- Migration locking is crash-safe by construction (xact-scoped).
- Refresh reuse is both detected and contained (family invalidation).

### Negative / Trade-offs
- `IsArchived` flags lag wall-clock staleness by up to one sweep interval; any
  consumer that filters on the raw flag (rather than the derived display value)
  must account for this.
- `ConversationArchiver` is an always-on background service in every API instance;
  on N-instance Fly deploys all instances sweep (idempotent `ExecuteUpdateAsync`,
  but N redundant writes/hour).

## Verification
- `dotnet test backend/` — hermetic suite incl. auth lifecycle (409 conflict, JWT,
  logout) and conversation archival display tests.
- `dotnet format backend/ --verify-no-changes`.
