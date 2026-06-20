# Standard Harness Architecture Guide v1

## Document Status

- Document type: architecture guide
- Scope: full target architecture direction plus Kernel-first MVP architecture
- Source requirements: `docs/requirements/standard-harness-final-product-requirements-v1.md`
- Staging references:
  - `docs/requirements/standard-harness-conformance-map-v1.md`
  - `docs/requirements/standard-harness-conformance-trace-v1.csv`
  - `docs/requirements/standard-harness-mvp-cut-v1.md`
  - `docs/requirements/standard-harness-architecture-contract-v1.md`
  - `docs/requirements/standard-harness-validation-eval-contract-v1.md`

This guide does not replace requirements. If this guide conflicts with approved requirements, the requirements win.

## Architecture Posture

Standard Harness v2 uses a full-target architecture with a Kernel-first implementation path.

The full architecture must be able to grow into Standard, Advanced, and High-Integrity conformance without redesigning the Kernel. The MVP must implement only the smallest working Kernel path that proves packet, state, evidence, gate, and closeout integrity.

The first implementation must avoid building reports, dashboards, provider-specific automation, or broad Git reconciliation before the canonical state chain works.

## Primary Architecture Goals

- Preserve the canonical trace chain from `SH-INV-002`.
- Keep canonical state out of generated Markdown.
- Make every state mutation explicit, typed, replayable, and attributable.
- Bind completion claims to evidence with provenance.
- Separate readiness, gate execution, gate result, waiver, and closeout.
- Keep role authority and human approval boundaries enforceable.
- Keep adapters provider-neutral and unable to mutate canonical state directly.
- Protect the clean starter payload from development repository artifacts.
- Allow Standard, Advanced, and High-Integrity features to extend the Kernel without bypassing it.

## Architecture Anti-Goals

- Do not build a dashboard before the state kernel works.
- Do not treat generated reports as canonical state.
- Do not implement provider-specific workflow as the core model.
- Do not require multiple LLM providers for the MVP.
- Do not implement full Git merge, rebase, cherry-pick, or review-bundle survival workflows in the MVP.
- Do not promote development evidence or local packet state into the clean starter payload.

## Repository Boundary

The repository topology is defined in `docs/architecture/standard-harness-repository-topology-v1.md`.

The clean starter payload root is:

```text
starter/standard-harness/
```

The development repository may contain implementation code, tests, tools, scripts, planning documents, and review artifacts. None of those become starter payload unless promoted by a starter payload manifest and contamination check.

## Full Target Architecture

```text
Human Owner and Role Contracts
        |
        v
Workflow Orchestration
        |
        v
Packet Lifecycle and Registries
        |
        v
State Mutation API
        |
        v
Append-Only Event Log -> Projection Builder -> Human Reports / Active Context
        |
        v
Evidence Graph -> Claim Ledger -> Gate Results -> Closeout
        ^
        |
Provider-Neutral Adapters and Tool Outputs
```

Evidence graph, claim ledger, gate results, and closeout records are materialized from canonical events. They are not separate write authorities.

The architecture has one canonical write path:

```text
typed command or adapter output
-> validator
-> state mutation API
-> append-only event
-> rebuilt projection
```

Generated projections and reports are read models. They must carry source watermarks and freshness metadata.

## Conformance Shape

### Kernel

Kernel preserves the identity of the harness:

- local state kernel
- append-only event log
- packet lifecycle
- requirement and artifact registry minimum
- evidence manifest
- claim ledger
- gate result model
- readiness and closeout checks
- role and human authority minimum
- provider-neutral adapter skeleton
- clean starter boundary
- one negative eval proving missing evidence blocks completion

### Standard

Standard adds practical default capability:

- richer context packs and projections
- broader artifact governance
- normal web, API, CLI, and persistence evidence types
- baseline security, data, supply-chain, and IP governance
- migration path, policy versioning, and behavioral eval seed

### Advanced

Advanced adds larger-project operation:

- multi-branch and multi-worktree reconciliation
- richer workflow state machine behavior
- PMO projections and dependency reporting
- stronger profile-specific quality checks
- broader adapter capability and failure classification

### High-Integrity

High-Integrity adds stronger assurance:

- stronger identity and approval assurance
- tamper evidence
- retention and audit policy
- stricter branch reconciliation and evidence preservation
- compliance-grade observability

## Component Model

### 1. State Kernel

The state kernel owns canonical operational state.

Responsibilities:

- store append-only events
- enforce event envelope schema
- enforce expected version and idempotency
- rebuild projections
- expose queryable state views
- record schema version and migration metadata

MVP slice:

