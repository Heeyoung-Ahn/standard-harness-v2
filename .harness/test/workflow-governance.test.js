import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveHandoff, runTransition, runValidator, writeValidationReport } from "../runtime/state/dev05-tooling.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import {
  assessOperatorRequestPreExecution,
  resolveOperatorRequestRouting,
  workflowForOwner
} from "../runtime/state/workflow-routing.js";
import { createClock, seedStandardRepo, writeOpsPacket, writeStateSurfaces } from "./dev05-test-helpers.js";

test("handoff regenerates CURRENT_STATE route hints from canonical state when live authority is absent", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-handoff-current-state-ignored-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Next Recommended Agent",
      "- Designer resolving the UI evidence contract"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-27T02:15:00.000Z") });
  store.setReleaseState({
    currentStage: "closed",
    releaseGateState: "approved",
    currentFocus: "Design handoff routing",
    releaseGoal: "Route designer work to design.md",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const handoff = resolveHandoff({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(handoff.ok, true);
  assert.equal(handoff.resolvedBy, "default_planner");
  assert.equal(handoff.currentStateNextAgent, "Planner");
  assert.equal(handoff.workflow, ".agents/workflows/planner.md");
  assert.equal(handoff.workflowDetails?.role, "Planner");
  assert.deepEqual(handoff.workflowDetails?.missingSections, []);
});

test("handoff routing rejects ambiguous and substring alias owner values", () => {
  assert.equal(workflowForOwner("developer/tester"), "manual_selection_required");
  assert.equal(workflowForOwner("contest owner"), "manual_selection_required");
  assert.equal(workflowForOwner("npm launcher"), "manual_selection_required");
  assert.equal(workflowForOwner("Developer"), ".agents/workflows/developer.md");
  assert.equal(workflowForOwner("Designer resolving the UI evidence contract"), ".agents/workflows/designer.md");
  assert.equal(workflowForOwner("Project Manager coordinating delivery"), ".agents/workflows/project_manager.md");
  assert.equal(workflowForOwner("PM"), ".agents/workflows/project_manager.md");
  assert.equal(workflowForOwner("Orchestrator"), ".agents/workflows/orchestrator.md");
  assert.equal(workflowForOwner("delivery orchestrator routing"), ".agents/workflows/orchestrator.md");
  assert.equal(workflowForOwner("QA verification lane"), ".agents/workflows/tester.md");
});

test("operator role and skill aliases route without implicit subagent spawning", () => {
  const dayWrap = resolveOperatorRequestRouting("PM agent로 day wrap up skill을 사용해서 오늘 일과를 마무리 해주세요");
  assert.equal(dayWrap.roleStatus, "resolved");
  assert.equal(dayWrap.canonicalRole, "project_manager");
  assert.equal(dayWrap.workflow, ".agents/workflows/project_manager.md");
  assert.equal(dayWrap.skillStatus, "resolved");
  assert.equal(dayWrap.canonicalSkill, "day_wrap_up");
  assert.equal(dayWrap.skill, ".agents/skills/day_wrap_up/SKILL.md");
  assert.equal(dayWrap.explicitSubagentRequest, false);
  assert.equal(dayWrap.spawnSubagents, false);
  assert.match(dayWrap.boundary, /stricter approval, packet, security, and role authority boundary/);

  const pmWorkflow = resolveOperatorRequestRouting("pm workflow");
  assert.equal(pmWorkflow.workflow, ".agents/workflows/project_manager.md");
  assert.equal(pmWorkflow.skillStatus, "not_requested");

  const developerAgent = resolveOperatorRequestRouting("developer agent");
  assert.equal(developerAgent.workflow, ".agents/workflows/developer.md");
  assert.equal(developerAgent.spawnSubagents, false);

  const devWorkflow = resolveOperatorRequestRouting("dev workflow");
  assert.equal(devWorkflow.workflow, ".agents/workflows/developer.md");
  assert.equal(devWorkflow.spawnSubagents, false);
});

test("operator requests auto-select matching skills from task intent", () => {
  const implementPacket = resolveOperatorRequestRouting("SH-020 패킷을 구현하세요");
  assert.equal(implementPacket.roleStatus, "resolved");
  assert.equal(implementPacket.canonicalRole, "developer");
  assert.equal(implementPacket.workflow, ".agents/workflows/developer.md");
  assert.equal(implementPacket.skillStatus, "resolved");
  assert.equal(implementPacket.canonicalSkill, "executing-plans");
  assert.equal(implementPacket.skill, ".agents/skills/executing-plans/SKILL.md");
  assert.match(implementPacket.boundary, /stricter approval, packet, security, and role authority boundary/);

  const completion = resolveOperatorRequestRouting("closeout 전에 완료 검증을 진행해 주세요");
  assert.equal(completion.skillStatus, "resolved");
  assert.equal(completion.canonicalSkill, "verification-before-completion");

  const status = resolveOperatorRequestRouting("남은 패킷과 다음 패킷을 알려 주세요");
  assert.equal(status.skillStatus, "resolved");
  assert.equal(status.canonicalSkill, "operator-support");
});

test("operator skill routing discovers active skill files beyond built-in aliases", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-dynamic-skills-"));
  try {
    fs.mkdirSync(path.join(repoRoot, ".agents", "skills", "custom-ledger-review"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "skills", "custom-ledger-review", "SKILL.md"),
      [
        "---",
        "name: custom-ledger-review",
        "description: Use when frobnicate ledger requests need a project-specific challenge pass.",
        "---",
        "# Custom Ledger Review",
        "",
        "## Use When",
        "- Frobnicate ledger request review is needed."
      ].join("\n"),
      "utf8"
    );

    const route = resolveOperatorRequestRouting("frobnicate ledger 요청을 먼저 검토해 주세요", { repoRoot });

    assert.equal(route.skillStatus, "resolved");
    assert.equal(route.canonicalSkill, "custom-ledger-review");
    assert.equal(route.skill, ".agents/skills/custom-ledger-review/SKILL.md");
    assert.match(route.skillAudit.announcement, /custom-ledger-review/);
    assert.match(route.skillAudit.closeoutAudit, /used=custom-ledger-review/);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("operator request pre-execution review corrects product work outside harness packet scope", () => {
  const review = assessOperatorRequestPreExecution({
    request: "Sample Analytics dashboard를 지금 구현하세요",
    activeTask: {
      workItemId: "OPS-HARNESS-01",
      title: "OPS-HARNESS-01 Skill Routing And Starter Boundary"
    },
    approvalBoundary: "Approved only for OPS-HARNESS-01 harness improvement implementation.",
    doNotCross: ["No sample product implementation"]
  });

  assert.equal(review.decision, "correct");
  assert.equal(review.actionClass, "mutation");
  assert.equal(review.findings.some((finding) => finding.code === "outside_active_packet_scope"), true);
  assert.match(review.nextAction, /approved harness packet/i);

  const direct = assessOperatorRequestPreExecution({
    request: "git status를 확인해 주세요",
    activeTask: {
      workItemId: "OPS-HARNESS-01",
      title: "OPS-HARNESS-01 Skill Routing And Starter Boundary"
    }
  });
  assert.equal(direct.decision, "proceed");
  assert.equal(direct.reviewRequired, false);
});

test("explicit subagent review selects compatible skills without implicit role authority", () => {
  const route = resolveOperatorRequestRouting("서브 에이전트로 작성된 패킷을 검토하세요");
  assert.equal(route.roleStatus, "not_requested");
  assert.equal(route.skillStatus, "resolved_multiple");
  assert.equal(route.canonicalSkill, "requesting-code-review");
  assert.equal(route.explicitSubagentRequest, true);
  assert.equal(route.spawnSubagents, true);
  assert.deepEqual(
    route.compatibleSkills.map((skill) => skill.canonicalSkill).sort(),
    ["requesting-code-review", "subagent-driven-development"].sort()
  );
  assert.match(route.boundary, /stricter approval, packet, security, and role authority boundary/);
});

test("explicit subagent wording is required before role aliases can spawn agents", () => {
  const roleOnly = resolveOperatorRequestRouting("Project Manager agent should prepare the status baton");
  assert.equal(roleOnly.workflow, ".agents/workflows/project_manager.md");
  assert.equal(roleOnly.spawnSubagents, false);

  const explicit = resolveOperatorRequestRouting("spawn subagents for developer and reviewer checks");
  assert.equal(explicit.explicitSubagentRequest, true);
  assert.equal(explicit.spawnSubagents, true);
  assert.equal(explicit.workflow, "manual_selection_required");
});

test("ambiguous role or skill combinations require clarification instead of authority expansion", () => {
  const ambiguousRole = resolveOperatorRequestRouting("developer reviewer workflow");
  assert.equal(ambiguousRole.roleStatus, "ambiguous");
  assert.equal(ambiguousRole.workflow, "manual_selection_required");
  assert.match(ambiguousRole.boundary, /ambiguous role or skill aliases require clarification/);

  const roleAndSkill = resolveOperatorRequestRouting("Project Manager day-wrap-up skill");
  assert.equal(roleAndSkill.workflow, ".agents/workflows/project_manager.md");
  assert.equal(roleAndSkill.skill, ".agents/skills/day_wrap_up/SKILL.md");
  assert.match(roleAndSkill.boundary, /stricter approval, packet, security, and role authority boundary/);
});

test("review workflow requires user requirement fulfillment audit and actionable developer feedback", () => {
  const repoRoot = process.cwd();
  const content = fs.readFileSync(path.join(repoRoot, ".agents", "workflows", "reviewer.md"), "utf8");

  assert.match(content, /user's original requirements|user original requirements/);
  assert.match(content, /approved source artifacts/);
  assert.match(content, /Planner-approved SSOT/);
  assert.match(content, /active packet acceptance/);
  assert.match(content, /requirement gap/);
  assert.match(content, /implementation gap/);
  assert.match(content, /required developer action/);
  assert.match(content, /route recommendation/);
});

test("planner fallback blocks mutating work when the route only resolves through latest handoff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-fallback-blocked-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-14T10:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Planner fallback guard",
    releaseGoal: "Stop guessed mutating planner routes",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "OPS-18",
    title: "Workflow gates by starter mode",
    status: "planning",
    nextAction: "Implement the approved packet scope.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.appendHandoff({
    handoffId: "ops-18-latest-to-planner",
    handoffSummary: "Planner should inspect the next step.",
    fromRole: "reviewer",
    toRole: "planner",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    payload: {
      nextFirstAction: "Implement the approved packet scope."
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const handoff = resolveHandoff({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(handoff.ok, false);
  assert.equal(handoff.routeStatus, "planner_fallback_blocked");
  assert.equal(handoff.workflow, ".agents/workflows/planner.md");
  assert.equal(handoff.workflowDetails?.role, "Planner");

  const activeContext = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8")
  );
  assert.equal(activeContext.nextWork.workflow, null);
  assert.equal(activeContext.nextWork.workflowRouteStatus, "planner_fallback_blocked");

  const validation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(
    validation.findings.some((finding) => finding.code === "active_context_route_mismatch"),
    false
  );
  assert.equal(
    validation.findings.some(
      (finding) =>
        finding.code === "active_context_must_read_missing" &&
        finding.requiredPath === ".agents/workflows/planner.md"
    ),
    false
  );
});

test("planner fallback allows non-mutating planning work when the route resolves through latest handoff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-fallback-allowed-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-14T10:05:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Planner fallback allowance",
    releaseGoal: "Allow planning-only fallback",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "OPS-18",
    title: "Workflow gates by starter mode",
    status: "planning",
    nextAction: "Review scope and decompose follow-up work.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.appendHandoff({
    handoffId: "ops-18-latest-to-planner-allowed",
    handoffSummary: "Planner should review scope.",
    fromRole: "reviewer",
    toRole: "planner",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    payload: {
      nextFirstAction: "Review scope and decompose follow-up work."
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const handoff = resolveHandoff({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(handoff.ok, true);
  assert.equal(handoff.routeStatus, "ready");
  assert.equal(handoff.workflow, ".agents/workflows/planner.md");
});

test("transition apply writes compact baton fields into handoff payload and active context", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-compact-baton-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-18_TRANSITION_BATON_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 OPS-18 Transition baton test",
    workItemTitle: "OPS-18 Workflow gates by starter mode"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-14T10:10:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "OPS-18 compact baton enforcement",
    releaseGoal: "Persist compact baton fields",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "OPS-18",
    title: "Workflow gates by starter mode",
    status: "planning",
    nextAction: "Decide whether Ready For Code can close.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.recordDecision({
    decisionId: "OPS-18-ready-for-code",
    title: "OPS-18 Ready For Code",
    decisionNeeded: true,
    impactSummary: "Developer handoff requires explicit approval closure.",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--transition",
      "planner-to-developer",
      "--work-item",
      "OPS-18",
      "--close-decision",
      "OPS-18-ready-for-code",
      "--apply"
    ]
  });

  assert.equal(applied.apply, true);
  const afterStore = createOperatingStateStore({ dbPath });
  const handoff = afterStore.listRecentHandoffs(1)[0];
  afterStore.close();
  assert.equal(handoff?.payload?.nextWorkflow, ".agents/workflows/developer.md");
  assert.equal(typeof handoff?.payload?.approvalBoundary, "string");
  assert.deepEqual(handoff?.payload?.requiredSsot, [packetPath]);
  assert.equal(Array.isArray(handoff?.payload?.doNotCross), true);
  assert.equal(handoff?.payload?.doNotCross.includes("No approval-state changes."), true);
  assert.equal(handoff?.payload?.routeReason, "Planning approved; implementation can proceed.");
  assert.deepEqual(handoff?.payload?.evidencePaths, [
    packetPath,
    ".agents/artifacts/VALIDATION_REPORT.json",
    ".agents/artifacts/VALIDATION_REPORT.md"
  ]);
  assert.deepEqual(handoff?.payload?.fixLoopHistory, []);
  assert.equal(handoff?.payload?.blockedHumanDiagnostic, null);
  assert.equal(handoff?.payload?.closeoutPackage, null);

  const activeContext = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8")
  );
  assert.equal(activeContext.nextWork.workflow, ".agents/workflows/developer.md");
  assert.equal(activeContext.nextWork.approvalBoundary, handoff?.payload?.approvalBoundary);
  assert.deepEqual(activeContext.nextWork.requiredSsot, [packetPath]);
  assert.deepEqual(activeContext.nextWork.doNotCross, handoff?.payload?.doNotCross);
  assert.equal(activeContext.nextWork.routeReason, handoff?.payload?.routeReason);
  assert.deepEqual(activeContext.nextWork.evidencePaths, handoff?.payload?.evidencePaths);
  assert.deepEqual(activeContext.nextWork.fixLoopHistory, []);
});

test("planner can route approved delivery to Orchestrator with SSOT and evidence guidance", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-orchestrator-baton-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_ORCH-01_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 ORCH-01 test",
    workItemTitle: "ORCH-01 Orchestrator workflow"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-14T10:20:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "ORCH-01 orchestrator route",
    releaseGoal: "Route approved delivery through Orchestrator",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "ORCH-01",
    title: "Orchestrator workflow",
    status: "planning",
    nextAction: "Route the approved packet through Orchestrator.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "planner-to-orchestrator", "--work-item", "ORCH-01", "--apply"]
  });

  assert.equal(applied.apply, true);
  const afterStore = createOperatingStateStore({ dbPath });
  const handoff = afterStore.listRecentHandoffs(1)[0];
  afterStore.close();

  assert.equal(handoff?.payload?.nextWorkflow, ".agents/workflows/orchestrator.md");
  assert.equal(handoff?.payload?.requiredSsot.includes(".agents/workflows/orchestrator.md"), true);
  assert.equal(handoff?.payload?.requiredSsot.includes(".agents/workflows/developer.md"), true);
  assert.equal(handoff?.payload?.requiredSsot.includes(".agents/workflows/tester.md"), true);
  assert.equal(handoff?.payload?.requiredSsot.includes(".agents/workflows/reviewer.md"), true);
  assert.equal(handoff?.payload?.doNotCross.includes("No Tester or Reviewer judgment substitution."), true);
  assert.equal(handoff?.payload?.evidencePaths.includes("reference/artifacts/REVIEW_REPORT.md"), true);

  const activeContext = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8")
  );
  assert.equal(activeContext.nextWork.workflow, ".agents/workflows/orchestrator.md");
  assert.equal(activeContext.nextWork.owner, "orchestrator");
  assert.equal(activeContext.nextWork.workflowSummary?.selectionBasis, "active_task_owner");
  assert.equal(activeContext.nextWork.workflowSummary?.contractPath, ".agents/workflows/orchestrator.md");
  assert.deepEqual(activeContext.nextWork.evidencePaths, handoff?.payload?.evidencePaths);
  assert.equal(activeContext.validation?.traceSummary?.workflowDisciplineStatus, "pass");
});

