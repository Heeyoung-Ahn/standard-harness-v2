"""Executable release gate meta-validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from standard_harness.validation.catalog import ValidatorCatalog


REQUIRED_GATE_RESULT_FIELDS = {
    "gateId",
    "validatorId",
    "status",
    "diagnostic_ids",
    "releaseBlocking",
}


class ExecutableReleaseValidator:
    validator_id = "executable-release-validator"
    gate_id = "executable-release-gate"

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def validate_release(self) -> dict[str, Any]:
        diagnostics: list[str] = []
        catalog = ValidatorCatalog.from_repo(self.repo_root)
        release_validators = {
            str(item["validatorId"]): item
            for item in catalog.release_blocking_validators()
            if item.get("validatorId")
        }
        policy = self._load_policy(diagnostics)
        self._load_evidence(diagnostics)
        probes = policy.get("probes", []) if isinstance(policy, dict) else []
        if not isinstance(probes, list):
            probes = []
            _add(diagnostics, "missing_release_probe_evidence")
        probes_by_validator = {
            str(probe.get("validatorId")): probe
            for probe in probes
            if isinstance(probe, dict) and probe.get("validatorId")
        }

        missing = sorted(set(release_validators) - set(probes_by_validator))
        if missing:
            _add(diagnostics, "missing_release_behavior_probe")
            _add(diagnostics, "unexercised_release_blocking_validator")

        required_families = set(policy.get("requiredFamilies", [])) if isinstance(policy, dict) else set()
        observed_families = {
            str(probe.get("family"))
            for probe in probes
            if isinstance(probe, dict) and probe.get("family")
        }
        if required_families and not required_families.issubset(observed_families):
            _add(diagnostics, "missing_required_release_validator_family")

        for validator_id, probe in probes_by_validator.items():
            if validator_id not in release_validators:
                _add(diagnostics, "unexercised_release_blocking_validator")
                continue
            self._validate_probe(validator_id, probe, diagnostics)

        return self._result(diagnostics, len(release_validators), len(probes_by_validator))

    def _load_policy(self, diagnostics: list[str]) -> dict[str, Any]:
        path = self.repo_root / "_harness" / "policies" / "release-behavior-probes.yaml"
        if not path.exists():
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        try:
            policy = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        if not isinstance(policy, dict):
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        return policy

    def _load_evidence(self, diagnostics: list[str]) -> dict[str, Any]:
        path = self.repo_root / "_ops" / "evidence" / "release" / "v21-executable-release-gate.json"
        if not path.exists():
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        try:
            evidence = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        if not isinstance(evidence, dict):
            _add(diagnostics, "missing_release_probe_evidence")
            return {}
        required = {"evidenceId", "generatedBy", "probeCounts", "coverageMetric"}
        if any(field not in evidence for field in required):
            _add(diagnostics, "missing_release_probe_evidence")
        return evidence

    def _validate_probe(
        self,
        validator_id: str,
        probe: dict[str, Any],
        diagnostics: list[str],
    ) -> None:
        result = probe.get("observedResult")
        if not _valid_gate_result_shape(result, validator_id):
            _add(diagnostics, "invalid_release_gate_result_shape")
            return
        expected = probe.get("invalidFixture", {}).get("expectedDiagnostic")
        diagnostic_ids = result.get("diagnostic_ids", [])
        status = str(result.get("status", "")).upper()
        if status != "BLOCKED" or (expected and expected not in diagnostic_ids):
            _add(diagnostics, "release_probe_did_not_block_invalid_fixture")

    def _result(self, diagnostics: list[str], total: int, probed: int) -> dict[str, Any]:
        unique = sorted(set(diagnostics))
        coverage = 1.0 if total == 0 else min(probed, total) / total
        return {
            "status": "blocked" if unique else "pass",
            "diagnostic_ids": unique,
            "releaseBlocking": True,
            "gateResult": {
                "gateId": self.gate_id,
                "validatorId": self.validator_id,
                "status": "BLOCKED" if unique else "PASS",
                "diagnostic_ids": unique,
                "releaseBlocking": True,
            },
            "metrics": {
                "releaseValidatorProbeCoverage": coverage,
                "probedReleaseValidators": probed,
                "releaseBlockingValidators": total,
            },
            "frictionSignalBehavior": "emit missing_evidence or docs_implementation_mismatch when release validator behavior probes are missing or malformed",
            "metricSignalBehavior": "emit releaseValidatorProbeCoverage and release_behavior_probe_count by validator family",
        }


def _valid_gate_result_shape(value: Any, validator_id: str) -> bool:
    if not isinstance(value, dict):
        return False
    if not REQUIRED_GATE_RESULT_FIELDS.issubset(value):
        return False
    if value.get("validatorId") != validator_id:
        return False
    if value.get("status") not in {"PASS", "BLOCKED"}:
        return False
    if not isinstance(value.get("diagnostic_ids"), list):
        return False
    if value.get("releaseBlocking") is not True:
        return False
    return bool(value.get("gateId"))


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
