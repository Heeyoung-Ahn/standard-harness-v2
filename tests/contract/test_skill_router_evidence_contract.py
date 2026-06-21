import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SkillRouterEvidenceContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_router_selects_cataloged_skill_and_requires_evidence(self):
        from standard_harness.skills.router import SkillRouter

        result = SkillRouter.from_repo(ROOT).route(task_type="test-driven-implementation", role="developer")

        self.assertEqual(result["status"], "selected")
        self.assertEqual(result["selectedBy"], "skill-router")
        self.assertTrue(result["evidenceRequired"])
        self.assertIn("_ops/evidence/**", result["allowedWriteZones"])


if __name__ == "__main__":
    unittest.main()
