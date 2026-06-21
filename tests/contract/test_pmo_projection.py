import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class PmoProjectionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_pmo_report_reads_canonical_state_and_projections(self):
        from standard_harness.pmo.projections import PmoProjectionService
        from standard_harness.projection.current_context import CurrentContextProjection

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=False)
            projection = CurrentContextProjection(store).generate(packet_id="pkt-001")

            report = PmoProjectionService(store).generate_projection(
                pmo_projection_id="pmo-001",
                idempotency_key="pmo-001",
            )

            self.assertEqual(report["packet_counts"]["planned"], 1)
            self.assertEqual(report["source_watermark"], projection["source_watermark"])
            self.assertEqual(
                report["projection_summary"]["current_context"]["latest_projection_id"],
                projection["projection_id"],
            )
            self.assertEqual(
                report["projection_summary"]["current_context"]["freshness_status"],
                "fresh",
            )
            self.assertIn("projection.generated", report["dependency_summary"]["event_types"])
            self.assertEqual(report["freshness_status"], "fresh")

    def test_pmo_report_cannot_mutate_packet_state(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.pmo.projections import PmoProjectionService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=False)
            before_state = PacketService(store).get_packet("pkt-001")["lifecycle_state"]

            PmoProjectionService(store).preview_projection()

            after_state = PacketService(store).get_packet("pkt-001")["lifecycle_state"]
            self.assertEqual(after_state, before_state)

    def test_pmo_projection_summary_reports_stale_current_context_when_newer_events_exist(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.pmo.projections import PmoProjectionService
        from standard_harness.projection.current_context import CurrentContextProjection

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store, approval_required=False)
            CurrentContextProjection(store).generate(packet_id="pkt-001")
            PacketService(store).transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="owner",
                actor_role="Owner",
                authority_basis="make projection stale",
                idempotency_key="transition-pkt-001",
            )

            report = PmoProjectionService(store).generate_projection(
                pmo_projection_id="pmo-stale",
                idempotency_key="pmo-stale",
            )

            self.assertEqual(
                report["projection_summary"]["current_context"]["freshness_status"],
                "stale",
            )


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store, *, approval_required: bool):
    from standard_harness.domain.packets import PacketService

    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="PMO packet",
        objective="Expose packet status to PMO report.",
        risk_class="medium",
        scope_summary="PMO read model.",
        out_of_scope_summary="No mutation.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["passing-gate"],
        owner="owner",
        approval_required=approval_required,
        idempotency_key="packet-create-pkt-001",
    )


if __name__ == "__main__":
    unittest.main()
