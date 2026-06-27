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
TRUSTED_CI_PRODUCERS = {"github-actions", "trusted-ci"}


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
        if evidence.get("validation_status") != "STRUCTURALLY_VALID":
            return False
        trust_status = evidence.get("trust_status")
        if trust_status == "TRUSTED_CI":
            return (
                evidence.get("produced_via") == "trusted-ci"
                and evidence.get("producer_provider") in TRUSTED_CI_PRODUCERS
                and bool(evidence.get("base_commit"))
                and bool(evidence.get("head_commit"))
                and bool(evidence.get("workspace_id"))
            )
        if trust_status == "REPRODUCED_BY_HARNESS":
            return (
                evidence.get("produced_via") == "harness-reproduction"
                and bool(evidence.get("base_commit"))
                and bool(evidence.get("head_commit"))
                and bool(evidence.get("workspace_id"))
            )
        if trust_status == "MANUAL_ACCEPTED_BY_HUMAN":
            return evidence.get("produced_via") == "human-accepted-manual"
        return False

    def is_manual_only(self, evidence: dict[str, Any]) -> bool:
        return evidence.get("trust_status") == "MANUAL_ONLY"
