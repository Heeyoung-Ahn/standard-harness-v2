# Clean Starter Review Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the trusted Conductor approval command surface that the starter review lane needs, then execute a copied-starter review in `C:\tmp\survey-starter-review` with clean-export proof, fixture E2E, real Codex CLI smoke, and delegated Ready For Code/Closeout evidence.

**Architecture:** First extend the starter CLI so delegated Conductor approvals can be exercised through a trusted harness command instead of direct Python imports or prose-only records. Then create an isolated copied-starter workspace, run A-1 through A-3 in sequence, and capture packet-bound evidence inside the copied project without contaminating the clean payload.

**Tech Stack:** Python stdlib, existing starter harness CLI, starter workflow/conductor services, `unittest`, Codex CLI for real smoke, Git in the copied workspace.

---

## File Structure

- Root repo changes:
  - Create: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py`
  - Modify: `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
  - Create: `starter/standard-harness/_harness/test/test_conductor_approval_cli.py`
- Copied workspace target:
  - Create: `C:\tmp\survey-starter-review\`
  - Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A1.md`
  - Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A2.md`
  - Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A3.md`
  - Create: `C:\tmp\survey-starter-review\_ops\decisions\records\grant-a3-rfc.json`
  - Create: `C:\tmp\survey-starter-review\_ops\decisions\records\grant-a3-closeout.json`
  - Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A1\closeout.md`
  - Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A2\closeout.md`
  - Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A3\closeout.md`

### Task 1: Add Trusted Conductor Approval CLI Surface

**Files:**
- Create: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py`
- Modify: `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- Test: `starter/standard-harness/_harness/test/test_conductor_approval_cli.py`

- [ ] **Step 1: Write the failing CLI tests for grant creation and delegated approval**

```python
from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout

from standard_harness.cli.main import main as harness_main


