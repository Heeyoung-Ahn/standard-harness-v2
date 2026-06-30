"""Reusable UI module contract validation for design planning packets."""

from __future__ import annotations

import re
from typing import Any


REQUIRED_UI_MODULE_FAMILIES = (
    "app-shell",
    "left-navigation",
    "top-bar",
    "table-data-grid",
    "modal",
    "drawer",
    "form-field-set",
    "detail-panel",
    "empty-error-permission-state",
    "toast-notification",
)
REQUIRED_MODULE_FIELDS = (
    "moduleId",
    "family",
    "purpose",
    "allowedVariants",
    "responsiveBehavior",
    "interactionStates",
    "accessibilityRequirements",
    "doNotChangeRules",
    "usedByScreens",
    "visualReference",
)
REQUIRED_CHANGE_TRACE_FIELDS = (
    "packetId",
    "reason",
    "allowedVariantImpact",
    "evidenceTargetIds",
    "screenProjectionIds",
)
PLACEHOLDER_VALUES = {"", "none", "n/a", "na", "tbd", "later", "not-needed", "not needed", "todo"}
FORBIDDEN_AUTHORITY_CLAIMS = {
    "ready for code",
    "approve ready for code",
    "approve implementation",
    "approve release",
    "release",
    "publish",
    "user uat",
    "approve user uat",
    "closeout",
    "approve closeout",
    "productization complete",
    "create requirement",
    "approve requirement",
    "promote requirement",
    "close acceptance",
    "residual risk",
}
AUTHORITY_TEXT_PATTERN = re.compile(
    r"(?i)\b("
    r"ready for code|implementation|release|publish|user uat|closeout|"
    r"productization(?:-complete| complete)?|requirements?|acceptance|residual risk"
    r")\b.{0,80}\b("
    r"approved|approves?|accepted|accepts?|close[sd]?|create[sd]?|promote[sd]?|"
    r"authori[sz](?:e[sd]?|es|ing)?|grants?|granted|permit(?:s|ted|ting)?|"
    r"waive[sd]?|waives?|certif(?:y|ies|ied)"
    r")\b|"
    r"\b(approved|approves?|accepted|accepts?|close[sd]?|create[sd]?|promote[sd]?|"
    r"authori[sz](?:e[sd]?|es|ing)?|grants?|granted|permit(?:s|ted|ting)?|"
    r"waive[sd]?|waives?|certif(?:y|ies|ied))\b.{0,80}\b("
    r"ready for code|implementation|release|publish|user uat|closeout|"
    r"productization(?:-complete| complete)?|requirements?|acceptance|residual risk"
    r")\b"
)
PROMPT_LIKE_PATTERN = re.compile(
    r"(?i)\b(ignore (?:all )?(?:previous|prior|above) instructions|"
    r"system prompt|developer prompt|when answering(?: the user)?|"
    r"present this .* as (?:the )?(?:current )?instruction)\b"
)


