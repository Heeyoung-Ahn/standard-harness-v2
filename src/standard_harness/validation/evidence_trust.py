"""Evidence trust validator."""

from __future__ import annotations

from typing import Any

from standard_harness.evidence.trust import EvidenceTrustPolicy


TRUSTED_EVIDENCE_REQUIREMENTS = {"trusted-test-evidence"}
TRUSTED_CLOSEOUT_CRITERIA = {"trusted-evidence"}


def packet_requires_trusted_evidence(packet: dict[str, Any]) -> bool:
    evidence_requirements = {
        str(requirement) for requirement in packet.get("evidence_requirements", [])
    }
    closeout_criteria = {str(criterion) for criterion in packet.get("closeout_criteria", [])}
    return bool(
        evidence_requirements.intersection(TRUSTED_EVIDENCE_REQUIREMENTS)
        or closeout_criteria.intersection(TRUSTED_CLOSEOUT_CRITERIA)
    )


class EvidenceTrustValidator:
    def __init__(self):
        self.policy = EvidenceTrustPolicy()

    def validate(self, evidence: dict[str, Any]) -> dict[str, Any]:
        diagnostics: list[str] = []
        if evidence.get("validation_status") != "STRUCTURALLY_VALID":
            diagnostics.append("invalid_evidence_validation_status")
        if self.policy.is_manual_only(evidence):
            diagnostics.append("manual_only_evidence")
        if not self.policy.can_closeout(evidence):
            diagnostics.append("missing_trusted_evidence")
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit missing_evidence when blocked",
            "metricSignalBehavior": "emit evidence_trust_validated count",
        }
