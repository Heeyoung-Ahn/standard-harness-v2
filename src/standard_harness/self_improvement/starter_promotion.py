"""Starter promotion candidate registry."""

from __future__ import annotations

from typing import Any


class StarterPromotionCandidateRegistry:
    def register(self, candidate: dict[str, Any]) -> dict[str, Any]:
        candidate = dict(candidate)
        if candidate.get("sourceImprovementId") and not candidate.get("source"):
            candidate.update(
                {
                    "sourceXp": candidate.get("sourceXp", "XP-09"),
                    "source": {"type": "friction", "id": candidate["sourceImprovementId"]},
                    "proposedChange": candidate.get("proposedChange")
                    or candidate.get("promotionRationale", ""),
                    "expectedBenefit": candidate.get("expectedBenefit")
                    or candidate.get("promotionRationale", ""),
                    "risk": candidate.get("risk", "unknown"),
                    "requiresHarnessPacket": candidate.get("requiresHarnessPacket", True),
                    "promotionStatus": candidate.get("promotionStatus", "proposed"),
                }
            )
        diagnostics = []
        required = (
            "candidateId",
            "sourceXp",
            "source",
            "proposedChange",
            "expectedBenefit",
            "risk",
            "requiresHarnessPacket",
            "promotionStatus",
        )
        for field in required:
            if not candidate.get(field):
                diagnostics.append("invalid_starter_promotion_candidate")
        if candidate.get("requiresHarnessPacket") is not True:
            diagnostics.append("invalid_starter_promotion_candidate")
        source = candidate.get("source")
        if not isinstance(source, dict) or source.get("type") not in {
            "friction",
            "metric",
            "harness-packet-closeout",
        } or not source.get("id"):
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
