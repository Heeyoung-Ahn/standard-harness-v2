"""Risk policy helpers."""

NON_WAIVABLE_GATE_IDS = {"gate-release", "gate-integrity", "gate-security-critical"}


def is_non_waivable_gate(gate_id: str) -> bool:
    return gate_id in NON_WAIVABLE_GATE_IDS

