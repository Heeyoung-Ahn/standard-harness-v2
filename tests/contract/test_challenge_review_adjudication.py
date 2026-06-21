import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeReviewAdjudicationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_challenge_independent_review_and_adjudication_are_recorded(self):
        from standard_harness.reviews.adjudication import ChallengeReviewService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = ChallengeReviewService(store)
            challenge = service.open_challenge(
                challenge_id="challenge-001",
                challenged_item_id="claim-001",
                reviewer_role="Independent Reviewer",
                rationale="Claim evidence looks weak.",
                idempotency_key="challenge-001",
            )
            review = service.record_independent_review(
                review_id="review-001",
                challenge_id="challenge-001",
                reviewer_role="Independent Reviewer",
                outcome="changes_required",
                idempotency_key="review-001",
            )
            with store.connection() as conn:
                follow_up_event = conn.execute(
                    "select event_id from events where event_type = 'independent_review_recorded'"
                ).fetchone()["event_id"]
            adjudication = service.record_adjudication(
                adjudication_id="adjudication-001",
                challenge_id="challenge-001",
                outcome="upheld",
                follow_up_event_ids=[follow_up_event],
                idempotency_key="adjudication-001",
            )

            self.assertEqual(challenge["challenged_item_id"], "claim-001")
            self.assertEqual(review["outcome"], "changes_required")
            self.assertEqual(adjudication["follow_up_event_ids"], [follow_up_event])
            with store.connection() as conn:
                events = [
                    row["event_type"]
                    for row in conn.execute("select event_type from events order by event_seq")
                ]
            self.assertEqual(
                events,
                [
                    "challenge_opened",
                    "independent_review_recorded",
                    "adjudication_recorded",
                ],
            )

    def test_challenge_lifecycle_rejects_missing_order_and_invalid_follow_up(self):
        from standard_harness.reviews.adjudication import ChallengeReviewService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = ChallengeReviewService(store)

            with self.assertRaises(ValueError):
                service.record_independent_review(
                    review_id="review-missing",
                    challenge_id="missing",
                    reviewer_role="Independent Reviewer",
                    outcome="changes_required",
                    idempotency_key="review-missing",
                )
            service.open_challenge(
                challenge_id="challenge-001",
                challenged_item_id="claim-001",
                reviewer_role="Independent Reviewer",
                rationale="Challenge.",
                idempotency_key="challenge-001",
            )
            with self.assertRaises(ValueError):
                service.record_independent_review(
                    review_id="review-non-independent",
                    challenge_id="challenge-001",
                    reviewer_role="Developer",
                    outcome="approved",
                    idempotency_key="review-non-independent",
                )
            with self.assertRaises(ValueError):
                service.record_adjudication(
                    adjudication_id="adjudication-before-review",
                    challenge_id="challenge-001",
                    outcome="upheld",
                    follow_up_event_ids=[],
                    idempotency_key="adjudication-before-review",
                )
            service.record_independent_review(
                review_id="review-001",
                challenge_id="challenge-001",
                reviewer_role="Independent Reviewer",
                outcome="changes_required",
                idempotency_key="review-001",
            )
            with self.assertRaises(ValueError):
                service.record_adjudication(
                    adjudication_id="adjudication-bad-follow-up",
                    challenge_id="challenge-001",
                    outcome="upheld",
                    follow_up_event_ids=["missing-event"],
                    idempotency_key="adjudication-bad-follow-up",
                )

    def test_fp07_events_replay_and_audit(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.llm.report_claims import DecisionClaimExtractor
        from standard_harness.llm.work_products import LlmWorkProductService
        from standard_harness.reviews.adjudication import ChallengeReviewService
        from standard_harness.reviews.bundles import ReviewBundleService
        from standard_harness.roles.cards import RoleCardRegistry
        from standard_harness.roles.skill_policy import SkillPolicyEvaluator
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore
        from standard_harness.workflow.orchestration import WorkflowOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-001",
                title="FP-07 replay packet",
                objective="Replay FP-07 records.",
                risk_class="low",
                scope_summary="Replay.",
                out_of_scope_summary="No external systems.",
                change_zones=["src/"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                closeout_criteria=["review"],
                owner="owner",
                idempotency_key="packet-create-pkt-001",
            )
            WorkflowOrchestrationService(store).record_run(
                workflow_run_id="wf-001",
                packet_id="pkt-001",
                phase="planning",
                actor_role="Planner",
                input_projection_id=None,
                retry_count=0,
                idempotency_key="wf-001",
            )
            ReviewBundleService(store).create_bundle(
                review_bundle_id="rb-001",
                packet_id="pkt-001",
                adapter_model_identity="local-reviewer",
                idempotency_key="rb-001",
            )
            LlmWorkProductService(store).classify(
                work_product_id="llm-001",
                content="Suggest review.",
                work_product_type="recommendation",
                confidence="medium",
                idempotency_key="llm-001",
            )
            DecisionClaimExtractor(store).extract(
                decision_claim_id="dclaim-001",
                report_id="report-001",
                observation="Observation",
                inference="Inference",
                assumption="Assumption",
                recommendation="Recommendation",
                confidence="medium",
                human_decision_required=True,
                idempotency_key="dclaim-001",
            )
            RoleCardRegistry(store).register(
                role_id="reviewer",
                permitted_actions=["review"],
                forbidden_decisions=["accept_critical_risk"],
                escalation_duties=["escalate"],
                required_review_evidence=["bundle"],
                idempotency_key="role-reviewer",
            )
            SkillPolicyEvaluator(store).evaluate(
                evaluation_id="skill-eval-001",
                role_id="reviewer",
                action="review",
                local_policy={"forbidden_actions": []},
                idempotency_key="skill-eval-001",
            )
            service = ChallengeReviewService(store)
            service.open_challenge(
                challenge_id="challenge-001",
                challenged_item_id="claim-001",
                reviewer_role="Independent Reviewer",
                rationale="Check replay.",
                idempotency_key="challenge-001",
            )
            service.record_independent_review(
                review_id="review-001",
                challenge_id="challenge-001",
                reviewer_role="Independent Reviewer",
                outcome="ok",
                idempotency_key="review-001",
            )
            service.record_adjudication(
                adjudication_id="adjudication-001",
                challenge_id="challenge-001",
                outcome="closed",
                follow_up_event_ids=[],
                idempotency_key="adjudication-001",
            )
            fp07_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=fp07_seq)
            with store.connection() as conn:
                for table in (
                    "workflow_runs",
                    "review_bundles",
                    "llm_work_products",
                    "decision_claims",
                    "role_cards",
                    "skill_policy_evaluations",
                    "challenges",
                    "independent_reviews",
                    "adjudications",
                ):
                    conn.execute(f"delete from {table}")
                conn.commit()

            report = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=fp07_seq
            )

            self.assertEqual(report["status"], "rebuilt")
            self.assertIn("wf-001", snapshot["workflow_runs"])
            self.assertIn("rb-001", snapshot["review_bundles"])
            self.assertIn("llm-001", snapshot["llm_work_products"])
            with store.connection() as conn:
                self.assertIsNotNone(
                    conn.execute(
                        "select 1 from adjudications where adjudication_id = 'adjudication-001'"
                    ).fetchone()
                )


if __name__ == "__main__":
    unittest.main()
