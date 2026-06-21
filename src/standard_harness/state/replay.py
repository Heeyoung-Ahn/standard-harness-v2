"""Replay event-sourced state into materialized SQLite tables."""

from __future__ import annotations

import json
from typing import Any

from standard_harness.state.store import HarnessStore


MATERIALIZED_TABLES = (
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
          source_reference, packet_id, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["artifact_id"],
            payload["artifact_type"],
            payload["path"],
            payload["owner"],
            payload["lifecycle_status"],
            payload["source_reference"],
            payload["packet_id"],
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
          diagnostic_ids_json, source_event_range, source_watermark,
          authority_basis, decided_at, rationale
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
}
