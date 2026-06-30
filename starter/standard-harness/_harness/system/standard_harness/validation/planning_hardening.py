"""Planning hardening and productization validators for PKT-16 style packets."""

from __future__ import annotations

from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any

from standard_harness.design.projection import validate_design_projection, validate_packet_design_trace
from standard_harness.design.ui_module import (
    validate_packet_ui_module_trace,
    validate_ui_module_contracts,
)
from standard_harness.validation.diagnostics import DiagnosticRecord


FORBIDDEN_PROJECTION_AUTHORITY_CLAIMS = {
    "create_requirement",
    "approve_requirement",
    "approve_implementation",
    "ready_for_code",
    "approve_ready_for_code",
    "approve_release",
    "release",
    "publish",
    "close_packet",
    "approve_closeout",
    "residual_risk_acceptance",
}
FORBIDDEN_PROJECTION_AUTHORITY_ALIASES = {
    "approve rfc",
    "approve release",
    "approve ready for code",
    "approval release",
    "close packet",
    "create requirement",
    "publish",
    "ready for code",
    "release",
    "residual risk acceptance",
    "risk accepted",
    "risk acceptance",
    "rfc approved",
}

FORBIDDEN_CONFORMANCE_MODES = {
    "vocabulary-only",
    "fixture-only",
    "subset-only",
    "tests-only",
    "summary-only",
}

VALID_CANDIDATE_STATES = {"draft", "reviewed", "promoted", "rejected", "deferred"}
PROMOTED_CANDIDATE_FIELDS = {
    "canonicalRequirementId",
    "policyRef",
    "schemaRef",
    "validatorRef",
    "testRef",
    "packetId",
    "evidenceTarget",
}
PRODUCT_READINESS_EVIDENCE_REQUIREMENTS = {"product-readiness-before-uat", "user-uat-readiness"}
PRODUCT_READINESS_RISK_AXES = {
    "permission",
    "session",
    "accountLifecycle",
    "dataReflection",
    "viewerRuntime",
    "productness",
}
DEVELOPER_DONE_CHECKS = (
    "requirementImplementationChecked",
    "unitApiTestsPassed",
    "browserSmokePassed",
    "placeholderDiagnosticSweepPassed",
    "dbBackedRuntimeConfirmed",
)
TESTER_READINESS_CHECKS = (
    "actualRuntimeConfirmed",
    "roleMenuExposureChecked",
    "directRouteAccessChecked",
    "logoutLoginAccountSwitchChecked",
    "sessionRefreshAfterRoleChangeChecked",
    "accountLifecycleChecked",
    "dataReflectionChecked",
    "viewerRuntimeChecked",
    "placeholderDiagnosticUiAbsent",
)
REVIEWER_PRODUCT_QUALITY_CHECKS = (
    "placeholderReviewPassed",
    "diagnosticCopyReviewPassed",
    "roleComponentReuseReviewPassed",
    "staleSessionStateReviewPassed",
    "dbUiStateMappingReviewPassed",
)
USER_UAT_ENTRY_CHECKS = (
    "testerGatePassed",
    "reviewerProductQualityPassed",
    "p0p1E2EPassed",
    "uatAccountsDefined",
    "initialStateDefined",
)
PRODUCT_UAT_SURFACE_TERMS = (
    "user uat",
    "uat ready",
    "user-facing",
    "browser",
    "dashboard",
    "screen",
    "viewer",
    "admin",
    "role",
    "session",
    "account",
)
PRODUCT_UI_CHANGE_ZONE_TERMS = (
    "apps/web",
    "web/",
    "frontend",
    "ui",
    "screen",
    "browser",
)
PRODUCT_PACKET_TYPE_TERMS = (
    "product",
    "feature",
    "ui",
    "frontend",
)
DEVELOPER_DONE_FORBIDDEN_UAT_AUTHORITY_KEYS = (
    "userUatReady",
    "approvesUserUat",
    "uatApproval",
    "userUatApproval",
    "uatReady",
    "readyForUserUat",
)


