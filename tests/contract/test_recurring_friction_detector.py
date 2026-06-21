import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RecurringFrictionDetectorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_detector_flags_repeated_friction_type(self):
        from standard_harness.self_improvement.recurring import RecurringFrictionDetector

        result = RecurringFrictionDetector(threshold=2).detect(
            [
                {"friction_type": "docs_drift", "evidence_ids": ["ev-1"]},
                {"friction_type": "docs_drift", "evidence_ids": ["ev-2"]},
            ]
        )

        self.assertEqual(result["status"], "recurring")
        self.assertIn("recurring_friction_detected", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
