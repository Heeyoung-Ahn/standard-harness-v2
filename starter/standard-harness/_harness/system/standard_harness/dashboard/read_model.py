"""Dashboard JSON-ready read model."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.memory.operational import OperationalMemoryService
from standard_harness.projection.current_context import CurrentContextProjection
from standard_harness.state.store import HarnessStore
from standard_harness.validation.aggregator import ValidationService


class DashboardReadModel:
    def __init__(self, store: HarnessStore):
        self.store = store

    def packet_detail(self, packet_id: str) -> dict[str, Any]:
        packet = self._packet(packet_id)
        projection_freshness = self._projection_freshness(packet_id)
        warnings = []
        if projection_freshness.get("freshness_status") == "stale":
            warnings.append("stale_projection")
        return {
            "packet": packet,
            "approval": {
                "approval_state": packet["approval_state"],
                "approval_record_id": packet.get("approval_record_id"),
                "records": self._approval_records(packet_id),
            },
            "evidence": self._evidence(packet_id),
            "claims": self._claims(packet_id),
            "gates": {
                "declarations": self._gate_declarations(packet_id),
                "activations": self._gate_activations(packet_id),
                "results": self._gate_results(packet_id),
            },
            "closeouts": self._closeouts(packet_id),
            "diagnostics": ValidationService(self.store).validate_packet(packet_id),
            "projection_freshness": projection_freshness,
            "warnings": warnings,
            "memory_entries": OperationalMemoryService(self.store).preview_entries(packet_id=packet_id),
        }

    def _packet(self, packet_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute("select * from packets where packet_id = ?", (packet_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown packet: {packet_id}")
        packet = dict(row)
        for key in ("change_zones", "acceptance_criteria_ids", "evidence_requirements", "closeout_criteria"):
            packet[key] = json.loads(packet.pop(f"{key}_json"))
        packet["approval_required"] = bool(packet["approval_required"])
        return packet

    def _projection_freshness(self, packet_id: str) -> dict[str, Any]:
        try:
            projection = CurrentContextProjection(self.store).latest(packet_id=packet_id)
        except KeyError:
            return {"freshness_status": "missing"}
        return CurrentContextProjection(self.store).freshness(projection)

    def _approval_records(self, packet_id: str) -> list[dict[str, Any]]:
        return self._rows("approval_records", packet_id)

    def _evidence(self, packet_id: str) -> list[dict[str, Any]]:
        return self._rows("evidence", packet_id)

    def _claims(self, packet_id: str) -> list[dict[str, Any]]:
        rows = self._rows("claims", packet_id)
        for row in rows:
            row["evidence_ids"] = json.loads(row.pop("evidence_ids_json"))
            row["gate_result_ids"] = json.loads(row.pop("gate_result_ids_json"))
        return rows

    def _gate_declarations(self, packet_id: str) -> list[dict[str, Any]]:
        return self._rows("gate_declarations", packet_id)

    def _gate_activations(self, packet_id: str) -> list[dict[str, Any]]:
        return self._rows("gate_activations", packet_id)

    def _gate_results(self, packet_id: str) -> list[dict[str, Any]]:
        rows = self._rows("gate_results", packet_id)
        for row in rows:
            row["checked_claim_ids"] = json.loads(row.pop("checked_claim_ids_json"))
            row["evidence_ids"] = json.loads(row.pop("evidence_ids_json"))
        return rows

    def _closeouts(self, packet_id: str) -> list[dict[str, Any]]:
        rows = self._rows("closeouts", packet_id)
        for row in rows:
            row["checked_claim_ids"] = json.loads(row.pop("checked_claim_ids_json"))
            row["gate_result_ids"] = json.loads(row.pop("gate_result_ids_json"))
            row["evidence_ids"] = json.loads(row.pop("evidence_ids_json"))
            row["diagnostic_ids"] = json.loads(row.pop("diagnostic_ids_json"))
        return rows

    def _rows(self, table: str, packet_id: str) -> list[dict[str, Any]]:
        with self.store.connection() as conn:
            rows = conn.execute(
                f"select * from {table} where packet_id = ? order by 1",
                (packet_id,),
            ).fetchall()
        return [dict(row) for row in rows]

