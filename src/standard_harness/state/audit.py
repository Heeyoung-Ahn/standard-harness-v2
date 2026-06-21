"""Point-in-time audit snapshots reconstructed from canonical events."""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from standard_harness.state import migrations
from standard_harness.state.events import canonical_json, sha256_text, utc_now_iso
from standard_harness.state.store import HarnessStore


ADMIN_EVENT_TYPES = {
    "recovery_started",
    "projection_rebuilt",
    "recovery_blocked",
    "audit_snapshot_created",
    "backup_created",
    "restore_verified",
}


class PointInTimeAudit:
    """Build an auditable state snapshot at a specific event sequence."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def snapshot_at(self, *, event_seq: int) -> dict[str, Any]:
        self.store.initialize()
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select * from events
                where event_seq <= ?
                order by event_seq
                """,
                (event_seq,),
            ).fetchall()

        snapshot = _empty_snapshot(event_seq)
        for row in rows:
            event_type = row["event_type"]
            if event_type in ADMIN_EVENT_TYPES or event_type.startswith(
                ("recovery.", "audit.", "backup.", "restore.")
            ):
                continue
            payload = json.loads(row["payload_json"])
            _apply_event(snapshot, row, payload)

        restore_checksum = sha256_text(canonical_json(_checksum_payload(snapshot)))
        snapshot["restore_checksum"] = restore_checksum
        with self.store.transaction() as conn:
            self.store.append_event(
                event_type="audit_snapshot_created",
                actor_id="audit",
                actor_role="System",
                authority_basis="point-in-time audit",
                idempotency_key=f"audit-snapshot-{snapshot['snapshot_id']}",
                payload={
                    "snapshot_id": snapshot["snapshot_id"],
                    "event_seq_range": snapshot["source_event_range"],
                    "schema_version": snapshot["schema_version"],
                    "restore_checksum": restore_checksum,
                },
                conn=conn,
            )
            conn.execute(
                """
                insert or replace into audit_snapshots (
                  snapshot_id, event_seq_range, schema_version,
                  restore_checksum, snapshot_json, created_at
                ) values (?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot["snapshot_id"],
                    snapshot["source_event_range"],
                    snapshot["schema_version"],
                    restore_checksum,
                    json.dumps(snapshot, sort_keys=True),
                    snapshot["created_at"],
                ),
            )
        return snapshot


def _empty_snapshot(event_seq: int) -> dict[str, Any]:
    source_event_range = "0-0" if event_seq <= 0 else f"1-{event_seq}"
    return {
        "snapshot_id": f"audit_{uuid4().hex}",
        "source_event_range": source_event_range,
        "source_watermark": event_seq,
        "schema_version": migrations.schema_version(),
        "created_at": utc_now_iso(),
        "packets": {},
        "approval_records": {},
        "requirements": {},
        "acceptance_criteria": {},
        "artifacts": {},
        "evidence": {},
        "claims": {},
        "gate_declarations": {},
        "gate_activations": {},
        "gate_results": {},
        "closeouts": {},
        "projections": {},
        "starter_manifest_entries": {},
        "requirement_registration_diffs": {},
        "ssot_change_impacts": {},
    }


def _apply_event(snapshot: dict[str, Any], row, payload: dict[str, Any]) -> None:
    event_type = row["event_type"]
    if event_type == "packet.created":
        snapshot["packets"][payload["packet_id"]] = dict(payload)
    elif event_type == "packet.approved":
        snapshot["approval_records"][payload["approval_record_id"]] = dict(payload)
        packet = snapshot["packets"].get(payload["packet_id"])
        if packet:
            packet["approval_state"] = "approved"
            packet["approval_record_id"] = payload["approval_record_id"]
            packet["updated_at"] = payload["decided_at"]
    elif event_type == "packet.transitioned":
        packet = snapshot["packets"].get(payload["packet_id"])
        if packet:
            packet["lifecycle_state"] = payload["to_state"]
            packet["updated_at"] = row["occurred_at"]
    elif event_type == "requirement.registered":
        snapshot["requirements"][payload["requirement_id"]] = dict(payload)
    elif event_type == "requirement.transitioned":
        requirement = snapshot["requirements"].get(payload["requirement_id"])
        if requirement:
            requirement["status"] = payload["to_status"]
            requirement["decision_record_id"] = payload.get("decision_record_id")
            requirement["decision_rationale"] = payload.get("decision_rationale")
            requirement["updated_at"] = payload["updated_at"]
    elif event_type == "acceptance_criterion.registered":
        snapshot["acceptance_criteria"][payload["acceptance_criterion_id"]] = dict(payload)
    elif event_type == "artifact.registered":
        snapshot["artifacts"][payload["artifact_id"]] = dict(payload)
    elif event_type == "evidence.registered":
        snapshot["evidence"][payload["evidence_id"]] = dict(payload)
    elif event_type == "claim.recorded":
        snapshot["claims"][payload["claim_id"]] = dict(payload)
    elif event_type == "gate.declared":
        snapshot["gate_declarations"][payload["gate_id"]] = dict(payload)
    elif event_type == "gate.activated":
        snapshot["gate_activations"][payload["gate_activation_id"]] = dict(payload)
    elif event_type == "gate.result_recorded":
        snapshot["gate_results"][payload["gate_result_id"]] = dict(payload)
    elif event_type == "closeout.decided":
        snapshot["closeouts"][payload["closeout_id"]] = dict(payload)
        packet = snapshot["packets"].get(payload["packet_id"])
        if packet:
            packet["lifecycle_state"] = payload["decision_status"]
            packet["updated_at"] = payload["decided_at"]
    elif event_type == "projection.generated":
        snapshot["projections"][payload["projection_id"]] = dict(payload)
    elif event_type == "starter.entry_registered":
        snapshot["starter_manifest_entries"][payload["path"]] = dict(payload)
    elif event_type == "ssot.registration_diff_recorded":
        snapshot["requirement_registration_diffs"][payload["diff_id"]] = dict(payload)
    elif event_type == "ssot.registration_diff_transitioned":
        diff = snapshot["requirement_registration_diffs"].get(payload["diff_id"])
        if diff:
            diff["promotion_state"] = payload["to_promotion_state"]
            diff["decision_record_id"] = payload.get("decision_record_id")
            diff["decision_rationale"] = payload.get("decision_rationale")
    elif event_type == "ssot.impact_recorded":
        snapshot["ssot_change_impacts"][payload["impact_id"]] = dict(payload)


def _checksum_payload(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in snapshot.items() if key != "restore_checksum"}
