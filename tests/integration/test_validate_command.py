import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class ValidateCommandTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_validate_all_fails_with_missing_evidence_diagnostics(self):
        from standard_harness.domain.gates import GateService

        with tempfile.TemporaryDirectory() as tmp:
            store = self._create_packet_with_requirement(tmp)
            gates = GateService(store)
            gates.declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="evidence",
                requirement_level="hard",
                declared_by_source="packet",
                idempotency_key="gate-declare-001",
            )
            gates.activate_gate(
                gate_activation_id="gact-001",
                gate_id="gate-001",
                packet_id="pkt-001",
                idempotency_key="gate-activate-001",
            )

            result = self._validate(tmp, "--all", "--packet-id", "pkt-001")

            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "error")
            diagnostics = payload["diagnostics"]
            self.assertIn("missing_evidence", {item["error_code"] for item in diagnostics})
            repair_hints = " ".join(item["repair_hint"] for item in diagnostics)
            self.assertIn("evidence", repair_hints.lower())

    def test_validate_all_passes_for_closed_low_risk_packet(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.projection.current_context import CurrentContextProjection

        with tempfile.TemporaryDirectory() as tmp:
            store = self._create_packet_with_requirement(tmp)
            evidence = EvidenceService(store)
            evidence.register_evidence(
                evidence_id="ev-001",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="unittest",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="tests/integration/test_validate_command.py",
                content="validate command evidence",
                result_status="passed",
                rationale="validate command test",
                idempotency_key="evidence-ev-001",
            )
            evidence.record_claim(
                claim_id="claim-001",
                packet_id="pkt-001",
                requirement_id="REQ-001",
                acceptance_criterion_id="ac-001",
                evidence_ids=["ev-001"],
                support_status="supported",
                idempotency_key="claim-001",
            )
            gates = GateService(store)
            gates.declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="evidence",
                requirement_level="hard",
                declared_by_source="packet",
                idempotency_key="gate-declare-001",
            )
            gates.activate_gate(
                gate_activation_id="gact-001",
                gate_id="gate-001",
                packet_id="pkt-001",
                idempotency_key="gate-activate-001",
            )
            gates.record_gate_result(
                gate_result_id="gres-001",
                gate_id="gate-001",
                packet_id="pkt-001",
                checked_claim_ids=["claim-001"],
                evidence_ids=["ev-001"],
                status="pass",
                requirement_level="hard",
                rationale="supported by passed evidence",
                idempotency_key="gate-result-001",
            )
            CloseoutService(store).close_packet(
                closeout_id="close-001",
                packet_id="pkt-001",
                authority_basis="validate command",
                rationale="closed before validate",
                idempotency_key="closeout-001",
            )
            CurrentContextProjection(store).generate(packet_id="pkt-001")

            result = self._validate(tmp, "--all", "--packet-id", "pkt-001")

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ok")
            self.assertEqual(payload["diagnostics"], [])

    def _create_packet_with_requirement(self, tmp: str):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        store = HarnessStore(Path(tmp))
        store.initialize()
        packets = PacketService(store)
        packets.create_packet(
            packet_id="pkt-001",
            title="Validate packet",
            objective="Exercise validate command.",
            risk_class="low",
            scope_summary="Validate one packet.",
            out_of_scope_summary="No external systems.",
            change_zones=["tests/integration"],
            acceptance_criteria_ids=["ac-001"],
            evidence_requirements=["unittest-output"],
            closeout_criteria=["supported-claim", "passing-gate"],
            owner="human-owner",
            idempotency_key="packet-create-pkt-001",
        )
        packets.approve_packet(
            packet_id="pkt-001",
            approver_id="owner-1",
            approver_role="Human Owner",
            authority_basis="explicit approval",
            approved_scope="validate test packet",
            rationale="validate setup",
            idempotency_key="approve-pkt-001",
        )
        registry = RequirementRegistry(store)
        registry.register_requirement(
            requirement_id="REQ-001",
            version="1",
            source_doc="docs/requirements/example.md",
            status="approved",
            classification="Core",
            risk_classification="low",
            acceptance_criteria=["ac-001"],
            completion_classification="evidence-required",
            packet_id="pkt-001",
            idempotency_key="requirement-REQ-001",
        )
        registry.register_acceptance_criterion(
            acceptance_criterion_id="ac-001",
            requirement_id="REQ-001",
            packet_id="pkt-001",
            description="Validate packet has evidence.",
            status="approved",
            idempotency_key="acceptance-ac-001",
        )
        return store

    def _validate(self, harness_root: str, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(CLI),
                "--json",
                "--harness-root",
                harness_root,
                "validate",
                *args,
            ],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )


if __name__ == "__main__":
    unittest.main()
