import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  applyMigration,
  buildMigrationPreview,
  buildHarnessStatus,
  recommendNextAction,
  resolveHandoff,
  runPlannerPacketOpen,
  runStateSync,
  runTransition,
  runCutoverPreflight,
  runValidator,
  writeValidationReport,
  writeCutoverReport
} from "../runtime/state/dev05-tooling.js";
import { initializeProjectStarter } from "../runtime/state/init-project.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { createClock, seedStandardRepo, seedStarterRepo, writeOpsPacket, writeStateSurfaces } from "./dev05-test-helpers.js";

function cloneMaintainerRepoFixture(prefix) {
  const sourceRoot = process.cwd();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.cpSync(sourceRoot, repoRoot, {
    recursive: true,
    filter: (src) => !path.normalize(src).split(path.sep).some((part) => part === "node_modules" || part === ".git" || part === ".expo")
  });
  return repoRoot;
}

function runningInMaintainerRepo() {
  return fs.existsSync(path.join(process.cwd(), "standard-template"));
}

test("migration preview detects legacy source refs and apply normalizes them", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-migration-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-20T03:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling",
    releaseGoal: "Standardize paths",
    sourceRef: "codex/project-context/active-state.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    nextAction: "Normalize legacy source refs",
    sourceRef: "PKT-01_LEGACY_READ_SURFACE.md"
  });
  store.recordDecision({
    decisionId: "DEC-05",
    title: "Keep preview-first migration semantics",
    decisionNeeded: true,
    impactSummary: "Protects cutover review clarity",
    sourceRef: "IMPLEMENTATION_PLAN.md"
  });
  store.close();

  const preview = buildMigrationPreview({ repoRoot, dbPath });
  assert.equal(preview.changeCount >= 3, true);
  assert.equal(preview.changes.some((item) => item.to === ".agents/artifacts/CURRENT_STATE.md"), true);
  assert.equal(preview.changes.some((item) => item.to === "reference/packets/PKT-01_LEGACY_READ_SURFACE.md"), true);

  const applied = applyMigration({ repoRoot, dbPath });
  assert.equal(applied.applied, preview.changeCount);

  const after = buildMigrationPreview({ repoRoot, dbPath });
  assert.equal(after.changeCount, 0);
});

test("cutover preflight passes when validator is clean and no migration changes remain", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-cutover-pass-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-20T03:30:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling",
    releaseGoal: "Cutover preflight",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    owner: "developer",
    nextAction: "Run preflight",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const validator = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(validator.ok, true);

  const preflight = runCutoverPreflight({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(preflight.cutoverReady, true);
  assert.deepEqual(preflight.blockers, []);
  assert.equal(preflight.migrationPreview.changeCount, 0);
  assert.equal(preflight.rollbackBundle.generatedDocs.length, 2);
  assert.equal(preflight.rollbackBundle.needsOperatorBackup, false);
  assert.deepEqual(preflight.rollbackBundle.missingPaths, []);
});

test("cutover preflight is read-only and leaves old write-path refs pending until approved cutover", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-cutover-readonly-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-17T03:15:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "PLN-22 Slice 4 preflight read-only proof",
    releaseGoal: "Freeze legacy write paths only after separate cutover approval.",
    sourceRef: "codex/project-context/active-state.md"
  });
  store.upsertWorkItem({
    workItemId: "PLN-22",
    title: "Operational authority rebuild",
    status: "in_progress",
    owner: "developer",
    nextAction: "Prove preflight is non-destructive before approved cutover.",
    sourceRef: "PKT-01_PLN-22_OPERATIONAL_AUTHORITY_REBUILD_AND_HARNESS_RESET.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const before = buildMigrationPreview({ repoRoot, dbPath });
  const preflight = runCutoverPreflight({ repoRoot, dbPath, outputDir: repoRoot });
  const after = buildMigrationPreview({ repoRoot, dbPath });

  assert.equal(before.changeCount > 0, true);
  assert.equal(preflight.cutoverReady, false);
  assert.equal(preflight.blockers.some((item) => item.code === "migration_change_pending"), true);
  assert.equal(after.changeCount, before.changeCount);
  assert.deepEqual(after.changes, before.changes);
});

test("cutover preflight fails when validator errors or migration changes remain", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-cutover-fail-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-20T04:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling",
    releaseGoal: "Cutover preflight",
    sourceRef: "codex/project-context/active-state.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    nextAction: "Run preflight",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "generated-state-docs", "CURRENT_STATE.md"),
    "# CURRENT_STATE\n\n## Current Focus Summary\n- Broken state\n",
    "utf8"
  );

  const preflight = runCutoverPreflight({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(preflight.cutoverReady, false);
  assert.equal(preflight.blockers.some((item) => item.code === "migration_change_pending"), true);
  assert.equal(preflight.blockers.some((item) => item.code === "required_section_missing"), true);
});

test("cutover preflight fails when the rollback bundle is incomplete", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-cutover-rollback-missing-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-20T04:15:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling",
    releaseGoal: "Cutover preflight",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    nextAction: "Run preflight",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  fs.unlinkSync(path.join(repoRoot, ".agents", "artifacts", "PREVENTIVE_MEMORY.md"));

  const preflight = runCutoverPreflight({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(preflight.cutoverReady, false);
  assert.equal(preflight.rollbackBundle.needsOperatorBackup, true);
  assert.equal(
    preflight.rollbackBundle.missingPaths.some((item) => item.path.endsWith("PREVENTIVE_MEMORY.md")),
    true
  );
  assert.equal(preflight.blockers.some((item) => item.code === "rollback_bundle_missing"), true);
});

test("validation report writes a lightweight semantic trace summary for the active work item", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-validation-trace-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-04T10:10:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "QLT-02 semantic evidence contract",
    releaseGoal: "Persist lightweight semantic trace artifacts",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "QLT-02",
    title: "Evidence validation",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "qlt-02-planner-to-developer",
    handoffSummary: "Planning approved; implementation can proceed.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    payload: {
      nextFirstAction: "Implement the approved packet scope and hand off to Tester.",
      requiredSsot: [
        ".agents/artifacts/CURRENT_STATE.md",
        ".agents/artifacts/TASK_LIST.md",
        ".agents/artifacts/IMPLEMENTATION_PLAN.md"
      ]
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const reportMarkdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");
  const tracePath = path.join(repoRoot, ".agents", "runtime", "agent-traces", "QLT-02.json");
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));

  assert.equal(report.ok, true);
  assert.equal(report.report.traceSummary?.path, ".agents/runtime/agent-traces/QLT-02.json");
  assert.equal(report.report.traceSummary?.workItemId, "QLT-02");
  assert.equal(Array.isArray(report.report.candidateGates), true);
  assert.equal(report.report.candidateGates.length > 0, true);
  assert.equal(trace.workItemId, "QLT-02");
  assert.equal(trace.turnClosedAt, report.report.executedAt);
  assert.match(reportMarkdown, /harness structural\/state validation/);
  assert.match(reportMarkdown, /not product\/feature verification approval/);
  assert.match(reportMarkdown, /Tester\/Reviewer\/product-specific acceptance evidence/);
});

