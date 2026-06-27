import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildActiveContext } from "../runtime/state/active-context.js";
import { buildExecutionModeEvidence, buildWorkflowRoleSchema } from "../runtime/state/agent-routing.js";
import {
  buildHarnessStatus,
  buildRoleBriefCommand,
  runAgentCommand,
  runOrchestrateCommand,
  writeValidationReport,
  runTransition
} from "../runtime/state/dev05-tooling.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { createClock, seedStandardRepo, writeOpsPacket, writeStateSurfaces } from "./dev05-test-helpers.js";

test("role brief uses compact context and keeps large manuals fallback-only", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-brief-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = buildRoleBriefCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--role", "developer", "--work-item", "OPS-53"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.brief.role, "developer");
  assert.equal(result.brief.contextPolicy.independentSession, true);
  assert.equal(result.brief.defaultReadExclusions.includes("reference/manuals/human/HARNESS_MANUAL.md"), true);
  assert.equal(result.brief.requiredSsot.includes("reference/manuals/human/HARNESS_MANUAL.md"), false);
  assert.equal(result.brief.readSetMetrics.defaultReadSet.broadCompatibilityViewsIncluded, false);
  assert.equal(result.brief.readSetMetrics.fallbackReadSet.fileCount, 0);
  assert.equal(result.brief.readSetMetrics.baselineComparison.reductionSatisfied, true);
  assert.equal(result.brief.contextBudget.schemaVersion, "standard-harness-context-budget/v1");
  assert.equal(result.brief.contextBudget.status, "within_budget");
  assert.equal(result.brief.contextBudget.enforcement, "warning-only");
  assert.equal(result.brief.contextBudget.hardFailEnabled, false);
  assert.equal(result.brief.contextBudget.blocking, false);
  assert.equal(result.brief.contextBudget.gateEffect, "advisory-only");
  assert.equal(result.brief.contextBudget.defaultReadSet.fileCount, result.brief.readSetMetrics.defaultReadSet.fileCount);
  assert.equal(result.brief.contextBudget.fallbackOnlyReadSet.includedOnlyWhenFallbackTriggersExist, false);
  assert.equal(result.brief.contextBudget.outputBudget.repeatedHistoryPolicy, "warn-only");
  assert.equal(result.brief.firstImplementationReadiness.status, "active");
  assert.equal(result.brief.firstImplementationReadiness.triggerSource, "planner-to-developer");
  assert.equal(
    result.brief.firstImplementationReadiness.checks.some((check) => check.item === "Ready For Code" && check.value === "approved"),
    true
  );
  assert.equal(fs.existsSync(path.join(repoRoot, result.briefPath)), true);
});

test("role brief context budget overrun is reported as validation warning only", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-budget-warning-", {
    deliveryRouteMode: "role-by-role"
  });
  const evidencePaths = [];
  for (let index = 0; index < 18; index += 1) {
    const relativePath = `.agents/runtime/evidence/context-budget-${index}.md`;
    evidencePaths.push(relativePath);
    fs.mkdirSync(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, relativePath), `# Budget Evidence ${index}\n`, "utf8");
  }
  store.appendHandoff({
    handoffId: "ops-53-budget-warning-handoff",
    handoffSummary: "Planner handed off a deliberately oversized evidence set for budget diagnostics.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    payload: {
      workItemId: "OPS-53",
      nextFirstAction: "Report context budget warning-only behavior.",
      approvalBoundary: "Report diagnostics only; do not hard fail the route.",
      evidencePaths
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const brief = buildRoleBriefCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--role", "planner", "--work-item", "OPS-53"]
  });
  assert.equal(brief.ok, true);
  assert.equal(brief.brief.contextBudget.status, "over_budget_unexplained");
  assert.equal(brief.brief.contextBudget.severity, "warning");
  assert.equal(brief.brief.contextBudget.blocking, false);
  assert.equal(brief.brief.contextBudget.gateEffect, "advisory-only");
  assert.equal(brief.brief.contextBudget.warnings.length, 1);
  assert.equal(brief.brief.contextBudget.warnings[0].code, "role_brief_context_budget_warning");
  assert.equal(brief.brief.contextBudget.warnings[0].blocking, false);

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");
  const budgetFinding = report.report.findings.find((finding) => finding.code === "role_brief_context_budget_warning");

  assert.equal(report.ok, true);
  assert.equal(report.report.gateDecision, "pass");
  assert.equal(report.report.contextBudget.status, "over_budget_unexplained");
  assert.equal(report.report.contextBudget.hardFailEnabled, false);
  assert.equal(report.report.contextBudget.blocking, false);
  assert.equal(report.report.contextBudget.gateEffect, "advisory-only");
  assert.equal(budgetFinding?.severity, "warning");
  assert.match(budgetFinding?.message ?? "", /advisory-only/);
  assert.doesNotMatch(budgetFinding?.message ?? "", /\bhold\b/i);
  assert.match(markdown, /## Context Budget/);
  assert.match(markdown, /hard fail: disabled/);
  assert.match(markdown, /blocking: no; gate effect: advisory-only/);
});

