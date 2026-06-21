"""Persist SSOT semantic change impact analysis records."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.diff.semantic import CHANGE_CLASSES, HUMAN_REVIEW_CLASSES
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class ImpactAnalysisService:
    """Record affected harness entities for a classified SSOT change."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_impact(
        self,
        *,
        impact_id: str,
        requirement_id: str,
        change_class: str,
        impacted_packet_ids: list[str],
        impacted_claim_ids: list[str],
        impacted_evidence_ids: list[str],
        impacted_projection_ids: list[str],
        idempotency_key: str,
        impacted_gate_ids: list[str] | None = None,
        impacted_acceptance_criterion_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        existing_event = self.store.event_for_idempotency_key(idempotency_key)
        if existing_event is not None:
            return self.get_impact(existing_event["payload"]["impact_id"])
        if change_class not in CHANGE_CLASSES:
            raise ValueError(f"Invalid change_class: {change_class}")
        if self._impact_exists(impact_id):
            raise ValueError(f"impact_id already exists: {impact_id}")

        source_watermark = self.store.latest_event_seq()
        record = {
            "impact_id": impact_id,
            "requirement_id": requirement_id,
            "change_class": change_class,
            "impacted_packet_ids": impacted_packet_ids,
            "impacted_acceptance_criterion_ids": impacted_acceptance_criterion_ids or [],
            "impacted_claim_ids": impacted_claim_ids,
            "impacted_evidence_ids": impacted_evidence_ids,
            "impacted_gate_ids": impacted_gate_ids or [],
            "impacted_projection_ids": impacted_projection_ids,
            "review_status": _review_status(change_class),
            "source_event_range": _source_event_range(source_watermark),
            "source_watermark": source_watermark,
            "created_at": utc_now_iso(),
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="ssot.impact_recorded",
                actor_id="ssot",
                actor_role="System",
                authority_basis="ssot impact analysis",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into ssot_change_impacts (
                  impact_id, requirement_id, change_class,
                  impacted_packet_ids_json, impacted_acceptance_criterion_ids_json,
                  impacted_claim_ids_json, impacted_evidence_ids_json,
                  impacted_gate_ids_json, impacted_projection_ids_json, review_status,
                  source_event_range, source_watermark, created_at,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _impact_values(record, event["event_id"], event["event_seq"]),
            )
        return self.get_impact(impact_id)

    def get_impact(self, impact_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from ssot_change_impacts where impact_id = ?",
                (impact_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown SSOT change impact: {impact_id}")
        result = dict(row)
        result["impacted_packet_ids"] = json.loads(result.pop("impacted_packet_ids_json"))
        result["impacted_acceptance_criterion_ids"] = json.loads(
            result.pop("impacted_acceptance_criterion_ids_json")
        )
        result["impacted_claim_ids"] = json.loads(result.pop("impacted_claim_ids_json"))
        result["impacted_evidence_ids"] = json.loads(result.pop("impacted_evidence_ids_json"))
        result["impacted_gate_ids"] = json.loads(result.pop("impacted_gate_ids_json"))
        result["impacted_projection_ids"] = json.loads(
            result.pop("impacted_projection_ids_json")
        )
        return result

    def _impact_exists(self, impact_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from ssot_change_impacts where impact_id = ?",
                (impact_id,),
            ).fetchone()
        return row is not None


def _review_status(change_class: str) -> str:
    if change_class in HUMAN_REVIEW_CLASSES:
        return "human_review_required"
    return "review_not_required"


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "1-0"
    return f"1-{source_watermark}"


def _impact_values(record: dict[str, Any], event_id: str, event_seq: int) -> tuple[Any, ...]:
    return (
        record["impact_id"],
        record["requirement_id"],
        record["change_class"],
        json.dumps(record["impacted_packet_ids"], sort_keys=True),
        json.dumps(record["impacted_acceptance_criterion_ids"], sort_keys=True),
        json.dumps(record["impacted_claim_ids"], sort_keys=True),
        json.dumps(record["impacted_evidence_ids"], sort_keys=True),
        json.dumps(record["impacted_gate_ids"], sort_keys=True),
        json.dumps(record["impacted_projection_ids"], sort_keys=True),
        record["review_status"],
        record["source_event_range"],
        record["source_watermark"],
        record["created_at"],
        event_id,
        event_seq,
    )
