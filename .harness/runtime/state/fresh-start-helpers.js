import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { writeActiveContext } from "./active-context.js";
import { runValidator } from "./dev05-tooling.js";
import { writeGeneratedStateDocs } from "./generate-state-docs.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import { isClosedStatus, selectActiveWorkItem } from "./workflow-routing.js";
import { readPacketHeaderValueFromContent, sliceSection } from "./lib/packet-markdown.js";

const WALKTHROUGH_PATH = "reference/artifacts/WALKTHROUGH.md";
const REVIEW_REPORT_PATH = "reference/artifacts/REVIEW_REPORT.md";
const RECONCILABLE_PLACEHOLDER_IDS = new Set([
  "BOOT-00",
  "PLN-00",
  "PLN-01",
  "PLN-02",
  "PKT-01",
  "DSG-01",
  "DEV-01",
  "DEV-02",
  "DEV-03",
  "DEV-04",
  "DEV-05",
  "TST-01",
  "TST-02",
  "SEC-01",
  "REV-01",
  "QLT-01"
]);
const PRODUCT_OUTPUT_LIMIT = 4000;

export function runFirstPacketCommand({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseArgs(args);
  return withStore({ repoRoot, dbPath }, (store) => {
    const plan = buildFirstPacketPlan({ store, repoRoot, outputDir, dbPath, options });
    if (!options.apply || !plan.ok) {
      return plan;
    }
    return applyFirstPacketPlan({ store, repoRoot, outputDir, dbPath, plan });
  });
}

export function runEvidenceCommand({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseArgs(args);
  return withStore({ repoRoot, dbPath }, (store) => {
    const plan = buildEvidencePlan({ store, repoRoot, outputDir, dbPath, options });
    if (!options.apply || !plan.ok) {
      return plan;
    }
    return applyEvidencePlan({ store, repoRoot, outputDir, dbPath, plan });
  });
}

function buildFirstPacketPlan({ store, repoRoot, outputDir, dbPath, options }) {
  const workItemId = options.workItem ?? options.workItemId;
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath ?? options.sourceRef);
  const errors = [];
  const checks = [];
  const openWorkItems = store.listWorkItems().filter((item) => !isClosedStatus(item.status));
  const activeTask = selectActiveWorkItem(openWorkItems, { repoRoot });
  const openDecisions = store.listDecisions({ status: "open" });
  const openRisks = store.listGateRisks({ status: "open" });
  const packetContent = readRelativeFile(repoRoot, packetPath);
  const packetWorkItem = packetContent ? readPacketHeaderValueFromContent(packetContent, "Work item") : null;
  const existingArtifact = packetPath ? store.getArtifactByPath(packetPath) : null;
  const existingWorkItem = workItemId ? store.getWorkItem(workItemId) : null;
  const blockingWorkItems = openWorkItems.filter((item) => !isReconcilablePlaceholder(item));
  const firstPacketReadiness = buildFirstPacketReadiness({
    workItemId,
    packetPath,
    packetContent,
    packetWorkItem,
    openDecisions,
    openRisks
  });

  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (!packetPath) {
    errors.push("Missing --packet.");
  } else if (!packetContent) {
    errors.push(`Packet file not found: ${packetPath}.`);
  }
  if (workItemId && packetContent && firstPacketReadiness.workItemReference.status === "block") {
    errors.push(formatDiagnosticMessage(firstPacketReadiness.workItemReference));
  }
  if (existingWorkItem && !isClosedStatus(existingWorkItem.status)) {
    errors.push(`Work item ${workItemId} already exists and is ${existingWorkItem.status}.`);
  }
  if (blockingWorkItems.length > 0) {
    const item = blockingWorkItems[0];
    errors.push(
      `Existing active task ${item.workItemId} (${item.owner ?? "unassigned"} / ${item.status}) must be closed or routed before first-packet apply.`
    );
  }
  if (openDecisions.length > 0) {
    errors.push(
      `Open bootstrap decisions before mutation: ${openDecisions.map((decision) => decision.decisionId).join(", ")}. ` +
      "Close or explicitly resolve them before first-packet apply."
    );
  }
  if (openRisks.length > 0) {
    errors.push(
      `Open bootstrap risks before mutation: ${openRisks.map((risk) => risk.riskId).join(", ")}. ` +
      "Close or explicitly resolve them before first-packet apply."
    );
  }

  const placeholderItems = openWorkItems.filter(isReconcilablePlaceholder);
  const title = options.title ?? extractPacketTitle(packetContent, workItemId);
  const gateProfile = normalizeHeader(packetContent, "Gate profile") ?? "standard";
  const readyForCode = normalizeReadyForCode(normalizeHeader(packetContent, "Ready For Code"));
  const deliveryRouteMode = normalizeHeader(packetContent, "Delivery route mode");
  const routeClass = normalizeHeader(packetContent, "Route class");
  const plannedUpdates = [
    ...placeholderItems.map((item) => `work_item_registry:${item.workItemId}`),
    ...(workItemId ? [`work_item_registry:${workItemId}`] : []),
    ...(packetPath ? [`artifact_index:${packetPath}`] : []),
    ".agents/runtime/generated-state-docs/CURRENT_STATE.md",
    ".agents/runtime/generated-state-docs/TASK_LIST.md",
    ".agents/runtime/ACTIVE_CONTEXT.json",
    ".agents/runtime/ACTIVE_CONTEXT.md"
  ];

  checks.push(
    { check: "work-item", ok: Boolean(workItemId), detail: workItemId ?? "missing" },
    { check: "packet", ok: Boolean(packetContent), detail: packetPath ?? "missing" },
    {
      check: "active-task",
      ok: blockingWorkItems.length === 0,
      detail: activeTask ? `${activeTask.workItemId} (${activeTask.status})` : "none"
    },
    {
      check: "starter-placeholder-reconcile",
      ok: true,
      detail: placeholderItems.length > 0 ? placeholderItems.map((item) => item.workItemId).join(", ") : "none"
    },
    {
      check: "artifact-registration",
      ok: true,
      detail: existingArtifact ? "already registered" : "will register on apply"
    },
    {
      check: "first-packet-readiness",
      ok: firstPacketReadiness.blockingDiagnostics.length === 0,
      detail:
        firstPacketReadiness.blockingDiagnostics.length === 0
          ? "ready"
          : `${firstPacketReadiness.blockingDiagnostics.length} blocking diagnostic(s)`
    }
  );

  return {
    ok: errors.length === 0,
    command: "first-packet",
    apply: false,
    workItemId: workItemId ?? null,
    packetPath: packetPath ?? null,
    title,
    gateProfile,
    readyForCode,
    deliveryRouteMode,
    routeClass,
    activeTask: activeTask ? summarizeWorkItem(activeTask) : null,
    placeholderItems: placeholderItems.map(summarizeWorkItem),
    firstPacketReadiness,
    plannedUpdates,
    checks,
    errors,
    nextAction:
      errors.length > 0
        ? "Resolve the reported active work, blocker, or packet mismatch before applying first-packet."
        : "Run again with --apply to reconcile starter placeholders and register the first real packet."
  };
}

function buildFirstPacketReadiness({
  workItemId,
  packetPath,
  packetContent,
  packetWorkItem,
  openDecisions,
  openRisks
}) {
  const manifest = packetContent ? sliceSection(packetContent, "## Verification Manifest") : null;
  const activeProfileDependencies = packetContent
    ? readPacketHeaderValueFromContent(packetContent, "Active profile dependencies")
    : null;
  const profileEvidenceStatus = normalizeHeader(packetContent, "Profile evidence status") ?? "missing";
  const dependencies = parseProfileDependencies(activeProfileDependencies);
  const workItemReference = buildReadinessDiagnostic({
    field: "Quick Decision Header > Work item",
    current: packetWorkItem ?? "missing",
    expected: workItemId ? `include ${workItemId}` : "work item id supplied by --work-item",
    status:
      workItemId && packetContent && packetWorkItem?.toLowerCase().includes(workItemId.toLowerCase())
        ? "pass"
        : workItemId && packetContent
          ? "block"
          : "warn",
    nextAction: workItemId
      ? `Update the Quick Decision Header Work item row to reference ${workItemId} before first-packet apply.`
      : "Pass --work-item with the packet work item id before first-packet apply."
  });
  const decisionDiagnostic = buildReadinessDiagnostic({
    field: "Bootstrap decisions",
    current: openDecisions.length > 0 ? openDecisions.map((decision) => decision.decisionId).join(", ") : "none",
    expected: "none open",
    status: openDecisions.length > 0 ? "block" : "pass",
    nextAction: "Close or explicitly resolve open bootstrap decisions before first-packet apply."
  });
  const riskDiagnostic = buildReadinessDiagnostic({
    field: "Bootstrap risks",
    current: openRisks.length > 0 ? openRisks.map((risk) => risk.riskId).join(", ") : "none",
    expected: "none open",
    status: openRisks.length > 0 ? "block" : "pass",
    nextAction: "Close or explicitly resolve open bootstrap risks before first-packet apply."
  });
  const manifestDiagnostic = buildReadinessDiagnostic({
    field: "Verification Manifest",
    current: manifest != null ? "present" : "missing",
    expected: "## Verification Manifest",
    status: manifest != null ? "pass" : "warn",
    nextAction: "Add a compact ## Verification Manifest before capturing evidence."
  });
  const profileDiagnostic = buildReadinessDiagnostic({
    field: "Active profile evidence",
    current:
      dependencies.length === 0
        ? `dependencies=none; evidence=${profileEvidenceStatus}`
        : `dependencies=${dependencies.join(", ")}; evidence=${profileEvidenceStatus}`,
    expected: dependencies.length === 0 ? "not-needed" : "approved profile evidence",
    status: dependencies.length === 0 || profileEvidenceStatus === "approved" ? "pass" : "warn",
    nextAction: "Approve or cite profile-specific evidence before Ready For Code when active profile dependencies are declared."
  });
  const diagnostics = [
    workItemReference,
    decisionDiagnostic,
    riskDiagnostic,
    manifestDiagnostic,
    profileDiagnostic
  ];

  return {
    packetPath: packetPath ?? null,
    requestedWorkItemId: workItemId ?? null,
    parsedWorkItemRow: packetWorkItem ?? null,
    expectedWorkItemReference: workItemId ? `Quick Decision Header Work item row includes ${workItemId}` : null,
    workItemReference,
    openBootstrapDecisions: openDecisions.map(summarizeDecision),
    openBootstrapRisks: openRisks.map(summarizeGateRisk),
    activeProfileEvidence: {
      dependencies,
      evidenceStatus: profileEvidenceStatus,
      status: profileDiagnostic.status,
      expected: profileDiagnostic.expected,
      nextAction: profileDiagnostic.nextAction
    },
    verificationManifest: {
      present: manifest != null,
      heading: "## Verification Manifest",
      expected: "compact manifest with Ready For Code, root, standard-template, targeted, validator, active context, and review closeout evidence"
    },
    diagnostics,
    blockingDiagnostics: diagnostics.filter((diagnostic) => diagnostic.status === "block")
  };
}

function buildReadinessDiagnostic({ field, current, expected, status, nextAction }) {
  return { field, current, expected, status, nextAction };
}

function formatDiagnosticMessage(diagnostic) {
  return `${diagnostic.field}: current="${diagnostic.current}"; expected="${diagnostic.expected}"; next action=${diagnostic.nextAction}`;
}

function applyFirstPacketPlan({ store, repoRoot, outputDir, dbPath, plan }) {
  const timestamp = store.now();
  for (const item of plan.placeholderItems) {
    const existing = store.getWorkItem(item.workItemId);
    if (!existing || isClosedStatus(existing.status)) {
      continue;
    }
    store.transitionWorkItem({
      workItemId: item.workItemId,
      status: "closed",
      owner: "planner",
      nextAction: `Starter placeholder reconciled while opening ${plan.workItemId}.`,
      metadata: {
        ...(existing.metadata ?? {}),
        closedAt: timestamp,
        closedBy: "first-packet-helper",
        reconciledBy: plan.workItemId
      }
    });
  }

  store.upsertArtifact({
    artifactId: artifactIdForPacket(plan.packetPath),
    path: plan.packetPath,
    category: "task_packet",
    title: plan.title,
    sourceRef: plan.packetPath,
    metadata: {
      workItemId: plan.workItemId,
      openedBy: "first-packet-helper"
    }
  });

  store.upsertWorkItem({
    workItemId: plan.workItemId,
    title: plan.title,
    status: "planning",
    owner: "planner",
    nextAction: `Review ${plan.workItemId} and approve, adjust, or hold Ready For Code.`,
    sourceRef: plan.packetPath,
    metadata: {
      gateProfile: plan.gateProfile,
      readyForCode: plan.readyForCode,
      deliveryRouteMode: plan.deliveryRouteMode,
      routeClass: plan.routeClass,
      openedBy: "first-packet-helper"
    }
  });

  const release = store.getReleaseState("current");
  if (release) {
    store.setReleaseState({
      ...release,
      currentStage: "planning",
      currentFocus: `${plan.workItemId} first packet is open for Planner review.`,
      sourceRef: plan.packetPath,
      updatedBy: "first-packet-helper"
    });
  }

  store.appendHandoff({
    handoffId: `${safeId(plan.workItemId)}-first-packet-${safeId(timestamp)}`,
    handoffSummary: `[planner -> planner] Opened ${plan.workItemId} as the first real packet.`,
    fromRole: "planner",
    toRole: "planner",
    sourceRef: plan.packetPath,
    createdAt: timestamp,
    payload: {
      transition: "first-packet",
      workItemId: plan.workItemId,
      gateProfile: plan.gateProfile,
      completedScope: `Opened ${plan.workItemId} as the first real packet.`,
      nextWorkflow: ".agents/workflows/planner.md",
      nextFirstAction: `Review ${plan.workItemId} and approve, adjust, or hold Ready For Code.`,
      requiredSsot: [plan.packetPath],
      approvalBoundary: "Do not start implementation until Ready For Code routing is explicit.",
      doNotCross: ["No implementation.", "No Tester or Reviewer gate claims."],
      routeReason: "First-packet helper reconciled starter placeholders and registered the packet.",
      evidencePaths: [plan.packetPath]
    }
  });

  refreshState({ store, repoRoot, outputDir, dbPath });
  return {
    ...plan,
    ok: true,
    apply: true,
    appliedAt: timestamp,
    nextAction: "Run harness:validation-report, harness:context, and harness:status to confirm first-packet state."
  };
}

function buildEvidencePlan({ store, repoRoot, options }) {
  const workItemId = options.workItem ?? options.workItemId;
  const type = normalizeEvidenceType(options.type);
  const errors = [];
  const workItem = workItemId ? store.getWorkItem(workItemId) : null;
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath ?? workItem?.sourceRef);
  const packetContent = readRelativeFile(repoRoot, packetPath);
  const activeTask = selectActiveWorkItem(store.listWorkItems(), { repoRoot });
  const targetPath = type === "review-report" ? REVIEW_REPORT_PATH : WALKTHROUGH_PATH;
  const existingContent = readRelativeFile(repoRoot, targetPath);
  const productCommands = type === "walkthrough" ? extractProductCommands(packetContent) : [];

  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (!type) {
    errors.push("Missing or invalid --type. Expected walkthrough or review-report.");
  }
  if (!workItem) {
    errors.push(`Cannot scaffold evidence for missing work item: ${workItemId ?? "unknown"}.`);
  }
  if (!packetPath || !packetContent) {
    errors.push(`Active packet source is missing or unreadable: ${packetPath ?? "unknown"}.`);
  }
  if (activeTask?.workItemId && activeTask.workItemId !== workItemId) {
    errors.push(`Active task is ${activeTask.workItemId}, not ${workItemId}.`);
  }

  const mode = existingContent ? "append" : "create";
  const plannedSections = type === "review-report"
    ? ["Requirements", "Packet acceptance", "Product tests", "Manual evidence", "Harness validation", "Findings", "Residual risk", "Recommendation"]
    : ["Tested scope", "Untested scope", "Product verification", "Harness validation", "Manual evidence", "Tester recommendation"];

  return {
    ok: errors.length === 0,
    command: "evidence",
    apply: false,
    type,
    workItemId: workItemId ?? null,
    packetPath: packetPath ?? null,
    targetPath,
    mode,
    activeTask: activeTask ? summarizeWorkItem(activeTask) : null,
    plannedSections,
    productCommands: productCommands.map((command) => ({
      command: command.command,
      cwd: command.cwd,
      sourceLine: command.sourceLine,
      diagnostics: command.diagnostics ?? []
    })),
    plannedUpdates: [targetPath],
    errors,
    nextAction:
      errors.length > 0
        ? "Resolve the reported active packet or source reference issue before applying evidence scaffold."
        : "Run again with --apply to create or append the evidence scaffold."
  };
}

