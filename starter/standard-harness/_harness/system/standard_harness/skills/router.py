"""Skill router."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.skills.catalog import SkillCatalog


class SkillRouter:
    def __init__(self, catalog: SkillCatalog):
        self.catalog = catalog

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "SkillRouter":
        return cls(SkillCatalog.from_repo(repo_root))

    def route(self, *, task_type: str, role: str) -> dict[str, Any]:
        skill = self.catalog.find_for_task(task_type)
        if skill is None:
            return {
                "status": "blocked",
                "taskType": task_type,
                "role": role,
                "selectedBy": "skill-router",
                "evidenceRequired": True,
                "bypassesP0Gate": False,
                "p0Boundary": "preserved",
                "diagnostic_ids": ["unknown_required_skill", "required_skill_not_cataloged"],
            }
        allowed = skill.get("permissionScope", {}).get("allowedWriteZones", [])
        return {
            "status": "selected",
            "taskType": task_type,
            "role": role,
            "requiredSkill": skill["id"],
            "selectedBy": "skill-router",
            "evidenceRequired": bool(skill.get("evidenceContract", {}).get("required")),
            "allowedWriteZones": allowed,
            "fallbackBehavior": skill.get("fallbackBehavior"),
            "evidenceContract": skill.get("evidenceContract", {}),
            "bypassesP0Gate": False,
            "p0Boundary": "preserved",
            "diagnostic_ids": [],
        }
