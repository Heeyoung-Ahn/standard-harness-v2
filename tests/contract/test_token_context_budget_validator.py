import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class TokenContextBudgetValidatorTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_budget_validator_blocks_oversized_context_pack(self):
        from standard_harness.validation.context_budget import ContextBudgetValidator

        result = ContextBudgetValidator.from_repo(ROOT).validate(
            {"role": "developer", "estimatedTokens": 50000, "items": []}
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("context_budget_exceeded", result["diagnostic_ids"])

    def test_budget_validator_accepts_summary_first_pack(self):
        from standard_harness.validation.context_budget import ContextBudgetValidator

        result = ContextBudgetValidator.from_repo(ROOT).validate(
            {
                "role": "reviewer",
                "estimatedTokens": 3000,
                "items": [{"path": "diff-summary", "contentMode": "summary"}],
            }
        )

        self.assertEqual(result["status"], "pass")


if __name__ == "__main__":
    unittest.main()
