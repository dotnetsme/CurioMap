# infra/

Deployment building blocks.

- `api.Dockerfile` — .NET 10 API production image
- `web.Dockerfile` — Next.js standalone output production image
- `fly.api.toml` — Fly.io config for `curiomap-api`
- `fly.web.toml` — Fly.io config for `curiomap-web`
- CI/CD lives in `.github/workflows/ci.yml` (build + test + lint + deploy)

See [docs/deployment.md](../docs/deployment.md) for the full runbook.