class PlanningHardeningValidator:
    def __init__(self, repo_root: Any = None) -> None:
        self.repo_root = repo_root

    def validate(self, packet: dict[str, Any]) -> list[dict[str, Any]]:
        closeout_plan = packet.get("closeout_plan")
        if not isinstance(closeout_plan, dict):
            return []

        diagnostics: list[dict[str, Any]] = []
        planning = closeout_plan.get("planningHardening")
        if isinstance(planning, dict):
            diagnostics.extend(self._validate_planning(packet, planning))

        productization = closeout_plan.get("productizationHardening")
        if isinstance(productization, dict):
            diagnostics.extend(self._validate_productization(packet, productization))
        elif self._product_readiness_required(packet, {}):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "product_readiness_before_user_uat_gate_missing",
                    "productization",
                    "User UAT-bound packets require a product readiness gate.",
                    "Add productizationHardening.productReadinessBeforeUserUat or a structured not-applicable record.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat",
                )
            )

        return diagnostics

    def _validate_planning(self, packet: dict[str, Any], planning: dict[str, Any]) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        intent_sensitive = bool(planning.get("intentSensitive")) or "intent-fidelity" in set(
            packet.get("evidence_requirements") or []
        )
        if intent_sensitive:
            diagnostics.extend(self._validate_intent_fidelity(packet, planning.get("intentFidelity")))
        diagnostics.extend(self._validate_implementation_conformance(packet, planning.get("implementationConformance")))
        diagnostics.extend(self._validate_requirement_candidates(packet, planning.get("requirementCandidates")))
        diagnostics.extend(self._validate_trace(packet, planning.get("trace")))
        diagnostics.extend(self._validate_projections(packet, planning.get("projections")))
        diagnostics.extend(self._validate_design_projection_contract(packet, planning))
        diagnostics.extend(self._validate_ui_module_contract(packet, planning))
        diagnostics.extend(self._validate_end_of_hardening(packet, planning.get("endOfHardening")))
        return diagnostics

    def _validate_intent_fidelity(self, packet: dict[str, Any], intent: Any) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        if not isinstance(intent, dict):
            return [
                _diagnostic(
                    packet,
                    "missing_intent_fidelity_record",
                    "planning",
                    "Intent-sensitive packets require an intent fidelity record.",
                    "Add intended outcome, must-preserve intent, forbidden reinterpretations, and evidence targets.",
                    "closeout_plan.planningHardening.intentFidelity",
                )
            ]
        required_list_fields = [
            ("mustPreserveIntent", "missing_must_preserve_intent"),
            ("forbiddenReinterpretations", "missing_forbidden_reinterpretations"),
            ("evidenceTargets", "missing_intent_evidence_targets"),
        ]
        if not str(intent.get("intendedOutcome") or "").strip():
            diagnostics.append(
                _diagnostic(
                    packet,
                    "missing_intended_outcome",
                    "planning",
                    "Intent-sensitive packets require the intended outcome.",
                    "Record the Human Owner or Planner intended outcome before implementation can close.",
                    "closeout_plan.planningHardening.intentFidelity.intendedOutcome",
                )
            )
        for field, code in required_list_fields:
            if not _non_empty_list(intent.get(field)):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        code,
                        "planning",
                        f"Intent fidelity is missing {field}.",
                        "Record precise planning fields so implementation can be verified against intent.",
                        f"closeout_plan.planningHardening.intentFidelity.{field}",
                    )
                )
        return diagnostics

    def _validate_implementation_conformance(self, packet: dict[str, Any], conformance: Any) -> list[dict[str, Any]]:
        if not isinstance(conformance, dict):
            return []
        diagnostics: list[dict[str, Any]] = []
        claims = conformance.get("claims")
        if not _non_empty_list(claims):
            return [
                _diagnostic(
                    packet,
                    "missing_implementation_conformance_claims",
                    "planning",
                    "Implementation conformance gate has no claims.",
                    "Link each implementation claim to intent slice, acceptance criterion, and evidence.",
                    "closeout_plan.planningHardening.implementationConformance.claims",
                )
            ]
        for claim in claims:
            if not isinstance(claim, dict):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "invalid_implementation_conformance_claim",
                        "planning",
                        "Implementation conformance claim must be structured.",
                        "Use a structured claim with intentSlice, acceptanceCriterionId, evidenceRefs, and conformanceMode.",
                        "closeout_plan.planningHardening.implementationConformance.claims",
                    )
                )
                continue
            missing = [
                field
                for field in ("intentSlice", "acceptanceCriterionId")
                if not str(claim.get(field) or "").strip()
            ]
            if missing or not _non_empty_list(claim.get("evidenceRefs")):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "incomplete_implementation_conformance_claim",
                        "planning",
                        "Implementation conformance claim is missing intent, acceptance, or evidence links.",
                        "Add intent slice, acceptance criterion, and behavior evidence refs.",
                        "closeout_plan.planningHardening.implementationConformance.claims",
                    )
                )
            if str(claim.get("conformanceMode") or "").strip() in FORBIDDEN_CONFORMANCE_MODES:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "implementation_conformance_mode_forbidden",
                        "planning",
                        "Implementation conformance cannot rely on shortcut evidence.",
                        "Use behavior evidence instead of vocabulary-only, fixture-only, subset-only, tests-only, or summary-only proof.",
                        "closeout_plan.planningHardening.implementationConformance.claims.conformanceMode",
                    )
                )
        return diagnostics

    def _validate_requirement_candidates(self, packet: dict[str, Any], candidates: Any) -> list[dict[str, Any]]:
        if candidates is None:
            return []
        if not isinstance(candidates, list):
            return [
                _diagnostic(
                    packet,
                    "invalid_requirement_candidate_list",
                    "planning",
                    "Requirement candidates must be a list.",
                    "Record candidate lifecycle rows as structured records.",
                    "closeout_plan.planningHardening.requirementCandidates",
                )
            ]
        diagnostics: list[dict[str, Any]] = []
        for candidate in candidates:
            if not isinstance(candidate, dict):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "invalid_requirement_candidate_record",
                        "planning",
                        "Requirement candidate must be structured.",
                        "Use a structured candidate record.",
                        "closeout_plan.planningHardening.requirementCandidates",
                    )
                )
                continue
            state = str(candidate.get("state") or "").strip()
            if state not in VALID_CANDIDATE_STATES:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "invalid_requirement_candidate_state",
                        "planning",
                        "Requirement candidate has an invalid lifecycle state.",
                        "Use draft, reviewed, promoted, rejected, or deferred.",
                        "closeout_plan.planningHardening.requirementCandidates.state",
                    )
                )
            if state == "promoted":
                missing = [field for field in PROMOTED_CANDIDATE_FIELDS if not str(candidate.get(field) or "").strip()]
                if missing:
                    diagnostics.append(
                        _diagnostic(
                            packet,
                            "promoted_requirement_candidate_links_missing",
                            "planning",
                            "Promoted requirement candidate is missing required authority and evidence links.",
                            "Link promoted candidates to canonical requirement, policy, schema, validator, test, packet, and evidence target.",
                            "closeout_plan.planningHardening.requirementCandidates",
                        )
                    )
        return diagnostics

    def _validate_trace(self, packet: dict[str, Any], trace: Any) -> list[dict[str, Any]]:
        if trace is None:
            return []
        if not isinstance(trace, dict):
            return [
                _diagnostic(
                    packet,
                    "invalid_planning_trace",
                    "planning",
                    "Planning trace must be structured.",
                    "Record requirement, feature, scenario, acceptance, evidence, and flow metadata as structured trace.",
                    "closeout_plan.planningHardening.trace",
                )
            ]
        diagnostics: list[dict[str, Any]] = []
        requirements = trace.get("requirements")
        if not _non_empty_list(requirements):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "missing_requirement_feature_scenario_trace",
                    "planning",
                    "Planning trace is missing requirement-to-feature-to-scenario rows.",
                    "Add structured requirement, feature, scenario, acceptance, and evidence target links.",
                    "closeout_plan.planningHardening.trace.requirements",
                )
            )
        else:
            for requirement in requirements:
                if not self._requirement_trace_is_complete(requirement):
                    diagnostics.append(
                        _diagnostic(
                            packet,
                            "incomplete_requirement_feature_scenario_trace",
                            "planning",
                            "Planning trace row is missing feature, scenario, acceptance, or evidence links.",
                            "Complete requirement-to-feature-to-scenario-to-acceptance/evidence trace.",
                            "closeout_plan.planningHardening.trace.requirements",
                        )
                    )
                    break
        flows = trace.get("flows")
        if flows is not None:
            for flow in flows if isinstance(flows, list) else []:
                if not self._flow_trace_is_complete(flow):
                    diagnostics.append(
                        _diagnostic(
                            packet,
                            "incomplete_flow_metadata",
                            "planning",
                            "Flow metadata is missing roles, state changes, failure paths, evidence targets, or E2E applicability.",
                            "Complete flow metadata so Tester and Reviewer can verify applicability.",
                            "closeout_plan.planningHardening.trace.flows",
                        )
                    )
                    break
        return diagnostics

    def _validate_projections(self, packet: dict[str, Any], projections: Any) -> list[dict[str, Any]]:
        if projections is None:
            return []
        if not isinstance(projections, list):
            return [
                _diagnostic(
                    packet,
                    "invalid_projection_contract",
                    "planning",
                    "Projection contract must be a list.",
                    "Record projection-only artifacts as structured records.",
                    "closeout_plan.planningHardening.projections",
                )
            ]
        diagnostics: list[dict[str, Any]] = []
        for projection in projections:
            if not isinstance(projection, dict):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "invalid_projection_contract",
                        "planning",
                        "Projection record must be structured.",
                        "Record projection-only artifacts as structured records.",
                        "closeout_plan.planningHardening.projections",
                    )
                )
                continue
            if projection.get("projectionOnly") is not True:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "projection_only_flag_missing",
                        "planning",
                        "Planning projection must declare projectionOnly true.",
                        "Mark PRD/feature/flow projections as non-authoritative.",
                        "closeout_plan.planningHardening.projections.projectionOnly",
                    )
                )
            claims = {_normalize_authority_claim(claim) for claim in projection.get("authorityClaims") or []}
            if claims.intersection(FORBIDDEN_PROJECTION_AUTHORITY_CLAIMS) or claims.intersection(
                FORBIDDEN_PROJECTION_AUTHORITY_ALIASES
            ):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "projection_authority_claim_forbidden",
                        "planning",
                        "Projection artifact claims forbidden authority.",
                        "Remove requirement, Ready For Code, release, closeout, or risk-acceptance authority from projections.",
                        "closeout_plan.planningHardening.projections.authorityClaims",
                    )
                )
        return diagnostics

    def _validate_design_projection_contract(self, packet: dict[str, Any], planning: dict[str, Any]) -> list[dict[str, Any]]:
        design_projections = planning.get("designProjections")
        design_trace = planning.get("designTrace")
        packet_requires_design_trace = bool(validate_packet_design_trace(_design_trace_packet_payload(packet, {}, False))["diagnostics"])
        if design_projections is None and design_trace is None and not packet_requires_design_trace:
            return []

        diagnostics: list[dict[str, Any]] = []
        if design_projections is not None:
            if not isinstance(design_projections, list):
                return [
                    _diagnostic(
                        packet,
                        "invalid_design_projection",
                        "planning",
                        "Design projections must be a list.",
                        "Record screen, wireframe, mockup, and handoff projections as structured records.",
                        "closeout_plan.planningHardening.designProjections",
                    )
                ]
            for projection in design_projections:
                result = validate_design_projection(projection)
                for diagnostic in result["diagnostics"]:
                    diagnostics.append(
                        _diagnostic(
                            packet,
                            diagnostic["code"],
                            "planning",
                            diagnostic["message"],
                            "Complete the UI/design projection contract or remove the design artifact from scope.",
                            f"closeout_plan.planningHardening.designProjections.{diagnostic['field']}",
                        )
                    )

        trace = design_trace if isinstance(design_trace, dict) else {}
        if design_trace is not None and not isinstance(design_trace, dict):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "invalid_design_trace",
                    "planning",
                    "Design trace must be structured.",
                    "Record screen projection ids and UI module ids as structured design trace.",
                    "closeout_plan.planningHardening.designTrace",
                )
            )
        packet_trace_result = validate_packet_design_trace(_design_trace_packet_payload(packet, trace, design_projections is not None))
        for diagnostic in packet_trace_result["diagnostics"]:
            diagnostics.append(
                _diagnostic(
                    packet,
                    diagnostic["code"],
                    "planning",
                    diagnostic["message"],
                    "Link UI/design packets to screen projection ids and UI module ids, or mark the packet non-UI.",
                    f"closeout_plan.planningHardening.designTrace.{diagnostic['field']}",
                )
            )
        return diagnostics

    def _validate_ui_module_contract(self, packet: dict[str, Any], planning: dict[str, Any]) -> list[dict[str, Any]]:
        module_contracts = planning.get("uiModuleContracts")
        design_projections = planning.get("designProjections")
        design_trace = planning.get("designTrace")
        has_reusable_mockup = self._has_reusable_design_mockup(design_projections)
        packet_trace_result = validate_packet_ui_module_trace(
            _design_trace_packet_payload(packet, design_trace if isinstance(design_trace, dict) else {}, has_reusable_mockup)
        )

        diagnostics: list[dict[str, Any]] = []
        for diagnostic in packet_trace_result["diagnostics"]:
            diagnostics.append(
                _diagnostic(
                    packet,
                    diagnostic["code"],
                    "planning",
                    diagnostic["message"],
                    "Link UI/design packets to UI module ids, or mark the packet non-UI.",
                    f"closeout_plan.planningHardening.designTrace.{diagnostic['field']}",
                )
            )

        if module_contracts is None:
            if has_reusable_mockup:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "missing_ui_module_contract_for_design_mockup",
                        "planning",
                        "Implementation-reusable UI mockups require reusable UI module contracts.",
                        "Add uiModuleContracts records for the classified module ids before Developer implementation.",
                        "closeout_plan.planningHardening.uiModuleContracts",
                    )
                )
            return diagnostics

        if not isinstance(module_contracts, list):
            return [
                _diagnostic(
                    packet,
                    "invalid_ui_module_contract",
                    "planning",
                    "UI module contracts must be a list.",
                    "Record reusable UI module contracts as structured records.",
                    "closeout_plan.planningHardening.uiModuleContracts",
                )
            ]

        result = validate_ui_module_contracts(module_contracts)
        for diagnostic in result["diagnostics"]:
            diagnostics.append(
                _diagnostic(
                    packet,
                    diagnostic["code"],
                    "planning",
                    diagnostic["message"],
                    "Complete the reusable UI module contract or remove it from scope.",
                    f"closeout_plan.planningHardening.uiModuleContracts.{diagnostic['field']}",
                )
            )
        return diagnostics

    @staticmethod
    def _has_reusable_design_mockup(design_projections: Any) -> bool:
        if not isinstance(design_projections, list):
            return False
        for projection in design_projections:
            if not isinstance(projection, dict):
                continue
            mockup = projection.get("mockup")
            if isinstance(mockup, dict) and str(mockup.get("reusableImplementationDetail") or "").strip():
                return True
            if _non_empty_list(projection.get("moduleClassifications")):
                return True
        return False

    def _validate_end_of_hardening(self, packet: dict[str, Any], end_gate: Any) -> list[dict[str, Any]]:
        if end_gate is None:
            return []
        if not isinstance(end_gate, dict):
            return [
                _diagnostic(
                    packet,
                    "invalid_end_of_hardening_gate",
                    "planning",
                    "End-of-hardening gate must be structured.",
                    "Record whether broad hardening is closed and future work policy is productization or narrow defect only.",
                    "closeout_plan.planningHardening.endOfHardening",
                )
            ]
        if end_gate.get("broadHardeningClosed") is not True:
            return [
                _diagnostic(
                    packet,
                    "broad_hardening_not_closed",
                    "planning",
                    "PKT-16 cannot leave broad hardening open-ended.",
                    "Close broad hardening or route remaining work to productization/release or a named approved defect packet.",
                    "closeout_plan.planningHardening.endOfHardening.broadHardeningClosed",
                )
            ]
        if str(end_gate.get("futureWorkPolicy") or "") != "productization-or-narrow-defect-only":
            return [
                _diagnostic(
                    packet,
                    "future_hardening_policy_missing",
                    "planning",
                    "PKT-16 future hardening policy is missing.",
                    "Declare future work productization-or-narrow-defect-only.",
                    "closeout_plan.planningHardening.endOfHardening.futureWorkPolicy",
                )
            ]
        return []

    def _validate_productization(self, packet: dict[str, Any], productization: dict[str, Any]) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        clean_export = productization.get("cleanExport")
        if not isinstance(clean_export, dict) or clean_export.get("status") != "pass" or clean_export.get("forbiddenStateExcluded") is not True:
            diagnostics.append(
                _diagnostic(
                    packet,
                    "clean_export_productization_evidence_missing",
                    "productization",
                    "Clean export productization evidence is missing or incomplete.",
                    "Provide clean export evidence proving forbidden root/generated/local state is excluded.",
                    "closeout_plan.productizationHardening.cleanExport",
                )
            )
        installed = productization.get("installedRuntime")
        if isinstance(installed, dict) and installed.get("usedAsCleanExportProof") is True:
            diagnostics.append(
                _diagnostic(
                    packet,
                    "installed_runtime_used_as_clean_export_proof",
                    "productization",
                    "Installed runtime validation cannot substitute for clean export proof.",
                    "Use installed runtime as separate smoke evidence only.",
                    "closeout_plan.productizationHardening.installedRuntime.usedAsCleanExportProof",
                )
            )
        qa = productization.get("qaFreshness")
        if isinstance(qa, dict):
            if qa.get("inheritedRootSourcesUsed") is True or qa.get("authorityBoundaryRefused") is not True:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "copied_starter_qa_freshness_evidence_missing",
                        "productization",
                        "Copied-starter QA freshness or authority-boundary evidence is incomplete.",
                        "Prove QA does not answer from inherited root sources and refuses approval authority.",
                        "closeout_plan.productizationHardening.qaFreshness",
                    )
                )
        promotion = productization.get("promotionDryRun")
        if isinstance(promotion, dict):
            if (
                promotion.get("mutatesTarget") is True
                or promotion.get("grantsReleaseApproval") is True
                or promotion.get("reviewLanesAdjudicated") is not True
            ):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "promotion_dry_run_release_boundary_missing",
                        "productization",
                        "Promotion dry-run release boundary evidence is incomplete.",
                        "Prove dry-run does not mutate the target, grant release approval, or leave review lanes unresolved.",
                        "closeout_plan.productizationHardening.promotionDryRun",
                    )
                )
        diagnostics.extend(self._validate_product_readiness_before_user_uat(packet, productization))
        return diagnostics

    def _validate_product_readiness_before_user_uat(
        self, packet: dict[str, Any], productization: dict[str, Any]
    ) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        gate = productization.get("productReadinessBeforeUserUat")
        required = self._product_readiness_required(packet, productization)
        if gate is None:
            if required:
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "product_readiness_before_user_uat_gate_missing",
                        "productization",
                        "User UAT-bound packets require a product readiness gate.",
                        "Add Developer Done, Tester Product Readiness, risk-axis regression, Reviewer product-quality, and UAT entry evidence.",
                        "closeout_plan.productizationHardening.productReadinessBeforeUserUat",
                    )
                )
            return diagnostics
        if not isinstance(gate, dict):
            return [
                _diagnostic(
                    packet,
                    "invalid_product_readiness_before_user_uat_gate",
                    "productization",
                    "Product readiness before User UAT gate must be structured.",
                    "Use a structured gate record or an explicit not-applicable rationale.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat",
                )
            ]

        applicability = str(gate.get("applicability") or "").strip()
        if applicability == "not-applicable":
            if self._has_product_uat_surface(packet, productization):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "product_readiness_not_applicable_contradicts_packet_surface",
                        "productization",
                        "H10 not-applicable contradicts the packet's product, browser, or User UAT surface.",
                        "Use the required H10 gate for user-facing/UAT-bound packets instead of N/A.",
                        "closeout_plan.productizationHardening.productReadinessBeforeUserUat.applicability",
                    )
                )
            if (
                gate.get("userFacing") is not False
                or gate.get("userUatRequired") is not False
                or not str(gate.get("rationale") or "").strip()
                or len(str(gate.get("rationale") or "").strip()) < 20
                or gate.get("noUserFacingSurfaceConfirmed") is not True
                or gate.get("noUserUatHandoffConfirmed") is not True
                or gate.get("noBrowserStateChanged") is not True
                or not _non_empty_list(gate.get("evidenceRefs"))
            ):
                diagnostics.append(
                    _diagnostic(
                        packet,
                        "product_readiness_not_applicable_rationale_missing",
                        "productization",
                        "H10 can be not applicable only with a concrete no-user-facing/no-UAT rationale.",
                        "Set userFacing false, userUatRequired false, and record the no-UAT rationale.",
                        "closeout_plan.productizationHardening.productReadinessBeforeUserUat.rationale",
                    )
                )
            return diagnostics

        if applicability != "required" or gate.get("userFacing") is not True or gate.get("userUatRequired") is not True:
            diagnostics.append(
                _diagnostic(
                    packet,
                    "product_readiness_applicability_incomplete",
                    "productization",
                    "User-facing User UAT packets must declare H10 as required.",
                    "Set applicability required, userFacing true, and userUatRequired true.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.applicability",
                )
            )

        developer_done = gate.get("developerDone")
        if not self._readiness_record_passes(developer_done, "implementation-complete-only", DEVELOPER_DONE_CHECKS):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "developer_done_evidence_incomplete",
                    "productization",
                    "Developer Done evidence is incomplete.",
                    "Record requirement checks, unit/API tests, browser smoke, placeholder sweep, DB-backed runtime, and evidence refs.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.developerDone",
                )
            )
        if isinstance(developer_done, dict) and self._developer_done_has_forbidden_uat_authority(developer_done):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "developer_done_cannot_approve_user_uat",
                    "productization",
                    "Developer Done cannot approve or claim User UAT readiness.",
                    "Keep Developer Done limited to implementation-complete evidence and require Tester/Reviewer/UAT-entry gates.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.developerDone",
                )
            )

        if not self._readiness_record_passes(gate.get("testerProductReadinessGate"), "pass", TESTER_READINESS_CHECKS):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "tester_product_readiness_gate_missing",
                    "productization",
                    "Tester Product Readiness Gate evidence is missing or incomplete.",
                    "Prove runtime, role/menu, direct route, login/session, account lifecycle, data reflection, viewer runtime, and productness readiness.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.testerProductReadinessGate",
                )
            )

        if not self._risk_axis_regression_passes(gate.get("riskAxisRegression")):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "product_readiness_risk_axis_regression_missing",
                    "productization",
                    "Product readiness risk-axis regression evidence is incomplete.",
                    "Cover permission, session, account lifecycle, data reflection, viewer runtime, and productness axes.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.riskAxisRegression",
                )
            )

        if not self._readiness_record_passes(
            gate.get("reviewerProductQualityReview"), "pass", REVIEWER_PRODUCT_QUALITY_CHECKS
        ):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "reviewer_product_quality_review_missing",
                    "productization",
                    "Reviewer product-quality review evidence is missing or incomplete.",
                    "Record placeholder, diagnostic copy, role reuse, stale session state, and DB/UI mapping review evidence.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.reviewerProductQualityReview",
                )
            )

        if not self._readiness_record_passes(gate.get("userUatEntry"), "ready", USER_UAT_ENTRY_CHECKS):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "user_uat_entry_evidence_missing",
                    "productization",
                    "User UAT entry evidence is missing or incomplete.",
                    "Require Tester gate pass, Reviewer product-quality pass, P0/P1 E2E pass, UAT accounts, and initial state evidence.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat.userUatEntry",
                )
            )
        if not self._h10_evidence_refs_are_trusted(packet, gate):
            diagnostics.append(
                _diagnostic(
                    packet,
                    "product_readiness_evidence_ref_untrusted",
                    "productization",
                    "H10 evidence refs must be packet-bound local evidence references.",
                    "Use _ops/evidence/<packet family>/... refs with a safe relative path and packet ownership.",
                    "closeout_plan.productizationHardening.productReadinessBeforeUserUat",
                )
            )
        return diagnostics

    @staticmethod
    def _product_readiness_required(packet: dict[str, Any], productization: dict[str, Any]) -> bool:
        evidence_requirements = {str(requirement).strip() for requirement in packet.get("evidence_requirements") or []}
        return bool(productization.get("userUatBound")) or bool(
            evidence_requirements.intersection(PRODUCT_READINESS_EVIDENCE_REQUIREMENTS)
        ) or PlanningHardeningValidator._has_product_uat_surface(packet, productization)

    @staticmethod
    def _has_product_uat_surface(packet: dict[str, Any], productization: dict[str, Any]) -> bool:
        if productization.get("userUatBound") is True:
            return True
        packet_type = str(packet.get("packet_type") or "").lower()
        if any(term in packet_type for term in PRODUCT_PACKET_TYPE_TERMS):
            return True
        change_zones = " ".join(str(zone).lower() for zone in packet.get("change_zones") or [])
        if any(term in change_zones for term in PRODUCT_UI_CHANGE_ZONE_TERMS):
            return True
        evidence_requirements = " ".join(str(requirement).lower() for requirement in packet.get("evidence_requirements") or [])
        closeout_criteria = " ".join(str(criterion).lower() for criterion in packet.get("closeout_criteria") or [])
        text_surface = " ".join(
            [
                str(packet.get("title") or "").lower(),
                str(packet.get("objective") or "").lower(),
                evidence_requirements,
                closeout_criteria,
            ]
        )
        return any(term in text_surface for term in PRODUCT_UAT_SURFACE_TERMS)

    @staticmethod
    def _developer_done_has_forbidden_uat_authority(developer_done: dict[str, Any]) -> bool:
        for key in DEVELOPER_DONE_FORBIDDEN_UAT_AUTHORITY_KEYS:
            if key not in developer_done:
                continue
            value = developer_done.get(key)
            if value is False or value is None or value == "":
                continue
            return True
        return False

    @staticmethod
    def _readiness_record_passes(record: Any, expected_status: str, required_checks: tuple[str, ...]) -> bool:
        if not isinstance(record, dict) or str(record.get("status") or "").strip() != expected_status:
            return False
        if not _non_empty_list(record.get("evidenceRefs")):
            return False
        return all(record.get(check) is True for check in required_checks)

    @staticmethod
    def _risk_axis_regression_passes(regression: Any) -> bool:
        if not isinstance(regression, list):
            return False
        passed_axes = {
            str(row.get("axis") or "").strip()
            for row in regression
            if isinstance(row, dict)
            and str(row.get("status") or "").strip() == "pass"
            and str(row.get("evidenceRef") or "").strip()
        }
        return PRODUCT_READINESS_RISK_AXES.issubset(passed_axes)

    def _h10_evidence_refs_are_trusted(self, packet: dict[str, Any], gate: dict[str, Any]) -> bool:
        refs: list[str] = []
        for key in ("developerDone", "testerProductReadinessGate", "reviewerProductQualityReview", "userUatEntry"):
            record = gate.get(key)
            if isinstance(record, dict):
                refs.extend(str(ref).strip() for ref in record.get("evidenceRefs") or [])
        regression = gate.get("riskAxisRegression")
        if isinstance(regression, list):
            refs.extend(
                str(row.get("evidenceRef") or "").strip()
                for row in regression
                if isinstance(row, dict)
            )
        return bool(refs) and all(self._evidence_ref_is_trusted(packet, ref) for ref in refs)

    def _evidence_ref_is_trusted(self, packet: dict[str, Any], ref: str) -> bool:
        normalized = _safe_packet_evidence_ref(packet, ref)
        if normalized is None:
            return False
        if self.repo_root is None:
            return True
        evidence_path = Path(self.repo_root) / normalized
        try:
            return evidence_path.resolve().is_relative_to(Path(self.repo_root).resolve()) and evidence_path.is_file()
        except OSError:
            return False

    @staticmethod
    def _requirement_trace_is_complete(requirement: Any) -> bool:
        if not isinstance(requirement, dict) or not str(requirement.get("requirementId") or "").strip():
            return False
        features = requirement.get("features")
        if not _non_empty_list(features):
            return False
        for feature in features:
            if not isinstance(feature, dict) or not str(feature.get("featureId") or "").strip():
                return False
            scenarios = feature.get("scenarios")
            if not _non_empty_list(scenarios):
                return False
            for scenario in scenarios:
                if not isinstance(scenario, dict) or not str(scenario.get("scenarioId") or "").strip():
                    return False
                if not _non_empty_list(scenario.get("acceptanceCriteria")):
                    return False
                if not _non_empty_list(scenario.get("evidenceTargets")):
                    return False
        return True

    @staticmethod
    def _flow_trace_is_complete(flow: Any) -> bool:
        if not isinstance(flow, dict) or not str(flow.get("flowId") or "").strip():
            return False
        for field in ("roles", "stateChanges", "failurePaths", "evidenceTargets"):
            if not _non_empty_list(flow.get(field)):
                return False
        return bool(str(flow.get("e2eApplicability") or "").strip())


