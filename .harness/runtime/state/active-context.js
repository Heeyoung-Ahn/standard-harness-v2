import fs from "node:fs";
import path from "node:path";

import {
  ACTIVE_PROFILES_MARKDOWN,
  GENERATED_DOCS_DIR,
  VALIDATION_REPORT_JSON,
  VALIDATION_REPORT_MARKDOWN
} from "./harness-paths.js";
import { CURRENT_STATE_DOC, TASK_LIST_DOC, calculateChecksum } from "./generate-state-docs.js";
import { decorateCloseoutPackageForCurrentState } from "./closeout-decision.js";
import { prioritizeOpenWorkItems, resolveHandoffExecution } from "./workflow-routing.js";

export const ACTIVE_CONTEXT_JSON = ".agents/runtime/ACTIVE_CONTEXT.json";
export const ACTIVE_CONTEXT_MARKDOWN = ".agents/runtime/ACTIVE_CONTEXT.md";

const CURRENT_STATE_PATH = ".agents/artifacts/CURRENT_STATE.md";
const TASK_LIST_PATH = ".agents/artifacts/TASK_LIST.md";
const IMPLEMENTATION_PLAN_PATH = ".agents/artifacts/IMPLEMENTATION_PLAN.md";
const PROJECT_PROGRESS_PATH = ".agents/artifacts/PROJECT_PROGRESS.md";
const PREVENTIVE_MEMORY_PATH = ".agents/artifacts/PREVENTIVE_MEMORY.md";
const ACTIVE_CONTEXT_SCHEMA_VERSION = "standard-harness-active-context/v2";
const COMPATIBILITY_FIRST_READ_PATHS = new Set([CURRENT_STATE_PATH, TASK_LIST_PATH]);
const REVIEW_REPORT_PATH = "reference/artifacts/REVIEW_REPORT.md";
const REVIEW_REPORT_EXCERPT_DIR = ".agents/runtime/review-report-excerpts";

export function writeActiveContext({ store, repoRoot = process.cwd(), outputDir = repoRoot, validation = null } = {}) {
  const root = path.resolve(repoRoot);
  const generationTimestamp =
    store.getLatestOperationalTimestamp() ?? store.getLatestMutationTimestamp() ?? new Date().toISOString();
  const resolvedValidation = resolveValidationSummary({ repoRoot: root, validation });
  const context = buildActiveContext({
    store,
    repoRoot: root,
    validation: resolvedValidation,
    generatedAt: generationTimestamp
  });
  const jsonPath = path.resolve(outputDir, ACTIVE_CONTEXT_JSON);
  const markdownPath = path.resolve(outputDir, ACTIVE_CONTEXT_MARKDOWN);
  const jsonContent = `${JSON.stringify(context, null, 2)}\n`;
  const markdownContent = renderActiveContextMarkdown(context);
  const sourceRevision = store.getLatestOperationalTimestamp() ?? "empty-store";

  writeText(jsonPath, jsonContent);
  writeText(markdownPath, markdownContent);

  store.refreshProjection({
    projectionName: ACTIVE_CONTEXT_JSON,
    checksum: calculateChecksum(jsonContent),
    generatedAt: generationTimestamp,
    sourceRevision,
    freshnessState: "fresh",
    metadata: {
      bytes: Buffer.byteLength(jsonContent, "utf8"),
      lineCount: jsonContent.split("\n").length,
      format: "json",
      contractDigest: context.reentryContract.digest
    }
  });
  store.refreshProjection({
    projectionName: ACTIVE_CONTEXT_MARKDOWN,
    checksum: calculateChecksum(markdownContent),
    generatedAt: generationTimestamp,
    sourceRevision,
    freshnessState: "fresh",
    metadata: {
      bytes: Buffer.byteLength(markdownContent, "utf8"),
      lineCount: markdownContent.split("\n").length,
      format: "markdown",
      contractDigest: context.reentryContract.digest
    }
  });

  return {
    ok: true,
    command: "context",
    jsonPath,
    markdownPath,
    context
  };
}

