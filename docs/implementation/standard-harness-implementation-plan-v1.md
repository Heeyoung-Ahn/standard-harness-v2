# Standard Harness v2 Implementation Plan

> **For agentic workers:** In environments where these skills are available, use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. If those skills are unavailable, follow the task sequence and evidence/closeout rules directly. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Kernel-first MVP of Standard Harness v2 while preserving the full target architecture direction.

**Architecture:** The full architecture is defined in `docs/architecture/standard-harness-architecture-guide-v1.md`. Implementation starts with the local state kernel, then adds packet lifecycle, requirement and artifact registration, evidence, claim ledger, gate result, closeout or block, projection regeneration, and starter onboarding.

**Tech Stack:** Python 3 standard library for the MVP CLI and state kernel, SQLite through `sqlite3`, tests through `unittest`, and repository-local scripts only. External dependencies are excluded from the MVP until dependency intake policy exists.

---

## Source Requirements

Primary source documents:

- `docs/requirements/standard-harness-final-product-requirements-v1.md`
- `docs/requirements/standard-harness-conformance-map-v1.md`
- `docs/requirements/standard-harness-conformance-trace-v1.csv`
- `docs/requirements/standard-harness-mvp-cut-v1.md`
- `docs/requirements/standard-harness-architecture-contract-v1.md`
- `docs/requirements/standard-harness-validation-eval-contract-v1.md`
- `docs/architecture/standard-harness-repository-topology-v1.md`
- `docs/architecture/standard-harness-architecture-guide-v1.md`

## MVP Definition

The MVP is not a dashboard, report generator, or prompt collection.

The MVP is successful when this path works:

```text
initialize state
-> create low-risk packet
-> register requirement and acceptance criteria
-> run readiness
-> register evidence
-> create claim ledger entry
-> create gate result
-> close or block packet based on evidence
-> regenerate current context projection
```

The MVP must also prove the negative path:

```text
missing required evidence
-> completion claim rejected
-> gate cannot pass
-> closeout blocked
-> structured diagnostic emitted
```

## MVP Scope Rules

Included:

- Python CLI entrypoint
- repo-embedded SQLite state store
- append-only event log
- packet lifecycle minimum
- manual requirement and acceptance criteria registration
- artifact registry minimum
- evidence manifest minimum
- claim ledger minimum
- readiness result
- gate result model
- closeout or block decision
- current context projection regeneration
- starter payload boundary and contamination seed
- contract tests and one behavioral negative eval

Excluded:

- dashboard
- cloud orchestration
- automatic SSOT extraction
- semantic diff automation
- full adapter contract test matrix
- browser, device, and cloud adapters
- automatic merge, rebase, cherry-pick, or multi-branch reconciliation
- full PMO reporting
- high-integrity signatures

## Target Development Layout

Implementation should create this layout:

```text
src/
  standard_harness/
    __init__.py
    cli/
      __init__.py
      main.py
    state/
      __init__.py
      store.py
      events.py
      migrations.py
    domain/
      __init__.py
      packets.py
      requirements.py
      artifacts.py
      evidence.py
      gates.py
      closeout.py
    validation/
      __init__.py
      diagnostics.py
      readiness.py
      contracts.py
    projection/
      __init__.py
      current_context.py
    workflow/
      __init__.py
    adapters/
      __init__.py
      manifest.py
      envelope.py
    starter/
      __init__.py
      manifest.py
      contamination.py
tools/
  harness_cli.py
tests/
  contract/
  integration/
  evals/
```

The exact internal class names may change during implementation, but the file responsibilities must remain separated.

All MVP commands must support `--json`. When `--json` is supplied, errors and diagnostics must be emitted as JSON objects.

All tests must run against an isolated temporary harness root using either `HARNESS_ROOT=<tempdir>` or `--harness-root <path>`. Tests must not mutate the developer's real `.harness/state/harness.sqlite3`.

## Command Shape

The MVP CLI should be invokable as:

```text
python tools/harness_cli.py <command> [options]
```

Initial commands:

```text
init
packet-create
packet-approve
packet-transition
requirement-register
acceptance-register
artifact-register
evidence-register
claim-record
gate-declare
gate-activate
readiness
gate-record
closeout
context
starter-check
validate
```

