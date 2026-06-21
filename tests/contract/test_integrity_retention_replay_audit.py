import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class IntegrityRetentionReplayAuditTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_integrity_retention_and_redaction_events_replay_into_audit_snapshot(self):
        from standard_harness.integrity.signing import SigningService
        from standard_harness.retention.audit import RedactionAuditService
        from standard_harness.retention.policies import RetentionPolicyService
        from standard_harness.state.audit import PointInTimeAudit
        from standard_harness.state.replay import StateReplayService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            _seed_packet(store)
            SigningService(store).sign_event(
                signature_id="sig-001",
                event_seq=1,
                key_id="local-test-key",
                secret="test-secret",
                signer_id="tester",
                idempotency_key="sig-001",
            )
            RetentionPolicyService(store).register_policy(
                retention_policy_id="retention-custom",
                artifact_class="evidence",
                retention_minimum_days=730,
                purge_rule="manual_approval_required",
                archive_rule="immutable_archive",
                regeneration_expectation="not_regenerable",
                approval_required=True,
                idempotency_key="retention-custom",
            )
            RedactionAuditService(store).record_redaction(
                redaction_event_id="redact-001",
                entity_type="evidence",
                entity_id="ev-001",
                field="safe_snippet",
                original_value="OPENAI_API_KEY=sk-proj-secret1234567890",
                redaction_reason="secret-like evidence snippet",
                actor_id="security-reviewer",
                idempotency_key="redact-001",
            )
            source_watermark = store.latest_event_seq()
            with store.transaction() as conn:
                conn.execute("delete from integrity_signatures")
                conn.execute("delete from retention_policies")
                conn.execute("delete from redaction_events")

            replay = StateReplayService(store).rebuild_materialized_state(
                through_event_seq=source_watermark
            )
            snapshot = PointInTimeAudit(store).snapshot_at(event_seq=source_watermark)

            self.assertEqual(replay["status"], "rebuilt")
            with store.connection() as conn:
                self.assertIsNotNone(
                    conn.execute(
                        "select 1 from integrity_signatures where signature_id = ?",
                        ("sig-001",),
                    ).fetchone()
                )
                self.assertIsNotNone(
                    conn.execute(
                        "select 1 from retention_policies where retention_policy_id = ?",
                        ("retention-custom",),
                    ).fetchone()
                )
                self.assertIsNotNone(
                    conn.execute(
                        "select 1 from redaction_events where redaction_event_id = ?",
                        ("redact-001",),
                    ).fetchone()
                )
            self.assertIn("sig-001", snapshot["integrity_signatures"])
            self.assertIn("retention-custom", snapshot["retention_policies"])
            self.assertIn("redact-001", snapshot["redaction_events"])
            self.assertNotIn("sk-proj", str(snapshot["redaction_events"]["redact-001"]))


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


def _seed_packet(store):
    from tests.contract.test_high_integrity_signing import _seed_packet as seed_packet

    seed_packet(store)


if __name__ == "__main__":
    unittest.main()
