"""Evidence trust policy for XP-02."""

from __future__ import annotations

from typing import Any


TRUST_STATUSES = {
    "RECORDED",
    "STRUCTURALLY_VALID",
    "CLAIM_LINKED",
    "REPRODUCED_BY_HARNESS",
    "TRUSTED_CI",
    "MANUAL_ONLY",
    "MANUAL_ACCEPTED_BY_HUMAN",
    "STALE",
    "INVALID",
}
VALIDATION_STATUSES = {"RECORDED", "STRUCTURALLY_VALID", "STALE", "INVALID"}
CLOSEOUT_TRUST_STATUSES = {
    "REPRODUCED_BY_HARNESS",
    "TRUSTED_CI",
    "MANUAL_ACCEPTED_BY_HUMAN",
}


class EvidenceTrustPolicy:
    def derive_validation_status(self, result_status: str) -> str:
        if result_status == "passed":
            return "STRUCTURALLY_VALID"
        if result_status == "stale":
            return "STALE"
        if result_status in {"failed", "blocked"}:
            return "INVALID"
        return "RECORDED"

    def derive_trust_status(
        self,
        *,
        result_status: str,
        produced_via: str,
        base_commit: str | None,
        head_commit: str | None,
        workspace_id: str | None,
    ) -> str:
        if result_status != "passed":
            return self.derive_validation_status(result_status)
        if produced_via == "harness-reproduction" and base_commit and head_commit and workspace_id:
            return "REPRODUCED_BY_HARNESS"
        if produced_via == "trusted-ci" and base_commit and head_commit and workspace_id:
            return "TRUSTED_CI"
        if produced_via == "human-accepted-manual":
            return "MANUAL_ACCEPTED_BY_HUMAN"
        return "MANUAL_ONLY"

    def can_closeout(self, evidence: dict[str, Any]) -> bool:
        return (
            evidence.get("validation_status") == "STRUCTURALLY_VALID"
            and evidence.get("trust_status") in CLOSEOUT_TRUST_STATUSES
        )

    def is_manual_only(self, evidence: dict[str, Any]) -> bool:
        return evidence.get("trust_status") == "MANUAL_ONLY"
