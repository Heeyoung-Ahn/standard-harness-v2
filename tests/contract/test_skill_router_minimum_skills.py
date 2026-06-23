import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SkillRouterMinimumSkillsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_router_recognizes_every_minimum_required_skill_task_type(self):
        from standard_harness.skills.catalog import SkillCatalog
        from standard_harness.skills.router import SkillRouter

        catalog = SkillCatalog.from_repo(ROOT)
        router = SkillRouter(catalog)

        for skill_id in SkillCatalog.minimum_required_from_repo(ROOT):
            skill = catalog.get(skill_id)
            for task_type in skill["taskTypes"]:
                with self.subTest(skill_id=skill_id, task_type=task_type):
                    result = router.route(task_type=task_type, role="developer")
                    self.assertEqual(result["status"], "selected")
                    self.assertEqual(result["requiredSkill"], skill_id)
                    self.assertEqual(result["selectedBy"], "skill-router")
                    self.assertTrue(result["evidenceRequired"])


if __name__ == "__main__":
    unittest.main()
