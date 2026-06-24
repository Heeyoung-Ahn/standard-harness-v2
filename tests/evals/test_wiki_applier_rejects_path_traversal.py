import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiApplierTraversalTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_wiki_target_page_traversal_cannot_write_outside_wiki_root(self):
        from standard_harness.wiki.applier import WikiApplier

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = WikiApplier(root).apply(
                {
                    "proposalId": "wp-traversal",
                    "targetPage": "_ops/wiki/../escaped.md",
                    "content": "escaped",
                    "validationStatus": "validated",
                    "validatedBy": "wiki-proposal-validator",
                }
            )

            self.assertEqual(result["status"], "blocked")
            self.assertIn("invalid_wiki_target", result["diagnostic_ids"])
            self.assertFalse((root / "_ops/escaped.md").exists())


if __name__ == "__main__":
    unittest.main()
