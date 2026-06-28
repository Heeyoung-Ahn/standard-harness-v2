"""Packet closeout evidence index contract."""

from __future__ import annotations

from typing import Any


SCHEMA_VERSION = "standard-harness-closeout-evidence-index/v1"
REQUIRED_EVIDENCE_FIELDS = (
    "evidenceId",
    "evidenceType",
    "sourcePath",
    "status",
    "trustStatus",
    "freshnessStatus",
    "resolutionStatus",
    "redactionStatus",
)
PASSING_STATUSES = {"pass", "passed", "PASS", "not_applicable_recorded", "N/A_RECORDED"}
TRUSTED_STATUSES = {"trusted", "accepted-risk"}
FRESH_STATUSES = {"fresh"}
RESOLVED_STATUSES = {"resolved", "not-applicable"}


class EvidenceIndexContract:
    def build_index(
        self,
        *,
        packet_id: str,
        entries: list[dict[str, Any]] | None = None,
        required_gates: list[str] | None = None,
        generated_by: str = "closeout-evidence-index-validator",
    ) -> dict[str, Any]:
        normalized_packet_id = _text(packet_id) or "unknown-packet"
        return {
            "schemaVersion": SCHEMA_VERSION,
            "packetId": normalized_packet_id,
            "evidenceIndexPath": f"_ops/evidence/{normalized_packet_id}/evidence-index.json",
            "generatedBy": generated_by,
            "requiredGates": list(required_gates or []),
            "entries": [self.normalize_entry(entry) for entry in entries or []],
        }

    def normalize_entry(self, entry: dict[str, Any]) -> dict[str, Any]:
        source = entry or {}
        return {
            "evidenceId": _text(source.get("evidenceId") or source.get("id")),
            "evidenceType": _text(source.get("evidenceType") or source.get("type")),
            "sourcePath": _text(source.get("sourcePath") or source.get("path")),
            "status": _text(source.get("status")),
            "trustStatus": _text(source.get("trustStatus") or source.get("trust")),
            "freshnessStatus": _text(source.get("freshnessStatus") or source.get("freshness")),
            "resolutionStatus": _text(source.get("resolutionStatus") or source.get("resolution")),
            "redactionStatus": _text(source.get("redactionStatus") or source.get("redaction")),
            "sensitivity": _text(source.get("sensitivity") or "none"),
            "requiredGate": _text(source.get("requiredGate") or source.get("gate")),
            "claimId": _text(source.get("claimId") or source.get("claim")),
            "acceptanceId": _text(source.get("acceptanceId") or source.get("acceptance")),
            "naRecord": source.get("naRecord") or source.get("na_record"),
        }

    def validate_index(
        self,
        *,
        index: dict[str, Any],
        required_gates: list[str] | None = None,
    ) -> dict[str, Any]:
        diagnostics: list[dict[str, Any]] = []
        if not isinstance(index, dict):
            return {"ok": False, "diagnostics": [{"code": "invalid_evidence_index", "field": "index"}]}

        raw_entries = index.get("entries")
        if not isinstance(raw_entries, list):
            raw_entries = []
            diagnostics.append({"code": "invalid_evidence_entries", "field": "entries"})
        entries = [self.normalize_entry(entry) for entry in raw_entries]

        for entry_index, entry in enumerate(entries):
            for field in REQUIRED_EVIDENCE_FIELDS:
                if not _text(entry.get(field)):
                    diagnostics.append({"code": "missing_evidence_index_field", "field": field, "entryIndex": entry_index})
            if entry.get("status") == "not_applicable_recorded":
                na_record = entry.get("naRecord") if isinstance(entry.get("naRecord"), dict) else {}
                if not _text(na_record.get("reason")):
                    diagnostics.append({"code": "invalid_na_record", "field": "reason", "evidenceId": entry.get("evidenceId")})
                if not _text(na_record.get("substituteCheck")):
                    diagnostics.append({"code": "invalid_na_record", "field": "substituteCheck", "evidenceId": entry.get("evidenceId")})
                if not _text(na_record.get("evidenceLink")):
                    diagnostics.append({"code": "invalid_na_record", "field": "evidenceLink", "evidenceId": entry.get("evidenceId")})

        for gate in required_gates or []:
            match = next((entry for entry in entries if entry.get("requiredGate") == gate), None)
            if match is None:
                diagnostics.append({"code": "missing_required_gate_evidence", "gate": gate})
                continue
            if match.get("status") not in PASSING_STATUSES:
                diagnostics.append({"code": "required_gate_not_passing", "gate": gate, "evidenceId": match.get("evidenceId"), "status": match.get("status")})
            if match.get("trustStatus") not in TRUSTED_STATUSES:
                diagnostics.append({"code": "required_gate_untrusted", "gate": gate, "evidenceId": match.get("evidenceId"), "trustStatus": match.get("trustStatus")})
            if match.get("freshnessStatus") not in FRESH_STATUSES:
                diagnostics.append({"code": "required_gate_stale", "gate": gate, "evidenceId": match.get("evidenceId"), "freshnessStatus": match.get("freshnessStatus")})
            if match.get("resolutionStatus") not in RESOLVED_STATUSES:
                diagnostics.append({"code": "required_gate_unresolved", "gate": gate, "evidenceId": match.get("evidenceId"), "resolutionStatus": match.get("resolutionStatus")})

        return {"ok": not diagnostics, "diagnostics": diagnostics}


def _text(value: Any) -> str:
    return str(value or "").strip()
