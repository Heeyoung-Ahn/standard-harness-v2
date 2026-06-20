# Standard Harness Validation and Eval Contract v1

Derived from `standard-harness-final-product-requirements-v1.md`.

This document stages or explains requirements; it does not delete baseline requirements.

## Purpose

This document explains how the harness should prove claims.

It separates pass, fail, hold, stale, blocked, and not applicable.

It prevents implementation from treating document existence as evidence.

It prevents implementation from treating LLM confidence as validation.

## Validation Principles

No evidence means no completion claim.

Evidence existence is not enough.

Evidence must have provenance.

Gate results must identify checked claims.

Reviews must contain findings, unknowns, evidence references, risk classification, and recommendation.

Generated reports must not become authority.

Primary anchors:

- `SH-INV-003`
- `SH-EV-001`
- `SH-EV-002`
- `SH-GATE-004`
- `SH-REV-002`
- `SH-STATE-004`

## Status Semantics

### Pass

Pass means required checks ran against the correct packet, version, source, environment, and evidence.

Pass must reference structured evidence or artifacts.

Relevant anchors:

- `SH-EV-001`
- `SH-EV-002`
- `SH-GATE-004`

### Fail

Fail means the check ran and found a product, harness, policy, evidence, review, or conformance problem.

Failed evidence is still valid evidence.

Failed evidence must block the affected claim unless remediated, re-run, waived where waivable, or rebaselined by authorized decision.

Relevant anchors:

- `SH-GATE-006`
- `SH-TEST-008`
- `SH-EV-007`

### Hold

Hold means the harness cannot safely proceed because readiness, approval, required fields, policy, context, or gate activation is incomplete.

Hold is not pass.

Hold is not fail.

Hold is an operator repair state.

Hold is primarily a readiness or preflight status. Gate results must use the gate status model from `SH-GATE-006`, such as `blocked`, `warning`, `stale`, `superseded`, `not_applicable_recorded`, or `human_decision_required`.

Relevant anchors:

- `SH-PRE-001`
- `SH-PRE-002`
- `SH-DOC-004`

### Stale

Stale means the evidence, review, projection, claim, or gate result no longer matches its required source version or runtime context.

Stale claims must be revalidated, superseded, or explicitly handled.

Relevant anchors:

- `SH-EV-007`
- `SH-EV-013`
- `SH-REV-008`
- `SH-STATE-004`

### Blocked

Blocked means required evidence, approval, context, tool capability, security review, or human decision is unavailable.

Blocked status must identify the required repair or decision.

Relevant anchors:

- `SH-PRE-001`
- `SH-WF-006`
- `SH-DOC-003`
- `SH-DOC-004`

### Not Applicable

Not applicable must be recorded with rationale.

Not applicable must not hide a missing required gate.

Declared required gates cannot become not applicable unless authorized.

Relevant anchors:

- `SH-GATE-003`
- `SH-GATE-009`
- `SH-PRE-002`

## Gate Validation

Gate validation must enforce risk-tiered rules.

It must distinguish the baseline gate requirement levels: hard gates, conditional gates, and advisory gates.

Diagnostic output may separately classify messages by severity, including critical, high, medium, low, and info. Informational diagnostics are not a separate gate requirement level.

It must enforce non-waivable boundaries.

It must handle waiver lifecycle and invalidation.

Primary anchors:

- `SH-GATE-001`
- `SH-GATE-006`
- `SH-GATE-007`
- `SH-GATE-008`
- `SH-GATE-009`

## Evidence Validation

Evidence validation must check command, runner, provider/tool, timestamp, cwd or execution context, environment, artifact path, content hash, and binding to packet or decision.

The evidence manifest must be reviewable by operators and reviewers.

Evidence must be classified as passed, failed, blocked, stale, substitute, or not applicable with rationale.

Primary anchors:

- `SH-EV-001`
- `SH-EV-005`
- `SH-EV-012`
- `SH-EV-013`

## Runtime Validation

Tests must verify functional meaning.

Real runtime evidence is required for high/critical functionality unless a human-approved substitute is recorded.

Browser functional evidence must not be replaced by render-only evidence.

DB-backed runtime claims must not be replaced by schema-only evidence.

Primary anchors:

- `SH-TEST-001`
- `SH-TEST-004`
- `SH-TEST-005`
- `SH-TEST-008`
- `SH-TEST-009`
- `SH-EV-009`

## Review Validation

Review independence must be real.

Independent review must differ by role contract, immutable input bundle, scratchpad/session, first-pass judgment, authority boundary, and output schema.

Review reports must not pass only because they exist.

Primary anchors:

- `SH-REV-001`
- `SH-REV-002`
- `SH-REV-008`
- `SH-REV-009`

## Behavioral Eval Validation

Behavioral evals must cover LLM and workflow failure modes that ordinary unit tests do not catch.

Minimum eval themes:

- false completion
- unsupported evidence claim
- stale context use
- weak review
- scope creep
- bad test substitution
- prompt/context injection handling
- high-risk escalation
- low-risk lightweight path correctness
- tool failure misclassification

Primary anchors:

- `SH-EVAL-001`
- `SH-SELF-005`
- `SH-CTX-008`
- `SH-ADAPT-012`

## Structured Diagnostic Validation

Validators and preflight checks must emit stable machine-readable diagnostics and human repair text.

Diagnostics must distinguish product failure, harness state failure, tool failure, missing approval, stale projection, inactive gate, invalid enum, missing evidence, and blocked readiness.

Primary anchors:

- `SH-DOC-003`
- `SH-DOC-004`
- `SH-PRE-001`
- `SH-PRE-002`

## MVP Validation Minimum

The first MVP must validate one complete low-risk packet path.

The scenario must include readiness, evidence manifest, gate result, claim ledger, closeout or block, and regenerated context.

It must also include at least one negative case where a missing evidence item prevents a completion claim.

Relevant anchors:

- `SH-CONF-002`
- `SH-PKT-015`
- `SH-EV-004`
- `SH-EV-012`
- `SH-GATE-004`
- `SH-UXOPS-002`

## Anti-Patterns to Reject

Reject natural-language pass without evidence.

Reject review existence as review quality.

Reject screenshot existence as browser functionality.

Reject schema existence as DB runtime behavior.

Reject file existence as readiness.

Reject generated projection as approval authority.

Reject mock adapter success as production success.

Relevant anchors:

- `SH-INHERIT-003`
- `SH-EV-002`
- `SH-REV-002`
- `SH-TEST-008`
- `SH-EV-009`
- `SH-PRE-002`
- `SH-ADAPT-004`