Command names may be refined by a decision record before implementation starts. Command behavior must preserve this plan's state and evidence rules.

MVP command semantics:

- `packet-create` creates a packet in `planned` state unless an authorized actor explicitly supplies `--auto-approve-low-risk`.
- `packet-approve` records approval authority and moves approval state without implying implementation completion.
- `packet-transition` is the only CLI path for packet lifecycle changes outside closeout.
- `requirement-register` registers a manual or explicitly supplied requirement.
- `acceptance-register` registers acceptance criteria and links them to requirement and packet records.
- `evidence-register` registers provenance-bearing evidence. It must not infer a completion claim from a log or artifact alone.
- `claim-record` creates or updates a claim ledger entry with explicit requirement, acceptance criterion, and evidence links.
- `gate-declare` records a gate required by packet, risk taxonomy, profile, or SSOT.
- `gate-activate` marks a declared gate active for a packet.
- `gate-record` records a gate result against an activated gate and must identify checked claim ids.
- `closeout` persists a closeout record; it does not merely set packet lifecycle state to `closed`.
- `validate` runs the MVP validation aggregator defined in Task 13.

## Data Model Minimum

The first SQLite schema must support these records:

```text
events
packets
requirements
acceptance_criteria
artifacts
evidence
claims
gate_declarations
gate_activations
gate_results
closeouts
diagnostics
projections
starter_manifest_entries
approval_records
schema_migrations
```

Each table must be derived from or traceable to append-only events. Direct table mutation without a corresponding event is not allowed.

Closeout records are required in the MVP. A packet lifecycle state of `closed` is not enough.

Minimum closeout fields:

```text
closeout_id
packet_id
packet_version
decision_status
checked_claim_ids
gate_result_ids
evidence_ids
diagnostic_ids
source_event_range
source_watermark
authority_basis
decided_at
rationale
```

`source_watermark` in a closeout record means the latest event included in the closeout decision input before the closeout event itself is appended.

Minimum gate declaration fields:

```text
gate_id
packet_id
gate_type
requirement_level
declared_by_source
source_event_range
source_watermark
```

Minimum gate activation fields:

```text
gate_activation_id
gate_id
packet_id
activation_status
activated_at
source_event_range
source_watermark
```

Minimum approval record fields:

```text
approval_record_id
packet_id
packet_version
approver_id
approver_role
authority_basis
decision_result
approved_scope
source_watermark
decided_at
rationale
```

Minimum schema migration fields:

```text
migration_id
schema_version
applied_at
checksum
status
```

## Task 0: Repository Bootstrap and Package Skeleton

**Files:**

- Create: `src/standard_harness/__init__.py`
- Create: `src/standard_harness/cli/__init__.py`
- Create: `src/standard_harness/cli/main.py`
- Create: `src/standard_harness/state/__init__.py`
- Create: `src/standard_harness/domain/__init__.py`
- Create: `src/standard_harness/validation/__init__.py`
- Create: `src/standard_harness/projection/__init__.py`
- Create: `src/standard_harness/workflow/__init__.py`
- Create: `src/standard_harness/adapters/__init__.py`
- Create: `src/standard_harness/starter/__init__.py`
- Create: `src/standard_harness/validation/contracts.py`
- Create: `tools/harness_cli.py`
- Create: `tests/contract/test_import_smoke.py`

- [ ] **Step 1: Create package directories**

Create the package structure listed in the Target Development Layout.

- [ ] **Step 2: Implement CLI wrapper boundary**

`tools/harness_cli.py` must be a thin wrapper around `standard_harness.cli.main`.

`tools/harness_cli.py` must insert the repository `src/` path into `sys.path` before importing `standard_harness.cli.main`, unless the package is installed.

- [ ] **Step 3: Implement empty command dispatcher**

`src/standard_harness/cli/main.py` must define command dispatch for the MVP command names and return a structured diagnostic for commands not yet implemented. It must support `--json` for machine-readable output.

- [ ] **Step 4: Add import smoke test**

`tests/contract/test_import_smoke.py` must verify:

