"""Design projection validation contracts for UI/design planning packets."""

from __future__ import annotations

import re
from typing import Any


FORBIDDEN_AUTHORITY_CLAIMS = {
    "ready for code",
    "approve ready for code",
    "bypass packet",
    "bypass packet gate",
    "bypass packets",
    "bypass approval gate",
    "close acceptance",
    "create requirement",
    "approve requirement",
    "promote requirement",
    "approve implementation",
    "approve release",
    "release",
    "publish",
    "closeout",
    "approve closeout",
    "residual risk",
    "user uat",
    "productization complete",
}
FORBIDDEN_AUTHORITY_TEXT_PATTERN = re.compile(
    r"(?i)\b("
    r"ready for code|releases?|publish|closeouts?|user uat|residual risks?|"
    r"productization(?:-complete| complete)?|requirements?|acceptance|"
    r"approval gates?|packet gates?|packets?"
    r")\b.{0,80}\b("
    r"approved|approves?|accepted|accepts?|close[sd]?|create[sd]?|promote[sd]?|bypass(?:es|ed)?"
    r")\b|"
    r"\b(approved|approves?|accepted|accepts?|close[sd]?|create[sd]?|promote[sd]?|bypass(?:es|ed)?)\b.{0,80}\b("
    r"ready for code|releases?|publish|closeouts?|user uat|residual risks?|"
    r"productization(?:-complete| complete)?|requirements?|acceptance|"
    r"approval gates?|packet gates?|packets?"
    r")\b"
)
LOCKED_MODULE_FIELDS = {
    "allowedVariants",
    "doNotChangeRules",
    "interactionStates",
    "locked",
    "lockEnforcement",
    "responsiveBehavior",
    "visualReference",
}

REQUIRED_UI_STATES = {"default", "loading", "empty", "error", "permission-denied", "success"}
REQUIRED_FLOW_FIELDS = (
    "flowId",
    "relatedRequirementCandidates",
    "relatedFeatures",
    "entryPoint",
    "successPath",
    "failurePaths",
    "roles",
    "stateChanges",
    "evidenceTargets",
    "screensTouched",
)
REQUIRED_BROWSER_EXPECTATION_FIELDS = (
    "route",
    "entryPoint",
    "viewport",
    "device",
    "roleAccountState",
    "statesToVerify",
    "interactions",
    "expectedResult",
    "consoleNetworkExpectation",
    "evidenceProfile",
    "futureScreenshotTraceExpectation",
)

PROMPT_LIKE_PATTERN = re.compile(
    r"(?i)\b(ignore (?:all )?(?:previous|prior|above) instructions|"
    r"ignore validation results|system prompt|developer prompt|when answering(?: the user)?|"
    r"present this .* as (?:the )?(?:current )?instruction)\b"
)
SENSITIVE_PATTERN = re.compile(
    r"(?i)\b(password\s*=|passwd\s*=|token\s*=|api[_-]?key\s*=|secret\s*=|"
    r"bearer\s+[a-z0-9._~+/=-]{8,}|sk-[a-z0-9_-]{8,})"
)


