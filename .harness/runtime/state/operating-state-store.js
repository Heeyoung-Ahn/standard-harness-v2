import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SCHEMA_VERSION = 4;
export const CORE_TABLES = [
  "abstention_decision",
  "agent_session",
  "artifact_index",
  "context_usage_event",
  "decision_registry",
  "dependency_intake",
  "evidence_quality_report",
  "gate_risk_registry",
  "generation_state",
  "handoff_log",
  "learning_solution",
  "parallel_batch",
  "release_state",
  "route_event",
  "route_job",
  "secret_scan_report",
  "security_review_report",
  "tdd_evidence",
  "untrusted_content_report",
  "work_item_registry"
];
export const DEFAULT_DB_PATH = ".harness/operating_state.sqlite";
export const GENERATED_DOCS = ["CURRENT_STATE.md", "TASK_LIST.md"];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS release_state (
  release_id TEXT PRIMARY KEY,
  current_stage TEXT NOT NULL,
  release_gate_state TEXT NOT NULL,
  current_focus TEXT NOT NULL,
  release_goal TEXT NOT NULL,
  source_ref TEXT,
  updated_by TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_item_registry (
  work_item_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  next_action TEXT,
  source_ref TEXT,
  domain_hint TEXT,
  risk_hint TEXT,
  owner TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decision_registry (
  decision_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  decision_needed INTEGER NOT NULL CHECK (decision_needed IN (0, 1)),
  impact_summary TEXT NOT NULL,
  no_response_behavior TEXT,
  due_at TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gate_risk_registry (
  risk_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  unblock_condition TEXT,
  next_escalation TEXT,
  source_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS handoff_log (
  handoff_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  handoff_summary TEXT NOT NULL,
  from_role TEXT,
  to_role TEXT,
  source_ref TEXT,
  supersedes_handoff_id TEXT REFERENCES handoff_log(handoff_id),
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS artifact_index (
  artifact_id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  source_ref TEXT,
  render_hash TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_state (
  projection_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source_revision TEXT,
  freshness_state TEXT NOT NULL DEFAULT 'fresh',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_session (
  session_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  work_item_id TEXT NOT NULL,
  adapter TEXT NOT NULL,
  status TEXT NOT NULL,
  context_path TEXT NOT NULL,
  prompt_path TEXT NOT NULL,
  output_path TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_job (
  route_job_id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  delivery_route_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  current_role TEXT,
  loop_count INTEGER NOT NULL DEFAULT 0,
  same_finding_counts_json TEXT NOT NULL DEFAULT '{}',
  closeout_package_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_event (
  event_id TEXT PRIMARY KEY,
  route_job_id TEXT NOT NULL,
  session_id TEXT,
  from_role TEXT,
  to_role TEXT,
  event_type TEXT NOT NULL,
  result TEXT NOT NULL,
  evidence_paths_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY(route_job_id) REFERENCES route_job(route_job_id)
);


CREATE TABLE IF NOT EXISTS tdd_evidence (
  evidence_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  work_item_id TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  red_command TEXT,
  green_command TEXT,
  refactor_verified INTEGER NOT NULL DEFAULT 0 CHECK (refactor_verified IN (0, 1)),
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_review_report (
  report_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  work_item_id TEXT,
  risk_class TEXT NOT NULL,
  decision TEXT NOT NULL,
  report_path TEXT,
  findings_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parallel_batch (
  batch_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  work_item_id TEXT,
  strategy TEXT NOT NULL,
  status TEXT NOT NULL,
  units_json TEXT NOT NULL DEFAULT '[]',
  conflict_policy_json TEXT NOT NULL DEFAULT '{}',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_solution (
  solution_id TEXT PRIMARY KEY,
  source_packet_id TEXT NOT NULL,
  work_item_id TEXT,
  problem_type TEXT NOT NULL DEFAULT 'implementation',
  solution_path TEXT NOT NULL UNIQUE,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS abstention_decision (
  decision_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  issue_status TEXT NOT NULL,
  code_change_required INTEGER NOT NULL CHECK (code_change_required IN (0, 1)),
  evidence_path TEXT,
  decision TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_usage_event (
  event_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  lane TEXT NOT NULL,
  phase TEXT NOT NULL,
  file_path TEXT,
  estimated_tokens INTEGER NOT NULL,
  read_reason TEXT,
  reused_from_cache INTEGER NOT NULL DEFAULT 0 CHECK (reused_from_cache IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dependency_intake (
  intake_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  package_name TEXT,
  ecosystem TEXT NOT NULL DEFAULT 'unknown',
  version TEXT,
  registry_verified INTEGER NOT NULL CHECK (registry_verified IN (0, 1)),
  install_script_risk TEXT,
  decision TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_quality_report (
  report_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  packet_id TEXT,
  mode TEXT NOT NULL,
  decision TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS secret_scan_report (
  report_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  findings_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS untrusted_content_report (
  report_id TEXT PRIMARY KEY,
  work_item_id TEXT,
  trust_label TEXT NOT NULL,
  status TEXT NOT NULL,
  findings_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_item_status
  ON work_item_registry(status);

CREATE INDEX IF NOT EXISTS idx_decision_status
  ON decision_registry(status, decision_needed);

CREATE INDEX IF NOT EXISTS idx_gate_risk_status
  ON gate_risk_registry(status, severity);

CREATE INDEX IF NOT EXISTS idx_handoff_created_at
  ON handoff_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifact_category
  ON artifact_index(category);

CREATE INDEX IF NOT EXISTS idx_agent_session_work_item
  ON agent_session(work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_job_work_item
  ON route_job(work_item_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_event_job
  ON route_event(route_job_id, created_at ASC);


CREATE INDEX IF NOT EXISTS idx_tdd_evidence_packet
  ON tdd_evidence(packet_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_review_packet
  ON security_review_report(packet_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_parallel_batch_packet
  ON parallel_batch(packet_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_solution_packet
  ON learning_solution(source_packet_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_context_usage_work_item
  ON context_usage_event(work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dependency_intake_work_item
  ON dependency_intake(work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abstention_decision_work_item
  ON abstention_decision(work_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_secret_scan_work_item
  ON secret_scan_report(work_item_id, created_at DESC);


`;


function migrateSchema(db) {
  const currentVersion = Number(db.prepare("PRAGMA user_version;").get().user_version ?? 0);
  if (currentVersion > SCHEMA_VERSION) {
    throw new ValidationError(
      `Operating state schema version ${currentVersion} is newer than runtime schema ${SCHEMA_VERSION}.`
    );
  }

  if (currentVersion === SCHEMA_VERSION) {
    db.exec(SCHEMA_SQL);
    return;
  }

  db.exec("BEGIN;");
  try {
    // v1/v2 compatibility: this idempotent schema body backfills any missing base tables.
    db.exec(SCHEMA_SQL);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    db.exec("COMMIT;");
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}

export class OptimisticConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = "OptimisticConcurrencyError";
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export function createOperatingStateStore(options = {}) {
  return new OperatingStateStore(options);
}

export class OperatingStateStore {
  constructor({ dbPath = DEFAULT_DB_PATH, now = defaultNow, createIfMissing = true, migrate = true } = {}) {
    this.now = now;
    this.dbPath = resolveDbPath(dbPath);
    this.requestedCreateIfMissing = createIfMissing;
    this.onDiskMissing = this.dbPath !== ":memory:" && !fs.existsSync(this.dbPath);
    const openPath = !createIfMissing && this.onDiskMissing ? ":memory:" : this.dbPath;
    this.openPath = openPath;
    this.readOnlyEmptyState = openPath === ":memory:" && this.dbPath !== ":memory:";

    if (openPath !== ":memory:") {
      fs.mkdirSync(path.dirname(openPath), { recursive: true });
    }

    this.db = new DatabaseSync(openPath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 5000;");
    if (openPath !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL;");
    }

    if (migrate || this.readOnlyEmptyState || openPath === ":memory:") {
      migrateSchema(this.db);
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }

  getSchemaVersion() {
    return this.db.prepare("PRAGMA user_version;").get().user_version;
  }

  listCoreTables() {
    const rows = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all();
    return rows.map((row) => row.name);
  }

  getReleaseState(releaseId = "current") {
    const row = this.db
      .prepare("SELECT * FROM release_state WHERE release_id = ?")
      .get(releaseId);
    return row ? mapReleaseStateRow(row) : null;
  }

  getWorkItem(workItemId) {
    const row = this.db
      .prepare("SELECT * FROM work_item_registry WHERE work_item_id = ?")
      .get(workItemId);
    return row ? mapWorkItemRow(row) : null;
  }

  listWorkItems() {
    return this.db
      .prepare("SELECT * FROM work_item_registry ORDER BY updated_at DESC, work_item_id ASC")
      .all()
      .map(mapWorkItemRow);
  }

  getDecision(decisionId) {
    const row = this.db
      .prepare("SELECT * FROM decision_registry WHERE decision_id = ?")
      .get(decisionId);
    return row ? mapDecisionRow(row) : null;
  }

  listDecisions({ status, decisionNeeded } = {}) {
    const clauses = [];
    const params = [];

    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }

    if (decisionNeeded != null) {
      clauses.push("decision_needed = ?");
      params.push(decisionNeeded ? 1 : 0);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(
        `SELECT * FROM decision_registry ${where} ORDER BY due_at IS NULL, due_at ASC, decision_id ASC`
      )
      .all(...params)
      .map(mapDecisionRow);
  }

  getGateRisk(riskId) {
    const row = this.db
      .prepare("SELECT * FROM gate_risk_registry WHERE risk_id = ?")
      .get(riskId);
    return row ? mapGateRiskRow(row) : null;
  }

  listGateRisks({ status } = {}) {
    const clauses = [];
    const params = [];

    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(
        `SELECT * FROM gate_risk_registry ${where} ORDER BY severity DESC, updated_at DESC, risk_id ASC`
      )
      .all(...params)
      .map(mapGateRiskRow);
  }

  getArtifactByPath(artifactPath) {
    const normalizedPath = normalizeRelativePath(artifactPath, "artifactPath");
    const row = this.db
      .prepare("SELECT * FROM artifact_index WHERE path = ?")
      .get(normalizedPath);
    return row ? mapArtifactRow(row) : null;
  }

  listArtifacts({ category } = {}) {
    const clauses = [];
    const params = [];

    if (category) {
      clauses.push("category = ?");
      params.push(category);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM artifact_index ${where} ORDER BY category ASC, path ASC`)
      .all(...params)
      .map(mapArtifactRow);
  }

  getGenerationState(projectionName) {
    const row = this.db
      .prepare("SELECT * FROM generation_state WHERE projection_name = ?")
      .get(projectionName);
    return row ? mapGenerationRow(row) : null;
  }

  listGenerationStates() {
    return this.db
      .prepare("SELECT * FROM generation_state ORDER BY projection_name ASC")
      .all()
      .map(mapGenerationRow);
  }

  listRecentHandoffs(limit = 10) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
    return this.db
      .prepare("SELECT * FROM handoff_log")
      .all()
      .sort((left, right) =>
        compareTimestampValuesDesc(left.created_at, right.created_at) ||
        String(right.handoff_id).localeCompare(String(left.handoff_id))
      )
      .slice(0, safeLimit)
      .map(mapHandoffRow);
  }

  getLatestMutationTimestamp() {
    const timestamps = [];
    const tables = [
      ["release_state", "updated_at"],
      ["work_item_registry", "updated_at"],
      ["decision_registry", "updated_at"],
      ["gate_risk_registry", "updated_at"],
      ["handoff_log", "created_at"],
      ["artifact_index", "updated_at"],
      ["generation_state", "updated_at"],
      ["agent_session", "updated_at"],
      ["route_job", "updated_at"],
      ["route_event", "created_at"],
      ["tdd_evidence", "updated_at"],
      ["security_review_report", "updated_at"],
      ["parallel_batch", "updated_at"],
      ["learning_solution", "updated_at"],
      ["tdd_evidence", "updated_at"],
      ["security_review_report", "updated_at"],
      ["parallel_batch", "updated_at"],
      ["learning_solution", "updated_at"]
    ];

    for (const [tableName, columnName] of tables) {
      const rows = this.db.prepare(`SELECT ${columnName} AS ts FROM ${tableName}`).all();
      for (const row of rows) {
        if (row?.ts) {
          timestamps.push(row.ts);
        }
      }
    }

    return latestTimestamp(timestamps);
  }

  getLatestOperationalTimestamp() {
    const timestamps = [];
    const tables = [
      ["release_state", "updated_at"],
      ["work_item_registry", "updated_at"],
      ["decision_registry", "updated_at"],
      ["gate_risk_registry", "updated_at"],
      ["handoff_log", "created_at"],
      ["artifact_index", "updated_at"],
      ["agent_session", "updated_at"],
      ["route_job", "updated_at"],
      ["route_event", "created_at"]
    ];

    for (const [tableName, columnName] of tables) {
      const rows = this.db.prepare(`SELECT ${columnName} AS ts FROM ${tableName}`).all();
      for (const row of rows) {
        if (row?.ts) {
          timestamps.push(row.ts);
        }
      }
    }

    return latestTimestamp(timestamps);
  }

  setReleaseState(payload, { expectedVersion } = {}) {
    const releaseId = requiredText(payload.releaseId ?? "current", "releaseId");
    const currentStage = requiredText(payload.currentStage, "currentStage");
    const releaseGateState = requiredText(payload.releaseGateState, "releaseGateState");
    const currentFocus = requiredText(payload.currentFocus, "currentFocus");
    const releaseGoal = requiredText(payload.releaseGoal, "releaseGoal");
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const updatedBy = optionalText(payload.updatedBy);
    const metadataJson = toJson(payload.metadata);
    const existing = this.getReleaseState(releaseId);
    const timestamp = this.now();

    assertExpectedVersion(existing, expectedVersion, `release_state:${releaseId}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE release_state
             SET current_stage = ?, release_gate_state = ?, current_focus = ?, release_goal = ?,
                 source_ref = ?, updated_by = ?, metadata_json = ?, version = ?, updated_at = ?
           WHERE release_id = ?`
        )
        .run(
          currentStage,
          releaseGateState,
          currentFocus,
          releaseGoal,
          sourceRef,
          updatedBy,
          metadataJson,
          existing.version + 1,
          timestamp,
          releaseId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO release_state (
             release_id, current_stage, release_gate_state, current_focus, release_goal,
             source_ref, updated_by, metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          releaseId,
          currentStage,
          releaseGateState,
          currentFocus,
          releaseGoal,
          sourceRef,
          updatedBy,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getReleaseState(releaseId);
  }

  upsertWorkItem(payload, { expectedVersion } = {}) {
    const workItemId = requiredText(payload.workItemId, "workItemId");
    const title = requiredText(payload.title, "title");
    const status = requiredText(payload.status, "status");
    const nextAction = optionalText(payload.nextAction);
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const domainHint = optionalText(payload.domainHint);
    const riskHint = optionalText(payload.riskHint);
    const owner = optionalText(payload.owner);
    const metadataJson = toJson(payload.metadata);
    const existing = this.getWorkItem(workItemId);
    const timestamp = this.now();

    assertExpectedVersion(existing, expectedVersion, `work_item_registry:${workItemId}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE work_item_registry
             SET title = ?, status = ?, next_action = ?, source_ref = ?, domain_hint = ?,
                 risk_hint = ?, owner = ?, metadata_json = ?, version = ?, updated_at = ?
           WHERE work_item_id = ?`
        )
        .run(
          title,
          status,
          nextAction,
          sourceRef,
          domainHint,
          riskHint,
          owner,
          metadataJson,
          existing.version + 1,
          timestamp,
          workItemId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO work_item_registry (
             work_item_id, title, status, next_action, source_ref, domain_hint, risk_hint,
             owner, metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          workItemId,
          title,
          status,
          nextAction,
          sourceRef,
          domainHint,
          riskHint,
          owner,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getWorkItem(workItemId);
  }

  transitionWorkItem({ workItemId, ...updates }, { expectedVersion } = {}) {
    const existing = this.getWorkItem(workItemId);
    if (!existing) {
      throw new ValidationError(`Cannot transition missing work item: ${workItemId}`);
    }

    return this.upsertWorkItem(
      {
        ...existing,
        ...updates,
        workItemId
      },
      { expectedVersion: expectedVersion ?? existing.version }
    );
  }

  recordDecision(payload, { expectedVersion } = {}) {
    const decisionId = requiredText(payload.decisionId, "decisionId");
    const title = requiredText(payload.title, "title");
    const decisionNeeded = typeof payload.decisionNeeded === "boolean" ? payload.decisionNeeded : true;
    const impactSummary = requiredText(payload.impactSummary, "impactSummary");
    const noResponseBehavior = optionalText(payload.noResponseBehavior);
    const dueAt = optionalText(payload.dueAt);
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const status = requiredText(payload.status ?? "open", "status");
    const metadataJson = toJson(payload.metadata);
    const existing = this.getDecision(decisionId);
    const timestamp = this.now();

    assertExpectedVersion(existing, expectedVersion, `decision_registry:${decisionId}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE decision_registry
             SET title = ?, decision_needed = ?, impact_summary = ?, no_response_behavior = ?,
                 due_at = ?, source_ref = ?, status = ?, metadata_json = ?, version = ?, updated_at = ?
           WHERE decision_id = ?`
        )
        .run(
          title,
          decisionNeeded ? 1 : 0,
          impactSummary,
          noResponseBehavior,
          dueAt,
          sourceRef,
          status,
          metadataJson,
          existing.version + 1,
          timestamp,
          decisionId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO decision_registry (
             decision_id, title, decision_needed, impact_summary, no_response_behavior, due_at,
             source_ref, status, metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          decisionId,
          title,
          decisionNeeded ? 1 : 0,
          impactSummary,
          noResponseBehavior,
          dueAt,
          sourceRef,
          status,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getDecision(decisionId);
  }

  recordGateRisk(payload, { expectedVersion } = {}) {
    const riskId = requiredText(payload.riskId, "riskId");
    const title = requiredText(payload.title, "title");
    const severity = requiredText(payload.severity, "severity");
    const status = requiredText(payload.status ?? "open", "status");
    const unblockCondition = optionalText(payload.unblockCondition);
    const nextEscalation = optionalText(payload.nextEscalation);
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const metadataJson = toJson(payload.metadata);
    const existing = this.getGateRisk(riskId);
    const timestamp = this.now();

    assertExpectedVersion(existing, expectedVersion, `gate_risk_registry:${riskId}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE gate_risk_registry
             SET title = ?, severity = ?, status = ?, unblock_condition = ?, next_escalation = ?,
                 source_ref = ?, metadata_json = ?, version = ?, updated_at = ?
           WHERE risk_id = ?`
        )
        .run(
          title,
          severity,
          status,
          unblockCondition,
          nextEscalation,
          sourceRef,
          metadataJson,
          existing.version + 1,
          timestamp,
          riskId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO gate_risk_registry (
             risk_id, title, severity, status, unblock_condition, next_escalation,
             source_ref, metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          riskId,
          title,
          severity,
          status,
          unblockCondition,
          nextEscalation,
          sourceRef,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getGateRisk(riskId);
  }

  appendHandoff(payload) {
    const handoffId = requiredText(payload.handoffId, "handoffId");
    const handoffSummary = requiredText(payload.handoffSummary, "handoffSummary");
    const fromRole = optionalText(payload.fromRole);
    const toRole = optionalText(payload.toRole);
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const supersedesHandoffId = optionalText(payload.supersedesHandoffId);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    const payloadJson = toJson(payload.payload);

    if (supersedesHandoffId) {
      const parent = this.db
        .prepare("SELECT handoff_id FROM handoff_log WHERE handoff_id = ?")
        .get(supersedesHandoffId);
      if (!parent) {
        throw new ValidationError(
          `Cannot append handoff ${handoffId}: supersedes_handoff_id ${supersedesHandoffId} does not exist`
        );
      }
    }

    this.db
      .prepare(
        `INSERT INTO handoff_log (
           handoff_id, created_at, handoff_summary, from_role, to_role,
           source_ref, supersedes_handoff_id, payload_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        handoffId,
        createdAt,
        handoffSummary,
        fromRole,
        toRole,
        sourceRef,
        supersedesHandoffId,
        payloadJson
      );

    const row = this.db
      .prepare("SELECT * FROM handoff_log WHERE handoff_id = ?")
      .get(handoffId);
    return mapHandoffRow(row);
  }

  upsertArtifact(payload, { expectedVersion } = {}) {
    const artifactId = requiredText(payload.artifactId, "artifactId");
    const artifactPath = normalizeRelativePath(payload.path, "path");
    const category = requiredText(payload.category, "category");
    const title = requiredText(payload.title, "title");
    const sourceRef = optionalRelativePath(payload.sourceRef, "sourceRef");
    const renderHash = optionalText(payload.renderHash);
    const metadataJson = toJson(payload.metadata);
    const existing = this.db
      .prepare("SELECT * FROM artifact_index WHERE artifact_id = ?")
      .get(artifactId);
    const timestamp = this.now();

    assertExpectedVersion(existing ? mapArtifactRow(existing) : null, expectedVersion, `artifact_index:${artifactId}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE artifact_index
             SET path = ?, category = ?, title = ?, source_ref = ?, render_hash = ?,
                 metadata_json = ?, version = ?, updated_at = ?
           WHERE artifact_id = ?`
        )
        .run(
          artifactPath,
          category,
          title,
          sourceRef,
          renderHash,
          metadataJson,
          existing.version + 1,
          timestamp,
          artifactId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO artifact_index (
             artifact_id, path, category, title, source_ref, render_hash,
             metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          artifactId,
          artifactPath,
          category,
          title,
          sourceRef,
          renderHash,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getArtifactByPath(artifactPath);
  }

  refreshProjection(payload, { expectedVersion } = {}) {
    const projectionName = requiredText(payload.projectionName, "projectionName");
    const checksum = requiredText(payload.checksum, "checksum");
    const generatedAt = payload.generatedAt ? requiredText(payload.generatedAt, "generatedAt") : this.now();
    const sourceRevision = optionalText(payload.sourceRevision);
    const freshnessState = requiredText(payload.freshnessState ?? "fresh", "freshnessState");
    const metadataJson = toJson(payload.metadata);
    const existing = this.getGenerationState(projectionName);
    const timestamp = this.now();

    assertExpectedVersion(existing, expectedVersion, `generation_state:${projectionName}`);

    if (existing) {
      this.db
        .prepare(
          `UPDATE generation_state
             SET checksum = ?, generated_at = ?, source_revision = ?, freshness_state = ?,
                 metadata_json = ?, version = ?, updated_at = ?
           WHERE projection_name = ?`
        )
        .run(
          checksum,
          generatedAt,
          sourceRevision,
          freshnessState,
          metadataJson,
          existing.version + 1,
          timestamp,
          projectionName
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO generation_state (
             projection_name, checksum, generated_at, source_revision, freshness_state,
             metadata_json, version, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          projectionName,
          checksum,
          generatedAt,
          sourceRevision,
          freshnessState,
          metadataJson,
          1,
          timestamp,
          timestamp
        );
    }

    return this.getGenerationState(projectionName);
  }


  recordTddEvidence(payload) {
    const packetId = requiredText(payload.packetId, "packetId");
    const evidenceId = requiredText(payload.evidenceId ?? `${packetId}:tdd`, "evidenceId");
    const workItemId = optionalText(payload.workItemId);
    const mode = requiredText(payload.mode, "mode");
    const status = requiredText(payload.status ?? "pending", "status");
    const redCommand = optionalText(payload.redCommand);
    const greenCommand = optionalText(payload.greenCommand);
    const refactorVerified = payload.refactorVerified ? 1 : 0;
    const evidenceJson = toJson(payload.evidence);
    const timestamp = this.now();
    this.db.prepare(
      `INSERT INTO tdd_evidence (
         evidence_id, packet_id, work_item_id, mode, status, red_command, green_command,
         refactor_verified, evidence_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(evidence_id) DO UPDATE SET
         packet_id = excluded.packet_id,
         work_item_id = excluded.work_item_id,
         mode = excluded.mode,
         status = excluded.status,
         red_command = excluded.red_command,
         green_command = excluded.green_command,
         refactor_verified = excluded.refactor_verified,
         evidence_json = excluded.evidence_json,
         updated_at = excluded.updated_at`
    ).run(evidenceId, packetId, workItemId, mode, status, redCommand, greenCommand, refactorVerified, evidenceJson, timestamp, timestamp);
    return this.db.prepare("SELECT * FROM tdd_evidence WHERE evidence_id = ?").get(evidenceId);
  }

  recordSecurityReviewReport(payload) {
    const packetId = requiredText(payload.packetId, "packetId");
    const reportId = requiredText(payload.reportId ?? `${packetId}:security`, "reportId");
    const workItemId = optionalText(payload.workItemId);
    const riskClass = requiredText(payload.riskClass ?? "normal", "riskClass");
    const decision = requiredText(payload.decision ?? "pending", "decision");
    const reportPath = optionalRelativePath(payload.reportPath, "reportPath");
    const findingsJson = JSON.stringify(payload.findings ?? []);
    const metadataJson = toJson(payload.metadata);
    const timestamp = this.now();
    this.db.prepare(
      `INSERT INTO security_review_report (
         report_id, packet_id, work_item_id, risk_class, decision, report_path,
         findings_json, metadata_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         packet_id = excluded.packet_id,
         work_item_id = excluded.work_item_id,
         risk_class = excluded.risk_class,
         decision = excluded.decision,
         report_path = excluded.report_path,
         findings_json = excluded.findings_json,
         metadata_json = excluded.metadata_json,
         updated_at = excluded.updated_at`
    ).run(reportId, packetId, workItemId, riskClass, decision, reportPath, findingsJson, metadataJson, timestamp, timestamp);
    return this.db.prepare("SELECT * FROM security_review_report WHERE report_id = ?").get(reportId);
  }

  recordParallelBatch(payload) {
    const packetId = requiredText(payload.packetId, "packetId");
    const batchId = requiredText(payload.batchId, "batchId");
    const workItemId = optionalText(payload.workItemId);
    const strategy = requiredText(payload.strategy ?? "serial", "strategy");
    const status = requiredText(payload.status ?? "planned", "status");
    const unitsJson = JSON.stringify(payload.units ?? []);
    const conflictPolicyJson = toJson(payload.conflictPolicy);
    const metadataJson = toJson(payload.metadata);
    const timestamp = this.now();
    this.db.prepare(
      `INSERT INTO parallel_batch (
         batch_id, packet_id, work_item_id, strategy, status, units_json,
         conflict_policy_json, metadata_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(batch_id) DO UPDATE SET
         packet_id = excluded.packet_id,
         work_item_id = excluded.work_item_id,
         strategy = excluded.strategy,
         status = excluded.status,
         units_json = excluded.units_json,
         conflict_policy_json = excluded.conflict_policy_json,
         metadata_json = excluded.metadata_json,
         updated_at = excluded.updated_at`
    ).run(batchId, packetId, workItemId, strategy, status, unitsJson, conflictPolicyJson, metadataJson, timestamp, timestamp);
    return this.db.prepare("SELECT * FROM parallel_batch WHERE batch_id = ?").get(batchId);
  }

  recordLearningSolution(payload) {
    const solutionId = requiredText(payload.solutionId, "solutionId");
    const sourcePacketId = requiredText(payload.sourcePacketId, "sourcePacketId");
    const workItemId = optionalText(payload.workItemId);
    const problemType = requiredText(payload.problemType ?? "implementation", "problemType");
    const solutionPath = normalizeRelativePath(payload.solutionPath, "solutionPath");
    const metadataJson = toJson(payload.metadata);
    const timestamp = this.now();
    this.db.prepare(
      `INSERT INTO learning_solution (
         solution_id, source_packet_id, work_item_id, problem_type, solution_path,
         metadata_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(solution_id) DO UPDATE SET
         source_packet_id = excluded.source_packet_id,
         work_item_id = excluded.work_item_id,
         problem_type = excluded.problem_type,
         solution_path = excluded.solution_path,
         metadata_json = excluded.metadata_json,
         updated_at = excluded.updated_at`
    ).run(solutionId, sourcePacketId, workItemId, problemType, solutionPath, metadataJson, timestamp, timestamp);
    return this.db.prepare("SELECT * FROM learning_solution WHERE solution_id = ?").get(solutionId);
  }

  recordAbstentionDecision(payload) {
    const decisionId = requiredText(payload.decisionId, "decisionId");
    const workItemId = optionalText(payload.workItemId);
    const issueStatus = requiredText(payload.issueStatus, "issueStatus");
    const codeChangeRequired = payload.codeChangeRequired ? 1 : 0;
    const evidencePath = optionalRelativePath(payload.evidencePath, "evidencePath");
    const decision = requiredText(payload.decision ?? "pending", "decision");
    const metadataJson = toJson(payload.metadata);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO abstention_decision (
         decision_id, work_item_id, issue_status, code_change_required, evidence_path,
         decision, metadata_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(decision_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         issue_status = excluded.issue_status,
         code_change_required = excluded.code_change_required,
         evidence_path = excluded.evidence_path,
         decision = excluded.decision,
         metadata_json = excluded.metadata_json`
    ).run(decisionId, workItemId, issueStatus, codeChangeRequired, evidencePath, decision, metadataJson, createdAt);
    return this.db.prepare("SELECT * FROM abstention_decision WHERE decision_id = ?").get(decisionId);
  }

  recordContextUsageEvent(payload) {
    const eventId = requiredText(payload.eventId, "eventId");
    const workItemId = optionalText(payload.workItemId);
    const lane = requiredText(payload.lane ?? "standard", "lane");
    const phase = requiredText(payload.phase ?? "day-start", "phase");
    const filePath = optionalRelativePath(payload.filePath, "filePath");
    const estimatedTokens = Number(payload.estimatedTokens ?? 0);
    if (!Number.isInteger(estimatedTokens) || estimatedTokens < 0) {
      throw new ValidationError("estimatedTokens must be a non-negative integer");
    }
    const readReason = optionalText(payload.readReason);
    const reusedFromCache = payload.reusedFromCache ? 1 : 0;
    const metadataJson = toJson(payload.metadata);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO context_usage_event (
         event_id, work_item_id, lane, phase, file_path, estimated_tokens,
         read_reason, reused_from_cache, metadata_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(event_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         lane = excluded.lane,
         phase = excluded.phase,
         file_path = excluded.file_path,
         estimated_tokens = excluded.estimated_tokens,
         read_reason = excluded.read_reason,
         reused_from_cache = excluded.reused_from_cache,
         metadata_json = excluded.metadata_json`
    ).run(eventId, workItemId, lane, phase, filePath, estimatedTokens, readReason, reusedFromCache, metadataJson, createdAt);
    return this.db.prepare("SELECT * FROM context_usage_event WHERE event_id = ?").get(eventId);
  }

  recordDependencyIntake(payload) {
    const intakeId = requiredText(payload.intakeId, "intakeId");
    const workItemId = optionalText(payload.workItemId);
    const packageName = optionalText(payload.packageName);
    const ecosystem = requiredText(payload.ecosystem ?? "unknown", "ecosystem");
    const version = optionalText(payload.version);
    const registryVerified = payload.registryVerified ? 1 : 0;
    const installScriptRisk = optionalText(payload.installScriptRisk);
    const decision = requiredText(payload.decision ?? "pending", "decision");
    const evidenceJson = toJson(payload.evidence);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO dependency_intake (
         intake_id, work_item_id, package_name, ecosystem, version, registry_verified,
         install_script_risk, decision, evidence_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(intake_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         package_name = excluded.package_name,
         ecosystem = excluded.ecosystem,
         version = excluded.version,
         registry_verified = excluded.registry_verified,
         install_script_risk = excluded.install_script_risk,
         decision = excluded.decision,
         evidence_json = excluded.evidence_json`
    ).run(intakeId, workItemId, packageName, ecosystem, version, registryVerified, installScriptRisk, decision, evidenceJson, createdAt);
    return this.db.prepare("SELECT * FROM dependency_intake WHERE intake_id = ?").get(intakeId);
  }

  recordEvidenceQualityReport(payload) {
    const reportId = requiredText(payload.reportId, "reportId");
    const workItemId = optionalText(payload.workItemId);
    const packetId = optionalText(payload.packetId);
    const mode = requiredText(payload.mode ?? "behavior", "mode");
    const decision = requiredText(payload.decision ?? "pending", "decision");
    const evidenceJson = toJson(payload.evidence);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO evidence_quality_report (
         report_id, work_item_id, packet_id, mode, decision, evidence_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         packet_id = excluded.packet_id,
         mode = excluded.mode,
         decision = excluded.decision,
         evidence_json = excluded.evidence_json`
    ).run(reportId, workItemId, packetId, mode, decision, evidenceJson, createdAt);
    return this.db.prepare("SELECT * FROM evidence_quality_report WHERE report_id = ?").get(reportId);
  }

  recordSecretScanReport(payload) {
    const reportId = requiredText(payload.reportId, "reportId");
    const workItemId = optionalText(payload.workItemId);
    const severity = requiredText(payload.severity ?? "none", "severity");
    const status = requiredText(payload.status ?? "pass", "status");
    const findingsJson = JSON.stringify(payload.findings ?? []);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO secret_scan_report (
         report_id, work_item_id, severity, status, findings_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         severity = excluded.severity,
         status = excluded.status,
         findings_json = excluded.findings_json`
    ).run(reportId, workItemId, severity, status, findingsJson, createdAt);
    return this.db.prepare("SELECT * FROM secret_scan_report WHERE report_id = ?").get(reportId);
  }

  recordUntrustedContentReport(payload) {
    const reportId = requiredText(payload.reportId, "reportId");
    const workItemId = optionalText(payload.workItemId);
    const trustLabel = requiredText(payload.trustLabel ?? "untrusted-external", "trustLabel");
    const status = requiredText(payload.status ?? "digest-only", "status");
    const findingsJson = JSON.stringify(payload.findings ?? []);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();
    this.db.prepare(
      `INSERT INTO untrusted_content_report (
         report_id, work_item_id, trust_label, status, findings_json, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_id) DO UPDATE SET
         work_item_id = excluded.work_item_id,
         trust_label = excluded.trust_label,
         status = excluded.status,
         findings_json = excluded.findings_json`
    ).run(reportId, workItemId, trustLabel, status, findingsJson, createdAt);
    return this.db.prepare("SELECT * FROM untrusted_content_report WHERE report_id = ?").get(reportId);
  }

  recordAgentSession(payload) {
    const sessionId = requiredText(payload.sessionId, "sessionId");
    const role = requiredText(payload.role, "role");
    const operatorId = requiredText(payload.operatorId, "operatorId");
    const workItemId = requiredText(payload.workItemId, "workItemId");
    const adapter = requiredText(payload.adapter, "adapter");
    const status = requiredText(payload.status, "status");
    const contextPath = normalizeRelativePath(payload.contextPath, "contextPath");
    const promptPath = normalizeRelativePath(payload.promptPath, "promptPath");
    const outputPath = normalizeRelativePath(payload.outputPath, "outputPath");
    const metadataJson = toJson(payload.metadata);
    const timestamp = this.now();
    const existing = this.getAgentSession(sessionId);

    if (existing) {
      this.db
        .prepare(
          `UPDATE agent_session
             SET role = ?, operator_id = ?, work_item_id = ?, adapter = ?, status = ?,
                 context_path = ?, prompt_path = ?, output_path = ?, metadata_json = ?, updated_at = ?
           WHERE session_id = ?`
        )
        .run(
          role,
          operatorId,
          workItemId,
          adapter,
          status,
          contextPath,
          promptPath,
          outputPath,
          metadataJson,
          timestamp,
          sessionId
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO agent_session (
             session_id, role, operator_id, work_item_id, adapter, status,
             context_path, prompt_path, output_path, metadata_json, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          sessionId,
          role,
          operatorId,
          workItemId,
          adapter,
          status,
          contextPath,
          promptPath,
          outputPath,
          metadataJson,
          timestamp,
          timestamp
        );
    }

    return this.getAgentSession(sessionId);
  }

  getAgentSession(sessionId) {
    const row = this.db
      .prepare("SELECT * FROM agent_session WHERE session_id = ?")
      .get(sessionId);
    return row ? mapAgentSessionRow(row) : null;
  }

  listAgentSessions({ workItemId } = {}) {
    const clauses = [];
    const params = [];
    if (workItemId) {
      clauses.push("work_item_id = ?");
      params.push(workItemId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM agent_session ${where} ORDER BY created_at ASC, session_id ASC`)
      .all(...params)
      .map(mapAgentSessionRow);
  }

  createRouteJob(payload) {
    const routeJobId = requiredText(payload.routeJobId, "routeJobId");
    const workItemId = requiredText(payload.workItemId, "workItemId");
    const deliveryRouteMode = requiredText(payload.deliveryRouteMode, "deliveryRouteMode");
    const status = requiredText(payload.status, "status");
    const currentRole = optionalText(payload.currentRole);
    const loopCount = Number.isInteger(payload.loopCount) ? payload.loopCount : 0;
    const sameFindingCountsJson = toJson(payload.sameFindingCounts);
    const closeoutPackageJson = toJson(payload.closeoutPackage);
    const metadataJson = toJson(payload.metadata);
    const timestamp = this.now();

    this.db
      .prepare(
        `INSERT INTO route_job (
           route_job_id, work_item_id, delivery_route_mode, status, current_role,
           loop_count, same_finding_counts_json, closeout_package_json, metadata_json,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        routeJobId,
        workItemId,
        deliveryRouteMode,
        status,
        currentRole,
        loopCount,
        sameFindingCountsJson,
        closeoutPackageJson,
        metadataJson,
        timestamp,
        timestamp
      );

    return this.getRouteJob(routeJobId);
  }

  updateRouteJob(payload) {
    const routeJobId = requiredText(payload.routeJobId, "routeJobId");
    const existing = this.getRouteJob(routeJobId);
    if (!existing) {
      throw new ValidationError(`Cannot update missing route job: ${routeJobId}`);
    }
    const timestamp = this.now();
    const merged = {
      ...existing,
      ...payload
    };
    this.db
      .prepare(
        `UPDATE route_job
           SET work_item_id = ?, delivery_route_mode = ?, status = ?, current_role = ?,
               loop_count = ?, same_finding_counts_json = ?, closeout_package_json = ?,
               metadata_json = ?, updated_at = ?
         WHERE route_job_id = ?`
      )
      .run(
        requiredText(merged.workItemId, "workItemId"),
        requiredText(merged.deliveryRouteMode, "deliveryRouteMode"),
        requiredText(merged.status, "status"),
        optionalText(merged.currentRole),
        Number.isInteger(merged.loopCount) ? merged.loopCount : 0,
        toJson(merged.sameFindingCounts),
        toJson(merged.closeoutPackage),
        toJson(merged.metadata),
        timestamp,
        routeJobId
      );

    return this.getRouteJob(routeJobId);
  }

  getRouteJob(routeJobId) {
    const row = this.db
      .prepare("SELECT * FROM route_job WHERE route_job_id = ?")
      .get(routeJobId);
    return row ? mapRouteJobRow(row) : null;
  }

  listRouteJobs({ workItemId } = {}) {
    const clauses = [];
    const params = [];
    if (workItemId) {
      clauses.push("work_item_id = ?");
      params.push(workItemId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM route_job ${where} ORDER BY updated_at DESC, route_job_id ASC`)
      .all(...params)
      .map(mapRouteJobRow);
  }

  appendRouteEvent(payload) {
    const routeJobId = requiredText(payload.routeJobId, "routeJobId");
    if (!this.getRouteJob(routeJobId)) {
      throw new ValidationError(`Cannot append route event for missing route job: ${routeJobId}`);
    }
    const eventId = requiredText(payload.eventId ?? `route-event-${this.now()}-${Math.random().toString(36).slice(2)}`, "eventId");
    const sessionId = optionalText(payload.sessionId);
    const fromRole = optionalText(payload.fromRole);
    const toRole = optionalText(payload.toRole);
    const eventType = requiredText(payload.eventType, "eventType");
    const result = requiredText(payload.result, "result");
    const evidencePathsJson = JSON.stringify(payload.evidencePaths ?? []);
    const payloadJson = toJson(payload.payload);
    const createdAt = payload.createdAt ? requiredText(payload.createdAt, "createdAt") : this.now();

    this.db
      .prepare(
        `INSERT INTO route_event (
           event_id, route_job_id, session_id, from_role, to_role, event_type,
           result, evidence_paths_json, payload_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(eventId, routeJobId, sessionId, fromRole, toRole, eventType, result, evidencePathsJson, payloadJson, createdAt);

    return this.listRouteEvents({ routeJobId }).find((event) => event.eventId === eventId) ?? null;
  }

  listRouteEvents({ routeJobId } = {}) {
    const clauses = [];
    const params = [];
    if (routeJobId) {
      clauses.push("route_job_id = ?");
      params.push(routeJobId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .prepare(`SELECT * FROM route_event ${where} ORDER BY created_at ASC, event_id ASC`)
      .all(...params)
      .map(mapRouteEventRow);
  }
}

function resolveDbPath(dbPath) {
  if (dbPath === ":memory:") {
    return dbPath;
  }
  return path.resolve(dbPath);
}

function defaultNow() {
  return new Date().toISOString();
}

function latestTimestamp(timestamps) {
  return timestamps
    .filter(Boolean)
    .sort(compareTimestampValuesDesc)[0] ?? null;
}

function compareTimestampValuesDesc(left, right) {
  const leftEpoch = parseTimestampForSort(left);
  const rightEpoch = parseTimestampForSort(right);

  if (leftEpoch != null && rightEpoch != null && leftEpoch !== rightEpoch) {
    return rightEpoch - leftEpoch;
  }

  if (leftEpoch != null && rightEpoch == null) {
    return -1;
  }

  if (leftEpoch == null && rightEpoch != null) {
    return 1;
  }

  return String(right ?? "").localeCompare(String(left ?? ""));
}

function parseTimestampForSort(value) {
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) ? epoch : null;
}

function requiredText(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

function optionalText(value) {
  if (value == null) {
    return null;
  }
  return requiredText(value, "optionalText");
}

function optionalRelativePath(value, fieldName) {
  if (value == null) {
    return null;
  }
  return normalizeRelativePath(value, fieldName);
}

function normalizeRelativePath(value, fieldName) {
  const raw = requiredText(value, fieldName).replaceAll("\\", "/");
  const normalized = path.posix.normalize(raw);
  if (
    path.isAbsolute(raw) ||
    path.win32.isAbsolute(raw) ||
    /^[A-Za-z]:\//.test(raw) ||
    raw.startsWith("//") ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new ValidationError(`${fieldName} must be a repo-relative path`);
  }
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function toJson(value) {
  return JSON.stringify(value ?? {});
}

function fromJson(value) {
  return value ? JSON.parse(value) : {};
}

function assertExpectedVersion(existing, expectedVersion, rowLabel) {
  if (expectedVersion == null) {
    return;
  }

  if (!existing) {
    throw new OptimisticConcurrencyError(
      `Expected version ${expectedVersion} for ${rowLabel}, but no row exists`
    );
  }

  if (existing.version !== expectedVersion) {
    throw new OptimisticConcurrencyError(
      `Expected version ${expectedVersion} for ${rowLabel}, found ${existing.version}`
    );
  }
}

function mapReleaseStateRow(row) {
  return {
    releaseId: row.release_id,
    currentStage: row.current_stage,
    releaseGateState: row.release_gate_state,
    currentFocus: row.current_focus,
    releaseGoal: row.release_goal,
    sourceRef: row.source_ref,
    updatedBy: row.updated_by,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapWorkItemRow(row) {
  return {
    workItemId: row.work_item_id,
    title: row.title,
    status: row.status,
    nextAction: row.next_action,
    sourceRef: row.source_ref,
    domainHint: row.domain_hint,
    riskHint: row.risk_hint,
    owner: row.owner,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDecisionRow(row) {
  return {
    decisionId: row.decision_id,
    title: row.title,
    decisionNeeded: Boolean(row.decision_needed),
    impactSummary: row.impact_summary,
    noResponseBehavior: row.no_response_behavior,
    dueAt: row.due_at,
    sourceRef: row.source_ref,
    status: row.status,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGateRiskRow(row) {
  return {
    riskId: row.risk_id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    unblockCondition: row.unblock_condition,
    nextEscalation: row.next_escalation,
    sourceRef: row.source_ref,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHandoffRow(row) {
  return {
    handoffId: row.handoff_id,
    createdAt: row.created_at,
    handoffSummary: row.handoff_summary,
    fromRole: row.from_role,
    toRole: row.to_role,
    sourceRef: row.source_ref,
    supersedesHandoffId: row.supersedes_handoff_id,
    payload: fromJson(row.payload_json)
  };
}

function mapArtifactRow(row) {
  return {
    artifactId: row.artifact_id,
    path: row.path,
    category: row.category,
    title: row.title,
    sourceRef: row.source_ref,
    renderHash: row.render_hash,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGenerationRow(row) {
  return {
    projectionName: row.projection_name,
    checksum: row.checksum,
    generatedAt: row.generated_at,
    sourceRevision: row.source_revision,
    freshnessState: row.freshness_state,
    metadata: fromJson(row.metadata_json),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAgentSessionRow(row) {
  return {
    sessionId: row.session_id,
    role: row.role,
    operatorId: row.operator_id,
    workItemId: row.work_item_id,
    adapter: row.adapter,
    status: row.status,
    contextPath: row.context_path,
    promptPath: row.prompt_path,
    outputPath: row.output_path,
    metadata: fromJson(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRouteJobRow(row) {
  return {
    routeJobId: row.route_job_id,
    workItemId: row.work_item_id,
    deliveryRouteMode: row.delivery_route_mode,
    status: row.status,
    currentRole: row.current_role,
    loopCount: row.loop_count,
    sameFindingCounts: fromJson(row.same_finding_counts_json),
    closeoutPackage: fromJson(row.closeout_package_json),
    metadata: fromJson(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRouteEventRow(row) {
  return {
    eventId: row.event_id,
    routeJobId: row.route_job_id,
    sessionId: row.session_id,
    fromRole: row.from_role,
    toRole: row.to_role,
    eventType: row.event_type,
    result: row.result,
    evidencePaths: fromJson(row.evidence_paths_json),
    payload: fromJson(row.payload_json),
    createdAt: row.created_at
  };
}
