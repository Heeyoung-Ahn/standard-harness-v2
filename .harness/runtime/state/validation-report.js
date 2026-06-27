import fs from "node:fs";
import path from "node:path";

import { buildRoleBrief } from "./agent-routing.js";
import { ACTIVE_CONTEXT_JSON, writeActiveContext } from "./active-context.js";
import { writeGeneratedStateDocs } from "./generate-state-docs.js";
import {
  AGENT_TRACES_DIR,
  ARTIFACT_PATHS,
  VALIDATION_REPORT_JSON,
  VALIDATION_REPORT_MARKDOWN
} from "./harness-paths.js";
import {
  normalizePacketHeaderValue,
  parseDelimitedList,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent
} from "./lib/packet-markdown.js";
import { DEFAULT_DB_PATH } from "./operating-state-store.js";
import {
  readPacketBulletFieldValue,
  readPacketSecurityReviewContract,
  readPacketSemanticTraceContract
} from "./packet-contract.js";
import { RELEASE_BASELINE } from "./release-baseline.js";
import { buildHarnessStatus } from "./status-commands.js";
import { recommendNextActionFromState, runValidator, withStore } from "./validation-core.js";
import { resolveHandoffExecution, selectActiveWorkItem, workflowForOwner } from "./workflow-routing.js";
import { buildContextMeter as buildV24ContextMeter, buildDocRoute as buildV24DocRoute } from "./v2-4-risk-adaptive.js";
import { evaluateRiskAdaptiveGate } from "./risk-adaptive-gates.js";
import {
  applyRequestedSecurityReviewGate,
  buildBootstrapPendingValidationReport
} from "./preflight/validation-report-contract.js";

const AGENT_TRACE_SCHEMA_VERSION = "standard-harness-agent-trace/v2";

const PHASE1_HARD_FAIL_CODES = [
  "missing_required_evidence",
  "broken_source_reference",
  "contradictory_evidence",
  "stale_evidence",
  "required_semantic_trace_missing",
  "validation_report_context_parity_break",
  "active_context_validation_executed_at_mismatch",
  "route_authority_mismatch_known_but_bypassed",
  "workflow_owner_changed_without_structured_routing"
];

const PHASE1_WARNING_CODES = [
  "evidence_linkage_thin",
  "reviewer_rationale_thin",
  "workflow_selection_basis_missing",
  "required_read_evidence_missing_for_workflow_claim",
  "workflow_file_read_but_entry_precondition_bypassed",
  "task_answer_drifted_before_route_state_restoration",
  "role_brief_context_budget_warning"
];

const WORKFLOW_SELECTION_BASIS_VALUES = new Set(["active_task_owner", "latest_handoff", "default_planner"]);

const PHASE1_REVIEWER_ONLY_CODES = [
  "design_intent_fulfillment",
  "work_fit_assessment",
  "domain_specific_business_rule_judgment"
];

const PHASE1_CANDIDATE_GATES = [
  {
    id: "required-evidence-present",
    phase: "candidate-only",
    description: "Required evidence artifacts exist for the active work item."
  },
  {
    id: "source-references-resolve",
    phase: "candidate-only",
    description: "Referenced packet, SSOT, validation, and trace sources resolve locally."
  },
  {
    id: "semantic-trace-present",
    phase: "candidate-only",
    description: "A lightweight semantic trace artifact exists for the active work item."
  },
  {
    id: "evidence-non-contradictory",
    phase: "candidate-only",
    description: "Trace, packet, and active work metadata do not contradict each other."
  },
  {
    id: "evidence-freshness",
    phase: "candidate-only",
    description: "Validation and trace timestamps match the current report turn."
  },
  {
    id: "validation-context-parity",
    phase: "candidate-only",
    description: "Validation report and ACTIVE_CONTEXT expose the same harness state-validation summary."
  }
];

const SECURITY_REVIEW_PACKAGE_MANIFEST_PATHS = [
  "package.json",
  "standard-template/package.json"
];

const SECURITY_REVIEW_RELEASE_ARTIFACT_PATHS = [
  "installer/install-harness.js",
  "installer/INSTALL_HARNESS.cmd",
  "packaging/build-release-package.js",
  "packaging/build-windows-exe-installers.js",
  "reference/manuals/human/HARNESS_MANUAL.md",
  "standard-template/AGENTS.md",
  "standard-template/README.md",
  "standard-template/START_HERE.md",
  "standard-template/reference/manuals/human/HARNESS_MANUAL.md",
  "standard-template/INIT_STANDARD_HARNESS.cmd"
];

const SECURITY_REVIEW_RELEASE_SCRIPTS = ["package:release", "package:windows-exe"];

const LLM_JUDGE_SCHEMA_VERSION = "standard-harness-llm-judge/v1";
const LLM_JUDGE_INPUT_SCHEMA_VERSION = "standard-harness-llm-judge-input-package/v1";
const LLM_JUDGE_RESULT_DIR = ".agents/runtime/judge";
const LLM_JUDGE_ALLOWED_INPUT_FIELDS = [
  "requirementsSummary",
  "modelingImpact",
  "packetAcceptance",
  "diffSummary",
  "testEvidenceResult"
];
const LLM_JUDGE_FORBIDDEN_CONTEXT_KEYS = new Set([
  "chatHistory",
  "fullChat",
  "fullHistory",
  "generatedDocs",
  "implementationChat",
  "rawTranscript",
  "rawWorkspaceDump",
  "transcript",
  "unboundedContext",
  "workspaceDump"
]);

const SECURITY_REVIEW_SECRET_RULES = [
  {
    code: "secret_scan_private_key_detected",
    severity: "error",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    message: "Private key material was detected in a release-facing file.",
    recovery: "Remove the private key material from the release-facing file before internal review."
  },
  {
    code: "secret_scan_aws_access_key_detected",
    severity: "error",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    message: "An AWS access-key-like token was detected in a release-facing file.",
    recovery: "Remove the AWS access-key-like token from the release-facing file before internal review."
  },
  {
    code: "secret_scan_github_token_detected",
    severity: "error",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    message: "A GitHub token-like string was detected in a release-facing file.",
    recovery: "Remove the GitHub token-like string from the release-facing file before internal review."
  },
  {
    code: "secret_scan_slack_token_detected",
    severity: "error",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
    message: "A Slack token-like string was detected in a release-facing file.",
    recovery: "Remove the Slack token-like string from the release-facing file before internal review."
  }
];

const SECURITY_REVIEW_ARTIFACT_AUDIT_RULES = [
  {
    code: "release_artifact_deprecated_operator_console_reference",
    severity: "warning",
    pattern: /\bdeprecated operator console\b|\blegacy operator console\b/i,
    message: "A release-facing artifact still contains deprecated operator-console wording.",
    recovery: "Remove deprecated operator-console wording from shipped release-facing artifacts before internal review."
  },
  {
    code: "release_artifact_security_approval_claim",
    severity: "warning",
    pattern: /\bsecurity approval(?: granted| complete| completed| passed)?\b/i,
    message: "A release-facing artifact appears to overstate local automation as security approval.",
    recovery: "Reword the release-facing artifact so it does not imply that local automation equals final security approval."
  }
];

const SECURITY_REVIEW_REQUIRED_CATEGORIES = [
  {
    id: "secret/credential",
    label: "Secret / credential exposure risk",
    reviewNote: "Local scanning helps, but final sensitivity and rotation judgment remains human-reviewed."
  },
  {
    id: "third-party dependency",
    label: "Third-party dependency risk visibility",
    reviewNote: "Dependency visibility is prepared locally, but final risk acceptance remains human-reviewed."
  },
  {
    id: "shipped artifact/manual/starter payload",
    label: "Shipped artifact / manual / starter payload review",
    reviewNote: "Release-facing artifact review still needs a human check before deployment."
  },
  {
    id: "deployment/cutover evidence",
    label: "Deployment / cutover evidence completeness",
    reviewNote: "Local evidence can be checked for presence, but final operational acceptance remains human-reviewed."
  },
  {
    id: "organization-specific policy/network/environment review",
    label: "Organization-specific policy or network / environment review",
    reviewNote: "Reusable local automation does not close organization-specific policy or environment review."
  }
];

