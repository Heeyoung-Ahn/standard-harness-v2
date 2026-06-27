import fs from "node:fs";
import path from "node:path";

import {
  ACTIVE_CONTEXT_JSON,
  ACTIVE_CONTEXT_MARKDOWN,
  buildActiveContext,
  renderActiveContextMarkdown,
  resolveValidationSummary
} from "./active-context.js";
import { validateGeneratedStateDocs } from "./drift-validator.js";
import {
  CURRENT_STATE_DOC,
  TASK_LIST_DOC,
  buildCurrentStateDoc,
  buildTaskListDoc,
  buildCompatibilityCurrentStateDoc,
  buildCompatibilityTaskListDoc,
  COMPATIBILITY_CURRENT_STATE_PATH,
  COMPATIBILITY_TASK_LIST_PATH
} from "./generate-state-docs.js";
import { GENERATED_DOCS_DIR, RECOVERY_REPORTS_DIR } from "./harness-paths.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";

const AUTHORITY_NOT_MODIFIED = [
  ".agents/artifacts/REQUIREMENTS.md",
  ".agents/artifacts/ARCHITECTURE_GUIDE.md",
  ".agents/artifacts/IMPLEMENTATION_PLAN.md",
  ".agents/artifacts/CURRENT_STATE.md",
  ".agents/artifacts/TASK_LIST.md",
  ".harness/operating_state.sqlite"
];

const DERIVED_PROJECTIONS = [
  CURRENT_STATE_DOC,
  TASK_LIST_DOC,
  COMPATIBILITY_CURRENT_STATE_PATH,
  COMPATIBILITY_TASK_LIST_PATH,
  ACTIVE_CONTEXT_JSON,
  ACTIVE_CONTEXT_MARKDOWN
];

export function runContextRepair({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  timestamp = new Date().toISOString()
} = {}) {
  const root = path.resolve(repoRoot);
  const resolvedOutputDir = path.resolve(outputDir);
  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(root, dbPath);
  const inspected = buildInspectedPaths(root, resolvedDbPath);
  const store = createOperatingStateStore({ dbPath: resolvedDbPath });

  try {
    const beforeValidation = validateSafely({ store, repoRoot: root, outputDir: resolvedOutputDir });
    const staleOrMissingArtifacts = inspectStaleOrMissingArtifacts({
      store,
      outputDir: resolvedOutputDir,
      validation: beforeValidation.result
    });
    const regeneratedArtifacts = regenerateDerivedOutputs({
      store,
      repoRoot: root,
      outputDir: resolvedOutputDir,
      validation: beforeValidation.result?.ok ? beforeValidation.result : null
    });
    const afterValidation = validateSafely({ store, repoRoot: root, outputDir: resolvedOutputDir });
    const confidence = resolveRecoveryConfidence({
      validation: afterValidation.result,
      validationAvailable: afterValidation.available
    });
    const report = {
      command: "context --repair",
      timestamp,
      confidence,
      sourcePathsInspected: inspected,
      staleOrMissingArtifacts,
      regeneratedArtifacts,
      notModifiedArtifacts: AUTHORITY_NOT_MODIFIED,
      validationStatus: resolveValidationStatus(afterValidation),
      requiredNextAction: resolveRepairNextAction({
        confidence,
        validation: afterValidation.result
      }),
      authorityMutation: false,
      dbMutation: "none"
    };
    const reportPaths = writeRecoveryReport({ outputDir: resolvedOutputDir, timestamp, report });

    return {
      ok: confidence !== "Low" && confidence !== "Blocked",
      cutoverReady: confidence !== "Low" && confidence !== "Blocked",
      command: "context --repair",
      confidence,
      reportPath: reportPaths.reportPath,
      latestReportPath: reportPaths.latestReportPath,
      report,
      validation: afterValidation.result,
      nextAction: report.requiredNextAction
    };
  } finally {
    store.close();
  }
}

