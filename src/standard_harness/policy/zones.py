"""Logical repository zone policy."""

from __future__ import annotations

import fnmatch
import json
from pathlib import Path
from typing import Any


PRODUCT_PACKET_TYPES = {"product-feature", "product-bugfix", "product-refactor", "docs-only"}


class LogicalZonePolicy:
    def __init__(self, data: dict[str, Any]):
        self.data = data
        self.zones = {
            str(zone): [str(pattern) for pattern in patterns]
            for zone, patterns in data.get("zones", {}).items()
            if isinstance(patterns, list)
        }
        self.packet_type_rules = data.get("packetTypeRules", {})

    @classmethod
    def load(cls, path: str | Path) -> "LogicalZonePolicy":
        with Path(path).open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Logical zone policy must be a JSON object")
        return cls(data)

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "LogicalZonePolicy":
        return cls.load(Path(repo_root) / "_harness" / "policies" / "zones.yaml")

    def zone_for_path(self, path: str) -> str | None:
        for zone, patterns in self.zones.items():
            if path_matches_any(path, patterns):
                return zone
        return None

    def patterns_for_zones(self, zones: list[str]) -> list[str]:
        patterns: list[str] = []
        for zone in zones:
            if zone in self.zones:
                patterns.extend(self.zones[zone])
            else:
                patterns.append(zone)
        return patterns

    def allowed_write_patterns_for(self, packet_type: str) -> list[str]:
        rule = self._rule_for(packet_type)
        logical_zones = [str(zone) for zone in rule.get("allowedLogicalWriteZones", [])]
        return self.patterns_for_zones(logical_zones)

    def forbidden_write_zones_for(self, packet_type: str) -> list[str]:
        rule = self._rule_for(packet_type)
        return [str(pattern) for pattern in rule.get("forbiddenWriteZones", [])]

    def is_product_packet(self, packet_type: str) -> bool:
        return packet_type in PRODUCT_PACKET_TYPES

    def _rule_for(self, packet_type: str) -> dict[str, Any]:
        rule = self.packet_type_rules.get(packet_type)
        if isinstance(rule, dict):
            return rule
        return self.packet_type_rules.get("docs-only", {})


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").strip().lstrip("./")


def path_matches_any(path: str, patterns: list[str]) -> bool:
    normalized = normalize_path(path)
    return any(path_matches(normalized, pattern) for pattern in patterns)


def path_matches(path: str, pattern: str) -> bool:
    normalized = normalize_path(path)
    normalized_pattern = normalize_path(pattern)
    if normalized_pattern.endswith("/**"):
        prefix = normalized_pattern[:-3].rstrip("/")
        return normalized == prefix or normalized.startswith(f"{prefix}/")
    if normalized_pattern.endswith("/"):
        prefix = normalized_pattern.rstrip("/")
        return normalized == prefix or normalized.startswith(f"{prefix}/")
    if not any(token in normalized_pattern for token in ("*", "?", "[")):
        return normalized == normalized_pattern or normalized.startswith(f"{normalized_pattern}/")
    return fnmatch.fnmatchcase(normalized, normalized_pattern)
