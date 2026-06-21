"""Waiver lifecycle and gate evaluation."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.policy.risk import NON_WAIVABLE_GATE_IDS
from standard_harness.state.store import HarnessStore


class WaiverLifecycleService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_waiver(
        self,
        *,
        waiver_id: str,
        approver_id: str,
        approver_role: str,
        scope: str,
        expires_at: str,
        compensating_control: str,
        affected_gate_ids: list[str],
        revocation_status: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_waiver(waiver_id)
        waiver = {
            "waiver_id": waiver_id,
            "approver_id": approver_id,
            "approver_role": approver_role,
            "scope": scope,
            "expires_at": expires_at,
            "compensating_control": compensating_control,
            "affected_gate_ids": affected_gate_ids,
            "revocation_status": revocation_status,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="waiver.recorded",
                actor_id=approver_id,
                actor_role=approver_role,
                authority_basis="waiver approval",
                idempotency_key=idempotency_key,
                payload=waiver,
                conn=conn,
            )
            conn.execute(
                """
                insert into waivers (
                  waiver_id, approver_id, approver_role, scope, expires_at,
                  compensating_control, affected_gate_ids_json, revocation_status,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    waiver_id,
                    approver_id,
                    approver_role,
                    scope,
                    expires_at,
                    compensating_control,
                    json.dumps(affected_gate_ids, sort_keys=True),
                    revocation_status,
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_waiver(waiver_id)

    def get_waiver(self, waiver_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from waivers where waiver_id = ?",
                (waiver_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown waiver: {waiver_id}")
        result = dict(row)
        result["affected_gate_ids"] = json.loads(result.pop("affected_gate_ids_json"))
        return result

    def evaluate_gate_waiver(
        self,
        *,
        gate_id: str,
        evaluated_at: str,
        non_waivable_gate_ids: list[str],
    ) -> dict[str, Any]:
        if gate_id in set(non_waivable_gate_ids).union(NON_WAIVABLE_GATE_IDS):
            return {"status": "blocked", "diagnostic_ids": ["non_waivable_gate"]}
        active = [
            waiver
            for waiver in self._waivers_for_gate(gate_id)
            if waiver["revocation_status"] == "active" and waiver["expires_at"] >= evaluated_at
        ]
        if not active:
            return {"status": "blocked", "diagnostic_ids": ["no_active_waiver"]}
        return {"status": "accepted", "diagnostic_ids": [], "waiver_ids": [w["waiver_id"] for w in active]}

    def _waivers_for_gate(self, gate_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute("select * from waivers order by trace_event_seq").fetchall()
        waivers = []
        for row in rows:
            waiver = dict(row)
            waiver["affected_gate_ids"] = json.loads(waiver.pop("affected_gate_ids_json"))
            if gate_id in waiver["affected_gate_ids"]:
                waivers.append(waiver)
        return waivers
