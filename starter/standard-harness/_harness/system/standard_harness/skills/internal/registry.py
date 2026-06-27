"""Required internal skill registry."""

from __future__ import annotations

from typing import Any


def required_skill_registry() -> dict[str, dict[str, Any]]:
    validation_commands = {
        "SKILL-TDD-IMPLEMENTATION": "python -m unittest tests.contract.test_skill_router_evidence_contract",
        "SKILL-EVIDENCE-TRUST-VALIDATION": "python -m unittest tests.contract.test_evidence_trust_model_v02",
        "SKILL-BOUNDARY-VALIDATION": "python -m unittest tests.contract.test_git_diff_boundary_validator",
        "SKILL-CLOSEOUT-DOCUMENTER": "python -m unittest tests.contract.test_closeout_documenter_report",
        "SKILL-WIKI-PROPOSAL-VALIDATION": "python -m unittest tests.contract.test_wiki_proposal_validator",
        "SKILL-CONTEXT-PACK-GENERATION": "python -m unittest tests.contract.test_role_specific_context_pack",
        "SKILL-FRICTION-ANALYSIS": "python -m unittest tests.contract.test_recurring_friction_detector",
    }
    return {
        skill_id: {
            "implementationType": "v2-native-internal",
            "purpose": "V2.1 cataloged required skill execution with manual fallback.",
            "validationCommand": command,
        }
        for skill_id, command in validation_commands.items()
    }