test("validation report renders LLM judge as advisory not-run evidence", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops-judge-not-run-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.report.gateDecision, "pass");
  assert.equal(result.report.llmJudge.status, "not-run");
  assert.equal(result.report.llmJudge.gateEffect, "advisory-only");
  assert.equal(result.report.llmJudge.result.canClaimLiveIndependentReview, false);
  assert.deepEqual(result.report.llmJudge.contextPackage.allowedInputFields, [
    "requirementsSummary",
    "modelingImpact",
    "packetAcceptance",
    "diffSummary",
    "testEvidenceResult"
  ]);
  assert.match(markdown, /## LLM Judge/);
  assert.match(markdown, /Gate effect: advisory-only/);
  assert.match(markdown, /Result status: not-run/);
});

test("validation report records manual LLM judge concerns without changing the validator gate", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops-judge-concern-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "judge"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "judge", "OPS-53.json"),
    `${JSON.stringify(
      {
        mode: "manual",
        status: "concern",
        rationale: "Manual clean-context judge found an unsupported implementation claim.",
        findings: [
          {
            code: "requirement_mismatch",
            message: "Implementation claim is not supported by packet acceptance.",
            sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md"
          }
        ],
        disagreements: [
          {
            code: "developer_assumption_disagreement",
            message: "Developer assumed validator pass equals semantic approval."
          }
        ]
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const result = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.report.gateDecision, "pass");
  assert.equal(result.report.llmJudge.status, "concern");
  assert.equal(result.report.llmJudge.result.sourceMode, "manual");
  assert.equal(result.report.llmJudge.result.findings.length, 1);
  assert.equal(result.report.llmJudge.result.disagreements.length, 1);
  assert.match(markdown, /Result status: concern/);
  assert.match(markdown, /requirement_mismatch/);
});

test("validation report rejects forbidden full-context LLM judge artifacts as advisory diagnostics", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops-judge-forbidden-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "judge"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "judge", "OPS-53.json"),
    `${JSON.stringify(
      {
        mode: "mock",
        status: "concern",
        rationale: "This artifact should be rejected because it includes full chat.",
        fullChat: ["developer transcript that must not reach the judge"],
        findings: [{ code: "hidden_api_expansion", message: "Should not be trusted when context is forbidden." }]
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const result = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");

  assert.equal(result.ok, true);
  assert.equal(result.report.gateDecision, "pass");
  assert.equal(result.report.llmJudge.status, "invalid-context");
  assert.equal(result.report.llmJudge.result.status, "invalid-context");
  assert.equal(result.report.llmJudge.diagnostics[0].code, "llm_judge_forbidden_context");
  assert.match(markdown, /llm_judge_forbidden_context/);
  assert.match(markdown, /forbidden context field 'fullChat'/);
});

test("developer remediation handoff and role brief preserve review report evidence", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops54-review-evidence-", {
    deliveryRouteMode: "orchestrated-closeout",
    workItemId: "OPS-54"
  });
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"), "# Review Report\n", "utf8");
  store.upsertWorkItem({
    workItemId: "OPS-54",
    title: "Reviewer requirements audit and context-window remediation",
    status: "review",
    owner: "orchestrator",
    nextAction: "Route Developer remediation from reference/artifacts/REVIEW_REPORT.md.",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      deliveryRouteMode: "orchestrated-closeout"
    }
  });
  store.close();

  const transition = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "orchestrator-to-developer",
      "--work-item",
      "OPS-54",
      "--apply",
      "--next-action",
      "Developer must read reference/artifacts/REVIEW_REPORT.md and remediate only authorized findings."
    ]
  });
  assert.equal(transition.ok, true);
  assert.equal(transition.handoff.payload.evidencePaths.includes("reference/artifacts/REVIEW_REPORT.md"), true);

  const brief = buildRoleBriefCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--role", "developer", "--work-item", "OPS-54"]
  });
  assert.equal(brief.ok, true);
  assert.equal(brief.brief.evidencePaths.includes("reference/artifacts/REVIEW_REPORT.md"), false);
  const excerptPath = brief.brief.evidencePaths.find((item) => item.includes("review-report-excerpts"));
  assert.equal(Boolean(excerptPath), true);
  assert.match(fs.readFileSync(path.join(repoRoot, excerptPath), "utf8"), /Source: reference\/artifacts\/REVIEW_REPORT\.md/);
});