test("QLT-03 validator enforces reusable semantic trace contract from packet metadata", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-qlt03-trace-required-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_QLT-03_TEST.md";

  fs.writeFileSync(
    path.join(repoRoot, packetPath),
    [
      "# PKT-01 QLT-03 Test",
      "",
      "## Quick Decision Header",
      "| Item | Proposed | Why | Status |",
      "|---|---|---|---|",
      "| Work item | QLT-03 semantic trace and evidence gate generalization | test packet | approved |",
      "| Ready For Code | approved | test packet | approved |",
      "| Human sync needed | yes | test packet | approved |",
      "| Gate profile | contract | test packet | approved |",
      "| User-facing impact | none | test packet | not-needed |",
      "| Layer classification | core | test packet | approved |",
      "| Active profile dependencies | none | test packet | not-needed |",
      "| Profile evidence status | not-needed | test packet | not-needed |",
      "| UX archetype status | not-needed | test packet | not-needed |",
      "| UX deviation status | none | test packet | not-needed |",
      "| Environment topology status | not-needed | test packet | not-needed |",
      "| Domain foundation status | not-needed | test packet | not-needed |",
      "| Authoritative source intake status | approved | test packet | approved |",
      "| Shared-source wave status | not-needed | test packet | not-needed |",
      "| Packet exit gate status | pending | test packet | draft |",
      "| Improvement promotion status | proposed | test packet | draft |",
      "| Existing system dependency | none | test packet | not-needed |",
      "| New authoritative source impact | analyzed | test packet | approved |",
      "| Risk if started now | low | test packet | approved |",
      "",
      "## Scope",
      "- Layer classification: core",
      "- Required reading before code: `.agents/artifacts/CURRENT_STATE.md`, `.agents/artifacts/TASK_LIST.md`, this packet",
      "- Authoritative source intake reference: `reference/packets/PKT-01_QLT-02_EVIDENCE_VALIDATION_SEMANTIC_TRACE_AND_AGENT_EVAL_CI_GATING.md`",
      "- Authoritative source disposition: approved reusable baseline evidence from `QLT-02`",
      "- Existing plan conflict: old semantic-trace enforcement still depends on literal `QLT-02` naming",
      "- Current implementation impact: reusable validator/runtime evidence gating",
      "- Impacted packet set scope: single-packet",
      "- Semantic trace evidence status: requested"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-11T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "QLT-03 reusable trace contract",
    releaseGoal: "Enforce reusable semantic trace evidence.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "QLT-03",
    title: "Semantic trace and evidence gate generalization",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "task_packet:PKT-01_QLT-03_TEST",
    path: packetPath,
    category: "task_packet",
    title: "QLT-03 test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const validator = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(validator.ok, false);
  assert.equal(validator.findings.some((finding) => finding.code === "required_semantic_trace_missing"), true);
});

test("validator does not require semantic trace when reusable trace contract is not requested", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-qlt03-trace-not-requested-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_QLT-03_TEST.md";

  fs.writeFileSync(
    path.join(repoRoot, packetPath),
    [
      "# PKT-01 QLT-03 Test",
      "",
      "## Quick Decision Header",
      "| Item | Proposed | Why | Status |",
      "|---|---|---|---|",
      "| Work item | QLT-03 semantic trace and evidence gate generalization | test packet | approved |",
      "| Ready For Code | approved | test packet | approved |",
      "| Human sync needed | yes | test packet | approved |",
      "| Gate profile | contract | test packet | approved |",
      "| User-facing impact | none | test packet | not-needed |",
      "| Layer classification | core | test packet | approved |",
      "| Active profile dependencies | none | test packet | not-needed |",
      "| Profile evidence status | not-needed | test packet | not-needed |",
      "| UX archetype status | not-needed | test packet | not-needed |",
      "| UX deviation status | none | test packet | not-needed |",
      "| Environment topology status | not-needed | test packet | not-needed |",
      "| Domain foundation status | not-needed | test packet | not-needed |",
      "| Authoritative source intake status | approved | test packet | approved |",
      "| Shared-source wave status | not-needed | test packet | not-needed |",
      "| Packet exit gate status | pending | test packet | draft |",
      "| Improvement promotion status | proposed | test packet | draft |",
      "| Existing system dependency | none | test packet | not-needed |",
      "| New authoritative source impact | analyzed | test packet | approved |",
      "| Risk if started now | low | test packet | approved |",
      "",
      "## Scope",
      "- Layer classification: core",
      "- Required reading before code: `.agents/artifacts/CURRENT_STATE.md`, `.agents/artifacts/TASK_LIST.md`, this packet",
      "- Authoritative source intake reference: `reference/packets/PKT-01_QLT-02_EVIDENCE_VALIDATION_SEMANTIC_TRACE_AND_AGENT_EVAL_CI_GATING.md`",
      "- Authoritative source disposition: approved reusable baseline evidence from `QLT-02`",
      "- Existing plan conflict: old semantic-trace enforcement still depends on literal `QLT-02` naming",
      "- Current implementation impact: reusable validator/runtime evidence gating",
      "- Impacted packet set scope: single-packet"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-11T02:10:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "QLT-03 generic validator behavior",
    releaseGoal: "Do not false-fail when trace contract is not requested.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "QLT-03",
    title: "Semantic trace and evidence gate generalization",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "task_packet:PKT-01_QLT-03_TEST",
    path: packetPath,
    category: "task_packet",
    title: "QLT-03 test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const validator = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(validator.findings.some((finding) => finding.code === "required_semantic_trace_missing"), false);
});

test("SEC-01 validation report includes the Security Review Summary contract", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops05-security-review-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "sec-01-root",
        private: true,
        type: "module",
        engines: { node: ">=24.0.0" },
        scripts: {
          test: "node --test .harness/test/*.test.js",
          "harness:init": "node .agents/scripts/init-project.js",
          "harness:validate": "node .harness/runtime/state/dev05-cli.js validate",
          "harness:doctor": "node .harness/runtime/state/dev05-cli.js doctor",
          "harness:status": "node .harness/runtime/state/dev05-cli.js status",
          "harness:next": "node .harness/runtime/state/dev05-cli.js next",
          "harness:handoff": "node .harness/runtime/state/dev05-cli.js handoff",
          "harness:explain": "node .harness/runtime/state/dev05-cli.js explain",
          "harness:validation-report": "node .harness/runtime/state/dev05-cli.js validation-report",
          "harness:context": "node .harness/runtime/state/dev05-cli.js context",
          "harness:transition": "node .harness/runtime/state/dev05-cli.js transition",
          "harness:migration-preview": "node .harness/runtime/state/dev05-cli.js migration-preview",
          "harness:migration-apply": "node .harness/runtime/state/dev05-cli.js migration-apply",
          "harness:cutover-preflight": "node .harness/runtime/state/dev05-cli.js cutover-preflight",
          "harness:cutover-report": "node .harness/runtime/state/dev05-cli.js cutover-report",
          "package:release": "node packaging/build-release-package.js",
          "package:windows-exe": "node packaging/build-windows-exe-installers.js"
        }
      },
      null,
      2
    ),
    "utf8"
  );
  fs.mkdirSync(path.join(repoRoot, "standard-template"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "standard-template", "package.json"),
    JSON.stringify(
      {
        name: "sec-01-starter",
        private: true,
        type: "module",
        engines: { node: ">=24.0.0" },
        scripts: {
          test: "node --test .harness/test/*.test.js"
        }
      },
      null,
      2
    ),
    "utf8"
  );
  fs.mkdirSync(path.join(repoRoot, "installer"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "packaging"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "manuals"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "installer", "install-harness.js"), "// installer\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "installer", "INSTALL_HARNESS.cmd"), "@echo off\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-release-package.js"), "// package release\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-windows-exe-installers.js"), "// package windows\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "manuals", "HARNESS_MANUAL.md"), "# Harness Manual\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "README.md"), "# Starter\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "START_HERE.md"), "# Start\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "AGENTS.md"), "# Agents\n", "utf8");
  fs.mkdirSync(path.join(repoRoot, "standard-template", "reference", "manuals"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "standard-template", "reference", "manuals", "HARNESS_MANUAL.md"),
    "# Starter Manual\n",
    "utf8"
  );
  fs.writeFileSync(path.join(repoRoot, "standard-template", "INIT_STANDARD_HARNESS.cmd"), "@echo off\n", "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-10T01:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "SEC-01 implementation is in progress.",
    releaseGoal: "Produce reusable pre-review security and release evidence.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "SEC-01",
    title: "Release-assurance and security-automation hardening",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      securityReviewEvidence: {
        status: "requested",
        scope: ["package manifests", "release-facing artifacts", "declared security/release paths"],
        declaredPaths: [
          "reference/manuals/human/HARNESS_MANUAL.md",
          "standard-template/reference/manuals/human/HARNESS_MANUAL.md"
        ]
      }
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(report.markdownPath, "utf8");

  assert.equal(Boolean(report.report.securityReview), true);
  assert.equal(report.report.securityReview?.reviewRequiredCategories.length, 5);
  assert.equal(report.report.securityReview?.dependencyInventory.packages.length >= 2, true);
  assert.match(markdown, /## Security Review Summary/);
  assert.match(markdown, /Secret \/ credential exposure risk/);
  assert.match(markdown, /This summary is for internal IT\/security review preparation only/);
});

test("SEC-01 validation report blocks private key findings and preserves warning severity", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops05-security-findings-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, "package.json"),
    JSON.stringify(
      {
        name: "sec-01-root",
        private: true,
        type: "module",
        engines: { node: ">=24.0.0" }
      },
      null,
      2
    ),
    "utf8"
  );
  fs.mkdirSync(path.join(repoRoot, "reference", "manuals", "human"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "manuals", "human", "HARNESS_MANUAL.md"),
    "# Harness Manual\nlegacy operator console historical wording\n-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n",
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-10T01:05:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "SEC-01 implementation is in progress.",
    releaseGoal: "Produce reusable pre-review security and release evidence.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "SEC-01",
    title: "Release-assurance and security-automation hardening",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      securityReviewEvidence: {
        status: "requested",
        scope: ["package manifests", "release-facing artifacts", "declared security/release paths"],
        declaredPaths: ["reference/manuals/human/HARNESS_MANUAL.md"]
      }
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const findingCodes = new Set(report.report.findings.map((finding) => `${finding.severity}:${finding.code}`));

  assert.equal(report.ok, false);
  assert.equal(report.report.gateDecision, "hold");
  assert.equal(findingCodes.has("error:secret_scan_private_key_detected"), true);
  assert.equal(findingCodes.has("warning:release_artifact_deprecated_operator_console_reference"), true);
});

test("SEC-02 validation report activates reusable security review from packet metadata", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops08-security-review-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_SEC-02_TEST.md";

  fs.writeFileSync(
    path.join(repoRoot, packetPath),
    [
      "# PKT-01 SEC-02 Test",
      "",
      "## Quick Decision Header",
      "| Item | Proposed | Why | Status |",
      "|---|---|---|---|",
      "| Work item | SEC-02 reusable security review evidence generalization | test packet | approved |",
      "| Ready For Code | approve | test packet | approved |",
      "| Human sync needed | yes | test packet | approved |",
      "| Gate profile | contract | test packet | approved |",
      "| User-facing impact | none | test packet | not-needed |",
      "| Layer classification | core | test packet | approved |",
      "| Active profile dependencies | none | test packet | not-needed |",
      "| Profile evidence status | not-needed | test packet | not-needed |",
      "| UX archetype status | not-needed | test packet | not-needed |",
      "| UX deviation status | none | test packet | not-needed |",
      "| Environment topology status | not-needed | test packet | not-needed |",
      "| Domain foundation status | not-needed | test packet | not-needed |",
      "| Authoritative source intake status | approved | test packet | approved |",
      "| Shared-source wave status | not-needed | test packet | not-needed |",
      "| Packet exit gate status | pending | test packet | draft |",
      "| Improvement promotion status | proposed | test packet | draft |",
      "| Existing system dependency | none | test packet | not-needed |",
      "| New authoritative source impact | analyzed | test packet | approved |",
      "| Risk if started now | low | test packet | approved |",
      "",
      "## Scope",
      "- Layer classification: core",
      "- Required reading before code: `.agents/artifacts/CURRENT_STATE.md`, `.agents/artifacts/TASK_LIST.md`, this packet",
      "- Security review evidence status: requested",
      "- Security review evidence scope: package manifests; release-facing artifacts; declared security/release paths",
      "- Declared security/release paths: reference/manuals/human/HARNESS_MANUAL.md; standard-template/reference/manuals/human/HARNESS_MANUAL.md"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, "package.json"),
    JSON.stringify({ name: "ops-08-root", private: true, type: "module", engines: { node: ">=24.0.0" } }, null, 2),
    "utf8"
  );
  fs.mkdirSync(path.join(repoRoot, "standard-template"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "standard-template", "package.json"),
    JSON.stringify({ name: "ops-08-starter", private: true, type: "module", engines: { node: ">=24.0.0" } }, null, 2),
    "utf8"
  );
  fs.mkdirSync(path.join(repoRoot, "installer"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "packaging"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "manuals"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "installer", "install-harness.js"), "// installer\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "installer", "INSTALL_HARNESS.cmd"), "@echo off\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-release-package.js"), "// package release\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-windows-exe-installers.js"), "// package windows\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "manuals", "HARNESS_MANUAL.md"), "# Harness Manual\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "README.md"), "# Starter\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "START_HERE.md"), "# Start\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "standard-template", "AGENTS.md"), "# Agents\n", "utf8");
  fs.mkdirSync(path.join(repoRoot, "standard-template", "reference", "manuals"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "standard-template", "reference", "manuals", "HARNESS_MANUAL.md"),
    "# Starter Manual\n",
    "utf8"
  );
  fs.writeFileSync(path.join(repoRoot, "standard-template", "INIT_STANDARD_HARNESS.cmd"), "@echo off\n", "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-11T01:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "SEC-02 implementation is in progress.",
    releaseGoal: "Generalize reusable security-review evidence.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "SEC-02",
    title: "Reusable security review evidence generalization",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "task_packet:PKT-01_SEC-02_TEST",
    path: packetPath,
    category: "task_packet",
    title: "SEC-02 test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(report.markdownPath, "utf8");

  assert.equal(report.report.securityReview?.contractStatus, "requested");
  assert.equal(report.report.securityReview?.activationSource, "packet metadata");
  assert.match(markdown, /## Security Review Summary/);
  assert.match(markdown, /Activation source: packet metadata/);
  assert.match(
    markdown,
    /Declared security\/release paths: reference\/manuals\/human\/HARNESS_MANUAL\.md, standard-template\/reference\/manuals\/human\/HARNESS_MANUAL\.md/
  );
});

test("validation report keeps an explicit not-applicable security review section when not requested", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-security-review-not-applicable-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-11T01:10:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling is in progress.",
    releaseGoal: "Keep validation surfaces explicit.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    owner: "developer",
    nextAction: "Write validation evidence.",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(report.markdownPath, "utf8");

  assert.equal(report.ok, true);
  assert.equal(report.report.securityReview?.contractStatus, "not-applicable");
  assert.match(markdown, /## Security Review Summary/);
  assert.match(markdown, /Status: not-applicable/);
  assert.match(markdown, /not requested by current packet\/runtime metadata/);
});

test("cutover report writes markdown and json evidence files", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-cutover-report-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-20T04:30:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "DEV-05 tooling",
    releaseGoal: "Cutover report",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-05",
    title: "validator / migration / cutover tooling",
    status: "in_progress",
    owner: "developer",
    nextAction: "Write cutover report",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const report = writeCutoverReport({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(report.cutoverReady, true);
  assert.equal(fs.existsSync(report.markdownPath), true);
  assert.equal(fs.existsSync(report.jsonPath), true);
  assert.match(fs.readFileSync(report.markdownPath, "utf8"), /# Cutover Precheck/);
  assert.match(fs.readFileSync(report.markdownPath, "utf8"), /Ready: yes/);
  assert.match(fs.readFileSync(report.markdownPath, "utf8"), /needs operator backup: no/);
});

test("validator reports starter bootstrap pending before the copied starter is initialized", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-starter-bootstrap-pending-"));
  seedStarterRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, false);
  assert.equal(result.findings.some((item) => item.code === "starter_bootstrap_pending"), true);
});

test("validation report holds and stays read-only before copied starter initialization", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-starter-bootstrap-report-readonly-"));
  seedStarterRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const result = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, false);
  assert.equal(result.report.gateDecision, "hold");
  assert.equal(result.report.findings.some((item) => item.code === "starter_bootstrap_pending"), true);
  assert.equal(result.markdownPath, null);
  assert.equal(result.jsonPath, null);
  assert.equal(fs.existsSync(dbPath), false);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md")), false);
});

