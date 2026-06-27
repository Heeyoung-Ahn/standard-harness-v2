import fs from "node:fs";
import path from "node:path";
import { validateCodexPluginManifestAtPath } from "./codex-plugin-manifest.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import { resolveReviewerProfiles } from "./reviewer-profiles.js";

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { options, positionals };
}

function parseList(value) {
  return String(value ?? "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
}

function gate(name, status, blocker = "-", owner = "runtime", nextAction = "-") {
  return { gate: name, status, blocker, owner, nextAction };
}

export function buildCodexReadinessDashboard({ repoRoot = process.cwd(), options = {} } = {}) {
  const activeContext = path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json");
  const activePacket = options.packet ?? (fs.existsSync(activeContext) ? "from-active-context" : null);
  const lane = options.lane ?? "standard";
  const profiles = parseList(options.profiles);
  const files = parseList(options.files ?? options.changedFiles);
  const gates = [];
  const plugin = validateCodexPluginManifestAtPath({ repoRoot });
  gates.push(gate("Codex plugin manifest", plugin.ok ? "PASS" : "FAIL", plugin.ok ? "-" : "plugin manifest missing/invalid", "runtime", plugin.ok ? "-" : "fix .codex-plugin/plugin.json"));
  gates.push(gate("Active packet", activePacket ? "PASS" : "FAIL", activePacket ? "-" : "starter_bootstrap_pending", "planner", activePacket ? "-" : "create or select active packet"));
  const ssotExists = fs.existsSync(path.join(repoRoot, ".agents", "ssot", "AI_OPERATING_CONTRACT.md"));
  gates.push(gate("SSOT load", ssotExists ? "PASS" : "FAIL", ssotExists ? "-" : "missing SSOT", "runtime", ssotExists ? "-" : "restore .agents/ssot"));
  const reviewers = resolveReviewerProfiles({ repoRoot, lane, profiles, files, text: options.text ?? "" });
  gates.push(gate("Reviewer profiles", reviewers.ok ? "PASS" : "FAIL", reviewers.ok ? "-" : `missing reviewer profiles: ${reviewers.missing?.map((x) => x.id).join(", ") || "index"}`, "reviewer", "add required reviewer profile evidence"));
  const workflow = readWorkflowReadiness({ repoRoot });
  if (workflow.available) {
    gates.push(gate(
      "Workflow decisions",
      workflow.openDecisionCount === 0 && workflow.openRiskCount === 0 ? "PASS" : "FAIL",
      workflow.openDecisionCount === 0 && workflow.openRiskCount === 0
        ? "-"
        : `${workflow.openDecisionCount} open workflow decision(s), ${workflow.openRiskCount} open risk(s)`,
      "planner",
      workflow.openDecisionCount === 0 && workflow.openRiskCount === 0
        ? "-"
        : "close or explicitly defer open decisions and risks before implementation handoff"
    ));
  }
  const tddStatus = lane === "docs-only" || lane === "micro" ? "NOT_APPLICABLE" : (options.tddEvidence ? "PASS" : "WARN");
  gates.push(gate("TDD evidence", tddStatus, tddStatus === "WARN" ? "RED/GREEN evidence not recorded yet" : "-", "developer", tddStatus === "WARN" ? "capture TDD evidence before closeout" : "-"));
  const releaseStatus = lane === "release" ? (options.releaseEvidence ? "PASS" : "FAIL") : "NOT_APPLICABLE";
  gates.push(gate("Release readiness", releaseStatus, releaseStatus === "FAIL" ? "release evidence missing" : "-", "release", releaseStatus === "FAIL" ? "produce publish/deploy evidence" : "-"));
  const hardBlock = gates.find((item) => item.status === "FAIL");
  const warn = gates.find((item) => item.status === "WARN");
  const verdict = hardBlock ? "HOLD" : warn ? "GO_WITH_WARNINGS" : "GO";
  const stage = options.stage ?? (verdict === "HOLD" ? "planning-open" : "implementation-transition");
  const hardGateCommands = [
    `npm run harness:packet-preflight -- --stage ${stage}`,
    "npm run harness:validate"
  ];
  const nextHardGateCommand = hardBlock
    ? hardBlock.nextAction
    : `npm run harness:packet-preflight -- --stage ${stage}`;
  return {
    ok: verdict === "GO" || verdict === "GO_WITH_WARNINGS",
    command: "codex-ready",
    packet: activePacket,
    lane,
    profiles,
    gates,
    verdict,
    reason: hardBlock?.blocker ?? warn?.blocker ?? "all required gates pass",
    nextHardGateCommand,
    hardGateCommands,
    approvalBoundary: "codex-ready is a readiness dashboard, not an implementation or closeout approval gate.",
    approvalSubstitute: false
  };
}

function readWorkflowReadiness({ repoRoot }) {
  const dbPath = path.join(repoRoot, DEFAULT_DB_PATH);
  if (!fs.existsSync(dbPath)) {
    return { available: false, openDecisionCount: 0, openRiskCount: 0 };
  }
  const store = createOperatingStateStore({ dbPath });
  try {
    return {
      available: true,
      openDecisionCount: store.listDecisions({ status: "open" }).length,
      openRiskCount: store.listGateRisks({ status: "open" }).length
    };
  } finally {
    store.close();
  }
}

export function runCodexReadyDashboardCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const result = buildCodexReadinessDashboard({ repoRoot, options: parsed.options });
  if (parsed.options.json) return result;
  return result;
}

export function runCodexStartCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const readiness = runCodexReadyDashboardCommand({ repoRoot, args });
  return {
    ok: true,
    command: "codex-start",
    summary: "Standard Harness Codex start summary",
    nextAction: readiness.verdict === "GO" ? "Create or refresh a Codex task brief with npm run harness:codex-task." : "Resolve readiness blockers before implementation handoff.",
    readiness
  };
}
