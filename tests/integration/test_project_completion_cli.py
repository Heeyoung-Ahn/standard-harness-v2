import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class ProjectCompletionCliTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_project_completion_all_reports_complete(self):
        with tempfile.TemporaryDirectory() as tmp:
            _create_complete_requirement(Path(tmp))

            result = self._run(
                tmp,
                "project-completion",
                "--all",
                "--completion-result-id",
                "pcg-cli",
                "--idempotency-key",
                "pcg-cli",
            )

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "complete")
            self.assertEqual(payload["completion"]["completion_result_id"], "pcg-cli")
            self.assertEqual(payload["completion"]["requirement_counts"]["implemented"], 1)
            self.assertEqual(_completion_result_count(Path(tmp)), 1)

            replayed = self._run(
                tmp,
                "project-completion",
                "--all",
                "--completion-result-id",
                "ignored-pcg-cli",
                "--idempotency-key",
                "pcg-cli",
            )

            self.assertEqual(replayed.returncode, 0, replayed.stderr + replayed.stdout)
            replayed_payload = json.loads(replayed.stdout)
            self.assertEqual(
                replayed_payload["completion"]["completion_result_id"],
                "pcg-cli",
            )
            self.assertEqual(_completion_result_count(Path(tmp)), 1)

    def test_project_completion_requirement_reports_blocked(self):
        with tempfile.TemporaryDirectory() as tmp:
            _create_uncovered_requirement(Path(tmp))

            result = self._run(
                tmp,
                "project-completion",
                "--requirement-id",
                "REQ-A",
                "--completion-result-id",
                "pcg-cli",
                "--idempotency-key",
                "pcg-cli",
            )

            self.assertEqual(result.returncode, 1)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked")
            self.assertEqual(payload["completion"]["completion_result_id"], "pcg-cli")
            self.assertEqual(_completion_result_count(Path(tmp)), 1)
            self.assertEqual(payload["completion"]["requirement_counts"]["unverified"], 1)
            self.assertIn(
                "missing_supported_claim",
                {item["error_code"] for item in payload["completion"]["diagnostics"]},
            )

    def _run(self, harness_root: str, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(CLI),
                "--json",
                "--harness-root",
                harness_root,
                *args,
            ],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )


def _create_uncovered_requirement(root: Path):
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-a",
        title="Completion CLI packet",
        objective="Exercise project completion CLI.",
        risk_class="low",
        scope_summary="CLI fixture.",
        out_of_scope_summary="No external systems.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-a"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["supported-claim", "passing-gate"],
        owner="human-owner",
        idempotency_key="packet-create-pkt-a",
    )
    PacketService(store).approve_packet(
        packet_id="pkt-a",
        approver_id="owner-1",
        approver_role="Human Owner",
        authority_basis="explicit approval",
        approved_scope="completion CLI fixture",
        rationale="completion CLI setup",
        idempotency_key="approve-pkt-a",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-A",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="low",
        acceptance_criteria=["ac-a"],
        completion_classification="implemented",
        packet_id="pkt-a",
        idempotency_key="requirement-REQ-A",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-a",
        requirement_id="REQ-A",
        packet_id="pkt-a",
        description="CLI fixture has evidence.",
        status="approved",
        idempotency_key="acceptance-ac-a",
    )
    return store


def _create_complete_requirement(root: Path):
    from standard_harness.domain.closeout import CloseoutService
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService

    store = _create_uncovered_requirement(root)
    EvidenceService(store).register_evidence(
        evidence_id="ev-a",
        packet_id="pkt-a",
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/integration/test_project_completion_cli.py",
        content="completion cli evidence",
        result_status="passed",
        rationale="completion CLI evidence",
        idempotency_key="evidence-ev-a",
    )
    EvidenceService(store).record_claim(
        claim_id="claim-a",
        packet_id="pkt-a",
        requirement_id="REQ-A",
        acceptance_criterion_id="ac-a",
        evidence_ids=["ev-a"],
        support_status="supported",
        idempotency_key="claim-a",
    )
    gates = GateService(store)
    gates.declare_gate(
        gate_id="gate-a",
        packet_id="pkt-a",
        gate_type="evidence",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key="gate-declare-a",
    )
    gates.activate_gate(
        gate_activation_id="gact-a",
        gate_id="gate-a",
        packet_id="pkt-a",
        idempotency_key="gate-activate-a",
    )
    gates.record_gate_result(
        gate_result_id="gres-a",
        gate_id="gate-a",
        packet_id="pkt-a",
        checked_claim_ids=["claim-a"],
        evidence_ids=["ev-a"],
        status="pass",
        requirement_level="hard",
        rationale="supported by passed evidence",
        idempotency_key="gate-result-a",
    )
    CloseoutService(store).close_packet(
        closeout_id="co-a",
        packet_id="pkt-a",
        authority_basis="completion CLI closeout",
        rationale="complete fixture",
        idempotency_key="closeout-a",
    )
    return store


def _completion_result_count(root: Path) -> int:
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    with store.connection() as conn:
        row = conn.execute(
            "select count(*) as count from project_completion_results"
        ).fetchone()
    return int(row["count"])


if __name__ == "__main__":
    unittest.main()
