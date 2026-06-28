"""Workflow orchestration records for packet phases."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore
from standard_harness.validation.review_governance import ReviewGovernanceValidator


class WorkflowOrchestrationService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_run(
        self,
        *,
        workflow_run_id: str,
        packet_id: str,
        phase: str,
        actor_role: str,
        input_projection_id: str | None,
        retry_count: int,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return self.get_run(existing["payload"]["workflow_run_id"])
        if self._exists(workflow_run_id):
            raise ValueError(f"workflow_run_id already exists: {workflow_run_id}")
        packet = PacketService(self.store).get_packet(packet_id)
        source_watermark = self.store.latest_event_seq()
        blockers: list[str] = []
        if phase == "implementation":
            if packet["approval_state"] != "approved":
                blockers.append("missing_approval")
            blockers.extend(ReviewGovernanceValidator(self.store.harness_root).implementation_transition_diagnostics(packet))
        record = {
            "workflow_run_id": workflow_run_id,
            "packet_id": packet_id,
            "phase": phase,
            "actor_role": actor_role,
            "input_projection_id": input_projection_id,
            "source_watermark": source_watermark,
            "status": "blocked" if blockers else "active",
            "retry_count": retry_count,
            "blocker_diagnostic_ids": blockers,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="workflow.run_recorded",
                actor_id="workflow",
                actor_role="System",
                authority_basis="workflow orchestration",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into workflow_runs (
                  workflow_run_id, packet_id, phase, actor_role,
                  input_projection_id, source_watermark, status, retry_count,
                  blocker_diagnostic_ids_json, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _workflow_values(record, event["event_id"], event["event_seq"]),
            )
        return self.get_run(workflow_run_id)

    def get_run(self, workflow_run_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from workflow_runs where workflow_run_id = ?",
                (workflow_run_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown workflow run: {workflow_run_id}")
        result = dict(row)
        result["blocker_diagnostic_ids"] = json.loads(
            result.pop("blocker_diagnostic_ids_json")
        )
        return result

    def _exists(self, workflow_run_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from workflow_runs where workflow_run_id = ?",
                (workflow_run_id,),
            ).fetchone()
        return row is not None


def _workflow_values(record: dict[str, Any], event_id: str, event_seq: int) -> tuple[Any, ...]:
    return (
        record["workflow_run_id"],
        record["packet_id"],
        record["phase"],
        record["actor_role"],
        record["input_projection_id"],
        record["source_watermark"],
        record["status"],
        record["retry_count"],
        json.dumps(record["blocker_diagnostic_ids"], sort_keys=True),
        event_id,
        event_seq,
    )

