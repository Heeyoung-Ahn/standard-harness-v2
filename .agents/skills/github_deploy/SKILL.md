---
name: github-deploy
description: Use for GitHub PR, GitHub Actions, environment, deployment, merge, release, or canary evidence. Collects GitHub deployment evidence and enforces branch, CI, approval, rollback, and post-deploy verification boundaries.
---

<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.
Source: reference/skills-src/github_deploy/SKILL.md.tmpl
Regenerate: npm run harness:skills-generate
Check: npm run harness:skills-check
-->
# GitHub Deploy

## Use When
Use when the release/deploy path uses GitHub PRs, Actions, environments, deployments, merge queues, or when the user asks to merge, deploy, ship, check CI, or verify deployment.

## Do Not Use When
Non-GitHub publish flows should use `general-publish`.

## Authority Boundary
This skill gathers GitHub evidence and prepares safe commands. It must not push directly to default branch for feature/release-impact work, use `git add -A` or `git add .`, merge/deploy without approval, approve CI/release/residual risk, or claim deployment success without fresh evidence.

## Required Inputs
Active packet, release approval status, branch and PR state, test/review/security evidence, GitHub CLI auth state, and deployment target/URL when required.

## Workflow
1. Resolve local state: `git status --porcelain`, `git branch --show-current`, `git rev-parse --abbrev-ref origin/HEAD`.
2. Resolve PR state with `gh pr view --json url,title,state,headRefName,baseRefName,mergeStateStatus,statusCheckRollup`.
3. Enforce branch safety. Stop on default branch with release-impact changes. Stage explicit files only.
4. Check CI with `gh pr checks`, `gh run list --branch <branch>`, and failed run logs when needed.
5. Detect deploy workflow in `.github/workflows/*deploy*`, `*release*`, or environment protection rules.
6. Prepare PR/release body via temp file and `--body-file`.
7. Merge/deploy only after approval.
8. Verify deploy: workflow run, deployment status, staging/canary/production smoke, URL or `not_run` reason.

## Evidence To Produce
- `reference/reports/github-deploy/<packet-id>.md`

## Output Format
| Check | Status | Evidence |
|---|---|---|

Include branch/PR state, CI, deployment, canary/smoke, approval boundary, verdict, next workflow, next first action, and do-not-cross.

## Stop Conditions
Stop when GitHub CLI is unavailable/unauthenticated, default branch would be modified, CI fails, merge conflicts exist, release approval is missing, target is ambiguous, post-deploy verification is impossible, or rollback is undefined.
