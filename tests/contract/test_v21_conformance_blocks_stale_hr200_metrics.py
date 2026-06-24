import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class V21ConformanceStaleHr200MetricsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_stale_source_watermark_blocks_v21_conformance(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _copy_release_subset(root)
            metrics_path = root / "_ops/metrics/hr200-success-metrics.json"
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            metrics["sourceRecordHash"] = "sha256:current"
            metrics["sourceWatermark"].update(
                {
                    "sourceRecordHash": "sha256:current",
                    "generationCommand": "python tools\\harness_cli.py --json validate --v21-conformance",
                    "generatedAt": "2026-06-24T00:00:00Z",
                }
            )
            metrics["sourceWatermark"]["sourceRecordHash"] = "sha256:stale"
            metrics_path.write_text(json.dumps(metrics), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("stale_hr200_metrics", result["diagnostic_ids"])

    def test_invalid_ratio_type_blocks_v21_conformance(self):
        from standard_harness.completion.v21_conformance import V21ConformanceGate

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _copy_release_subset(root)
            metrics_path = root / "_ops/metrics/hr200-success-metrics.json"
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            metrics["sourceRecordHash"] = "sha256:current"
            metrics["sourceWatermark"].update(
                {
                    "sourceRecordHash": "sha256:current",
                    "generationCommand": "python tools\\harness_cli.py --json validate --v21-conformance",
                    "generatedAt": "2026-06-24T00:00:00Z",
                }
            )
            metrics["trustedEvidenceRatio"] = "1.0"
            metrics_path.write_text(json.dumps(metrics), encoding="utf-8")

            result = V21ConformanceGate(root).evaluate()

        self.assertEqual("blocked", result["status"])
        self.assertIn("invalid_hr200_metric_type", result["diagnostic_ids"])


def _copy_release_subset(target: Path) -> None:
    paths = [
        "_harness/requirements/hr-coverage-matrix.yaml",
        "_harness/requirements/traceability-matrix.yaml",
        "_harness/policies/validator-catalog.yaml",
        "_ops/metrics/hr200-success-metrics.json",
        "_ops/evidence/release/v21-full-regression.json",
        "docs/reviews/v21",
        "tests",
        "docs/release/v21-conformance-report.md",
        "docs/release/release-packaging-hygiene-v21.md",
        "docs/release/final-product-docs-command-inventory-v1.md",
        "docs/manual/standard-harness-v21-development-scenario.md",
    ]
    for relative in paths:
        source = ROOT / relative
        destination = target / relative
        if source.is_dir():
            shutil.copytree(source, destination)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


if __name__ == "__main__":
    unittest.main()
