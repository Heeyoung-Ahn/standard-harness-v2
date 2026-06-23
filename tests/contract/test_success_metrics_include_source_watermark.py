import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SuccessMetricsSourceWatermarkTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_hr200_report_includes_source_watermark(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        report = SuccessMetricsReporter().build(
            friction_records=[],
            cost_records=[],
            completion_results=[],
            source_event_range="1-12",
        )

        self.assertEqual("1-12", report["sourceWatermark"]["sourceEventRange"])
        self.assertEqual("success-metrics@v2.1", report["sourceWatermark"]["computedBy"])


if __name__ == "__main__":
    unittest.main()
