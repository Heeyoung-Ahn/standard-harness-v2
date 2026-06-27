# Standard Harness v2.2 P2 Conductor Guide

## Purpose

v2.2 keeps the Human Conductor / Plan-as-Code / Review-is-not-Deploy / Compound Loop operating model from v2.1 and hardens imported harness behavior into evidence-quality gates.

## Commands

- `npm run harness:p2 -- report --apply`: writes dashboard, stale learning index, and automation candidate reports.
- `npm run harness:reviewer-profile -- --work-item WI-01 --apply`: recommends specialist reviewers for a work item.
- `npm run harness:learning-staleness -- --apply`: scans compound learning notes for missing schema fields, stale references, expired verification, and duplicate learning overlap.
- `npm run harness:automation-candidates -- --apply`: promotes repeated manual friction into automation candidates.
- `npm run harness:refactor-audit -- --apply`: writes a read-only advisory report for oversized files, hotspots, duplicate command wiring, circular imports, boundary violations, and repeated logic candidates.
- `npm run harness:refactor-audit -- --apply --mode strict`: converts severe structure-debt findings into an audit `hold` without mutating code or workflow state.
- `npm run harness:ai-review-package -- --packet <packet-path> --work-item <work-item-id> --text "<bounded input>" --apply`: builds a redacted advisory AI-review input package.
- `npm run harness:ai-review-runner -- --apply --review-file reference/evidence/fixtures/advisory-ai-review.json`: validates provider-neutral advisory AI-review output and writes a bounded report.
- `npm run harness:directional-pilot -- --apply`: writes a repeatable direction-principle regression pilot report.
- `npm run harness:trace-matrix -- --apply --trace-file reference/evidence/fixtures/requirement-trace-matrix.json`: writes a requirement trace matrix report.
- `npm run harness:operator-digest -- --apply --digest-file reference/evidence/fixtures/operator-readiness-digest.json`: writes a unified operator readiness digest.
- `npm run harness:recovery-rehearsal -- --apply`: writes a report-first recovery rehearsal for generated-artifact drift, active packet/runtime mismatch, failed transition retry, partial pilot output, and unavailable state.
- `npm run harness:context-budget-policy -- --apply --mode warn --role reviewer --lane strict --read-files 9 --tokens 2500`: writes a role/lane context-budget policy report.
- `npm run harness:packaging-readiness -- --apply --readiness-file reference/evidence/fixtures/packaging-readiness.json`: writes a packaging, migration, and version readiness smoke report.
- `npm run harness:adapter-manifest -- --target codex --apply`: writes a cross-tool adapter manifest and reports unsafe paths or secret-like values.
- `npm run harness:review-scope`: validates review-scope artifacts in `.agents/runtime/reviews/scopes`.
- `npm run harness:review-findings`: validates review-finding artifacts in `.agents/runtime/reviews/findings`.
- `npm run harness:dashboard -- --apply`: writes the P2 conductor dashboard.
- `npm run harness:plan-quality -- --packet reference/packets/PKT-01.md`: checks plan-as-code quality.

## Evidence Philosophy

- Human conductor: the user owns taste, priority, ship value, and final approval.
- TDD as evidence: behavior-bearing code needs RED/GREEN/REFACTOR command evidence, not only a claim.
- CSO as evidence: security findings need phase, confidence, file/line, redacted quote, exploit scenario, impact, recommendation, and fingerprint.
- Parallel as lifecycle: parallel work needs baseline, isolation, dependency, actual-file, merge, post-merge test, and cleanup evidence.
- Review is read-only: review-scope artifacts must declare no-mutation or read-only mode.
- Compound loop: closeout creates learning and automation candidates, but stale or duplicate learning must be refreshed before reuse.

## Reviewer Profile Signals

`harness:reviewer-profile` includes `reviewerSignals` in JSON output:

- `positive`: reviewer escalation signals that selected a required reviewer.
- `negative`: explicit local-only/no-external-surface signals used to avoid over-escalation.
- `suppressed`: reviewer profiles intentionally not escalated because the matching terms appeared only in negated local-only context.

Local-only suppression must not override strong approval, RBAC, permission, audit, security, data, release, migration, external integration, core, contract, or high/critical risk signals.

