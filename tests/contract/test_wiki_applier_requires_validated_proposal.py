import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiApplierRequiresValidatedProposalTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_wiki_mutation_without_validated_proposal_fails(self):
        from standard_harness.wiki.applier import WikiApplier

        with tempfile.TemporaryDirectory() as tmp:
            result = WikiApplier(Path(tmp)).apply(
                {
                    "proposalId": "wp-001",
                    "targetPage": "_ops/wiki/architecture.md",
                    "content": "Architecture update.",
                    "validationStatus": "draft",
                }
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("wiki_proposal_not_validated", result["diagnostic_ids"])
            self.assertFalse((Path(tmp) / "_ops/wiki/architecture.md").exists())

    def test_validated_proposal_can_apply_to_wiki_page(self):
        from standard_harness.wiki.applier import WikiApplier

        with tempfile.TemporaryDirectory() as tmp:
            result = WikiApplier(Path(tmp)).apply(
                {
                    "proposalId": "wp-001",
                    "targetPage": "_ops/wiki/architecture.md",
                    "content": "Architecture update.",
                    "validationStatus": "validated",
                    "validatedBy": "wiki-proposal-validator",
                }
            )

            self.assertEqual(result["status"], "applied")
            self.assertTrue((Path(tmp) / "_ops/wiki/architecture.md").exists())


if __name__ == "__main__":
    unittest.main()
