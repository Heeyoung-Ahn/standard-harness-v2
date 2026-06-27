"""Structured diagnostic helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from uuid import uuid4


@dataclass(frozen=True)
class DiagnosticRecord:
    error_code: str
    severity: str
    category: str
    message: str
    repair_hint: str
    affected_entity_type: str | None = None
    affected_entity_id: str | None = None
    packet_id: str | None = None
    requirement_id: str | None = None
    acceptance_criterion_id: str | None = None
    gate_id: str | None = None
    evidence_id: str | None = None
    field: str | None = None
    expected_value: str | None = None
    actual_value: str | None = None
    source_reference: str | None = None
    freshness_watermark: int | None = None
    auto_fix_eligible: bool = False
    evidence_safe_snippet_allowed: bool = False
    diagnostic_id: str | None = None

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        if data["diagnostic_id"] is None:
            data["diagnostic_id"] = f"diag_{uuid4().hex}"
        return data
