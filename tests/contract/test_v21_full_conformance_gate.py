import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class V21FullConformanceGateTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_v21_conformance_gate_passes_current_release_metadata(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        result = V21ConformanceGate(ROOT).evaluate()

        self.assertEqual(result["status"], "pass")
        self.assertEqual(result["diagnostic_ids"], [])
        self.assertTrue(result["releaseBlocking"])


if __name__ == "__main__":
    unittest.main()
