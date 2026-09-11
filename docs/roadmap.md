# Roadmap

Tracked publicly on GitHub Projects; issues carry `good first issue` and `help wanted`
labels. Status tiers: ✅ shipped · 🔨 in progress · 📋 planned.

## Phase 0 — Foundation ✅
- Repo with Apache 2.0, CONTRIBUTING, CODE_OF_CONDUCT, vision, architecture, roadmap
- .NET 10 API skeleton (controllers, health check, OpenAPI + Scalar docs)
- Data models + ordered SQL migrations + seed catalog (16 books by ISBN)
- Next.js 16 web app scaffold, design system, typed API client
- docker-compose (Postgres 5433 / Redis 6380), Fly.io configs, GitHub Actions CI/CD
- **MVP demo**: anonymous register → avatar + handle → bookshelf → conversations → map → feed ✅

## Phase 1 — Core user & bookshelf ✅
- Email/password auth with rotating refresh tokens
- Profile + identity modes (anonymous / pseudonymous / real_name), curated avatars
- Bookshelf add / status / visibility, public shelf
- **Build-in-public**: “I can register, set an avatar, and show my bookshelf.”

## Phase 2 — Geolocation & discovery ✅
- Coarse location capture + fuzzing (15 km), country/region/city visibility + full opt-out
- “Readers near you” (city → region → country), global curiosity map, top books per region
- Redis-cached aggregations (5 min), IP-country endpoint for visitors
- **Build-in-public**: screenshot the map + explain the privacy decisions

## Phase 3 — Micro-conversations ✅
- Book threads, prompt chips, lightweight reactions (Insightful/Funny/Helpful)
- Profanity auto-filter, report → admin moderation queue (mute / delete / dismiss)
- Ephemeral archiving after 30 days of inactivity
- **Build-in-public**: invite early users to discuss curated books

## Phase 4 — Social graph & feed ✅
- Follow / unfollow, followers/following lists
- Activity feed (bookshelf added, conversation created, message posted)
- `isFollowing` on profiles; follow buttons throughout

## Phase 5 — Affiliate integration 🔨
- ISBN-driven buy links (Amazon / Bookshop / Kobo, tag in config) ✅
- Curated override links per book (jsonb) ✅
- Affiliate & Ads Policy page ✅ · click tracking + numbers in dev logs 📋
- **Build-in-public**: publish click + revenue numbers each month

## Phase 6 — Hardening & community (ongoing)
- Test coverage expansion (controller/integration tests), perf tuning
- API/architecture docs polish, `good first issue` backlog (avatars, prompts, UI, book sources)
- Accessibility pass on the map + thread pages

## Phase 7 — Self-publishing foundation (exploratory)
- Author flag, drafts + draft chapters (tables live since Phase 0)
- Micro-conversations attached to drafts/chapters
- Validate whether readers want early-stage books
- Future (architected but not built): paid access, revenue sharing, “launch to followers”