"""Release-blocking review governance validation."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any


COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
REQUIRED_REVIEW_GATES_BY_PACKET_TYPE = {
    "product-feature": {
        "requirementsReview",
        "securityReview",
        "aiReview",
        "refactorReview",
    },
    "product-bugfix": {"requirementsReview", "refactorReview"},
    "product-refactor": {"aiReview", "refactorReview"},
    "security-data": {"securityReview"},
}
MANDATORY_PACKET_DOC_REVIEW_COVERAGE = {
    "human_planner_intent",
    "requirements_direction",
    "implementation_plan",
    "architecture_source_ssot",
    "acceptance_strength",
    "verification_scope",
    "v1_root_constraints",
    "v2_product_philosophy",
}
MANDATORY_CLOSEOUT_REVIEW_LENSES = {
    "challenge_review",
    "adversarial_security_review",
    "code_quality_review",
    "evidence_review",
}
PASSING_REVIEW_STATUSES = {"pass", "passed", "pass_with_findings", "not-applicable", "not_applicable"}
PACKET_DOC_PASSING_STATUSES = {"pass", "passed"}
NOT_APPLICABLE_STATUSES = {"not-applicable", "not_applicable"}
DISALLOWED_INDEPENDENT_AGENT_IDS = {
    "",
    "developer",
    "tester",
    "planner",
    "orchestrator",
    "packet-author",
    "generated-summary",
    "self",
}


class ReviewGovernanceValidator:
    validator_id = "review-governance-validator"
    gate_id = "review-governance-gate"
    evidence_path = Path("_ops/evidence/release/v21-review-governance.json")

    def __init__(self, repo_root: str | Path):
        self.repo_root = Path(repo_root)

    def validate_release(self) -> dict[str, Any]:
        path = self.repo_root / self.evidence_path
        if not path.exists():
            return self._result(["missing_review_governance_evidence"])
        try:
            evidence = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return self._result(["invalid_review_governance_evidence"])
        reviews = evidence.get("reviews")
        if not isinstance(reviews, list) or not reviews:
            return self._result(["missing_required_review"])
        diagnostics: list[str] = []
        for review in reviews:
            if not isinstance(review, dict):
                _add(diagnostics, "invalid_review_governance_evidence")
                continue
            self._validate_review(review, diagnostics)
        return self._result(diagnostics)

    def implementation_transition_diagnostics(self, packet: dict[str, Any]) -> list[str]:
        review_plan = packet.get("review_plan") or packet.get("reviewPlan")
        if not isinstance(review_plan, dict):
            return ["missing_packet_doc_review"]
        review = review_plan.get("packetDocReview") or review_plan.get("packet_doc_review")
        if not isinstance(review, dict):
            return ["missing_packet_doc_review"]

        diagnostics: list[str] = []
        status = str(review.get("status", "")).lower()
        if status not in PACKET_DOC_PASSING_STATUSES:
            _add(diagnostics, "packet_doc_review_not_pass")
        agent_id = _agent_id(review)
        if _not_independent_agent_id(agent_id):
            _add(diagnostics, "packet_doc_review_not_independent")
        evidence_path = _text(review.get("evidencePath") or review.get("evidence_path"))
        if not evidence_path or not _evidence_path_exists(self.repo_root, evidence_path):
            _add(diagnostics, "missing_packet_doc_review_evidence")
        coverage = _string_set(review.get("coverage"))
        if not MANDATORY_PACKET_DOC_REVIEW_COVERAGE.issubset(coverage):
            _add(diagnostics, "missing_packet_doc_review_coverage")
        return diagnostics

    def closeout_diagnostics(self, packet: dict[str, Any]) -> list[str]:
        diagnostics: list[str] = []
        closeout_plan = packet.get("closeout_plan") or packet.get("closeoutPlan")
        if not isinstance(closeout_plan, dict):
            return ["missing_required_review_governance", "missing_independent_closeout_review_lens"]
        review_gates = closeout_plan.get("reviewGates") or closeout_plan.get("review_gates")
        if not isinstance(review_gates, dict) or not review_gates:
            return ["missing_required_review_governance", "missing_independent_closeout_review_lens"]

        self._validate_independent_closeout_lenses(review_gates, diagnostics)

        packet_type = str(packet.get("packet_type", "docs-only"))
        required = REQUIRED_REVIEW_GATES_BY_PACKET_TYPE.get(packet_type, set())
        if required and not required.issubset(review_gates):
            _add(diagnostics, "missing_required_review_governance")
        return diagnostics

    def _validate_independent_closeout_lenses(
        self,
        review_gates: dict[str, Any],
        diagnostics: list[str],
    ) -> None:
        if not MANDATORY_CLOSEOUT_REVIEW_LENSES.issubset(review_gates):
            _add(diagnostics, "missing_independent_closeout_review_lens")

        seen_agents: set[str] = set()
        for lens in sorted(MANDATORY_CLOSEOUT_REVIEW_LENSES):
            review = review_gates.get(lens)
            if not isinstance(review, dict):
                continue
            status = str(review.get("status", "")).lower()
            if status not in PASSING_REVIEW_STATUSES:
                _add(diagnostics, "independent_closeout_review_not_pass")
            if status in NOT_APPLICABLE_STATUSES and not _text(review.get("rationale")):
                _add(diagnostics, "missing_independent_closeout_review_na_rationale")
            evidence_path = _text(review.get("evidencePath") or review.get("evidence_path"))
            if not evidence_path or not _evidence_path_exists(self.repo_root, evidence_path):
                _add(diagnostics, "missing_independent_closeout_review_evidence")
            agent_id = _agent_id(review)
            if _not_independent_agent_id(agent_id):
                _add(diagnostics, "independent_closeout_review_not_independent")
            elif agent_id in seen_agents:
                _add(diagnostics, "duplicate_independent_review_agent")
            else:
                seen_agents.add(agent_id)

    def _validate_review(self, review: dict[str, Any], diagnostics: list[str]) -> None:
        if not review.get("reviewId") or not review.get("packetId"):
            _add(diagnostics, "invalid_review_governance_evidence")
        commit = str(review.get("reviewedCommit", ""))
        if not _valid_reviewed_commit(commit, self.repo_root):
            _add(diagnostics, "invalid_review_governance_commit")
        reviewed_files = review.get("reviewedFiles")
        if not isinstance(reviewed_files, list) or not reviewed_files:
            _add(diagnostics, "missing_reviewed_files")
        else:
            for item in reviewed_files:
                if not _reviewed_file_is_current(self.repo_root, item, commit):
                    _add(diagnostics, "stale_review_governance_evidence")
        focused = review.get("focusedTestEvidence")
        if not isinstance(focused, dict) or focused.get("result") != "passed" or not focused.get("command"):
            _add(diagnostics, "missing_focused_review_test_evidence")
        regression = review.get("fullRegressionEvidence")
        if (
            not isinstance(regression, dict)
            or regression.get("result") != "passed"
            or not regression.get("evidenceId")
        ):
            _add(diagnostics, "missing_review_regression_evidence")
        deterministic = review.get("deterministicEvidence")
        if review.get("reviewType") == "ai" and not deterministic:
            _add(diagnostics, "ai_review_cannot_release_alone")
        findings = review.get("findings", [])
        if not isinstance(findings, list):
            _add(diagnostics, "invalid_review_governance_evidence")
            findings = []
        accepted_risks = {
            str(item.get("findingId"))
            for item in review.get("acceptedRisks", [])
            if isinstance(item, dict) and item.get("status") == "accepted"
        }
        needs_adjudication = review.get("finalDecision") == "conditional-pass"
        for finding in findings:
            if not isinstance(finding, dict):
                _add(diagnostics, "invalid_review_governance_evidence")
                continue
            severity = str(finding.get("severity", "")).upper()
            status = str(finding.get("status", "")).lower()
            if severity == "P0" and status not in {"resolved", "closed"}:
                _add(diagnostics, "unresolved_p0_review_finding")
            if severity == "P1" and status not in {"resolved", "closed"}:
                finding_id = str(finding.get("id", ""))
                if finding_id not in accepted_risks:
                    _add(diagnostics, "p1_review_requires_risk_acceptance")
                needs_adjudication = True
        adjudication = review.get("finalAdjudication")
        if needs_adjudication and not _valid_final_adjudication(adjudication):
            _add(diagnostics, "missing_review_final_adjudication")

    def _result(self, diagnostics: list[str]) -> dict[str, Any]:
        unique = sorted(set(diagnostics))
        return {
            "status": "blocked" if unique else "pass",
            "diagnostic_ids": unique,
            "releaseBlocking": True,
            "gateResult": {
                "gate": self.gate_id,
                "status": "BLOCKED" if unique else "PASS",
                "validatorId": self.validator_id,
                "diagnosticIds": unique,
            },
            "frictionSignalBehavior": "emit missed_review or missing_evidence when review governance blocks release",
            "metricSignalBehavior": "emit review_governance_validation_count by status and finding severity",
        }


def _valid_reviewed_commit(value: str, repo_root: Path) -> bool:
    if not COMMIT_RE.match(value) or value == "0" * 40:
        return False
    if not (repo_root / ".git").exists():
        return True
    result = subprocess.run(
        ["git", "-C", str(repo_root), "cat-file", "-e", f"{value}^{{commit}}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


def _reviewed_file_is_current(repo_root: Path, item: Any, reviewed_commit: str) -> bool:
    if not isinstance(item, dict):
        return False
    relative = item.get("path")
    expected = item.get("sha256")
    if not isinstance(relative, str) or not isinstance(expected, str):
        return False
    path = (repo_root / relative).resolve()
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return False
    if not path.exists() or not path.is_file():
        return False
    actual = "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
    normalized = "sha256:" + hashlib.sha256(
        path.read_bytes().replace(b"\r\n", b"\n")
    ).hexdigest()
    return expected in {actual, normalized}


def _valid_final_adjudication(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and value.get("status") in {"approved", "risk-accepted", "resolved"}
        and bool(value.get("adjudicator"))
        and bool(value.get("rationale"))
    )


def _agent_id(review: dict[str, Any]) -> str:
    return _text(review.get("agentId") or review.get("agent_id") or review.get("reviewerId") or review.get("reviewer_id"))


def _not_independent_agent_id(agent_id: str) -> bool:
    return agent_id.lower() in DISALLOWED_INDEPENDENT_AGENT_IDS


def _evidence_path_exists(repo_root: Path, relative_path: str) -> bool:
    path = (repo_root / relative_path).resolve()
    try:
        path.relative_to(repo_root.resolve())
    except ValueError:
        return False
    return path.is_file()


def _string_set(value: Any) -> set[str]:
    if not isinstance(value, list):
        return set()
    return {str(item).strip() for item in value if str(item).strip()}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _add(diagnostic_ids: list[str], diagnostic_id: str) -> None:
    if diagnostic_id not in diagnostic_ids:
        diagnostic_ids.append(diagnostic_id)