export function buildActiveContext({
  store,
  repoRoot = process.cwd(),
  validation = null,
  generatedAt = new Date().toISOString()
} = {}) {
  const root = path.resolve(repoRoot);
  const releaseState = store.getReleaseState("current");
  const workItems = store.listWorkItems();
  const openWorkItems = prioritizeOpenWorkItems(workItems, { repoRoot: root });
  const activeTask = openWorkItems[0] ?? null;
  const recentHandoffs = store.listRecentHandoffs(50);
  const latestHandoff = recentHandoffs[0] ?? null;
  const routeHandoff = resolveRouteHandoff({ activeTask, recentHandoffs, latestHandoff });
  const openDecisions = store.listDecisions({ status: "open", decisionNeeded: true });
  const openRisks = store.listGateRisks({ status: "open" });
  const routeExecution = activeTask?.workItemId ? summarizeRouteExecution(store, activeTask.workItemId) : null;
  const handoffExecution = resolveHandoffExecution({
    repoRoot: root,
    workItems,
    latestHandoff: routeHandoff,
    includeWorkflowDetails: true
  });
  const nextWorkflow =
    handoffExecution.routeStatus === "manual_selection_required" ||
    handoffExecution.routeStatus === "planner_fallback_blocked"
      ? null
      : handoffExecution.workflow;
  const latestHandoffPayload = routeHandoff?.payload ?? {};
  const evidenceWorkItemId = activeTask?.workItemId ?? latestHandoffPayload.workItemId;
  const latestEvidencePaths = compactReviewEvidencePaths({
    repoRoot: root,
    workItemId: evidenceWorkItemId,
    paths: latestHandoffPayload.evidencePaths ?? []
  });
  const latestFixLoopHistory = Array.isArray(latestHandoffPayload.fixLoopHistory)
    ? latestHandoffPayload.fixLoopHistory
    : [];
  const restartContinuity = buildRestartContinuity({
    activeTask,
    latestHandoffPayload,
    handoffExecution,
    nextWorkflow
  });
  const workflowSummary = buildWorkflowSummary({ handoffExecution, workflow: nextWorkflow });
  const workflowReadFirst = normalizePathList(handoffExecution.workflowDetails?.readFirst ?? []);
  const nextRequiredSsot = uniquePathList(
    stripCompatibilityFirstReadPaths(normalizePathList(latestHandoffPayload.requiredSsot ?? []))
  );
  const nextDoNotCross = normalizeTextList(latestHandoffPayload.doNotCross ?? []);
  const activePacket = activeTask?.sourceRef ?? releaseState?.sourceRef ?? null;
  const validationReportPath = relativeFileExists(root, VALIDATION_REPORT_JSON) ? VALIDATION_REPORT_JSON : null;
  const missingGeneratedArtifacts = [
    relativeFileExists(root, VALIDATION_REPORT_JSON) ? null : VALIDATION_REPORT_JSON,
    relativeFileExists(root, VALIDATION_REPORT_MARKDOWN) ? null : VALIDATION_REPORT_MARKDOWN
  ].filter(Boolean);
  const mustReadNext = uniquePathList([
    nextWorkflow,
    ...workflowReadFirst,
    ...nextRequiredSsot,
    ...latestEvidencePaths,
    activePacket,
    validationReportPath
  ]);
  const sourceTrace = uniquePathList([...nextRequiredSsot, ...latestEvidencePaths, activePacket, validationReportPath]);
  const activeTaskSummary = activeTask
    ? {
        workItemId: activeTask.workItemId,
        title: activeTask.title,
        status: activeTask.status,
        owner: activeTask.owner ?? null,
        activeOperatorId: normalizeTextValue(activeTask.metadata?.activeOperatorId),
        activeOperatorLabel: normalizeTextValue(activeTask.metadata?.activeOperatorLabel),
        ownershipClaimedAt: normalizeTextValue(activeTask.metadata?.ownershipClaimedAt),
        ownershipMode: normalizeTextValue(activeTask.metadata?.ownershipMode),
        nextAction: activeTask.nextAction ?? null,
        sourceRef: activeTask.sourceRef ?? null,
        gateProfile: activeTask.metadata?.gateProfile ?? null,
        readyForCode: activeTask.metadata?.readyForCode ?? null,
        deliveryRouteMode: normalizeTextValue(activeTask.metadata?.deliveryRouteMode),
        workflow: nextWorkflow,
        workflowRouteStatus: handoffExecution.routeStatus
      }
    : null;
  const reentryContract = {
    firstRead: ACTIVE_CONTEXT_JSON,
    fallbackHumanView: ACTIVE_CONTEXT_MARKDOWN,
    nextWorkflow,
    workflowRouteStatus: handoffExecution.routeStatus,
    mustReadNext,
    sourceTrace
  };
  reentryContract.digest = calculateChecksum(JSON.stringify(reentryContract));
  const minimumReadSet = buildMinimumReadSet({
    nextWorkflow,
    activePacket,
    nextRequiredSsot,
    latestEvidencePaths
  });
  const fallbackTriggers = buildFallbackTriggers({
    handoffExecution,
    activeTask,
    activePacket,
    openDecisions,
    openRisks,
    validation
  });
  const fallbackReadSet = buildFallbackReadSet({ minimumReadSet, mustReadNext });

  return {
    schemaVersion: ACTIVE_CONTEXT_SCHEMA_VERSION,
    generatedAt,
    project: {
      repoRoot: root,
      name: releaseState?.metadata?.projectName ?? path.basename(root)
    },
    release: {
      stage: releaseState?.currentStage ?? "unknown",
      gate: releaseState?.releaseGateState ?? "unknown",
      focus: releaseState?.currentFocus ?? "unknown",
      goal: releaseState?.releaseGoal ?? "unknown",
      sourceRef: releaseState?.sourceRef ?? null
    },
    selectedLane: activeTaskSummary,
    activeTask: activeTaskSummary,
    minimumReadSet,
    fallbackReadSet,
    fallbackTriggers,
    nextWork: {
      owner: handoffExecution.owner ?? activeTask?.owner ?? routeHandoff?.toRole ?? "planner",
      workflow: nextWorkflow,
      workflowRouteStatus: handoffExecution.routeStatus,
      resolvedBy: handoffExecution.resolvedBy,
      requiredSsot: nextRequiredSsot,
      approvalBoundary: normalizeTextValue(latestHandoffPayload.approvalBoundary),
      doNotCross: nextDoNotCross,
      workflowSummary,
      routeReason: normalizeTextValue(latestHandoffPayload.routeReason),
      evidencePaths: latestEvidencePaths,
      restartContinuity,
      fixLoopHistory: latestFixLoopHistory,
      blockedHumanDiagnostic: latestHandoffPayload.blockedHumanDiagnostic ?? null,
      closeoutPackage: latestHandoffPayload.closeoutPackage ?? null,
      routeExecution,
      action:
        activeTask?.nextAction ??
        latestHandoffPayload.nextFirstAction ??
        "No active task is recorded. Review IMPLEMENTATION_PLAN and the latest handoff."
    },
    reentryContract,
    blockers: openRisks.map((risk) => ({
      riskId: risk.riskId,
      title: risk.title,
      severity: risk.severity,
      unblockCondition: risk.unblockCondition ?? null,
      sourceRef: risk.sourceRef ?? null
    })),
    decisions: openDecisions.map((decision) => ({
      decisionId: decision.decisionId,
      title: decision.title,
      impactSummary: decision.impactSummary,
      sourceRef: decision.sourceRef ?? null
    })),
    latestHandoff: routeHandoff
      ? {
          createdAt: routeHandoff.createdAt,
          fromRole: routeHandoff.fromRole,
          toRole: routeHandoff.toRole,
          summary: routeHandoff.handoffSummary,
          sourceRef: routeHandoff.sourceRef ?? null,
          nextFirstAction: normalizeTextValue(latestHandoffPayload.nextFirstAction),
          requiredSsot: nextRequiredSsot,
          approvalBoundary: normalizeTextValue(latestHandoffPayload.approvalBoundary),
          doNotCross: nextDoNotCross,
          workflowSummary,
          routeReason: normalizeTextValue(latestHandoffPayload.routeReason),
          evidencePaths: latestEvidencePaths,
          restartContinuity,
          fixLoopHistory: latestFixLoopHistory,
          blockedHumanDiagnostic: latestHandoffPayload.blockedHumanDiagnostic ?? null,
          closeoutPackage: latestHandoffPayload.closeoutPackage ?? null
      }
      : null,
    restartContinuity,
    routeExecution,
    validation: validation ?? null,
    missingGeneratedArtifacts,
    generatedDocs: store
      .listGenerationStates()
      .filter(
        (doc) =>
          doc.projectionName !== ACTIVE_CONTEXT_JSON &&
          doc.projectionName !== ACTIVE_CONTEXT_MARKDOWN
      )
      .map((doc) => ({
        projectionName: doc.projectionName,
        generatedAt: doc.generatedAt,
        freshnessState: doc.freshnessState,
        sourceRevision: doc.sourceRevision ?? null
      })),
    sources: {
      currentState: CURRENT_STATE_PATH,
      taskList: TASK_LIST_PATH,
      implementationPlan: IMPLEMENTATION_PLAN_PATH,
      projectProgress: PROJECT_PROGRESS_PATH,
      preventiveMemory: PREVENTIVE_MEMORY_PATH,
      activeProfiles: ACTIVE_PROFILES_MARKDOWN,
      generatedCurrentState: `${GENERATED_DOCS_DIR}/${CURRENT_STATE_DOC}`,
      generatedTaskList: `${GENERATED_DOCS_DIR}/${TASK_LIST_DOC}`,
      validationReport: VALIDATION_REPORT_JSON,
      validationReportMarkdown: VALIDATION_REPORT_MARKDOWN,
      workflowContract: nextWorkflow,
      activePacket
    }
  };
}