test("orchestrator role brief records read metrics and uses active review report excerpt by default", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops54-orchestrator-brief-", {
    deliveryRouteMode: "orchestrated-closeout",
    workItemId: "OPS-54"
  });
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
    [
      "# Review Report",
      "",
      "## 2026-06-03 OPS-54 Active Review",
      "",
      "- Finding: OPS54-CLOSEOUT-F1",
      "",
      "## 2026-05-01 OPS-01 Historical Review",
      "",
      "- Historical closeout."
    ].join("\n"),
    "utf8"
  );
  store.upsertWorkItem({
    workItemId: "OPS-54",
    title: "Reviewer requirements audit and context-window remediation",
    status: "review",
    owner: "orchestrator",
    nextAction: "Route from reference/artifacts/REVIEW_REPORT.md.",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      deliveryRouteMode: "orchestrated-closeout"
    }
  });
  store.appendHandoff({
    handoffId: "ops-54-reviewer-to-orchestrator",
    handoffSummary: "Reviewer finding needs Orchestrator routing.",
    fromRole: "reviewer",
    toRole: "orchestrator",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    payload: {
      workItemId: "OPS-54",
      nextFirstAction: "Read reference/artifacts/REVIEW_REPORT.md and route remediation.",
      evidencePaths: ["reference/artifacts/REVIEW_REPORT.md"],
      approvalBoundary: "Route only approved packet execution."
    }
  });
  store.close();

  const brief = buildRoleBriefCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--role", "orchestrator", "--work-item", "OPS-54"]
  });

  assert.equal(brief.ok, true);
  assert.equal(brief.brief.role, "orchestrator");
  assert.equal(brief.brief.readSetMetrics.role, "orchestrator");
  assert.equal(brief.brief.readSetMetrics.defaultReadSet.broadCompatibilityViewsIncluded, false);
  assert.equal(brief.brief.defaultReadExclusions.includes("reference/artifacts/REVIEW_REPORT.md"), true);
  assert.equal(brief.brief.evidencePaths.includes("reference/artifacts/REVIEW_REPORT.md"), false);
  const excerptPath = brief.brief.evidencePaths.find((item) => item.includes("review-report-excerpts"));
  assert.equal(Boolean(excerptPath), true);
  const excerpt = fs.readFileSync(path.join(repoRoot, excerptPath), "utf8");
  assert.match(excerpt, /OPS-54 Active Review/);
  assert.doesNotMatch(excerpt, /OPS-01 Historical Review/);
});

