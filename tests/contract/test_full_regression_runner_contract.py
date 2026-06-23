import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tools"


class FullRegressionRunnerContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_runner_uses_verbose_unittest_discovery(self):
        from run_full_regression import regression_command

        self.assertEqual(
            [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
            regression_command(),
        )


if __name__ == "__main__":
    unittest.main()
