# API reference

REST + JWT. Live machine-readable spec: **`/openapi/v1.json`**; human reference:
**`/docs`** (Scalar). Enums cross the wire as lowercase snake_case.

## Auth

| method | path | body / query | notes |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password }` | anonymous by default; auto-generates handle |
| POST | `/auth/login` | `{ email, password }` | returns `{ user, accessToken, expiresIn }` + sets refresh cookie |
| POST | `/auth/refresh` | cookie | rotates refresh token; also accepts `{ refreshToken }` |
| POST | `/auth/logout` | cookie | revokes refresh token |
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
| GET | `/books/search?q=` | local catalog + transparent Open Library import when empty; pg_trgm ILIKE |
| GET | `/books/:id` | detail + affiliate links + reader/conversation counts |
| POST | `/books/import` | admin-only; import a book by ISBN |
| GET | `/bookshelf/me` | my shelf |
| POST | `/bookshelf` | `{ bookId, status, visibility }` |
| PATCH | `/bookshelf/:entryId` | update status / visibility / timestamps |
| DELETE | `/bookshelf/:entryId` | remove |

## Discovery

| method | path | notes |
|---|---|---|
| GET | `/discover/nearby` | readers near you (city → region → country fallback); auth + location required |
| GET | `/discover/global` | region heatmap + top books (Redis-cached 5 min) |
| GET | `/discover/top-books?country=&region=` | top books, optionally scoped |
| GET | `/stats/summary` | global counters + top books (Redis-cached 5 min) |

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

## Auth

Bearer header `Authorization: Bearer <accessToken>`. Rotating refresh via the httpOnly
`curio_rt` cookie (or `{ refreshToken }` body). 401s are replayed once through `/auth/refresh`
by the web client.
