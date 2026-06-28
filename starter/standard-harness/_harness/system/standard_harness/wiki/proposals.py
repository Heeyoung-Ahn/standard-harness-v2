"""Wiki proposal helpers."""

from __future__ import annotations

from typing import Any


APPROVED_PROPOSAL_PREFIXES = (
    "_ops/wiki-proposals/",
    "_ops/wiki/proposals/",
)


def mark_validated(proposal: dict[str, Any]) -> dict[str, Any]:
    result = dict(proposal)
    result["validationStatus"] = "validated"
    result["validatedBy"] = "wiki-proposal-validator"
    return result


def validate_documenter_output_paths(paths: list[str]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    for candidate in paths:
        normalized = _normalize_path(candidate)
        if normalized.startswith("_ops/wiki/") and not normalized.startswith("_ops/wiki/proposals/"):
            diagnostics.append({"code": "documenter_direct_wiki_mutation", "path": candidate})
        if ".." in normalized:
            diagnostics.append({"code": "unsafe_wiki_proposal_path", "path": candidate})
        if normalized and not normalized.startswith(APPROVED_PROPOSAL_PREFIXES):
            diagnostics.append({"code": "unapproved_wiki_proposal_path", "path": candidate})
    return {"ok": not diagnostics, "diagnostics": diagnostics}


def _normalize_path(value: str) -> str:
    return str(value or "").strip().replace("\\", "/").lstrip("/")
