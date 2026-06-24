import sys
import unittest
from pathlib import Path
from unittest.mock import Mock


ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


class ReleaseArchiveSymlinkEscapeTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(TOOLS))

    def test_release_archive_rejects_tracked_symlink_escape(self):
        from release_archive import validate_release_source

        root = ROOT
        source = Mock()
        source.is_symlink.return_value = True
        source.resolve.return_value = ROOT.parent / "outside-secret.txt"

        with self.assertRaisesRegex(ValueError, "release_archive_symlink_escape"):
            validate_release_source(root, source)


if __name__ == "__main__":
    unittest.main()
