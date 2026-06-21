# Standard Harness Final Product Deferred Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deferred final-product capabilities after MVP release quality is complete, while preserving the Kernel packet-state-evidence-gate-closeout invariants.

**Architecture:** Build upward from the existing MVP kernel. Standard conformance adds SSOT automation, semantic impact analysis, richer adapter contracts, project completion coverage, security/dependency policy, and migration/upgrade foundations. Advanced conformance adds multi-branch reconciliation, PMO projections, dashboard read models, profile strengthening, and cloud orchestration. High-Integrity conformance adds signatures, retention, privacy, redaction, audit, and compatibility guarantees.

**Tech Stack:** Python 3 standard library and SQLite remain the core. External dependencies are allowed only after a dependency-intake packet records source, license, install behavior, side effects, trust tier, rollback path, and validation evidence. Tests use `unittest`; adapters and dashboard work may introduce separate runtimes only through approved dependency and adapter contracts.

---

## Scope Boundary

This plan is not an MVP plan. It starts only after these are true:

- MVP-00 through MVP-13 pass.
- Post-MVP release quality work is complete.
- `README.md`, CI, changelog, MVP completion note, and starter sample validation exist.
- Deferred work issues exist or issue-creation blockers are recorded.

This plan must not weaken:

- packet-state-evidence-gate-closeout trace chain
- append-only event model
- evidence provenance
- human approval boundaries
- generated projection non-authority rule
- adapter direct-state-mutation boundary
- starter payload contamination boundary

## Source Inputs

Read these before executing any task:

- `docs/requirements/standard-harness-final-product-requirements-v1.md`
- `docs/requirements/standard-harness-conformance-map-v1.md`
- `docs/requirements/standard-harness-conformance-trace-v1.csv`
- `docs/architecture/standard-harness-architecture-guide-v1.md`
- `docs/architecture/standard-harness-repository-topology-v1.md`
- `docs/implementation/standard-harness-implementation-plan-v1.md`
- `docs/implementation/standard-harness-post-mvp-release-quality-plan-v1.md`
- `docs/implementation/standard-harness-post-mvp-work-packets-v1.md`

## Workstream Split

The final-product scope is too large for a single implementation branch. Execute it as these independently verifiable workstreams:

```text
FP-00 final-product planning baseline
FP-01 schema, migration, replay, and compatibility foundation
FP-02 SSOT extraction and requirement registration lifecycle
FP-03 semantic diff, source ranges, and impact analysis
FP-04 project completion coverage gate
FP-05 full adapter contract matrix and invocation ledger
FP-06 runtime evidence profiles and browser/cloud/device adapter contracts
FP-07 workflow orchestration, review bundles, and context routing
FP-08 advanced Git reconciliation
FP-09 policy bundles, profiles, dependency, security, privacy, and IP governance
FP-10 PMO projections, cost tracking, dashboard read model
FP-11 cloud orchestration contract
FP-12 high-integrity signing, retention, redaction, and audit
FP-13 final conformance report and release tagging
```

## Conformance Release Targets

### Standard Conformance Target

Includes:

- SSOT extraction
- requirement lifecycle and source ranges
- semantic diff and impact analysis
- project completion coverage gate
- full adapter contract matrix
- practical evidence profiles
- migration, upgrade, policy bundle versioning
- dependency and security/data policy
- richer context routing and memory projections

### Advanced Conformance Target

Includes:

- multi-branch and larger-team support
- advanced Git reconciliation
- PMO projections and dependency reporting
- profile-specific quality strengthening
- dashboard read model
- cloud orchestration contract

### High-Integrity Conformance Target

Includes:

- signed events and approvals
- tamper evidence
- retention and redaction policy
- stronger identity records
- audited compatibility and deprecation controls

## Target Source Layout

Create these directories as the relevant tasks begin:

```text
src/standard_harness/
  ssot/
    __init__.py
    documents.py
    extractor.py
    source_ranges.py
    registration_diff.py
  diff/
    __init__.py
    semantic.py
    impact.py
  completion/
    __init__.py
    coverage.py
    final_gate.py
  evidence/
    __init__.py
    profiles.py
    runtime.py
  runtime/
    __init__.py
    browser_contract.py
    cloud_contract.py
    device_contract.py
  gitops/
    __init__.py
    snapshots.py
    reconciliation.py
  policy/
    __init__.py
    bundles.py
    dependency.py
    profiles.py
    risk.py
  security/
    __init__.py
    privacy.py
    redaction.py
    ip_license.py
  reviews/
    __init__.py
    bundles.py
    routing.py
  pmo/
    __init__.py
    projections.py
    cost.py
  dashboard/
    __init__.py
    read_model.py
  cloud/
    __init__.py
    orchestration.py
  integrity/
    __init__.py
    signing.py
    verification.py
  retention/
    __init__.py
    policies.py
    audit.py
```

Add tables through `src/standard_harness/state/migrations.py`. Every materialized table must be traceable to append-only events.

