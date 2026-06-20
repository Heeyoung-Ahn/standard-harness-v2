# Standard Harness Final Product Requirements v1

## 0. Document Status

- Document type: final product requirements
- Scope: long-term product direction, not implementation plan
- Target product: Standard Harness for LLM-assisted product development
- Primary purpose: define what the finished product must become
- Out of scope: detailed implementation roadmap, module design, CLI command design, MVP task plan
- Downstream required documents: conformance map, architecture contract, validation and eval contract, MVP cut or implementation slice plan

## 1. Requirement Classification

This document does not use priority levels.

All requirements in this document describe the intended finished product. Classification only identifies product layering:

| Classification | Meaning |
| --- | --- |
| Core | Long-term operating foundation that must exist for the harness to preserve packet, state, evidence, gate, authority, closeout, and completion integrity. Core also identifies the skeleton that later capabilities must build on. |
| Extension | Capability built on top of the core foundation. Extension does not mean optional for the final product; it means the capability must not bypass or weaken the core. |

Implementation order, milestones, MVP cuts, release staging, and delivery sequencing must be defined in separate planning documents.

MVP selection must not delete requirements from this document. Later planning documents may stage, defer, or profile capabilities, but this file remains the full target product requirements baseline unless changed by an approved decision record.

Architecture-contract-level product requirements may appear in this document when they protect the long-term product foundation. Detailed module design, CLI command design, storage schema DDL, and implementation roadmap remain out of scope.

## 1A. Conformance and Downstream Document Boundaries

### SH-CONF-001 [Core] Conformance Level Mapping

Core and Extension classify product layering, not implementation order.

Before implementation planning, requirements must also be mapped to conformance levels:

- Kernel: minimum invariants without which the harness loses its identity
- Standard: default capability for ordinary product development projects
- Advanced: higher-complexity capability for larger, multi-branch, multi-role, or risk-sensitive operation
- High-Integrity: stronger assurance mode for signed, audited, regulated, or security-sensitive operation

Conformance levels must be recorded in a separate conformance map or implementation-slice document. The map must not delete or weaken requirements in this baseline.

### SH-CONF-002 [Core] MVP Cut Boundary

MVP selection must be a conformance and implementation-slice decision, not a rewrite of final product requirements.

The first viable MVP cut must include at least packet lifecycle, canonical local state minimum, append-only event log minimum, requirement registry minimum, artifact registry minimum, evidence manifest, claim ledger minimum, preflight/readiness result, gate result model, closeout check, role authority boundary, low-risk lightweight path, provider-neutral adapter skeleton, and contract/eval skeleton.

Any MVP exclusion of a final-product Core requirement must be recorded as staged, deferred, profile-gated, advanced, or high-integrity, with the invariant it must not violate.

### SH-DOCBASE-001 [Core] Downstream Contract Separation

This document is the final product requirements baseline.

Implementation must derive separate downstream documents for:

- Architecture Contract: state kernel, event model, adapters, evidence graph, projection, concurrency, and storage contracts
- Validation and Eval Contract: validators, gates, contract tests, behavioral evals, evidence checks, and anti-regression cases
- MVP Cut or Implementation Slice: delivery sequence, conformance level, implementation boundary, and staged exclusions

Downstream documents may refine how a requirement is implemented, validated, or staged, but must not redefine product meaning or remove approval, evidence, role, gate, or completion boundaries without an approved decision record.

### SH-CONF-003 [Core] Extension Semantics

Extension means a capability is built on top of the Core foundation or activated by profile, deployment mode, scale, or integrity level.

Extension does not mean the capability may bypass Core invariants, evidence provenance, role authority, gate rules, or closeout integrity. Downstream conformance mapping must state whether each Extension is Standard, Advanced, High-Integrity, profile-gated, or deferred for the current release.

## 2. Product Definition

### SH-VISION-001 [Core] Quality Operating System

Standard Harness must be a quality operating system for LLM-assisted product development, not merely an automation script, prompt collection, or project template.

It must govern requirements, architecture, implementation planning, coding, testing, review, security, UX, documentation, operational memory, project reporting, and improvement feedback through evidence-backed quality operations.

### SH-VISION-002 [Core] Purpose of the Harness

The purpose of Standard Harness is not to make probabilistic LLM output deterministic.

The purpose is to convert uncertainty, missing work, conflicting artifacts, overconfident claims, scattered files, stale documents, and context loss into manageable operational state through state, policy, evidence, registry, gate, review, memory, and human approval.

### SH-VISION-003 [Core] Target Domain

Standard Harness must target LLM-assisted product development, where LLMs participate in requirements analysis, architecture, implementation planning, coding, testing, review, documentation, reporting, and long-term memory management.

### SH-VISION-004 [Core] Good Harness Definition

A good harness must satisfy these properties:

- Core workflow survives changes in LLM models, IDEs, CLIs, browser tools, device tools, and cloud execution tools.
- All executable work is tracked through packet, state, evidence, gate, and closeout.
- Completion claims are linked to evidence and evidence provenance.
- Rules are enforced by schema, policy, validator, and state machine, not by prompt memory.
- Product code, project operations, and harness system are clearly separated.
- Failure, blocked state, exception, rollback, and human decision are as explicit as happy-path execution.
- Friction is accumulated as improvement candidates, but harness self-modification is governed.
- The base workflow is small and strong enough that future capabilities can be added without weakening it.

### SH-VISION-005 [Core] Bad Harness Definition

A bad harness is one where:

- There are many documents and prompts but no deterministic validation.
- Evidence existence is treated as proof without provenance.
- State is scattered across manual Markdown files with no canonical source.
- Agents create folders, files, reports, and code in unplanned locations.
- A model can claim implementation, test, review, and approval authority in the same role.
- Project completion can be declared while approved requirements remain unimplemented or unclassified.
- Human reviewers and LLMs both lose project-level control over the artifact set.

## 2A. LLM Work Product and Productive Use

### SH-LLM-001 [Core] LLM Work Product Classification

The harness must classify LLM outputs by authority and use, including draft, synthesis, source comparison, recommendation, patch proposal, test proposal, risk discovery, evidence claim, review finding, state mutation request, and approval request.

Drafts, synthesis, recommendations, and proposals may accelerate work, but they must not become authoritative state, evidence, approval, or completion claims until promoted through the required review, validation, evidence, gate, or human approval path.

State mutation requests must be explicit typed outputs. Natural-language intent alone must not mutate canonical state.

### SH-LLM-002 [Core] Productive LLM Use by Role

Each role contract must define how LLM strengths are intentionally used, including broad synthesis, fast drafting, source comparison, pattern detection, code/test generation, risk discovery, summarization, and candidate repair proposal.

Productive LLM use must include scope boundaries, required source references, allowed output classes, promotion path, and the point where human, validator, reviewer, or runtime evidence must take over.

The harness must preserve the LLM's speed and synthesis value while preventing unsourced output from becoming project truth.

### SH-LLM-003 [Core] Observation, Inference, Assumption, and Recommendation Separation

LLM reports that influence planning, risk, routing, review, approval, or completion must separate observation, inference, assumption, recommendation, confidence, and required human decision.

Unsupported assumptions and inferences must remain visible as assumptions until sourced, tested, reviewed, or approved.

## 3. Core Invariants

### SH-INV-001 [Core] Provider-Independent Core Workflow

The core workflow must not depend on any single provider or tool such as Codex, Claude Code, a specific browser tool, or a specific IDE.

### SH-INV-002 [Core] Packet-State-Evidence-Gate-Closeout Chain

Every executable change must be traceable through a single canonical trace model. This is the only normative trace chain in this document:

```text
top-level SSOT requirement
-> canonical requirement registry entry
-> decision record
-> packet
-> packet state/event
-> acceptance criteria
-> implementation artifact/change set
-> artifact/evidence
-> claim ledger entry
-> gate result
-> review/adjudication
-> closeout
-> project completion coverage
```

Shorter operational views and human reports may be generated from this model, but validators, closeout, and completion reports must resolve back to this canonical trace model.

### SH-INV-003 [Core] No Evidence, No Completion Claim

The harness must prevent completion claims that are not supported by evidence with provenance.

### SH-INV-004 [Core] No Memory Without Evidence

Operational memory must not record unverified claims as established project truth.

### SH-INV-005 [Core] No Harness Mutation Without Harness Packet

Changes to harness core, policy, schema, validator, workflow, adapter, profile, or templates must be managed as harness packets.

### SH-INV-006 [Core] No Implementation Without Required Approval

Implementation must not begin until the required packet planning approvals and challenge reviews are complete.

### SH-INV-007 [Core] No Project Completion With Unclassified Requirements

Project completion must be blocked if any approved requirement is unimplemented, partially implemented, or unverified without an explicit final status and human approval.

## 4. Product Form

### SH-FORM-001 [Extension] Hybrid Product Model

Standard Harness must be a hybrid product:

- repo-embedded core is the default
- external dashboard, cloud orchestration, reporting UI, and remote agent execution are optional extensions

### SH-FORM-002 [Core] Repo-Embedded Auditability

The project repository must contain the audit-critical state required to understand project decisions, packet states, evidence, gate results, closeouts, and operational memory.

External services may mirror, index, visualize, or orchestrate this state, but must not be the only source of audit truth.

### SH-FORM-003 [Core] External Platform Independence

Loss of an external dashboard or cloud orchestration service must not make packet history, evidence, decisions, closeout records, or project completion basis unrecoverable.

## 5. SSOT and Governance

### SH-SSOT-001 [Core] Top-Level SSOT Documents

The harness must support top-level SSOT documents for project direction. Their exact names may vary, but the product must support these SSOT categories:

- Requirements
- Architecture Guide
- Implementation Plan
- Design Guide
- Business Process Guide
- Security/Data Policy
- Quality Policy

### SH-SSOT-002 [Core] Decision Records as Approval History

Decision records must be the auditable history of approvals, changes, exceptions, conflict resolution, risk acceptance, and rejected alternatives.

### SH-SSOT-003 [Core] SSOT-to-Implementation Traceability

The harness must preserve an SSOT-facing projection of the canonical trace model defined in SH-INV-002. SH-SSOT-003 must not define a second canonical trace chain.

The SSOT-facing projection must resolve through:

```text
Top-level SSOT requirement
-> canonical requirement registry entry
-> decision record
-> packet
-> packet state/event
-> acceptance criteria
-> implementation artifact/change set
-> artifact/evidence
-> claim ledger entry
-> gate result
-> review/adjudication
-> closeout
-> project completion coverage
```

