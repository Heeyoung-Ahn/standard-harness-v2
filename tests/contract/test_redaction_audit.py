import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RedactionAuditTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_redaction_event_preserves_audit_trace_without_secret_value(self):
        from standard_harness.retention.audit import RedactionAuditService

        with tempfile.TemporaryDirectory() as tmp:
            store = _store(Path(tmp))
            event = RedactionAuditService(store).record_redaction(
                redaction_event_id="redact-001",
                entity_type="evidence",
                entity_id="ev-001",
                field="safe_snippet",
                original_value="OPENAI_API_KEY=sk-proj-secret1234567890",
                redaction_reason="secret-like evidence snippet",
                actor_id="security-reviewer",
                idempotency_key="redact-001",
            )

            self.assertEqual(event["entity_type"], "evidence")
            self.assertEqual(event["entity_id"], "ev-001")
            self.assertEqual(event["field"], "safe_snippet")
            self.assertEqual(event["actor_id"], "security-reviewer")
            self.assertNotIn("sk-proj", str(event))
            with store.connection() as conn:
                row = conn.execute(
                    "select payload_json from events where event_type = 'redaction.recorded'"
                ).fetchone()
            self.assertNotIn("sk-proj", row["payload_json"])


def _store(root: Path):
    from standard_harness.state.store import HarnessStore

    store = HarnessStore(root)
    store.initialize()
    return store


if __name__ == "__main__":
    unittest.main()
