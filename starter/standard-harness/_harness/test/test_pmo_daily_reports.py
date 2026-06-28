from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.pmo.reports import PmoDailyReportService  # noqa: E402
from standard_harness.validation.pmo_reports import (  # noqa: E402
    GENERATED_PMO_VIEW_FOLDERS,
    PMO_STRUCTURED_STATE_RECORDS,
    PMO_SURFACE_CONTRACT,
    REQUIRED_PMO_FOLDERS,
    validate_pmo_placement,
    validate_pmo_report,
)


class PmoDailyReportTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = PmoDailyReportService()
        self.sources = {
            "packet_id": "PKT-04",
            "packet_title": "PM Daily Rhythm",
            "source_watermark": 42,
            "next_work": "Implement PM daily rhythm.",
            "evidence_index_path": "_ops/evidence/PKT-04/evidence-index.json",
            "closeout_report_path": "product/docs/packets/PKT-04/closeout.md",
            "blockers": ["No blocker"],
            "risks": ["PM reports must not approve closeout"],
            "decisions_needed": ["Approve residual risk only if review finds one"],
            "completed_work": ["Day report generator"],
            "incomplete_work": ["PKT-05 long memory"],
            "wbs_changes": ["PKT-04 marked in progress"],
            "questions": ["Any PMO wording adjustment?"],
        }

    def test_day_start_report_is_one_page_coordination_only_with_source_links(self) -> None:
        report = self.service.build_day_start_report(self.sources, report_date="2026-06-28")

        self.assertEqual(report["report_path"], "_ops/views/pmo/day-start/2026-06-28.md")
        self.assertEqual(report["persistence"], "generated-view")
        self.assertEqual(report["authority"], "coordination-only")
        self.assertEqual(report["source_watermark"], 42)
        self.assertLessEqual(_body_line_count(report["markdown"]), 60)
        self.assertIn("_ops/evidence/PKT-04/evidence-index.json", report["markdown"])
        self.assertTrue(
            validate_pmo_report(report, canonical_source_watermark=42)["ok"],
        )

    def test_day_wrap_up_report_summarizes_completed_incomplete_wbs_and_questions(self) -> None:
        report = self.service.build_day_wrap_up_report(self.sources, report_date="2026-06-28")

        self.assertEqual(report["report_path"], "product/docs/pmo/day-wrap-up/2026-06-28.md")
        self.assertIn("Day report generator", report["markdown"])
        self.assertIn("PKT-05 long memory", report["markdown"])
        self.assertIn("PKT-04 marked in progress", report["markdown"])
        self.assertIn("Any PMO wording adjustment?", report["markdown"])
        self.assertTrue(validate_pmo_report(report, canonical_source_watermark=42)["ok"])

    def test_report_validation_blocks_stale_overlong_authority_claims_and_missing_evidence_links(self) -> None:
        report = self.service.build_day_start_report(
            {
                **self.sources,
                "source_watermark": 7,
                "evidence_index_path": "",
                "next_work": "PM approves implementation, testing, review, release, closeout, and residual risk.",
            },
            report_date="2026-06-28",
        )
        report["markdown"] += "\n" + "\n".join(f"extra line {index}" for index in range(70))

        codes = [
            item["code"]
            for item in validate_pmo_report(report, canonical_source_watermark=42)["diagnostics"]
        ]
        self.assertIn("pmo_report_stale", codes)
        self.assertIn("pmo_report_too_long", codes)
        self.assertIn("pmo_report_claims_approval_authority", codes)
        self.assertIn("pmo_report_missing_evidence_index_link", codes)

    def test_pmo_placement_requires_minimum_folder_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for folder in REQUIRED_PMO_FOLDERS:
                (root / "product" / "docs" / "pmo" / folder).mkdir(parents=True)

            self.assertTrue(validate_pmo_placement(root)["ok"])

            missing_root = root / "missing"
            (missing_root / "product" / "docs" / "pmo" / "wbs").mkdir(parents=True)
            codes = [item["code"] for item in validate_pmo_placement(missing_root)["diagnostics"]]
            self.assertIn("missing_pmo_folder", codes)

    def test_pmo_surface_contract_classifies_structured_state_away_from_markdown_folders(self) -> None:
        self.assertEqual(REQUIRED_PMO_FOLDERS, ["day-wrap-up", "wbs"])
        self.assertEqual(PMO_SURFACE_CONTRACT["human_markdown_folders"], ["day-wrap-up"])
        self.assertEqual(PMO_SURFACE_CONTRACT["structured_folders"], ["wbs"])
        self.assertIn("day-start", GENERATED_PMO_VIEW_FOLDERS)
        self.assertEqual(
            PMO_STRUCTURED_STATE_RECORDS,
            ["source-intake", "daily-reports", "status", "risks", "blockers"],
        )

    def test_pmo_placement_blocks_legacy_and_markdown_pressure_folders(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for folder in ["day-wrap-up", "wbs", "daily-wrap-up", "source-intake", "day-start"]:
                (root / "product" / "docs" / "pmo" / folder).mkdir(parents=True)

            codes = [item["code"] for item in validate_pmo_placement(root)["diagnostics"]]
            self.assertIn("legacy_pmo_folder", codes)
            self.assertIn("structured_pmo_state_as_markdown_folder", codes)
            self.assertIn("generated_pmo_view_as_required_markdown_folder", codes)


def _body_line_count(markdown: str) -> int:
    return len([line for line in markdown.splitlines() if line.strip()])


if __name__ == "__main__":
    unittest.main()
