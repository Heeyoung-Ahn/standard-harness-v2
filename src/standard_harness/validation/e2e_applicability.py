"""E2E applicability gate."""

from __future__ import annotations

from typing import Any


E2E_REQUIRED_TYPES = {"ui", "auth", "authorization", "routing", "core-user-flow"}
SMOKE_OR_CONTRACT_TYPES = {"api-internal-refactor", "api-refactor"}
VALID_APPLICABILITY = {
    "E2E_REQUIRED",
    "E2E_SMOKE_REQUIRED",
    "E2E_NOT_APPLICABLE_WITH_RATIONALE",
}


class E2EApplicabilityValidator:
    validator_id = "e2e-applicability-validator"
    gate_id = "e2e-applicability-gate"

    def evaluate(self, packet: dict[str, Any]) -> dict[str, Any]:
        change_types = {str(item) for item in packet.get("changeTypes", [])}
        required = self.required_applicability(change_types)
        actual = packet.get("e2eApplicability")
        diagnostics: list[str] = []
        if actual not in VALID_APPLICABILITY:
            diagnostics.append("missing_e2e_applicability")
        elif required == "E2E_REQUIRED" and actual != "E2E_REQUIRED":
            diagnostics.append("e2e_required")
        elif required == "E2E_SMOKE_REQUIRED" and actual not in {"E2E_REQUIRED", "E2E_SMOKE_REQUIRED"}:
            diagnostics.append("e2e_smoke_required")
        elif actual == "E2E_NOT_APPLICABLE_WITH_RATIONALE" and not _valid_na(packet.get("naDecision")):
            diagnostics.append("invalid_e2e_na_decision")
        return {
            "status": "blocked" if diagnostics else "pass",
            "requiredApplicability": required,
            "diagnostic_ids": diagnostics,
            "releaseBlocking": bool(diagnostics),
            "frictionSignalBehavior": "emit missing_e2e_applicability or invalid_e2e_na_decision when blocked",
            "metricSignalBehavior": "emit e2e_applicability_count by required applicability",
        }

    def required_applicability(self, change_types: set[str]) -> str:
        if change_types.intersection(E2E_REQUIRED_TYPES):
            return "E2E_REQUIRED"
        if change_types.intersection(SMOKE_OR_CONTRACT_TYPES):
            return "E2E_SMOKE_REQUIRED"
        return "E2E_NOT_APPLICABLE_WITH_RATIONALE"


def _valid_na(na_decision: Any) -> bool:
    return (
        isinstance(na_decision, dict)
        and bool(na_decision.get("allowedByRule"))
        and bool(na_decision.get("rationale"))
        and bool(na_decision.get("substituteChecks"))
    )
