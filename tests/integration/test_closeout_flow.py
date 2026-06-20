import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CloseoutFlowTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def _store_with_packet_and_registry(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore

        tmp = tempfile.TemporaryDirectory()
        store = HarnessStore(Path(tmp.name))
        store.initialize()
        packets = PacketService(store)
        packets.create_packet(
            packet_id="pkt-001",
            title="Command inventory docs",
            objective="Document available command inventory.",
            risk_class="low",
            scope_summary="Inspect and document commands.",
            out_of_scope_summary="No runtime behavior changes.",
            change_zones=["docs/"],
            acceptance_criteria_ids=["ac-001"],
            evidence_requirements=["command-output"],
            closeout_criteria=["evidence-registered"],
            owner="human-owner",
            idempotency_key="packet-create-pkt-001",
        )
        packets.approve_packet(
            packet_id="pkt-001",
            approver_id="owner-1",
            approver_role="Human Owner",
            authority_basis="explicit approval",
            approved_scope="low-risk documentation packet",
            rationale="MVP contract test",
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
            completion_classification="unverified",
            packet_id="pkt-001",
            idempotency_key="requirement-REQ-001",
        )
        registry.register_acceptance_criterion(
            acceptance_criterion_id="ac-001",
            requirement_id="REQ-001",
            packet_id="pkt-001",
            description="Command inventory is documented.",
            status="proposed",
            idempotency_key="acceptance-ac-001",
        )
        return tmp, store

    def _add_supported_claim_and_gate(self, store):
        from standard_harness.domain.evidence import EvidenceService
        from standard_harness.domain.gates import GateService

        evidence = EvidenceService(store)
        evidence.register_evidence(
            evidence_id="ev-001",
            packet_id="pkt-001",
            claim_id=None,
            command_or_tool="python -m unittest",
            runner="unittest",
            cwd_or_execution_context=str(ROOT),
            environment_fingerprint="python-test",
            artifact_path="tests/integration/test_closeout_flow.py",
            content="evidence output",
            result_status="passed",
            rationale="contract test evidence",
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

    def test_closeout_persists_record_and_closes_packet_when_supported(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.packets import PacketService

        tmp, store = self._store_with_packet_and_registry()
        with tmp:
            self._add_supported_claim_and_gate(store)
            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="MVP closeout",
                rationale="All MVP evidence is present.",
                idempotency_key="closeout-001",
            )
            packet = PacketService(store).get_packet("pkt-001")

            self.assertEqual(closeout["decision_status"], "closed")
            self.assertEqual(closeout["checked_claim_ids"], ["claim-001"])
            self.assertEqual(closeout["gate_result_ids"], ["gres-001"])
            self.assertEqual(packet["lifecycle_state"], "closed")

    def test_closeout_blocks_when_required_evidence_and_gate_are_missing(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.domain.packets import PacketService

        tmp, store = self._store_with_packet_and_registry()
        with tmp:
            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="MVP closeout",
                rationale="Attempt unsupported closeout.",
                idempotency_key="closeout-001",
            )
            packet = PacketService(store).get_packet("pkt-001")

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("missing_evidence", closeout["diagnostic_ids"])
            self.assertEqual(packet["lifecycle_state"], "blocked")


if __name__ == "__main__":
    unittest.main()
