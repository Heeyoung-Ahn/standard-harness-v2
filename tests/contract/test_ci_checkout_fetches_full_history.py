import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class CiCheckoutHistoryTests(unittest.TestCase):
    def test_ci_checkout_fetches_full_git_history_for_commit_evidence_validation(self):
        workflow = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")

        self.assertIn("uses: actions/checkout@v4", workflow)
        self.assertIn("fetch-depth: 0", workflow)


if __name__ == "__main__":
    unittest.main()
