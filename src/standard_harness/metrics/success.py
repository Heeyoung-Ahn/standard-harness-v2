"""Success metrics and Compound Engineering completion gate."""

from __future__ import annotations

from typing import Any


class SuccessMetricsReporter:
    def build(
        self,
        *,
        friction_records: list[dict[str, Any]],
        cost_records: list[dict[str, Any]],
        completion_results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        total = len(completion_results)
        complete = sum(1 for item in completion_results if item.get("status") == "complete")
        return {
            "metricId": "HR-200",
            "frictionCount": len(friction_records),
            "totalCostEstimate": sum(float(item.get("cost_estimate", 0)) for item in cost_records),
            "completionRate": 1.0 if total == 0 else complete / total,
            "frictionSignalBehavior": "aggregate XP friction signals into HR-200 metrics",
            "metricSignalBehavior": "emit success_metrics_report_generated",
        }


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
