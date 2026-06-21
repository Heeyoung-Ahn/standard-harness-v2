"""Recurring friction detection."""

from __future__ import annotations

from collections import Counter
from typing import Any


class RecurringFrictionDetector:
    def __init__(self, threshold: int = 2):
        self.threshold = threshold

    def detect(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        counts = Counter(str(record.get("friction_type")) for record in records)
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
    return {
        "eventType": "friction.signal",
        "sourceRecordId": record.get("friction_record_id"),
        "frictionType": record.get("friction_type"),
        "evidenceIds": record.get("evidence_ids", []),
    }
