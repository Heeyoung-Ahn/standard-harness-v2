import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SelfImprovementLifecycleTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_friction_promotes_to_improvement_proposal_with_evidence_and_disposition(self):
        from standard_harness.self_improvement.friction import FrictionService
        from standard_harness.self_improvement.proposals import ImprovementProposalService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            friction = FrictionService(store).record_friction(
                friction_record_id="friction-001",
                friction_type="repeated_test_failure",
                owner="quality-owner",
                evidence_ids=["ev-001", "ev-002"],
                occurrence_count=2,
                source="fp-13-test",
                idempotency_key="friction-001",
            )

            proposal = ImprovementProposalService(store).promote_friction(
                proposal_id="proposal-001",
                friction_record_id=friction["friction_record_id"],
                proposal_type="contract_test",
                owner="quality-owner",
                rationale="Repeated failures need a regression contract.",
                linked_evidence_ids=["ev-001", "ev-002"],
                disposition="proposed",
                idempotency_key="proposal-001",
            )

            self.assertEqual(proposal["owner"], "quality-owner")
            self.assertEqual(proposal["proposal_type"], "contract_test")
            self.assertEqual(proposal["disposition"], "proposed")
            self.assertEqual(proposal["linked_evidence_ids"], ["ev-001", "ev-002"])
            self.assertTrue(proposal["target_packet_required"])

    def test_repeated_manual_work_can_be_promoted_to_eval_proposal_and_replayed(self):
        from standard_harness.self_improvement.friction import FrictionService
        from standard_harness.self_improvement.proposals import ImprovementProposalService
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            FrictionService(store).record_friction(
                friction_record_id="friction-manual-001",
                friction_type="repeated_manual_work",
                owner="ops-owner",
                evidence_ids=["ev-manual-001"],
                occurrence_count=3,
                source="operator-session",
                idempotency_key="friction-manual-001",
            )
            ImprovementProposalService(store).promote_friction(
                proposal_id="proposal-eval-001",
                friction_record_id="friction-manual-001",
                proposal_type="eval",
                owner="ops-owner",
                rationale="Manual repetition should become a reproducible eval.",
                linked_evidence_ids=["ev-manual-001"],
                disposition="proposed",
                idempotency_key="proposal-eval-001",
            )
            source_watermark = store.latest_event_seq()
            with store.transaction() as conn:
                conn.execute("delete from friction_records")
                conn.execute("delete from improvement_proposals")

            replay = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=source_watermark
            )
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=source_watermark)

            self.assertEqual(replay["status"], "rebuilt")
            with store.connection() as conn:
                friction = conn.execute(
                    "select * from friction_records where friction_record_id = ?",
                    ("friction-manual-001",),
                ).fetchone()
                proposal = conn.execute(
                    "select * from improvement_proposals where proposal_id = ?",
                    ("proposal-eval-001",),
                ).fetchone()
            self.assertIsNotNone(friction)
            self.assertIsNotNone(proposal)
            self.assertIn("friction-manual-001", snapshot["friction_records"])
            self.assertIn("proposal-eval-001", snapshot["improvement_proposals"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


if __name__ == "__main__":
    unittest.main()