function regenerateDerivedOutputs({ store, repoRoot, outputDir, validation = null }) {
  const regenerated = [];

  for (const { content, relativePath } of buildGeneratedDocRepairs({ store, repoRoot })) {
    writeText(path.resolve(outputDir, relativePath), content);
    regenerated.push(relativePath);
  }

  const activeContext = buildActiveContext({
    store,
    repoRoot,
    validation: resolveValidationSummary({ repoRoot, validation }),
    generatedAt: resolveProjectionGeneratedAt(store, ACTIVE_CONTEXT_JSON)
  });
  writeText(path.resolve(outputDir, ACTIVE_CONTEXT_JSON), `${JSON.stringify(activeContext, null, 2)}\n`);
  writeText(path.resolve(outputDir, ACTIVE_CONTEXT_MARKDOWN), renderActiveContextMarkdown(activeContext));
  regenerated.push(ACTIVE_CONTEXT_JSON, ACTIVE_CONTEXT_MARKDOWN);

  return regenerated;
}

function buildGeneratedDocRepairs({ store, repoRoot }) {
  const currentStateGeneratedAt = resolveProjectionGeneratedAt(store, CURRENT_STATE_DOC);
  const taskListGeneratedAt = resolveProjectionGeneratedAt(store, TASK_LIST_DOC);
  const compatibilityCurrentStateGeneratedAt = resolveProjectionGeneratedAt(store, COMPATIBILITY_CURRENT_STATE_PATH);
  const compatibilityTaskListGeneratedAt = resolveProjectionGeneratedAt(store, COMPATIBILITY_TASK_LIST_PATH);
  return [
    {
      relativePath: `${GENERATED_DOCS_DIR}/${CURRENT_STATE_DOC}`,
      content: buildCurrentStateDoc(store, { generatedAt: currentStateGeneratedAt })
    },
    {
      relativePath: `${GENERATED_DOCS_DIR}/${TASK_LIST_DOC}`,
      content: buildTaskListDoc(store, { generatedAt: taskListGeneratedAt })
    },
    {
      relativePath: COMPATIBILITY_CURRENT_STATE_PATH,
      content: buildCompatibilityCurrentStateDoc(store, {
        repoRoot,
        generatedAt: compatibilityCurrentStateGeneratedAt
      })
    },
    {
      relativePath: COMPATIBILITY_TASK_LIST_PATH,
      content: buildCompatibilityTaskListDoc(store, {
        repoRoot,
        generatedAt: compatibilityTaskListGeneratedAt
      })
    }
  ];
}

function resolveProjectionGeneratedAt(store, projectionName) {
  return (
    store.getGenerationState(projectionName)?.generatedAt ??
    store.getLatestOperationalTimestamp() ??
    store.getLatestMutationTimestamp() ??
    new Date().toISOString()
  );
}

function inspectStaleOrMissingArtifacts({ store, outputDir, validation }) {
  const fromFilesystem = DERIVED_PROJECTIONS
    .map((projectionName) => ({
      projectionName,
      relativePath: projectionRelativePath(projectionName),
      exists: fs.existsSync(path.resolve(outputDir, projectionRelativePath(projectionName))),
      hasGenerationState: Boolean(store.getGenerationState(projectionName))
    }))
    .filter((item) => !item.exists || !item.hasGenerationState)
    .map((item) => ({
      artifact: item.relativePath,
      reason: !item.exists ? "missing file" : "missing generation_state"
    }));
  const fromValidation = (validation?.findings ?? [])
    .filter((finding) => DERIVED_PROJECTIONS.includes(finding.projectionName) || DERIVED_PROJECTIONS.includes(finding.path))
    .map((finding) => ({
      artifact: projectionRelativePath(finding.projectionName ?? finding.path),
      reason: finding.code
    }));

  return uniqueArtifacts([...fromFilesystem, ...fromValidation]);
}

function resolveRecoveryConfidence({ validation, validationAvailable }) {
  if (validation?.ok) {
    return "High";
  }
  if (!validationAvailable) {
    return "Medium";
  }

  const codes = new Set((validation?.findings ?? []).map((finding) => finding.code));
  if ([...codes].some(isBlockedFindingCode)) {
    return "Blocked";
  }
  if ([...codes].some(isLowConfidenceFindingCode)) {
    return "Low";
  }
  return "Medium";
}

