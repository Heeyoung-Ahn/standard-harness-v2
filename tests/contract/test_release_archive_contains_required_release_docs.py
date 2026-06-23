import sys
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


class ReleaseArchiveRequiredDocsTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(TOOLS))

    def test_release_archive_contains_required_release_docs(self):
        from release_archive import create_release_archive

        with tempfile.TemporaryDirectory() as temp:
            archive_path = Path(temp) / "release.zip"
            create_release_archive(ROOT, archive_path)
            with zipfile.ZipFile(archive_path) as archive:
                names = set(archive.namelist())

        self.assertIn("docs/release/v21-conformance-report.md", names)
        self.assertIn("docs/release/release-packaging-hygiene-v21.md", names)
        self.assertIn("docs/release/final-product-docs-command-inventory-v1.md", names)


if __name__ == "__main__":
    unittest.main()
