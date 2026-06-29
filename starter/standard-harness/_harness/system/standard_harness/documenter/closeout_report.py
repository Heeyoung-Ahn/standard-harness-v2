"""Closeout report documenter."""

from __future__ import annotations

from typing import Any

from standard_harness.evidence.index import EvidenceIndexContract
from standard_harness.self_improvement.friction import RuntimeFrictionCapture


REQUIRED_SECTIONS = {
    "packetId": "packet_id",
    "packetObjective": "objective",
    "actualChanges": "actual_changes",
    "changedFiles": "changed_files",
    "testEvidenceAndTrustStatus": "test_evidence",
    "e2eEvidenceOrNaDecision": "e2e_evidence_or_na_decision",
    "requirementsReview": "requirements_review",
    "securityReview": "security_review",
    "aiReview": "ai_review",
    "refactorReview": "refactor_review",
    "claimLedgerSummary": "claim_summary",
    "securityRegressionImpact": "security_regression_impact",
    "remainingRisks": "remaining_risks",
    "followUpPacketRequired": "follow_up_packet_required",
    "wikiProposalSummary": "wiki_proposal_summary",
    "frictionFindings": "friction_findings",
    "closeoutDecision": "closeout_decision",
}
REPORT_SCHEMA_VERSION = "standard-harness-closeout-report/v1"
MAX_CLOSEOUT_REPORT_BODY_LINES = 120
RAW_EVIDENCE_MARKERS = ("```", "BEGIN LOG", "Traceback (most recent call last)", "npm ERR!")


class CloseoutReportDocumenter:
    def __init__(self, friction_capture: RuntimeFrictionCapture | None = None):
        self.friction_capture = friction_capture

    def build_report(self, data: dict[str, Any]) -> dict[str, Any]:
        packet_id = str(data.get("packet_id", "unknown-packet"))
        evidence_index = data.get("evidence_index")
        evidence_index_path = data.get("evidence_index_path")
        if not evidence_index and data.get("evidence_entries") is not None:
            evidence_index = EvidenceIndexContract().build_index(
                packet_id=packet_id,
                entries=data.get("evidence_entries", []),
                required_gates=data.get("required_gates", []),
            )
        if isinstance(evidence_index, dict):
            evidence_index_path = evidence_index_path or evidence_index.get("evidenceIndexPath")
        evidence_index_path = evidence_index_path or f"_ops/evidence/{packet_id}/evidence-index.json"
        sections = {}
        missing = []
        for section, source_key in REQUIRED_SECTIONS.items():
            value = data.get(source_key)
            if value in (None, "", []):
                if section in {
                    "e2eEvidenceOrNaDecision",
                    "requirementsReview",
                    "securityReview",
                    "aiReview",
                    "refactorReview",
                    "securityRegressionImpact",
                    "remainingRisks",
                    "followUpPacketRequired",
                    "frictionFindings",
                    "actualChanges",
                }:
                    value = "N/A"
                else:
                    missing.append(section)
            sections[section] = value
        markdown = self.render_markdown(sections, evidence_index_path=evidence_index_path)
        report_path = f"product/docs/packets/{packet_id}/closeout.md"
        return {
            "schemaVersion": REPORT_SCHEMA_VERSION,
            "packetId": packet_id,
            "artifact_path": report_path,
            "report_path": report_path,
            "evidence_index_path": evidence_index_path,
            "evidence_index": evidence_index,
            "sections": sections,
            "missing_sections": missing,
            "markdown": markdown,
            "frictionSignalBehavior": "emit docs_drift if required closeout sections are missing",
            "metricSignalBehavior": "emit closeout_report_generated count by packet type",
        }

    def render_markdown(self, sections: dict[str, Any], *, evidence_index_path: str | None = None) -> str:
        lines = ["# Closeout Report", ""]
        if evidence_index_path:
            lines.extend([f"[Evidence index]({evidence_index_path})", ""])
        for key, value in sections.items():
            lines.extend([f"## {key}", _format_value(value), ""])
        return "\n".join(lines).rstrip() + "\n"

    def validate_report(
        self,
        report: dict[str, Any],
        *,
        evidence_index: dict[str, Any] | None = None,
        required_gates: list[str] | None = None,
    ) -> dict[str, Any]:
        diagnostics: list[dict[str, Any]] = []
        report_path = _text(report.get("report_path") or report.get("artifact_path"))
        if not report_path.startswith("product/docs/packets/"):
            diagnostics.append({"code": "invalid_closeout_report_path", "reportPath": report_path})
        markdown = _text(report.get("markdown"))
        body_lines = [
            line for line in markdown.splitlines()
            if line.strip() and not line.startswith("[Evidence index]")
        ]
        if len(body_lines) > MAX_CLOSEOUT_REPORT_BODY_LINES:
            diagnostics.append({"code": "closeout_report_too_long", "bodyLines": len(body_lines), "maxBodyLines": MAX_CLOSEOUT_REPORT_BODY_LINES})
        if any(marker in markdown for marker in RAW_EVIDENCE_MARKERS):
            diagnostics.append({"code": "raw_evidence_dump_in_report"})
        evidence_index_path = _text(report.get("evidence_index_path"))
        if not evidence_index_path.startswith("_ops/evidence/"):
            diagnostics.append({"code": "missing_evidence_index_link", "field": "evidence_index_path"})
        resolved_index = evidence_index or report.get("evidence_index")
        if isinstance(resolved_index, dict):
            diagnostics.extend(
                EvidenceIndexContract().validate_index(
                    index=resolved_index,
                    required_gates=required_gates or [],
                )["diagnostics"]
            )
        if diagnostics and self.friction_capture is not None:
            code = str(diagnostics[0].get("code", "closeout_report_diagnostic"))
            self.friction_capture.closeout_state_mismatch(
                source_ref="documenter/closeout_report.py::CloseoutReportDocumenter.validate_report",
                evidence_ref=f"_ops/evidence/runtime-friction/closeout-report-{_text(report.get('packetId')) or 'unknown'}.json",
                recurrence_key=f"closeout-report:{code}",
                idempotency_scope=f"closeout-report:{report_path or code}",
            )
        return {"ok": not diagnostics, "diagnostics": diagnostics}


def _format_value(value: Any) -> str:
    if isinstance(value, list):
        return "\n".join(f"- {item}" for item in value) if value else "N/A"
    if isinstance(value, dict):
        return "\n".join(f"- {key}: {item}" for key, item in value.items()) or "N/A"
    return str(value)


def _text(value: Any) -> str:
    return str(value or "").strip()