test("validator becomes clean after the copied starter is initialized", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-starter-bootstrap-ready-"));
  seedStarterRepo(repoRoot);

  initializeProjectStarter({
    repoRoot,
    projectName: "Starter Ready Repo",
    userGoal: "goal",
    opsGoal: "ops",
    approvalGoal: "approval",
    now: createClock("2026-04-23T04:45:00.000Z")
  });

  const result = runValidator({
    repoRoot,
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    outputDir: repoRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test("validator starter sync covers approved reusable documentation and schema-summary surfaces", () => {
  if (!runningInMaintainerRepo()) {
    return;
  }

  const cases = [
    ".agents/rules/HARNESS_OPERATING_CONTRACT.md",
    ".agents/runtime/operating_state.schema.json",
    "reference/README.md",
    "reference/manuals/human/HARNESS_MANUAL.md"
  ];

  for (const relativePath of cases) {
    const repoRoot = cloneMaintainerRepoFixture(`dev05-starter-sync-${path.basename(relativePath, path.extname(relativePath))}-`);
    const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
    const absolutePath = path.join(repoRoot, relativePath);
    if (relativePath.endsWith(".json")) {
      const content = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
      content.validatorCoverageProbe = `mutated:${relativePath}`;
      fs.writeFileSync(absolutePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
    } else {
      fs.writeFileSync(absolutePath, `${fs.readFileSync(absolutePath, "utf8")}\n<!-- mutated:${relativePath} -->\n`, "utf8");
    }

    const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
    const finding = result.findings.find(
      (candidate) => candidate.code === "starter_sync_drift" && candidate.path === relativePath
    );
    assert.ok(finding, `expected starter_sync_drift for ${relativePath}`);
    assert.match(finding.rootPath, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\\\\", "/")));
    assert.match(finding.starterPath, /standard-template/);
    assert.match(finding.remediation, /Mirror the reusable file/);
    assert.match(finding.message, /root=/);
    assert.match(finding.message, /starter=/);
  }
});

test("validator enforces explicit runtime schema authority markers", () => {
  if (!runningInMaintainerRepo()) {
    return;
  }

  const repoRoot = cloneMaintainerRepoFixture("dev05-schema-authority-");
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const compatibilityPath = path.join(repoRoot, ".agents", "runtime", "operating_state.schema.json");
  const compatibility = JSON.parse(fs.readFileSync(compatibilityPath, "utf8"));
  delete compatibility.authoritySource;
  fs.writeFileSync(compatibilityPath, `${JSON.stringify(compatibility, null, 2)}\n`, "utf8");

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "runtime_schema_authority_mismatch" &&
        finding.path === ".agents/runtime/operating_state.schema.json"
    ),
    true
  );
});

test("copied starter next and handoff prioritize bootstrap work over stale open history", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-starter-next-routing-"));
  seedStarterRepo(repoRoot);

  initializeProjectStarter({
    repoRoot,
    projectName: "Starter Routing Repo",
    userGoal: "goal",
    opsGoal: "ops",
    approvalGoal: "approval",
    now: createClock("2026-04-23T04:50:00.000Z")
  });

  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const next = recommendNextAction({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(next.ok, true);
  assert.equal(next.nextOwner?.toLowerCase(), "planner");
  assert.equal(next.nextTask?.workItemId, "PLN-00");

  const handoff = resolveHandoff({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(handoff.ok, true);
  assert.equal(handoff.nextOwner?.toLowerCase(), "planner");
  assert.equal(handoff.workflow, ".agents/workflows/planner.md");
  assert.equal(handoff.nextTask?.workItemId, "PLN-00");
});

test("validator enforces gate profile evidence for active packet work", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-gate-profile-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_GATE_PROFILE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: null, includeManifest: false });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 gate profile validation",
    releaseGoal: "Validate gate profile contracts",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "planning",
    nextAction: "Approve gate profile evidence.",
    owner: "planner",
    sourceRef: packetPath
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_GATE_PROFILE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 gate profile test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, false);
  assert.equal(result.findings.some((item) => item.code === "gate_profile_missing"), true);
});

test("validator blocks packet-header-only Ready For Code approval", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ready-for-code-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_READY_FOR_CODE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:05:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 Ready For Code consistency",
    releaseGoal: "Validate approval state consistency",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "in_progress",
    nextAction: "Reconcile approval state.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract" }
  });
  store.recordDecision({
    decisionId: "FLOW-01-ready-for-code",
    title: "FLOW-01 Ready For Code",
    decisionNeeded: true,
    impactSummary: "Packet header alone must not close implementation approval.",
    sourceRef: packetPath
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_READY_FOR_CODE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 Ready For Code consistency packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, false);
  assert.equal(result.findings.some((item) => item.code === "ready_for_code_metadata_mismatch"), true);
  assert.equal(result.findings.some((item) => item.code === "ready_for_code_decision_open"), true);
});

test("transition blocks planner-to-developer before Ready For Code approval", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-ready-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_READY_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:10:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 transition approval guard",
    releaseGoal: "Validate transition approval guard",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "planning",
    nextAction: "Approve FLOW-01 Ready For Code.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_READY_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition Ready For Code guard packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "planner-to-developer", "--work-item", "FLOW-01"]
  });

  assert.equal(preview.ok, false);
  assert.match(preview.errors.join("\n"), /Ready For Code approved/);
});

test("buildHarnessStatus separates technical validation from workflow gate approval state", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-status-gate-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_STATUS_GATE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-22T01:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 approval split",
    releaseGoal: "Separate technical validation from workflow approval state",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Workflow gate split",
    status: "planning",
    nextAction: "Approve FLOW-01 Ready For Code.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "pending" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_STATUS_GATE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 status gate split packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.ok, true);
  assert.equal(status.technicalValidation.ok, true);
  assert.equal(status.technicalValidation.runtimeValidationReady, true);
  assert.equal(status.workflowGate.status, "blocked");
  assert.match(status.workflowGate.detail, /Ready For Code approval/);
});

test("status and validation report expose chosen route while keeping rejection detail in validation-report", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-fast-path-route-status-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_FAST_PATH_STATUS_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "light",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 FLOW-01 fast path status test",
    workItemTitle: "FLOW-01 fast path status test"
  });

  const packetAbsolutePath = path.join(repoRoot, packetPath);
  let packetContent = fs.readFileSync(packetAbsolutePath, "utf8");
  packetContent = packetContent.replace(
    "| User-facing impact |",
    [
      "| Risk class | low | Declared low-risk fixture | approved |",
      "| Route class | fast-path | Requested route for fixture | approved |",
      "| User-facing impact |"
    ].join("\n")
  );
  packetContent += [
    "",
    "## Fast Path Note",
    "- requested change: local copy-only wording update",
    "- why low risk: no reusable authority change",
    "- data migration: no",
    "- auth/security: no",
    "- external api contract: no",
    "- release/deploy/cutover: no",
    "- schema change: no",
    "- workflow/validator authority: no",
    "- architecture or reusable runtime change: no",
    "- files changed: reference/manuals/human/HARNESS_MANUAL.md",
    "- verification run: node --test .harness/test/dev05-tooling.test.js",
    "- residual risk: low",
    "- follow-up needed: none",
    ""
  ].join("\n");
  fs.writeFileSync(packetAbsolutePath, packetContent, "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-31T03:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 route visibility",
    releaseGoal: "Expose chosen route in status and detailed route eligibility in validation-report",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Fast path route visibility",
    status: "in_progress",
    nextAction: "Tester should verify route reporting.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "light", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_FAST_PATH_STATUS_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 fast path status test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.assignment?.requestedRouteClass, "fast-path");
  assert.equal(status.assignment?.chosenRouteClass, "fast-path");
  assert.equal(status.assignment?.routeEligibility, "eligible");

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  const markdown = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), "utf8");
  assert.equal(typeof report.report.gateDecision, "string");
  assert.match(markdown, /requested route fast-path, chosen route fast-path, eligibility eligible/);
});

test("buildHarnessStatus reads only the first Active Profile Table", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-active-profile-first-table-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"),
    [
      "# Active Profiles",
      "",
      "## Active Profile Table",
      "| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |",
      "|---|---|---|---|---|---|---|",
      "",
      "## Candidate Profiles",
      "| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |",
      "|---|---|---|---|---|---|---|",
      "| PRF-08 | candidate only | - | approved | planner | 2026-05-22T01:05:00.000Z | PKT-01_FLOW-01 |"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-22T01:05:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 active profile parse boundary",
    releaseGoal: "Ignore candidate profile tables in status output",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.activeProfiles.status, "empty");
  assert.equal(status.activeProfiles.profiles.length, 0);
});

test("transition infers named handoff from work-item and target-owner positional shorthand", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-positional-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_POSITIONAL_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-22T01:10:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 positional transition shorthand",
    releaseGoal: "Allow work-item and target-owner shorthand",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Transition shorthand",
    status: "planning",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_POSITIONAL_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 positional transition packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["FLOW-01", "developer"]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.transition, "planner-to-developer");
  assert.equal(preview.workItemId, "FLOW-01");
  assert.equal(preview.fromOwner, "planner");
  assert.equal(preview.toOwner, "developer");
});