```text
import standard_harness succeeds
import standard_harness.cli.main succeeds
python tools/harness_cli.py --help can be invoked
unknown command returns a structured diagnostic
```

Run:

```text
python -m unittest tests.contract.test_import_smoke
```

Expected result before functional tests exist:

```text
OK
```

**Done when:**

- package imports work.
- CLI wrapper delegates to `standard_harness.cli.main`.
- CLI wrapper can import from `src/` without installing the package.
- unknown command returns a structured diagnostic.
- no implementation code is placed under `starter/standard-harness/`.

## Task 1: State Kernel Skeleton

**Files:**

- Create: `src/standard_harness/state/events.py`
- Create: `src/standard_harness/state/store.py`
- Create: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_state_kernel.py`

- [ ] **Step 1: Define event envelope fields**

Create an event model with these fields:

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

For the MVP, `event_seq` may be the SQLite autoincrement sequence and `state_version_after` may equal `event_seq`.

MVP serialization conventions:

```text
timestamp_format = UTC ISO-8601
hash_algorithm = sha256
payload_hash = sha256(canonical_json(payload))
content_hash = sha256(artifact bytes or canonical content representation)
```

- [ ] **Step 2: Create SQLite initialization**

Create a repo-local state database under `.harness/state/harness.sqlite3` when `python tools/harness_cli.py init` runs.

The CLI must support `--harness-root <path>`, and tests may also use `HARNESS_ROOT=<tempdir>`. Test runs must use isolated temporary harness roots and must not mutate the developer's real `.harness/state/harness.sqlite3`.

- [ ] **Step 3: Enforce append-only event insert**

Reject event updates and deletes from harness APIs. Corrections must be new events.

- [ ] **Step 4: Add contract test**

Run:

```text
python -m unittest tests.contract.test_state_kernel
```

Expected result:

```text
OK
```

**Done when:**

- `init` creates the database.
- `init` records schema migration metadata in `schema_migrations`.
- an event can be appended.
- appended events receive `event_seq` and `state_version_after`.
- tests can initialize state under an isolated temporary harness root.
- the same idempotency key cannot create duplicate state.
- a projection watermark can identify the latest event.

Primary anchors:

- `SH-STATE-001`
- `SH-STATE-003`
- `SH-STATE-008`
- `SH-STATE-014`

## Task 2: Packet Lifecycle Minimum

**Files:**

- Create: `src/standard_harness/domain/packets.py`
- Create: `tests/contract/test_packet_lifecycle.py`

- [ ] **Step 1: Define packet fields**

Packet records must include:

```text
packet_id
title
objective
risk_class
lifecycle_state
approval_state
packet_version
scope_summary
out_of_scope_summary
change_zones
acceptance_criteria_ids
evidence_requirements
closeout_criteria
approval_required
approval_record_id
owner
created_at
updated_at
```

- [ ] **Step 2: Implement packet creation through events**

`packet-create` must append a packet creation event and materialize the packet projection.

- [ ] **Step 3: Implement approval and lifecycle transitions**

`packet-approve` must append an approval event and record the approval authority basis.

`packet-approve` must persist an `approval_records` entry and link it from `approval_record_id`.

`packet-transition` must append a lifecycle transition event.

Initial lifecycle states:

```text
planned
approved
in_progress
blocked
ready_for_closeout
closed
reopened
superseded
```

- [ ] **Step 4: Add lifecycle contract test**

Run:

```text
python -m unittest tests.contract.test_packet_lifecycle
```

Expected result:

```text
OK
```

**Done when:**

- a low-risk packet can be created.
- required packet fields are parsed for readiness.
- approval state is recorded separately from lifecycle state.
- approval decisions are persisted in `approval_records`.
- lifecycle state changes append events.
- implementation cannot be marked closed without closeout.

Primary anchors:

- `SH-PKT-001`
- `SH-PKT-002`
- `SH-PKT-007`
- `SH-PKT-008`
- `SH-PKT-014`
- `SH-PKT-015`

## Task 3: Requirement, Acceptance, and Artifact Registry Minimum

**Files:**

- Create: `src/standard_harness/domain/requirements.py`
- Create: `src/standard_harness/domain/artifacts.py`
- Create: `tests/contract/test_registry_minimum.py`

- [ ] **Step 1: Implement manual requirement registration**

Registration must accept explicitly supplied requirement ids and source references.

Minimum fields:

```text
requirement_id
version
source_doc
status
classification
risk_classification
acceptance_criteria
completion_classification
```

- [ ] **Step 2: Implement acceptance criteria registration**

`acceptance-register` must create acceptance criteria entries. Each acceptance criterion must link to a requirement and packet.

- [ ] **Step 3: Implement artifact registry entries**

Artifacts must include:

```text
artifact_id
artifact_type
path
owner
lifecycle_status
source_reference
packet_id
```

- [ ] **Step 4: Add registry contract test**

Run:

```text
python -m unittest tests.contract.test_registry_minimum
```

Expected result:

```text
OK
```

**Done when:**

- requirements can be manually registered.
- acceptance criteria can be linked.
- artifact entries can be registered.
- automated SSOT extraction is absent from the MVP path.

Primary anchors:

- `SH-REQ-001`
- `SH-REQ-002`
- `SH-REQ-003`
- `SH-REQ-004`
- `SH-REQ-005`
- `SH-IA-002`
- `SH-IA-008`

## Task 4: Evidence Manifest and Claim Ledger

**Files:**

- Create: `src/standard_harness/domain/evidence.py`
- Create: `tests/contract/test_evidence_claims.py`

- [ ] **Step 1: Implement evidence registration**

Evidence records must include:

```text
evidence_id
packet_id
claim_id
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

