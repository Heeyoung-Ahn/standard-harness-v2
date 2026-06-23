import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RequiredSkillImplementationRegistryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_required_skills_have_internal_registry_entries(self):
        from standard_harness.skills.catalog import SkillCatalog
        from standard_harness.skills.internal import registry

        entries = registry.required_skill_registry()

        for skill_id in SkillCatalog.minimum_required_from_repo(ROOT):
            with self.subTest(skill_id=skill_id):
                self.assertIn(skill_id, entries)
                self.assertEqual(entries[skill_id]["implementationType"], "v2-native-internal")
                self.assertIn("validationCommand", entries[skill_id])


if __name__ == "__main__":
    unittest.main()
