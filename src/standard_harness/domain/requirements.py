"""Requirement and acceptance criteria registry."""

from __future__ import annotations

import json

from standard_harness.domain.packets import PacketService
from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


class RequirementRegistry:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register_requirement(
        self,
        *,
        requirement_id: str,
        version: str,
        source_doc: str,
        status: str,
        classification: str,
        risk_classification: str,
        acceptance_criteria: list[str],
        completion_classification: str,
        packet_id: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_requirement(requirement_id)
        if self._row_exists("requirements", "requirement_id", requirement_id):
            raise ValueError(f"requirement_id already exists: {requirement_id}")
        self._require_packet(packet_id)
        now = utc_now_iso()
        requirement = {
            "requirement_id": requirement_id,
            "version": version,
            "source_doc": source_doc,
            "status": status,
            "classification": classification,
            "risk_classification": risk_classification,
            "acceptance_criteria": acceptance_criteria,
            "completion_classification": completion_classification,
            "packet_id": packet_id,
            "created_at": now,
            "updated_at": now,
        }
        self.store.append_event(
            event_type="requirement.registered",
            actor_id="planner",
            actor_role="Planner",
            authority_basis="manual requirement registration",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=requirement,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into requirements (
                  requirement_id, version, source_doc, status, classification,
                  risk_classification, acceptance_criteria_json,
                  completion_classification, packet_id, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    requirement_id,
                    version,
                    source_doc,
                    status,
                    classification,
                    risk_classification,
                    json.dumps(acceptance_criteria, sort_keys=True),
                    completion_classification,
                    packet_id,
                    now,
                    now,
                ),
            )
            conn.commit()
        return self.get_requirement(requirement_id)

    def register_acceptance_criterion(
        self,
        *,
        acceptance_criterion_id: str,
        requirement_id: str,
        packet_id: str,
        description: str,
        status: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_acceptance_criterion(acceptance_criterion_id)
        if self._row_exists(
            "acceptance_criteria", "acceptance_criterion_id", acceptance_criterion_id
        ):
            raise ValueError(
                f"acceptance_criterion_id already exists: {acceptance_criterion_id}"
            )
        packet = self._require_packet(packet_id)
        requirement = self._require_requirement(requirement_id)
        if requirement["packet_id"] != packet_id:
            raise ValueError("acceptance criterion requirement must belong to the same packet")
        if acceptance_criterion_id not in packet["acceptance_criteria_ids"]:
            raise ValueError("acceptance criterion id must be listed in the packet")
        now = utc_now_iso()
        criterion = {
            "acceptance_criterion_id": acceptance_criterion_id,
            "requirement_id": requirement_id,
            "packet_id": packet_id,
            "description": description,
            "status": status,
            "created_at": now,
            "updated_at": now,
        }
        self.store.append_event(
            event_type="acceptance_criterion.registered",
            actor_id="planner",
            actor_role="Planner",
            authority_basis="manual acceptance registration",
            idempotency_key=idempotency_key,
            packet_id=packet_id,
            payload=criterion,
        )
        with self.store.connection() as conn:
            conn.execute(
                """
                insert or ignore into acceptance_criteria (
                  acceptance_criterion_id, requirement_id, packet_id,
                  description, status, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    acceptance_criterion_id,
                    requirement_id,
                    packet_id,
                    description,
                    status,
                    now,
                    now,
                ),
            )
            conn.commit()
        return self.get_acceptance_criterion(acceptance_criterion_id)

    def get_requirement(self, requirement_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from requirements where requirement_id = ?", (requirement_id,)
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown requirement: {requirement_id}")
        result = dict(row)
        result["acceptance_criteria"] = json.loads(result.pop("acceptance_criteria_json"))
        return result

    def get_acceptance_criterion(self, acceptance_criterion_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from acceptance_criteria where acceptance_criterion_id = ?",
                (acceptance_criterion_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown acceptance criterion: {acceptance_criterion_id}")
        return dict(row)

    def _require_packet(self, packet_id: str) -> dict[str, object]:
        try:
            return PacketService(self.store).get_packet(packet_id)
        except KeyError as exc:
            raise ValueError(f"Unknown packet: {packet_id}") from exc

    def _require_requirement(self, requirement_id: str) -> dict[str, object]:
        try:
            return self.get_requirement(requirement_id)
        except KeyError as exc:
            raise ValueError(f"Unknown requirement: {requirement_id}") from exc

    def _row_exists(self, table: str, key_column: str, key_value: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                f"select 1 from {table} where {key_column} = ?", (key_value,)
            ).fetchone()
        return row is not None
