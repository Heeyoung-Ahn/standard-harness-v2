"""Deterministic semantic classification for SSOT requirement changes."""

from __future__ import annotations

import re
import string
from typing import Any


CHANGE_CLASSES = {
    "unchanged",
    "editorial",
    "clarification",
    "semantic_change",
    "governance_risk_change",
    "removed",
    "ambiguous",
}
HUMAN_REVIEW_CLASSES = {
    "semantic_change",
    "governance_risk_change",
    "removed",
    "ambiguous",
}

STRONG_MODALS = {"shall", "must", "required", "requires"}
WEAK_MODALS = {"may", "should", "optional", "can"}
GOVERNANCE_TERMS = {
    "approval",
    "approve",
    "approved",
    "authority",
    "compliance",
    "data",
    "governance",
    "license",
    "permission",
    "privacy",
    "risk",
    "security",
    "waiver",
}
AMBIGUOUS_MARKERS = {"???", "tbd", "todo", "unclear", "ambiguous"}


class SemanticDiffService:
    """Classify requirement text changes without external NLP dependencies."""

    def compare(
        self,
        *,
        old_text: str,
        new_text: str,
        old_source_range: dict[str, int] | None = None,
        new_source_range: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        old_normalized = _normalize_whitespace(old_text)
        new_normalized = _normalize_whitespace(new_text)
        old_tokens = _tokens(old_normalized)
        new_tokens = _tokens(new_normalized)
        reasons: list[str] = []

        if old_normalized == new_normalized:
            change_class = "unchanged"
            reasons.append("text_unchanged")
        elif old_normalized and not new_normalized:
            change_class = "removed"
            reasons.append("new_text_empty")
        elif _is_ambiguous(new_normalized):
            change_class = "ambiguous"
            reasons.append("ambiguous_marker_detected")
        elif _has_inserted_governance_terms(old_tokens, new_tokens):
            change_class = "governance_risk_change"
            reasons.append("governance_or_risk_term_inserted")
        elif _weakens_modal(old_tokens, new_tokens):
            change_class = "semantic_change"
            reasons.append("modal_weakened")
        elif _strip_punctuation(old_normalized) == _strip_punctuation(new_normalized):
            change_class = "editorial"
            reasons.append("punctuation_only_change")
        elif old_tokens and old_tokens.issubset(new_tokens):
            change_class = "clarification"
            reasons.append("old_terms_preserved_with_explanation")
        else:
            change_class = "semantic_change"
            reasons.append("meaningful_token_change")

        return {
            "change_class": change_class,
            "requires_human_review": change_class in HUMAN_REVIEW_CLASSES,
            "reasons": reasons,
            "old_source_range": old_source_range,
            "new_source_range": new_source_range,
        }


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9_]+", text.lower()))


def _strip_punctuation(text: str) -> str:
    translation = str.maketrans("", "", string.punctuation)
    return _normalize_whitespace(text.translate(translation).lower())


def _is_ambiguous(text: str) -> bool:
    lowered = text.lower()
    return any(marker in lowered for marker in AMBIGUOUS_MARKERS)


def _weakens_modal(old_tokens: set[str], new_tokens: set[str]) -> bool:
    return bool(old_tokens & STRONG_MODALS) and bool(new_tokens & WEAK_MODALS)


def _has_inserted_governance_terms(old_tokens: set[str], new_tokens: set[str]) -> bool:
    return bool((new_tokens - old_tokens) & GOVERNANCE_TERMS)

