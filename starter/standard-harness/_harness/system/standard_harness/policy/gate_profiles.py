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

    def normalize_risk_level(self, risk_level: str | None) -> str:
        normalized = _normalize_token(risk_level or "standard")
        aliases = {
            _normalize_token(key): _normalize_token(value)
            for key, value in self.policy.get("riskAliases", {}).items()
        }
        normalized = aliases.get(normalized, normalized)
        if normalized not in {"low", "standard", "high", "critical"}:
            return "standard"
        return normalized

    def resolve_required_gates(
        self,
        *,
        packet_type: str,
        risk_level: str = "standard",
        changed_zones: list[str] | None = None,
        claims: list[str] | None = None,
        release_sensitive: bool = False,
        browser_facing: bool = False,
        security_sensitive: bool = False,
        data_sensitive: bool = False,
        harness_system: bool = False,
        starter_promotion: bool = False,
    ) -> dict[str, Any]:
        packet_type_id = _normalize_token(packet_type)
        packet_profile = self._packet_profile(packet_type_id)
        overlays = {
            _normalize_token(item)
            for item in [*(changed_zones or []), *(claims or [])]
            if _normalize_token(item)
        }
        if release_sensitive:
            overlays.add("release-sensitive")
        if browser_facing:
            overlays.add("browser-facing")
        if security_sensitive:
            overlays.add("security-sensitive")
        if data_sensitive:
            overlays.add("data-sensitive")
        if harness_system or packet_type_id == "harness-system":
            overlays.add("harness-system")
        if starter_promotion or packet_type_id == "starter-promotion":
            overlays.add("starter-promotion")

        base_risk = self.normalize_risk_level(risk_level)
        effective_risk = "critical" if "release-sensitive" in overlays else base_risk
        required_gates = list(packet_profile["requiredGates"])
        applied_rules: list[str] = []

        self._append_policy_gates(required_gates, applied_rules, f"risk:{effective_risk}", self.policy.get("riskLevels", {}).get(effective_risk, {}).get("addGates", []))
        for overlay in sorted(overlays):
            self._append_policy_gates(required_gates, applied_rules, f"overlay:{overlay}", self.policy.get("overlays", {}).get(overlay, {}).get("addGates", []))

        return {
            "schemaVersion": "standard-harness-gate-profile-engine/v1",
            "packetType": packet_type_id,
            "selectedGateProfile": f"{packet_type_id}:{effective_risk}",
            "gateProfileVersion": f"{packet_profile['version']}+{effective_risk}@1",
            "baseRisk": base_risk,
            "effectiveRisk": effective_risk,
            "overlays": sorted(overlays),
            "requiredGates": required_gates,
            "appliedRules": applied_rules,
        }

    def validate_na_decision(
        self,
        *,
        packet_type: str,
        gate: str,
        rule_id: str,
        evidence: list[str] | None = None,
        substitute_checks: list[str] | None = None,
        changed_files: list[str] | None = None,
        claims: list[str] | None = None,
    ) -> dict[str, Any]:
        diagnostics: list[str] = []
        rule = self.policy.get("naRules", {}).get(rule_id)
        if not isinstance(rule, dict):
            diagnostics.append("unknown_na_rule")
        elif _normalize_token(packet_type) not in rule.get("packetTypes", []):
            diagnostics.append("na_rule_packet_type_mismatch")
        if isinstance(rule, dict) and gate not in rule.get("gates", []):
            diagnostics.append("na_rule_gate_mismatch")
        if not evidence:
            diagnostics.append("missing_na_evidence")
        for check in rule.get("requiredSubstituteChecks", []) if isinstance(rule, dict) else []:
            if check not in (substitute_checks or []):
                diagnostics.append(f"missing_substitute_check:{check}")
        triggers = {
            item
            for item in [*(_classify_changed_file(path) for path in (changed_files or [])), *(_normalize_token(claim) for claim in (claims or []))]
            if item
        }
        for blocked in rule.get("cannotBeUsedWhen", []) if isinstance(rule, dict) else []:
            if blocked in triggers:
                diagnostics.append(f"na_contradicted_by:{blocked}")
        return {"ok": not diagnostics, "diagnostics": diagnostics}

    def closeout_required_gate_diagnostics(
        self,
        *,
        required_gates: list[str],
        gate_results: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        by_gate = {item.get("gate") or item.get("gateId"): item for item in gate_results}
        diagnostics: list[dict[str, Any]] = []
        for gate in required_gates:
            result = by_gate.get(gate)
            if result is None:
                diagnostics.append({"gate": gate, "code": "missing_required_gate"})
                continue
            status = result.get("status", "missing")
            if status not in {"PASS", "pass", "passed", "N/A_RECORDED", "not_applicable_recorded"}:
                diagnostics.append({"gate": gate, "code": "required_gate_not_passing", "status": status})
            if result.get("fresh") is False:
                diagnostics.append({"gate": gate, "code": "required_gate_stale"})
            if result.get("trusted") is False:
                diagnostics.append({"gate": gate, "code": "required_gate_untrusted"})
            if result.get("unresolved") is True:
                diagnostics.append({"gate": gate, "code": "required_gate_unresolved"})
        return diagnostics

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

    def _append_policy_gates(
        self,
        required_gates: list[str],
        applied_rules: list[str],
        rule_id: str,
        gates: list[str],
    ) -> None:
        if not gates:
            return
        for gate in gates:
            if gate not in required_gates:
                required_gates.append(gate)
        applied_rules.append(rule_id)


def _normalize_token(value: str | None) -> str:
    return str(value or "").strip().lower().replace("_", "-").replace(" ", "-")


def _classify_changed_file(value: str) -> str | None:
    normalized = str(value).replace("\\", "/").lower()
    if not normalized:
        return None
    if "browser" in normalized or "ui" in normalized or "frontend" in normalized:
        return "browser-facing"
    if "security" in normalized or "permission" in normalized or "secret" in normalized:
        return "security-sensitive"
    if "data" in normalized or "database" in normalized or "schema" in normalized:
        return "data-sensitive"
    if normalized.startswith(".harness/runtime/") or normalized.startswith("_harness/") or "/runtime/" in normalized:
        return "runtime-path-changed"
    return None
