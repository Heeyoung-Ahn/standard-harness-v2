"""Risk policy helpers."""

from __future__ import annotations


CANONICAL_RISK_LEVELS = ("low", "standard", "high", "critical")
DEFAULT_RISK_ALIASES = {
    "normal": "standard",
    "medium": "standard",
    "release-sensitive": "critical",
}
RISK_ORDER = {"low": 0, "standard": 1, "high": 2, "critical": 3}
NON_WAIVABLE_GATE_IDS = {"gate-release", "gate-integrity", "gate-security-critical"}


def normalize_risk_level(
    risk_level: str | None,
    *,
    aliases: dict[str, str] | None = None,
    default: str = "standard",
    unknown: str = "critical",
) -> str:
    normalized = _normalize_token(risk_level)
    if not normalized:
        return default
    merged_aliases = dict(DEFAULT_RISK_ALIASES)
    merged_aliases.update({_normalize_token(key): _normalize_token(value) for key, value in (aliases or {}).items()})
    normalized = merged_aliases.get(normalized, normalized)
    if normalized in CANONICAL_RISK_LEVELS:
        return normalized
    return unknown


def risk_value(risk_level: str | None, *, unknown: str = "critical") -> int:
    return RISK_ORDER[normalize_risk_level(risk_level, unknown=unknown)]


def is_non_waivable_gate(gate_id: str) -> bool:
    return gate_id in NON_WAIVABLE_GATE_IDS


def _normalize_token(value: str | None) -> str:
    return str(value or "").strip().lower().replace("_", "-").replace(" ", "-")

