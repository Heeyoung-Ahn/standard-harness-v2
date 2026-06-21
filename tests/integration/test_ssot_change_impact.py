import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SsotChangeImpactTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_semantic_change_lists_impacted_packet_claim_evidence_gate_and_projection(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            impact = ImpactAnalysisService(store).record_impact(
                impact_id="impact-001",
                requirement_id="REQ-A",
                change_class="semantic_change",
                impacted_packet_ids=["pkt-001"],
                impacted_acceptance_criterion_ids=["ac-001"],
                impacted_claim_ids=["claim-001"],
                impacted_evidence_ids=["ev-001"],
                impacted_gate_ids=["gate-001"],
                impacted_projection_ids=["proj-001"],
                idempotency_key="impact-001",
            )

            self.assertEqual(impact["change_class"], "semantic_change")
            self.assertEqual(impact["review_status"], "human_review_required")
            self.assertEqual(impact["impacted_packet_ids"], ["pkt-001"])
            self.assertEqual(impact["impacted_acceptance_criterion_ids"], ["ac-001"])
            self.assertEqual(impact["impacted_claim_ids"], ["claim-001"])
            self.assertEqual(impact["impacted_evidence_ids"], ["ev-001"])
            self.assertEqual(impact["impacted_gate_ids"], ["gate-001"])
            self.assertEqual(impact["impacted_projection_ids"], ["proj-001"])
            self.assertEqual(impact["source_event_range"], "1-0")
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events where event_seq = 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "ssot.impact_recorded")

    def test_non_semantic_change_can_be_recorded_without_human_review_requirement(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()

            impact = ImpactAnalysisService(store).record_impact(
                impact_id="impact-clarification",
                requirement_id="REQ-A",
                change_class="clarification",
                impacted_packet_ids=[],
                impacted_acceptance_criterion_ids=[],
                impacted_claim_ids=[],
                impacted_evidence_ids=[],
                impacted_gate_ids=[],
                impacted_projection_ids=[],
                idempotency_key="impact-clarification",
            )

            self.assertEqual(impact["review_status"], "review_not_required")

    def test_impact_record_is_idempotent_and_replays_and_audits(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = ImpactAnalysisService(store)
            before_snapshot = PointInTimeAudit(store).snapshot_at(event_seq=0)
            service.record_impact(
                impact_id="impact-001",
                requirement_id="REQ-A",
                change_class="governance_risk_change",
                impacted_packet_ids=["pkt-001"],
                impacted_acceptance_criterion_ids=["ac-001"],
                impacted_claim_ids=["claim-001"],
                impacted_evidence_ids=["ev-001"],
                impacted_gate_ids=["gate-001"],
                impacted_projection_ids=["proj-001"],
                idempotency_key="impact-001",
            )
            repeated = service.record_impact(
                impact_id="ignored-impact-id",
                requirement_id="REQ-A",
                change_class="governance_risk_change",
                impacted_packet_ids=["different-packet"],
                impacted_acceptance_criterion_ids=[],
                impacted_claim_ids=[],
                impacted_evidence_ids=[],
                impacted_gate_ids=[],
                impacted_projection_ids=[],
                idempotency_key="impact-001",
            )
            impact_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=impact_seq)
            with store.connection() as conn:
                conn.execute("delete from ssot_change_impacts")
                conn.commit()

            report = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=impact_seq
            )
            replayed = service.get_impact("impact-001")

            self.assertEqual(repeated["impacted_packet_ids"], ["pkt-001"])
            self.assertEqual(repeated["impact_id"], "impact-001")
            self.assertNotIn("impact-001", before_snapshot["ssot_change_impacts"])
            self.assertEqual(report["status"], "rebuilt")
            self.assertEqual(replayed["review_status"], "human_review_required")
            self.assertEqual(
                snapshot["ssot_change_impacts"]["impact-001"]["impacted_packet_ids"],
                ["pkt-001"],
            )
            self.assertEqual(
                snapshot["ssot_change_impacts"]["impact-001"][
                    "impacted_acceptance_criterion_ids"
                ],
                ["ac-001"],
            )

    def test_duplicate_impact_id_with_new_idempotency_key_is_rejected(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = ImpactAnalysisService(store)
            service.record_impact(
                impact_id="impact-001",
                requirement_id="REQ-A",
                change_class="semantic_change",
                impacted_packet_ids=["pkt-001"],
                impacted_acceptance_criterion_ids=[],
                impacted_claim_ids=[],
                impacted_evidence_ids=[],
                impacted_gate_ids=[],
                impacted_projection_ids=[],
                idempotency_key="impact-001",
            )
            event_seq = store.latest_event_seq()

            with self.assertRaises(ValueError):
                service.record_impact(
                    impact_id="impact-001",
                    requirement_id="REQ-A",
                    change_class="removed",
                    impacted_packet_ids=["pkt-002"],
                    impacted_acceptance_criterion_ids=[],
                    impacted_claim_ids=[],
                    impacted_evidence_ids=[],
                    impacted_gate_ids=[],
                    impacted_projection_ids=[],
                    idempotency_key="impact-001-duplicate",
                )

            self.assertEqual(store.latest_event_seq(), event_seq)

    def test_failed_materialization_rolls_back_impact_event(self):
        from standard_harness.diff.impact import ImpactAnalysisService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            with store.connection() as conn:
                conn.execute(
                    """
                    create trigger abort_ssot_change_impacts
                    before insert on ssot_change_impacts
                    begin
                      select raise(abort, 'blocked impact insert');
                    end
                    """
                )
                conn.commit()

            before_event_seq = store.latest_event_seq()
            with self.assertRaises(Exception):
                ImpactAnalysisService(store).record_impact(
                    impact_id="impact-001",
                    requirement_id="REQ-A",
                    change_class="semantic_change",
                    impacted_packet_ids=["pkt-001"],
                    impacted_acceptance_criterion_ids=[],
                    impacted_claim_ids=[],
                    impacted_evidence_ids=[],
                    impacted_gate_ids=[],
                    impacted_projection_ids=[],
                    idempotency_key="impact-001",
                )

            self.assertEqual(store.latest_event_seq(), before_event_seq)
