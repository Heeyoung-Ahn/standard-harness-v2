import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
INVENTORY_PATH = ROOT / "docs" / "release" / "final-product-docs-command-inventory-v1.md"


class DocsCommandInventoryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_inventory_covers_readme_and_release_report_commands(self):
        from standard_harness.docsops.command_inventory import CommandInventoryService

        service = CommandInventoryService(ROOT)
        report = service.check_inventory(
            inventory_path=INVENTORY_PATH,
            source_paths=_operator_command_sources(),
        )

        self.assertEqual(report["status"], "ready", report["diagnostic_ids"])
        commands = {entry["command"]: entry for entry in report["entries"]}
        self.assertEqual(
            "executable",
            commands["python -m unittest discover -s tests"]["classification"],
        )
        self.assertTrue(
            commands[
                'git tag -a v1.0.0 -m "Standard Harness v2 final product baseline"'
            ]["manual_only_reason"]
        )
        self.assertIn(
            "New-Item -ItemType Directory -Force C:\\tmp\\standard-harness-sample",
            commands,
        )
        self.assertIn(
            "Copy-Item -Recurse starter\\standard-harness\\* C:\\tmp\\standard-harness-sample\\",
            commands,
        )

    def test_stale_command_documentation_blocks_release_until_refreshed_or_waived(self):
        from standard_harness.docsops.command_inventory import CommandInventoryService
        from standard_harness.docsops.freshness import CommandFreshnessGate

        stale_inventory = """# Temporary Command Inventory

| command_id | command | source_path | classification | manual_only_reason | freshness_status | verified_by | waiver_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cmd-stale | python -m unittest discover -s tests | README.md | executable |  | stale | old-run |  |
"""
        waived_inventory = stale_inventory.replace("| stale | old-run |  |", "| stale | old-run | waiver-docs-001 |")

        with tempfile.TemporaryDirectory() as tmp:
            stale_path = Path(tmp) / "stale.md"
            stale_path.write_text(stale_inventory, encoding="utf-8")
            waived_path = Path(tmp) / "waived.md"
            waived_path.write_text(waived_inventory, encoding="utf-8")
            service = CommandInventoryService(ROOT)

            blocked = CommandFreshnessGate().evaluate(service.load_inventory(stale_path))
            waived = CommandFreshnessGate().evaluate(service.load_inventory(waived_path))

        self.assertEqual(blocked["status"], "blocked")
        self.assertIn("stale_command_documentation", blocked["diagnostic_ids"])
        self.assertEqual(waived["status"], "ready")

    def test_manual_commands_require_manual_only_reason(self):
        from standard_harness.docsops.command_inventory import CommandInventoryService

        inventory = """# Temporary Command Inventory

| command_id | command | source_path | classification | manual_only_reason | freshness_status | verified_by | waiver_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cmd-manual | git push origin v1.0.0 | docs/release/final-product-conformance-report-v1.md | manual |  | fresh | human-release |  |
"""

        with tempfile.TemporaryDirectory() as tmp:
            inventory_path = Path(tmp) / "manual.md"
            inventory_path.write_text(inventory, encoding="utf-8")
            report = CommandInventoryService(ROOT).check_inventory(
                inventory_path=inventory_path,
                source_paths=[],
            )

        self.assertEqual(report["status"], "blocked")
        self.assertIn("manual_command_missing_reason", report["diagnostic_ids"])


def _operator_command_sources():
    return (
        [ROOT / "README.md"]
        + sorted((ROOT / "docs" / "release").glob("*.md"))
        + sorted((ROOT / "docs" / "decisions").glob("*.md"))
    )


if __name__ == "__main__":
    unittest.main()
