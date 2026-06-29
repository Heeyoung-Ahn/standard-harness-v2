"""Provider-neutral role routing for local LLM worker adapters."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from standard_harness.adapters.contract_matrix import AdapterBoundaryValidator
from standard_harness.adapters.contract_matrix import AdapterContractMatrix
from standard_harness.adapters.manifest import AdapterManifest
from standard_harness.state.store import HarnessStore


@dataclass(frozen=True)
class ProviderOrchestrationPolicy:
    """Select replaceable adapters without making a provider the product identity."""

    manifests: list[AdapterManifest]

    def select_adapter(
        self, role: str, preferred_provider: str | None = None
    ) -> dict[str, Any]:
        eligible = [
            manifest
            for manifest in self.manifests
            if role in manifest.supported_roles
            and AdapterContractMatrix().validate_manifest(manifest)["status"] == "valid"
        ]
        if preferred_provider:
            eligible = [
                manifest for manifest in eligible if manifest.provider == preferred_provider
            ]
        if not eligible:
            return {
                "status": "blocked",
                "diagnostic_code": "no_provider_adapter_for_role",
                "role": role,
                "preferred_provider": preferred_provider,
                "product_identity": False,
            }
        manifest = eligible[0]
        return {
            "status": "selected",
            "role": role,
            "adapter_id": manifest.adapter_id,
            "adapter_version": manifest.adapter_version,
            "provider": manifest.provider,
            "credential_mode": manifest.credential_mode,
            "execution_modes": list(manifest.execution_modes),
            "evidence_modes": list(manifest.evidence_modes),
            "permission_roots": list(manifest.permission_roots),
            "read_write_capability": manifest.read_write_capability,
            "artifact_export_capability": manifest.artifact_export_capability,
            "known_limitations": list(manifest.known_limitations),
            "product_identity": False,
        }

    def prepare_execution(
        self,
        *,
        role: str,
        packet_id: str,
        input_snapshot_hash: str,
        preferred_provider: str | None = None,
        cli_available: bool,
        execution_preconditions: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        route = self.select_adapter(role, preferred_provider)
        if route["status"] != "selected":
            return route
        if not cli_available and "local_subscription_cli" in route["execution_modes"]:
            return {
                "status": "manual_required",
                "diagnostic_code": "provider_cli_unavailable",
                "role": role,
                "adapter_id": route["adapter_id"],
                "provider": route["provider"],
                "input_snapshot_hash": input_snapshot_hash,
                "manual_run_bundle": {
                    "packet_id": packet_id,
                    "role": role,
                    "adapter_id": route["adapter_id"],
                    "provider": route["provider"],
                    "input_snapshot_hash": input_snapshot_hash,
                    "permission_roots": route["permission_roots"],
                    "expected_output": "adapter output envelope with artifact manifest and evidence provenance",
                },
                "product_identity": False,
            }
        missing_preconditions = _missing_execution_preconditions(
            execution_preconditions or {}
        )
        if "local_subscription_cli" in route["execution_modes"] and missing_preconditions:
            return {
                "status": "execution_blocked",
                "diagnostic_code": "execution_preconditions_missing",
                "role": role,
                "packet_id": packet_id,
                "adapter_id": route["adapter_id"],
                "provider": route["provider"],
                "input_snapshot_hash": input_snapshot_hash,
                "missing_preconditions": missing_preconditions,
                "manual_run_bundle": {
                    "packet_id": packet_id,
                    "role": role,
                    "adapter_id": route["adapter_id"],
                    "provider": route["provider"],
                    "input_snapshot_hash": input_snapshot_hash,
                    "permission_roots": route["permission_roots"],
                    "expected_output": "adapter output envelope with artifact manifest and evidence provenance",
                },
                "product_identity": False,
            }
        command_descriptor_diagnostics = _command_descriptor_diagnostics(
            (execution_preconditions or {}).get("command_descriptor")
        )
        if (
            "local_subscription_cli" in route["execution_modes"]
            and command_descriptor_diagnostics
        ):
            return {
                "status": "execution_blocked",
                "diagnostic_code": "unsafe_command_descriptor",
                "role": role,
                "packet_id": packet_id,
                "adapter_id": route["adapter_id"],
                "provider": route["provider"],
                "input_snapshot_hash": input_snapshot_hash,
                "command_descriptor_diagnostics": command_descriptor_diagnostics,
                "manual_run_bundle": {
                    "packet_id": packet_id,
                    "role": role,
                    "adapter_id": route["adapter_id"],
                    "provider": route["provider"],
                    "input_snapshot_hash": input_snapshot_hash,
                    "permission_roots": route["permission_roots"],
                    "expected_output": "adapter output envelope with artifact manifest and evidence provenance",
                },
                "product_identity": False,
            }
        return {
            "status": "ready",
            "diagnostic_code": None,
            "role": role,
            "packet_id": packet_id,
            "adapter_id": route["adapter_id"],
            "provider": route["provider"],
            "credential_mode": route["credential_mode"],
            "execution_modes": route["execution_modes"],
            "input_snapshot_hash": input_snapshot_hash,
            "permission_roots": route["permission_roots"],
            "product_identity": False,
        }


class ProviderOrchestrationLedger:
    """Persist provider orchestration and adjudication records as queryable events."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def record_run(
        self,
        *,
        orchestration_run_id: str,
        packet_id: str,
        role: str,
        selected_route: dict[str, Any],
        input_snapshot_hash: str,
        command_descriptor: dict[str, Any],
        output_envelope: dict[str, Any] | None,
        evidence_refs: list[str],
        diagnostics: list[str],
        adjudication_state: str,
        status: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return dict(existing["payload"])
        if output_envelope is not None:
            boundary = AdapterBoundaryValidator().validate_envelope(
                output_envelope,
                trusted_permission_roots=list(selected_route.get("permission_roots", [])),
                expected_input_snapshot_hash=input_snapshot_hash,
            )
            if boundary["status"] == "rejected":
                raise ValueError(
                    f"Provider orchestration output rejected: {boundary['failure_classification']}"
                )
        record = {
            "orchestration_run_id": orchestration_run_id,
            "packet_id": packet_id,
            "role": role,
            "adapter_id": selected_route["adapter_id"],
            "adapter_version": selected_route.get("adapter_version"),
            "provider": selected_route["provider"],
            "credential_mode": selected_route.get("credential_mode"),
            "execution_modes": list(selected_route.get("execution_modes", [])),
            "status": status,
            "input_snapshot_hash": input_snapshot_hash,
            "permission_roots": list(selected_route.get("permission_roots", [])),
            "command_descriptor": command_descriptor,
            "output_envelope": output_envelope,
            "artifact_manifest": list((output_envelope or {}).get("artifact_manifest", [])),
            "evidence_refs": evidence_refs,
            "evidence_provenance": dict((output_envelope or {}).get("evidence_provenance", {})),
            "diagnostics": diagnostics,
            "adjudication_state": adjudication_state,
            "truth_claim": False,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="provider_orchestration.run_recorded",
                actor_id="provider-orchestration-ledger",
                actor_role="System",
                authority_basis="provider orchestration read model",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                source_snapshot=input_snapshot_hash,
                payload=record,
                conn=conn,
            )
        result = dict(record)
        result["trace_event_id"] = event["event_id"]
        result["trace_event_seq"] = event["event_seq"]
        return result

    def record_adjudication(
        self,
        *,
        packet_id: str,
        left_adapter_run_id: str,
        right_adapter_run_id: str,
        disagreement: str,
        follow_up_owner: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        record = ProviderOrchestrationRecorder().record_disagreement(
            packet_id=packet_id,
            left_adapter_run_id=left_adapter_run_id,
            right_adapter_run_id=right_adapter_run_id,
            disagreement=disagreement,
        )
        record["follow_up_owner"] = follow_up_owner
        existing = self.store.event_for_idempotency_key(idempotency_key)
        if existing is not None:
            return dict(existing["payload"])
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="provider_orchestration.adjudication_recorded",
                actor_id="provider-orchestration-ledger",
                actor_role="System",
                authority_basis="provider orchestration adjudication read model",
                idempotency_key=idempotency_key,
                packet_id=packet_id,
                payload=record,
                conn=conn,
            )
        result = dict(record)
        result["trace_event_id"] = event["event_id"]
        result["trace_event_seq"] = event["event_seq"]
        return result

    def query_runs(
        self,
        *,
        packet_id: str | None = None,
        role: str | None = None,
        adapter_id: str | None = None,
        provider: str | None = None,
        status: str | None = None,
        adjudication_state: str | None = None,
    ) -> list[dict[str, Any]]:
        runs = self._events("provider_orchestration.run_recorded")
        return [
            run
            for run in runs
            if _matches(run, "packet_id", packet_id)
            and _matches(run, "role", role)
            and _matches(run, "adapter_id", adapter_id)
            and _matches(run, "provider", provider)
            and _matches(run, "status", status)
            and _matches(run, "adjudication_state", adjudication_state)
        ]

    def query_adjudications(
        self, *, packet_id: str | None = None, status: str | None = None
    ) -> list[dict[str, Any]]:
        records = self._events("provider_orchestration.adjudication_recorded")
        return [
            record
            for record in records
            if _matches(record, "packet_id", packet_id)
            and _matches(record, "status", status)
        ]

    def _events(self, event_type: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select payload_json, event_id, event_seq from events where event_type = ? order by event_seq",
                (event_type,),
            ).fetchall()
        records: list[dict[str, Any]] = []
        for row in rows:
            payload = json.loads(row["payload_json"])
            payload["trace_event_id"] = row["event_id"]
            payload["trace_event_seq"] = row["event_seq"]
            records.append(payload)
        return records