Human-readable SSOT reports may summarize this projection, but reports are generated views. Any validator or completion decision must be able to trace back to the full SH-INV-002 chain.

### SH-SSOT-004 [Core] Packet Cannot Exceed SSOT

Packet scope, acceptance criteria, and implementation plan must not exceed, contradict, or silently modify top-level SSOT.

### SH-SSOT-005 [Core] Implementation Cannot Exceed Packet

Implementation must not exceed packet scope or leave packet acceptance criteria unimplemented while claiming completion.

### SH-SSOT-006 [Core] Risk-Tiered SSOT Change Control

SSOT changes must be classified:

- Level 0: editorial change
- Level 1: clarification
- Level 2: semantic change
- Level 3: governance/risk change

Level 2 and Level 3 changes require human approval, impact analysis, and decision records.

### SH-SSOT-007 [Core] SSOT Change Impact Analysis

Semantic or governance/risk SSOT changes must identify affected requirements, packets, tests, evidence, gates, closed packets, follow-up packets, and project completion coverage.

### SH-SSOT-008 [Core] SSOT Authority Precedence

The harness must define authority precedence among top-level SSOT documents, decision records, packet state, evidence, generated projections, and operational memory.

The default canonical authority model is:

```text
approved SSOT
-> decision record
-> canonical requirement registry
-> canonical packet state
-> evidence and gate result
-> generated projection
-> operational memory summary
```

Context routing, reports, and memory may use projections of this model, but must not define a competing authority hierarchy.

### SH-REQ-001 [Core] Canonical Requirement Registry

The harness must maintain a canonical requirement registry built from approved requirement-registration events, approved SSOT snapshots, and decision records.

Approved SSOT remains the human-facing source of product meaning. The registry is the canonical machine-facing completion source that materializes approved requirement state, trace links, status, and coverage.

The registry must not rely only on Markdown heading structure or unreviewed free-form extraction. Any automated extraction must produce a reviewable registration diff before the registry becomes completion authority.

### SH-REQ-002 [Core] Requirement Registry Fields

Each requirement registry entry must include stable requirement id, version, source SSOT, status, classification, criticality, owner, risk classification, acceptance criteria, supersession link, affected packets, evidence coverage, and completion classification.

### SH-REQ-003 [Core] Acceptance Criteria Registry

Acceptance criteria must be managed as traceable registry entries linked to requirements, packets, tests, evidence, and closeout.

### SH-REQ-004 [Core] Requirement Registry as Completion Source

Project completion coverage must be calculated from the canonical requirement registry, not from free-form document scanning.

### SH-REQ-005 [Core] Requirement Registration Lifecycle

Requirement registration must support proposed, approved, superseded, rejected, deferred, and retired lifecycle states.

When requirements are extracted or changed from SSOT documents, the harness must produce a semantic diff that identifies new requirements, changed requirements, removed requirements, ambiguous text, parser confidence when automation is used, and required human or Planner adjudication.

The registry must preserve the source snapshot, source range when available, approval decision, supersession link, and reason for rejected or deferred registration.

## 6. Project Completion

### SH-COMP-001 [Core] Requirement Final Status

Every approved requirement must have one of these final statuses before project completion:

- implemented
- deferred
- rejected
- superseded

The statuses partially_implemented and unverified must block project completion unless reclassified through a decision record.

### SH-COMP-002 [Core] Project Completion Gate

Project completion must require:

- requirements coverage report
- SSOT conformance report
- packet completion report
- unimplemented/partial/deferred requirement report
- known limitations
- unresolved risks
- test gap report
- security/data/UX/business-process final review summary
- decision records for deferred/rejected/superseded requirements
- final human approval

### SH-COMP-003 [Core] Project Completion Blockers

Project completion must be blocked by:

- unverified requirement
- partially implemented requirement without follow-up handling
- high/critical unresolved risk without human acceptance
- unrecorded test gap
- SSOT and packet result mismatch
- packet included in completion scope without closeout
- requirement removed without decision record

### SH-COMP-004 [Core] Core Requirement Completion Rule

Core product invariants and approved Core requirements must not be completed as merely deferred or rejected.

They may be excluded from project completion only when they are formally removed from scope by human decision record or superseded by an approved replacement that preserves the invariant.

### SH-COMP-005 [Core] Implemented Status Meaning

The implemented requirement status must mean that all linked acceptance criteria are implemented, evidence-backed, reviewed, gate-passed, and included in closeout coverage.

## 7. Canonical Operating State

### SH-STATE-001 [Core] SQLite-Class Local State Store

The harness must provide a repo-embedded, portable, queryable local state store with SQLite-class capabilities.

SQLite may be the default implementation candidate, but the product requirement is capability-based, not vendor-specific.

### SH-STATE-002 [Core] Markdown Is Not Canonical State

Markdown documents, generated reports, and human-facing summaries must not be the canonical source of operational state.

### SH-STATE-003 [Core] Append-Only Event Log

All important operational changes must be recorded as append-only events, including:

- packet creation
- packet state transition
- decision record creation
- approval
- gate result
- evidence registration
- agent handoff
- workflow retry
- closeout
- project completion decision
- requirement status change
- packet amendment
- packet reopen
- rollback start and rollback result
- evidence invalidation
- evidence revalidation
- waiver request, approval, expiry, revocation, and supersession
- projection rebuild and projection drift detection
- artifact lifecycle transition
- lease acquire, renew, release, expiry, and conflict
- adapter invocation, result, failure, and artifact export

### SH-STATE-004 [Core] Projection Model

Human reports, ACTIVE_CONTEXT, LLM operational memory, PM reports, status summaries, and task views must be generated projections from canonical state.

Every projection must record source event range, source snapshot or watermark, generator version, schema version, dependency digest, freshness status, and stale-consumer behavior.

Stale projections must not be treated as authoritative input for approval, completion, or gate pass decisions.

### SH-STATE-005 [Core] Integrity Model

The state system must support content hashes, provenance metadata, schema version, migration history, lock/lease, conflict detection, recovery protocol, and tamper detection.

### SH-STATE-006 [Extension] High-Integrity Mode

The harness should support a high-integrity mode where cryptographic signatures or stronger tamper-evidence mechanisms can be required by project policy.

### SH-STATE-007 [Core] State Migration

State schema changes must have migration records and migration validation.

### SH-STATE-008 [Core] Canonical State Kernel Contract

The state kernel must define event id, event type, causal order, actor, authority, transaction boundary, idempotency key, expected version, source snapshot, and emitted projection watermark for state-changing operations.

### SH-STATE-009 [Core] Replayable Event Model

Canonical state must be replayable from a genesis state or validated baseline to rebuild materialized projections.

Projection rebuild must be verifiable against stored watermarks, checksums, and source event ranges.

### SH-STATE-010 [Core] Atomic Event and Projection Update

Appending events and updating required projections must be atomic or recoverable through a documented recovery protocol.

### SH-STATE-011 [Core] Lease and Conflict Protocol

Concurrent workflow and agent activity must use a lease or optimistic concurrency protocol with owner, token, expected version, TTL, heartbeat or renewal, stale lock recovery, and conflict escalation rules.

### SH-STATE-012 [Core] Point-in-Time Audit

The harness must support point-in-time audit of packet state, requirement status, evidence validity, review status, and project completion basis.

### SH-STATE-013 [Core] Backup and Restore

The harness must support backup, restore, and corruption recovery for repo-embedded operating state.

### SH-STATE-014 [Core] Schema Interoperability

Canonical schemas must define stable id formats, timestamp format and timezone policy, hash algorithm, path normalization, null and empty value semantics, enum closure rules, version fields, migration compatibility rules, and snake_case enum values unless a specific external integration requires a different representation.

### SH-STATE-015 [Core] Branch, Worktree, Merge, and Rebase State Protocol

The harness must define how canonical events, state snapshots, projections, packet versions, evidence references, and closeout records behave across Git branches, worktrees, merges, rebases, cherry-picks, and conflict resolution.

State merge and reconciliation must preserve event identity, causal order, idempotency, evidence hashes, authority records, and projection rebuild validity.

### SH-STATE-016 [Core] Filesystem Drift Detection and Reconciliation

The harness must detect and reconcile drift between canonical operating state and the repository filesystem.

This includes changes made by IDEs, CLIs, humans, external tools, branch switches, generated files, deleted artifacts, moved files, untracked files, and modified files outside packet scope.

Drift reconciliation must classify changes as expected, unregistered, stale, conflicting, ignored, or policy-violating, and must block affected closeout or completion claims until resolved.

### SH-STATE-017 [Core] Git State Reconciliation Protocol

The harness must define a practical reconciliation protocol for Git branches, worktrees, branch switches, merges, rebases, cherry-picks, and conflict repair.

The protocol must track branch/worktree identity, event import/export boundaries, packet version lineage, evidence hash preservation, review bundle survival, projection invalidation and rebuild rules, branch-switch lock behavior, conflict classes, and operator repair steps.

Git operations that make packet state, evidence, generated projections, or review bundles ambiguous must put affected claims into stale, blocked, or human_decision_required status until reconciled.

### SH-STATE-018 [Core] Git Reconciliation Conformance Levels

Git reconciliation must be staged by conformance level.

Kernel must support single-branch or single-worktree drift detection, branch/worktree identity recording, source tree hash binding, and closeout-time filesystem drift checks.

Standard must detect branch switches, invalidate affected projections and evidence, and require repair or revalidation before closeout.

Advanced may support merge, rebase, cherry-pick, event import/export, and review bundle survival workflows. High-Integrity may add signed events, tamper evidence, and stricter branch reconciliation.

If Advanced or High-Integrity reconciliation is not available, merge/rebase/cherry-pick ambiguity must route to human_decision_required instead of silently preserving claims.

## 8. Information Architecture and Artifact Governance

### SH-IA-001 [Core] Controlled Artifact Topology

The harness must prevent unplanned scattering of documents, code, evidence, reports, temporary files, and generated artifacts.

### SH-IA-002 [Core] Artifact Registry

The harness must maintain an artifact registry with:

- artifact id
- artifact type
- path
- owner packet
- source decision or requirement
- generated/authored classification
- canonical/projection classification
- lifecycle state
- freshness
- content hash
- deprecation status

