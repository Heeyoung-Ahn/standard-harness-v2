import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"

EXPECTED_GUARDRAILS = {
    "provider_full_auto_control": "All LLM provider full automatic control is not a core promise.",
    "parallel_packet_auto_execution": "Parallel execution is not claimed without DAG, lock, and workspace checks.",
    "same_full_gate_for_every_task": "Gate profiles and rule-based N/A prevent one full gate from applying to every task.",
    "unlimited_core_skill_embedding": "Core does not embed every skill without catalog, permission, evidence, and fallback contracts.",
    "ai_review_only_quality": "AI review cannot replace deterministic evidence.",
    "wiki_direct_auto_update": "Documenter writes proposals; only wiki-applier mutates Wiki.",
    "blind_user_obedience": "Unsafe user requests trigger challenge review.",
    "unapproved_harness_self_mutation": "Harness mutation requires a harness packet and approved path.",
}


class NonGoalGuardrailTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_hr003_non_goals_are_hard_release_blocking_guardrails(self):
        from standard_harness.requirements.metadata import RequirementsMetadataRepository
        from standard_harness.validation.requirements_metadata import RequirementsMetadataValidator

        diagnostics = RequirementsMetadataValidator(ROOT).validate()

        self.assertEqual([], diagnostics)

        policy = RequirementsMetadataRepository(ROOT).non_goal_guardrails()
        guardrails = {item["id"]: item for item in policy["guardrails"]}

        self.assertEqual(set(EXPECTED_GUARDRAILS), set(guardrails))
        for guardrail_id, expected_summary in EXPECTED_GUARDRAILS.items():
            guardrail = guardrails[guardrail_id]
            self.assertEqual("HR-003", guardrail["sourceHr"])
            self.assertEqual(expected_summary, guardrail["summary"])
            self.assertTrue(guardrail["hardGuardrail"])
            self.assertFalse(guardrail["waivable"])
            self.assertTrue(guardrail["diagnosticId"])
            self.assertEqual("requirements-baseline-gate", guardrail["gateId"])
            self.assertEqual("validate", guardrail["enforcementPoint"])
            self.assertEqual("policy", guardrail["frictionSignal"]["candidateFixType"])


if __name__ == "__main__":
    unittest.main()
