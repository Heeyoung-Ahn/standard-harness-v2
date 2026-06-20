"""Validation aggregator for MVP state, packet, starter, and projection checks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.starter.contamination import StarterContaminationChecker
from standard_harness.state.store import HarnessStore
from standard_harness.validation.diagnostics import DiagnosticRecord
from standard_harness.validation.readiness import ReadinessService


class ValidationService:
    def __init__(self, store: HarnessStore, *, starter_root: Path | None = None):
        self.store = store
        self.starter_root = starter_root or Path.cwd() / "starter" / "standard-harness"

    def validate_all(self, *, packet_id: str | None = None) -> list[dict[str, Any]]:
        diagnostics = []
        diagnostics.extend(self.validate_state())
        diagnostics.extend(self.validate_starter())
        if packet_id is not None:
            diagnostics.extend(self.validate_packet(packet_id))
            diagnostics.extend(self.validate_projection(packet_id))
        return diagnostics

    def validate_state(self) -> list[dict[str, Any]]:
        diagnostics = []
        with self.store.connection() as conn:
            migration = conn.execute(
                "select status from schema_migrations where schema_version = '1'"
            ).fetchone()
        if migration is None or migration["status"] != "applied":
            diagnostics.append(
                _diagnostic(
                    error_code="schema_migration_missing",
                    category="state",
                    message="Schema migration metadata is missing or not applied.",
                    repair_hint="Run init against the selected harness root.",
                    field="schema_migrations",
                )
            )
        return diagnostics

    def validate_packet(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = list(ReadinessService(self.store).check_packet(packet_id)["diagnostics"])
        diagnostics.extend(self._completion_diagnostics(packet_id))
        diagnostics.extend(self._gate_activation_diagnostics(packet_id))
        diagnostics.extend(self._approval_diagnostics(packet_id))
        return diagnostics

    def validate_projection(self, packet_id: str) -> list[dict[str, Any]]:
        try:
            projection = CurrentContextProjection(self.store).latest(packet_id=packet_id)
        except KeyError:
            return [
                _diagnostic(
                    error_code="missing_projection",
                    category="projection",
                    message="No current context projection exists for the packet.",
                    repair_hint="Run context for the packet before relying on generated current context.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            ]
        freshness = CurrentContextProjection(self.store).freshness(projection)
        if freshness["freshness_status"] == "fresh":
            return []
        return [
            _diagnostic(
                error_code="stale_projection",
                category="projection",
                message="Current context projection is stale.",
                repair_hint="Regenerate current context before using it for authority decisions.",
                affected_entity_type="packet",
                affected_entity_id=packet_id,
                packet_id=packet_id,
                field="source_watermark",
                expected_value=str(freshness["latest_event_seq"]),
                actual_value=str(freshness["source_watermark"]),
            )
        ]

    def validate_starter(self) -> list[dict[str, Any]]:
        diagnostics = []
        readme = self.starter_root / "README.md"
        start_here = self.starter_root / "START_HERE.md"
        if not readme.exists():
            diagnostics.append(
                _diagnostic(
                    error_code="missing_starter_readme",
                    category="starter",
                    message="Starter README is missing.",
                    repair_hint="Add starter/standard-harness/README.md to identify the clean starter payload.",
                    affected_entity_type="path",
                    affected_entity_id=str(readme),
                )
            )
        if not start_here.exists():
            diagnostics.append(
                _diagnostic(
                    error_code="missing_starter_start_here",
                    category="starter",
                    message="Starter START_HERE document is missing.",
                    repair_hint="Add starter/standard-harness/START_HERE.md with the first low-risk packet path.",
                    affected_entity_type="path",
                    affected_entity_id=str(start_here),
                )
            )
        if self.starter_root.exists():
            paths = [str(path) for path in self.starter_root.rglob("*") if path.is_file()]
            diagnostics.extend(StarterContaminationChecker().check_paths(paths))
        return diagnostics

    def _completion_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            supported_claims = conn.execute(
                """
                select evidence_ids_json from claims
                where packet_id = ? and support_status = 'supported'
                """,
                (packet_id,),
            ).fetchall()
            passing_gates = conn.execute(
                "select 1 from gate_results where packet_id = ? and status = 'pass'",
                (packet_id,),
            ).fetchall()
        diagnostics = []
        evidence_ids = []
        for claim in supported_claims:
            evidence_ids.extend(json.loads(claim["evidence_ids_json"]))
        if not evidence_ids:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_evidence",
                    category="evidence",
                    message="Packet has no supported claim backed by evidence.",
                    repair_hint="Register passed evidence and record a supported claim before closeout.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        if not passing_gates:
            diagnostics.append(
                _diagnostic(
                    error_code="missing_gate_pass",
                    category="gate",
                    message="Packet has no passing gate result.",
                    repair_hint="Declare and activate the required gate, then record a pass with checked claims and evidence.",
                    affected_entity_type="packet",
                    affected_entity_id=packet_id,
                    packet_id=packet_id,
                )
            )
        return diagnostics

    def _gate_activation_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        diagnostics = []
        with self.store.connection() as conn:
            rows = conn.execute(
                """
                select gate_id from gate_declarations
                where packet_id = ?
                """,
                (packet_id,),
            ).fetchall()
            for row in rows:
                active = conn.execute(
                    """
                    select 1 from gate_activations
                    where packet_id = ? and gate_id = ? and activation_status = 'active'
                    """,
                    (packet_id, row["gate_id"]),
                ).fetchone()
                if active is None:
                    diagnostics.append(
                        _diagnostic(
                            error_code="inactive_gate",
                            category="gate",
                            message="Declared gate is not active.",
                            repair_hint="Run gate-activate for the declared gate before recording results.",
                            affected_entity_type="gate",
                            affected_entity_id=row["gate_id"],
                            packet_id=packet_id,
                            gate_id=row["gate_id"],
                        )
                    )
        return diagnostics

    def _approval_diagnostics(self, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            packet = conn.execute(
                "select approval_state, approval_record_id from packets where packet_id = ?",
                (packet_id,),
            ).fetchone()
            if packet is None or packet["approval_state"] != "approved":
                return []
            approval = conn.execute(
                "select 1 from approval_records where approval_record_id = ?",
                (packet["approval_record_id"],),
            ).fetchone()
        if approval is not None:
            return []
        return [
            _diagnostic(
                error_code="missing_approval_record",
                category="approval",
                message="Packet approval state is approved but approval record is missing.",
                repair_hint="Re-run packet-approve to persist approval authority.",
                affected_entity_type="packet",
                affected_entity_id=packet_id,
                packet_id=packet_id,
                field="approval_record_id",
            )
        ]


def _diagnostic(
    *,
    error_code: str,
    category: str,
    message: str,
    repair_hint: str,
    affected_entity_type: str | None = None,
    affected_entity_id: str | None = None,
    packet_id: str | None = None,
    gate_id: str | None = None,
    field: str | None = None,
    expected_value: str | None = None,
    actual_value: str | None = None,
) -> dict[str, Any]:
    return DiagnosticRecord(
        error_code=error_code,
        severity="high",
        category=category,
        message=message,
        repair_hint=repair_hint,
        affected_entity_type=affected_entity_type,
        affected_entity_id=affected_entity_id,
        packet_id=packet_id,
        gate_id=gate_id,
        field=field,
        expected_value=expected_value,
        actual_value=actual_value,
    ).to_dict()
