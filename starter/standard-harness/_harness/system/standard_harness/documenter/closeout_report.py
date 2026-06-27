"""Closeout report documenter."""

from __future__ import annotations

from typing import Any


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


class CloseoutReportDocumenter:
    def build_report(self, data: dict[str, Any]) -> dict[str, Any]:
        packet_id = str(data.get("packet_id", "unknown-packet"))
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
        markdown = self.render_markdown(sections)
        return {
            "artifact_path": f"_ops/evidence/{packet_id}/closeout-report.md",
            "sections": sections,
            "missing_sections": missing,
            "markdown": markdown,
            "frictionSignalBehavior": "emit docs_drift if required closeout sections are missing",
            "metricSignalBehavior": "emit closeout_report_generated count by packet type",
        }

    def render_markdown(self, sections: dict[str, Any]) -> str:
        lines = ["# Closeout Report", ""]
        for key, value in sections.items():
            lines.extend([f"## {key}", _format_value(value), ""])
        return "\n".join(lines).rstrip() + "\n"


def _format_value(value: Any) -> str:
    if isinstance(value, list):
        return "\n".join(f"- {item}" for item in value) if value else "N/A"
    if isinstance(value, dict):
        return "\n".join(f"- {key}: {item}" for key, item in value.items()) or "N/A"
    return str(value)
