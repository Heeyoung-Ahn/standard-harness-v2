import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class ReleasePackagingHygieneTests(unittest.TestCase):
    def test_gitignore_excludes_runtime_and_cache_artifacts(self):
        text = (ROOT / ".gitignore").read_text(encoding="utf-8")

        for pattern in [".harness/state/", ".harness/**/*.sqlite3", "__pycache__/", "*.py[cod]"]:
            with self.subTest(pattern=pattern):
                self.assertIn(pattern, text)

    def test_gitattributes_normalizes_text_files(self):
        text = (ROOT / ".gitattributes").read_text(encoding="utf-8")

        self.assertIn("* text=auto", text)
        self.assertIn("*.py text eol=lf", text)


if __name__ == "__main__":
    unittest.main()
