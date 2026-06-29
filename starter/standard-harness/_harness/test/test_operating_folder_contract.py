from __future__ import annotations

import json
import os
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
from standard_harness.starter.smoke_workspace import cleanup_starter_smoke_copy
from standard_harness.starter.smoke_workspace import cleanup_stale_smoke_workspaces
from standard_harness.starter.smoke_workspace import create_starter_smoke_copy


def copy_starter(*, smoke_root: Path | None = None) -> Path:
    return create_starter_smoke_copy(STARTER_ROOT, smoke_root=smoke_root)


class OperatingFolderContractTests(unittest.TestCase):
    def copy_starter(self) -> Path:
        root = copy_starter()
        self.addCleanup(cleanup_starter_smoke_copy, root)
        return root

    def test_ops_reset_removes_operating_history_without_touching_harness_or_product(self) -> None:
        root = self.copy_starter()
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
        root = self.copy_starter()
        (root / "_ops" / "packets" / "PKT-OLD.md").write_text("history", encoding="utf-8")
        (root / "_ops" / "evidence" / "result.json").write_text("{}", encoding="utf-8")
        (root / "_ops" / "active-context" / "ACTIVE_CONTEXT.json").write_text("{}", encoding="utf-8")

        diagnostics = StarterContaminationChecker().check_root(root)
        codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("real_packet_history", codes)
        self.assertIn("real_evidence_history", codes)
        self.assertIn("generated_active_context", codes)

    def test_clean_export_validation_rejects_runtime_cache_files(self) -> None:
        root = self.copy_starter()
        cache_dir = root / "_harness" / "system" / "standard_harness" / "__pycache__"
        cache_dir.mkdir(parents=True)
        (cache_dir / "contamination.pyc").write_bytes(b"pyc")
        (root / "product" / "src" / "stray.pyc").write_bytes(b"pyc")

        clean_diagnostics = StarterContaminationChecker().check_root(root, validation_mode="clean-export")
        runtime_diagnostics = StarterContaminationChecker().check_root(root, validation_mode="installed-runtime")

        self.assertIn("cache_files", {diagnostic["error_code"] for diagnostic in clean_diagnostics})
        self.assertNotIn("cache_files", {diagnostic["error_code"] for diagnostic in runtime_diagnostics})

    def test_clean_export_validation_rejects_representative_non_cache_contamination(self) -> None:
        root = self.copy_starter()
        (root / ".harness" / "state").mkdir(parents=True)
        (root / ".harness" / "state" / "operating_state.sqlite3").write_text("", encoding="utf-8")
        (root / ".harness" / "test").mkdir(parents=True)
        (root / ".harness" / "test" / "root-harness-residue.test.js").write_text("test", encoding="utf-8")
        cache_dir = root / "product" / "src" / "__pycache__"
        cache_dir.mkdir(parents=True)
        (cache_dir / "sensitive-evidence.cpython-312.pyc").write_bytes(b"pyc")
        (root / "logs").mkdir()
        (root / "logs" / "validate.log").write_text("log", encoding="utf-8")
        (root / "logs" / "output.txt").write_text("log text", encoding="utf-8")
        (root / "validation-report.json").write_text("{}", encoding="utf-8")
        (root / "VALIDATION_REPORT.json").write_text("{}", encoding="utf-8")
        (root / "product" / "docs" / "packets" / "sensitive-evidence.json").write_text("{}", encoding="utf-8")
        (root / "product" / "docs" / "packets" / "sensitive-evidence.py").write_text("", encoding="utf-8")
        (root / "product" / "docs" / "packets" / "credentials.json").write_text("{}", encoding="utf-8")
        (root / "product" / "docs" / "packets" / "neutral.txt").write_text(
            "token=abcdefghi123456789",
            encoding="utf-8",
        )
        (root / "_harness" / "policies" / "neutral.yaml").write_text(
            "api_key: abcdefghi123456789",
            encoding="utf-8",
        )
        (root / "ROOT_NOTES.md").write_text(
            "Authorization: Bearer abcdefghi123456789",
            encoding="utf-8",
        )
        (root / "ROOT_CONFIG.json").write_text(
            '{"Authorization": "Bearer abcdefghi123456789"}',
            encoding="utf-8",
        )
        (root / "product" / "docs" / "project" / "planning" / "large-secret.txt").write_text(
            ("padding\n" * 9000) + "github_pat_abcdefghijklmnopqrstuvwxyz1234567890",
            encoding="utf-8",
        )
        (root / "product" / "docs" / "project" / "planning" / "oversized-secret.txt").write_text(
            ("padding\n" * 300000) + "github_pat_abcdefghijklmnopqrstuvwxyz1234567890",
            encoding="utf-8",
        )
        (root / "product" / "tests" / "neutral-fixture.txt").write_text(
            '{"api_key": "abcdefghi123456789"}',
            encoding="utf-8",
        )
        (root / "AGENTS.md").write_text("provider-specific", encoding="utf-8")

        diagnostics = StarterContaminationChecker().check_root(root, validation_mode="clean-export")
        codes = {diagnostic["error_code"] for diagnostic in diagnostics}
        by_path = {str(diagnostic["affected_entity_id"]).replace("\\", "/"): diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertIn("development_packet_state", codes)
        self.assertIn("development_artifact", codes)
        self.assertIn("local_logs", codes)
        self.assertIn("generated_validation_report", codes)
        self.assertIn("cache_files", codes)
        self.assertIn("sensitive_evidence", codes)
        self.assertIn("secrets", codes)
        self.assertIn("provider_specific_entry_contract", codes)
        self.assertEqual(
            by_path[(root / "product" / "docs" / "project" / "planning" / "oversized-secret.txt").as_posix()],
            "secrets",
        )
        self.assertEqual(
            by_path[(cache_dir / "sensitive-evidence.cpython-312.pyc").as_posix()],
            "cache_files",
        )

    def test_contamination_classification_uses_starter_relative_paths(self) -> None:
        smoke_parent = Path(tempfile.mkdtemp(prefix="secret-project-logs-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_parent, ignore_errors=True))
        root = copy_starter(smoke_root=smoke_parent)
        self.addCleanup(cleanup_starter_smoke_copy, root, smoke_root=smoke_parent)

        diagnostics = StarterContaminationChecker().check_root(root, validation_mode="clean-export")
        codes = {diagnostic["error_code"] for diagnostic in diagnostics}

        self.assertNotIn("secrets", codes)
        self.assertNotIn("local_logs", codes)

    def test_installed_runtime_mode_tolerates_ops_runtime_records_without_clean_export_proof(self) -> None:
        root = self.copy_starter()
        (root / "_ops" / "packets" / "PKT-RUNTIME.md").write_text("runtime packet", encoding="utf-8")
        (root / "_ops" / "evidence" / "run.json").write_text("{}", encoding="utf-8")
        (root / "_ops" / "active-context" / "ACTIVE_CONTEXT.json").write_text("{}", encoding="utf-8")

        clean_diagnostics = StarterContaminationChecker().check_root(root, validation_mode="clean-export")
        runtime_diagnostics = StarterContaminationChecker().check_root(root, validation_mode="installed-runtime")

        self.assertIn("real_packet_history", {diagnostic["error_code"] for diagnostic in clean_diagnostics})
        self.assertIn("real_evidence_history", {diagnostic["error_code"] for diagnostic in clean_diagnostics})
        self.assertIn("generated_active_context", {diagnostic["error_code"] for diagnostic in clean_diagnostics})
        self.assertNotIn("real_packet_history", {diagnostic["error_code"] for diagnostic in runtime_diagnostics})
        self.assertNotIn("real_evidence_history", {diagnostic["error_code"] for diagnostic in runtime_diagnostics})
        self.assertNotIn("generated_active_context", {diagnostic["error_code"] for diagnostic in runtime_diagnostics})

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
        self.assertIn('"product/docs/pmo/wbs"', policy)
        self.assertIn('"product/docs/pmo/day-wrap-up"', policy)
        required_directories = set(json.loads(policy)["requiredDirectories"])
        self.assertNotIn("product/docs/pmo/source-intake", required_directories)
        self.assertNotIn("product/docs/pmo/daily-reports", required_directories)
        self.assertNotIn("product/docs/pmo/day-start", required_directories)
        self.assertNotIn("product/docs/pmo/status", required_directories)
        self.assertNotIn("product/docs/pmo/risks", required_directories)
        self.assertNotIn("product/docs/pmo/blockers", required_directories)

    def test_cli_ops_reset_reports_reset_folders(self) -> None:
        root = self.copy_starter()
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
        root = self.copy_starter()
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
                "--installed-runtime",
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(validate_result.returncode, 0, validate_result.stderr or validate_result.stdout)
        self.assertIn('"status": "ok"', validate_result.stdout)
        self.assertIn('"validationMode": "installed-runtime"', validate_result.stdout)

    def test_cli_clean_export_validation_blocks_post_init_runtime_state(self) -> None:
        root = self.copy_starter()
        init_result = subprocess.run(
            [
                sys.executable,
                "-B",
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
                "-B",
                str(root / "_harness" / "bin" / "harness_cli.py"),
                "--json",
                "--harness-root",
                str(root),
                "validate",
                "--starter",
                "--clean-export",
            ],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertNotEqual(validate_result.returncode, 0)
        self.assertIn('"validationMode": "clean-export"', validate_result.stdout)
        self.assertIn("development_packet_state", validate_result.stdout)

    def test_smoke_workspace_success_cleanup_is_bounded(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        root = copy_starter(smoke_root=smoke_root)

        cleanup = cleanup_starter_smoke_copy(root, smoke_root=smoke_root)

        self.assertEqual(cleanup["status"], "deleted")
        self.assertFalse(Path(cleanup["path"]).exists())

    def test_smoke_workspace_debug_preserve_cannot_bypass_path_bounds(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        outside = STARTER_ROOT / "product"

        with self.assertRaises(ValueError):
            cleanup_starter_smoke_copy(outside, smoke_root=smoke_root, preserve_success=True)

    def test_smoke_workspace_cleanup_requires_managed_workspace_prefix(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        unrelated = smoke_root / "unrelated"
        unrelated.mkdir()
        target = unrelated / "standard-harness"
        target.mkdir()

        with self.assertRaises(ValueError):
            cleanup_starter_smoke_copy(target, smoke_root=smoke_root)

        self.assertTrue(unrelated.exists())

    def test_stale_smoke_cleanup_ignores_unmanaged_directories(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        unmanaged = smoke_root / "unmanaged"
        unmanaged.mkdir()
        managed = smoke_root / "shv2-starter-old"
        managed.mkdir()

        old_time = 1
        for path in (unmanaged, managed):
            path.touch()
            os.utime(path, (old_time, old_time))

        deleted = cleanup_stale_smoke_workspaces(smoke_root=smoke_root, ttl_seconds=1)

        self.assertIn(str(managed.resolve()), {str(Path(path).resolve()) for path in deleted})
        self.assertFalse(managed.exists())
        self.assertTrue(unmanaged.exists())

    def test_preserved_smoke_workspaces_are_pruned_to_one_managed_copy(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        oldest = smoke_root / "shv2-starter-oldest"
        older = smoke_root / "shv2-starter-older"
        current = smoke_root / "shv2-starter-current"
        for index, path in enumerate((oldest, older, current), start=1):
            path.mkdir()
            os.utime(path, (index, index))
        target = current / "standard-harness"
        target.mkdir()

        cleanup = cleanup_starter_smoke_copy(target, smoke_root=smoke_root, preserve_success=True)

        self.assertEqual(cleanup["status"], "preserved")
        self.assertFalse(oldest.exists())
        self.assertFalse(older.exists())
        self.assertTrue(current.exists())

    def test_preserved_smoke_workspace_never_deletes_reported_workspace(self) -> None:
        smoke_root = Path(tempfile.mkdtemp(prefix="standard-harness-smoke-test-"))
        self.addCleanup(lambda: shutil.rmtree(smoke_root, ignore_errors=True))
        newer = smoke_root / "shv2-starter-newer"
        current = smoke_root / "shv2-starter-current"
        for path in (newer, current):
            path.mkdir()
        os.utime(newer, (10, 10))
        os.utime(current, (1, 1))
        target = current / "standard-harness"
        target.mkdir()

        cleanup = cleanup_starter_smoke_copy(
            target,
            smoke_root=smoke_root,
            preserve_success=True,
            max_failed_diagnostics=0,
        )

        self.assertEqual(cleanup["status"], "preserved")
        self.assertTrue(Path(cleanup["path"]).exists())
        self.assertTrue(current.exists())


if __name__ == "__main__":
    unittest.main()
