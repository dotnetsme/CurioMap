# ADR 0001: ADR agent and LLM-assisted review governance

Status: Proposed  
Date: 2026-09-10  
Replaces: none  
Related: `docs/architecture.md`, `docs/data-model.md`, `docs/adr/README.md`

## Context

CurioMap is a small open-source stack with two runtimes, a privacy-first data model, auth,
geolocation constraints, and a roadmap that will keep changing. Over time, more decisions will
be made with LLM assistance: drafting proposals, reviewing PR-style diffs, summarizing trade-offs,
and tracing how a change affects controllers, services, DB shape, and frontend routes.

We want that assistance without turning the repo into a black box where “the agent said so” is the
only record.

## Problem

Without a lightweight governance rule, LLM assistance can drift into:

- untracked assumptions,
- fake certainty,
- recommendations that contradict existing privacy or data constraints,
- duplicated or conflicting decisions across docs and code

This is especially risky for CurioMap because several decisions are not cosmetic:

- anonymous-by-default identity,
- coarse/fuzzed location storage,
- JWT + refresh token rotation,
- moderation and reporting flow,
- public profile never exposing email or exact location.

## Options considered

### 1. No formal process for agent assistance

Pros: fastest in the short term.  
Cons: tribal knowledge stays in prompts and sessions. Future reviewers cannot reconstruct why a
decision was made.

### 2. Soft documentation only, no ADR discipline

Pros: lower overhead than ADRs.  
Cons: easy to forget, hard to challenge, and tends to lose the rejected options.

### 3. ADR-based governance with agents as drafters and reviewers

Pros: decisions are written, dated, attributable, and challengeable. Agents can still do the useful
work: draft, compare, and trace.  
Cons: small overhead per non-obvious decision.

This repo chooses option 3 for the classes of decisions that matter.

## Decision

LLM-assisted review is allowed and encouraged for this repo, but only under the following rules.

1. Agents may draft ADRs, proposals, and review notes.
2. Humans approve, reject, or modify them.
3. If a change touches privacy, auth, data shape, moderation, or public-facing behavior, the
   decision must be explainable without reference to an agent rant or hidden prompt context.
4. An ADR must record:
   - the decision,
   - the options considered,
   - why the chosen option won,
   - what it makes harder,
   - any known open risk.
5. An ADR is immutable once accepted. Supersession happens by writing a new ADR and linking the old
   one.
6. Agent help must not be treated as proof. If a human could not reconstruct the decision from the
   written record, the record is incomplete.

## Agent roles we may use

This repo does not commit to a fixed multi-agent pipeline. It does commit to using agent roles only
when they improve clarity.

Likely useful roles:

- **Architect reviewer**  
  Checks whether a proposal fits existing ADRs, domain boundaries, and privacy constraints.

- **Proposal drafter**  
  Turns a scoped change into a short structured write-up before implementation starts.

- **Critique agent**  
  Looks for missing trade-offs, vague language, hidden coupling, and test/ops gaps.

- **Trace/consistency checker**  
  Confirms that docs, ADRs, and code still agree after a change. This is especially useful when a
  controller, contract, migration, or frontend route changes.

These roles may be implemented by one tool, several tools, or a human manually asking the right
questions. The repo cares about the outcome, not the label.

## What agents must not do

- Decide that an ADR is accepted.
- Finalize privacy or security postures without a human review path.
- Claim authority from prompt context or session history.
- Hide rejected options so thoroughly that the reasoning is unrecoverable.

## How this changes day-to-day work

- Before landing a non-obvious change, write or update the relevant ADR.
- If an agent suggests a decision, preserve the suggestion and the human rationale separately enough
  that later readers can tell them apart.
- If code and docs drift, fix the doc and note the drift. Do not let docs silently rot.

## Consequences

### Positive

- Decisions become reviewable and searchable.
- Agent assistance is bounded by a clear accountability model.
- Privacy and data decisions are less likely to be diluted by vague future edits.

### Negative

- Slightly more writing for non-obvious decisions.
- Requires discipline to keep ADRs concise instead of ceremonial.

### Risks

- If ADRs become too heavy, people will skip them and the process dies.
- If agent drafts are accepted wholesale, the governance adds bureaucracy without clarity.

Mitigation: keep ADRs short, decision-focused, and tied to real changes in the repo.

## Open questions

- Which agent-assisted checks should become a standard part of PR review for this repo?
- How much trace output is useful before it becomes noise?
- Should agent-supported review be required for auth, privacy, and data changes only, or for a
  broader set of changes?

For now, the intended scope is: use agent assistance for clarity and coverage, keep humans in the
loop for acceptance, and write ADRs when the choice is non-obvious or sensitive.
