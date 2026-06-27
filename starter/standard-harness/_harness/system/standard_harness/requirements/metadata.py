"""Load the V2.1 requirements metadata artifacts.

The ``*.yaml`` artifacts in ``_harness`` intentionally use a JSON-compatible
YAML subset so the MVP validator can stay on the Python standard library.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class RequirementsMetadataRepository:
    def __init__(self, repo_root: Path | str):
        self.repo_root = Path(repo_root)

    def requirements_index(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("contracts", "requirements-index.yaml"))

    def traceability_matrix(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("contracts", "traceability-matrix.yaml"))

    def hr_coverage_matrix(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("contracts", "hr-coverage-matrix.yaml"))

    def p0_policy(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("policies", "p0-policy.yaml"))

    def non_goal_guardrails(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("policies", "non-goal-guardrails.yaml"))

    def minimum_required_skills(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("catalog", "minimum-required-skills.yaml"))

    def friction_signal_schema(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("schemas", "friction-signal.schema.json"))

    def metric_signal_schema(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("schemas", "metric-signal.schema.json"))

    def improvement_candidate_schema(self) -> dict[str, Any]:
        return self._read_jsonish(self.path("schemas", "improvement-candidate.schema.json"))

    def starter_promotion_candidate_seed_schema(self) -> dict[str, Any]:
        return self._read_jsonish(
            self.path("schemas", "starter-promotion-candidate.seed.schema.json")
        )

    def path(self, category: str, filename: str) -> Path:
        return self.repo_root / "_harness" / category / filename

    def required_artifact_paths(self) -> dict[str, Path]:
        return {
            "requirements-index": self.path("contracts", "requirements-index.yaml"),
            "traceability-matrix": self.path("contracts", "traceability-matrix.yaml"),
            "hr-coverage-matrix": self.path("contracts", "hr-coverage-matrix.yaml"),
            "p0-policy": self.path("policies", "p0-policy.yaml"),
            "non-goal-guardrails": self.path("policies", "non-goal-guardrails.yaml"),
            "minimum-required-skills": self.path("catalog", "minimum-required-skills.yaml"),
            "friction-signal-schema": self.path("schemas", "friction-signal.schema.json"),
            "metric-signal-schema": self.path("schemas", "metric-signal.schema.json"),
            "improvement-candidate-schema": self.path(
                "schemas", "improvement-candidate.schema.json"
            ),
            "starter-promotion-candidate-seed-schema": self.path(
                "schemas", "starter-promotion-candidate.seed.schema.json"
            ),
        }

    def _read_jsonish(self, path: Path) -> dict[str, Any]:
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError(f"Metadata artifact must be a JSON object: {path}")
        return data


XP00_HR_IDS = {
    "HR-001V",
    "HR-002",
    "HR-003",
    "HR-004",
    "HR-005",
    "HR-006",
    "HR-007",
    "HR-008",
    "HR-119R",
    "HR-130R",
    "HR-131R",
    "HR-190R",
}

REQUIRED_SKILL_IDS = {
    "SKILL-TDD-IMPLEMENTATION",
    "SKILL-EVIDENCE-TRUST-VALIDATION",
    "SKILL-BOUNDARY-VALIDATION",
    "SKILL-CLOSEOUT-DOCUMENTER",
    "SKILL-WIKI-PROPOSAL-VALIDATION",
    "SKILL-CONTEXT-PACK-GENERATION",
    "SKILL-FRICTION-ANALYSIS",
}
