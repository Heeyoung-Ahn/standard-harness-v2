import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class Hr200MetricsSourceWatermarkTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_source_watermark_records_hash_command_and_generation_time(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        report = SuccessMetricsReporter().build(
            friction_records=[],
            cost_records=[],
            completion_results=[{"status": "complete"}],
            validation_records=[{"validatorId": "boundary-validator", "status": "pass"}],
            evidence_records=[{"trustStatus": "TRUSTED_CI"}],
            source_event_range="1-12",
            source_record_hash="sha256:records",
        )

        watermark = report["sourceWatermark"]
        self.assertEqual("1-12", watermark["sourceEventRange"])
        self.assertEqual("sha256:records", watermark["sourceRecordHash"])
        self.assertEqual(
            "python tools\\harness_cli.py --json validate --v21-conformance",
            watermark["generationCommand"],
        )
        self.assertEqual("success-metrics@v2.1", watermark["computedBy"])
        self.assertTrue(watermark["generatedAt"].endswith("Z"))

    def test_missing_source_records_block_meaningful_default_metrics(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        with self.assertRaisesRegex(ValueError, "missing_source_records"):
            SuccessMetricsReporter().build(
                friction_records=[],
                cost_records=[],
                completion_results=[],
                evidence_records=[],
                source_event_range="projection",
                source_record_hash="",
            )


if __name__ == "__main__":
    unittest.main()
