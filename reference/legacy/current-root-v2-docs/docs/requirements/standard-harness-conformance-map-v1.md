# Standard Harness Conformance Map v1

Derived from `standard-harness-final-product-requirements-v1.md`.

This document stages or explains requirements; it does not delete baseline requirements.

## Purpose

This map prevents `Core` from being mistaken for implementation order.

`Core` and `Extension` describe final-product layering.

Conformance levels describe delivery and assurance staging.

The map is intentionally grouped by capability area.

It does not replicate all baseline requirements as a 260-row table.

## Conformance Levels

### Kernel

Kernel is the minimum identity of Standard Harness.

Without Kernel, the product is no longer a harness.

Kernel must preserve packet, state, evidence, gate, role, closeout, and completion integrity.

Kernel can be small.

Kernel must be strong.

### Standard

Standard is the default capability set for ordinary LLM-assisted product development.

Standard adds practical registries, projections, context routing, review bundles, and operator repair flows.

Standard should be the normal target for the first useful product version after MVP hardening.

### Advanced

Advanced supports larger projects, multi-branch workflows, richer review, migration, policy versioning, broader automation, and stronger reporting.

Advanced should not block the first viable Kernel implementation.

### High-Integrity

High-Integrity supports signed, audited, regulated, security-sensitive, or strict compliance operation.

High-Integrity may add stronger identity, tamper evidence, retention, and stricter branch reconciliation.

## Conformance Slice Rule

When a baseline requirement is referenced by a lower conformance level, the conformance document must state whether the whole requirement or only a named minimum slice is required for that level.

If only a slice is required, the implementation trace must identify the included slice, deferred portions, and the invariant that must not be violated.

Grouped anchors are review-facing navigation. They are not enough by themselves for implementation planning.

## Kernel Map

Kernel includes the product thesis and non-negotiable invariants.

Primary anchors:

- `SH-VISION-001`
- `SH-VISION-002`
- `SH-INV-001`
- `SH-INV-002`
- `SH-INV-003`
- `SH-INV-004`
- `SH-INV-005`
- `SH-INV-006`
- `SH-INV-007`

Kernel includes the downstream document and conformance boundary.

Primary anchors:

- `SH-CONF-001`
- `SH-CONF-002`
- `SH-DOCBASE-001`
- `SH-CONF-003`

Kernel includes a minimal requirement registry and acceptance trace.

The Kernel slice of `SH-REQ-005` includes manual or explicitly supplied requirement registration, lifecycle status, source reference, approval decision, supersession link when applicable, and rejected or deferred rationale. Automated SSOT extraction, semantic diff automation, parser confidence handling, and source-range preservation are deferred unless manually supplied.

Primary anchors:

- `SH-SSOT-003`
- `SH-SSOT-004`
- `SH-SSOT-005`
- `SH-REQ-001`
- `SH-REQ-002`
- `SH-REQ-003`
- `SH-REQ-004`
- `SH-REQ-005`

Kernel includes local canonical state sufficient to support packets, evidence, gates, and closeout.

The Kernel slice of `SH-STATE-016` includes single-branch or single-worktree closeout-time drift detection, expected versus unregistered or ignored change classification, and closeout blocking for unregistered changes in packet-owned zones. Branch-switch-aware reconciliation, moved or deleted artifact reconciliation, external-tool drift repair workflows, and automated repair are later conformance work.

Primary anchors:

- `SH-STATE-001`
- `SH-STATE-002`
- `SH-STATE-003`
- `SH-STATE-004`
- `SH-STATE-007`
- `SH-STATE-008`
- `SH-STATE-014`
- `SH-STATE-016`

Kernel includes packet lifecycle and lightweight path.

Primary anchors:

- `SH-PKT-001`
- `SH-PKT-002`
- `SH-PKT-003`
- `SH-PKT-004`
- `SH-PKT-006`
- `SH-PKT-007`
- `SH-PKT-008`
- `SH-PKT-012`
- `SH-PKT-013`
- `SH-PKT-014`
- `SH-PKT-015`

Kernel includes preflight, gate, evidence, claim, and closeout minimums.

Primary anchors:

- `SH-GATE-001`
- `SH-GATE-002`
- `SH-GATE-003`
- `SH-GATE-004`
- `SH-GATE-005`
- `SH-GATE-006`
- `SH-GATE-008`
- `SH-GATE-009`
- `SH-PRE-001`
- `SH-PRE-002`
- `SH-EV-001`
- `SH-EV-002`
- `SH-EV-003`
- `SH-EV-004`
- `SH-EV-005`
- `SH-EV-012`
- `SH-EV-013`

Kernel includes focused runtime quality and review boundaries.

Primary anchors:

- `SH-TEST-001`
- `SH-TEST-002`
- `SH-TEST-003`
- `SH-TEST-004`
- `SH-TEST-007`
- `SH-TEST-009`
- `SH-TEST-010`
- `SH-REV-001`
- `SH-REV-002`
- `SH-REV-003`
- `SH-REV-005`
- `SH-REV-008`
- `SH-REV-009`

