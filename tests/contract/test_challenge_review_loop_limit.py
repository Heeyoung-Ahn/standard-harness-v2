import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeReviewLoopLimitTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_more_than_three_review_loops_blocks(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = root / "docs" / "reviews" / "v21" / "xp-04-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(
                "---\n"
                "{\n"
                '  "xpId": "XP-04",\n'
                '  "reviewedCommit": "abcdef1",\n'
                '  "reviewedFiles": ["src/example.py"],\n'
                '  "focusedTestCommand": "python -m unittest tests.contract.test_example",\n'
                '  "focusedTestResult": "passed",\n'
                '  "fullRegressionCommand": "python -m unittest discover -s tests",\n'
                '  "fullRegressionResult": "passed",\n'
                '  "challengeLoopCount": 4,\n'
                '  "findings": [],\n'
                '  "unresolvedFindings": [],\n'
                '  "fixesApplied": [],\n'
                '  "finalDecision": "pass"\n'
                "}\n"
                "---\n",
                encoding="utf-8",
            )

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-04"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("challenge_review_loop_limit_exceeded", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