test("runStateSync executes validate, validation-report, context, and status in order", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-sync-state-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_SYNC_STATE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-22T01:15:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 sync-state",
    releaseGoal: "Wrap the standard state regeneration sequence",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Sync state wrapper",
    status: "in_progress",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_SYNC_STATE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 sync-state packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runStateSync({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(result.ok, true);
  assert.deepEqual(result.orderedSteps, ["validate", "validation-report", "context", "status"]);
  assert.deepEqual(result.steps.map((step) => step.name), ["validate", "validation-report", "context", "status"]);
  assert.equal(result.failedStep, null);
  assert.equal(result.nextCommand, null);
  assert.match(result.scopeNote, /not product verification/);
  assert.equal(result.validationReport.gateDecision, "pass");
  assert.equal(result.technicalValidation.ok, true);
  assert.equal(result.workflowGate.status, "open");
  assert.equal(fs.existsSync(result.context.jsonPath), true);
  assert.equal(fs.existsSync(result.context.markdownPath), true);
});

test("runStateSync clears stale failed step after ordered refresh converges", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-sync-state-converge-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_SYNC_STATE_CONVERGE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-22T01:30:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 sync-state convergence",
    releaseGoal: "Clear stale sync-state failure summaries after convergence.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Sync state convergence",
    status: "in_progress",
    nextAction: "Implement the approved packet scope and hand off to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_SYNC_STATE_CONVERGE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 sync-state convergence packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "{}\n", "utf8");

  const result = runStateSync({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, true);
  assert.equal(result.steps[0].ok, false);
  assert.equal(result.failedStep, null);
  assert.equal(result.nextCommand, null);
  assert.match(result.convergenceNote, /validate failed before ordered refresh converged/);
  assert.equal(result.technicalValidation.ok, true);
});

test("transition keeps live Ready For Code state from work-item metadata when packet header is stale", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-live-rfc-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_LIVE_RFC_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:11:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 live Ready For Code state",
    releaseGoal: "Validate live Ready For Code authority",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "in_progress",
    nextAction: "Hand off FLOW-01 to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_LIVE_RFC_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition live Ready For Code packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "developer-to-tester", "--work-item", "FLOW-01"]
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.readyForCode, "approved");
});

test("transition blocks planner-to-developer until Ready For Code decision is closed", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-decision-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_DECISION_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:12:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 transition decision guard",
    releaseGoal: "Validate transition decision guard",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "planning",
    nextAction: "Close FLOW-01 Ready For Code decision.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract" }
  });
  store.recordDecision({
    decisionId: "FLOW-01-ready-for-code",
    title: "FLOW-01 Ready For Code",
    decisionNeeded: true,
    impactSummary: "Developer handoff requires closing this approval decision.",
    sourceRef: packetPath
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_DECISION_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition decision guard packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const blockedPreview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "planner-to-developer", "--work-item", "FLOW-01"]
  });
  assert.equal(blockedPreview.ok, false);
  assert.match(blockedPreview.errors.join("\n"), /--close-decision/);

  const allowedPreview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--transition",
      "planner-to-developer",
      "--work-item",
      "FLOW-01",
      "--close-decision",
      "FLOW-01-ready-for-code"
    ]
  });
  assert.equal(allowedPreview.ok, true);
  assert.deepEqual(allowedPreview.closeDecisions, ["FLOW-01-ready-for-code"]);
});

test("transition apply reports post-apply validation failure at top level", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-validation-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_VALIDATION_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: false });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:14:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 transition validation reporting",
    releaseGoal: "Validate transition validation reporting",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "in_progress",
    nextAction: "Hand off to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_VALIDATION_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition validation reporting packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "developer-to-tester", "--work-item", "FLOW-01", "--apply"]
  });

  assert.equal(applied.apply, true);
  assert.equal(applied.ok, false);
  assert.equal(applied.validationReport.ok, false);
  assert.equal(applied.validationReport.findingCount > 0, true);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json")), true);
  assert.match(applied.errors.join("\n"), /validation report failed/);
});

test("validator blocks incomplete active context re-entry contract", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-active-context-contract-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-04T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "CONTEXT-01 active context contract",
    releaseGoal: "Block incomplete re-entry contract",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "CONTEXT-01",
    title: "Session-start context assurance",
    status: "in_progress",
    nextAction: "Finish the active context contract.",
    owner: "developer",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"),
    JSON.stringify({ schemaVersion: "broken" }, null, 2),
    "utf8"
  );

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(result.ok, false);
  assert.equal(result.findings.some((item) => item.code === "checksum_mismatch"), true);
  assert.equal(
    result.findings.some((item) => item.code === "active_context_contract_missing_field"),
    true
  );
});

test("transition preview is review-first and apply updates state surfaces", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: planning",
      "- Current Focus: FLOW-01 planning",
      "",
      "## Next Recommended Agent",
      "- Planner",
      "",
      "## Open Decisions / Blockers",
      "- `FLOW-01 Ready For Code` remains pending.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage | planner | active | 2026-05-02 | planning |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage | gate profiles and transition automation | planner | planning | P0 | BASE-01 | pending |",
      "- Next first action: Approve FLOW-01 Ready For Code.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-02T10:15:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 planning",
    releaseGoal: "Validate transition automation",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "planning",
    nextAction: "Approve FLOW-01 Ready For Code.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract" }
  });
  store.recordDecision({
    decisionId: "FLOW-01-approval",
    title: "FLOW-01 Ready For Code",
    decisionNeeded: true,
    impactSummary: "Developer implementation requires user approval.",
    sourceRef: packetPath
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--transition",
      "planner-to-developer",
      "--work-item",
      "FLOW-01",
      "--close-decision",
      "FLOW-01-approval"
    ]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.apply, false);
  assert.equal(preview.toOwner, "developer");
  assert.equal(preview.plannedUpdates.includes(".agents/artifacts/IMPLEMENTATION_PLAN.md"), true);

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--transition",
      "planner-to-developer",
      "--work-item",
      "FLOW-01",
      "--gate-profile",
      "contract",
      "--current-focus",
      "FLOW-01 implementation",
      "--close-decision",
      "FLOW-01-approval",
      "--apply"
    ]
  });

  assert.equal(applied.apply, true);
  assert.equal(applied.apply, true);
  assert.equal(applied.validationReport.ok, true);
  assert.match(
    fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"), "utf8"),
    /\| FLOW-01 \| Reusable transition coverage \| [^|]+ \| developer \| in_progress \|/
  );
  const taskList = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"), "utf8");
  assert.match(taskList, /- Next first action: Implement the approved packet scope and hand off to Tester\./);
  assert.match(taskList, /\[planner -> developer\] Planning approved; implementation can proceed\./);
  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(currentState, /Current Stage: implementation/);
  assert.match(currentState, /`FLOW-01` Ready For Code is approved; active handoff is `planner -> developer`\./);
  assert.match(currentState, /\[planner -> developer\] Planning approved; implementation can proceed\./);
  const implementationPlan = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"), "utf8");
  assert.match(implementationPlan, /`FLOW-01` active handoff is `planner -> developer`\./);
  assert.match(implementationPlan, /Implement the approved packet scope and hand off to Tester\./);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json")), true);
  const persistedReport = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"), "utf8")
  );
  assert.equal(persistedReport.gateDecision, "pass");
  const settledValidation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(settledValidation.ok, true);

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getWorkItem("FLOW-01").metadata.readyForCode, "approved");
  assert.equal(afterStore.listDecisions({ status: "open", decisionNeeded: true }).length, 0);
  afterStore.close();
});

test("developer-to-tester transition writes the required active lock for review status", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-review-lock-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_REVIEW_LOCK_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-15T03:10:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 implementation complete",
    releaseGoal: "Keep tester handoff state validator-clean",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage",
    status: "in_progress",
    nextAction: "Hand off FLOW-01 to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_REVIEW_LOCK_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 review lock transition packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "developer-to-tester", "--work-item", "FLOW-01", "--apply"]
  });

  assert.equal(applied.apply, true);
  assert.equal(applied.ok, true);
  assert.equal(applied.refreshCommand, "npm run harness:sync-state");
  assert.match(applied.refreshNote, /validate -> validation-report -> context -> status/);
  assert.equal(applied.validationReport.ok, true);
  const taskList = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"), "utf8");
  assert.match(taskList, /\| FLOW-01 \| Reusable transition coverage \| tester \| active \| \d{4}-\d{2}-\d{2} \|/);
  assert.match(taskList, /\| FLOW-01 \| Reusable transition coverage \| [^|]+ \| tester \| review \|/);
  const validation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(validation.ok, true);
});

test("transition refreshes keyed current-state truth notes on tester-to-reviewer handoff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-truth-note-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_TRUTH_NOTE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: verification",
      "- Current Focus: FLOW-01 revised implementation complete; Tester verifying design access.",
      "",
      "## Next Recommended Agent",
      "- Tester",
      "",
      "## Open Decisions / Blockers",
      "- `FLOW-01` Ready For Code is approved; Tester verification is pending.",
      "",
      "## Current Truth Notes",
      "- `FLOW-01` revised developer evidence remains queued for Tester verification.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage | tester | active | 2026-05-03 | verification |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage packet | revised FLOW-01 closeout | tester | review | P0 | BASE-01 | tester verification pending |",
      "- Next first action: Reviewer should assess revised FLOW-01 closeout readiness.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T01:20:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "FLOW-01 revised implementation complete; Tester verifying design access.",
    releaseGoal: "Validate keyed CURRENT_STATE transition refresh",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage packet",
    status: "review",
    nextAction: "Reviewer should assess revised FLOW-01 closeout readiness.",
    owner: "tester",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_TRUTH_NOTE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition truth-note packet",
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
      "tester-to-reviewer",
      "--work-item",
      "FLOW-01",
      "--summary",
      "Tester verification completed.",
      "--next-action",
      "Reviewer should assess revised FLOW-01 closeout readiness.",
      "--current-focus",
      "FLOW-01 under reviewer closeout assessment.",
      "--apply"
    ]
  });

  assert.equal(applied.apply, true);
  assert.equal(applied.apply, true);
  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.doesNotMatch(currentState, /Tester verification is pending/);
  assert.doesNotMatch(currentState, /queued for Tester verification/);
  assert.match(
    currentState,
    /`FLOW-01` Ready For Code is approved; active handoff is `tester -> reviewer`\./
  );
  assert.match(
    currentState,
    /`FLOW-01` remains the active work item\. Current handoff is `tester -> reviewer`; stage is `review`; gate profile is `contract`\./
  );
});

