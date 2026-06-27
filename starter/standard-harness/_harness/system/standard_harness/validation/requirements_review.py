"""Requirements applicability review validator."""

from __future__ import annotations

from typing import Any


class RequirementsReviewValidator:
    validator_id = "requirements-review-validator"
    gate_id = "requirements-review-gate"

    def evaluate(self, packet: dict[str, Any]) -> dict[str, Any]:
        review = packet.get("requirementsReview")
        diagnostics = []
        if not isinstance(review, dict) or review.get("status") not in {"PASS", "N/A_RECORDED"}:
            diagnostics.append("requirements_review_required")
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit requirements_review_required when blocked",
            "metricSignalBehavior": "emit requirements_review_count by status",
        }
