"""Human control snapshot read model."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class HumanControlSnapshotService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def generate_snapshot(
        self,
        *,
        snapshot_id: str,
        idempotency_key: str,
        evaluated_at: str | None = None,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_snapshot(snapshot_id)
        source_watermark = self.store.latest_event_seq()
        effective_evaluated_at = evaluated_at or utc_now_iso()[:10]
        snapshot = {
            "snapshot_id": snapshot_id,
            "source_event_range": "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            "source_watermark": source_watermark,
            "pending_approvals": self._pending_approvals(),
            "non_delegable_decisions": [
                "release_decision",
                "waiver_approval",
                "requirement_rejection",
            ],
            "active_waivers": self._active_waivers(effective_evaluated_at),
            "challenged_items": self._challenged_items(),
            "blocked_gates": self._blocked_gates(),
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="human_control.snapshot_generated",
                actor_id="memory",
                actor_role="System",
                authority_basis="human control snapshot",
                idempotency_key=idempotency_key,
                payload=snapshot,
                conn=conn,
            )
            conn.execute(
                """
                insert into human_control_snapshots (
                  snapshot_id, source_event_range, source_watermark,
                  pending_approvals_json, non_delegable_decisions_json,
                  active_waivers_json, challenged_items_json, blocked_gates_json,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot_id,
                    snapshot["source_event_range"],
                    snapshot["source_watermark"],
                    json.dumps(snapshot["pending_approvals"], sort_keys=True),
                    json.dumps(snapshot["non_delegable_decisions"], sort_keys=True),
                    json.dumps(snapshot["active_waivers"], sort_keys=True),
                    json.dumps(snapshot["challenged_items"], sort_keys=True),
                    json.dumps(snapshot["blocked_gates"], sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_snapshot(snapshot_id)

    def get_snapshot(self, snapshot_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from human_control_snapshots where snapshot_id = ?",
                (snapshot_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown human control snapshot: {snapshot_id}")
        result = dict(row)
        for key in (
            "pending_approvals",
            "non_delegable_decisions",
            "active_waivers",
            "challenged_items",
            "blocked_gates",
        ):
            result[key] = json.loads(result.pop(f"{key}_json"))
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

    def _pending_approvals(self) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select packet_id from packets
                where approval_state = 'pending'
                order by packet_id
                """
            ).fetchall()
        return [row["packet_id"] for row in rows]

    def _active_waivers(self, evaluated_at: str) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select waiver_id from waivers
                where revocation_status = 'active'
                  and expires_at >= ?
                order by waiver_id
                """,
                (evaluated_at,),
            ).fetchall()
        return [row["waiver_id"] for row in rows]

    def _latest_source_event_seq(self) -> int:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select coalesce(max(event_seq), 0) as seq from events
                where event_type != 'human_control.snapshot_generated'
                """
            ).fetchone()
        return int(row["seq"])

    def _challenged_items(self) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute("select challenge_id from challenges order by challenge_id").fetchall()
        return [row["challenge_id"] for row in rows]

    def _blocked_gates(self) -> list[str]:
        with self.store.connection() as conn:
            declarations = conn.execute(
                "select gate_id, packet_id from gate_declarations order by gate_id"
            ).fetchall()
            blocked = []
            for gate in declarations:
                active = conn.execute(
                    """
                    select 1 from gate_activations
                    where gate_id = ? and packet_id = ? and activation_status = 'active'
                    """,
                    (gate["gate_id"], gate["packet_id"]),
                ).fetchone()
                passing = conn.execute(
                    """
                    select 1 from gate_results
                    where gate_id = ? and packet_id = ? and status = 'pass'
                    """,
                    (gate["gate_id"], gate["packet_id"]),
                ).fetchone()
                if active is None or passing is None:
                    blocked.append(gate["gate_id"])
        return blocked