def _non_empty_list(value: Any) -> bool:
    return isinstance(value, list) and any(str(item).strip() for item in value)


def _normalize_authority_claim(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    for char in ("_", "-", "/", "\\", ":", ".", ","):
        normalized = normalized.replace(char, " ")
    return " ".join(normalized.split())


def _safe_packet_evidence_ref(packet: dict[str, Any], ref: str) -> str | None:
    if not ref:
        return None
    normalized = ref.replace("\\", "/")
    if normalized.startswith("/") or normalized.startswith("~") or "://" in normalized:
        return None
    if ".." in PurePosixPath(normalized).parts or ".." in PureWindowsPath(ref).parts:
        return None
    packet_family = _packet_family(packet)
    prefix = f"_ops/evidence/{packet_family}/"
    if normalized.startswith(prefix) and normalized.endswith(".json"):
        return normalized
    return None


def _design_trace_packet_payload(packet: dict[str, Any], trace: dict[str, Any], includes_design_artifacts: bool) -> dict[str, Any]:
    return {
        "packetId": packet.get("packet_id"),
        "scopeType": packet.get("packet_type"),
        "packetType": packet.get("packet_type"),
        "changeZone": " ".join(str(zone) for zone in packet.get("change_zones") or []),
        "tags": packet.get("tags") or [],
        "includesDesignArtifacts": includes_design_artifacts,
        "screenProjectionIds": trace.get("screenProjectionIds"),
        "uiModuleIds": trace.get("uiModuleIds"),
    }


def _packet_family(packet: dict[str, Any]) -> str:
    packet_id = str(packet.get("packet_id") or "").strip()
    parts = [part for part in packet_id.split("-") if part]
    if len(parts) >= 2:
        return f"{parts[0]}-{parts[1]}"
    return packet_id


def _diagnostic(
    packet: dict[str, Any],
    error_code: str,
    category: str,
    message: str,
    repair_hint: str,
    field: str,
) -> dict[str, Any]:
    packet_id = str(packet.get("packet_id") or "")
    return DiagnosticRecord(
        error_code=error_code,
        severity="high",
        category=category,
        message=message,
        repair_hint=repair_hint,
        affected_entity_type="packet",
        affected_entity_id=packet_id,
        packet_id=packet_id,
        field=field,
    ).to_dict()
