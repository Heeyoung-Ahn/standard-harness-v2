"""Adapter output envelope parser for event-request based integration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


REQUIRED_FIELDS = {
    "adapter_run_id",
    "input_snapshot_hash",
    "permission_roots",
    "artifact_manifest",
    "event_request",
    "failure_classification",
    "evidence_provenance",
}

FORBIDDEN_DIRECT_MUTATION_FIELDS = {
    "state_mutation",
    "sqlite_path",
    "direct_state_write",
    "database_update",
}


@dataclass(frozen=True)
class AdapterOutputEnvelope:
    adapter_run_id: str
    input_snapshot_hash: str
    permission_roots: list[str]
    artifact_manifest: list[dict[str, Any]]
    event_request: dict[str, Any]
    failure_classification: str | None
    evidence_provenance: dict[str, Any]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AdapterOutputEnvelope":
        forbidden = sorted(FORBIDDEN_DIRECT_MUTATION_FIELDS.intersection(data))
        if forbidden:
            raise ValueError(f"Adapter envelope requests direct state mutation: {', '.join(forbidden)}")
        missing = sorted(REQUIRED_FIELDS.difference(data))
        if missing:
            raise ValueError(f"Adapter envelope missing fields: {', '.join(missing)}")
        event_request = data["event_request"]
        if not isinstance(event_request, dict) or "event_type" not in event_request:
            raise ValueError("Adapter envelope must request an event with event_type")
        evidence_provenance = data["evidence_provenance"]
        if not isinstance(evidence_provenance, dict):
            raise ValueError("Adapter envelope evidence_provenance must be an object")
        return cls(
            adapter_run_id=_string(data, "adapter_run_id"),
            input_snapshot_hash=_string(data, "input_snapshot_hash"),
            permission_roots=_string_list(data, "permission_roots"),
            artifact_manifest=_object_list(data, "artifact_manifest"),
            event_request=event_request,
            failure_classification=data["failure_classification"],
            evidence_provenance=evidence_provenance,
        )

    def is_production_execution_evidence(self) -> bool:
        execution_mode = self.evidence_provenance.get("execution_mode")
        result_status = self.evidence_provenance.get("result_status")
        return execution_mode != "mock" and result_status == "passed"


def _string(data: dict[str, Any], field: str) -> str:
    value = data[field]
    if not isinstance(value, str) or not value:
        raise ValueError(f"Adapter envelope field must be a non-empty string: {field}")
    return value


def _string_list(data: dict[str, Any], field: str) -> list[str]:
    value = data[field]
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"Adapter envelope field must be a string list: {field}")
    return value


def _object_list(data: dict[str, Any], field: str) -> list[dict[str, Any]]:
    value = data[field]
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ValueError(f"Adapter envelope field must be an object list: {field}")
    return value
