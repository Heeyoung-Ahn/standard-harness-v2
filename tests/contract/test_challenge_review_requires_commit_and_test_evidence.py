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


if __name__ == "__main__":
    unittest.main()
