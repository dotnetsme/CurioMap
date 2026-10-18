## What and why

<!-- Describe the change and, more importantly, the reason for it. Link the issue: "Closes #123". -->

## How to test

<!-- Steps a reviewer can follow, or the tests you added. Screenshots / a short recording for UI changes (light and dark). -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and this PR is small and focused
- [ ] `dotnet test backend/CurioMap.slnx` passes (if the API changed)
- [ ] `dotnet format backend/ --verify-no-changes` passes (if the API changed)
- [ ] `npm run lint` and `npx tsc --noEmit` pass in `frontend/` (if the web app changed)
- [ ] New or changed behaviour has tests
- [ ] UI changes follow [docs/design-system.md](../docs/design-system.md): theme tokens, light + dark checked, reduced motion respected
- [ ] Schema changes are a **new** EF Core migration (no edits to applied migrations or seed files)
- [ ] Docs updated (`docs/api.md`, README, CHANGELOG `Unreleased`) where relevant
- [ ] **Privacy:** no new telemetry, exact coordinates or personal data — or the issue discussing it is linked

## Notes for reviewers

<!-- Trade-offs, follow-ups, anything you want a second opinion on. -->
