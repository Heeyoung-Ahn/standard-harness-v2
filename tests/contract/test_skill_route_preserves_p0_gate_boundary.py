import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SkillRoutePreservesP0GateBoundaryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_skill_routes_never_bypass_p0_gates(self):
        from standard_harness.skills.catalog import SkillCatalog
        from standard_harness.skills.router import SkillRouter

        router = SkillRouter.from_repo(ROOT)

        for skill_id in SkillCatalog.minimum_required_from_repo(ROOT):
            skill = router.catalog.get(skill_id)
            for task_type in skill["taskTypes"]:
                with self.subTest(skill_id=skill_id, task_type=task_type):
                    result = router.route(task_type=task_type, role="developer")
                    self.assertFalse(result.get("bypassesP0Gate"))
                    self.assertIn("p0Boundary", result)
                    self.assertEqual(result["p0Boundary"], "preserved")


if __name__ == "__main__":
    unittest.main()
