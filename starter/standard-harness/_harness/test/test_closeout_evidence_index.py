from __future__ import annotations

import sys
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.documenter.closeout_report import CloseoutReportDocumenter  # noqa: E402
from standard_harness.evidence.index import EvidenceIndexContract  # noqa: E402
from standard_harness.wiki.proposals import validate_documenter_output_paths  # noqa: E402


PASSING_GATE_ENTRY = {
    "evidenceId": "EV-harness-validation",
    "evidenceType": "test",
    "sourcePath": "reference/reports/testing/PKT-03_TEST_REPORT.md",
    "status": "pass",
    "trustStatus": "trusted",
    "freshnessStatus": "fresh",
    "resolutionStatus": "resolved",
    "redactionStatus": "not-sensitive",
    "requiredGate": "harness-validation",
    "claimId": "PKT-03",
    "acceptanceId": "report-validation",
}


class CloseoutEvidenceIndexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.contract = EvidenceIndexContract()
        self.documenter = CloseoutReportDocumenter()

    def test_builds_human_report_under_product_docs_with_evidence_index_link(self) -> None:
        index = self.contract.build_index(
            packet_id="PKT-03",
            entries=[PASSING_GATE_ENTRY],
            required_gates=["harness-validation"],
        )
        report = self.documenter.build_report(
            {
                "packet_id": "PKT-03",
                "objective": "Create one concise closeout report.",
                "actual_changes": "Report links evidence index.",
                "changed_files": ["documenter/closeout_report.py"],
                "test_evidence": "pass",
                "claim_summary": "claims linked",
                "wiki_proposal_summary": "proposal only",
                "closeout_decision": "pass",
                "evidence_index": index,
            }
        )

        self.assertEqual(report["report_path"], "product/docs/packets/PKT-03/closeout.md")
        self.assertEqual(report["evidence_index_path"], "_ops/evidence/PKT-03/evidence-index.json")
        self.assertIn("[Evidence index](_ops/evidence/PKT-03/evidence-index.json)", report["markdown"])
        self.assertTrue(
            self.documenter.validate_report(
                report,
                evidence_index=index,
                required_gates=["harness-validation"],
            )["ok"]
        )

    def test_required_gate_validation_blocks_missing_untrusted_stale_unresolved_evidence(self) -> None:
        index = self.contract.build_index(
            packet_id="PKT-03",
            required_gates=["harness-validation", "independent-review"],
            entries=[
                {
                    **PASSING_GATE_ENTRY,
                    "status": "fail",
                    "trustStatus": "untrusted",
                    "freshnessStatus": "stale",
                    "resolutionStatus": "unresolved",
                }
            ],
        )

        codes = sorted(
            item["code"]
            for item in self.contract.validate_index(
                index=index,
                required_gates=["harness-validation", "independent-review"],
            )["diagnostics"]
        )
        self.assertEqual(
            codes,
            sorted(
                [
                    "missing_required_gate_evidence",
                    "required_gate_not_passing",
                    "required_gate_stale",
                    "required_gate_unresolved",
                    "required_gate_untrusted",
                ]
            ),
        )

    def test_na_record_requires_reason_substitute_check_and_evidence_link(self) -> None:
        index = self.contract.build_index(
            packet_id="PKT-03",
            entries=[
                {
                    **PASSING_GATE_ENTRY,
                    "evidenceId": "EV-e2e-na",
                    "status": "not_applicable_recorded",
                    "requiredGate": "e2e-applicability",
                    "naRecord": {"reason": "No browser surface changed."},
                }
            ],
        )

        codes = [item["code"] for item in self.contract.validate_index(index=index)["diagnostics"]]
        self.assertEqual(codes.count("invalid_na_record"), 2)

    def test_closeout_report_blocks_raw_dumps_and_overlong_reports(self) -> None:
        report = self.documenter.build_report(
            {
                "packet_id": "PKT-03",
                "objective": "x",
                "actual_changes": "\n".join(f"line {index}" for index in range(130)),
                "changed_files": ["documenter/closeout_report.py"],
                "test_evidence": "```log\nraw output\n```",
                "claim_summary": "claims linked",
                "wiki_proposal_summary": "proposal only",
                "closeout_decision": "pass",
            }
        )

        codes = [item["code"] for item in self.documenter.validate_report(report)["diagnostics"]]
        self.assertIn("closeout_report_too_long", codes)
        self.assertIn("raw_evidence_dump_in_report", codes)

    def test_documenter_wiki_output_paths_cannot_mutate_wiki_directly(self) -> None:
        result = validate_documenter_output_paths(
            ["_ops/wiki/packet-memory.md", "_ops/wiki-proposals/PKT-03.json"]
        )

        self.assertFalse(result["ok"])
        self.assertEqual(result["diagnostics"][0]["code"], "documenter_direct_wiki_mutation")


if __name__ == "__main__":
    unittest.main()
