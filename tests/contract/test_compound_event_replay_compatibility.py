import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CompoundEventReplayCompatibilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_legacy_friction_record_maps_to_friction_signal(self):
        from standard_harness.self_improvement.recurring import friction_signal_from_record

        signal = friction_signal_from_record(
            {"friction_record_id": "fr-001", "friction_type": "manual_rework", "evidence_ids": ["ev-001"]}
        )

        self.assertEqual(signal["eventType"], "friction.signal")
        self.assertEqual(signal["evidenceIds"], ["ev-001"])


if __name__ == "__main__":
    unittest.main()
