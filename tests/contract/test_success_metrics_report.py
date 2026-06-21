import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SuccessMetricsReportTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_success_metrics_report_contains_hr200_cost_and_friction_metrics(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        report = SuccessMetricsReporter().build(
            friction_records=[{"friction_type": "manual_rework"}],
            cost_records=[{"cost_estimate": 1.25}],
            completion_results=[{"status": "complete"}],
        )

        self.assertEqual(report["metricId"], "HR-200")
        self.assertEqual(report["frictionCount"], 1)
        self.assertEqual(report["totalCostEstimate"], 1.25)
        self.assertEqual(report["completionRate"], 1.0)


if __name__ == "__main__":
    unittest.main()
