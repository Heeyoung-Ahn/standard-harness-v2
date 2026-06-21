"""Manual handoff evidence intake classification."""

from __future__ import annotations

from typing import Any


class HandoffIntakeClassifier:
    def classify(self, result: dict[str, Any]) -> dict[str, str]:
        execution_mode = str(result.get("executionMode", "manual-handoff"))
        if execution_mode == "manual-handoff":
            return {"trustStatus": "MANUAL_ONLY", "validationStatus": "STRUCTURALLY_VALID"}
        return {"trustStatus": "RECORDED", "validationStatus": "RECORDED"}
