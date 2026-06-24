import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeReviewEvidenceRequiredTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_missing_review_report_blocks(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            result = ChallengeReviewEvidenceValidator(Path(tmp)).validate_required(["XP-01"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_challenge_review_evidence", result["diagnostic_ids"])

    def test_valid_review_report_passes(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = root / "docs" / "reviews" / "v21" / "xp-01-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(_report("XP-01"), encoding="utf-8")

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-01"])

        self.assertEqual(result["status"], "pass")
        self.assertEqual([], result["diagnostic_ids"])

    def test_repository_challenge_review_evidence_set_passes(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        result = ChallengeReviewEvidenceValidator(ROOT).validate_required(
            [
                "XP-01",
                "XP-02",
                "XP-03",
                "XP-04",
                "XP-05",
                "XP-06",
                "XP-07",
                "XP-08",
                "XP-09",
                "XP-10",
                "XP-07A",
                "XP-09A",
                "XP-ProcessA",
                "XP-PackagingA",
                "XP-10A",
            ]
        )

        self.assertEqual(result["status"], "pass")
        self.assertEqual([], result["diagnostic_ids"])


def _report(xp_id: str) -> str:
    return (
        "---\n"
        "{\n"
        f'  "xpId": "{xp_id}",\n'
        '  "reviewedCommit": "abcdef1234567890abcdef1234567890abcdef12",\n'
        '  "reviewedFiles": ["src/example.py"],\n'
        '  "focusedTestCommand": "python -m unittest tests.contract.test_example",\n'
        '  "focusedTestResult": "passed",\n'
        '  "fullRegressionCommand": "python -m unittest discover -s tests",\n'
        '  "fullRegressionResult": "passed",\n'
        '  "challengeLoopCount": 1,\n'
        '  "findings": [],\n'
        '  "unresolvedFindings": [],\n'
        '  "fixesApplied": [],\n'
        '  "finalDecision": "pass"\n'
        "}\n"
        "---\n"
        "# Challenge Review\n"
    )


if __name__ == "__main__":
    unittest.main()