test("semantic trace hard-fails when blocked planner fallback still points at mutating work", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-trace-route-mismatch-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-40_TRACE_ENFORCEMENT_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 OPS-40 trace enforcement test",
    workItemTitle: "OPS-40 Workflow route and SSOT enforcement hardening"
  });
  fs.appendFileSync(path.join(repoRoot, packetPath), "\n- Semantic trace evidence status: requested\n", "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-25T14:30:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Planner fallback blocked enforcement",
    releaseGoal: "Fail blocked workflow route bypasses",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-40",
    title: "Workflow route and SSOT enforcement hardening",
    status: "planning",
    nextAction: "Implement the approved packet scope.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved", semanticTraceEvidence: { status: "requested" } }
  });
  store.appendHandoff({
    handoffId: "ops-40-reviewer-to-planner",
    handoffSummary: "Planner should continue from the latest note.",
    fromRole: "reviewer",
    toRole: "planner",
    sourceRef: packetPath,
    payload: {
      workItemId: "OPS-40",
      nextFirstAction: "Implement the approved packet scope."
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const validation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(
    validation.findings.some((finding) => finding.code === "route_authority_mismatch_known_but_bypassed"),
    true
  );
  assert.equal(
    validation.findings.some(
      (finding) =>
        finding.code === "workflow_file_read_but_entry_precondition_bypassed" &&
        finding.gateEffect === "closeout_hold"
    ),
    true
  );
  assert.equal(
    validation.findings.some((finding) => finding.code === "task_answer_drifted_before_route_state_restoration"),
    true
  );
});

test("semantic trace detects owner changes that bypass structured routing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-governance-trace-owner-shift-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-40_OWNER_SHIFT_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 OPS-40 owner shift test",
    workItemTitle: "OPS-40 Workflow route and SSOT enforcement hardening"
  });
  fs.appendFileSync(path.join(repoRoot, packetPath), "\n- Semantic trace evidence status: requested\n", "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-25T14:35:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Owner shift without routing",
    releaseGoal: "Catch unrouted workflow-owner changes",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-40",
    title: "Workflow route and SSOT enforcement hardening",
    status: "in_progress",
    owner: "reviewer",
    nextAction: "Review the routed implementation evidence.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved", semanticTraceEvidence: { status: "requested" } }
  });
  store.appendHandoff({
    handoffId: "ops-40-tester-to-tester",
    handoffSummary: "Tester routed the lane back for verification.",
    fromRole: "developer",
    toRole: "tester",
    sourceRef: packetPath,
    payload: {
      workItemId: "OPS-40",
      nextFirstAction: "Review the routed implementation evidence."
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const validation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(
    validation.findings.some((finding) => finding.code === "workflow_owner_changed_without_structured_routing"),
    true
  );
});