test("transition applies reviewer-to-developer defaults and preserves Ready For Code state when source is review report", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-review-source-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_REVIEW_SOURCE_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
    "# Review Report\n\n## FLOW-01 Finding\n- Reviewer requested remediation.\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: review",
      "- Current Focus: FLOW-01 under reviewer closeout assessment.",
      "",
      "## Next Recommended Agent",
      "- Reviewer",
      "",
      "## Open Decisions / Blockers",
      "- `FLOW-01` Ready For Code is approved; active handoff is `tester -> reviewer`. Reviewer should assess revised FLOW-01 closeout readiness.",
      "",
      "## Current Truth Notes",
      "- `FLOW-01` remains the active work item. Current handoff is `tester -> reviewer`; stage is `review`; gate profile is `contract`.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage | reviewer | active | 2026-05-03 | review |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage packet | revised FLOW-01 closeout | reviewer | review | P0 | BASE-01 | review closeout pending |",
      "- Next first action: Developer should remediate the current-state transition issue.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T01:25:00.000Z") });
  store.setReleaseState({
    currentStage: "review",
    releaseGateState: "open",
    currentFocus: "FLOW-01 under reviewer closeout assessment.",
    releaseGoal: "Validate review-report transition fallback",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage packet",
    status: "review",
    nextAction: "Reviewer should assess revised FLOW-01 closeout readiness.",
    owner: "reviewer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_REVIEW_SOURCE_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition review-source packet",
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
      "reviewer-to-developer",
      "--work-item",
      "FLOW-01",
      "--source-ref",
      "reference/artifacts/REVIEW_REPORT.md",
      "--apply"
    ]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.apply, true);
  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(currentState, /Current Stage: implementation/);
  assert.match(currentState, /Current Focus: FLOW-01 reviewer finding remediation is in progress\./);
  assert.match(
    currentState,
    /`FLOW-01` Ready For Code is approved; active handoff is `reviewer -> developer`\./
  );
  assert.match(
    currentState,
    /`FLOW-01` remains the active work item\. Current handoff is `reviewer -> developer`; stage is `implementation`; gate profile is `contract`\./
  );
  assert.doesNotMatch(currentState, /Ready For Code status is ;/);
});

test("transition infers reviewer-to-developer remediation wording for explicit custom owner handoff", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-review-custom-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_REVIEW_CUSTOM_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
    "# Review Report\n\n## FLOW-01 Finding\n- Reviewer requested remediation.\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: review",
      "- Current Focus: FLOW-01 under reviewer closeout assessment.",
      "",
      "## Next Recommended Agent",
      "- Reviewer",
      "",
      "## Open Decisions / Blockers",
      "- `FLOW-01` Ready For Code is approved; active handoff is `tester -> reviewer`. Review implementation, evidence, residual debt, and closeout readiness.",
      "- User approved the remaining remediation scope; Reviewer is assessing closeout under FLOW-01.",
      "",
      "## Current Truth Notes",
      "- `FLOW-01` remains the active work item. Current handoff is `tester -> reviewer`; stage is `review`; gate profile is `contract`.",
      "- `PKT-01_FLOW-01_TRANSITION_REVIEW_CUSTOM_TEST.md` is Ready For Code approved and in Reviewer closeout review.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage | reviewer | active | 2026-05-03 | review |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage packet | revised FLOW-01 closeout | reviewer | review | P0 | BASE-01 | review closeout pending |",
      "- Next first action: Review implementation, evidence, residual debt, and closeout readiness.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T01:30:00.000Z") });
  store.setReleaseState({
    currentStage: "review",
    releaseGateState: "open",
    currentFocus: "FLOW-01 under reviewer closeout assessment.",
    releaseGoal: "Validate custom remediation transition defaults",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage packet",
    status: "review",
    nextAction: "Review implementation, evidence, residual debt, and closeout readiness.",
    owner: "reviewer",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_REVIEW_CUSTOM_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition review-custom packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--to",
      "developer",
      "--work-item",
      "FLOW-01",
      "--source-ref",
      "reference/artifacts/REVIEW_REPORT.md",
      "--apply"
    ]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.apply, true);
  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(currentState, /Current Stage: implementation/);
  assert.match(currentState, /Current Focus: FLOW-01 reviewer finding remediation is in progress\./);
  assert.match(
    currentState,
    /`FLOW-01` Ready For Code is approved; active handoff is `reviewer -> developer`\. Remediate the reviewer finding, rerun tests and validation, and hand off to Tester\./
  );
  assert.match(
    currentState,
    /`FLOW-01` remains the active work item\. Current handoff is `reviewer -> developer`; stage is `implementation`; gate profile is `contract`\./
  );
  assert.match(
    currentState,
    /User-approved `FLOW-01` scope remains active\. Ready For Code is approved; current handoff is `reviewer -> developer`\. Remediate the reviewer finding, rerun tests and validation, and hand off to Tester\./
  );
  assert.match(
    currentState,
    /`PKT-01_FLOW-01_TRANSITION_REVIEW_CUSTOM_TEST\.md` remains the active packet for scope boundary, human approval text, and audit evidence; live handoff is `reviewer -> developer`; live stage is Developer implementation\./
  );
  assert.doesNotMatch(currentState, /under reviewer closeout assessment/);
  assert.doesNotMatch(currentState, /Reviewer is assessing closeout under FLOW-01/);
});

test("release transition preserves the release-baseline focus prefix", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-release-focus-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_RELEASE_FOCUS_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "release", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: implementation",
      "- Current Focus: V1.3 standard harness starter baseline is implemented and verified; RELEASE-01 reviewer finding remediation is in progress.",
      "- Current Release Goal: Preserve the V1.3 installable standard harness starter while keeping Active Context as the re-entry surface.",
      "",
      "## Next Recommended Agent",
      "- Developer",
      "",
      "## Open Decisions / Blockers",
      "- `RELEASE-01` Ready For Code is approved; active handoff is `reviewer -> developer`. Remediate the reviewer finding, rerun tests and validation, and hand off to Tester.",
      "- Developer is implementing starter release-readiness remediation while preserving the AI-facing / human-facing SSOT split.",
      "",
      "## Current Truth Notes",
      "- `RELEASE-01` remains the active work item. Current handoff is `reviewer -> developer`; stage is `implementation`; gate profile is `release`.",
      "- `V1.3 standard harness starter baseline is implemented and verified` remains the required release-baseline marker even while RELEASE-01 remediation is still open.",
      "- `PKT-01_RELEASE_FOCUS_TEST.md` remains the active packet for scope boundary, human approval text, and audit evidence; live handoff is `reviewer -> developer`; live stage is Developer implementation.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| RELEASE-01 | Starter release focus remediation | developer | active | 2026-05-03 | custom; gate release; Remediate the reviewer finding, rerun tests and validation, and hand off to Tester. |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| RELEASE-01 | Starter release focus remediation packet | release baseline focus preservation | developer | in_progress | P0 | PLAN-01 | gate release; Remediate the reviewer finding, rerun tests and validation, and hand off to Tester. |",
      "- Next first action: Remediate the reviewer finding, rerun tests and validation, and hand off to Tester.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "V1.3 standard harness starter baseline is implemented and verified; RELEASE-01 reviewer finding remediation is in progress.",
    releaseGoal: "Preserve the V1.3 installable standard harness starter while keeping Active Context as the re-entry surface.",
    sourceRef: packetPath,
    metadata: { releaseBaseline: "V1.3" }
  });
  store.upsertWorkItem({
    workItemId: "RELEASE-01",
    title: "Starter release focus remediation packet",
    status: "in_progress",
    nextAction: "Remediate the reviewer finding, rerun tests and validation, and hand off to Tester.",
    owner: "developer",
    sourceRef: packetPath,
    metadata: { gateProfile: "release", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_RELEASE_FOCUS_TEST",
    path: packetPath,
    category: "task_packet",
    title: "Starter release focus transition test packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["--transition", "developer-to-tester", "--work-item", "RELEASE-01", "--apply"]
  });

  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(
    currentState,
    /Current Focus: V1\.3 standard harness starter baseline is implemented and verified; RELEASE-01 implementation is ready for Tester verification\./
  );
  assert.match(
    currentState,
    /`RELEASE-01` Ready For Code is approved; active handoff is `developer -> tester`\. Verify the implementation against the packet acceptance criteria\./
  );
  assert.match(
    currentState,
    /`PKT-01_RELEASE_FOCUS_TEST\.md` remains the active packet for scope boundary, human approval text, and audit evidence; live handoff is `developer -> tester`; live stage is Tester verification\./
  );
});

test("terminal transition closes active task bookkeeping and preserves planner next action", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-transition-closeout-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-01_TRANSITION_CLOSEOUT_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: planning",
      "- Current Focus: FLOW-01 closeout approved; Planner selecting the next lane.",
      "",
      "## Next Recommended Agent",
      "- Planner",
      "",
      "## Open Decisions / Blockers",
      "- `FLOW-01` Ready For Code is approved; active handoff is `reviewer -> planner`. Planner should record FLOW-01 closeout and choose the next approved lane.",
      "",
      "## Current Truth Notes",
      "- `FLOW-01` remains the active work item. Current handoff is `reviewer -> planner`; stage is `planning`; gate profile is `contract`.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| FLOW-01 | Harness operation reliability and friction reduction | planner | active | 2026-05-03 | reviewer-to-planner closeout pending |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| FLOW-01 | Reusable transition coverage packet | revised FLOW-01 closeout | planner | planning | P0 | BASE-01 | planner closeout pending |",
      "- Next first action: Planner should record FLOW-01 closeout and choose the next approved lane.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "PROJECT_PROGRESS.md"),
    [
      "# Project Progress",
      "",
      "## Summary",
      "Transition closeout test board.",
      "",
      "## Progress Board",
      "| Phase | Task ID | Task | Status | Notes | Source |",
      "| --- | --- | --- | --- | --- | --- |",
      `| Ops | FLOW-01 | Harness operation reliability and friction reduction | planning | Reviewer approved closeout; planner bookkeeping pending. | ${packetPath} |`
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"),
    [
      "# Implementation Plan",
      "",
      "## Operator Next Action",
      "- `FLOW-01` active handoff is `reviewer -> planner`.",
      "- Planner should record FLOW-01 closeout and choose the next approved lane.",
      `- Source packet: \`${packetPath}\`.`,
      "- Preserve packet-before-code, Active Context derived-state boundaries, generated-doc immutability, root/starter sync, Tester/Reviewer separation, and human approval gates."
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T01:40:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-01 closeout approved; Planner selecting the next lane.",
    releaseGoal: "Validate planner closeout bookkeeping",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-01",
    title: "Reusable transition coverage packet",
    status: "planning",
    nextAction: "Planner should record FLOW-01 closeout and choose the next approved lane.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-01_TRANSITION_CLOSEOUT_TEST",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-01 transition closeout packet",
    sourceRef: packetPath
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();
  const initialReport = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(initialReport.ok, true);

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "--transition",
      "planner-closeout",
      "--work-item",
      "FLOW-01",
      "--from",
      "planner",
      "--to",
      "planner",
      "--status",
      "done",
      "--source-ref",
      packetPath,
      "--summary",
      "Planner recorded FLOW-01 closeout after reviewer approval.",
      "--next-action",
      "Planner should choose the next approved lane and open the next packet only after human agreement.",
      "--current-stage",
      "planning",
      "--current-focus",
      "FLOW-01 closed; Planner selecting the next approved lane.",
      "--apply"
    ]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.apply, true);
  assert.equal(applied.validationReport.ok, true);

  const taskList = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"), "utf8");
  assert.doesNotMatch(taskList, /\| FLOW-01 \| Harness operation reliability and friction reduction \| planner \| active \|/);
  assert.doesNotMatch(taskList, /\| FLOW-01 \| Reusable transition coverage packet \| revised FLOW-01 closeout \| planner \| planning \|/);
  assert.match(taskList, /\| - \| None \| - \| clear \| - \| - \|/);
  assert.match(taskList, /\| - \| None \| - \| - \| clear \| - \| - \| - \|/);
  assert.match(
    taskList,
    /\| FLOW-01 \| Reusable transition coverage packet \| \d{4}-\d{2}-\d{2} \| transition planner -> planner; gate contract \| Planner recorded FLOW-01 closeout after reviewer approval\. Planner should choose the next approved lane and open the next packet only after human agreement\. \|/
  );

  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  assert.match(
    currentState,
    /`FLOW-01` is closed; latest handoff is `planner -> planner`\. Planner should choose the next approved lane and open the next packet only after human agreement\./
  );
  assert.match(
    currentState,
    /`FLOW-01` is closed\. Latest handoff is `planner -> planner`; stage is `planning`; gate profile is `contract`\./
  );
  const immediateStatus = buildHarnessStatus({ repoRoot, outputDir: repoRoot, dbPath });
  assert.equal(immediateStatus.ok, true);
  const immediateValidation = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(immediateValidation.ok, true);

  const implementationPlan = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"), "utf8");
  assert.match(implementationPlan, /`FLOW-01` is closed; latest closeout handoff is `planner -> planner`\./);
  assert.match(implementationPlan, /Planner should choose the next approved lane and open the next packet only after human agreement\./);

  const projectProgress = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "PROJECT_PROGRESS.md"), "utf8");
  assert.match(
    projectProgress,
    /\| Ops \| FLOW-01 \| Harness operation reliability and friction reduction \| done \| Planner recorded FLOW-01 closeout after reviewer approval\. Planner should choose the next approved lane and open the next packet only after human agreement\. \|/
  );

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getWorkItem("FLOW-01").status, "done");
  assert.equal(afterStore.getWorkItem("FLOW-01").metadata.closedBy, "planner");
  afterStore.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.openWorkItems, 0);
  assert.equal(status.assignment, null);
  assert.equal(status.nextOwner, "planner");
  assert.equal(
    status.nextAction,
    "Planner should choose the next approved lane and open the next packet only after human agreement."
  );
});

