import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class EveryRequiredSkillHasHrTraceTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_minimum_required_skills_are_traceable_to_hr_130r(self):
        from standard_harness.skills.catalog import SkillCatalog

        catalog = SkillCatalog.from_repo(ROOT)

        for skill_id in SkillCatalog.minimum_required_from_repo(ROOT):
            with self.subTest(skill_id=skill_id):
                skill = catalog.get(skill_id)
                self.assertIn("HR-130R", skill.get("hrTrace", []))
                self.assertIn("XP-07A", skill.get("xpTrace", []))


if __name__ == "__main__":
    unittest.main()
