import fs from "node:fs";
import path from "node:path";

import {
  normalizeDeliveryRouteMode,
  runAgentSession,
  runOrchestratedCloseout,
  runRoleBrief
} from "./agent-routing.js";
import { decorateCloseoutPackageForCurrentState } from "./closeout-decision.js";
import { inspectTaskPacketContract } from "./drift-validator.js";
import { ACTIVE_PROFILES_MARKDOWN } from "./harness-paths.js";
import {
  normalizePacketHeaderValue,
  readFirstMarkdownTableBodyLines,
  sliceSection
} from "./lib/packet-markdown.js";
import { DEFAULT_DB_PATH } from "./operating-state-store.js";
import { normalizeReadyForCodeState, readPacketReadyForCode } from "./packet-contract.js";
import {
  recommendNextActionFromState,
  runValidator,
  summarizeValidation,
  withStore
} from "./validation-core.js";
import {
  isClosedStatus,
  resolveHandoffExecution,
  workflowForOwner
} from "./workflow-routing.js";

const PLANNER_HOLD_NEXT_ACTION = "Keep the reusable baseline on planning hold until a new approved lane is selected.";

export function buildHarnessStatus({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const validation = runValidator({ repoRoot, outputDir, dbPath });
    const releaseState = store.getReleaseState("current");
    const workItems = store.listWorkItems();
    const latestHandoff = store.listRecentHandoffs(1)[0] ?? null;
    const handoff = resolveHandoffExecution({ repoRoot, workItems, latestHandoff });
    const primaryWorkItem = handoff.task;
    const primaryWorkItemRecord = primaryWorkItem?.workItemId ? store.getWorkItem(primaryWorkItem.workItemId) : null;
    const blockers = store.listGateRisks({ status: "open" });
    const decisions = store.listDecisions({ status: "open", decisionNeeded: true });
    const activeProfiles = readActiveProfileSummary(repoRoot);
    const routeExecution = primaryWorkItem?.workItemId
      ? summarizeRouteExecution(store, primaryWorkItem.workItemId)
      : null;
    const technicalValidation = summarizeValidation(validation);
    const assignmentRoute = primaryWorkItem
      ? resolveAssignmentRouteSummary({
          repoRoot,
          validation,
          packetPath: primaryWorkItemRecord?.sourceRef ?? primaryWorkItem.sourceRef ?? null
        })
      : null;
    const assignmentReadyForCode = primaryWorkItem
      ? normalizeReadyForCodeState(primaryWorkItemRecord?.metadata?.readyForCode) ??
        readPacketReadyForCode(repoRoot, primaryWorkItem.sourceRef)
      : null;
    const workflowGate = summarizeWorkflowGate({
      releaseState,
      assignment: primaryWorkItem
        ? {
            owner: primaryWorkItem.owner ?? "unassigned",
            status: primaryWorkItem.status,
            readyForCode: assignmentReadyForCode
          }
        : null,
      openDecisions: decisions.length
    });
    return {
      ok: validation.ok,
      command: "status",
      stage: releaseState?.currentStage ?? "unknown",
      gateState: releaseState?.releaseGateState ?? "unknown",
      focus: releaseState?.currentFocus ?? "unknown",
      releaseGoal: releaseState?.releaseGoal ?? "unknown",
      openWorkItems: workItems.filter((item) => !isClosedStatus(item.status)).length,
      openBlockers: blockers.length,
      openDecisions: decisions.length,
      activeProfiles,
      assignment: primaryWorkItem
        ? {
            workItemId: primaryWorkItem.workItemId,
            title: primaryWorkItem.title,
            status: primaryWorkItem.status,
            owner: primaryWorkItem.owner ?? "unassigned",
            readyForCode: assignmentReadyForCode,
            nextAction: primaryWorkItem.nextAction ?? "not recorded",
            requestedRouteClass: assignmentRoute?.requestedRouteClass ?? null,
            chosenRouteClass: assignmentRoute?.chosenRouteClass ?? null,
            routeEligibility: assignmentRoute?.routeEligibility ?? null,
            routeRejectionReasons: assignmentRoute?.routeRejectionReasons ?? [],
            deliveryRouteMode: normalizeDeliveryRouteMode(primaryWorkItemRecord?.metadata?.deliveryRouteMode),
            activeOperatorId: normalizeOperatorId(primaryWorkItemRecord?.metadata?.activeOperatorId),
            activeOperatorLabel: normalizeOperatorLabel(primaryWorkItemRecord?.metadata?.activeOperatorLabel),
            ownershipClaimedAt: primaryWorkItemRecord?.metadata?.ownershipClaimedAt ?? null,
            ownershipMode: primaryWorkItemRecord?.metadata?.ownershipMode ?? null
          }
        : null,
      handoff: handoff.handoff,
      routeExecution,
      nextOwner: handoff.owner,
      workflowGate,
      technicalValidation,
      validation: technicalValidation,
      nextAction: recommendNextActionFromState(store, validation, repoRoot)
    };
  });
}

