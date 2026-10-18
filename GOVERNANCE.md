# Governance

CurioMap is a small open-source project. This page explains, lightly, how it is run, so contributors know what
to expect. It will grow with the community.

## Principles

1. **Privacy first.** When in doubt, protect readers. This outranks features and growth.
2. **Open by default.** Decisions, roadmap and dev logs are public; discuss in issues and Discussions.
3. **Small, kind, steady.** We prefer small changes, honest feedback and a welcoming tone
   (see the [Code of Conduct](CODE_OF_CONDUCT.md)).

## Roles

- **Maintainers** review and merge pull requests, triage issues, cut releases and enforce the Code of Conduct.
  They are listed in [`.github/CODEOWNERS`](.github/CODEOWNERS) and the repository's *Maintainers* team.
- **Contributors** are everyone who files an issue, improves docs or sends a pull request.
- **Founder / project lead:** [@curiomap](https://github.com/curiomap) has final say when the community
  cannot reach consensus (see below) and during the pre-1.0 period.

## How decisions are made

- **Everyday changes** (bug fixes, docs, small features): one maintainer approval and green CI.
- **Significant changes** (new data collected, schema or API breaking changes, new dependencies with
  licence or security implications, anything touching privacy): open an issue first. Maintainers aim for
  **lazy consensus**, meaning that if no maintainer objects within about **7 days**, the proposal proceeds. Record
  architectural decisions as an ADR in [`docs/adr/`](docs/adr/).
- **Disagreements:** discuss in the issue; if still stuck, the project lead decides and writes down why.
- **Privacy red lines** (no telemetry, no exact coordinates, no selling data) are not subject to a vote. Changing
  them requires an explicit, public proposal and the agreement of all maintainers.

## Becoming a maintainer

Maintainers are invited after a sustained record of good contributions (typically several merged,
non-trivial pull requests and thoughtful reviews over a few months) and alignment with the principles above. Any
maintainer can nominate; existing maintainers agree by consensus. Maintainers who are inactive for about 12 months
move to *emeritus* status with our thanks, and can return at any time.

## Releases

CurioMap uses [Semantic Versioning](https://semver.org/) once 1.0 is tagged. Notable changes are recorded in
[CHANGELOG.md](CHANGELOG.md). The release steps are in the [maintainer guide](docs/maintainers.md).

## Changing this document

Open a pull request. Governance changes need the agreement of all current maintainers.
