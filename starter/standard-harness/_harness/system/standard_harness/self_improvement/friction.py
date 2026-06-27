"""Friction capture for harness self-improvement."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class FrictionService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_friction(
        self,
        *,
        friction_record_id: str,
        friction_type: str,
        owner: str,
        evidence_ids: list[str],
        occurrence_count: int,
        source: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_friction(friction_record_id)
        record = {
            "friction_record_id": friction_record_id,
            "friction_type": friction_type,
            "owner": owner,
            "evidence_ids": evidence_ids,
            "occurrence_count": occurrence_count,
            "status": "recorded",
            "source": source,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="friction_recorded",
                actor_id="self-improvement",
                actor_role="System",
                authority_basis="friction capture",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into friction_records (
                  friction_record_id, friction_type, owner, evidence_ids_json,
                  occurrence_count, status, source, source_watermark,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    friction_record_id,
                    friction_type,
                    owner,
                    json.dumps(evidence_ids, sort_keys=True),
                    occurrence_count,
                    record["status"],
                    source,
                    record["source_watermark"],
                    trace["event_id"],
                    trace["event_seq"],
                ),
            )
        return self.get_friction(friction_record_id)

    def get_friction(self, friction_record_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from friction_records where friction_record_id = ?",
                (friction_record_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown friction record: {friction_record_id}")
        return _friction_from_row(dict(row))


def _friction_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["evidence_ids"] = json.loads(row.pop("evidence_ids_json"))
    return row

