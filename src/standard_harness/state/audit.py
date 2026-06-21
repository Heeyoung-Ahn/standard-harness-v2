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
        "project_completion_results": {},
        "adapter_invocations": {},
        "workflow_runs": {},
        "review_bundles": {},
        "llm_work_products": {},
        "decision_claims": {},
        "role_cards": {},
        "skill_policy_evaluations": {},
        "challenges": {},
        "independent_reviews": {},
        "adjudications": {},
        "git_snapshots": {},
        "git_reconciliations": {},
        "filesystem_drifts": {},
        "policy_bundles": {},
        "profile_activations": {},
        "dependencies": {},
        "ip_license_records": {},
        "waivers": {},
        "threat_models": {},
        "pmo_projections": {},
        "cost_records": {},
        "operational_memory_snapshots": {},
        "human_control_snapshots": {},
        "cloud_orchestrations": {},
        "integrity_signatures": {},
        "retention_policies": {},
        "redaction_events": {},
        "friction_records": {},
        "improvement_proposals": {},
    }


def _apply_event(snapshot: dict[str, Any], row, payload: dict[str, Any]) -> None:
    event_type = row["event_type"]
    if event_type == "packet.created":
        packet = dict(payload)
        packet["lifecycle_state"] = _normalize_lifecycle_state(str(packet["lifecycle_state"]))
        snapshot["packets"][payload["packet_id"]] = packet
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
            packet["lifecycle_state"] = _normalize_lifecycle_state(str(payload["to_state"]))
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
        evidence = dict(payload)
        evidence.setdefault("evidence_type", "command-log")
        evidence.setdefault("producer_role", "tester")
        evidence.setdefault("producer_provider", "local")
        evidence.setdefault("produced_via", "manual-handoff")
        evidence.setdefault("command", evidence.get("command_or_tool", ""))
        evidence.setdefault("exit_code", 0 if evidence.get("result_status") == "passed" else 1)
        evidence.setdefault("base_commit", None)
        evidence.setdefault("head_commit", None)
        evidence.setdefault("workspace_id", evidence.get("packet_id"))
        evidence.setdefault(
            "validation_status",
            _derive_validation_status(str(evidence.get("result_status"))),
        )
        evidence.setdefault(
            "trust_status",
            _derive_trust_status(
                result_status=str(evidence.get("result_status")),
                produced_via=str(evidence.get("produced_via")),
                base_commit=evidence.get("base_commit"),
                head_commit=evidence.get("head_commit"),
                workspace_id=evidence.get("workspace_id"),
            ),
        )
        evidence.setdefault("claims", [])
        snapshot["evidence"][payload["evidence_id"]] = evidence
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
    elif event_type == "project_completion.evaluated":
        snapshot["project_completion_results"][payload["completion_result_id"]] = dict(payload)
    elif event_type == "adapter.invocation_recorded":
        snapshot["adapter_invocations"][payload["adapter_run_id"]] = dict(payload)
    elif event_type == "workflow.run_recorded":
        snapshot["workflow_runs"][payload["workflow_run_id"]] = dict(payload)
    elif event_type == "review_bundle.created":
        snapshot["review_bundles"][payload["review_bundle_id"]] = dict(payload)
    elif event_type == "llm_work_product_classified":
        snapshot["llm_work_products"][payload["work_product_id"]] = dict(payload)
    elif event_type == "decision_claim_extracted":
        snapshot["decision_claims"][payload["decision_claim_id"]] = dict(payload)
    elif event_type == "role_card_registered":
        snapshot["role_cards"][payload["role_id"]] = dict(payload)
    elif event_type == "skill_policy_evaluated":
        snapshot["skill_policy_evaluations"][payload["evaluation_id"]] = dict(payload)
    elif event_type == "challenge_opened":
        snapshot["challenges"][payload["challenge_id"]] = dict(payload)
    elif event_type == "independent_review_recorded":
        snapshot["independent_reviews"][payload["review_id"]] = dict(payload)
    elif event_type == "adjudication_recorded":
        snapshot["adjudications"][payload["adjudication_id"]] = dict(payload)
    elif event_type == "git.snapshot_recorded":
        snapshot["git_snapshots"][payload["git_snapshot_id"]] = dict(payload)
    elif event_type == "git.reconciliation_recorded":
        snapshot["git_reconciliations"][payload["reconciliation_id"]] = dict(payload)
    elif event_type == "filesystem_drift_detected":
        snapshot["filesystem_drifts"][payload["drift_record_id"]] = dict(payload)
    elif event_type == "filesystem_drift_resolved":
        for drift_record_id in payload["drift_record_ids"]:
            drift = snapshot["filesystem_drifts"].get(drift_record_id)
            if drift:
                drift["resolution_status"] = payload["resolution_status"]
    elif event_type == "policy_bundle.registered":
        snapshot["policy_bundles"][payload["policy_bundle_id"]] = dict(payload)
    elif event_type == "profile.activated":
        snapshot["profile_activations"][payload["activation_id"]] = dict(payload)
    elif event_type == "dependency.recorded":
        snapshot["dependencies"][payload["dependency_id"]] = dict(payload)
    elif event_type == "ip_license.recorded":
        snapshot["ip_license_records"][payload["ip_record_id"]] = dict(payload)
    elif event_type == "waiver.recorded":
        snapshot["waivers"][payload["waiver_id"]] = dict(payload)
    elif event_type == "threat_model.recorded":
        snapshot["threat_models"][payload["threat_model_id"]] = dict(payload)
    elif event_type == "pmo.projection_generated":
        snapshot["pmo_projections"][payload["pmo_projection_id"]] = dict(payload)
    elif event_type == "cost.recorded":
        snapshot["cost_records"][payload["cost_record_id"]] = dict(payload)
    elif event_type == "operational_memory.generated":
        snapshot["operational_memory_snapshots"][payload["memory_snapshot_id"]] = dict(payload)
    elif event_type == "human_control.snapshot_generated":
        snapshot["human_control_snapshots"][payload["snapshot_id"]] = dict(payload)
    elif event_type == "cloud.orchestration_recorded":
        snapshot["cloud_orchestrations"][payload["orchestration_run_id"]] = dict(payload)
    elif event_type == "integrity.signature_recorded":
        snapshot["integrity_signatures"][payload["signature_id"]] = dict(payload)
    elif event_type == "retention.policy_recorded":
        snapshot["retention_policies"][payload["retention_policy_id"]] = dict(payload)
    elif event_type == "redaction.recorded":
        snapshot["redaction_events"][payload["redaction_event_id"]] = dict(payload)
    elif event_type == "friction_recorded":
        snapshot["friction_records"][payload["friction_record_id"]] = dict(payload)
    elif event_type == "improvement_proposal_created":
        snapshot["improvement_proposals"][payload["proposal_id"]] = dict(payload)


def _checksum_payload(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in snapshot.items() if key != "restore_checksum"}


def _normalize_lifecycle_state(lifecycle_state: str) -> str:
    if lifecycle_state == "ready_for_closeout":
        return "closeout_pending"
    return lifecycle_state


def _derive_validation_status(result_status: str) -> str:
    if result_status == "passed":
        return "STRUCTURALLY_VALID"
    if result_status == "stale":
        return "STALE"
    if result_status in {"failed", "blocked"}:
        return "INVALID"
    return "RECORDED"


def _derive_trust_status(
    *,
    result_status: str,
    produced_via: str,
    base_commit: str | None,
    head_commit: str | None,
    workspace_id: str | None,
) -> str:
    if result_status != "passed":
        return _derive_validation_status(result_status)
    if produced_via == "harness-reproduction" and base_commit and head_commit and workspace_id:
        return "REPRODUCED_BY_HARNESS"
    if produced_via == "trusted-ci" and base_commit and head_commit and workspace_id:
        return "TRUSTED_CI"
    if produced_via == "human-accepted-manual":
        return "MANUAL_ACCEPTED_BY_HUMAN"
    return "MANUAL_ONLY"