def validate_packet_design_trace(packet: dict[str, Any]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if not _is_ui_design_packet(packet):
        return _result(diagnostics)
    if not _non_empty_list(packet.get("screenProjectionIds")) or not _non_empty_list(packet.get("uiModuleIds")):
        diagnostics.append(
            _diagnostic(
                "missing_design_trace_for_ui_packet",
                "UI/design packets must link screen projection ids and UI module ids.",
                "screenProjectionIds",
            )
        )
    return _result(diagnostics)


def validate_design_projection(projection: dict[str, Any]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if not isinstance(projection, dict):
        return _result([_diagnostic("invalid_design_projection", "Design projection must be structured.", "projection")])

    if projection.get("projectionOnly") is not True:
        diagnostics.append(
            _diagnostic(
                "design_projection_only_flag_missing",
                "Design projection must declare projectionOnly true.",
                "projectionOnly",
            )
        )
    _validate_required_scalar_fields(projection, diagnostics)
    _validate_trace_hierarchy(projection, diagnostics)
    _validate_flow_metadata(projection, diagnostics)
    _validate_mockup_contract(projection, diagnostics)
    _validate_module_classification(projection, diagnostics)
    _validate_locked_module_boundary(projection, diagnostics)
    _validate_accessibility_state_browser_contract(projection, diagnostics)
    _validate_authority_and_text_safety(projection, diagnostics)
    return _result(diagnostics)


def _validate_required_scalar_fields(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    for field in ("projectionId", "projectionType", "screenId"):
        if not _text(projection.get(field)):
            diagnostics.append(
                _diagnostic("missing_design_projection_field", f"Design projection missing {field}.", field)
            )


def _validate_trace_hierarchy(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    required_lists = (
        "relatedRequirementIds",
        "packetIds",
        "featureNodeIds",
        "scenarioIds",
        "acceptanceCriterionIds",
        "flowIds",
        "evidenceTargetIds",
    )
    if any(not _non_empty_list(projection.get(field)) for field in required_lists):
        diagnostics.append(
            _diagnostic(
                "missing_trace_hierarchy_link",
                "Design projection is missing requirement, packet, feature, scenario, acceptance, flow, or evidence links.",
                "trace",
            )
        )


def _validate_flow_metadata(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    flows = projection.get("flows")
    if not _non_empty_list(flows):
        diagnostics.append(
            _diagnostic("incomplete_flow_metadata", "Relevant design projection flows need complete metadata.", "flows")
        )
        return
    for flow in flows:
        if not isinstance(flow, dict):
            diagnostics.append(_diagnostic("incomplete_flow_metadata", "Flow metadata must be structured.", "flows"))
            return
        if any(not _field_present(flow, field) for field in REQUIRED_FLOW_FIELDS) or "e2eRequired" not in flow:
            diagnostics.append(
                _diagnostic(
                    "incomplete_flow_metadata",
                    "Flow metadata is missing entry point, paths, roles, state changes, evidence, E2E flag, or screens.",
                    "flows",
                )
            )
            return


def _validate_mockup_contract(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    mockup = projection.get("mockup")
    if not isinstance(mockup, dict) or not _text(mockup.get("reusableImplementationDetail")) or not _non_empty_list(
        mockup.get("componentBoundaries")
    ):
        diagnostics.append(
            _diagnostic(
                "mockup_not_implementation_reusable",
                "Mockup must include reusable implementation detail and component boundaries.",
                "mockup",
            )
        )


def _validate_module_classification(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    if not _non_empty_list(projection.get("uiModuleIds")) or not _non_empty_list(
        projection.get("moduleClassifications")
    ):
        diagnostics.append(
            _diagnostic(
                "missing_module_classification",
                "Implementation-reusable mockups must classify common module or module-candidate boundaries.",
                "moduleClassifications",
            )
        )
        return
    for classification in projection["moduleClassifications"]:
        if not isinstance(classification, dict) or not _text(classification.get("moduleId")) or not _text(
            classification.get("classification")
        ) or not _non_empty_list(classification.get("usedByScreens")):
            diagnostics.append(
                _diagnostic(
                    "missing_module_classification",
                    "Module classification records need module id, classification, and used-by screens.",
                    "moduleClassifications",
                )
            )
            return


def _validate_locked_module_boundary(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    if any(_contains_locked_module_field(item) for item in projection.get("moduleClassifications") or []):
        diagnostics.append(
            _diagnostic(
                "locked_module_contract_out_of_scope",
                "PKT-22 may classify module candidates but must not validate locked module contracts.",
                "moduleClassifications",
            )
        )
    if any(field in projection for field in LOCKED_MODULE_FIELDS):
        diagnostics.append(
            _diagnostic(
                "locked_module_contract_out_of_scope",
                "Locked module contract fields are PKT-23 scope.",
                "moduleClassifications",
            )
        )


def _validate_accessibility_state_browser_contract(
    projection: dict[str, Any], diagnostics: list[dict[str, Any]]
) -> None:
    states = {_text(state) for state in projection.get("requiredStates") or []}
    if not REQUIRED_UI_STATES.issubset(states):
        diagnostics.append(
            _diagnostic(
                "missing_required_ui_state",
                "Design projection must include default, loading, empty, error, permission-denied, and success states.",
                "requiredStates",
            )
        )
    if not _non_empty_list(projection.get("accessibilityRequirements")):
        diagnostics.append(
            _diagnostic(
                "missing_accessibility_requirement",
                "Design projection must include accessibility requirements.",
                "accessibilityRequirements",
            )
        )
    expectations = projection.get("browserValidationExpectations")
    if not _non_empty_list(expectations):
        diagnostics.append(
            _diagnostic(
                "incomplete_browser_validation_expectation",
                "Browser validation expectation records are required.",
                "browserValidationExpectations",
            )
        )
        return
    for expectation in expectations:
        if not isinstance(expectation, dict):
            diagnostics.append(
                _diagnostic(
                    "incomplete_browser_validation_expectation",
                    "Browser validation expectation must be structured.",
                    "browserValidationExpectations",
                )
            )
            return
        missing = [field for field in REQUIRED_BROWSER_EXPECTATION_FIELDS if not _field_present(expectation, field)]
        if missing or "e2eRequired" not in expectation:
            diagnostics.append(
                _diagnostic(
                    "incomplete_browser_validation_expectation",
                    "Browser expectation is missing route, viewport, role, state, interaction, console, evidence, E2E, or screenshot trace fields.",
                    "browserValidationExpectations",
                )
            )
            return


def _validate_authority_and_text_safety(projection: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    claims = {_normalize_claim(claim) for claim in projection.get("authorityClaims") or []}
    if claims.intersection(FORBIDDEN_AUTHORITY_CLAIMS):
        diagnostics.append(
            _diagnostic(
                "design_projection_authority_claim_forbidden",
                "Design projections cannot claim requirement, implementation, release, UAT, closeout, or risk authority.",
                "authorityClaims",
            )
        )
    haystack = " ".join(_iter_text_values(projection))
    if FORBIDDEN_AUTHORITY_TEXT_PATTERN.search(haystack):
        diagnostics.append(
            _diagnostic(
                "design_projection_authority_claim_forbidden",
                "Design projection text cannot claim requirement, implementation, release, UAT, closeout, packet-bypass, or risk authority.",
                "text",
            )
        )
    if PROMPT_LIKE_PATTERN.search(haystack):
        diagnostics.append(
            _diagnostic(
                "design_projection_prompt_like",
                "Prompt-like design text must not be treated as instruction authority.",
                "dataInteractionNotes",
            )
        )
    if SENSITIVE_PATTERN.search(haystack):
        diagnostics.append(
            _diagnostic(
                "design_projection_sensitive_text",
                "Sensitive design text must be flagged before handoff or evidence reuse.",
                "dataInteractionNotes",
            )
        )


def _is_ui_design_packet(packet: dict[str, Any]) -> bool:
    text = " ".join(
        [
            _text(packet.get("scopeType")).lower(),
            _text(packet.get("packetType")).lower(),
            _text(packet.get("changeZone")).lower(),
            " ".join(_text(item).lower() for item in packet.get("tags") or []),
        ]
    )
    return packet.get("includesDesignArtifacts") is True or any(
        term in text for term in ("ui", "design", "frontend", "screen", "browser")
    )


def _contains_locked_module_field(value: Any) -> bool:
    if isinstance(value, dict):
        return any(key in LOCKED_MODULE_FIELDS or _contains_locked_module_field(item) for key, item in value.items())
    if isinstance(value, list):
        return any(_contains_locked_module_field(item) for item in value)
    return False


def _iter_text_values(value: Any):
    if isinstance(value, dict):
        for nested in value.values():
            yield from _iter_text_values(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _iter_text_values(nested)
    elif isinstance(value, str):
        yield value


def _field_present(record: dict[str, Any], field: str) -> bool:
    value = record.get(field)
    if isinstance(value, list):
        return _non_empty_list(value)
    if isinstance(value, bool):
        return True
    return bool(_text(value))


def _non_empty_list(value: Any) -> bool:
    return isinstance(value, list) and any(_text(item) if not isinstance(item, dict) else item for item in value)


def _normalize_claim(value: Any) -> str:
    normalized = _text(value).lower()
    for char in ("_", "-", "/", "\\", ":", ".", ","):
        normalized = normalized.replace(char, " ")
    return " ".join(normalized.split())


def _diagnostic(code: str, message: str, field: str) -> dict[str, str]:
    return {"code": code, "message": message, "field": field}


def _result(diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    return {"ok": not diagnostics, "diagnostics": diagnostics}


def _text(value: Any) -> str:
    return str(value or "").strip()
