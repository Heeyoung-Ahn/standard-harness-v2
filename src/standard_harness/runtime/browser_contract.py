"""Browser functional evidence contract validation."""

from __future__ import annotations

from typing import Any


REQUIRED_FIELDS = (
    "scenario_id",
    "preconditions",
    "user_actions",
    "expected_assertions",
    "actual_assertions",
    "data_runtime_side_effects",
    "browser_tool_identity",
    "viewport",
    "artifacts_captured",
    "result_status",
    "residual_gap",
)


class BrowserEvidenceContract:
    @staticmethod
    def validate(record: dict[str, Any]) -> dict[str, Any]:
        diagnostics = _missing_fields(record, REQUIRED_FIELDS)
        if not record.get("expected_assertions"):
            diagnostics.append("missing_expected_assertions")
        if not record.get("actual_assertions"):
            diagnostics.append("missing_actual_assertions")
        viewport = record.get("viewport")
        if not isinstance(viewport, dict) or not viewport.get("width") or not viewport.get("height"):
            diagnostics.append("missing_viewport")
        return _result("browser_functional", record, diagnostics)


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

