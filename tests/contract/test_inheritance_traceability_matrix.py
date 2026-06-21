import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MATRIX_PATH = ROOT / "docs" / "release" / "final-product-inheritance-traceability-matrix-v1.md"


CONCEPTS_TO_KEEP = [
    "packet-first workflow",
    "preflight gate",
    "TDD RED/GREEN evidence",
    "browser/real runtime evidence",
    "real-browser functional scenario evidence",
    "DB-backed runtime evidence split",
    "security evidence and redaction",
    "evidence manifest",
    "Active Context",
    "projection freshness checks",
    "operating state + generated projections",
    "packet-scope parity matrix",
    "risk-adaptive independent review",
    "artifact-sync and generated excerpt freshness checks",
    "operator diagnostic repair hints",
    "role authority boundary",
    "agent session/route event recording",
    "starter payload boundary",
    "docs command inventory",
    "development catalogs and command inventories",
    "harness contract tests",
]

PATTERNS_TO_REJECT = [
    "Codex-only core structure",
    "provider-specific command model as core workflow",
    "provider-specific subagent terminology as the canonical review model",
    "monolith validator",
    "monolith packet preflight",
    "monolith agent routing",
    "Markdown heading parser as primary contract",
    "mutable-state-only model",
    "v2 compatibility layer accumulation in core",
    "artifact-free pass states",
    "render-only browser checks as functional evidence",
    "schema-only database checks as runtime persistence evidence",
    "stale generated excerpts or artifact-sync reports as pass evidence",
    "command output that hides the exact failed field, enum, gate, or repair path",
    "universal heavy review burden for low-risk/editorial work",
    "mock adapter success as production success",
]


class InheritanceTraceabilityMatrixTests(unittest.TestCase):
    def test_matrix_maps_inheritance_requirements_to_implementation_evidence(self):
        self.assertTrue(MATRIX_PATH.exists())
        text = MATRIX_PATH.read_text(encoding="utf-8")

        for requirement_id in (
            "SH-INHERIT-001",
            "SH-INHERIT-002",
            "SH-INHERIT-003",
            "SH-INHERIT-004",
        ):
            self.assertIn(requirement_id, text)

        for required_term in (
            "MVP",
            "release-quality",
            "KFIX-001",
            "FP-13B",
            "contract test",
            "anti-requirement",
        ):
            self.assertIn(required_term, text)

    def test_matrix_records_every_concept_to_keep_and_pattern_to_reject(self):
        text = MATRIX_PATH.read_text(encoding="utf-8")
        table_rows = _table_rows(text)

        for concept in CONCEPTS_TO_KEEP:
            self.assertTrue(
                _row_contains(table_rows, concept),
                f"missing concept mapping row: {concept}",
            )
        for pattern in PATTERNS_TO_REJECT:
            self.assertTrue(
                _row_contains(table_rows, pattern),
                f"missing rejection mapping row: {pattern}",
            )


def _table_rows(text):
    return [
        line.strip()
        for line in text.splitlines()
        if line.strip().startswith("|")
        and not set(line.strip().replace("|", "").replace(" ", "")) <= {"-", ":"}
    ]


def _row_contains(rows, value):
    needle = value.lower()
    return any(needle in row.lower() for row in rows)


if __name__ == "__main__":
    unittest.main()
