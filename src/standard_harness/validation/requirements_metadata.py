"""XP-00 requirements baseline validator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from standard_harness.requirements.metadata import (
    REQUIRED_SKILL_IDS,
    XP00_HR_IDS,
    RequirementsMetadataRepository,
)
from standard_harness.validation.diagnostics import DiagnosticRecord


class RequirementsMetadataValidator:
    validator_id = "requirements-metadata-validator"
    gate_id = "requirements-baseline-gate"

    def __init__(self, repo_root: Path | str):
        self.repo_root = Path(repo_root)
        self.repository = RequirementsMetadataRepository(self.repo_root)

    def validate(self) -> list[dict[str, Any]]:
        diagnostics: list[dict[str, Any]] = []
        diagnostics.extend(self._missing_artifact_diagnostics())
        if diagnostics:
            return diagnostics

        try:
            index = self.repository.requirements_index()
            traceability = self.repository.traceability_matrix()
            coverage = self.repository.hr_coverage_matrix()
            p0_policy = self.repository.p0_policy()
            guardrails = self.repository.non_goal_guardrails()
            skills = self.repository.minimum_required_skills()
            friction_schema = self.repository.friction_signal_schema()
            metric_schema = self.repository.metric_signal_schema()
        except (OSError, ValueError) as exc:
            return [
                self._diagnostic(
                    "invalid_hr_metadata",
                    "requirements",
                    "Requirements metadata artifact could not be parsed.",
                    "Keep XP-00 metadata artifacts valid JSON-compatible YAML/JSON.",
                    actual_value=str(exc),
                )
            ]

        diagnostics.extend(self._validate_index(index))
        diagnostics.extend(self._validate_traceability(traceability))
        diagnostics.extend(self._validate_coverage(coverage))
        diagnostics.extend(self._validate_p0_policy(p0_policy))
        diagnostics.extend(self._validate_guardrails(guardrails))
        diagnostics.extend(self._validate_skills(skills))
        diagnostics.extend(self._validate_signal_schema(friction_schema, "friction.signal"))
        diagnostics.extend(self._validate_signal_schema(metric_schema, "metric.signal"))
        return diagnostics

    def _missing_artifact_diagnostics(self) -> list[dict[str, Any]]:
        code_by_key = {
            "requirements-index": "missing_hr_metadata",
            "traceability-matrix": "missing_traceability",
            "hr-coverage-matrix": "missing_hr_coverage",
            "p0-policy": "missing_p0_policy",
            "non-goal-guardrails": "non_goal_guardrail_missing",
            "minimum-required-skills": "missing_skill_catalog",
            "friction-signal-schema": "missing_telemetry_schema",
            "metric-signal-schema": "missing_telemetry_schema",
        }
        diagnostics = []
        for key, path in self.repository.required_artifact_paths().items():
            if not path.exists():
                diagnostics.append(
                    self._diagnostic(
                        code_by_key[key],
                        "requirements",
                        f"Required XP-00 artifact is missing: {path}",
                        "Create the XP-00 requirements baseline, policy, guardrail, catalog, and telemetry artifacts.",
                        affected_entity_type="path",
                        affected_entity_id=str(path),
                    )
                )
        return diagnostics

    def _validate_index(self, index: dict[str, Any]) -> list[dict[str, Any]]:
        diagnostics = []
        requirements = index.get("requirements", [])
        by_id = {item.get("id"): item for item in requirements if isinstance(item, dict)}
        missing = sorted(XP00_HR_IDS - set(by_id))
        if missing:
            diagnostics.append(
                self._diagnostic(
                    "missing_hr_metadata",
                    "requirements",
                    "XP-00 HR metadata entries are missing.",
                    "Add all XP-00 HR IDs to _harness/requirements/requirements-index.yaml.",
                    field="requirements",
                    actual_value=",".join(missing),
                )
            )
        for hr_id in XP00_HR_IDS & set(by_id):
            item = by_id[hr_id]
            for field in ["id", "title", "type", "priority", "maturityLevel", "status", "version"]:
                if not item.get(field):
                    diagnostics.append(
                        self._diagnostic(
                            "missing_hr_metadata",
                            "requirements",
                            "Requirement metadata field is missing.",
                            "Populate the required HR metadata field.",
                            requirement_id=hr_id,
                            field=field,
                        )
                    )
            validators = item.get("verification", {}).get("validators", [])
            if not validators:
                diagnostics.append(
                    self._diagnostic(
                        "missing_hr_metadata",
                        "requirements",
                        "Requirement metadata lacks validator trace.",
                        "Link each XP-00 HR to at least one validator.",
                        requirement_id=hr_id,
                        field="verification.validators",
                    )
                )
        return diagnostics

    def _validate_traceability(self, matrix: dict[str, Any]) -> list[dict[str, Any]]:
        entries = matrix.get("traceability", [])
        by_id = {item.get("hrId"): item for item in entries if isinstance(item, dict)}
        missing = sorted(XP00_HR_IDS - set(by_id))
        if missing:
            return [
                self._diagnostic(
                    "missing_traceability",
                    "requirements",
                    "XP-00 traceability entries are missing.",
                    "Add HR-to-artifact trace rows for every XP-00 HR.",
                    field="traceability",
                    actual_value=",".join(missing),
                )
            ]
        diagnostics = []
        for hr_id in XP00_HR_IDS:
            entry = by_id[hr_id]
            if entry.get("xpOwner") != "XP-00":
                diagnostics.append(
                    self._diagnostic(
                        "missing_traceability",
                        "requirements",
                        "XP-00 HR trace has the wrong XP owner.",
                        "Set xpOwner to XP-00 for the XP-00 baseline trace.",
                        requirement_id=hr_id,
                        field="xpOwner",
                        expected_value="XP-00",
                        actual_value=str(entry.get("xpOwner")),
                    )
                )
            if not any(entry.get(field) for field in ["schemas", "policies", "validators", "gates", "tests"]):
                diagnostics.append(
                    self._diagnostic(
                        "missing_traceability",
                        "requirements",
                        "Trace row lacks implementation artifacts.",
                        "Link the HR to schema, policy, validator, gate, or test artifacts.",
                        requirement_id=hr_id,
                    )
                )
        return diagnostics

    def _validate_coverage(self, matrix: dict[str, Any]) -> list[dict[str, Any]]:
        entries = matrix.get("coverage", [])
        by_id = {item.get("hrId"): item for item in entries if isinstance(item, dict)}
        missing = sorted(XP00_HR_IDS - set(by_id))
        diagnostics = []
        if missing:
            diagnostics.append(
                self._diagnostic(
                    "missing_hr_coverage",
                    "requirements",
                    "XP-00 HR coverage rows are missing.",
                    "Add XP-00 HR coverage rows before closing XP-00.",
                    field="coverage",
                    actual_value=",".join(missing),
                )
            )
        for hr_id in XP00_HR_IDS & set(by_id):
            entry = by_id[hr_id]
            if entry.get("coverageStatus") not in {"missing", "partial", "complete", "not_applicable"}:
                diagnostics.append(
                    self._diagnostic(
                        "missing_hr_coverage",
                        "requirements",
                        "HR coverage status is invalid.",
                        "Use missing, partial, complete, or not_applicable.",
                        requirement_id=hr_id,
                        field="coverageStatus",
                        actual_value=str(entry.get("coverageStatus")),
                    )
                )
            if entry.get("xpOwner") != "XP-00":
                diagnostics.append(
                    self._diagnostic(
                        "missing_hr_coverage",
                        "requirements",
                        "XP-00 HR coverage has the wrong XP owner.",
                        "Set xpOwner to XP-00 for XP-00-owned baseline coverage.",
                        requirement_id=hr_id,
                    )
                )
        return diagnostics

    def _validate_p0_policy(self, policy: dict[str, Any]) -> list[dict[str, Any]]:
        if policy.get("p0Always", {}).get("nonWaivable") and policy.get("p0Conditional", {}).get(
            "nonWaivableWhenApplicable"
        ):
            return []
        return [
            self._diagnostic(
                "missing_p0_policy",
                "policy",
                "P0 policy is missing non-waivable Always or Conditional boundaries.",
                "Define P0-Always and P0-Conditional hard gate policy.",
                affected_entity_type="policy",
                affected_entity_id="_harness/policies/p0-policy.yaml",
            )
        ]

    def _validate_guardrails(self, policy: dict[str, Any]) -> list[dict[str, Any]]:
        guardrails = policy.get("guardrails", [])
        if len(guardrails) != 8:
            return [
                self._diagnostic(
                    "non_goal_guardrail_missing",
                    "policy",
                    "HR-003 must define exactly eight non-goal guardrails.",
                    "Map every HR-003 non-goal to a hard guardrail policy row.",
                    field="guardrails",
                    actual_value=str(len(guardrails)),
                )
            ]
        for item in guardrails:
            if item.get("sourceHr") != "HR-003" or not item.get("hardGuardrail") or item.get("waivable"):
                return [
                    self._diagnostic(
                        "non_goal_guardrail_missing",
                        "policy",
                        "A non-goal guardrail is not a hard non-waivable HR-003 guardrail.",
                        "Set sourceHr=HR-003, hardGuardrail=true, and waivable=false.",
                        affected_entity_type="guardrail",
                        affected_entity_id=str(item.get("id")),
                    )
                ]
        return []

    def _validate_skills(self, catalog: dict[str, Any]) -> list[dict[str, Any]]:
        skill_ids = {item.get("id") for item in catalog.get("skills", []) if isinstance(item, dict)}
        missing = sorted(REQUIRED_SKILL_IDS - skill_ids)
        if not missing and catalog.get("frozenUntil") == "XP-07":
            return []
        return [
            self._diagnostic(
                "missing_skill_catalog",
                "requirements",
                "Minimum required XP-00 skill list is incomplete or not frozen until XP-07.",
                "Add the seven XP-00 required skills and freeze them until XP-07 catalog review.",
                field="skills",
                actual_value=",".join(missing) if missing else str(catalog.get("frozenUntil")),
            )
        ]

    def _validate_signal_schema(self, schema: dict[str, Any], event_type: str) -> list[dict[str, Any]]:
        if schema.get("properties", {}).get("eventType", {}).get("const") == event_type:
            return []
        return [
            self._diagnostic(
                "missing_telemetry_schema",
                "schema",
                "Telemetry schema eventType is missing or invalid.",
                "Define friction.signal and metric.signal base schemas in XP-00.",
                field="properties.eventType.const",
                expected_value=event_type,
            )
        ]

    def _diagnostic(
        self,
        error_code: str,
        category: str,
        message: str,
        repair_hint: str,
        *,
        affected_entity_type: str | None = None,
        affected_entity_id: str | None = None,
        requirement_id: str | None = None,
        field: str | None = None,
        expected_value: str | None = None,
        actual_value: str | None = None,
    ) -> dict[str, Any]:
        return DiagnosticRecord(
            error_code=error_code,
            severity="high",
            category=category,
            message=message,
            repair_hint=repair_hint,
            affected_entity_type=affected_entity_type,
            affected_entity_id=affected_entity_id,
            requirement_id=requirement_id,
            gate_id=self.gate_id,
            field=field,
            expected_value=expected_value,
            actual_value=actual_value,
        ).to_dict()