test("delivery route mode gates the first Ready For Code transition", () => {
  const missingMode = seedOps53Repo("ops53-missing-mode-", { deliveryRouteMode: null });
  missingMode.store.close();

  const missingPreview = runTransition({
    repoRoot: missingMode.repoRoot,
    dbPath: missingMode.dbPath,
    outputDir: missingMode.repoRoot,
    args: ["planner-to-developer", "--work-item", "OPS-53"]
  });
  assert.equal(missingPreview.ok, false);
  assert.match(missingPreview.errors.join("\n"), /requires Delivery route mode/);

  const orchestrated = seedOps53Repo("ops53-orchestrated-route-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  orchestrated.store.close();
  const wrongOrchestratedTransition = runTransition({
    repoRoot: orchestrated.repoRoot,
    dbPath: orchestrated.dbPath,
    outputDir: orchestrated.repoRoot,
    args: ["planner-to-developer", "--work-item", "OPS-53"]
  });
  assert.equal(wrongOrchestratedTransition.ok, false);
  assert.match(wrongOrchestratedTransition.errors.join("\n"), /planner-to-orchestrator/);

  const rightOrchestratedTransition = runTransition({
    repoRoot: orchestrated.repoRoot,
    dbPath: orchestrated.dbPath,
    outputDir: orchestrated.repoRoot,
    args: ["planner-to-orchestrator", "--work-item", "OPS-53"]
  });
  assert.equal(rightOrchestratedTransition.ok, true);

  const roleByRole = seedOps53Repo("ops53-role-by-role-route-", {
    deliveryRouteMode: "role-by-role"
  });
  roleByRole.store.close();
  const roleByRoleTransition = runTransition({
    repoRoot: roleByRole.repoRoot,
    dbPath: roleByRole.dbPath,
    outputDir: roleByRole.repoRoot,
    args: ["planner-to-developer", "--work-item", "OPS-53"]
  });
  assert.equal(roleByRoleTransition.ok, true);
});

test("mock role runner records mock-adapter execution mode on session, route job, and event", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-agent-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = runAgentCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--role",
      "developer",
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--mock-status",
      "pass",
      "--evidence-paths",
      ".agents/artifacts/VALIDATION_REPORT.json"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.output.status, "pass");
  assert.equal(result.session.metadata.independentSession, false);
  assert.equal(result.session.metadata.executionMode.mode, "mock-adapter");
  assert.equal(result.session.metadata.executionMode.canClaimIndependentReview, false);
  assert.equal(fs.existsSync(path.join(repoRoot, result.contextPath)), true);
  assert.equal(fs.existsSync(path.join(repoRoot, result.promptPath)), true);
  assert.equal(fs.existsSync(path.join(repoRoot, result.outputPath)), true);

  const after = createOperatingStateStore({ dbPath });
  const sessions = after.listAgentSessions({ workItemId: "OPS-53" });
  const routeJobs = after.listRouteJobs({ workItemId: "OPS-53" });
  const events = after.listRouteEvents({ routeJobId: routeJobs[0].routeJobId });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].metadata.executionMode.mode, "mock-adapter");
  assert.equal(routeJobs.length, 1);
  assert.equal(routeJobs[0].metadata.executionMode, "mock-adapter");
  assert.equal(routeJobs[0].metadata.canClaimIndependentReview, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.executionMode.mode, "mock-adapter");
  after.close();
});

test("mock role runner rejects independent-agent execution claims", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-agent-claim-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = runAgentCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--role",
      "developer",
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--execution-mode",
      "independent-agent"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.session.metadata.executionMode.mode, "mock-adapter");
  assert.equal(result.session.metadata.executionMode.downgradeReason, "mock-adapter-cannot-claim-independent-agent");
  assert.match(result.validation.errors.join("\n"), /cannot claim independent-agent/);
});

test("command adapter execution evidence can resolve to independent-agent", () => {
  const evidence = buildExecutionModeEvidence({
    adapter: "command",
    requestedMode: "independent-agent",
    contextPath: ".agents/runtime/agent-sessions/example/context.json",
    promptPath: ".agents/runtime/agent-sessions/example/prompt.md",
    outputPath: ".agents/runtime/agent-sessions/example/output.json",
    contextPolicy: {
      previousRoleChatContextShared: false,
      previousRoleOutputViaStructuredEvidenceOnly: true
    }
  });

  assert.equal(evidence.mode, "independent-agent");
  assert.equal(evidence.canClaimIndependentReview, true);
});

test("schema-visible workflow roles are not routeable harness agent roles", () => {
  const schema = buildWorkflowRoleSchema("developer");
  const documenter = schema.roles.find((entry) => entry.role === "documenter");
  assert.equal(documenter.routeableByHarnessAgent, false);
  assert.equal(schema.routeableRoles.includes("documenter"), false);

  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-documenter-role-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = runAgentCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--role", "documenter", "--work-item", "OPS-53", "--adapter", "mock"]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /schema-visible/);
});

