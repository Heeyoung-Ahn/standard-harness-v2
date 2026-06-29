"""V2.1 final closeout release validation."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from standard_harness.self_improvement.friction import RuntimeFrictionCapture


REQUIRED_VERIFICATIONS = {
    "releaseGate": "missing_release_gate_verification",
    "reviewGovernance": "missing_review_governance_verification",
    "wikiKnowledge": "missing_wiki_knowledge_verification",
    "hr200Metrics": "missing_hr200_metrics_verification",
    "securityBoundary": "missing_security_boundary_verification",
    "executableReleaseProbes": "missing_executable_release_probe_verification",
    "fullRegression": "missing_full_regression_verification",
    "cleanHygiene": "missing_clean_hygiene_verification",
}

REQUIRED_GATE_FIELDS = {
    "gateId",
    "validatorId",
    "status",
    "diagnostic_ids",
    "releaseBlocking",
    "policyVersion",
    "validatorVersion",
    "evidenceIds",
}

ALLOWED_POST_REGRESSION_PATHS = (
    "_ops/evidence/release/",
)


class FinalCloseoutValidator:
    validator_id = "final-closeout-validator"
    gate_id = "v21-final-closeout-gate"
    evidence_path = Path("_ops/evidence/release/v21-final-closeout.json")

    def __init__(self, repo_root: str | Path, friction_capture: RuntimeFrictionCapture | None = None):
        self.repo_root = Path(repo_root)
        self.friction_capture = friction_capture

    def validate_release(self) -> dict[str, Any]:
        diagnostics: list[str] = []
        evidence = self._load_evidence(diagnostics)
        if not evidence:
            return self._result(diagnostics)

        self._validate_gate_result(evidence.get("gateResult"), diagnostics)
        self._validate_release_head(evidence, diagnostics)
        self._validate_verifications(evidence, diagnostics)
        if evidence.get("unresolvedBlockers"):
            _add(diagnostics, "final_closeout_unresolved_blocker")
        return self._result(diagnostics)

    def _load_evidence(self, diagnostics: list[str]) -> dict[str, Any]:
        path = self.repo_root / self.evidence_path
        if not path.exists():
            _add(diagnostics, "missing_final_closeout_evidence")
            return {}
        try:
            evidence = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _add(diagnostics, "invalid_final_closeout_evidence")
            return {}
        if not isinstance(evidence, dict):
            _add(diagnostics, "invalid_final_closeout_evidence")
            return {}
        for field in ("evidenceId", "generatedBy", "generatedAt", "release", "verifications"):
            if not evidence.get(field):
                _add(diagnostics, "invalid_final_closeout_evidence")
        return evidence

    def _validate_gate_result(self, value: Any, diagnostics: list[str]) -> None:
        if not isinstance(value, dict):
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
            return
        if not REQUIRED_GATE_FIELDS.issubset(value):
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
            return
        if value.get("gateId") != self.gate_id or value.get("validatorId") != self.validator_id:
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
        if value.get("status") not in {"PASS", "BLOCKED"}:
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
        if not isinstance(value.get("diagnostic_ids"), list):
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
        if value.get("releaseBlocking") is not True:
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")
        if not isinstance(value.get("evidenceIds"), list) or not value.get("evidenceIds"):
            _add(diagnostics, "invalid_final_closeout_gate_result_metadata")

    def _validate_verifications(self, evidence: dict[str, Any], diagnostics: list[str]) -> None:
        verifications = evidence.get("verifications")
        if not isinstance(verifications, dict):
            _add(diagnostics, "missing_final_closeout_verification")
            return
        for domain, diagnostic_id in REQUIRED_VERIFICATIONS.items():
            item = verifications.get(domain)
            if not _passing_verification(item):
                _add(diagnostics, diagnostic_id)
                _add(diagnostics, "missing_final_closeout_verification")
        self._validate_full_regression(evidence, verifications.get("fullRegression"), diagnostics)
        self._validate_clean_hygiene(verifications.get("cleanHygiene"), diagnostics)

    def _validate_release_head(self, evidence: dict[str, Any], diagnostics: list[str]) -> None:
        release_head = str(evidence.get("release", {}).get("headCommit", ""))
        if not self._only_release_evidence_changed_since(release_head):
            _add(diagnostics, "stale_final_closeout_evidence")

    def _validate_full_regression(
        self,
        evidence: dict[str, Any],
        verification: Any,
        diagnostics: list[str],
    ) -> None:
        if not isinstance(verification, dict):
            return
        path = self.repo_root / "_ops/evidence/release/v21-full-regression.json"
        if not path.exists():
            _add(diagnostics, "missing_full_regression_verification")
            return
        try:
            regression = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            _add(diagnostics, "missing_full_regression_verification")
            return
        if regression.get("result") != "passed" or regression.get("timeoutStatus") != "completed":
            _add(diagnostics, "missing_full_regression_verification")
        head_commit = str(regression.get("headCommit", ""))
        release_head = str(evidence.get("release", {}).get("headCommit", ""))
        if head_commit != release_head and not self._only_release_evidence_changed_since(head_commit):
            _add(diagnostics, "stale_full_regression_evidence")

    def _validate_clean_hygiene(self, verification: Any, diagnostics: list[str]) -> None:
        if (self.repo_root / ".harness/state/harness.sqlite3").exists():
            _add(diagnostics, "missing_clean_hygiene_verification")
            return
        if isinstance(verification, dict) and verification.get("repoLocalGeneratedState") is not False:
            _add(diagnostics, "missing_clean_hygiene_verification")

    def _only_release_evidence_changed_since(self, head_commit: str) -> bool:
        if not head_commit or set(head_commit) == {"0"} or not (self.repo_root / ".git").exists():
            return False
        try:
            current = subprocess.check_output(
                ["git", "-C", str(self.repo_root), "rev-parse", "HEAD"],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
            subprocess.check_call(
                ["git", "-C", str(self.repo_root), "cat-file", "-e", f"{head_commit}^{{commit}}"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if head_commit == current:
                return True
            changed = subprocess.check_output(
                ["git", "-C", str(self.repo_root), "diff", "--name-only", head_commit, current],
                text=True,
                stderr=subprocess.DEVNULL,
            ).splitlines()
        except (subprocess.CalledProcessError, OSError):
            return False
        return bool(changed) and all(path.startswith(ALLOWED_POST_REGRESSION_PATHS) for path in changed)

    def _result(self, diagnostics: list[str]) -> dict[str, Any]:
        unique = sorted(set(diagnostics))
        if unique and self.friction_capture is not None:
            self.friction_capture.closeout_state_mismatch(
                source_ref="validation/final_closeout.py::FinalCloseoutValidator.validate_release",
                evidence_ref="_ops/evidence/runtime-friction/final-closeout.json",
                recurrence_key=f"closeout:{unique[0]}",
                idempotency_scope="final-closeout",
            )
        coverage = _coverage(unique)
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
                "finalCloseoutVerificationCoverage": coverage,
            },
            "frictionSignalBehavior": "emit missing_closeout, missing_evidence, stale_context, or docs_drift when final release closeout evidence is absent, incomplete, or stale",
            "metricSignalBehavior": "emit finalCloseoutVerificationCoverage from required final closeout verification domains",
        }


def _passing_verification(value: Any) -> bool:
    return isinstance(value, dict) and value.get("status") == "pass" and bool(value.get("evidencePath") or value.get("evidenceId"))


def _coverage(diagnostics: list[str]) -> float:
    missing_domains = {
        diagnostic_id
        for diagnostic_id in diagnostics
        if diagnostic_id in set(REQUIRED_VERIFICATIONS.values())
    }
    verified = len(REQUIRED_VERIFICATIONS) - len(missing_domains)
    return verified / len(REQUIRED_VERIFICATIONS)


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