## Memory, Refactor, And AI Review

- Learning lifecycle states include `active`, `stale`, `hold-pattern`, and `retired`. `hold-pattern` notes can intentionally cite failing verification as a known guard pattern; `retired` notes are archived and do not require active refresh.
- Refactor audit output is `read_only` and `advisory_only`. It identifies candidates for a future approved refactor packet; it must not mutate code, approve refactors, close technical debt, close packets, or release by itself.
- Refactor audit findings include `code`, `severity`, `confidence`, `rationale`, `nextAction`, and `recommendedPacketType`. Default mode is advisory. Strict mode may report `status: hold` for high-severity structure debt, but that hold is report evidence only and still requires a separate approved refactor packet.
- AI review packages are redacted, bounded, and advisory-only. Prompt-injection-like text is evidence only, and AI output cannot approve implementation, close packets, release, close risks, or override deterministic gates.
- Advisory AI review runner output validates mock/provider-neutral findings, disagreement disposition, redaction, and guard-overlay evidence. It is evidence only and cannot approve implementation, close packets, release, close risks, accept residual risk, override guard decisions, or prove product behavior.
- Context budget policy supports `advisory`, `warn`, and explicit `strict` hard-fail modes. Role/lane max-read and token violations block only in strict mode.

## Recovery And Context Budget Policy

`harness:recovery-rehearsal` is report-first and read-only. It classifies generated-artifact drift, active packet/runtime mismatch, failed transition retry, partial directional-pilot output, and unavailable state. It recommends `sync-state`, `context --repair`, transition retry, or environment recovery steps, but it cannot repair, approve, close packets, release, or accept residual risk by itself.

`harness:context-budget-policy` turns role/lane read limits into a concrete policy result. `advisory` mode records overrun evidence without blocking; `warn` mode produces a warning; `strict` mode returns a hard-fail policy result for max-read or token-budget violations. The policy report remains evidence only and cannot override packet, transition, review, or closeout authority.

## Packaging Readiness Smoke

`harness:packaging-readiness` checks maintainer-facing packaging readiness surfaces: payload boundary, starter copy/init evidence, command taxonomy, manual entry points, migration notes, version notes, rollback notes, and deprecated-doc policy. It separates `reusable_payload` checks from `initialized_project` checks so a clean starter payload is not confused with project-specific runtime state.

The report is evidence only. It cannot publish, deploy, approve release readiness, close packets, close risks, accept residual risk, or prove product behavior. Missing migration, version, or rollback notes produce actionable `hold` findings that require a separate packet or documentation correction before maintainers claim packaging readiness.

## Directional Regression Pilot

`harness:directional-pilot` generates evidence-only pilot instructions and a report skeleton for the full hardening wave. It separates clean-payload checks, initialized-project checks, product behavior checks, and harness structural/state validation. Its output maps evidence to every direction principle and has no approval, release, risk-closure, or packet-closeout authority.

## Requirement Trace Matrix

`harness:trace-matrix` turns explicit trace rows into a bounded JSON and Markdown report. Each row should cite a requirement id, packet path, implementation files, tests, evidence manifests, documentation, reviewer/security status, residual-risk disposition, and risk owner/impact/mitigation when risk is high or critical.

The matrix separates product behavior coverage from harness structural validation. Missing tests, evidence manifests, documentation, reviewer status, security review, or critical-risk owner/mitigation data remain `warn`, `hold`, or `block`. The report is evidence only: it cannot approve implementation, close packets, release, close risks, accept residual risk, or prove product behavior by itself.

## Unified Operator Readiness Digest

`harness:operator-digest` aggregates bounded readiness surfaces into one read-only operator report. It can summarize status, packet preflight, directional pilot, trace matrix, security review, browser evidence, context budget, recovery rehearsal, guard overlays, and open risk metadata.

The digest chooses one operator-facing `decision` and `nextAction`, but it does not replace the authoritative commands it summarizes. A digest cannot approve implementation, close packets, release, repair state, close risks, accept residual risk, or prove product behavior. If any authoritative surface would block, the digest must stay `block` or `hold`.
