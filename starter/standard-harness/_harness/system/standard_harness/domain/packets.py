"""Packet lifecycle domain service."""

from __future__ import annotations

import json
from uuid import uuid4

from standard_harness.state.events import utc_now_iso
from standard_harness.state.store import HarnessStore


LIFECYCLE_STATES = {
    "proposed",
    "challenge_required",
    "planned",
    "ready",
    "in_progress",
    "blocked",
    "implemented",
    "tested",
    "e2e_verified",
    "reviewed",
    "closeout_pending",
    "closed",
    "reopened",
    "cancelled",
    "superseded",
    "reverted",
}

DEFAULT_POLICY_VERSION = "0.2.0"
DEFAULT_MATURITY_LEVEL = "L1"


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
        scope_summary: str | None = None,
        out_of_scope_summary: str | None = None,
        change_zones: list[str],
        acceptance_criteria_ids: list[str],
        evidence_requirements: list[str],
        closeout_criteria: list[str],
        owner: str,
        idempotency_key: str,
        approval_required: bool = True,
        packet_type: str = "docs-only",
        risk_level: str | None = None,
        maturity_level: str = DEFAULT_MATURITY_LEVEL,
        scope: list[str] | None = None,
        out_of_scope: list[str] | None = None,
        depends_on: list[str] | None = None,
        locks: list[str] | None = None,
        test_plan: list[str] | None = None,
        e2e_test_gate: dict[str, object] | None = None,
        review_plan: dict[str, object] | None = None,
        security_review_plan: dict[str, object] | None = None,
        refactor_review_plan: dict[str, object] | None = None,
        closeout_plan: dict[str, object] | None = None,
        policy_version: str = DEFAULT_POLICY_VERSION,
        gate_profile_version: str | None = None,
    ) -> dict[str, object]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_packet(packet_id)
        if self._packet_exists(packet_id):
            raise ValueError(f"packet_id already exists: {packet_id}")
        scope_items = scope if scope is not None else ([scope_summary] if scope_summary else [])
        out_of_scope_items = (
            out_of_scope if out_of_scope is not None else ([out_of_scope_summary] if out_of_scope_summary else [])
        )
        scope_summary_value = scope_summary or (scope_items[0] if scope_items else "")
        out_of_scope_summary_value = (
            out_of_scope_summary or (out_of_scope_items[0] if out_of_scope_items else "")
        )
        now = utc_now_iso()
        packet = {
            "packet_id": packet_id,
            "title": title,
            "objective": objective,
            "packet_type": packet_type,
            "risk_class": risk_class,
            "risk_level": risk_level or risk_class,
            "maturity_level": maturity_level,
            "lifecycle_state": "planned",
            "approval_state": "pending" if approval_required else "not_required",
            "packet_version": 1,
            "scope_summary": scope_summary_value,
            "out_of_scope_summary": out_of_scope_summary_value,
            "scope": scope_items,
            "out_of_scope": out_of_scope_items,
            "depends_on": depends_on or [],
            "change_zones": change_zones,
            "locks": locks or [],
            "acceptance_criteria_ids": acceptance_criteria_ids,
            "evidence_requirements": evidence_requirements,
            "test_plan": test_plan or [],
            "e2e_test_gate": e2e_test_gate,
            "review_plan": review_plan or {},
            "security_review_plan": security_review_plan or {},
            "refactor_review_plan": refactor_review_plan or {},
            "closeout_plan": closeout_plan or {"criteria": closeout_criteria},
            "closeout_criteria": closeout_criteria,
            "policy_version": policy_version,
            "gate_profile_version": gate_profile_version or f"{packet_type}@1",
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
                  packet_id, title, objective, packet_type, risk_class, risk_level,
                  maturity_level, lifecycle_state, approval_state, packet_version,
                  scope_summary, out_of_scope_summary, scope_json, out_of_scope_json,
                  depends_on_json, change_zones_json, locks_json,
                  acceptance_criteria_ids_json, evidence_requirements_json, test_plan_json,
                  e2e_test_gate_json, review_plan_json, security_review_plan_json,
                  refactor_review_plan_json, closeout_plan_json, closeout_criteria_json,
                  policy_version, gate_profile_version, approval_required, approval_record_id,
                  owner, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        lifecycle_state = _normalize_lifecycle_state(lifecycle_state)
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
        packet["packet_type"],
        packet["risk_class"],
        packet["risk_level"],
        packet["maturity_level"],
        packet["lifecycle_state"],
        packet["approval_state"],
        packet["packet_version"],
        packet["scope_summary"],
        packet["out_of_scope_summary"],
        json.dumps(packet["scope"], sort_keys=True),
        json.dumps(packet["out_of_scope"], sort_keys=True),
        json.dumps(packet["depends_on"], sort_keys=True),
        json.dumps(packet["change_zones"], sort_keys=True),
        json.dumps(packet["locks"], sort_keys=True),
        json.dumps(packet["acceptance_criteria_ids"], sort_keys=True),
        json.dumps(packet["evidence_requirements"], sort_keys=True),
        json.dumps(packet["test_plan"], sort_keys=True),
        json.dumps(packet["e2e_test_gate"], sort_keys=True),
        json.dumps(packet["review_plan"], sort_keys=True),
        json.dumps(packet["security_review_plan"], sort_keys=True),
        json.dumps(packet["refactor_review_plan"], sort_keys=True),
        json.dumps(packet["closeout_plan"], sort_keys=True),
        json.dumps(packet["closeout_criteria"], sort_keys=True),
        packet["policy_version"],
        packet["gate_profile_version"],
        1 if packet["approval_required"] else 0,
        packet["approval_record_id"],
        packet["owner"],
        packet["created_at"],
        packet["updated_at"],
    )


