import fs from "node:fs";
import path from "node:path";

import { validateGeneratedStateDocs } from "./drift-validator.js";
import { CURRENT_STATE_DOC, TASK_LIST_DOC } from "./generate-state-docs.js";
import { GENERATED_DOCS_DIR, REPOSITORY_LAYOUT_MARKDOWN } from "./harness-paths.js";
import { looksLikeStarterPlaceholder } from "./init-project.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import { RELEASE_BASELINE, isInstallableReleaseMaintainerRepo } from "./release-baseline.js";
import { isClosedStatus, selectActiveWorkItem } from "./workflow-routing.js";

export function runValidator({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const bootstrapPending = detectStarterBootstrapPending({ repoRoot, store });
    if (bootstrapPending) {
      return {
        ok: false,
        structuralReady: false,
        cutoverReady: false,
        findings: [bootstrapPending]
      };
    }
    return validateGeneratedStateDocs({ store, repoRoot, outputDir });
  });
}

export function runDoctor({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const root = path.resolve(repoRoot);
    const validation = runValidator({ repoRoot, outputDir, dbPath });
    const checks = [
      buildCheck(
        "node_runtime",
        nodeMajor() >= 24,
        `Node.js ${process.versions.node}`,
        "Node.js 24+ is required for the harness runtime only."
      ),
      buildCheck(
        "harness_runtime_path",
        fs.existsSync(path.join(root, ".harness", "runtime")),
        ".harness/runtime exists",
        "Harness runtime must live outside product src/test paths."
      ),
      buildCheck(
        "harness_test_path",
        fs.existsSync(path.join(root, ".harness", "test")),
        ".harness/test exists",
        "Harness tests must live outside product test paths."
      ),
      buildCheck(
        "repository_layout_contract",
        fs.existsSync(path.join(root, REPOSITORY_LAYOUT_MARKDOWN)),
        REPOSITORY_LAYOUT_MARKDOWN,
        "Repository layout ownership contract is required."
      ),
      buildCheck(
        "operating_state_db",
        fs.existsSync(resolveDbPath(repoRoot, dbPath)),
        resolveDbPath(repoRoot, dbPath),
        "Repo-local harness DB should exist after initialization."
      ),
      buildCheck(
        "generated_current_state",
        fs.existsSync(path.join(root, GENERATED_DOCS_DIR, CURRENT_STATE_DOC)),
        `${GENERATED_DOCS_DIR}/${CURRENT_STATE_DOC}`,
        "Generated CURRENT_STATE projection should exist."
      ),
      buildCheck(
        "generated_task_list",
        fs.existsSync(path.join(root, GENERATED_DOCS_DIR, TASK_LIST_DOC)),
        `${GENERATED_DOCS_DIR}/${TASK_LIST_DOC}`,
        "Generated TASK_LIST projection should exist."
      ),
      buildCheck("validator", validation.ok, `${validation.findings.length} finding(s)`, "Validator must be clean before gate close.")
    ];
    const failed = checks.filter((check) => check.status === "fail");
    const warned = checks.filter((check) => check.status === "warn");

    return {
      ok: failed.length === 0,
      command: "doctor",
      summary: failed.length === 0 ? "Harness doctor passed." : "Harness doctor found blocking issues.",
      checks,
      validation,
      nextAction: failed[0]?.recovery ?? warned[0]?.recovery ?? recommendNextActionFromState(store, validation, repoRoot)
    };
  });
}

export function summarizeValidation(validation) {
  return {
    ok: validation.ok,
    structuralReady: validation.structuralReady ?? validation.cutoverReady,
    cutoverReady: validation.cutoverReady,
    runtimeValidationReady: validation.ok,
    findingCount: validation.findings.length,
    blockingFindingCount: validation.findings.filter((finding) => finding.severity === "error").length
  };
}

export function recommendNextActionFromState(store, validation, repoRoot = process.cwd()) {
  const firstError = validation.findings.find((finding) => finding.severity === "error");
  if (firstError) {
    return recoveryForFinding(firstError);
  }

  const firstRisk = store.listGateRisks({ status: "open" })[0];
  if (firstRisk) {
    return firstRisk.unblockCondition ?? firstRisk.nextEscalation ?? `Resolve ${firstRisk.riskId}.`;
  }

  const firstDecision = store.listDecisions({ status: "open", decisionNeeded: true })[0];
  if (firstDecision) {
    return `Close decision ${firstDecision.decisionId}: ${firstDecision.title}.`;
  }

  const releaseState = store.getReleaseState("current");
  if (isClosedStatus(releaseState?.currentStage)) {
    if (isInstallableReleaseMaintainerRepo(repoRoot)) {
      return RELEASE_BASELINE.closedNextAction;
    }
    return "The current release is closed. Review the latest handoff and open the next approved lane.";
  }

  const activeWork = selectActiveWorkItem(store.listWorkItems(), { repoRoot });
  if (activeWork?.nextAction) {
    return activeWork.nextAction;
  }

  const latestHandoffNextAction = store.listRecentHandoffs(1)[0]?.payload?.nextFirstAction;
  if (latestHandoffNextAction) {
    return latestHandoffNextAction;
  }

  return "No blocker is recorded. Continue with the current approved packet or open the next planning lane.";
}

export function withStore({ dbPath, repoRoot, createIfMissing = true, migrate = true }, callback) {
  const store = createOperatingStateStore({ dbPath: resolveDbPath(repoRoot, dbPath), createIfMissing, migrate });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

export function resolveDbPath(repoRoot, dbPath) {
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
}

export function detectStarterBootstrapPending({ repoRoot, store }) {
  const root = path.resolve(repoRoot);
  if (!looksLikeStarterPlaceholder(root)) {
    return null;
  }

  const hasOperationalState =
    store.getReleaseState("current") != null ||
    store.listWorkItems().length > 0 ||
    store.listDecisions().length > 0 ||
    store.listGateRisks().length > 0 ||
    store.listGenerationStates().length > 0;

  if (hasOperationalState) {
    return null;
  }

  return {
    code: "starter_bootstrap_pending",
    severity: "error",
    message: "Standard harness starter has not been initialized yet. Run INIT_STANDARD_HARNESS.cmd or npm run harness:init first."
  };
}

function nodeMajor() {
  return Number.parseInt(process.versions.node.split(".")[0], 10);
}

function buildCheck(code, passed, detail, recovery) {
  return {
    code,
    status: passed ? "pass" : "fail",
    detail,
    recovery
  };
}

function recoveryForFinding(finding) {
  const code = finding.code ?? "unknown";
  if (code === "starter_bootstrap_pending") {
    return "Run INIT_STANDARD_HARNESS.cmd or npm run harness:init.";
  }
  if (code.includes("generation") || code.includes("checksum") || code.includes("freshness")) {
    return "Regenerate state docs, then run harness:validate again.";
  }
  if (code.includes("task_packet")) {
    return "Update or register the concrete task packet, then rerun validation.";
  }
  if (code.includes("optional_profile") || code.includes("active_profile")) {
    return "Complete active profile references/evidence before Ready For Code.";
  }
  if (code.includes("root_status_surface")) {
    return "Rename or isolate root status/progress docs, or treat .agents/artifacts/* plus the active packet as authority.";
  }
  if (code.includes("sync")) {
    return "Synchronize the reusable root change into standard-template.";
  }
  return finding.message ?? "Inspect validator output and resolve the blocking finding.";
}
