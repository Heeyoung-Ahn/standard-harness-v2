import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


class FullRegressionRunnerRecordsLastTestTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(TOOLS))

    def test_last_test_from_verbose_unittest_output(self):
        from run_full_regression import last_test_from_output

        output = (
            "test_alpha (tests.contract.test_example.ExampleTests.test_alpha) ... ok\n"
            "test_beta (tests.contract.test_example.ExampleTests.test_beta) ... "
        )

        self.assertEqual(
            "tests.contract.test_example.ExampleTests.test_beta",
            last_test_from_output(output),
        )


if __name__ == "__main__":
    unittest.main()
