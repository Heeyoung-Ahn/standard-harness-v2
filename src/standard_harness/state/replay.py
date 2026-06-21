"""Replay event-sourced state into materialized SQLite tables."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


MATERIALIZED_TABLES = (
    "cloud_orchestrations",
    "human_control_snapshots",
    "operational_memory_snapshots",
    "cost_records",
    "pmo_projections",
    "threat_models",
    "waivers",
    "ip_license_records",
    "dependencies",
    "profile_activations",
    "policy_bundles",
    "filesystem_drifts",
    "git_reconciliations",
    "git_snapshots",
    "adjudications",
    "independent_reviews",
    "challenges",
    "skill_policy_evaluations",
    "role_cards",
    "decision_claims",
    "llm_work_products",
    "review_bundles",
    "workflow_runs",
    "adapter_invocations",
    "project_completion_results",
    "ssot_change_impacts",
    "requirement_registration_diffs",
    "starter_manifest_entries",
    "projections",
    "closeouts",
    "gate_results",
    "gate_activations",
    "gate_declarations",
    "diagnostics",
    "claims",
    "evidence",
    "artifacts",
    "acceptance_criteria",
    "requirements",
    "approval_records",
    "packets",
)

NOOP_EVENT_TYPES = {
    "recovery_started",
    "projection_rebuilt",
    "recovery_blocked",
    "audit_snapshot_created",
    "backup_created",
    "restore_verified",
}


class StateReplayService:
    """Rebuild materialized state from ordered event rows."""

    def __init__(self, store: HarnessStore):
        self.store = store

    def rebuild_materialized_state(
        self, *, through_event_seq: int | None = None, conn=None
    ) -> dict[str, Any]:
        if conn is not None:
            return self._rebuild_with_connection(
                conn=conn, through_event_seq=through_event_seq, commit=False
            )
        self.store.initialize()
        with self.store.connection() as local_conn:
            return self._rebuild_with_connection(
                conn=local_conn, through_event_seq=through_event_seq, commit=True
            )

    def _rebuild_with_connection(
        self, *, conn, through_event_seq: int | None, commit: bool
    ) -> dict[str, Any]:
        if through_event_seq is None:
            through_event_seq = int(
                conn.execute("select coalesce(max(event_seq), 0) as seq from events").fetchone()[
                    "seq"
                ]
            )
        rows = conn.execute(
            """
            select * from events
            where event_seq <= ?
            order by event_seq
            """,
            (through_event_seq,),
        ).fetchall()
        unknown_event_types = sorted(
            {
                row["event_type"]
                for row in rows
                if row["event_type"] not in HANDLERS and row["event_type"] not in NOOP_EVENT_TYPES
            }
        )
        source_event_range = _source_event_range(int(through_event_seq))
        if unknown_event_types:
            return {
                "status": "blocked",
                "source_event_range": source_event_range,
                "source_watermark": int(through_event_seq),
                "replayed_event_count": 0,
                "unknown_event_types": unknown_event_types,
                "rebuilt_tables": [],
            }

        for table in MATERIALIZED_TABLES:
            conn.execute(f"delete from {table}")
        for row in rows:
            event_type = row["event_type"]
            if event_type in NOOP_EVENT_TYPES:
                continue
            payload = json.loads(row["payload_json"])
            HANDLERS[event_type](conn, row, payload)
        if commit:
            conn.commit()

        return {
            "status": "rebuilt",
            "source_event_range": source_event_range,
            "source_watermark": int(through_event_seq),
            "replayed_event_count": len(rows),
            "unknown_event_types": [],
            "rebuilt_tables": list(MATERIALIZED_TABLES),
        }


def _insert_packet(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into packets (
          packet_id, title, objective, risk_class, lifecycle_state, approval_state,
          packet_version, scope_summary, out_of_scope_summary, change_zones_json,
          acceptance_criteria_ids_json, evidence_requirements_json,
          closeout_criteria_json, approval_required, approval_record_id,
          owner, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["packet_id"],
            payload["title"],
            payload["objective"],
            payload["risk_class"],
            payload["lifecycle_state"],
            payload["approval_state"],
            payload["packet_version"],
            payload["scope_summary"],
            payload["out_of_scope_summary"],
            json.dumps(payload["change_zones"], sort_keys=True),
            json.dumps(payload["acceptance_criteria_ids"], sort_keys=True),
            json.dumps(payload["evidence_requirements"], sort_keys=True),
            json.dumps(payload["closeout_criteria"], sort_keys=True),
            1 if payload["approval_required"] else 0,
            payload.get("approval_record_id"),
            payload["owner"],
            payload["created_at"],
            payload["updated_at"],
        ),
    )


def _approve_packet(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into approval_records (
          approval_record_id, packet_id, packet_version, approver_id,
          approver_role, authority_basis, decision_result, approved_scope,
          source_watermark, decided_at, rationale
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["approval_record_id"],
            payload["packet_id"],
            payload["packet_version"],
            payload["approver_id"],
            payload["approver_role"],
            payload["authority_basis"],
            payload["decision_result"],
            payload["approved_scope"],
            payload["source_watermark"],
            payload["decided_at"],
            payload["rationale"],
        ),
    )
    conn.execute(
        """
        update packets
        set approval_state = ?, approval_record_id = ?, updated_at = ?
        where packet_id = ?
        """,
        ("approved", payload["approval_record_id"], payload["decided_at"], payload["packet_id"]),
    )


def _transition_packet(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        "update packets set lifecycle_state = ?, updated_at = ? where packet_id = ?",
        (payload["to_state"], row["occurred_at"], payload["packet_id"]),
    )


def _insert_requirement(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into requirements (
          requirement_id, version, source_doc, status, classification,
          risk_classification, acceptance_criteria_json,
          completion_classification, packet_id, decision_record_id,
          decision_rationale, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["requirement_id"],
            payload["version"],
            payload["source_doc"],
            payload["status"],
            payload["classification"],
            payload["risk_classification"],
            json.dumps(payload["acceptance_criteria"], sort_keys=True),
            payload["completion_classification"],
            payload["packet_id"],
            payload.get("decision_record_id"),
            payload.get("decision_rationale"),
            payload["created_at"],
            payload["updated_at"],
        ),
    )


def _transition_requirement(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        update requirements
        set status = ?, decision_record_id = ?, decision_rationale = ?, updated_at = ?
        where requirement_id = ?
        """,
        (
            payload["to_status"],
            payload.get("decision_record_id"),
            payload.get("decision_rationale"),
            payload["updated_at"],
            payload["requirement_id"],
        ),
    )


