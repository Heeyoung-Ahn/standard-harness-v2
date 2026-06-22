import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


class ReleaseArchiveExcludesUntrackedTempFilesTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(TOOLS))

    def test_release_file_listing_excludes_runtime_cache_and_bytecode(self):
        from release_archive import list_release_files

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init"], cwd=root, check=True, capture_output=True)
            paths = [
                root / "src" / "app.py",
                root / ".harness" / "state" / "harness.sqlite3",
                root / "src" / "__pycache__" / "app.pyc",
            ]
            for path in paths:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("x", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=root, check=True, capture_output=True)

            files = list_release_files(root)

        self.assertEqual(["src/app.py"], files)


if __name__ == "__main__":
    unittest.main()
