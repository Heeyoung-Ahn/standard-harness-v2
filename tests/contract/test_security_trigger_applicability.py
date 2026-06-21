import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SecurityTriggerApplicabilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_security_trigger_requires_security_review_gate(self):
        from standard_harness.validation.security_review import SecurityReviewValidator

        result = SecurityReviewValidator.from_repo(ROOT).evaluate(
            {
                "packetId": "pkt-auth",
                "triggers": ["auth changed", "permission changed"],
                "securityReview": None,
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("security_review_required", result["diagnostic_ids"])
        self.assertTrue(result["releaseBlocking"])

    def test_no_security_trigger_records_na(self):
        from standard_harness.validation.security_review import SecurityReviewValidator

        result = SecurityReviewValidator.from_repo(ROOT).evaluate(
            {
                "packetId": "pkt-docs",
                "triggers": [],
                "securityReview": {"status": "N/A_RECORDED", "allowedByRule": ["no-security-trigger"]},
            }
        )

        self.assertEqual(result["status"], "pass")


if __name__ == "__main__":
    unittest.main()