function relativeFileExists(repoRoot, relativePath) {
  if (!relativePath) {
    return false;
  }
  return fs.existsSync(path.resolve(repoRoot, relativePath));
}

function buildRestartContinuity({ activeTask, latestHandoffPayload, handoffExecution, nextWorkflow }) {
  const restartIntent = normalizeTextValue(
    latestHandoffPayload.restartIntent ??
      latestHandoffPayload.nextSessionRestartIntent ??
      latestHandoffPayload.nextSessionPriority ??
      latestHandoffPayload.nextSessionFirstAction ??
      latestHandoffPayload.nextFirstAction
  );
  const nextSessionFirstAction = normalizeTextValue(
    latestHandoffPayload.nextSessionFirstAction ??
      latestHandoffPayload.nextFirstAction ??
      latestHandoffPayload.restartIntent ??
      latestHandoffPayload.nextSessionPriority
  );
  const unpersistedWrapUpItems = normalizeTextList(
    latestHandoffPayload.unpersistedWrapUpItems ??
      latestHandoffPayload.unpersistedItems ??
      latestHandoffPayload.unpersistedRestartItems ??
      []
  );
  const evidenceGaps = normalizeTextList(
    latestHandoffPayload.continuityEvidenceGaps ??
      latestHandoffPayload.restartContinuityEvidenceGaps ??
      latestHandoffPayload.restartEvidenceGaps ??
      []
  );

  return {
    status: restartIntent || nextSessionFirstAction || unpersistedWrapUpItems.length || evidenceGaps.length
      ? "present"
      : "not-recorded",
    liveRoute: {
      activeWorkItemId: activeTask?.workItemId ?? null,
      activeStatus: activeTask?.status ?? null,
      activeOwner: activeTask?.owner ?? null,
      workflow: nextWorkflow,
      workflowRouteStatus: handoffExecution?.routeStatus ?? null,
      source: "operational-state"
    },
    restartIntent,
    nextSessionFirstAction,
    unpersistedWrapUpItems,
    evidenceGaps,
    authorityBoundary:
      "Restart intent is PM coordination metadata; it does not approve a lane, Ready For Code, implementation, testing, review, release, or closeout."
  };
}

