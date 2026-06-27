import fs from "node:fs";
import path from "node:path";

import { validateAdapterCommand } from "./adapter-safety.js";
import { spawnSync } from "node:child_process";

import { ACTIVE_CONTEXT_JSON } from "./active-context.js";
import {
  buildCloseoutEvidenceAuthority,
  buildPlannerCloseoutDecisionRequest
} from "./closeout-decision.js";
import { VALIDATION_REPORT_JSON } from "./harness-paths.js";
import { workflowForOwner } from "./workflow-routing.js";

export const AGENT_SESSION_DIR = ".agents/runtime/agent-sessions";
export const ROLE_BRIEF_SCHEMA_VERSION = "standard-harness-role-brief/v1";
export const AGENT_OUTPUT_SCHEMA_VERSION = "standard-harness-agent-output/v1";
export const ROUTE_JOB_SCHEMA_VERSION = "standard-harness-route-job/v1";
export const CONTEXT_BUDGET_SCHEMA_VERSION = "standard-harness-context-budget/v1";
export const EXECUTION_MODE_SCHEMA_VERSION = "standard-harness-execution-mode/v1";
export const WORKFLOW_ROLE_SCHEMA_VERSION = "standard-harness-workflow-role/v1";

const ROUTEABLE_AGENT_ROLES = ["developer", "tester", "reviewer", "planner", "orchestrator"];
const SCHEMA_VISIBLE_WORKFLOW_ROLES = ["pm", "deployer", "documenter", "handoff"];
const VALID_ROLES = new Set(ROUTEABLE_AGENT_ROLES);
const VALID_EXECUTION_MODES = new Set(["independent-agent", "single-session", "mock-adapter"]);
const VALID_AGENT_STATUSES = new Set(["pass", "fail", "blocked", "needs_human", "adapter_error"]);
const VALID_ROUTE_RECOMMENDATIONS = new Set(["developer", "tester", "reviewer", "planner", "orchestrator", "blocked-human"]);
const VALID_DELIVERY_ROUTE_MODES = new Set(["orchestrated-closeout", "role-by-role"]);
const REVIEW_REPORT_PATH = "reference/artifacts/REVIEW_REPORT.md";
const REVIEW_REPORT_EXCERPT_DIR = ".agents/runtime/review-report-excerpts";
const DEFAULT_FALLBACK_ONLY_READS = [
  "reference/manuals/human/HARNESS_MANUAL.md",
  ".agents/artifacts/CURRENT_STATE.md",
  ".agents/artifacts/TASK_LIST.md",
  REVIEW_REPORT_PATH
];
const ROLE_READ_SET_MAX_FILES = {
  developer: 12,
  tester: 12,
  reviewer: 14,
  planner: 14,
  orchestrator: 16
};
const ROLE_READ_SET_MAX_TOKENS = {
  developer: 120000,
  tester: 120000,
  reviewer: 140000,
  planner: 140000,
  orchestrator: 160000
};

const ROLE_AUTHORITY_DENYLIST = {
  developer: new Set(["tester_pass", "reviewer_pass", "reviewer_closeout", "planner_closeout", "risk_acceptance"]),
  tester: new Set(["implementation_fix", "reviewer_pass", "reviewer_closeout", "planner_closeout", "risk_acceptance"]),
  reviewer: new Set(["implementation_fix", "tester_pass", "planner_closeout", "risk_acceptance"]),
  planner: new Set(["implementation_fix", "tester_pass", "reviewer_pass", "reviewer_closeout"]),
  orchestrator: new Set(["implementation_fix", "tester_pass", "reviewer_pass", "reviewer_closeout", "planner_closeout", "risk_acceptance"])
};

export function runRoleBrief({
  store,
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  args = []
} = {}) {
  const options = parseAgentArgs(args);
  const role = normalizeRole(options.role);
  const workItemId = options.workItem ?? options.workItemId;
  const errors = [];

  if (!role || !VALID_ROLES.has(role)) {
    errors.push(invalidRoleMessage(role));
  }
  if (!workItemId) {
    errors.push("Missing --work-item.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      command: "brief",
      role,
      workItemId: workItemId ?? null,
      errors
    };
  }

  const brief = buildRoleBrief({ store, repoRoot, role, workItemId });
  const relativePath = path.posix.join(AGENT_SESSION_DIR, "briefs", `${safeFilePart(workItemId)}-${role}-brief.json`);
  const absolutePath = path.resolve(outputDir, relativePath);
  writeJsonFile(absolutePath, brief);

  return {
    ok: true,
    command: "brief",
    role,
    workItemId,
    briefPath: relativePath,
    brief
  };
}

