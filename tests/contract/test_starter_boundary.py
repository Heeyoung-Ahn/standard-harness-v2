import sys
import tempfile
import unittest
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class StarterBoundaryTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_starter_manifest_entry_is_event_backed(self):
        from standard_harness.starter.manifest import StarterManifestService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            entry = StarterManifestService(store).register_entry(
                path="starter/standard-harness/START_HERE.md",
                artifact_type="onboarding-doc",
                owner="standard-harness",
                included_in_payload=True,
                generated=False,
                managed_template=False,
                promotion_source="docs/implementation/standard-harness-implementation-plan-v1.md",
                validation_evidence=["starter-boundary-contract"],
                idempotency_key="starter-entry-start-here",
            )

            self.assertEqual(entry["path"], "starter/standard-harness/START_HERE.md")
            self.assertEqual(entry["validation_evidence"], ["starter-boundary-contract"])
            with store.connection() as conn:
                row = conn.execute(
                    "select * from starter_manifest_entries where path = ?",
                    ("starter/standard-harness/START_HERE.md",),
                ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(store.latest_event_seq(), 1)

    def test_starter_manifest_duplicate_path_does_not_append_untraced_event(self):
        from standard_harness.starter.manifest import StarterManifestService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            service = StarterManifestService(store)
            service.register_entry(
                path="starter/standard-harness/START_HERE.md",
                artifact_type="onboarding-doc",
                owner="standard-harness",
                included_in_payload=True,
                generated=False,
                managed_template=False,
                promotion_source="docs/implementation/standard-harness-implementation-plan-v1.md",
                validation_evidence=["starter-boundary-contract"],
                idempotency_key="starter-entry-start-here",
            )

            with self.assertRaises(ValueError):
                service.register_entry(
                    path="starter/standard-harness/START_HERE.md",
                    artifact_type="onboarding-doc",
                    owner="standard-harness",
                    included_in_payload=True,
                    generated=False,
                    managed_template=False,
                    promotion_source="docs/implementation/another-plan.md",
                    validation_evidence=["duplicate"],
                    idempotency_key="starter-entry-start-here-duplicate",
                )

            self.assertEqual(store.latest_event_seq(), 1)

    def test_contamination_check_rejects_development_artifacts(self):
        from standard_harness.starter.contamination import StarterContaminationChecker

        diagnostics = StarterContaminationChecker().check_paths(
            [
                "starter/standard-harness/.harness/state/harness.sqlite3",
                "starter/standard-harness/logs/run.log",
                "starter/standard-harness/.env",
                "starter/standard-harness/.pytest_cache/cache",
                "starter/standard-harness/external-review-attachments/pasted-text.txt",
                "starter/standard-harness/generated-validation-report.json",
            ]
        )

        self.assertEqual(len(diagnostics), 6)
        self.assertIn("development_packet_state", {item["error_code"] for item in diagnostics})
        self.assertIn("secrets", {item["error_code"] for item in diagnostics})
        self.assertEqual(StarterContaminationChecker().check_paths(["starter/standard-harness/START_HERE.md"]), [])

    def test_starter_entry_documents_exist(self):
        readme = ROOT / "starter" / "standard-harness" / "README.md"
        start_here = ROOT / "starter" / "standard-harness" / "START_HERE.md"

        self.assertTrue(readme.exists())
        self.assertTrue(start_here.exists())
        self.assertIn("clean starter payload", readme.read_text(encoding="utf-8"))
        self.assertIn("first low-risk packet", start_here.read_text(encoding="utf-8"))

    def test_contamination_check_scans_root_and_requires_starter_docs(self):
        from standard_harness.starter.contamination import StarterContaminationChecker

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "README.md").write_text("starter readme", encoding="utf-8")
            (root / "START_HERE.md").write_text("start here", encoding="utf-8")
            (root / ".harness" / "state").mkdir(parents=True)
            (root / ".harness" / "state" / "harness.sqlite3").write_text("db", encoding="utf-8")

            diagnostics = StarterContaminationChecker().check_root(root)

            self.assertIn(
                "development_packet_state",
                {diagnostic["error_code"] for diagnostic in diagnostics},
            )

        with tempfile.TemporaryDirectory() as tmp:
            diagnostics = StarterContaminationChecker().check_root(Path(tmp))

            self.assertIn(
                "missing_starter_readme",
                {diagnostic["error_code"] for diagnostic in diagnostics},
            )
            self.assertIn(
                "missing_starter_start_here",
                {diagnostic["error_code"] for diagnostic in diagnostics},
            )

    def test_cli_starter_check_root_scans_actual_filesystem(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "README.md").write_text("starter readme", encoding="utf-8")
            (root / "START_HERE.md").write_text("start here", encoding="utf-8")
            (root / "__pycache__").mkdir()
            (root / "__pycache__" / "module.pyc").write_text("cache", encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(CLI),
                    "--json",
                    "--harness-root",
                    tmp,
                    "starter-check",
                    "--root",
                    str(root),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ok")
            starter = payload["starter"]
            self.assertEqual(starter["status"], "blocked")
            self.assertIn(
                "cache_files",
                {diagnostic["error_code"] for diagnostic in starter["diagnostics"]},
            )


if __name__ == "__main__":
    unittest.main()
