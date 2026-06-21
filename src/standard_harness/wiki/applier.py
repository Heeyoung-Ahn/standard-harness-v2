"""Validated Wiki proposal applier."""

from __future__ import annotations

from pathlib import Path
from typing import Any


class WikiApplier:
    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def apply(self, proposal: dict[str, Any]) -> dict[str, Any]:
        if (
            proposal.get("validationStatus") != "validated"
            or proposal.get("validatedBy") != "wiki-proposal-validator"
        ):
            return {"status": "blocked", "diagnostic_ids": ["wiki_proposal_not_validated"]}
        target = Path(str(proposal.get("targetPage", "")))
        normalized = target.as_posix().lstrip("./")
        if not normalized.startswith("_ops/wiki/"):
            return {"status": "blocked", "diagnostic_ids": ["invalid_wiki_target"]}
        destination = self.repo_root / normalized
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(str(proposal.get("content", "")), encoding="utf-8")
        return {
            "status": "applied",
            "targetPage": normalized,
            "diagnostic_ids": [],
            "frictionSignalBehavior": "emit docs_drift if apply target is invalid or proposal is unvalidated",
            "metricSignalBehavior": "emit wiki_apply_count by page",
        }
