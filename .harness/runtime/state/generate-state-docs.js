import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { resolveGeneratedDocWritePaths } from "./harness-paths.js";
import { GENERATED_DOCS } from "./operating-state-store.js";
import { isClosedStatus, resolveHandoffExecution, selectActiveWorkItem } from "./workflow-routing.js";

export const CURRENT_STATE_DOC = "CURRENT_STATE.md";
export const TASK_LIST_DOC = "TASK_LIST.md";
export const COMPATIBILITY_CURRENT_STATE_PATH = ".agents/artifacts/CURRENT_STATE.md";
export const COMPATIBILITY_TASK_LIST_PATH = ".agents/artifacts/TASK_LIST.md";

export function writeGeneratedStateDocs({
  store,
  outputDir = process.cwd(),
  repoRoot = outputDir,
  sourceRevision
}) {
  const generationTimestamp = getProjectionTimestamp(store);
  const resolvedSourceRevision = sourceRevision ?? buildSourceRevision(store);
  const docs = [
    {
      projectionName: CURRENT_STATE_DOC,
      targetPaths: resolveGeneratedDocWritePaths({ outputDir, docName: CURRENT_STATE_DOC }),
      content: buildCurrentStateDoc(store, { generatedAt: generationTimestamp })
    },
    {
      projectionName: TASK_LIST_DOC,
      targetPaths: resolveGeneratedDocWritePaths({ outputDir, docName: TASK_LIST_DOC }),
      content: buildTaskListDoc(store, { generatedAt: generationTimestamp })
    },
    {
      projectionName: COMPATIBILITY_CURRENT_STATE_PATH,
      targetPaths: [path.resolve(path.resolve(outputDir), COMPATIBILITY_CURRENT_STATE_PATH)],
      content: buildCompatibilityCurrentStateDoc(store, { repoRoot, generatedAt: generationTimestamp })
    },
    {
      projectionName: COMPATIBILITY_TASK_LIST_PATH,
      targetPaths: [path.resolve(path.resolve(outputDir), COMPATIBILITY_TASK_LIST_PATH)],
      content: buildCompatibilityTaskListDoc(store, { repoRoot, generatedAt: generationTimestamp })
    }
  ];

  for (const doc of docs) {
    for (const targetPath of doc.targetPaths) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, doc.content, "utf8");
    }
    store.refreshProjection({
      projectionName: doc.projectionName,
      checksum: calculateChecksum(doc.content),
      generatedAt: generationTimestamp,
      sourceRevision: resolvedSourceRevision,
      freshnessState: "fresh",
      metadata: {
        bytes: Buffer.byteLength(doc.content, "utf8"),
        lineCount: doc.content.split("\n").length
      }
    });
  }

  return {
    docs: docs.map((doc) => ({
      name: doc.projectionName,
      checksum: calculateChecksum(doc.content),
      path: doc.targetPaths[0],
      paths: doc.targetPaths
    }))
  };
}

export function buildCurrentStateDoc(store, { generatedAt = getProjectionTimestamp(store) } = {}) {
  const releaseState = store.getReleaseState("current");
  const openDecisions = store.listDecisions({ status: "open", decisionNeeded: true });

  return [
    "# CURRENT_STATE",
    "",
    "## Technical Facts",
    `- Release stage: ${releaseState?.currentStage ?? "unknown"}`,
    `- Release gate state: ${releaseState?.releaseGateState ?? "unknown"}`,
    `- Release goal: ${releaseState?.releaseGoal ?? "unknown"}`,
    `- Generated at: ${generatedAt}`,
    "",
    "## Current Focus Summary",
    `- ${releaseState?.currentFocus ?? "No current focus has been recorded."}`,
    "",
    "## Current Focus Detail",
    `- Stage: ${releaseState?.currentStage ?? "unknown"}`,
    `- Gate state: ${releaseState?.releaseGateState ?? "unknown"}`,
    `- Goal: ${releaseState?.releaseGoal ?? "unknown"}`,
    `- Focus: ${releaseState?.currentFocus ?? "No current focus has been recorded."}`,
    `- Source: ${releaseState?.sourceRef ?? "needs source"}`,
    "",
    "## Decision Required Summary",
    `- ${formatCount(openDecisions.length, "open decision")} require attention.`,
    `- ${openDecisions[0]?.title ?? "No open decision requires attention."}`,
    "",
    "## Decision Required Detail",
    renderDecisionTable(openDecisions),
    "",
    "## Generation Metadata",
    `- Generated docs: ${GENERATED_DOCS.join(", ")}`,
    `- Source revision: ${buildSourceRevision(store)}`,
    "- Sync status: fresh at generation time"
  ].join("\n");
}

