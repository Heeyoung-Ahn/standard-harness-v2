"""Skill router."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.skills.catalog import SkillCatalog
from standard_harness.skills.packages import LEDGER_PATH
from standard_harness.skills.packages import SkillPackageRegistry
from standard_harness.skills.packages import build_conductor_brief
from standard_harness.skills.packages import build_provider_worker_brief
from standard_harness.skills.packages import intent_digest
from standard_harness.skills.packages import sanitize_intent_text


class SkillRouter:
    def __init__(self, catalog: SkillCatalog):
        self.catalog = catalog
        self.package_registry = SkillPackageRegistry.from_catalog(catalog)

    @classmethod
    def from_repo(cls, repo_root: str | Path) -> "SkillRouter":
        return cls(SkillCatalog.from_repo(repo_root))

    def route(
        self,
        *,
        task_type: str | None = None,
        role: str,
        intent_text: str = "",
        risk_level: str | None = None,
        workflow: str | None = None,
        gate_profile: str | None = None,
        planning_boundary_closed: bool | None = None,
        verification_evidence_present: bool | None = None,
        root_cause_evidence_present: bool | None = None,
        review_disposition_present: bool | None = None,
    ) -> dict[str, Any]:
        safe_intent_text = sanitize_intent_text(intent_text)
        package_contract_diagnostics = self.package_registry.validate_contract()
        selected, candidates, skipped = self._select_skills(task_type=task_type, intent_text=intent_text)
        diagnostics = self._hard_gate_diagnostics(
            task_type=task_type,
            intent_text=intent_text,
            planning_boundary_closed=planning_boundary_closed,
            verification_evidence_present=verification_evidence_present,
            root_cause_evidence_present=root_cause_evidence_present,
            review_disposition_present=review_disposition_present,
        )
        diagnostics = [*diagnostics, *package_contract_diagnostics]
        if not selected and not diagnostics:
            return {
                "status": "blocked",
                "taskType": task_type or "",
                "role": role,
                "intentText": safe_intent_text,
                "intentDigest": intent_digest(intent_text),
                "riskLevel": risk_level,
                "workflow": workflow,
                "gateProfile": gate_profile,
                "requiredSkill": "",
                "selectedSkills": [],
                "selectedPackageIds": [],
                "candidateSkills": [],
                "candidatePackageIds": [],
                "skippedCandidateSkills": [],
                "skippedPackageRationales": [],
                "processPriorityOrder": [],
                "skillChain": [],
                "boundedPackageChain": [],
                "chainDepth": 0,
                "hardGateDiagnostics": ["unknown_required_skill", "required_skill_not_cataloged"],
                "packageDescriptors": [],
                "conductorBrief": build_conductor_brief(
                    role=role,
                    intent_text=safe_intent_text,
                    selected_package_ids=[],
                    descriptors=[],
                ),
                "providerWorkerBrief": build_provider_worker_brief(
                    role=role,
                    intent_text=safe_intent_text,
                    selected_package_ids=[],
                    descriptors=[],
                ),
                "requiredEvidence": [],
                "contextBudget": {
                    "mode": "compact-route-result",
                    "skillBodyLoaded": False,
                    "fullCatalogBodyLoaded": False,
                    "candidateCount": 0,
                    "selectedCount": 0,
                    "skippedCandidateCount": 0,
                    "maxSelectedSkills": 12,
                    "packageDescriptorMode": "selected-package-slices-only",
                },
                "selectedBy": "skill-router",
                "sourcePriority": "v1_skill_catalog",
                "requiresSuperpowersPlugin": False,
                "noSuperpowersRuntimeDependency": self.package_registry.no_superpowers_runtime_dependency(),
                "no-superpowers-runtime-dependency": self.package_registry.no_superpowers_runtime_dependency(),
                "evidenceRequired": True,
                "allowedWriteZones": [],
                "fallbackBehavior": "",
                "evidenceContract": {},
                "skillUseLedgerPath": LEDGER_PATH,
                "skillUseLedger": {
                    "ledgerPath": LEDGER_PATH,
                    "entries": [],
                },
                "authorityBoundary": "packet_workflow_human",
                "bypassesP0Gate": False,
                "p0Boundary": "preserved",
                "diagnostic_ids": ["unknown_required_skill", "required_skill_not_cataloged"],
            }
        selected, chain_diagnostics = self._with_required_chain(selected)
        diagnostics = [*diagnostics, *chain_diagnostics]
        ordered = self._order(selected)
        selected_ids = [skill["id"] for skill in ordered]
        package_descriptors = self.package_registry.descriptors_for(selected_ids)
        candidate_package_ids = [skill["id"] for skill in candidates]
        skipped_package_rationales = [
            {
                "packageId": item["skill"]["id"],
                "decision": "skipped",
                "reason": item["reason"],
                "rationale": item["rationale"],
            }
            for item in skipped
        ]
        allowed = sorted({
            zone
            for skill in ordered
            for zone in skill.get("permissionScope", {}).get("allowedWriteZones", [])
        })
        chain = self._chain_edges(ordered)
        bounded_package_chain = [
            {"fromPackageId": edge["from"], "toPackageId": edge["to"]}
            for edge in chain
        ]
        first = ordered[0] if ordered else {}
        return {
            "status": "blocked" if diagnostics else "selected",
            "taskType": task_type or "",
            "role": role,
            "intentText": safe_intent_text,
            "intentDigest": intent_digest(intent_text),
            "riskLevel": risk_level,
            "workflow": workflow,
            "gateProfile": gate_profile,
            "requiredSkill": first.get("id", ""),
            "selectedSkills": selected_ids,
            "selectedPackageIds": selected_ids,
            "candidateSkills": [
                {
                    "id": skill["id"],
                    "triggerDescription": skill.get("triggerDescription"),
                    "sourceAuthority": skill.get("sourceAuthority", "v1_skill_catalog"),
                }
                for skill in candidates
            ],
            "candidatePackageIds": candidate_package_ids,
            "skippedCandidateSkills": [
                {
                    "id": item["skill"]["id"],
                    "reason": item["reason"],
                    "exclusionRationale": item["rationale"],
                }
                for item in skipped
            ],
            "skippedPackageRationales": skipped_package_rationales,
            "processPriorityOrder": selected_ids,
            "skillChain": chain,
            "boundedPackageChain": bounded_package_chain,
            "chainDepth": len(chain),
            "hardGateDiagnostics": diagnostics,
            "packageDescriptors": package_descriptors,
            "conductorBrief": build_conductor_brief(
                role=role,
                intent_text=safe_intent_text,
                selected_package_ids=selected_ids,
                descriptors=package_descriptors,
            ),
            "providerWorkerBrief": build_provider_worker_brief(
                role=role,
                intent_text=safe_intent_text,
                selected_package_ids=selected_ids,
                descriptors=package_descriptors,
            ),
            "requiredEvidence": [
                {
                    "packageId": descriptor["packageId"],
                    "required": descriptor["requiredEvidence"]["required"],
                    "kinds": descriptor["requiredEvidence"]["kinds"],
                }
                for descriptor in package_descriptors
            ],
            "contextBudget": {
                "mode": "compact-route-result",
                "skillBodyLoaded": False,
                "fullCatalogBodyLoaded": False,
                "candidateCount": len(candidates),
                "selectedCount": len(ordered),
                "skippedCandidateCount": len(skipped),
                "maxSelectedSkills": 12,
                "packageDescriptorMode": "selected-package-slices-only",
            },
            "selectedBy": "skill-router",
            "sourcePriority": "v1_skill_catalog",
            "requiresSuperpowersPlugin": False,
            "noSuperpowersRuntimeDependency": self.package_registry.no_superpowers_runtime_dependency(),
            "no-superpowers-runtime-dependency": self.package_registry.no_superpowers_runtime_dependency(),
            "evidenceRequired": any(bool(skill.get("evidenceContract", {}).get("required")) for skill in ordered),
            "allowedWriteZones": allowed,
            "fallbackBehavior": first.get("fallbackBehavior"),
            "evidenceContract": first.get("evidenceContract", {}),
            "skillUseLedgerPath": LEDGER_PATH,
            "skillUseLedger": self._ledger(
                ordered,
                skipped,
                role=role,
                task_type=task_type,
                intent_text=safe_intent_text,
                raw_intent_text=intent_text,
                diagnostics=diagnostics,
            ),
            "authorityBoundary": "packet_workflow_human",
            "bypassesP0Gate": False,
            "p0Boundary": "preserved",
            "diagnostic_ids": diagnostics,
        }

    def _select_skills(
        self, *, task_type: str | None, intent_text: str
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
        task_matches = self.catalog.find_all_for_task(task_type)
        intent_matches = self.catalog.match_intent(intent_text)
        selected = [*task_matches, *intent_matches]
        if task_type == "implementation" or " implement " in f" {intent_text.lower()} ":
            worker = self.catalog.by_id.get("SKILL-IMPLEMENTATION-WORKER")
            if worker is not None:
                selected.append(worker)
        selected = _unique_skills(selected)
        selected_ids = {skill["id"] for skill in selected}
        candidates = selected + [
            skill
            for skill in self.catalog.by_id.values()
            if skill.get("id") not in selected_ids and self._is_relevant_candidate(skill, task_type, intent_text)
        ]
        skipped = [
            {
                "skill": skill,
                "reason": "no_task_or_intent_trigger_match",
                "rationale": "The skill was cataloged and evaluated, but its taskTypes and triggerKeywords did not match this route input.",
            }
            for skill in candidates
            if skill.get("id") not in selected_ids
        ]
        return selected, candidates, skipped

    def _is_relevant_candidate(self, skill: dict[str, Any], task_type: str | None, intent_text: str) -> bool:
        if task_type and str(task_type).split("-")[0] in " ".join(skill.get("taskTypes", [])).lower():
            return True
        text_words = {word.strip(".,:;!?") for word in intent_text.lower().split() if len(word) > 3}
        keywords = " ".join(str(item).lower() for item in skill.get("triggerKeywords", []))
        return bool(text_words and any(word in keywords for word in text_words))

    def _with_required_chain(self, selected: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
        expanded = list(selected)
        diagnostics: list[str] = []
        for skill in selected:
            for next_skill_id in skill.get("requiredNextSkills", []):
                if next_skill_id == skill.get("id"):
                    diagnostics.append(f"chain_recursion_detected:{skill['id']}->{next_skill_id}")
                    continue
                next_skill = self.catalog.by_id.get(next_skill_id)
                if next_skill is None:
                    diagnostics.append(f"chain_required_skill_missing:{skill['id']}->{next_skill_id}")
                    continue
                if skill.get("id") in next_skill.get("requiredNextSkills", []):
                    diagnostics.append(f"chain_recursion_detected:{skill['id']}->{next_skill_id}->{skill['id']}")
                expanded.append(next_skill)
        return _unique_skills(expanded), sorted(set(diagnostics))

    def _order(self, selected: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return sorted(selected, key=lambda skill: (int(skill.get("processPriority", 100)), str(skill.get("id", ""))))

    def _chain_edges(self, selected: list[dict[str, Any]]) -> list[dict[str, str]]:
        selected_ids = {skill["id"] for skill in selected}
        edges: list[dict[str, str]] = []
        for skill in selected:
            for next_skill_id in skill.get("requiredNextSkills", []):
                if next_skill_id in selected_ids:
                    edges.append({"from": skill["id"], "to": next_skill_id})
        return edges

    def _hard_gate_diagnostics(
        self,
        *,
        task_type: str | None,
        intent_text: str,
        planning_boundary_closed: bool | None,
        verification_evidence_present: bool | None,
        root_cause_evidence_present: bool | None,
        review_disposition_present: bool | None,
    ) -> list[str]:
        text = f" {task_type or ''} {intent_text.lower()} "
        diagnostics: list[str] = []
        if (" implementation " in text or " implement " in text) and planning_boundary_closed is not True:
            diagnostics.append("planning_boundary_open")
        if (" completion-claim " in text or " complete " in text or " claim " in text) and verification_evidence_present is not True:
            diagnostics.append("verification_evidence_missing")
        if (" debugging-fix " in text or " fix " in text or " failing test " in text) and root_cause_evidence_present is not True:
            diagnostics.append("root_cause_evidence_missing")
        if (" review-finding-disposition " in text or " reviewer feedback " in text) and review_disposition_present is not True:
            diagnostics.append("review_disposition_missing")
        return diagnostics

    def _ledger(
        self,
        selected: list[dict[str, Any]],
        skipped: list[dict[str, Any]],
        *,
        role: str,
        task_type: str | None,
        intent_text: str,
        raw_intent_text: str,
        diagnostics: list[str],
    ) -> dict[str, Any]:
        digest = intent_digest(raw_intent_text)
        return {
            "ledgerPath": LEDGER_PATH,
            "entries": [
                {
                    "skillId": skill["id"],
                    "packageId": skill["id"],
                    "decision": "selected",
                    "useState": "selected_not_executed",
                    "role": role,
                    "taskType": task_type or "",
                    "intentText": intent_text,
                    "intentDigest": digest,
                    "authorityBoundary": "packet_workflow_human",
                    "evidencePath": LEDGER_PATH,
                    "diagnostics": diagnostics,
                }
                for skill in selected
            ]
            + [
                {
                    "skillId": item["skill"]["id"],
                    "packageId": item["skill"]["id"],
                    "decision": "skipped",
                    "useState": "not_applicable",
                    "reason": item["reason"],
                    "rationale": item["rationale"],
                    "role": role,
                    "taskType": task_type or "",
                    "intentText": intent_text,
                    "intentDigest": digest,
                    "authorityBoundary": "packet_workflow_human",
                    "evidencePath": LEDGER_PATH,
                    "diagnostics": diagnostics,
                }
                for item in skipped
            ],
        }


def _unique_skills(skills: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for skill in skills:
        skill_id = str(skill.get("id", ""))
        if not skill_id or skill_id in seen:
            continue
        seen.add(skill_id)
        unique.append(skill)
    return unique
