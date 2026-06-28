from __future__ import annotations

import sys
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.pmo.wbs import REQUIRED_WBS_COLUMNS, build_wbs_tsv, validate_wbs_tsv  # noqa: E402


class PmoWbsTests(unittest.TestCase):
    def test_builds_wbs_tsv_with_minimum_packet_evidence_and_closeout_columns(self) -> None:
        tsv = build_wbs_tsv(
            [
                {
                    "wbs_id": "1.4",
                    "parent_id": "1",
                    "packet_id": "PKT-04",
                    "title": "PM Daily Rhythm",
                    "status": "in_progress",
                    "owner_role": "orchestrator",
                    "priority": "P1",
                    "risk_level": "high",
                    "planned_start": "2026-06-28",
                    "planned_finish": "2026-06-28",
                    "evidence_index_path": "_ops/evidence/PKT-04/evidence-index.json",
                    "closeout_report_path": "product/docs/packets/PKT-04/closeout.md",
                    "updated_at": "2026-06-28T00:00:00Z",
                }
            ]
        )

        header = tsv.splitlines()[0].split("\t")
        self.assertEqual(header, REQUIRED_WBS_COLUMNS)
        self.assertTrue(validate_wbs_tsv(tsv)["ok"])
        self.assertIn("_ops/evidence/PKT-04/evidence-index.json", tsv)

    def test_wbs_validation_blocks_missing_columns_and_missing_evidence_links(self) -> None:
        invalid_tsv = "wbs_id\tpacket_id\ttitle\n1.4\tPKT-04\tPM Daily Rhythm\n"

        codes = [item["code"] for item in validate_wbs_tsv(invalid_tsv)["diagnostics"]]
        self.assertIn("missing_wbs_tsv_column", codes)
        self.assertIn("missing_wbs_evidence_index_path", codes)
        self.assertIn("missing_wbs_closeout_report_path", codes)


if __name__ == "__main__":
    unittest.main()
