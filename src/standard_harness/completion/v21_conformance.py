"""V2.1 cumulative conformance gate."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.validation.catalog import ValidatorCatalog
from standard_harness.validation.challenge_review_evidence import ChallengeReviewEvidenceValidator
from standard_harness.validation.executable_release import ExecutableReleaseValidator
from standard_harness.validation.final_closeout import FinalCloseoutValidator
from standard_harness.validation.review_governance import ReviewGovernanceValidator
from standard_harness.validation.wiki_knowledge import WikiKnowledgeValidator
from standard_harness.release.evidence import load_full_regression_evidence, missing_full_regression_fields


class V21ConformanceGate:
    gate_id = "v21-conformance-gate"

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def evaluate(self) -> dict[str, Any]:
        diagnostics: list[str] = []
        coverage = self._read("_harness/requirements/hr-coverage-matrix.yaml")["coverage"]
        metadata = self._read("_harness/requirements/hr-coverage-matrix.yaml")
        traceability = self._read("_harness/requirements/traceability-matrix.yaml")["traceability"]
        trace_by_id = {item["hrId"]: item for item in traceability}
        for row in coverage:
            hr_id = row["hrId"]
            status = row.get("coverageStatus")
            if status != "complete":
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
        required_validator_ids = {
            item["validator"]
            for item in metadata.get("releaseBlockingValidators", [])
            if item.get("validator")
        }
        missing_catalog_entries = required_validator_ids - catalog.ids()
        if missing_catalog_entries:
            diagnostics.append("missing_validator_catalog_entry")
        diagnostics.extend(catalog.release_blocking_diagnostics(repo_root=self.repo_root))
        if not catalog.validators_for_hr("HR-190R"):
            diagnostics.append("missing_hr190_validator")
        if not catalog.gate_metadata_for_hr("HR-191"):
            diagnostics.append("missing_hr191_gate_metadata")
        if not any(row["hrId"] == "HR-200" and row.get("coverageStatus") == "complete" for row in coverage):
            diagnostics.append("missing_hr200_metrics")
        diagnostics.extend(self._hr200_metric_diagnostics())
        diagnostics.extend(self._release_regression_diagnostics())
        diagnostics.extend(self._release_hygiene_diagnostics())
        diagnostics.extend(self._challenge_review_diagnostics())
        diagnostics.extend(self._review_governance_diagnostics())
        diagnostics.extend(self._wiki_knowledge_diagnostics())
        diagnostics.extend(self._executable_release_diagnostics())
        diagnostics.extend(self._final_closeout_diagnostics())
        diagnostics.extend(self._release_doc_diagnostics())
        return {
            "status": "pass" if not diagnostics else "blocked",
            "diagnostic_ids": sorted(set(diagnostics)),
            "releaseBlocking": True,
            "gateId": self.gate_id,
        }

    def _read(self, relative: str) -> dict[str, Any]:
        return json.loads((self.repo_root / relative).read_text(encoding="utf-8"))

    def _hr200_metric_diagnostics(self) -> list[str]:
        path = self.repo_root / "_ops/metrics/hr200-success-metrics.json"
        if not path.exists():
            return ["missing_hr200_metrics"]
        try:
            metrics = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return ["incomplete_hr200_metrics"]
        required = {
            "metricId",
            "completionRate",
            "trustedEvidenceRatio",
            "docsCommandInventoryCoverage",
            "closeoutClaimLedgerCoverage",
            "sourceWatermark",
        }
        if metrics.get("metricId") != "HR-200" or any(field not in metrics for field in required):
            return ["incomplete_hr200_metrics"]
        watermark = metrics.get("sourceWatermark")
        required_watermark = {
            "sourceEventRange",
            "sourceRecordHash",
            "generationCommand",
            "generatedAt",
            "computedBy",
        }
        diagnostics: list[str] = []
        if not isinstance(watermark, dict) or any(not watermark.get(field) for field in required_watermark):
            diagnostics.append("incomplete_hr200_metrics")
        else:
            if metrics.get("sourceRecordHash") != watermark.get("sourceRecordHash"):
                diagnostics.append("stale_hr200_metrics")
        for field in (
            "completionRate",
            "trustedEvidenceRatio",
            "docsCommandInventoryCoverage",
            "closeoutClaimLedgerCoverage",
        ):
            value = metrics.get(field)
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                diagnostics.append("invalid_hr200_metric_type")
            elif value < 0 or value > 1:
                diagnostics.append("invalid_hr200_metric_type")
        return diagnostics

    def _release_regression_diagnostics(self) -> list[str]:
        path = self.repo_root / "_ops/evidence/release/v21-full-regression.json"
        if not path.exists():
            return ["missing_release_regression_evidence"]
        try:
            evidence = load_full_regression_evidence(self.repo_root)
        except json.JSONDecodeError:
            return ["incomplete_release_regression_evidence"]
        if missing_full_regression_fields(evidence):
            return ["incomplete_release_regression_evidence"]
        if evidence.get("result") != "passed" or evidence.get("timeoutStatus") != "completed":
            return ["failed_release_regression_evidence"]
        return []

    def _release_hygiene_diagnostics(self) -> list[str]:
        if (self.repo_root / ".harness/state/harness.sqlite3").exists():
            return ["repo_local_generated_state"]
        return []

    def _challenge_review_diagnostics(self) -> list[str]:
        required_xps = [
            "XP-01",
            "XP-02",
            "XP-03",
            "XP-04",
            "XP-05",
            "XP-06",
            "XP-07",
            "XP-08",
            "XP-09",
            "XP-10",
            "XP-07A",
            "XP-09A",
            "XP-ProcessA",
            "XP-PackagingA",
            "XP-10A",
        ]
        result = ChallengeReviewEvidenceValidator(self.repo_root).validate_required(required_xps)
        return ["missing_challenge_review_evidence"] if result["status"] != "pass" else []

    def _review_governance_diagnostics(self) -> list[str]:
        result = ReviewGovernanceValidator(self.repo_root).validate_release()
        return list(result["diagnostic_ids"])

    def _wiki_knowledge_diagnostics(self) -> list[str]:
        result = WikiKnowledgeValidator(self.repo_root).validate_release()
        return list(result["diagnostic_ids"])

    def _executable_release_diagnostics(self) -> list[str]:
        result = ExecutableReleaseValidator(self.repo_root).validate_release()
        return list(result["diagnostic_ids"])

    def _final_closeout_diagnostics(self) -> list[str]:
        result = FinalCloseoutValidator(self.repo_root).validate_release()
        return list(result["diagnostic_ids"])

    def _release_doc_diagnostics(self) -> list[str]:
        required = [
            "docs/release/v21-conformance-report.md",
            "docs/release/release-packaging-hygiene-v21.md",
            "docs/release/final-product-docs-command-inventory-v1.md",
            "docs/manual/standard-harness-v21-development-scenario.md",
        ]
        missing = [relative for relative in required if not (self.repo_root / relative).exists()]
        return ["missing_release_archive_artifact"] if missing else []
