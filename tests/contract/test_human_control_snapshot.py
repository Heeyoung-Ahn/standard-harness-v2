import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class HumanControlSnapshotTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_human_control_snapshot_lists_pending_approvals_non_delegable_waivers_challenges_and_blocked_gates(self):
        from standard_harness.domain.gates import GateService
        from standard_harness.memory.human_control_snapshot import HumanControlSnapshotService
        from standard_harness.reviews.adjudication import ChallengeReviewService
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_pending_packet(store)
            WaiverLifecycleService(store).record_waiver(
                waiver_id="waiver-001",
                approver_id="owner",
                approver_role="Owner",
                scope="temporary exception",
                expires_at="2026-12-31",
                compensating_control="manual review",
                affected_gate_ids=["gate-001"],
                revocation_status="active",
                idempotency_key="waiver-001",
            )
            ChallengeReviewService(store).open_challenge(
                challenge_id="challenge-001",
                challenged_item_id="claim-001",
                reviewer_role="Independent Reviewer",
                rationale="needs independent review",
                idempotency_key="challenge-001",
            )
            GateService(store).declare_gate(
                gate_id="gate-001",
                packet_id="pkt-001",
                gate_type="release",
                requirement_level="hard",
                declared_by_source="packet",
                idempotency_key="gate-001",
            )

            snapshot = HumanControlSnapshotService(store).generate_snapshot(
                snapshot_id="human-001",
                idempotency_key="human-001",
            )

            self.assertEqual(snapshot["pending_approvals"], ["pkt-001"])
            self.assertIn("release_decision", snapshot["non_delegable_decisions"])
            self.assertEqual(snapshot["active_waivers"], ["waiver-001"])
            self.assertEqual(snapshot["challenged_items"], ["challenge-001"])
            self.assertEqual(snapshot["blocked_gates"], ["gate-001"])

    def test_human_control_snapshot_ignores_expired_waivers_and_rejects_stale_snapshot(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.memory.human_control_snapshot import HumanControlSnapshotService
        from standard_harness.waivers.lifecycle import WaiverLifecycleService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_pending_packet(store)
            WaiverLifecycleService(store).record_waiver(
                waiver_id="waiver-expired",
                approver_id="owner",
                approver_role="Owner",
                scope="expired exception",
                expires_at="2026-01-01",
                compensating_control="manual review",
                affected_gate_ids=["gate-001"],
                revocation_status="active",
                idempotency_key="waiver-expired",
            )
            service = HumanControlSnapshotService(store)
            snapshot = service.generate_snapshot(
                snapshot_id="human-expired",
                idempotency_key="human-expired",
                evaluated_at="2026-06-21",
            )
            PacketService(store).transition_packet(
                packet_id="pkt-001",
                lifecycle_state="in_progress",
                actor_id="owner",
                actor_role="Owner",
                authority_basis="new canonical event",
                idempotency_key="transition-pkt-001",
            )

            freshness = service.freshness(snapshot)

            self.assertEqual(snapshot["active_waivers"], [])
            self.assertEqual(freshness["freshness_status"], "stale")
            self.assertEqual(freshness["consumer_behavior"], "reject")


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_pending_packet(store):
    from tests.contract.test_pmo_projection import _seed_packet

    _seed_packet(store, approval_required=True)


if __name__ == "__main__":
    unittest.main()
