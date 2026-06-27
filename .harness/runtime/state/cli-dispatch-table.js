import path from "node:path";

import { writeActiveContext } from "./active-context.js";
import { runContextRepair } from "./context-repair.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import {
  applyMigration,
  buildMigrationPreview,
  buildRoleBriefCommand,
  buildHarnessStatus,
  explainCurrentBlockers,
  recommendNextAction,
  resolveHandoff,
  runStateSync,
  runTransition,
  runDoctor,
  runAgentCommand,
  runCutoverPreflight,
  runOrchestrateCommand,
  runValidator,
  writeCutoverReport,
  writeValidationReport
} from "./dev05-tooling.js";
import { runEvidenceCommand, runFirstPacketCommand } from "./fresh-start-helpers.js";
import { runLearningCommand } from "./compound-learning.js";
import { runP2Command } from "./v2-p2-conductor.js";
import { runV23Command } from "./v2-3-lean-manuals.js";
import { runV24Command } from "./v2-4-risk-adaptive.js";
import { runV25Command, runV26Command, runV27Command, runV28Command } from "./v2-5-gates.js";
import { runPacketPreflightCommand } from "./packet-preflight.js";
import { runCodexPluginCommand } from "./codex-plugin-writer.js";
import { runCodexReadyDashboardCommand, runCodexStartCommand } from "./codex-ready-dashboard.js";
import { runReviewerProfilesCommand } from "./reviewer-profiles.js";
import { runLearningSurfaceCommand } from "./learning-surface.js";
import { runEvidenceManifestCommand } from "./evidence-manifest.js";
import { runBrowserEvidenceCommand } from "./browser-evidence.js";
import { runDocsCommandInventoryCommand } from "./docs-command-inventory.js";
import { runRiskCommand } from "./bootstrap-risk-closure.js";
import { runPromoteStarterCommand } from "./promote-starter.js";

export function createCommandTable({ repoRoot, outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  return {
  validate: () => runValidator({ repoRoot, outputDir, dbPath }),
  "codex-start": () => runCodexStartCommand({ repoRoot, args: args }),
  "codex-plugin": () => runCodexPluginCommand({ repoRoot, outputDir, args: args }),
  "codex-ready": () => runCodexReadyDashboardCommand({ repoRoot, args: args }),
  "codex-task": () => ({ ...runV24Command({ repoRoot, outputDir, args: ["task-brief", ...args] }), command: "codex-task" }),
  reviewers: () => runReviewerProfilesCommand({ repoRoot, args: args }),
  "reviewer-report": () => runReviewerProfilesCommand({ repoRoot, args: ["report", ...args] }),
  learn: () => runLearningSurfaceCommand({ repoRoot, args: args }),
  doctor: () => runDoctor({ repoRoot, outputDir, dbPath }),
  status: () => buildHarnessStatus({ repoRoot, outputDir, dbPath }),
  next: () => recommendNextAction({ repoRoot, outputDir, dbPath }),
  handoff: () => resolveHandoff({ repoRoot, outputDir, dbPath }),
  explain: () => explainCurrentBlockers({ repoRoot, outputDir, dbPath }),
  "validation-report": () => writeValidationReport({ repoRoot, outputDir, dbPath }),
  context: () => writeContext({ repoRoot, outputDir, dbPath, args: args }),
  "sync-state": () => runStateSync({ repoRoot, outputDir, dbPath }),
  transition: () => runTransition({ repoRoot, outputDir, dbPath, args: args }),
  risk: () => runRiskCommand({ repoRoot, outputDir, dbPath, args: args }),
  "first-packet": () => runFirstPacketCommand({ repoRoot, outputDir, dbPath, args: args }),
  evidence: () => runEvidenceCommand({ repoRoot, outputDir, dbPath, args: args }),
  "evidence-manifest": () => runEvidenceManifestCommand({ repoRoot, args: args }),
  "browser-evidence": () => runBrowserEvidenceCommand({ repoRoot, args: args }),
  "docs-commands": () => runDocsCommandInventoryCommand({ repoRoot, args: args }),
  "promote-starter": () => runPromoteStarterCommand({ repoRoot, args: args }),
  "packet-preflight": () => runPacketPreflightCommand({ repoRoot, dbPath, args: args }),
  brief: () => buildRoleBriefCommand({ repoRoot, outputDir, dbPath, args: args }),
  agent: () => runAgentCommand({ repoRoot, outputDir, dbPath, args: args }),
  orchestrate: () => runOrchestrateCommand({ repoRoot, outputDir, dbPath, args: args }),
  "migration-preview": () => buildMigrationPreview({ repoRoot, dbPath }),
  "migration-apply": () => applyMigration({ repoRoot, dbPath }),
  "cutover-preflight": () => runCutoverPreflight({ repoRoot, outputDir, dbPath }),
  "cutover-report": () => writeCutoverReport({ repoRoot, outputDir, dbPath }),
  learning: () => runLearningCommand({ repoRoot, outputDir, dbPath, args: args }),
  p2: () => runP2Command({ repoRoot, outputDir, dbPath, args: args }),
  v23: () => runV23Command({ repoRoot, outputDir, args: args }),
  v24: () => runV24Command({ repoRoot, outputDir, args: args }),
  v25: () => runV25Command({ repoRoot, args: args }),
  v26: () => runV26Command({ repoRoot, args: args }),
  v27: () => runV27Command({ repoRoot, args: args }),
  v28: () => runV28Command({ repoRoot, args: args })
};}

function writeContext({ repoRoot, outputDir, dbPath, args = [] }) {
  if (args.includes("--repair")) {
    return runContextRepair({ repoRoot, outputDir, dbPath });
  }

  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
  const validation = runValidator({ repoRoot, outputDir, dbPath });
  const store = createOperatingStateStore({ dbPath: resolvedDbPath });
  try {
    return writeActiveContext({ store, repoRoot, outputDir, validation });
  } finally {
    store.close();
  }
}
