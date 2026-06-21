import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ManualHandoffEvidenceClassificationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_manual_handoff_intake_defaults_to_manual_only_evidence(self):
        from standard_harness.handoff.intake import HandoffIntakeClassifier

        result = HandoffIntakeClassifier().classify({"executionMode": "manual-handoff"})

        self.assertEqual(result["trustStatus"], "MANUAL_ONLY")
        self.assertEqual(result["validationStatus"], "STRUCTURALLY_VALID")


if __name__ == "__main__":
    unittest.main()
