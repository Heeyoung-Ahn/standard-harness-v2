"""Recurring friction detection."""

from __future__ import annotations

from collections import Counter
from typing import Any


class RecurringFrictionDetector:
    def __init__(self, threshold: int = 2):
        self.threshold = threshold

    def detect(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        counts = Counter(str(record.get("signalType") or record.get("friction_type")) for record in records)
        recurring = {key: value for key, value in counts.items() if key and value >= self.threshold}
        diagnostics = ["recurring_friction_detected"] if recurring else []
        return {
            "status": "recurring" if recurring else "clear",
            "recurring": recurring,
            "diagnostic_ids": diagnostics,
            "frictionSignalBehavior": "emit recurring_friction_detected when threshold is met",
            "metricSignalBehavior": "emit recurring_friction_count by friction type",
        }


def friction_signal_from_record(record: dict[str, Any]) -> dict[str, Any]:
    source_xp = record.get("sourceXp") or record.get("source_xp") or "XP-09"
    signal_type = record.get("signalType") or record.get("signal_type") or record.get("friction_type")
    observed_at_gate = record.get("observedAtGate") or record.get("observed_at_gate") or "compound-engineering-gate"
    return {
        "eventType": "friction.signal",
        "sourceXp": source_xp,
        "packetId": record.get("packetId") or record.get("packet_id"),
        "signalType": signal_type,
        "severity": record.get("severity", "medium"),
        "observedAtGate": observed_at_gate,
        "evidenceIds": record.get("evidenceIds") or record.get("evidence_ids", []),
        "dedupeKey": record.get("dedupeKey") or f"{source_xp}:{observed_at_gate}:{signal_type}",
        "preventableByHarness": bool(record.get("preventableByHarness", record.get("preventable_by_harness", True))),
        "candidateFixType": record.get("candidateFixType") or record.get("candidate_fix_type", "validator"),
        "remediationTarget": record.get("remediationTarget") or record.get("remediation_target", "compound-engineering"),
    }
