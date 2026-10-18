# Maintainer guide

How to set up, run and look after the CurioMap repository as a public project. Contributors do not need to
read this; it is the checklist for whoever holds the keys.

- [Before you make the repository public](#before-you-make-the-repository-public)
- [GitHub repository settings](#github-repository-settings)
- [Labels](#labels)
- [Day to day: triage and review](#day-to-day-triage-and-review)
- [Releases](#releases)
- [Running a hosted instance responsibly](#running-a-hosted-instance-responsibly)
- [Starter issues to create](#starter-issues-to-create)
- [Look after yourself](#look-after-yourself)

## Before you make the repository public

Work through this once. Items marked **you** cannot be done from the codebase.

**Identity and links**
- [ ] **you**: create the GitHub organisation or decide the owner, then replace the placeholder `curiomap/curiomap`
      in the docs (see [Replacing the placeholder](#replacing-the-placeholder-repository-url)).
- [ ] **you**: make sure `security@curiomap.app` and `conduct@curiomap.app` (used in `SECURITY.md` and
      `CODE_OF_CONDUCT.md`) are real mailboxes you read, or change them to addresses you do control.
- [ ] **you**: fill in `.github/CODEOWNERS` (it is commented out until it names a real user or team).
- [ ] **you**: decide whether commits should show your personal email. The history currently carries the author's
      real address; GitHub offers a `noreply` address (Settings, Emails, *Keep my email address private*) for new commits.
      Rewriting existing history is possible but disruptive; do it **before** publishing, not after.

**Safety**
- [ ] Confirm no secrets are tracked: `git log --all -p | grep -iE "secret|token|password"` should show only the
      documented dev placeholders. (A scan of the current history found none.)
- [ ] Rotate anything that ever lived outside `.env.example`: your `FLY_API_TOKEN`, database URLs, Redis URLs.
- [ ] Production `JWT__SECRET` is fresh and random; `Seed__DemoReaders=false` in production
      ([deployment guide](deployment.md)).

**Legal and compliance** (this repository is not legal advice)
- [ ] Have someone qualified review [`terms-of-use.md`](terms-of-use.md), [`privacy-policy.md`](privacy-policy.md)
      and [`affiliate-ads-policy.md`](affiliate-ads-policy.md) before you accept real users. They commit you to
      specific promises (account deletion, no tracking, affiliate disclosure, age 16+).
- [ ] Affiliate programmes (Amazon Associates, Bookshop, Kobo) have their own terms, including disclosure wording
      and who may use the tag. Confirm you comply before the tag goes live (`Affiliate__AmazonTag`).
- [ ] If you operate for readers in the EU/UK, check your obligations as a data controller (lawful basis, a way to
      contact you, retention, breach notification). Account deletion and data minimisation are already built in.

**Product**
- [ ] The default map tiles are the OpenStreetMap volunteer servers. Their
      [usage policy](https://operations.osmfoundation.org/policies/tiles/) forbids heavy production traffic. Move to a
      self-hosted or paid tile provider via `NEXT_PUBLIC_MAP_TILE_URL` before you promote the site.
- [ ] Open Library asks API users to identify themselves: set `ExternalApis:UserAgent` to your project URL or a
      contact address on your deployment.
- [ ] Set up uptime monitoring and database backups (Neon point-in-time restore, or scheduled dumps).

## GitHub repository settings

Click-by-click, for a new repository. Most of these are free for public repositories.

**General**
- Description: *A live map of human curiosity. Open-source, privacy-first.* Website: your deployed URL.
- Topics: `reading`, `books`, `map`, `privacy`, `open-source`, `nextjs`, `dotnet`, `postgresql`, `leaflet`.
- Upload a **social preview** image (1280x640): Settings, General, Social preview. A crop of
  `docs/images/map.jpg` works well.
- Features: enable **Issues**, **Discussions** (create categories *Q&A*, *Ideas*, *Show and tell*, *Announcements*),
  and **Projects** if you want a public board. Disable Wiki (docs live in the repo).
- Pull requests: allow **squash merging only**, default to *Pull request title*; enable **Automatically delete
  head branches** and **Always suggest updating pull request branches**.

**Branch protection** (Settings, Rules, Rulesets; new ruleset targeting `main`)
- Require a pull request before merging, with **1 approval**, dismiss stale approvals on new commits and
  require review from Code Owners.
- Require status checks to pass: `API (build + test + migrations)`, `Web (lint + typecheck + build)`,
  `Container images (build only)`, `Analyze (csharp)`, `Analyze (javascript-typescript)`. Require branches to be up to date.
- Block force pushes and deletions. Require linear history.
- Optionally require signed commits.

**Code security** (Settings, Code security)
- Enable **Dependency graph**, **Dependabot alerts**, **Dependabot security updates** and **Dependabot version
  updates** (configured in `.github/dependabot.yml`).
- Enable **Private vulnerability reporting** (the link in `SECURITY.md` and the issue chooser relies on it).
- Enable **Secret scanning** and **Push protection**.
- **Code scanning**: the `codeql` workflow reports here once it has run.

**Actions** (Settings, Actions, General)
- Allow actions from GitHub and verified creators only. Workflow permissions: **Read repository contents**;
  require approval for workflow runs from **first-time contributors** (stops drive-by abuse of your CI minutes).

**Environments and secrets**
- Settings, Environments, create **`fly`** and add **Required reviewers** (yourself). The deploy job in
  `ci.yml` only runs on pushes to `main` and waits for that approval.
- Add the secret `FLY_API_TOKEN` to the `fly` **environment** (not as a repository secret).
- Fork pull requests never receive secrets and can never deploy.

**Moderation**
- Settings, Moderation: set interaction limits if you are ever overwhelmed, and enable
  **reported content** notifications.
- Pin a "Start here" discussion linking to `CONTRIBUTING.md`, the roadmap and good first issues.

### Replacing the placeholder repository URL

The docs assume the repository lives at `github.com/curiomap/curiomap`. Once you know the real owner and name:

```bash
# macOS / Linux / Git Bash
grep -rl "curiomap/curiomap" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next . \
  | xargs sed -i 's#curiomap/curiomap#YOUR-OWNER/YOUR-REPO#g'
```

Also replace `@curiomap/maintainers` in `.github/CODEOWNERS` and `@curiomap` in `GOVERNANCE.md`.

## Labels

Create these (Issues, Labels). New issues get `needs-triage` automatically from the templates.

| Label | Colour | Meaning |
|---|---|---|
| `bug` | `d73a4a` | Something is broken |
| `enhancement` | `a2eeef` | New feature or improvement |
| `documentation` | `0075ca` | Docs only |
| `good first issue` | `7057ff` | Small, well-scoped, mentored; ideal first PR |
| `help wanted` | `008672` | We would love a contribution here |
| `needs-triage` | `fbca04` | Not yet reviewed by a maintainer |
| `needs-info` | `e4e669` | Waiting for the reporter |
| `privacy` | `5319e7` | Touches personal data or location |
| `security` | `b60205` | Hardening (vulnerabilities go through private reporting) |
| `accessibility` | `1d76db` | a11y improvements |
| `design` | `f9d0c4` | UI / UX |
| `dependencies` | `0366d6` | Dependency updates (Dependabot) |
| `ci` / `docker` | `ededed` | Build and tooling |
| `duplicate` / `wontfix` / `invalid` | `cfd3d7` | Closed without action |

## Day to day: triage and review

Aim for **a first response within 3-5 days**. Even "thanks, I will look at this next week" keeps people engaged.

1. **Triage new issues** (`needs-triage`): reproduce, ask for missing info (`needs-info`), label, link duplicates,
   and add `good first issue` when the task is small and clear (write the hints in the issue: which files, what to test).
2. **Review pull requests**: be specific and kind, separate *must fix* from *nice to have*, and say what is great. Check
   the PR template items, especially privacy, tests and migrations. Squash-merge with a Conventional Commit title.
3. **Close the loop**: stale PRs (about 30 days without a reply) get a friendly nudge, then a polite close with an
   invitation to reopen.
4. **Security reports** arrive privately; acknowledge within 3 business days, work in a private advisory fork, and
   publish an advisory when the fix ships.
5. **Conduct reports** go to the address in the Code of Conduct. Handle them privately and consistently.

When saying no, say why, and thank the contributor. Most contributors who hear a respectful no come back with a better PR.

## Releases

CurioMap deploys continuously from `main` (behind the `fly` environment approval). For named releases:

1. Make sure `main` is green and `CHANGELOG.md` is up to date.
2. Move the `Unreleased` entries under a new `## [x.y.z] - YYYY-MM-DD` heading and update the compare links.
3. Tag and publish:
   ```bash
   git tag -a v0.2.0 -m "v0.2.0"
   git push origin v0.2.0
   ```
   then create a GitHub Release from the tag (*Generate release notes*, then edit with the changelog text).
4. Before 1.0, minor versions may contain breaking changes; call them out under **Changed** in the changelog.

## Running a hosted instance responsibly

You are operating a service that holds people's reading habits and coarse locations. Beyond the
[deployment guide](deployment.md):

- Keep dependencies patched (review Dependabot weekly) and rebuild images regularly for base-image fixes.
- Back up the database and **test a restore**. Know how to delete a user on request (they can do it themselves
  in Settings; you may still need to handle requests from people who can no longer sign in).
- Watch for abuse: the report queue at `/admin`, rate-limit `429`s and signup spikes. Admin access is granted
  only to emails listed in `Admin__Emails` at registration; keep that list short.
- Keep logs free of personal data and set a retention period.
- Publish an honest status page or at least a way to reach you when something is down.

## Starter issues to create

Seeding the tracker with clear, small tasks is the best thing you can do for first-time contributors. Create these
as `good first issue` + `help wanted`, each with the files to look at and how to test:

1. Add 8 new curated avatars (`frontend/lib/avatars.ts` + the avatar count in the API).
2. Add 6 new conversation prompts (`Prompts.All` + `lib/prompts`), with tests.
3. Add a "nothing here yet" illustration/empty state to the feed, bookshelf and circles pages.
4. Audit the map page for keyboard access and screen-reader labels; fix what you find (`accessibility`).
5. Add `aria-live` announcements for reaction counts and form errors (`accessibility`).
6. Show a "copy link" button on book and circle pages.
7. Add German or Spanish translations scaffolding (discussion first; this is a design decision).
8. Add Playwright smoke tests for sign-up, shelving a book and the map filters (`ci`).
9. Add pagination or "load more" to the circles list.
10. Write a dev-log post about how location fuzzing works, with a diagram (`documentation`).

## Look after yourself

A public project is a long game. You are allowed to be slow, to say no, to take a week off, and to ask for
help. Add co-maintainers early (see [GOVERNANCE.md](../GOVERNANCE.md)); a project with two people who can merge
survives holidays, burnout and bad weeks.
