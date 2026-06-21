import csv
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TRACE_PATH = ROOT / "docs" / "requirements" / "standard-harness-conformance-trace-v1.csv"
REPORT_PATH = ROOT / "docs" / "requirements" / "standard-harness-mvp-final-product-requirement-report-v1.csv"
SLICE_PATH = ROOT / "docs" / "implementation" / "standard-harness-final-product-conformance-slices-v1.md"

BASE_WORKSTREAMS = {f"FP-{index:02d}" for index in range(14)}
ADDENDUM_SLICES = {
    "FP-01A",
    "FP-01B",
    "FP-07A",
    "FP-07B",
    "FP-07C",
    "FP-08A",
    "FP-09A",
    "FP-09B",
    "FP-09C",
    "FP-10A",
    "FP-13A",
    "FP-13B",
    "FP-13C",
}
ALLOWED_WORKSTREAM_CODES = BASE_WORKSTREAMS | ADDENDUM_SLICES


def _read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


class ConformanceTraceCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.trace_rows = _read_csv(TRACE_PATH)
        cls.report_rows = _read_csv(REPORT_PATH)
        cls.report_by_id = {row["requirement_id"]: row for row in cls.report_rows}

    def test_trace_and_report_cover_same_260_unique_requirement_ids(self):
        trace_ids = [row["requirement_id"] for row in self.trace_rows]
        report_ids = [row["requirement_id"] for row in self.report_rows]

        self.assertEqual(260, len(trace_ids))
        self.assertEqual(260, len(report_ids))
        self.assertEqual(len(trace_ids), len(set(trace_ids)))
        self.assertEqual(len(report_ids), len(set(report_ids)))
        self.assertEqual(set(trace_ids), set(report_ids))

    def test_final_product_workstream_codes_are_complete_and_known(self):
        seen_addenda = set()

        for row in self.report_rows:
            codes = [code.strip() for code in row["fp_workstream_codes"].split(";") if code.strip()]
            self.assertTrue(codes, row["requirement_id"])
            unknown = set(codes) - ALLOWED_WORKSTREAM_CODES
            self.assertFalse(unknown, f"{row['requirement_id']} has unknown workstream codes {sorted(unknown)}")
            seen_addenda.update(set(codes) & ADDENDUM_SLICES)

        self.assertEqual(ADDENDUM_SLICES, seen_addenda)

    def test_unmapped_trace_rows_have_planning_resolution(self):
        unresolved = [
            row["requirement_id"]
            for row in self.report_rows
            if row["conformance_level"] == "unmapped_review_required"
            and not row["review_resolution_notes"].strip()
        ]

        self.assertEqual([], unresolved)

    def test_llm_requirements_have_full_final_product_coverage(self):
        required = {"FP-05", "FP-07", "FP-09", "FP-10", "FP-13"}

        for requirement_id in ("SH-LLM-001", "SH-LLM-002", "SH-LLM-003"):
            row = self.report_by_id[requirement_id]
            codes = {code.strip() for code in row["fp_workstream_codes"].split(";") if code.strip()}
            self.assertTrue(required.issubset(codes), requirement_id)

    def test_high_risk_requirements_have_explicit_closure_evidence_plans(self):
        expectations = {
            "SH-HUMAN-004": ["non-delegable", "human decision"],
            "SH-DEGRADE-001": ["optional providers", "browser tools", "cloud execution", "dashboards", "remote agents"],
            "SH-DOG-002": [
                "replay rebuild",
                "waiver expiry",
                "malicious adapter output",
                "path escape",
                "filesystem drift",
                "stale evidence",
                "non-waivable",
            ],
            "SH-INHERIT-001": ["inheritance traceability"],
            "SH-INHERIT-002": ["inheritance traceability"],
            "SH-INHERIT-003": ["inheritance traceability"],
            "SH-INHERIT-004": ["inheritance traceability"],
        }

        for requirement_id, terms in expectations.items():
            row = self.report_by_id[requirement_id]
            combined = " ".join(
                [
                    row["fp_implementation_summary"],
                    row["planned_evidence_refs"],
                    row["review_resolution_notes"],
                ]
            ).lower()
            for term in terms:
                self.assertIn(term, combined, requirement_id)

    def test_conformance_slice_document_defines_release_boundaries(self):
        self.assertTrue(SLICE_PATH.exists())
        text = SLICE_PATH.read_text(encoding="utf-8")

        for term in (
            "Kernel Slice",
            "Standard Slice",
            "Advanced Slice",
            "High-Integrity Slice",
            "Packet-state-evidence-gate-closeout",
            "FP-01A",
            "FP-07C",
            "FP-13C",
        ):
            self.assertIn(term, text)