export function buildTaskListDoc(store, { generatedAt = getProjectionTimestamp(store) } = {}) {
  const openRisks = store.listGateRisks({ status: "open" });
  const workItems = store.listWorkItems();
  const handoffs = store.listRecentHandoffs(10);

  return [
    "# TASK_LIST",
    "",
    "## Technical Facts",
    `- Open work items: ${workItems.length}`,
    `- Open blocked or at-risk items: ${openRisks.length}`,
    `- Recent handoffs captured: ${handoffs.length}`,
    `- Generated at: ${generatedAt}`,
    "",
    "## Blocked / At Risk Summary",
    `- ${formatCount(openRisks.length, "open blocker or risk")} require attention.`,
    `- ${openRisks[0]?.title ?? "No blocking or at-risk item is open."}`,
    "",
    "## Blocked / At Risk Detail",
    renderRiskTable(openRisks),
    "",
    "## Work Item Detail",
    renderWorkItemTable(workItems),
    "",
    "## Handoff Log",
    renderHandoffList(handoffs),
    "",
    "## Generation Metadata",
    `- Generated docs: ${GENERATED_DOCS.join(", ")}`,
    `- Source revision: ${buildSourceRevision(store)}`,
    "- Sync status: fresh at generation time"
  ].join("\n");
}

export function buildCompatibilityCurrentStateDoc(
  store,
  { repoRoot = process.cwd(), generatedAt = getProjectionTimestamp(store) } = {}
) {
  const releaseState = store.getReleaseState("current");
  const workItems = store.listWorkItems();
  const handoffs = store.listRecentHandoffs(20);
  const latestHandoff = handoffs[0] ?? null;
  const focusWorkItem = resolveFocusWorkItem({ store, repoRoot, workItems, latestHandoff });
  const focusHandoff = focusWorkItem
    ? findLatestHandoffForWorkItem(handoffs, focusWorkItem.workItemId) ?? latestHandoff
    : latestHandoff;
  const handoffExecution = resolveHandoffExecution({ repoRoot, workItems, latestHandoff, includeWorkflowDetails: true });
  const mustReadNext = resolveCompatibilityMustReadNext({
    repoRoot,
    releaseState,
    focusWorkItem,
    latestHandoff,
    handoffExecution
  });
  const openDecisions = store.listDecisions({ status: "open", decisionNeeded: true });
  const openRisks = store.listGateRisks({ status: "open" });
  const openDecisionBullet =
    openDecisions.length > 0
      ? `- Open decisions pending: ${openDecisions.length}. First item: ${openDecisions[0].decisionId} / ${openDecisions[0].title}.`
      : null;
  const openRiskBullet =
    openRisks.length > 0
      ? `- Open blockers or risks: ${openRisks.length}. First item: ${openRisks[0].riskId} / ${openRisks[0].title}.`
      : null;
  const primaryStateBullet = buildCompatibilityWorkItemStateBullet({
    workItem: focusWorkItem,
    handoff: focusHandoff,
    nextAction: resolveFocusNextAction(focusWorkItem, focusHandoff),
    fallbackOwner: handoffExecution.owner
  });
  const approvedScopeBullet =
    focusWorkItem && !isClosedStatus(focusWorkItem.status)
      ? buildCompatibilityApprovedScopeBullet({ workItem: focusWorkItem, handoff: focusHandoff })
      : null;
  const currentTruthBullet = buildCompatibilityCurrentTruthNote({ workItem: focusWorkItem, handoff: focusHandoff });
  const packetTruthBullet = buildCompatibilityPacketTruthNote({ workItem: focusWorkItem, handoff: focusHandoff });
  const nextOwner = focusWorkItem?.owner ?? handoffExecution.owner ?? latestHandoff?.toRole ?? "planner";

  return [
    "# Current State",
    "",
    "> GENERATED, DO NOT EDIT. Human status summary fallback only. Use `.agents/runtime/ACTIVE_CONTEXT.json` and `harness:context` as the first re-entry surface.",
    "",
    "## Snapshot",
    `- Current Stage: ${releaseState?.currentStage ?? "unknown"}`,
    `- Current Focus: ${releaseState?.currentFocus ?? "unknown"}`,
    `- Current Release Goal: ${releaseState?.releaseGoal ?? "unknown"}`,
    `- Generated At: ${generatedAt}`,
    "- View Mode: generated compatibility fallback",
    "- Sync Status: fresh at generation time; if this view is missing or drifted, regenerate with `node .harness/runtime/state/harness-cli.js context --repair`.",
    "",
    "## Next Recommended Agent",
    `- ${titleCaseOwner(nextOwner)}`,
    "",
    "## Must Read Next",
    ...renderBulletList(mustReadNext.map((item) => `- \`${item}\``), "- No follow-up read list recorded."),
    "",
    "## Open Decisions / Blockers",
    ...renderBulletList(
      [primaryStateBullet, approvedScopeBullet, openDecisionBullet, openRiskBullet].filter(Boolean),
      "- No open decision or blocker is recorded."
    ),
    "",
    "## Current Truth Notes",
    ...renderBulletList([currentTruthBullet, packetTruthBullet].filter(Boolean), "- No current truth note is recorded."),
    "",
    "## Latest Handoff Summary",
    ...renderBulletList(
      handoffs.map((handoff) => `- ${handoff.createdAt.slice(0, 10)}: \`${handoff.handoffSummary}\``),
      "- none"
    )
  ].join("\n");
}

