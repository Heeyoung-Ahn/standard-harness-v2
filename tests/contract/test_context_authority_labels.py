import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ContextAuthorityLabelsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_context_items_are_labelled_by_authority_tier(self):
        from standard_harness.context.authority import ContextAuthorityPolicy

        policy = ContextAuthorityPolicy.from_repo(ROOT)
        labelled = policy.label_item({"path": "_harness/policies/p0-policy.yaml", "content": "policy"})

        self.assertEqual(labelled["authorityTier"], "policy")
        self.assertTrue(labelled["mayInstruct"])

    def test_untrusted_evidence_cannot_override_policy(self):
        from standard_harness.context.authority import ContextAuthorityPolicy

        policy = ContextAuthorityPolicy.from_repo(ROOT)
        result = policy.evaluate_override(
            source={"authorityTier": "evidence-report"},
            target={"authorityTier": "policy"},
        )

        self.assertEqual(result["status"], "blocked")
        self.assertIn("untrusted_authority_override", result["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
