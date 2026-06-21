"""Requirement registration diff records for SSOT extraction review."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class RequirementRegistrationDiffService:
    """Persist reviewable SSOT extraction diffs without promoting requirements."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_diff(
        self,
        *,
        diff_id: str,
        source_doc: str,
        entries: list[dict[str, Any]],
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_diff(diff_id)
        if self._diff_exists(diff_id):
            raise ValueError(f"diff_id already exists: {diff_id}")
        source_watermark = self.store.latest_event_seq()
        record = {
            "diff_id": diff_id,
            "source_doc": source_doc,
            "entries": entries,
            "promotion_state": "proposed",
            "source_event_range": _source_event_range(source_watermark),
            "source_watermark": source_watermark,
            "created_at": utc_now_iso(),
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="ssot.registration_diff_recorded",
                actor_id="ssot",
                actor_role="System",
                authority_basis="ssot extraction diff",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into requirement_registration_diffs (
                  diff_id, source_doc, entries_json, promotion_state,
                  source_event_range, source_watermark, created_at,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    diff_id,
                    source_doc,
                    json.dumps(entries, sort_keys=True),
                    record["promotion_state"],
                    record["source_event_range"],
                    record["source_watermark"],
                    record["created_at"],
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_diff(diff_id)

    def get_diff(self, diff_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from requirement_registration_diffs where diff_id = ?",
                (diff_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown requirement registration diff: {diff_id}")
        result = dict(row)
        result["entries"] = json.loads(result.pop("entries_json"))
        return result

    def transition_diff(
        self,
        *,
        diff_id: str,
        promotion_state: str,
        decision_record_id: str,
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_diff(diff_id)
        if promotion_state not in {"proposed", "approved", "rejected", "superseded"}:
            raise ValueError(f"Invalid promotion_state: {promotion_state}")
        if promotion_state in {"approved", "rejected", "superseded"} and not decision_record_id:
            raise ValueError("decision_record_id is required for diff review decisions")
        record = self.get_diff(diff_id)
        payload = {
            "diff_id": diff_id,
            "from_promotion_state": record["promotion_state"],
            "to_promotion_state": promotion_state,
            "decision_record_id": decision_record_id or None,
            "decision_rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="ssot.registration_diff_transitioned",
                actor_id="ssot-review",
                actor_role="Reviewer",
                authority_basis="ssot registration diff review",
                idempotency_key=idempotency_key,
                payload=payload,
                conn=conn,
            )
            conn.execute(
                """
                update requirement_registration_diffs
                set promotion_state = ?, decision_record_id = ?, decision_rationale = ?
                where diff_id = ?
                """,
                (promotion_state, decision_record_id or None, rationale, diff_id),
            )
        return self.get_diff(diff_id)

    def _diff_exists(self, diff_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from requirement_registration_diffs where diff_id = ?",
                (diff_id,),
            ).fetchone()
        return row is not None


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "1-0"
    return f"1-{source_watermark}"
