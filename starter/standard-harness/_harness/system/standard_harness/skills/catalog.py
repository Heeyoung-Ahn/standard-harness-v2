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

    @classmethod
    def minimum_required_from_repo(cls, repo_root: str | Path) -> list[str]:
        path = Path(repo_root) / "_harness" / "catalog" / "minimum-required-skills.yaml"
        data = json.loads(path.read_text(encoding="utf-8"))
        return [skill["id"] for skill in data.get("skills", [])]

    def get(self, skill_id: str) -> dict[str, Any]:
        return self.by_id[skill_id]

    def find_for_task(self, task_type: str) -> dict[str, Any] | None:
        matches = self.find_all_for_task(task_type)
        return matches[0] if matches else None

    def find_all_for_task(self, task_type: str | None) -> list[dict[str, Any]]:
        if not task_type:
            return []
        matches: list[dict[str, Any]] = []
        for skill in self.by_id.values():
            if task_type in skill.get("taskTypes", []):
                matches.append(skill)
        return matches

    def match_intent(self, intent_text: str) -> list[dict[str, Any]]:
        normalized = f" {intent_text.lower()} "
        matches: list[dict[str, Any]] = []
        for skill in self.by_id.values():
            keywords = [str(item).lower() for item in skill.get("triggerKeywords", [])]
            if any(keyword and keyword in normalized for keyword in keywords):
                matches.append(skill)
        return matches

    def validate_contract(self) -> list[str]:
        diagnostics: list[str] = []
        seen_keywords: dict[str, str] = {}
        for skill in self.by_id.values():
            skill_id = str(skill.get("id", ""))
            trigger = str(skill.get("triggerDescription", ""))
            if trigger and not trigger.lower().startswith("use when"):
                diagnostics.append(f"non_trigger_description:{skill_id}")
            for raw_keyword in skill.get("triggerKeywords", []):
                keyword = str(raw_keyword).strip().lower()
                if not keyword:
                    continue
                if keyword in seen_keywords and seen_keywords[keyword] != skill_id:
                    diagnostics.append(f"duplicate_trigger_keyword:{keyword}")
                else:
                    seen_keywords[keyword] = skill_id
        return sorted(set(diagnostics))
