"""Sensitive evidence promotion validator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.security.evidence_classification import EvidenceClassificationPolicy


class SensitiveEvidenceValidator:
    validator_id = "sensitive-evidence-validator"
    gate_id = "sensitive-evidence-gate"

    def __init__(self, policy: EvidenceClassificationPolicy):
        self.policy = policy

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "SensitiveEvidenceValidator":
        return cls(EvidenceClassificationPolicy.from_repo(repo_root))

    def validate_promotion(self, evidence: dict[str, Any], *, target: str) -> dict[str, Any]:
        classification = str(evidence.get("classification", "INTERNAL"))
        diagnostics: list[str] = []
        if target == "wiki" and not self.policy.can_promote_to_wiki(classification):
            diagnostics.append("sensitive_wiki_promotion")
        if target == "handoff" and not self.policy.can_include_in_handoff(classification):
            diagnostics.append("secret_evidence_registered")
        if target == "handoff" and classification == "SENSITIVE":
            diagnostics.append("sensitive_handoff_requires_redaction")
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit sensitive_wiki_promotion when classified evidence blocks promotion",
            "metricSignalBehavior": "emit sensitive_evidence_validation_count by target and classification",
        }
