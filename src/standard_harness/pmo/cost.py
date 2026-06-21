"""Cost tracking signals."""

from __future__ import annotations

from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore


class CostTrackingService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_cost(
        self,
        *,
        cost_record_id: str,
        packet_id: str,
        tool_name: str,
        operation_type: str,
        usage_quantity: float,
        usage_unit: str,
        cost_estimate: float,
        risk_tier: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_cost(cost_record_id)
        PacketService(self.store).get_packet(packet_id)
        source_watermark = self.store.latest_event_seq()
        record = {
            "cost_record_id": cost_record_id,
            "packet_id": packet_id,
            "tool_name": tool_name,
            "operation_type": operation_type,
            "usage_quantity": usage_quantity,
            "usage_unit": usage_unit,
            "cost_estimate": cost_estimate,
            "risk_tier": risk_tier,
            "source_watermark": source_watermark,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="cost.recorded",
                actor_id="pmo",
                actor_role="System",
                authority_basis="cost tracking signal",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into cost_records (
                  cost_record_id, packet_id, tool_name, operation_type,
                  usage_quantity, usage_unit, cost_estimate, risk_tier,
                  source_watermark, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cost_record_id,
                    packet_id,
                    tool_name,
                    operation_type,
                    usage_quantity,
                    usage_unit,
                    cost_estimate,
                    risk_tier,
                    source_watermark,
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_cost(cost_record_id)

    def get_cost(self, cost_record_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from cost_records where cost_record_id = ?",
                (cost_record_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown cost record: {cost_record_id}")
        return dict(row)

