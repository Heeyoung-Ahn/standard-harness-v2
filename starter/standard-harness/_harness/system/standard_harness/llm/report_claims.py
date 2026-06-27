"""Decision-influencing report claim extraction."""

from __future__ import annotations

from typing import Any

from standard_harness.state.store import HarnessStore


class DecisionClaimExtractor:
    def __init__(self, store: HarnessStore):
        self.store = store

    def extract(
        self,
        *,
        decision_claim_id: str,
        report_id: str,
        observation: str,
        inference: str,
        assumption: str,
        recommendation: str,
        confidence: str,
        human_decision_required: bool,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return existing["payload"]
        record = {
            "decision_claim_id": decision_claim_id,
            "report_id": report_id,
            "observation": observation,
            "inference": inference,
            "assumption": assumption,
            "recommendation": recommendation,
            "confidence": confidence,
            "human_decision_required": 1 if human_decision_required else 0,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="decision_claim_extracted",
                actor_id="llm-governance",
                actor_role="System",
                authority_basis="decision report claim extraction",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into decision_claims (
                  decision_claim_id, report_id, observation, inference,
                  assumption, recommendation, confidence, human_decision_required,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_claim_id,
                    report_id,
                    observation,
                    inference,
                    assumption,
                    recommendation,
                    confidence,
                    record["human_decision_required"],
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return record

