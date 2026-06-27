# Standard Harness MVP Cut v1

Derived from `standard-harness-final-product-requirements-v1.md`.

This document stages or explains requirements; it does not delete baseline requirements.

## Purpose

This document defines the first implementation slice.

It is not a deletion list.

It is not a replacement for the baseline.

It is not a full product roadmap.

The MVP must prove that Standard Harness can govern a real low-risk packet end to end.

The MVP must block unsupported completion claims.

The MVP must preserve the packet-state-evidence-gate-closeout chain.

## MVP Success Criteria

The MVP is successful when a fresh starter can:

- initialize the harness state
- create a low-risk packet
- register minimum requirements and acceptance criteria
- run readiness/preflight
- execute or record implementation evidence
- register an evidence manifest
- produce gate results
- produce a claim ledger state
- close or block the packet based on evidence
- regenerate current context projection
- explain blockers with structured diagnostics

Relevant anchors:

- `SH-CONF-002`
- `SH-INV-002`
- `SH-PKT-001`
- `SH-PRE-001`
- `SH-EV-012`
- `SH-GATE-004`
- `SH-DOC-004`
- `SH-UXOPS-002`

## Included in MVP

### Packet lifecycle minimum

Include packet creation, packet required fields, approval state, lifecycle state, version, risk class, and closeout state.

Primary anchors:

- `SH-PKT-001`
- `SH-PKT-002`
- `SH-PKT-003`
- `SH-PKT-007`
- `SH-PKT-008`
- `SH-PKT-014`
- `SH-PKT-015`

### Canonical local state minimum

Include a local state store, append-only event log, event envelope, basic projection rebuild, and state freshness metadata.

Primary anchors:

- `SH-STATE-001`
- `SH-STATE-002`
- `SH-STATE-003`
- `SH-STATE-004`
- `SH-STATE-007`
- `SH-STATE-008`
- `SH-STATE-014`

### Requirement and artifact registry minimum

Include stable requirement entries, acceptance criteria links, artifact registry entries, and source references.

MVP includes manual or explicitly supplied requirement registration, stable requirement id, proposed or approved status, acceptance criteria link, source reference, and completion classification.

MVP defers automated SSOT extraction, semantic diff automation, parser confidence handling, and source-range preservation unless those fields are manually supplied. Deferral does not weaken `SH-REQ-005`; it limits the first implementation slice.

Primary anchors:

- `SH-REQ-001`
- `SH-REQ-002`
- `SH-REQ-003`
- `SH-REQ-004`
- `SH-REQ-005`
- `SH-IA-002`
- `SH-IA-008`

### Evidence, claim, and gate minimum

Include evidence provenance, evidence manifest, claim ledger, gate result model, and non-waivable boundaries.

Primary anchors:

- `SH-EV-001`
- `SH-EV-002`
- `SH-EV-003`
- `SH-EV-004`
- `SH-EV-005`
- `SH-EV-012`
- `SH-GATE-004`
- `SH-GATE-005`
- `SH-GATE-006`
- `SH-GATE-008`

### Readiness and diagnostics

Include parsed readiness output, hard blocker detection, repair hints, and machine-readable diagnostic records.

Primary anchors:

- `SH-PRE-001`
- `SH-PRE-002`
- `SH-DOC-003`
- `SH-DOC-004`
- `SH-CTX-007`

### Role and human authority minimum

Include Human Owner, Planner, Developer, Tester, Reviewer, and PM Core reader/summarizer boundaries.

Primary anchors:

- `SH-AGENT-001`
- `SH-AGENT-002`
- `SH-AGENT-003`
- `SH-AGENT-006`
- `SH-AGENT-008`
- `SH-AGENT-009`
- `SH-HUMAN-001`
- `SH-HUMAN-002`
- `SH-HUMAN-004`
- `SH-HUMAN-005`

### Lightweight path

Include micro-packet and batched maintenance packet behavior for low-risk work.

Primary anchors:

- `SH-PKT-004`
- `SH-PKT-015`
- `SH-OPS-001`
- `SH-OPS-002`
- `SH-NONGOAL-007`

### Provider-neutral adapter skeleton