export function runAgentSession({
  store,
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  args = []
} = {}) {
  const options = parseAgentArgs(args);
  const role = normalizeRole(options.role);
  const workItemId = options.workItem ?? options.workItemId;
  const adapter = String(options.adapter ?? "mock").trim() || "mock";
  const operatorId = String(options.operator ?? options.operatorId ?? "harness-agent").trim();
  const errors = [];

  if (!role || !VALID_ROLES.has(role)) {
    errors.push(invalidRoleMessage(role));
  }
  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (errors.length > 0) {
    return {
      ok: false,
      command: "agent",
      role,
      workItemId: workItemId ?? null,
      adapter,
      errors
    };
  }

  const sessionId = buildSessionId({ workItemId, role, now: store.now?.() ?? new Date().toISOString() });
  const sessionRelativeDir = path.posix.join(AGENT_SESSION_DIR, sessionId);
  const contextPath = path.posix.join(sessionRelativeDir, "context.json");
  const promptPath = path.posix.join(sessionRelativeDir, "prompt.md");
  const outputPath = path.posix.join(sessionRelativeDir, "output.json");
  const absoluteContextPath = path.resolve(outputDir, contextPath);
  const absolutePromptPath = path.resolve(outputDir, promptPath);
  const absoluteOutputPath = path.resolve(outputDir, outputPath);

  const brief = buildRoleBrief({ store, repoRoot, role, workItemId });
  writeJsonFile(absoluteContextPath, brief);
  writeTextFile(absolutePromptPath, buildRolePrompt({ role, workItemId, brief }));
  const initialExecutionMode = buildExecutionModeEvidence({
    adapter,
    requestedMode: options.executionMode,
    contextPath,
    promptPath,
    outputPath,
    contextPolicy: brief.contextPolicy,
    output: null
  });

  const session = store.recordAgentSession({
    sessionId,
    role,
    operatorId,
    workItemId,
    adapter,
    status: "created",
    contextPath,
    promptPath,
    outputPath,
    metadata: {
      schemaVersion: AGENT_OUTPUT_SCHEMA_VERSION,
      independentSession: initialExecutionMode.mode === "independent-agent",
      executionMode: initialExecutionMode
    }
  });

  const adapterResult = invokeAdapter({
    adapter,
    options,
    env: {
      HARNESS_AGENT_ROLE: role,
      HARNESS_WORK_ITEM_ID: workItemId,
      HARNESS_AGENT_SESSION_ID: sessionId,
      HARNESS_CONTEXT_PATH: absoluteContextPath,
      HARNESS_PROMPT_PATH: absolutePromptPath,
      HARNESS_OUTPUT_PATH: absoluteOutputPath
    }
  });

  let output = adapterResult.output;
  if (!output && fs.existsSync(absoluteOutputPath)) {
    output = JSON.parse(fs.readFileSync(absoluteOutputPath, "utf8"));
  }
  if (!output) {
    output = buildAdapterErrorOutput(adapterResult.error ?? "Adapter did not write an output JSON file.");
    writeJsonFile(absoluteOutputPath, output);
  }

  const executionMode = buildExecutionModeEvidence({
    adapter,
    requestedMode: options.executionMode,
    contextPath,
    promptPath,
    outputPath,
    contextPolicy: brief.contextPolicy,
    output
  });
  const validation = validateAgentOutput({ repoRoot, role, output, executionMode });
  const status = validation.ok ? output.status : "fail";
  const updatedSession = store.recordAgentSession({
    ...session,
    status,
    metadata: {
      ...(session.metadata ?? {}),
      independentSession: executionMode.mode === "independent-agent",
      executionMode,
      validation,
      adapterDiagnostics: adapterResult.diagnostics ?? null
    }
  });
  let routeJob = findOrCreateRouteJob({ store, workItemId, deliveryRouteMode: brief.deliveryRouteMode });
  routeJob = updateRouteJobExecutionMode({ store, routeJob, executionMode });
  store.appendRouteEvent({
    routeJobId: routeJob.routeJobId,
    sessionId,
    fromRole: role,
    toRole: normalizeRouteRecommendation(output.nextRouteRecommendation),
    eventType: validation.ok ? "agent_output_validated" : "agent_output_rejected",
    result: status,
    evidencePaths: output.evidencePaths ?? [],
    payload: {
      summary: output.summary,
      findings: output.findings ?? [],
      executionMode,
      validation
    }
  });

  if (!validation.ok) {
    store.updateRouteJob({
      routeJobId: routeJob.routeJobId,
      status: "blocked",
      currentRole: role,
      metadata: {
        ...(routeJob.metadata ?? {}),
        executionMode: routeJob.metadata?.executionMode ?? executionMode.mode,
        executionModeEvidence: routeJob.metadata?.executionModeEvidence ?? executionMode,
        lastValidationError: validation.errors
      }
    });
  }

  return {
    ok: validation.ok && output.status === "pass",
    command: "agent",
    sessionId,
    role,
    workItemId,
    adapter,
    contextPath,
    promptPath,
    outputPath,
    output,
    validation,
    session: updatedSession
  };
}

export function runOrchestratedCloseout({
  store,
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  args = []
} = {}) {
  const options = parseAgentArgs(args);
  const workItemId = options.workItem ?? options.workItemId;
  const adapter = String(options.adapter ?? "mock").trim() || "mock";
  const maxLoops = Number.parseInt(options.maxLoops ?? "3", 10);
  const errors = [];
  const workItem = workItemId ? store.getWorkItem(workItemId) : null;

  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (!workItem) {
    errors.push(`Cannot orchestrate missing work item: ${workItemId ?? "unknown"}.`);
  }

  const deliveryRouteMode = normalizeDeliveryRouteMode(workItem?.metadata?.deliveryRouteMode);
  if (deliveryRouteMode !== "orchestrated-closeout") {
    errors.push(
      `harness:orchestrate requires deliveryRouteMode orchestrated-closeout; current mode is ${deliveryRouteMode ?? "missing"}.`
    );
  }
  if (workItem?.metadata?.readyForCode !== "approved") {
    errors.push(`harness:orchestrate requires Ready For Code approved; current status is ${workItem?.metadata?.readyForCode ?? "missing"}.`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      command: "orchestrate",
      workItemId: workItemId ?? null,
      adapter,
      errors
    };
  }

  let routeJob = findOrCreateRouteJob({ store, workItemId, deliveryRouteMode });
  routeJob = store.updateRouteJob({
    routeJobId: routeJob.routeJobId,
    status: "running",
    currentRole: "developer",
    metadata: {
      ...(routeJob.metadata ?? {}),
      schemaVersion: ROUTE_JOB_SCHEMA_VERSION,
      maxLoops: Number.isFinite(maxLoops) ? maxLoops : 3
    }
  });

  const sessions = [];
  let routeState = {
    routeJob,
    developerAttempt: 0,
    lastFailingRole: null,
    lastFindingKey: null,
    sameFindingCounts: {},
    fullLoopCount: 0
  };

  const runRole = (role, { nextRole = nextRoleAfter(role), status = "pass", findingKey = null } = {}) => {
    const roleArgs = [
      "--role",
      role,
      "--work-item",
      workItemId,
      "--adapter",
      adapter,
      "--operator",
      `orchestrator:${role}`,
      "--mock-status",
      status
    ];
    if (nextRole) {
      roleArgs.push("--next-route", nextRole);
    }
    if (findingKey) {
      roleArgs.push("--finding-id", findingKey, "--finding-summary", `Mock blocking finding ${findingKey}`);
    }
    const result = runAgentSession({
      store,
      repoRoot,
      outputDir,
      args: roleArgs
    });
    sessions.push(result);
    return result;
  };

  const runDeveloper = ({ remediation = false } = {}) => {
    if (remediation) {
      routeState.developerAttempt += 1;
    }
    return runRole("developer", { nextRole: "tester", status: "pass" });
  };

  let developerResult = runDeveloper();
  if (!developerResult.ok) {
    return blockForRoleFailure({
      store,
      routeJob: routeState.routeJob,
      sessions,
      workItemId,
      adapter,
      role: "developer",
      result: developerResult,
      reason: "role-session-failed"
    });
  }

  while (true) {
    const testerFindingKey = mockFindingKeyForAttempt({ options, role: "tester", attempt: routeState.developerAttempt });
    const testerStatus = mockStatusForRoleAttempt({ options, role: "tester", attempt: routeState.developerAttempt });
    const testerResult = runRole("tester", {
      nextRole: testerStatus === "pass" ? "reviewer" : "developer",
      status: testerStatus,
      findingKey: testerStatus === "pass" ? null : testerFindingKey
    });
    if (!testerResult.ok) {
      routeState = handleBlockingRoleResult({
        store,
        routeState,
        role: "tester",
        result: testerResult,
        sessions,
        maxLoops
      });
      if (routeState.blocked) {
        return buildBlockedOrchestrationResult({ workItemId, adapter, routeState, sessions });
      }
      developerResult = runDeveloper({ remediation: true });
      if (!developerResult.ok) {
        return blockForRoleFailure({
          store,
          routeJob: routeState.routeJob,
          sessions,
          workItemId,
          adapter,
          role: "developer",
          result: developerResult,
          reason: "developer-remediation-failed"
        });
      }
      continue;
    }

    const reviewerFindingKey = mockFindingKeyForAttempt({ options, role: "reviewer", attempt: routeState.developerAttempt });
    const reviewerStatus = mockStatusForRoleAttempt({ options, role: "reviewer", attempt: routeState.developerAttempt });
    const reviewerResult = runRole("reviewer", {
      nextRole: reviewerStatus === "pass" ? "planner" : "developer",
      status: reviewerStatus,
      findingKey: reviewerStatus === "pass" ? null : reviewerFindingKey
    });
    if (!reviewerResult.ok) {
      routeState = handleBlockingRoleResult({
        store,
        routeState,
        role: "reviewer",
        result: reviewerResult,
        sessions,
        maxLoops
      });
      if (routeState.blocked) {
        return buildBlockedOrchestrationResult({ workItemId, adapter, routeState, sessions });
      }
      developerResult = runDeveloper({ remediation: true });
      if (!developerResult.ok) {
        return blockForRoleFailure({
          store,
          routeJob: routeState.routeJob,
          sessions,
          workItemId,
          adapter,
          role: "developer",
          result: developerResult,
          reason: "developer-remediation-failed"
        });
      }
      continue;
    }

    runRole("planner", { nextRole: null, status: "pass" });
    break;
  }

  const latestRouteJob = store.getRouteJob(routeJob.routeJobId) ?? routeJob;
  const closeoutPackage = {
    status: "ready-for-planner-review",
    workItemId,
    implementationSummary: "Developer session completed through command adapter.",
    testEvidence: latestSessionForRole(sessions, "tester")?.output?.evidencePaths ?? [],
    reviewEvidence: latestSessionForRole(sessions, "reviewer")?.output?.evidencePaths ?? [],
    evidenceAuthority: buildCloseoutEvidenceAuthority({
      executionMode: latestRouteJob.metadata?.executionMode,
      canClaimIndependentReview: latestRouteJob.metadata?.canClaimIndependentReview
    }),
    plannerDecisionRequest: buildPlannerCloseoutDecisionRequest({
      workItemId,
      currentOwner: "orchestrator",
      currentStatus: store.getWorkItem(workItemId)?.status,
      routeJobStatus: "completed"
    }),
    unresolvedRisks: []
  };
  const completed = store.updateRouteJob({
    routeJobId: latestRouteJob.routeJobId,
    status: "completed",
    currentRole: "planner",
    closeoutPackage,
    metadata: {
      ...(latestRouteJob.metadata ?? {}),
      completedAt: store.now?.() ?? new Date().toISOString()
    }
  });

  return {
    ok: true,
    command: "orchestrate",
    workItemId,
    adapter,
    routeJob: completed,
    sessions,
    closeoutPackage
  };
}

