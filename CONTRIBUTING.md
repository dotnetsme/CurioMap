# Contributing to CurioMap

Thank you for being here. CurioMap is built in public, and every bug fix, avatar, conversation prompt, doc
improvement and idea makes the map of human curiosity a little richer. This guide explains how to get a change
merged with as little friction as possible. **You do not need to be an expert**: if something here is unclear,
that is a bug in this guide, so please tell us.

## Contents

- [Ways to contribute](#ways-to-contribute)
- [Ground rules](#ground-rules)
- [Your first contribution in 6 steps](#your-first-contribution-in-6-steps)
- [Set up your machine](#set-up-your-machine)
- [Making a good pull request](#making-a-good-pull-request)
- [Coding conventions](#coding-conventions)
- [Database changes](#database-changes)
- [Tests and checks](#tests-and-checks)
- [Review process](#review-process)
- [AI-assisted contributions](#ai-assisted-contributions)
- [Easy first contributions](#easy-first-contributions)
- [Reporting bugs, security issues and asking questions](#reporting-bugs-security-issues-and-asking-questions)
- [Licensing](#licensing-of-your-contribution)

## Ways to contribute

You do not have to write code. All of these are valuable:

- **Report a bug** or a confusing moment, with steps to reproduce.
- **Improve the docs**: fix a typo, clarify a step you stumbled on, add an example.
- **Design and accessibility**: contrast, keyboard navigation, screen-reader labels, motion, responsive layout.
- **Triage**: reproduce reported bugs, suggest labels, point duplicates at each other.
- **Add content**: curated avatars, conversation prompts, seed books (see [Easy first contributions](#easy-first-contributions)).
- **Fix a bug or build a feature** from an issue labelled `good first issue` or `help wanted`.
- **Review** other people's pull requests; thoughtful review is a contribution too.

## Ground rules

1. **Be kind.** Everyone must follow the [Code of Conduct](CODE_OF_CONDUCT.md). Be curious, be kind, be honest.
2. **Privacy is a feature.** Never add telemetry, analytics, exact coordinates, or new personal data without an
   issue approved first. Never log emails, tokens or locations. Treat fuzzed location, email addresses, private
   shelf entries and refresh tokens as the crown jewels.
3. **Open an issue before big changes.** For anything beyond a small fix, agree the approach in an issue first
   so nobody wastes a weekend on something we cannot merge.
4. **Keep pull requests small and focused.** One logical change per PR is reviewed in days; a 2,000-line
   rewrite is reviewed in weeks, if at all.
5. **No secrets, ever.** Do not commit `.env` files, tokens or real personal data, in code, tests, screenshots or
   issues. `.env.example` is the only env file in the repo.
6. **Security issues are private.** Do not open a public issue; follow [SECURITY.md](SECURITY.md).

## Your first contribution in 6 steps

1. **Find or open an issue.** Browse [`good first issue`](https://github.com/curiomap/curiomap/labels/good%20first%20issue)
   and [`help wanted`](https://github.com/curiomap/curiomap/labels/help%20wanted). Comment "I'd like to work on this"
   so two people do not collide; a maintainer will assign it to you.
2. **Fork** the repository and clone your fork.
3. **Create a branch** from `main`: `feat/short-description`, `fix/short-description` or `docs/short-description`.
4. **Set up and run the project** ([below](#set-up-your-machine)), make your change, and add or update tests.
5. **Run the checks** ([below](#tests-and-checks)) and make sure they pass.
6. **Open a pull request** against `main` and fill in the template. Link the issue with `Closes #123`.

## Set up your machine

The short version (full guide: [docs/development.md](docs/development.md)):

```bash
git clone https://github.com/<your-username>/curiomap.git
cd curiomap
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
(cd frontend && npm install)
npm run dev                     # Postgres + Redis (Docker), API on :8080, web on :3000
```

You need Docker, the .NET 10 SDK and Node.js 24. Prefer containers only? `docker compose --profile app up -d --build`.

Keep your fork current: `git remote add upstream https://github.com/curiomap/curiomap.git`, then
`git fetch upstream && git rebase upstream/main` before you open or update a PR.

## Making a good pull request

**Title and commits** follow [Conventional Commits](https://www.conventionalcommits.org/), which keeps history
readable and drives the changelog:

```
feat(web): add country filter to the nearby readers list
fix(api): reject empty circle names
docs: explain how to reset the local database
test(api): cover refresh token rotation
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`. Scope is `web`, `api`, `db`,
`infra` or omitted. Squash-merge is used, so the PR title becomes the commit message on `main`.

**The description** explains the *why*, not just the *what*. Include how you tested it and, for any UI change,
screenshots or a short recording in **both light and dark** themes and at a phone width.

**Checklist** (the PR template repeats this):

- [ ] Small and focused, linked to an issue
- [ ] Tests added or updated for behaviour changes
- [ ] All [checks](#tests-and-checks) pass locally
- [ ] Docs updated (`docs/api.md` for routes, README, `CHANGELOG.md` under *Unreleased*)
- [ ] No new telemetry, exact coordinates or personal data
- [ ] No unrelated reformatting or drive-by refactors

## Coding conventions

- **API**: REST, JSON, camelCase. Enums cross the wire as lowercase snake_case (`reading`, `region_city`).
  Controllers call services, services use EF Core; no MediatR. Validate input at the boundary and return
  problem details (4xx) rather than letting exceptions become 500s.
- **Database**: snake_case everywhere. See [Database changes](#database-changes).
- **Web**: TypeScript strict. All API access goes through `frontend/lib/api/*`, never `fetch` in a component.
  Pages are thin wrappers around `components/`.
- **UI**: follow the [design system](docs/design-system.md): theme tokens only (no hex or raw palette
  colours), check light **and** dark, respect `prefers-reduced-motion`, keep controls keyboard- and
  screen-reader-accessible.
- **Style**: `.editorconfig` configures your editor. C# is enforced by `dotnet format`, TypeScript by ESLint.
  Match the surrounding code; do not reformat code you are not changing.
- **Comments** explain *why*, not *what*. Delete dead code instead of commenting it out.

## Database changes

Schema and seed data are managed differently; getting this wrong is the most common first-PR mistake.

- **Schema** changes are **EF Core migrations**: `dotnet ef migrations add Name --project backend/src/CurioMap.Api`.
  Commit the migration and the updated model snapshot.
- **Never edit a migration or seed file that has already shipped.** Add a new one.
- **Seed SQL** (`backend/src/CurioMap.Api/Data/Migrations/*_seed_*.sql`) only runs on an *empty* database. To change
  data in existing databases, add an EF migration (see `20261018000100_BackfillBookTopics.cs` for the pattern).
- `0012` and `0013` were produced by `scripts/gen_seed_demo.py`, but regenerating does not reproduce the shipped files, and shipped seed files must not change. Use the script as a starting point for a **new** numbered seed file; never overwrite an existing one.
- Demo readers are fake and gated behind `Seed__DemoReaders` (on in Development, **off in production**).

## Tests and checks

CI runs these, so run them before you push. Details in [docs/development.md](docs/development.md#running-the-checks).

```bash
dotnet test backend/CurioMap.slnx                 # API tests (no Docker needed)
dotnet format backend/ --verify-no-changes        # drop the flag to auto-fix

cd frontend
npm run lint
npx tsc --noEmit
npm run build

npm run audit:routes:strict                       # from the repo root: every API route needs test coverage
```

Bug fixes should come with a test that fails without the fix. New behaviour needs tests that describe it.
The API suite runs on in-memory SQLite, so say in your PR how you verified anything Postgres-specific.

## Review process

- A maintainer replies to new pull requests **within about 3-5 days**. If you have heard nothing after a
  week, a polite nudge in the PR is welcome.
- At least **one maintainer approval** and a **green CI** are required to merge. Changes to auth, migrations,
  privacy-sensitive code or CI need a maintainer who owns that area (see `.github/CODEOWNERS`).
- Expect feedback; it is about the code, never about you. Push follow-up commits to the same branch, and
  reply to or resolve each comment.
- Maintainers may close PRs that go stale (about 30 days without a response), conflict with the roadmap, or
  expand scope without discussion. You are always welcome to reopen or resubmit.
- How decisions are made is described in [GOVERNANCE.md](GOVERNANCE.md).

## AI-assisted contributions

AI coding tools are welcome. The rules are the same as for any contribution, and **you are the author and are
responsible** for it:

- You must understand, have run, and be able to explain every line you submit.
- Do not submit large, untested generated changes or bulk "cleanup" PRs. Small, verified and discussed wins.
- Never paste secrets or personal data into a tool, and never include generated content you do not have the
  right to license under Apache 2.0.
- The repository contains `AGENTS.md` / `CLAUDE.md` with instructions for AI agents working on the codebase;
  the conventions in them are the same ones documented here.

## Easy first contributions

- **Curated avatars**: `frontend/lib/avatars.ts` plus the avatar count in `backend/src/CurioMap.Api/Common/Common.cs`.
- **Conversation prompts**: `Prompts.All` in the API and `lib/prompts` in the web app.
- **Seed books**: add a new numbered SQL file in `backend/src/CurioMap.Api/Data/Migrations/` (upsert keyed by ISBN, see `0010_seed_books_1.sql`), and an EF migration if existing databases should receive them.
- **Docs and accessibility**: anything that confused you on day one is a great fix.
- **UI polish**: spacing, empty states, loading states, focus rings; screenshots in light and dark.

## Reporting bugs, security issues and asking questions

- **Bug**: open an [issue](https://github.com/curiomap/curiomap/issues/new/choose) with steps to reproduce.
- **Question or idea**: use [Discussions](https://github.com/curiomap/curiomap/discussions).
- **Security vulnerability**: **do not** open a public issue. See [SECURITY.md](SECURITY.md).
- **Conduct concern**: see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licensing of your contribution

CurioMap is licensed under the [Apache License 2.0](LICENSE). By submitting a contribution you agree that it
is licensed under the same terms (Apache 2.0 section 5, "inbound = outbound"), and that you have the right to
submit it. There is no separate CLA to sign. Please do not add code you copied from sources with an incompatible
licence.

## Dev logs

If you build something interesting, write a short entry in [`docs/dev-log/`](docs/dev-log/). Building in public
is part of the culture here.
