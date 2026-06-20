# DR-0001 Release Tag Policy

## Status

Proposed

## Context

The MVP implementation is complete at the baseline test level. Release tagging must distinguish stable MVP evidence from later release-quality polish and deferred roadmap work.

## Decision

Use `v0.1.0-mvp` for the first MVP tag after the following are true:

- KFIX-001 MVP integrity hardening is closed.
- CI workflow exists and passes.
- `README.md` documents setup, test, CLI, validation, and starter boundaries.
- `CHANGELOG.md` records the MVP feature set.
- `docs/release/mvp-completion-note-v1.md` records verification evidence.
- Deferred final-product work is represented as GitHub issues or documented issue-creation blockers.
- Starter payload validation scans an external sample root.

Do not tag before those release-quality checks are complete.

## Consequences

The current pushed commit remains a development baseline. The tag marks the first release-quality MVP baseline, not merely the first implementation commit.

## Tag Command

After approval:

```powershell
git tag -a v0.1.0-mvp -m "Standard Harness v2 MVP"
git push origin v0.1.0-mvp
```
