import sys
import tempfile
import unittest
from pathlib import Path

from tests.contract.test_v21_conformance_blocks_missing_validator_catalog_entries import (
    SRC,
    copy_release_subset,
)


class V21ConformanceCompoundMetricsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_blocks_release_when_hr200_metrics_artifact_is_missing(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            copy_release_subset(root)
            (root / "_ops/metrics/hr200-success-metrics.json").unlink()

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_hr200_metrics", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