function applyEvidencePlan({ repoRoot, plan }) {
  const timestamp = new Date().toISOString();
  const productResults = plan.type === "walkthrough"
    ? plan.productCommands.map((entry) => runProductCommand({ repoRoot, entry }))
    : [];
  const content = plan.type === "review-report"
    ? renderReviewReportSection({ plan, timestamp })
    : renderWalkthroughSection({ plan, timestamp, productResults });
  const targetPath = path.resolve(repoRoot, plan.targetPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (plan.mode === "append" && fs.existsSync(targetPath)) {
    fs.appendFileSync(targetPath, `\n\n${content}`, "utf8");
  } else {
    fs.writeFileSync(targetPath, `${content}\n`, "utf8");
  }
  return {
    ...plan,
    apply: true,
    appliedAt: timestamp,
    productResults: productResults.map((result) => ({
      command: result.command,
      cwd: result.cwd,
      status: result.status,
      exitCode: result.exitCode,
      diagnostics: result.diagnostics ?? []
    })),
    nextAction: `Evidence ${plan.mode === "append" ? "appended" : "created"} at ${plan.targetPath}.`
  };
}

function renderWalkthroughSection({ plan, timestamp, productResults }) {
  const commandLines = productResults.length > 0
    ? productResults.flatMap((result) => [
        `- Command: \`${result.command}\``,
        `- Cwd: \`${result.cwd}\``,
        `- Status: ${result.status}`,
        `- Exit code: ${result.exitCode}`,
        ...(result.diagnostics?.length
          ? result.diagnostics.map((diagnostic) => `- Diagnostic: ${diagnostic.message}`)
          : []),
        result.stdout ? `- Stdout: ${asCodeBlock(result.stdout)}` : "- Stdout: none",
        result.stderr ? `- Stderr: ${asCodeBlock(result.stderr)}` : "- Stderr: none"
      ])
    : ["- Product evidence gap: no manifest-declared product command was found."];

  return [
    plan.mode === "create" ? "# Walkthrough Evidence" : "",
    `## ${plan.workItemId} Walkthrough Evidence`,
    "",
    `- Generated at: ${timestamp}`,
    `- Source packet: \`${plan.packetPath}\``,
    "",
    "### Tested Scope",
    "- TODO: record tested acceptance items.",
    "",
    "### Untested Scope",
    "- TODO: record untested acceptance items or `None`.",
    "",
    "### Product Verification",
    ...commandLines,
    "",
    "### Harness Validation",
    "- TODO: record `harness:validate` and `harness:validation-report` results separately from product verification.",
    "",
    "### Manual Evidence",
    "- TODO: record manual or browser checks, or `None`.",
    "",
    "### Tester Recommendation",
    "- TODO: pass, fail, or remediation required."
  ].filter((line) => line !== "").join("\n");
}

function renderReviewReportSection({ plan, timestamp }) {
  return [
    plan.mode === "create" ? "# Review Report" : "",
    `## ${plan.workItemId} Review Report`,
    "",
    `- Generated at: ${timestamp}`,
    `- Source packet: \`${plan.packetPath}\``,
    "",
    "### Requirements",
    "- TODO: record requirements conformance.",
    "",
    "### Packet Acceptance",
    "- TODO: record packet acceptance conformance.",
    "",
    "### Product Tests",
    "- TODO: judge product verification evidence separately from harness validation.",
    "",
    "### Manual Evidence",
    "- TODO: judge manual evidence or record `None`.",
    "",
    "### Harness Validation",
    "- TODO: record harness validation and validation-report evidence.",
    "",
    "### Findings",
    "- TODO: list blocking and non-blocking findings, or `None`.",
    "",
    "### Residual Risk",
    "- TODO: record residual risk.",
    "",
    "### Recommendation",
    "- TODO: approve, remediation required, or hold."
  ].filter((line) => line !== "").join("\n");
}

function extractProductCommands(packetContent) {
  if (!packetContent) {
    return [];
  }
  const section = sliceSection(packetContent, "## Verification Manifest") ?? "";
  const commands = [];
  const seen = new Map();
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!/^-\s+/i.test(line) || !/product/i.test(line) || !/command|test/i.test(line)) {
      continue;
    }
    const value = line.replace(/^-\s*/, "");
    const commandMatch = value.match(/(?:product(?: verification)? command|product command|product test(?: command)?|command)\s*:\s*(.+)$/i);
    if (!commandMatch) {
      continue;
    }
    let command = stripBackticks(commandMatch[1].trim());
    let cwd = ".";
    const cwdMatch = command.match(/\s+\(cwd:\s*([^)]+)\)\s*$/i) ?? command.match(/\s+cwd=([^\s]+)\s*$/i);
    if (cwdMatch) {
      cwd = stripBackticks(cwdMatch[1].trim());
      command = command.slice(0, cwdMatch.index).trim();
    }
    if (command) {
      const diagnostics = diagnoseProductCommand(command);
      const key = `${cwd}\u0000${command}`;
      const existing = seen.get(key);
      if (existing) {
        existing.sourceLine = `${existing.sourceLine}; duplicate: ${line}`;
        continue;
      }
      const entry = { command, cwd, sourceLine: line, diagnostics };
      seen.set(key, entry);
      commands.push(entry);
    }
  }
  return commands;
}

