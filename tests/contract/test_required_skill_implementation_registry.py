import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RequiredSkillImplementationRegistryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_required_skills_have_internal_registry_entries(self):
        from standard_harness.skills.internal import registry

        entries = registry.required_skill_registry()

        self.assertIn("SKILL-TDD-IMPLEMENTATION", entries)
        self.assertEqual(entries["SKILL-TDD-IMPLEMENTATION"]["implementationType"], "v2-native-internal")


if __name__ == "__main__":
    unittest.main()