export function buildRoleBriefCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => runRoleBrief({ store, repoRoot, outputDir, args }));
}

export function runAgentCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => runAgentSession({ store, repoRoot, outputDir, args }));
}

export function runOrchestrateCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  return withStore({ dbPath, repoRoot }, (store) => runOrchestratedCloseout({ store, repoRoot, outputDir, args }));
}

export function recommendNextAction({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const validation = runValidator({ repoRoot, outputDir, dbPath });
    const workItems = store.listWorkItems();
    const latestHandoff = store.listRecentHandoffs(1)[0] ?? null;
    const handoff = resolveHandoffExecution({ repoRoot, workItems, latestHandoff });
    const primaryWorkItem = handoff.task;
    return {
      ok: validation.ok,
      command: "next",
      nextAction: recommendNextActionFromState(store, validation, repoRoot),
      nextOwner: handoff.owner,
      nextTask: primaryWorkItem
        ? {
            workItemId: primaryWorkItem.workItemId,
            title: primaryWorkItem.title,
            status: primaryWorkItem.status
          }
        : null,
      validation: summarizeValidation(validation)
    };
  });
}

export function resolveHandoff({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const validation = runValidator({ repoRoot, outputDir, dbPath });
    const workItems = store.listWorkItems();
    const latestHandoff = store.listRecentHandoffs(1)[0] ?? null;
    const handoff = resolveHandoffExecution({
      repoRoot,
      workItems,
      latestHandoff,
      includeWorkflowDetails: true
    });

    return {
      ok: handoff.routeStatus === "ready",
      command: "handoff",
      routeStatus: handoff.routeStatus,
      resolvedBy: handoff.resolvedBy,
      nextOwner: handoff.owner,
      workflow: handoff.workflow,
      workflowDetails: handoff.workflowDetails,
      currentStateNextAgent: handoff.currentStateNextAgent,
      nextTask: handoff.task,
      recentHandoff: handoff.handoff,
      commandHints: handoff.commandHints,
      validation: summarizeValidation(validation),
      nextAction: recommendNextActionFromState(store, validation, repoRoot)
    };
  });
}