function resolveRouteHandoff({ activeTask, recentHandoffs, latestHandoff }) {
  if (!activeTask) {
    return latestHandoff;
  }

  return recentHandoffs.find((handoff) => handoffMatchesWorkItem(handoff, activeTask)) ?? null;
}

function handoffMatchesWorkItem(handoff, workItem) {
  if (!handoff || !workItem) {
    return false;
  }

  const payload = handoff.payload ?? {};
  if (payload.workItemId && payload.workItemId === workItem.workItemId) {
    return true;
  }

  if (handoff.sourceRef && workItem.sourceRef && handoff.sourceRef === workItem.sourceRef) {
    return true;
  }

  return false;
}

export function renderActiveContextMarkdown(context) {
  const task = context.selectedLane;
  const handoff = context.latestHandoff;
  const validation = context.validation;
  const lines = [
    "# 활성 컨텍스트",
    "",
    "> GENERATED, DO NOT EDIT. 사람 확인용 human fallback view이며 live write authority는 아니다.",
    "",
    "## 시작 계약",
    `- 첫 AI 재진입 읽기: ${context.reentryContract.firstRead}`,
    `- 사람 확인용 보조 문서: ${context.reentryContract.fallbackHumanView}`,
    "- 복구 명령: node .harness/runtime/state/harness-cli.js context --repair",
    `- 다음 workflow: ${context.nextWork.workflow ?? "수동 선택 필요"}`,
    task
      ? `- 선택된 lane: ${task.workItemId} / ${task.status} / 담당 ${task.owner ?? "미지정"}${renderOperatorMarkdownSuffix(task)}`
      : "- 선택된 lane: 현재 열린 작업 없음",
    `- 계약 digest: ${context.reentryContract.digest}`,
    "",
    "## 최소 읽기 세트",
    ...(context.minimumReadSet?.length
      ? context.minimumReadSet.map((item) => `- ${item}`)
      : ["- 최소 읽기 항목 없음"]),
    "",
    "## 보조 읽기 조건",
    ...(context.fallbackTriggers?.length
      ? context.fallbackTriggers.map((trigger) => `- ${trigger.code}: ${trigger.reason}`)
      : ["- 보조 읽기 조건 없음"]),
    ...(context.fallbackReadSet?.length
      ? context.fallbackReadSet.map((item) => `- 보조 읽기 항목: ${item}`)
      : []),
    "",
    "## 현재 작업",
    `- 단계: ${context.release.stage}`,
    `- 게이트: ${context.release.gate}`,
    `- 초점: ${context.release.focus}`,
    `- 목표: ${context.release.goal}`,
    task
      ? `- 작업: ${task.workItemId} / ${task.title} / Ready For Code ${task.readyForCode ?? "미기록"}${renderOperatorMarkdownSuffix(task)}`
      : "- 작업: 현재 열린 작업 없음",
    "",
    "## 다음 작업",
    `- 다음 담당: ${context.nextWork.owner}`,
    `- 다음 workflow: ${context.nextWork.workflow ?? "수동 선택 필요"}`,
    `- route 상태: ${context.nextWork.workflowRouteStatus}`,
    ...(context.nextWork.workflowSummary?.selectionBasis
      ? [`- workflow 선택 근거: ${context.nextWork.workflowSummary.selectionBasis}`]
      : []),
    ...(context.nextWork.workflowSummary?.contractPath
      ? [`- workflow 계약 경로: ${context.nextWork.workflowSummary.contractPath}`]
      : []),
    ...(context.nextWork.workflowSummary?.entryPreconditionStatus
      ? [`- workflow 진입 상태: ${context.nextWork.workflowSummary.entryPreconditionStatus}`]
      : []),
    `- 다음 행동: ${context.nextWork.action}`,
    ...(context.nextWork.requiredSsot?.length
      ? context.nextWork.requiredSsot.map((item) => `- 다음 작업 기준 SSOT: ${item}`)
      : []),
    ...(context.nextWork.approvalBoundary ? [`- 승인 경계: ${context.nextWork.approvalBoundary}`] : []),
    ...(context.nextWork.doNotCross?.length
      ? context.nextWork.doNotCross.map((item) => `- 넘지 말 것: ${item}`)
      : []),
    ...(context.nextWork.routeReason ? [`- route 사유: ${context.nextWork.routeReason}`] : []),
    ...(context.nextWork.evidencePaths?.length
      ? context.nextWork.evidencePaths.map((item) => `- 증거 경로: ${item}`)
      : []),
    "",
    "## Restart Continuity",
    ...renderRestartContinuityMarkdown(context.restartContinuity),
    "",
    "## Route Execution",
    ...(context.routeExecution
      ? renderRouteExecutionMarkdown(context.routeExecution)
      : ["- route job 기록 없음"]),
    "",
    "## 먼저 다시 읽을 항목",
    ...(context.reentryContract.mustReadNext.length > 0
      ? context.reentryContract.mustReadNext.map((item) => `- ${item}`)
      : ["- 추가 읽기 항목 없음"]),
    "",
    "## 결정과 막힘",
    ...(context.decisions.length > 0
      ? context.decisions.map((decision) => `- 결정 필요: ${decision.decisionId} / ${decision.title}`)
      : ["- 열린 결정 없음"]),
    ...(context.blockers.length > 0
      ? context.blockers.map((blocker) => `- 막힘: ${blocker.riskId} / ${blocker.severity} / ${blocker.title}`)
      : ["- 열린 막힘 없음"]),
    "",
    "## 최근 인계",
    handoff
      ? `- ${handoff.createdAt}: ${handoff.fromRole} -> ${handoff.toRole} / ${handoff.summary}`
      : "- 기록 없음",
    ...(handoff?.requiredSsot?.length ? handoff.requiredSsot.map((item) => `- 인계 기준 SSOT: ${item}`) : []),
    ...(handoff?.approvalBoundary ? [`- 인계 승인 경계: ${handoff.approvalBoundary}`] : []),
    ...(handoff?.doNotCross?.length ? handoff.doNotCross.map((item) => `- 인계 금지선: ${item}`) : []),
    ...(handoff?.routeReason ? [`- 인계 route 사유: ${handoff.routeReason}`] : []),
    ...(handoff?.evidencePaths?.length ? handoff.evidencePaths.map((item) => `- 인계 증거 경로: ${item}`) : []),
    ...(handoff?.restartContinuity ? renderRestartContinuityMarkdown(handoff.restartContinuity, "인계 ") : []),
    "",
    "## 검증 상태",
    validation
      ? `- ${validation.ok ? "통과" : "실패"} / gate ${validation.gateDecision ?? (validation.ok ? "pass" : "hold")} / blocking ${validation.blockingFindingCount}개`
      : "- 아직 이 컨텍스트에 검증 결과가 연결되지 않음",
    "- 의미: 하네스 구조/상태 검증 결과이며 제품/기능 검증 통과를 의미하지 않음",
    "- 제품 evidence 책임: Tester / Reviewer / product-specific acceptance",
    ...(validation?.executedAt ? [`- 마지막 검증 시각: ${validation.executedAt}`] : []),
    ...(validation?.traceSummary
      ? [
          `- semantic trace: ${validation.traceSummary.workItemId ?? "unknown"} / ${validation.traceSummary.semanticTraceStatus ?? "unknown"} / candidate gates ${validation.traceSummary.candidateGateCount ?? 0}개`,
          ...(validation.traceSummary.workflowDisciplineStatus
            ? [
                `- workflow discipline: ${validation.traceSummary.workflowDisciplineStatus} / warning ${validation.traceSummary.workflowDisciplineWarningCount ?? 0} / closeout hold ${validation.traceSummary.workflowDisciplineCloseoutHoldCount ?? 0} / hard error ${validation.traceSummary.workflowDisciplineHardErrorCount ?? 0}`
              ]
            : [])
        ]
      : []),
    "",
    "## 출처",
    ...Object.entries(context.sources).map(([key, value]) => `- ${key}: ${value ?? "없음"}`)
  ];

  return `${lines.join("\n")}\n`;
}