test("role runner rejects authority claims owned by another role", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-authority-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = runAgentCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--role",
      "developer",
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--authority-claims",
      "tester_pass"
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.validation.errors.join("\n"), /developer output cannot claim tester_pass/);
});

test("role runner rejects invalid route recommendations and unresolved evidence paths", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-output-validation-", {
    deliveryRouteMode: "role-by-role"
  });
  store.close();

  const result = runAgentCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--role",
      "developer",
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--next-route",
      "not-a-route",
      "--evidence-paths",
      "missing-evidence.json"
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.validation.errors.join("\n"), /nextRouteRecommendation/);
  assert.match(result.validation.errors.join("\n"), /evidence path does not resolve/);
});

test("handoff-only reviewer remediation records route loop diagnostics without user stop on first finding", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops54-loop-diagnostic-", {
    deliveryRouteMode: "orchestrated-closeout",
    workItemId: "OPS-54"
  });
  store.upsertWorkItem({
    workItemId: "OPS-54",
    title: "Reviewer requirements audit and context-window remediation",
    status: "review",
    owner: "reviewer",
    nextAction: "Reviewer closeout in progress.",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      deliveryRouteMode: "orchestrated-closeout"
    }
  });
  store.createRouteJob({
    routeJobId: "route-OPS-54-test",
    workItemId: "OPS-54",
    deliveryRouteMode: "orchestrated-closeout",
    status: "running",
    currentRole: "reviewer",
    loopCount: 0,
    sameFindingCounts: {},
    closeoutPackage: null,
    metadata: {}
  });
  store.close();

  const reviewerToOrchestrator = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "reviewer-to-orchestrator",
      "--work-item",
      "OPS-54",
      "--apply",
      "--summary",
      "Reviewer found OPS54-CLOSEOUT-F1.",
      "--next-action",
      "Orchestrator should route Developer remediation for OPS54-CLOSEOUT-F1."
    ]
  });
  assert.equal(reviewerToOrchestrator.ok, true);

  const orchestratorToDeveloper = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "orchestrator-to-developer",
      "--work-item",
      "OPS-54",
      "--apply",
      "--summary",
      "Route Developer remediation for OPS54-CLOSEOUT-F1.",
      "--next-action",
      "Developer remediates OPS54-CLOSEOUT-F1."
    ]
  });
  assert.equal(orchestratorToDeveloper.ok, true);

  const after = createOperatingStateStore({ dbPath });
  const routeJob = after.getRouteJob("route-OPS-54-test");
  const events = after.listRouteEvents({ routeJobId: "route-OPS-54-test" });
  after.close();

  assert.equal(routeJob.status, "running");
  assert.equal(routeJob.currentRole, "developer");
  assert.equal(routeJob.metadata.userInputRequired, false);
  assert.equal(routeJob.sameFindingCounts["ops54-closeout-f1"], 1);
  assert.equal(events.some((event) => event.eventType === "route_loop_diagnostic"), true);
  assert.equal(events.some((event) => event.eventType === "developer_remediation_requested"), true);
});

