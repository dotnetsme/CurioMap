# Architecture Decision Records

This directory records the non-obvious technical decisions behind CurioMap.

## What belongs here

An ADR is for a decision that:

- constrains the codebase for more than one session,
- has more than one reasonable option, or
- affects privacy, security, data model, or operational behavior.

Good examples from this repo:
- controllers without MediatR,
- privacy-first geolocation with fuzzed coordinates,
- Redis cache with fallback compute for discovery,
- JWT + rotating refresh tokens instead of session cookies.

Not every change needs an ADR. Refactors, content edits, and obvious fixes do not.

## How ADRs are written

- File name: `docs/adr/NNNN-short-title.md`
- Each ADR is immutable once accepted. If a decision changes later, write a new ADR and
  reference the old one. Do not overwrite history.
- Each ADR must state:
  - context
  - options considered
  - chosen option
  - consequences, including what becomes harder or more expensive

## Agents and ADRs

This repo treats LLM-assisted review as a contributor, not as an authority.

- Agents may draft ADRs, proposals, and review notes.
- Humans own acceptance, prioritization, and scope.
- Any ADR that affects privacy, security, auth, or data shape must be readable and challengeable
  by a person without needing to trust the agent that suggested it.
- Agent-generated text in an ADR should be traceable enough that a reviewer can see what was
  suggested, what was kept, and what was rejected.

## Status labels

- `Proposed` — written, not yet accepted.
- `Accepted` — approved for the codebase/roadmap.
- `Deprecated` — still historically true, but no longer the active decision.
- `Replaced` — another ADR supersedes this one.

## Agent roles in this repo

We talk about “ADR agents” as the set of review-oriented roles that may be surfaced through
LLM tooling. The repo does not assume a single monolithic agent. Possible roles include:

- **Architect reviewer**: checks consistency with existing ADRs, data model, and privacy/security
  constraints.
- **Proposal drafter**: turns a scope change into a structured proposal before work starts.
- **Critique agent**: looks for missing trade-offs, ambiguity, and hidden coupling.
- **Trace/consistency checker**: validates that code, docs, and ADRs still line up after a change.

The repo may use whichever of these roles are useful, but it never treats agent consensus as
proof. The bar is: if the agent were unavailable, could a human still make the same decision from
the written record?

## Source of truth

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/api.md`
- relevant ADRs in this directory
- implementation in `backend/` and `frontend/`

Docs that are not enforced by code or review are labeled as such. If a doc and the code disagree,
the code wins and the doc gets flagged for correction.

## Index

- [0001 — ADR agent governance](0001-adr-agent-governance.md)
- [0002 — Integration and E2E testing](0002-integration-and-e2e-testing.md)
- [0003 — Privacy redaction and map hardening](0003-privacy-redaction-and-map-hardening.md)
- [0004 — Read-only reads, archival, and concurrency](0004-readonly-reads-archival-and-concurrency.md)
- [0005 — Home dashboard and auth gate](0005-home-dashboard-and-auth-gate.md)
- [0006 — Observatory map engine (supersedes 0003 rule 9)](0006-observatory-map-engine.md)
- [0007 — OpenStreetMap basemap via Leaflet (supersedes 0006)](0007-openstreetmap-basemap.md)
