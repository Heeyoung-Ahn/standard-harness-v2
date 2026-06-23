import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


class ReleaseArchiveUsesTrackedFilesOnlyTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(TOOLS))

    def test_release_file_listing_uses_git_tracked_files_only(self):
        from release_archive import list_release_files

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init"], cwd=root, check=True, capture_output=True)
            (root / "tracked.txt").write_text("tracked", encoding="utf-8")
            (root / "untracked.txt").write_text("untracked", encoding="utf-8")
            subprocess.run(["git", "add", "tracked.txt"], cwd=root, check=True, capture_output=True)

            files = list_release_files(root)

        self.assertEqual(["tracked.txt"], files)


if __name__ == "__main__":
    unittest.main()
