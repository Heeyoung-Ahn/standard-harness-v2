"""Adapter outcome matrix and boundary validation."""

from __future__ import annotations

from typing import Any

from standard_harness.adapters.envelope import AdapterOutputEnvelope
from standard_harness.adapters.manifest import AdapterManifest


SUPPORTED_EXECUTION_MODES = {"local", "remote", "manual", "mock"}
SUPPORTED_EVIDENCE_MODES = {
    "cli_command",
    "unit_test",
    "integration_test",
    "api_runtime",
    "browser_render",
    "browser_functional",
    "db_schema",
    "db_runtime_persistence",
    "cloud_execution",
    "device_execution",
    "manual_runtime",
    "substitute_evidence",
}
SUPPORTED_READ_WRITE_CAPABILITIES = {"read_only", "read_artifacts", "write_artifacts"}
SUPPORTED_ARTIFACT_EXPORT_CAPABILITIES = {"none", "write_artifacts", "artifact_manifest"}
DIRECT_WRITE_EVENT_TYPES = {"sqlite.write", "database.write", "state.mutate", "direct_state_write"}
OUTCOME_MATRIX = {
    "success": ("accepted", "adapter_success"),
    "fail": ("rejected", "adapter_fail"),
    "blocked": ("blocked", "adapter_blocked"),
    "stale": ("blocked", "adapter_stale"),
    "substitute": ("human_review_required", "adapter_substitute"),
    "not_applicable": ("accepted_with_record", "adapter_not_applicable"),
    "partial_output": ("blocked", "adapter_partial_output"),
    "timeout": ("blocked", "adapter_timeout"),
    "permission_denied": ("blocked", "adapter_permission_denied"),
    "malformed_envelope": ("rejected", "adapter_malformed_envelope"),
    "mock_success": ("rejected", "adapter_mock_success"),
    "direct_state_mutation": ("rejected", "adapter_direct_state_mutation"),
    "path_escape": ("rejected", "adapter_path_escape"),
}


class AdapterContractMatrix:
    """Classify adapter outcomes against the final-product contract matrix."""

    def classify(self, outcome: str) -> dict[str, str]:
        if outcome not in OUTCOME_MATRIX:
            return {
                "outcome": outcome,
                "disposition": "blocked",
                "diagnostic_code": "adapter_unknown_outcome",
            }
        disposition, diagnostic_code = OUTCOME_MATRIX[outcome]
        return {
            "outcome": outcome,
            "disposition": disposition,
            "diagnostic_code": diagnostic_code,
        }

    def validate_manifest(self, manifest: AdapterManifest) -> dict[str, Any]:
        unsupported_failure_modes = [
            failure_mode
            for failure_mode in manifest.failure_modes
            if failure_mode not in OUTCOME_MATRIX
        ]
        unsupported_execution_modes = [
            mode for mode in manifest.execution_modes if mode not in SUPPORTED_EXECUTION_MODES
        ]
        unsupported_evidence_modes = [
            mode for mode in manifest.evidence_modes if mode not in SUPPORTED_EVIDENCE_MODES
        ]
        unsupported_read_write = (
            manifest.read_write_capability
            if manifest.read_write_capability not in SUPPORTED_READ_WRITE_CAPABILITIES
            else None
        )
        unsupported_artifact_export = (
            manifest.artifact_export_capability
            if manifest.artifact_export_capability
            not in SUPPORTED_ARTIFACT_EXPORT_CAPABILITIES
            else None
        )
        invalid_permission_roots = [
            root for root in manifest.permission_roots if not _looks_absolute(root)
        ]
        blocked = any(
            [
                unsupported_failure_modes,
                unsupported_execution_modes,
                unsupported_evidence_modes,
                unsupported_read_write,
                unsupported_artifact_export,
                invalid_permission_roots,
            ]
        )
        return {
            "status": "blocked" if blocked else "valid",
            "adapter_id": manifest.adapter_id,
            "unsupported_failure_modes": unsupported_failure_modes,
            "unsupported_execution_modes": unsupported_execution_modes,
            "unsupported_evidence_modes": unsupported_evidence_modes,
            "unsupported_read_write_capability": unsupported_read_write,
            "unsupported_artifact_export_capability": unsupported_artifact_export,
            "invalid_permission_roots": invalid_permission_roots,
        }


