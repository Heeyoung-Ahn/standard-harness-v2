"""Policy bundle registry."""

from __future__ import annotations

from typing import Any

from standard_harness.state.store import HarnessStore


DEFAULT_POLICY_BUNDLE_VERSION = "builtin-base-v1"


class PolicyBundleService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def register_bundle(
        self,
        *,
        policy_bundle_id: str,
        version: str,
        risk_taxonomy_version: str,
        gate_policy_version: str,
        validator_policy_version: str,
        skill_policy_version: str,
        adapter_policy_version: str,
        security_data_policy_version: str,
        compatibility_status: str,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_bundle(policy_bundle_id)
        if self._bundle_exists(policy_bundle_id):
            raise ValueError(f"policy_bundle_id already exists: {policy_bundle_id}")
        source_watermark = self.store.latest_event_seq()
        bundle = {
            "policy_bundle_id": policy_bundle_id,
            "version": version,
            "risk_taxonomy_version": risk_taxonomy_version,
            "gate_policy_version": gate_policy_version,
            "validator_policy_version": validator_policy_version,
            "skill_policy_version": skill_policy_version,
            "adapter_policy_version": adapter_policy_version,
            "security_data_policy_version": security_data_policy_version,
            "compatibility_status": compatibility_status,
            "source_event_range": "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            "source_watermark": source_watermark,
        }
        with self.store.transaction() as conn:
            event = self.store.append_event(
                event_type="policy_bundle.registered",
                actor_id="policy",
                actor_role="System",
                authority_basis="policy bundle registration",
                idempotency_key=idempotency_key,
                payload=bundle,
                conn=conn,
            )
            conn.execute(
                """
                insert into policy_bundles (
                  policy_bundle_id, version, risk_taxonomy_version,
                  gate_policy_version, validator_policy_version, skill_policy_version,
                  adapter_policy_version, security_data_policy_version,
                  compatibility_status, source_event_range, source_watermark,
                  trace_event_id, trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _bundle_row_values(bundle, event),
            )
        return self.get_bundle(policy_bundle_id)

    def get_bundle(self, policy_bundle_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from policy_bundles where policy_bundle_id = ?",
                (policy_bundle_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown policy bundle: {policy_bundle_id}")
        return dict(row)

    def latest_compatible_bundle(self) -> dict[str, Any] | None:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select * from policy_bundles
                where compatibility_status = 'compatible'
                order by trace_event_seq desc
                limit 1
                """
            ).fetchone()
        return None if row is None else dict(row)

    def latest_compatible_version(self) -> str | None:
        bundle = self.latest_compatible_bundle()
        return DEFAULT_POLICY_BUNDLE_VERSION if bundle is None else str(bundle["version"])

    def _bundle_exists(self, policy_bundle_id: str) -> bool:
        with self.store.connection() as conn:
            row = conn.execute(
                "select 1 from policy_bundles where policy_bundle_id = ?",
                (policy_bundle_id,),
            ).fetchone()
        return row is not None


def _bundle_row_values(bundle: dict[str, Any], event: dict[str, Any]) -> tuple[Any, ...]:
    return (
        bundle["policy_bundle_id"],
        bundle["version"],
        bundle["risk_taxonomy_version"],
        bundle["gate_policy_version"],
        bundle["validator_policy_version"],
        bundle["skill_policy_version"],
        bundle["adapter_policy_version"],
        bundle["security_data_policy_version"],
        bundle["compatibility_status"],
        bundle["source_event_range"],
        bundle["source_watermark"],
        event["event_id"],
        event["event_seq"],
    )
