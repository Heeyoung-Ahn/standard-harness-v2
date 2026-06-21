"""Required internal skill registry."""

from __future__ import annotations

from typing import Any


def required_skill_registry() -> dict[str, dict[str, Any]]:
    return {
        "SKILL-TDD-IMPLEMENTATION": {
            "implementationType": "v2-native-internal",
            "purpose": "RED-GREEN-REFACTOR workflow guidance",
            "validationCommand": "python -m unittest tests.contract.test_skill_router_evidence_contract",
        }
    }
