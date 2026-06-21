"""Data, BI, and finance profile catalog."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


PROFILES = {
    "base": {
        "profile_id": "base",
        "min_evidence_count": 1,
        "retention_days": 30,
        "privacy_controls": ["redaction"],
        "human_approval_required": False,
    },
    "data": {
        "profile_id": "data",
        "min_evidence_count": 2,
        "retention_days": 90,
        "privacy_controls": ["redaction", "data_minimization", "retention_policy"],
        "human_approval_required": True,
    },
    "bi": {
        "profile_id": "bi",
        "min_evidence_count": 2,
        "retention_days": 180,
        "privacy_controls": ["redaction", "aggregate_review", "retention_policy"],
        "human_approval_required": True,
    },
    "finance": {
        "profile_id": "finance",
        "min_evidence_count": 3,
        "retention_days": 365,
        "privacy_controls": ["redaction", "audit_retention", "segregation_of_duties"],
        "human_approval_required": True,
    },
}


class DataProfileCatalog:
    def get(self, profile_id: str) -> dict[str, Any]:
        if profile_id not in PROFILES:
            raise KeyError(f"Unknown data profile: {profile_id}")
        return deepcopy(PROFILES[profile_id])

