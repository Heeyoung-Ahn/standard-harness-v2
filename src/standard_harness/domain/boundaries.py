"""Domain boundary policy."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class DomainBoundaryPolicy:
    def __init__(self, data: dict[str, Any]):
        self.review_required_areas = {str(item) for item in data.get("reviewRequiredAreas", [])}
        self.allowed_refactor_results = {str(item) for item in data.get("allowedRefactorResults", [])}

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "DomainBoundaryPolicy":
        path = Path(repo_root) / "_harness" / "policies" / "domain-boundaries.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def requires_review(self, change_areas: list[str]) -> bool:
        return bool({str(item) for item in change_areas}.intersection(self.review_required_areas))
