import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RefactorDomainBoundaryGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_core_domain_change_requires_refactor_review_result(self):
        from standard_harness.validation.refactor_review import RefactorReviewValidator

        result = RefactorReviewValidator.from_repo(ROOT).evaluate(
            {
                "packetId": "pkt-domain",
                "changeAreas": ["core-domain", "data-model"],
                "refactorReview": None,
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("refactor_review_required", result["diagnostic_ids"])
        self.assertIn("domain_boundary_review_required", result["diagnostic_ids"])

    def test_follow_up_refactor_requires_follow_up_id(self):
        from standard_harness.validation.refactor_review import RefactorReviewValidator

        result = RefactorReviewValidator.from_repo(ROOT).evaluate(
            {
                "packetId": "pkt-domain",
                "changeAreas": ["core-domain"],
                "refactorReview": {"result": "FOLLOW_UP_REFACTOR_PACKET_REQUIRED"},
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_follow_up_refactor_packet", result["diagnostic_ids"])

    def test_no_refactor_required_passes_for_small_utility_change(self):
        from standard_harness.validation.refactor_review import RefactorReviewValidator

        result = RefactorReviewValidator.from_repo(ROOT).evaluate(
            {
                "packetId": "pkt-util",
                "changeAreas": ["small-utility"],
                "refactorReview": {"result": "NO_REFACTOR_REQUIRED"},
            }
        )

        self.assertEqual(result["status"], "pass")


if __name__ == "__main__":
    unittest.main()