function runProductCommand({ repoRoot, entry }) {
  if (entry.diagnostics?.some((diagnostic) => diagnostic.code === "likely_trailing_prose_punctuation")) {
    return {
      command: entry.command,
      cwd: entry.cwd || ".",
      status: "blocked",
      exitCode: null,
      stdout: "",
      stderr: "Command was not executed because the manifest command appears to include trailing prose punctuation.",
      diagnostics: entry.diagnostics
    };
  }
  const cwd = path.resolve(repoRoot, entry.cwd || ".");
  if (!cwd.startsWith(path.resolve(repoRoot)) || !fs.existsSync(cwd)) {
    return {
      command: entry.command,
      cwd: entry.cwd || ".",
      status: "fail",
      exitCode: null,
      stdout: "",
      stderr: `Command cwd does not resolve inside the repository: ${entry.cwd || "."}`,
      diagnostics: entry.diagnostics ?? []
    };
  }
  const result = spawnSync(entry.command, {
    cwd,
    shell: true,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    env: productCommandEnv()
  });
  return {
    command: entry.command,
    cwd: path.relative(repoRoot, cwd) || ".",
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status,
    stdout: truncateOutput(result.stdout),
    stderr: truncateOutput(result.stderr),
    diagnostics: entry.diagnostics ?? []
  };
}

