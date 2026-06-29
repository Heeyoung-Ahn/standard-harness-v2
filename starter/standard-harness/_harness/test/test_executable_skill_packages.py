from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


STARTER_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_ROOT = STARTER_ROOT / "_harness" / "system"
if str(SYSTEM_ROOT) not in sys.path:
    sys.path.insert(0, str(SYSTEM_ROOT))

from standard_harness.skills.catalog import SkillCatalog  # noqa: E402
from standard_harness.skills.packages import SkillPackageLedger  # noqa: E402
from standard_harness.skills.packages import SkillPackageRegistry  # noqa: E402
from standard_harness.skills.packages import validate_route_output_contract  # noqa: E402
from standard_harness.skills.router import SkillRouter  # noqa: E402


class ExecutableSkillPackageTests(unittest.TestCase):
    def test_catalog_exposes_complete_packages_for_all_catalog_skills(self) -> None:
        catalog = SkillCatalog.from_repo(STARTER_ROOT)
        registry = SkillPackageRegistry.from_catalog(catalog)
        descriptors = registry.all_descriptors()

        self.assertEqual(len(catalog.by_id), 34)
        self.assertEqual(len(descriptors), len(catalog.by_id))
        self.assertEqual(registry.validate_contract(), [])
        self.assertTrue(registry.no_superpowers_runtime_dependency())

        for descriptor in descriptors:
            with self.subTest(package=descriptor["packageId"]):
                self.assertEqual(descriptor["descriptorVersion"], "skill-package.v1")
                self.assertIn(descriptor["skillId"], catalog.by_id)
                self.assertTrue(descriptor["trigger"].startswith("Use when"))
                self.assertEqual(descriptor["authorityBoundary"], "packet_workflow_human")
                self.assertEqual(descriptor["runtimeDependencyPolicy"]["requiresSuperpowersPlugin"], False)
                self.assertEqual(descriptor["runtimeDependencyPolicy"]["providerNeutral"], True)
                self.assertEqual(
                    set(descriptor["runtimeSurfaces"]),
                    {"codex_app", "claude_code_app", "codex_cli", "claude_code_cli"},
                )
                self.assertNotIn("SKILL.md", descriptor.get("authorityRef", ""))
                self.assertNotEqual(descriptor.get("sourceAuthority"), "superpowers_runtime")
                self.assertIn("fallbackBehavior", descriptor)
                self.assertIn("validationHooks", descriptor)
                self.assertIn("providerWorkerUseContract", descriptor)
                self.assertIn("conductorUseContract", descriptor)
                self.assertIn("inputSchema", descriptor)
                self.assertIn("outputSchema", descriptor)
                if descriptor["requiredEvidence"]["required"]:
                    self.assertTrue(descriptor["requiredEvidence"]["kinds"])

    def test_conductor_and_dual_provider_workers_receive_package_briefs(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            task_type="implementation",
            role="conductor",
            intent_text="Codex App conductor should implement with TDD and route Claude Code CLI review",
            risk_level="high",
            planning_boundary_closed=True,
        )

        self.assertEqual(route["status"], "selected")
        self.assertIn("SKILL-TDD-IMPLEMENTATION", route["selectedPackageIds"])
        self.assertIn("SKILL-IMPLEMENTATION-WORKER", route["selectedPackageIds"])
        self.assertEqual(route["selectedPackageIds"], route["selectedSkills"])
        self.assertEqual(route["noSuperpowersRuntimeDependency"], True)
        self.assertEqual(route["conductorBrief"]["autoSkillPackageSelection"], True)
        self.assertEqual(route["conductorBrief"]["selectedConductorSurface"], "codex_app")
        self.assertIn("claude_code_app", route["conductorBrief"]["supportedConductorSurfaces"])
        self.assertEqual(route["providerWorkerBrief"]["autoSkillPackageSelection"], True)
        self.assertIn("codex_cli", route["providerWorkerBrief"]["supportedWorkers"])
        self.assertIn("claude_code_cli", route["providerWorkerBrief"]["supportedWorkers"])
        self.assertEqual(route["providerWorkerBrief"]["selectedWorkerSurface"], "claude_code_cli")
        self.assertEqual(route["allowedWriteZones"], [])
        self.assertIn("_harness/test/**", route["declaredSkillWriteZones"])
        self.assertEqual(route["permissionBoundary"]["authorizationMode"], "non_authorizing_hint")
        for descriptor in route["providerWorkerBrief"]["packageDescriptors"]:
            self.assertEqual(descriptor["permissionScope"]["allowedWriteZones"], [])
            self.assertEqual(descriptor["permissionScope"]["authorizationMode"], "non_authorizing_hint")
        self.assertEqual(validate_route_output_contract(route), [])

    def test_skill_route_does_not_grant_catalog_write_zones_as_effective_permission(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            task_type="implementation",
            role="developer",
            intent_text="implement with tests",
            planning_boundary_closed=True,
        )

        self.assertEqual(route["status"], "selected")
        self.assertEqual(route["allowedWriteZones"], [])
        self.assertTrue(any(zone.startswith("_harness/") for zone in route["declaredSkillWriteZones"]))
        self.assertEqual(route["permissionBoundary"]["effectiveAllowedWriteZones"], [])
        self.assertIn("packet-zone-policy", route["permissionBoundary"]["mustIntersectWith"])
        for descriptor in route["packageDescriptors"]:
            self.assertEqual(descriptor["permissionScope"]["allowedWriteZones"], [])
            self.assertIn("declaredSkillWriteZones", descriptor["permissionScope"])
        self.assertEqual(validate_route_output_contract(route), [])

    def test_route_outputs_package_candidates_skips_chain_ledger_and_context_budget(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            intent_text="apply incoming code review feedback",
            role="developer",
            review_disposition_present=True,
        )

        self.assertEqual(route["status"], "selected")
        self.assertIn("selectedPackageIds", route)
        self.assertIn("candidatePackageIds", route)
        self.assertIn("skippedPackageRationales", route)
        self.assertIn("boundedPackageChain", route)
        self.assertIn("packageDescriptors", route)
        self.assertIn("requiredEvidence", route)
        self.assertEqual(route["skillUseLedgerPath"], "_ops/evidence/skill-use-ledger.jsonl")
        self.assertLess(len(route["packageDescriptors"]), len(SkillCatalog.from_repo(STARTER_ROOT).by_id))
        self.assertFalse(route["contextBudget"]["skillBodyLoaded"])
        self.assertFalse(route["contextBudget"]["fullCatalogBodyLoaded"])
        self.assertTrue(
            any(entry["decision"] == "selected" for entry in route["skillUseLedger"]["entries"])
        )
        self.assertTrue(
            any(entry["decision"] == "skipped" for entry in route["skillUseLedger"]["entries"])
        )
        self.assertEqual(validate_route_output_contract(route), [])

    def test_no_match_blocked_route_output_remains_schema_compatible(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            intent_text="zzzz unmatched intent with no catalog keywords",
            role="developer",
        )

        self.assertEqual(route["status"], "blocked")
        self.assertEqual(route["requiredSkill"], "")
        self.assertEqual(validate_route_output_contract(route), [])

        invalid_route = dict(route)
        invalid_route["requiredSkill"] = None
        self.assertIn("route_invalid_required_skill", validate_route_output_contract(invalid_route))

    def test_package_validator_blocks_incomplete_conflicting_or_provider_specific_descriptors(self) -> None:
        diagnostics = SkillPackageRegistry.validate_descriptors(
            [
                {
                    "packageId": "PKG-DUP",
                    "skillId": "A",
                    "descriptorVersion": "skill-package.v1",
                    "trigger": "Use when one.",
                    "runtimeSurfaces": ["codex_cli"],
                    "runtimeDependencyPolicy": {
                        "requiresSuperpowersPlugin": True,
                        "providerNeutral": False,
                    },
                    "authorityBoundary": "packet_workflow_human",
                },
                {
                    "packageId": "PKG-DUP",
                    "skillId": "B",
                    "descriptorVersion": "skill-package.v1",
                    "trigger": "not a trigger",
                    "runtimeSurfaces": [],
                    "runtimeDependencyPolicy": {
                        "requiresSuperpowersPlugin": False,
                        "providerNeutral": True,
                    },
                },
            ]
        )

        self.assertIn("package_duplicate_id:PKG-DUP", diagnostics)
        self.assertIn("package_superpowers_runtime_dependency:PKG-DUP", diagnostics)
        self.assertIn("package_provider_specific_dependency:PKG-DUP", diagnostics)
        self.assertIn("package_missing_field:PKG-DUP:authorityBoundary", diagnostics)
        self.assertIn("package_missing_field:PKG-DUP:taskTypes", diagnostics)
        self.assertIn("package_missing_field:PKG-DUP:requiredEvidence", diagnostics)
        self.assertIn("package_non_trigger_description:PKG-DUP", diagnostics)

    def test_catalog_only_skill_without_package_inventory_fails_validation_and_routing(self) -> None:
        catalog = SkillCatalog(
            {
                "runtimeDependencyPolicy": {
                    "requiresSuperpowersPlugin": False,
                    "providerNeutral": True,
                },
                "skills": [
                    {
                        "id": "SKILL-CATALOG-ONLY",
                        "taskTypes": ["implementation"],
                        "triggerDescription": "Use when implementation needs a missing package.",
                        "triggerKeywords": ["catalog-only"],
                        "sourceAuthority": "v1_skill_catalog",
                        "permissionScope": {"allowedWriteZones": ["product/src/**"]},
                        "evidenceContract": {"required": True, "evidenceType": "skill-execution"},
                        "fallbackBehavior": "block",
                        "authorityBoundary": "packet_workflow_human",
                        "requiredNextSkills": [],
                        "processPriority": 10,
                    }
                ],
            }
        )

        diagnostics = SkillPackageRegistry.from_catalog(catalog).validate_contract()
        route = SkillRouter(catalog).route(
            task_type="implementation",
            intent_text="catalog-only implementation",
            role="developer",
            planning_boundary_closed=True,
        )

        self.assertIn("package_inventory_missing", diagnostics)
        self.assertIn("package_missing_inventory_entry:SKILL-CATALOG-ONLY", route["hardGateDiagnostics"])
        self.assertEqual(route["status"], "blocked")
        self.assertEqual(route["requiredSkill"], "SKILL-CATALOG-ONLY")
        self.assertEqual(validate_route_output_contract(route), [])

    def test_no_match_with_package_diagnostics_keeps_required_skill_schema_compatible(self) -> None:
        catalog = SkillCatalog(
            {
                "runtimeDependencyPolicy": {
                    "requiresSuperpowersPlugin": False,
                    "providerNeutral": True,
                },
                "skills": [
                    {
                        "id": "SKILL-CATALOG-ONLY",
                        "taskTypes": ["planning"],
                        "triggerDescription": "Use when planning needs a missing package.",
                        "triggerKeywords": ["catalog-only"],
                        "sourceAuthority": "v1_skill_catalog",
                        "permissionScope": {"allowedWriteZones": ["reference/packets/**"]},
                        "evidenceContract": {"required": True, "evidenceType": "planning-boundary"},
                        "fallbackBehavior": "block",
                        "authorityBoundary": "packet_workflow_human",
                        "requiredNextSkills": [],
                        "processPriority": 10,
                    }
                ],
            }
        )

        route = SkillRouter(catalog).route(
            intent_text="zzzz unmatched intent with no catalog keywords",
            role="developer",
        )

        self.assertEqual(route["status"], "blocked")
        self.assertEqual(route["requiredSkill"], "")
        self.assertIn("package_inventory_missing", route["hardGateDiagnostics"])
        self.assertEqual(validate_route_output_contract(route), [])

    def test_route_redacts_secret_like_intent_before_output_and_ledger(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            intent_text="implement with OPENAI_API_KEY=sk-proj-abc123 and cookie=sessionid",
            role="developer",
            task_type="implementation",
            planning_boundary_closed=True,
        )

        self.assertNotIn("sk-proj", route["intentText"])
        self.assertNotIn("sessionid", route["intentText"])
        self.assertIn("[REDACTED_SECRET]", route["intentText"])
        for entry in route["skillUseLedger"]["entries"]:
            self.assertNotIn("sk-proj", entry["intentText"])
            self.assertNotIn("sessionid", entry["intentText"])

    def test_ledger_append_records_use_state_to_jsonl(self) -> None:
        route = SkillRouter.from_repo(STARTER_ROOT).route(
            intent_text="wrap up the day and preserve next work",
            role="conductor",
        )
        with tempfile.TemporaryDirectory() as tmp:
            result = SkillPackageLedger(Path(tmp)).append(
                route["skillUseLedger"]["entries"][0] | {"useState": "used"}
            )
            ledger_path = Path(result["path"])

            self.assertTrue(ledger_path.is_file())
            self.assertEqual(result["status"], "appended")
            self.assertIn('"useState": "used"', ledger_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
