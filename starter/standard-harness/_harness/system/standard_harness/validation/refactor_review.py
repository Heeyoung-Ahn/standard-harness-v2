"""Refactor and domain boundary review validator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.domain.boundaries import DomainBoundaryPolicy


class RefactorReviewValidator:
    validator_id = "refactor-review-validator"
    gate_id = "refactor-review-gate"

    def __init__(self, policy: DomainBoundaryPolicy):
        self.policy = policy

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "RefactorReviewValidator":
        return cls(DomainBoundaryPolicy.from_repo(repo_root))

    def evaluate(self, packet: dict[str, Any]) -> dict[str, Any]:
        change_areas = [str(item) for item in packet.get("changeAreas", [])]
        review = packet.get("refactorReview")
        diagnostics: list[str] = []
        if self.policy.requires_review(change_areas):
            diagnostics.append("domain_boundary_review_required")
        if not isinstance(review, dict) or not review.get("result"):
            diagnostics.append("refactor_review_required")
        else:
            result = str(review["result"])
            if result not in self.policy.allowed_refactor_results:
                diagnostics.append("invalid_refactor_review_result")
            if result == "FOLLOW_UP_REFACTOR_PACKET_REQUIRED" and not (
                review.get("followUpPacketId") or review.get("backlogItemId")
            ):
                diagnostics.append("missing_follow_up_refactor_packet")
            if result in self.policy.allowed_refactor_results:
                diagnostics = [item for item in diagnostics if item != "domain_boundary_review_required"]
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": sorted(set(diagnostics)),
            "releaseBlocking": bool(diagnostics),
            "frictionSignalBehavior": "emit refactor_review_required or domain_boundary_review_required when blocked",
            "metricSignalBehavior": "emit refactor_review_count by result and area",
        }
