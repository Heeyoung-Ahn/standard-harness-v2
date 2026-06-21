"""Operational memory derived from canonical events."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


MEMORY_EVENT_TYPES = {"operational_memory.generated", "human_control.snapshot_generated"}


class OperationalMemoryService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def generate_snapshot(
        self,
        *,
        memory_snapshot_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_snapshot(memory_snapshot_id)
        source_watermark = self._latest_source_event_seq()
        snapshot = {
            "memory_snapshot_id": memory_snapshot_id,
            "source": "canonical_events",
            "source_event_range": "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            "source_watermark": source_watermark,
            "entries": self.preview_entries(),
            "freshness_status": "fresh",
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="operational_memory.generated",
                actor_id="memory",
                actor_role="System",
                authority_basis="operational memory projection",
                idempotency_key=idempotency_key,
                payload=snapshot,
                conn=conn,
            )
            conn.execute(
                """
                insert into operational_memory_snapshots (
                  memory_snapshot_id, source, source_event_range, source_watermark,
                  entries_json, freshness_status, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    memory_snapshot_id,
                    snapshot["source"],
                    snapshot["source_event_range"],
                    snapshot["source_watermark"],
                    json.dumps(snapshot["entries"], sort_keys=True),
                    snapshot["freshness_status"],
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_snapshot(memory_snapshot_id)

    def preview_entries(self, *, packet_id: str | None = None) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            if packet_id is None:
                rows = conn.execute(
                    """
                    select event_seq, event_type, packet_id, payload_json
                    from events
                    where event_type not in ('operational_memory.generated', 'human_control.snapshot_generated')
                    order by event_seq
                    """
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    select event_seq, event_type, packet_id, payload_json
                    from events
                    where packet_id = ?
                      and event_type not in ('operational_memory.generated', 'human_control.snapshot_generated')
                    order by event_seq
                    """,
                    (packet_id,),
                ).fetchall()
        return [_entry_from_event(row) for row in rows]

    def get_snapshot(self, memory_snapshot_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from operational_memory_snapshots where memory_snapshot_id = ?",
                (memory_snapshot_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown memory snapshot: {memory_snapshot_id}")
        result = dict(row)
        result["entries"] = json.loads(result.pop("entries_json"))
        return result

    def freshness(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        latest = self._latest_source_event_seq()
        status = "fresh" if int(snapshot["source_watermark"]) == latest else "stale"
        return {
            "freshness_status": status,
            "source_watermark": int(snapshot["source_watermark"]),
            "latest_event_seq": latest,
            "consumer_behavior": "accept" if status == "fresh" else "reject",
        }

    def _latest_source_event_seq(self) -> int:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq from events
                where event_type not in ('operational_memory.generated', 'human_control.snapshot_generated')
                """
            ).fetchone()
        return int(row["seq"])


def _entry_from_event(row) -> dict[str, Any]:
    event_type = row["event_type"]
    entry_type = "observation"
    if event_type in {"packet.created", "packet.approved", "closeout.decided"}:
        entry_type = "decision"
    elif "risk" in event_type:
        entry_type = "risk"
    elif event_type in {"challenge_opened", "adjudication_recorded"}:
        entry_type = "follow-up"
    payload = json.loads(row["payload_json"])
    return {
        "entry_id": f"mem-{row['event_seq']}",
        "entry_type": entry_type,
        "source_event_seq": row["event_seq"],
        "source_event_type": event_type,
        "packet_id": row["packet_id"],
        "summary": _summary(event_type, payload),
    }


def _summary(event_type: str, payload: dict[str, Any]) -> str:
    for key in ("title", "rationale", "objective", "status"):
        if key in payload and payload[key]:
            return f"{event_type}: {payload[key]}"
    return event_type

