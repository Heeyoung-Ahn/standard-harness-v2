"""Runtime evidence policy for claim/profile matching."""

from __future__ import annotations

from typing import Any

from standard_harness.evidence.profiles import EvidenceProfileCatalog


REQUIRED_BY_CLAIM_TYPE = {
    "browser_workflow": {"browser_functional"},
    "functional_ui": {"browser_functional"},
    "runtime_persistence": {"db_runtime_persistence"},
    "api_behavior": {"api_runtime"},
}
HIGH_RISK_CLASSES = {"high", "critical"}


class RuntimeEvidencePolicy:
    """Check whether runtime evidence profiles can close a claim."""

    def __init__(self):
        self.catalog = EvidenceProfileCatalog()

    def evaluate_claim(
        self,
        *,
        claim_type: str,
        risk_class: str,
        evidence_profiles: list[str],
        substitute_decision_id: str | None = None,
        substitute_authority: str | None = None,
    ) -> dict[str, Any]:
        for profile_id in evidence_profiles:
            self.catalog.get(profile_id)
        provided = set(evidence_profiles)
        diagnostics: list[str] = []

        required = REQUIRED_BY_CLAIM_TYPE.get(claim_type, set())
        missing = required - provided
        authorized_substitute = bool(substitute_decision_id and substitute_authority)
        if not (missing and "substitute_evidence" in provided and authorized_substitute):
            for profile_id in sorted(missing):
                diagnostics.append(_missing_profile_code(profile_id))

        if (
            risk_class in HIGH_RISK_CLASSES
            and provided == {"substitute_evidence"}
            and not authorized_substitute
        ):
            diagnostics.append("missing_authorized_substitute_decision")

        return {
            "status": "accepted" if not diagnostics else "blocked",
            "claim_type": claim_type,
            "risk_class": risk_class,
            "evidence_profiles": evidence_profiles,
            "diagnostic_codes": diagnostics,
            "substitute_decision_id": substitute_decision_id,
            "substitute_authority": substitute_authority,
        }


def _missing_profile_code(profile_id: str) -> str:
    if profile_id == "browser_functional":
        return "missing_browser_functional"
    if profile_id == "db_runtime_persistence":
        return "missing_db_runtime_persistence"
    return f"missing_{profile_id}"
