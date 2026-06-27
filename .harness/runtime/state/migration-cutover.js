import fs from "node:fs";
import path from "node:path";

import { validateGeneratedStateDocs } from "./drift-validator.js";
import { CURRENT_STATE_DOC, TASK_LIST_DOC } from "./generate-state-docs.js";
import {
  ARTIFACT_PATHS,
  CUTOVER_REPORT_JSON,
  CUTOVER_REPORT_MARKDOWN,
  GENERATED_DOCS_DIR
} from "./harness-paths.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import {
  detectStarterBootstrapPending,
  resolveDbPath,
  withStore
} from "./validation-core.js";

export const STANDARD_PATH_MIGRATIONS = {
  "REQUIREMENTS.md": ARTIFACT_PATHS.requirements,
  "ARCHITECTURE_GUIDE.md": ARTIFACT_PATHS.architecture,
  "IMPLEMENTATION_PLAN.md": ARTIFACT_PATHS.plan,
  "UI_DESIGN.md": ARTIFACT_PATHS.ui,
  "CURRENT_STATE.md": `${GENERATED_DOCS_DIR}/${CURRENT_STATE_DOC}`,
  "TASK_LIST.md": `${GENERATED_DOCS_DIR}/${TASK_LIST_DOC}`,
  "codex/project-context/active-state.md": ARTIFACT_PATHS.active,
  "codex/project-context/preventive-memory.md": ARTIFACT_PATHS.preventive,
  "PKT-01_DEV-01_DB_FOUNDATION.md": "reference/packets/PKT-01_DEV-01_DB_FOUNDATION.md",
  "PKT-01_DEV-02_GENERATED_STATE_DOCS.md": "reference/packets/PKT-01_DEV-02_GENERATED_STATE_DOCS.md",
  "PKT-01_DEV-03_CONTEXT_RESTORATION_READ_MODEL.md": "reference/packets/PKT-01_DEV-03_CONTEXT_RESTORATION_READ_MODEL.md",
  "PKT-01_LEGACY_READ_SURFACE.md": "reference/packets/PKT-01_LEGACY_READ_SURFACE.md",
  "PKT-01_WORK_ITEM_PACKET_TEMPLATE.md": "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
  "PLN-00_DEEP_INTERVIEW.md": "reference/planning/PLN-00_DEEP_INTERVIEW.md",
  "PLN-01_REQUIREMENTS_FREEZE.md": "reference/planning/PLN-01_REQUIREMENTS_FREEZE.md",
  "PROTOTYPE_REFERENCE.md": "reference/planning/PROTOTYPE_REFERENCE.md",
  "docs/legacy-read-surface-mockup.html": "reference/mockups/legacy-read-surface-mockup.html",
  "codex/project-context/durable-context.md": "reference/artifacts/SYSTEM_CONTEXT.md",
  "codex/project-context/restart-handoff-2026-04-19.md": "reference/artifacts/HANDOFF_ARCHIVE.md",
  "codex/project-context/daily/2026-04-19.md": "reference/artifacts/daily/2026-04-19.md",
  "codex/project-context/daily/2026-04-20.md": "reference/artifacts/daily/2026-04-20.md"
};

export function buildMigrationPreview({ repoRoot = process.cwd(), dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => {
    const changes = collectPathChanges(store);
    return {
      ok: true,
      repoRoot: path.resolve(repoRoot),
      dbPath: resolveDbPath(repoRoot, dbPath),
      changeCount: changes.length,
      changes
    };
  });
}

export function applyMigration({ repoRoot = process.cwd(), dbPath = DEFAULT_DB_PATH, appliedBy = "dev05-tooling" } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => {
    const changes = collectPathChanges(store);
    if (changes.length === 0) {
      return {
        ok: true,
        applied: 0,
        changes: []
      };
    }

    const timestamp = new Date().toISOString();
    const db = store.db;

    for (const change of changes) {
      if (change.table === "handoff_log") {
        db.prepare(`UPDATE handoff_log SET ${change.field} = ? WHERE handoff_id = ?`)
          .run(change.to, change.rowId);
        continue;
      }

      db.prepare(
        `UPDATE ${change.table}
            SET ${change.field} = ?, version = ?, updated_at = ?
          WHERE ${change.idColumn} = ?`
      ).run(change.to, change.nextVersion, timestamp, change.rowId);
    }

    return {
      ok: true,
      applied: changes.length,
      appliedBy,
      changes
    };
  });
}