## Global Verification

Run after every task group:

```powershell
python -m unittest discover -s tests
```

Expected:

```text
OK
```

Every test must use `tempfile.TemporaryDirectory()` or `--harness-root <tempdir>`. No final-product test may write to the development repository `.harness/state/harness.sqlite3`.

## FP-00: Final-Product Planning Baseline

**Files:**

- Create: `docs/implementation/standard-harness-final-product-conformance-slices-v1.md`
- Create: `tests/contract/test_conformance_trace_coverage.py`

- [ ] **Step 1: Create conformance slice document**

Create `docs/implementation/standard-harness-final-product-conformance-slices-v1.md` with:

```markdown
# Standard Harness Final Product Conformance Slices v1

## Purpose

This document maps final-product deferred work into Standard, Advanced, and High-Integrity implementation slices.

## Standard Slice

- SSOT extraction
- requirement lifecycle
- source ranges
- semantic diff
- impact analysis
- project completion coverage
- full adapter contract matrix
- runtime evidence profiles
- migration, upgrade, and policy bundle versioning
- dependency, security, privacy, and IP governance

## Advanced Slice

- advanced Git reconciliation
- PMO projections
- dashboard read model
- profile-specific quality strengthening
- cloud orchestration contract

## High-Integrity Slice

- event and approval signing
- tamper evidence
- retention and redaction policy
- stronger identity
- audited compatibility and deprecation controls

## Rule

No Standard, Advanced, or High-Integrity slice may bypass Kernel packet, state, evidence, gate, role, approval, closeout, or completion boundaries.
```

- [ ] **Step 2: Write conformance trace coverage test**

Create `tests/contract/test_conformance_trace_coverage.py` with:

```python
import csv
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class ConformanceTraceCoverageTests(unittest.TestCase):
    def test_deferred_final_product_items_have_implementation_slices(self):
        trace_path = ROOT / "docs" / "requirements" / "standard-harness-conformance-trace-v1.csv"
        slice_path = ROOT / "docs" / "implementation" / "standard-harness-final-product-conformance-slices-v1.md"
        self.assertTrue(slice_path.exists())
        text = slice_path.read_text(encoding="utf-8")
        required_terms = [
            "SSOT extraction",
            "semantic diff",
            "adapter contract matrix",
            "browser",
            "cloud orchestration",
            "signing",
            "Git reconciliation",
            "dashboard",
        ]
        for term in required_terms:
            self.assertIn(term, text)
        with trace_path.open(newline="", encoding="utf-8-sig") as handle:
            rows = list(csv.DictReader(handle))
        self.assertGreater(len(rows), 0)
        deferred = [row for row in rows if row["mvp_status"] == "deferred"]
        self.assertGreater(len(deferred), 0)
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
python -m unittest tests.contract.test_conformance_trace_coverage
```

Expected:

```text
FAILED
```

because the conformance slice document does not exist before Step 1.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
python -m unittest tests.contract.test_conformance_trace_coverage
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add docs/implementation/standard-harness-final-product-conformance-slices-v1.md tests/contract/test_conformance_trace_coverage.py
git commit -m "docs: map final-product conformance slices"
```

## FP-01: Schema, Migration, Replay, and Compatibility Foundation

**Files:**

- Modify: `src/standard_harness/state/migrations.py`
- Modify: `src/standard_harness/state/store.py`
- Create: `src/standard_harness/state/replay.py`
- Create: `src/standard_harness/state/compatibility.py`
- Create: `tests/contract/test_state_replay_compatibility.py`

- [ ] **Step 1: Write failing replay and compatibility test**

Create `tests/contract/test_state_replay_compatibility.py` with:

```python
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StateReplayCompatibilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_event_replay_rebuilds_materialized_packet_state(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Replay packet",
                objective="Verify event replay.",
                risk_class="low",
                scope_summary="Replay packet table.",
                out_of_scope_summary="No external systems.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["replay-ok"],
                owner="owner",
                idempotency_key="packet-create-pkt-001",
            )
            with store.connection() as conn:
                conn.execute("delete from packets")
                conn.commit()
            report = StateReplayService(store).rebuild_materialized_state()
            self.assertEqual(report["status"], "rebuilt")
            self.assertEqual(PacketService(store).get_packet("pkt-001")["packet_id"], "pkt-001")

    def test_compatibility_policy_rejects_unknown_major_schema(self):
        from standard_harness.state.compatibility import CompatibilityPolicy

        policy = CompatibilityPolicy(current_schema_version="1")
        self.assertEqual(policy.check_schema("1")["status"], "compatible")
        self.assertEqual(policy.check_schema("99")["status"], "incompatible")
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
python -m unittest tests.contract.test_state_replay_compatibility
```

Expected:

```text
FAILED
```

because `standard_harness.state.replay` and `standard_harness.state.compatibility` do not exist.

- [ ] **Step 3: Implement replay service**

Create `src/standard_harness/state/replay.py` with an event replay service that:

- reads `events` ordered by `event_seq`
- rebuilds materialized tables for packet creation, approval, lifecycle transition, requirement registration, acceptance criteria, artifact registration, evidence registration, claim recording, gate declaration, gate activation, gate result, closeout, projection, and starter manifest events
- refuses unknown event types with a structured report instead of silent success
- records source event range in the report

Return shape:

```python
{
    "status": "rebuilt",
    "source_event_range": "1-<latest>",
    "replayed_event_count": <count>,
    "unknown_event_types": [],
}
```

- [ ] **Step 4: Implement compatibility policy**

Create `src/standard_harness/state/compatibility.py` with:

```python
class CompatibilityPolicy:
    def __init__(self, current_schema_version: str):
        self.current_schema_version = current_schema_version

    def check_schema(self, schema_version: str) -> dict[str, str]:
        if schema_version == self.current_schema_version:
            return {"status": "compatible", "reason": "same_schema_version"}
        return {"status": "incompatible", "reason": "schema_version_mismatch"}
