"""Token budget policy."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class TokenBudgetPolicy:
    def __init__(self, data: dict[str, Any]):
        self.data = data

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "TokenBudgetPolicy":
        path = Path(repo_root) / "_harness" / "policies" / "token-budget.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def budget_for(self, role: str) -> dict[str, Any]:
        max_tokens = int(self.data.get("roleBudgets", {}).get(role, self.data.get("defaultMaxTokens", 12000)))
        return {"role": role, "maxTokens": max_tokens, "rules": self.data.get("rules", [])}


def estimate_tokens(items: list[dict[str, Any]]) -> int:
    return sum(max(1, len(str(item.get("content", ""))) // 4) for item in items)
