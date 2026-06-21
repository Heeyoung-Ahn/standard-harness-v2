"""Schema compatibility policy for state replay and migration checks."""

from __future__ import annotations


class CompatibilityPolicy:
    """Small major-version compatibility check for the SQLite state schema."""

    def __init__(self, current_schema_version: str):
        self.current_schema_version = str(current_schema_version)

    def check_schema(self, schema_version: str) -> dict[str, str]:
        candidate = str(schema_version)
        if candidate == self.current_schema_version:
            return {"status": "compatible", "reason": "same_schema_version"}
        return {
            "status": "incompatible",
            "reason": "schema_version_mismatch",
            "current_schema_version": self.current_schema_version,
            "candidate_schema_version": candidate,
        }
