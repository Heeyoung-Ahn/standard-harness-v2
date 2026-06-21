import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RuntimeEvidenceProfileTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_profile_catalog_lists_final_product_runtime_profiles(self):
        from standard_harness.evidence.profiles import EvidenceProfileCatalog

        catalog = EvidenceProfileCatalog()

        self.assertEqual(
            set(catalog.profile_ids()),
            {
                "cli_command",
                "unit_test",
                "integration_test",
                "api_runtime",
                "browser_render",
                "browser_functional",
                "db_schema",
                "db_runtime_persistence",
                "cloud_execution",
                "device_execution",
                "manual_runtime",
                "substitute_evidence",
            },
        )

    def test_api_only_evidence_cannot_close_browser_workflow_claim(self):
        from standard_harness.evidence.runtime import RuntimeEvidencePolicy

        result = RuntimeEvidencePolicy().evaluate_claim(
            claim_type="browser_workflow",
            risk_class="medium",
            evidence_profiles=["api_runtime"],
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_browser_functional", result["diagnostic_codes"])

    def test_render_only_screenshot_cannot_close_functional_ui_claim(self):
        from standard_harness.evidence.runtime import RuntimeEvidencePolicy

        result = RuntimeEvidencePolicy().evaluate_claim(
            claim_type="functional_ui",
            risk_class="medium",
            evidence_profiles=["browser_render"],
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_browser_functional", result["diagnostic_codes"])

    def test_schema_only_db_evidence_cannot_close_runtime_persistence_claim(self):
        from standard_harness.evidence.runtime import RuntimeEvidencePolicy

        result = RuntimeEvidencePolicy().evaluate_claim(
            claim_type="runtime_persistence",
            risk_class="medium",
            evidence_profiles=["db_schema"],
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_db_runtime_persistence", result["diagnostic_codes"])

    def test_mock_only_evidence_cannot_close_high_risk_without_authorized_substitute(self):
        from standard_harness.evidence.runtime import RuntimeEvidencePolicy

        blocked = RuntimeEvidencePolicy().evaluate_claim(
            claim_type="api_behavior",
            risk_class="high",
            evidence_profiles=["substitute_evidence"],
        )
        accepted = RuntimeEvidencePolicy().evaluate_claim(
            claim_type="api_behavior",
            risk_class="high",
            evidence_profiles=["substitute_evidence"],
            substitute_decision_id="DR-SUB-001",
            substitute_authority="Human Owner",
        )

        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("missing_authorized_substitute_decision", blocked["diagnostic_codes"])
        self.assertEqual(accepted["status"], "accepted")


if __name__ == "__main__":
    unittest.main()
