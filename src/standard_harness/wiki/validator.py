"""Wiki proposal validator."""

from __future__ import annotations

from typing import Any

from standard_harness.wiki.provenance import WikiProvenanceValidator


REQUIRED_PROPOSAL_FIELDS = {
    "proposalId",
    "packetId",
    "targetPage",
    "entryType",
    "sourceTier",
    "provenance",
    "owner",
    "reviewStatus",
    "relatedHrIds",
    "relatedXpIds",
    "evidenceIds",
    "closeoutId",
    "content",
}


class WikiProposalValidator:
    validator_id = "wiki-proposal-validator"
    gate_id = "wiki-proposal-gate"

    def validate(self, proposal: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        for field in sorted(REQUIRED_PROPOSAL_FIELDS):
            if proposal.get(field) in (None, "", []):
                diagnostics.append("invalid_wiki_proposal")
        provenance_result = WikiProvenanceValidator().validate(proposal.get("provenance", {}))
        diagnostics.extend(provenance_result["diagnostic_ids"])
        classifications = proposal.get("evidenceClassifications", {})
        if any(value in {"SECRET", "SENSITIVE"} for value in classifications.values()):
            diagnostics.append("sensitive_wiki_promotion")
        if proposal.get("sourceTier") in {"generated", "low-authority"}:
            diagnostics.append("stale_context")
        return {
            "status": "blocked" if diagnostics else "validated",
            "validationStatus": "blocked" if diagnostics else "validated",
            "validatedBy": self.validator_id if not diagnostics else None,
            "diagnostic_ids": sorted(set(diagnostics)),
            "frictionSignalBehavior": "emit docs_drift, stale_context, or sensitive_wiki_promotion when blocked",
            "metricSignalBehavior": "emit wiki_proposal_validation_count by status and entry type",
        }
