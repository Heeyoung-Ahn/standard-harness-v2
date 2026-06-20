import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class PacketLifecycleTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_create_low_risk_packet_records_required_fields(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = PacketService(store)

            packet = service.create_packet(
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

            self.assertEqual(packet["packet_id"], "pkt-001")
            self.assertEqual(packet["lifecycle_state"], "planned")
            self.assertEqual(packet["approval_state"], "pending")
            self.assertEqual(packet["packet_version"], 1)
            self.assertEqual(packet["change_zones"], ["docs/"])
            self.assertEqual(store.latest_event_seq(), 1)

    def test_packet_approval_persists_approval_record(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = PacketService(store)
            service.create_packet(
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

            approval = service.approve_packet(
                packet_id="pkt-001",
                approver_id="owner-1",
                approver_role="Human Owner",
                authority_basis="explicit approval",
                approved_scope="low-risk documentation packet",
                rationale="MVP contract test",
                idempotency_key="approve-pkt-001",
            )
            packet = service.get_packet("pkt-001")

            self.assertEqual(approval["approval_record_id"], packet["approval_record_id"])
            self.assertEqual(packet["approval_state"], "approved")
            self.assertEqual(packet["lifecycle_state"], "planned")

    def test_lifecycle_transition_appends_event_but_closed_requires_closeout(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = PacketService(store)
            service.create_packet(
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
            packet = service.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="approved packet work",
                idempotency_key="transition-pkt-001-progress",
            )
            self.assertEqual(packet["lifecycle_state"], "in_progress")

            with self.assertRaises(ValueError):
                service.transition_packet(
                    packet_id="pkt-001",
                    lifecycle_state="closed",
                    actor_id="dev-1",
                    actor_role="Developer",
                    authority_basis="not closeout",
                    idempotency_key="transition-pkt-001-closed",
                )


if __name__ == "__main__":
    unittest.main()