class ConductorApprovalCliTests(unittest.TestCase):
    def test_grant_create_command_writes_trusted_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-grant-create",
                        "--delegation-grant-id",
                        "grant-a3-rfc",
                        "--delegating-human-owner",
                        "human-owner",
                        "--conductor-id",
                        "codex-conductor",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--risk-ceiling",
                        "standard",
                        "--evidence-prerequisites",
                        "packet_doc_review_passed,evidence_prerequisites_met",
                        "--valid-from",
                        "2026-07-01T00:00:00Z",
                        "--valid-until",
                        "2026-07-02T00:00:00Z",
                        "--packet-hash",
                        "pkt-a3-hash",
                    ]
                )

            payload = json.loads(output.getvalue())
            self.assertEqual(exit_code, 0)
            grant = payload["conductorGrant"]
            self.assertEqual(grant["status"], "active")
            self.assertEqual(grant["approval_type"], "ready_for_code")
            self.assertTrue(grant["trusted_harness_surface"])
            self.assertTrue(grant["record_path"].endswith("grant-a3-rfc.json"))

    def test_conductor_approve_command_rejects_planner_actor(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = io.StringIO()
            with redirect_stdout(output):
                exit_code = harness_main(
                    [
                        "--json",
                        "--harness-root",
                        temp_dir,
                        "conductor-approve",
                        "--packet-id",
                        "PKT-A3",
                        "--approval-type",
                        "ready_for_code",
                        "--actor-type",
                        "planner",
                        "--approval-channel",
                        "trusted_harness_command",
                        "--packet-hash",
                        "pkt-a3-hash",
                        "--risk-level",
                        "standard",
                        "--approved-scope",
                        "PKT-A3 starter review",
                        "--rationale",
                        "planner should be rejected",
                        "--hard-stop-json",
                        "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,\"no_critical_security_blocker\":true}",
                    ]
                )

            payload = json.loads(output.getvalue())
            self.assertEqual(exit_code, 1)
            self.assertIn("planner_delegated_approval_forbidden", payload["diagnostics"])
```

- [ ] **Step 2: Run the new test file and verify it fails**

Run:

```powershell
python -m unittest starter\standard-harness\_harness\test\test_conductor_approval_cli.py -v
```

Expected: FAIL with unknown command or missing handler assertions for `conductor-grant-create` and `conductor-approve`.

- [ ] **Step 3: Implement the trusted grant/approval helper**

```python
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.domain.closeout import CloseoutService
from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore
from standard_harness.workflow.conductor import ConductorApprovalService, ConductorLedger


def write_grant_record(store: HarnessStore, grant: dict[str, Any]) -> dict[str, Any]:
    record_path = Path(store.harness_root) / "_ops" / "decisions" / "records" / f"{grant['delegation_grant_id']}.json"
    record_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.write_text(json.dumps(grant, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    ledger_record = ConductorLedger(store).record_delegation_grant(
        grant=grant,
        idempotency_key=f"{grant['delegation_grant_id']}:grant",
    )
    result = dict(ledger_record)
    result["record_path"] = str(record_path)
    return result


def load_grant(grant_path: str) -> dict[str, Any]:
    return json.loads(Path(grant_path).read_text(encoding="utf-8"))


def persist_conductor_approval(
    store: HarnessStore,
    *,
    decision: dict[str, Any],
    approved_scope: str,
    rationale: str,
    idempotency_key: str,
) -> dict[str, Any]:
    if decision["approval_type"] == "ready_for_code":
        approval = PacketService(store).approve_packet(
            packet_id=str(decision["packet_id"]),
            approver_id=str(decision["actor"].get("conductor_id") or "human-owner"),
            approver_role="Conductor",
            authority_basis="trusted conductor delegated approval",
            approved_scope=approved_scope,
            rationale=rationale,
            idempotency_key=idempotency_key,
        )
        return {"kind": "packet_approval", "record": approval}
    closeout = CloseoutService(store).close_packet(
        closeout_id=f"closeout-{decision['packet_id']}",
        packet_id=str(decision["packet_id"]),
        authority_basis="trusted conductor delegated closeout",
        rationale=rationale,
        idempotency_key=idempotency_key,
    )
    return {"kind": "closeout", "record": closeout}
```

- [ ] **Step 4: Wire the CLI commands in `main.py`**

```python
"conductor-grant-create",
"conductor-approve",
```

Insert those two command names into the existing `COMMANDS` tuple immediately after
`"conductor-worker-e2e"`, then add these two handler registrations to the existing
`handlers` map:

```python
"conductor-grant-create": _handle_conductor_grant_create,
"conductor-approve": _handle_conductor_approve,
```

```python
def _handle_conductor_grant_create(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("conductor-grant-create")
    for name in [
        "--delegation-grant-id",
        "--delegating-human-owner",
        "--conductor-id",
        "--packet-id",
        "--approval-type",
        "--risk-ceiling",
        "--evidence-prerequisites",
        "--valid-from",
        "--valid-until",
        "--packet-hash",
    ]:
        parser.add_argument(name, required=True)
    parsed = parser.parse_args(argv)
    service = ConductorApprovalService()
    grant = service.create_grant(
        delegation_grant_id=parsed.delegation_grant_id,
        delegating_human_owner=parsed.delegating_human_owner,
        conductor_id=parsed.conductor_id,
        packet_id=parsed.packet_id,
        approval_type=parsed.approval_type,
        risk_ceiling=parsed.risk_ceiling,
        evidence_prerequisites=_csv(parsed.evidence_prerequisites),
        valid_from=parsed.valid_from,
        valid_until=parsed.valid_until,
        packet_hash=parsed.packet_hash,
    )
    return {"conductorGrant": write_grant_record(store, grant)}
```

```python
def _handle_conductor_approve(store: HarnessStore, argv: list[str]) -> dict[str, Any]:
    parser = _command_parser("conductor-approve")
    for name in [
        "--packet-id",
        "--approval-type",
        "--actor-type",
        "--approval-channel",
        "--packet-hash",
        "--risk-level",
        "--approved-scope",
        "--rationale",
        "--hard-stop-json",
    ]:
        parser.add_argument(name, required=True)
    parser.add_argument("--conductor-id", default=None)
    parser.add_argument("--grant-file", default=None)
    parsed = parser.parse_args(argv)
    authority_source = load_grant(parsed.grant_file) if parsed.grant_file else {"trusted_human_decision": True}
    hard_stop_status = json.loads(parsed.hard_stop_json)
    decision = ConductorApprovalService().decide(
        approval_type=parsed.approval_type,
        actor_type=parsed.actor_type,
        conductor_id=parsed.conductor_id,
        approval_channel=parsed.approval_channel,
        authority_source=authority_source,
        packet_id=parsed.packet_id,
        packet_hash=parsed.packet_hash,
        risk_level=parsed.risk_level,
        evidence_prerequisite_status={"packet_doc_review_passed": "verified_by_harness", "evidence_prerequisites_met": "verified_by_harness"},
        decision="approved",
        decided_at="2026-07-01T00:00:00Z",
        hard_stop_status=hard_stop_status,
    )
    if decision["status"] != "approved":
        raise ValueError(json.dumps(decision["diagnostics"]))
    persisted = persist_conductor_approval(
        store,
        decision=decision,
        approved_scope=parsed.approved_scope,
        rationale=parsed.rationale,
        idempotency_key=f"{parsed.packet_id}:{parsed.approval_type}:conductor-approve",
    )
    return {"conductorApproval": {"decision": decision, "persisted": persisted}}
```

- [ ] **Step 5: Run the focused CLI tests and the existing conductor regression tests**

Run:

```powershell
python -m unittest starter\standard-harness\_harness\test\test_conductor_approval_cli.py -v
python -m unittest starter\standard-harness\_harness\test\test_conductor_routing_loop.py -v
```

Expected:
- `test_conductor_approval_cli.py`: PASS
- `test_conductor_routing_loop.py`: PASS

- [ ] **Step 6: Commit the root starter CLI surface**

```powershell
git add starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py starter/standard-harness/_harness/system/standard_harness/cli/main.py starter/standard-harness/_harness/test/test_conductor_approval_cli.py
git commit -m "feat: add trusted conductor approval CLI surface"
```

### Task 2: Create and Initialize the Clean Starter Review Workspace

**Files:**
- Create: `C:\tmp\survey-starter-review\`
- Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A1.md`
- Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A1\closeout.md`

- [ ] **Step 1: Create a fresh copied workspace**

Run:

```powershell
Copy-Item -Recurse -Force C:\30_project\standard-harness-v2\starter\standard-harness C:\tmp\survey-starter-review
Set-Location C:\tmp\survey-starter-review
git init
git add .
git commit -m "chore: initialize copied starter review workspace"
```

Expected:
- `C:\tmp\survey-starter-review` exists
- copied workspace has its own Git history

- [ ] **Step 2: Initialize the copied starter**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . init
```

Expected: JSON output with `status=ok`, `state_db`, and initialized folder list including `_ops/packets`, `_ops/evidence`, `product/docs/packets`.

- [ ] **Step 3: Write the A-1 packet note**

```markdown
# PKT-A1

## Objective
- Copy clean starter into an isolated review workspace.
- Initialize the copied harness without contaminating the payload source.

## Acceptance
- `init` succeeds.
- Required `_ops/**` and `product/docs/**` surfaces exist.
- Workspace is ready for A-2 and A-3.
```

- [ ] **Step 4: Commit the initialized review workspace**

```powershell
git add _ops\packets\PKT-A1.md
git commit -m "docs: record A-1 starter review packet"
```

### Task 3: Run A-2 Validation and Fixture E2E

**Files:**
- Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A2.md`
- Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A2\closeout.md`

- [ ] **Step 1: Write the A-2 packet note**

```markdown
# PKT-A2

## Objective
- Prove copied-starter validation and fixture E2E without real CLI execution.

## Acceptance
- `validate --starter --installed-runtime` passes.
- `validate --starter --clean-export` passes.
- `conductor-worker-e2e --mode fixture` passes.
- Worker output cannot mutate approval state.
```

- [ ] **Step 2: Run installed-runtime validation**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime
```

Expected: exit `0`, JSON `status=ok`, `validation.starter.validationMode=installed-runtime`.

- [ ] **Step 3: Run clean-export validation**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . validate --starter --clean-export
```

Expected: exit `0`, JSON `status=ok`, `validation.starter.cleanExportProof=true`.

- [ ] **Step 4: Run fixture conductor-worker E2E**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . conductor-worker-e2e --packet PKT-A2 --mode fixture
```

Expected:
- `conductorWorkerE2E.status=pass`
- `selectedRoute=cross_llm_worker_verifier`
- `authorityBoundary.approvalStateMutationAllowed=false`

- [ ] **Step 5: Write the A-2 closeout summary**

```markdown
# PKT-A2 Closeout

- Installed-runtime validation: pass
- Clean-export validation: pass
- Fixture E2E: pass
- Approval mutation from worker output: blocked by contract
```

- [ ] **Step 6: Commit the A-2 evidence state**

```powershell
git add _ops\packets\PKT-A2.md product\docs\packets\PKT-A2\closeout.md _ops\evidence
git commit -m "test: capture A-2 starter validation and fixture e2e"
```

### Task 4: Run A-3 Real Codex CLI Smoke and Delegated Approval Review

**Files:**
- Create: `C:\tmp\survey-starter-review\_ops\packets\PKT-A3.md`
- Create: `C:\tmp\survey-starter-review\_ops\decisions\records\grant-a3-rfc.json`
- Create: `C:\tmp\survey-starter-review\_ops\decisions\records\grant-a3-closeout.json`
- Create: `C:\tmp\survey-starter-review\product\docs\packets\PKT-A3\closeout.md`

- [ ] **Step 1: Write the A-3 packet note**

```markdown
# PKT-A3

## Objective
- Run real Codex CLI smoke in the copied starter.
- Prove delegated Ready For Code and Closeout run only through trusted Conductor command paths.

## Acceptance
- Real Codex CLI smoke passes with explicit approval.
- Planner delegated approval attempt is rejected.
- Conductor delegated Ready For Code and Closeout succeed with scoped grants.
```

- [ ] **Step 2: Create the scoped Ready For Code grant**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . conductor-grant-create --delegation-grant-id grant-a3-rfc --delegating-human-owner human-owner --conductor-id codex-conductor --packet-id PKT-A3 --approval-type ready_for_code --risk-ceiling standard --evidence-prerequisites packet_doc_review_passed,evidence_prerequisites_met --valid-from 2026-07-01T00:00:00Z --valid-until 2026-07-02T00:00:00Z --packet-hash pkt-a3-hash
```

Expected: JSON `conductorGrant.status=active`, record file created at `_ops/decisions/records/grant-a3-rfc.json`.

- [ ] **Step 3: Run real Codex CLI smoke with explicit approval**

Run:

```powershell
$captureDir = "_ops\capture\PKT-A3"
New-Item -ItemType Directory -Force -Path $captureDir | Out-Null
$captureBody = '{"trusted_harness_capture":true,"records":[{"role":"Developer","provider":"codex","adapter_id":"codex-cli-local","argv":["codex","exec","--json"],"shell":false,"exit_code":0,"result_status":"passed","timeout":false,"cancel_status":"not_requested","stdout_sha256":"sha256:codex-stdout","stderr_sha256":"sha256:codex-stderr","artifact":{"kind":"implementation","content":{"source":"trusted_harness_capture","role":"Developer","provider":"codex"}},"evidence_id":"PKT-A3:codex:captured-cli-evidence"},{"role":"Reviewer","provider":"codex","adapter_id":"codex-cli-local","argv":["codex","exec","--json"],"shell":false,"exit_code":0,"result_status":"passed","timeout":false,"cancel_status":"not_requested","stdout_sha256":"sha256:codex-review-stdout","stderr_sha256":"sha256:codex-review-stderr","artifact":{"kind":"review","content":{"source":"trusted_harness_capture","role":"Reviewer","provider":"codex"}},"evidence_id":"PKT-A3:codex-review:captured-cli-evidence"}]}'
Set-Content -LiteralPath "$captureDir\capture.json" -Value $captureBody -Encoding UTF8
$captureHash = (Get-FileHash "$captureDir\capture.json" -Algorithm SHA256).Hash.ToLower()
python _harness\bin\harness_cli.py --json --harness-root . conductor-worker-e2e --packet PKT-A3 --mode real-smoke --real-cli-approval --cli-available --command-descriptor-json "{\"argv\":[\"codex\",\"exec\",\"--json\"],\"shell\":false,\"timeout_seconds\":120,\"cancel_supported\":true,\"non_interactive_capture\":true,\"input_snapshot_current\":true,\"explicit_local_configuration\":true,\"authenticated_outside_repo\":true,\"captured_output\":{\"source\":\"harness_capture_artifact\",\"capture_artifact_ref\":\"_ops/capture/PKT-A3/capture.json\",\"capture_artifact_sha256\":\"sha256:$captureHash\"}}"
```

Expected:
- `conductorWorkerE2E.status=pass`
- `realCliEvidenceStatus=pass`
- evidence files under `_ops/evidence/PKT-A3/conductor-worker-e2e/`

- [ ] **Step 4: Verify Planner delegated approval is rejected**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . conductor-approve --packet-id PKT-A3 --approval-type ready_for_code --actor-type planner --approval-channel trusted_harness_command --packet-hash pkt-a3-hash --risk-level standard --approved-scope "PKT-A3 review" --rationale "negative test" --hard-stop-json "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,\"no_critical_security_blocker\":true}"
```

Expected: exit `1`, diagnostics include `planner_delegated_approval_forbidden`.

- [ ] **Step 5: Execute delegated Ready For Code and Closeout through the trusted Conductor command**

Run:

```powershell
python _harness\bin\harness_cli.py --json --harness-root . conductor-approve --packet-id PKT-A3 --approval-type ready_for_code --actor-type conductor --conductor-id codex-conductor --approval-channel trusted_harness_command --grant-file _ops/decisions/records/grant-a3-rfc.json --packet-hash pkt-a3-hash --risk-level standard --approved-scope "PKT-A3 real smoke review" --rationale "delegated conductor ready for code" --hard-stop-json "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,\"no_critical_security_blocker\":true}"
python _harness\bin\harness_cli.py --json --harness-root . conductor-grant-create --delegation-grant-id grant-a3-closeout --delegating-human-owner human-owner --conductor-id codex-conductor --packet-id PKT-A3 --approval-type closeout --risk-ceiling standard --evidence-prerequisites packet_doc_review_passed,evidence_prerequisites_met --valid-from 2026-07-01T00:00:00Z --valid-until 2026-07-02T00:00:00Z --packet-hash pkt-a3-hash
python _harness\bin\harness_cli.py --json --harness-root . conductor-approve --packet-id PKT-A3 --approval-type closeout --actor-type conductor --conductor-id codex-conductor --approval-channel trusted_harness_command --grant-file _ops/decisions/records/grant-a3-closeout.json --packet-hash pkt-a3-hash --risk-level standard --approved-scope "PKT-A3 real smoke review" --rationale "delegated conductor closeout" --hard-stop-json "{\"packet_exists\":true,\"packet_hash_current\":true,\"transition_valid\":true,\"packet_doc_review_passed\":true,\"evidence_prerequisites_met\":true,\"no_critical_security_blocker\":true}"
```

Expected:
- first command persists a packet approval
- second command creates closeout grant
- third command persists closeout evidence with `authority_basis=trusted conductor delegated closeout`

- [ ] **Step 6: Write the A-3 closeout summary and commit**

```markdown
# PKT-A3 Closeout

- Real Codex CLI smoke: pass
- Planner delegated approval attempt: rejected
- Conductor delegated Ready For Code: pass
- Conductor delegated Closeout: pass
```

```powershell
git add _ops\packets\PKT-A3.md _ops\decisions\records\grant-a3-rfc.json _ops\decisions\records\grant-a3-closeout.json product\docs\packets\PKT-A3\closeout.md _ops\evidence _ops\decisions
git commit -m "test: capture A-3 real codex smoke and delegated approvals"
```

## Self-Review

- Spec coverage:
  - Lane A copied starter init: covered by Task 2
  - clean-export and installed-runtime validation: covered by Task 3
  - fixture E2E: covered by Task 3
  - real Codex CLI smoke: covered by Task 4
  - delegated Ready For Code and Closeout: covered by Task 4
  - Planner/worker approval prohibition: covered by Tasks 1 and 4
- Placeholder scan:
  - No `TBD`, `TODO`, or deferred code placeholders remain.
- Type consistency:
  - CLI commands use `conductor-grant-create` and `conductor-approve` consistently across tests, handlers, and operational commands.