test("orchestrated closeout runs every role as a separate session and exposes route execution in active context", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-orchestrate-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--work-item", "OPS-53", "--adapter", "mock"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.sessions.length, 4);
  assert.equal(new Set(result.sessions.map((session) => session.sessionId)).size, 4);
  assert.equal(result.routeJob.status, "completed");
  assert.equal(result.closeoutPackage.plannerDecisionRequest.includes("Planner closeout session completed"), true);
  assert.equal(result.closeoutPackage.plannerDecisionRequest.includes("orchestrator-to-planner --work-item OPS-53 --apply"), true);
  assert.equal(result.closeoutPackage.plannerDecisionRequest.includes("planner-closeout-hold --work-item OPS-53 --apply"), true);
  assert.equal(result.closeoutPackage.plannerDecisionRequest.includes("npm run harness:sync-state"), true);
  assert.equal(result.closeoutPackage.evidenceAuthority.routeExecutionEvidenceOnly, true);
  assert.match(result.closeoutPackage.evidenceAuthority.note, /not implementation, test, or review evidence/);

  const after = createOperatingStateStore({ dbPath });
  const context = buildActiveContext({
    store: after,
    repoRoot,
    validation: { ok: true, cutoverReady: true, gateDecision: "pass", findings: [] }
  });
  after.close();

  assert.equal(context.routeExecution.status, "completed");
  assert.equal(context.routeExecution.executionMode, "mock-adapter");
  assert.equal(context.routeExecution.canClaimIndependentReview, false);
  assert.equal(context.routeExecution.closeoutPackage.evidenceAuthority.routeExecutionEvidenceOnly, true);
  assert.equal(context.routeExecution.sessionCount, 4);
  assert.equal(context.routeExecution.latestSession.role, "planner");
  assert.equal(context.routeExecution.latestSession.executionMode, "mock-adapter");
  assert.equal(context.nextWork.routeExecution.routeJobId, context.routeExecution.routeJobId);
});

test("orchestrated closeout suppresses stale orchestrator-to-planner recommendation after owner reaches Planner", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-closeout-determinism-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.upsertWorkItem({
    workItemId: "OPS-53",
    title: "Independent agent routing",
    status: "in_progress",
    owner: "orchestrator",
    nextAction: "Route approved delivery.",
    sourceRef: "reference/packets/PKT-01_OPS-53_TEST.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      deliveryRouteMode: "orchestrated-closeout"
    }
  });
  store.close();

  const route = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--work-item", "OPS-53", "--adapter", "mock"]
  });
  assert.equal(route.ok, true);
  assert.match(route.closeoutPackage.plannerDecisionRequest, /orchestrator-to-planner/);

  const plannerTransition = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["orchestrator-to-planner", "--work-item", "OPS-53", "--apply"]
  });
  assert.equal(plannerTransition.ok, true);

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(
    status.routeExecution.closeoutPackage.plannerDecisionRequest.includes("orchestrator-to-planner --work-item"),
    false
  );
  assert.equal(status.routeExecution.closeoutPackage.plannerDecisionRequest.includes("planner-closeout-hold"), true);
  assert.match(status.routeExecution.closeoutPackage.plannerDecisionRequest, /current owner is already planner/);

  const after = createOperatingStateStore({ dbPath });
  const routeJob = after.listRouteJobs({ workItemId: "OPS-53" })[0];
  const context = buildActiveContext({
    store: after,
    repoRoot,
    validation: { ok: true, cutoverReady: true, gateDecision: "pass", findings: [] }
  });
  after.close();
  assert.equal(routeJob.closeoutPackage.plannerDecisionRequest.includes("orchestrator-to-planner --work-item"), false);
  assert.equal(
    context.routeExecution.closeoutPackage.plannerDecisionRequest.includes("orchestrator-to-planner --work-item"),
    false
  );
  assert.match(
    context.routeExecution.closeoutPackage.evidenceAuthority.note,
    /not implementation, test, or review evidence/
  );
});

test("orchestrated closeout routes Tester fail to Developer remediation and Tester rerun", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-tester-remediation-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--mock-fail-role",
      "tester",
      "--mock-fail-count",
      "1",
      "--finding-id",
      "tester-gap"
    ]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.sessions.map((session) => session.role), ["developer", "tester", "developer", "tester", "reviewer", "planner"]);
  assert.equal(result.routeJob.status, "completed");

  const after = createOperatingStateStore({ dbPath });
  const events = after.listRouteEvents({ routeJobId: result.routeJob.routeJobId });
  after.close();
  assert.equal(events.some((event) => event.eventType === "developer_remediation_requested" && event.fromRole === "tester"), true);
});

test("orchestrated closeout routes Reviewer fail through Developer remediation, Tester rerun, and Reviewer rerun", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-reviewer-remediation-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--mock-fail-role",
      "reviewer",
      "--mock-fail-count",
      "1",
      "--finding-id",
      "reviewer-gap"
    ]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.sessions.map((session) => session.role), [
    "developer",
    "tester",
    "reviewer",
    "developer",
    "tester",
    "reviewer",
    "planner"
  ]);
  assert.equal(result.routeJob.status, "completed");
});