function diagnoseProductCommand(command) {
  const diagnostics = [];
  const text = String(command ?? "").trim();
  if (hasTrailingProsePunctuationOutsideQuotes(text)) {
    diagnostics.push({
      code: "likely_trailing_prose_punctuation",
      severity: "error",
      message:
        "Likely trailing prose punctuation detected in product command; command was not executed. " +
        "Remove the trailing punctuation or put intentional punctuation inside quotes."
    });
  }
  return diagnostics;
}

function hasTrailingProsePunctuationOutsideQuotes(command) {
  const text = String(command ?? "").trim();
  if (!/[.!?]$/.test(text)) {
    return false;
  }
  let quote = null;
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
    }
  }
  return quote == null;
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
  delete options.positionals;
  return options;
}

function isReconcilablePlaceholder(item) {
  return RECONCILABLE_PLACEHOLDER_IDS.has(item.workItemId) && !isClosedStatus(item.status);
}

function summarizeWorkItem(item) {
  return {
    workItemId: item.workItemId,
    title: item.title,
    status: item.status,
    owner: item.owner,
    sourceRef: item.sourceRef
  };
}

function summarizeDecision(decision) {
  return {
    decisionId: decision.decisionId,
    title: decision.title,
    status: decision.status,
    decisionNeeded: decision.decisionNeeded,
    sourceRef: decision.sourceRef
  };
}

