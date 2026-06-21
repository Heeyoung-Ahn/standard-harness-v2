"""Release boundary policy aggregation."""

from __future__ import annotations

import json

from standard_harness.policy.bundles import PolicyBundleService
from standard_harness.policy.data_profile import DataProfileCatalog
from standard_harness.state.store import HarnessStore


class ReleasePolicyBoundary:
    def __init__(self, store: HarnessStore):
        self.store = store

    def diagnostics(
        self, *, packet_id: str | None = None, require_policy_bundle: bool = True
    ) -> list[str]:
        diagnostics: list[str] = []
        if require_policy_bundle and PolicyBundleService(self.store).latest_compatible_version() is None:
            diagnostics.append("missing_policy_bundle")
        diagnostics.extend(self._dependency_diagnostics())
        diagnostics.extend(self._ip_license_diagnostics())
        diagnostics.extend(self._threat_model_diagnostics())
        diagnostics.extend(self._profile_diagnostics(packet_id=packet_id))
        return _dedupe(diagnostics)

    def _dependency_diagnostics(self) -> list[str]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from dependencies where intake_status = 'blocked' limit 1"
            ).fetchone()
        return ["blocked_dependency_intake"] if row is not None else []

    def _ip_license_diagnostics(self) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute("select * from ip_license_records").fetchall()
        for row in rows:
            basis = str(row["license_or_usage_basis"]).lower()
            if (
                row["release_blocking_status"] == "blocked"
                or row["uncertainty"] == "high"
                or basis in {"", "unclear", "unknown"}
            ):
                return ["unclear_license_provenance"]
        return []

    def _threat_model_diagnostics(self) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute("select mitigations_json from threat_models").fetchall()
        for row in rows:
            mitigations = json.loads(row["mitigations_json"])
            for mitigation in mitigations:
                if mitigation.get("required_for_release") and mitigation.get("status") != "implemented":
                    return ["open_required_mitigation"]
        return []

    def _profile_diagnostics(self, *, packet_id: str | None) -> list[str]:
        with self.store.connection() as conn:
            rows = conn.execute(
                "select profile_id from profile_activations where status = 'active'"
            ).fetchall()
        catalog = DataProfileCatalog()
        diagnostics = []
        for row in rows:
            profile_id = row["profile_id"]
            try:
                profile = catalog.get(profile_id)
            except KeyError:
                continue
            if profile["human_approval_required"] and not self._has_human_approval(packet_id):
                diagnostics.append("profile_human_approval_required")
        return diagnostics

    def _has_human_approval(self, packet_id: str | None) -> bool:
        with self.store.connection() as conn:
            if packet_id is None:
                row = conn.execute(
                    """
                    select 1 from approval_records
                    where decision_result = 'approved'
                      and lower(approver_role) like '%human%'
                    limit 1
                    """
                ).fetchone()
            else:
                row = conn.execute(
                    """
                    select 1 from approval_records
                    where packet_id = ?
                      and decision_result = 'approved'
                      and lower(approver_role) like '%human%'
                    limit 1
                    """,
                    (packet_id,),
                ).fetchone()
        return row is not None


def _dedupe(values: list[str]) -> list[str]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result
