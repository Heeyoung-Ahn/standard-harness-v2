"""Context routing that preserves canonical authority boundaries."""

from __future__ import annotations

from typing import Any

from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.state.store import HarnessStore


class ContextRouter:
    def __init__(self, store: HarnessStore):
        self.store = store

    def route(
        self, *, projection: dict[str, Any], untrusted_content: dict[str, Any]
    ) -> dict[str, Any]:
        freshness = CurrentContextProjection(self.store).freshness(projection)
        rejected = []
        packet_override = untrusted_content.get("packet")
        if isinstance(packet_override, dict):
            rejected.extend(f"packet.{key}" for key in packet_override)
        if "gate_override" in untrusted_content:
            rejected.append("gate_override")
        for key in (
            "approved_ssot",
            "requirements",
            "requirement",
            "gate_results",
            "gate_result",
            "gates",
        ):
            if key in untrusted_content:
                rejected.append(key)
        diagnostics = []
        if freshness["freshness_status"] != "fresh":
            diagnostics.append("stale_projection")
        if rejected:
            diagnostics.append("untrusted_authority_override")
        return {
            "status": "blocked" if diagnostics else "accepted",
            "diagnostic_codes": diagnostics,
            "rejected_overrides": rejected,
            "authority_precedence": projection.get("authority_precedence", []),
        }