export function writeValidationReport({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  const initialValidation = runValidator({ repoRoot, outputDir, dbPath });
  const bootstrapPending = initialValidation.findings?.find((finding) => finding.code === "starter_bootstrap_pending");
  if (bootstrapPending) {
    const executedAt = new Date().toISOString();
    const report = buildBootstrapPendingValidationReport({
      executedAt,
      validatorVersion: RELEASE_BASELINE.validatorVersion,
      validation: initialValidation,
      candidateGates: PHASE1_CANDIDATE_GATES
    });
    return {
      ok: false,
      command: "validation-report",
      markdownPath: null,
      jsonPath: null,
      report
    };
  }

  const status = buildHarnessStatus({ repoRoot, outputDir, dbPath });
  const root = path.resolve(repoRoot);
  const markdownPath = path.resolve(root, VALIDATION_REPORT_MARKDOWN);
  const jsonPath = path.resolve(root, VALIDATION_REPORT_JSON);
  const executedAt = new Date().toISOString();
  const draftReport = {
    ok: true,
    command: "validation-report",
    validatorVersion: RELEASE_BASELINE.validatorVersion,
    executedAt,
    cutoverReady: true,
    profileSummary: status.activeProfiles,
    riskClassifications: [],
    findings: [],
    nextAction: status.nextAction,
    gateDecision: "pass"
  };
  const draftTraceArtifact = withStore({ dbPath, repoRoot }, (store) =>
    writeAgentTraceArtifact({
      store,
      repoRoot: root,
      outputDir,
      executedAt: draftReport.executedAt,
      report: draftReport
    })
  );
  draftReport.traceSummary = draftTraceArtifact?.summary ?? null;
  draftReport.candidateGates = PHASE1_CANDIDATE_GATES;
  draftReport.riskAdaptive = withStore({ dbPath, repoRoot }, (store) => buildRiskAdaptiveValidationSummary({ repoRoot: root, store }));
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, buildValidationReportMarkdown(draftReport), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(draftReport, null, 2)}\n`, "utf8");
  const validation = runValidator({ repoRoot, outputDir, dbPath });
  const report = {
    ok: validation.ok,
    command: "validation-report",
    validatorVersion: RELEASE_BASELINE.validatorVersion,
    executedAt,
    cutoverReady: validation.cutoverReady,
    profileSummary: status.activeProfiles,
    riskClassifications: validation.riskClassifications ?? [],
    findings: validation.findings,
    nextAction: status.nextAction,
    gateDecision: validation.ok ? "pass" : "hold"
  };
  const traceArtifact = withStore({ dbPath, repoRoot }, (store) =>
    writeAgentTraceArtifact({
      store,
      repoRoot: root,
      outputDir,
      executedAt: report.executedAt,
      report
    })
  );
  report.traceSummary = traceArtifact?.summary ?? null;
  report.candidateGates = PHASE1_CANDIDATE_GATES;
  report.riskAdaptive = withStore({ dbPath, repoRoot }, (store) => buildRiskAdaptiveValidationSummary({ repoRoot: root, store }));

  fs.writeFileSync(markdownPath, buildValidationReportMarkdown(report), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: report
    })
  );
  const finalizedValidation = runValidator({ repoRoot, outputDir, dbPath });
  const finalizedReport = {
    ...report,
    ok: finalizedValidation.ok,
    cutoverReady: finalizedValidation.cutoverReady,
    riskClassifications: finalizedValidation.riskClassifications ?? [],
    findings: finalizedValidation.findings,
    gateDecision: finalizedValidation.ok ? "pass" : "hold"
  };
  finalizedReport.riskAdaptive = withStore({ dbPath, repoRoot }, (store) => buildRiskAdaptiveValidationSummary({ repoRoot: root, store }));
  const securityReview = withStore({ dbPath, repoRoot }, (store) =>
    buildSecurityReviewSummary({
      store,
      repoRoot,
      findings: finalizedReport.findings
    })
  );
  if (securityReview) {
    applyRequestedSecurityReviewGate({ report: finalizedReport, securityReview });
  }
  applyContextBudgetReport({
    report: finalizedReport,
    contextBudgetReport: withStore({ dbPath, repoRoot }, (store) => buildContextBudgetReport({ store, repoRoot: root }))
  });
  applyLlmJudgeReviewReport({
    report: finalizedReport,
    judgeReview: withStore({ dbPath, repoRoot }, (store) => buildLlmJudgeReviewReport({ store, repoRoot: root }))
  });
  finalizedReport.nextAction = withStore({ dbPath, repoRoot }, (store) => {
    const fallback = recommendNextActionFromState(store, finalizedValidation, repoRoot);
    if (securityReview?.summary?.contractStatus === "requested") {
      return recommendSecurityReviewNextAction({
        findings: finalizedReport.findings,
        fallback
      });
    }
    return fallback;
  });
  const finalizedTraceArtifact = withStore({ dbPath, repoRoot }, (store) =>
    writeAgentTraceArtifact({
      store,
      repoRoot: root,
      outputDir,
      executedAt: finalizedReport.executedAt,
      report: finalizedReport
    })
  );
  finalizedReport.traceSummary = finalizedTraceArtifact?.summary ?? null;
  fs.writeFileSync(markdownPath, buildValidationReportMarkdown(finalizedReport), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(finalizedReport, null, 2)}\n`, "utf8");
  withStore({ dbPath, repoRoot }, (store) => writeGeneratedStateDocs({ store, outputDir, repoRoot }));
  withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: finalizedReport
    })
  );
  const settledValidation = runValidator({ repoRoot, outputDir, dbPath });
  const settledReport = {
    ...finalizedReport,
    ok: settledValidation.ok,
    cutoverReady: settledValidation.cutoverReady,
    riskClassifications: settledValidation.riskClassifications ?? [],
    findings: settledValidation.findings,
    gateDecision: settledValidation.ok ? "pass" : "hold"
  };
  if (securityReview) {
    applyRequestedSecurityReviewGate({ report: settledReport, securityReview });
  }
  applyContextBudgetReport({
    report: settledReport,
    contextBudgetReport: withStore({ dbPath, repoRoot }, (store) => buildContextBudgetReport({ store, repoRoot: root }))
  });
  applyLlmJudgeReviewReport({
    report: settledReport,
    judgeReview: withStore({ dbPath, repoRoot }, (store) => buildLlmJudgeReviewReport({ store, repoRoot: root }))
  });
  settledReport.nextAction = withStore({ dbPath, repoRoot }, (store) => {
    const fallback = recommendNextActionFromState(store, settledValidation, repoRoot);
    if (securityReview?.summary?.contractStatus === "requested") {
      return recommendSecurityReviewNextAction({
        findings: settledReport.findings,
        fallback
      });
    }
    return fallback;
  });
  fs.writeFileSync(markdownPath, buildValidationReportMarkdown(settledReport), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(settledReport, null, 2)}\n`, "utf8");
  withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: settledReport
    })
  );

  // One extra validator pass closes the last report/context lag window after transition-time writes.
  const convergedValidation = runValidator({ repoRoot, outputDir, dbPath });
  const convergedReport = {
    ...settledReport,
    ok: convergedValidation.ok,
    cutoverReady: convergedValidation.cutoverReady,
    riskClassifications: convergedValidation.riskClassifications ?? [],
    findings: convergedValidation.findings,
    gateDecision: convergedValidation.ok ? "pass" : "hold"
  };
  if (securityReview) {
    applyRequestedSecurityReviewGate({ report: convergedReport, securityReview });
  }
  applyContextBudgetReport({
    report: convergedReport,
    contextBudgetReport: withStore({ dbPath, repoRoot }, (store) => buildContextBudgetReport({ store, repoRoot: root }))
  });
  applyLlmJudgeReviewReport({
    report: convergedReport,
    judgeReview: withStore({ dbPath, repoRoot }, (store) => buildLlmJudgeReviewReport({ store, repoRoot: root }))
  });
  convergedReport.nextAction = withStore({ dbPath, repoRoot }, (store) => {
    const fallback = recommendNextActionFromState(store, convergedValidation, repoRoot);
    if (securityReview?.summary?.contractStatus === "requested") {
      return recommendSecurityReviewNextAction({
        findings: convergedReport.findings,
        fallback
      });
    }
    return fallback;
  });
  const convergedTraceArtifact = withStore({ dbPath, repoRoot }, (store) =>
    writeAgentTraceArtifact({
      store,
      repoRoot: root,
      outputDir,
      executedAt: convergedReport.executedAt,
      report: convergedReport
    })
  );
  convergedReport.traceSummary = convergedTraceArtifact?.summary ?? null;
  fs.writeFileSync(markdownPath, buildValidationReportMarkdown(convergedReport), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(convergedReport, null, 2)}\n`, "utf8");
  withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: convergedReport
    })
  );

  return {
    ok: convergedReport.ok,
    command: "validation-report",
    markdownPath,
    jsonPath,
    report: convergedReport
  };
}

function buildContextBudgetReport({ store, repoRoot }) {
  const workItems = store.listWorkItems();
  const activeTask = selectActiveWorkItem(workItems, { repoRoot });
  const role = normalizeRoleValue(activeTask?.owner);
  if (!activeTask?.workItemId || !["developer", "tester", "reviewer", "planner", "orchestrator"].includes(role)) {
    return null;
  }

  const brief = buildRoleBrief({
    store,
    repoRoot,
    role,
    workItemId: activeTask.workItemId
  });
  const budget = brief.contextBudget;
  const findings = (budget?.warnings ?? []).map((warning) => ({
    ...warning,
    severity: warning.severity ?? "warning",
    blocking: Boolean(warning.blocking),
    gateEffect: warning.gateEffect ?? "advisory-only",
    path: activeTask.sourceRef ?? null,
    message: `${warning.message} Validation report records this as advisory-only; hard fail is disabled for this phase.`
  }));

  return {
    summary: {
      schemaVersion: budget?.schemaVersion ?? null,
      status: budget?.status ?? "unknown",
      enforcement: budget?.enforcement ?? "warning-only",
      hardFailEnabled: Boolean(budget?.hardFailEnabled),
      severity: budget?.severity ?? (findings.length > 0 ? "warning" : "info"),
      blocking: Boolean(budget?.blocking),
      gateEffect: budget?.gateEffect ?? "advisory-only",
      operatorMessage: budget?.operatorMessage ?? "Context budget diagnostics are advisory unless hardFailEnabled is true.",
      workItemId: activeTask.workItemId,
      role,
      defaultReadSet: budget?.defaultReadSet ?? null,
      fallbackOnlyReadSet: budget?.fallbackOnlyReadSet ?? null,
      overrunRationale: budget?.overrunRationale ?? null,
      outputBudget: budget?.outputBudget ?? null,
      warningCount: findings.length
    },
    findings
  };
}

