import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class ImportSmokeTests(unittest.TestCase):
    def test_standard_harness_package_imports_from_src(self):
        sys.path.insert(0, str(SRC))

        import standard_harness  # noqa: F401
        import standard_harness.cli.main as cli_main

        self.assertTrue(callable(cli_main.main))

    def test_cli_help_can_be_invoked_without_installing_package(self):
        result = subprocess.run(
            [sys.executable, str(CLI), "--help"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("usage:", result.stdout.lower())

    def test_unknown_command_returns_structured_json_diagnostic(self):
        result = subprocess.run(
            [sys.executable, str(CLI), "--json", "unknown-command"],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertNotEqual(result.returncode, 0)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["diagnostics"][0]["error_code"], "unknown_command")
        self.assertEqual(payload["diagnostics"][0]["category"], "cli")
        self.assertEqual(payload["diagnostics"][0]["affected_entity_id"], "unknown-command")


if __name__ == "__main__":
    unittest.main()