export function buildRoleBrief({ store, repoRoot = process.cwd(), role, workItemId }) {
  const workItem = store.getWorkItem(workItemId);
  const latestHandoff = store.listRecentHandoffs(20).find((handoff) => {
    const payload = handoff.payload ?? {};
    return payload.workItemId === workItemId || handoff.sourceRef === workItem?.sourceRef;
  }) ?? store.listRecentHandoffs(1)[0] ?? null;
  const routeJob = store.listRouteJobs({ workItemId })[0] ?? null;
  const sessions = store.listAgentSessions({ workItemId });
  const fallbackTriggers = buildBriefFallbackTriggers({ latestHandoff, routeJob, workItem });
  const workflow = workflowForOwner(role);
  const inferredEvidencePaths = inferEvidencePathsFromRouteText(
    latestHandoff?.payload?.nextFirstAction ?? workItem?.nextAction ?? ""
  );
  const requiredSsot = uniquePathList([
    workItem?.sourceRef,
    ".agents/artifacts/REQUIREMENTS.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    workflow === "manual_selection_required" ? null : workflow,
    ...(latestHandoff?.payload?.requiredSsot ?? [])
  ]);
  const evidencePaths = compactRoleBriefEvidencePaths({
    repoRoot,
    workItemId,
    paths: [
    VALIDATION_REPORT_JSON,
    ...(latestHandoff?.payload?.evidencePaths ?? []),
    ...inferredEvidencePaths,
    ...latestSessionOutputEvidence(sessions)
    ]
  });
  const sourceTrace = uniquePathList([workItem?.sourceRef, ACTIVE_CONTEXT_JSON, VALIDATION_REPORT_JSON]);
  const readSetMetrics = buildReadSetMetrics({ repoRoot, role, requiredSsot, sourceTrace, evidencePaths, fallbackTriggers });
  const contextBudgetRationale =
    workItem?.metadata?.contextBudgetRationale ??
    latestHandoff?.payload?.contextBudgetRationale ??
    latestHandoff?.payload?.budgetRationale ??
    null;

  return {
    schemaVersion: ROLE_BRIEF_SCHEMA_VERSION,
    workItemId,
    activePacket: workItem?.sourceRef ?? null,
    role,
    workflow: workflow === "manual_selection_required" ? null : workflow,
    deliveryRouteMode: normalizeDeliveryRouteMode(workItem?.metadata?.deliveryRouteMode),
    roleSchema: buildWorkflowRoleSchema(role),
    currentRouteState: {
      owner: workItem?.owner ?? null,
      status: workItem?.status ?? null,
      routeJobId: routeJob?.routeJobId ?? null,
      routeJobStatus: routeJob?.status ?? null,
      currentRole: routeJob?.currentRole ?? null
    },
    nextFirstAction: latestHandoff?.payload?.nextFirstAction ?? workItem?.nextAction ?? null,
    roleAuthority: roleAuthority(role),
    roleNonAuthority: roleNonAuthority(role),
    approvalBoundary: latestHandoff?.payload?.approvalBoundary ?? approvalBoundaryForRole(role),
    doNotCross: latestHandoff?.payload?.doNotCross ?? doNotCrossForRole(role),
    requiredSsot,
    sourceTrace,
    evidencePaths,
    readSetMetrics,
    contextBudget: evaluateRoleBriefContextBudget({
      role,
      readSetMetrics,
      fallbackTriggers,
      rationale: contextBudgetRationale
    }),
    fallbackTriggers,
    defaultReadExclusions: DEFAULT_FALLBACK_ONLY_READS,
    fallbackOnlyReadSet: fallbackTriggers.length > 0 ? DEFAULT_FALLBACK_ONLY_READS : [],
    validationState: {
      source: VALIDATION_REPORT_JSON
    },
    firstImplementationReadiness: buildRoleBriefFirstImplementationReadiness({
      role,
      workItem,
      latestHandoff,
      routeJob
    }),
    contextPolicy: {
      independentSession: true,
      previousRoleChatContextShared: false,
      previousRoleOutputViaStructuredEvidenceOnly: true
    }
  };
}

