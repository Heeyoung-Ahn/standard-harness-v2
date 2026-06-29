"""Human decision validation with HR-152 non-overridable limits."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.self_improvement.friction import RuntimeFrictionCapture


class HumanDecisionValidator:
    def __init__(
        self,
        non_overridable_items: set[str],
        friction_capture: RuntimeFrictionCapture | None = None,
    ):
        self.non_overridable_items = non_overridable_items
        self.friction_capture = friction_capture

    @classmethod
    def load(
        cls,
        repo_root: Path | str | None = None,
        friction_capture: RuntimeFrictionCapture | None = None,
    ) -> "HumanDecisionValidator":
        root = Path(repo_root) if repo_root is not None else Path.cwd()
        path = root / "_harness" / "policies" / "p0-policy.yaml"
        if not path.exists() and root != Path.cwd():
            path = Path.cwd() / "_harness" / "policies" / "p0-policy.yaml"
        with path.open(encoding="utf-8") as handle:
            policy = json.load(handle)
        return cls(set(policy.get("nonOverridable", [])), friction_capture=friction_capture)

    def validate(self, decision: dict[str, Any]) -> dict[str, Any]:
        diagnostics: list[str] = []
        required_fields = [
            "decisionId",
            "packetId",
            "gate",
            "decisionType",
            "rationale",
            "acceptedRisk",
            "approver",
            "expiresAt",
            "followUpPacketRequired",
            "followUpPacketId",
        ]
        for field in required_fields:
            if field not in decision:
                _add(diagnostics, "invalid_human_decision")
        requested_overrides = set(decision.get("requestedOverrides", []))
        blocked_items = sorted(requested_overrides.intersection(self.non_overridable_items))
        if blocked_items:
            _add(diagnostics, "non_overridable_override")
        if decision.get("followUpPacketRequired") is True and not decision.get("followUpPacketId"):
            _add(diagnostics, "missing_follow_up_packet")
        if diagnostics and self.friction_capture is not None:
            self.friction_capture.authority_boundary_violation(
                source_ref="validation/human_decision.py::HumanDecisionValidator.validate",
                evidence_ref=f"_ops/evidence/runtime-friction/human-decision-{decision.get('decisionId') or 'unknown'}.json",
                recurrence_key=f"authority-boundary:{diagnostics[0]}",
                idempotency_scope=f"human-decision:{decision.get('decisionId') or diagnostics[0]}",
            )
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "nonOverridableItems": blocked_items,
            "frictionSignalBehavior": "emit unsafe_user_instruction_conflict when blocked",
            "metricSignalBehavior": "emit human_decision_validated count",
        }


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
