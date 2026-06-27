"""Harness profile activation and conflict policy."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


PROFILE_CONFLICTS = {
    "public-release": {"internal-only"},
    "internal-only": {"public-release"},
}


class ProfileService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def activate_profile(
        self,
        *,
        activation_id: str,
        profile_id: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_activation(activation_id)
        active = self.active_profile_ids()
        conflicts = sorted(PROFILE_CONFLICTS.get(profile_id, set()).intersection(active))
        status = "blocked" if conflicts else "active"
        diagnostic_ids = ["profile_conflict"] if conflicts else []
        activation = {
            "activation_id": activation_id,
            "profile_id": profile_id,
            "status": status,
            "conflicting_profile_ids": conflicts,
            "diagnostic_ids": diagnostic_ids,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="profile.activated",
                actor_id="policy",
                actor_role="System",
                authority_basis="profile activation",
                idempotency_key=idempotency_key,
                payload=activation,
                conn=conn,
            )
            conn.execute(
                """
                insert into profile_activations (
                  activation_id, profile_id, status, conflicting_profile_ids_json,
                  diagnostic_ids_json, trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    activation_id,
                    profile_id,
                    status,
                    json.dumps(conflicts, sort_keys=True),
                    json.dumps(diagnostic_ids, sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_activation(activation_id)

    def active_profile_ids(self) -> set[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select profile_id from profile_activations where status = 'active'"
            ).fetchall()
        return {row["profile_id"] for row in rows}

    def get_activation(self, activation_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from profile_activations where activation_id = ?",
                (activation_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown profile activation: {activation_id}")
        result = dict(row)
        result["conflicting_profile_ids"] = json.loads(result.pop("conflicting_profile_ids_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        return result