export function explainCurrentBlockers({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  return withStore({ dbPath, repoRoot, createIfMissing: false, migrate: false }, (store) => {
    const validation = runValidator({ repoRoot, outputDir, dbPath });
    const blockers = [
      ...validation.findings
        .filter((finding) => finding.severity === "error")
        .map((finding) => ({
          source: "validator",
          code: finding.code,
          message: finding.message,
          recovery: recoveryForFinding(finding)
        })),
      ...store.listGateRisks({ status: "open" }).map((risk) => ({
        source: "gate_risk_registry",
        code: risk.riskId,
        message: risk.title,
        recovery: risk.unblockCondition ?? risk.nextEscalation ?? "Resolve the recorded gate risk."
      }))
    ];

    return {
      ok: blockers.length === 0,
      command: "explain",
      summary: blockers.length === 0 ? "No current blocker is recorded." : `${blockers.length} blocker(s) require attention.`,
      blockers,
      nextAction: blockers[0]?.recovery ?? recommendNextActionFromState(store, validation, repoRoot)
    };
  });
}

function summarizeWorkflowGate({ releaseState, assignment, openDecisions = 0 }) {
  if (!assignment) {
    if (releaseState?.currentStage === "planning") {
      return {
        status: "blocked",
        detail: "awaiting next approved lane selection"
      };
    }
    return {
      status: "open",
      detail: "no active assignment is recorded"
    };
  }

  if (openDecisions > 0) {
    return {
      status: "blocked",
      detail: `awaiting ${openDecisions} open decision(s)`
    };
  }

  const normalizedStatus = String(assignment.status ?? "").trim().toLowerCase().replace(/[_-]/g, " ");
  if (assignment.owner === "planner" && normalizedStatus === "planning") {
    if (assignment.readyForCode !== "approved") {
      return {
        status: "blocked",
        detail: "awaiting Ready For Code approval"
      };
    }
    return {
      status: "open",
      detail: "planner-approved implementation handoff is ready"
    };
  }

  const ownerDetail = {
    developer: "implementation in progress",
    orchestrator: "approved delivery orchestration in progress",
    tester: "tester verification in progress",
    reviewer: "reviewer closeout in progress",
    planner: "planner routing in progress"
  };

  return {
    status: "open",
    detail: ownerDetail[assignment.owner] ?? `${assignment.owner} owns the active lane`
  };
}

function readActiveProfileSummary(repoRoot) {
  const activeProfilePath = path.resolve(repoRoot, ACTIVE_PROFILES_MARKDOWN);
  if (!fs.existsSync(activeProfilePath)) {
    return {
      path: ACTIVE_PROFILES_MARKDOWN,
      status: "not_declared",
      profiles: []
    };
  }

  const content = fs.readFileSync(activeProfilePath, "utf8");
  const sectionContent = sliceSection(content, "## Active Profile Table") ?? content;
  const profiles = readFirstMarkdownTableBodyLines(sectionContent)
    .filter((line) => line.startsWith("| PRF-"))
    .map((line) => {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      return {
        profileId: cells[0],
        reason: cells[1],
        evidenceStatus: cells[3],
        appliesToPackets: cells[6]
      };
    });

  return {
    path: ACTIVE_PROFILES_MARKDOWN,
    status: profiles.length > 0 ? "declared" : "empty",
    profiles
  };
}

function resolveAssignmentRouteSummary({ repoRoot, validation, packetPath }) {
  if (!packetPath) {
    return null;
  }
  const inspected = inspectTaskPacketContract({ repoRoot, packetPath });
  if (inspected.riskClassification) {
    return inspected.riskClassification;
  }
  const fromValidation = validation.riskClassifications?.find((item) => item.packetPath === packetPath) ?? null;
  return fromValidation;
}

function summarizeRouteExecution(store, workItemId) {
  const routeJob = store.listRouteJobs({ workItemId })[0] ?? null;
  if (!routeJob) {
    return null;
  }
  const workItem = store.getWorkItem(workItemId);
  const sessions = store.listAgentSessions({ workItemId });
  const events = store.listRouteEvents({ routeJobId: routeJob.routeJobId });
  const canClaimIndependentReview = Boolean(routeJob.metadata?.canClaimIndependentReview);
  const executionMode = routeJob.metadata?.executionMode ?? null;
  return {
    routeJobId: routeJob.routeJobId,
    deliveryRouteMode: routeJob.deliveryRouteMode,
    executionMode,
    executionModeEvidence: routeJob.metadata?.executionModeEvidence ?? null,
    canClaimIndependentReview,
    status: routeJob.status,
    currentRole: routeJob.currentRole,
    loopCount: routeJob.loopCount,
    sameFindingCounts: routeJob.sameFindingCounts ?? {},
    lastFailingRole: routeJob.metadata?.lastFailingRole ?? null,
    lastDeveloperAttempt: routeJob.metadata?.lastDeveloperAttempt ?? 0,
    userInputRequired: Boolean(routeJob.metadata?.userInputRequired),
    sessionCount: sessions.length,
    eventCount: events.length,
    latestSession: sessions.at(-1)
      ? {
          sessionId: sessions.at(-1).sessionId,
          role: sessions.at(-1).role,
          status: sessions.at(-1).status,
          executionMode: sessions.at(-1).metadata?.executionMode?.mode ?? null,
          outputPath: sessions.at(-1).outputPath
        }
      : null,
    closeoutPackage: decorateCloseoutPackageForCurrentState({
      closeoutPackage: routeJob.closeoutPackage,
      workItemId,
      currentOwner: workItem?.owner,
      currentStatus: workItem?.status,
      routeJobStatus: routeJob.status,
      executionMode,
      canClaimIndependentReview
    }),
    blockedHumanDiagnostic: routeJob.metadata?.blockedHumanDiagnostic ?? null
  };
}

function normalizeOperatorId(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeOperatorLabel(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
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