def _insert_acceptance_criterion(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into acceptance_criteria (
          acceptance_criterion_id, requirement_id, packet_id,
          description, status, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["acceptance_criterion_id"],
            payload["requirement_id"],
            payload["packet_id"],
            payload["description"],
            payload["status"],
            payload["created_at"],
            payload["updated_at"],
        ),
    )


def _insert_artifact(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into artifacts (
          artifact_id, artifact_type, path, owner, lifecycle_status,
          source_reference, packet_id, content_hash, content_hash_algorithm,
          created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["artifact_id"],
            payload["artifact_type"],
            payload["path"],
            payload["owner"],
            payload["lifecycle_status"],
            payload["source_reference"],
            payload["packet_id"],
            payload.get("content_hash"),
            payload.get("content_hash_algorithm"),
            payload["created_at"],
            payload["updated_at"],
        ),
    )


def _insert_evidence(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into evidence (
          evidence_id, packet_id, claim_id, command_or_tool, runner,
          timestamp, cwd_or_execution_context, environment_fingerprint,
          artifact_path, content_hash, content_hash_algorithm,
          result_status, rationale
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["evidence_id"],
            payload["packet_id"],
            payload.get("claim_id"),
            payload["command_or_tool"],
            payload["runner"],
            payload["timestamp"],
            payload["cwd_or_execution_context"],
            payload["environment_fingerprint"],
            payload["artifact_path"],
            payload["content_hash"],
            payload["content_hash_algorithm"],
            payload["result_status"],
            payload["rationale"],
        ),
    )


def _insert_claim(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into claims (
          claim_id, packet_id, requirement_id, acceptance_criterion_id,
          evidence_ids_json, support_status, gate_result_ids_json,
          created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["claim_id"],
            payload["packet_id"],
            payload["requirement_id"],
            payload["acceptance_criterion_id"],
            json.dumps(payload["evidence_ids"], sort_keys=True),
            payload["support_status"],
            json.dumps(payload.get("gate_result_ids_optional", []), sort_keys=True),
            payload["created_at"],
            payload["updated_at"],
        ),
    )


