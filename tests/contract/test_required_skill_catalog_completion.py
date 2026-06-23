import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RequiredSkillCatalogCompletionTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_catalog_contains_every_minimum_required_skill(self):
        from standard_harness.skills.catalog import SkillCatalog

        minimum = SkillCatalog.minimum_required_from_repo(ROOT)
        catalog = SkillCatalog.from_repo(ROOT)

        self.assertEqual(set(minimum), set(catalog.by_id))

    def test_every_cataloged_skill_has_execution_contract(self):
        from standard_harness.skills.catalog import SkillCatalog

        catalog = SkillCatalog.from_repo(ROOT)

        for skill_id, skill in catalog.by_id.items():
            with self.subTest(skill_id=skill_id):
                self.assertTrue(skill.get("taskTypes"), skill_id)
                self.assertIn("permissionScope", skill)
                self.assertIn("evidenceContract", skill)
                self.assertTrue(skill["evidenceContract"].get("required"))
                self.assertIn("fallbackBehavior", skill)
                self.assertIn("validationCommand", skill)
                self.assertIn("HR-130R", skill.get("hrTrace", []))


if __name__ == "__main__":
    unittest.main()
