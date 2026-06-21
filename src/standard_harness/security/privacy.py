"""Privacy policy evaluation."""

from __future__ import annotations

from typing import Any


class PrivacyPolicy:
    def evaluate_data_use(
        self,
        *,
        data_categories: list[str],
        retention_basis: str,
        human_approval_record_id: str | None,
    ) -> dict[str, Any]:
        diagnostics = []
        sensitive = bool({"personal_data", "regulated_data", "financial_data"}.intersection(data_categories))
        if sensitive and not retention_basis:
            diagnostics.append("missing_retention_basis")
        if sensitive and human_approval_record_id is None:
            diagnostics.append("missing_human_privacy_approval")
        return {"status": "blocked" if diagnostics else "accepted", "diagnostic_ids": diagnostics}

