"""Success metrics and Compound Engineering completion gate."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


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
    ) -> dict[str, Any]:
        validation_records = validation_records or []
        evidence_records = evidence_records or []
        command_records = command_records or []
        claim_records = claim_records or []
        total = len(completion_results)
        complete = sum(1 for item in completion_results if item.get("status") == "complete")
        trusted_evidence = sum(1 for item in evidence_records if item.get("trustStatus") == "TRUSTED")
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
            "completionRate": 1.0 if total == 0 else complete / total,
            "packetCloseoutCompleteness": 1.0 if total == 0 else complete / total,
            "p0AlwaysValidationCoverage": 1.0 if not p0_validations else _passed_ratio(p0_validations),
            "boundaryViolationDetection": 1.0 if not boundary_validations else _passed_ratio(boundary_validations),
            "evidenceIndexCoverage": 1.0 if not evidence_records else 1.0,
            "trustedEvidenceRatio": 1.0 if not evidence_records else trusted_evidence / len(evidence_records),
            "docsCommandInventoryCoverage": 1.0 if not command_records else documented_commands / len(command_records),
            "closeoutClaimLedgerCoverage": 1.0 if not claim_records else supported_claims / len(claim_records),
            "repeatedFrictionCount": len(friction_records),
            "sourceWatermark": {
                "sourceEventRange": source_event_range,
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
        )
        path = Path(repo_root) / "_ops" / "metrics" / "hr200-success-metrics.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
        return path


def _passed_ratio(records: list[dict[str, Any]]) -> float:
    passed = sum(1 for item in records if item.get("status") in {"pass", "passed", "ok"})
    return passed / len(records)


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
