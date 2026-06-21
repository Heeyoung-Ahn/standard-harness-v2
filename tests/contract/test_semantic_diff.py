import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SemanticDiffTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_classifies_editorial_clarification_and_semantic_changes(self):
        from standard_harness.diff.semantic import SemanticDiffService

        service = SemanticDiffService()

        unchanged = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system shall record evidence.",
        )
        editorial = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system shall record evidence!",
        )
        clarification = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system shall record evidence clearly.",
        )
        semantic = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system may record evidence.",
        )

        self.assertEqual(unchanged["change_class"], "unchanged")
        self.assertEqual(editorial["change_class"], "editorial")
        self.assertEqual(clarification["change_class"], "clarification")
        self.assertEqual(semantic["change_class"], "semantic_change")
        self.assertTrue(semantic["requires_human_review"])

    def test_review_required_for_governance_removed_and_ambiguous_changes(self):
        from standard_harness.diff.semantic import SemanticDiffService

        service = SemanticDiffService()

        governance = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system shall record evidence after security approval.",
        )
        removed = service.compare(
            old_text="The system shall record evidence.",
            new_text="",
        )
        ambiguous = service.compare(
            old_text="The system shall record evidence.",
            new_text="The system ???",
        )

        self.assertEqual(governance["change_class"], "governance_risk_change")
        self.assertEqual(removed["change_class"], "removed")
        self.assertEqual(ambiguous["change_class"], "ambiguous")
        self.assertTrue(governance["requires_human_review"])
        self.assertTrue(removed["requires_human_review"])
        self.assertTrue(ambiguous["requires_human_review"])

    def test_diff_report_preserves_source_ranges_when_supplied(self):
        from standard_harness.diff.semantic import SemanticDiffService

        report = SemanticDiffService().compare(
            old_text="The system shall record evidence.",
            new_text="The system may record evidence.",
            old_source_range={"start_line": 10, "end_line": 12},
            new_source_range={"start_line": 20, "end_line": 22},
        )

        self.assertEqual(report["old_source_range"], {"start_line": 10, "end_line": 12})
        self.assertEqual(report["new_source_range"], {"start_line": 20, "end_line": 22})
        self.assertEqual(report["change_class"], "semantic_change")
