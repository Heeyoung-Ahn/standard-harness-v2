"""Validator catalog."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ValidatorCatalog:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.validators = data.get("validators", [])

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "ValidatorCatalog":
        path = Path(repo_root) / "_harness" / "policies" / "validator-catalog.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def validators_for_hr(self, hr_id: str) -> list[dict[str, Any]]:
        return [item for item in self.validators if hr_id in item.get("hrIds", [])]

    def gate_metadata_for_hr(self, hr_id: str) -> list[dict[str, Any]]:
        return [
            item["gateResultMetadata"]
            for item in self.validators_for_hr(hr_id)
            if item.get("gateResultMetadata")
        ]