### SH-IA-003 [Core] Document Type Governance

Every document must have a document type, owner, lifecycle, source-of-truth classification, generated/projection classification, and allowed location.

### SH-IA-004 [Core] No Uncontrolled Folder Creation

Agents must not create arbitrary folder structures for documents, evidence, reports, or product artifacts without policy permission.

### SH-IA-005 [Core] Conflict Detection

The harness must detect:

- SSOT-to-SSOT conflicts
- SSOT-to-packet conflicts
- packet-to-implementation conflicts
- implementation-to-test/evidence conflicts
- manual-to-command/policy conflicts
- memory-to-current-state conflicts
- projection-to-canonical-state drift

### SH-IA-006 [Core] Deprecated, Not Silently Deleted

Obsolete context, documents, decisions, and assumptions must be deprecated or superseded rather than silently deleted when they have historical relevance.

### SH-IA-007 [Core] Manual Freshness Validation

Human-facing manuals must be validated against command inventory, current policy, state projection, and tested examples.

### SH-IA-008 [Core] Product Artifact Boundary

Code, tests, fixtures, generated output, temporary artifacts, product docs, and evidence artifacts must have allowed zones. Packet closeout must detect artifacts outside allowed zones.

### SH-IA-009 [Core] Artifact Topology Contract

The harness must define an artifact class catalog, allowed zones, naming convention, owner model, lifecycle state machine, and duplicate/superseded linking rules for project artifacts.

### SH-IA-010 [Extension] Artifact Retention and Cleanup

Temporary artifacts, generated projections, large evidence artifacts, screenshots, videos, traces, and obsolete reports must have retention, TTL, purge, regenerate, or archive rules.

### SH-IA-011 [Core] Artifact Sync and Generated Excerpt Freshness

Artifact-sync reports, generated review excerpts, catalog summaries, and packet-supporting generated documents must be source-bound to the active packet, active requirement set, source event range, generator version, and artifact snapshot.

Stale, cross-packet, cross-branch, or source-unbound generated reports must not satisfy closeout, review, or completion evidence. The harness must surface a repair command or regeneration path when freshness cannot be established.

### SH-DOC-001 [Core] Docs Command Inventory Contract

Command documentation must be backed by a command inventory containing command id, version, inputs, outputs, side effects, state mutations, required gates, examples, deprecation status, and linked manual sections.

### SH-DOC-002 [Core] Manual Freshness Gate

Human-facing manuals that reference commands, workflows, gates, or policies must pass freshness validation against the command inventory, tested examples, and current policy.

### SH-DOC-003 [Core] Operator Diagnostic and Repair Contract

Operator-facing commands must return concise diagnostics that identify the failing requirement, packet, gate, field, enum value, file path, evidence id, and next repair action when those facts are known.

Diagnostics must include copy-ready snippets or command examples only when they are evidence-safe and cannot fabricate approval, identity, gate pass, or runtime evidence. Marker-only placeholders must not satisfy a gate or closeout requirement.

Commands with dense or machine-oriented output must provide a summary-first mode and a verbose/debug mode. The concise mode must be sufficient for a human or LLM operator to repair common packet authoring, enum, freshness, and missing-evidence failures without reverse-engineering hidden policy.

### SH-DOC-004 [Core] Structured Diagnostic Schema

Validators, preflight commands, readiness checks, and closeout checks must emit machine-readable diagnostic records as well as human-readable repair text.

Diagnostic records must include stable error code, severity, affected requirement, packet, gate, field, expected value or enum, actual value, source file or state record, freshness watermark when relevant, repair action, auto-fix eligibility, and whether any displayed snippet is evidence-safe.

Structured diagnostics must distinguish product failure, harness state failure, tool failure, missing approval, stale projection, inactive gate, invalid enum, missing evidence, and blocked readiness.

## 9. Architecture and Maintainability Governance

### SH-ARCH-001 [Core] Architecture Boundary Governance

The harness must require architecture boundary checks for implementation packets that affect domain model, module ownership, public interfaces, persistence boundaries, service boundaries, UI architecture, data flow, or integration boundaries.

Architecture boundary review must check SSOT conformance, approved Architecture Guide conformance, dependency direction, domain ownership, forbidden coupling, and unintended cross-boundary changes.

### SH-ARCH-002 [Core] Maintainability and Refactor Review Gate

The harness must prevent long-term quality erosion by requiring maintainability review when implementation increases duplication, complexity, hidden coupling, unclear ownership, dead code, uncontrolled generated code, or architecture drift.

Refactor Reviewer findings must be linked to packet scope, affected requirements, evidence, and closeout decisions.

### SH-ARCH-003 [Core] Simplicity Budget

New gates, registries, roles, adapters, documents, generated projections, commands, or workflow states must identify the concrete failure mode they prevent, the operator cost they add, the validation path, and the rollback or removal path.

If an existing simpler mechanism can prevent the same failure without weakening evidence, authority, or completion integrity, the harness must prefer the simpler mechanism.

Complexity added for high-risk governance must not become mandatory friction for low-risk work unless the approved risk taxonomy requires it.

## 10. Packet Model

### SH-PKT-001 [Core] Packet as Executable Work Unit

All executable changes must be managed as packets.

### SH-PKT-002 [Core] Packet Required Fields

A packet must include objective, scope, out-of-scope, risk level, affected SSOT, affected requirements, change zones, acceptance criteria, approval requirements, test plan, evidence requirements, review requirements, rollback considerations, and closeout criteria.

### SH-PKT-003 [Core] Packet Planning Approval

Packet implementation must not start until packet planning approval is complete.

### SH-PKT-004 [Core] Packet Challenge Review

Every packet planning document must receive either risk-adaptive independent challenge review or a policy-defined sourced exemption before implementation.

Packet challenge review is an adversarial review of the packet planning document before implementation. It checks scope, SSOT conformance, acceptance criteria, risk, feasibility, missing evidence requirements, security/data/UX/business-process impact, rollback considerations, and whether lightweight handling is justified.

Critical packets and high-risk packets with broad deferral, cross-project impact, security/data/permission impact, DB migration/runtime persistence impact, browser-functional workflow impact, deployment/cutover impact, reusable governance impact, or disputed evidence must receive at least two independent reviewer executions against an immutable review bundle.

Ordinary high-risk packets, Core contract packets, and packets with non-obvious acceptance coverage must receive at least one independent challenge reviewer and must escalate to a second independent reviewer when uncertainty, disagreement, or protected-scope findings remain.

Medium-risk packets may use one independent challenge reviewer, lightweight independent review, or batched challenge review when the packet scope and risk classification are source-backed. Low-risk/editorial packets may use lightweight independent review, batched review, or sourced exemption, provided that scope, SSOT conformance, risk classification, evidence minimums, and N/A rationale are still recorded.

The core requirement is an explicit challenge path: independent review, lightweight independent review, batched review, or sourced exemption according to approved risk policy. A provider subagent is one allowed execution mode, not the only product concept.

### SH-PKT-005 [Core] Independent Adjudication for Challenge Findings

Challenge review findings must not be blindly accepted. Findings must be recorded as accepted, rejected, partially accepted, or deferred with rationale.

The agent that authored or routed the work under review must not be the final adjudicator for adverse findings against its own output.

Rejected, deferred, or partially accepted findings involving Core requirements, high/critical risk, SSOT conformance, packet scope, security/data impact, DB runtime persistence, browser-functional evidence, core UX/business process, deployment/cutover safety, or completion coverage must require independent Adjudicator decision or Human escalation.

Lower-risk findings may be dispositioned through the policy-defined review owner when the disposition does not weaken approved scope, evidence, gate, or authority requirements.

### SH-PKT-006 [Core] Packet Scope Conformance

Packet closeout must verify that implementation neither exceeded packet scope nor omitted packet acceptance criteria.

### SH-PKT-007 [Core] Packet Lifecycle State Model

The harness must define a packet lifecycle state model with allowed states, allowed transitions, transition authority, required gate results, required events, failure states, rollback states, and reopen rules.

### SH-PKT-008 [Core] Packet Versioning

Packet changes after approval must create a new packet version or approved amendment, and evidence/review validity must be checked against the current packet version.

### SH-PKT-009 [Core] Target-Specific Packet Risk Taxonomy

Each target project or active domain profile must define its packet risk taxonomy before packet execution.

The taxonomy may use low, medium, high, and critical or a stricter domain-specific scale, but it must map to core gate, review, evidence, skill, approval, and escalation behavior.

The taxonomy must consider security/data/permission impact, business process impact, UX/design impact, architecture impact, runtime/deployment impact, rollback difficulty, blast radius, testability, external dependency risk, and requirement criticality.

### SH-PKT-010 [Core] Risk Taxonomy Authority

Target-specific risk taxonomy must be approved as part of top-level SSOT, domain profile, or project governance policy.

Packets must not classify their own risk in a way that bypasses the approved taxonomy.

### SH-PKT-011 [Core] Risk Normalization and Precedence

The harness must normalize requirement criticality, SSOT change level, packet risk, security/data risk, UX risk, architecture risk, domain profile risk, and rollback difficulty into a single effective packet risk for gate, evidence, review, approval, skill, and escalation behavior.

When risk signals conflict, the stricter or higher-risk classification must govern unless a Human-approved decision record explicitly accepts a narrower classification.

### SH-PKT-012 [Core] Packet-Scope Parity Matrix

Each implementation packet must maintain a packet-scope parity matrix that maps approved scope items, acceptance criteria, linked requirements, test/evidence obligations, implementation artifacts, and closeout claims.

Each row must have an explicit status such as implemented_verified, implemented_unverified, partially_implemented, not_implemented, deferred_by_decision, rejected_by_decision, superseded, or not_applicable_with_rationale.

Developer owns the initial parity matrix, Tester verifies evidence-backed row status, Reviewer verifies source parity and residual gaps, and Planner or Human authority owns scope rebaseline decisions.

### SH-PKT-013 [Core] Scope Rebaseline Boundary

Developer, Tester, Reviewer, PM, Orchestrator, and generated summaries must not silently downgrade approved packet scope to follow-up work.

Approved scope that is not implemented or not verified must block implemented status and closeout unless Planner or Human authority records a scope rebaseline, deferral, rejection, or supersession decision with impact on requirement coverage.

### SH-PKT-014 [Core] Small Inspectable Packet Boundary

Packets should default to the smallest independently reviewable behavioral or governance change that can produce meaningful evidence.

