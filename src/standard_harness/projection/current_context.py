"""Current-context projection with source freshness metadata."""

from __future__ import annotations

import hashlib
import json
from typing import Any
from uuid import uuid4

from standard_harness.domain.packets import PacketService
from standard_harness.state import migrations
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


GENERATOR_VERSION = "mvp-08"
STALE_CONSUMER_BEHAVIOR = "reject_for_authority"


class CurrentContextProjection:
    """Read-only packet context generated from the SQLite state watermark."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def generate(self, *, packet_id: str) -> dict[str, Any]:
        packet = PacketService(self.store).get_packet(packet_id)
        source_watermark = self._latest_source_event_seq()
        generated_at = utc_now_iso()
        projection = {
            "projection_id": f"proj_{uuid4().hex}",
            "projection_type": "current_context",
            "schema_version": migrations.schema_version(),
            "generator_version": GENERATOR_VERSION,
            "generated_at": generated_at,
            "source_event_range": _source_event_range(source_watermark),
            "source_watermark": source_watermark,
            "freshness_status": "fresh",
            "stale_consumer_behavior": STALE_CONSUMER_BEHAVIOR,
            "packet": packet,
        }
        projection["dependency_digest"] = _dependency_digest(projection)
        trace_event = self.store.append_event(
            event_type="projection.generated",
            actor_id="projection",
            actor_role="System",
            authority_basis="current context projection generation",
            idempotency_key=f"projection-{projection['projection_id']}",
            packet_id=packet_id,
            packet_version=int(packet["packet_version"]),
            payload=projection,
        )
        projection["trace_event_id"] = trace_event["event_id"]
        projection["trace_event_seq"] = trace_event["event_seq"]
        with self.store.connection() as conn:
            conn.execute(
                """
                insert into projections (
                  projection_id, projection_type, packet_id, schema_version,
                  generator_version, generated_at, source_event_range,
                  source_watermark, dependency_digest, freshness_status,
                  stale_consumer_behavior, trace_event_id, trace_event_seq,
                  projection_json
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    projection["projection_id"],
                    projection["projection_type"],
                    packet_id,
                    projection["schema_version"],
                    projection["generator_version"],
                    projection["generated_at"],
                    projection["source_event_range"],
                    projection["source_watermark"],
                    projection["dependency_digest"],
                    projection["freshness_status"],
                    projection["stale_consumer_behavior"],
                    projection["trace_event_id"],
                    projection["trace_event_seq"],
                    json.dumps(projection, sort_keys=True),
                ),
            )
            conn.commit()
        return projection

    def freshness(self, projection: dict[str, Any]) -> dict[str, Any]:
        source_watermark = int(projection["source_watermark"])
        latest_event_seq = self._latest_source_event_seq()
        freshness_status = "fresh" if source_watermark == latest_event_seq else "stale"
        return {
            "source_watermark": source_watermark,
            "latest_event_seq": latest_event_seq,
            "freshness_status": freshness_status,
            "stale_consumer_behavior": projection.get(
                "stale_consumer_behavior", STALE_CONSUMER_BEHAVIOR
            ),
        }

    def latest(self, *, packet_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select projection_json from projections
                where packet_id = ? and projection_type = 'current_context'
                order by trace_event_seq desc limit 1
                """,
                (packet_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown current context projection for packet: {packet_id}")
        return json.loads(row["projection_json"])

    def _latest_source_event_seq(self) -> int:
        if not self.store.db_path.exists():
            return 0
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq
                from events
                where event_type != 'projection.generated'
                """
            ).fetchone()
        return int(row["seq"])


def _source_event_range(source_watermark: int) -> str:
    if source_watermark == 0:
        return "0-0"
    return f"1-{source_watermark}"


def _dependency_digest(projection: dict[str, Any]) -> str:
    digest_source = {
        "schema_version": projection["schema_version"],
        "generator_version": projection["generator_version"],
        "source_event_range": projection["source_event_range"],
        "source_watermark": projection["source_watermark"],
        "packet": projection["packet"],
    }
    encoded = json.dumps(digest_source, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