Include adapter identity, manifest, output envelope, mock restriction, and state mutation boundary.

MVP adapter contract testing is limited to manifest validation, output envelope parsing, direct canonical-state mutation rejection, mock-success rejection for production evidence, and basic failed or partial output classification. Full browser, device, cloud, and provider-specific adapter contract suites are deferred to later conformance levels.

Primary anchors:

- `SH-INV-001`
- `SH-ADAPT-001`
- `SH-ADAPT-002`
- `SH-ADAPT-003`
- `SH-ADAPT-004`
- `SH-ADAPT-005`
- `SH-ADAPT-006`
- `SH-ADAPT-007`

### Starter and first packet onboarding

Include initialization, starter contamination check, first packet path, and local safe degradation.

Primary anchors:

- `SH-INSTALL-001`
- `SH-DOG-003`
- `SH-DOG-004`
- `SH-UXOPS-001`
- `SH-UXOPS-002`
- `SH-DEGRADE-001`

### Contract and eval skeleton

Include enough contract tests and behavioral eval scaffolding to prevent the MVP from becoming narrative-only.

Primary anchors:

- `SH-DOG-002`
- `SH-EVAL-001`
- `SH-SELF-005`

## Deferred from MVP

These are staged, not rejected.

### Advanced Git reconciliation

MVP includes branch/worktree identity and a Kernel slice of filesystem drift detection: single-branch or single-worktree closeout-time detection of untracked or modified files, classification of expected versus unregistered or ignored changes, and closeout blocking for unregistered changes in packet-owned zones.

MVP defers automatic merge, rebase, cherry-pick, event import/export, review bundle survival workflows, moved or deleted artifact reconciliation, external-tool drift repair workflows, and branch-switch-aware reconciliation.

Primary anchors:

- `SH-STATE-016`
- `SH-STATE-015`
- `SH-STATE-017`
- `SH-STATE-018`

### Full PMO

MVP includes PM Core summaries.

MVP defers full WBS management, milestone baseline, periodic report cadence, schedule drift analysis, and dependency dashboard.

Primary anchors:

- `SH-AGENT-009`
- `SH-PM-001`
- `SH-PM-002`
- `SH-PM-003`
- `SH-PM-007`
- `SH-PM-008`

### High-Integrity mode

MVP defers signatures, stronger tamper evidence, enterprise retention, and high-assurance identity beyond the minimum local approval record.

Primary anchors:

- `SH-STATE-006`
- `SH-HUMAN-007`
- `SH-NFR-002`
- `SH-NFR-003`

### External dashboard and cloud orchestration

MVP remains repo-embedded and locally auditable.

External dashboards, remote agents, and cloud orchestration are deferred.

Primary anchors:

- `SH-FORM-001`
- `SH-FORM-002`
- `SH-FORM-003`
- `SH-WF-001`

### Broad domain profiles

MVP may include profile stubs.

MVP defers deep domain enforcement beyond the minimum risk taxonomy needed for the first packet.

Primary anchors:

- `SH-PROFILE-002`
- `SH-PROFILE-003`
- `SH-DATA-001`

## Explicitly Not MVP

MVP must not implement a production dashboard first.

MVP must not implement enterprise signing first.

MVP must not implement automatic multi-branch reconciliation first.

MVP must not implement full PMO reporting before packet/evidence/gate correctness.

MVP must not treat generated Markdown as canonical state.

MVP must not rely on natural-language completion claims.

MVP must not require multiple LLM providers.

MVP must not use a universal heavy review path for low-risk work.

Relevant anchors:

- `SH-STATE-002`
- `SH-EV-002`
- `SH-NONGOAL-003`
- `SH-NONGOAL-006`
- `SH-NONGOAL-007`

## MVP Acceptance Review

The MVP should be reviewed with one concrete scenario:

1. Initialize a starter project.
2. Create a low-risk documentation or command-inventory packet.
3. Run readiness.
4. Register evidence.
5. Produce a gate result.
6. Close the packet or block it with a repairable reason.
7. Regenerate context.
8. Show a human control snapshot.

If this scenario works, the harness has a real Kernel.

If this scenario only produces documents, the MVP has failed.