function isBlockedFindingCode(code) {
  return /approval|owner|lane|ready_for_code|semantic_trace|task_packet_status|task_packet_lane/i.test(code);
}

function isLowConfidenceFindingCode(code) {
  return /source_ref|source_wave|authority|checksum_mismatch|parity|contract/i.test(code);
}

function resolveValidationStatus(validationAttempt) {
  if (!validationAttempt.available) {
    return "unavailable";
  }
  return validationAttempt.result?.ok ? "clean" : "failed";
}

export function resolveRepairNextAction({ confidence, validation = null } = {}) {
  const findings = Array.isArray(validation?.findings) ? validation.findings : [];
  const findingCodes = new Set(findings.map((finding) => finding?.code).filter(Boolean));
  if (findingCodes.has("migration_change_pending")) {
    return "Run `node .harness/runtime/state/harness-cli.js migration-apply`, then rerun `node .harness/runtime/state/harness-cli.js validation-report` and `node .harness/runtime/state/harness-cli.js context`.";
  }
  if (confidence === "High") {
    return "Continue normal workflow.";
  }
  if (confidence === "Medium") {
    return "Run `node .harness/runtime/state/harness-cli.js validation-report` and `node .harness/runtime/state/harness-cli.js context`, then reference the timestamped recovery report in packet evidence before closeout.";
  }
  if (confidence === "Low") {
    return "Run `node .harness/runtime/state/harness-cli.js validation-report` and `node .harness/runtime/state/harness-cli.js context`; if low-confidence findings remain, manual maintainer action is required before implementation or closeout continues.";
  }
  return "Manual maintainer action required. Repair canonical packet/approval state first, then rerun `node .harness/runtime/state/harness-cli.js validation-report` and `node .harness/runtime/state/harness-cli.js context` before implementation or closeout continues.";
}

function validateSafely({ store, repoRoot, outputDir }) {
  try {
    return {
      available: true,
      result: validateGeneratedStateDocs({ store, repoRoot, outputDir })
    };
  } catch (error) {
    return {
      available: false,
      result: {
        ok: false,
        cutoverReady: false,
        findings: [
          {
            code: "validation_unavailable",
            severity: "error",
            message: error.message
          }
        ]
      }
    };
  }
}

function writeRecoveryReport({ outputDir, timestamp, report }) {
  const reportDir = path.resolve(outputDir, RECOVERY_REPORTS_DIR);
  const safeTimestamp = timestamp.replace(/[:.]/g, "").replace("Z", "Z");
  const reportPath = path.join(reportDir, `context-repair-${safeTimestamp}.json`);
  const latestReportPath = path.join(reportDir, "latest-context-repair.json");
  const content = `${JSON.stringify(report, null, 2)}\n`;

  writeText(reportPath, content);
  writeText(latestReportPath, content);

  return { reportPath, latestReportPath };
}

function buildInspectedPaths(repoRoot, resolvedDbPath) {
  return [
    ".agents/artifacts/REQUIREMENTS.md",
    ".agents/artifacts/ARCHITECTURE_GUIDE.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    ".agents/artifacts/CURRENT_STATE.md",
    ".agents/artifacts/TASK_LIST.md",
    ".agents/artifacts/VALIDATION_REPORT.json",
    `${GENERATED_DOCS_DIR}/${CURRENT_STATE_DOC}`,
    `${GENERATED_DOCS_DIR}/${TASK_LIST_DOC}`,
    ACTIVE_CONTEXT_JSON,
    ACTIVE_CONTEXT_MARKDOWN,
    path.relative(repoRoot, resolvedDbPath).replaceAll(path.sep, "/")
  ];
}

function projectionRelativePath(projectionName) {
  if (projectionName === CURRENT_STATE_DOC || projectionName === TASK_LIST_DOC) {
    return `${GENERATED_DOCS_DIR}/${projectionName}`;
  }
  if (
    projectionName === COMPATIBILITY_CURRENT_STATE_PATH ||
    projectionName === COMPATIBILITY_TASK_LIST_PATH
  ) {
    return projectionName;
  }
  return projectionName;
}

function uniqueArtifacts(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = `${item.artifact}:${item.reason}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function writeText(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}
