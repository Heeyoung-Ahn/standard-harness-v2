import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class Hr200MetricsTrustStatusesTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_trusted_evidence_ratio_uses_v21_trust_statuses(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        report = SuccessMetricsReporter().build(
            friction_records=[],
            cost_records=[],
            completion_results=[{"status": "complete"}],
            evidence_records=[
                {"trustStatus": "REPRODUCED_BY_HARNESS"},
                {"trustStatus": "TRUSTED_CI"},
                {"trustStatus": "MANUAL_ONLY"},
            ],
            source_event_range="1-3",
            source_record_hash="sha256:records",
        )

        self.assertEqual(2 / 3, report["trustedEvidenceRatio"])

    def test_undefined_trusted_status_is_invalid(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        with self.assertRaisesRegex(ValueError, "invalid_trust_status"):
            SuccessMetricsReporter().build(
                friction_records=[],
                cost_records=[],
                completion_results=[{"status": "complete"}],
                evidence_records=[{"trustStatus": "TRUSTED"}],
                source_event_range="1-1",
                source_record_hash="sha256:records",
            )


if __name__ == "__main__":
    unittest.main()
