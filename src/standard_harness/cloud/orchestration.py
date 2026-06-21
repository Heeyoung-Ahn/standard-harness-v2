"""Cloud orchestration contract ledger."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.domain.packets import PacketService
from standard_harness.state.store import HarnessStore


FAILURE_DIAGNOSTICS = {
    "timeout": ["cloud_timeout"],
    "permission_denied": ["cloud_permission_denied"],
    "cloud_service_missing": ["cloud_service_missing", "manual_local_fallback_required"],
    "manual_path_required": ["manual_local_fallback_required"],
}


class CloudOrchestrationService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def validate_remote_request(
        self,
        *,
        packet_id: str,
        actor_id: str,
        actor_role: str,
        permission_roots: list[str],
        input_snapshot_hash: str,
        evidence_output: dict[str, Any],
    ) -> dict[str, Any]:
        diagnostic_ids = []
        if not packet_id:
            diagnostic_ids.append("missing_packet_id")
        if not actor_id or not actor_role:
            diagnostic_ids.append("missing_actor_identity")
        if not permission_roots:
            diagnostic_ids.append("missing_permission_roots")
        if not input_snapshot_hash:
            diagnostic_ids.append("missing_input_snapshot")
        if not evidence_output or not evidence_output.get("artifact_path") or not evidence_output.get("content_hash"):
            diagnostic_ids.append("missing_evidence_output")
        return {
            "status": "blocked" if diagnostic_ids else "accepted",
            "diagnostic_ids": diagnostic_ids,
        }

    def start_remote_work(
        self,
        *,
        orchestration_run_id: str,
        packet_id: str,
        actor_id: str,
        actor_role: str,
        remote_environment_id: str,
        permission_roots: list[str],
        input_snapshot_hash: str,
        evidence_output: dict[str, Any],
        cloud_service_available: bool,
        idempotency_key: str,
        failure_classification: str | None = None,
    ) -> dict[str, Any]:
        validation = self.validate_remote_request(
            packet_id=packet_id,
            actor_id=actor_id,
            actor_role=actor_role,
            permission_roots=permission_roots,
            input_snapshot_hash=input_snapshot_hash,
            evidence_output=evidence_output,
        )
        diagnostic_ids = list(validation["diagnostic_ids"])
        failure = failure_classification
        if packet_id and not self._packet_approved(packet_id):
            diagnostic_ids.append("missing_approval")
            failure = failure or "manual_path_required"
        if not cloud_service_available:
            failure = "cloud_service_missing"
        if failure:
            diagnostic_ids.extend(FAILURE_DIAGNOSTICS.get(failure, [failure]))
        if validation["status"] == "accepted" and not diagnostic_ids:
            failure = "manual_path_required"
            diagnostic_ids.extend(FAILURE_DIAGNOSTICS[failure])
        return self.record_run(
            orchestration_run_id=orchestration_run_id,
            packet_id=packet_id,
            actor_id=actor_id,
            actor_role=actor_role,
            remote_environment_id=remote_environment_id,
            permission_roots=permission_roots,
            input_snapshot_hash=input_snapshot_hash,
            adapter_run_ids=[],
            status="blocked",
            failure_classification=failure or "manual_path_required",
            diagnostic_ids=_dedupe(diagnostic_ids),
            evidence_output=evidence_output,
            idempotency_key=idempotency_key,
        )

    def record_run(
        self,
        *,
        orchestration_run_id: str,
        packet_id: str,
        actor_id: str,
        actor_role: str,
        remote_environment_id: str,
        permission_roots: list[str],
        input_snapshot_hash: str,
        adapter_run_ids: list[str],
        status: str,
        failure_classification: str | None,
        diagnostic_ids: list[str],
        evidence_output: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_run(orchestration_run_id)
        validation = self.validate_remote_request(
            packet_id=packet_id,
            actor_id=actor_id,
            actor_role=actor_role,
            permission_roots=permission_roots,
            input_snapshot_hash=input_snapshot_hash,
            evidence_output=evidence_output,
        )
        if validation["status"] == "blocked":
            raise ValueError(f"Invalid cloud orchestration request: {validation['diagnostic_ids']}")
        PacketService(self.store).get_packet(packet_id)
        derived_diagnostics = list(validation["diagnostic_ids"])
        if not self._packet_approved(packet_id):
            derived_diagnostics.append("missing_approval")
        if failure_classification:
            derived_diagnostics.extend(
                FAILURE_DIAGNOSTICS.get(failure_classification, [failure_classification])
            )
        derived_diagnostics.extend(
            self._adapter_contract_diagnostics(
                adapter_run_ids=adapter_run_ids,
                input_snapshot_hash=input_snapshot_hash,
                permission_roots=permission_roots,
                evidence_output=evidence_output,
            )
        )
        combined_diagnostics = _dedupe([*diagnostic_ids, *derived_diagnostics])
        effective_status = "blocked" if combined_diagnostics else status
        if effective_status != "blocked" and status != "blocked":
            effective_status = "blocked"
            combined_diagnostics.append("manual_local_fallback_required")
            failure_classification = failure_classification or "manual_path_required"
        source_watermark = self.store.latest_event_seq()
        record = {
            "orchestration_run_id": orchestration_run_id,
            "packet_id": packet_id,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "remote_environment_id": remote_environment_id,
            "permission_roots": permission_roots,
            "input_snapshot_hash": input_snapshot_hash,
            "adapter_run_ids": adapter_run_ids,
            "status": effective_status,
            "failure_classification": failure_classification,
            "diagnostic_ids": _dedupe(combined_diagnostics),
            "evidence_output": evidence_output,
            "source_watermark": source_watermark,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="cloud.orchestration_recorded",
                actor_id=actor_id,
                actor_role=actor_role,
                authority_basis="cloud orchestration contract",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=record,
                conn=conn,
            )
            conn.execute(
                """
                insert into cloud_orchestrations (
                  orchestration_run_id, packet_id, actor_id, actor_role,
                  remote_environment_id, permission_roots_json,
                  input_snapshot_hash, adapter_run_ids_json, status,
                  failure_classification, diagnostic_ids_json,
                  evidence_output_json, source_watermark, trace_event_id,
                  trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    orchestration_run_id,
                    packet_id,
                    actor_id,
                    actor_role,
                    remote_environment_id,
                    json.dumps(permission_roots, sort_keys=True),
                    input_snapshot_hash,
                    json.dumps(adapter_run_ids, sort_keys=True),
                    effective_status,
                    failure_classification,
                    json.dumps(_dedupe(combined_diagnostics), sort_keys=True),
                    json.dumps(evidence_output, sort_keys=True),
                    source_watermark,
                    event["event_id"],
                    event["event_seq"],
                ),
            )
        return self.get_run(orchestration_run_id)

    def get_run(self, orchestration_run_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from cloud_orchestrations where orchestration_run_id = ?",
                (orchestration_run_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown cloud orchestration run: {orchestration_run_id}")
        result = dict(row)
        result["permission_roots"] = json.loads(result.pop("permission_roots_json"))
        result["adapter_run_ids"] = json.loads(result.pop("adapter_run_ids_json"))
        result["diagnostic_ids"] = json.loads(result.pop("diagnostic_ids_json"))
        result["evidence_output"] = json.loads(result.pop("evidence_output_json"))
        return result

    def _packet_approved(self, packet_id: str) -> bool:
        packet = PacketService(self.store).get_packet(packet_id)
        return not packet["approval_required"] or packet["approval_state"] == "approved"

    def _adapter_contract_diagnostics(
        self,
        *,
        adapter_run_ids: list[str],
        input_snapshot_hash: str,
        permission_roots: list[str],
        evidence_output: dict[str, Any],
    ) -> list[str]:
        diagnostics = []
        if not adapter_run_ids:
            return diagnostics
        with self.store.connection() as conn:
            for adapter_run_id in adapter_run_ids:
                row = conn.execute(
                    """
                    select input_snapshot_hash, permission_roots_json,
                           artifact_manifest_json, evidence_provenance_json
                    from adapter_invocations
                    where adapter_run_id = ?
                    """,
                    (adapter_run_id,),
                ).fetchone()
                if row is None:
                    diagnostics.append("unknown_adapter_run")
                    continue
                if row["input_snapshot_hash"] != input_snapshot_hash:
                    diagnostics.append("adapter_snapshot_mismatch")
                if set(json.loads(row["permission_roots_json"])) != set(permission_roots):
                    diagnostics.append("adapter_permission_mismatch")
                artifact_manifest = json.loads(row["artifact_manifest_json"])
                evidence_path = evidence_output.get("artifact_path")
                evidence_hash = evidence_output.get("content_hash")
                if not any(
                    item.get("path") == evidence_path
                    and item.get("content_hash") == evidence_hash
                    for item in artifact_manifest
                ):
                    diagnostics.append("adapter_evidence_output_mismatch")
                evidence_provenance = json.loads(row["evidence_provenance_json"])
                if evidence_provenance.get("execution_mode") not in {"cloud", "remote"}:
                    diagnostics.append("adapter_execution_mode_mismatch")
        return diagnostics


def _dedupe(values: list[str]) -> list[str]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result