```

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
python -m unittest tests.contract.test_state_replay_compatibility
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/state/replay.py src/standard_harness/state/compatibility.py src/standard_harness/state/migrations.py src/standard_harness/state/store.py tests/contract/test_state_replay_compatibility.py
git commit -m "feat: add state replay and compatibility policy"
```

## FP-02: SSOT Extraction and Requirement Registration Lifecycle

**Files:**

- Create: `src/standard_harness/ssot/__init__.py`
- Create: `src/standard_harness/ssot/documents.py`
- Create: `src/standard_harness/ssot/extractor.py`
- Create: `src/standard_harness/ssot/source_ranges.py`
- Create: `src/standard_harness/ssot/registration_diff.py`
- Modify: `src/standard_harness/domain/requirements.py`
- Modify: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_ssot_extraction.py`
- Create: `tests/contract/test_requirement_lifecycle.py`

- [ ] **Step 1: Write failing SSOT extraction test**

Create `tests/contract/test_ssot_extraction.py` with:

```python
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SsotExtractionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_markdown_requirements_extract_to_reviewable_registration_diff(self):
        from standard_harness.ssot.extractor import SsotExtractor

        source = "# Requirements\n\n### REQ-A [Core]\n\nThe system shall preserve evidence provenance.\n"
        diff = SsotExtractor().extract_markdown(
            source_doc="requirements.md",
            content=source,
            source_snapshot="sha256:test",
        )
        self.assertEqual(diff["status"], "review_required")
        self.assertEqual(diff["entries"][0]["requirement_id"], "REQ-A")
        self.assertEqual(diff["entries"][0]["source_doc"], "requirements.md")
        self.assertEqual(diff["entries"][0]["source_range"]["start_line"], 3)
        self.assertEqual(diff["entries"][0]["parser_confidence"], "high")
        self.assertFalse(diff["promoted"])

    def test_extraction_diff_must_be_promoted_by_event(self):
        from standard_harness.ssot.registration_diff import RequirementRegistrationDiffService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = RequirementRegistrationDiffService(store)
            record = service.record_diff(
                diff_id="rdiff-001",
                source_doc="requirements.md",
                entries=[{"requirement_id": "REQ-A", "source_doc": "requirements.md"}],
                idempotency_key="rdiff-001",
            )
            self.assertEqual(record["promotion_state"], "proposed")
```

- [ ] **Step 2: Write failing requirement lifecycle test**

Create `tests/contract/test_requirement_lifecycle.py` with:

```python
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RequirementLifecycleTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_requirement_can_be_deferred_with_decision_record(self):
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            registry = RequirementRegistry(store)
            registry.register_requirement(
                requirement_id="REQ-A",
                version="1",
                source_doc="requirements.md",
                status="approved",
                classification="Core",
                risk_classification="low",
                acceptance_criteria=["ac-1"],
                completion_classification="unverified",
                packet_id="pkt-001",
                idempotency_key="req-a",
            )
            updated = registry.transition_requirement(
                requirement_id="REQ-A",
                status="deferred",
                decision_record_id="DR-100",
                rationale="Deferred to Standard conformance.",
                idempotency_key="req-a-deferred",
            )
            self.assertEqual(updated["status"], "deferred")
            self.assertEqual(updated["decision_record_id"], "DR-100")
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
python -m unittest tests.contract.test_ssot_extraction
python -m unittest tests.contract.test_requirement_lifecycle
```

Expected:

```text
FAILED
```

- [ ] **Step 4: Implement SSOT extraction**

Implement:

- heading-based Markdown extraction for explicit ids like `### REQ-A [Core]`
- source line range calculation
- source snapshot recording
- parser confidence values `high`, `medium`, `low`
- registration diff records with `promotion_state` values `proposed`, `approved`, `rejected`, `superseded`

Do not promote extracted requirements directly into `requirements`. Promotion must append a requirement registration event.

