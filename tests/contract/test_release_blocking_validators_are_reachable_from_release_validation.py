import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ReleaseBlockingValidatorReachabilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_release_blocking_validators_are_reachable_from_release_validation(self):
        from standard_harness.validation.catalog import ValidatorCatalog

        catalog = ValidatorCatalog.from_repo(ROOT)

        self.assertNotIn("missing_release_reachability", catalog.release_blocking_diagnostics())
        self.assertNotIn("missing_gate_result_metadata", catalog.release_blocking_diagnostics())


if __name__ == "__main__":
    unittest.main()