export function buildCompatibilityTaskListDoc(
  store,
  { repoRoot = process.cwd(), generatedAt = getProjectionTimestamp(store) } = {}
) {
  const releaseState = store.getReleaseState("current");
  const workItems = store.listWorkItems();
  const handoffs = store.listRecentHandoffs(20);
  const latestHandoff = handoffs[0] ?? null;
  const activeWorkItems = workItems.filter((item) => !isClosedStatus(item.status));
  const closedWorkItems = workItems.filter((item) => isClosedStatus(item.status));
  const openRisks = store.listGateRisks({ status: "open" });
  const nextAction =
    activeWorkItems[0]?.nextAction ??
    latestHandoff?.payload?.nextFirstAction ??
    "Planner should choose the next approved lane and open the next packet only after human agreement.";

  return [
    "# Task List",
    "",
    "> GENERATED, DO NOT EDIT. Human status summary fallback only. Authoritative live routing stays in the operational DB plus `.agents/runtime/ACTIVE_CONTEXT.json`.",
    "",
    "## Current Release Target",
    `- ${releaseState?.releaseGoal ?? releaseState?.currentFocus ?? "No current release target has been recorded."}`,
    `- Generated At: ${generatedAt}`,
    `- Active work item count: ${activeWorkItems.length}`,
    "",
    "## Active Locks",
    renderTable(
      ["Task ID", "Scope", "Owner", "Status", "Started At", "Notes"],
      activeWorkItems.map((item) => {
        const handoff = findLatestHandoffForWorkItem(handoffs, item.workItemId);
        return [
          item.workItemId,
          item.title ?? item.workItemId,
          item.owner ?? "-",
          "active",
          resolveStartedAt(item, handoff),
          `${handoff?.payload?.transition ?? "generated"}; gate ${item.metadata?.gateProfile ?? "unknown"}; ${item.nextAction ?? "No next action recorded."}`
        ];
      }),
      ["-", "None", "-", "clear", "-", "-"]
    ),
    "",
    "## Active Tasks",
    renderTable(
      ["Task ID", "Title", "Scope", "Owner", "Status", "Priority", "Depends On", "Verification"],
      activeWorkItems.map((item) => [
        item.workItemId,
        item.title ?? item.workItemId,
        item.title ?? item.workItemId,
        item.owner ?? "-",
        item.status ?? "unknown",
        resolvePriority(item),
        resolveDependsOn(item),
        `gate ${item.metadata?.gateProfile ?? "unknown"}; ${item.nextAction ?? "No next action recorded."}`
      ]),
      ["-", "None", "-", "-", "clear", "-", "-", "-"]
    ),
    `- Next first action: ${nextAction}`,
    "- Generated compatibility fallback only; regenerate rather than editing this file manually.",
    "",
    "## Blocked Tasks",
    renderTable(
      ["Task ID", "Blocker", "Owner", "Status", "Unblock Condition", "Verification"],
      openRisks.map((risk) => [
        risk.riskId,
        risk.title ?? "Blocked item",
        "planner",
        risk.severity ?? "open",
        "Resolve the recorded blocker or risk.",
        risk.sourceRef ?? "needs source"
      ]),
      ["-", "None", "-", "clear", "-", "-"]
    ),
    "",
    "## Completed Tasks",
    renderTable(
      ["Task ID", "Title", "Completed At", "Verification", "Notes"],
      closedWorkItems.map((item) => {
        const handoff = findLatestHandoffForWorkItem(handoffs, item.workItemId);
        const fromRole = handoff?.fromRole ?? item.metadata?.lastTransition?.fromOwner ?? "unknown";
        const toRole = handoff?.toRole ?? item.metadata?.lastTransition?.toOwner ?? item.owner ?? "unknown";
        return [
          item.workItemId,
          item.title ?? item.workItemId,
          resolveClosedAt(item, handoff),
          `transition ${fromRole} -> ${toRole}; gate ${item.metadata?.gateProfile ?? "unknown"}`,
          `${normalizeHandoffSummary(handoff?.handoffSummary) ?? "Closed in canonical operational state."} ${item.nextAction ?? ""}`.trim()
        ];
      }),
      ["-", "None", "-", "-", "-"]
    ),
    "",
    "## Handoff Log",
    ...renderBulletList(
      handoffs.map(
        (handoff) =>
          `- ${handoff.createdAt.slice(0, 10)}: [${handoff.fromRole ?? "unknown"} -> ${handoff.toRole ?? "unknown"}] ${handoff.handoffSummary}`
      ),
      "- none"
    )
  ].join("\n");
}

