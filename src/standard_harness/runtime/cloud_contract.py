"""Cloud runtime evidence contract validation."""

from __future__ import annotations

from typing import Any


REQUIRED_FIELDS = (
    "project",
    "account",
    "region",
    "identity",
    "command",
    "artifact_manifest",
    "failure_class",
)


class CloudEvidenceContract:
    @staticmethod
    def validate(record: dict[str, Any]) -> dict[str, Any]:
        diagnostics = _missing_fields(record, REQUIRED_FIELDS)
        if not isinstance(record.get("artifact_manifest"), list) or not record.get(
            "artifact_manifest"
        ):
            diagnostics.append("missing_artifact_manifest")
        return _result("cloud_execution", record, diagnostics)


def _missing_fields(record: dict[str, Any], fields: tuple[str, ...]) -> list[str]:
    return [f"missing_{field}" for field in fields if not record.get(field)]


def _result(profile_id: str, record: dict[str, Any], diagnostics: list[str]) -> dict[str, Any]:
    payload = {
        "status": "valid" if not diagnostics else "blocked",
        "profile_id": profile_id,
        "diagnostic_codes": sorted(set(diagnostics)),
    }
    if not diagnostics:
        payload["record"] = dict(record)
    return payload