function buildRiskAdaptiveValidationSummary({ repoRoot, store = null }) {
  const routePath = path.join(repoRoot, ".agents/runtime/DOC_ROUTE.json");
  let route = null;
  try {
    route = fs.existsSync(routePath) ? JSON.parse(fs.readFileSync(routePath, "utf8")) : null;
  } catch {
    route = null;
  }
  const activeTask = store ? selectActiveWorkItem(store.listWorkItems(), { repoRoot }) : null;
  const packetPath = activeTask?.sourceRef ?? null;
  const packetContent = packetPath && fs.existsSync(path.resolve(repoRoot, packetPath))
    ? fs.readFileSync(path.resolve(repoRoot, packetPath), "utf8")
    : "";
  const gateStage = activeTask?.owner === "planner" || !activeTask?.owner ? "implementation-transition" : isTerminalValidationOwner(activeTask.owner) ? "closeout" : "planning-open";
  const riskGate = packetContent
    ? evaluateRiskAdaptiveGate({
        repoRoot,
        content: packetContent,
        packetPath,
        stage: gateStage,
        effectiveRisk: readValidationPacketRisk(packetContent),
        changedFiles: []
      })
    : null;
  const effectiveRoute = riskGate
    ? buildV24DocRoute({ lane: riskGate.lane, phase: riskGate.phase, risk: riskGate.effectiveRisk, riskOverlays: riskGate.riskOverlays, changedFiles: riskGate.changedFiles })
    : route && typeof route === "object"
      ? route
      : buildV24DocRoute({ lane: "standard", phase: "day-start" });
  const meter = buildV24ContextMeter({
    repoRoot,
    lane: effectiveRoute.lane ?? "standard",
    phase: effectiveRoute.phase ?? "day-start",
    route: effectiveRoute,
    readFiles: effectiveRoute.read ?? []
  });
  const overlayEvidence = [];
  for (const overlay of effectiveRoute.riskOverlays ?? []) {
    if (overlay === "dependency-sensitive") overlayEvidence.push("dependency intake evidence required before dependency implementation/closeout");
    if (overlay === "secret-sensitive") overlayEvidence.push("secret scan evidence required before implementation/closeout/release");
    if (overlay === "untrusted-content") overlayEvidence.push("untrusted content digest/strip evidence required");
    if (overlay === "guard-mode") overlayEvidence.push("guard/freeze edit-boundary evidence required");
    if (overlay === "abstention-required") overlayEvidence.push("reproduction/abstention decision evidence required");
    if (overlay === "browser-evidence") overlayEvidence.push("browser evidence digest required when UI behavior is in scope");
    if (overlay === "evidence-quality") overlayEvidence.push("evidence quality digest required before closeout");
    if (overlay === "release-canary") overlayEvidence.push("release/canary evidence required before release closeout");
  }
  return {
    schemaVersion: "standard-harness-v2.5-validation-summary/v1",
    gateEffect: "blocking-in-packet-preflight-and-transition",
    activeWorkItemId: activeTask?.workItemId ?? null,
    packetPath,
    gateStage,
    lane: effectiveRoute.lane ?? "standard",
    phase: effectiveRoute.phase ?? "day-start",
    riskOverlays: effectiveRoute.riskOverlays ?? [],
    readCount: effectiveRoute.read?.length ?? 0,
    targetTokens: effectiveRoute.budget?.targetTokens ?? meter.targetTokens,
    maxDocuments: effectiveRoute.budget?.maxDocuments ?? meter.maxDocuments,
    contextBudgetStatus: meter.budgetStatus,
    estimatedTokensRead: meter.estimatedTokensRead,
    humanManualAutoRead: (effectiveRoute.read ?? []).some((rel) => rel.includes("reference/manuals/human") || rel === "START_HERE.md"),
    overlayEvidence,
    diagnostics: riskGate?.diagnostics ?? [],
    blocking: Boolean(riskGate?.blocking),
    nextAction: riskGate?.blocking
      ? "Resolve V2.5 risk-adaptive gate diagnostics before implementation transition or closeout."
      : overlayEvidence.length > 0
        ? "Attach overlay digest evidence before the stage that requires it; packet-preflight/transition now enforce required overlays."
        : "No V2.5 risk overlay evidence is currently routed; keep default context lean."
  };
}

function isTerminalValidationOwner(owner) {
  const normalized = String(owner ?? "").toLowerCase();
  return ["tester", "reviewer", "orchestrator", "deployer"].includes(normalized);
}

function readValidationPacketRisk(content) {
  const value =
    readPacketHeaderValueFromContent(content, "Risk class") ??
    readPacketHeaderValueFromContent(content, "Risk if started now") ??
    readPacketBulletFieldValueFromContent(content, "Risk class") ??
    readPacketBulletFieldValueFromContent(content, "Risk if started now");
  const normalized = normalizePacketHeaderValue(value);
  return ["low", "normal", "high", "critical"].includes(normalized) ? normalized : "normal";
}

function applyContextBudgetReport({ report, contextBudgetReport }) {
  if (!contextBudgetReport) {
    report.contextBudget = null;
    return report;
  }
  report.contextBudget = contextBudgetReport.summary;
  report.findings = dedupeFindings([...report.findings, ...contextBudgetReport.findings]);
  const hasBlockingFinding = report.findings.some((finding) => finding?.severity === "error");
  report.ok = !hasBlockingFinding;
  report.cutoverReady = !hasBlockingFinding;
  report.gateDecision = hasBlockingFinding ? "hold" : "pass";
  return report;
}

function buildLlmJudgeReviewReport({ store, repoRoot }) {
  const workItems = store.listWorkItems();
  const activeTask = selectActiveWorkItem(workItems, { repoRoot });
  if (!activeTask?.workItemId) {
    return null;
  }

  const packetPath = activeTask.sourceRef ?? null;
  const packetAbsolutePath = packetPath ? path.resolve(repoRoot, packetPath) : null;
  const packetExists = Boolean(packetAbsolutePath && fs.existsSync(packetAbsolutePath));
  const sourceRefs = [
    buildJudgeSourceRef("requirementsSummary", ARTIFACT_PATHS.requirements, repoRoot),
    buildJudgeSourceRef("modelingImpact", packetPath, repoRoot),
    buildJudgeSourceRef("packetAcceptance", packetPath, repoRoot),
    buildJudgeSourceRef("diffSummary", packetPath, repoRoot),
    buildJudgeSourceRef("testEvidenceResult", VALIDATION_REPORT_JSON, repoRoot)
  ];
  const missingSourceRefs = sourceRefs.filter((sourceRef) => sourceRef.status !== "present");
  const packetContent = packetExists ? fs.readFileSync(packetAbsolutePath, "utf8") : "";
  const inputPackage = {
    schemaVersion: LLM_JUDGE_INPUT_SCHEMA_VERSION,
    status: missingSourceRefs.length === 0 ? "ready" : "source-missing",
    allowedInputFields: LLM_JUDGE_ALLOWED_INPUT_FIELDS,
    forbiddenContextPolicy: "full chat/history, raw transcripts, unbounded generated docs, and workspace dumps are excluded",
    sourceRefs,
    inputs: {
      requirementsSummary: {
        sourceRef: ARTIFACT_PATHS.requirements,
        summary: summarizeMarkdownFile(path.resolve(repoRoot, ARTIFACT_PATHS.requirements))
      },
      modelingImpact: {
        sourceRef: packetPath,
        status: packetContent ? readPacketBulletFieldValue(packetContent, "Modeling impact status") ?? "not-declared" : "missing"
      },
      packetAcceptance: {
        sourceRef: packetPath,
        summary: packetContent ? summarizeMarkdownSection(packetContent, "10. Acceptance") : "missing"
      },
      diffSummary: {
        sourceRef: packetPath,
        summary: "Use packet-declared changed-file/classification evidence and implementation closeout diff summary; raw workspace dumps are excluded."
      },
      testEvidenceResult: {
        sourceRef: VALIDATION_REPORT_JSON,
        summary: "Use current validation-report gate decision, findings, and explicit test evidence; this is not product verification."
      }
    }
  };

  const resultArtifact = readLlmJudgeResultArtifact({ repoRoot, workItemId: activeTask.workItemId });
  const forbiddenContextDiagnostics = findForbiddenJudgeContext(resultArtifact?.raw ?? null);
  const result = normalizeLlmJudgeResult({ resultArtifact, forbiddenContextDiagnostics });
  const status =
    forbiddenContextDiagnostics.length > 0
      ? "invalid-context"
      : result.status === "concern"
        ? "concern"
        : result.status === "pass"
          ? "pass"
          : "not-run";

  return {
    schemaVersion: LLM_JUDGE_SCHEMA_VERSION,
    status,
    gateEffect: "advisory-only",
    workItemId: activeTask.workItemId,
    packetPath,
    providerInvocation: "not-used",
    contextPackage: inputPackage,
    result,
    diagnostics: [
      ...missingSourceRefs.map((sourceRef) => ({
        code: "llm_judge_source_ref_missing",
        severity: "warning",
        field: sourceRef.field,
        path: sourceRef.path,
        message: "Judge context source reference is missing; judge evidence cannot claim source-traced completeness."
      })),
      ...forbiddenContextDiagnostics
    ]
  };
}