`claim_id` is optional at evidence registration time because evidence may exist before the claim ledger entry is created.

- [ ] **Step 2: Implement evidence statuses**

Allowed statuses:

```text
passed
failed
blocked
stale
substitute
not_applicable
```

- [ ] **Step 3: Implement claim ledger entries**

`claim-record` must create claims with explicit evidence links.

Claim records must include:

```text
claim_id
packet_id
requirement_id
acceptance_criterion_id
evidence_ids
support_status
gate_result_ids_optional
```

`gate_result_ids_optional` must not be required when a claim is first created. If a later gate result must be linked back to a claim, that link must be recorded by a new event such as `claim_gate_linked`.

Allowed `support_status` values:

```text
supported
partial
unverified
contradicted
superseded
rejected
```

A claim may be recorded as `unverified` without evidence, but it must not be recorded as `supported` unless supporting evidence ids are present and valid.

- [ ] **Step 4: Add evidence contract test**

Run:

```text
python -m unittest tests.contract.test_evidence_claims
```

Expected result:

```text
OK
```

**Done when:**

- evidence requires provenance.
- claims without evidence cannot be marked complete.
- claim creation does not require a future gate result id.
- evidence-free claims cannot use `support_status=supported`.
- failed evidence remains registered but blocks the affected claim.

Primary anchors:

- `SH-EV-001`
- `SH-EV-002`
- `SH-EV-003`
- `SH-EV-004`
- `SH-EV-005`
- `SH-EV-012`
- `SH-EV-013`

## Task 5: Readiness and Diagnostic Model

**Files:**

- Create: `src/standard_harness/validation/diagnostics.py`
- Create: `src/standard_harness/validation/readiness.py`
- Create: `tests/contract/test_readiness.py`

- [ ] **Step 1: Implement readiness status**

Allowed readiness statuses:

```text
ready
hold
blocked
stale
failed
```

- [ ] **Step 2: Implement diagnostic record**

Diagnostic records must include:

```text
diagnostic_id
error_code
severity
category
message
repair_hint
affected_entity_type
affected_entity_id
packet_id
requirement_id
acceptance_criterion_id
gate_id
evidence_id
field
expected_value
actual_value
source_reference
freshness_watermark
auto_fix_eligible
evidence_safe_snippet_allowed
```

Not every field is required for every diagnostic instance, but the schema must support these fields so validators can identify the exact failed requirement, packet, gate, field, enum value, evidence item, and repair action.

- [ ] **Step 3: Detect parsed-content blockers**

Readiness must block or hold on missing packet fields, approval gaps, inactive gates, stale projections, missing evidence requirements, and invalid enums.

- [ ] **Step 4: Add readiness contract test**