def validate_ui_module_contract(contract: dict[str, Any]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if not isinstance(contract, dict):
        return _result([_diagnostic("invalid_ui_module_contract", "UI module contract must be structured.", "module")])

    _validate_required_fields(contract, diagnostics)
    _validate_accessibility_requirements(contract, diagnostics)
    _validate_locked_change_trace(contract, diagnostics)
    _validate_authority_boundary(contract, diagnostics)
    return _result(diagnostics)


def validate_ui_module_contracts(
    contracts: list[dict[str, Any]] | Any,
    *,
    require_common_families: bool = False,
) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if not isinstance(contracts, list) or not contracts:
        return _result(
            [
                _diagnostic(
                    "missing_ui_module_contract",
                    "UI/design reusable mockups require at least one UI module contract.",
                    "uiModuleContracts",
                )
            ]
        )

    families: set[str] = set()
    module_ids: set[str] = set()
    for contract in contracts:
        result = validate_ui_module_contract(contract)
        diagnostics.extend(result["diagnostics"])
        family = _text(contract.get("family")) if isinstance(contract, dict) else ""
        module_id = _text(contract.get("moduleId")) if isinstance(contract, dict) else ""
        if family:
            families.add(family)
        if module_id:
            if module_id in module_ids:
                diagnostics.append(
                    _diagnostic(
                        "duplicate_ui_module_id",
                        "UI module contract ids must be unique.",
                        "moduleId",
                    )
                )
            module_ids.add(module_id)

    if require_common_families:
        missing = [family for family in REQUIRED_UI_MODULE_FAMILIES if family not in families]
        if missing:
            diagnostics.append(
                _diagnostic(
                    "missing_common_ui_module_family",
                    "Common UI module family contract is missing.",
                    "family",
                )
            )
    return _result(diagnostics)


def validate_packet_ui_module_trace(packet: dict[str, Any]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    if not _is_ui_design_packet(packet):
        return _result(diagnostics)
    if not _non_empty_list(packet.get("uiModuleIds")):
        diagnostics.append(
            _diagnostic(
                "missing_ui_module_trace_for_ui_packet",
                "UI/design packets must link UI module ids when module contracts or design artifacts are in scope.",
                "uiModuleIds",
            )
        )
    return _result(diagnostics)


def _validate_required_fields(contract: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    for field in REQUIRED_MODULE_FIELDS:
        value = contract.get(field)
        if isinstance(value, list):
            present = _non_empty_list(value)
        else:
            present = bool(_text(value))
        if not present:
            diagnostics.append(
                _diagnostic(
                    "missing_ui_module_contract_field",
                    f"UI module contract missing {field}.",
                    field,
                )
            )


def _validate_locked_change_trace(contract: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    if contract.get("locked") is not True or "proposedChange" not in contract:
        return
    change = contract.get("proposedChange")
    if not isinstance(change, dict):
        diagnostics.append(
            _diagnostic(
                "locked_ui_module_change_trace_missing",
                "Locked module changes require structured packet trace.",
                "proposedChange",
            )
        )
        return
    missing = [
        field
        for field in REQUIRED_CHANGE_TRACE_FIELDS
        if not (_non_empty_list(change.get(field)) if isinstance(change.get(field), list) else _text(change.get(field)))
    ]
    if missing:
        diagnostics.append(
            _diagnostic(
                "locked_ui_module_change_trace_missing",
                "Locked module changes require packet id, reason, variant impact, and evidence target links.",
                "proposedChange",
            )
        )
    screen_projection_ids = change.get("screenProjectionIds")
    if not _non_empty_list(screen_projection_ids):
        diagnostics.append(
            _diagnostic(
                "locked_ui_module_change_trace_missing",
                "UI/design locked module changes require screen projection trace.",
                "screenProjectionIds",
            )
        )


def _validate_accessibility_requirements(contract: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    requirements = contract.get("accessibilityRequirements")
    if not isinstance(requirements, list):
        return
    normalized = {_normalize_claim(requirement) for requirement in requirements}
    if normalized.intersection(PLACEHOLDER_VALUES):
        diagnostics.append(
            _diagnostic(
                "invalid_ui_module_accessibility_requirement",
                "Accessibility requirements cannot be placeholder or waiver values.",
                "accessibilityRequirements",
            )
        )


def _validate_authority_boundary(contract: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    claims = {_normalize_claim(claim) for claim in contract.get("authorityClaims") or []}
    if claims.intersection(FORBIDDEN_AUTHORITY_CLAIMS):
        diagnostics.append(
            _diagnostic(
                "ui_module_authority_claim_forbidden",
                "UI module contracts cannot claim requirement, implementation, release, UAT, closeout, or risk authority.",
                "authorityClaims",
            )
        )
    haystack = " ".join(_iter_text_values(contract))
    if AUTHORITY_TEXT_PATTERN.search(haystack):
        diagnostics.append(
            _diagnostic(
                "ui_module_authority_claim_forbidden",
                "UI module contract text cannot claim approval or release authority.",
                "text",
            )
        )
    visual_reference = _text(contract.get("visualReference"))
    if PROMPT_LIKE_PATTERN.search(visual_reference):
        diagnostics.append(
            _diagnostic(
                "ui_module_visual_reference_prompt_like",
                "Visual references must not contain prompt-like instruction text.",
                "visualReference",
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


def _iter_text_values(value: Any):
    if isinstance(value, dict):
        for nested in value.values():
            yield from _iter_text_values(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _iter_text_values(nested)
    elif isinstance(value, str):
        yield value


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