Oversized packets must record why the work cannot be split safely, which requirements and artifacts are coupled, what intermediate evidence will be produced, and which review or human checkpoints prevent scope blur.

When a packet grows beyond its approved scope, risk, or reviewability boundary, the harness must require split, amendment, rebaseline, or human/Planner escalation before implementation continues.

### SH-PKT-015 [Core] Micro-Packet and Batched Maintenance Packet

Low-risk editorial, documentation-freshness, generated projection regeneration, routine maintenance, command inventory correction, fixture cleanup, and similarly bounded changes may use micro-packet or batched maintenance packet paths.

Micro-packet and batched paths must still preserve canonical event recording, affected artifact registration, evidence provenance, risk classification, N/A rationale where used, and closeout traceability.

The lightweight path must not be used for semantic requirement changes, security/data/permission behavior changes, DB migration/runtime persistence behavior, core UX/business process changes, release/deployment behavior, or high/critical risk acceptance.

## 11. Gate and Validator Model

### SH-GATE-001 [Core] Risk-Tiered Gate System

Gates must be risk-tiered:

- hard gate
- conditional gate
- advisory gate

### SH-GATE-002 [Core] No Gate Bypass

No packet, workflow, provider adapter, profile, or human-facing command may bypass required gates.

### SH-GATE-003 [Core] N/A Requires Rationale

If a gate is not applicable, the harness must require N/A rationale and substitute validation where appropriate.

### SH-GATE-004 [Core] Gate Result Contract

Every gate result must identify status, evidence, checked claims, risks, unknowns, required actions, authority, timestamp, and affected packet.

### SH-GATE-005 [Core] Validator-Based Enforcement

Quality rules must be enforced by validators and state machines rather than relying on agents to remember instructions.

### SH-GATE-006 [Core] Gate Status Model

The harness must define a gate status model including pass, fail, blocked, warning, not_applicable_recorded, stale, superseded, and human_decision_required.

### SH-GATE-007 [Core] Waiver and Exception Lifecycle

Gate waivers, exceptions, and risk acceptances must include authority, scope, expiry or review trigger, rationale, evidence link, and revocation rule.

Waiver lifecycle states must include requested, approved, active, expired, revoked, superseded, rejected, and revalidated.

Expiry, revocation, supersession, or affected-input changes must propagate to dependent gate results, claims, reviews, closeouts, projections, and project completion coverage.

### SH-GATE-008 [Core] Non-Waivable Gate Boundaries

Waivers and exceptions must not convert missing human approval, missing evidence provenance, failed SSOT conformance, unapproved packet scope expansion, Core invariant violation, or stale/unverified evidence into pass, implemented, or completion-ready status.

Non-waivable gate boundaries must be enforced by validators and state machines.

### SH-GATE-009 [Core] Gate Declaration and Activation Parity

When a packet, risk taxonomy, profile, or SSOT declares a required gate, the same gate must appear in runtime state, preflight, validation reports, closeout checks, and relevant generated projections.

Validators must not report a declared required gate as not-applicable unless an authorized decision records why the gate is not needed, deferred, waived where waivable, or superseded. Missing activation of a required security, browser, DB runtime, reviewer, approval, or artifact-sync gate must block closeout.

### SH-PRE-001 [Core] Preflight and Readiness Result Contract

Preflight and readiness checks must produce a structured readiness result before state-changing work, closeout, release, or project completion.

The result must include parsed active packet identity, packet version, workflow identity, owner, Ready For Code or approval state, required fields, effective risk, required skills, declared gates, activated gates, required evidence, known stale projections, source watermarks, hard blockers, warnings, and next repair actions.

Readiness output must be both human-readable and machine-readable, and must identify whether the operator may proceed, must repair, must regenerate context, or must seek human/Planner decision.

### SH-PRE-002 [Core] Readiness Must Block on Parsed Content Gaps

Readiness must fail or hold when packet content, required enums, approval scope, active workflow, risk taxonomy, declared gates, activated gates, source watermark, evidence requirements, or projection freshness cannot be parsed and reconciled.

File existence, marker text, or generated summary presence must not be enough to declare readiness.

## 12. Evidence and Claim Ledger

### SH-EV-001 [Core] Evidence Provenance

Evidence must include provenance such as command, runner, provider/tool, timestamp, cwd or execution context, environment, artifact path, content hash, and binding to packet or decision.

### SH-EV-002 [Core] Artifact Required for Pass

Gate pass, test pass, review pass, and closeout pass must not rely only on natural language claims. They must reference structured evidence or artifacts.

### SH-EV-003 [Core] Claim Ledger

The harness must maintain a claim ledger that classifies claims as supported, partial, unverified, contradicted, superseded, or rejected.

### SH-EV-004 [Core] Completion Claim Control

Agents must not claim packet completion, test pass, security review pass, or project completion without supported claim ledger entries.

### SH-EV-005 [Core] Evidence Binding

Evidence must be bound to packet, requirement, acceptance criteria, gate, review, or decision record.

### SH-EV-006 [Core] Evidence Graph

The harness must maintain a typed directed evidence graph, not only a linear chain.

```text
artifact_id -> evidence_id -> claim_id -> gate_result_id -> closeout_id
```

The graph must support many-to-many relationships among artifacts, evidence, claims, gate results, reviews, adjudications, decisions, waivers, closeouts, requirements, packets, and acceptance criteria.

Edges must have typed semantics such as supports, contradicts, supersedes, invalidates, depends_on, waived_by, reviewed_by, adjudicated_by, and closes.

Each link must reference relevant packet version, requirement id, acceptance criteria id, content hash, event id, and freshness status.

### SH-EV-007 [Core] Evidence Freshness and Invalidation

Evidence must be tied to the source tree hash or change set, packet version, requirement version, test plan version, adapter version, runtime fingerprint, and environment fingerprint where applicable.

When relevant inputs change, affected claims must be downgraded to stale or unverified until revalidated.

Evidence invalidation must propagate to dependent claim ledger entries, gate results, reviews, closeouts, projections, and project completion coverage. A stale upstream evidence item must block completion claims that depend on it until the dependency is revalidated, superseded, or explicitly handled by authorized risk handling.

Risk acceptance may defer, waive with known risk, exclude by Human-approved scope decision, or require compensating evidence, but it must not turn stale or unverified evidence into implemented, pass, or supported completion claim status.

### SH-EV-008 [Core] Sensitive Evidence Handling

Evidence that may contain secrets, personal data, sensitive data, or credentials must be subject to redaction, access classification, retention policy, and review-safe summary generation.

### SH-EV-009 [Core] DB-Backed Runtime Evidence Split

Database or persistence-related closeout must distinguish schema/migration evidence from live runtime persistence evidence.

Schema DDL, migration tests, fixtures, or direct database inspection may support the claim that persistence structures exist, but they must not by themselves prove that product runtime paths write to, read from, reconcile with, or survive restart/re-query through the persistent store.

When a packet claims DB-backed runtime behavior, evidence must include an application/API/CLI path that exercises the persistent write/read behavior, source or environment fingerprint, and restart, re-query, or equivalent durability check when relevant to the acceptance criteria.

### SH-EV-010 [Core] Sensitive Evidence Minimum Redaction

Core evidence handling must provide a minimum redaction and access-classification policy for secrets, personal data, sensitive business data, credentials, tokens, logs, screenshots, browser traces, runtime dumps, and context packs.

Evidence summaries used for review must preserve enough factual detail to support the claim while excluding secret values and unnecessary personal or sensitive data.

### SH-EV-011 [Core] Decision-Influencing Claim Control

Reports, PM summaries, planning recommendations, review narratives, risk assessments, and routing recommendations that may influence decisions must extract key claims, assumptions, confidence, source references, and unsupported assertions.

Unsupported narrative claims must not affect approval, risk acceptance, routing, closeout, or project completion until sourced, tested, reviewed, or explicitly accepted as an assumption by the proper authority.

### SH-EV-012 [Core] Evidence Manifest Contract

Each packet must maintain an operator-facing and reviewer-facing evidence manifest.

The manifest must link evidence id, artifact id, claim id, gate id, requirement id, acceptance criterion id, source tree or change-set hash, runtime fingerprint, environment fingerprint when applicable, freshness status, redaction status, and review-safe summary.

The manifest must distinguish passed evidence, failed evidence, blocked evidence, stale evidence, substitute evidence, and evidence intentionally marked not applicable with rationale.

### SH-EV-013 [Core] Evidence Invalidation Granularity

Evidence invalidation must define granularity rules so that small unrelated changes do not invalidate the whole project and meaningful changes do not leave stale claims alive.

At minimum, the harness must classify invalidation by change type: editorial documentation, requirements, packet scope, implementation source, tests, fixtures, adapter version, runtime environment, dependency version, profile/policy, generated projection, and evidence artifact.

Each class must define affected claims, gates, reviews, projections, closeouts, and required revalidation. Validators must surface whether a stale status is local to one evidence item, one packet, one gate class, or project completion coverage.

## 13. Test and Real Runtime Quality

### SH-TEST-001 [Core] Functional Meaning Test Requirement

Tests must verify functional meaning, not merely execution, rendering, or mock invocation.

### SH-TEST-002 [Core] Acceptance Criteria Traceability

Tests must be traceable to requirements or packet acceptance criteria.

### SH-TEST-003 [Core] TDD RED/GREEN Evidence

Where practical, the harness must support and require TDD RED/GREEN/refactor evidence, including failing evidence before implementation and passing evidence after implementation.

When RED/GREEN evidence is not practical, the packet must record why, who owns the applicability decision, what substitute evidence will be used, and what residual risk remains visible to Tester and Reviewer.

### SH-TEST-004 [Core] Real Runtime Evidence

When actual program functionality can be tested in real runtime or on real/emulated devices, evidence must be collected according to packet risk level.

### SH-TEST-005 [Core] High/Critical Real Runtime Gate

High/critical packets must require real runtime or real/emulated device validation where technically possible.

### SH-TEST-006 [Core] Evidence by Runtime Type

The harness must support evidence for:

- web: browser trace, screenshot, video, console/network log
- mobile: emulator/physical device log, screenshot, recording
- desktop: runtime log, screenshot, interaction evidence
- server/API: service run, request/response log, integration artifact
- CLI: actual command output, exit code, cwd, environment, artifact hash

### SH-TEST-007 [Core] Mock Limit

