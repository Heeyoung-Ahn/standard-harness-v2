"""Rule-based N/A decision validation."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.policy.gate_profiles import GateProfilePolicy


class NaDecisionValidator:
    def __init__(self, gate_profiles: GateProfilePolicy):
        self.gate_profiles = gate_profiles

    @classmethod
    def load(cls, repo_root: Path | str | None = None) -> "NaDecisionValidator":
        return cls(GateProfilePolicy.load(repo_root))

    def validate(self, decision: dict[str, Any]) -> dict[str, Any]:
        diagnostic_ids: list[str] = []
        required_fields = [
            "packetId",
            "packetType",
            "gate",
            "status",
            "allowedByRule",
            "rationale",
            "substituteChecks",
            "approvedBy",
            "cannotBeUsedWhen",
            "policyVersion",
            "gateProfileVersion",
        ]
        for field in required_fields:
            if field not in decision:
                _add(diagnostic_ids, "invalid_na_decision")
        if decision.get("status") != "N/A_RECORDED":
            _add(diagnostic_ids, "invalid_na_decision")

        rules = decision.get("allowedByRule")
        if not isinstance(rules, list) or not rules:
            _add(diagnostic_ids, "invalid_na_decision")
            rules = []
        substitute_checks = decision.get("substituteChecks")
        if not isinstance(substitute_checks, list) or not substitute_checks:
            _add(diagnostic_ids, "invalid_na_decision")
            substitute_checks = []
        approved_by = decision.get("approvedBy")
        if not isinstance(approved_by, dict) or not approved_by.get("role"):
            _add(diagnostic_ids, "invalid_na_decision")

        packet_type = str(decision.get("packetType", ""))
        gate = str(decision.get("gate", ""))
        applicable_rule_found = False
        for rule_id in rules:
            if self.gate_profiles.rule_allows_na(str(rule_id), packet_type=packet_type, gate=gate):
                applicable_rule_found = True
                missing_substitutes = [
                    check
                    for check in self.gate_profiles.required_substitute_checks(str(rule_id))
                    if check not in substitute_checks
                ]
                if missing_substitutes:
                    _add(diagnostic_ids, "missing_na_substitute_check")
        if rules and not applicable_rule_found:
            _add(diagnostic_ids, "invalid_na_rule")

        return {
            "status": "pass" if not diagnostic_ids else "blocked",
            "diagnostic_ids": diagnostic_ids,
            "frictionSignalBehavior": "emit missing_e2e when blocked",
            "metricSignalBehavior": "emit na_decision_validated count",
        }


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