test("planner-closeout-hold closes the active packet and leaves no active lane once sibling planner items are canonically closed", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-closeout-hold-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_CLOSEOUT-02_PLANNER_HOLD_CLOSEOUT_AUTOMATION.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "packets", "PKT-01_CLOSEOUT-01_DERIVED_STATE_REFRESH_PARITY_AFTER_CLOSEOUT.md"),
    "# Packet\n",
    "utf8"
  );

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: planning",
      "- Current Focus: CLOSEOUT-02 closeout is approved; Planner should place the baseline on no-active-lane hold.",
      "",
      "## Next Recommended Agent",
      "- Planner",
      "",
      "## Open Decisions / Blockers",
      "- `CLOSEOUT-02` Ready For Code is approved; active handoff is `reviewer -> planner`. Planner should place the reusable baseline on no-active-lane hold.",
      "",
      "## Current Truth Notes",
      "- `CLOSEOUT-02` remains the active work item. Current handoff is `reviewer -> planner`; stage is `planning`; gate profile is `contract`.",
      "- `CLOSEOUT-01` is closed. Latest handoff is `planner -> planner`; stage is `planning`; gate profile is `contract`.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| CLOSEOUT-02 | Planner hold closeout automation | planner | active | 2026-05-10 | planner closeout pending |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| CLOSEOUT-02 | Planner hold closeout automation | one-step planner hold closeout | planner | planning | P0 | SEC-01 | planner closeout pending |",
      "- Next first action: Planner should place the reusable baseline on no-active-lane hold.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| CLOSEOUT-01 | Derived-state refresh parity after closeout | 2026-05-09 | transition planner -> planner; gate contract | Planner recorded CLOSEOUT-01 closeout after reviewer approval. |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "PROJECT_PROGRESS.md"),
    [
      "# Project Progress",
      "",
      "## Summary",
      "CLOSEOUT-02 planner hold closeout test board.",
      "",
      "## Progress Board",
      "| Phase | Task ID | Task | Status | Notes | Source |",
      "| --- | --- | --- | --- | --- | --- |",
      `| Ops | CLOSEOUT-02 | Planner hold closeout automation | planning | Reviewer approved closeout; planner hold automation closeout pending. | ${packetPath} |`
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"),
    [
      "# Implementation Plan",
      "",
      "## Operator Next Action",
      "- `CLOSEOUT-02` active handoff is `reviewer -> planner`.",
      "- Planner should place the reusable baseline on no-active-lane hold.",
      `- Source packet: \`${packetPath}\`.`,
      "- Preserve packet-before-code, Active Context derived-state boundaries, generated-doc immutability, root/starter sync, Tester/Reviewer separation, and human approval gates."
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-10T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "CLOSEOUT-02 closeout is approved; Planner should place the baseline on no-active-lane hold.",
    releaseGoal: "Provide a one-step planner hold closeout path.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "CLOSEOUT-02",
    title: "Planner hold closeout automation",
    status: "planning",
    nextAction: "Planner should place the reusable baseline on no-active-lane hold.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertWorkItem({
    workItemId: "CLOSEOUT-01",
    title: "Derived-state refresh parity after closeout",
    status: "closed",
    nextAction: "Stale planner entry should not survive hold closeout.",
    owner: "planner",
    sourceRef: "reference/packets/PKT-01_CLOSEOUT-01_DERIVED_STATE_REFRESH_PARITY_AFTER_CLOSEOUT.md",
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      closedAt: "2026-05-16T09:00:00.000Z",
      closedBy: "planner"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_CLOSEOUT-02_PLANNER_HOLD_CLOSEOUT_AUTOMATION",
    path: packetPath,
    category: "task_packet",
    title: "CLOSEOUT-02 planner hold closeout packet",
    sourceRef: packetPath
  });
  store.upsertArtifact({
    artifactId: "PKT-01_CLOSEOUT-01_DERIVED_STATE_REFRESH_PARITY_AFTER_CLOSEOUT",
    path: "reference/packets/PKT-01_CLOSEOUT-01_DERIVED_STATE_REFRESH_PARITY_AFTER_CLOSEOUT.md",
    category: "task_packet",
    title: "CLOSEOUT-01 derived-state refresh parity packet",
    sourceRef: "reference/packets/PKT-01_CLOSEOUT-01_DERIVED_STATE_REFRESH_PARITY_AFTER_CLOSEOUT.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["planner-closeout-hold", "--work-item", "CLOSEOUT-02", "--apply"]
  });

  assert.equal(applied.apply, true);
  assert.equal(applied.transition, "planner-closeout-hold");

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getWorkItem("CLOSEOUT-02").status, "closed");
  assert.equal(afterStore.getWorkItem("CLOSEOUT-01").status, "closed");
  afterStore.close();

  const context = JSON.parse(fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8"));
  assert.equal(context.activeTask, null);
  assert.equal(context.selectedLane, null);
  assert.equal(context.nextWork.owner, "planner");
  assert.equal(context.nextWork.workflow, ".agents/workflows/planner.md");
  assert.equal(context.nextWork.action, "Keep the reusable baseline on planning hold until a new approved lane is selected.");

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.assignment, null);
  assert.equal(status.nextOwner, "planner");
});

test("planner-closeout-hold fails fast when another non-stale open work item remains", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-closeout-hold-blocked-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_CLOSEOUT-02_PLANNER_HOLD_CLOSEOUT_AUTOMATION.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| CLOSEOUT-02 | Planner hold closeout automation | one-step planner hold closeout | planner | planning | P0 | SEC-01 | planner closeout pending |",
      "| APP-01 | Active implementation packet | implementation lane | developer | in_progress | P0 | PLAN-01 | implementation active |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-10T02:05:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "CLOSEOUT-02 closeout is approved; Planner should place the baseline on no-active-lane hold.",
    releaseGoal: "Provide a one-step planner hold closeout path.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "CLOSEOUT-02",
    title: "Planner hold closeout automation",
    status: "planning",
    nextAction: "Planner should place the reusable baseline on no-active-lane hold.",
    owner: "planner",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertWorkItem({
    workItemId: "APP-01",
    title: "Active implementation packet",
    status: "in_progress",
    nextAction: "Developer is still implementing APP-01.",
    owner: "developer",
    sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    metadata: { gateProfile: "release", readyForCode: "approved" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["planner-closeout-hold", "--work-item", "CLOSEOUT-02"]
  });

  assert.equal(preview.ok, false);
  assert.match(preview.errors.join("\n"), /planner-closeout-hold requires no other open work items; APP-01/);
});

test("validator blocks incomplete workflow contracts", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-workflow-contract-invalid-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "workflows", "planner.md"),
    [
      "# Plan Workflow",
      "",
      "## Role",
      "- Planner",
      "",
      "## Mission",
      "- Own requirements, architecture, implementation plan, and task packet definition."
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-27T01:45:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "WORKFLOW-01 workflow contracts",
    releaseGoal: "Block incomplete workflow contracts",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.findings.some(
      (item) =>
        item.code === "workflow_contract_section_missing" &&
        item.path === ".agents/workflows/planner.md" &&
        item.section === "## Turn Close Reporting"
    ),
    true
  );
});

test("validator blocks missing reusable agent behavior guidance", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-agent-behavior-invalid-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "skills", "day_start", "SKILL.md"),
    "# Day Start\n\n## Behavior Checks\n- Missing the concrete four-principle behavior markers.\n",
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-03T00:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "FLOW-01 behavior guidance validation",
    releaseGoal: "Block thin behavior guidance regression",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(result.ok, false);
  assert.equal(
    result.findings.some(
      (item) =>
        item.code === "skill_behavior_guidance_incomplete" &&
        item.path === ".agents/skills/day_start/SKILL.md" &&
        item.marker === "Think Before Coding"
    ),
    true
  );
});

