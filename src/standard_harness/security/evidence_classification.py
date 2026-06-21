"""Evidence classification and promotion policy."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from standard_harness.security.redaction import EvidenceRedactor


SENSITIVE_PATTERNS = [
    re.compile(r"(?i)\b(password|passwd|credential|private[_-]?key)\b"),
    re.compile(r"(?i)\b(ssn|social security|personal[_ -]?data)\b"),
]


class EvidenceClassificationPolicy:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.classifications = [str(item) for item in data.get("classifications", [])]
        self.default_classification = str(
            data.get("defaults", {}).get("classification", "INTERNAL")
        )

    @classmethod
    def load(cls, path: str | Path) -> "EvidenceClassificationPolicy":
        with Path(path).open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Evidence classification policy must be a JSON object")
        return cls(data)

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "EvidenceClassificationPolicy":
        return cls.load(Path(repo_root) / "_harness" / "policies" / "evidence-classification.yaml")

    def can_promote_to_wiki(self, classification: str) -> bool:
        return bool(self._promotion_rule(classification).get("wikiPromotionAllowed"))

    def can_include_in_handoff(self, classification: str) -> bool:
        return bool(self._promotion_rule(classification).get("handoffAllowed"))

    def registration_blocked(self, classification: str) -> bool:
        rule = self.data.get("registrationRules", {}).get(classification, {})
        return bool(rule.get("blocked"))

    def registration_diagnostic(self, classification: str) -> str:
        rule = self.data.get("registrationRules", {}).get(classification, {})
        return str(rule.get("diagnostic", "secret_evidence_registered"))

    def _promotion_rule(self, classification: str) -> dict[str, Any]:
        rule = self.data.get("promotionRules", {}).get(classification, {})
        return rule if isinstance(rule, dict) else {}


class EvidenceClassifier:
    def __init__(self, policy: EvidenceClassificationPolicy):
        self.policy = policy
        self.redactor = EvidenceRedactor()

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "EvidenceClassifier":
        return cls(EvidenceClassificationPolicy.from_repo(repo_root))

    def classify(self, *, content: str, artifact_path: str) -> dict[str, Any]:
        classification = self.policy.default_classification
        diagnostic_ids: list[str] = []
        redaction = self.redactor.redact(content)
        normalized_path = artifact_path.replace("\\", "/").lower()
        if redaction["redaction_count"] or _secret_path(normalized_path):
            classification = "SECRET"
            diagnostic_ids.append("secret_evidence_registered")
        elif any(pattern.search(content) for pattern in SENSITIVE_PATTERNS):
            classification = "SENSITIVE"
        return {
            "classification": classification,
            "diagnostic_ids": diagnostic_ids,
            "redaction_count": redaction["redaction_count"],
            "wikiPromotionAllowed": self.policy.can_promote_to_wiki(classification),
            "handoffAllowed": self.policy.can_include_in_handoff(classification),
            "frictionSignalBehavior": "emit secret_evidence_registered or sensitive_wiki_promotion when blocked",
            "metricSignalBehavior": "emit evidence_classification_count by classification and target",
        }


def _secret_path(path: str) -> bool:
    name = Path(path).name.lower()
    return name in {".env", ".env.local"} or "secret" in path or "api_key" in path
