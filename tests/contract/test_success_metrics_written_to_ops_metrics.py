import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SuccessMetricsWrittenToOpsMetricsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_reporter_writes_hr200_release_evidence_artifact(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        with tempfile.TemporaryDirectory() as tmp:
            path = SuccessMetricsReporter().write_state_backed_report(
                tmp,
                source_records={
                    "friction_records": [{"signalType": "manual_rework"}],
                    "cost_records": [],
                    "completion_results": [{"status": "complete"}],
                    "validation_records": [],
                    "evidence_records": [],
                    "command_records": [],
                    "claim_records": [],
                    "source_event_range": "1-7",
                },
            )
            payload = json.loads(Path(path).read_text(encoding="utf-8"))

        self.assertEqual(Path(tmp) / "_ops" / "metrics" / "hr200-success-metrics.json", Path(path))
        self.assertEqual("HR-200", payload["metricId"])


if __name__ == "__main__":
    unittest.main()