test("handoff regenerates CURRENT_STATE next-agent wording from canonical handoff state when no active owner exists", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-handoff-current-state-ignored-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Next Recommended Agent",
      "- Planner validating the next kickoff lane"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-27T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "closed",
    releaseGateState: "approved",
    currentFocus: "Release baseline is closed",
    releaseGoal: "Keep handoff routing explicit",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.appendHandoff({
    handoffId: "handoff-closed-01",
    handoffSummary: "Closed release handed back to planner review.",
    fromRole: "reviewer",
    toRole: "developer",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.nextOwner, "developer");

  const handoff = resolveHandoff({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(handoff.ok, true);
  assert.equal(handoff.resolvedBy, "latest_handoff");
  assert.equal(handoff.currentStateNextAgent, "Developer");
  assert.equal(handoff.nextOwner, "developer");
  assert.equal(handoff.workflow, ".agents/workflows/developer.md");
  assert.equal(handoff.workflowDetails?.exists, true);
  assert.equal(handoff.workflowDetails?.role, "Developer");
  assert.deepEqual(handoff.workflowDetails?.missingSections, []);
  assert.deepEqual(handoff.workflowDetails?.readFirst, [
    "`.agents/artifacts/REQUIREMENTS.md`",
    "`.agents/artifacts/ARCHITECTURE_GUIDE.md`",
    "`active packet and any approved project design/source artifact cited by the task`"
  ]);
  assert.equal(
    handoff.workflowDetails?.turnCloseReporting.some((item) =>
      item.includes("next concrete work")
    ),
    true
  );
});

test("status and validation report follow the DB-open work item after TASK_LIST is regenerated as a compatibility view", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-closeout-parity-status-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_QLT-02_CLOSEOUT_PARITY_TEST.md";
  writeOpsPacket(repoRoot, packetPath, { gateProfile: "contract", includeManifest: true });

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: planning",
      "- Current Focus: QLT-02 closed; Planner selecting the next lane.",
      "",
      "## Next Recommended Agent",
      "- Planner",
      "",
      "## Open Decisions / Blockers",
      "- `QLT-02` is closed; latest handoff is `planner -> planner`. Planner should choose the next approved lane and open the next packet only after human agreement.",
      "",
      "## Current Truth Notes",
      "- `QLT-02` is closed. Latest handoff is `planner -> planner`; stage is `planning`; gate profile is `contract`.",
      "",
      "## Latest Handoff Summary",
      "- 2026-05-04: `[planner -> planner] Planner recorded QLT-02 closeout after reviewer approval.`"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| - | None | - | - | clear | - | - | - |",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| QLT-02 | Evidence validation, semantic trace, and agent eval / CI gating | 2026-05-04 | transition planner -> planner; gate contract | Planner recorded QLT-02 closeout after reviewer approval. |",
      "",
      "## Handoff Log",
      "- 2026-05-04: [planner -> planner] Planner recorded QLT-02 closeout after reviewer approval. | Planner should choose the next approved lane and open the next packet only after human agreement."
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-04T11:15:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "QLT-02 closed; Planner selecting the next lane.",
    releaseGoal: "Keep status and validation aligned with canonical closeout state.",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  store.upsertWorkItem({
    workItemId: "QLT-02",
    title: "Evidence validation, semantic trace, and agent eval / CI gating",
    status: "planning",
    owner: "planner",
    nextAction: "Planner should record QLT-02 closeout and choose the next approved lane.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_QLT-02_CLOSEOUT_PARITY_TEST",
    path: packetPath,
    category: "task_packet",
    title: "QLT-02 closeout parity test packet",
    sourceRef: packetPath
  });
  store.appendHandoff({
    handoffId: "qlt-02-planner-closeout",
    handoffSummary: "Planner recorded QLT-02 closeout after reviewer approval.",
    fromRole: "planner",
    toRole: "planner",
    sourceRef: packetPath,
    payload: {
      nextFirstAction: "Planner should choose the next approved lane and open the next packet only after human agreement."
    }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(status.assignment?.workItemId, "QLT-02");
  assert.equal(typeof status.nextAction, "string");

  const report = writeValidationReport({ repoRoot, dbPath, outputDir: repoRoot });
  assert.equal(report.ok, true);
  assert.equal(report.report.traceSummary?.workItemId, "QLT-02");
  assert.equal(typeof report.report.nextAction, "string");
});

test("planner packet opening helper registers packet, work item, and planner assignment", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-open-pass-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-19_PLANNER_PACKET_OPENING_FAST_PATH.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending",
    packetTitle: "PKT-01 OPS-19 Planner packet opening fast path",
    workItemTitle: "OPS-19 Planner packet opening fast path"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-21T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Open OPS-19 planning packet",
    releaseGoal: "Reduce planner packet opening latency",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runPlannerPacketOpen({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--packet-path",
      packetPath,
      "--work-item",
      "OPS-19",
      "--title",
      "Planner packet opening fast path"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.command, "planner-open-packet");
  assert.equal(result.workItemId, "OPS-19");
  assert.equal(result.gateProfile, "contract");
  assert.equal(result.transitionResult.ok, true);

  const afterStore = createOperatingStateStore({ dbPath });
  const artifact = afterStore.getArtifactByPath(packetPath);
  assert.equal(artifact?.artifactId, "PKT-01_OPS-19_PLANNER_PACKET_OPENING_FAST_PATH");
  assert.equal(artifact?.category, "task_packet");
  assert.equal(artifact?.metadata?.workItemId, "OPS-19");

  const workItem = afterStore.getWorkItem("OPS-19");
  assert.equal(workItem?.owner, "planner");
  assert.equal(workItem?.status, "planning");
  assert.equal(workItem?.sourceRef, packetPath);
  assert.equal(workItem?.metadata?.gateProfile, "contract");
  assert.equal(workItem?.metadata?.readyForCode, "pending");

  const releaseState = afterStore.getReleaseState("current");
  assert.equal(releaseState?.currentStage, "planning");
  assert.equal(releaseState?.currentFocus, "Open OPS-19 planning packet");
  afterStore.close();

  const activeContext = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8")
  );
  assert.equal(activeContext.activeTask?.workItemId, "OPS-19");
  assert.equal(activeContext.nextWork?.workflow, ".agents/workflows/planner.md");

  const validationReport = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"), "utf8")
  );
  assert.equal(validationReport.gateDecision, "pass");
});

test("planner packet opening helper registers high-risk packets as planning holds before Ready For Code", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-open-high-hold-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-56_HIGH_RISK_PLANNING_HOLD.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "hold",
    riskIfStarted: "high",
    packetTitle: "PKT-01 OPS-56 High-risk planning hold",
    workItemTitle: "OPS-56 High-risk planning hold"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-06-05T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Open OPS-56 high-risk planning packet",
    releaseGoal: "Allow honest high-risk metadata before implementation approval",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runPlannerPacketOpen({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--packet-path",
      packetPath,
      "--work-item",
      "OPS-56",
      "--title",
      "High-risk planning hold"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.readyForCode, "hold");
  assert.equal(result.transitionResult.validationReport.ok, true);

  const afterStore = createOperatingStateStore({ dbPath });
  const workItem = afterStore.getWorkItem("OPS-56");
  assert.equal(workItem?.owner, "planner");
  assert.equal(workItem?.status, "planning");
  assert.equal(workItem?.metadata?.readyForCode, "hold");
  afterStore.close();
});

test("planner packet opening helper fails preflight before mutation when manifest markers are incomplete", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-open-fail-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-19_PLANNER_PACKET_OPENING_FAST_PATH.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending",
    packetTitle: "PKT-01 OPS-19 Planner packet opening fast path",
    workItemTitle: "OPS-19 Planner packet opening fast path",
    manifestMarkers: [
      "- Ready For Code: pending",
      "- root: run root targeted and full tests",
      "- standard-template: run starter targeted and full tests",
      "- validator: run harness validator",
      "- active context: regenerate ACTIVE_CONTEXT artifacts"
    ]
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-04-21T02:30:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Open OPS-19 planning packet",
    releaseGoal: "Reduce planner packet opening latency",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runPlannerPacketOpen({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--packet-path",
      packetPath,
      "--work-item",
      "OPS-19",
      "--title",
      "Planner packet opening fast path"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("review closeout")), true);

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getArtifactByPath(packetPath), null);
  assert.equal(afterStore.getWorkItem("OPS-19"), null);
  afterStore.close();
});

test("planner packet opening helper fails semantic preflight before mutation when packet evidence is incomplete", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-open-semantic-fail-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-26_PACKET_OPEN_SEMANTIC_PREFLIGHT_HARDENING.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending",
    packetTitle: "PKT-01 OPS-26 Packet-open semantic preflight hardening",
    workItemTitle: "OPS-26 Packet-open semantic preflight hardening"
  });

  const packetAbsolutePath = path.join(repoRoot, packetPath);
  const packetContent = fs
    .readFileSync(packetAbsolutePath, "utf8")
    .replace(
      "| Authoritative source intake status | not-needed | Uses local packet evidence | not-needed |",
      "| Authoritative source intake status | approved | test packet requires authoritative-source evidence | approved |"
    )
    .replace(
      "| New authoritative source impact | none | No new external source | not-needed |",
      "| New authoritative source impact | analyzed | test packet changes source expectations | approved |"
    )
    .replace("- Selected UX archetype: operator-console-context\n", "")
    .replace(
      "- Verification manifest: contract evidence declared\n",
      [
        "- Verification manifest: contract evidence declared",
        "- Lane-type declaration: planning",
        "- Lane-type universal minimum sections: Goal; Non-Goal"
      ].join("\n") + "\n"
    );
  fs.writeFileSync(packetAbsolutePath, packetContent, "utf8");

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-15T03:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Open OPS-26 planning packet",
    releaseGoal: "Prevent semantic packet-open drift before mutation",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runPlannerPacketOpen({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--packet-path",
      packetPath,
      "--work-item",
      "OPS-26",
      "--title",
      "Packet-open semantic preflight hardening"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("Selected UX archetype")), true);
  assert.equal(result.errors.some((error) => error.includes("Authoritative source disposition")), true);
  assert.equal(result.errors.some((error) => error.includes("does not include in scope")), true);

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getArtifactByPath(packetPath), null);
  assert.equal(afterStore.getWorkItem("OPS-26"), null);
  afterStore.close();
});

test("planner packet opening helper allows low-risk contract packets without the review-closeout manifest marker", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-planner-open-low-risk-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-21_LOW_RISK_CLOSEOUT_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "pending",
    packetTitle: "PKT-01 PLN-21 Low-risk closeout test",
    workItemTitle: "PLN-21 Low-risk closeout test",
    closeoutRiskTier: "low-risk",
    manifestMarkers: [
      "- Ready For Code: pending",
      "- root: run root targeted and full tests",
      "- standard-template: run starter targeted and full tests",
      "- targeted: gate profile and transition tests",
      "- validator: run harness validator",
      "- active context: regenerate ACTIVE_CONTEXT artifacts"
    ]
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-16T02:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Open PLN-21 low-risk packet",
    releaseGoal: "Allow explicit low-risk closeout packets to skip review-closeout manifest markers",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md"
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runPlannerPacketOpen({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--packet-path",
      packetPath,
      "--work-item",
      "PLN-21",
      "--title",
      "Low-risk closeout test"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.transitionResult.ok, true);
});