class ProviderOrchestrationRecorder:
    """Build read-model records for provider disagreement and adjudication input."""

    def record_disagreement(
        self,
        *,
        packet_id: str,
        left_adapter_run_id: str,
        right_adapter_run_id: str,
        disagreement: str,
    ) -> dict[str, Any]:
        return {
            "packet_id": packet_id,
            "left_adapter_run_id": left_adapter_run_id,
            "right_adapter_run_id": right_adapter_run_id,
            "disagreement": disagreement,
            "status": "adjudication_required",
            "truth_claim": False,
            "follow_up_owner": "Reviewer",
            "authority_boundary": "LLM disagreement is evidence input only; Reviewer or Planner resolves against packet and SSOT authority.",
        }


def _missing_execution_preconditions(preconditions: dict[str, Any]) -> list[str]:
    required = {
        "approved_packet_boundary": True,
        "explicit_local_configuration": True,
        "authenticated_outside_repo": True,
        "command_descriptor": True,
        "timeout_seconds": True,
        "cancel_supported": True,
        "non_interactive_capture": True,
        "input_snapshot_current": True,
    }
    missing: list[str] = []
    for field, expected in required.items():
        if field == "timeout_seconds":
            if not isinstance(preconditions.get(field), int) or preconditions[field] <= 0:
                missing.append(field)
            continue
        if field == "command_descriptor":
            if not isinstance(preconditions.get(field), dict) or not preconditions[field]:
                missing.append(field)
            continue
        if preconditions.get(field) is not expected:
            missing.append(field)
    return missing


def _command_descriptor_diagnostics(command_descriptor: Any) -> list[str]:
    if not isinstance(command_descriptor, dict):
        return ["missing_command_descriptor"]
    argv = command_descriptor.get("argv")
    if not isinstance(argv, list) or not argv:
        return ["missing_argv"]
    diagnostics: list[str] = []
    for value in argv:
        if not isinstance(value, str) or not value.strip():
            diagnostics.append("invalid_argv_token")
            continue
        if any(pattern in value for pattern in ("$(", "`", "&&", "||", "|", ";", "\n", "\r")):
            diagnostics.append("untrusted_shell_interpolation")
    if command_descriptor.get("shell") is True:
        diagnostics.append("shell_execution_not_allowed")
    return sorted(set(diagnostics))


def _matches(record: dict[str, Any], field: str, expected: str | None) -> bool:
    return expected is None or record.get(field) == expected
