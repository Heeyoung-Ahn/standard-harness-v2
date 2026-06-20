import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class ReadmeCommandTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_readme_exists_and_mentions_required_commands(self):
        readme = ROOT / "README.md"
        self.assertTrue(readme.exists())
        text = readme.read_text(encoding="utf-8")
        for expected in [
            "python -m unittest discover -s tests",
            "python tools/harness_cli.py --json --harness-root",
            "validate --all",
            "starter/standard-harness",
        ]:
            self.assertIn(expected, text)

    def test_readme_init_command_shape_works(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [
                    sys.executable,
                    str(CLI),
                    "--json",
                    "--harness-root",
                    tmp,
                    "init",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual(json.loads(result.stdout)["status"], "ok")


if __name__ == "__main__":
    unittest.main()
