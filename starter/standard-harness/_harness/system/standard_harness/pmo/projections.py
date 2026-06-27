"""PMO read projection."""

from __future__ import annotations

import json
from collections import Counter
from typing import Any
from uuid import uuid4

from standard_harness.state.store import HarnessStore


class PmoProjectionService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def preview_projection(self) -> dict[str, Any]:
        source_watermark = self._latest_source_event_seq()
        return self._build_projection(
            pmo_projection_id=f"pmo-preview-{uuid4().hex}",
            source_watermark=source_watermark,
            persisted=False,
        )

    def generate_projection(
        self,
        *,
        pmo_projection_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_projection(pmo_projection_id)
        source_watermark = self._latest_source_event_seq()
        projection = self._build_projection(
            pmo_projection_id=pmo_projection_id,
            source_watermark=source_watermark,
            persisted=True,
        )
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="pmo.projection_generated",
                actor_id="pmo",
                actor_role="System",
                authority_basis="pmo read projection",
                idempotency_key=idempotency_key,
                payload=projection,
                conn=conn,
            )
            conn.execute(
                """
                insert into pmo_projections (
                  pmo_projection_id, source_event_range, source_watermark,
                  packet_counts_json, blocked_packets_json, open_risks_json,
                  milestone_summary_json, projection_summary_json, dependency_summary_json,
                  diagnostic_summary_json, freshness_status, trace_event_id,
                  trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _projection_row_values(projection, event),
            )
        return self.get_projection(pmo_projection_id)

    def get_projection(self, pmo_projection_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from pmo_projections where pmo_projection_id = ?",
                (pmo_projection_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown PMO projection: {pmo_projection_id}")
        return _projection_from_row(dict(row))

    def _latest_source_event_seq(self) -> int:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type != 'projection.generated'
                """
            ).fetchone()
        return int(row["seq"])

    def _build_projection(
        self, *, pmo_projection_id: str, source_watermark: int, persisted: bool
    ) -> dict[str, Any]:
        with self.store.connection() as conn:
            packets = conn.execute("select * from packets order by packet_id").fetchall()
            dependencies = conn.execute("select * from dependencies").fetchall()
            diagnostics = conn.execute("select * from diagnostics").fetchall()
            projections = conn.execute(
                """
                select projection_type, projection_id, freshness_status, source_watermark,
                       trace_event_seq
                from projections
                order by trace_event_seq
                """
            ).fetchall()
            events = conn.execute(
                "select event_type from events order by event_seq",
            ).fetchall()
        packet_counts = Counter(row["lifecycle_state"] for row in packets)
        blocked_packets = [
            row["packet_id"] for row in packets if row["lifecycle_state"] == "blocked"
        ]
        open_risks = [
            {"packet_id": row["packet_id"], "risk_class": row["risk_class"]}
            for row in packets
            if row["risk_class"] in {"high", "critical"} or row["lifecycle_state"] == "blocked"
        ]
        dependency_status = Counter(row["intake_status"] for row in dependencies)
        diagnostic_summary = Counter(row["severity"] for row in diagnostics)
        event_types = sorted({row["event_type"] for row in events})
        return {
            "pmo_projection_id": pmo_projection_id,
            "source_event_range": "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            "source_watermark": source_watermark,
            "packet_counts": dict(packet_counts),
            "blocked_packets": blocked_packets,
            "open_risks": open_risks,
            "milestone_summary": {
                "total_packets": len(packets),
                "closed_packets": packet_counts.get("closed", 0),
            },
            "projection_summary": _projection_summary(projections, source_watermark),
            "dependency_summary": {
                "counts": dict(dependency_status),
                "event_types": event_types,
            },
            "diagnostic_summary": dict(diagnostic_summary),
            "freshness_status": "fresh",
            "persisted": persisted,
        }


def _projection_row_values(projection: dict[str, Any], event: dict[str, Any]) -> tuple[Any, ...]:
    return (
        projection["pmo_projection_id"],
        projection["source_event_range"],
        projection["source_watermark"],
        json.dumps(projection["packet_counts"], sort_keys=True),
        json.dumps(projection["blocked_packets"], sort_keys=True),
        json.dumps(projection["open_risks"], sort_keys=True),
        json.dumps(projection["milestone_summary"], sort_keys=True),
        json.dumps(projection["projection_summary"], sort_keys=True),
        json.dumps(projection["dependency_summary"], sort_keys=True),
        json.dumps(projection["diagnostic_summary"], sort_keys=True),
        projection["freshness_status"],
        event["event_id"],
        event["event_seq"],
    )


def _projection_from_row(row: dict[str, Any]) -> dict[str, Any]:
    for key in (
        "packet_counts",
        "blocked_packets",
        "open_risks",
        "milestone_summary",
        "projection_summary",
        "dependency_summary",
        "diagnostic_summary",
    ):
        row[key] = json.loads(row.pop(f"{key}_json"))
    return row


def _projection_summary(rows, latest_source_watermark: int) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for row in rows:
        projection_type = row["projection_type"]
        freshness_status = (
            "fresh"
            if int(row["source_watermark"]) == int(latest_source_watermark)
            else "stale"
        )
        summary[projection_type] = {
            "latest_projection_id": row["projection_id"],
            "freshness_status": freshness_status,
            "source_watermark": row["source_watermark"],
            "trace_event_seq": row["trace_event_seq"],
        }
    return summary
