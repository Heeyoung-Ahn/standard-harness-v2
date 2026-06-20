# Standard Harness Architecture Contract v1

Derived from `standard-harness-final-product-requirements-v1.md`.

This document stages or explains requirements; it does not delete baseline requirements.

## Purpose

This document extracts architecture-contract requirements from the baseline.

It does not define module layout.

It does not define database DDL.

It does not define CLI names.

It defines capability contracts that the architecture must preserve.

## Architecture Boundary

The architecture must keep product code, project operations, and harness system concerns separate.

The architecture must preserve the canonical trace chain.

The architecture must treat generated projections as derived state.

The architecture must make state mutations explicit.

Primary anchors:

- `SH-VISION-004`
- `SH-INV-002`
- `SH-STATE-002`
- `SH-STATE-004`
- `SH-ARCH-001`
- `SH-ARCH-003`

## State Kernel Contract

The state kernel must be repo-embedded, portable, queryable, and replayable.

It must support append-only events.

It must support schema versioning and migrations.

It must support event identity, causal order, actor, authority, transaction boundary, idempotency key, expected version, source snapshot, and projection watermark.

It must support point-in-time audit as a later conformance strengthening.

Primary anchors:

- `SH-STATE-001`
- `SH-STATE-003`
- `SH-STATE-007`
- `SH-STATE-008`
- `SH-STATE-009`
- `SH-STATE-012`
- `SH-STATE-014`

## Projection Contract

Human reports, Active Context, generated docs, PM summaries, and task views are projections.

They must record source event range, source snapshot or watermark, generator version, schema version, dependency digest, freshness status, and stale-consumer behavior.

Stale projections must not support approval, completion, or gate pass decisions.

Primary anchors:

- `SH-STATE-004`
- `SH-CTX-007`
- `SH-IA-011`
- `SH-MEM-001`
- `SH-MEM-006`

## Packet and Registry Contract

The architecture must model packet, requirement, acceptance criterion, artifact, evidence, claim, gate, review, and closeout as linked entities.

The requirement registry is the machine-facing completion source.

The approved SSOT remains the human-facing product meaning source.

Primary anchors:

- `SH-SSOT-003`
- `SH-REQ-001`
- `SH-REQ-002`
- `SH-REQ-003`
- `SH-REQ-004`
- `SH-PKT-001`
- `SH-PKT-002`
- `SH-PKT-012`
- `SH-PKT-013`

## Evidence Graph Contract

The architecture must support evidence provenance, evidence manifest, claim ledger, evidence graph links, and invalidation granularity.

Evidence must link to source tree or change-set hash, packet version, requirement version, test plan version, adapter version, runtime fingerprint, and environment fingerprint where applicable.

Evidence invalidation must not be all-or-nothing unless the affected scope is genuinely global.

Primary anchors:

- `SH-EV-001`
- `SH-EV-003`
- `SH-EV-005`
- `SH-EV-006`
- `SH-EV-007`
- `SH-EV-012`
- `SH-EV-013`

## Gate and Readiness Contract

The architecture must separate readiness, gate execution, gate result, waiver, and closeout status.

Readiness must parse active content.

Readiness status must distinguish ready, hold, blocked, stale, and failed.

Gate status must distinguish pass, fail, blocked, warning, not_applicable_recorded, stale, superseded, and human_decision_required.

Hold is not a gate pass status. A hold must route to repair, activation, approval, or missing-context handling before gate execution or closeout can claim success.

Declared gates must be activated in runtime state and validation reports.

Primary anchors:

- `SH-GATE-004`
- `SH-GATE-006`
- `SH-GATE-007`
- `SH-GATE-008`
- `SH-GATE-009`
- `SH-PRE-001`
- `SH-PRE-002`

## Adapter Boundary Contract

Adapters must be provider-neutral.

Adapters must not mutate canonical state directly.

Adapters submit typed outputs, artifacts, errors, and evidence through harness-controlled APIs.

The architecture must support contract tests for adapters.

Tool results must classify partial output, truncation, retry, timeout, auth failure, sandbox denial, network failure, crash, artifact completeness, and replay instructions.

Primary anchors:

- `SH-ADAPT-001`
- `SH-ADAPT-002`
- `SH-ADAPT-003`
- `SH-ADAPT-004`
- `SH-ADAPT-005`
- `SH-ADAPT-006`
- `SH-ADAPT-007`
- `SH-ADAPT-012`

## Filesystem and Git Drift Contract

The architecture must detect filesystem drift.

Kernel must support branch/worktree identity and closeout-time drift checks.

Advanced reconciliation may support merge, rebase, cherry-pick, event import/export, and review bundle survival.

Until advanced reconciliation exists, ambiguity must block claims or route to human decision.

Primary anchors:

- `SH-STATE-015`
- `SH-STATE-016`
- `SH-STATE-017`
- `SH-STATE-018`

## Starter and Migration Contract

The architecture must distinguish starter payload, generated state, local project evidence, and project-specific decisions.

Starter promotion must use a payload manifest and contamination scan.

Migration must import legacy material only through explicit mapping or historical reference.

Primary anchors:

- `SH-INSTALL-001`
- `SH-MIG-001`
- `SH-DOG-003`
- `SH-DOG-004`

## Architecture Non-Decisions

This contract does not choose SQLite table names.

This contract does not choose JavaScript, Python, or another runtime.

This contract does not choose CLI command names.

This contract does not require a dashboard.

This contract does not require cloud orchestration.

Those choices belong in implementation planning after the MVP cut is accepted.
