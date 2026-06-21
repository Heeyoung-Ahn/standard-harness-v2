"""Starter promotion candidate registry."""

from __future__ import annotations

from typing import Any


class StarterPromotionCandidateRegistry:
    def register(self, candidate: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        for field in ("candidateId", "sourceImprovementId", "promotionRationale"):
            if not candidate.get(field):
                diagnostics.append("invalid_starter_promotion_candidate")
        if not candidate.get("evidenceIds"):
            diagnostics.append("missing_starter_promotion_evidence")
        return {
            "status": "blocked" if diagnostics else "registered",
            "candidate": candidate,
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit missing_starter_promotion_evidence when blocked",
            "metricSignalBehavior": "emit starter_promotion_candidate_count by status",
        }