Mock-based tests may support validation but must not replace required real runtime evidence for high/critical functionality without human-approved rationale.

### SH-TEST-008 [Core] Real Browser Functional Scenario Contract

The harness must distinguish render smoke, interactive smoke, real-browser functional, Codex-executed functional, and manual-real-browser functional evidence.

Render success, screenshot existence, or page-load success must not be treated as functional browser evidence for workflows that require user interaction, persisted data, navigation, validation, permission behavior, or business-process outcomes.

Real browser functional evidence must define scenario id, preconditions, user actions, expected assertions, actual assertions, data/runtime side effects, browser/tool identity, viewport/device where relevant, artifacts captured, pass/fail/blocked result, and residual gap.

Browser scenario suites must produce a closeout-visible summary with pass, fail, blocked, skipped, and not-applicable counts. A failed or blocked browser scenario is valid evidence, but it must block the affected claim until remediated, re-run, or rebaselined by authorized decision.

### SH-TEST-009 [Core] Runtime Claim Matching

The evidence type must match the claim being closed.

API-only evidence must not close a browser workflow claim. Render-only evidence must not close a functional UI claim. Schema-only evidence must not close a DB-backed runtime claim. Mock-only evidence must not close a high/critical runtime claim unless an authorized decision records why substitute evidence is acceptable.

### SH-TEST-010 [Core] Risk-Tiered TDD Applicability

The harness must define which packet types require RED/GREEN evidence, may use characterization tests, may use regression-only evidence, or may use substitute evidence.

High/critical packets that skip RED/GREEN evidence must record reviewer-visible rationale and the authority that accepted the substitute evidence path.

## 14. Review Quality

### SH-REV-001 [Core] Review Independence

Reviewer agents must be independent from the agent that produced the implementation under review.

### SH-REV-002 [Core] Review Is Not Existence

The mere existence of a review report must not satisfy review quality. The report must contain findings, evidence references, risk classification, unknowns, and pass/fail or escalation recommendation.

### SH-REV-003 [Core] Requirements Coverage Review

Requirements coverage reviewers verify whether the implementation result fully satisfies the approved packet scope, acceptance criteria, linked requirements, and packet-scope parity matrix.

This is distinct from packet challenge review in SH-PKT-004, which reviews the packet planning document before implementation.

Every implementation packet must receive requirements coverage verification before implemented status or closeout.

Low/medium risk packets may use one independent requirements reviewer, a policy-defined lightweight requirements review path, batched review, or sourced exemption when scope and risk classification justify it. High/critical risk packets, high-impact implementation, Core contract changes, disputed scope, or packets required by the target-specific risk taxonomy must use risk-adaptive independent reviewer executions according to SH-PKT-004 and SH-PKT-005.

Provider subagents may be used for independent review execution, but the product requirement is independence of reviewer judgment, bundle, and authority path rather than a specific provider mechanism.

### SH-REV-004 [Core] Security Review Execution

Security/data/permission impact requires independent security review appropriate to the effective packet risk.

Critical security/data/permission packets, high-risk packets with sensitive data or permission impact, and disputed security findings must use at least two independent security reviewer executions or Human-approved compensating review. Lower-risk security-adjacent changes must still record security applicability, evidence, and rationale.

### SH-REV-005 [Core] Adjudication Record

Conflicting review opinions, rejected review findings, risk acceptance, and unresolved issues must be captured in an adjudication record.

The adjudication record must identify the independent Adjudicator Agent or Human decision authority, the findings being adjudicated, accepted/rejected/deferred decisions, rationale, affected requirements, affected risks, and required follow-up.

### SH-REV-006 [Core] Routing Agent Independent Checklist

The routing agent for the current workflow phase must independently verify SSOT conformance, packet scope, acceptance coverage, test quality, evidence provenance, security/data impact, UX/business impact, and closeout readiness within that agent's role authority.

The routing agent checklist does not replace independent adjudication for adverse findings.

### SH-REV-007 [Core] Challenge Reviewer Independence

Challenge reviewers must be independent from the packet author and from each other in role, scratchpad/context, and first-pass judgment.

When model/provider diversity is unavailable or inappropriate, the reason must be recorded and compensated through stricter review bundle control, independent checklists, or Human escalation for high-risk findings.

### SH-REV-008 [Core] Review Bundle Source Binding

Independent reviews must identify the immutable review bundle or revision snapshot, source event watermark, packet version, requirement snapshot, acceptance criteria snapshot, evidence manifest snapshot, adapter/model identity when available, and stale status.

If the packet, requirements, implementation artifacts, or evidence change after review, affected reviews must be marked stale or re-run before closeout.

### SH-REV-009 [Core] Independent Review Execution Criteria

Independent review execution must be more than a different report filename or agent label.

The review must differ from the producer execution by role contract, immutable input bundle or snapshot, scratchpad/session, first-pass judgment, authority boundary, and review output schema.

Provider or model diversity is recommended when available and appropriate, but it is required only when project policy, risk taxonomy, security/data impact, or high/critical decision policy requires it.

## 15. Agent Role Governance

### SH-AGENT-001 [Core] Role Contract

Each agent role must define responsibility, allowed input, required output, read/write boundary, evidence responsibility, approval authority, forbidden decisions, independence constraints, and escalation conditions.

### SH-AGENT-002 [Core] Required Representative Roles

The harness must support at least these representative roles:

- Human Owner
- Project Manager Agent
- Planner Agent
- Designer Agent
- Developer Agent
- Tester Agent
- Requirements Reviewer Agent
- Security Reviewer Agent
- UX/Design Reviewer Agent
- Refactor Reviewer Agent
- Documenter Agent
- Adjudicator Agent
- Workflow Orchestrator

### SH-AGENT-003 [Core] Developer Cannot Self-Approve

Developer agents must not approve their own implementation as complete.

### SH-AGENT-004 [Core] Planner Cannot Bypass Challenge Review

Planner agents must not approve their own packet planning output without challenge review and adjudication.

### SH-AGENT-005 [Core] Designer Agent

Designer Agent must be a separate role from Planner Agent and must handle UX flow, interaction, Design Guide conformance, accessibility, information architecture, visual consistency, and business process usability.

### SH-AGENT-006 [Core] Role Authority Boundary

Agents must be prevented from claiming authority outside their role contract.

### SH-AGENT-007 [Core] Routing Agent and Adjudicator Separation

Routing Agent is not a separate permanent role.

Routing Agent means the currently active role agent that opens, routes, or coordinates subagents for a specific workflow phase.

For example, Planner Agent is the routing agent when it routes challenge reviewers during packet drafting. Developer Agent may be the routing agent for implementation-local tool routing, but cannot become an approver, reviewer, or adjudicator by doing so.

The harness must record the routing agent's underlying role, workflow phase, packet id, routed subagents, review bundle, outputs received, and authority boundary.

Independent Adjudicator Agent is the required role for adjudicating adverse subagent findings when those findings affect Core requirements, SSOT conformance, packet scope, high/critical risk, security/data impact, core UX/business process, or completion coverage.

### SH-AGENT-008 [Core] Representative Role Card Completeness

Every required representative role must have a maintained role card defining purpose, responsibilities, required inputs, required outputs, authority, forbidden decisions, independence constraints, required or recommended skills, evidence obligations, escalation triggers, and handoff expectations.

### SH-AGENT-009 [Core] PM Core Role and PMO Extension Boundary

The Core Project Manager Agent role must exist as a reader and summarizer of canonical state, packet status, blockers, decisions needed, and human-control snapshots.

Full PMO functions such as WBS management, milestone baselines, periodic reports, schedule drift analysis, dependency dashboards, and portfolio-style reporting may remain Extension capabilities.

PM Core summaries must not approve scope, implementation, test pass, risk acceptance, release, or project completion.

## 16. Workflow Orchestration

### SH-WF-001 [Core] Hybrid Orchestration

The harness must support manual handoff and automated execution through CLI/API/SDK/cloud execution, while preserving the same packet, evidence, gate, approval, and closeout rules.

### SH-WF-002 [Core] Approved Packet Workflow

After packet planning approval, the harness must be able to orchestrate implementation, testing, review, remediation, re-test, re-review, and closeout.

### SH-WF-003 [Extension] Internal Parallel Review

After implementation, independent reviews such as requirements review, security review, UX/design review, refactor review, and test review may run in parallel when their inputs are available.

### SH-WF-004 [Core] Automatic Remediation

When test or review failures are clear, within packet scope, and do not require human judgment, the workflow may route back to Developer Agent for remediation.

### SH-WF-005 [Core] Human Escalation on Fourth Developer Invocation

If Developer Agent would be invoked for the fourth time in a single packet workflow, autonomous implementation must stop and a Human escalation report must be generated.

### SH-WF-006 [Core] Escalation Report

Developer retry escalation report must include packet id, objective, invocation count, triggers, change summaries, failed gates/reviews, repeated failure patterns, cause classification, blockers, related SSOT/decision/packet links, recommendation, confidence, and human decision options.

### SH-WF-007 [Core] Workflow Audit Events

Workflow start, handoff, output receipt, gate result, review rejection, developer reroute, retry count increment, workflow pause, human report, and workflow close must be recorded as events.

### SH-WF-008 [Core] Workflow State Machine

Workflow orchestration must define states and transitions for start, run, wait, pause, resume, cancel, fail, retry, escalate, rollback, closeout, and completion.

Each transition must define guard conditions, required evidence, emitted event, retry budget, rollback or recovery behavior, and human decision resume point.

Workflow, packet, gate, waiver, evidence, review, and closeout state machines must have a composed transition contract.

The contract must define how packet, workflow, closeout, and completion coverage change when a gate becomes stale, failed, waived, superseded, human_decision_required, or revalidated.

### SH-WF-009 [Core] Immutable Review Bundle

Parallel reviews must run against an immutable review bundle or revision snapshot.

If implementation artifacts, packet version, requirements, or evidence change after review bundle creation, affected reviews must be marked stale or re-run.

### SH-WF-010 [Core] Workflow Idempotency

Workflow retries and resumed steps must use idempotency keys and expected state versions to prevent duplicate state mutations or stale writes.

### SH-WF-011 [Core] Risk-Tiered Retry Budget

The default autonomous remediation stop condition is the fourth Developer Agent invocation in a single packet workflow.

Project policy or target-specific risk taxonomy may require a stricter retry budget for high/critical risk, repeated failure patterns, security/data impact, scope expansion, or low-confidence remediation.

