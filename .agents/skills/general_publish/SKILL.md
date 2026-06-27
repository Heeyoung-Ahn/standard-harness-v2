---
name: general-publish
description: Use for release, publish, package, documentation, internal distribution, or non-GitHub deployment readiness. Produces publish readiness, rollback, evidence digest, and approval boundary before any irreversible action.
---

<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.
Source: reference/skills-src/general_publish/SKILL.md.tmpl
Regenerate: npm run harness:skills-generate
Check: npm run harness:skills-check
-->
# General Publish

## Use When
Use when the packet asks to publish a package, release documentation, distribute a build, deploy outside GitHub-specific flow, prepare release notes, verify release readiness, or perform release-lane closeout.

## Do Not Use When
Ordinary implementation, local-only tests, or GitHub PR/deploy flows should not use this skill. Use `github-deploy` for GitHub-specific flows.

## Authority Boundary
This skill prepares readiness evidence and release instructions. It must not execute irreversible publish/deploy actions, approve release readiness, or accept residual risk without explicit release approval.

## Required Inputs
Active packet, release lane status, release scope/target, required test/review/security/dependency evidence, rollback/backout plan, and approval record if already granted.

## Workflow
1. Classify publish type: docs, package/library, internal app deployment, report/export, configuration release, data/migration release.
2. Check irreversible boundary. Production, user-facing, data, external package, or release-artifact changes require explicit release approval.
3. Build readiness table: implementation complete, tests, review, dependency/security, migration/backout, release note, monitoring/canary, owner approval.
4. For first publish path, produce dry-run explanation showing target, commands, side effects, rollback, and verification; stop for approval.
5. Produce exact publish plan: command, expected output, verification, rollback.
6. After publish, verify canary/smoke or record `not_run` with blocker.

## Evidence To Produce
- `reference/reports/publish/<packet-id>.md`

## Output Format
| Gate | Required Evidence | Status | Path |
|---|---|---|---|

Include publish type, target, verdict, publish plan, release note, approval boundary, handoff, next action, and do-not-cross.

## Stop Conditions
Stop when release approval is missing, required evidence is missing, rollback is undefined for user/data impact, credentials or target are unclear, migration/data changes lack recovery, or canary verification is required but impossible.
