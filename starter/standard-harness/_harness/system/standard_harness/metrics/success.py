"""Success metrics and Compound Engineering completion gate."""

from __future__ import annotations

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from standard_harness.evidence.trust import TRUST_STATUSES


TRUSTED_EVIDENCE_STATUSES = {"REPRODUCED_BY_HARNESS", "TRUSTED_CI"}
GENERATION_COMMAND = "python _harness\\bin\\harness_cli.py --json validate --v21-conformance"


class SuccessMetricsReporter:
    def build(
        self,
        *,
        friction_records: list[dict[str, Any]],
        cost_records: list[dict[str, Any]],
        completion_results: list[dict[str, Any]],
        validation_records: list[dict[str, Any]] | None = None,
        evidence_records: list[dict[str, Any]] | None = None,
        command_records: list[dict[str, Any]] | None = None,
        claim_records: list[dict[str, Any]] | None = None,
        source_event_range: str = "projection",
        source_record_hash: str | None = None,
        metrics_not_applicable: bool = False,
    ) -> dict[str, Any]:
        validation_records = validation_records or []
        evidence_records = evidence_records or []
        command_records = command_records or []
        claim_records = claim_records or []
        source_payload = {
            "friction_records": friction_records,
            "cost_records": cost_records,
            "completion_results": completion_results,
            "validation_records": validation_records,
            "evidence_records": evidence_records,
            "command_records": command_records,
            "claim_records": claim_records,
            "source_event_range": source_event_range,
        }
        has_source_records = any(
            source_payload[key]
            for key in (
                "friction_records",
                "cost_records",
                "completion_results",
                "validation_records",
                "evidence_records",
                "command_records",
                "claim_records",
            )
        )
        if not has_source_records and not metrics_not_applicable:
            raise ValueError("missing_source_records")
        if not source_record_hash:
            if metrics_not_applicable:
                source_record_hash = "not_applicable"
            else:
                source_record_hash = _source_record_hash(source_payload)
        total = len(completion_results)
        complete = sum(1 for item in completion_results if item.get("status") == "complete")
        trusted_evidence = 0
        for item in evidence_records:
            trust_status = str(item.get("trustStatus") or item.get("trust_status") or "")
            if trust_status not in TRUST_STATUSES:
                raise ValueError("invalid_trust_status")
            if trust_status in TRUSTED_EVIDENCE_STATUSES:
                trusted_evidence += 1
        supported_claims = sum(1 for item in claim_records if item.get("supportStatus") == "supported")
        documented_commands = sum(1 for item in command_records if item.get("status") == "documented")
        p0_validations = [
            item for item in validation_records if item.get("validatorId") or item.get("validator")
        ]
        boundary_validations = [
            item
            for item in validation_records
            if item.get("validatorId") == "boundary-validator" or item.get("validator") == "boundary-validator"
        ]
        return {
            "metricId": "HR-200",
            "frictionCount": len(friction_records),
            "totalCostEstimate": sum(float(item.get("cost_estimate", 0)) for item in cost_records),
            "completionRate": 0.0 if total == 0 else complete / total,
            "packetCloseoutCompleteness": 0.0 if total == 0 else complete / total,
            "p0AlwaysValidationCoverage": 1.0 if not p0_validations else _passed_ratio(p0_validations),
            "boundaryViolationDetection": 1.0 if not boundary_validations else _passed_ratio(boundary_validations),
            "evidenceIndexCoverage": 0.0 if not evidence_records else 1.0,
            "trustedEvidenceRatio": 0.0 if not evidence_records else trusted_evidence / len(evidence_records),
            "docsCommandInventoryCoverage": 1.0 if not command_records else documented_commands / len(command_records),
            "closeoutClaimLedgerCoverage": 1.0 if not claim_records else supported_claims / len(claim_records),
            "repeatedFrictionCount": len(friction_records),
            "sourceRecordHash": source_record_hash,
            "sourceWatermark": {
                "sourceEventRange": source_event_range,
                "sourceRecordHash": source_record_hash,
                "generationCommand": GENERATION_COMMAND,
                "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "computedBy": "success-metrics@v2.1",
            },
            "frictionSignalBehavior": "aggregate XP friction signals into HR-200 metrics",
            "metricSignalBehavior": "emit success_metrics_report_generated",
        }

    def write_state_backed_report(self, repo_root: str | Path, source_records: dict[str, Any]) -> Path:
        report = self.build(
            friction_records=source_records.get("friction_records", []),
            cost_records=source_records.get("cost_records", []),
            completion_results=source_records.get("completion_results", []),
            validation_records=source_records.get("validation_records", []),
            evidence_records=source_records.get("evidence_records", []),
            command_records=source_records.get("command_records", []),
            claim_records=source_records.get("claim_records", []),
            source_event_range=source_records.get("source_event_range", "projection"),
            source_record_hash=source_records.get("source_record_hash"),
            metrics_not_applicable=bool(source_records.get("metrics_not_applicable", False)),
        )
        path = Path(repo_root) / "_ops" / "metrics" / "hr200-success-metrics.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
        return path


def _passed_ratio(records: list[dict[str, Any]]) -> float:
    passed = sum(1 for item in records if item.get("status") in {"pass", "passed", "ok"})
    return passed / len(records)


def _source_record_hash(source_payload: dict[str, Any]) -> str:
    encoded = json.dumps(source_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"sha256:{hashlib.sha256(encoded).hexdigest()}"


class CompoundCompletionGate:
    def evaluate(self, data: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        if not data.get("successMetricsReport"):
            diagnostics.append("missing_success_metrics_report")
        if not data.get("starterPromotionCandidates"):
            diagnostics.append("missing_starter_promotion_candidate")
        if data.get("recurringFrictionDetected") and "missing_success_metrics_report" not in diagnostics:
            pass
        return {"status": "blocked" if diagnostics else "pass", "diagnostic_ids": diagnostics}