### SH-WF-012 [Core] Tight Execution Feedback Loop

Workflows must prefer the cheapest relevant verification signal before broad continuation: parser check before full validation, focused test before full suite, local/runtime smoke before broad review, and small evidence capture before closeout assembly.

When executable behavior is affected, the workflow must run the relevant code, command, browser/device flow, API path, or equivalent runtime path as early as practical instead of expanding process around unexecuted assumptions.

Feedback-loop evidence must record command, target, scope, outcome, and whether the result is sufficient for the current packet risk.

## 17. Project Manager Agent and PMO

### SH-PM-001 [Extension] PMO Role

Project Manager Agent must perform PMO responsibilities based on the Implementation Plan and canonical operating state.

### SH-PM-002 [Extension] WBS Management

PM Agent must create and maintain WBS, milestone structure, dependency tracking, owner tracking, packet progress, blocker status, and schedule drift as projections from the approved Implementation Plan and canonical operating state.

PM Agent must not silently change Implementation Plan baseline, scope, milestones, or dependencies. PM changes that alter approved project meaning must be recorded as recommendations, decision requests, or approved SSOT amendments.

### SH-PM-003 [Extension] PM Reports

PM Agent must generate reports when a Human requests them or when an approved project policy explicitly defines a report trigger or cadence.

Supported report types include:

- Daily Report
- Weekly Report
- Monthly Report
- Milestone Report
- Risk/Blocker Report
- Dependency Report
- Schedule Drift Report
- Decision Needed Report
- Project Completion Readiness Report

The harness must not require all PM reports to be continuously generated or maintained when no Human request or approved reporting policy requires them.

### SH-PM-004 [Extension] PM Reporting Sources

PM reports must be generated from canonical operating state, implementation plan, packet state, workflow events, evidence, decision records, and operational memory.

### SH-PM-005 [Extension] PM Skill Requirements

PM Agent must have role-specific skills or skill policies for project management, WBS planning, schedule tracking, dependency/risk tracking, status reporting, day_wrap_up, weekly_wrap_up, monthly_report, and decision escalation.

### SH-PM-006 [Extension] PM Authority Limit

PM Agent may recommend schedule, scope, ordering, split, defer, or escalation decisions but must not change top-level SSOT meaning, accept high/critical risk, approve security/data policy changes, or approve core UX/business logic changes without human authority.

### SH-PM-007 [Extension] Implementation Plan Contract

The Implementation Plan must define WBS ids, packet mapping, milestone baseline, dependency graph, owners, decision queue, risk/blocker register, reporting cadence, and schedule drift criteria.

### SH-PM-008 [Extension] PM Report Content Contract

PM reports must have defined minimum fields, source event watermark, reporting period, changes since prior report, blocker summary, risk changes, decisions needed, schedule variance, and confidence/freshness indicators.

## 18. Human Governance

### SH-HUMAN-001 [Core] Human Owner

Human must remain final owner and adjudicator for core product direction and high-risk decisions.

### SH-HUMAN-002 [Core] Human Approval Required Areas

Human approval is required for top-level product direction and governance decisions, including:

- initial requirements
- major requirement changes
- architecture design
- implementation plan baseline
- business process
- core business logic
- security/data policy
- UX/design direction
- project completion

Human or explicitly delegated authority may approve packet-level start, continuation, or routine packet decisions only within the scope of an explicit delegation record and only when the decision is not non-delegable under SH-HUMAN-004 or SH-HUMAN-006.

### SH-HUMAN-003 [Core] Delegation Record

Delegated authority must be recorded with delegatedBy, delegatedTo, scope, allowed packet types, forbidden decision types, validUntil, evidence required, and revocation rule.

Delegation must not override non-delegable human approval requirements.

### SH-HUMAN-004 [Core] Non-Delegable or Human-Required Decisions

Initial top-level SSOT approval, architecture changes, implementation plan baseline approval, core business logic changes, core UX/design direction changes, security/data policy changes, high/critical risk acceptance, project completion, and removal of Core requirements from completion scope require final human approval.

These decisions must not be approved only by delegated agents.

### SH-HUMAN-005 [Core] Approval Record Contract

Approval records must include approver identity, authority source, scope, decision result, timestamp, expiry or review condition, revocation rule, evidence link, reviewed snapshot id or projection watermark, reviewed delta, and acknowledgement of unresolved decisions or risks.

### SH-HUMAN-006 [Core] Final Human Approval

Project completion, high/critical risk acceptance, and removal of Core requirements from completion scope require final human approval and must not be approved only by delegated agents.

### SH-HUMAN-007 [Core] Human Approval Identity Assurance

Human approvals must have an identity assurance mechanism appropriate to decision risk.

High/critical risk acceptance, top-level SSOT approval, security/data policy approval, architecture baseline approval, core UX/business process approval, and project completion must not rely only on anonymous or unverifiable free-text approval.

The harness must record the approval channel, authenticated actor or identity basis, decision scope, reviewed snapshot, and any identity assurance limitations.

For local or offline operation, identity assurance may use a platform-authenticated channel, repository signer identity, signed approval artifact, OS/account-bound approval log, or project-specific approval ledger. The chosen basis, risk level, and limitations must be explicit in the approval record.

### SH-HUMAN-008 [Core] Product Judgment and Taste Checkpoint

Agents must surface ambiguous product, UX, copy, business logic, workflow, data interpretation, or tradeoff decisions instead of silently choosing a plausible direction.

When multiple reasonable options exist and the decision affects approved product meaning, user experience, business process, risk acceptance, or long-term maintainability, the harness must route the decision to the Human Owner or explicitly delegated authority with options, tradeoffs, and recommended evidence.

## 19. Security, Data, and Permission

### SH-SEC-001 [Core] Always High Risk

Security, data, and permission-related changes must be classified as high-risk or higher by default.

### SH-SEC-002 [Core] Security Domains

This includes authentication, authorization, session, DB schema, migration, personal data, sensitive data, financial data, external API credentials, file upload/download, logs, audit trail, data deletion/recovery, access control, and secret management.

### SH-SEC-003 [Core] Required Security Gates

Security/data/permission changes require human approval, security review, data integrity review, permission boundary review, test evidence, regression review, real runtime or substitute validation, and closeout hard gate.

### SH-SEC-004 [Core] Critical Escalation

Data loss possibility, authorization bypass, authentication bypass, sensitive data exposure, secret exposure, mass user impact, financial impact, or difficult rollback must escalate to critical.

### SH-SEC-005 [Core] Security-Adjacent Lower-Risk Boundary

Security/data/permission behavior changes are high-risk or critical by default.

Security-adjacent documentation, tests, fixtures, examples, comments, non-behavioral metadata, or generated summaries may use a lower risk class only when the approved risk taxonomy explicitly permits it and the packet records why no protected behavior, data integrity, permission boundary, audit trail, or sensitive evidence handling changes.

### SH-SEC-006 [Core] Harness Threat Model

The harness must maintain a threat model for the harness itself.

The threat model must cover prompt/context injection, malicious adapter output, poisoned evidence, stale or forged projections, path escape, credential leakage, tool supply-chain compromise, unauthorized state mutation, approval spoofing, evidence tampering, and unsafe external content.

Threat model findings must map to validators, adapter contracts, redaction policy, context trust boundaries, review requirements, or explicit risk acceptance.

## 20. UX and Design

### SH-UX-001 [Core] Design Guide Conformance

UX/design changes must be checked against Design Guide and approved UX decisions.

### SH-UX-002 [Core] Risk-Tiered UX Governance

UX changes must be classified by risk:

- low: editorial or simple token/component use
- medium: partial layout or interaction change
- high: core user flow, business process, navigation, design system, accessibility impact
- critical: data input/deletion/payment/permission/legal consent flow or large UX direction shift

### SH-UX-003 [Core] High/Critical UX Approval

High/critical UX changes require human approval or explicitly delegated authority.

Core UX/design direction changes and high/critical risk acceptance remain subject to SH-HUMAN-004 and SH-HUMAN-006.

### SH-UX-004 [Core] UX Evidence

UX packet evidence may include screenshots, browser/device runs, E2E/smoke tests, accessibility notes, flow diagrams, and review notes.

### SH-UXOPS-001 [Core] Operator Experience Baseline

The harness must provide an operator workflow that lets a human or LLM operator initialize, inspect, repair, and close a low-risk packet without reading internal schemas or reverse-engineering validator logic.

The baseline operator experience must include clear entry commands, current-state inspection, packet creation guidance, readiness output, repair diagnostics, evidence manifest inspection, closeout status, and next-action guidance.

### SH-UXOPS-002 [Core] First Packet Onboarding

A fresh starter or newly migrated project must support a guided path to create and close a first low-risk packet with evidence, readiness check, closeout, and generated context update.

The onboarding path must expose missing configuration, unsupported environment assumptions, and required human decisions without requiring the operator to inspect internal implementation files.

## 21. Operational Memory and Reporting

### SH-MEM-001 [Core] LLM Operational Memory

Operational memory must primarily serve LLM agents so they can report accurately and act with project context without requiring humans to read every document.

### SH-MEM-002 [Core] Evidence-Backed Memory

Memory entries must link to evidence, decision records, packet state, or SSOT sources.

### SH-MEM-003 [Core] Deprecated Context Handling

Stale or invalid context must be deprecated, superseded, or marked as unsafe for reuse.

### SH-MEM-004 [Core] Reportable Questions

The harness must allow LLMs to answer:

- What is the current project state?
- What is done, blocked, or delayed?
- Why was this decision made?
- What evidence exists?
- What requirements are not implemented?
- What risks did humans accept?
- What assumptions are stale?
- What needs human decision?
- Which packets failed quality gates?
- What friction repeats?

### SH-MEM-005 [Core] Recommendation Reports

LLM reports may include recommendations, but recommendations must distinguish evidence-backed claims, assumptions, confidence, and human approval requirements.

### SH-MEM-006 [Core] Human Control Snapshot

The harness must provide a human control snapshot that summarizes current state, changed since last approval, decisions needed, stale assumptions, unsupported claims, artifact changes, risk acceptance, confidence, freshness watermark, and recommended next actions.

## 22. Context Routing and Token Budget

### SH-CTX-001 [Core] No Whole Project by Default

Agents must not receive the whole project context by default.

### SH-CTX-002 [Core] Role-Specific Context Pack