function buildRoleBriefFirstImplementationReadiness({ role, workItem, latestHandoff, routeJob }) {
  const transition = latestHandoff?.payload?.transition ?? null;
  const firstImplementationHandoff =
    transition === "planner-to-developer" || transition === "planner-to-orchestrator";
  const roleCanStartImplementation = role === "developer" || role === "orchestrator";
  const alreadyRouted = routeJob?.status === "running" || routeJob?.status === "completed" || routeJob?.status === "blocked-human";
  const active = Boolean(firstImplementationHandoff && roleCanStartImplementation && !alreadyRouted);

  return {
    schemaVersion: "standard-harness-first-implementation-readiness/v1",
    status: active ? "active" : "not-needed",
    triggerSource: active ? transition : null,
    noRepeatReason: active
      ? null
      : alreadyRouted
        ? `route job is already ${routeJob.status}`
        : roleCanStartImplementation
          ? "latest handoff is not a first implementation transition"
          : `role ${role} is not the first implementation-entry role`,
    checks: active
      ? [
          {
            item: "active lane",
            value: `${workItem?.workItemId ?? "missing"} / ${workItem?.owner ?? "missing"} / ${workItem?.status ?? "missing"}`
          },
          {
            item: "active packet",
            value: workItem?.sourceRef ?? "missing"
          },
          {
            item: "Ready For Code",
            value: workItem?.metadata?.readyForCode ?? "missing"
          },
          {
            item: "packet/lane/route",
            value: `gate=${workItem?.metadata?.gateProfile ?? "missing"}; delivery=${workItem?.metadata?.deliveryRouteMode ?? "missing"}; route=${workItem?.metadata?.routeClass ?? "packet-path"}`
          },
          {
            item: "canonical/generated boundary",
            value: "packet and operational DB own route truth; Active Context and generated docs are read models"
          },
          {
            item: "validation finding meaning",
            value: "blockers stop the route; warnings require explanation but do not prove product behavior"
          },
          {
            item: "root/standard-template parity",
            value: "required when reusable root workflow/runtime/test/manual surfaces change"
          }
        ]
      : [],
    allowedNextAction: active
      ? "Proceed only inside the approved packet and role authority."
      : null,
    stopCondition: active
      ? "Stop if Ready For Code is not approved, packet scope is unclear, Active Context is stale, or the requested work exceeds the packet."
      : null
  };
}

export function buildWorkflowRoleSchema(activeRole = null) {
  const routeable = ROUTEABLE_AGENT_ROLES.map((role) => ({
    schemaVersion: WORKFLOW_ROLE_SCHEMA_VERSION,
    role,
    roleKind: "harness:agent",
    routeableByHarnessAgent: true,
    active: role === activeRole,
    workflow: workflowForOwner(role) === "manual_selection_required" ? null : workflowForOwner(role),
    authority: roleAuthority(role),
    nonAuthority: roleNonAuthority(role)
  }));
  const schemaVisibleOnly = SCHEMA_VISIBLE_WORKFLOW_ROLES.map((role) => ({
    schemaVersion: WORKFLOW_ROLE_SCHEMA_VERSION,
    role,
    roleKind: "workflow-authority",
    routeableByHarnessAgent: false,
    active: false,
    workflow: workflowForOwner(role) === "manual_selection_required" ? null : workflowForOwner(role),
    authority: roleAuthority(role),
    nonAuthority: roleNonAuthority(role)
  }));
  return {
    schemaVersion: WORKFLOW_ROLE_SCHEMA_VERSION,
    activeRole,
    routeableRoles: routeable.map((entry) => entry.role),
    schemaVisibleOnlyRoles: schemaVisibleOnly.map((entry) => entry.role),
    roles: [...routeable, ...schemaVisibleOnly]
  };
}

function inferEvidencePathsFromRouteText(text) {
  const normalized = String(text ?? "");
  return normalized.includes(REVIEW_REPORT_PATH) || /review[_ -]?report\.md/i.test(normalized) ? [REVIEW_REPORT_PATH] : [];
}

function compactRoleBriefEvidencePaths({ repoRoot, workItemId, paths }) {
  return uniquePathList(
    paths.map((item) => {
      if (item !== REVIEW_REPORT_PATH) {
        return item;
      }
      return writeReviewReportExcerpt({ repoRoot, workItemId }) ?? REVIEW_REPORT_PATH;
    })
  );
}

function writeReviewReportExcerpt({ repoRoot, workItemId }) {
  const absoluteReportPath = path.resolve(repoRoot, REVIEW_REPORT_PATH);
  if (!fs.existsSync(absoluteReportPath)) {
    return null;
  }
  const content = fs.readFileSync(absoluteReportPath, "utf8");
  const sections = extractMarkdownSections(content, "## ");
  const normalizedWorkItem = String(workItemId ?? "").toLowerCase();
  const selected = sections.filter((section) => section.toLowerCase().includes(normalizedWorkItem));
  const excerptSections = selected.length > 0 ? selected : sections.slice(0, 1);
  const relativePath = path.posix.join(REVIEW_REPORT_EXCERPT_DIR, `${safeFilePart(workItemId)}-review-report.md`);
  const absoluteExcerptPath = path.resolve(repoRoot, relativePath);
  const excerpt = [
    "# Review Report Excerpt",
    "",
    `- Source: ${REVIEW_REPORT_PATH}`,
    `- Work item: ${workItemId}`,
    "- Scope: active packet matching sections only; full report is fallback-only.",
    "",
    ...excerptSections
  ].join("\n").trimEnd();
  writeTextFile(absoluteExcerptPath, `${excerpt}\n`);
  return relativePath;
}

function extractMarkdownSections(content, headingPrefix) {
  const lines = String(content ?? "").split(/\r?\n/);
  const sections = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith(headingPrefix)) {
      if (current.length > 0) {
        sections.push(current.join("\n").trimEnd());
      }
      current = [line];
      continue;
    }
    if (current.length > 0) {
      current.push(line);
    }
  }
  if (current.length > 0) {
    sections.push(current.join("\n").trimEnd());
  }
  return sections.filter(Boolean);
}

function latestSessionOutputEvidence(sessions) {
  const byRole = new Map();
  for (const session of sessions ?? []) {
    if (!session?.role || !session.outputPath) {
      continue;
    }
    byRole.set(session.role, session.outputPath);
  }
  return [...byRole.values()];
}

function latestSessionForRole(sessions, role) {
  return [...(sessions ?? [])].reverse().find((session) => session?.role === role) ?? null;
}

export function normalizeDeliveryRouteMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_DELIVERY_ROUTE_MODES.has(normalized) ? normalized : null;
}

