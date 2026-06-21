import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ProductPacketCannotModifyHarnessTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_boundary_violation_is_visible_in_packet_validation(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-product",
                title="Product change",
                objective="Product packet must not edit harness policy.",
                packet_type="product-feature",
                risk_class="medium",
                scope_summary="Product behavior.",
                out_of_scope_summary="Harness policy.",
                change_zones=["_harness/policies"],
                acceptance_criteria_ids=["ac-001"],
                evidence_requirements=["unit-test"],
                test_plan=["python -m unittest tests.evals.test_product_packet_cannot_modify_harness"],
                closeout_criteria=["passing-gate"],
                closeout_plan={
                    "criteria": ["passing-gate"],
                    "boundaryValidation": {
                        "role": "developer",
                        "baseCommit": "base",
                        "headCommit": "head",
                        "changedFiles": [
                            {"path": "_harness/policies/p0-policy.yaml", "status": "M"}
                        ],
                        "declaredChangeZones": ["_harness/policies"],
                    },
                },
                owner="human-owner",
                approval_required=False,
                idempotency_key="packet-create-product",
            )

            diagnostics = ValidationService(store, repo_root=ROOT).validate_packet("pkt-product")
            error_codes = {diagnostic["error_code"] for diagnostic in diagnostics}

            self.assertIn("harness_boundary_violation", error_codes)
            self.assertIn("forbidden_write_zone", error_codes)

    def test_boundary_violation_blocks_closeout_even_with_passing_gate(self):
        from standard_harness.domain.closeout import CloseoutService

        tmp, store = _ready_product_packet_with_harness_diff()
        try:
            closeout = CloseoutService(store).close_packet(
                closeout_id="co-product",
                packet_id="pkt-product",
                authority_basis="boundary eval",
                rationale="Product packet attempted harness mutation.",
                idempotency_key="closeout-product",
            )

            self.assertEqual(closeout["decision_status"], "blocked")
            self.assertIn("harness_boundary_violation", closeout["diagnostic_ids"])
            self.assertIn("forbidden_write_zone", closeout["diagnostic_ids"])
        finally:
            tmp.cleanup()


def _ready_product_packet_with_harness_diff():
    from standard_harness.domain.evidence import EvidenceService
    from standard_harness.domain.gates import GateService
    from standard_harness.domain.packets import PacketService
    from standard_harness.domain.requirements import RequirementRegistry
    from standard_harness.state.store import HarnessStore

    tmp = tempfile.TemporaryDirectory()
    store = HarnessStore(Path(tmp.name))
    store.initialize()
    PacketService(store).create_packet(
        packet_id="pkt-product",
        title="Product change",
        objective="Product packet must not edit harness policy.",
        packet_type="product-feature",
        risk_class="medium",
        scope_summary="Product behavior.",
        out_of_scope_summary="Harness policy.",
        change_zones=["_harness/policies"],
        acceptance_criteria_ids=["ac-001"],
        evidence_requirements=["unit-test"],
        test_plan=["python -m unittest tests.evals.test_product_packet_cannot_modify_harness"],
        closeout_criteria=["supported-claim", "passing-gate"],
        closeout_plan={
            "criteria": ["supported-claim", "passing-gate"],
            "boundaryValidation": {
                "role": "developer",
                "baseCommit": "base",
                "headCommit": "head",
                "changedFiles": [{"path": "_harness/policies/p0-policy.yaml", "status": "M"}],
                "declaredChangeZones": ["_harness/policies"],
            },
        },
        owner="human-owner",
        approval_required=False,
        idempotency_key="packet-create-product",
    )
    registry = RequirementRegistry(store)
    registry.register_requirement(
        requirement_id="REQ-001",
        version="1",
        source_doc="docs/requirements/example.md",
        status="approved",
        classification="Core",
        risk_classification="medium",
        acceptance_criteria=["ac-001"],
        completion_classification="evidence-required",
        packet_id="pkt-product",
        idempotency_key="requirement-REQ-001",
    )
    registry.register_acceptance_criterion(
        acceptance_criterion_id="ac-001",
        requirement_id="REQ-001",
        packet_id="pkt-product",
        description="Product behavior is covered.",
        status="approved",
        idempotency_key="acceptance-ac-001",
    )
    evidence = EvidenceService(store)
    evidence.register_evidence(
        evidence_id="ev-001",
        packet_id="pkt-product",
        claim_id=None,
        command_or_tool="python -m unittest tests.evals.test_product_packet_cannot_modify_harness",
        runner="unittest",
        cwd_or_execution_context=str(ROOT),
        environment_fingerprint="python-test",
        artifact_path="tests/evals/test_product_packet_cannot_modify_harness.py",
        content="passed",
        result_status="passed",
        rationale="boundary eval fixture evidence",
        idempotency_key="evidence-ev-001",
    )
    evidence.record_claim(
        claim_id="claim-001",
        packet_id="pkt-product",
        requirement_id="REQ-001",
        acceptance_criterion_id="ac-001",
        evidence_ids=["ev-001"],
        support_status="supported",
        idempotency_key="claim-001",
    )
    gates = GateService(store)
    gates.declare_gate(
        gate_id="gate-001",
        packet_id="pkt-product",
        gate_type="boundary",
        requirement_level="hard",
        declared_by_source="packet",
        idempotency_key="gate-declare-001",
    )
    gates.activate_gate(
        gate_activation_id="gact-001",
        gate_id="gate-001",
        packet_id="pkt-product",
        idempotency_key="gate-activate-001",
    )
    gates.record_gate_result(
        gate_result_id="gres-001",
        gate_id="gate-001",
        packet_id="pkt-product",
        checked_claim_ids=["claim-001"],
        evidence_ids=["ev-001"],
        status="pass",
        requirement_level="hard",
        rationale="passing gate fixture",
        idempotency_key="gate-result-001",
    )
    return tmp, store


if __name__ == "__main__":
    unittest.main()
