"""V2.1 cumulative conformance gate."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.validation.catalog import ValidatorCatalog


ALLOWED_PARTIAL_HR = {"HR-130R"}


class V21ConformanceGate:
    gate_id = "v21-conformance-gate"

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def evaluate(self) -> dict[str, Any]:
        diagnostics: list[str] = []
        coverage = self._read("_harness/requirements/hr-coverage-matrix.yaml")["coverage"]
        traceability = self._read("_harness/requirements/traceability-matrix.yaml")["traceability"]
        trace_by_id = {item["hrId"]: item for item in traceability}
        for row in coverage:
            hr_id = row["hrId"]
            status = row.get("coverageStatus")
            if status != "complete" and hr_id not in ALLOWED_PARTIAL_HR:
                diagnostics.append("incomplete_hr_coverage")
            trace = trace_by_id.get(hr_id)
            target_validators = row.get("targetArtifacts", {}).get("validator", [])
            if (
                row.get("releaseBlocking")
                and not row.get("releaseBlockingValidators")
                and not target_validators
                and not (trace and trace.get("validators"))
            ):
                diagnostics.append("missing_release_blocking_validator")
            if not trace or not trace.get("tests"):
                diagnostics.append("missing_traceability")
        catalog = ValidatorCatalog.from_repo(self.repo_root)
        if not catalog.validators_for_hr("HR-190R"):
            diagnostics.append("missing_hr190_validator")
        if not catalog.gate_metadata_for_hr("HR-191"):
            diagnostics.append("missing_hr191_gate_metadata")
        if not any(row["hrId"] == "HR-200" and row.get("coverageStatus") == "complete" for row in coverage):
            diagnostics.append("missing_hr200_metrics")
        return {
            "status": "pass" if not diagnostics else "blocked",
            "diagnostic_ids": sorted(set(diagnostics)),
            "releaseBlocking": True,
            "gateId": self.gate_id,
        }

    def _read(self, relative: str) -> dict[str, Any]:
        return json.loads((self.repo_root / relative).read_text(encoding="utf-8"))