export function runCutoverPreflight({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => {
    const bootstrapPending = detectStarterBootstrapPending({ repoRoot, store });
    if (bootstrapPending) {
      return {
        ok: false,
        cutoverReady: false,
        validator: {
          ok: false,
          cutoverReady: false,
          findings: [bootstrapPending]
        },
        migrationPreview: {
          ok: true,
          repoRoot: path.resolve(repoRoot),
          dbPath: resolveDbPath(repoRoot, dbPath),
          changeCount: 0,
          changes: []
        },
        rollbackBundle: buildRollbackBundle({ repoRoot, dbPath }),
        blockers: [
          {
            code: bootstrapPending.code,
            message: bootstrapPending.message
          }
        ]
      };
    }

    const validator = validateGeneratedStateDocs({ store, repoRoot, outputDir });
    const migrationPreview = {
      ok: true,
      repoRoot: path.resolve(repoRoot),
      dbPath: resolveDbPath(repoRoot, dbPath),
      changes: collectPathChanges(store)
    };
    migrationPreview.changeCount = migrationPreview.changes.length;
    const rollbackBundle = buildRollbackBundle({ repoRoot, dbPath });

    const blockers = [
      ...validator.findings
        .filter((finding) => finding.severity === "error")
        .map((finding) => ({
          code: finding.code,
          message: finding.message
        })),
      ...migrationPreview.changes.map((change) => ({
        code: "migration_change_pending",
        message: `${change.table}:${change.rowId} ${change.field} still points to ${change.from}.`
      })),
      ...rollbackBundle.missingPaths.map((item) => ({
        code: "rollback_bundle_missing",
        message: `Rollback bundle is missing ${item.kind}: ${item.path}.`
      }))
    ];

    return {
      ok: blockers.length === 0,
      cutoverReady: blockers.length === 0,
      validator,
      migrationPreview,
      rollbackBundle,
      blockers
    };
  });
}

