import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ReviewBundleStalenessTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_review_bundle_records_watermark_and_stale_bundle_blocks_closeout(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.reviews.bundles import ReviewBundleService
        from standard_harness.workflow.orchestration import WorkflowOrchestrationService

        with tempfile.TemporaryDirectory() as tmp:
            store = _complete_packet_store(Path(tmp))
            bundle = ReviewBundleService(store).create_bundle(
                review_bundle_id="rb-001",
                packet_id="pkt-001",
                adapter_model_identity="local-reviewer",
                idempotency_key="rb-001",
            )
            WorkflowOrchestrationService(store).record_run(
                workflow_run_id="wf-after-bundle",
                packet_id="pkt-001",
                phase="review",
                actor_role="Reviewer",
                input_projection_id=None,
                retry_count=0,
                idempotency_key="wf-after-bundle",
            )

            closeout = CloseoutService(store).close_packet(
                closeout_id="co-001",
                packet_id="pkt-001",
                authority_basis="review bundle closeout",
                rationale="Attempt stale bundle closeout.",
                idempotency_key="closeout-001",
                review_bundle_id="rb-001",
            )

            self.assertEqual(bundle["packet_version"], 1)
            self.assertEqual(bundle["freshness_status"], "fresh")
            self.assertTrue(bundle["source_watermark"] > 0)
            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("stale_review_bundle", closeout["diagnostic_ids"])

    def test_closeout_requires_current_review_bundle_when_bundle_exists_and_replays_basis(self):
        from standard_harness.domain.closeout import CloseoutService
        from standard_harness.reviews.bundles import ReviewBundleService
        from standard_harness.state.replay import StateReplayService

        with tempfile.TemporaryDirectory() as tmp:
            store = _complete_packet_store(Path(tmp))
            ReviewBundleService(store).create_bundle(
                review_bundle_id="rb-001",
                packet_id="pkt-001",
                adapter_model_identity="local-reviewer",
                idempotency_key="rb-001",
            )
            missing = CloseoutService(store).close_packet(
                closeout_id="co-missing-bundle",
                packet_id="pkt-001",
                authority_basis="review bundle closeout",
                rationale="Attempt closeout without bundle.",
                idempotency_key="closeout-missing-bundle",
            )
            current = ReviewBundleService(store).create_bundle(
                review_bundle_id="rb-002",
                packet_id="pkt-001",
                adapter_model_identity="local-reviewer",
                idempotency_key="rb-002",
            )
            closed = CloseoutService(store).close_packet(
                closeout_id="co-current-bundle",
                packet_id="pkt-001",
                authority_basis="review bundle closeout",
                rationale="Close with current bundle.",
                idempotency_key="closeout-current-bundle",
                review_bundle_id="rb-002",
            )
            closeout_seq = store.latest_event_seq()
            with store.connection() as conn:
                conn.execute("delete from closeouts")
                conn.commit()

            replay = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=closeout_seq
            )
            replayed = CloseoutService(store).get_closeout("co-current-bundle")

            self.assertEqual(missing["decision_status"], "blocked")
            self.assertIn("missing_review_bundle", missing["diagnostic_ids"])
            self.assertEqual(current["review_bundle_id"], "rb-002")
            self.assertEqual(closed["decision_status"], "closed")
            self.assertEqual(closed["review_bundle_id"], "rb-002")
            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replayed["review_bundle_id"], "rb-002")


def _complete_packet_store(root: Path):
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-001",
        title="Review packet",
        objective="Exercise review bundle closeout.",
        risk_class="low",
        scope_summary="Review bundle.",
        out_of_scope_summary="No external systems.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["bundle"],
        owner="owner",
        idempotency_key="packet-create-pkt-001",
    )
    PacketService(store).approve_packet(
        packet_id="pkt-001",
        approver_id="owner",
        approver_role="Human Owner",
        authority_basis="explicit approval",
        approved_scope="review bundle",
        rationale="Approve review bundle fixture.",
        idempotency_key="approve-pkt-001",
    )
    RequirementRegistry(store).register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="low",
        acceptance_criteria=["ac-001"],
        completion_classification="implemented",
        packet_id="pkt-001",
        idempotency_key="req-001",
    )
    RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-001",
        description="Bundle evidence is present.",
        status="approved",
        idempotency_key="ac-001",
    )
    EvidenceService(store).register_evidence(
        evidence_id="ev-001",
        packet_id="pkt-001",
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/contract/test_review_bundle_staleness.py",
        content="passed",
        result_status="passed",
        rationale="review bundle evidence",
        idempotency_key="ev-001",
    )
    EvidenceService(store).record_claim(
        claim_id="claim-001",
        packet_id="pkt-001",
        requirement_id="REQ-001",
        acceptance_criterion_id="ac-001",
        evidence_ids=["ev-001"],
        support_status="supported",
        idempotency_key="claim-001",
    )
    GateService(store).declare_gate(
        gate_id="gate-001",
        packet_id="pkt-001",
        gate_type="evidence",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key="gate-001",
    )
    GateService(store).activate_gate(
        gate_activation_id="gact-001",
        gate_id="gate-001",
        packet_id="pkt-001",
        idempotency_key="gact-001",
    )
    GateService(store).record_gate_result(
        gate_result_id="gres-001",
        gate_id="gate-001",
        packet_id="pkt-001",
        checked_claim_ids=["claim-001"],
        evidence_ids=["ev-001"],
        status="pass",
        requirement_level="hard",
        rationale="supported by passed evidence",
        idempotency_key="gres-001",
    )
    return store


if __name__ == "__main__":
    unittest.main()
