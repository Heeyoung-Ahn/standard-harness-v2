"""SQLite schema management for the MVP state kernel."""

from __future__ import annotations

import sqlite3

from .events import HASH_ALGORITHM, sha256_text, utc_now_iso


SCHEMA_VERSION = "1"


SCHEMA_SQL = """
create table if not exists events (
  event_seq integer primary key autoincrement,
  event_id text not null unique,
  event_type text not null,
  schema_version text not null,
  occurred_at text not null,
  actor_id text not null,
  actor_role text not null,
  authority_basis text not null,
  transaction_id text not null,
  causal_event_id text,
  causal_order integer,
  packet_id text,
  packet_version integer,
  expected_state_version integer,
  state_version_after integer,
  idempotency_key text not null unique,
  source_snapshot text,
  payload_json text not null,
  payload_hash text not null,
  payload_hash_algorithm text not null
);

create table if not exists schema_migrations (
  migration_id text primary key,
  schema_version text not null,
  applied_at text not null,
  checksum text not null,
  status text not null
);

create table if not exists packets (
  packet_id text primary key,
  title text not null,
  objective text not null,
  risk_class text not null,
  lifecycle_state text not null,
  approval_state text not null,
  packet_version integer not null,
  scope_summary text not null,
  out_of_scope_summary text not null,
  change_zones_json text not null,
  acceptance_criteria_ids_json text not null,
  evidence_requirements_json text not null,
  closeout_criteria_json text not null,
  approval_required integer not null,
  approval_record_id text,
  owner text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists approval_records (
  approval_record_id text primary key,
  packet_id text not null,
  packet_version integer not null,
  approver_id text not null,
  approver_role text not null,
  authority_basis text not null,
  decision_result text not null,
  approved_scope text not null,
  source_watermark integer not null,
  decided_at text not null,
  rationale text not null
);

create table if not exists requirements (
  requirement_id text primary key,
  version text not null,
  source_doc text not null,
  status text not null,
  classification text not null,
  risk_classification text not null,
  acceptance_criteria_json text not null,
  completion_classification text not null,
  packet_id text not null,
  decision_record_id text,
  decision_rationale text,
  created_at text not null,
  updated_at text not null
);

create table if not exists acceptance_criteria (
  acceptance_criterion_id text primary key,
  requirement_id text not null,
  packet_id text not null,
  description text not null,
  status text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists artifacts (
  artifact_id text primary key,
  artifact_type text not null,
  path text not null,
  owner text not null,
  lifecycle_status text not null,
  source_reference text not null,
  packet_id text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists evidence (
  evidence_id text primary key,
  packet_id text not null,
  claim_id text,
  command_or_tool text not null,
  runner text not null,
  timestamp text not null,
  cwd_or_execution_context text not null,
  environment_fingerprint text not null,
  artifact_path text not null,
  content_hash text not null,
  content_hash_algorithm text not null,
  result_status text not null,
  rationale text not null
);

create table if not exists claims (
  claim_id text primary key,
  packet_id text not null,
  requirement_id text not null,
  acceptance_criterion_id text not null,
  evidence_ids_json text not null,
  support_status text not null,
  gate_result_ids_json text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists diagnostics (
  diagnostic_id text primary key,
  error_code text not null,
  severity text not null,
  category text not null,
  message text not null,
  repair_hint text not null,
  affected_entity_type text,
  affected_entity_id text,
  packet_id text,
  requirement_id text,
  acceptance_criterion_id text,
  gate_id text,
  evidence_id text,
  field text,
  expected_value text,
  actual_value text,
  source_reference text,
  freshness_watermark integer,
  auto_fix_eligible integer not null,
  evidence_safe_snippet_allowed integer not null
);

create table if not exists gate_declarations (
  gate_id text primary key,
  packet_id text not null,
  gate_type text not null,
  requirement_level text not null,
  declared_by_source text not null,
  source_event_range text not null,
  source_watermark integer not null
);

create table if not exists gate_activations (
  gate_activation_id text primary key,
  gate_id text not null,
  packet_id text not null,
  activation_status text not null,
  activated_at text not null,
  source_event_range text not null,
  source_watermark integer not null
);

create table if not exists gate_results (
  gate_result_id text primary key,
  gate_id text not null,
  packet_id text not null,
  checked_claim_ids_json text not null,
  evidence_ids_json text not null,
  status text not null,
  requirement_level text not null,
  rationale text not null,
  source_event_range text not null,
  source_watermark integer not null
);

create table if not exists closeouts (
  closeout_id text primary key,
  packet_id text not null,
  packet_version integer not null,
  decision_status text not null,
  checked_claim_ids_json text not null,
  gate_result_ids_json text not null,
  evidence_ids_json text not null,
  diagnostic_ids_json text not null,
  source_event_range text not null,
  source_watermark integer not null,
  authority_basis text not null,
  decided_at text not null,
  rationale text not null
);

create table if not exists projections (
  projection_id text primary key,
  projection_type text not null,
  packet_id text not null,
  schema_version text not null,
  generator_version text not null,
  generated_at text not null,
  source_event_range text not null,
  source_watermark integer not null,
  dependency_digest text not null,
  freshness_status text not null,
  stale_consumer_behavior text not null,
  trace_event_id text not null,
  trace_event_seq integer not null,
  projection_json text not null
);

create table if not exists starter_manifest_entries (
  path text primary key,
  artifact_type text not null,
  owner text not null,
  included_in_payload integer not null,
  generated integer not null,
  managed_template integer not null,
  promotion_source text not null,
  validation_evidence_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists recovery_runs (
  recovery_id text primary key,
  reason text not null,
  source_event_range text not null,
  source_watermark integer not null,
  recovery_status text not null,
  projection_checksum text not null,
  rebuilt_tables_json text not null,
  diagnostic_ids_json text not null,
  started_event_id text not null,
  completed_event_id text,
  recorded_at text not null
);

create table if not exists audit_snapshots (
  snapshot_id text primary key,
  event_seq_range text not null,
  schema_version text not null,
  restore_checksum text not null,
  snapshot_json text not null,
  created_at text not null
);

create table if not exists state_backups (
  backup_id text primary key,
  backup_path text not null,
  schema_version text not null,
  event_seq_range text not null,
  event_count integer not null,
  projection_checksum text not null,
  backup_checksum text not null,
  created_event_id text not null,
  created_at text not null
);

create table if not exists restore_verifications (
  restore_id text primary key,
  backup_id text not null,
  schema_version text not null,
  restored_event_seq_order_json text not null,
  projection_checksum text not null,
  restore_checksum text not null,
  restore_status text not null,
  verified_event_id text not null,
  verified_at text not null
);

create table if not exists requirement_registration_diffs (
  diff_id text primary key,
  source_doc text not null,
  entries_json text not null,
  promotion_state text not null,
  decision_record_id text,
  decision_rationale text,
  source_event_range text not null,
  source_watermark integer not null,
  created_at text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists ssot_change_impacts (
  impact_id text primary key,
  requirement_id text not null,
  change_class text not null,
  impacted_packet_ids_json text not null,
  impacted_acceptance_criterion_ids_json text not null,
  impacted_claim_ids_json text not null,
  impacted_evidence_ids_json text not null,
  impacted_gate_ids_json text not null,
  impacted_projection_ids_json text not null,
  review_status text not null,
  source_event_range text not null,
  source_watermark integer not null,
  created_at text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);
"""


def apply_migrations(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    _ensure_column(conn, "requirements", "decision_record_id", "text")
    _ensure_column(conn, "requirements", "decision_rationale", "text")
    _ensure_column(conn, "requirement_registration_diffs", "decision_record_id", "text")
    _ensure_column(conn, "requirement_registration_diffs", "decision_rationale", "text")
    _ensure_column(
        conn,
        "ssot_change_impacts",
        "impacted_acceptance_criterion_ids_json",
        "text not null default '[]'",
    )
    checksum = sha256_text(SCHEMA_SQL)
    conn.execute(
        """
        insert or ignore into schema_migrations (
          migration_id, schema_version, applied_at, checksum, status
        ) values (?, ?, ?, ?, ?)
        """,
        (f"schema-{SCHEMA_VERSION}", SCHEMA_VERSION, utc_now_iso(), checksum, "applied"),
    )
    conn.commit()


def schema_version() -> str:
    return SCHEMA_VERSION


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, declaration: str) -> None:
    existing = {row["name"] for row in conn.execute(f"pragma table_info({table})").fetchall()}
    if column not in existing:
        conn.execute(f"alter table {table} add column {column} {declaration}")
