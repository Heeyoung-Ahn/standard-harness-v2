"""LLM work-product classification before harness influence."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


WORK_PRODUCT_TYPES = {"work_product", "recommendation", "claim", "proposed_state_transition"}
DECISION_REQUIRED_TYPES = {"recommendation", "claim", "proposed_state_transition"}


class LlmWorkProductService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def classify(
        self,
        *,
        work_product_id: str,
        content: str,
        work_product_type: str,
        confidence: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return existing["payload"]
        if work_product_type not in WORK_PRODUCT_TYPES:
            raise ValueError(f"Invalid LLM work_product_type: {work_product_type}")
        record = {
            "work_product_id": work_product_id,
            "content": content,
            "work_product_type": work_product_type,
            "claim_type": work_product_type,
            "confidence": confidence,
            "human_decision_required": 1 if work_product_type in DECISION_REQUIRED_TYPES else 0,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="llm_work_product_classified",
                actor_id="llm-governance",
                actor_role="System",
                authority_basis="llm work product classification",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into llm_work_products (
                  work_product_id, content, work_product_type, claim_type,
                  confidence, human_decision_required, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    work_product_id,
                    content,
                    work_product_type,
                    work_product_type,
                    confidence,
                    record["human_decision_required"],
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return record

    def validate_state_influence(
        self,
        *,
        natural_language_intent: str,
        explicit_command: str | None,
        actor_validated: bool,
        persisted_event_id: str | None,
    ) -> dict[str, Any]:
        diagnostics = []
        if natural_language_intent and not explicit_command:
            diagnostics.append("missing_explicit_command")
        if not actor_validated:
            diagnostics.append("missing_validated_actor")
        if not persisted_event_id:
            diagnostics.append("missing_persisted_event")
        elif not self._event_exists(persisted_event_id):
            diagnostics.append("missing_persisted_event")
        return {"status": "blocked" if diagnostics else "accepted", "diagnostic_codes": diagnostics}

    def _event_exists(self, event_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from events where event_id = ?",
                (event_id,),
            ).fetchone()
        return row is not None
