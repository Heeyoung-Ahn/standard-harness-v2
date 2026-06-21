import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ManualOnlyEvidenceCannotCloseoutEval(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_manual_only_evidence_blocks_code_packet_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService

        tmp, store = _ready_code_packet()
        with tmp:
            evidence = EvidenceService(store)
            evidence.register_evidence(
                evidence_id="ev-manual",
                packet_id="pkt-001",
                claim_id=None,
                command_or_tool="python -m unittest",
                runner="tester",
                cwd_or_execution_context=str(ROOT),
                environment_fingerprint="python-test",
                artifact_path="manual.log",
                content="passed output",
                result_status="passed",
                rationale="manual handoff",
                idempotency_key="ev-manual",
            )
            evidence.record_claim(
                claim_id="claim-001",
                packet_id="pkt-001",
                requirement_id="REQ-001",
                acceptance_criterion_id="ac-001",
                evidence_ids=["ev-manual"],
                support_status="supported",
                idempotency_key="claim-001",
            )
            gates = GateService(store)
            gates.declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="evidence-trust",
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
                evidence_ids=["ev-manual"],
                status="pass",
                requirement_level="hard",
                rationale="legacy pass result cannot imply trust",
                idempotency_key="gate-result-001",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-001",
                packet_id="pkt-001",
                authority_basis="closeout",
                rationale="manual evidence should block",
                idempotency_key="close-001",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_trusted_evidence", closeout["diagnostic_ids"])


def _ready_code_packet():
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    tmp = tempfile.TemporaryDirectory()
    store = HarnessStore(Path(tmp.name))
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Code evidence packet",
        objective="Close only with trusted evidence.",
        packet_type="product-feature",
        risk_class="medium",
        scope_summary="Runtime code change.",
        out_of_scope_summary="No browser workflow.",
        change_zones=["src/standard_harness/domain/evidence.py"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["trusted-test-evidence"],
        test_plan=["python -m unittest tests.evals.test_manual_only_evidence_cannot_closeout"],
        closeout_criteria=["supported-claim", "trusted-evidence"],
        owner="human-owner",
        approval_required=False,
        idempotency_key="packet-create-pkt-001",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-001"],
        completion_classification="unverified",
        packet_id="pkt-001",
        idempotency_key="requirement-REQ-001",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Trusted evidence closes the packet.",
        status="proposed",
        idempotency_key="acceptance-ac-001",
    )
    return tmp, store


if __name__ == "__main__":
    unittest.main()
