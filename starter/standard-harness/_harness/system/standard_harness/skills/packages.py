"""Executable skill package descriptors."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any
from pathlib import Path

from standard_harness.skills.catalog import SkillCatalog


RUNTIME_SURFACES = ["codex_app", "claude_code_app", "codex_cli", "claude_code_cli"]
LEDGER_PATH = "_ops/evidence/skill-use-ledger.jsonl"


class SkillPackageRegistry:
    def __init__(self, catalog: SkillCatalog, descriptors: list[dict[str, Any]] | None = None):
        self.catalog = catalog
        self._descriptors = descriptors
        self.by_id = {
            descriptor["packageId"]: descriptor
            for descriptor in self.all_descriptors()
            if descriptor.get("packageId")
        }

    @classmethod
    def from_catalog(cls, catalog: SkillCatalog) -> "SkillPackageRegistry":
        return cls(catalog)

    def all_descriptors(self) -> list[dict[str, Any]]:
        if self._descriptors is not None:
            return self._descriptors
        return [
            self._descriptor_for(self.catalog.by_id[item["skillId"]], item)
            for item in self._package_inventory()
            if item.get("disposition") == "package-now" and item.get("skillId") in self.catalog.by_id
        ]

    def descriptors_for(self, skill_ids: list[str]) -> list[dict[str, Any]]:
        return [self.by_id[skill_id] for skill_id in skill_ids if skill_id in self.by_id]

    def validate_contract(self) -> list[str]:
        diagnostics = self._validate_inventory()
        return sorted(set([*diagnostics, *self.validate_descriptors(self.all_descriptors())]))

    def no_superpowers_runtime_dependency(self) -> bool:
        return not any(
            descriptor.get("runtimeDependencyPolicy", {}).get("requiresSuperpowersPlugin") is True
            or descriptor.get("sourceAuthority") == "superpowers_runtime"
            for descriptor in self.all_descriptors()
        )

    @staticmethod
    def validate_descriptors(descriptors: list[dict[str, Any]]) -> list[str]:
        diagnostics: list[str] = []
        seen: set[str] = set()
        required_fields = {
            "packageId",
            "skillId",
            "descriptorVersion",
            "trigger",
            "triggerKeywords",
            "taskTypes",
            "processPriority",
            "sourceAuthority",
            "sourceSet",
            "sourceDisposition",
            "runtimeSurfaces",
            "runtimeDependencyPolicy",
            "permissionScope",
            "authorityBoundary",
            "requiredNextPackageIds",
            "requiredEvidence",
            "hardGates",
            "ledgerPath",
            "authorityRef",
            "bodyLoaded",
            "fallbackBehavior",
            "validationHooks",
            "providerWorkerUseContract",
            "conductorUseContract",
            "inputSchema",
            "outputSchema",
        }
        for descriptor in descriptors:
            package_id = str(descriptor.get("packageId", "<missing>"))
            if package_id in seen:
                diagnostics.append(f"package_duplicate_id:{package_id}")
            seen.add(package_id)

            for field in required_fields:
                if field not in descriptor:
                    diagnostics.append(f"package_missing_field:{package_id}:{field}")

            trigger = str(descriptor.get("trigger", ""))
            if trigger and not trigger.startswith("Use when"):
                diagnostics.append(f"package_non_trigger_description:{package_id}")

            runtime_policy = descriptor.get("runtimeDependencyPolicy", {})
            if runtime_policy.get("requiresSuperpowersPlugin") is True:
                diagnostics.append(f"package_superpowers_runtime_dependency:{package_id}")
            if runtime_policy.get("providerNeutral") is not True:
                diagnostics.append(f"package_provider_specific_dependency:{package_id}")

            runtime_surfaces = set(descriptor.get("runtimeSurfaces", []))
            if runtime_surfaces and runtime_surfaces != set(RUNTIME_SURFACES):
                diagnostics.append(f"package_runtime_surfaces_incomplete:{package_id}")
            if descriptor.get("descriptorVersion") not in {None, "skill-package.v1"}:
                diagnostics.append(f"package_invalid_descriptor_version:{package_id}")
            if descriptor.get("authorityBoundary") not in {None, "packet_workflow_human"}:
                diagnostics.append(f"package_invalid_authority_boundary:{package_id}")
            if descriptor.get("ledgerPath") not in {None, LEDGER_PATH}:
                diagnostics.append(f"package_invalid_ledger_path:{package_id}")
            if descriptor.get("bodyLoaded") is not None and descriptor.get("bodyLoaded") is not False:
                diagnostics.append(f"package_body_loaded:{package_id}")
            if "allowedWriteZones" not in descriptor.get("permissionScope", {}):
                diagnostics.append(f"package_missing_permission_scope:{package_id}")
            required_evidence = descriptor.get("requiredEvidence", {})
            if required_evidence.get("required") is True and not required_evidence.get("kinds"):
                diagnostics.append(f"package_missing_evidence_kinds:{package_id}")
            if not descriptor.get("fallbackBehavior"):
                diagnostics.append(f"package_missing_fallback_behavior:{package_id}")
            if not descriptor.get("providerWorkerUseContract"):
                diagnostics.append(f"package_missing_provider_worker_use_contract:{package_id}")
            if not descriptor.get("conductorUseContract"):
                diagnostics.append(f"package_missing_conductor_use_contract:{package_id}")
            if descriptor.get("sourceAuthority") == "superpowers_runtime":
                diagnostics.append(f"package_superpowers_runtime_authority:{package_id}")
            if "SKILL.md" in str(descriptor.get("authorityRef", "")):
                diagnostics.append(f"package_markdown_authority_ref:{package_id}")

        return sorted(set(diagnostics))

    def _package_inventory(self) -> list[dict[str, str]]:
        inventory = self.catalog.data.get("packageInventory", [])
        if not inventory:
            return []
        normalized: list[dict[str, str]] = []
        for item in inventory:
            if isinstance(item, str):
                normalized.append({"skillId": item, "disposition": "package-now"})
            elif isinstance(item, dict):
                normalized.append(
                    {
                        "skillId": str(item.get("skillId", "")),
                        "disposition": str(item.get("disposition", "")),
                    }
                )
        return normalized

    def _validate_inventory(self) -> list[str]:
        diagnostics: list[str] = []
        inventory = self._package_inventory()
        if not inventory:
            diagnostics.append("package_inventory_missing")
        inventory_ids = {item["skillId"] for item in inventory if item.get("disposition") == "package-now"}
        catalog_ids = set(self.catalog.by_id)
        for skill_id in sorted(catalog_ids - inventory_ids):
            diagnostics.append(f"package_missing_inventory_entry:{skill_id}")
        for skill_id in sorted(inventory_ids - catalog_ids):
            diagnostics.append(f"package_inventory_unknown_skill:{skill_id}")
        for item in inventory:
            if item.get("disposition") not in {"package-now", "merge-into-existing", "defer", "reject-with-rationale"}:
                diagnostics.append(f"package_inventory_invalid_disposition:{item.get('skillId')}")
        return diagnostics

    def _descriptor_for(self, skill: dict[str, Any], inventory_item: dict[str, str]) -> dict[str, Any]:
        skill_id = str(skill["id"])
        evidence_contract = skill.get("evidenceContract", {})
        evidence_types = _evidence_kinds(evidence_contract)
        input_schema = skill.get("inputSchema", "_harness/schemas/skill-execution.schema.json")
        output_schema = skill.get("outputSchema", "_harness/schemas/skill-execution.schema.json")
        return {
            "descriptorVersion": "skill-package.v1",
            "packageId": skill_id,
            "skillId": skill_id,
            "inventoryDisposition": inventory_item.get("disposition", "package-now"),
            "v1SkillName": skill.get("v1SkillName"),
            "trigger": skill.get("triggerDescription", ""),
            "triggerKeywords": list(skill.get("triggerKeywords", [])),
            "taskTypes": list(skill.get("taskTypes", [])),
            "processPriority": int(skill.get("processPriority", 100)),
            "sourceAuthority": skill.get("sourceAuthority", "v1_skill_catalog"),
            "sourceSet": {
                "primary": skill.get("sourceAuthority", "v1_skill_catalog"),
                "v1SkillName": skill.get("v1SkillName"),
                "superpowersDisposition": self.catalog.data.get("superpowersDisposition"),
                "superpowersPatternDisposition": skill.get("superpowersPatternDisposition"),
            },
            "sourceDisposition": {
                "v1SkillCatalog": "authoritative_starter_contract_source",
                "superpowers": "absorbed_optional_external_comparison_source_only",
            },
            "runtimeSurfaces": list(RUNTIME_SURFACES),
            "runtimeDependencyPolicy": dict(
                self.catalog.data.get(
                    "runtimeDependencyPolicy",
                    {"requiresSuperpowersPlugin": False, "providerNeutral": True},
                )
            ),
            "permissionScope": skill.get("permissionScope", {"allowedWriteZones": []}),
            "authorityBoundary": skill.get("authorityBoundary", "packet_workflow_human"),
            "requiredNextPackageIds": list(skill.get("requiredNextSkills", [])),
            "requiredEvidence": {
                "required": bool(evidence_contract.get("required")),
                "kinds": evidence_types,
            },
            "hardGates": _hard_gates_for(skill),
            "fallbackBehavior": skill.get("fallbackBehavior", "manual-handoff"),
            "validationHooks": {
                "commands": [skill["validationCommand"]] if skill.get("validationCommand") else [],
                "schema": {
                    "input": input_schema,
                    "output": output_schema,
                },
            },
            "providerWorkerUseContract": {
                "supportedWorkers": ["codex_cli", "claude_code_cli"],
                "handoffIncludes": [
                    "packageId",
                    "trigger",
                    "requiredEvidence",
                    "permissionScope",
                    "hardGates",
                    "fallbackBehavior",
                    "validationHooks",
                ],
                "ledgerDecisionRequired": True,
            },
            "conductorUseContract": {
                "supportedConductorSurfaces": ["codex_app", "claude_code_app"],
                "autoSelectionRequired": True,
                "routesSelectedPackageSlicesOnly": True,
                "approvalAuthority": "none",
            },
            "inputSchema": input_schema,
            "outputSchema": output_schema,
            "ledgerPath": LEDGER_PATH,
            "authorityRef": f"_harness/catalog/skill-catalog.yaml#{skill_id}",
            "bodyLoaded": False,
            "bodyRef": None,
        }


class SkillPackageLedger:
    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)
        self.path = self.repo_root / LEDGER_PATH

    def append(self, entry: dict[str, Any]) -> dict[str, Any]:
        safe_entry = dict(entry)
        safe_entry["intentText"] = sanitize_intent_text(str(safe_entry.get("intentText", "")))
        safe_entry["intentDigest"] = intent_digest(str(safe_entry.get("intentText", "")))
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(safe_entry, ensure_ascii=False, sort_keys=True))
            handle.write("\n")
        return {"status": "appended", "path": str(self.path), "ledgerPath": LEDGER_PATH}


def validate_route_output_contract(route: dict[str, Any]) -> list[str]:
    diagnostics: list[str] = []
    required_fields = {
        "status",
        "taskType",
        "role",
        "selectedSkills",
        "selectedPackageIds",
        "candidatePackageIds",
        "skippedPackageRationales",
        "processPriorityOrder",
        "boundedPackageChain",
        "packageDescriptors",
        "conductorBrief",
        "providerWorkerBrief",
        "requiredEvidence",
        "hardGateDiagnostics",
        "skillUseLedgerPath",
        "skillUseLedger",
        "authorityBoundary",
        "requiresSuperpowersPlugin",
        "noSuperpowersRuntimeDependency",
        "no-superpowers-runtime-dependency",
        "evidenceRequired",
        "allowedWriteZones",
        "selectedBy",
    }
    for field in required_fields:
        if field not in route:
            diagnostics.append(f"route_missing_field:{field}")
    if route.get("selectedBy") not in {None, "skill-router"}:
        diagnostics.append("route_invalid_selected_by")
    if route.get("authorityBoundary") not in {None, "packet_workflow_human"}:
        diagnostics.append("route_invalid_authority_boundary")
    if route.get("skillUseLedgerPath") not in {None, LEDGER_PATH}:
        diagnostics.append("route_invalid_ledger_path")
    if route.get("requiresSuperpowersPlugin") is True:
        diagnostics.append("route_superpowers_runtime_dependency")
    if route.get("noSuperpowersRuntimeDependency") is False:
        diagnostics.append("route_superpowers_runtime_dependency")
    if not isinstance(route.get("allowedWriteZones", []), list):
        diagnostics.append("route_invalid_allowed_write_zones")
    if not isinstance(route.get("taskType", ""), str):
        diagnostics.append("route_invalid_task_type")
    if not isinstance(route.get("requiredSkill", ""), str):
        diagnostics.append("route_invalid_required_skill")
    ledger = route.get("skillUseLedger", {})
    if ledger.get("ledgerPath") not in {None, LEDGER_PATH}:
        diagnostics.append("route_invalid_ledger_path")
    for entry in ledger.get("entries", []):
        if entry.get("authorityBoundary") != "packet_workflow_human":
            diagnostics.append(f"route_invalid_ledger_authority:{entry.get('packageId')}")
        if entry.get("evidencePath") != LEDGER_PATH:
            diagnostics.append(f"route_invalid_ledger_evidence_path:{entry.get('packageId')}")
    return sorted(set(diagnostics))


def build_conductor_brief(
    *,
    role: str,
    intent_text: str,
    selected_package_ids: list[str],
    descriptors: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "autoSkillPackageSelection": True,
        "selectedConductorSurface": _selected_conductor_surface(role, intent_text),
        "supportedConductorSurfaces": ["codex_app", "claude_code_app"],
        "selectedPackageIds": selected_package_ids,
        "packageTriggers": [
            {"packageId": descriptor["packageId"], "trigger": descriptor["trigger"]}
            for descriptor in descriptors
        ],
        "authorityBoundary": "packet_workflow_human",
        "noRuntimeSkillMarkdownAuthority": True,
    }


def build_provider_worker_brief(
    *,
    role: str,
    intent_text: str,
    selected_package_ids: list[str],
    descriptors: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "autoSkillPackageSelection": True,
        "selectedWorkerSurface": _selected_worker_surface(role, intent_text),
        "supportedWorkers": ["codex_cli", "claude_code_cli"],
        "selectedPackageIds": selected_package_ids,
        "packageDescriptors": [
            _worker_descriptor_slice(descriptor)
            for descriptor in descriptors
        ],
        "requiredEvidence": _required_evidence(descriptors),
        "ledgerPath": LEDGER_PATH,
        "authorityBoundary": "packet_workflow_human",
    }


def _hard_gates_for(skill: dict[str, Any]) -> list[str]:
    task_types = set(skill.get("taskTypes", []))
    gates: list[str] = []
    if "implementation" in task_types:
        gates.append("planning_boundary_closed")
    if "completion-claim" in task_types:
        gates.append("verification_evidence_present")
    if "debugging-fix" in task_types:
        gates.append("root_cause_evidence_present")
    if "review-finding-disposition" in task_types:
        gates.append("review_disposition_present")
    if bool(skill.get("evidenceContract", {}).get("required")):
        gates.append("behavior_evidence_required")
    return gates


def _required_evidence(descriptors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "packageId": descriptor["packageId"],
            "required": descriptor["requiredEvidence"]["required"],
            "kinds": descriptor["requiredEvidence"]["kinds"],
        }
        for descriptor in descriptors
    ]


def _worker_descriptor_slice(descriptor: dict[str, Any]) -> dict[str, Any]:
    return {
        "packageId": descriptor["packageId"],
        "trigger": descriptor["trigger"],
        "requiredEvidence": descriptor["requiredEvidence"],
        "permissionScope": descriptor["permissionScope"],
        "hardGates": descriptor["hardGates"],
        "fallbackBehavior": descriptor["fallbackBehavior"],
        "validationHooks": descriptor["validationHooks"],
        "providerWorkerUseContract": descriptor["providerWorkerUseContract"],
    }


def _evidence_kinds(evidence_contract: dict[str, Any]) -> list[str]:
    kinds = evidence_contract.get("kinds", [])
    if isinstance(kinds, list) and kinds:
        return [str(kind) for kind in kinds]
    evidence_type = evidence_contract.get("evidenceType")
    if isinstance(evidence_type, str) and evidence_type:
        return [evidence_type]
    return []


SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]+"),
    re.compile(r"(?i)(OPENAI_API_KEY|ANTHROPIC_API_KEY|API_KEY|TOKEN|COOKIE|SESSION|PASSWORD)\s*=\s*[^ \t\r\n,;]+"),
    re.compile(r"(?i)(cookie|sessionid|auth_token|bearer_token)\s*[:=]\s*[^ \t\r\n,;]+"),
]


def sanitize_intent_text(intent_text: str) -> str:
    sanitized = intent_text
    for pattern in SECRET_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
    return sanitized


def intent_digest(intent_text: str) -> str:
    return "sha256:" + hashlib.sha256(intent_text.encode("utf-8")).hexdigest()


def _selected_conductor_surface(role: str, intent_text: str) -> str:
    text = f" {role} {intent_text} ".lower()
    if "claude code app" in text or "claude_code_app" in text:
        return "claude_code_app"
    if "codex app" in text or "codex_app" in text:
        return "codex_app"
    return "selected_conductor_app"


def _selected_worker_surface(role: str, intent_text: str) -> str:
    text = f" {role} {intent_text} ".lower()
    if "claude code cli" in text or "claude_code_cli" in text:
        return "claude_code_cli"
    if "codex cli" in text or "codex_cli" in text:
        return "codex_cli"
    return "dual_provider_cli_worker"
