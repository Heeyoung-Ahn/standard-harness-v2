"""Packet lifecycle domain service."""

from __future__ import annotations

import json
from uuid import uuid4

from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


LIFECYCLE_STATES = {
    "planned",
    "approved",
    "in_progress",
    "blocked",
    "ready_for_closeout",
    "closed",
    "reopened",
    "superseded",
}


class PacketService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def create_packet(
        self,
        *,
        packet_id: str,
        title: str,
        objective: str,
        risk_class: str,
        scope_summary: str,
        out_of_scope_summary: str,
        change_zones: list[str],
        acceptance_criteria_ids: list[str],
        evidence_requirements: list[str],
        closeout_criteria: list[str],
        owner: str,
        idempotency_key: str,
        approval_required: bool = True,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_packet(packet_id)
        if self._packet_exists(packet_id):
            raise ValueError(f"packet_id already exists: {packet_id}")
        now = utc_now_iso()
        packet = {
            "packet_id": packet_id,
            "title": title,
            "objective": objective,
            "risk_class": risk_class,
            "lifecycle_state": "planned",
            "approval_state": "pending" if approval_required else "not_required",
            "packet_version": 1,
            "scope_summary": scope_summary,
            "out_of_scope_summary": out_of_scope_summary,
            "change_zones": change_zones,
            "acceptance_criteria_ids": acceptance_criteria_ids,
            "evidence_requirements": evidence_requirements,
            "closeout_criteria": closeout_criteria,
            "approval_required": approval_required,
            "approval_record_id": None,
            "owner": owner,
            "created_at": now,
            "updated_at": now,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="packet.created",
                actor_id=owner,
                actor_role="Planner",
                authority_basis="packet-create",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=1,
                payload=packet,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into packets (
                  packet_id, title, objective, risk_class, lifecycle_state, approval_state,
                  packet_version, scope_summary, out_of_scope_summary, change_zones_json,
                  acceptance_criteria_ids_json, evidence_requirements_json,
                  closeout_criteria_json, approval_required, approval_record_id,
                  owner, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _packet_row_values(packet),
            )
        return self.get_packet(packet_id)

    def approve_packet(
        self,
        *,
        packet_id: str,
        approver_id: str,
        approver_role: str,
        authority_basis: str,
        approved_scope: str,
        rationale: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        existing_event = self.store.event_for_idempotency_key(idempotency_key)
        if existing_event is not None:
            existing_payload = existing_event["payload"]
            return self._approval_from_payload(existing_payload)
        packet = self.get_packet(packet_id)
        approval_record_id = f"apr_{uuid4().hex}"
        source_watermark = self.store.latest_event_seq()
        decided_at = utc_now_iso()
        approval = {
            "approval_record_id": approval_record_id,
            "packet_id": packet_id,
            "packet_version": packet["packet_version"],
            "approver_id": approver_id,
            "approver_role": approver_role,
            "authority_basis": authority_basis,
            "decision_result": "approved",
            "approved_scope": approved_scope,
            "source_watermark": source_watermark,
            "decided_at": decided_at,
            "rationale": rationale,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="packet.approved",
                actor_id=approver_id,
                actor_role=approver_role,
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=int(packet["packet_version"]),
                payload=approval,
                conn=conn,
            )
            conn.execute(
                """
                insert or ignore into approval_records (
                  approval_record_id, packet_id, packet_version, approver_id,
                  approver_role, authority_basis, decision_result, approved_scope,
                  source_watermark, decided_at, rationale
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval["approval_record_id"],
                    approval["packet_id"],
                    approval["packet_version"],
                    approval["approver_id"],
                    approval["approver_role"],
                    approval["authority_basis"],
                    approval["decision_result"],
                    approval["approved_scope"],
                    approval["source_watermark"],
                    approval["decided_at"],
                    approval["rationale"],
                ),
            )
            conn.execute(
                """
                update packets
                set approval_state = ?, approval_record_id = ?, updated_at = ?
                where packet_id = ?
                """,
                ("approved", approval_record_id, decided_at, packet_id),
            )
        return approval

    def transition_packet(
        self,
        *,
        packet_id: str,
        lifecycle_state: str,
        actor_id: str,
        actor_role: str,
        authority_basis: str,
        idempotency_key: str,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_packet(packet_id)
        if lifecycle_state not in LIFECYCLE_STATES:
            raise ValueError(f"Invalid lifecycle state: {lifecycle_state}")
        if lifecycle_state == "closed":
            raise ValueError("Packet cannot transition to closed without a closeout record")
        packet = self.get_packet(packet_id)
        now = utc_now_iso()
        payload = {
            "packet_id": packet_id,
            "from_state": packet["lifecycle_state"],
            "to_state": lifecycle_state,
        }
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="packet.transitioned",
                actor_id=actor_id,
                actor_role=actor_role,
                authority_basis=authority_basis,
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                packet_version=int(packet["packet_version"]),
                payload=payload,
                conn=conn,
            )
            conn.execute(
                "update packets set lifecycle_state = ?, updated_at = ? where packet_id = ?",
                (lifecycle_state, now, packet_id),
            )
        return self.get_packet(packet_id)

    def get_packet(self, packet_id: str) -> dict[str, object]:
        with self.store.connection() as conn:
            row = conn.execute("select * from packets where packet_id = ?", (packet_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown packet: {packet_id}")
        return _packet_from_row(dict(row))

    def _packet_exists(self, packet_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute("select 1 from packets where packet_id = ?", (packet_id,)).fetchone()
        return row is not None

    def _approval_from_payload(self, payload: dict[str, object]) -> dict[str, object]:
        return {
            "approval_record_id": payload["approval_record_id"],
            "packet_id": payload["packet_id"],
            "packet_version": payload["packet_version"],
            "approver_id": payload["approver_id"],
            "approver_role": payload["approver_role"],
            "authority_basis": payload["authority_basis"],
            "decision_result": payload["decision_result"],
            "approved_scope": payload["approved_scope"],
            "source_watermark": payload["source_watermark"],
            "decided_at": payload["decided_at"],
            "rationale": payload["rationale"],
        }


def _packet_row_values(packet: dict[str, object]) -> tuple[object, ...]:
    return (
        packet["packet_id"],
        packet["title"],
        packet["objective"],
        packet["risk_class"],
        packet["lifecycle_state"],
        packet["approval_state"],
        packet["packet_version"],
        packet["scope_summary"],
        packet["out_of_scope_summary"],
        json.dumps(packet["change_zones"], sort_keys=True),
        json.dumps(packet["acceptance_criteria_ids"], sort_keys=True),
        json.dumps(packet["evidence_requirements"], sort_keys=True),
        json.dumps(packet["closeout_criteria"], sort_keys=True),
        1 if packet["approval_required"] else 0,
        packet["approval_record_id"],
        packet["owner"],
        packet["created_at"],
        packet["updated_at"],
    )


def _packet_from_row(row: dict[str, object]) -> dict[str, object]:
    row["change_zones"] = json.loads(str(row.pop("change_zones_json")))
    row["acceptance_criteria_ids"] = json.loads(str(row.pop("acceptance_criteria_ids_json")))
    row["evidence_requirements"] = json.loads(str(row.pop("evidence_requirements_json")))
    row["closeout_criteria"] = json.loads(str(row.pop("closeout_criteria_json")))
    row["approval_required"] = bool(row["approval_required"])
    return row
