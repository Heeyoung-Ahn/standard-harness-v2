import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class ManualRunbookCommandValidationTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_manual_runbook_and_troubleshooting_commands_are_in_inventory(self):
        from standard_harness.docsops.command_inventory import CommandInventoryService

        runbook = ROOT / "docs/manual/standard-harness-runbook-v21.md"
        troubleshooting = ROOT / "docs/manual/standard-harness-troubleshooting-v21.md"
        self.assertTrue(runbook.exists())
        self.assertTrue(troubleshooting.exists())

        result = CommandInventoryService(ROOT).check_inventory(
            inventory_path="docs/release/final-product-docs-command-inventory-v1.md",
            source_paths=[runbook, troubleshooting],
        )

        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["missing_commands"], [])


if __name__ == "__main__":
    unittest.main()
