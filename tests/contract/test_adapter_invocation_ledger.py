import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class AdapterInvocationLedgerTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_records_invocation_with_required_ledger_fields(self):
        from standard_harness.adapters.invocation import AdapterInvocationLedger
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            ledger = AdapterInvocationLedger(store)

            record = ledger.record_invocation(
                adapter_run_id="run-001",
                adapter_id="browser",
                adapter_version="1",
                input_snapshot_hash="sha256:input",
                permission_roots=["C:/tmp/harness"],
                artifact_manifest=[
                    {"path": "C:/tmp/harness/evidence/out.txt", "content_hash": "sha256:out"}
                ],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "local",
                    "result_status": "passed",
                    "evidence_id": "ev-001",
                },
                timeout_seconds=30,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-run-001",
            )

            self.assertEqual(record["adapter_run_id"], "run-001")
            self.assertEqual(record["adapter_id"], "browser")
            self.assertEqual(record["permission_roots"], ["C:/tmp/harness"])
            self.assertEqual(record["event_request"], {"event_type": "evidence.registered"})
            self.assertEqual(record["cancel_status"], "not_cancelled")
            self.assertEqual(record["idempotency_key"], "adapter-run-001")
            self.assertEqual(record["source_event_range"], "1-0")
            with store.connection() as conn:
                event = conn.execute(
                    "select event_type from events where event_seq = 1"
                ).fetchone()
            self.assertEqual(event["event_type"], "adapter.invocation_recorded")

    def test_invocation_is_idempotent_duplicate_safe_replayable_and_auditable(self):
        from standard_harness.adapters.invocation import AdapterInvocationLedger
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            ledger = AdapterInvocationLedger(store)
            ledger.record_invocation(
                adapter_run_id="run-001",
                adapter_id="browser",
                adapter_version="1",
                input_snapshot_hash="sha256:input",
                permission_roots=["C:/tmp/harness"],
                artifact_manifest=[],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "local",
                    "result_status": "passed",
                    "evidence_id": "ev-001",
                },
                timeout_seconds=30,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-run-001",
            )
            repeated = ledger.record_invocation(
                adapter_run_id="ignored-run",
                adapter_id="browser",
                adapter_version="1",
                input_snapshot_hash="sha256:different",
                permission_roots=["C:/tmp/harness"],
                artifact_manifest=[],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "local",
                    "result_status": "passed",
                    "evidence_id": "ev-001",
                },
                timeout_seconds=30,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-run-001",
            )
            event_seq = store.latest_event_seq()
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=event_seq)

            with self.assertRaises(ValueError):
                ledger.record_invocation(
                    adapter_run_id="run-001",
                    adapter_id="browser",
                    adapter_version="1",
                    input_snapshot_hash="sha256:input",
                    permission_roots=["C:/tmp/harness"],
                    artifact_manifest=[],
                    event_request={"event_type": "evidence.registered"},
                    failure_classification=None,
                    evidence_provenance={
                        "execution_mode": "local",
                        "result_status": "passed",
                        "evidence_id": "ev-001",
                    },
                    timeout_seconds=30,
                    retry_count=0,
                    cancel_status="not_cancelled",
                    idempotency_key="adapter-run-001-duplicate",
                )

            with store.connection() as conn:
                conn.execute("delete from adapter_invocations")
                conn.commit()
            replay = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=event_seq
            )
            replayed = ledger.get_invocation("run-001")

            self.assertEqual(repeated["adapter_run_id"], "run-001")
            self.assertEqual(store.latest_event_seq(), event_seq + 1)
            self.assertEqual(replay["status"], "rebuilt")
            self.assertEqual(replayed["input_snapshot_hash"], "sha256:input")
            self.assertEqual(
                snapshot["adapter_invocations"]["run-001"]["idempotency_key"],
                "adapter-run-001",
            )
            self.assertEqual(
                snapshot["adapter_invocations"]["run-001"]["adapter_id"],
                "browser",
            )

    def test_duplicate_adapter_run_id_is_rejected_even_when_materialized_row_drifted(self):
        from standard_harness.adapters.invocation import AdapterInvocationLedger
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            ledger = AdapterInvocationLedger(store)
            ledger.record_invocation(
                adapter_run_id="run-001",
                adapter_id="browser",
                adapter_version="1",
                input_snapshot_hash="sha256:input",
                permission_roots=["C:/tmp/harness"],
                artifact_manifest=[],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "local",
                    "result_status": "passed",
                    "evidence_id": "ev-001",
                },
                timeout_seconds=30,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-run-001",
            )
            with store.connection() as conn:
                conn.execute("delete from adapter_invocations")
                conn.commit()
            event_seq = store.latest_event_seq()

            repeated = ledger.record_invocation(
                adapter_run_id="ignored-run",
                adapter_id="browser",
                adapter_version="1",
                input_snapshot_hash="sha256:different",
                permission_roots=["C:/tmp/harness"],
                artifact_manifest=[],
                event_request={"event_type": "evidence.registered"},
                failure_classification=None,
                evidence_provenance={
                    "execution_mode": "local",
                    "result_status": "passed",
                    "evidence_id": "ev-001",
                },
                timeout_seconds=30,
                retry_count=0,
                cancel_status="not_cancelled",
                idempotency_key="adapter-run-001",
            )

            with self.assertRaises(ValueError):
                ledger.record_invocation(
                    adapter_run_id="run-001",
                    adapter_id="browser",
                    adapter_version="2",
                    input_snapshot_hash="sha256:new",
                    permission_roots=["C:/tmp/harness"],
                    artifact_manifest=[],
                    event_request={"event_type": "evidence.registered"},
                    failure_classification=None,
                    evidence_provenance={
                        "execution_mode": "local",
                        "result_status": "passed",
                        "evidence_id": "ev-002",
                    },
                    timeout_seconds=30,
                    retry_count=0,
                    cancel_status="not_cancelled",
                    idempotency_key="adapter-run-001-duplicate",
                )

            self.assertEqual(repeated["adapter_run_id"], "run-001")
            self.assertEqual(repeated["idempotency_key"], "adapter-run-001")
            self.assertEqual(store.latest_event_seq(), event_seq)

    def test_failed_ledger_materialization_rolls_back_event(self):
        from standard_harness.adapters.invocation import AdapterInvocationLedger
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            with store.connection() as conn:
                conn.execute(
                    """
                    create trigger abort_adapter_invocations
                    before insert on adapter_invocations
                    begin
                      select raise(abort, 'blocked adapter invocation insert');
                    end
                    """
                )
                conn.commit()
            before_event_seq = store.latest_event_seq()

            with self.assertRaises(Exception):
                AdapterInvocationLedger(store).record_invocation(
                    adapter_run_id="run-001",
                    adapter_id="browser",
                    adapter_version="1",
                    input_snapshot_hash="sha256:input",
                    permission_roots=["C:/tmp/harness"],
                    artifact_manifest=[],
                    event_request={"event_type": "evidence.registered"},
                    failure_classification=None,
                    evidence_provenance={
                        "execution_mode": "local",
                        "result_status": "passed",
                        "evidence_id": "ev-001",
                    },
                    timeout_seconds=30,
                    retry_count=0,
                    cancel_status="not_cancelled",
                    idempotency_key="adapter-run-001",
                )

            self.assertEqual(store.latest_event_seq(), before_event_seq)


if __name__ == "__main__":
    unittest.main()