Kernel includes role authority and human ownership.

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
- `SH-HUMAN-006`

Kernel includes provider-neutral execution boundaries and safe degradation.

Primary anchors:

- `SH-ADAPT-001`
- `SH-ADAPT-002`
- `SH-ADAPT-003`
- `SH-ADAPT-004`
- `SH-ADAPT-005`
- `SH-ADAPT-006`
- `SH-ADAPT-007`
- `SH-DEGRADE-001`

Kernel includes operator usability for first packet operation.

Primary anchors:

- `SH-DOC-003`
- `SH-DOC-004`
- `SH-UXOPS-001`
- `SH-UXOPS-002`
- `SH-OPS-001`
- `SH-OPS-002`

## Standard Map

Standard adds richer generated projections, context routing, artifact governance, and practical review support.

Primary anchors:

- `SH-IA-001`
- `SH-IA-002`
- `SH-IA-003`
- `SH-IA-005`
- `SH-IA-008`
- `SH-IA-009`
- `SH-IA-011`
- `SH-DOC-001`
- `SH-DOC-002`
- `SH-CTX-001`
- `SH-CTX-002`
- `SH-CTX-003`
- `SH-CTX-006`
- `SH-CTX-007`
- `SH-CTX-008`
- `SH-CTX-009`
- `SH-MEM-001`
- `SH-MEM-002`
- `SH-MEM-005`
- `SH-MEM-006`

Standard includes domain-sensitive evidence types for normal web, API, CLI, and persistence work.

Primary anchors:

- `SH-EV-006`
- `SH-EV-007`
- `SH-EV-009`
- `SH-EV-010`
- `SH-EV-011`
- `SH-TEST-006`
- `SH-TEST-008`

Standard includes baseline security/data and supply-chain governance.

Primary anchors:

- `SH-SEC-001`
- `SH-SEC-002`
- `SH-SEC-003`
- `SH-SEC-004`
- `SH-SEC-005`
- `SH-SEC-006`
- `SH-DEP-001`
- `SH-DEP-002`
- `SH-DEP-003`
- `SH-DEP-004`
- `SH-IP-001`

Standard includes starter initialization, migration path, policy versioning, and behavioral eval seed.

Primary anchors:

- `SH-INSTALL-001`
- `SH-MIG-001`
- `SH-UPG-001`
- `SH-POLICY-001`
- `SH-DOG-002`
- `SH-DOG-003`
- `SH-DOG-004`
- `SH-EVAL-001`

## Advanced Map

Advanced includes practical multi-branch and larger-team support.

Primary anchors:

- `SH-STATE-015`
- `SH-STATE-017`
- `SH-STATE-018`
- `SH-WF-003`
- `SH-WF-008`
- `SH-WF-009`
- `SH-WF-010`
- `SH-WF-012`
- `SH-REV-004`
- `SH-REV-006`
- `SH-REV-007`
- `SH-ADAPT-008`
- `SH-ADAPT-011`
- `SH-ADAPT-012`

Advanced includes PMO and project reporting beyond basic state summaries.

Primary anchors:

- `SH-PM-001`
- `SH-PM-002`
- `SH-PM-003`
- `SH-PM-004`
- `SH-PM-005`
- `SH-PM-006`
- `SH-PM-007`
- `SH-PM-008`

Advanced includes profile-specific quality strengthening.

Primary anchors:

- `SH-PROFILE-002`
- `SH-PROFILE-003`
- `SH-PROFILE-005`
- `SH-DATA-001`

## High-Integrity Map

High-Integrity strengthens assurance, identity, tamper evidence, retention, and audited operation.

Primary anchors:

- `SH-STATE-005`
- `SH-STATE-006`
- `SH-STATE-012`
- `SH-STATE-013`
- `SH-HUMAN-007`
- `SH-NFR-002`
- `SH-NFR-003`
- `SH-NFR-005`
- `SH-NFR-006`

High-Integrity may also strengthen:

- `SH-STATE-018`
- `SH-DEP-004`
- `SH-SEC-006`
- `SH-POLICY-001`

## Mapping Rules

Kernel cannot waive the canonical trace chain.

Kernel cannot waive evidence provenance.

Kernel cannot waive human approval boundaries.

Kernel cannot waive role separation.

Kernel cannot treat generated projections as authority.

Standard may add automation, but it must not bypass Kernel.

Advanced may add multi-branch reconciliation, but it must not silently preserve stale claims.

High-Integrity may add stronger controls, but it must not make ordinary low-risk operation unusable.

## Review Focus

Reviewers should challenge this map before implementation slicing.

The most important question is whether Kernel is small enough to build and strong enough to preserve the product identity.

## Implementation Trace Appendix

Implementation planning must use a machine-readable requirement trace appendix with at least these columns:

```csv
requirement_id,classification,conformance_level,mvp_status,implementation_slice,notes
```

The trace appendix must identify every baseline requirement id. It must mark partial Kernel or MVP slices explicitly, including deferred portions that remain baseline requirements.

The companion appendix for this document set is `standard-harness-conformance-trace-v1.csv`.