def _insert_gate(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into gate_declarations (
          gate_id, packet_id, gate_type, requirement_level,
          declared_by_source, source_event_range, source_watermark
        ) values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["gate_id"],
            payload["packet_id"],
            payload["gate_type"],
            payload["requirement_level"],
            payload["declared_by_source"],
            payload["source_event_range"],
            payload["source_watermark"],
        ),
    )


def _insert_gate_activation(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into gate_activations (
          gate_activation_id, gate_id, packet_id, activation_status,
          activated_at, source_event_range, source_watermark
        ) values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["gate_activation_id"],
            payload["gate_id"],
            payload["packet_id"],
            payload["activation_status"],
            payload["activated_at"],
            payload["source_event_range"],
            payload["source_watermark"],
        ),
    )


def _insert_gate_result(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into gate_results (
          gate_result_id, gate_id, packet_id, checked_claim_ids_json,
          evidence_ids_json, status, requirement_level, rationale,
          source_event_range, source_watermark
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["gate_result_id"],
            payload["gate_id"],
            payload["packet_id"],
            json.dumps(payload["checked_claim_ids"], sort_keys=True),
            json.dumps(payload["evidence_ids"], sort_keys=True),
            payload["status"],
            payload["requirement_level"],
            payload["rationale"],
            payload["source_event_range"],
            payload["source_watermark"],
        ),
    )


def _insert_closeout(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into closeouts (
          closeout_id, packet_id, packet_version, decision_status,
          checked_claim_ids_json, gate_result_ids_json, evidence_ids_json,
          diagnostic_ids_json, policy_bundle_version, review_bundle_id, source_event_range, source_watermark,
          authority_basis, decided_at, rationale
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["closeout_id"],
            payload["packet_id"],
            payload["packet_version"],
            payload["decision_status"],
            json.dumps(payload["checked_claim_ids"], sort_keys=True),
            json.dumps(payload["gate_result_ids"], sort_keys=True),
            json.dumps(payload["evidence_ids"], sort_keys=True),
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            payload.get("policy_bundle_version"),
            payload.get("review_bundle_id"),
            payload["source_event_range"],
            payload["source_watermark"],
            payload["authority_basis"],
            payload["decided_at"],
            payload["rationale"],
        ),
    )
    conn.execute(
        "update packets set lifecycle_state = ?, updated_at = ? where packet_id = ?",
        (payload["decision_status"], payload["decided_at"], payload["packet_id"]),
    )


def _insert_projection(conn, row, payload: dict[str, Any]) -> None:
    projection = dict(payload)
    projection.setdefault("trace_event_id", row["event_id"])
    projection.setdefault("trace_event_seq", row["event_seq"])
    conn.execute(
        """
        insert or replace into projections (
          projection_id, projection_type, packet_id, schema_version,
          generator_version, generated_at, source_event_range,
          source_watermark, dependency_digest, freshness_status,
          stale_consumer_behavior, trace_event_id, trace_event_seq,
          projection_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            projection["projection_id"],
            projection["projection_type"],
            projection["packet"]["packet_id"],
            projection["schema_version"],
            projection["generator_version"],
            projection["generated_at"],
            projection["source_event_range"],
            projection["source_watermark"],
            projection["dependency_digest"],
            projection["freshness_status"],
            projection["stale_consumer_behavior"],
            projection["trace_event_id"],
            projection["trace_event_seq"],
            json.dumps(projection, sort_keys=True),
        ),
    )


def _insert_starter_manifest_entry(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into starter_manifest_entries (
          path, artifact_type, owner, included_in_payload, generated,
          managed_template, promotion_source, validation_evidence_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["path"],
            payload["artifact_type"],
            payload["owner"],
            1 if payload["included_in_payload"] else 0,
            1 if payload["generated"] else 0,
            1 if payload["managed_template"] else 0,
            payload["promotion_source"],
            json.dumps(payload["validation_evidence"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_registration_diff(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into requirement_registration_diffs (
          diff_id, source_doc, entries_json, promotion_state,
          decision_record_id, decision_rationale,
          source_event_range, source_watermark, created_at,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["diff_id"],
            payload["source_doc"],
            json.dumps(payload["entries"], sort_keys=True),
            payload["promotion_state"],
            payload.get("decision_record_id"),
            payload.get("decision_rationale"),
            payload["source_event_range"],
            payload["source_watermark"],
            payload["created_at"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _transition_registration_diff(conn, _row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        update requirement_registration_diffs
        set promotion_state = ?, decision_record_id = ?, decision_rationale = ?
        where diff_id = ?
        """,
        (
            payload["to_promotion_state"],
            payload.get("decision_record_id"),
            payload.get("decision_rationale"),
            payload["diff_id"],
        ),
    )


