# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (pre-1.0) | Best effort — security fixes land on `main` first |

## Reporting a vulnerability

**Do not open a public issue for security reports.** Instead:

- Email **security@curiomap.app** with a description, reproduction steps, and
  impact assessment. Encrypt with the maintainer's published key if handling
  credentials or PII.
- Expect an acknowledgement within **72 hours** and a fix timeline within
  **7 days** for confirmed high-severity issues (auth bypass, PII/location
  leak, token forgery, SQL injection).

Low-severity hardening ideas (headers, logging hygiene) are welcome as regular
public issues tagged `security`.

## Scope notes for reporters

CurioMap's crown jewels are explicit (see `AGENTS.md` §2.2): fuzzed location
coordinates, email addresses, private shelf rows, and refresh-token material.
Any endpoint returning unfuzzed coordinates, emails in public profiles, or
private shelf entries to third parties is treated as **high severity**.

Out of scope: spam/phishing reports against demo seed accounts, DoS of the
local docker-compose stack, and findings that require a compromised `JWT__SECRET`
(Fly secret management is an operator responsibility — see `docs/deployment.md`).

## Disclosure

We follow coordinated disclosure: reporters get credit (or anonymity on request)
once a fix ships. Fixes reference the report; reports are never used for
marketing without consent.