Run:

```text
python -m unittest tests.contract.test_readiness
```

Expected result:

```text
OK
```

**Done when:**

- readiness is based on parsed state, not file existence.
- diagnostics include machine-readable category, exact affected entity or field where available, and human repair text.

Primary anchors:

- `SH-PRE-001`
- `SH-PRE-002`
- `SH-DOC-003`
- `SH-DOC-004`
- `SH-CTX-007`

## Task 6: Gate Result Model

**Files:**

- Create: `src/standard_harness/domain/gates.py`
- Create: `tests/contract/test_gate_results.py`

- [ ] **Step 1: Implement gate requirement levels**

Allowed gate requirement levels:

```text
hard
conditional
advisory
```

- [ ] **Step 2: Implement gate statuses**

Allowed gate statuses:

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

- [ ] **Step 3: Enforce hard gate behavior**

Hard gates cannot be waived by generated text or missing evidence.

- [ ] **Step 4: Implement gate declaration, activation, and result fields**

`gate-declare` must create a declared gate record.

`gate-activate` must mark a declared gate active for a packet.

Gate declaration and activation state must be stored in `gate_declarations` and `gate_activations`. `gate_results` must not be used as a substitute for declaration or activation state.

`gate-record` must record:

```text
gate_result_id
gate_id
packet_id
checked_claim_ids
evidence_ids
status
requirement_level
rationale
source_event_range
source_watermark
```

- [ ] **Step 5: Add gate result contract test**

Run:

```text
python -m unittest tests.contract.test_gate_results
```

Expected result:

```text
OK
```

**Done when:**

- gate results identify checked claims.
- gate results reference an activated gate.
- gate status does not use `hold`.
- missing required evidence prevents pass.

Primary anchors:

- `SH-GATE-001`
- `SH-GATE-004`
- `SH-GATE-005`
- `SH-GATE-006`
- `SH-GATE-008`
- `SH-GATE-009`

## Task 7: Closeout or Block Decision

**Files:**

- Create: `src/standard_harness/domain/closeout.py`
- Create: `tests/integration/test_closeout_flow.py`

- [ ] **Step 1: Implement closeout input collection**

Closeout must inspect packet state, acceptance criteria, evidence, claim ledger, gate results, diagnostics, and projection freshness.

- [ ] **Step 2: Implement closeout decision**

Closeout outcomes:

```text
closed
blocked
human_decision_required
```

Each closeout decision must persist a closeout record:

```text
closeout_id
packet_id
packet_version
decision_status
checked_claim_ids
gate_result_ids
evidence_ids
diagnostic_ids
source_event_range
source_watermark
authority_basis
decided_at
rationale
```

The packet lifecycle state may be updated after closeout, but it must not be the only closeout record.

- [ ] **Step 3: Reject unsupported completion**

Completion claims without evidence must produce blocked closeout with repair diagnostics.

- [ ] **Step 4: Add closeout integration test**

Run:

```text
python -m unittest tests.integration.test_closeout_flow
```

Expected result:

```text
OK
```

**Done when:**

- a packet with complete evidence and passing gates can close.
- a packet with missing evidence blocks.
- closeout decision is persisted as a closeout record derived from append-only events.
- the block reason is machine-readable and human-readable.

Primary anchors:

- `SH-INV-003`
- `SH-GATE-004`
- `SH-EV-004`
- `SH-PKT-015`

## Task 8: Current Context Projection

**Files:**

- Create: `src/standard_harness/projection/current_context.py`
- Create: `tests/contract/test_projection_freshness.py`

- [ ] **Step 1: Implement projection metadata**

Projection output must include:

```text
source_event_range
source_watermark
generator_version
schema_version
dependency_digest
freshness_status
stale_consumer_behavior
```

- [ ] **Step 2: Generate current context**

`context` must produce a generated view of active packet, readiness state, evidence summary, gate summary, and next action.

- [ ] **Step 3: Detect stale projection**

If new events exist after projection generation, the projection must be marked stale.

- [ ] **Step 4: Add projection contract test**

Run:

```text
python -m unittest tests.contract.test_projection_freshness
```

Expected result:

```text
OK
```

**Done when:**

