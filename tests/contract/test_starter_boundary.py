import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


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


if __name__ == "__main__":
    unittest.main()
