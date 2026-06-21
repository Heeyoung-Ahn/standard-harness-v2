import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class BrowserEvidenceContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_browser_functional_evidence_requires_complete_contract_record(self):
        from standard_harness.runtime.browser_contract import BrowserEvidenceContract

        record = BrowserEvidenceContract.validate(
            {
                "scenario_id": "browser-login",
                "preconditions": ["user exists"],
                "user_actions": ["open login", "submit form"],
                "expected_assertions": ["dashboard visible"],
                "actual_assertions": ["dashboard visible"],
                "data_runtime_side_effects": ["session cookie created"],
                "browser_tool_identity": "playwright",
                "viewport": {"width": 1280, "height": 720},
                "artifacts_captured": ["screenshots/login.png"],
                "result_status": "passed",
                "residual_gap": "none",
            }
        )

        self.assertEqual(record["status"], "valid")
        self.assertEqual(record["profile_id"], "browser_functional")

    def test_browser_functional_evidence_rejects_missing_assertions(self):
        from standard_harness.runtime.browser_contract import BrowserEvidenceContract

        result = BrowserEvidenceContract.validate(
            {
                "scenario_id": "browser-login",
                "preconditions": ["user exists"],
                "user_actions": ["open login"],
                "expected_assertions": [],
                "actual_assertions": [],
                "data_runtime_side_effects": [],
                "browser_tool_identity": "playwright",
                "viewport": {"width": 1280, "height": 720},
                "artifacts_captured": ["screenshots/login.png"],
                "result_status": "passed",
                "residual_gap": "none",
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_expected_assertions", result["diagnostic_codes"])
        self.assertIn("missing_actual_assertions", result["diagnostic_codes"])


if __name__ == "__main__":
    unittest.main()
