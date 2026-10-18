# API reference

REST + JWT. Live machine-readable spec: **`/openapi/v1.json`**; human reference:
**`/docs`** (Scalar). Enums cross the wire as lowercase snake_case.

## Auth

| method | path | body / query | notes |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, acceptTerms }` | anonymous by default; auto-generates handle; `acceptTerms` must be `true` (omitting it is a 400) |
| POST | `/auth/login` | `{ email, password }` | returns `{ user, accessToken, expiresIn }` + sets refresh cookie |
| POST | `/auth/refresh` | cookie | rotates refresh token; also accepts `{ refreshToken }` |
| POST | `/auth/logout` | cookie | revokes refresh token |
| POST | `/auth/delete-account` | `{ password }` | permanently deletes the signed-in account (403 on wrong password); see *Account deletion* below |
| GET | `/auth/me` | — | `{ user }` (self view includes own fuzzed location) |

## Users & identity

| method | path | notes |
|---|---|---|
| GET | `/users/:id` | public profile: never email or coordinates; honors visibility |
| PATCH | `/users/me` | handle / avatar_id / display_name_mode / real_name / bio |
| GET | `/users/me/settings` | privacy + identity settings |
| PATCH | `/users/me/settings` | `{ locationVisibility?, bookshelfVisibility? }` |
| GET | `/users/:id/bookshelf` | public shelf (filtered by visibility) |
| GET | `/geo/me` · PATCH `/geo/me` | read / set coarse location (fuzzed on write) |
| GET | `/geo/ip` | country from proxy headers (cf-ipcountry / x-vercel-ip-country / x-geo-country) |

## Books & bookshelf

| method | path | notes |
|---|---|---|
| GET | `/books/search?q=&limit=&offset=` | local catalog + transparent Open Library import when empty; `limit` clamped to ≤ 50, `offset` bounded to ≤ 10,000 |
| GET | `/books/:id` | detail + affiliate links + reader/conversation counts |
| POST | `/books/import` | admin-only; import a book by ISBN |
| GET | `/bookshelf/me` | my shelf |
| POST | `/bookshelf` | `{ bookId, status, visibility }` |
| PATCH | `/bookshelf/:entryId` | update status / visibility / timestamps |
| DELETE | `/bookshelf/:entryId` | remove |

## Discovery

| method | path | notes |
|---|---|---|
| GET | `/discover/nearby` | readers near you (city → region → country fallback); auth + location required. Excludes private shelves; per-reader location redaction applies (country-only readers lose region/city) |
| GET | `/discover/global` | region heatmap + top books (Redis-cached 5 min). Hidden and private-shelf readers are excluded; country-only readers are bucketed under an empty region |
| GET | `/discover/map-readers?country=&region=&limit=` | anonymous drill-down of individual readers at fuzzed coords with their currently-read books (Redis-cached 2 min). `limit` clamped to ≤ 50; handles of anonymous readers return `"anonymous"`, country-only readers return `region: null, city: null` |
| GET | `/discover/top-books?country=&region=` | top books, optionally scoped |
| GET | `/stats/summary` | global counters + top books (Redis-cached 5 min) |

### Identity redaction

Every public user projection (feed, circles, messages, leaderboard, map, public
profiles) resolves `display_name_mode` through `DisplayName.Resolve` and, when
the mode is `anonymous`, replaces the generated handle with the literal string
`"anonymous"`. Profiles remain addressable by id (`/users/{id}`). Moderation
surfaces (`/admin/*`) are the exception: they keep the generated handle because
moderators need it to identify a report author.

## Conversations & messages

| method | path | notes |
|---|---|---|
| GET / POST | `/books/:bookId/conversations` | list / create (topic_type + optional prompt_key) |
| GET | `/conversations/:id` | detail (lazily archives inactive threads) |
| GET | `/conversations/:id/messages?limit=&offset=` | paginated, reactions summarized |
| POST | `/conversations/:id/messages` | profanity-filtered; Redis rate-limited |
| POST | `/messages/:id/report` | `{ reason }` |
| POST / DELETE | `/messages/:id/reactions` | `{ kind: insightful\|funny\|helpful }` |

## Social graph & moderation

| method | path | notes |
|---|---|---|
| POST / DELETE | `/follow/:userId` | follow / unfollow |
| GET | `/users/:id/followers` · `/following` | paged lists |
| GET | `/feed?limit=&offset=` | activity feed from followed users + self |
| GET | `/admin/reports?status=` | admin moderation queue |
| POST | `/admin/reports/:reportId/resolve` | `dismiss` / `mute_message` / `remove_message` |

## Gamification — streaks & badges

| method | path | notes |
|---|---|---|
| GET | `/me/streak` | my streak (current/longest, active-today, freezes) + earned badges; auth |
| GET | `/me/streak/calendar?days=` | my active-day calendar (UTC dates, 7–366 window); auth |
| GET | `/users/:id/streak` | a reader's public streak + badges; `403` when their bookshelf is private |
| GET | `/users/:id/streak/calendar?days=` | a reader's public active-day calendar; same visibility gate |
| GET | `/streaks/leaderboard` | top readers by current streak (public shelves only; Redis-cached 5 min) |
| GET | `/circles/:id/streak` | a circle's group streak (current/longest, freezes, active-today) |
| GET | `/circles?sort=streak` | circles ordered by current group streak (list items carry `currentStreak`/`longestStreak`) |
| POST | `/admin/gamification/backfill` | admin-only, idempotent: award badges readers already qualify for from historical data |

Streaks advance automatically when a reader adds/finishes a book, rates, or posts a
message (thread or circle). A circle's **group streak** advances when any member
posts a message; the same UTC-day gap and freeze rules apply, and hitting a 7- or
30-day group streak awards every current member the group badge. Days are UTC.
Every full 7-day streak week earns a
**freeze** (max 2 held); a freeze is consumed automatically for a single missed day,
preserving the streak — larger gaps still reset it. Badges: book milestones
(1/5/10/25/50/100 finished), streak milestones (3/7/30/100 days), first circle /
review / message, Night Owl + Early Bird (UTC-hour windows), Globetrotter (books
from 5+ authors), plus group badges earned with your circle (Book Club Captain at
a 7-day circle streak, Marathon Circle at 30).

Earning a badge (public-shelf readers only) also emits a `badge_earned` activity
event, rendered in followers' feeds with the badge name in the payload.

## Auth

Bearer header `Authorization: Bearer <accessToken>`. Rotating refresh via the httpOnly
`curio_rt` cookie (or `{ refreshToken }` body). 401s are replayed once through `/auth/refresh`
by the web client.

## Account deletion

`POST /auth/delete-account` (authenticated, `auth` rate limit) re-verifies the password, then in one
transaction removes the reader and what they authored. The foreign keys on messages, circles and reports are
`NO ACTION`, so `AccountDeletionService` handles each case explicitly:

- Deleted: profile, shelf, ratings, badges, streaks, follows, sessions, every message and circle message the
  reader posted, their reactions, and the reports they filed.
- A conversation they started that others replied to is kept and handed to the placeholder account
  `deleted_reader` (fixed id `00000000-0000-0000-0000-00000000de1e`, unusable credentials, reserved handle). One nobody
  replied to is deleted.
- A circle they created passes to its longest-standing other member (promoted to moderator); a circle with no
  other members is deleted.

Access tokens are stateless, so the deletion is also recorded in the cache (`deleted-user:{id}`) for the token
lifetime and `JwtBearer` rejects those tokens with a 401.
