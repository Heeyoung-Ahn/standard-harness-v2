import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class SkillFacingIndexProjectionOnlyTests(unittest.TestCase):
    def test_skill_facing_index_is_projection_only_and_non_authorizing(self):
        path = ROOT / "_ops/wiki/skill-facing-index.md"
        content = path.read_text(encoding="utf-8")

        self.assertIn("projection only", content.lower())
        self.assertIn("cannot execute or authorize skills", content.lower())
        self.assertNotIn("selectedBy:", content)


if __name__ == "__main__":
    unittest.main()