test("orchestrated closeout escalates same finding repeated twice to blocked-human", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-same-finding-blocked-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--mock-fail-role",
      "tester",
      "--mock-fail-count",
      "2",
      "--finding-id",
      "same-gap"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.routeJob.status, "blocked-human");
  assert.equal(result.blockedHumanDiagnostic.reason, "same-finding-repeat-threshold");
  assert.equal(result.blockedHumanDiagnostic.sameFindingCount, 2);
});

test("orchestrated closeout escalates full loop repeated three times to blocked-human", () => {
  const { repoRoot, dbPath, store } = seedOps53Repo("ops53-full-loop-blocked-", {
    deliveryRouteMode: "orchestrated-closeout"
  });
  store.close();

  const result = runOrchestrateCommand({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--work-item",
      "OPS-53",
      "--adapter",
      "mock",
      "--mock-fail-role",
      "reviewer",
      "--mock-fail-count",
      "4",
      "--mock-finding-sequence",
      "gap-a,gap-b,gap-c,gap-d"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.routeJob.status, "blocked-human");
  assert.equal(result.blockedHumanDiagnostic.reason, "full-loop-threshold");
  assert.equal(result.blockedHumanDiagnostic.fullLoopCount, 3);

  const after = createOperatingStateStore({ dbPath });
  const context = buildActiveContext({
    store: after,
    repoRoot,
    validation: { ok: true, cutoverReady: true, gateDecision: "pass", findings: [] }
  });
  after.close();
  assert.equal(context.routeExecution.blockedHumanDiagnostic.reason, "full-loop-threshold");
});

function seedOps53Repo(prefix, { deliveryRouteMode, workItemId = "OPS-53" }) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-53_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-53 Test",
    workItemTitle: "OPS-53 independent agent routing test"
  });
  patchPacketHeader(repoRoot, packetPath, deliveryRouteMode);

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-06-03T01:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "OPS-53 independent agent routing",
    releaseGoal: "Route approved packet delivery through independent sessions.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId,
    title: "Independent agent routing",
    status: "planning",
    owner: "planner",
    nextAction: "Planner should route the Ready For Code packet.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      ...(deliveryRouteMode ? { deliveryRouteMode } : {})
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_OPS-53_TEST",
    path: packetPath,
    category: "task_packet",
    title: "OPS-53 test packet",
    sourceRef: packetPath,
    metadata: { workItemId }
  });
  writeStateSurfaces({ store, repoRoot });
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"), "{}\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "# Validation Report\n", "utf8");
  store.appendHandoff({
    handoffId: `${workItemId.toLowerCase()}-seed-handoff`,
    handoffSummary: "Seed handoff for compact role brief tests.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: packetPath,
    payload: {
      transition: "planner-to-developer",
      workItemId,
      gateProfile: "contract",
      completedScope: "Seeded approved packet handoff.",
      nextWorkflow: ".agents/workflows/developer.md",
      nextFirstAction: "Implement the approved packet scope.",
      requiredSsot: [packetPath],
      approvalBoundary: "Implement only the approved packet scope.",
      doNotCross: ["No approval-state changes."],
      routeReason: "Seed fixture.",
      evidencePaths: [packetPath, ".agents/artifacts/VALIDATION_REPORT.json", ".agents/artifacts/VALIDATION_REPORT.md"]
    }
  });
  return { repoRoot, dbPath, store };
}

function patchPacketHeader(repoRoot, packetPath, deliveryRouteMode) {
  const absolutePath = path.join(repoRoot, packetPath);
  const routeRows = [
    "| Route class | packet-path | OPS-53 applies after Ready For Code on packet/strict paths | approved |",
    ...(deliveryRouteMode
      ? [`| Delivery route mode | ${deliveryRouteMode} | Test explicit delivery route selection | approved |`]
      : [])
  ];
  fs.writeFileSync(
    absolutePath,
    fs.readFileSync(absolutePath, "utf8").replace(
      "| Gate profile | contract | Contract-level harness operation change | approved |",
      ["| Gate profile | contract | Contract-level harness operation change | approved |", ...routeRows].join("\n")
    ),
    "utf8"
  );
}