function renderRestartContinuityMarkdown(restartContinuity, prefix = "") {
  if (!restartContinuity) {
    return ["- restart continuity 기록 없음"];
  }
  const liveRoute = restartContinuity.liveRoute ?? {};
  const lines = [
    `- ${prefix}상태: ${restartContinuity.status ?? "unknown"}`,
    `- ${prefix}live route: ${liveRoute.activeWorkItemId ?? "no-active-lane"} / ${liveRoute.activeStatus ?? "none"} / ${liveRoute.activeOwner ?? "none"} / ${liveRoute.workflow ?? "manual-selection"} / ${liveRoute.workflowRouteStatus ?? "unknown"}`,
    `- ${prefix}restart intent: ${restartContinuity.restartIntent ?? "기록 없음"}`,
    `- ${prefix}next-session first action: ${restartContinuity.nextSessionFirstAction ?? "기록 없음"}`,
    `- ${prefix}권한 경계: ${restartContinuity.authorityBoundary ?? "restart intent is not approval"}`
  ];
  if (restartContinuity.unpersistedWrapUpItems?.length) {
    lines.push(...restartContinuity.unpersistedWrapUpItems.map((item) => `- ${prefix}미반영 wrap-up 항목: ${item}`));
  }
  if (restartContinuity.evidenceGaps?.length) {
    lines.push(...restartContinuity.evidenceGaps.map((item) => `- ${prefix}continuity evidence gap: ${item}`));
  }
  return lines;
}

