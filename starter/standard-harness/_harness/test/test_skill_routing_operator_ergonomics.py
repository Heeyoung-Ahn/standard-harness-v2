from __future__ import annotations

import sys
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.skills.catalog import SkillCatalog  # noqa: E402
from standard_harness.skills.router import SkillRouter  # noqa: E402
from standard_harness.cli.main import _handle_skill_route  # noqa: E402


class SkillRoutingOperatorErgonomicsTests(unittest.TestCase):
    def test_wave_8_intents_auto_select_required_v1_skill_routes_without_superpowers(self) -> None:
        router = SkillRouter.from_repo(STARTER_ROOT)

        scenarios = {
            "plan a packet before implementation": "SKILL-PLANNING-PROCESS",
            "implement this change with TDD": "SKILL-TDD-IMPLEMENTATION",
            "review the implementation for source parity": "SKILL-CODE-REVIEW-CHECKLIST",
            "run security review on this guarded change": "SKILL-SECURITY-REVIEW",
            "capture browser evidence for this web behavior": "SKILL-BROWSER-EVIDENCE",
            "audit dependency and package changes": "SKILL-DEPENDENCY-AUDIT",
            "prepare a day start brief": "SKILL-DAY-START",
            "wrap up the day and preserve next work": "SKILL-DAY-WRAP-UP",
            "write a closeout documenter report": "SKILL-CLOSEOUT-DOCUMENTER",
            "search project memory for prior decisions": "SKILL-MEMORY-SEARCH",
            "record a retrospective lesson from repeated friction": "SKILL-RETROSPECTIVE",
        }

        for intent, expected_skill in scenarios.items():
            with self.subTest(intent=intent):
                route = router.route(
                    intent_text=intent,
                    role="conductor",
                    risk_level="standard",
                    planning_boundary_closed=True if "implement" in intent else None,
                )
                self.assertEqual(route["status"], "selected")
                self.assertIn(expected_skill, route["selectedSkills"])
                self.assertFalse(route["requiresSuperpowersPlugin"])
                self.assertEqual(route["sourcePriority"], "v1_skill_catalog")
                self.assertTrue(route["skillUseLedger"]["entries"])
                self.assertEqual(route["skillUseLedger"]["entries"][0]["authorityBoundary"], "packet_workflow_human")
                self.assertIn("contextBudget", route)
                self.assertFalse(route["contextBudget"]["skillBodyLoaded"])
                self.assertLessEqual(route["contextBudget"]["selectedCount"], route["contextBudget"]["maxSelectedSkills"])

    def test_catalog_covers_current_root_v1_skill_surface(self) -> None:
        catalog = SkillCatalog.from_repo(STARTER_ROOT)
        required_v1_skills = {
            "adversarial_review",
            "architecture_design",
            "code_review_checklist",
            "compound-learning",
            "conflict_resolver",
            "day_start",
            "day_wrap_up",
            "dependency_audit",
            "destructive-command-guard",
            "epic_story_decompose",
            "executing-plans",
            "feature-artifact-sync",
            "forensic_investigation",
            "frontend_design",
            "general_publish",
            "github_deploy",
            "korean-artifact-utf8-guard",
            "memory-search",
            "operating-common-rollout",
            "operator-support",
            "receiving-code-review",
            "requesting-code-review",
            "requirements_deep_interview",
            "retrospective",
            "security-review",
            "subagent-driven-development",
            "verification-before-completion",
            "version_closeout",
            "writing-plans",
        }

        cataloged_v1_skills = {skill.get("v1SkillName") for skill in catalog.by_id.values()}

        self.assertTrue(required_v1_skills.issubset(cataloged_v1_skills))

    def test_process_skills_are_ordered_before_implementation_skill(self) -> None:
        router = SkillRouter.from_repo(STARTER_ROOT)

        route = router.route(
            intent_text="plan, implement with TDD, then verify completion",
            role="developer",
            task_type="implementation",
            risk_level="high",
            planning_boundary_closed=True,
            verification_evidence_present=True,
        )

        self.assertEqual(route["status"], "selected")
        self.assertLess(
            route["processPriorityOrder"].index("SKILL-PLANNING-PROCESS"),
            route["processPriorityOrder"].index("SKILL-IMPLEMENTATION-WORKER"),
        )
        self.assertLess(
            route["processPriorityOrder"].index("SKILL-TDD-IMPLEMENTATION"),
            route["processPriorityOrder"].index("SKILL-IMPLEMENTATION-WORKER"),
        )
        self.assertLess(
            route["processPriorityOrder"].index("SKILL-VERIFICATION-BEFORE-COMPLETION"),
            route["processPriorityOrder"].index("SKILL-IMPLEMENTATION-WORKER"),
        )

    def test_hard_gates_block_unsafe_claims_before_work_starts(self) -> None:
        router = SkillRouter.from_repo(STARTER_ROOT)

        implementation = router.route(
            intent_text="implement the approved feature",
            role="developer",
            task_type="implementation",
            planning_boundary_closed=False,
        )
        completion = router.route(
            intent_text="claim this work is complete",
            role="developer",
            task_type="completion-claim",
            verification_evidence_present=False,
        )
        debugging = router.route(
            intent_text="fix the failing test",
            role="developer",
            task_type="debugging-fix",
            root_cause_evidence_present=False,
        )
        review = router.route(
            intent_text="accept reviewer feedback",
            role="developer",
            task_type="review-finding-disposition",
            review_disposition_present=False,
        )

        self.assertEqual(implementation["status"], "blocked")
        self.assertIn("planning_boundary_open", implementation["hardGateDiagnostics"])
        self.assertEqual(completion["status"], "blocked")
        self.assertIn("verification_evidence_missing", completion["hardGateDiagnostics"])
        self.assertEqual(debugging["status"], "blocked")
        self.assertIn("root_cause_evidence_missing", debugging["hardGateDiagnostics"])
        self.assertEqual(review["status"], "blocked")
        self.assertIn("review_disposition_missing", review["hardGateDiagnostics"])

        omitted_implementation = router.route(
            intent_text="implement the approved feature",
            role="developer",
            task_type="implementation",
        )
        omitted_completion = router.route(
            intent_text="claim this work is complete",
            role="developer",
            task_type="completion-claim",
        )

        self.assertEqual(omitted_implementation["status"], "blocked")
        self.assertIn("planning_boundary_open", omitted_implementation["hardGateDiagnostics"])
        self.assertEqual(omitted_completion["status"], "blocked")
        self.assertIn("verification_evidence_missing", omitted_completion["hardGateDiagnostics"])

    def test_skill_chaining_and_conflict_diagnostics_are_bounded_and_explicit(self) -> None:
        router = SkillRouter.from_repo(STARTER_ROOT)

        route = router.route(intent_text="apply incoming code review feedback", role="developer")

        self.assertEqual(route["status"], "selected")
        self.assertIn("SKILL-RECEIVING-CODE-REVIEW", route["selectedSkills"])
        self.assertIn(
            {"from": "SKILL-RECEIVING-CODE-REVIEW", "to": "SKILL-CODE-REVIEW-CHECKLIST"},
            route["skillChain"],
        )
        self.assertEqual(route["chainDepth"], 1)
        self.assertTrue(route["skippedCandidateSkills"])
        self.assertIn("exclusionRationale", route["skippedCandidateSkills"][0])

        recursive_route = SkillRouter(
            SkillCatalog(
                {
                    "skills": [
                        {
                            "id": "A",
                            "taskTypes": ["review-finding-disposition"],
                            "triggerDescription": "Use when handling review.",
                            "triggerKeywords": ["review"],
                            "sourceAuthority": "v1_skill_catalog",
                            "permissionScope": {"allowedWriteZones": ["reference/reports/review/**"]},
                            "evidenceContract": {"required": True},
                            "fallbackBehavior": "block",
                            "authorityBoundary": "packet_workflow_human",
                            "requiredNextSkills": ["B"],
                            "processPriority": 10,
                        },
                        {
                            "id": "B",
                            "taskTypes": [],
                            "triggerDescription": "Use when chained review support is needed.",
                            "triggerKeywords": [],
                            "sourceAuthority": "v1_skill_catalog",
                            "permissionScope": {"allowedWriteZones": ["reference/reports/review/**"]},
                            "evidenceContract": {"required": True},
                            "fallbackBehavior": "block",
                            "authorityBoundary": "packet_workflow_human",
                            "requiredNextSkills": ["A"],
                            "processPriority": 20,
                        },
                    ]
                }
            )
        ).route(task_type="review-finding-disposition", role="developer", review_disposition_present=True)

        self.assertIn("chain_recursion_detected:A->B->A", recursive_route["hardGateDiagnostics"])

        diagnostics = SkillCatalog(
            {
                "skills": [
                    {"id": "A", "triggerKeywords": ["review"], "triggerDescription": "Use when reviewing."},
                    {"id": "B", "triggerKeywords": ["review"], "triggerDescription": "Use when reviewing."},
                ]
            }
        ).validate_contract()

        self.assertIn("duplicate_trigger_keyword:review", diagnostics)

    def test_cli_skill_route_accepts_intent_text_without_requiring_task_type(self) -> None:
        result = _handle_skill_route(
            None,  # store is not used by skill-route
            ["--intent-text", "wrap up the day and preserve next work", "--role", "conductor"],
        )

        self.assertEqual(result["route"]["status"], "selected")
        self.assertIn("SKILL-DAY-WRAP-UP", result["route"]["selectedSkills"])

    def test_cli_skill_route_blocks_hard_gate_when_evidence_flags_are_omitted(self) -> None:
        with self.assertRaisesRegex(ValueError, "planning_boundary_open"):
            _handle_skill_route(
                None,
                ["--task-type", "implementation", "--intent-text", "implement the feature", "--role", "developer"],
            )

        result = _handle_skill_route(
            None,
            [
                "--task-type",
                "implementation",
                "--intent-text",
                "implement the feature",
                "--role",
                "developer",
                "--planning-boundary-closed",
            ],
        )

        self.assertEqual(result["route"]["status"], "selected")


if __name__ == "__main__":
    unittest.main()
