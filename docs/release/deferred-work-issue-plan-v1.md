# Deferred Work Issue Plan v1

## Purpose

This plan records the GitHub issue titles, labels, and issue body files for work deferred from the `v0.1.0-mvp` release.

## Labels

```text
deferred
roadmap
conformance
adapter
dashboard
cloud
high-integrity
git
release-quality
```

## Issue Creation Commands

Run after GitHub CLI authentication is available:

```powershell
gh issue create --title "Deferred: Automated SSOT extraction" --label deferred --label roadmap --body-file docs/release/issues/deferred-automated-ssot-extraction.md
gh issue create --title "Deferred: Semantic diff automation" --label deferred --label roadmap --body-file docs/release/issues/deferred-semantic-diff-automation.md
gh issue create --title "Deferred: Full adapter contract matrix" --label deferred --label conformance --body-file docs/release/issues/deferred-full-adapter-contract-matrix.md
gh issue create --title "Deferred: Browser cloud and device adapters" --label deferred --label conformance --body-file docs/release/issues/deferred-browser-cloud-device-adapters.md
gh issue create --title "Deferred: Dashboard" --label deferred --label roadmap --body-file docs/release/issues/deferred-dashboard.md
gh issue create --title "Deferred: Cloud orchestration" --label deferred --label roadmap --body-file docs/release/issues/deferred-cloud-orchestration.md
gh issue create --title "Deferred: High-integrity signing" --label deferred --label conformance --body-file docs/release/issues/deferred-high-integrity-signing.md
gh issue create --title "Deferred: Advanced Git reconciliation" --label deferred --label conformance --body-file docs/release/issues/deferred-advanced-git-reconciliation.md
```

## Local Closeout Rule

If GitHub CLI authentication or network access is unavailable, keep these issue body files as local roadmap evidence and record the blocker in the final release-quality closeout.

## Observed Issue-Creation Blocker

Observed during release-quality closeout:

```text
"C:\Program Files\GitHub CLI\gh.exe" auth status
-> You are not logged into any GitHub hosts.
```

The issue body files under `docs/release/issues/` are ready for creation after maintainer authentication is available.
