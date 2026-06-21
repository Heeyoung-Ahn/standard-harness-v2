import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RoleSpecificContextPackTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_developer_pack_contains_packet_files_rules_and_budget(self):
        from standard_harness.context.packs import ContextPackBuilder

        pack = ContextPackBuilder.from_repo(ROOT).build(
            role="developer",
            packet={"packet_id": "pkt-001", "change_zones": ["src/standard_harness/context"]},
            items=[
                {"path": "_harness/policies/p0-policy.yaml", "content": "policy"},
                {"path": "src/standard_harness/context/packs.py", "content": "code"},
                {"path": "docs/requirements/standard-harness-integrated-requirements-v0.2.md", "content": "requirements"},
            ],
        )

        self.assertEqual(pack["role"], "developer")
        self.assertTrue(all("authorityTier" in item for item in pack["items"]))
        self.assertNotIn("full_repo", pack["includedScopes"])
        self.assertLessEqual(pack["estimatedTokens"], pack["tokenBudget"]["maxTokens"])


if __name__ == "__main__":
    unittest.main()
