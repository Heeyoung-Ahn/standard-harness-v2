"""Redaction audit event service."""

from __future__ import annotations

from typing import Any

from standard_harness.state.events import sha256_text
from standard_harness.state.store import HarnessStore


class RedactionAuditService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_redaction(
        self,
        *,
        redaction_event_id: str,
        entity_type: str,
        entity_id: str,
        field: str,
        original_value: str,
        redaction_reason: str,
        actor_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_redaction(redaction_event_id)
        record = {
            "redaction_event_id": redaction_event_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "field": field,
            "redaction_reason": redaction_reason,
            "redacted_hash": sha256_text(original_value),
            "actor_id": actor_id,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="redaction.recorded",
                actor_id=actor_id,
                actor_role="Security Reviewer",
                authority_basis="redaction audit",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into redaction_events (
                  redaction_event_id, entity_type, entity_id, field,
                  redaction_reason, redacted_hash, actor_id, source_watermark,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    redaction_event_id,
                    entity_type,
                    entity_id,
                    field,
                    redaction_reason,
                    record["redacted_hash"],
                    actor_id,
                    record["source_watermark"],
                    trace["event_id"],
                    trace["event_seq"],
                ),
            )
        return self.get_redaction(redaction_event_id)

    def get_redaction(self, redaction_event_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from redaction_events where redaction_event_id = ?",
                (redaction_event_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown redaction event: {redaction_event_id}")
        return dict(row)
