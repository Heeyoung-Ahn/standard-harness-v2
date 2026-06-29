"""Token budget policy."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.self_improvement.friction import RuntimeFrictionCapture


class TokenBudgetPolicy:
    def __init__(
        self,
        data: dict[str, Any],
        friction_capture: RuntimeFrictionCapture | None = None,
    ):
        self.data = data
        self.friction_capture = friction_capture

    @classmethod
    def from_repo(
        cls,
        repo_root: str | Path,
        friction_capture: RuntimeFrictionCapture | None = None,
    ) -> "TokenBudgetPolicy":
        path = Path(repo_root) / "_harness" / "policies" / "token-budget.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")), friction_capture=friction_capture)

    def budget_for(self, role: str) -> dict[str, Any]:
        max_tokens = int(self.data.get("roleBudgets", {}).get(role, self.data.get("defaultMaxTokens", 12000)))
        if max_tokens <= 0 and self.friction_capture is not None:
            self.friction_capture.context_token_budget_overrun(
                source_ref="context/budget.py::TokenBudgetPolicy.budget_for",
                evidence_ref=f"_ops/evidence/runtime-friction/context-budget-{role}.json",
                recurrence_key=f"context-budget:invalid-budget:{role}",
                idempotency_scope=f"budget_for:{role}",
            )
        return {"role": role, "maxTokens": max_tokens, "rules": self.data.get("rules", [])}


def estimate_tokens(
    items: list[dict[str, Any]],
    *,
    friction_capture: RuntimeFrictionCapture | None = None,
    source_ref: str = "context/budget.py::estimate_tokens",
    evidence_ref: str = "_ops/evidence/runtime-friction/context-token-estimate.json",
    max_tokens: int | None = None,
) -> int:
    estimate = sum(max(1, len(str(item.get("content", ""))) // 4) for item in items)
    if max_tokens is not None and estimate > max_tokens and friction_capture is not None:
        friction_capture.context_token_budget_overrun(
            source_ref=source_ref,
            evidence_ref=evidence_ref,
            recurrence_key=f"context-budget:token-overuse:{max_tokens}",
            idempotency_scope=f"{source_ref}:{max_tokens}",
        )
    return estimate
