import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class V1SkillReferenceTraceabilityTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_v1_reference_is_trace_only_not_runtime_source(self):
        from standard_harness.skills.catalog import SkillCatalog

        skill = SkillCatalog.from_repo(ROOT).get("SKILL-TDD-IMPLEMENTATION")

        self.assertEqual(skill["v1ReferenceDisposition"], "reference-only")
        self.assertNotIn("docs/reference/v1/clean-starter-harness.zip", skill["runtimeSources"])


if __name__ == "__main__":
    unittest.main()
