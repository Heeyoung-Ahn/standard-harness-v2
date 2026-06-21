import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class TestPlanFirstGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_code_packet_without_test_plan_blocks_validation(self):
        from standard_harness.domain.packets import PacketService
        from standard_harness.state.store import HarnessStore
        from standard_harness.validation.aggregator import ValidationService

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            PacketService(store).create_packet(
                packet_id="pkt-code",
                title="Code packet",
                objective="Change runtime behavior.",
                packet_type="product-feature",
                risk_class="medium",
                scope_summary="Runtime code change.",
                out_of_scope_summary="No E2E.",
                change_zones=["src/standard_harness/domain/evidence.py"],
                acceptance_criteria_ids=["ac-code"],
                evidence_requirements=["trusted-test-evidence"],
                test_plan=[],
                closeout_criteria=["trusted-evidence"],
                owner="human-owner",
                approval_required=False,
                idempotency_key="packet-create-code",
            )

            diagnostics = ValidationService(store, repo_root=ROOT).validate_packet("pkt-code")
            error_codes = {diagnostic["error_code"] for diagnostic in diagnostics}

            self.assertIn("missing_test_plan", error_codes)
            self.assertIn("test_plan_first_gate", error_codes)

    def test_test_plan_validator_accepts_required_v02_fields(self):
        from standard_harness.validation.test_plan import TestPlanValidator

        result = TestPlanValidator().validate(
            {
                "acceptanceCriteria": ["ac-001"],
                "behaviorsUnderTest": ["Evidence trust blocks manual-only closeout"],
                "testTypes": ["Contract Test", "Regression Test"],
                "commands": ["python -m unittest tests.contract.test_test_plan_first_gate"],
                "e2eApplicability": "not_applicable",
                "naConditions": ["no browser workflow"],
                "substituteValidation": ["contract tests"],
            }
        )

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["diagnostic_ids"], [])


if __name__ == "__main__":
    unittest.main()
