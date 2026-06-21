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
  content_hash text,
  content_hash_algorithm text,
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
  policy_bundle_version text,
  review_bundle_id text,
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

create table if not exists project_completion_results (
  completion_result_id text primary key,
  scope text not null,
  requirement_id text,
  status text not null,
  requirement_counts_json text not null,
  diagnostic_ids_json text not null,
  diagnostics_json text not null,
  source_event_range text not null,
  source_watermark integer not null,
  evaluated_at text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists adapter_invocations (
  adapter_run_id text primary key,
  adapter_id text not null,
  adapter_version text not null,
  input_snapshot_hash text not null,
  permission_roots_json text not null,
  artifact_manifest_json text not null,
  event_request_json text not null,
  failure_classification text,
  evidence_provenance_json text not null,
  timeout_seconds integer not null,
  retry_count integer not null,
  cancel_status text not null,
  idempotency_key text not null,
  source_event_range text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists workflow_runs (
  workflow_run_id text primary key,
  packet_id text not null,
  phase text not null,
  actor_role text not null,
  input_projection_id text,
  source_watermark integer not null,
  status text not null,
  retry_count integer not null,
  blocker_diagnostic_ids_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists review_bundles (
  review_bundle_id text primary key,
  packet_id text not null,
  packet_version integer not null,
  requirement_snapshot_json text not null,
  acceptance_criteria_snapshot_json text not null,
  evidence_manifest_snapshot_json text not null,
  adapter_model_identity text not null,
  source_watermark integer not null,
  freshness_status text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists llm_work_products (
  work_product_id text primary key,
  content text not null,
  work_product_type text not null,
  claim_type text not null,
  confidence text not null,
  human_decision_required integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists decision_claims (
  decision_claim_id text primary key,
  report_id text not null,
  observation text not null,
  inference text not null,
  assumption text not null,
  recommendation text not null,
  confidence text not null,
  human_decision_required integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists role_cards (
  role_id text primary key,
  permitted_actions_json text not null,
  forbidden_decisions_json text not null,
  escalation_duties_json text not null,
  required_review_evidence_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists skill_policy_evaluations (
  evaluation_id text primary key,
  role_id text not null,
  action text not null,
  local_policy_json text not null,
  policy_result text not null,
  diagnostic_ids_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists challenges (
  challenge_id text primary key,
  payload_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists independent_reviews (
  review_id text primary key,
  payload_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists adjudications (
  adjudication_id text primary key,
  payload_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists git_snapshots (
  git_snapshot_id text primary key,
  repo_root text not null,
  branch_name text not null,
  commit_id text not null,
  worktree_path text not null,
  tracked_changes_json text not null,
  untracked_files_json text not null,
  ignored_files_json text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists git_reconciliations (
  reconciliation_id text primary key,
  packet_id text not null,
  git_snapshot_id text not null,
  branch_name text not null,
  commit_id text not null,
  classifications_json text not null,
  unresolved_classifications_json text not null,
  source_event_range text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists filesystem_drifts (
  drift_record_id text primary key,
  drift_id text not null,
  packet_id text not null,
  artifact_id text,
  path text not null,
  drift_type text not null,
  remediation_json text not null,
  resolution_status text not null,
  source text not null,
  source_event_range text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists policy_bundles (
  policy_bundle_id text primary key,
  version text not null,
  risk_taxonomy_version text not null,
  gate_policy_version text not null,
  validator_policy_version text not null,
  skill_policy_version text not null,
  adapter_policy_version text not null,
  security_data_policy_version text not null,
  compatibility_status text not null,
  source_event_range text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists profile_activations (
  activation_id text primary key,
  profile_id text not null,
  status text not null,
  conflicting_profile_ids_json text not null,
  diagnostic_ids_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists dependencies (
  dependency_id text primary key,
  name text not null,
  version text not null,
  source text not null,
  license_basis text not null,
  install_scripts_json text not null,
  network_behavior text not null,
  trust_tier text not null,
  waiver_expiry text,
  rollback_path text not null,
  intake_status text not null,
  diagnostic_ids_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists ip_license_records (
  ip_record_id text primary key,
  source text not null,
  license_or_usage_basis text not null,
  generated_vs_copied text not null,
  attribution_need text not null,
  uncertainty text not null,
  release_blocking_status text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists waivers (
  waiver_id text primary key,
  approver_id text not null,
  approver_role text not null,
  scope text not null,
  expires_at text not null,
  compensating_control text not null,
  affected_gate_ids_json text not null,
  revocation_status text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists threat_models (
  threat_model_id text primary key,
  assets_json text not null,
  trust_boundaries_json text not null,
  attacker_assumptions_json text not null,
  abuse_cases_json text not null,
  mitigations_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists pmo_projections (
  pmo_projection_id text primary key,
  source_event_range text not null,
  source_watermark integer not null,
  packet_counts_json text not null,
  blocked_packets_json text not null,
  open_risks_json text not null,
  milestone_summary_json text not null,
  projection_summary_json text not null default '{}',
  dependency_summary_json text not null,
  diagnostic_summary_json text not null,
  freshness_status text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists cost_records (
  cost_record_id text primary key,
  packet_id text not null,
  tool_name text not null,
  operation_type text not null,
  usage_quantity real not null,
  usage_unit text not null,
  cost_estimate real not null,
  risk_tier text not null,
  source_watermark integer not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists operational_memory_snapshots (
  memory_snapshot_id text primary key,
  source text not null,
  source_event_range text not null,
  source_watermark integer not null,
  entries_json text not null,
  freshness_status text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists human_control_snapshots (
  snapshot_id text primary key,
  source_event_range text not null,
  source_watermark integer not null,
  pending_approvals_json text not null,
  non_delegable_decisions_json text not null,
  active_waivers_json text not null,
  challenged_items_json text not null,
  blocked_gates_json text not null,
  trace_event_id text not null,
  trace_event_seq integer not null
);

create table if not exists cloud_orchestrations (
  orchestration_run_id text primary key,
  packet_id text not null,
  actor_id text not null,
  actor_role text not null,
  remote_environment_id text not null,
  permission_roots_json text not null,
  input_snapshot_hash text not null,
  adapter_run_ids_json text not null,
  status text not null,
  failure_classification text,
  diagnostic_ids_json text not null,
  evidence_output_json text not null,
  source_watermark integer not null,
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
    _ensure_column(
        conn,
        "adapter_invocations",
        "idempotency_key",
        "text not null default ''",
    )
    _ensure_column(conn, "closeouts", "review_bundle_id", "text")
    _ensure_column(conn, "closeouts", "policy_bundle_version", "text")
    _ensure_column(conn, "pmo_projections", "projection_summary_json", "text not null default '{}'")
    _ensure_column(conn, "artifacts", "content_hash", "text")
    _ensure_column(conn, "artifacts", "content_hash_algorithm", "text")
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