test("validator treats non-canonical CURRENT_STATE and TASK_LIST operational conflicts as warnings", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-authority-warning-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-21_AUTHORITY_WARNING_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 PLN-21 authority warning test",
    workItemTitle: "PLN-21 authority warning test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-16T02:15:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "PLN-21 authority warning validation",
    releaseGoal: "Treat duplicate operational surfaces as warnings when canonical state is intact",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Authority warning validation",
    status: "in_progress",
    owner: "developer",
    nextAction: "Tester should validate the narrowed duplicate-surface warning behavior.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.appendHandoff({
    handoffId: "pln-21-planner-to-developer",
    handoffSummary: "Planner approved the slice and implementation is active.",
    fromRole: "planner",
    toRole: "developer",
    sourceRef: packetPath,
    payload: {
      nextFirstAction: "Implement the approved slice and preserve canonical operational authority."
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_PLN-21_AUTHORITY_WARNING_TEST",
    path: packetPath,
    category: "task_packet",
    title: "PLN-21 authority warning test",
    sourceRef: packetPath,
    metadata: { workItemId: "PLN-21" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    [
      "# Current State",
      "",
      "## Snapshot",
      "- Current Stage: review",
      "- Current Focus: Drifted duplicate CURRENT_STATE surface.",
      "",
      "## Next Recommended Agent",
      "- Reviewer",
      "",
      "## Open Decisions / Blockers",
      "- `PLN-21` Ready For Code is approved; active handoff is `developer -> tester`. Tester should validate warning-only duplicate-surface behavior.",
      "",
      "## Current Truth Notes",
      "- `PLN-21` remains the active work item. Current handoff is `developer -> tester`; stage is `review`; gate profile is `contract`.",
      "",
      "## Latest Handoff Summary",
      "- none"
    ].join("\n"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    [
      "# Task List",
      "",
      "## Active Locks",
      "| Task ID | Scope | Owner | Status | Started At | Notes |",
      "|---|---|---|---|---|---|",
      "| PLN-21 | Operational authority simplification | reviewer | active | 2026-05-16 | duplicate-surface drift |",
      "",
      "## Active Tasks",
      "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
      "|---|---|---|---|---|---|---|---|",
      "| PLN-21 | Authority warning validation | validator simplification | reviewer | review | P0 | BASE-01 | review closeout pending |",
      "- Next first action: Reviewer should close the packet even though canonical operational state is still implementation-owned.",
      "",
      "## Blocked Tasks",
      "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
      "|---|---|---|---|---|---|",
      "| - | None | - | clear | - | - |",
      "",
      "## Completed Tasks",
      "| Task ID | Title | Completed At | Verification | Notes |",
      "|---|---|---|---|---|",
      "| - | None | - | - | - |",
      "",
      "## Handoff Log",
      "- none"
    ].join("\n"),
    "utf8"
  );

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  const conflictFindings = result.findings.filter(
    (finding) =>
      finding.code === "current_state_operational_authority_conflict" ||
      finding.code === "task_list_operational_authority_conflict"
  );

  assert.equal(result.ok, true);
  assert.equal(conflictFindings.length > 0, true);
  assert.equal(conflictFindings.every((finding) => finding.severity === "warning"), true);
});

test("mutating transitions block conflicting active operators", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops33-operator-conflict-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-33_OPERATOR_CONFLICT_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-33 operator conflict test",
    workItemTitle: "OPS-33 operator conflict test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-24T01:00:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "OPS-33 conflict enforcement",
    releaseGoal: "Block conflicting mutating operators.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-33",
    title: "Operator conflict enforcement",
    status: "in_progress",
    owner: "developer",
    nextAction: "Protect the active lane from conflicting mutating operators.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      activeOperatorId: "codex-main",
      activeOperatorLabel: "Codex Main",
      ownershipClaimedAt: "2026-05-24T01:00:00.000Z",
      ownershipMode: "claim"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_OPS-33_OPERATOR_CONFLICT_TEST",
    path: packetPath,
    category: "task_packet",
    title: "OPS-33 operator conflict test",
    sourceRef: packetPath,
    metadata: { workItemId: "OPS-33" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["developer-to-tester", "--work-item", "OPS-33", "--operator", "codex-secondary"]
  });

  assert.equal(preview.ok, false);
  assert.match(preview.errors.join("\n"), /Ownership conflict:/);
  assert.match(preview.errors.join("\n"), /planner-routed --takeover/);
});

test("planner-routed explicit takeover supersedes the active operator claim", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops33-operator-takeover-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-33_OPERATOR_TAKEOVER_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-33 operator takeover test",
    workItemTitle: "OPS-33 operator takeover test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-24T01:10:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "OPS-33 takeover enforcement",
    releaseGoal: "Allow explicit planner-routed takeover.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-33",
    title: "Operator takeover enforcement",
    status: "planning",
    owner: "planner",
    nextAction: "Planner should route the approved packet.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      activeOperatorId: "codex-main",
      activeOperatorLabel: "Codex Main",
      ownershipClaimedAt: "2026-05-24T01:00:00.000Z",
      ownershipMode: "claim"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_OPS-33_OPERATOR_TAKEOVER_TEST",
    path: packetPath,
    category: "task_packet",
    title: "OPS-33 operator takeover test",
    sourceRef: packetPath,
    metadata: { workItemId: "OPS-33" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "planner-to-orchestrator",
      "--work-item",
      "OPS-33",
      "--operator",
      "codex-secondary",
      "--operator-label",
      "Codex Secondary",
      "--takeover",
      "--apply"
    ]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.ownershipGuard?.mode, "takeover");
  const afterStore = createOperatingStateStore({ dbPath });
  const workItem = afterStore.getWorkItem("OPS-33");
  afterStore.close();

  assert.equal(workItem?.metadata?.activeOperatorId, "codex-secondary");
  assert.equal(workItem?.metadata?.activeOperatorLabel, "Codex Secondary");
  assert.equal(workItem?.metadata?.ownershipMode, "takeover");
});

test("status remains readable and exposes the active operator claim", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-ops33-status-operator-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-33_STATUS_OPERATOR_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 OPS-33 status operator test",
    workItemTitle: "OPS-33 status operator test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-24T01:20:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "OPS-33 status diagnostics",
    releaseGoal: "Keep read-only diagnostics readable during ownership enforcement.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "OPS-33",
    title: "Status operator diagnostics",
    status: "in_progress",
    owner: "developer",
    nextAction: "Expose the active operator claim in read-only diagnostics.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      activeOperatorId: "codex-main",
      activeOperatorLabel: "Codex Main",
      ownershipClaimedAt: "2026-05-24T01:20:00.000Z",
      ownershipMode: "claim"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_OPS-33_STATUS_OPERATOR_TEST",
    path: packetPath,
    category: "task_packet",
    title: "OPS-33 status operator test",
    sourceRef: packetPath,
    metadata: { workItemId: "OPS-33" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const status = buildHarnessStatus({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(status.ok, true);
  assert.equal(status.assignment?.activeOperatorId, "codex-main");
  assert.equal(status.assignment?.activeOperatorLabel, "Codex Main");
  assert.equal(status.assignment?.ownershipMode, "claim");
});

test("tester-to-planner-low-risk-closeout requires an approved low-risk packet tier", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-low-risk-closeout-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-21_LOW_RISK_TRANSITION_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    closeoutRiskTier: "low-risk",
    packetTitle: "PKT-01 PLN-21 low-risk transition test",
    workItemTitle: "PLN-21 low-risk transition test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-16T02:30:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "PLN-21 low-risk scope is awaiting tester closeout.",
    releaseGoal: "Allow an explicit low-risk tester-to-planner closeout path.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Low-risk closeout transition",
    status: "review",
    owner: "tester",
    nextAction: "Planner should record low-risk closeout and choose the next approved lane.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_PLN-21_LOW_RISK_TRANSITION_TEST",
    path: packetPath,
    category: "task_packet",
    title: "PLN-21 low-risk transition test",
    sourceRef: packetPath,
    metadata: { workItemId: "PLN-21" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const applied = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["tester-to-planner-low-risk-closeout", "--work-item", "PLN-21", "--apply"]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.transition, "tester-to-planner-low-risk-closeout");
  assert.equal(applied.toOwner, "planner");
  const afterStore = createOperatingStateStore({ dbPath });
  const releaseState = afterStore.getReleaseState("current");
  const workItem = afterStore.getWorkItem("PLN-21");
  afterStore.close();

  assert.equal(releaseState?.currentStage, "planning");
  assert.equal(
    releaseState?.currentFocus,
    "PLN-21 low-risk closeout is verification-complete; Planner is recording closeout under the approved low-risk path."
  );
  assert.equal(workItem?.owner, "planner");
  assert.equal(workItem?.status, "planning");
});

test("tester-to-planner-low-risk-closeout fails without an explicit low-risk packet tier", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-low-risk-closeout-blocked-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-21_LOW_RISK_TRANSITION_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    packetTitle: "PKT-01 PLN-21 low-risk transition test",
    workItemTitle: "PLN-21 low-risk transition test"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-16T02:45:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "PLN-21 closeout is awaiting tester routing.",
    releaseGoal: "Reject low-risk closeout without explicit packet approval.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Low-risk closeout transition",
    status: "review",
    owner: "tester",
    nextAction: "Reviewer should assess closeout readiness.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_PLN-21_LOW_RISK_TRANSITION_TEST",
    path: packetPath,
    category: "task_packet",
    title: "PLN-21 low-risk transition test",
    sourceRef: packetPath,
    metadata: { workItemId: "PLN-21" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["tester-to-planner-low-risk-closeout", "--work-item", "PLN-21"]
  });

  assert.equal(preview.ok, false);
  assert.match(preview.errors.join("\n"), /must declare - Closeout risk tier: low-risk/);
});

test("tester-to-planner-low-risk-closeout fails when detected risk floor is higher than declared tier", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-low-risk-closeout-floor-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-22_RISK_FLOOR_TEST.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    closeoutRiskTier: "low-risk",
    packetTitle: "PKT-01 PLN-22 risk floor test",
    workItemTitle: "PLN-22 risk floor test"
  });
  const absolutePacketPath = path.join(repoRoot, packetPath);
  fs.writeFileSync(
    absolutePacketPath,
    fs.readFileSync(absolutePacketPath, "utf8").replace(
      "| Risk if started now | low | Approval boundary closed | approved |",
      "| Risk if started now | high | Authority-model mutation cannot use low-risk closeout | approved |"
    ),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-17T02:45:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "PLN-22 closeout is awaiting tester routing.",
    releaseGoal: "Reject low-risk closeout when detected floor is high.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "PLN-22",
    title: "Risk floor closeout transition",
    status: "review",
    owner: "tester",
    nextAction: "Close low-risk path if allowed.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_PLN-22_RISK_FLOOR_TEST",
    path: packetPath,
    category: "task_packet",
    title: "PLN-22 risk floor test",
    sourceRef: packetPath,
    metadata: { workItemId: "PLN-22" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const preview = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["tester-to-planner-low-risk-closeout", "--work-item", "PLN-22"]
  });

  assert.equal(preview.ok, false);
  assert.match(preview.errors.join("\n"), /higher detected risk floor/);
});

test("validator reports closeout risk floor mismatches", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-risk-floor-validator-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_PLN-22_RISK_FLOOR_VALIDATOR.md";

  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    closeoutRiskTier: "low-risk",
    packetTitle: "PKT-01 PLN-22 risk floor validator",
    workItemTitle: "PLN-22 risk floor validator"
  });
  const absolutePacketPath = path.join(repoRoot, packetPath);
  fs.writeFileSync(
    absolutePacketPath,
    fs.readFileSync(absolutePacketPath, "utf8").replace(
      "| Risk if started now | low | Approval boundary closed | approved |",
      "| Risk if started now | high | Shipped starter payload risk floor | approved |"
    ),
    "utf8"
  );

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-17T03:00:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "PLN-22 risk floor validation.",
    releaseGoal: "Enforce effective risk class.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "PLN-22",
    title: "Risk floor validator",
    status: "review",
    owner: "tester",
    nextAction: "Validate risk floor.",
    sourceRef: packetPath,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_PLN-22_RISK_FLOOR_VALIDATOR",
    path: packetPath,
    category: "task_packet",
    title: "PLN-22 risk floor validator",
    sourceRef: packetPath,
    metadata: { workItemId: "PLN-22" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  const result = runValidator({ repoRoot, dbPath });
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((finding) => finding.code === "closeout_risk_floor_mismatch"));
});
