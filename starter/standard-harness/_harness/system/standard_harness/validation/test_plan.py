"""Test-plan-first validator."""

from __future__ import annotations

from typing import Any


REQUIRED_TEST_PLAN_FIELDS = [
    "acceptanceCriteria",
    "behaviorsUnderTest",
    "testTypes",
    "commands",
    "e2eApplicability",
    "naConditions",
    "substituteValidation",
]


class TestPlanValidator:
    def validate(self, test_plan: dict[str, Any]) -> dict[str, Any]:
        diagnostics = [
            "missing_test_plan_field"
            for field in REQUIRED_TEST_PLAN_FIELDS
            if field not in test_plan or test_plan[field] in (None, [], "")
        ]
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": sorted(set(diagnostics)),
            "frictionSignalBehavior": "emit missing_evidence or manual_rework when blocked",
            "metricSignalBehavior": "emit test_plan_validated count",
        }


def packet_requires_test_plan(packet: dict[str, Any]) -> bool:
    packet_type = str(packet.get("packet_type", "docs-only"))
    if packet_type in {"product-feature", "product-bugfix", "product-refactor", "security-data", "harness-system"}:
        return True
    return any(
        str(zone).startswith(("product/src/", "product/tests/"))
        for zone in packet.get("change_zones", [])
    )