export function resolveValidationSummary({ repoRoot, validation }) {
  const inline = summarizeValidation(validation);
  const persisted = readPersistedValidationSummary(repoRoot);
  if (inline && persisted) {
    return {
      ...persisted,
      ...inline,
      executedAt: inline.executedAt ?? persisted.executedAt ?? null,
      traceSummary: inline.traceSummary ?? persisted.traceSummary ?? null,
      candidateGates: inline.candidateGates ?? persisted.candidateGates ?? []
    };
  }
  if (inline) {
    return inline;
  }
  return persisted;
}

function readPersistedValidationSummary(repoRoot) {
  const reportPath = path.resolve(repoRoot, VALIDATION_REPORT_JSON);
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    return summarizeValidation(report);
  } catch {
    return null;
  }
}

function summarizeValidation(validation) {
  const resolved = validation?.report ?? validation;
  if (!resolved) {
    return null;
  }

  const findings = Array.isArray(resolved.findings) ? resolved.findings : [];
  const blockingFindingCount =
    resolved.blockingFindingCount ??
    findings.filter((item) => item?.severity === "error").length;
  const findingCount = resolved.findingCount ?? findings.length;
  const gateDecision = resolved.gateDecision ?? (resolved.ok ? "pass" : "hold");

  return {
    ok: Boolean(resolved.ok),
    cutoverReady:
      resolved.cutoverReady != null ? Boolean(resolved.cutoverReady) : gateDecision === "pass",
    findingCount,
    blockingFindingCount,
    gateDecision,
    executedAt: resolved.executedAt ?? resolved.generatedAt ?? null,
    traceSummary: summarizeTraceSummary(resolved.traceSummary),
    candidateGates: Array.isArray(resolved.candidateGates) ? resolved.candidateGates : []
  };
}

function summarizeTraceSummary(traceSummary) {
  if (!traceSummary || typeof traceSummary !== "object") {
    return null;
  }

  return {
    path: typeof traceSummary.path === "string" ? traceSummary.path : null,
    workItemId: typeof traceSummary.workItemId === "string" ? traceSummary.workItemId : null,
    packetId: typeof traceSummary.packetId === "string" ? traceSummary.packetId : null,
    turnClosedAt: typeof traceSummary.turnClosedAt === "string" ? traceSummary.turnClosedAt : null,
    semanticTraceStatus:
      typeof traceSummary.semanticTraceStatus === "string" ? traceSummary.semanticTraceStatus : null,
    warningCount:
      typeof traceSummary.warningCount === "number" ? traceSummary.warningCount : 0,
    candidateGateCount:
      typeof traceSummary.candidateGateCount === "number" ? traceSummary.candidateGateCount : 0,
    workflowDisciplineStatus:
      typeof traceSummary.workflowDisciplineStatus === "string" ? traceSummary.workflowDisciplineStatus : null,
    workflowDisciplineWarningCount:
      typeof traceSummary.workflowDisciplineWarningCount === "number"
        ? traceSummary.workflowDisciplineWarningCount
        : 0,
    workflowDisciplineCloseoutHoldCount:
      typeof traceSummary.workflowDisciplineCloseoutHoldCount === "number"
        ? traceSummary.workflowDisciplineCloseoutHoldCount
        : 0,
    workflowDisciplineHardErrorCount:
      typeof traceSummary.workflowDisciplineHardErrorCount === "number"
        ? traceSummary.workflowDisciplineHardErrorCount
        : 0
  };
}

function normalizePathList(values) {
  return uniquePathList(values.map(normalizePathValue));
}

function summarizeWorkflowEntryPrecondition(handoffExecution) {
  if (handoffExecution?.routeStatus === "ready") {
    return "ready";
  }
  if (handoffExecution?.plannerFallback?.blocked) {
    return "blocked";
  }
  if (handoffExecution?.routeStatus === "manual_selection_required") {
    return "unresolved";
  }
  if (handoffExecution?.routeStatus) {
    return "attention";
  }
  return "unknown";
}

