"""Structured Challenge Review evidence validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REQUIRED_FIELDS = {
    "xpId",
    "reviewedCommit",
    "reviewedFiles",
    "focusedTestCommand",
    "focusedTestResult",
    "fullRegressionCommand",
    "fullRegressionResult",
    "challengeLoopCount",
    "findings",
    "unresolvedFindings",
    "fixesApplied",
    "finalDecision",
}

ALLOWED_FOLLOW_UP_XPS = {
    "XP-07A",
    "XP-09A",
    "XP-ProcessA",
    "XP-PackagingA",
    "XP-10A",
}


class ChallengeReviewEvidenceValidator:
    validator_id = "challenge-review-evidence-validator"
    gate_id = "challenge-review-evidence-gate"

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def validate_required(self, xp_ids: list[str]) -> dict[str, Any]:
        diagnostics: list[str] = []
        reports: list[dict[str, Any]] = []
        for xp_id in xp_ids:
            path = self._report_path(xp_id)
            if not path.exists():
                _add(diagnostics, "missing_challenge_review_evidence")
                continue
            report, report_diagnostics = self.validate_report(path, expected_xp_id=xp_id)
            reports.append({"path": str(path), "frontMatter": report})
            for diagnostic in report_diagnostics:
                _add(diagnostics, diagnostic)
        return {
            "status": "blocked" if diagnostics else "pass",
            "diagnostic_ids": diagnostics,
            "reports": reports,
            "gateResult": {
                "gate": self.gate_id,
                "status": "BLOCKED" if diagnostics else "PASS",
                "validatorId": self.validator_id,
                "diagnosticIds": diagnostics,
            },
        }

    def validate_report(
        self, path: str | Path, *, expected_xp_id: str | None = None
    ) -> tuple[dict[str, Any], list[str]]:
        diagnostics: list[str] = []
        try:
            report = _front_matter(Path(path))
        except ValueError:
            return {}, ["invalid_challenge_review_front_matter"]
        missing = sorted(REQUIRED_FIELDS - set(report))
        if missing:
            diagnostics.extend(_diagnostic_for_missing_field(field) for field in missing)
        if expected_xp_id and report.get("xpId") != expected_xp_id:
            _add(diagnostics, "challenge_review_xp_mismatch")
        if not report.get("reviewedCommit"):
            _add(diagnostics, "missing_review_commit")
        if not report.get("reviewedFiles"):
            _add(diagnostics, "missing_review_files")
        if not report.get("focusedTestCommand") or not report.get("fullRegressionCommand"):
            _add(diagnostics, "missing_review_test_evidence")
        if not report.get("focusedTestResult") or not report.get("fullRegressionResult"):
            _add(diagnostics, "missing_review_test_evidence")
        if int(report.get("challengeLoopCount", 0)) > 3:
            _add(diagnostics, "challenge_review_loop_limit_exceeded")
        unresolved = report.get("unresolvedFindings", [])
        if report.get("finalDecision") == "pass" and _has_unresolved_major_or_blocker(unresolved):
            _add(diagnostics, "unresolved_major_challenge_finding")
        if report.get("finalDecision") == "pass-with-follow-up":
            follow_up = report.get("followUpHardeningXp")
            if follow_up not in ALLOWED_FOLLOW_UP_XPS:
                _add(diagnostics, "missing_follow_up_hardening_xp")
        return report, diagnostics

    def _report_path(self, xp_id: str) -> Path:
        normalized = xp_id.lower()
        if normalized.endswith("a") or normalized in {"xp-processa", "xp-packaginga"}:
            return (
                self.repo_root
                / "docs"
                / "reviews"
                / "v21"
                / "hardening"
                / f"{normalized}-challenge-review.md"
            )
        return self.repo_root / "docs" / "reviews" / "v21" / f"{normalized}-challenge-review.md"


def _front_matter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing front matter")
    _, payload, _rest = text.split("---\n", 2)
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("front matter must be object")
    return data


def _diagnostic_for_missing_field(field: str) -> str:
    if field == "reviewedCommit":
        return "missing_review_commit"
    if field in {
        "focusedTestCommand",
        "focusedTestResult",
        "fullRegressionCommand",
        "fullRegressionResult",
    }:
        return "missing_review_test_evidence"
    return "missing_challenge_review_field"


def _has_unresolved_major_or_blocker(findings: list[dict[str, Any]]) -> bool:
    return any(item.get("severity") in {"major", "blocker"} for item in findings)


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
