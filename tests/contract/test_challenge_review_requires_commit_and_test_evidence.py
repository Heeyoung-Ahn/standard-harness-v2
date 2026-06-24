import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ChallengeReviewRequiresCommitAndTestEvidenceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_review_without_commit_and_test_evidence_blocks(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = root / "docs" / "reviews" / "v21" / "xp-02-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(
                "---\n"
                "{\n"
                '  "xpId": "XP-02",\n'
                '  "reviewedFiles": [],\n'
                '  "challengeLoopCount": 1,\n'
                '  "findings": [],\n'
                '  "unresolvedFindings": [],\n'
                '  "fixesApplied": [],\n'
                '  "finalDecision": "pass"\n'
                "}\n"
                "---\n",
                encoding="utf-8",
            )

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-02"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("missing_review_commit", result["diagnostic_ids"])
        self.assertIn("missing_review_test_evidence", result["diagnostic_ids"])

    def test_placeholder_review_commit_blocks(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = root / "docs" / "reviews" / "v21" / "hardening" / "xp-10a-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(
                "---\n"
                "{\n"
                '  "xpId": "XP-10A",\n'
                '  "reviewedCommit": "pending-xp-10a",\n'
                '  "reviewedFiles": ["src/standard_harness/completion/v21_conformance.py"],\n'
                '  "focusedTestCommand": "python -m unittest tests.contract.test_v21_full_conformance_gate",\n'
                '  "focusedTestResult": "passed",\n'
                '  "fullRegressionCommand": "python -m unittest discover -s tests",\n'
                '  "fullRegressionResult": "passed",\n'
                '  "challengeLoopCount": 1,\n'
                '  "findings": [],\n'
                '  "unresolvedFindings": [],\n'
                '  "fixesApplied": [],\n'
                '  "finalDecision": "pass"\n'
                "}\n"
                "---\n",
                encoding="utf-8",
            )

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-10A"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_review_commit", result["diagnostic_ids"])

    def test_unknown_review_commit_blocks_when_git_metadata_exists(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".git").mkdir()
            report = root / "docs" / "reviews" / "v21" / "xp-02-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(
                "---\n"
                "{\n"
                '  "xpId": "XP-02",\n'
                '  "reviewedCommit": "0000000000000000000000000000000000000000",\n'
                '  "reviewedFiles": ["src/example.py"],\n'
                '  "focusedTestCommand": "python -m unittest tests.example",\n'
                '  "focusedTestResult": "passed",\n'
                '  "fullRegressionCommand": "python -m unittest discover -s tests",\n'
                '  "fullRegressionResult": "passed",\n'
                '  "challengeLoopCount": 1,\n'
                '  "findings": [],\n'
                '  "unresolvedFindings": [],\n'
                '  "fixesApplied": [],\n'
                '  "finalDecision": "pass"\n'
                "}\n"
                "---\n",
                encoding="utf-8",
            )

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-02"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_review_commit", result["diagnostic_ids"])

    def test_short_review_commit_blocks(self):
        from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            report = root / "docs" / "reviews" / "v21" / "xp-02-challenge-review.md"
            report.parent.mkdir(parents=True)
            report.write_text(
                "---\n"
                "{\n"
                '  "xpId": "XP-02",\n'
                '  "reviewedCommit": "abcdef1",\n'
                '  "reviewedFiles": ["src/example.py"],\n'
                '  "focusedTestCommand": "python -m unittest tests.example",\n'
                '  "focusedTestResult": "passed",\n'
                '  "fullRegressionCommand": "python -m unittest discover -s tests",\n'
                '  "fullRegressionResult": "passed",\n'
                '  "challengeLoopCount": 1,\n'
                '  "findings": [],\n'
                '  "unresolvedFindings": [],\n'
                '  "fixesApplied": [],\n'
                '  "finalDecision": "pass"\n'
                "}\n"
                "---\n",
                encoding="utf-8",
            )

            result = ChallengeReviewEvidenceValidator(root).validate_required(["XP-02"])

        self.assertEqual(result["status"], "blocked")
        self.assertIn("invalid_review_commit", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
