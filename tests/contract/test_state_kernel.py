import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
CLI = ROOT / "tools" / "harness_cli.py"


class StateKernelTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_init_creates_isolated_sqlite_store_and_schema_migration(self):
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
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "ok")

            db_path = Path(tmp) / ".harness" / "state" / "harness.sqlite3"
            self.assertTrue(db_path.exists())
            self.assertFalse((ROOT / ".harness" / "state" / "harness.sqlite3").exists())

            with closing(sqlite3.connect(db_path)) as conn:
                migration = conn.execute(
                    "select schema_version, status from schema_migrations"
                ).fetchone()
            self.assertEqual(migration, ("1", "applied"))

    def test_append_event_assigns_sequence_state_version_and_payload_hash(self):
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()

            event = store.append_event(
                event_type="test.event",
                actor_id="tester",
                actor_role="Tester",
                authority_basis="contract-test",
                idempotency_key="same-key",
                payload={"value": 1},
            )

            self.assertEqual(event["event_seq"], 1)
            self.assertEqual(event["state_version_after"], 1)
            self.assertEqual(event["payload_hash_algorithm"], "sha256")
            self.assertEqual(len(event["payload_hash"]), 64)
            self.assertEqual(store.latest_event_seq(), 1)

    def test_idempotency_key_prevents_duplicate_state(self):
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()

            first = store.append_event(
                event_type="test.event",
                actor_id="tester",
                actor_role="Tester",
                authority_basis="contract-test",
                idempotency_key="same-key",
                payload={"value": 1},
            )
            second = store.append_event(
                event_type="test.event",
                actor_id="tester",
                actor_role="Tester",
                authority_basis="contract-test",
                idempotency_key="same-key",
                payload={"value": 1},
            )

            self.assertEqual(second["event_id"], first["event_id"])
            self.assertEqual(store.latest_event_seq(), 1)

    def test_harness_root_can_come_from_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            env = os.environ.copy()
            env["HARNESS_ROOT"] = tmp
            result = subprocess.run(
                [sys.executable, str(CLI), "--json", "init"],
                cwd=ROOT,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(tmp) / ".harness" / "state" / "harness.sqlite3").exists())


if __name__ == "__main__":
    unittest.main()
