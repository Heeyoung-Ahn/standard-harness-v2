"""Security review trigger validator."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class SecurityReviewValidator:
    validator_id = "security-review-validator"
    gate_id = "security-review-gate"

    def __init__(self, hard_gate_triggers: set[str]):
        self.hard_gate_triggers = hard_gate_triggers

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "SecurityReviewValidator":
        path = Path(repo_root) / "_harness" / "policies" / "security-triggers.yaml"
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls({str(item) for item in data.get("hardGateTriggers", [])})

    def evaluate(self, packet: dict[str, Any]) -> dict[str, Any]:
        triggers = {str(item) for item in packet.get("triggers", [])}
        active = sorted(triggers.intersection(self.hard_gate_triggers))
        review = packet.get("securityReview")
        diagnostics: list[str] = []
        if active and not _accepted_review(review):
            diagnostics.append("security_review_required")
        elif not active and not _valid_na(review):
            diagnostics.append("security_review_na_missing")
        return {
            "status": "blocked" if diagnostics else "pass",
            "activeTriggers": active,
            "diagnostic_ids": diagnostics,
            "releaseBlocking": bool(active),
            "frictionSignalBehavior": "emit security_review_required when a triggered packet lacks review",
            "metricSignalBehavior": "emit security_review_gate_count by trigger",
        }


def _accepted_review(review: Any) -> bool:
    return isinstance(review, dict) and review.get("status") in {"PASS", "ACCEPTED", "N/A_RECORDED"}


def _valid_na(review: Any) -> bool:
    return isinstance(review, dict) and review.get("status") == "N/A_RECORDED" and review.get("allowedByRule")
