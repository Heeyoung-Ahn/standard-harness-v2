import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class MissingEvidenceBlocksCompletionEval(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_missing_evidence_blocks_supported_claim_gate_pass_and_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            packets = PacketService(store)
            packets.create_packet(
                packet_id="pkt-001",
                title="Missing evidence eval",
                objective="Prove completion cannot pass without evidence.",
                risk_class="low",
                scope_summary="Eval missing evidence handling.",
                out_of_scope_summary="No production adapter execution.",
                change_zones=["tests/evals/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unittest output"],
                closeout_criteria=["supported claim", "passing gate"],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )
            packets.approve_packet(
                packet_id="pkt-001",
                approver_id="owner-1",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="negative eval packet",
                rationale="MVP negative eval",
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
                description="Completion has supporting evidence.",
                status="approved",
                idempotency_key="acceptance-ac-001",
            )

            evidence = EvidenceService(store)
            with self.assertRaises(ValueError):
                evidence.record_claim(
                    claim_id="claim-001",
                    packet_id="pkt-001",
                    requirement_id="REQ-001",
                    acceptance_criterion_id="ac-001",
                    evidence_ids=[],
                    support_status="supported",
                    idempotency_key="claim-001",
                )

            gate_service = GateService(store)
            gate_service.declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="evidence",
                requirement_level="hard",
                declared_by_source="packet",
                idempotency_key="gate-declare-001",
            )
            gate_service.activate_gate(
                gate_activation_id="gact-001",
                gate_id="gate-001",
                packet_id="pkt-001",
                idempotency_key="gate-activate-001",
            )
            with self.assertRaises(ValueError):
                gate_service.record_gate_result(
                    gate_result_id="gres-001",
                    gate_id="gate-001",
                    packet_id="pkt-001",
                    checked_claim_ids=[],
                    evidence_ids=[],
                    status="pass",
                    requirement_level="hard",
                    rationale="no evidence",
                    idempotency_key="gate-result-001",
                )

            closeout = CloseoutService(store).close_packet(
                closeout_id="close-001",
                packet_id="pkt-001",
                authority_basis="negative eval",
                rationale="Must block without evidence.",
                idempotency_key="closeout-001",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_evidence", closeout["diagnostic_ids"])
            self.assertIn("missing_gate_pass", closeout["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