function buildWorkflowSummary({ handoffExecution, workflow }) {
  const selectedWorkflow = workflow === "manual_selection_required" ? null : workflow ?? null;
  return {
    selectionBasis: handoffExecution?.resolvedBy ?? null,
    contractPath: selectedWorkflow,
    routeStatus: handoffExecution?.routeStatus ?? null,
    entryPreconditionStatus: summarizeWorkflowEntryPrecondition(handoffExecution)
  };
}

function buildMinimumReadSet({ nextWorkflow, activePacket, nextRequiredSsot, latestEvidencePaths }) {
  return uniquePathList([
    ACTIVE_CONTEXT_JSON,
    nextWorkflow,
    activePacket,
    ...nextRequiredSsot,
    ...latestEvidencePaths,
    VALIDATION_REPORT_JSON
  ]);
}

function compactReviewEvidencePaths({ repoRoot, workItemId, paths }) {
  return uniquePathList(
    (paths ?? []).map((item) => {
      if (item !== REVIEW_REPORT_PATH) {
        return item;
      }
      return writeReviewReportExcerpt({ repoRoot, workItemId }) ?? REVIEW_REPORT_PATH;
    })
  );
}

function writeReviewReportExcerpt({ repoRoot, workItemId }) {
  const absoluteReportPath = path.resolve(repoRoot, REVIEW_REPORT_PATH);
  if (!workItemId || !fs.existsSync(absoluteReportPath)) {
    return null;
  }
  const content = fs.readFileSync(absoluteReportPath, "utf8");
  const sections = extractMarkdownSections(content, "## ");
  const normalizedWorkItem = String(workItemId).toLowerCase();
  const selected = sections.filter((section) => section.toLowerCase().includes(normalizedWorkItem));
  const excerptSections = selected.length > 0 ? selected : sections.slice(0, 1);
  const relativePath = path.posix.join(REVIEW_REPORT_EXCERPT_DIR, `${safeFilePart(workItemId)}-review-report.md`);
  const absoluteExcerptPath = path.resolve(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absoluteExcerptPath), { recursive: true });
  fs.writeFileSync(
    absoluteExcerptPath,
    [
      "# Review Report Excerpt",
      "",
      `- Source: ${REVIEW_REPORT_PATH}`,
      `- Work item: ${workItemId}`,
      "- Scope: active packet matching sections only; full report is fallback-only.",
      "",
      ...excerptSections
    ].join("\n").trimEnd() + "\n",
    "utf8"
  );
  return relativePath;
}

