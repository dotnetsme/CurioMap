# Security Policy

CurioMap is a privacy-first project, so we take security reports seriously and are grateful for them.

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (pre-1.0) | Best effort. Security fixes land on `main` first. |

Once tagged releases exist, the latest release will be supported in addition to `main`.

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately, in either of these ways:

1. **GitHub private vulnerability reporting (preferred):**
   [Report a vulnerability](https://github.com/curiomap/curiomap/security/advisories/new)
   (repository **Security** tab, then **Report a vulnerability**).
2. **Email:** security@curiomap.app

Please include:

- what the issue is and the impact (what could an attacker read or do?),
- the affected endpoint, page or file, and the commit or version,
- clear steps to reproduce, or a proof of concept,
- any suggested fix, if you have one.

**Never include real users' personal data** in a report. Demonstrate with accounts you created.

### What to expect

- Acknowledgement within **3 business days**.
- A first assessment and a rough fix timeline within **7 days** for confirmed high-severity issues
  (authentication bypass, location or personal-data leak, token forgery, injection).
- Updates as we work on it, and notice before a fix ships.
- Credit in the advisory and release notes if you want it (or anonymity if you prefer).

## Scope

CurioMap's crown jewels are explicit (see `AGENTS.md` section 2.2): **fuzzed location coordinates, email addresses,
private shelf entries and refresh-token material.** Any endpoint that returns unfuzzed coordinates, emails in
public profiles, or private shelf entries to third parties, or any way to take over another account, is treated as
**high severity**.

In scope: the API (`backend/`), the web app (`frontend/`), the container and CI configuration, and the project's
documentation where it could mislead operators into an insecure setup.

Out of scope:

- Spam or phishing reports about the fake demo accounts (`seed.demo.*@curiomap.demo`).
- Denial of service against a local docker compose stack, or volumetric attacks of any kind.
- Findings that require a compromised `JWT__SECRET` or other operator-held secret (secret management is the
  operator's responsibility, see [docs/deployment.md](docs/deployment.md)).
- Missing best-practice headers or hardening ideas without a demonstrable impact: please open a normal public
  issue labelled `security` instead.
- Vulnerabilities in third-party services we depend on (Open Library, OpenStreetMap, Fly.io, Neon): report those
  upstream.

## Safe harbour

If you act in good faith (you test only against your **own local instance** or accounts you control, avoid
privacy violations and service disruption, do not access or modify other people's data, and give us reasonable
time to fix the problem before disclosing), we will not pursue legal action and will work with you on a fix.
Please do **not** test against a production deployment without the operator's explicit permission.

## Disclosure

We follow coordinated disclosure. Reporters get credit (or anonymity on request) once a fix ships. Fixes
reference the advisory, and reports are never used for marketing without consent.

## For maintainers and self-hosters

- Never reuse the public development `JWT__SECRET` from `.env.example`; production must set a fresh random value.
- `Seed__DemoReaders` must be `false` in production.
- Keep Dependabot alerts, secret scanning with push protection and CodeQL enabled (see the
  [maintainer guide](docs/maintainers.md)).
