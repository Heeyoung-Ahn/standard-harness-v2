"""Retention policy classification."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from standard_harness.state.store import HarnessStore


DEFAULT_POLICIES = {
    "evidence": {
        "retention_policy_id": "retention-evidence-default",
        "artifact_class": "evidence",
        "retention_minimum_days": 365,
        "purge_rule": "manual_approval_required",
        "archive_rule": "immutable_archive",
        "regeneration_expectation": "not_regenerable",
        "approval_required": True,
    },
    "log": {
        "retention_policy_id": "retention-log-default",
        "artifact_class": "log",
        "retention_minimum_days": 90,
        "purge_rule": "rotate_after_retention",
        "archive_rule": "rotate_then_archive",
        "regeneration_expectation": "partially_regenerable",
        "approval_required": False,
    },
    "projection": {
        "retention_policy_id": "retention-projection-default",
        "artifact_class": "projection",
        "retention_minimum_days": 30,
        "purge_rule": "may_purge_after_regeneration_check",
        "archive_rule": "archive_latest_only",
        "regeneration_expectation": "regenerable_from_events",
        "approval_required": False,
    },
    "archived_report": {
        "retention_policy_id": "retention-report-default",
        "artifact_class": "archived_report",
        "retention_minimum_days": 730,
        "purge_rule": "manual_approval_required",
        "archive_rule": "immutable_archive",
        "regeneration_expectation": "not_regenerable",
        "approval_required": True,
    },
}


class RetentionPolicyService:
    def __init__(self, store: HarnessStore):
        self.store = store

    def classify_artifact(self, artifact_class: str) -> dict[str, Any]:
        custom = self._latest_custom_policy(artifact_class)
        if custom is not None:
            return custom
        if artifact_class not in DEFAULT_POLICIES:
            raise KeyError(f"Unknown artifact class: {artifact_class}")
        return deepcopy(DEFAULT_POLICIES[artifact_class])

    def register_policy(
        self,
        *,
        retention_policy_id: str,
        artifact_class: str,
        retention_minimum_days: int,
        purge_rule: str,
        archive_rule: str,
        regeneration_expectation: str,
        approval_required: bool,
        idempotency_key: str,
    ) -> dict[str, Any]:
        if self.store.event_for_idempotency_key(idempotency_key) is not None:
            return self.get_policy(retention_policy_id)
        policy = {
            "retention_policy_id": retention_policy_id,
            "artifact_class": artifact_class,
            "retention_minimum_days": retention_minimum_days,
            "purge_rule": purge_rule,
            "archive_rule": archive_rule,
            "regeneration_expectation": regeneration_expectation,
            "approval_required": approval_required,
            "source_watermark": self.store.latest_event_seq(),
        }
        with self.store.transaction() as conn:
            trace = self.store.append_event(
                event_type="retention.policy_recorded",
                actor_id="retention",
                actor_role="System",
                authority_basis="retention policy",
                idempotency_key=idempotency_key,
                payload=policy,
                conn=conn,
            )
            conn.execute(
                """
                insert into retention_policies (
                  retention_policy_id, artifact_class, retention_minimum_days,
                  purge_rule, archive_rule, regeneration_expectation,
                  approval_required, source_watermark, trace_event_id,
                  trace_event_seq
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    retention_policy_id,
                    artifact_class,
                    retention_minimum_days,
                    purge_rule,
                    archive_rule,
                    regeneration_expectation,
                    1 if approval_required else 0,
                    policy["source_watermark"],
                    trace["event_id"],
                    trace["event_seq"],
                ),
            )
        return self.get_policy(retention_policy_id)

    def get_policy(self, retention_policy_id: str) -> dict[str, Any]:
        with self.store.connection() as conn:
            row = conn.execute(
                "select * from retention_policies where retention_policy_id = ?",
                (retention_policy_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Unknown retention policy: {retention_policy_id}")
        return _policy_from_row(dict(row))

    def _latest_custom_policy(self, artifact_class: str) -> dict[str, Any] | None:
        with self.store.connection() as conn:
            row = conn.execute(
                """
                select * from retention_policies
                where artifact_class = ?
                order by trace_event_seq desc
                limit 1
                """,
                (artifact_class,),
            ).fetchone()
        return None if row is None else _policy_from_row(dict(row))


def _policy_from_row(row: dict[str, Any]) -> dict[str, Any]:
    row["approval_required"] = bool(row["approval_required"])
    return row

