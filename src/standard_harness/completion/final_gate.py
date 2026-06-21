"""Event-backed project completion gate result records."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.completion.coverage import ProjectCompletionCoverage
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class ProjectCompletionGateService:
    """Persist final project completion evaluations as auditable events."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_result(
        self,
        *,
        completion_result_id: str,
        idempotency_key: str,
        all_requirements: bool = False,
        requirement_id: str | None = None,
    ) -> dict[str, Any]:
        existing_event = self.store.event_for_idempotency_key(idempotency_key)
        if existing_event is not None:
            return self.get_result(existing_event["payload"]["completion_result_id"])
        if self._result_exists(completion_result_id):
            raise ValueError(f"completion_result_id already exists: {completion_result_id}")

        coverage = ProjectCompletionCoverage(self.store).evaluate(
            all_requirements=all_requirements,
            requirement_id=requirement_id,
        )
        scope = "all" if all_requirements else "requirement"
        record = {
            "completion_result_id": completion_result_id,
            "scope": scope,
            "requirement_id": requirement_id,
            "status": coverage["status"],
            "requirement_counts": coverage["requirement_counts"],
            "diagnostics": coverage["diagnostics"],
            "diagnostic_ids": [
                diagnostic["diagnostic_id"] for diagnostic in coverage["diagnostics"]
            ],
            "source_event_range": _source_event_range(int(coverage["source_watermark"])),
            "source_watermark": coverage["source_watermark"],
            "evaluated_at": utc_now_iso(),
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="project_completion.evaluated",
                actor_id="completion",
                actor_role="System",
                authority_basis="project completion coverage gate",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into project_completion_results (
                  completion_result_id, scope, requirement_id, status,
                  requirement_counts_json, diagnostic_ids_json, diagnostics_json,
                  source_event_range, source_watermark, evaluated_at,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _result_values(record, event["event_id"], event["event_seq"]),
            )
        return self.get_result(completion_result_id)

    def get_result(self, completion_result_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from project_completion_results where completion_result_id = ?",
                (completion_result_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown project completion result: {completion_result_id}")
        result = dict(row)
        result["requirement_counts"] = json.loads(result.pop("requirement_counts_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        result["diagnostics"] = json.loads(result.pop("diagnostics_json"))
        return result

    def _result_exists(self, completion_result_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select 1 from project_completion_results
                where completion_result_id = ?
                """,
                (completion_result_id,),
            ).fetchone()
        return row is not None


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "1-0"
    return f"1-{source_watermark}"


def _result_values(record: dict[str, Any], event_id: str, event_seq: int) -> tuple[Any, ...]:
    return (
        record["completion_result_id"],
        record["scope"],
        record.get("requirement_id"),
        record["status"],
        json.dumps(record["requirement_counts"], sort_keys=True),
        json.dumps(record["diagnostic_ids"], sort_keys=True),
        json.dumps(record["diagnostics"], sort_keys=True),
        record["source_event_range"],
        record["source_watermark"],
        record["evaluated_at"],
        event_id,
        event_seq,
    )

