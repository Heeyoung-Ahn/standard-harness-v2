import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_readiness_holds_when_packet_approval_is_missing(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
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

            result = ReadinessService(store).check_packet("pkt-001")

            self.assertEqual(result["status"], "hold")
            self.assertEqual(result["diagnostics"][0]["error_code"], "missing_approval")
            self.assertEqual(result["diagnostics"][0]["affected_entity_id"], "pkt-001")
            self.assertEqual(result["diagnostics"][0]["field"], "approval_state")

    def test_readiness_blocks_when_required_packet_fields_are_empty(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Command inventory docs",
                objective="Document available command inventory.",
                risk_class="low",
                scope_summary="Inspect and document commands.",
                out_of_scope_summary="No runtime behavior changes.",
                change_zones=[],
                acceptance_criteria_ids=[],
                evidence_requirements=[],
                closeout_criteria=[],
                owner="human-owner",
                idempotency_key="packet-create-pkt-001",
            )

            result = ReadinessService(store).check_packet("pkt-001")
            codes = {diagnostic["error_code"] for diagnostic in result["diagnostics"]}

            self.assertEqual(result["status"], "blocked")
            self.assertIn("missing_change_zones", codes)
            self.assertIn("missing_acceptance_criteria", codes)
            self.assertIn("missing_evidence_requirements", codes)
            self.assertIn("missing_closeout_criteria", codes)

    def test_readiness_ready_after_approval_and_required_fields(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.domain.requirements import RequirementRegistry
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.readiness import ReadinessService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
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

            result = ReadinessService(store).check_packet("pkt-001")

            self.assertEqual(result["status"], "ready")
            self.assertEqual(result["diagnostics"], [])


if __name__ == "__main__":
    unittest.main()
