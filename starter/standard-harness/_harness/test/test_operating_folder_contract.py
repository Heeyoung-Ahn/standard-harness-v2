from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.operating_folders import OperatingFolderInitializer
from standard_harness.starter.contamination import StarterContaminationChecker


def copy_starter() -> Path:
    temp_root = Path(tempfile.mkdtemp(prefix="shv2-pkt01-"))
    target = temp_root / "standard-harness"
    ignore = shutil.ignore_patterns("__pycache__", ".pytest_cache", ".harness")
    shutil.copytree(STARTER_ROOT, target, ignore=ignore)
    return target


class OperatingFolderContractTests(unittest.TestCase):
    def test_ops_reset_removes_operating_history_without_touching_harness_or_product(self) -> None:
        root = copy_starter()
        harness_marker = root / "_harness" / "policies" / "custom-policy.txt"
        product_marker = root / "product" / "src" / "app.txt"
        packet_history = root / "_ops" / "packets" / "PKT-OLD.md"
        evidence_history = root / "_ops" / "evidence" / "run.log"

        harness_marker.write_text("preserve harness", encoding="utf-8")
        product_marker.write_text("preserve product", encoding="utf-8")
        packet_history.write_text("old packet", encoding="utf-8")
        evidence_history.write_text("old evidence", encoding="utf-8")

        result = OperatingFolderInitializer(root).reset_ops()

        self.assertEqual(result["status"], "ok")
        self.assertTrue(harness_marker.exists())
        self.assertTrue(product_marker.exists())
        self.assertFalse(packet_history.exists())
        self.assertFalse(evidence_history.exists())
        self.assertTrue((root / "_ops" / "packets").is_dir())
        self.assertTrue((root / "_ops" / "active-context").is_dir())
        self.assertTrue((root / "product" / "docs" / "project" / "planning").is_dir())

    def test_starter_contamination_rejects_real_ops_history_and_generated_context(self) -> None:
        root = copy_starter()
        (root / "_ops" / "packets" / "PKT-OLD.md").write_text("history", encoding="utf-8")
        (root / "_ops" / "evidence" / "result.json").write_text("{}", encoding="utf-8")
        (root / "_ops" / "active-context" / "ACTIVE_CONTEXT.json").write_text("{}", encoding="utf-8")

        diagnostics = StarterContaminationChecker().check_root(root)
        codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("real_packet_history", codes)
        self.assertIn("real_evidence_history", codes)
        self.assertIn("generated_active_context", codes)

    def test_clean_starter_policy_declares_tsv_pmo_and_required_human_doc_folders(self) -> None:
        policy = (STARTER_ROOT / "_harness" / "policies" / "project-operating-folders.yaml").read_text(
            encoding="utf-8"
        )

        self.assertIn('"pmoTableFormat": ".tsv"', policy)
        self.assertIn('"product/docs/project/planning"', policy)
        self.assertIn('"product/docs/project/architecture"', policy)
        self.assertIn('"product/docs/project/implementation"', policy)
        self.assertIn('"product/docs/project/api"', policy)
        self.assertIn('"product/docs/project/database"', policy)
        self.assertIn('"product/docs/project/ui-design"', policy)
        self.assertIn('"product/docs/packets"', policy)
        self.assertIn('"product/docs/pmo"', policy)

    def test_cli_ops_reset_reports_reset_folders(self) -> None:
        root = copy_starter()
        history = root / "_ops" / "packets" / "PKT-OLD.md"
        history.write_text("old packet", encoding="utf-8")

        result = subprocess.run(
            [
                sys.executable,
                str(root / "_harness" / "bin" / "harness_cli.py"),
                "--json",
                "--harness-root",
                str(root),
                "ops-reset",
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        self.assertFalse(history.exists())
        self.assertIn('"reset_folders"', result.stdout)

    def test_init_then_validate_starter_allows_post_init_runtime_state(self) -> None:
        root = copy_starter()
        init_result = subprocess.run(
            [
                sys.executable,
                str(root / "_harness" / "bin" / "harness_cli.py"),
                "--json",
                "--harness-root",
                str(root),
                "init",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(init_result.returncode, 0, init_result.stderr or init_result.stdout)

        validate_result = subprocess.run(
            [
                sys.executable,
                str(root / "_harness" / "bin" / "harness_cli.py"),
                "--json",
                "--harness-root",
                str(root),
                "validate",
                "--starter",
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(validate_result.returncode, 0, validate_result.stderr or validate_result.stdout)
        self.assertIn('"status": "ok"', validate_result.stdout)


if __name__ == "__main__":
    unittest.main()
