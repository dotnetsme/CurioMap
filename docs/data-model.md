# Data model

Schema is owned by the SQL migrations in `backend/src/CurioMap.Api/Data/Migrations/*.sql`
(applied at startup, advisory-locked, Neon-compatible). EF Core maps to the same names via
the snake_case naming convention — keep the two in sync by adding a new migration, never
editing an applied one.

## Users & identity

| table | purpose |
|---|---|
| `users` | email (sign-in only), pbkdf2 password hash, handle, avatar_id, display_name_mode (`anonymous`/`pseudonymous`/`real_name`), optional real_name + bio, is_author, is_admin, location_id, location_visibility, bookshelf_visibility |
| `locations` | coarse country / region / city + `lat_fuzzed` / `lng_fuzzed` (0.15° grid, ~15 km). **No exact coordinates ever.** Unique on the (country, region, city) tuple |
| `follows` | social graph edge (follower_id → followed_id), self-follow blocked by CHECK |
| `refresh_tokens` | rotating refresh tokens; only the SHA-256 hash is stored |

## Books & bookshelf

| table | purpose |
|---|---|
| `books` | title, author, isbn (unique, lower), cover_url, description, `affiliate_links` (jsonb), `metadata` (jsonb); `pg_trgm` GIN indexes on title/author |
| `bookshelf_entries` | user × book relationship: status (`reading`/`finished`/`wishlist`), visibility (`public`/`private`), started_at, finished_at; unique per (user, book) |

## Conversations & messages

| table | purpose |
|---|---|
| `conversations` | book_id (or draft_id for Phase 7), topic_type (`general`/`chapter`/`theme`/`question`), title, prompt_key, created_by, is_archived, last_activity_at |
| `messages` | conversation_id, author_id, content, status (`visible`/`muted`/`deleted`) |
| `message_reactions` | lightweight reactions: `insightful` / `funny` / `helpful`; unique per (message, user, kind) |
| `message_reports` | reported_message_id, reporter_id, reason, status (`open`/`resolved_actioned`/`resolved_dismissed`); unique per (message, reporter) |

## Discovery & feed

| table | purpose |
|---|---|
| `activity_events` | feed events: type (`bookshelf_added`/`conversation_created`/`message_posted`), actor_id, book_id, conversation_id, message_id, jsonb payload |

## Self-publishing foundation (Phase 7)

| table | purpose |
|---|---|
| `drafts` | author workspace: author_id, title, description, status |
| `draft_chapters` | position, title, content — conversations can attach to drafts via `draft_id` |

## Privacy invariants (enforced in code, not just docs)

1. Location coordinates are fuzzed before they are ever written.
2. Public profile responses never include email or coordinates.
3. `hidden` location users are excluded from nearby + global map.
4. Private shelf entries are never returned to other users.
5. Refresh tokens are stored hashed; passwords stored as PBKDF2.
