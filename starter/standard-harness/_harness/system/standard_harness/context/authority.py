"""Context authority labels."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.policy.zones import path_matches_any


class ContextAuthorityPolicy:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.tiers = data.get("tiers", [])
        self.default_tier = str(data.get("defaultTier", "untrusted-content"))

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "ContextAuthorityPolicy":
        path = Path(repo_root) / "_harness" / "policies" / "context-authority.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def label_item(self, item: dict[str, Any]) -> dict[str, Any]:
        path = str(item.get("path", ""))
        tier = self._tier_for_path(path)
        labelled = dict(item)
        labelled["authorityTier"] = tier["tier"]
        labelled["authorityRank"] = tier["rank"]
        labelled["mayInstruct"] = bool(tier.get("mayInstruct"))
        return labelled

    def evaluate_override(self, *, source: dict[str, Any], target: dict[str, Any]) -> dict[str, Any]:
        source_rank = self._rank(str(source.get("authorityTier", self.default_tier)))
        target_rank = self._rank(str(target.get("authorityTier", self.default_tier)))
        blocked = source_rank > target_rank
        return {
            "status": "blocked" if blocked else "pass",
            "diagnostic_ids": ["untrusted_authority_override"] if blocked else [],
        }

    def _tier_for_path(self, path: str) -> dict[str, Any]:
        for tier in self.tiers:
            if path_matches_any(path, [str(pattern) for pattern in tier.get("patterns", [])]):
                return {"tier": str(tier["tier"]), "rank": int(tier["rank"]), "mayInstruct": tier.get("mayInstruct", False)}
        return {"tier": self.default_tier, "rank": 99, "mayInstruct": False}

    def _rank(self, tier_name: str) -> int:
        for tier in self.tiers:
            if tier.get("tier") == tier_name:
                return int(tier.get("rank", 99))
        return 99
