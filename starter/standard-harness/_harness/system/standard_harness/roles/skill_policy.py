"""Skill policy evaluation hooks."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


CORE_FORBIDDEN_ACTIONS = {"direct_state_mutation", "bypass_gate", "skip_human_approval"}


class SkillPolicyEvaluator:
    def __init__(self, store: HarnessStore):
        self.store = store

    def evaluate(
        self,
        *,
        evaluation_id: str,
        role_id: str,
        action: str,
        local_policy: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return existing["payload"]
        diagnostics = []
        role_card = self._role_card(role_id)
        if role_card is None:
            diagnostics.append("unknown_role")
        else:
            if action in set(role_card["forbidden_decisions"]):
                diagnostics.append("role_forbidden_decision")
            if action not in set(role_card["permitted_actions"]):
                diagnostics.append("role_action_not_permitted")
        if action in CORE_FORBIDDEN_ACTIONS:
            diagnostics.append("core_invariant_violation")
        if action in set(local_policy.get("forbidden_actions", [])):
            diagnostics.append("local_policy_forbidden")
        record = {
            "evaluation_id": evaluation_id,
            "role_id": role_id,
            "action": action,
            "local_policy": local_policy,
            "policy_result": "blocked" if diagnostics else "allowed",
            "diagnostic_ids": diagnostics,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="skill_policy_evaluated",
                actor_id="roles",
                actor_role="System",
                authority_basis="skill policy evaluation",
                idempotency_key=idempotency_key,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into skill_policy_evaluations (
                  evaluation_id, role_id, action, local_policy_json,
                  policy_result, diagnostic_ids_json, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evaluation_id,
                    role_id,
                    action,
                    json.dumps(local_policy, sort_keys=True),
                    record["policy_result"],
                    json.dumps(diagnostics, sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return record

    def _role_card(self, role_id: str) -> dict[str, Any] | None:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from role_cards where role_id = ?",
                (role_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "role_id": row["role_id"],
            "permitted_actions": json.loads(row["permitted_actions_json"]),
            "forbidden_decisions": json.loads(row["forbidden_decisions_json"]),
            "escalation_duties": json.loads(row["escalation_duties_json"]),
            "required_review_evidence": json.loads(row["required_review_evidence_json"]),
        }
