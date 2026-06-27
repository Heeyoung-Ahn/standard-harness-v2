"""Adapter manifest parser for the MVP adapter boundary."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


REQUIRED_FIELDS = {
    "adapter_id",
    "adapter_version",
    "supported_roles",
    "execution_modes",
    "evidence_modes",
    "read_write_capability",
    "artifact_export_capability",
    "permission_roots",
    "known_limitations",
    "failure_modes",
}


@dataclass(frozen=True)
class AdapterManifest:
    adapter_id: str
    adapter_version: str
    supported_roles: list[str]
    execution_modes: list[str]
    evidence_modes: list[str]
    read_write_capability: str
    artifact_export_capability: str
    permission_roots: list[str]
    known_limitations: list[str]
    failure_modes: list[str]
    provider: str | None = None
    capabilities: dict[str, Any] | None = None
    restricted_write_zones: list[str] | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AdapterManifest":
        missing = sorted(REQUIRED_FIELDS.difference(data))
        if missing:
            raise ValueError(f"Adapter manifest missing fields: {', '.join(missing)}")
        return cls(
            adapter_id=_string(data, "adapter_id"),
            adapter_version=_string(data, "adapter_version"),
            supported_roles=_string_list(data, "supported_roles"),
            execution_modes=_string_list(data, "execution_modes"),
            evidence_modes=_string_list(data, "evidence_modes"),
            read_write_capability=_string(data, "read_write_capability"),
            artifact_export_capability=_string(data, "artifact_export_capability"),
            permission_roots=_string_list(data, "permission_roots"),
            known_limitations=_string_list(data, "known_limitations"),
            failure_modes=_string_list(data, "failure_modes"),
            provider=data.get("provider"),
            capabilities=data.get("capabilities"),
            restricted_write_zones=data.get("restricted_write_zones"),
        )


def _string(data: dict[str, Any], field: str) -> str:
    value = data[field]
    if not isinstance(value, str) or not value:
        raise ValueError(f"Adapter manifest field must be a non-empty string: {field}")
    return value


def _string_list(data: dict[str, Any], field: str) -> list[str]:
    value = data[field]
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"Adapter manifest field must be a string list: {field}")
    return value
