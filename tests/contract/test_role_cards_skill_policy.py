import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"


class RoleCardsSkillPolicyTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(SRC))

    def test_role_cards_define_actions_forbidden_decisions_and_evidence(self):
        from standard_harness.roles.cards import RoleCardRegistry
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            card = RoleCardRegistry(store).register(
                role_id="developer",
                permitted_actions=["record_claim"],
                forbidden_decisions=["approve_security_risk"],
                escalation_duties=["ask_human_owner"],
                required_review_evidence=["unit_test"],
                idempotency_key="role-developer",
            )

            self.assertEqual(card["role_id"], "developer")
            self.assertIn("approve_security_risk", card["forbidden_decisions"])

    def test_skill_policy_can_tighten_but_not_bypass_core_invariants(self):
        from standard_harness.roles.skill_policy import SkillPolicyEvaluator
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            result = SkillPolicyEvaluator(store).evaluate(
                evaluation_id="skill-eval-001",
                role_id="developer",
                action="direct_state_mutation",
                local_policy={"forbidden_actions": ["direct_state_mutation", "skip_tests"]},
                idempotency_key="skill-eval-001",
            )

            self.assertEqual(result["policy_result"], "blocked")
            self.assertIn("core_invariant_violation", result["diagnostic_ids"])

    def test_skill_policy_enforces_registered_role_card(self):
        from standard_harness.roles.cards import RoleCardRegistry
        from standard_harness.roles.skill_policy import SkillPolicyEvaluator
        from standard_harness.state.store import HarnessStore

        with tempfile.TemporaryDirectory() as tmp:
            store = HarnessStore(Path(tmp))
            store.initialize()
            RoleCardRegistry(store).register(
                role_id="developer",
                permitted_actions=["record_claim"],
                forbidden_decisions=["approve_security_risk"],
                escalation_duties=["ask_human_owner"],
                required_review_evidence=["unit_test"],
                idempotency_key="role-developer",
            )

            forbidden = SkillPolicyEvaluator(store).evaluate(
                evaluation_id="skill-eval-002",
                role_id="developer",
                action="approve_security_risk",
                local_policy={"forbidden_actions": []},
                idempotency_key="skill-eval-002",
            )
            unpermitted = SkillPolicyEvaluator(store).evaluate(
                evaluation_id="skill-eval-003",
                role_id="developer",
                action="deploy_release",
                local_policy={"forbidden_actions": []},
                idempotency_key="skill-eval-003",
            )
            unknown = SkillPolicyEvaluator(store).evaluate(
                evaluation_id="skill-eval-004",
                role_id="unknown",
                action="record_claim",
                local_policy={"forbidden_actions": []},
                idempotency_key="skill-eval-004",
            )

            self.assertIn("role_forbidden_decision", forbidden["diagnostic_ids"])
            self.assertIn("role_action_not_permitted", unpermitted["diagnostic_ids"])
            self.assertIn("unknown_role", unknown["diagnostic_ids"])


if __name__ == "__main__":
    unittest.main()
