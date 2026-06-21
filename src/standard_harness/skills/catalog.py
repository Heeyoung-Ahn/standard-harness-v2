"""V2-native skill catalog."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class SkillCatalog:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.by_id = {skill["id"]: skill for skill in data.get("skills", [])}

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "SkillCatalog":
        path = Path(repo_root) / "_harness" / "catalog" / "skill-catalog.yaml"
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def get(self, skill_id: str) -> dict[str, Any]:
        return self.by_id[skill_id]

    def find_for_task(self, task_type: str) -> dict[str, Any] | None:
        for skill in self.by_id.values():
            if task_type in skill.get("taskTypes", []):
                return skill
        return None
