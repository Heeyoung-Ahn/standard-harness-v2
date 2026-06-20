"""Gate declaration, activation, and result model."""

from __future__ import annotations

import json

from standard_harness.domain.packets import PacketService
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


REQUIREMENT_LEVELS = {"hard", "conditional", "advisory"}
GATE_STATUSES = {
    "pass",
    "fail",
    "blocked",
    "warning",
    "not_applicable_recorded",
    "stale",
    "superseded",
    "human_decision_required",
}


class GateService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def declare_gate(
        self,
        *,
        gate_id: str,
        packet_id: str,
        gate_type: str,
        requirement_level: str,
        declared_by_source: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_gate(gate_id)
        if self._row_exists("gate_declarations", "gate_id", gate_id):
            raise ValueError(f"gate_id already exists: {gate_id}")
        self._require_packet(packet_id)
        _validate_requirement_level(requirement_level)
        watermark = self.store.latest_event_seq()
        gate = {
            "gate_id": gate_id,
            "packet_id": packet_id,
            "gate_type": gate_type,
            "requirement_level": requirement_level,
            "declared_by_source": declared_by_source,
            "source_event_range": f"1-{watermark}",
            "source_watermark": watermark,
        }
        self.store.append_event(
            event_type="gate.declared",
            actor_id="planner",
            actor_role="Planner",
            authority_basis="gate declaration",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=gate,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into gate_declarations (
                  gate_id, packet_id, gate_type, requirement_level,
                  declared_by_source, source_event_range, source_watermark
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    gate_id,
                    packet_id,
                    gate_type,
                    requirement_level,
                    declared_by_source,
                    gate["source_event_range"],
                    watermark,
                ),
            )
            conn.commit()
        return self.get_gate(gate_id)

    def activate_gate(
        self,
        *,
        gate_activation_id: str,
        gate_id: str,
        packet_id: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_activation(gate_activation_id)
        if self._row_exists("gate_activations", "gate_activation_id", gate_activation_id):
            raise ValueError(f"gate_activation_id already exists: {gate_activation_id}")
        self._require_packet(packet_id)
        gate = self.get_gate(gate_id)
        if gate["packet_id"] != packet_id:
            raise ValueError("gate activation must belong to the same packet")
        watermark = self.store.latest_event_seq()
        activation = {
            "gate_activation_id": gate_activation_id,
            "gate_id": gate_id,
            "packet_id": packet_id,
            "activation_status": "active",
            "activated_at": utc_now_iso(),
            "source_event_range": f"1-{watermark}",
            "source_watermark": watermark,
        }
        self.store.append_event(
            event_type="gate.activated",
            actor_id="planner",
            actor_role="Planner",
            authority_basis="gate activation",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=activation,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into gate_activations (
                  gate_activation_id, gate_id, packet_id, activation_status,
                  activated_at, source_event_range, source_watermark
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    gate_activation_id,
                    gate_id,
                    packet_id,
                    activation["activation_status"],
                    activation["activated_at"],
                    activation["source_event_range"],
                    watermark,
                ),
            )
            conn.commit()
        return self.get_activation(gate_activation_id)

    def record_gate_result(
        self,
        *,
        gate_result_id: str,
        gate_id: str,
        packet_id: str,
        checked_claim_ids: list[str],
        evidence_ids: list[str],
        status: str,
        requirement_level: str,
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_gate_result(gate_result_id)
        if self._row_exists("gate_results", "gate_result_id", gate_result_id):
            raise ValueError(f"gate_result_id already exists: {gate_result_id}")
        self._require_packet(packet_id)
        gate = self.get_gate(gate_id)
        if gate["packet_id"] != packet_id:
            raise ValueError("gate result must belong to the same packet")
        _validate_requirement_level(requirement_level)
        if status not in GATE_STATUSES:
            raise ValueError(f"Invalid gate status: {status}")
        if not self._gate_is_active(gate_id, packet_id):
            raise ValueError("Gate result requires an activated gate")
        if status == "pass":
            self._validate_pass_inputs(packet_id, checked_claim_ids, evidence_ids)
        watermark = self.store.latest_event_seq()
        result = {
            "gate_result_id": gate_result_id,
            "gate_id": gate_id,
            "packet_id": packet_id,
            "checked_claim_ids": checked_claim_ids,
            "evidence_ids": evidence_ids,
            "status": status,
            "requirement_level": requirement_level,
            "rationale": rationale,
            "source_event_range": f"1-{watermark}",
            "source_watermark": watermark,
        }
        self.store.append_event(
            event_type="gate.result_recorded",
            actor_id="tester",
            actor_role="Tester",
            authority_basis="gate result",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=result,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into gate_results (
                  gate_result_id, gate_id, packet_id, checked_claim_ids_json,
                  evidence_ids_json, status, requirement_level, rationale,
                  source_event_range, source_watermark
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    gate_result_id,
                    gate_id,
                    packet_id,
                    json.dumps(checked_claim_ids, sort_keys=True),
                    json.dumps(evidence_ids, sort_keys=True),
                    status,
                    requirement_level,
                    rationale,
                    result["source_event_range"],
                    watermark,
                ),
            )
            conn.commit()
        return self.get_gate_result(gate_result_id)

    def get_gate(self, gate_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from gate_declarations where gate_id = ?", (gate_id,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown gate: {gate_id}")
        return dict(row)

    def get_activation(self, gate_activation_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from gate_activations where gate_activation_id = ?",
                (gate_activation_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown gate activation: {gate_activation_id}")
        return dict(row)

    def get_gate_result(self, gate_result_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from gate_results where gate_result_id = ?", (gate_result_id,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown gate result: {gate_result_id}")
        result = dict(row)
        result["checked_claim_ids"] = json.loads(result.pop("checked_claim_ids_json"))
        result["evidence_ids"] = json.loads(result.pop("evidence_ids_json"))
        return result

    def _gate_is_active(self, gate_id: str, packet_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select 1 from gate_activations
                where gate_id = ? and packet_id = ? and activation_status = 'active'
                """,
                (gate_id, packet_id),
            ).fetchone()
        return row is not None

    def _validate_pass_inputs(
        self, packet_id: str, checked_claim_ids: list[str], evidence_ids: list[str]
    ) -> None:
        if not checked_claim_ids:
            raise ValueError("Passing gate results require checked claim ids")
        if not evidence_ids:
            raise ValueError("Passing gate results require evidence ids")
        with self.store.connection() as conn:
            for evidence_id in evidence_ids:
                evidence = conn.execute(
                    """
                    select result_status from evidence
                    where evidence_id = ? and packet_id = ?
                    """,
                    (evidence_id, packet_id),
                ).fetchone()
                if evidence is None or evidence["result_status"] != "passed":
                    raise ValueError("Passing gate results require passed evidence")
            for claim_id in checked_claim_ids:
                claim = conn.execute(
                    """
                    select support_status, evidence_ids_json from claims
                    where claim_id = ? and packet_id = ?
                    """,
                    (claim_id, packet_id),
                ).fetchone()
                if claim is None or claim["support_status"] != "supported":
                    raise ValueError("Passing gate results require supported claims")
                claim_evidence_ids = set(json.loads(claim["evidence_ids_json"]))
                if not claim_evidence_ids.intersection(evidence_ids):
                    raise ValueError(
                        "Passing gate results require evidence linked to each checked claim"
                    )

    def _require_packet(self, packet_id: str) -> dict[str, object]:
        try:
            return PacketService(self.store).get_packet(packet_id)
        except KeyError as exc:
            raise ValueError(f"Unknown packet: {packet_id}") from exc

    def _row_exists(self, table: str, key_column: str, key_value: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                f"select 1 from {table} where {key_column} = ?", (key_value,)
            ).fetchone()
        return row is not None


def _validate_requirement_level(requirement_level: str) -> None:
    if requirement_level not in REQUIREMENT_LEVELS:
        raise ValueError(f"Invalid gate requirement level: {requirement_level}")