export function validateDeliveryRouteModeForTransition({ transition, deliveryRouteMode, routeClass }) {
  const startsDelivery = transition === "planner-to-developer" || transition === "planner-to-orchestrator";
  if (!startsDelivery) {
    return [];
  }
  const normalizedRouteClass = String(routeClass ?? "").trim().toLowerCase();
  if (!["packet-path", "strict-path"].includes(normalizedRouteClass) && !deliveryRouteMode) {
    return [];
  }
  if (!deliveryRouteMode) {
    return [`${transition} requires Delivery route mode for packet-path or strict-path Ready For Code delivery.`];
  }
  if (deliveryRouteMode === "orchestrated-closeout" && transition !== "planner-to-orchestrator") {
    return ["Delivery route mode orchestrated-closeout requires first transition planner-to-orchestrator."];
  }
  if (deliveryRouteMode === "role-by-role" && transition !== "planner-to-developer") {
    return ["Delivery route mode role-by-role requires first transition planner-to-developer."];
  }
  return [];
}

function invokeAdapter({ adapter, options, env }) {
  if (adapter === "mock") {
    const output = {
      status: normalizeAgentStatus(options.mockStatus) ?? "pass",
      summary: options.mockSummary ?? `Mock ${env.HARNESS_AGENT_ROLE} session completed.`,
      ...(options.executionMode ? { executionMode: String(options.executionMode).trim() } : {}),
      evidencePaths: parseList(options.evidencePath ?? options.evidencePaths),
      findings: options.findingId
        ? [{
            id: options.findingId,
            findingKey: canonicalFindingKey(options.findingId),
            severity: "blocking",
            summary: options.findingSummary ?? "Mock finding"
          }]
        : [],
      nextRouteRecommendation: options.nextRoute ?? null,
      testsRun: parseList(options.testsRun),
      changedFiles: parseList(options.changedFiles),
      blockedHumanDiagnostic: null,
      authorityClaims: parseList(options.authorityClaim ?? options.authorityClaims)
    };
    if (output.status === "adapter_error") {
      return {
        output: buildAdapterErrorOutput("Mock adapter error requested."),
        diagnostics: { adapter }
      };
    }
    writeJsonFile(env.HARNESS_OUTPUT_PATH, output);
    return { output, diagnostics: { adapter } };
  }

  const command = options.adapterCommand ?? process.env.HARNESS_AGENT_ADAPTER_COMMAND;
  if (!command) {
    return {
      output: buildAdapterErrorOutput(`Adapter ${adapter} requires --adapter-command or HARNESS_AGENT_ADAPTER_COMMAND.`),
      diagnostics: { adapter }
    };
  }

  const safety = validateAdapterCommand({
    command,
    allowlist: options.adapterAllowlist ?? process.env.HARNESS_AGENT_ADAPTER_ALLOWLIST,
    repoRoot: options.repoRoot ?? process.cwd(),
    paths: [env.HARNESS_CONTEXT_PATH, env.HARNESS_PROMPT_PATH, env.HARNESS_OUTPUT_PATH].filter(Boolean)
  });
  if (!safety.ok) {
    return {
      output: buildAdapterErrorOutput("Adapter command failed V2.7 safety preflight."),
      error: "Adapter command failed safety preflight.",
      diagnostics: {
        adapter,
        status: null,
        safety,
        stdout: "",
        stderr: safety.diagnostics.map((diagnostic) => diagnostic.message).join("\n")
      }
    };
  }

  const [file, ...argv] = safety.argv;
  const result = spawnSync(file, argv, {
    shell: false,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  });
  return {
    output: null,
    error: result.status === 0 ? null : `Adapter command failed with status ${result.status}.`,
    diagnostics: {
      adapter,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      safety: { ...safety, executed: result.status != null }
    }
  };
}

export function buildExecutionModeEvidence({
  adapter,
  requestedMode = null,
  contextPath = null,
  promptPath = null,
  outputPath = null,
  contextPolicy = {},
  output = null
} = {}) {
  const normalizedAdapter = String(adapter ?? "").trim().toLowerCase();
  const normalizedRequestedMode = normalizeExecutionMode(requestedMode);
  const outputClaim = normalizeExecutionMode(output?.executionMode);
  const effectiveRequestedMode = outputClaim ?? normalizedRequestedMode;
  const separateArtifacts = Boolean(contextPath && promptPath && outputPath);
  const previousRoleChatContextShared = Boolean(contextPolicy.previousRoleChatContextShared);
  const structuredEvidenceOnly = contextPolicy.previousRoleOutputViaStructuredEvidenceOnly !== false;
  let mode = "single-session";
  let downgradeReason = null;

  if (normalizedAdapter === "mock") {
    mode = "mock-adapter";
    if (effectiveRequestedMode === "independent-agent") {
      downgradeReason = "mock-adapter-cannot-claim-independent-agent";
    }
  } else if (separateArtifacts && !previousRoleChatContextShared && structuredEvidenceOnly) {
    mode = "independent-agent";
  } else if (effectiveRequestedMode === "independent-agent") {
    downgradeReason = "independent-agent-requires-separate-artifacts-and-no-shared-chat-context";
  }

  return {
    schemaVersion: EXECUTION_MODE_SCHEMA_VERSION,
    mode,
    requestedMode: normalizedRequestedMode,
    outputClaim,
    adapter: normalizedAdapter || null,
    adapterKind: normalizedAdapter === "mock" ? "mock" : normalizedAdapter ? "command" : "unknown",
    artifactEvidence: {
      contextPath,
      promptPath,
      outputPath,
      separateContextPromptOutput: separateArtifacts
    },
    contextIsolation: {
      previousRoleChatContextShared,
      previousRoleOutputViaStructuredEvidenceOnly: structuredEvidenceOnly
    },
    canClaimIndependentReview: mode === "independent-agent",
    downgraded: Boolean(downgradeReason),
    downgradeReason
  };
}

