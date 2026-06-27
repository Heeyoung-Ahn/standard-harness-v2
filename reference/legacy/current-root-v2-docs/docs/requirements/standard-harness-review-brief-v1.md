# Standard Harness Review Brief v1

Derived from `standard-harness-final-product-requirements-v1.md`.

This document stages or explains requirements; it does not delete baseline requirements.

## Purpose

This brief is the entry document for critical external review.

The baseline requirements file is intentionally broad.

It captures the full target product, not the first implementation slice.

Reviewers should not read the baseline as a direct MVP backlog.

Reviewers should read it as the long-term product requirements store.

The derived documents explain how that store is staged, reviewed, and made implementable.

## Review Audience

The primary audience is a critical reviewer.

The reviewer is expected to challenge structure, risk, scope, sequencing, and evidence.

The reviewer is not expected to approve implementation.

The reviewer is not expected to design the module architecture.

The reviewer is not expected to reduce the product vision to an MVP.

## Document Set

Read these documents in order:

1. `standard-harness-review-brief-v1.md`
2. `standard-harness-conformance-map-v1.md`
3. `standard-harness-mvp-cut-v1.md`
4. `standard-harness-architecture-contract-v1.md`
5. `standard-harness-validation-eval-contract-v1.md`
6. `standard-harness-conformance-trace-v1.csv` when implementation-level requirement staging is needed
7. `standard-harness-final-product-requirements-v1.md` when source detail is needed

The baseline is the source.

The derived documents are navigation, staging, and review aids.

If a derived document appears to weaken the baseline, the baseline wins.

If the baseline is unclear, the correct output is a clarification finding, not an implementation decision.

## Product Thesis

Standard Harness is a quality operating system for LLM-assisted product development.

It is not a prompt collection.

It is not a single-provider automation script.

It is not a project template alone.

Its central problem is not that LLMs are probabilistic.

Its central problem is that unsupported LLM output can become project truth.

The harness prevents that by controlling state, evidence, gates, roles, review, approval, and closeout.

Relevant baseline anchors:

- `SH-VISION-001`
- `SH-VISION-002`
- `SH-INV-002`
- `SH-INV-003`
- `SH-EV-003`
- `SH-GATE-004`
- `SH-HUMAN-001`

## What the Baseline Is

The baseline is a final-product requirements store.

It includes product requirements.

It includes architecture-contract-level product constraints.

It includes validation and operating constraints.

That is deliberate.

The baseline preserves requirements that later documents stage into implementation slices.

The baseline is not the MVP plan.

The baseline is not the storage schema.

The baseline is not the CLI specification.

The baseline is not the implementation backlog.

This boundary is stated by:

- `SH-CONF-001`
- `SH-CONF-002`
- `SH-DOCBASE-001`
- `SH-CONF-003`

## Known Design Strengths

The baseline has a strong canonical trace chain.

It rejects evidence-free completion claims.

It separates role authority.

It treats generated projections as derived state.

It distinguishes browser rendering from browser functional evidence.

It distinguishes DB schema proof from DB-backed runtime proof.

It supports risk-adaptive review instead of universal heavy review.

It includes prompt/context trust boundaries.

It includes behavioral evals for LLM workflow failure modes.

It preserves existing harness lessons while rejecting provider-specific implementation patterns.

Important anchors:

- `SH-SSOT-003`
- `SH-STATE-004`
- `SH-PKT-004`
- `SH-PKT-015`
- `SH-TEST-008`
- `SH-EV-009`
- `SH-CTX-008`
- `SH-EVAL-001`
- `SH-INHERIT-002`
- `SH-INHERIT-003`

## Known Review Risks

The baseline is large.

Most baseline requirements are classified Core.

Core does not mean MVP.

Core does not mean implementation priority.

Core means the final product cannot preserve integrity without that capability or boundary.

The conformance map exists to prevent this from becoming an impossible first implementation.

Reviewers should challenge whether each requirement group is correctly staged as Kernel, Standard, Advanced, or High-Integrity.

Reviewers should also challenge whether the MVP cut preserves the identity of the harness.

The most likely over-engineering risks are:

- treating every Core requirement as first-release work
- building advanced Git reconciliation too early
- building PMO dashboards before packet/evidence/gate correctness
- over-investing in generated reports before canonical state is reliable
- enforcing high-risk review burden on low-risk maintenance
- writing many documents without validator-backed behavior
- treating architecture-contract text as module design

## Reviewer Questions

Ask whether the Kernel conformance level is truly minimal.

Ask whether the MVP cut can create and close a real low-risk packet.

Ask whether the MVP cut can block unsupported completion claims.

Ask whether the MVP cut can distinguish pass, fail, blocked, stale, and not applicable.

Ask whether the MVP cut can preserve human approval boundaries.

Ask whether the architecture contract avoids premature DDL and module design.

Ask whether the validation contract is executable enough to prevent narrative-only pass states.

Ask whether low-risk lightweight paths preserve traceability.

Ask whether high-risk security, data, DB, browser, release, and UX cases remain protected.

Ask whether context trust rules prevent untrusted content from becoming instructions.

Ask whether evidence invalidation is granular enough to avoid both over-blocking and false confidence.

Ask whether generated projections are useful without becoming authority.

Ask whether the operator experience is usable without reading internal schema.

Ask whether the harness amplifies LLM strengths instead of only restricting LLM weaknesses.

Ask whether the harness can degrade safely when optional tools are unavailable.

Ask whether the existing harness lessons are preserved without inheriting its old implementation shape.

## Expected Review Output

The best review output is not general approval.

The best review output identifies:

- requirements that should move between conformance levels
- MVP inclusions that are missing
- MVP inclusions that are too ambitious
- architecture-contract boundaries that are still too design-specific
- validation/eval gaps that allow unsupported claims
- operator experience gaps that create avoidable friction
- trust boundary gaps around context, tools, plugins, or generated artifacts
- wording that weakens the baseline unintentionally

## Non-Review Goals

Do not ask this document set to select every implementation task.

Do not ask it to define every CLI command.

Do not ask it to define storage DDL.

Do not ask it to choose a final UI.

Do not ask it to replace the baseline.

Do not use the MVP cut to delete final-product requirements.

## Bottom Line

The current direction is sound.

The risk is not missing ambition.

The risk is failing to separate ambition from sequencing.

The review package exists to make that separation explicit.
## Review Severity Calibration

Use `critical` for findings that would break packet, state, evidence, gate, role, approval, closeout, or completion integrity.

Use `high` for findings that would make the MVP misleading, over-scoped, under-scoped, or hard to operate.

Use `medium` for findings that improve staging, terminology, reviewability, or implementation safety.

Use `low` for editorial clarity, duplicate wording, or optional reviewer convenience.

Do not mark a requirement as excessive only because it is not MVP.

Do mark it as excessive if the conformance map forces Advanced or High-Integrity work into Kernel.

Do not mark a deferred requirement as rejected.

Do mark it as risky if the deferred path removes a baseline invariant.

The most valuable review is specific about which document should change.

Reviewers should cite baseline IDs when recommending changes.