function buildJudgeSourceRef(field, relativePath, repoRoot) {
  if (!relativePath) {
    return { field, path: null, status: "missing" };
  }
  return {
    field,
    path: relativePath,
    status: fs.existsSync(path.resolve(repoRoot, relativePath)) ? "present" : "missing"
  };
}

function summarizeMarkdownFile(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return "missing";
  }
  return summarizeText(fs.readFileSync(absolutePath, "utf8"));
}

function summarizeMarkdownSection(content, headingText) {
  const lines = String(content ?? "").split(/\r?\n/);
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(headingText)}\\s*$`, "i");
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (start === -1) {
    return "section missing";
  }
  const sectionLines = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      break;
    }
    sectionLines.push(lines[index]);
  }
  return summarizeText(sectionLines.join("\n"));
}

function summarizeText(value) {
  const normalized = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 8)
    .join(" ");
  return normalized.length > 360 ? `${normalized.slice(0, 357)}...` : normalized || "none";
}

function readLlmJudgeResultArtifact({ repoRoot, workItemId }) {
  const relativePath = `${LLM_JUDGE_RESULT_DIR}/${workItemId}.json`;
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      raw: null,
      parseError: null,
      missing: true
    };
  }
  try {
    return {
      path: relativePath,
      raw: JSON.parse(fs.readFileSync(absolutePath, "utf8")),
      parseError: null,
      missing: false
    };
  } catch (error) {
    return {
      path: relativePath,
      raw: null,
      parseError: error instanceof Error ? error.message : String(error),
      missing: false
    };
  }
}

function normalizeLlmJudgeResult({ resultArtifact, forbiddenContextDiagnostics }) {
  if (!resultArtifact || resultArtifact.missing) {
    return {
      status: "not-run",
      sourceMode: "not-run",
      sourcePath: resultArtifact?.path ?? null,
      canClaimLiveIndependentReview: false,
      rationale: "No LLM judge result artifact exists for this work item.",
      findings: [],
      disagreements: []
    };
  }
  if (resultArtifact.parseError) {
    return {
      status: "invalid",
      sourceMode: "invalid",
      sourcePath: resultArtifact.path,
      canClaimLiveIndependentReview: false,
      rationale: `Judge result artifact could not be parsed: ${resultArtifact.parseError}`,
      findings: [],
      disagreements: []
    };
  }
  if (forbiddenContextDiagnostics.length > 0) {
    return {
      status: "invalid-context",
      sourceMode: normalizeJudgeSourceMode(resultArtifact.raw?.mode),
      sourcePath: resultArtifact.path,
      canClaimLiveIndependentReview: false,
      rationale: "Judge result artifact included forbidden full-context fields and was rejected.",
      findings: [],
      disagreements: []
    };
  }

  const sourceMode = normalizeJudgeSourceMode(resultArtifact.raw?.mode);
  const allowedMode = ["manual", "mock"].includes(sourceMode);
  const status = normalizeJudgeResultStatus(resultArtifact.raw?.status);
  return {
    status: allowedMode ? status : "invalid",
    sourceMode,
    sourcePath: resultArtifact.path,
    canClaimLiveIndependentReview: false,
    rationale: allowedMode
      ? String(resultArtifact.raw?.rationale ?? "Judge result artifact was recorded as advisory evidence.")
      : "First-wave judge evidence accepts only manual or mock result artifacts.",
    findings: normalizeJudgeEntries(resultArtifact.raw?.findings),
    disagreements: normalizeJudgeEntries(resultArtifact.raw?.disagreements)
  };
}

function normalizeJudgeSourceMode(value) {
  const normalized = String(value ?? "manual").trim().toLowerCase();
  return normalized || "manual";
}

function normalizeJudgeResultStatus(value) {
  const normalized = String(value ?? "not-run").trim().toLowerCase();
  return ["pass", "concern", "not-run"].includes(normalized) ? normalized : "concern";
}

function normalizeJudgeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => ({
      code: String(entry?.code ?? "llm_judge_advisory").trim(),
      message: String(entry?.message ?? entry ?? "").trim(),
      sourceRef: typeof entry?.sourceRef === "string" ? entry.sourceRef : null
    }))
    .filter((entry) => entry.message.length > 0);
}

function findForbiddenJudgeContext(value, trail = []) {
  if (!value || typeof value !== "object") {
    return [];
  }
  const findings = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (LLM_JUDGE_FORBIDDEN_CONTEXT_KEYS.has(key)) {
      findings.push({
        code: "llm_judge_forbidden_context",
        severity: "warning",
        field: nextTrail.join("."),
        path: null,
        message: `Judge evidence includes forbidden context field '${nextTrail.join(".")}'.`
      });
      continue;
    }
    if (nestedValue && typeof nestedValue === "object") {
      findings.push(...findForbiddenJudgeContext(nestedValue, nextTrail));
    }
  }
  return findings;
}

function applyLlmJudgeReviewReport({ report, judgeReview }) {
  report.llmJudge = judgeReview;
  return report;
}

function normalizeSecurityReviewScopeEntry(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "package manifest" || normalized === "package manifests") {
    return "package manifests";
  }
  if (normalized === "release artifact" || normalized === "release artifacts" || normalized === "release-facing artifacts") {
    return "release-facing artifacts";
  }
  if (
    normalized === "declared path" ||
    normalized === "declared paths" ||
    normalized === "declared security/release path" ||
    normalized === "declared security/release paths"
  ) {
    return "declared security/release paths";
  }
  return null;
}

function normalizeSecurityReviewStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "not-requested";
  }
  if (normalized === "requested" || normalized === "request" || normalized === "enabled" || normalized === "on") {
    return "requested";
  }
  return "not-requested";
}

function normalizeSemanticTraceEvidenceStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "not-requested";
  }
  if (normalized === "requested" || normalized === "request" || normalized === "enabled" || normalized === "on") {
    return "requested";
  }
  return "not-requested";
}

function normalizeWorkflowSelectionBasis(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return WORKFLOW_SELECTION_BASIS_VALUES.has(normalized) ? normalized : null;
}

function classifyWorkflowDisciplineAction(nextAction) {
  const normalized = String(nextAction ?? "").trim().toLowerCase();
  if (!normalized) {
    return "unknown";
  }
  if (
    /\b(plan|planning|requirements?|decompose|decomposition|organize|organise|clarify|triage|review meaning|review scope|review architecture|open the next planning lane|choose the next approved lane)\b/.test(
      normalized
    )
  ) {
    return "planning";
  }
  if (/\b(test|tester|verify|verification|validate|validation|qa)\b/.test(normalized)) {
    return "verification";
  }
  if (/\b(closeout|reviewer|review readiness|packet exit|approve|approval|sign off|signoff)\b/.test(normalized)) {
    return "approval_or_closeout";
  }
  if (
    /\b(implement|implementation|modify|change|edit|update|write|create|add|remove|delete|rename|refactor|patch|fix|migrate|sync|regenerate|apply)\b/.test(
      normalized
    )
  ) {
    return "mutation";
  }
  return "unknown";
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

function buildWorkflowDisciplineTrace({
  activeTask,
  handoffExecution,
  latestHandoff,
  declaredReadEvidence
}) {
  const selectedWorkflow =
    handoffExecution?.workflow === "manual_selection_required" ? null : handoffExecution?.workflow ?? null;
  const nextAction = activeTask?.nextAction ?? latestHandoff?.payload?.nextFirstAction ?? null;
  const nextActionClass = classifyWorkflowDisciplineAction(nextAction);
  return {
    selectedOwner: handoffExecution?.owner ?? activeTask?.owner ?? null,
    workflowSelectionBasis: normalizeWorkflowSelectionBasis(handoffExecution?.resolvedBy),
    workflowContractPath: selectedWorkflow,
    workflowRouteStatus: handoffExecution?.routeStatus ?? null,
    entryPreconditionStatus: summarizeWorkflowEntryPrecondition(handoffExecution),
    plannerFallbackBlocked: Boolean(handoffExecution?.plannerFallback?.blocked),
    nextActionClass,
    mutatingIntentDetected: nextActionClass !== "planning" && nextActionClass !== "unknown",
    routeReason: latestHandoff?.payload?.routeReason ?? null,
    requiredReadEvidence: {
      activeContextDeclared: declaredReadEvidence.includes(ACTIVE_CONTEXT_JSON),
      packetDeclared: activeTask?.sourceRef ? declaredReadEvidence.includes(activeTask.sourceRef) : false,
      workflowContractDeclared: selectedWorkflow ? declaredReadEvidence.includes(selectedWorkflow) : false
    }
  };
}

function summarizeWorkflowDisciplineSignals({ workflowDiscipline, role, handoff }) {
  const warnings = [];
  const closeoutHolds = [];
  const hardErrors = [];
  if (!workflowDiscipline?.workflowSelectionBasis) {
    warnings.push("workflow_selection_basis_missing");
  }
  const workflowClaimed = Boolean(workflowDiscipline?.workflowContractPath);
  const missingReadEvidence = [];
  if (workflowClaimed && workflowDiscipline?.requiredReadEvidence?.activeContextDeclared !== true) {
    missingReadEvidence.push(ACTIVE_CONTEXT_JSON);
  }
  if (workflowClaimed && workflowDiscipline?.requiredReadEvidence?.packetDeclared !== true) {
    missingReadEvidence.push("active_packet");
  }
  if (workflowClaimed && workflowDiscipline?.requiredReadEvidence?.workflowContractDeclared !== true) {
    missingReadEvidence.push(workflowDiscipline.workflowContractPath);
  }
  if (missingReadEvidence.length > 0) {
    closeoutHolds.push("required_read_evidence_missing_for_workflow_claim");
  }
  if (
    workflowClaimed &&
    workflowDiscipline?.requiredReadEvidence?.workflowContractDeclared === true &&
    workflowDiscipline?.entryPreconditionStatus === "blocked"
  ) {
    closeoutHolds.push("workflow_file_read_but_entry_precondition_bypassed");
  }
  if (
    workflowDiscipline?.entryPreconditionStatus === "blocked" &&
    workflowDiscipline?.mutatingIntentDetected === true
  ) {
    hardErrors.push("route_authority_mismatch_known_but_bypassed");
  }
  if (
    workflowDiscipline?.entryPreconditionStatus === "blocked" &&
    workflowDiscipline?.workflowSelectionBasis &&
    workflowDiscipline.workflowSelectionBasis !== "active_task_owner"
  ) {
    warnings.push("task_answer_drifted_before_route_state_restoration");
  }
  if (handoff?.toRole && role && handoff.toRole !== role) {
    hardErrors.push("workflow_owner_changed_without_structured_routing");
  }
  return {
    warnings: [...new Set(warnings)],
    closeoutHolds: [...new Set(closeoutHolds)],
    hardErrors: [...new Set(hardErrors)]
  };
}

function normalizeSecurityReviewRuntimeContract(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {
      status: null,
      scope: [],
      declaredPaths: []
    };
  }
  return {
    status: metadata.status ?? null,
    scope: parseDelimitedList(metadata.scope),
    declaredPaths: parseDelimitedList(metadata.declaredPaths)
  };
}

function resolveSecurityReviewContract({ activeWorkItem, repoRoot }) {
  if (!activeWorkItem) {
    return null;
  }

  const runtimeContract = normalizeSecurityReviewRuntimeContract(activeWorkItem.metadata?.securityReviewEvidence);
  const packetContract = readPacketSecurityReviewContract(repoRoot, activeWorkItem.sourceRef);
  const requested = normalizeSecurityReviewStatus(runtimeContract.status ?? packetContract.status) === "requested";
  const activationSource = runtimeContract.status ? "runtime metadata" : packetContract.status ? "packet metadata" : "not declared";
  const checkedScope = uniqueStringList(
    [...runtimeContract.scope, ...packetContract.scope]
      .map((entry) => normalizeSecurityReviewScopeEntry(entry))
      .filter(Boolean)
  );
  const declaredPaths = uniqueStringList([...runtimeContract.declaredPaths, ...packetContract.declaredPaths]);
  const includeDeclaredPaths = checkedScope.includes("declared security/release paths");
  const resolvedDeclaredPaths = includeDeclaredPaths
    ? declaredPaths.filter((relativePath) => fs.existsSync(path.resolve(repoRoot, relativePath)))
    : [];
  const unresolvedDeclaredPaths = includeDeclaredPaths
    ? declaredPaths.filter((relativePath) => !fs.existsSync(path.resolve(repoRoot, relativePath)))
    : [];

  return {
    requested,
    contractStatus: requested ? "requested" : "not-applicable",
    activationSource,
    checkedScope,
    declaredPaths,
    resolvedDeclaredPaths,
    unresolvedDeclaredPaths,
    includeDeclaredPaths,
    packageManifestPaths: checkedScope.includes("package manifests") ? SECURITY_REVIEW_PACKAGE_MANIFEST_PATHS : [],
    releaseArtifactPaths: checkedScope.includes("release-facing artifacts") ? SECURITY_REVIEW_RELEASE_ARTIFACT_PATHS : []
  };
}

function normalizeSemanticTraceRuntimeContract(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {
      status: null
    };
  }
  return {
    status: metadata.status ?? null
  };
}

function resolveSemanticTraceContract({ activeWorkItem, repoRoot }) {
  if (!activeWorkItem) {
    return null;
  }

  const runtimeContract = normalizeSemanticTraceRuntimeContract(activeWorkItem.metadata?.semanticTraceEvidence);
  const packetContract = readPacketSemanticTraceContract(repoRoot, activeWorkItem.sourceRef);
  const requested = normalizeSemanticTraceEvidenceStatus(runtimeContract.status ?? packetContract.status) === "requested";

  return {
    requested,
    contractStatus: requested ? "requested" : "not-requested",
    activationSource: runtimeContract.status ? "runtime metadata" : packetContract.status ? "packet metadata" : "not declared"
  };
}

function buildSecurityReviewSummary({ store, repoRoot, findings = [] }) {
  const activeWorkItem = selectActiveWorkItem(store.listWorkItems(), { repoRoot });
  const contract = resolveSecurityReviewContract({ activeWorkItem, repoRoot });
  if (!contract) {
    return null;
  }

  if (!contract.requested) {
    return {
      additionalFindings: [],
      summary: {
        contractStatus: "not-applicable",
        activationSource: contract.activationSource,
        notApplicableReason: "Reusable security-review evidence is not requested by current packet/runtime metadata."
      }
    };
  }

  const contractFindings = [];
  if (contract.checkedScope.length === 0) {
    contractFindings.push({
      code: "security_review_scope_missing",
      severity: "error",
      message: "Reusable security-review evidence was requested, but no declared security-review scope was provided.",
      recovery: "Declare package manifests, release-facing artifacts, and any explicit security/release paths before rerunning validation."
    });
  }
  if (contract.includeDeclaredPaths && contract.declaredPaths.length === 0) {
    contractFindings.push({
      code: "security_review_declared_paths_missing",
      severity: "error",
      message:
        "Reusable security-review evidence requested declared security/release paths, but no explicit declared paths were provided.",
      recovery: "Add explicit declared security/release paths to the packet/runtime metadata before rerunning validation."
    });
  }
  for (const relativePath of contract.unresolvedDeclaredPaths) {
    contractFindings.push({
      code: "security_review_declared_path_missing",
      severity: "error",
      path: relativePath,
      message: `Declared security/release evidence path does not resolve locally. (${relativePath})`,
      recovery: "Fix or remove the unresolved declared security/release path before rerunning validation."
    });
  }

  const dependencyInventory = buildDependencyInventory(repoRoot, {
    packageManifestPaths: contract.packageManifestPaths
  });
  const releaseArtifactAudit = buildReleaseArtifactAudit(repoRoot, {
    checkedPaths: [...contract.releaseArtifactPaths, ...contract.resolvedDeclaredPaths]
  });
  const secretScan = buildLocalSecretScan({
    repoRoot,
    scanPaths: [
      ...dependencyInventory.scanPaths,
      ...releaseArtifactAudit.checkedArtifacts.map((artifact) => artifact.path)
    ]
  });
  const additionalFindings = [...contractFindings, ...secretScan.findings, ...releaseArtifactAudit.findings];
  const combinedFindings = [...findings, ...additionalFindings];
  const blockingErrors = combinedFindings.filter((finding) => finding?.severity === "error");
  const warnings = combinedFindings.filter((finding) => finding?.severity === "warning");

  return {
    additionalFindings,
    summary: {
      contractStatus: "requested",
      activationSource: contract.activationSource,
      summaryStatus: blockingErrors.length > 0 ? "blocking findings present" : warnings.length > 0 ? "attention needed" : "pre-review baseline checked",
      checkedScope: contract.checkedScope,
      declaredPaths: contract.declaredPaths,
      blockingErrorFindings: blockingErrors.map((finding) => summarizeSecurityFinding(finding)),
      warningFindings: warnings.map((finding) => summarizeSecurityFinding(finding)),
      reviewRequiredCategories: SECURITY_REVIEW_REQUIRED_CATEGORIES,
      operatorNextActions: buildSecurityReviewNextActions({ blockingErrors, warnings }),
      humanReviewStillRequired: [
        "Internal IT/security review is still required for the listed review-required capability categories.",
        "Local automation prepares reusable evidence only. It does not grant formal security approval."
      ],
      outOfScopeNote:
        "This summary is for internal IT/security review preparation only. It does not replace hosted CI, organization-specific approval forms, project-specific runbooks, or formal security approval.",
      dependencyInventory: dependencyInventory.summary,
      localSecretScan: secretScan.summary,
      releaseArtifactAudit: releaseArtifactAudit.summary
    }
  };
}

function buildDependencyInventory(repoRoot, { packageManifestPaths = SECURITY_REVIEW_PACKAGE_MANIFEST_PATHS } = {}) {
  const packages = packageManifestPaths
    .map((relativePath) => readPackageInventory(repoRoot, relativePath, inferPackageLabel(relativePath)))
    .filter(Boolean);

  return {
    scanPaths: packages.map((pkg) => pkg.path),
    summary: {
      packages,
      releaseScripts: packages.flatMap((pkg) =>
        pkg.releaseScripts.map((script) => ({
          packageLabel: pkg.packageLabel,
          script
        }))
      )
    }
  };
}

function inferPackageLabel(relativePath) {
  if (relativePath === "package.json") {
    return "root";
  }
  if (relativePath === "standard-template/package.json") {
    return "standard-template";
  }
  return relativePath;
}

function readPackageInventory(repoRoot, relativePath, packageLabel) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  return {
    path: relativePath,
    packageLabel,
    packageName: packageJson.name ?? "(unnamed package)",
    nodeEngine: packageJson.engines?.node ?? "not declared",
    directDependencies: Object.keys(packageJson.dependencies ?? {}),
    directDevDependencies: Object.keys(packageJson.devDependencies ?? {}),
    releaseScripts: SECURITY_REVIEW_RELEASE_SCRIPTS.filter((script) => packageJson.scripts?.[script])
  };
}

function buildReleaseArtifactAudit(repoRoot, { checkedPaths = SECURITY_REVIEW_RELEASE_ARTIFACT_PATHS } = {}) {
  const checkedArtifacts = uniqueStringList(checkedPaths).filter((relativePath) =>
    fs.existsSync(path.resolve(repoRoot, relativePath))
  ).map((relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    return {
      path: relativePath,
      exists: true,
      byteLength: fs.readFileSync(absolutePath).byteLength
    };
  });
  const findings = [];

  for (const artifact of checkedArtifacts) {
    const absolutePath = path.resolve(repoRoot, artifact.path);
    const content = readTextArtifact(absolutePath);
    if (content == null) {
      continue;
    }

    for (const rule of SECURITY_REVIEW_ARTIFACT_AUDIT_RULES) {
      if (!rule.pattern.test(content)) {
        continue;
      }
      findings.push({
        code: rule.code,
        severity: rule.severity,
        path: artifact.path,
        message: `${rule.message} (${artifact.path})`,
        recovery: rule.recovery
      });
    }
  }

  return {
    checkedArtifacts,
    findings,
    summary: {
      checkedArtifacts,
      findingCount: findings.length
    }
  };
}

function buildLocalSecretScan({ repoRoot, scanPaths }) {
  const findings = [];
  const uniquePaths = uniqueStringList(scanPaths);

  for (const relativePath of uniquePaths) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const content = readTextArtifact(absolutePath);
    if (content == null) {
      continue;
    }

    for (const rule of SECURITY_REVIEW_SECRET_RULES) {
      if (!rule.pattern.test(content)) {
        continue;
      }
      findings.push({
        code: rule.code,
        severity: rule.severity,
        path: relativePath,
        message: `${rule.message} (${relativePath})`,
        recovery: rule.recovery
      });
    }
  }

  return {
    findings,
    summary: {
      scannedPaths: uniquePaths,
      findingCount: findings.length,
      scanRuleCount: SECURITY_REVIEW_SECRET_RULES.length
    }
  };
}

function readTextArtifact(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

function summarizeSecurityFinding(finding) {
  return {
    code: finding.code,
    message: finding.message,
    path: finding.path ?? null
  };
}

function buildSecurityReviewNextActions({ blockingErrors, warnings }) {
  const actions = [];

  if (blockingErrors.length > 0) {
    actions.push("Resolve every blocking error finding before internal review submission.");
  } else {
    actions.push("Attach the dependency inventory, secret-scan result, and release-artifact audit to the internal review package.");
  }

  if (warnings.length > 0) {
    actions.push("Review the warning findings and clean up risky wording or stale release-facing content before submission.");
  }

  actions.push("Ask the internal IT/security reviewer to assess the review-required capability categories.");
  return actions;
}

function recommendSecurityReviewNextAction({ findings, fallback }) {
  const firstError = findings.find((finding) => finding?.severity === "error");
  if (firstError) {
    return firstError.recovery ?? firstError.message ?? fallback;
  }
  const firstWarning = findings.find((finding) => finding?.severity === "warning");
  if (firstWarning) {
    return firstWarning.recovery ?? firstWarning.message ?? fallback;
  }
  return fallback;
}

function buildValidationReportMarkdown(report) {
  const lines = [
    "# Validation Report",
    "",
    "## Summary",
    `- Executed at: ${report.executedAt}`,
    `- Validator version: ${report.validatorVersion}`,
    `- Cutover ready: ${report.cutoverReady ? "yes" : "no"}`,
    `- Gate decision: ${report.gateDecision}`,
    `- Next action: ${report.nextAction}`,
    "- Scope: harness structural/state validation and workflow evidence consistency only; this is not product/feature verification approval.",
    "- Product evidence owner: Tester/Reviewer/product-specific acceptance evidence.",
    "- Surface role: persisted gate evidence only, not product acceptance; live re-entry should use `.agents/runtime/ACTIVE_CONTEXT.json` and CLI context/status.",
    "",
    "## Active Profiles",
    `- Source: ${report.profileSummary.path}`,
    `- Status: ${report.profileSummary.status}`
  ];

  if (report.profileSummary.profiles.length === 0) {
    lines.push("- Profiles: none");
  } else {
    for (const profile of report.profileSummary.profiles) {
      lines.push(`- ${profile.profileId}: ${profile.evidenceStatus} (${profile.reason})`);
    }
  }

  lines.push("", "## Risk Classifications");
  if (!report.riskClassifications || report.riskClassifications.length === 0) {
    lines.push("- none");
  } else {
    for (const classification of report.riskClassifications) {
      lines.push(
        `- ${classification.packetPath}: declared ${classification.declaredRiskClass ?? "not-declared"}, ` +
          `derived ${classification.derivedRiskClass}, effective ${classification.effectiveRiskClass}, ` +
          `requested route ${classification.requestedRouteClass ?? classification.routeClass ?? "not-declared"}, ` +
          `chosen route ${classification.chosenRouteClass ?? classification.routeClass ?? "not-declared"}, ` +
          `eligibility ${classification.routeEligibility ?? "not-applicable"}, gate effect ${classification.gateEffect}`
      );
      if ((classification.routeRejectionReasons?.length ?? 0) > 0) {
        lines.push(`  - rejection reasons: ${classification.routeRejectionReasons.join("; ")}`);
      }
      if (classification.modelingImpact) {
        lines.push(
          `  - modeling impact: status ${classification.modelingImpact.status}, ` +
            `required ${classification.modelingImpact.required ? "yes" : "no"}, ` +
            `diagnostics ${classification.modelingImpact.diagnosticCount}`
        );
      }
    }
  }

  lines.push("", "## Findings");
  if (report.findings.length === 0) {
    lines.push("- none");
  } else {
    for (const finding of report.findings) {
      lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    }
  }

  lines.push("", "## Context Budget");
  if (!report.contextBudget) {
    lines.push("- none");
  } else {
    lines.push(`- Status: ${report.contextBudget.status}`);
    lines.push(`- Enforcement: ${report.contextBudget.enforcement}; hard fail: ${report.contextBudget.hardFailEnabled ? "enabled" : "disabled"}`);
    lines.push(`- Severity: ${report.contextBudget.severity ?? "info"}; blocking: ${report.contextBudget.blocking ? "yes" : "no"}; gate effect: ${report.contextBudget.gateEffect ?? "advisory-only"}`);
    lines.push(`- Operator message: ${report.contextBudget.operatorMessage ?? "Context budget diagnostics are advisory unless hardFailEnabled is true."}`);
    lines.push(`- Work item: ${report.contextBudget.workItemId}`);
    lines.push(`- Role: ${report.contextBudget.role}`);
    if (report.contextBudget.defaultReadSet) {
      lines.push(
        `- Default read set: files ${report.contextBudget.defaultReadSet.fileCount}/${report.contextBudget.defaultReadSet.maxFileCount}, ` +
          `tokens ${report.contextBudget.defaultReadSet.tokenEstimate}/${report.contextBudget.defaultReadSet.maxTokenEstimate}`
      );
    }
    if (report.contextBudget.fallbackOnlyReadSet) {
      const triggers = report.contextBudget.fallbackOnlyReadSet.triggerReasons ?? [];
      lines.push(
        `- Fallback-only reads: files ${report.contextBudget.fallbackOnlyReadSet.fileCount}, ` +
          `triggers ${triggers.length === 0 ? "none" : triggers.join("; ")}`
      );
    }
    lines.push(`- Overrun rationale: ${report.contextBudget.overrunRationale ?? "none"}`);
    lines.push(`- Warning count: ${report.contextBudget.warningCount}`);
    if (report.contextBudget.outputBudget) {
      lines.push(
        `- Output budget: summary <= ${report.contextBudget.outputBudget.summaryMaxLines} lines, ` +
          `closeout <= ${report.contextBudget.outputBudget.closeoutMaxLines} lines, ` +
          `history policy ${report.contextBudget.outputBudget.repeatedHistoryPolicy}`
      );
    }
  }


  lines.push("", "## V2.5 Risk-Adaptive Gate Summary");
  if (!report.riskAdaptive) {
    lines.push("- Status: not-applicable");
  } else {
    lines.push(`- Gate effect: ${report.riskAdaptive.gateEffect}`);
    lines.push(`- Lane: ${report.riskAdaptive.lane}`);
    lines.push(`- Phase: ${report.riskAdaptive.phase}`);
    lines.push(`- Risk overlays: ${report.riskAdaptive.riskOverlays.length === 0 ? "none" : report.riskAdaptive.riskOverlays.join(", ")}`);
    lines.push(`- Read set: ${report.riskAdaptive.readCount} files, estimated ${report.riskAdaptive.estimatedTokensRead}/${report.riskAdaptive.targetTokens} tokens`);
    lines.push(`- Context budget status: ${report.riskAdaptive.contextBudgetStatus}`);
    lines.push(`- Human manual auto-read: ${report.riskAdaptive.humanManualAutoRead ? "yes" : "no"}`);
    lines.push(`- Blocking diagnostics: ${report.riskAdaptive.blocking ? "yes" : "no"}`);
    lines.push("- Overlay evidence:");
    if (report.riskAdaptive.overlayEvidence.length === 0) lines.push("  - none");
    else for (const item of report.riskAdaptive.overlayEvidence) lines.push(`  - ${item}`);
    if ((report.riskAdaptive.diagnostics ?? []).length > 0) {
      lines.push("- Diagnostics:");
      for (const item of report.riskAdaptive.diagnostics) lines.push(`  - [${item.status}] ${item.field}: ${item.message}`);
    }
    lines.push(`- Next action: ${report.riskAdaptive.nextAction}`);
  }

  lines.push("", "## LLM Judge");
  if (!report.llmJudge) {
    lines.push("- Status: not-applicable");
  } else {
    lines.push(`- Status: ${report.llmJudge.status}`);
    lines.push(`- Gate effect: ${report.llmJudge.gateEffect}`);
    lines.push(`- Work item: ${report.llmJudge.workItemId}`);
    lines.push(`- Provider invocation: ${report.llmJudge.providerInvocation}`);
    lines.push(`- Context package: ${report.llmJudge.contextPackage.status}`);
    lines.push(`- Allowed input fields: ${report.llmJudge.contextPackage.allowedInputFields.join(", ")}`);
    lines.push(`- Result status: ${report.llmJudge.result.status}`);
    lines.push(`- Result source: ${report.llmJudge.result.sourceMode} (${report.llmJudge.result.sourcePath ?? "none"})`);
    lines.push(
      `- Can claim live independent review: ${report.llmJudge.result.canClaimLiveIndependentReview ? "yes" : "no"}`
    );
    lines.push(`- Rationale: ${report.llmJudge.result.rationale}`);
    lines.push(
      `- Advisory findings: ${report.llmJudge.result.findings.length === 0 ? "none" : report.llmJudge.result.findings.length}`
    );
    for (const finding of report.llmJudge.result.findings) {
      lines.push(`  - ${finding.code}: ${finding.message}${finding.sourceRef ? ` (${finding.sourceRef})` : ""}`);
    }
    lines.push(
      `- Advisory disagreements: ${
        report.llmJudge.result.disagreements.length === 0 ? "none" : report.llmJudge.result.disagreements.length
      }`
    );
    for (const disagreement of report.llmJudge.result.disagreements) {
      lines.push(
        `  - ${disagreement.code}: ${disagreement.message}${disagreement.sourceRef ? ` (${disagreement.sourceRef})` : ""}`
      );
    }
    lines.push(`- Diagnostics: ${report.llmJudge.diagnostics.length === 0 ? "none" : report.llmJudge.diagnostics.length}`);
    for (const diagnostic of report.llmJudge.diagnostics) {
      lines.push(`  - ${diagnostic.code}: ${diagnostic.message}`);
    }
  }

  if (report.securityReview) {
    lines.push("", "## Security Review Summary");
    if (report.securityReview.contractStatus === "not-applicable") {
      lines.push("- Status: not-applicable");
      lines.push(`- Activation source: ${report.securityReview.activationSource}`);
      lines.push(`- Reason: ${report.securityReview.notApplicableReason}`);
    } else {
      lines.push(`- Activation source: ${report.securityReview.activationSource}`);
      lines.push(`- Summary status: ${report.securityReview.summaryStatus}`);
      lines.push(`- Checked scope: ${report.securityReview.checkedScope.join(", ")}`);
      lines.push(
        `- Declared security/release paths: ${
          report.securityReview.declaredPaths.length === 0 ? "none" : report.securityReview.declaredPaths.join(", ")
        }`
      );
      lines.push(
        `- Blocking error findings: ${report.securityReview.blockingErrorFindings.length === 0 ? "none" : report.securityReview.blockingErrorFindings.length}`
      );
      if (report.securityReview.blockingErrorFindings.length > 0) {
        for (const finding of report.securityReview.blockingErrorFindings) {
          lines.push(`  - ${finding.code}: ${finding.message}`);
        }
      }
      lines.push(
        `- Warning findings: ${report.securityReview.warningFindings.length === 0 ? "none" : report.securityReview.warningFindings.length}`
      );
      if (report.securityReview.warningFindings.length > 0) {
        for (const finding of report.securityReview.warningFindings) {
          lines.push(`  - ${finding.code}: ${finding.message}`);
        }
      }
      lines.push("- Review-required categories:");
      for (const category of report.securityReview.reviewRequiredCategories) {
        lines.push(`  - ${category.label}: ${category.reviewNote}`);
      }
      lines.push("- Operator next actions:");
      for (const action of report.securityReview.operatorNextActions) {
        lines.push(`  - ${action}`);
      }
      lines.push("- Human review still required:");
      for (const note of report.securityReview.humanReviewStillRequired) {
        lines.push(`  - ${note}`);
      }
      lines.push(`- Out of scope note: ${report.securityReview.outOfScopeNote}`);

      lines.push("", "## Dependency Inventory");
      for (const pkg of report.securityReview.dependencyInventory.packages) {
        lines.push(`- ${pkg.packageLabel}: ${pkg.packageName} / node ${pkg.nodeEngine}`);
        lines.push(
          `  - direct dependencies: ${pkg.directDependencies.length === 0 ? "none" : pkg.directDependencies.join(", ")}`
        );
        lines.push(
          `  - direct devDependencies: ${pkg.directDevDependencies.length === 0 ? "none" : pkg.directDevDependencies.join(", ")}`
        );
        lines.push(`  - release scripts: ${pkg.releaseScripts.length === 0 ? "none" : pkg.releaseScripts.join(", ")}`);
      }

      lines.push("", "## Local Secret Scan");
      lines.push(`- Scanned paths: ${report.securityReview.localSecretScan.scannedPaths.length}`);
      lines.push(`- Scan rules: ${report.securityReview.localSecretScan.scanRuleCount}`);
      lines.push(
        `- Findings: ${report.securityReview.localSecretScan.findingCount === 0 ? "none" : report.securityReview.localSecretScan.findingCount}`
      );

      lines.push("", "## Release Artifact Audit");
      lines.push(
        `- Checked artifacts: ${report.securityReview.releaseArtifactAudit.checkedArtifacts.length === 0 ? "none" : report.securityReview.releaseArtifactAudit.checkedArtifacts.length}`
      );
      for (const artifact of report.securityReview.releaseArtifactAudit.checkedArtifacts) {
        lines.push(`  - ${artifact.path}`);
      }
      lines.push(
        `- Audit findings: ${report.securityReview.releaseArtifactAudit.findingCount === 0 ? "none" : report.securityReview.releaseArtifactAudit.findingCount}`
      );
    }
  }

  lines.push("", "## Semantic Trace");
  if (!report.traceSummary) {
    lines.push("- none");
  } else {
    lines.push(`- Path: ${report.traceSummary.path}`);
    lines.push(`- Work item: ${report.traceSummary.workItemId}`);
    lines.push(`- Packet: ${report.traceSummary.packetId}`);
    lines.push(`- Turn closed at: ${report.traceSummary.turnClosedAt}`);
    lines.push(`- Status: ${report.traceSummary.semanticTraceStatus}`);
    lines.push(`- Warning count: ${report.traceSummary.warningCount}`);
    if (report.traceSummary.workflowDisciplineStatus) {
      lines.push(
        `- Workflow discipline: ${report.traceSummary.workflowDisciplineStatus} / warning ${report.traceSummary.workflowDisciplineWarningCount ?? 0} / closeout hold ${report.traceSummary.workflowDisciplineCloseoutHoldCount ?? 0} / hard error ${report.traceSummary.workflowDisciplineHardErrorCount ?? 0}`
      );
    }
  }

  lines.push("", "## Candidate Gates");
  for (const gate of report.candidateGates ?? []) {
    lines.push(`- ${gate.id}: ${gate.phase} / ${gate.description}`);
  }

  return `${lines.join("\n")}\n`;
}

function writeAgentTraceArtifact({ store, repoRoot, outputDir, executedAt, report }) {
  const workItems = store.listWorkItems();
  const activeTask = selectActiveWorkItem(workItems, { repoRoot });
  if (!activeTask?.workItemId) {
    return null;
  }

  const latestHandoff = store.listRecentHandoffs(1)[0] ?? null;
  const handoffExecution = resolveHandoffExecution({
    repoRoot,
    workItems,
    latestHandoff,
    includeWorkflowDetails: true
  });
  const packetId = activeTask.sourceRef ? path.basename(activeTask.sourceRef, path.extname(activeTask.sourceRef)) : null;
  const requiredSsot = uniquePathList(
    latestHandoff?.payload?.requiredSsot ?? [
      ARTIFACT_PATHS.active,
      ".agents/artifacts/TASK_LIST.md",
      ARTIFACT_PATHS.plan,
      activeTask.sourceRef
    ]
  );
  const selectedWorkflow =
    handoffExecution.workflow === "manual_selection_required" ? null : handoffExecution.workflow;
  const declaredReadEvidence = uniquePathList([
    ACTIVE_CONTEXT_JSON,
    ARTIFACT_PATHS.requirements,
    ARTIFACT_PATHS.architecture,
    ARTIFACT_PATHS.plan,
    ARTIFACT_PATHS.preventive,
    activeTask.sourceRef,
    selectedWorkflow,
    VALIDATION_REPORT_JSON
  ]);
  const approvedDesignRefs = uniquePathList([
    ARTIFACT_PATHS.requirements,
    ARTIFACT_PATHS.architecture,
    ARTIFACT_PATHS.plan,
    activeTask.sourceRef
  ]);
  const implementationRefs = [];
  const verificationRefs = uniquePathList([VALIDATION_REPORT_JSON, VALIDATION_REPORT_MARKDOWN]);
  const warningCount = buildAgentTraceWarnings({
    requiredSsot,
    declaredReadEvidence,
    approvedDesignRefs
  }).length;
  const semanticTraceContract = resolveSemanticTraceContract({ activeWorkItem: activeTask, repoRoot });
  const workflowDiscipline = buildWorkflowDisciplineTrace({
    activeTask,
    handoffExecution,
    latestHandoff,
    declaredReadEvidence
  });
  const workflowDisciplineSignals = summarizeWorkflowDisciplineSignals({
    workflowDiscipline,
    role: activeTask.owner ?? latestHandoff?.toRole ?? null,
    handoff: latestHandoff ? { toRole: latestHandoff.toRole ?? null } : null
  });
  const combinedWarningCount =
    warningCount + workflowDisciplineSignals.warnings.length + workflowDisciplineSignals.closeoutHolds.length;
  const trace = {
    schemaVersion: AGENT_TRACE_SCHEMA_VERSION,
    workItemId: activeTask.workItemId,
    packetId,
    role: activeTask.owner ?? latestHandoff?.toRole ?? null,
    workflow:
      handoffExecution.workflow === "manual_selection_required" ? null : handoffExecution.workflow,
    turnClosedAt: executedAt,
    requiredSsot,
    declaredReadEvidence,
    approvedDesignRefs,
    implementationRefs,
    verificationRefs,
    workflowDiscipline,
    semanticTrace: {
      hardFailCodes: PHASE1_HARD_FAIL_CODES,
      warningCodes: PHASE1_WARNING_CODES,
      reviewerOnlyCodes: PHASE1_REVIEWER_ONLY_CODES,
      candidateGateIds: PHASE1_CANDIDATE_GATES.map((gate) => gate.id),
      sourceRefsResolved: allRefsResolve(repoRoot, [
        ...requiredSsot,
        ...declaredReadEvidence,
        ...approvedDesignRefs,
        ...implementationRefs,
        ...verificationRefs
      ]),
      validatorGateDecision: report.gateDecision,
      readyForCode: activeTask.metadata?.readyForCode ?? null,
      contractStatus: semanticTraceContract?.contractStatus ?? "not-requested",
      activationSource: semanticTraceContract?.activationSource ?? "not declared"
    },
    selfCheck: {
      findingCount: report.findings.length,
      blockingFindingCount: report.findings.filter((finding) => finding?.severity === "error").length,
      warningCount: combinedWarningCount,
      workflowDiscipline: {
        warningCount: workflowDisciplineSignals.warnings.length,
        closeoutHoldCount: workflowDisciplineSignals.closeoutHolds.length,
        hardErrorCount: workflowDisciplineSignals.hardErrors.length
      }
    },
    handoff: latestHandoff
      ? {
          createdAt: latestHandoff.createdAt,
          fromRole: latestHandoff.fromRole,
          toRole: latestHandoff.toRole,
          sourceRef: latestHandoff.sourceRef ?? null,
          summary: latestHandoff.handoffSummary
        }
      : null
  };

  const relativePath = `${AGENT_TRACES_DIR}/${activeTask.workItemId}.json`;
  const absolutePath = path.resolve(outputDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(trace, null, 2)}\n`, "utf8");

  return {
    summary: {
      path: relativePath,
      workItemId: trace.workItemId,
      packetId: trace.packetId,
      turnClosedAt: trace.turnClosedAt,
      semanticTraceStatus:
        workflowDisciplineSignals.hardErrors.length > 0
          ? "error"
          : combinedWarningCount > 0
            ? "warning"
            : "pass",
      warningCount: combinedWarningCount,
      candidateGateCount: PHASE1_CANDIDATE_GATES.length,
      workflowDisciplineStatus:
        workflowDisciplineSignals.hardErrors.length > 0
          ? "hard_error"
          : workflowDisciplineSignals.closeoutHolds.length > 0
            ? "closeout_hold"
            : workflowDisciplineSignals.warnings.length > 0
              ? "warning"
              : "pass",
      workflowDisciplineWarningCount: workflowDisciplineSignals.warnings.length,
      workflowDisciplineCloseoutHoldCount: workflowDisciplineSignals.closeoutHolds.length,
      workflowDisciplineHardErrorCount: workflowDisciplineSignals.hardErrors.length
    }
  };
}

