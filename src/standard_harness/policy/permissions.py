"""Agent write permission policy."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.policy.zones import LogicalZonePolicy, path_matches_any


class AgentPermissionPolicy:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.roles = data.get("roles", {})

    @classmethod
    def load(cls, path: str | Path) -> "AgentPermissionPolicy":
        with Path(path).open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Agent permission policy must be a JSON object")
        return cls(data)

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "AgentPermissionPolicy":
        return cls.load(Path(repo_root) / "_harness" / "policies" / "agent-permissions.yaml")

    def allowed_write_patterns(
        self, role: str, zone_policy: LogicalZonePolicy
    ) -> list[str]:
        config = self.roles.get(role)
        if not isinstance(config, dict):
            return []
        patterns = [str(pattern) for pattern in config.get("allowedWriteZones", [])]
        logical_zones = [str(zone) for zone in config.get("allowedLogicalWriteZones", [])]
        patterns.extend(zone_policy.patterns_for_zones(logical_zones))
        return patterns

    def can_write_path(self, role: str, path: str, zone_policy: LogicalZonePolicy) -> bool:
        return path_matches_any(path, self.allowed_write_patterns(role, zone_policy))
