"""Gate profile policy for packet-type-specific validator applicability."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class GateProfilePolicy:
    def __init__(self, policy: dict[str, Any]):
        self.policy = policy

    @classmethod
    def load(cls, repo_root: Path | str | None = None) -> "GateProfilePolicy":
        root = Path(repo_root) if repo_root is not None else Path.cwd()
        path = root / "_harness" / "policies" / "gate-profiles.yaml"
        if not path.exists() and root != Path.cwd():
            path = Path.cwd() / "_harness" / "policies" / "gate-profiles.yaml"
        with path.open(encoding="utf-8") as handle:
            policy = json.load(handle)
        return cls(policy)

    def packet_types(self) -> list[str]:
        return sorted(self.policy.get("packetTypes", {}).keys())

    def profile_version(self, packet_type: str) -> str:
        return str(self._packet_profile(packet_type)["version"])

    def required_gate_ids(self, packet_type: str) -> list[str]:
        return list(self._packet_profile(packet_type)["requiredGates"])

    def rule_allows_na(self, rule_id: str, *, packet_type: str, gate: str) -> bool:
        rule = self.policy.get("naRules", {}).get(rule_id)
        if not isinstance(rule, dict):
            return False
        return packet_type in rule.get("packetTypes", []) and gate in rule.get("gates", [])

    def required_substitute_checks(self, rule_id: str) -> list[str]:
        rule = self.policy.get("naRules", {}).get(rule_id, {})
        return list(rule.get("requiredSubstituteChecks", []))

    def cannot_be_used_when(self, rule_id: str) -> list[str]:
        rule = self.policy.get("naRules", {}).get(rule_id, {})
        return list(rule.get("cannotBeUsedWhen", []))

    def _packet_profile(self, packet_type: str) -> dict[str, Any]:
        packet_types = self.policy.get("packetTypes", {})
        if packet_type not in packet_types:
            raise KeyError(f"Unknown packet type: {packet_type}")
        return dict(packet_types[packet_type])