Context packs must be generated by role, packet, risk, affected domain, current state, and required decision.

### SH-CTX-003 [Core] Context Provenance

Context packs must include source references and freshness metadata.

### SH-CTX-004 [Core] Deprecated Context Exclusion

Deprecated context must be excluded by default or explicitly marked when included.

### SH-CTX-005 [Core] Budget Enforcement

The harness must support soft and hard context/token budget controls, summary-first fallback, and escalation when hard limits block safe execution.

### SH-CTX-006 [Core] Context Authority and Conflict Precedence

Context routing must use a context-facing projection of the canonical authority model in SH-SSOT-008, not a separate authority hierarchy.

The projected precedence must include approved SSOT, decision record, canonical requirement registry, canonical packet state, evidence and gate result, generated projection, and operational memory summary.

Context packs must record excluded sources, stale sources, contradiction flags, and budget-overflow behavior.

### SH-CTX-007 [Core] Projection Freshness and Active Work Readiness

Active Context, brief summaries, routing documents, generated state docs, and readiness checks must validate parsed content, source event watermark, active packet identity, workflow identity, and projection freshness instead of relying only on file existence or modification time.

When projected context is stale, missing, cross-packet, or contradictory, the harness must report that state explicitly and provide a regeneration, repair, or source-of-truth fallback path before broad rereads or implementation continue.

Generated projections are navigation aids unless their source binding and freshness are valid for the current decision.

### SH-CTX-008 [Core] Context Trust and Instruction Boundary

External or contextual content must be treated as data, not instructions, unless it comes from an authorized instruction channel under the approved authority model.

Context packs must label authority class, trust boundary, and injection risk for repo documents, issues, pull requests, comments, logs, evidence artifacts, webpages, copied documents, tool output, generated summaries, and user-provided attachments.

Untrusted content must not override approved SSOT, human approval boundaries, packet state, role contracts, evidence requirements, non-waivable gates, or system/developer instructions.

### SH-CTX-009 [Core] Context Pack Coverage Contract

Context packs must declare required source classes, included sources, excluded sources, exclusion rationale, budget-overflow behavior, contradiction flags, and hard-stop conditions when required context is omitted.

When a task depends on an omitted source class, the harness must either retrieve it, summarize it from an authoritative projection, or block the workflow until the missing context is resolved.

## 23. Skill Policy

### SH-SKILL-001 [Core] Role-Specific Skill Policy

The harness must define recommended and required skills by role, packet type, risk level, and affected domain.

### SH-SKILL-002 [Core] Risk-Tiered Skill Enforcement

Low/medium packets may use recommended skills, while high/critical packets must enforce required skill sets.

### SH-SKILL-003 [Core] Skill Evidence

Used skills and missing required skills must be recorded as evidence and review inputs.

Missing required skills for high/critical packets must fail the relevant gate unless explicitly waived by authorized decision with rationale, expiry, compensating review, and affected risk record.

### SH-SKILL-004 [Core] PM Skills

PM Agent must have project management skills such as WBS planning, schedule tracking, day_wrap_up, weekly_wrap_up, monthly_report, risk tracking, and decision escalation.

## 23A. Dependency, Skill, Plugin, and Supply-Chain Governance

### SH-DEP-001 [Core] Dependency and Supply-Chain Intake

Adding, removing, upgrading, vendoring, executing, or deploying third-party dependencies, build tools, install scripts, GitHub Actions, adapters, plugins, or skills must produce dependency intake evidence appropriate to risk.

The intake must identify source, version, lockfile impact, license, maintenance status, known vulnerabilities when available, install or postinstall behavior, network behavior, runtime permissions, CI/CD permissions, and rollback/removal path.

### SH-DEP-002 [Core] Skill, Plugin, and Adapter Provenance

Skills, plugins, adapters, and generated operating rules are executable governance inputs and must have provenance, version, trust boundary, allowed capability, and prompt-injection or policy-bypass risk classification.

No skill, plugin, adapter, generated prompt, or external MCP tool may override approved SSOT, human approval boundaries, packet state, evidence requirements, or non-waivable gates.

### SH-DEP-003 [Core] Install Script and CI Side-Effect Boundary

Install scripts, package manager lifecycle scripts, CI/CD workflows, release scripts, and tool bootstrap commands must declare expected side effects and permission needs.

Unexpected filesystem, credential, network, environment, state, or repository mutations must be detected as drift or policy violations and must block affected closeout until reconciled.

### SH-DEP-004 [Core] Supply-Chain Trust Policy

The harness must define trust tiers for packages, skills, plugins, adapters, CI actions, installers, generated rules, and external tools.

Trust policy must cover allow/deny lists where used, source verification, lockfile or hash expectations, vulnerability advisory sources, update cadence, install-script and network execution boundaries, permission scopes, waiver rules, and rollback/removal expectations.

Dependency or tool trust waivers must expire or be revalidated when version, source, permission, install behavior, or risk context changes.

### SH-IP-001 [Core] LLM Output and External Source IP/License Risk

The harness must treat LLM-generated code, copied snippets, external examples, generated assets, dependency recommendations, and documentation excerpts as possible IP, license, attribution, or provenance risks.

Packets that add external-source-derived material must record source, license or usage basis when available, attribution need, generated-versus-copied classification, and reviewer-visible uncertainty.

High-risk or unclear license provenance must block release or publication until resolved, replaced, or accepted by authorized decision.

## 24. Provider and Tool Adapter

### SH-ADAPT-001 [Core] Provider-Neutral Adapter Contract

All LLM providers, IDE tools, CLIs, browser tools, device tools, and cloud execution systems must connect through provider-neutral adapter contracts.

### SH-ADAPT-002 [Core] Adapter Manifest

Adapters must declare identity, supported roles, execution modes, evidence modes, read/write capability, subagent capability, browser/device capability, artifact export capability, permission roots, sandbox expectations, known limitations, failure modes, security/privacy constraints, and version compatibility.

### SH-ADAPT-003 [Core] Adapter Contract Test

Adapters must pass harness contract tests before use.

### SH-ADAPT-004 [Core] Mock Adapter Restriction

Mock/test adapters must not be treated as production execution success.

### SH-ADAPT-005 [Core] No Core Workflow Bypass

No adapter may bypass packet state, evidence, gate, approval, role authority, or closeout rules.

### SH-ADAPT-006 [Core] Adapter State Mutation Boundary

Adapters must not mutate canonical state directly.

Adapters must submit typed outputs, artifacts, errors, and evidence through harness-controlled APIs, where validators decide whether state changes are allowed.

### SH-ADAPT-007 [Core] Adapter Invocation Contract

Adapter contracts must define invocation schema, output schema, normalized errors, timeout, cancel, retry behavior, artifact export, evidence emission, permission boundary, and security boundary.

Adapter invocations must record adapter run id, input snapshot hash, permission roots, artifact manifest, event-envelope output, idempotency mapping, failure classification, and evidence provenance checks.

### SH-ADAPT-010 [Core] Adapter Sandbox and Side-Effect Boundary

The harness must define sandbox, permission, and side-effect boundaries for LLM providers, IDE tools, CLIs, browser tools, device tools, and cloud execution systems.

Adapters and tools must not perform uncontrolled filesystem, configuration, credential, network, or environment mutations outside approved packet scope and allowed zones.

Side effects outside packet scope must be detected as filesystem/state drift and must block affected closeout until reconciled.

### SH-ADAPT-008 [Core] Cross-Model Role Independence

The harness must support assigning worker, reviewer, challenge reviewer, requirements reviewer, and security reviewer roles to different LLM models or providers when project policy, availability, cost, and data constraints allow.

The purpose is to reduce shared blind spots between worker and reviewer roles, not to require simultaneous multi-provider project execution.

### SH-ADAPT-009 [Extension] Model Assignment Policy

Project governance or active profiles should define when model/provider diversity is required, recommended, unavailable, or explicitly waived for worker-reviewer separation.

Model assignment decisions and waivers must be recorded when they affect packet review independence, security review, requirements review, or high/critical risk decisions.

### SH-ADAPT-011 [Core] Model Capability and Stale-Memory Boundary

Adapter and model records must include model id or family, provider, version when available, context limit, tool capabilities, output/artifact limits, known limitations, provider constraints, data handling constraints, and knowledge cutoff or current-knowledge limitations when available.

Unsupported factual claims derived from model memory, pretrained knowledge, or unstated external assumptions must be classified as unverified until sourced through an approved context, tool, evidence, or human decision path.

### SH-ADAPT-012 [Core] Tool Result Completeness and Failure Classification

Adapter tool results must record truncation, partial output, timeout, cancellation, retry count, authentication failure, sandbox denial, network failure, tool crash, artifact completeness, replay instructions, and whether the result is product failure, harness failure, environment failure, or unknown.

Gates and closeout must distinguish failed product behavior from inconclusive or failed tool execution.

## 24A. Installation, Migration, Upgrade, and Degradation

### SH-INSTALL-001 [Core] Installation and Starter Initialization Model

The harness must define how a new project installs or initializes Standard Harness, including starter payload, local state bootstrap, command inventory, default profiles, required generated projections, first readiness check, and first packet path.

Initialization must distinguish missing expected starter state from product failure and must provide repair guidance for partially initialized projects.

### SH-MIG-001 [Core] Existing Project Migration Path

The harness must support migration of existing projects or older harness versions through an explicit migration path.

Migration must identify imported requirements, packets, evidence, decisions, generated projections, unsupported legacy artifacts, state conversion, contamination risks, and post-migration validation gates.

Legacy artifacts must not become authoritative unless mapped to the new canonical model or explicitly retained as historical reference.

### SH-UPG-001 [Core] Harness Upgrade and Policy Bundle Versioning

The harness must define versioning and compatibility policy for schemas, validators, profiles, risk taxonomies, policy bundles, command inventory, adapter contracts, skills, plugins, generated projections, and starter templates.

Upgrade plans must identify breaking changes, migration steps, validation requirements, rollback path, and which previously closed evidence or reviews become stale.

### SH-POLICY-001 [Core] Policy Bundle Compatibility

Risk taxonomy, profile policy, gate policy, validator policy, skill policy, adapter policy, and security/data policy must carry version and compatibility metadata.

Packet readiness and closeout must record which policy bundle version was used and whether a policy bundle change invalidates active or closed claims.

### SH-DEGRADE-001 [Core] Graceful Degradation