- [ ] **Step 5: Implement requirement lifecycle transition**

Extend `RequirementRegistry` with:

```python
transition_requirement(
    requirement_id: str,
    status: str,
    decision_record_id: str,
    rationale: str,
    idempotency_key: str,
) -> dict[str, object]
```

Allowed statuses:

```text
proposed
approved
superseded
rejected
deferred
retired
```

Transitions to `rejected`, `deferred`, `retired`, or `superseded` require `decision_record_id`.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
python -m unittest tests.contract.test_ssot_extraction
python -m unittest tests.contract.test_requirement_lifecycle
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/standard_harness/ssot src/standard_harness/domain/requirements.py src/standard_harness/state/migrations.py tests/contract/test_ssot_extraction.py tests/contract/test_requirement_lifecycle.py
git commit -m "feat: add SSOT extraction and requirement lifecycle"
```

## FP-03: Semantic Diff, Source Ranges, and Impact Analysis

**Files:**

- Create: `src/standard_harness/diff/__init__.py`
- Create: `src/standard_harness/diff/semantic.py`
- Create: `src/standard_harness/diff/impact.py`
- Modify: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_semantic_diff.py`
- Create: `tests/integration/test_ssot_change_impact.py`

- [ ] **Step 1: Write failing semantic diff test**

Create `tests/contract/test_semantic_diff.py` with:

```python
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SemanticDiffTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_classifies_editorial_and_semantic_changes(self):
        from standard_harness.diff.semantic import SemanticDiffService

        service = SemanticDiffService()
        editorial = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system shall record evidence clearly.",
        )
        semantic = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system may record evidence.",
        )
        self.assertEqual(editorial["change_class"], "clarification")
        self.assertEqual(semantic["change_class"], "semantic_change")
        self.assertTrue(semantic["requires_human_review"])
```

- [ ] **Step 2: Write failing impact analysis test**

Create `tests/integration/test_ssot_change_impact.py` with:

```python
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SsotChangeImpactTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_semantic_change_lists_impacted_packet_claim_evidence_and_projection(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            impact = ImpactAnalysisService(store).record_impact(
                impact_id="impact-001",
                requirement_id="REQ-A",
                change_class="semantic_change",
                impacted_packet_ids=["pkt-001"],
                impacted_claim_ids=["claim-001"],
                impacted_evidence_ids=["ev-001"],
                impacted_projection_ids=["proj-001"],
                idempotency_key="impact-001",
            )
            self.assertEqual(impact["change_class"], "semantic_change")
            self.assertEqual(impact["review_status"], "human_review_required")
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
python -m unittest tests.contract.test_semantic_diff
python -m unittest tests.integration.test_ssot_change_impact
```

Expected:

```text
FAILED
```

- [ ] **Step 4: Implement semantic diff service**

Implement deterministic MVP-safe semantic classification:

```text
unchanged
editorial
clarification
semantic_change
governance_risk_change
removed
ambiguous
```

Rules:

- empty new text from non-empty old text is `removed`
- modal weakening such as `shall` to `may` is `semantic_change`
- inserted risk, approval, security, or governance terms are `governance_risk_change`
- punctuation-only change is `editorial`
- added explanatory adjective without modal change is `clarification`
- unclear parser cases are `ambiguous`

- [ ] **Step 5: Implement impact analysis service**

Persist impact records with:

```text
impact_id
requirement_id
change_class
impacted_packet_ids
impacted_claim_ids
impacted_evidence_ids
impacted_gate_ids
impacted_projection_ids
review_status
source_watermark
```

