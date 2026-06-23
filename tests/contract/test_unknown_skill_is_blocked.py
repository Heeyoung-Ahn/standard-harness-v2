import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class UnknownSkillBlockedTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_unknown_required_skill_is_blocked_with_specific_diagnostic(self):
        from standard_harness.skills.router import SkillRouter

        result = SkillRouter.from_repo(ROOT).route(task_type="unregistered-required-skill", role="developer")

        self.assertEqual(result["status"], "blocked")
        self.assertIn("unknown_required_skill", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
