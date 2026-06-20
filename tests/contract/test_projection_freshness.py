import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ProjectionFreshnessTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_current_context_projection_records_metadata_and_freshness(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.state.store import HarnessStore

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

            projection = CurrentContextProjection(store).generate(packet_id="pkt-001")

            self.assertEqual(projection["packet"]["packet_id"], "pkt-001")
            self.assertEqual(projection["source_event_range"], "1-1")
            self.assertEqual(projection["source_watermark"], 1)
            self.assertEqual(projection["schema_version"], "1")
            self.assertEqual(projection["freshness_status"], "fresh")
            self.assertEqual(projection["stale_consumer_behavior"], "reject_for_authority")
            self.assertTrue(projection["projection_id"].startswith("proj_"))
            self.assertEqual(projection["trace_event_seq"], 2)

            with store.connection() as conn:
                row = conn.execute(
                    "select * from projections where projection_id = ?",
                    (projection["projection_id"],),
                ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["projection_type"], "current_context")
            self.assertEqual(row["source_watermark"], 1)

    def test_projection_becomes_stale_after_new_event(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.projection.current_context import CurrentContextProjection
        from standard_harness.state.store import HarnessStore

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
            projection = CurrentContextProjection(store).generate(packet_id="pkt-001")
            packets.transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="dev-1",
                actor_role="Developer",
                authority_basis="approved packet work",
                idempotency_key="transition-pkt-001-progress",
            )

            freshness = CurrentContextProjection(store).freshness(projection)

            self.assertEqual(freshness["freshness_status"], "stale")
            self.assertEqual(freshness["source_watermark"], 1)
            self.assertEqual(freshness["latest_event_seq"], 3)


if __name__ == "__main__":
    unittest.main()