export function writeCutoverReport({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  const preflight = runCutoverPreflight({ repoRoot, outputDir, dbPath });
  const root = path.resolve(repoRoot);
  const markdownPath = path.resolve(root, CUTOVER_REPORT_MARKDOWN);
  const jsonPath = path.resolve(root, CUTOVER_REPORT_JSON);

  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, buildCutoverReportMarkdown(preflight), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(preflight, null, 2)}\n`, "utf8");

  return {
    ok: preflight.ok,
    cutoverReady: preflight.cutoverReady,
    markdownPath,
    jsonPath,
    preflight
  };
}

function collectPathChanges(store) {
  const changes = [];
  const releaseState = store.getReleaseState("current");
  if (releaseState) {
    collectSingleFieldChange(changes, {
      table: "release_state",
      rowId: releaseState.releaseId,
      idColumn: "release_id",
      field: "source_ref",
      value: releaseState.sourceRef,
      version: releaseState.version
    });
  }

  for (const row of store.listWorkItems()) {
    collectSingleFieldChange(changes, {
      table: "work_item_registry",
      rowId: row.workItemId,
      idColumn: "work_item_id",
      field: "source_ref",
      value: row.sourceRef,
      version: row.version
    });
  }

  for (const row of store.listDecisions()) {
    collectSingleFieldChange(changes, {
      table: "decision_registry",
      rowId: row.decisionId,
      idColumn: "decision_id",
      field: "source_ref",
      value: row.sourceRef,
      version: row.version
    });
  }

  for (const row of store.listGateRisks()) {
    collectSingleFieldChange(changes, {
      table: "gate_risk_registry",
      rowId: row.riskId,
      idColumn: "risk_id",
      field: "source_ref",
      value: row.sourceRef,
      version: row.version
    });
  }

  for (const row of store.listRecentHandoffs(200)) {
    collectSingleFieldChange(changes, {
      table: "handoff_log",
      rowId: row.handoffId,
      idColumn: "handoff_id",
      field: "source_ref",
      value: row.sourceRef,
      version: null
    });
  }

  for (const row of store.listArtifacts()) {
    collectSingleFieldChange(changes, {
      table: "artifact_index",
      rowId: row.artifactId,
      idColumn: "artifact_id",
      field: "path",
      value: row.path,
      version: row.version
    });
    collectSingleFieldChange(changes, {
      table: "artifact_index",
      rowId: row.artifactId,
      idColumn: "artifact_id",
      field: "source_ref",
      value: row.sourceRef,
      version: row.version
    });
  }

  return changes;
}

function collectSingleFieldChange(changes, { table, rowId, idColumn, field, value, version }) {
  if (!value) {
    return;
  }
  const to = STANDARD_PATH_MIGRATIONS[value];
  if (!to || to === value) {
    return;
  }
  changes.push({
    table,
    rowId,
    idColumn,
    field,
    from: value,
    to,
    nextVersion: version == null ? null : version + 1
  });
}

function buildRollbackBundle({ repoRoot, dbPath }) {
  const root = path.resolve(repoRoot);
  const dbPathResolved = resolveDbPath(repoRoot, dbPath);
  const generatedDocs = [
    path.resolve(root, GENERATED_DOCS_DIR, CURRENT_STATE_DOC),
    path.resolve(root, GENERATED_DOCS_DIR, TASK_LIST_DOC)
  ];
  const liveArtifacts = [
    path.resolve(root, ARTIFACT_PATHS.requirements),
    path.resolve(root, ARTIFACT_PATHS.architecture),
    path.resolve(root, ARTIFACT_PATHS.plan),
    path.resolve(root, ARTIFACT_PATHS.progress),
    path.resolve(root, ARTIFACT_PATHS.active),
    path.resolve(root, ARTIFACT_PATHS.preventive)
  ];
  const missingPaths = [
    { kind: "db", path: dbPathResolved },
    ...generatedDocs.map((item) => ({ kind: "generated doc", path: item })),
    ...liveArtifacts.map((item) => ({ kind: "live artifact", path: item }))
  ].filter((item) => !fs.existsSync(item.path));

  return {
    dbPath: dbPathResolved,
    generatedDocs,
    liveArtifacts,
    missingPaths,
    needsOperatorBackup: missingPaths.length > 0
  };
}

function buildCutoverReportMarkdown(preflight) {
  const lines = [
    "# Cutover Precheck",
    "",
    "## Summary",
    preflight.cutoverReady
      ? "The standardized harness is cutover-ready for the current repo snapshot."
      : "The standardized harness is not cutover-ready for the current repo snapshot.",
    "",
    "## Result",
    `- Ready: ${preflight.cutoverReady ? "yes" : "no"}`,
    `- Validator ok: ${preflight.validator.ok ? "yes" : "no"}`,
    `- Migration preview changes: ${preflight.migrationPreview.changeCount}`,
    `- Blocker count: ${preflight.blockers.length}`,
    "",
    "## Validator Findings"
  ];

  const findings = preflight.validator.findings?.length
    ? preflight.validator.findings.map((finding) => `- [${finding.severity}] ${finding.code}: ${finding.message}`)
    : ["- none"];
  lines.push(...findings, "", "## Migration Preview");

  const changes = preflight.migrationPreview.changes?.length
    ? preflight.migrationPreview.changes.map((change) => `- ${change.table}:${change.rowId} ${change.field} -> ${change.to}`)
    : ["- no pending path normalization changes"];
  lines.push(...changes, "", "## Blockers");

  const blockers = preflight.blockers.length
    ? preflight.blockers.map((blocker) => `- ${blocker.code}: ${blocker.message}`)
    : ["- none"];
  lines.push(...blockers, "", "## Rollback Bundle");

  lines.push(
    `- DB: ${preflight.rollbackBundle.dbPath}`,
    ...preflight.rollbackBundle.generatedDocs.map((item) => `- Generated doc: ${item}`),
    ...preflight.rollbackBundle.liveArtifacts.map((item) => `- Live artifact: ${item}`)
  );

  if (preflight.rollbackBundle.needsOperatorBackup) {
    lines.push(
      "- needs operator backup: yes",
      ...preflight.rollbackBundle.missingPaths.map((item) => `- Missing ${item.kind}: ${item.path}`)
    );
  } else {
    lines.push("- needs operator backup: no");
  }

  return `${lines.join("\n")}\n`;
}
