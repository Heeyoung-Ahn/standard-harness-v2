"""Wiki provenance validation."""

from __future__ import annotations

from typing import Any


class WikiProvenanceValidator:
    def validate(self, provenance: dict[str, Any]) -> dict[str, Any]:
        diagnostics = []
        if not provenance.get("packetId"):
            diagnostics.append("missing_wiki_packet_link")
        if not provenance.get("evidenceIds"):
            diagnostics.append("missing_wiki_evidence_link")
        if not provenance.get("sourceTier"):
            diagnostics.append("missing_wiki_source_tier")
        return {
            "status": "blocked" if diagnostics else "valid",
            "diagnostic_ids": diagnostics,
        }