- repo-embedded SQLite database
- append-only event table
- projection rebuild for active packet, evidence manifest, gate result, claim ledger, and current context summary
- state freshness metadata

Deferred:

- point-in-time audit UI
- backup and restore workflows
- high-integrity signatures
- advanced branch reconciliation

Primary anchors:

- `SH-STATE-001`
- `SH-STATE-003`
- `SH-STATE-004`
- `SH-STATE-007`
- `SH-STATE-008`
- `SH-STATE-014`

### 2. Event Envelope

Every state mutation is represented as an event envelope.

Minimum event envelope fields:

```text
event_id
event_seq
event_type
schema_version
occurred_at
actor_id
actor_role
authority_basis
transaction_id
causal_event_id
causal_order
packet_id
packet_version
expected_state_version
state_version_after
idempotency_key
source_snapshot
payload
payload_hash
```

For the MVP, `event_seq` may be the SQLite autoincrement sequence and `state_version_after` may equal `event_seq`. Later conformance levels may strengthen transaction and causal ordering without changing the append-only event principle.

MVP serialization conventions:

- timestamps use UTC ISO-8601 format
- hashes use SHA-256
- `payload_hash` is `sha256(canonical_json(payload))`
- evidence `content_hash` is SHA-256 of the artifact bytes or canonical content representation

The event log is append-only. Corrections are new events, not mutations of prior events.

### 3. Packet and Registry Domain

The packet and registry domain links requirements, acceptance criteria, artifacts, packets, and closeout.

Core entities:

- requirement
- acceptance criterion
- artifact
- packet
- packet state transition
- packet approval
- packet scope parity entry

MVP slice:

- manual or explicitly supplied requirement registration
- stable requirement ids
- acceptance criteria links
- artifact registry entries
- packet required fields
- packet lifecycle states
- low-risk micro-packet and batched maintenance behavior

Deferred:

- automated SSOT extraction
- semantic diff automation
- parser confidence handling
- source-range preservation unless manually supplied

Primary anchors:

- `SH-REQ-001`
- `SH-REQ-002`
- `SH-REQ-003`
- `SH-REQ-004`
- `SH-REQ-005`
- `SH-PKT-001`
- `SH-PKT-002`
- `SH-PKT-007`
- `SH-PKT-008`
- `SH-PKT-015`

### 4. Evidence Graph and Claim Ledger

Evidence is a first-class state object, not a report attachment.

Evidence records must carry:

```text
evidence_id
packet_id
claim_id_optional
command_or_tool
runner
timestamp
cwd_or_execution_context
environment_fingerprint
artifact_path
content_hash
result_status
rationale
```

`claim_id_optional` is optional at initial evidence registration time. Evidence may later be linked to one or more claims through explicit claim or evidence-link events.

The claim ledger links claims to evidence, requirements, acceptance criteria, and gate results.

MVP slice:

- evidence manifest
- claim ledger entries
- passed, failed, blocked, stale, substitute, and not-applicable evidence status
- missing-evidence rejection for completion claims

Deferred:

- rich evidence graph traversal
- large artifact retention policy
- cross-branch evidence preservation

Primary anchors:

- `SH-EV-001`
- `SH-EV-002`
- `SH-EV-003`
- `SH-EV-004`
- `SH-EV-005`
- `SH-EV-012`
- `SH-EV-013`

### 5. Readiness, Gate, and Closeout Engine

Readiness determines whether work or closeout can safely proceed.

Readiness statuses:

```text
ready
hold
blocked
stale
failed
```

Gate result statuses:

```text
pass
fail
blocked
warning
not_applicable_recorded
stale
superseded
human_decision_required
```

Gate requirement levels:

```text
hard
conditional
advisory
```

MVP slice:

- preflight readiness result
- gate declaration and activation parity
- gate result record
- non-waivable boundary enforcement
- closeout or block decision
- human-readable repair text plus machine-readable diagnostics

Deferred:

- complete waiver lifecycle UI
- profile-specific gate catalogs
- release-grade gate dashboards

Primary anchors:

- `SH-GATE-001`
- `SH-GATE-004`
- `SH-GATE-005`
- `SH-GATE-006`
- `SH-GATE-008`
- `SH-GATE-009`
- `SH-PRE-001`
- `SH-PRE-002`

### 6. Projection System

Projections are generated read models.

Examples:

- Active Context
- packet status summary
- evidence manifest view
- gate result view
- current human control snapshot
- implementation plan status view

Every projection must record:

```text
source_event_range
source_watermark
generator_version
schema_version
dependency_digest
freshness_status
stale_consumer_behavior
```