def _packet_from_row(row: dict[str, object]) -> dict[str, object]:
    row["lifecycle_state"] = _normalize_lifecycle_state(str(row["lifecycle_state"]))
    row.setdefault("packet_type", "docs-only")
    row.setdefault("risk_level", row["risk_class"])
    row.setdefault("maturity_level", DEFAULT_MATURITY_LEVEL)
    row.setdefault("policy_version", DEFAULT_POLICY_VERSION)
    row.setdefault("gate_profile_version", f"{row['packet_type']}@1")
    row["scope"] = json.loads(str(row.pop("scope_json", json.dumps([row["scope_summary"]]))))
    row["out_of_scope"] = json.loads(
        str(row.pop("out_of_scope_json", json.dumps([row["out_of_scope_summary"]])))
    )
    row["depends_on"] = json.loads(str(row.pop("depends_on_json", "[]")))
    row["change_zones"] = json.loads(str(row.pop("change_zones_json")))
    row["locks"] = json.loads(str(row.pop("locks_json", "[]")))
    row["acceptance_criteria_ids"] = json.loads(str(row.pop("acceptance_criteria_ids_json")))
    row["evidence_requirements"] = json.loads(str(row.pop("evidence_requirements_json")))
    row["test_plan"] = json.loads(str(row.pop("test_plan_json", "[]")))
    row["e2e_test_gate"] = json.loads(str(row.pop("e2e_test_gate_json", "null")))
    row["review_plan"] = json.loads(str(row.pop("review_plan_json", "{}")))
    row["security_review_plan"] = json.loads(str(row.pop("security_review_plan_json", "{}")))
    row["refactor_review_plan"] = json.loads(str(row.pop("refactor_review_plan_json", "{}")))
    row["closeout_plan"] = json.loads(str(row.pop("closeout_plan_json", "{}")))
    row["closeout_criteria"] = json.loads(str(row.pop("closeout_criteria_json")))
    row["approval_required"] = bool(row["approval_required"])
    return row


def _normalize_lifecycle_state(lifecycle_state: str) -> str:
    if lifecycle_state == "ready_for_closeout":
        return "closeout_pending"
    return lifecycle_state
