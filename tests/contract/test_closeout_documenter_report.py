import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class CloseoutDocumenterReportTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_closeout_report_contains_v02_required_sections_and_wiki_summary(self):
        from standard_harness.documenter.closeout_report import CloseoutReportDocumenter

        report = CloseoutReportDocumenter().build_report(
            {
                "packet_id": "pkt-001",
                "objective": "Ship wiki documenter",
                "changed_files": ["src/standard_harness/wiki/proposals.py"],
                "test_evidence": [{"evidence_id": "ev-001", "trust_status": "TRUSTED_CI"}],
                "claim_summary": ["claim-001 supported"],
                "closeout_decision": "closed",
                "wiki_proposal_summary": "Update architecture page.",
            }
        )

        self.assertEqual(report["artifact_path"], "_ops/evidence/pkt-001/closeout-report.md")
        self.assertEqual(set(report["missing_sections"]), set())
        self.assertIn("wikiProposalSummary", report["sections"])
        self.assertIn("testEvidenceAndTrustStatus", report["sections"])


if __name__ == "__main__":
    unittest.main()
