"""Context token budget validator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.context.budget import TokenBudgetPolicy


class ContextBudgetValidator:
    validator_id = "context-budget-validator"
    gate_id = "context-budget-gate"

    def __init__(self, policy: TokenBudgetPolicy):
        self.policy = policy

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "ContextBudgetValidator":
        return cls(TokenBudgetPolicy.from_repo(repo_root))

    def validate(self, pack: dict[str, Any]) -> dict[str, Any]:
        role = str(pack.get("role", "developer"))
        budget = self.policy.budget_for(role)
        estimated = int(pack.get("estimatedTokens", 0))
        diagnostics = []
        if estimated > int(budget["maxTokens"]):
            diagnostics.append("context_budget_exceeded")
        if any(item.get("contentMode") == "full" and item.get("estimatedTokens", 0) > 4000 for item in pack.get("items", [])):
            diagnostics.append("large_file_not_summarized")
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "tokenBudget": budget,
            "frictionSignalBehavior": "emit context_budget_exceeded when blocked",
            "metricSignalBehavior": "emit context_budget_validation_count by role and status",
        }
