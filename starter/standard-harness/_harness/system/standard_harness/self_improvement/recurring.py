"""Recurring friction detection."""

from __future__ import annotations

from collections import Counter
from collections import defaultdict
from hashlib import sha256
from pathlib import PurePosixPath
from typing import Any


class RecurringFrictionDetector:
    def __init__(self, threshold: int = 2):
        self.threshold = threshold

    def detect(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        groups_by_key: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
        for record in records:
            normalized = _normalize_record(record)
            groups_by_key[
                (
                    normalized["type"],
                    normalized["recurrence_key"],
                    normalized["source_surface"],
                    normalized["evidence_pattern"],
                )
            ].append(normalized)
        groups = [_group_from_records(key, value, self.threshold) for key, value in groups_by_key.items()]
        recurring_groups = [group for group in groups if group["status"] == "recurring"]
        counts = Counter(group["type"] for group in recurring_groups)
        recurring = {key: value for key, value in counts.items() if key}
        diagnostics = ["recurring_friction_detected"] if recurring_groups else []
        return {
            "status": "recurring" if recurring_groups else "clear",
            "recurring": recurring,
            "groups": groups,
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


def _normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    evidence_ref = str(record.get("evidence_ref") or record.get("evidenceRef") or "")
    evidence_ids = record.get("evidenceIds") or record.get("evidence_ids") or []
    evidence_pattern_source = _evidence_pattern_source(evidence_ref, evidence_ids)
    evidence_pattern = sha256(evidence_pattern_source.encode("utf-8")).hexdigest()[:8]
    return {
        "id": record.get("id") or record.get("friction_record_id") or record.get("signalId"),
        "type": record.get("type") or record.get("signalType") or record.get("friction_type"),
        "recurrence_key": record.get("recurrence_key")
        or record.get("recurrenceKey")
        or record.get("dedupeKey"),
        "source_surface": record.get("source_surface")
        or record.get("sourceSurface")
        or record.get("observedAtGate"),
        "severity": record.get("severity", "medium"),
        "evidence_ref": evidence_ref,
        "evidence_pattern": evidence_pattern,
    }


def _group_from_records(
    key: tuple[str, str, str, str], records: list[dict[str, Any]], threshold: int
) -> dict[str, Any]:
    friction_type, recurrence_key, source_surface, evidence_pattern = key
    recurrence_count = len(records)
    severity_order = {"low": 0, "medium": 1, "high": 2}
    severities = [str(record.get("severity", "medium")) for record in records]
    severity_trend = max(severities, key=lambda item: severity_order.get(item, 0))
    evidence_refs = [record["evidence_ref"] for record in records if record.get("evidence_ref")]
    return {
        "group_id": f"group-{sha256('|'.join(key).encode('utf-8')).hexdigest()[:12]}",
        "type": friction_type,
        "recurrence_key": recurrence_key,
        "source_surface": source_surface,
        "evidence_pattern": evidence_pattern,
        "recurrence_count": recurrence_count,
        "latest_occurrence": records[-1].get("id"),
        "affected_surfaces": sorted({source_surface}),
        "severity_trend": severity_trend,
        "evidence_refs": evidence_refs,
        "evidence_complete": bool(evidence_refs) and len(evidence_refs) == recurrence_count,
        "proposal_eligible": recurrence_count >= threshold and bool(evidence_refs),
        "status": "recurring" if recurrence_count >= threshold else "single",
    }


def _evidence_pattern_source(evidence_ref: str, evidence_ids: list[Any]) -> str:
    if evidence_ref:
        normalized = evidence_ref.replace("\\", "/")
        path = PurePosixPath(normalized)
        return f"{path.parent.as_posix()}/*{path.suffix}"
    return ",".join(str(item) for item in evidence_ids)
