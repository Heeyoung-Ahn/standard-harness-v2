"""Immutable review bundle snapshots."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore


class ReviewBundleService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def create_bundle(
        self,
        *,
        review_bundle_id: str,
        packet_id: str,
        adapter_model_identity: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return self.get_bundle(existing["payload"]["review_bundle_id"])
        if self._exists(review_bundle_id):
            raise ValueError(f"review_bundle_id already exists: {review_bundle_id}")
        packet = PacketService(self.store).get_packet(packet_id)
        source_watermark = self.store.latest_event_seq()
        record = {
            "review_bundle_id": review_bundle_id,
            "packet_id": packet_id,
            "packet_version": packet["packet_version"],
            "requirement_snapshot": self._requirements(packet_id),
            "acceptance_criteria_snapshot": self._acceptance_criteria(packet_id),
            "evidence_manifest_snapshot": self._evidence(packet_id),
            "adapter_model_identity": adapter_model_identity,
            "source_watermark": source_watermark,
            "freshness_status": "fresh",
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="review_bundle.created",
                actor_id="review",
                actor_role="System",
                authority_basis="immutable review bundle",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=int(packet["packet_version"]),
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into review_bundles (
                  review_bundle_id, packet_id, packet_version,
                  requirement_snapshot_json, acceptance_criteria_snapshot_json,
                  evidence_manifest_snapshot_json, adapter_model_identity,
                  source_watermark, freshness_status, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _bundle_values(record, event["event_id"], event["event_seq"]),
            )
        return self.get_bundle(review_bundle_id)

    def get_bundle(self, review_bundle_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from review_bundles where review_bundle_id = ?",
                (review_bundle_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown review bundle: {review_bundle_id}")
        result = dict(row)
        result["requirement_snapshot"] = json.loads(result.pop("requirement_snapshot_json"))
        result["acceptance_criteria_snapshot"] = json.loads(
            result.pop("acceptance_criteria_snapshot_json")
        )
        result["evidence_manifest_snapshot"] = json.loads(
            result.pop("evidence_manifest_snapshot_json")
        )
        return result

    def is_fresh(self, review_bundle_id: str, *, latest_source_watermark: int) -> bool:
        return int(self.get_bundle(review_bundle_id)["source_watermark"]) >= int(
            latest_source_watermark
        )

    def _requirements(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from requirements where packet_id = ? order by requirement_id",
                (packet_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def _acceptance_criteria(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from acceptance_criteria
                where packet_id = ? order by acceptance_criterion_id
                """,
                (packet_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def _evidence(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select * from evidence where packet_id = ? order by evidence_id",
                (packet_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def _exists(self, review_bundle_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from review_bundles where review_bundle_id = ?",
                (review_bundle_id,),
            ).fetchone()
        return row is not None


def _bundle_values(record: dict[str, Any], event_id: str, event_seq: int) -> tuple[Any, ...]:
    return (
        record["review_bundle_id"],
        record["packet_id"],
        record["packet_version"],
        json.dumps(record["requirement_snapshot"], sort_keys=True),
        json.dumps(record["acceptance_criteria_snapshot"], sort_keys=True),
        json.dumps(record["evidence_manifest_snapshot"], sort_keys=True),
        record["adapter_model_identity"],
        record["source_watermark"],
        record["freshness_status"],
        event_id,
        event_seq,
    )