def _insert_ssot_impact(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into ssot_change_impacts (
          impact_id, requirement_id, change_class,
          impacted_packet_ids_json, impacted_acceptance_criterion_ids_json,
          impacted_claim_ids_json, impacted_evidence_ids_json,
          impacted_gate_ids_json, impacted_projection_ids_json, review_status,
          source_event_range, source_watermark, created_at,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["impact_id"],
            payload["requirement_id"],
            payload["change_class"],
            json.dumps(payload["impacted_packet_ids"], sort_keys=True),
            json.dumps(
                payload.get("impacted_acceptance_criterion_ids", []), sort_keys=True
            ),
            json.dumps(payload["impacted_claim_ids"], sort_keys=True),
            json.dumps(payload["impacted_evidence_ids"], sort_keys=True),
            json.dumps(payload["impacted_gate_ids"], sort_keys=True),
            json.dumps(payload["impacted_projection_ids"], sort_keys=True),
            payload["review_status"],
            payload["source_event_range"],
            payload["source_watermark"],
            payload["created_at"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_project_completion_result(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert or replace into project_completion_results (
          completion_result_id, scope, requirement_id, status,
          requirement_counts_json, diagnostic_ids_json, diagnostics_json,
          source_event_range, source_watermark, evaluated_at,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["completion_result_id"],
            payload["scope"],
            payload.get("requirement_id"),
            payload["status"],
            json.dumps(payload["requirement_counts"], sort_keys=True),
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            json.dumps(payload["diagnostics"], sort_keys=True),
            payload["source_event_range"],
            payload["source_watermark"],
            payload["evaluated_at"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_adapter_invocation(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into adapter_invocations (
          adapter_run_id, adapter_id, adapter_version,
          input_snapshot_hash, permission_roots_json,
          artifact_manifest_json, event_request_json,
          failure_classification, evidence_provenance_json,
          timeout_seconds, retry_count, cancel_status,
          idempotency_key,
          source_event_range, source_watermark,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["adapter_run_id"],
            payload["adapter_id"],
            payload["adapter_version"],
            payload["input_snapshot_hash"],
            json.dumps(payload["permission_roots"], sort_keys=True),
            json.dumps(payload["artifact_manifest"], sort_keys=True),
            json.dumps(payload["event_request"], sort_keys=True),
            payload.get("failure_classification"),
            json.dumps(payload["evidence_provenance"], sort_keys=True),
            payload["timeout_seconds"],
            payload["retry_count"],
            payload["cancel_status"],
            payload.get("idempotency_key", row["idempotency_key"]),
            payload["source_event_range"],
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_workflow_run(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into workflow_runs (
          workflow_run_id, packet_id, phase, actor_role, input_projection_id,
          source_watermark, status, retry_count, blocker_diagnostic_ids_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["workflow_run_id"],
            payload["packet_id"],
            payload["phase"],
            payload["actor_role"],
            payload.get("input_projection_id"),
            payload["source_watermark"],
            payload["status"],
            payload["retry_count"],
            json.dumps(payload["blocker_diagnostic_ids"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_review_bundle(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into review_bundles (
          review_bundle_id, packet_id, packet_version,
          requirement_snapshot_json, acceptance_criteria_snapshot_json,
          evidence_manifest_snapshot_json, adapter_model_identity,
          source_watermark, freshness_status, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["review_bundle_id"],
            payload["packet_id"],
            payload["packet_version"],
            json.dumps(payload["requirement_snapshot"], sort_keys=True),
            json.dumps(payload["acceptance_criteria_snapshot"], sort_keys=True),
            json.dumps(payload["evidence_manifest_snapshot"], sort_keys=True),
            payload["adapter_model_identity"],
            payload["source_watermark"],
            payload["freshness_status"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_llm_work_product(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into llm_work_products (
          work_product_id, content, work_product_type, claim_type,
          confidence, human_decision_required, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["work_product_id"],
            payload["content"],
            payload["work_product_type"],
            payload["claim_type"],
            payload["confidence"],
            payload["human_decision_required"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_decision_claim(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into decision_claims (
          decision_claim_id, report_id, observation, inference,
          assumption, recommendation, confidence, human_decision_required,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["decision_claim_id"],
            payload["report_id"],
            payload["observation"],
            payload["inference"],
            payload["assumption"],
            payload["recommendation"],
            payload["confidence"],
            payload["human_decision_required"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_role_card(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into role_cards (
          role_id, permitted_actions_json, forbidden_decisions_json,
          escalation_duties_json, required_review_evidence_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["role_id"],
            json.dumps(payload["permitted_actions"], sort_keys=True),
            json.dumps(payload["forbidden_decisions"], sort_keys=True),
            json.dumps(payload["escalation_duties"], sort_keys=True),
            json.dumps(payload["required_review_evidence"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_skill_policy_evaluation(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into skill_policy_evaluations (
          evaluation_id, role_id, action, local_policy_json,
          policy_result, diagnostic_ids_json, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["evaluation_id"],
            payload["role_id"],
            payload["action"],
            json.dumps(payload["local_policy"], sort_keys=True),
            payload["policy_result"],
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_payload_record(table: str, key_column: str):
    def handler(conn, row, payload: dict[str, Any]) -> None:
        conn.execute(
            f"""
            insert into {table} (
              {key_column}, payload_json, trace_event_id, trace_event_seq
            ) values (?, ?, ?, ?)
            """,
            (
                payload[key_column],
                json.dumps(payload, sort_keys=True),
                row["event_id"],
                row["event_seq"],
            ),
        )

    return handler


def _insert_git_snapshot(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into git_snapshots (
          git_snapshot_id, repo_root, branch_name, commit_id, worktree_path,
          tracked_changes_json, untracked_files_json, ignored_files_json,
          source_watermark, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["git_snapshot_id"],
            payload["repo_root"],
            payload["branch_name"],
            payload["commit_id"],
            payload["worktree_path"],
            json.dumps(payload["tracked_changes"], sort_keys=True),
            json.dumps(payload["untracked_files"], sort_keys=True),
            json.dumps(payload["ignored_files"], sort_keys=True),
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_git_reconciliation(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into git_reconciliations (
          reconciliation_id, packet_id, git_snapshot_id, branch_name, commit_id,
          classifications_json, unresolved_classifications_json,
          source_event_range, source_watermark, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["reconciliation_id"],
            payload["packet_id"],
            payload["git_snapshot_id"],
            payload["branch_name"],
            payload["commit_id"],
            json.dumps(payload["classifications"], sort_keys=True),
            json.dumps(payload["unresolved_classifications"], sort_keys=True),
            payload["source_event_range"],
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_filesystem_drift(conn, row, payload: dict[str, Any]) -> None:
    source_watermark = int(row["event_seq"]) - 1
    conn.execute(
        """
        insert into filesystem_drifts (
          drift_record_id, drift_id, packet_id, artifact_id, path, drift_type,
          remediation_json, resolution_status, source, source_event_range,
          source_watermark, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["drift_record_id"],
            payload["drift_id"],
            payload["packet_id"],
            payload.get("artifact_id"),
            payload["path"],
            payload["drift_type"],
            json.dumps(payload["remediation"], sort_keys=True),
            payload["resolution_status"],
            payload["source"],
            "0-0" if source_watermark <= 0 else f"1-{source_watermark}",
            source_watermark,
            row["event_id"],
            row["event_seq"],
        ),
    )


def _resolve_filesystem_drift(conn, _row, payload: dict[str, Any]) -> None:
    for drift_record_id in payload["drift_record_ids"]:
        conn.execute(
            """
            update filesystem_drifts
            set resolution_status = ?
            where drift_record_id = ? and packet_id = ?
            """,
            (payload["resolution_status"], drift_record_id, payload["packet_id"]),
        )


def _insert_policy_bundle(conn, row, payload: dict[str, Any]) -> None:
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
        (
            payload["policy_bundle_id"],
            payload["version"],
            payload["risk_taxonomy_version"],
            payload["gate_policy_version"],
            payload["validator_policy_version"],
            payload["skill_policy_version"],
            payload["adapter_policy_version"],
            payload["security_data_policy_version"],
            payload["compatibility_status"],
            payload["source_event_range"],
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_profile_activation(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into profile_activations (
          activation_id, profile_id, status, conflicting_profile_ids_json,
          diagnostic_ids_json, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["activation_id"],
            payload["profile_id"],
            payload["status"],
            json.dumps(payload["conflicting_profile_ids"], sort_keys=True),
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_dependency(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into dependencies (
          dependency_id, name, version, source, license_basis,
          install_scripts_json, network_behavior, trust_tier, waiver_expiry,
          rollback_path, intake_status, diagnostic_ids_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["dependency_id"],
            payload["name"],
            payload["version"],
            payload["source"],
            payload["license_basis"],
            json.dumps(payload["install_scripts"], sort_keys=True),
            payload["network_behavior"],
            payload["trust_tier"],
            payload.get("waiver_expiry"),
            payload["rollback_path"],
            payload["intake_status"],
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_ip_license_record(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into ip_license_records (
          ip_record_id, source, license_or_usage_basis, generated_vs_copied,
          attribution_need, uncertainty, release_blocking_status,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["ip_record_id"],
            payload["source"],
            payload["license_or_usage_basis"],
            payload["generated_vs_copied"],
            payload["attribution_need"],
            payload["uncertainty"],
            payload["release_blocking_status"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_waiver(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into waivers (
          waiver_id, approver_id, approver_role, scope, expires_at,
          compensating_control, affected_gate_ids_json, revocation_status,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["waiver_id"],
            payload["approver_id"],
            payload["approver_role"],
            payload["scope"],
            payload["expires_at"],
            payload["compensating_control"],
            json.dumps(payload["affected_gate_ids"], sort_keys=True),
            payload["revocation_status"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_threat_model(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into threat_models (
          threat_model_id, assets_json, trust_boundaries_json,
          attacker_assumptions_json, abuse_cases_json, mitigations_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["threat_model_id"],
            json.dumps(payload["assets"], sort_keys=True),
            json.dumps(payload["trust_boundaries"], sort_keys=True),
            json.dumps(payload["attacker_assumptions"], sort_keys=True),
            json.dumps(payload["abuse_cases"], sort_keys=True),
            json.dumps(payload["mitigations"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_pmo_projection(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into pmo_projections (
          pmo_projection_id, source_event_range, source_watermark,
          packet_counts_json, blocked_packets_json, open_risks_json,
          milestone_summary_json, projection_summary_json, dependency_summary_json,
          diagnostic_summary_json, freshness_status, trace_event_id,
          trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["pmo_projection_id"],
            payload["source_event_range"],
            payload["source_watermark"],
            json.dumps(payload["packet_counts"], sort_keys=True),
            json.dumps(payload["blocked_packets"], sort_keys=True),
            json.dumps(payload["open_risks"], sort_keys=True),
            json.dumps(payload["milestone_summary"], sort_keys=True),
            json.dumps(payload.get("projection_summary", {}), sort_keys=True),
            json.dumps(payload["dependency_summary"], sort_keys=True),
            json.dumps(payload["diagnostic_summary"], sort_keys=True),
            payload["freshness_status"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_cost_record(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into cost_records (
          cost_record_id, packet_id, tool_name, operation_type,
          usage_quantity, usage_unit, cost_estimate, risk_tier,
          source_watermark, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["cost_record_id"],
            payload["packet_id"],
            payload["tool_name"],
            payload["operation_type"],
            payload["usage_quantity"],
            payload["usage_unit"],
            payload["cost_estimate"],
            payload["risk_tier"],
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_operational_memory(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into operational_memory_snapshots (
          memory_snapshot_id, source, source_event_range, source_watermark,
          entries_json, freshness_status, trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["memory_snapshot_id"],
            payload["source"],
            payload["source_event_range"],
            payload["source_watermark"],
            json.dumps(payload["entries"], sort_keys=True),
            payload["freshness_status"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_human_control_snapshot(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into human_control_snapshots (
          snapshot_id, source_event_range, source_watermark,
          pending_approvals_json, non_delegable_decisions_json,
          active_waivers_json, challenged_items_json, blocked_gates_json,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["snapshot_id"],
            payload["source_event_range"],
            payload["source_watermark"],
            json.dumps(payload["pending_approvals"], sort_keys=True),
            json.dumps(payload["non_delegable_decisions"], sort_keys=True),
            json.dumps(payload["active_waivers"], sort_keys=True),
            json.dumps(payload["challenged_items"], sort_keys=True),
            json.dumps(payload["blocked_gates"], sort_keys=True),
            row["event_id"],
            row["event_seq"],
        ),
    )


def _insert_cloud_orchestration(conn, row, payload: dict[str, Any]) -> None:
    conn.execute(
        """
        insert into cloud_orchestrations (
          orchestration_run_id, packet_id, actor_id, actor_role,
          remote_environment_id, permission_roots_json, input_snapshot_hash,
          adapter_run_ids_json, status, failure_classification,
          diagnostic_ids_json, evidence_output_json, source_watermark,
          trace_event_id, trace_event_seq
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["orchestration_run_id"],
            payload["packet_id"],
            payload["actor_id"],
            payload["actor_role"],
            payload["remote_environment_id"],
            json.dumps(payload["permission_roots"], sort_keys=True),
            payload["input_snapshot_hash"],
            json.dumps(payload["adapter_run_ids"], sort_keys=True),
            payload["status"],
            payload.get("failure_classification"),
            json.dumps(payload["diagnostic_ids"], sort_keys=True),
            json.dumps(payload["evidence_output"], sort_keys=True),
            payload["source_watermark"],
            row["event_id"],
            row["event_seq"],
        ),
    )


def _source_event_range(source_watermark: int) -> str:
    if source_watermark <= 0:
        return "0-0"
    return f"1-{source_watermark}"


HANDLERS = {
    "packet.created": _insert_packet,
    "packet.approved": _approve_packet,
    "packet.transitioned": _transition_packet,
    "requirement.registered": _insert_requirement,
    "requirement.transitioned": _transition_requirement,
    "acceptance_criterion.registered": _insert_acceptance_criterion,
    "artifact.registered": _insert_artifact,
    "evidence.registered": _insert_evidence,
    "claim.recorded": _insert_claim,
    "gate.declared": _insert_gate,
    "gate.activated": _insert_gate_activation,
    "gate.result_recorded": _insert_gate_result,
    "closeout.decided": _insert_closeout,
    "projection.generated": _insert_projection,
    "starter.entry_registered": _insert_starter_manifest_entry,
    "ssot.registration_diff_recorded": _insert_registration_diff,
    "ssot.registration_diff_transitioned": _transition_registration_diff,
    "ssot.impact_recorded": _insert_ssot_impact,
    "project_completion.evaluated": _insert_project_completion_result,
    "adapter.invocation_recorded": _insert_adapter_invocation,
    "workflow.run_recorded": _insert_workflow_run,
    "review_bundle.created": _insert_review_bundle,
    "llm_work_product_classified": _insert_llm_work_product,
    "decision_claim_extracted": _insert_decision_claim,
    "role_card_registered": _insert_role_card,
    "skill_policy_evaluated": _insert_skill_policy_evaluation,
    "challenge_opened": _insert_payload_record("challenges", "challenge_id"),
    "independent_review_recorded": _insert_payload_record("independent_reviews", "review_id"),
    "adjudication_recorded": _insert_payload_record("adjudications", "adjudication_id"),
    "git.snapshot_recorded": _insert_git_snapshot,
    "git.reconciliation_recorded": _insert_git_reconciliation,
    "filesystem_drift_detected": _insert_filesystem_drift,
    "filesystem_drift_resolved": _resolve_filesystem_drift,
    "policy_bundle.registered": _insert_policy_bundle,
    "profile.activated": _insert_profile_activation,
    "dependency.recorded": _insert_dependency,
    "ip_license.recorded": _insert_ip_license_record,
    "waiver.recorded": _insert_waiver,
    "threat_model.recorded": _insert_threat_model,
    "pmo.projection_generated": _insert_pmo_projection,
    "cost.recorded": _insert_cost_record,
    "operational_memory.generated": _insert_operational_memory,
    "human_control.snapshot_generated": _insert_human_control_snapshot,
    "cloud.orchestration_recorded": _insert_cloud_orchestration,
}
