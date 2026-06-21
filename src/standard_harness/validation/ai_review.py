"""AI review support validator."""

from __future__ import annotations

from typing import Any


class AIReviewValidator:
    validator_id = "ai-review-validator"
    gate_id = "ai-review-gate"

    def evaluate(self, packet: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        ai_review = packet.get("aiReview")
        deterministic_evidence = packet.get("deterministicEvidence")
        if ai_review and not deterministic_evidence:
            diagnostics.append("ai_review_cannot_replace_deterministic_evidence")
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit ai_review_cannot_replace_deterministic_evidence when blocked",
            "metricSignalBehavior": "emit ai_review_validation_count by status",
        }
