# Changelog

All notable changes to CurioMap are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/) once 1.0 is tagged.

Add your change under **Unreleased** in the pull request that makes it.

## [Unreleased]

### Added
- **Self-service account deletion** (Settings, Delete account; `POST /auth/delete-account`). Requires the
  password; removes the reader's profile, shelf, messages and reports they filed, hands conversations others
  replied to to a `deleted_reader` placeholder, and passes owned circles to the longest-standing member. Deleted
  readers' access tokens are rejected immediately. The last administrator cannot delete their account.
- Optional **fully containerised stack**: `docker compose --profile app up -d --build` runs the API and web app.
- Community and project-health files: contributing guide, governance, support, issue and pull-request templates,
  Dependabot, CodeQL, dependency review, `.editorconfig`, `.gitattributes`, `global.json`, `.nvmrc`.
- `docs/development.md` (local setup, configuration, database, troubleshooting) and `docs/maintainers.md`.
- Map category chips are built from real data and the activity panel has an accessible toggle.
- A descriptive `User-Agent` on Open Library / Google Books requests (`ExternalApis:UserAgent` to override).
- `DATABASE_URL` honours `?sslmode=disable|prefer|require`.

### Changed
- Registration now requires explicit consent: omitting `acceptTerms` is rejected (400).
- Session refresh has its own rate-limit budget (60/min) instead of sharing the 20/min sign-in budget.
- Book page copy says "discussions" instead of "circles" for conversation threads.
- Production images run as unprivileged users; the web image takes `API_INTERNAL_URL` as a build argument.
- CI runs with least-privilege permissions, builds both container images, and type-checks the web app.

### Fixed
- Two high-severity advisories in transitive production dependencies of the web app (`sharp`, `source-map-js`)
  via `npm audit fix`; production dependencies now audit clean.
- Deleting the last replier to a thread whose starter had already left no longer leaves an empty placeholder thread.
- Sessions were lost on every page reload and after 15 minutes: refresh failed (500) because a transaction
  ignored the retrying execution strategy, and concurrent refresh calls tripped token-reuse detection.
- Each database request leaked a Postgres connection (a new connection pool per request), taking the app down
  after roughly 100 requests.
- Joining a reading circle returned 500 (same transaction problem as above).
- The reading circle page was blank because the frontend expected a flat response; it now unwraps the API shape.
- `/me` showed "An unexpected error occurred" (challenge query used an unspecified-kind `DateTime`).
- **Fresh installs showed an empty map.** The demo-reader seeds stored enum values in lowercase
  (`'reading'`, `'public'`, `'region_city'`) while EF stores and queries `Reading`, `Public`, `RegionCity`, so every
  discovery query skipped all demo readers. A new seed script and migration normalise the values.
- A fresh database could not be seeded: seed SQL was parsed as a format string, the schema lacked the unique
  indexes and column defaults the seeds rely on, and a topic was never assigned to books, so every map category
  filter was empty.
- A rejected save on the settings page replaced the whole form with an error banner; errors are now inline.
- Anonymous visitors could "rate" a book and see a false success; `/feed` showed a raw "Unauthorized".
- Reserved handles (`admin`, `support`, ...) could be claimed.
- Map: the activity toggle was hidden under the site header, a category chip was clipped, and the panel covered
  the whole map on phones. Dashboard no longer overflows horizontally on phones.
- Container image builds failed (`dotnet ef migrations bundle` flags) and the seed generator wrote the wrong
  filenames.
- `.env.example` used `SEED_DEMO_READERS`, which nothing reads; the correct key is `Seed__DemoReaders`.

[Unreleased]: https://github.com/curiomap/curiomap/commits/main