function summarizeGateRisk(risk) {
  return {
    riskId: risk.riskId,
    title: risk.title,
    status: risk.status,
    severity: risk.severity,
    sourceRef: risk.sourceRef
  };
}

function parseProfileDependencies(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /^none$/i.test(normalized) || /^not-needed$/i.test(normalized)) {
    return [];
  }
  return normalized
    .split(/[,/]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeEvidenceType(type) {
  const normalized = String(type ?? "").trim().toLowerCase();
  if (["walkthrough", "review-report"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "review" || normalized === "review_report") {
    return "review-report";
  }
  return null;
}

function readRelativeFile(repoRoot, relativePath) {
  if (!relativePath) {
    return null;
  }
  const filePath = path.resolve(repoRoot, relativePath);
  if (!filePath.startsWith(path.resolve(repoRoot)) || !fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function normalizeRelativePath(value) {
  if (!value) {
    return null;
  }
  return String(value).replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeHeader(content, label) {
  const value = content ? readPacketHeaderValueFromContent(content, label) : null;
  return value ? value.trim().toLowerCase() : null;
}

function normalizeReadyForCode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approve") {
    return "approved";
  }
  if (["approved", "hold", "pending"].includes(normalized)) {
    return normalized;
  }
  return normalized || "pending";
}

function extractPacketTitle(content, fallback) {
  const heading = content?.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading.replace(/^PKT-01\s+/i, "");
  }
  return fallback ?? "First packet";
}

function artifactIdForPacket(packetPath) {
  return path.basename(packetPath, path.extname(packetPath));
}

function safeId(value) {
  return String(value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function stripBackticks(value) {
  return String(value ?? "").replace(/^`|`$/g, "").trim();
}

function truncateOutput(value) {
  const text = String(value ?? "").trim();
  if (text.length <= PRODUCT_OUTPUT_LIMIT) {
    return text;
  }
  return `${text.slice(0, PRODUCT_OUTPUT_LIMIT)}\n[truncated]`;
}

function asCodeBlock(value) {
  return `\n\`\`\`text\n${value}\n\`\`\``;
}

function productCommandEnv() {
  const nodeDir = path.dirname(process.execPath);
  const separator = process.platform === "win32" ? ";" : ":";
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const currentPath = process.env[pathKey] ?? "";
  return {
    ...process.env,
    [pathKey]: currentPath ? `${nodeDir}${separator}${currentPath}` : nodeDir
  };
}
