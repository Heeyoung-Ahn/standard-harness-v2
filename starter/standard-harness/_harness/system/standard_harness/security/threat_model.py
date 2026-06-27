"""Threat model and security review gate."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


class ThreatModelService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def record_threat_model(
        self,
        *,
        threat_model_id: str,
        assets: list[str],
        trust_boundaries: list[str],
        attacker_assumptions: list[str],
        abuse_cases: list[str],
        mitigations: list[dict[str, Any]],
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_threat_model(threat_model_id)
        model = {
            "threat_model_id": threat_model_id,
            "assets": assets,
            "trust_boundaries": trust_boundaries,
            "attacker_assumptions": attacker_assumptions,
            "abuse_cases": abuse_cases,
            "mitigations": mitigations,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="threat_model.recorded",
                actor_id="security",
                actor_role="System",
                authority_basis="threat model",
                idempotency_key=idempotency_key,
                payload=model,
                conn=conn,
            )
            conn.execute(
                """
                insert into threat_models (
                  threat_model_id, assets_json, trust_boundaries_json,
                  attacker_assumptions_json, abuse_cases_json, mitigations_json,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    threat_model_id,
                    json.dumps(assets, sort_keys=True),
                    json.dumps(trust_boundaries, sort_keys=True),
                    json.dumps(attacker_assumptions, sort_keys=True),
                    json.dumps(abuse_cases, sort_keys=True),
                    json.dumps(mitigations, sort_keys=True),
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_threat_model(threat_model_id)

    def get_threat_model(self, threat_model_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from threat_models where threat_model_id = ?",
                (threat_model_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown threat model: {threat_model_id}")
        return _threat_model_from_row(dict(row))


class SecurityReviewGate:
    def __init__(self, store: HarnessStore):
        self.store = store

    def evaluate_release(self) -> dict[str, Any]:
        diagnostics = []
        with self.store.connection() as conn:
            rows = conn.execute("select * from threat_models").fetchall()
        for row in rows:
            model = _threat_model_from_row(dict(row))
            for mitigation in model["mitigations"]:
                if mitigation.get("required_for_release") and mitigation.get("status") != "implemented":
                    diagnostics.append("open_required_mitigation")
                    return {"status": "blocked", "diagnostic_ids": diagnostics}
        return {"status": "accepted", "diagnostic_ids": diagnostics}


def _threat_model_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["assets"] = json.loads(row.pop("assets_json"))
    row["trust_boundaries"] = json.loads(row.pop("trust_boundaries_json"))
    row["attacker_assumptions"] = json.loads(row.pop("attacker_assumptions_json"))
    row["abuse_cases"] = json.loads(row.pop("abuse_cases_json"))
    row["mitigations"] = json.loads(row.pop("mitigations_json"))
    return row

