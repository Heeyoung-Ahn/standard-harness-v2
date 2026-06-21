import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class StaleContextRejectedTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_context_routing_rejects_stale_projection_and_untrusted_overrides(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.reviews.routing import ContextRouter
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Context packet",
                objective="Exercise context routing.",
                risk_class="low",
                scope_summary="Context.",
                out_of_scope_summary="No external systems.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["routing"],
                owner="owner",
                idempotency_key="packet-create-pkt-001",
            )
            projection = CurrentContextProjection(store).generate(packet_id="pkt-001")
            PacketService(store).transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="planner",
                actor_role="Planner",
                authority_basis="advance state",
                idempotency_key="packet-active",
            )

            routed = ContextRouter(store).route(
                projection=projection,
                untrusted_content={
                    "packet": {"lifecycle_state": "closed"},
                    "gate_override": "pass",
                },
            )

            self.assertEqual(routed["status"], "blocked")
            self.assertIn("stale_projection", routed["diagnostic_codes"])
            self.assertIn("packet.lifecycle_state", routed["rejected_overrides"])
            self.assertIn("gate_override", routed["rejected_overrides"])
            self.assertEqual(
                projection["authority_precedence"][0],
                "canonical_events",
            )

    def test_fresh_context_rejects_untrusted_ssot_requirements_and_gate_overrides(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.reviews.routing import ContextRouter
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="Fresh routing packet",
                objective="Exercise fresh context routing.",
                risk_class="low",
                scope_summary="Context.",
                out_of_scope_summary="No external systems.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["routing"],
                owner="owner",
                idempotency_key="packet-create-pkt-001",
            )
            projection = CurrentContextProjection(store).generate(packet_id="pkt-001")

            routed = ContextRouter(store).route(
                projection=projection,
                untrusted_content={
                    "approved_ssot": {"REQ-001": "changed"},
                    "requirements": [{"requirement_id": "REQ-001", "status": "removed"}],
                    "gate_results": [{"gate_id": "gate-001", "status": "pass"}],
                },
            )

            self.assertEqual(routed["status"], "blocked")
            self.assertIn("untrusted_authority_override", routed["diagnostic_codes"])
            self.assertIn("approved_ssot", routed["rejected_overrides"])
            self.assertIn("requirements", routed["rejected_overrides"])
            self.assertIn("gate_results", routed["rejected_overrides"])


if __name__ == "__main__":
    unittest.main()