function validateAgentOutput({ repoRoot = process.cwd(), role, output, executionMode }) {
  const errors = [];
  if (!output || typeof output !== "object") {
    return { ok: false, errors: ["Agent output must be a JSON object."] };
  }
  if (!VALID_AGENT_STATUSES.has(output.status)) {
    errors.push(`Agent output status must be one of ${[...VALID_AGENT_STATUSES].join(", ")}.`);
  }
  if (typeof output.summary !== "string" || output.summary.trim() === "") {
    errors.push("Agent output summary must be a non-empty string.");
  }
  if (output.executionMode != null && !VALID_EXECUTION_MODES.has(String(output.executionMode).trim())) {
    errors.push(`Agent output executionMode must be one of ${[...VALID_EXECUTION_MODES].join(", ")}.`);
  }
  if (output.executionMode === "independent-agent" && executionMode?.mode !== "independent-agent") {
    errors.push(`Agent output cannot claim independent-agent when execution evidence resolves to ${executionMode?.mode ?? "unknown"}.`);
  }
  for (const field of ["evidencePaths", "findings", "testsRun", "changedFiles"]) {
    if (!Array.isArray(output[field])) {
      errors.push(`Agent output ${field} must be an array.`);
    }
  }
  if (Array.isArray(output.evidencePaths)) {
    for (const evidencePath of output.evidencePaths) {
      if (typeof evidencePath !== "string" || evidencePath.trim() === "") {
        errors.push("Agent output evidencePaths entries must be non-empty strings.");
      } else if (!fs.existsSync(path.resolve(repoRoot, evidencePath))) {
        errors.push(`Agent output evidence path does not resolve: ${evidencePath}.`);
      }
    }
  }
  const routeRecommendation = normalizeRouteRecommendation(output.nextRouteRecommendation);
  if (output.nextRouteRecommendation != null && !VALID_ROUTE_RECOMMENDATIONS.has(routeRecommendation)) {
    errors.push(`Agent output nextRouteRecommendation must be one of ${[...VALID_ROUTE_RECOMMENDATIONS].join(", ")}.`);
  }
  if (Array.isArray(output.findings)) {
    for (const finding of output.findings) {
      const findingKey = canonicalFindingKey(finding?.findingKey ?? finding?.id);
      if (!finding || typeof finding !== "object") {
        errors.push("Agent output findings entries must be objects.");
        continue;
      }
      if (!findingKey) {
        errors.push("Agent output findings entries must include id or findingKey.");
      }
      if (typeof finding.severity !== "string" || finding.severity.trim() === "") {
        errors.push("Agent output findings entries must include severity.");
      }
      if (typeof finding.summary !== "string" || finding.summary.trim() === "") {
        errors.push("Agent output findings entries must include summary.");
      }
    }
  }
  if (output.blockedHumanDiagnostic != null && typeof output.blockedHumanDiagnostic !== "object") {
    errors.push("Agent output blockedHumanDiagnostic must be an object when present.");
  }
  if ((output.status === "needs_human" || routeRecommendation === "blocked-human") && !output.blockedHumanDiagnostic) {
    errors.push("Agent output blocked-human routing requires blockedHumanDiagnostic.");
  }
  const deniedClaims = ROLE_AUTHORITY_DENYLIST[role] ?? new Set();
  for (const claim of output.authorityClaims ?? []) {
    if (deniedClaims.has(String(claim).trim().toLowerCase())) {
      errors.push(`${role} output cannot claim ${claim}; that authority belongs to another role or the user.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

function updateRouteJobExecutionMode({ store, routeJob, executionMode }) {
  const existingMode = routeJob.metadata?.executionMode ?? null;
  const nextMode = strongestNonIndependentMode(existingMode, executionMode.mode);
  return store.updateRouteJob({
    routeJobId: routeJob.routeJobId,
    metadata: {
      ...(routeJob.metadata ?? {}),
      executionMode: nextMode,
      executionModeEvidence: executionMode,
      canClaimIndependentReview: nextMode === "independent-agent"
    }
  });
}

function strongestNonIndependentMode(left, right) {
  if (left === "mock-adapter" || right === "mock-adapter") {
    return "mock-adapter";
  }
  if (left === "single-session" || right === "single-session") {
    return "single-session";
  }
  return right ?? left ?? "single-session";
}

function handleBlockingRoleResult({ store, routeState, role, result, sessions, maxLoops }) {
  const latestRouteJob = store.getRouteJob(routeState.routeJob.routeJobId) ?? routeState.routeJob;
  const findingKeys = extractFindingKeys(result.output);
  const primaryFindingKey = findingKeys[0] ?? canonicalFindingKey(`${role}|unknown-blocking-finding`);
  const repeatedSameFinding = routeState.lastFindingKey === primaryFindingKey && routeState.developerAttempt > 0;
  const sameFindingCounts = repeatedSameFinding
    ? { [primaryFindingKey]: (routeState.sameFindingCounts?.[primaryFindingKey] ?? 1) + 1 }
    : { [primaryFindingKey]: 1 };
  const fullLoopCount = routeState.developerAttempt > 0 ? routeState.fullLoopCount + 1 : routeState.fullLoopCount;
  const sameFindingCount = sameFindingCounts[primaryFindingKey] ?? 1;
  const shouldBlockSameFinding = sameFindingCount >= 2;
  const shouldBlockFullLoop = fullLoopCount >= (Number.isFinite(maxLoops) ? maxLoops : 3);
  const blockedHumanDiagnostic =
    shouldBlockSameFinding || shouldBlockFullLoop
      ? {
          routeJobId: routeState.routeJob.routeJobId,
          reason: shouldBlockSameFinding ? "same-finding-repeat-threshold" : "full-loop-threshold",
          findingKeys,
          sameFindingCount,
          fullLoopCount,
          lastFailingRole: role,
          lastDeveloperAttempt: routeState.developerAttempt,
          evidenceRefs: result.output?.evidencePaths ?? [],
          recommendedHumanDecision: "Planner or user should inspect the repeated remediation failure and decide scope clarification, risk acceptance, or blocked-human handling."
        }
      : null;

  const updatedRouteJob = store.updateRouteJob({
    routeJobId: latestRouteJob.routeJobId,
    status: blockedHumanDiagnostic ? "blocked-human" : "running",
    currentRole: blockedHumanDiagnostic ? role : "developer",
    loopCount: fullLoopCount,
    sameFindingCounts,
    metadata: {
      ...(latestRouteJob.metadata ?? {}),
      lastFailingRole: role,
      lastFindingKey: primaryFindingKey,
      lastDeveloperAttempt: routeState.developerAttempt,
      ...(blockedHumanDiagnostic ? { blockedHumanDiagnostic } : {})
    }
  });

  store.appendRouteEvent({
    routeJobId: routeState.routeJob.routeJobId,
    sessionId: result.sessionId,
    fromRole: role,
    toRole: blockedHumanDiagnostic ? "blocked-human" : "developer",
    eventType: blockedHumanDiagnostic ? "blocked_human_threshold_reached" : "developer_remediation_requested",
    result: result.output?.status ?? "fail",
    evidencePaths: result.output?.evidencePaths ?? [],
    payload: {
      findings: result.output?.findings ?? [],
      findingKeys,
      sameFindingCount,
      fullLoopCount,
      developerAttempt: routeState.developerAttempt,
      blockedHumanDiagnostic
    }
  });

  return {
    ...routeState,
    routeJob: updatedRouteJob,
    lastFailingRole: role,
    lastFindingKey: primaryFindingKey,
    sameFindingCounts,
    fullLoopCount,
    blocked: Boolean(blockedHumanDiagnostic),
    blockedHumanDiagnostic
  };
}

function buildBlockedOrchestrationResult({ workItemId, adapter, routeState, sessions }) {
  return {
    ok: false,
    command: "orchestrate",
    workItemId,
    adapter,
    routeJob: routeState.routeJob,
    sessions,
    blockedHumanDiagnostic: routeState.blockedHumanDiagnostic,
    errors: [routeState.blockedHumanDiagnostic?.reason ?? "orchestration blocked"]
  };
}

function blockForRoleFailure({ store, routeJob, sessions, workItemId, adapter, role, result, reason }) {
  const latestRouteJob = store.getRouteJob(routeJob.routeJobId) ?? routeJob;
  const blockedHumanDiagnostic = {
    routeJobId: latestRouteJob.routeJobId,
    reason,
    findingKeys: extractFindingKeys(result.output),
    sameFindingCount: 0,
    fullLoopCount: latestRouteJob.loopCount ?? 0,
    lastFailingRole: role,
    lastDeveloperAttempt: latestRouteJob.metadata?.lastDeveloperAttempt ?? 0,
    evidenceRefs: result.output?.evidencePaths ?? [],
    recommendedHumanDecision: "Inspect the failed role session before continuing orchestration."
  };
  const blocked = store.updateRouteJob({
    routeJobId: latestRouteJob.routeJobId,
    status: "blocked-human",
    currentRole: role,
    metadata: {
      ...(latestRouteJob.metadata ?? {}),
      blockedHumanDiagnostic
    }
  });
  return {
    ok: false,
    command: "orchestrate",
    workItemId,
    adapter,
    routeJob: blocked,
    sessions,
    blockedHumanDiagnostic,
    errors: [`${role} session failed during orchestration.`]
  };
}

function mockStatusForRoleAttempt({ options, role, attempt }) {
  const failRole = normalizeRole(options.mockFailRole);
  if (failRole !== role) {
    return "pass";
  }
  const failCount = Number.parseInt(options.mockFailCount ?? "1", 10);
  return attempt < failCount ? "fail" : "pass";
}

function mockFindingKeyForAttempt({ options, role, attempt }) {
  const sequence = parseList(options.mockFindingSequence ?? options.findingSequence);
  const selected = sequence[attempt] ?? sequence.at(-1) ?? options.findingId ?? `${role}-blocking-finding`;
  return canonicalFindingKey(selected);
}

function extractFindingKeys(output) {
  return uniquePathList(
    (output?.findings ?? []).map((finding) => canonicalFindingKey(finding?.findingKey ?? finding?.id ?? finding?.summary))
  );
}

function canonicalFindingKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9|_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildReadSetMetrics({ repoRoot, role, requiredSsot, sourceTrace, evidencePaths, fallbackTriggers }) {
  const defaultReadSet = uniquePathList([...requiredSsot, ...sourceTrace, ...evidencePaths]);
  const fallbackReadSet = fallbackTriggers.length > 0 ? DEFAULT_FALLBACK_ONLY_READS : [];
  const baselineReadSet = uniquePathList([...defaultReadSet, ...DEFAULT_FALLBACK_ONLY_READS]);
  const defaultTokenEstimate = estimateTokenCountForPaths(repoRoot, defaultReadSet);
  const baselineTokenEstimate = estimateTokenCountForPaths(repoRoot, baselineReadSet);
  return {
    role,
    defaultReadSet: {
      paths: defaultReadSet,
      fileCount: defaultReadSet.length,
      tokenEstimate: defaultTokenEstimate,
      maxFileCount: ROLE_READ_SET_MAX_FILES[role] ?? 12,
      maxTokenEstimate: ROLE_READ_SET_MAX_TOKENS[role] ?? 120000,
      broadCompatibilityViewsIncluded: defaultReadSet.some((item) => DEFAULT_FALLBACK_ONLY_READS.includes(item))
    },
    fallbackReadSet: {
      paths: fallbackReadSet,
      fileCount: fallbackReadSet.length,
      tokenEstimate: estimateTokenCountForPaths(repoRoot, fallbackReadSet),
      triggerReasons: fallbackTriggers.map((trigger) => trigger.reason ?? trigger.code)
    },
    baselineComparison: {
      baselineIncludesFallbackOnlyReads: true,
      baselineFileCount: baselineReadSet.length,
      baselineTokenEstimate,
      postChangeTokenEstimate: defaultTokenEstimate,
      reductionSatisfied: baselineTokenEstimate === 0 ? defaultReadSet.length < baselineReadSet.length : defaultTokenEstimate < baselineTokenEstimate
    }
  };
}

export function evaluateRoleBriefContextBudget({ role, readSetMetrics, fallbackTriggers = [], rationale = null } = {}) {
  const defaultReadSet = readSetMetrics?.defaultReadSet ?? {};
  const fallbackReadSet = readSetMetrics?.fallbackReadSet ?? {};
  const maxFileCount = defaultReadSet.maxFileCount ?? ROLE_READ_SET_MAX_FILES[role] ?? 12;
  const maxTokenEstimate = defaultReadSet.maxTokenEstimate ?? ROLE_READ_SET_MAX_TOKENS[role] ?? 120000;
  const fileOverrun = (defaultReadSet.fileCount ?? 0) > maxFileCount;
  const tokenOverrun = (defaultReadSet.tokenEstimate ?? 0) > maxTokenEstimate;
  const triggerReasons = uniqueStringList([
    ...(fallbackReadSet.triggerReasons ?? []),
    ...fallbackTriggers.map((trigger) => trigger.reason ?? trigger.code)
  ]);
  const normalizedRationale = String(rationale ?? "").trim();
  const rationaleText = normalizedRationale || (triggerReasons.length > 0 ? triggerReasons.join("; ") : null);
  const warnings = [];

  if ((fileOverrun || tokenOverrun) && !rationaleText) {
    warnings.push({
      code: "role_brief_context_budget_warning",
      severity: "warning",
      blocking: false,
      gateEffect: "advisory-only",
      message:
        `${role ?? "unknown"} role brief exceeds the soft context budget without an approved rationale ` +
        `(files ${defaultReadSet.fileCount ?? 0}/${maxFileCount}, tokens ${defaultReadSet.tokenEstimate ?? 0}/${maxTokenEstimate}).`,
      operatorMessage: "Advisory only: this context budget warning does not block the gate unless a future hard-fail mode is explicitly enabled.",
      recovery:
        "Trim the default read set, move broad/history reads to fallback-only, or record a packet/handoff contextBudgetRationale."
    });
  }

  return {
    schemaVersion: CONTEXT_BUDGET_SCHEMA_VERSION,
    status:
      fileOverrun || tokenOverrun
        ? rationaleText
          ? "over_budget_rationale_present"
          : "over_budget_unexplained"
        : "within_budget",
    enforcement: "warning-only",
    hardFailEnabled: false,
    severity: fileOverrun || tokenOverrun ? "warning" : "info",
    blocking: false,
    gateEffect: "advisory-only",
    operatorMessage: fileOverrun || tokenOverrun
      ? "Context budget is advisory in this mode; it does not create a gate hold."
      : "Context budget is within the advisory threshold.",
    defaultReadSet: {
      fileCount: defaultReadSet.fileCount ?? 0,
      maxFileCount,
      tokenEstimate: defaultReadSet.tokenEstimate ?? 0,
      maxTokenEstimate,
      fileOverrun,
      tokenOverrun,
      broadCompatibilityViewsIncluded: Boolean(defaultReadSet.broadCompatibilityViewsIncluded)
    },
    fallbackOnlyReadSet: {
      fileCount: fallbackReadSet.fileCount ?? 0,
      tokenEstimate: fallbackReadSet.tokenEstimate ?? 0,
      includedOnlyWhenFallbackTriggersExist: triggerReasons.length > 0,
      triggerReasons
    },
    overrunRationale: rationaleText,
    outputBudget: {
      summaryMaxLines: 8,
      closeoutMaxLines: 12,
      repeatedHistoryPolicy: "warn-only",
      requireDecisionAndNextAction: true,
      residualRiskMustBeExplicit: true
    },
    warnings
  };
}

function estimateTokenCountForPaths(repoRoot, paths) {
  return paths.reduce((total, relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      return total;
    }
    return total + Math.ceil(fs.readFileSync(absolutePath, "utf8").length / 4);
  }, 0);
}

function findOrCreateRouteJob({ store, workItemId, deliveryRouteMode }) {
  const existing = store.listRouteJobs({ workItemId })[0];
  if (existing) {
    return existing;
  }
  return store.createRouteJob({
    routeJobId: buildRouteJobId({ workItemId, now: store.now?.() ?? new Date().toISOString() }),
    workItemId,
    deliveryRouteMode: deliveryRouteMode ?? "role-by-role",
    status: "created",
    currentRole: null,
    loopCount: 0,
    sameFindingCounts: {},
    closeoutPackage: null,
    metadata: {
      schemaVersion: ROUTE_JOB_SCHEMA_VERSION
    }
  });
}

function buildRolePrompt({ role, workItemId, brief }) {
  return [
    `# ${role} session for ${workItemId}`,
    "",
    "Use the compact context JSON for this independent role session.",
    "Return only the required agent output JSON through HARNESS_OUTPUT_PATH.",
    "",
    `Authority boundary: ${brief.approvalBoundary}`
  ].join("\n");
}

function buildAdapterErrorOutput(message) {
  return {
    status: "adapter_error",
    summary: message,
    evidencePaths: [],
    findings: [{ id: "adapter_error", severity: "blocking", summary: message }],
    nextRouteRecommendation: "blocked-human",
    testsRun: [],
    changedFiles: [],
    blockedHumanDiagnostic: {
      reason: message
    }
  };
}

function parseAgentArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
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

function buildBriefFallbackTriggers({ latestHandoff, routeJob, workItem }) {
  const triggers = [];
  if (!latestHandoff?.payload?.approvalBoundary) {
    triggers.push({ code: "missing_approval_boundary", reason: "latest handoff has no approval boundary" });
  }
  if (!workItem?.sourceRef) {
    triggers.push({ code: "missing_active_packet", reason: "work item has no active packet sourceRef" });
  }
  if (routeJob?.status === "blocked" || routeJob?.status === "blocked-human") {
    triggers.push({ code: "route_blocked", reason: `route job status is ${routeJob.status}` });
  }
  return triggers;
}

function roleAuthority(role) {
  switch (role) {
    case "developer":
      return ["Implement approved scope", "Produce implementation evidence", "Hand off through structured route"];
    case "tester":
      return ["Verify approved scope", "Report pass/fail evidence", "Do not remediate"];
    case "reviewer":
      return ["Assess conformance", "Report findings and closeout readiness", "Do not remediate"];
    case "planner":
      return ["Close packet or hold scope", "Own approval boundary", "Do not substitute Tester or Reviewer evidence"];
    case "orchestrator":
      return ["Route approved delivery", "Track bounded remediation loops", "Do not substitute Developer, Tester, Reviewer, or Planner authority"];
    default:
      return [];
  }
}

function roleNonAuthority(role) {
  switch (role) {
    case "developer":
      return ["Tester pass", "Reviewer closeout", "Planner closeout", "Risk acceptance"];
    case "tester":
      return ["Implementation fixes", "Reviewer closeout", "Planner closeout"];
    case "reviewer":
      return ["Implementation fixes", "Tester verification rewrite", "Planner closeout"];
    case "planner":
      return ["Implementation", "Testing", "Reviewer judgment substitution"];
    case "orchestrator":
      return ["Implementation fixes", "Tester verification", "Reviewer closeout judgment", "Planner closeout approval", "Risk acceptance"];
    default:
      return [];
  }
}

function approvalBoundaryForRole(role) {
  switch (role) {
    case "developer":
      return "Implement only the approved packet scope. Do not change approval state.";
    case "tester":
      return "Verify only the approved packet scope. Do not directly remediate.";
    case "reviewer":
      return "Assess conformance and closeout readiness. Do not implement fixes.";
    case "planner":
      return "Close scope and approval boundaries only after evidence is present.";
    case "orchestrator":
      return "Route only approved packet execution. Continue bounded loops unless thresholds or authority stop conditions require human input.";
    default:
      return "Stay inside the approved packet and workflow authority.";
  }
}

function doNotCrossForRole(role) {
  switch (role) {
    case "developer":
      return ["No approval-state changes.", "No Tester or Reviewer gate claims.", "No manual generated-doc edits."];
    case "tester":
      return ["No implementation changes.", "No Reviewer closeout claims.", "No approval-state changes."];
    case "reviewer":
      return ["No implementation changes.", "No Tester evidence rewrite.", "No Planner closeout claims."];
    case "planner":
      return ["No implementation changes.", "No Tester or Reviewer judgment substitution."];
    case "orchestrator":
      return [
        "No code remediation by Orchestrator.",
        "No Tester or Reviewer judgment substitution.",
        "No Planner closeout approval.",
        "Do not stop before bounded-loop thresholds unless an authority stop condition is present."
      ];
    default:
      return ["Do not exceed the approved packet scope."];
  }
}

function nextRoleAfter(role) {
  switch (role) {
    case "developer":
      return "tester";
    case "tester":
      return "reviewer";
    case "reviewer":
      return "planner";
    default:
      return null;
  }
}

function invalidRoleMessage(role) {
  const roleText = role ?? "missing";
  const schemaVisible = SCHEMA_VISIBLE_WORKFLOW_ROLES.includes(roleText);
  if (schemaVisible) {
    return (
      `Role ${roleText} is schema-visible for workflow authority but is not routeable by harness:agent. ` +
      `Expected one of ${ROUTEABLE_AGENT_ROLES.join(", ")}.`
    );
  }
  return `Invalid or missing --role. Expected one of ${ROUTEABLE_AGENT_ROLES.join(", ")}.`;
}

function normalizeRole(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeExecutionMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_EXECUTION_MODES.has(normalized) ? normalized : null;
}

function normalizeRouteRecommendation(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeAgentStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_AGENT_STATUSES.has(normalized) ? normalized : null;
}

function buildSessionId({ workItemId, role, now }) {
  return `agent-${safeFilePart(workItemId)}-${role}-${safeFilePart(now)}`;
}

function buildRouteJobId({ workItemId, now }) {
  return `route-${safeFilePart(workItemId)}-${safeFilePart(now)}`;
}

function safeFilePart(value) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniquePathList(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function uniqueStringList(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

function writeJsonFile(targetPath, payload) {
  writeTextFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeTextFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}