function extractMarkdownSections(content, headingPrefix) {
  const sections = [];
  let current = [];
  for (const line of String(content ?? "").split(/\r?\n/)) {
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

function safeFilePart(value) {
  return String(value ?? "unknown").replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function buildFallbackReadSet({ minimumReadSet, mustReadNext }) {
  return uniquePathList([
    ...minimumReadSet,
    ...mustReadNext,
    ACTIVE_CONTEXT_MARKDOWN,
    CURRENT_STATE_PATH,
    TASK_LIST_PATH,
    VALIDATION_REPORT_MARKDOWN
  ]);
}

function buildFallbackTriggers({ handoffExecution, activeTask, activePacket, openDecisions, openRisks, validation }) {
  const triggers = [];

  if (handoffExecution?.routeStatus && handoffExecution.routeStatus !== "ready") {
    triggers.push({
      code: "route_ambiguity",
      reason: `workflow route status is ${handoffExecution.routeStatus}`
    });
  }

  if (activeTask && normalizeReadyForCode(activeTask.metadata?.readyForCode) !== "approved") {
    triggers.push({
      code: "missing_approval_or_evidence",
      reason: "active task is not Ready For Code approved"
    });
  }

  if (openRisks.length > 0 || openDecisions.length > 0) {
    triggers.push({
      code: "blockers_or_open_decisions",
      reason: `${openRisks.length} blocker(s) and ${openDecisions.length} open decision(s) are recorded`
    });
  }

  if (validation && (!validation.ok || validation.gateDecision !== "pass")) {
    triggers.push({
      code: "validation_mismatch",
      reason: `validation gate is ${validation.gateDecision ?? "unknown"}`
    });
  }

  if (activeTask && !activePacket) {
    triggers.push({
      code: "active_packet_or_fast_path_note_unclear",
      reason: "active task has no active packet or Fast Path Note source"
    });
  }

  return triggers;
}

function summarizeRouteExecution(store, workItemId) {
  const routeJob = store.listRouteJobs({ workItemId })[0] ?? null;
  if (!routeJob) {
    return null;
  }

  const workItem = store.getWorkItem(workItemId);
  const sessions = store.listAgentSessions({ workItemId });
  const events = store.listRouteEvents({ routeJobId: routeJob.routeJobId });
  const latestSession = sessions.at(-1) ?? null;
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
    latestSession: latestSession
      ? {
          sessionId: latestSession.sessionId,
          role: latestSession.role,
          status: latestSession.status,
          executionMode: latestSession.metadata?.executionMode?.mode ?? null,
          contextPath: latestSession.contextPath,
          promptPath: latestSession.promptPath,
          outputPath: latestSession.outputPath
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
    blockedHumanDiagnostic: routeJob.metadata?.blockedHumanDiagnostic ?? null,
    events: events.slice(-5).map((event) => ({
      eventId: event.eventId,
      fromRole: event.fromRole,
      toRole: event.toRole,
      eventType: event.eventType,
      result: event.result,
      createdAt: event.createdAt
    }))
  };
}

function renderRouteExecutionMarkdown(routeExecution) {
  const lines = [
    `- job: ${routeExecution.routeJobId} / ${routeExecution.deliveryRouteMode} / ${routeExecution.status}`,
    `- execution mode: ${routeExecution.executionMode ?? "unknown"}`,
    `- independent review claim: ${routeExecution.canClaimIndependentReview ? "yes" : "no"}`,
    `- current role: ${routeExecution.currentRole ?? "none"}`,
    `- sessions: ${routeExecution.sessionCount}`,
    `- events: ${routeExecution.eventCount}`,
    `- loop count: ${routeExecution.loopCount ?? 0}`,
    `- user input required: ${routeExecution.userInputRequired ? "yes" : "no"}`
  ];

  if (routeExecution.lastFailingRole) {
    lines.push(`- last failing role: ${routeExecution.lastFailingRole}`);
  }
  const sameFindingEntries = Object.entries(routeExecution.sameFindingCounts ?? {});
  if (sameFindingEntries.length > 0) {
    lines.push(
      `- same finding counts: ${sameFindingEntries.map(([key, count]) => `${key}=${count}`).join(", ")}`
    );
  }

  if (routeExecution.latestSession) {
    lines.push(
      `- latest session: ${routeExecution.latestSession.sessionId} / ${routeExecution.latestSession.role} / ${routeExecution.latestSession.status}`
    );
    if (routeExecution.latestSession.executionMode) {
      lines.push(`- latest session execution mode: ${routeExecution.latestSession.executionMode}`);
    }
    if (routeExecution.latestSession.outputPath) {
      lines.push(`- latest output: ${routeExecution.latestSession.outputPath}`);
    }
  }

  if (routeExecution.closeoutPackage?.status) {
    lines.push(`- closeout package: ${routeExecution.closeoutPackage.status}`);
    if (routeExecution.closeoutPackage.evidenceAuthority?.note) {
      lines.push(`- closeout evidence boundary: ${routeExecution.closeoutPackage.evidenceAuthority.note}`);
    }
    if (routeExecution.closeoutPackage.plannerDecisionRequest) {
      lines.push(`- closeout next action: ${routeExecution.closeoutPackage.plannerDecisionRequest}`);
    }
  }

  if (routeExecution.blockedHumanDiagnostic) {
    const diagnostic = routeExecution.blockedHumanDiagnostic;
    lines.push(`- blocked-human diagnostic: ${diagnostic.reason ?? "recorded"}`);
    if (diagnostic.findingKeys?.length) {
      lines.push(`- blocked finding keys: ${diagnostic.findingKeys.join(", ")}`);
    }
    lines.push(`- same finding count: ${diagnostic.sameFindingCount ?? 0}`);
    lines.push(`- full loop count: ${diagnostic.fullLoopCount ?? routeExecution.loopCount ?? 0}`);
  }

  for (const event of routeExecution.events ?? []) {
    lines.push(
      `- event: ${event.createdAt} / ${event.fromRole ?? "none"} -> ${event.toRole ?? "none"} / ${event.eventType} / ${event.result}`
    );
  }

  return lines;
}

function normalizeReadyForCode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approve") {
    return "approved";
  }
  return normalized || null;
}

function normalizeTextList(values) {
  return uniqueTextList((values ?? []).map(normalizeTextValue));
}

function uniquePathList(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizePathValue(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function uniqueTextList(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizeTextValue(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function normalizePathValue(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const backtickMatch = text.match(/^`([^`]+)`$/);
  return backtickMatch ? backtickMatch[1].trim() : text;
}

function normalizeTextValue(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function renderOperatorMarkdownSuffix(task) {
  const operatorLabel = normalizeTextValue(task?.activeOperatorLabel);
  const operatorId = normalizeTextValue(task?.activeOperatorId);
  if (!operatorLabel && !operatorId) {
    return "";
  }

  if (operatorLabel && operatorId && operatorLabel.toLowerCase() !== operatorId.toLowerCase()) {
    return ` / operator ${operatorLabel} (${operatorId})`;
  }
  return ` / operator ${operatorLabel ?? operatorId}`;
}

function stripCompatibilityFirstReadPaths(values) {
  const result = [];

  for (const value of values) {
    const normalized = normalizePathValue(value);
    if (!normalized || COMPATIBILITY_FIRST_READ_PATHS.has(normalized)) {
      continue;
    }
    result.push(normalized);
  }

  return uniquePathList(result);
}

function writeText(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}
