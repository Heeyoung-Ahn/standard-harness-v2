"""Recovery protocol for materialized state rebuilt from the event log."""

from __future__ import annotations

import json
from uuid import uuid4

from standard_harness.state.events import canonical_json, sha256_text, utc_now_iso
from standard_harness.state.replay import StateReplayService
from standard_harness.state.store import HarnessStore


class RecoveryService:
    """Detect and recover materialized-state drift using replay."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def recover_materialized_state(self, *, reason: str) -> dict[str, object]:
        self.store.initialize()
        source_watermark = self._latest_recoverable_event_seq()
        recovery_id = f"rec_{uuid4().hex}"
        started = self.store.append_event(
            event_type="recovery_started",
            actor_id="recovery",
            actor_role="System",
            authority_basis="state recovery protocol",
            idempotency_key=f"recovery-started-{recovery_id}",
            payload={
                "recovery_id": recovery_id,
                "reason": reason,
                "source_event_range": _source_event_range(source_watermark),
                "source_watermark": source_watermark,
            },
        )

        replay_report = StateReplayService(self.store).rebuild_materialized_state(
            through_event_seq=source_watermark
        )
        diagnostic_ids = [
            f"unknown_event_type:{event_type}"
            for event_type in replay_report.get("unknown_event_types", [])
        ]
        recovery_status = "rebuilt" if replay_report["status"] == "rebuilt" else "blocked"
        projection_checksum = sha256_text(
            canonical_json(
                {
                    "recovery_id": recovery_id,
                    "source_event_range": replay_report["source_event_range"],
                    "rebuilt_tables": replay_report["rebuilt_tables"],
                    "diagnostic_ids": diagnostic_ids,
                }
            )
        )
        payload = {
            "recovery_id": recovery_id,
            "reason": reason,
            "source_event_range": replay_report["source_event_range"],
            "source_watermark": replay_report["source_watermark"],
            "recovery_status": recovery_status,
            "projection_checksum": projection_checksum,
            "rebuilt_tables": replay_report["rebuilt_tables"],
            "diagnostic_ids": diagnostic_ids,
        }
        with self.store.transaction() as conn:
            completed = self.store.append_event(
                event_type="projection_rebuilt"
                if recovery_status == "rebuilt"
                else "recovery_blocked",
                actor_id="recovery",
                actor_role="System",
                authority_basis="state recovery protocol",
                idempotency_key=f"recovery-completed-{recovery_id}",
                payload=payload,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into recovery_runs (
                  recovery_id, reason, source_event_range, source_watermark,
                  recovery_status, projection_checksum, rebuilt_tables_json,
                  diagnostic_ids_json, started_event_id, completed_event_id,
                  recorded_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    recovery_id,
                    reason,
                    payload["source_event_range"],
                    payload["source_watermark"],
                    recovery_status,
                    projection_checksum,
                    json.dumps(payload["rebuilt_tables"], sort_keys=True),
                    json.dumps(diagnostic_ids, sort_keys=True),
                    started["event_id"],
                    completed["event_id"],
                    utc_now_iso(),
                ),
            )
        return payload

    def _latest_recoverable_event_seq(self) -> int:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type not like 'recovery.%'
                  and event_type not like 'audit.%'
                  and event_type not like 'backup.%'
                  and event_type not like 'restore.%'
                  and event_type not in (
                    'recovery_started', 'projection_rebuilt', 'recovery_blocked',
                    'audit_snapshot_created', 'backup_created', 'restore_verified'
                  )
                """
            ).fetchone()
        return int(row["seq"])


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "0-0"
    return f"1-{source_watermark}"
