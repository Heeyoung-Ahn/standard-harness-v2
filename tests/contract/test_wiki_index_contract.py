import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class WikiIndexContractTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_index_builder_projects_authoritative_pages_and_stale_warnings(self):
        from standard_harness.wiki.index import WikiIndexBuilder

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page = root / "_ops/wiki/architecture.md"
            page.parent.mkdir(parents=True)
            page.write_text(
                "---\nentryType: DECISION\nsourceTier: trusted-evidence\nreviewStatus: current\n---\nBody",
                encoding="utf-8",
            )

            index = WikiIndexBuilder(root).build()

            self.assertEqual(index["pages"][0]["path"], "_ops/wiki/architecture.md")
            self.assertEqual(index["pages"][0]["sourceTier"], "trusted-evidence")
            self.assertEqual(index["diagnostic_ids"], [])


if __name__ == "__main__":
    unittest.main()