When optional LLM providers, browser tools, cloud execution, dashboards, remote agents, or external services are unavailable, the harness must degrade to the safest supported local or manual path.

Graceful degradation must preserve packet state, evidence provenance, authority boundaries, hard gates, and explicit blocked status. It must not silently convert unavailable tooling into pass, implemented, or not_applicable status.

## 25. Self-Improvement

### SH-SELF-001 [Core] Friction Capture

The harness must capture recurring friction such as repeated test failure, unclear instructions, scope creep, stale docs, review omission, evidence gaps, file scattering, token overuse, and agent misunderstanding.

### SH-SELF-002 [Core] Improvement Candidate

Friction may be converted into improvement candidates, policy proposals, validator proposals, template changes, checklist changes, command presets, or patch proposals.

### SH-SELF-003 [Core] Human-Approved Harness Packet

Actual harness modification must require human-approved harness packet, validation, regression checks, closeout, and starter contamination validation.

### SH-SELF-004 [Core] Proposal Decision Record

Accepted, rejected, or deferred harness improvement proposals must be recorded.

### SH-SELF-005 [Core] Failure-to-Eval Promotion

Recurring harness failures, repeated operator friction, false completion, stale context reuse, weak review findings, scope creep, evidence substitution mistakes, and repeated diagnostic confusion must be considered for regression evals, contract tests, validator checks, or workflow policy changes.

LLM-assisted clustering of friction and review findings is allowed for discovery, but proposed improvements remain non-authoritative until evidence-backed, reviewed, and approved through the harness packet process.

## 26. Harness Dogfooding

### SH-DOG-001 [Core] Harness Changes Follow Harness Rules

Harness core, policy, schema, validator, workflow, adapter, template, and profile changes must follow packet/evidence/gate/review/closeout rules.

### SH-DOG-002 [Core] Harness Contract Tests

The harness must maintain contract tests for state kernel, event/projection, packet schema/state transition, evidence provenance, gate engine, validator plugins, role/authority policy, workflow orchestration, adapter compatibility, boundary/path safety, starter contamination, and docs command inventory.

Contract test coverage must explicitly include stale evidence propagation, waiver expiry/revocation, projection drift, malicious adapter output, path escape, replay rebuild, mock-success rejection, filesystem drift reconciliation, and non-waivable gate enforcement.

### SH-DOG-003 [Core] Starter Contamination Test

Starter promotion must require contamination scan and validation.

### SH-DOG-004 [Core] Starter Payload Boundary and Promotion Manifest

Starter promotion must be governed by a payload manifest that identifies allowed files, excluded files, generated artifacts, project-specific artifacts, managed template artifacts, plugin metadata, skills, runtime rules, and validation evidence.

Root-to-starter or template-to-target synchronization must produce dry-run diff, applied diff, contamination scan, contract test evidence, rollback plan, and approval boundary.

Generated runtime state, local project evidence, project-specific decisions, secrets, logs, and stale projections must not be promoted into the starter payload.

## 26A. Behavioral Agent Workflow Evals

### SH-EVAL-001 [Core] Behavioral Agent Workflow Evals

The harness must maintain behavioral evals for LLM and workflow failure modes that are not covered by ordinary unit or contract tests.

Evals must cover false completion, unsupported evidence claims, stale context use, weak review, scope creep, bad test substitution, prompt/context injection handling, high-risk escalation, low-risk lightweight path correctness, and tool failure misclassification.

Eval cases must be versioned, reproducible, tied to the failure mode they protect, and updated when repeated real-world harness failures reveal a missing behavioral guard.

## 27. Modular Profile System

### SH-PROFILE-001 [Core] Domain-Neutral Core

The harness core must remain domain-neutral.

### SH-PROFILE-002 [Extension] Modular Profiles

The harness must support modular profiles for domains such as web, mobile, data, finance, and security-sensitive projects.

### SH-PROFILE-003 [Extension] Profile Extensions

Profiles may add or strengthen policy, gates, validators, evidence requirements, skill policy, test strategy, and review checklist.

### SH-PROFILE-004 [Core] No Profile Bypass

Profiles must not bypass core packet/evidence/gate/closeout rules.

### SH-PROFILE-005 [Core] Profile Conflict Detection

Multiple active profiles must be checked for policy conflicts.

### SH-DATA-001 [Extension] Data, BI, and Finance Profile Contract

Data, BI, and finance domain profiles must define lineage, reconciliation, metric definition, grain, source mapping, data quality, SQL review boundary, aggregation correctness, and report tie-out evidence requirements.

When financial figures, management reports, business metrics, or data pipelines are affected, packet closeout must include data correctness evidence appropriate to the active risk taxonomy.

## 28. Operational Cost and Non-Functional Requirements

### SH-OPS-001 [Core] Harness Overhead Budget

The harness must track operational overhead so that the quality system does not become an unmanaged project bottleneck.

This includes review load, report load, human attention demand, workflow retries, evidence collection cost, and gate latency.

### SH-OPS-002 [Core] Risk-Tiered Lightweight Workflow

The harness must support lightweight packet workflows, batched reports, report-on-change behavior, and risk-tiered evidence minimums for low-risk work while preserving core traceability and completion controls.

### SH-OPS-003 [Core] LLM and Tool Cost Usage Budget

The harness must track and report operational cost signals for LLM calls, context size, token use when available, tool runs, browser/device runs, review executions, retries, and generated report churn.

Cost and usage controls must support risk-tiered budgets, summary-first context, low-risk lightweight paths, and escalation when verification or review cost becomes disproportionate to the approved work.

Cost controls must not suppress required evidence, human approval, security review, or non-waivable gates for high/critical work.

### SH-NFR-001 [Extension] Performance and Scalability

The harness must define measurable scale classes and performance expectations for event log growth, projection rebuild time, artifact registry query, report generation, and context pack generation.

### SH-NFR-002 [Extension] Retention and Storage Policy

The harness must define retention and storage policies for evidence artifacts, videos, traces, screenshots, logs, generated projections, and archived reports, including retention minimums, purge rules, archive rules, and regeneration expectations.

### SH-NFR-003 [Core] Privacy and Redaction

The harness must define a core privacy, redaction, and access rule baseline for evidence, logs, reports, context packs, and operational memory. Advanced retention tiers, enterprise access control, and external policy integrations may be extensions, but minimum secret and sensitive-data protection is Core.

### SH-NFR-004 [Extension] Cross-Platform Portability

The harness must account for Windows, macOS, Linux, shell, path, filesystem, and line-ending differences in core state, command inventory, and evidence handling.

### SH-NFR-005 [Core] Observability

The harness must provide diagnostics for failed workflows, validator failures, adapter failures, projection drift, stale evidence, and state recovery.

Diagnostics must support both human-readable repair guidance and machine-readable state so LLM agents, scripts, and humans can converge on the same failure reason.

### SH-NFR-006 [Extension] Compatibility and Deprecation

The harness must define compatibility, deprecation, and migration policy for schema, adapters, profiles, command inventory, and generated projections.

## 29. Existing Harness Inheritance

### SH-INHERIT-001 [Core] Concept Inheritance, Implementation Reconstruction

The new Standard Harness must inherit validated concepts from the current working harness, but must reconstruct implementation.

### SH-INHERIT-002 [Core] Concepts to Keep

The harness must preserve these concepts:

- packet-first workflow
- preflight gate
- TDD RED/GREEN evidence
- browser/real runtime evidence
- real-browser functional scenario evidence
- DB-backed runtime evidence split
- security evidence and redaction
- evidence manifest
- Active Context
- projection freshness checks
- operating state + generated projections
- packet-scope parity matrix
- risk-adaptive independent review
- artifact-sync and generated excerpt freshness checks
- operator diagnostic repair hints
- role authority boundary
- agent session/route event recording
- starter payload boundary
- docs command inventory
- development catalogs and command inventories
- harness contract tests

### SH-INHERIT-003 [Core] Implementation Patterns Not to Keep

The harness must not inherit:

- Codex-only core structure
- provider-specific command model as core workflow
- provider-specific subagent terminology as the canonical review model
- monolith validator
- monolith packet preflight
- monolith agent routing
- Markdown heading parser as primary contract
- mutable-state-only model
- v2 compatibility layer accumulation in core
- artifact-free pass states
- render-only browser checks as functional evidence
- schema-only database checks as runtime persistence evidence
- stale generated excerpts or artifact-sync reports as pass evidence
- command output that hides the exact failed field, enum, gate, or repair path
- universal heavy review burden for low-risk/editorial work
- mock adapter success as production success

### SH-INHERIT-004 [Core] Inheritance Traceability Matrix

Each inherited concept must map to a new architecture capability and contract test.

Each rejected implementation pattern must map to an anti-requirement, validator, architecture constraint, or review checklist item.

## 30. Non-Goals

### SH-NONGOAL-001 [Core] No Product Defect Guarantee

The harness does not guarantee that a product has no defects. It guarantees that quality operations are structured, evidence-backed, reviewable, and auditable.

### SH-NONGOAL-002 [Core] No Fully Autonomous Product Ownership

The harness must not remove human ownership of core requirements, architecture, business process, UX direction, security/data policy, high-risk decisions, or final project completion.

### SH-NONGOAL-003 [Core] No Provider Lock-In

The harness must not be defined as a Codex-only, Claude-only, IDE-only, or cloud-only product.

### SH-NONGOAL-004 [Core] No Document Hoarding

The harness must not equate quality with producing more documents. Documents and artifacts must have explicit type, owner, lifecycle, source, and traceability.

### SH-NONGOAL-005 [Core] No Manual Document Tracking Assumption

The harness must not assume humans can manually read and reconcile all generated artifacts. It must provide state, memory, reporting, and governance mechanisms so humans can inspect and decide at the right abstraction level.

### SH-NONGOAL-006 [Core] No Mandatory Multi-Provider Concurrency

The harness must not require multiple LLM providers or tools to run concurrently in the same project as a baseline condition.

It must support worker-reviewer model independence when available, but the core workflow must remain usable with a single compliant provider.

### SH-NONGOAL-007 [Core] No Universal Heavy Workflow

The harness must not force every small editorial, documentation, or low-risk operational change through the same review, evidence, and human-attention burden required for high/critical work.

Risk-adaptive lightweight paths are acceptable only when they preserve traceability, authority boundaries, evidence provenance, and explicit N/A rationale.
