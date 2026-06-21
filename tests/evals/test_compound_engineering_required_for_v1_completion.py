import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CompoundEngineeringRequiredForV1CompletionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_completion_blocks_without_compound_metrics_and_starter_candidate(self):
        from standard_harness.metrics.success import CompoundCompletionGate

        result = CompoundCompletionGate().evaluate(
            {
                "recurringFrictionDetected": True,
                "successMetricsReport": None,
                "starterPromotionCandidates": [],
            }
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_success_metrics_report", result["diagnostic_ids"])
        self.assertIn("missing_starter_promotion_candidate", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