class AdapterBoundaryValidator:
    """Validate adapter envelopes before they can influence harness state."""

    def validate_envelope(self, data: dict[str, Any]) -> dict[str, Any]:
        try:
            envelope = AdapterOutputEnvelope.from_dict(data)
        except ValueError as exc:
            message = str(exc)
            if "direct state mutation" in message:
                return _rejected("direct_state_mutation", message)
            return _rejected("malformed_envelope", message)

        if _contains_direct_mutation(envelope.event_request):
            return _rejected("direct_state_mutation", "Adapter event request mutates state directly")
        if self._has_path_escape(envelope):
            return _rejected("path_escape", "Adapter artifact path escapes permission roots")
        if envelope.evidence_provenance.get("execution_mode") == "mock" and (
            envelope.evidence_provenance.get("result_status") == "passed"
        ):
            return _rejected("mock_success", "Mock success cannot be production evidence")
        if not envelope.evidence_provenance:
            return _rejected("malformed_envelope", "Missing evidence provenance")
        if _missing_required_provenance(envelope.evidence_provenance):
            return _rejected("malformed_envelope", "Evidence provenance is incomplete")

        classification = envelope.failure_classification or "success"
        result = AdapterContractMatrix().classify(classification)
        return {
            "status": result["disposition"],
            "failure_classification": classification,
            "diagnostic_code": result["diagnostic_code"],
        }

    def _has_path_escape(self, envelope: AdapterOutputEnvelope) -> bool:
        if any(not _looks_absolute(root) for root in envelope.permission_roots):
            return True
        roots = [_normalize_path(root) for root in envelope.permission_roots]
        if not roots:
            return True
        for artifact in envelope.artifact_manifest:
            path = artifact.get("path")
            if not isinstance(path, str) or not path:
                return True
            normalized = _normalize_path(path)
            if not any(_is_relative_to(normalized, root) for root in roots):
                return True
        return False


def _rejected(failure_classification: str, message: str) -> dict[str, str]:
    result = AdapterContractMatrix().classify(failure_classification)
    return {
        "status": "rejected",
        "failure_classification": failure_classification,
        "diagnostic_code": result["diagnostic_code"],
        "message": message,
    }


def _normalize_path(path: str) -> str:
    normalized = path.replace("\\", "/").strip()
    prefix = ""
    if len(normalized) >= 3 and normalized[1] == ":" and normalized[2] == "/":
        prefix = normalized[:2].lower()
        normalized = normalized[3:]
    elif normalized.startswith("/"):
        prefix = "/"
        normalized = normalized[1:]
    raw_parts = normalized.split("/")
    parts: list[str] = []
    for part in raw_parts:
        if part in {"", "."}:
            continue
        if part == "..":
            if parts and parts[-1] != "..":
                parts.pop()
            else:
                parts.append(part)
            continue
        parts.append(part)
    joined = "/".join(parts).rstrip("/").lower()
    if prefix == "/":
        return f"/{joined}" if joined else "/"
    if prefix:
        return f"{prefix}/{joined}" if joined else f"{prefix}/"
    return joined


def _is_relative_to(path: str, root: str) -> bool:
    return path == root or path.startswith(f"{root}/")


def _looks_absolute(path: str) -> bool:
    normalized = path.replace("\\", "/")
    return (
        len(normalized) >= 3
        and normalized[1] == ":"
        and normalized[2] == "/"
    ) or normalized.startswith("/")


def _contains_direct_mutation(value: Any) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            if key in {"state_mutation", "sqlite_path", "direct_state_write", "database_update"}:
                return True
            if key == "event_type" and item in DIRECT_WRITE_EVENT_TYPES:
                return True
            if _contains_direct_mutation(item):
                return True
    elif isinstance(value, list):
        return any(_contains_direct_mutation(item) for item in value)
    return False


def _missing_required_provenance(provenance: dict[str, Any]) -> bool:
    return any(not provenance.get(field) for field in ("execution_mode", "result_status", "evidence_id"))
