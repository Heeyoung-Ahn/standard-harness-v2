import fs from "node:fs";
import path from "node:path";

import { writeActiveContext } from "./active-context.js";
import { runValidator } from "./dev05-tooling.js";
import { writeGeneratedStateDocs } from "./generate-state-docs.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";

const VALID_ACTIONS = new Set(["list", "close", "defer"]);
const NON_AUTHORITATIVE_TEXT_PATTERNS = [
  /generated\s+summary/i,
  /\bsummary\b/i,
  /rough\s+agreement/i,
  /unrelated\s+approval/i,
  /approve\s+work_packet/i,
  /i\s+approve\s+work_packet/i,
  /\bhandoff\b/i,
  /active_context/i
];
const NON_AUTHORITATIVE_PATH_SEGMENTS = [
  ".agents/runtime/",
  ".agents/runtime/generated-state-docs/",
  ".harness/state/handoff.md",
  ".agents/artifacts/validation_report",
  "active_context"
];

export function runRiskCommand({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseArgs(args);
  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
  if (!fs.existsSync(resolvedDbPath)) {
    return buildMissingStateResult({ options });
  }
  return withStore({ repoRoot, dbPath }, (store) => {
    const plan = buildRiskPlan({ store, repoRoot, options });
    if (!options.apply || !plan.ok || plan.subcommand === "list") {
      return plan;
    }
    return applyRiskPlan({ store, repoRoot, outputDir, dbPath, plan });
  });
}

function buildMissingStateResult({ options }) {
  const subcommand = options.positionals[0] ?? "list";
  if (subcommand === "list") {
    return {
      ok: true,
      command: "risk",
      subcommand,
      apply: false,
      risks: [],
      errors: [],
      nextAction: "No operating state DB found. Run harness:init before closing or deferring bootstrap risks."
    };
  }
  return {
    ok: false,
    command: "risk",
    subcommand,
    apply: false,
    riskId: options.positionals[1] ?? options.risk ?? options.riskId ?? null,
    status: null,
    nonClosed: null,
    risk: null,
    plannedUpdates: [],
    approvalBoundary: approvalBoundary(),
    errors: ["No operating state DB found. Run harness:init before closing or deferring bootstrap risks."],
    nextAction: "Run harness:init, then use harness:risk list to inspect bootstrap risks."
  };
}

function buildRiskPlan({ store, repoRoot, options }) {
  const subcommand = options.positionals[0] ?? "list";
  const riskId = options.positionals[1] ?? options.risk ?? options.riskId ?? null;
  const apply = Boolean(options.apply);
  const errors = [];

  if (!VALID_ACTIONS.has(subcommand)) {
    errors.push(`Unknown risk subcommand: ${subcommand}. Expected list, close, or defer.`);
  }

  if (subcommand === "list") {
    const status = options.status === "all" ? null : options.status;
    const risks = store
      .listGateRisks(status ? { status } : {})
      .filter((risk) => options.includeClosed || risk.status !== "closed")
      .map(summarizeRisk);
    return {
      ok: errors.length === 0,
      command: "risk",
      subcommand,
      apply: false,
      risks,
      errors,
      nextAction: "Use close or defer with --reason, --evidence, and --apply to mutate a bootstrap risk."
    };
  }

  if (!riskId) {
    errors.push("Missing risk id. Usage: npm run harness:risk -- close RISK-ID --reason ... --evidence ... --apply");
  }

  const existingRisk = riskId ? store.getGateRisk(riskId) : null;
  if (riskId && !existingRisk) {
    errors.push(`Unknown risk: ${riskId}.`);
  }

  const reason = normalizeText(options.reason);
  if (!reason) {
    errors.push("Missing --reason. Risk close/defer requires an explicit operator reason.");
  }

  const evidence = normalizeRelativePath(options.evidence ?? options.sourceRef);
  const evidenceDiagnostic = validateEvidence({ repoRoot, evidence });
  if (!evidenceDiagnostic.ok) {
    errors.push(evidenceDiagnostic.message);
  }

  const followUpOwner = normalizeText(options.followUpOwner ?? options.owner);
  const followUpDate = normalizeText(options.followUpDate ?? options.date ?? options.due);
  if (subcommand === "defer") {
    if (!followUpOwner) {
      errors.push("Missing --follow-up-owner for deferred risk tracking.");
    }
    if (!followUpDate) {
      errors.push("Missing --follow-up-date for deferred risk tracking.");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
      errors.push("Invalid --follow-up-date. Expected YYYY-MM-DD.");
    }
  }

  const nextStatus = subcommand === "close" ? "closed" : "deferred";
  const historyEntry = {
    action: subcommand,
    reason,
    evidence,
    followUp: subcommand === "defer" ? { owner: followUpOwner, date: followUpDate } : null,
    authorityBoundary:
      "Risk close/defer records bootstrap risk disposition only; it does not grant Ready For Code, implementation, security, release, migration, or residual-risk approval."
  };

  return {
    ok: errors.length === 0,
    command: "risk",
    subcommand,
    apply: false,
    riskId,
    status: nextStatus,
    nonClosed: nextStatus !== "closed",
    reason: reason ?? null,
    evidence: evidence ?? null,
    followUp: subcommand === "defer" ? { owner: followUpOwner ?? null, date: followUpDate ?? null } : null,
    risk: existingRisk ? summarizeRisk(existingRisk) : null,
    plannedUpdates: existingRisk ? [`gate_risk_registry:${existingRisk.riskId}`] : [],
    historyEntry,
    approvalBoundary: approvalBoundary(),
    errors,
    nextAction:
      errors.length > 0
        ? "Fix the reported risk id, reason, evidence, or follow-up fields before applying."
        : apply
          ? "Risk disposition is ready to apply."
          : "Run again with --apply to mutate the risk registry."
  };
}

function applyRiskPlan({ store, repoRoot, outputDir, dbPath, plan }) {
  const existing = store.getGateRisk(plan.riskId);
  if (!existing) {
    return {
      ...plan,
      ok: false,
      errors: [`Unknown risk: ${plan.riskId}.`],
      nextAction: "Re-run list and choose an existing risk id."
    };
  }

  const appliedAt = store.now();
  const historyEntry = {
    ...plan.historyEntry,
    appliedAt,
    appliedBy: "harness:risk"
  };
  const nextMetadata = {
    ...(existing.metadata ?? {}),
    riskClosureHistory: [...(existing.metadata?.riskClosureHistory ?? []), historyEntry],
    lastRiskDisposition: plan.subcommand,
    lastRiskDispositionAt: appliedAt,
    closureReason: plan.reason,
    closureEvidence: plan.evidence,
    authorityBoundary: historyEntry.authorityBoundary
  };
  if (plan.subcommand === "defer") {
    nextMetadata.followUp = plan.followUp;
  }

  const updatedRisk = store.recordGateRisk(
    {
      riskId: existing.riskId,
      title: existing.title,
      severity: existing.severity,
      status: plan.status,
      unblockCondition: existing.unblockCondition,
      nextEscalation: plan.subcommand === "defer"
        ? `Follow up with ${plan.followUp.owner} by ${plan.followUp.date}.`
        : existing.nextEscalation,
      sourceRef: existing.sourceRef,
      metadata: nextMetadata
    },
    { expectedVersion: existing.version }
  );

  refreshState({ store, repoRoot, outputDir, dbPath });
  return {
    ...plan,
    ok: true,
    apply: true,
    appliedAt,
    risk: summarizeRisk(updatedRisk),
    status: updatedRisk.status,
    nonClosed: updatedRisk.status !== "closed",
    nextAction:
      plan.subcommand === "close"
        ? "Risk closed. Run harness:status or harness:first-packet preview to inspect remaining bootstrap blockers."
        : "Risk deferred and remains non-closed. Track the follow-up before treating bootstrap risk as resolved."
  };
}

function validateEvidence({ repoRoot, evidence }) {
  if (!evidence) {
    return {
      ok: false,
      message: "Missing --evidence. Risk close/defer requires an authoritative evidence path."
    };
  }
  for (const pattern of NON_AUTHORITATIVE_TEXT_PATTERNS) {
    if (pattern.test(evidence)) {
      return {
        ok: false,
        message:
          "Invalid authoritative evidence: generated summaries, rough agreements, unrelated approvals, handoffs, and active context cannot close bootstrap risk."
      };
    }
  }

  const normalized = normalizeRelativePath(evidence);
  const normalizedLower = normalized.toLowerCase();
  if (path.isAbsolute(evidence) || normalized.startsWith("../")) {
    return {
      ok: false,
      message: "Invalid authoritative evidence: use an existing repository-relative evidence path."
    };
  }
  if (NON_AUTHORITATIVE_PATH_SEGMENTS.some((segment) => normalizedLower.includes(segment))) {
    return {
      ok: false,
      message:
        "Invalid authoritative evidence: generated summaries, runtime handoffs, validation reports, and active context cannot close bootstrap risk."
    };
  }
  const evidencePath = path.resolve(repoRoot, normalized);
  if (!evidencePath.startsWith(path.resolve(repoRoot)) || !fs.existsSync(evidencePath)) {
    return {
      ok: false,
      message: `Invalid authoritative evidence: file does not exist inside repository: ${normalized}.`
    };
  }
  return { ok: true, evidence: normalized };
}

function approvalBoundary() {
  return {
    grantsReadyForCode: false,
    grantsImplementationApproval: false,
    grantsSecurityApproval: false,
    grantsReleaseApproval: false,
    grantsMigrationApproval: false,
    grantsResidualRiskApproval: false,
    note:
      "harness:risk only records bootstrap risk disposition. Use the packet, preflight, transition, security review, and Reviewer closeout gates for other approvals."
  };
}

function refreshState({ store, repoRoot, outputDir, dbPath }) {
  writeGeneratedStateDocs({ store, outputDir, repoRoot });
  const validation = runValidator({ repoRoot, outputDir, dbPath });
  writeActiveContext({ store, repoRoot, outputDir, validation });
}

function withStore({ repoRoot, dbPath }, callback) {
  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
  const store = createOperatingStateStore({ dbPath: resolvedDbPath });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

function parseArgs(args) {
  const options = { apply: false, positionals: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      options.positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function summarizeRisk(risk) {
  return {
    riskId: risk.riskId,
    title: risk.title,
    severity: risk.severity,
    status: risk.status,
    unblockCondition: risk.unblockCondition,
    nextEscalation: risk.nextEscalation,
    sourceRef: risk.sourceRef,
    version: risk.version,
    metadata: risk.metadata
  };
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeRelativePath(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
