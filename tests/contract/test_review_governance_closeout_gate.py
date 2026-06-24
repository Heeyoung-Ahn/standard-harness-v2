import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ReviewGovernanceCloseoutGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_product_feature_closeout_blocks_missing_required_review_gates(self):
        from standard_harness.domain.closeout import CloseoutService

        with tempfile.TemporaryDirectory() as tmp:
            store = _complete_product_feature_store(Path(tmp))

            closeout = CloseoutService(store).close_packet(
                closeout_id="co-review-missing",
                packet_id="pkt-review-gov",
                authority_basis="review governance closeout",
                rationale="Attempt closeout without required review governance gates.",
                idempotency_key="co-review-missing",
            )

        self.assertEqual(closeout["decision_status"], "blocked")
        self.assertIn("missing_required_review_governance", closeout["diagnostic_ids"])


def _complete_product_feature_store(root: Path):
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-review-gov",
        title="Review governance product feature",
        objective="Exercise review governance closeout.",
        risk_class="medium",
        packet_type="product-feature",
        scope_summary="Product behavior changes.",
        out_of_scope_summary="No external systems.",
        change_zones=["src/"],
        acceptance_criteria_ids=["ac-review-gov"],
        evidence_requirements=["unit-test"],
        closeout_criteria=["review-governance"],
        closeout_plan={"criteria": ["review-governance"]},
        owner="owner",
        idempotency_key="packet-create-review-gov",
    )
    PacketService(store).approve_packet(
        packet_id="pkt-review-gov",
        approver_id="owner",
        approver_role="Human Owner",
        authority_basis="explicit approval",
        approved_scope="review governance",
        rationale="Approve review governance fixture.",
        idempotency_key="approve-review-gov",
    )
    RequirementRegistry(store).register_requirement(
        requirement_id="REQ-REVIEW-GOV",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-review-gov"],
        completion_classification="implemented",
        packet_id="pkt-review-gov",
        idempotency_key="req-review-gov",
    )
    RequirementRegistry(store).register_acceptance_criterion(
        acceptance_criterion_id="ac-review-gov",
        requirement_id="REQ-REVIEW-GOV",
        packet_id="pkt-review-gov",
        description="Feature is verified.",
        status="approved",
        idempotency_key="ac-review-gov",
    )
    EvidenceService(store).register_evidence(
        evidence_id="ev-review-gov",
        packet_id="pkt-review-gov",
        claim_id=None,
        command_or_tool="python -m unittest",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/contract/test_review_governance_closeout_gate.py",
        content="passed",
        result_status="passed",
        trust_status="REPRODUCED_BY_HARNESS",
        validation_status="STRUCTURALLY_VALID",
        rationale="review governance evidence",
        idempotency_key="ev-review-gov",
    )
    EvidenceService(store).record_claim(
        claim_id="claim-review-gov",
        packet_id="pkt-review-gov",
        requirement_id="REQ-REVIEW-GOV",
        acceptance_criterion_id="ac-review-gov",
        evidence_ids=["ev-review-gov"],
        support_status="supported",
        idempotency_key="claim-review-gov",
    )
    GateService(store).declare_gate(
        gate_id="gate-review-gov",
        packet_id="pkt-review-gov",
        gate_type="evidence",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key="gate-review-gov",
    )
    GateService(store).activate_gate(
        gate_activation_id="gact-review-gov",
        gate_id="gate-review-gov",
        packet_id="pkt-review-gov",
        idempotency_key="gact-review-gov",
    )
    GateService(store).record_gate_result(
        gate_result_id="gres-review-gov",
        gate_id="gate-review-gov",
        packet_id="pkt-review-gov",
        checked_claim_ids=["claim-review-gov"],
        evidence_ids=["ev-review-gov"],
        status="pass",
        requirement_level="hard",
        rationale="supported by trusted evidence",
        idempotency_key="gres-review-gov",
    )
    return store


if __name__ == "__main__":
    unittest.main()
