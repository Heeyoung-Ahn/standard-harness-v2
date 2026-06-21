"""Role card registry."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class RoleCardRegistry:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register(
        self,
        *,
        role_id: str,
        permitted_actions: list[str],
        forbidden_decisions: list[str],
        escalation_duties: list[str],
        required_review_evidence: list[str],
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return existing["payload"]
        record = {
            "role_id": role_id,
            "permitted_actions": permitted_actions,
            "forbidden_decisions": forbidden_decisions,
            "escalation_duties": escalation_duties,
            "required_review_evidence": required_review_evidence,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="role_card_registered",
                actor_id="roles",
                actor_role="System",
                authority_basis="role card registration",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into role_cards (
                  role_id, permitted_actions_json, forbidden_decisions_json,
                  escalation_duties_json, required_review_evidence_json,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    role_id,
                    json.dumps(permitted_actions, sort_keys=True),
                    json.dumps(forbidden_decisions, sort_keys=True),
                    json.dumps(escalation_duties, sort_keys=True),
                    json.dumps(required_review_evidence, sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return record

