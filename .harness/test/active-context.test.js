import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildActiveContext, writeActiveContext } from "../runtime/state/active-context.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { writeGeneratedStateDocs } from "../runtime/state/generate-state-docs.js";
import { seedStandardRepo, writeOpsPacket } from "./dev05-test-helpers.js";

test("active context writes compact JSON and Korean Markdown re-entry state with contract metadata", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "workflows"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "workflows", "developer.md"),
    [
      "# Dev Workflow",
      "",
      "## Role",
      "- Developer",
      "## Mission",
      "- Implement approved work.",
      "## Authority",
      "- Modify approved files.",
      "## Non-Authority",
      "- Do not redefine scope.",
      "## Must Read SSOT",
      "- active packet",
      "## Allowed Actions",
      "- Implement approved scope.",
      "## Forbidden Actions",
      "- Do not implement unapproved scope.",
      "## Required Outputs",
      "- Validation evidence.",
      "## Turn Close Reporting",
      "- Report current and next work.",
      "## Handoff Rules",
      "- Hand off after validation.",
      "## Stop Conditions",
      "- Stop on scope drift.",
      "## Escalation Rules",
      "- Escalate approval gaps."
    ].join("\n"),
    "utf8"
  );
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const store = createOperatingStateStore({ dbPath, now: clock("2026-05-03T09:00:00.000Z") });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Active context re-entry baseline",
    releaseGoal: "Keep re-entry cheap and deterministic.",
    sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"
  });
  store.upsertWorkItem({
    workItemId: "CTX-01",
    title: "Active context baseline",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement active context.",
    sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    metadata: { gateProfile: "release", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "handoff-ctx-01",
    handoffSummary: "CTX-01 handed to Developer.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    payload: { nextFirstAction: "Implement active context." }
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  store.close();
  const reopened = createOperatingStateStore({ dbPath });

  assert.equal(result.ok, true);
  assert.equal(result.context.activeTask.workItemId, "CTX-01");
  assert.equal(result.context.selectedLane.workflow, ".agents/workflows/developer.md");
  assert.equal(result.context.nextWork.workflow, ".agents/workflows/developer.md");
  assert.equal(result.context.reentryContract.firstRead, ".agents/runtime/ACTIVE_CONTEXT.json");
  assert.equal(result.context.minimumReadSet.includes(".agents/runtime/ACTIVE_CONTEXT.json"), true);
  assert.equal(result.context.minimumReadSet.includes(".agents/workflows/developer.md"), true);
  assert.equal(
    result.context.minimumReadSet.includes("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"),
    true
  );
  assert.equal(result.context.minimumReadSet.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(result.context.minimumReadSet.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(result.context.fallbackReadSet.includes(".agents/artifacts/CURRENT_STATE.md"), true);
  assert.equal(result.context.fallbackReadSet.includes(".agents/artifacts/TASK_LIST.md"), true);
  assert.deepEqual(result.context.fallbackTriggers, []);
  assert.equal(result.context.reentryContract.mustReadNext.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(result.context.reentryContract.mustReadNext.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(result.context.nextWork.requiredSsot.includes(".agents/artifacts/IMPLEMENTATION_PLAN.md"), false);
  assert.equal(result.context.reentryContract.mustReadNext.includes(".agents/artifacts/IMPLEMENTATION_PLAN.md"), false);
  assert.equal(typeof result.context.reentryContract.digest, "string");
  assert.equal(result.context.sources.generatedCurrentState, ".agents/runtime/generated-state-docs/CURRENT_STATE.md");
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md")), true);
  assert.equal(reopened.getGenerationState(".agents/runtime/ACTIVE_CONTEXT.json")?.freshnessState, "fresh");
  assert.equal(reopened.getGenerationState(".agents/runtime/ACTIVE_CONTEXT.md")?.freshnessState, "fresh");
  reopened.close();
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md"), "utf8");
  assert.match(markdown, /## 시작 계약/);
  assert.match(markdown, /## 최소 읽기 세트/);
  assert.match(markdown, /## 보조 읽기 조건/);
  assert.match(markdown, /## 먼저 다시 읽을 항목/);
  assert.match(markdown, /제품\/기능 검증 통과를 의미하지 않음/);
  assert.match(markdown, /Tester \/ Reviewer \/ product-specific acceptance/);
});

test("active context exposes no deprecated external read-model dependency", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-no-deprecated-read-model-"));
  const store = createOperatingStateStore({ dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "No external read model",
    releaseGoal: "Use CLI context.",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });

  const context = buildActiveContext({ store, repoRoot });
  store.close();

  assert.equal(JSON.stringify(context).includes("external-read-model"), false);
  assert.equal(JSON.stringify(context).includes("project-manifest"), false);
});

test("active context reuses executedAt from persisted validation reports", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-validation-report-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-05-03T10:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Reload validation report metadata",
    releaseGoal: "Preserve executedAt in active context fallback reads.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"),
    `${JSON.stringify(
      {
        ok: true,
        command: "validation-report",
        report: {
          ok: true,
          cutoverReady: true,
          findings: [],
          gateDecision: "pass",
          executedAt: "2026-05-03T10:05:00.000Z"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const result = writeActiveContext({
    store,
    repoRoot,
    outputDir: repoRoot,
    validation: {
      ok: true,
      cutoverReady: true,
      findings: [],
      gateDecision: "pass"
    }
  });
  store.close();

  assert.equal(result.context.validation?.gateDecision, "pass");
  assert.equal(result.context.validation?.executedAt, "2026-05-03T10:05:00.000Z");
});

test("active context ignores a DB-open work item that canonical TASK_LIST already marks completed", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-closeout-parity-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-05-04T11:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "QLT-02 closed; Planner selecting the next lane.",
    releaseGoal: "Keep ACTIVE_CONTEXT aligned with canonical closeout state.",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "QLT-02",
    title: "Evidence validation, semantic trace, and agent eval / CI gating",
    status: "planning",
    owner: "planner",
    nextAction: "Planner should record QLT-02 closeout and choose the next approved lane.",
    sourceRef: "reference/packets/PKT-01_QLT-02_CLOSEOUT_TEST.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "qlt-02-planner-closeout",
    handoffSummary: "Planner recorded QLT-02 closeout after reviewer approval.",
    fromRole: "planner",
    toRole: "planner",
    sourceRef: "reference/packets/PKT-01_QLT-02_CLOSEOUT_TEST.md",
    payload: {
      nextFirstAction: "Planner should choose the next approved lane and open the next packet only after human agreement."
    }
  });

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Must Read Next",
      "- `.agents/artifacts/REQUIREMENTS.md`"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| - | None | - | - | clear | - | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| QLT-02 | Evidence validation, semantic trace, and agent eval / CI gating | 2026-05-04 | transition planner -> planner; gate contract | Planner recorded QLT-02 closeout after reviewer approval. |"
    ].join("\n"),
    "utf8"
  );

  const context = buildActiveContext({ store, repoRoot });
  store.close();

  assert.equal(context.activeTask, null);
  assert.equal(context.selectedLane, null);
  assert.equal(context.nextWork.owner, "planner");
  assert.equal(context.nextWork.workflow, ".agents/workflows/planner.md");
  assert.equal(
    context.nextWork.action,
    "Planner should choose the next approved lane and open the next packet only after human agreement."
  );
});

test("active context compacts latest closeout review report evidence without an active task", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-closeout-review-excerpt-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
    [
      "# Review Report",
      "",
      "## OPS-54 Closeout",
      "",
      "- Latest OPS-54 review evidence.",
      "",
      "## OPS-53 Historical Audit",
      "",
      "- Older OPS-53 review evidence."
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-06-03T06:00:00.000Z")
  });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "OPS-54 is closed.",
    releaseGoal: "Keep closeout re-entry compact.",
    sourceRef: "reference/packets/PKT-01_OPS-54.md"
  });
  store.appendHandoff({
    handoffId: "ops-54-planner-closeout",
    handoffSummary: "Planner closed OPS-54.",
    fromRole: "planner",
    toRole: "planner",
    sourceRef: "reference/packets/PKT-01_OPS-54.md",
    payload: {
      workItemId: "OPS-54",
      nextFirstAction: "Open the next approved packet.",
      evidencePaths: ["reference/artifacts/REVIEW_REPORT.md"]
    }
  });

  const context = buildActiveContext({ store, repoRoot });
  store.close();

  const excerptPath = ".agents/runtime/review-report-excerpts/OPS-54-review-report.md";
  assert.equal(context.activeTask, null);
  assert.equal(context.minimumReadSet.includes("reference/artifacts/REVIEW_REPORT.md"), false);
  assert.equal(context.minimumReadSet.includes(excerptPath), true);
  assert.equal(context.latestHandoff.evidencePaths.includes(excerptPath), true);
  const excerpt = fs.readFileSync(path.join(repoRoot, excerptPath), "utf8");
  assert.match(excerpt, /OPS-54 Closeout/);
  assert.doesNotMatch(excerpt, /OPS-53 Historical Audit/);
});

test("active context projects restart continuity from latest handoff without broad default reads", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-restart-continuity-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-PM-01_RESTART_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-PM-01 restart test",
    workItemTitle: "OPS-PM-01 restart continuity"
  });

  const store = createOperatingStateStore({
    dbPath,
    now: clock("2026-06-07T08:00:00.000Z")
  });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "OPS-PM-01 restart continuity projection",
    releaseGoal: "Keep day_start compact and continuous.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-PM-01",
    title: "Restart continuity",
    status: "in_progress",
    owner: "planner",
    nextAction: "Open the harness friction packet after day_start.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "ops-pm-01-wrap",
    handoffSummary: "PM day wrap recorded next-session restart intent.",
    fromRole: "pm",
    toRole: "planner",
    sourceRef: packetPath,
    payload: {
      workItemId: "OPS-PM-01",
      restartIntent: "Open a harness friction reduction packet first.",
      nextSessionFirstAction: "Plan effort accounting and state-alignment friction reduction.",
      unpersistedWrapUpItems: ["HARNESS-EFFORT-ACCOUNTING-001 preventive candidate was not written."],
      continuityEvidenceGaps: ["Preventive memory write was blocked during day_wrap_up."]
    }
  });

  const result = writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  store.close();

  assert.equal(result.context.restartContinuity.status, "present");
  assert.equal(result.context.restartContinuity.liveRoute.activeWorkItemId, "OPS-PM-01");
  assert.equal(result.context.restartContinuity.restartIntent, "Open a harness friction reduction packet first.");
  assert.equal(
    result.context.latestHandoff.restartContinuity.nextSessionFirstAction,
    "Plan effort accounting and state-alignment friction reduction."
  );
  assert.equal(result.context.restartContinuity.evidenceGaps.length, 1);
  assert.equal(result.context.minimumReadSet.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(result.context.minimumReadSet.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(result.context.minimumReadSet.includes(".agents/artifacts/REQUIREMENTS.md"), false);

  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md"), "utf8");
  assert.match(markdown, /## Restart Continuity/);
  assert.match(markdown, /Open a harness friction reduction packet first/);
  assert.match(markdown, /Preventive memory write was blocked during day_wrap_up/);
  assert.match(markdown, /does not approve a lane, Ready For Code, implementation, testing, review, release, or closeout/);
});

test("active context does not mix stale review handoff constraints into the active planning lane", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-stale-handoff-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-05-21T09:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "review",
    releaseGateState: "open",
    currentFocus: "PKT-01 is under reviewer closeout assessment.",
    releaseGoal: "Define the first approved project baseline.",
    sourceRef: "reference/packets/PKT-01_EXPO_INIT_BIBLE_VIEWER.md"
  });
  store.upsertWorkItem({
    workItemId: "PKT-03",
    title: "Supabase Auth and sync",
    status: "planning",
    owner: "planner",
    nextAction: "Finalize implementation plan and hand off to developer.",
    sourceRef: "reference/packets/PKT-03_SUPABASE_AUTH_SYNC.md",
    metadata: { gateProfile: "standard", readyForCode: "draft" }
  });
  store.appendHandoff({
    handoffId: "pkt-01-review",
    handoffSummary: "Tester verification completed; Reviewer should assess packet exit readiness.",
    fromRole: "tester",
    toRole: "reviewer",
    sourceRef: "reference/packets/PKT-01_EXPO_INIT_BIBLE_VIEWER.md",
    payload: {
      nextFirstAction: "Review implementation, evidence, residual debt, and closeout readiness.",
      requiredSsot: [
        "reference/packets/PKT-01_EXPO_INIT_BIBLE_VIEWER.md",
        "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md"
      ],
      approvalBoundary: "Assess closeout readiness only.",
      doNotCross: ["No implementation changes."]
    }
  });

  const context = buildActiveContext({ store, repoRoot });
  store.close();

  assert.equal(context.activeTask.workItemId, "PKT-03");
  assert.equal(context.nextWork.owner, "planner");
  assert.equal(context.nextWork.workflow, ".agents/workflows/planner.md");
  assert.equal(context.nextWork.requiredSsot.includes("reference/packets/PKT-01_EXPO_INIT_BIBLE_VIEWER.md"), false);
  assert.equal(context.nextWork.approvalBoundary, null);
  assert.deepEqual(context.nextWork.doNotCross, []);
  assert.equal(context.latestHandoff, null);
  assert.equal(context.reentryContract.mustReadNext.includes("reference/packets/PKT-03_SUPABASE_AUTH_SYNC.md"), true);
});

test("active context does not import CURRENT_STATE must-read bullets into canonical AI re-entry routing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-must-read-authority-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-05-16T09:30:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "PLN-21 authority slice",
    releaseGoal: "Keep AI re-entry sourced from canonical live state.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Authority simplification",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement slice 1.",
    sourceRef: "reference/packets/PKT-01_PLN-21.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "pln-21-dev",
    handoffSummary: "Developer should implement slice 1.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: "reference/packets/PKT-01_PLN-21.md",
    payload: {
      nextFirstAction: "Implement slice 1.",
      requiredSsot: [
        ".agents/artifacts/CURRENT_STATE.md",
        ".agents/artifacts/TASK_LIST.md",
        ".agents/artifacts/IMPLEMENTATION_PLAN.md",
        "reference/packets/PKT-01_PLN-21.md"
      ]
    }
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Must Read Next",
      "- `.agents/artifacts/REQUIREMENTS.md`",
      "- `reference/manuals/human/HARNESS_MANUAL.md`"
    ].join("\n"),
    "utf8"
  );

  const context = buildActiveContext({ store, repoRoot });
  store.close();

  assert.equal(context.reentryContract.mustReadNext.includes("reference/manuals/human/HARNESS_MANUAL.md"), false);
  assert.equal(context.reentryContract.mustReadNext.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(context.reentryContract.mustReadNext.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(context.nextWork.requiredSsot.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(context.nextWork.requiredSsot.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(context.reentryContract.mustReadNext.includes(".agents/artifacts/IMPLEMENTATION_PLAN.md"), true);
});

test("active context expands fallback guidance when approval, blockers, or validation require more context", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-minimal-fallback-"));
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "generated-state-docs"), { recursive: true });
  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: clock("2026-05-31T14:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Minimum read set fallback",
    releaseGoal: "Expose fallback triggers without changing canonical authority.",
    sourceRef: "reference/packets/PKT-01_OPS-46_TEST.md"
  });
  store.upsertWorkItem({
    workItemId: "OPS-46",
    title: "Minimum read set",
    status: "planning",
    owner: "planner",
    nextAction: "Resolve blockers before implementation.",
    sourceRef: "reference/packets/PKT-01_OPS-46_TEST.md",
    metadata: { gateProfile: "contract", readyForCode: "hold" }
  });
  store.recordDecision({
    decisionId: "DEC-46",
    title: "Approve output boundary",
    decisionNeeded: true,
    impactSummary: "Controls minimum read set shape",
    sourceRef: "reference/packets/PKT-01_OPS-46_TEST.md"
  });
  store.recordGateRisk({
    riskId: "RISK-46",
    title: "Approval evidence missing",
    severity: "high",
    sourceRef: "reference/packets/PKT-01_OPS-46_TEST.md"
  });

  const context = buildActiveContext({
    store,
    repoRoot,
    validation: {
      ok: false,
      cutoverReady: false,
      findings: [{ code: "fixture", severity: "error", message: "fixture" }],
      gateDecision: "hold"
    }
  });
  store.close();

  const triggerCodes = new Set(context.fallbackTriggers.map((trigger) => trigger.code));
  assert.equal(triggerCodes.has("missing_approval_or_evidence"), true);
  assert.equal(triggerCodes.has("blockers_or_open_decisions"), true);
  assert.equal(triggerCodes.has("validation_mismatch"), true);
  assert.equal(context.minimumReadSet.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(context.minimumReadSet.includes(".agents/artifacts/TASK_LIST.md"), false);
  assert.equal(context.fallbackReadSet.includes(".agents/artifacts/CURRENT_STATE.md"), true);
  assert.equal(context.fallbackReadSet.includes(".agents/artifacts/TASK_LIST.md"), true);
  assert.equal(context.reentryContract.mustReadNext.includes(".agents/artifacts/CURRENT_STATE.md"), false);
  assert.equal(context.reentryContract.sourceTrace.includes("reference/packets/PKT-01_OPS-46_TEST.md"), true);
});

test("generated compatibility current state does not overstate Ready For Code hold as approved", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-rfc-hold-current-state-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-48A_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "hold",
    packetTitle: "PKT-01 OPS-48A test",
    workItemTitle: "OPS-48A generated state contradiction"
  });

  const store = createOperatingStateStore({
    dbPath,
    now: clock("2026-06-01T03:00:00.000Z")
  });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "OPS-48A Ready For Code hold wording",
    releaseGoal: "Do not overstate generated fallback approval.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-48A",
    title: "Generated state contradiction",
    status: "planning",
    owner: "planner",
    nextAction: "Approve or hold implementation.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "hold" }
  });
  store.appendHandoff({
    handoffId: "ops-48a-planner-hold",
    handoffSummary: "OPS-48A remains on Ready For Code hold.",
    fromRole: "planner",
    toRole: "planner",
    sourceRef: packetPath,
    payload: { workItemId: "OPS-48A", nextFirstAction: "Approve or hold implementation." }
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot, repoRoot });
  store.close();

  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(currentState, /Ready For Code status is hold/);
  assert.doesNotMatch(currentState, /Ready For Code is approved/);
});

test("active context surfaces the active operator claim for read-only diagnostics", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "active-context-ops33-operator-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-33_ACTIVE_CONTEXT_OPERATOR_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-33 active context operator test",
    workItemTitle: "OPS-33 active context operator test"
  });

  const store = createOperatingStateStore({
    dbPath,
    now: clock("2026-05-24T02:00:00.000Z")
  });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "OPS-33 context diagnostics",
    releaseGoal: "Expose operator claims in ACTIVE_CONTEXT.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-33",
    title: "Active context operator diagnostics",
    status: "in_progress",
    owner: "developer",
    nextAction: "Keep read-only ACTIVE_CONTEXT diagnostics readable.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      activeOperatorId: "codex-main",
      activeOperatorLabel: "Codex Main",
      ownershipClaimedAt: "2026-05-24T02:00:00.000Z",
      ownershipMode: "claim"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_OPS-33_ACTIVE_CONTEXT_OPERATOR_TEST",
    path: packetPath,
    category: "task_packet",
    title: "OPS-33 active context operator test",
    sourceRef: packetPath,
    metadata: { workItemId: "OPS-33" }
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  store.close();

  assert.equal(result.context.activeTask?.activeOperatorId, "codex-main");
  assert.equal(result.context.activeTask?.activeOperatorLabel, "Codex Main");
  assert.equal(result.context.activeTask?.ownershipMode, "claim");
  assert.match(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md"), "utf8"),
    /operator Codex Main \(codex-main\)/
  );
});

function clock(startIso) {
  let offset = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + offset++ * 1000).toISOString();
}