- current context is generated from canonical state.
- stale projection is not valid approval, gate, or closeout authority.

Primary anchors:

- `SH-STATE-004`
- `SH-CTX-007`
- `SH-MEM-001`
- `SH-MEM-006`

## Task 9: Adapter Skeleton

**Files:**

- Create: `src/standard_harness/adapters/manifest.py`
- Create: `src/standard_harness/adapters/envelope.py`
- Create: `tests/contract/test_adapter_skeleton.py`

- [ ] **Step 1: Implement adapter manifest parser**

Manifest fields:

```text
adapter_id
adapter_version
supported_roles
execution_modes
evidence_modes
read_write_capability
artifact_export_capability
permission_roots
known_limitations
failure_modes
```

- [ ] **Step 2: Implement adapter output envelope parser**

Output envelope fields:

```text
adapter_run_id
input_snapshot_hash
permission_roots
artifact_manifest
event_request
failure_classification
evidence_provenance
```

- [ ] **Step 3: Reject direct state mutation**

Adapter outputs may request events. They may not write the SQLite state directly.

- [ ] **Step 4: Add adapter skeleton contract test**

Run:

```text
python -m unittest tests.contract.test_adapter_skeleton
```

Expected result:

```text
OK
```

**Done when:**

- manifest validation works.
- output envelope parsing works.
- mock adapter success cannot satisfy production execution evidence.

Primary anchors:

- `SH-ADAPT-001`
- `SH-ADAPT-002`
- `SH-ADAPT-003`
- `SH-ADAPT-004`
- `SH-ADAPT-005`
- `SH-ADAPT-006`
- `SH-ADAPT-007`

## Task 10: Starter Manifest and Contamination Check

**Files:**

- Create: `src/standard_harness/starter/manifest.py`
- Create: `src/standard_harness/starter/contamination.py`
- Create: `starter/standard-harness/README.md`
- Create: `starter/standard-harness/START_HERE.md`
- Create: `tests/contract/test_starter_boundary.py`

- [ ] **Step 1: Implement starter manifest format**

Starter manifest entries must include:

```text
path
artifact_type
owner
included_in_payload
generated
managed_template
promotion_source
validation_evidence
```

- [ ] **Step 2: Implement contamination checks**

Reject starter payload files matching these classes:

```text
local evidence
local logs
secrets
cache files
development packet state
external review attachments
generated validation reports from this repository
```

- [ ] **Step 3: Add starter entry documents**

`starter/standard-harness/README.md` must identify the folder as a clean starter payload.

`starter/standard-harness/START_HERE.md` must explain the first low-risk packet path at a high level.

- [ ] **Step 4: Add starter boundary contract test**

Run:

```text
python -m unittest tests.contract.test_starter_boundary
```

Expected result:

```text
OK
```

**Done when:**

- starter payload has explicit entry files.
- contamination checks reject forbidden development artifacts.
- clean starter status is not inferred from folder existence.

Primary anchors:

- `SH-INSTALL-001`
- `SH-DOG-003`
- `SH-DOG-004`
- `SH-UXOPS-002`

## Task 11: Behavioral Negative Eval

**Files:**

- Create: `tests/evals/test_missing_evidence_blocks_completion.py`

- [ ] **Step 1: Create eval scenario**

Scenario:

```text
create packet
approve packet
register requirement
register acceptance criterion
skip required evidence
attempt to record a claim with support_status=supported without evidence
declare and activate required gate
attempt gate pass
attempt closeout
```

- [ ] **Step 2: Assert blocked behavior**

Expected outcome:

```text
supported claim rejected or downgraded to unverified
gate pass rejected
closeout blocked
diagnostic category is missing_evidence
repair hint identifies required evidence
```

- [ ] **Step 3: Run eval**

Run:

```text
python -m unittest tests.evals.test_missing_evidence_blocks_completion
```

Expected result:

```text
OK
```

**Done when:**

- the MVP rejects or downgrades evidence-free supported claims.
- the eval can be rerun without manual cleanup.

Primary anchors:

- `SH-EVAL-001`
- `SH-SELF-005`
- `SH-INV-003`

## Task 12: MVP End-to-End Scenario

**Files:**