export function calculateChecksum(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function buildSourceRevision(store) {
  return store.getLatestOperationalTimestamp() ?? "empty-store";
}

function getProjectionTimestamp(store) {
  return store.getLatestOperationalTimestamp() ?? store.getLatestMutationTimestamp() ?? new Date().toISOString();
}

function formatCount(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function renderDecisionTable(openDecisions) {
  if (openDecisions.length === 0) {
    return "| ID | Title | Impact | Source |\n|---|---|---|---|\n| - | None | No open decision | needs source |";
  }

  return [
    "| ID | Title | Impact | Source |",
    "|---|---|---|---|",
    ...openDecisions.map(
      (item) =>
        `| ${item.decisionId} | ${escapeCell(item.title)} | ${escapeCell(item.impactSummary)} | ${item.sourceRef ?? "needs source"} |`
    )
  ].join("\n");
}

function renderRiskTable(openRisks) {
  if (openRisks.length === 0) {
    return "| ID | Title | Severity | Source |\n|---|---|---|---|\n| - | None | none | needs source |";
  }

  return [
    "| ID | Title | Severity | Source |",
    "|---|---|---|---|",
    ...openRisks.map(
      (item) =>
        `| ${item.riskId} | ${escapeCell(item.title)} | ${item.severity} | ${item.sourceRef ?? "needs source"} |`
    )
  ].join("\n");
}

function renderWorkItemTable(workItems) {
  if (workItems.length === 0) {
    return "| ID | Title | Status | Next Action |\n|---|---|---|---|\n| - | None | idle | Nothing scheduled |";
  }

  return [
    "| ID | Title | Status | Next Action |",
    "|---|---|---|---|",
    ...workItems.map(
      (item) =>
        `| ${item.workItemId} | ${escapeCell(item.title)} | ${item.status} | ${escapeCell(item.nextAction ?? "None")} |`
    )
  ].join("\n");
}

function renderHandoffList(handoffs) {
  if (handoffs.length === 0) {
    return "- No handoff has been recorded.";
  }

  return handoffs.map((item) => `- ${item.createdAt}: ${item.handoffSummary}`).join("\n");
}

function resolveCompatibilityMustReadNext({ repoRoot, releaseState, focusWorkItem, latestHandoff, handoffExecution }) {
  const startHerePath = path.resolve(repoRoot, "START_HERE.md");
  const workflowReadFirst = handoffExecution.workflowDetails?.readFirst ?? [];
  return uniqueList(
    [
      ".agents/runtime/ACTIVE_CONTEXT.json",
      handoffExecution.workflow === "manual_selection_required" ? null : handoffExecution.workflow,
      fs.existsSync(startHerePath) ? "START_HERE.md" : null,
      ...workflowReadFirst,
      ...(latestHandoff?.payload?.requiredSsot ?? []),
      COMPATIBILITY_TASK_LIST_PATH,
      focusWorkItem?.sourceRef ?? releaseState?.sourceRef ?? null
    ].filter(Boolean)
  );
}

function resolveFocusWorkItem({ store, repoRoot, workItems, latestHandoff }) {
  const active = selectActiveWorkItem(workItems, { repoRoot });
  if (active) {
    return active;
  }

  const focusId = latestHandoff?.payload?.workItemId ?? null;
  if (!focusId) {
    return null;
  }
  return store.getWorkItem(focusId) ?? workItems.find((item) => item.workItemId === focusId) ?? null;
}

function resolveFocusNextAction(workItem, handoff) {
  return workItem?.nextAction ?? handoff?.payload?.nextFirstAction ?? "No next action has been recorded.";
}

function buildCompatibilityWorkItemStateBullet({ workItem, handoff, nextAction, fallbackOwner }) {
  if (!workItem) {
    return `- No active work item is selected. Next owner remains \`${fallbackOwner ?? "planner"}\`.`;
  }

  const fromRole = handoff?.fromRole ?? workItem.metadata?.lastTransition?.fromOwner ?? "unknown";
  const toRole = handoff?.toRole ?? workItem.metadata?.lastTransition?.toOwner ?? workItem.owner ?? fallbackOwner ?? "unknown";
  if (isClosedStatus(workItem.status)) {
    return `- \`${workItem.workItemId}\` is closed; latest handoff is \`${fromRole} -> ${toRole}\`. ${nextAction}`;
  }

  const readyForCode = normalizeReadyForCode(workItem.metadata?.readyForCode);
  const approvalText =
    readyForCode === "approved" ? "Ready For Code is approved" : `Ready For Code status is ${readyForCode ?? "unknown"}`;
  return `- \`${workItem.workItemId}\` ${approvalText}; active handoff is \`${fromRole} -> ${toRole}\`. ${nextAction}`;
}

function buildCompatibilityApprovedScopeBullet({ workItem, handoff }) {
  const fromRole = handoff?.fromRole ?? workItem.metadata?.lastTransition?.fromOwner ?? "unknown";
  const toRole = handoff?.toRole ?? workItem.metadata?.lastTransition?.toOwner ?? workItem.owner ?? "unknown";
  if (isClosedStatus(workItem.status)) {
    return `- User-approved \`${workItem.workItemId}\` scope is closed; latest handoff is \`${fromRole} -> ${toRole}\`.`;
  }
  const readyForCode = normalizeReadyForCode(workItem.metadata?.readyForCode);
  const approvalText =
    readyForCode === "approved"
      ? "Ready For Code is approved"
      : `Ready For Code status is ${readyForCode ?? "unknown"}`;
  return `- User-approved \`${workItem.workItemId}\` scope remains active. ${approvalText}; current handoff is \`${fromRole} -> ${toRole}\`. ${workItem.nextAction ?? "No next action recorded."}`;
}

function buildCompatibilityCurrentTruthNote({ workItem, handoff }) {
  if (!workItem) {
    return null;
  }
  const fromRole = handoff?.fromRole ?? workItem.metadata?.lastTransition?.fromOwner ?? "unknown";
  const toRole = handoff?.toRole ?? workItem.metadata?.lastTransition?.toOwner ?? workItem.owner ?? "unknown";
  if (isClosedStatus(workItem.status)) {
    return `- \`${workItem.workItemId}\` is closed. Latest handoff is \`${fromRole} -> ${toRole}\`; stage is \`${resolveStageForWorkItem(workItem)}\`; gate profile is \`${workItem.metadata?.gateProfile ?? "unknown"}\`.`;
  }
  return `- \`${workItem.workItemId}\` remains the active work item. Current handoff is \`${fromRole} -> ${toRole}\`; stage is \`${resolveStageForWorkItem(workItem)}\`; gate profile is \`${workItem.metadata?.gateProfile ?? "unknown"}\`.`;
}

function buildCompatibilityPacketTruthNote({ workItem, handoff }) {
  const packetSourceRef = workItem?.metadata?.packetSourceRef ?? workItem?.sourceRef ?? null;
  if (!packetSourceRef) {
    return null;
  }

  const packetName = path.basename(packetSourceRef);
  const fromRole = handoff?.fromRole ?? workItem.metadata?.lastTransition?.fromOwner ?? "unknown";
  const toRole = handoff?.toRole ?? workItem.metadata?.lastTransition?.toOwner ?? workItem.owner ?? "unknown";
  if (isClosedStatus(workItem.status)) {
    return `- \`${packetName}\` is closed with the latest handoff \`${fromRole} -> ${toRole}\`.`;
  }
  return `- \`${packetName}\` remains the active packet for scope boundary, human approval text, and audit evidence; live handoff is \`${fromRole} -> ${toRole}\`; live stage is ${describeStageForPacket(resolveStageForWorkItem(workItem))}.`;
}

function renderBulletList(lines, emptyLine) {
  return lines.length > 0 ? lines : [emptyLine];
}

function renderTable(headers, rows, placeholderRow) {
  const safeRows = rows.length > 0 ? rows : [placeholderRow];
  return [
    `| ${headers.join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...safeRows.map((row) => `| ${row.map((cell) => escapeCell(cell ?? "-")).join(" | ")} |`)
  ].join("\n");
}

function resolveStartedAt(workItem, handoff) {
  const raw = handoff?.createdAt ?? workItem.metadata?.startedAt ?? workItem.metadata?.lastTransition?.appliedAt ?? null;
  return raw ? String(raw).slice(0, 10) : "-";
}

function resolveClosedAt(workItem, handoff) {
  const raw = workItem.metadata?.closedAt ?? handoff?.createdAt ?? workItem.metadata?.lastTransition?.appliedAt ?? null;
  return raw ? String(raw).slice(0, 10) : "-";
}

function resolvePriority(workItem) {
  return workItem.metadata?.priority ?? "P0";
}

function resolveDependsOn(workItem) {
  const dependsOn = workItem.metadata?.dependsOn;
  if (Array.isArray(dependsOn) && dependsOn.length > 0) {
    return dependsOn.join(", ");
  }
  if (typeof dependsOn === "string" && dependsOn.trim().length > 0) {
    return dependsOn.trim();
  }
  return "-";
}

function resolveStageForWorkItem(workItem) {
  if (isClosedStatus(workItem.status)) {
    return "planning";
  }
  if (workItem.owner === "developer") {
    return "implementation";
  }
  if (workItem.owner === "tester") {
    return "verification";
  }
  if (workItem.owner === "reviewer") {
    return "review";
  }
  return workItem.status ?? "planning";
}

function describeStageForPacket(currentStage) {
  if (currentStage === "implementation") {
    return "Developer implementation";
  }
  if (currentStage === "verification") {
    return "Tester verification";
  }
  if (currentStage === "review") {
    return "Reviewer closeout review";
  }
  if (currentStage === "planning") {
    return "planning";
  }
  return currentStage ?? "the active workflow stage";
}

function normalizeReadyForCode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized === "approve" ? "approved" : normalized;
}

function findLatestHandoffForWorkItem(handoffs, workItemId) {
  return handoffs.find((handoff) => handoff?.payload?.workItemId === workItemId) ?? null;
}

function titleCaseOwner(owner) {
  const normalized = String(owner ?? "").trim().toLowerCase();
  if (!normalized) {
    return "Planner";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function uniqueList(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|");
}

function normalizeHandoffSummary(summary) {
  if (!summary) {
    return null;
  }
  return String(summary).replace(/^\[[^\]]+\]\s*/, "").trim();
}
