import json
import sys
import tempfile
import unittest
from pathlib import Path

from tests.contract.test_v21_conformance_blocks_missing_validator_catalog_entries import (
    SRC,
    copy_release_subset,
)


class V21ConformanceHr200ArtifactTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_blocks_release_when_hr200_artifact_has_no_source_watermark(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            copy_release_subset(root)
            metrics_path = root / "_ops/metrics/hr200-success-metrics.json"
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            metrics.pop("sourceWatermark", None)
            metrics_path.write_text(json.dumps(metrics), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual(result["status"], "blocked")
        self.assertIn("incomplete_hr200_metrics", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
