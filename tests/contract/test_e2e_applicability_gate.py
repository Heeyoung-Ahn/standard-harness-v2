import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class E2EApplicabilityGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_ui_auth_routing_and_core_flow_changes_require_e2e(self):
        from standard_harness.validation.e2e_applicability import E2EApplicabilityValidator

        result = E2EApplicabilityValidator().evaluate(
            {
                "packetId": "pkt-ui",
                "changeTypes": ["ui", "routing"],
                "e2eApplicability": None,
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertEqual(result["requiredApplicability"], "E2E_REQUIRED")
        self.assertIn("missing_e2e_applicability", result["diagnostic_ids"])

    def test_docs_only_can_record_rule_based_na(self):
        from standard_harness.validation.e2e_applicability import E2EApplicabilityValidator

        result = E2EApplicabilityValidator().evaluate(
            {
                "packetId": "pkt-docs",
                "changeTypes": ["docs"],
                "e2eApplicability": "E2E_NOT_APPLICABLE_WITH_RATIONALE",
                "naDecision": {
                    "allowedByRule": ["docs-only-no-runtime-change"],
                    "rationale": "Documentation only.",
                    "substituteChecks": ["docs lint"],
                },
            }
        )

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["requiredApplicability"], "E2E_NOT_APPLICABLE_WITH_RATIONALE")


if __name__ == "__main__":
    unittest.main()
