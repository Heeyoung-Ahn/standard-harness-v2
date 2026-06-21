"""Wiki proposal helpers."""

from __future__ import annotations

from typing import Any


def mark_validated(proposal: dict[str, Any]) -> dict[str, Any]:
    result = dict(proposal)
    result["validationStatus"] = "validated"
    result["validatedBy"] = "wiki-proposal-validator"
    return result