function buildAgentTraceWarnings({ requiredSsot, declaredReadEvidence, approvedDesignRefs }) {
  const warnings = [];
  if (declaredReadEvidence.length < Math.max(3, Math.min(requiredSsot.length, approvedDesignRefs.length))) {
    warnings.push("evidence_linkage_thin");
  }
  return warnings;
}

function allRefsResolve(repoRoot, refs) {
  return refs.every((ref) => !ref || fs.existsSync(path.resolve(repoRoot, ref)));
}

function uniquePathList(paths) {
  return [...new Set((paths ?? []).filter((item) => typeof item === "string" && item.length > 0))];
}

function uniqueStringList(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.length > 0))];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeFindings(findings) {
  const seen = new Set();
  const unique = [];
  for (const finding of findings ?? []) {
    const key = [finding?.severity, finding?.code, finding?.path, finding?.message].join("|");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(finding);
  }
  return unique;
}

function normalizeRoleValue(role) {
  return String(role ?? "").trim().toLowerCase();
}

function resolveNextWorkflowForRole(role) {
  const workflow = workflowForOwner(role);
  return workflow === "manual_selection_required" ? null : workflow;
}

function approvalBoundaryForRole(role) {
  switch (normalizeRoleValue(role)) {
    case "planner":
      return "Do not start implementation, testing, or closeout work until the required route and approval are explicit.";
    case "developer":
      return "Implement only the approved packet scope. Do not change approval state, workflow authority, or unrelated governance surfaces.";
    case "orchestrator":
      return "Route only approved packet execution. Do not implement, test, review, approve scope or risk, or close packets.";
    case "tester":
      return "Verify the approved scope only. Do not rewrite implementation or change approval state.";
    case "reviewer":
      return "Assess closeout readiness only. Do not implement fixes or change approval state from the review lane.";
    default:
      return "Stay inside the approved packet and workflow authority. Escalate instead of guessing.";
  }
}

function doNotCrossForRole(role) {
  switch (normalizeRoleValue(role)) {
    case "planner":
      return [
        "No implementation or approval-state mutation.",
        "No testing or reviewer closeout work.",
        "No guessing a workflow when the route is unclear."
      ];
    case "developer":
      return [
        "No approval-state changes.",
        "No unrelated routing or governance edits.",
        "No manual edits to generated state docs."
      ];
    case "orchestrator":
      return [
        "No code remediation by Orchestrator.",
        "No Tester or Reviewer judgment substitution.",
        "No scope, risk, SSOT applicability, or packet closeout approval.",
        "No manual edits to generated state docs."
      ];
    case "tester":
      return [
        "No implementation changes.",
        "No approval-state changes.",
        "No manual edits to generated state docs."
      ];
    case "reviewer":
      return [
        "No implementation changes.",
        "No tester verification rewrite.",
        "No packet closeout without reviewer rationale."
      ];
    default:
      return ["Do not exceed the current packet scope or workflow authority."];
  }
}