- Create: `tests/integration/test_first_low_risk_packet_flow.py`

- [ ] **Step 1: Build end-to-end test**

Flow:

```text
init
packet-create
packet-approve
packet-transition
requirement-register
acceptance-register
artifact-register
evidence-register
claim-record
gate-declare
gate-activate
readiness
gate-record
closeout
context
```

- [ ] **Step 2: Assert final state**

Expected final state:

```text
packet lifecycle state is closed
evidence manifest has passed evidence
claim ledger has supported claim
gate result is pass
closeout record decision_status is closed
context projection is fresh
```

- [ ] **Step 3: Run all MVP tests**

Run:

```text
python -m unittest discover -s tests
```

Expected result:

```text
OK
```

**Done when:**

- one low-risk packet can move from initialization to closeout.
- missing evidence still blocks closeout in the negative eval.
- current context regenerates after closeout.

Primary anchors:

- `SH-CONF-002`
- `SH-PKT-015`
- `SH-EV-012`
- `SH-GATE-004`
- `SH-UXOPS-002`

## Task 13: Validate Command Aggregator

**Files:**

- Create: `tests/integration/test_validate_command.py`

- [ ] **Step 1: Implement validation scopes**

`validate` must support these MVP scopes:

```text
validate --state
validate --packet <packet_id>
validate --starter
validate --projection
validate --all
```

- [ ] **Step 2: Aggregate structured diagnostics**

The command must return structured diagnostics from state consistency checks, packet readiness, starter boundary checks, projection freshness, and missing-evidence blockers.

Validation must also check gate declaration and activation consistency, approval record presence for approved packets, schema migration metadata, and isolated harness root handling in tests.

- [ ] **Step 3: Add validate command integration test**

Run:

```text
python -m unittest tests.integration.test_validate_command
```

Expected result:

```text
OK
```

**Done when:**

- `validate --all` returns a nonzero failure status when required evidence is missing.
- `validate --all` returns success when the first low-risk packet flow is closed with supporting evidence.
- validation output includes machine-readable diagnostic records and human repair text.
- `validate --all --json` emits JSON diagnostics.

Primary anchors:

- `SH-DOC-003`
- `SH-DOC-004`
- `SH-PRE-001`
- `SH-PRE-002`
- `SH-STATE-004`

## MVP Closeout Criteria

MVP implementation is complete only when all are true:

- `python -m unittest discover -s tests` returns `OK`.
- The first low-risk packet scenario passes.
- The missing-evidence negative eval passes.
- The starter contamination check passes.
- Closeout decisions are persisted as closeout records.
- Current context projection includes source event range and freshness metadata.
- Gate status uses the approved enum.
- Readiness may use `hold`; gate result may not.
- `validate --all` reports missing evidence blockers and passes the completed low-risk packet flow.
- all tests use isolated temporary harness roots.
- MVP commands support `--json` diagnostics.
- No generated Markdown file is used as canonical state.
- No file outside `starter/standard-harness/` is treated as clean starter payload.

## Implementation Sequence

Recommended packet sequence:

```text
MVP-00 repository bootstrap and package skeleton
MVP-01 state kernel and event envelope
MVP-02 packet lifecycle and approval/readiness minimum
MVP-03 requirement, artifact, and acceptance registry minimum
MVP-04 evidence and claim ledger
MVP-05 diagnostic model and readiness
MVP-06 gate result model
MVP-07 closeout record and block decision
MVP-08 current context projection
MVP-09 adapter skeleton
MVP-10 starter boundary and contamination check
MVP-11 missing-evidence negative eval
MVP-12 first low-risk packet flow
MVP-13 validate command aggregator
```

Each packet must close with evidence. A packet that only creates documents without exercising relevant validation does not satisfy MVP completion.

## Deferred Work Register

Deferred work remains part of the final product baseline:

- automated SSOT extraction
- semantic diff automation
- source-range preservation automation
- full adapter contract matrix
- browser functional evidence adapter
- DB-backed runtime evidence profiles
- advanced Git reconciliation
- full PMO projections
- external dashboard
- cloud orchestration
- high-integrity signing
- retention policy automation

Deferred work must not be represented as rejected requirements.