Semantic, governance/risk, removed, and ambiguous changes must set `review_status=human_review_required`.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
python -m unittest tests.contract.test_semantic_diff
python -m unittest tests.integration.test_ssot_change_impact
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/standard_harness/diff src/standard_harness/state/migrations.py tests/contract/test_semantic_diff.py tests/integration/test_ssot_change_impact.py
git commit -m "feat: add semantic diff and impact analysis"
```

## FP-04: Project Completion Coverage Gate

**Files:**

- Create: `src/standard_harness/completion/__init__.py`
- Create: `src/standard_harness/completion/coverage.py`
- Create: `src/standard_harness/completion/final_gate.py`
- Modify: `src/standard_harness/state/migrations.py`
- Modify: `src/standard_harness/cli/main.py`
- Create: `tests/contract/test_project_completion_gate.py`
- Create: `tests/integration/test_project_completion_cli.py`

- [ ] **Step 1: Write failing completion gate test**

Create `tests/contract/test_project_completion_gate.py` that proves:

- approved requirement with no supported claim blocks completion
- deferred requirement requires decision record
- closed packet with supported claim, passing gate, and closeout counts as covered
- unverified, partially implemented, and missing closeout statuses block completion

- [ ] **Step 2: Add CLI contract**

Add command:

```text
project-completion
```

Required CLI examples:

```powershell
python tools/harness_cli.py --json --harness-root C:\tmp\harness project-completion --all
python tools/harness_cli.py --json --harness-root C:\tmp\harness project-completion --requirement-id REQ-A
```

- [ ] **Step 3: Implement coverage service**

Coverage result shape:

```python
{
    "status": "blocked",
    "requirement_counts": {
        "implemented": 0,
        "deferred": 0,
        "rejected": 0,
        "superseded": 0,
        "unverified": 1,
    },
    "diagnostics": [...],
    "source_watermark": 42,
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
python -m unittest tests.contract.test_project_completion_gate
python -m unittest tests.integration.test_project_completion_cli
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/standard_harness/completion src/standard_harness/cli/main.py src/standard_harness/state/migrations.py tests/contract/test_project_completion_gate.py tests/integration/test_project_completion_cli.py
git commit -m "feat: add project completion coverage gate"
```

## FP-05: Full Adapter Contract Matrix and Invocation Ledger

**Files:**

- Modify: `src/standard_harness/adapters/manifest.py`
- Modify: `src/standard_harness/adapters/envelope.py`
- Create: `src/standard_harness/adapters/contract_matrix.py`
- Create: `src/standard_harness/adapters/invocation.py`
- Modify: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_adapter_contract_matrix.py`
- Create: `tests/contract/test_adapter_invocation_ledger.py`
- Create: `tests/evals/test_malicious_adapter_output.py`

- [ ] **Step 1: Write adapter matrix tests**

Tests must cover:

```text
success
fail
blocked
stale
substitute
not_applicable
partial_output
timeout
permission_denied
malformed_envelope
mock_success
direct_state_mutation
path_escape
```

- [ ] **Step 2: Implement invocation ledger**

Adapter invocation records must include:

```text
adapter_run_id
adapter_id
adapter_version
input_snapshot_hash
permission_roots
artifact_manifest
event_request
failure_classification
evidence_provenance
timeout_seconds
retry_count
cancel_status
source_watermark
```

- [ ] **Step 3: Enforce adapter boundaries**

Validators must reject:

- direct SQLite writes
- path escape outside permission roots
- mock success as production evidence
- missing evidence provenance
- malformed event request

- [ ] **Step 4: Verify**

Run:

```powershell
python -m unittest tests.contract.test_adapter_contract_matrix
python -m unittest tests.contract.test_adapter_invocation_ledger
python -m unittest tests.evals.test_malicious_adapter_output
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/standard_harness/adapters src/standard_harness/state/migrations.py tests/contract/test_adapter_contract_matrix.py tests/contract/test_adapter_invocation_ledger.py tests/evals/test_malicious_adapter_output.py
git commit -m "feat: add full adapter contract matrix"
```

## FP-06: Runtime Evidence Profiles and Browser/Cloud/Device Adapter Contracts

**Files:**

- Create: `src/standard_harness/evidence/__init__.py`
- Create: `src/standard_harness/evidence/profiles.py`
- Create: `src/standard_harness/evidence/runtime.py`
- Create: `src/standard_harness/runtime/__init__.py`
- Create: `src/standard_harness/runtime/browser_contract.py`
- Create: `src/standard_harness/runtime/cloud_contract.py`
- Create: `src/standard_harness/runtime/device_contract.py`
- Create: `tests/contract/test_runtime_evidence_profiles.py`
- Create: `tests/contract/test_browser_evidence_contract.py`
- Create: `tests/contract/test_cloud_device_adapter_contract.py`

- [ ] **Step 1: Write runtime profile tests**

Tests must prove:

- API-only evidence cannot close browser workflow claim
- render-only screenshot cannot close functional UI claim
- schema-only DB evidence cannot close runtime persistence claim
- mock-only evidence cannot close high or critical runtime claim without authorized substitute decision

- [ ] **Step 2: Implement evidence profile catalog**

Profiles:

```text
cli_command
unit_test
integration_test
api_runtime
browser_render
browser_functional
db_schema
db_runtime_persistence
cloud_execution
device_execution
manual_runtime
substitute_evidence
```

- [ ] **Step 3: Implement browser contract record**

Browser functional evidence must include:

```text
scenario_id
preconditions
user_actions
expected_assertions
actual_assertions
data_runtime_side_effects
browser_tool_identity
viewport
artifacts_captured
result_status
residual_gap
```

- [ ] **Step 4: Implement cloud and device contracts**

Cloud evidence must record project, account, region, identity, command, artifact manifest, and failure class.

Device evidence must record target identity, OS or runtime fingerprint, command, artifact manifest, and failure class.

- [ ] **Step 5: Verify**

Run:

```powershell
python -m unittest tests.contract.test_runtime_evidence_profiles
python -m unittest tests.contract.test_browser_evidence_contract
python -m unittest tests.contract.test_cloud_device_adapter_contract
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/evidence src/standard_harness/runtime tests/contract/test_runtime_evidence_profiles.py tests/contract/test_browser_evidence_contract.py tests/contract/test_cloud_device_adapter_contract.py
git commit -m "feat: add runtime evidence profiles"
```

## FP-07: Workflow Orchestration, Review Bundles, and Context Routing

**Files:**

- Modify: `src/standard_harness/workflow/__init__.py`
- Create: `src/standard_harness/workflow/orchestration.py`
- Create: `src/standard_harness/reviews/__init__.py`
- Create: `src/standard_harness/reviews/bundles.py`
- Create: `src/standard_harness/reviews/routing.py`
- Modify: `src/standard_harness/projection/current_context.py`
- Create: `tests/contract/test_workflow_orchestration.py`
- Create: `tests/contract/test_review_bundle_staleness.py`
- Create: `tests/evals/test_stale_context_rejected.py`

- [ ] **Step 1: Write tests**

Tests must prove:

- implementation cannot start before required approval
- review bundle records source event watermark and packet version
- stale review bundle cannot close a packet
- context routing never lets untrusted content override approved SSOT, packet state, or gates

- [ ] **Step 2: Implement workflow orchestration records**

Records must include:

```text
workflow_run_id
packet_id
phase
actor_role
input_projection_id
source_watermark
status
retry_count
blocker_diagnostic_ids
```

- [ ] **Step 3: Implement immutable review bundles**

Review bundle records must include:

```text
review_bundle_id
packet_id
packet_version
requirement_snapshot
acceptance_criteria_snapshot
evidence_manifest_snapshot
adapter_model_identity
source_watermark
freshness_status
```

- [ ] **Step 4: Verify**

Run:

```powershell
python -m unittest tests.contract.test_workflow_orchestration
python -m unittest tests.contract.test_review_bundle_staleness
python -m unittest tests.evals.test_stale_context_rejected
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/standard_harness/workflow src/standard_harness/reviews src/standard_harness/projection/current_context.py tests/contract/test_workflow_orchestration.py tests/contract/test_review_bundle_staleness.py tests/evals/test_stale_context_rejected.py
git commit -m "feat: add workflow orchestration and review bundles"
```

## FP-08: Advanced Git Reconciliation

**Files:**

- Create: `src/standard_harness/gitops/__init__.py`
- Create: `src/standard_harness/gitops/snapshots.py`
- Create: `src/standard_harness/gitops/reconciliation.py`
- Modify: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_git_reconciliation.py`
- Create: `tests/integration/test_git_reconciliation_closeout_block.py`

- [ ] **Step 1: Write tests**

Tests must use temporary git repositories under `C:\tmp` or `tempfile.TemporaryDirectory()`.

Required cases:

```text
untracked file in packet-owned zone blocks closeout
ignored file is classified separately
modified registered artifact is expected when evidence exists
moved artifact creates reconciliation event
deleted artifact creates reconciliation event
branch identity is recorded
automatic repair requires explicit approval
```

- [ ] **Step 2: Implement git snapshot service**

Snapshot fields:

```text
git_snapshot_id
repo_root
branch_name
commit_id
worktree_path
tracked_changes
untracked_files
ignored_files
source_watermark
```

- [ ] **Step 3: Implement reconciliation service**

Classifications:

```text
expected_registered_change
unregistered_change
ignored_change
moved_artifact
deleted_artifact
external_tool_drift
branch_switch
merge_conflict
repair_requires_approval
```

- [ ] **Step 4: Integrate with closeout**

Closeout must block when packet-owned zones contain unregistered changes.

- [ ] **Step 5: Verify**

Run:

```powershell
python -m unittest tests.contract.test_git_reconciliation
python -m unittest tests.integration.test_git_reconciliation_closeout_block
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/gitops src/standard_harness/domain/closeout.py src/standard_harness/state/migrations.py tests/contract/test_git_reconciliation.py tests/integration/test_git_reconciliation_closeout_block.py
git commit -m "feat: add advanced git reconciliation"
```

## FP-09: Policy Bundles, Profiles, Dependency, Security, Privacy, and IP Governance

**Files:**

- Create: `src/standard_harness/policy/__init__.py`
- Create: `src/standard_harness/policy/bundles.py`
- Create: `src/standard_harness/policy/dependency.py`
- Create: `src/standard_harness/policy/profiles.py`
- Create: `src/standard_harness/policy/risk.py`
- Create: `src/standard_harness/security/__init__.py`
- Create: `src/standard_harness/security/privacy.py`
- Create: `src/standard_harness/security/redaction.py`
- Create: `src/standard_harness/security/ip_license.py`
- Create: `tests/contract/test_policy_bundle_profile.py`
- Create: `tests/contract/test_dependency_intake_policy.py`
- Create: `tests/contract/test_security_privacy_ip_policy.py`

- [ ] **Step 1: Write tests**

Tests must prove:

- policy bundle version is recorded in readiness and closeout
- profile conflict detection blocks incompatible active profiles
- dependency intake records source, license, install scripts, network behavior, trust tier, and rollback path
- secret-like evidence snippets are redacted
- unclear license provenance blocks release or publication

- [ ] **Step 2: Implement policy bundle service**

Policy bundle fields:

```text
policy_bundle_id
version
risk_taxonomy_version
gate_policy_version
validator_policy_version
skill_policy_version
adapter_policy_version
security_data_policy_version
compatibility_status
```

- [ ] **Step 3: Implement profile service**

Profiles:

```text
web
mobile
data
finance
security_sensitive
```

Profile rules may strengthen gates. They must not bypass core gates.

- [ ] **Step 4: Implement dependency and IP policy**

Dependency intake records:

```text
dependency_id
name
version
source
license_basis
install_scripts
network_behavior
trust_tier
waiver_expiry
rollback_path
```

IP/license risk records:

```text
source
license_or_usage_basis
generated_vs_copied
attribution_need
uncertainty
release_blocking_status
```

- [ ] **Step 5: Verify**

Run:

```powershell
python -m unittest tests.contract.test_policy_bundle_profile
python -m unittest tests.contract.test_dependency_intake_policy
python -m unittest tests.contract.test_security_privacy_ip_policy
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/policy src/standard_harness/security tests/contract/test_policy_bundle_profile.py tests/contract/test_dependency_intake_policy.py tests/contract/test_security_privacy_ip_policy.py
git commit -m "feat: add policy profile and security governance"
```

## FP-10: PMO Projections, Cost Tracking, and Dashboard Read Model

**Files:**

- Create: `src/standard_harness/pmo/__init__.py`
- Create: `src/standard_harness/pmo/projections.py`
- Create: `src/standard_harness/pmo/cost.py`
- Create: `src/standard_harness/dashboard/__init__.py`
- Create: `src/standard_harness/dashboard/read_model.py`
- Create: `tests/contract/test_pmo_projection.py`
- Create: `tests/contract/test_cost_tracking.py`
- Create: `tests/integration/test_dashboard_read_model.py`

- [ ] **Step 1: Write tests**

Tests must prove:

- PMO report reads canonical state and projections
- PMO report cannot mutate packet state
- dashboard read model exposes packet lifecycle, approval, evidence, claim, gate, closeout, diagnostics, and projection freshness
- dashboard stale projection warning is visible in read model
- cost records are signals and never suppress required evidence or gates

- [ ] **Step 2: Implement PMO projection service**

PMO projection fields:

```text
pmo_projection_id
source_event_range
source_watermark
packet_counts
blocked_packets
open_risks
milestone_summary
dependency_summary
diagnostic_summary
freshness_status
```

- [ ] **Step 3: Implement cost tracking**

Cost record fields:

```text
cost_record_id
packet_id
tool_name
operation_type
usage_quantity
usage_unit
cost_estimate
risk_tier
source_watermark
```

- [ ] **Step 4: Implement dashboard read model**

Dashboard read model returns JSON-ready dictionaries only. Do not build a UI before the read model is stable.

- [ ] **Step 5: Verify**

Run:

```powershell
python -m unittest tests.contract.test_pmo_projection
python -m unittest tests.contract.test_cost_tracking
python -m unittest tests.integration.test_dashboard_read_model
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/pmo src/standard_harness/dashboard tests/contract/test_pmo_projection.py tests/contract/test_cost_tracking.py tests/integration/test_dashboard_read_model.py
git commit -m "feat: add PMO and dashboard read models"
```

## FP-11: Cloud Orchestration Contract

**Files:**

- Create: `src/standard_harness/cloud/__init__.py`
- Create: `src/standard_harness/cloud/orchestration.py`
- Modify: `src/standard_harness/adapters/invocation.py`
- Create: `tests/contract/test_cloud_orchestration_contract.py`
- Create: `tests/evals/test_cloud_failure_degrades_safely.py`

- [ ] **Step 1: Write tests**

Tests must prove:

- remote work requires packet id, actor identity, permission roots, input snapshot, and evidence output
- cloud failure produces structured diagnostics
- missing cloud service degrades to local/manual blocked path
- cloud orchestration cannot bypass approval, evidence, gate, or closeout rules

- [ ] **Step 2: Implement orchestration contract**

Cloud orchestration records:

```text
orchestration_run_id
packet_id
actor_id
actor_role
remote_environment_id
permission_roots
input_snapshot_hash
adapter_run_ids
status
failure_classification
diagnostic_ids
source_watermark
```

- [ ] **Step 3: Verify**

Run:

```powershell
python -m unittest tests.contract.test_cloud_orchestration_contract
python -m unittest tests.evals.test_cloud_failure_degrades_safely
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/standard_harness/cloud src/standard_harness/adapters/invocation.py tests/contract/test_cloud_orchestration_contract.py tests/evals/test_cloud_failure_degrades_safely.py
git commit -m "feat: add cloud orchestration contract"
```

## FP-12: High-Integrity Signing, Retention, Redaction, and Audit

**Files:**

- Create: `src/standard_harness/integrity/__init__.py`
- Create: `src/standard_harness/integrity/signing.py`
- Create: `src/standard_harness/integrity/verification.py`
- Create: `src/standard_harness/retention/__init__.py`
- Create: `src/standard_harness/retention/policies.py`
- Create: `src/standard_harness/retention/audit.py`
- Modify: `src/standard_harness/state/migrations.py`
- Create: `tests/contract/test_high_integrity_signing.py`
- Create: `tests/contract/test_retention_policy.py`
- Create: `tests/contract/test_redaction_audit.py`

- [ ] **Step 1: Write tests**

Tests must prove:

- signed event verification passes for unchanged payload
- signed event verification fails for tampered payload
- missing signature blocks High-Integrity closeout
- retention policy classifies evidence artifacts, logs, projections, and archived reports
- redaction event preserves audit trace without exposing secret value

- [ ] **Step 2: Implement signing service**

For the first High-Integrity slice, use Python standard-library HMAC for deterministic local tests. Do not present HMAC as external PKI.

Signature fields:

```text
signature_id
signed_entity_type
signed_entity_id
algorithm
key_id
payload_hash
signature_value
signed_at
signer_id
source_watermark
```

- [ ] **Step 3: Implement retention policy service**

Retention policy fields:

```text
retention_policy_id
artifact_class
retention_minimum_days
purge_rule
archive_rule
regeneration_expectation
approval_required
```

- [ ] **Step 4: Implement redaction audit service**

Redaction fields:

```text
redaction_event_id
entity_type
entity_id
field
redaction_reason
redacted_hash
actor_id
source_watermark
```

- [ ] **Step 5: Verify**

Run:

```powershell
python -m unittest tests.contract.test_high_integrity_signing
python -m unittest tests.contract.test_retention_policy
python -m unittest tests.contract.test_redaction_audit
python -m unittest discover -s tests
```

Expected:

```text
OK
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/standard_harness/integrity src/standard_harness/retention src/standard_harness/state/migrations.py tests/contract/test_high_integrity_signing.py tests/contract/test_retention_policy.py tests/contract/test_redaction_audit.py
git commit -m "feat: add high-integrity signing and retention"
```

## FP-13: Final Conformance Report and Release Tag

**Files:**

- Create: `docs/release/final-product-conformance-report-v1.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Create final conformance report**

Create `docs/release/final-product-conformance-report-v1.md` with:

```markdown
# Standard Harness Final Product Conformance Report v1

## Scope

This report records the implemented Standard, Advanced, and High-Integrity conformance slices.

## Verification

```powershell
python -m unittest discover -s tests
```

## Conformance Summary

- Kernel: implemented
- Standard: implemented after final-product deferred work plan execution
- Advanced: implemented after final-product deferred work plan execution
- High-Integrity: implemented after final-product deferred work plan execution

## Boundaries Preserved

- Packet-state-evidence-gate-closeout chain remains canonical.
- Generated projections remain non-authoritative.
- Adapters cannot mutate canonical state directly.
- Completion cannot pass without evidence.
- Human approval boundaries remain explicit.
```

- [ ] **Step 2: Run final verification**

Run:

```powershell
python -m unittest discover -s tests
git status --short
```

Expected:

```text
OK
```

and no unintended tracked changes.

- [ ] **Step 3: Tag only after human approval**

If Human Owner approves a final-product tag, run:

```powershell
git tag -a v1.0.0 -m "Standard Harness v2 final product baseline"
git push origin v1.0.0
```

If Human Owner does not approve, do not create the tag.

## Cross-Workstream Gates

Before closing any workstream:

- run its focused tests
- run `python -m unittest discover -s tests`
- ensure no test uses development `.harness/state/harness.sqlite3`
- ensure no generated Markdown is canonical state
- ensure all new materialized records derive from events
- ensure diagnostics are machine-readable and human-readable
- update `docs/implementation/standard-harness-final-product-conformance-slices-v1.md` when conformance coverage changes

## Stop Conditions

Stop and ask for human decision when:

- external dependency intake is needed
- a task requires cloud credentials, device credentials, browser account login, or secret material
- a schema migration cannot preserve existing MVP state
- a final-product feature would weaken Kernel invariants
- dashboard or cloud work would become the only audit source
- signing or retention behavior implies legal, compliance, or enterprise policy decisions
- automatic Git repair would change source files without explicit approval

## Self-Review Checklist

- [ ] Every deferred item in `docs/implementation/standard-harness-post-mvp-work-packets-v1.md` maps to at least one FP task.
- [ ] Standard conformance can be released before Advanced and High-Integrity.
- [ ] High-Integrity work does not make low-risk Kernel operation unusable.
- [ ] Adapter work remains provider-neutral.
- [ ] Dashboard work reads canonical state but does not replace it.
- [ ] Cloud orchestration degrades safely when unavailable.
- [ ] Final report includes fresh verification output.