For decision records such as closeout, `source_watermark` means the latest event included in the decision input before the decision event itself is appended.

MVP slice:

- regenerate current context projection from canonical state
- mark projection freshness
- reject stale projection as approval, gate, or completion authority

Primary anchors:

- `SH-STATE-004`
- `SH-CTX-007`
- `SH-MEM-001`
- `SH-MEM-006`

### 7. Adapter Boundary

Adapters connect LLM providers, CLIs, IDEs, browser tools, device tools, and cloud tools to the harness.

Adapters cannot mutate canonical state directly.

Adapter outputs must pass through:

```text
adapter invocation
-> typed output envelope
-> validation
-> state mutation API
```

MVP slice:

- adapter manifest
- output envelope schema
- direct state mutation rejection
- mock-success rejection for production evidence
- basic failed or partial output classification

Deferred:

- browser adapter suites
- device adapter suites
- cloud adapter suites
- provider diversity policy enforcement

Primary anchors:

- `SH-ADAPT-001`
- `SH-ADAPT-002`
- `SH-ADAPT-003`
- `SH-ADAPT-004`
- `SH-ADAPT-005`
- `SH-ADAPT-006`
- `SH-ADAPT-007`

### 8. Workflow Orchestration

The workflow layer coordinates packet state transitions, role handoffs, retries, reviews, escalation, and closeout.

MVP slice:

- explicit packet lifecycle transitions
- role boundary checks
- human approval record
- closeout check
- blocked state with repair guidance

Deferred:

- internal parallel review orchestration
- advanced retry budget automation
- immutable review bundle survival across Git reconciliation

Primary anchors:

- `SH-WF-002`
- `SH-WF-006`
- `SH-WF-007`
- `SH-WF-008`
- `SH-AGENT-001`
- `SH-HUMAN-001`

### 9. Validation and Eval System

The validation system proves harness claims.

MVP validation must include:

- state kernel contract test
- event append and replay test
- packet lifecycle test
- evidence manifest test
- gate result test
- closeout blocked-by-missing-evidence negative test
- projection freshness test
- starter contamination check seed

Primary anchors:

- `SH-DOG-002`
- `SH-EVAL-001`
- `SH-SELF-005`

### 10. Starter Promotion

Starter promotion moves approved starter-safe files into `starter/standard-harness/`.

Promotion requires:

- payload manifest
- dry-run diff
- contamination scan
- validation evidence
- rollback plan
- approval boundary

MVP slice:

- starter folder boundary
- starter payload manifest format
- contamination check for forbidden local artifacts
- first packet onboarding path

Primary anchors:

- `SH-INSTALL-001`
- `SH-DOG-003`
- `SH-DOG-004`
- `SH-UXOPS-002`

## Target Source Layout

The development source tree should follow these boundaries:

```text
src/
  standard_harness/
    state/
    domain/
    validation/
    projection/
    adapters/
    workflow/
    starter/
    cli/
tests/
  contract/
  integration/
  evals/
tools/
  harness_cli.py
scripts/
  promote_starter.py
```

No source folder has authority by itself. Authority comes from canonical state events and approved requirements.

## MVP Runtime Choice

The MVP implementation should use Python 3 standard library as the first concrete runtime.

Reasons:

- SQLite support is available through the standard library.
- The first MVP can avoid dependency intake before supply-chain policy is implemented.
- Cross-platform CLI behavior is achievable with `argparse`, `pathlib`, `json`, `hashlib`, and `sqlite3`.
- The architecture remains provider-neutral because runtime choice is not part of the product identity.

Later conformance levels may add Node.js, TypeScript, browser, device, or cloud adapters through provider-neutral adapter contracts.

## First End-to-End MVP Flow

```text
initialize local harness state
-> register a low-risk packet
-> register requirement and acceptance criteria
-> run readiness
-> register evidence
-> create claim ledger entry
-> create gate result
-> close packet or block with repair reason
-> regenerate current context projection
```

The negative MVP flow must prove:

```text
missing required evidence
-> claim cannot be completed
-> gate cannot pass
-> closeout is blocked
-> diagnostic explains the repair
```

## Architecture Decision Boundaries

The following are architecture decisions in this guide:

- clean starter lives only under `starter/standard-harness/`
- development docs live under `docs/`
- canonical state is SQLite-class and repo-embedded
- event log is append-only
- projections are derived state
- adapters cannot mutate state directly
- MVP implementation runtime is Python 3 standard library

The following remain implementation details:

- exact SQLite DDL
- exact CLI command names
- exact Python class names
- exact projection file names
- exact adapter manifest JSON schema

Implementation details must still preserve the architecture contracts in this guide.
