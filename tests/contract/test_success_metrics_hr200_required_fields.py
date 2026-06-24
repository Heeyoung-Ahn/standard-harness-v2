import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SuccessMetricsHr200RequiredFieldsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_hr200_report_contains_required_success_metrics(self):
        from standard_harness.metrics.success import SuccessMetricsReporter

        report = SuccessMetricsReporter().build(
            friction_records=[{"signalType": "manual_rework"}],
            cost_records=[{"cost_estimate": 1.25}],
            completion_results=[{"status": "complete"}],
            validation_records=[{"validatorId": "boundary-validator", "status": "pass"}],
            evidence_records=[{"trustStatus": "TRUSTED_CI"}],
            command_records=[{"status": "documented"}],
            claim_records=[{"supportStatus": "supported"}],
            source_record_hash="sha256:records",
        )

        for field in [
            "packetCloseoutCompleteness",
            "p0AlwaysValidationCoverage",
            "boundaryViolationDetection",
            "evidenceIndexCoverage",
            "trustedEvidenceRatio",
            "docsCommandInventoryCoverage",
            "closeoutClaimLedgerCoverage",
            "repeatedFrictionCount",
        ]:
            with self.subTest(field=field):
                self.assertIn(field, report)


if __name__ == "__main__":
    unittest.main()
