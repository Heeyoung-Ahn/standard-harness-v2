import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class SkillCatalogContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_catalog_entries_have_permission_evidence_fallback_and_trace(self):
        from standard_harness.skills.catalog import SkillCatalog

        catalog = SkillCatalog.from_repo(ROOT)
        skill = catalog.get("SKILL-TDD-IMPLEMENTATION")

        self.assertEqual(skill["source"], "v2-native-internal")
        self.assertIn("permissionScope", skill)
        self.assertIn("evidenceContract", skill)
        self.assertIn("fallbackBehavior", skill)
        self.assertIn("hrTrace", skill)


if __name__ == "__main__":
    unittest.main()
