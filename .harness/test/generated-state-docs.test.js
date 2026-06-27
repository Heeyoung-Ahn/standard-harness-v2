import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import {
  CURRENT_STATE_DOC,
  TASK_LIST_DOC,
  writeGeneratedStateDocs
} from "../runtime/state/generate-state-docs.js";
import { writeActiveContext } from "../runtime/state/active-context.js";
import { validateGeneratedStateDocs } from "../runtime/state/drift-validator.js";
import { RELEASE_BASELINE } from "../runtime/state/release-baseline.js";
import {
  seedProfileAwareValidatorFixtures,
  writeConcreteTaskPacketFixture
} from "./profile-aware-validator-fixtures.js";

test("writes deterministic generated docs and validates them successfully", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T14:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Build generated docs and validator",
    releaseGoal: "First ship baseline",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });
  store.recordDecision({
    decisionId: "DEC-01",
    title: "Choose generated doc structure",
    decisionNeeded: true,
    impactSummary: "Impacts Active Context source mapping",
    sourceRef: ".agents/artifacts/ARCHITECTURE_GUIDE.md"
  });
  store.recordGateRisk({
    riskId: "RISK-01",
    title: "Validator shape still missing",
    severity: "medium",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "DEV-02",
    title: "Generated docs",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement writer",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.appendHandoff({
    handoffId: "handoff-01",
    handoffSummary: "Generated docs work has started",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertArtifact({
    artifactId: "requirements",
    path: ".agents/artifacts/REQUIREMENTS.md",
    category: "canonical_doc",
    title: "Requirements",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });
  const packetPath = writeConcreteTaskPacketFixture(repoRoot);
  store.upsertArtifact({
    artifactId: "active-packet",
    path: packetPath,
    category: "task_packet",
    title: "Active packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const currentState = fs.readFileSync(generatedDocPath(repoRoot, CURRENT_STATE_DOC), "utf8");
  const taskList = fs.readFileSync(generatedDocPath(repoRoot, TASK_LIST_DOC), "utf8");
  assert.match(currentState, /## Current Focus Summary/);
  assert.match(currentState, /## Decision Required Summary/);
  assert.match(taskList, /## Blocked \/ At Risk Summary/);

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.cutoverReady, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("treats empty-state placeholder rows as zero-count detail", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-empty-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T14:30:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Build generated docs and validator",
    releaseGoal: "First ship baseline",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.equal(result.cutoverReady, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("detects tampered generated docs, missing sections, and stale freshness", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-bad-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T15:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Build generated docs and validator",
    releaseGoal: "First ship baseline",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });
  store.recordDecision({
    decisionId: "DEC-01",
    title: "Choose generated doc structure",
    decisionNeeded: true,
    impactSummary: "Impacts Active Context source mapping",
    sourceRef: ".agents/artifacts/ARCHITECTURE_GUIDE.md"
  });
  store.recordGateRisk({
    riskId: "RISK-01",
    title: "Validator shape still missing",
    severity: "medium",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  fs.writeFileSync(
    generatedDocPath(repoRoot, CURRENT_STATE_DOC),
    "# CURRENT_STATE\n\n## Current Focus Summary\n- Tampered summary only\n",
    "utf8"
  );

  store.upsertWorkItem({
    workItemId: "DEV-02",
    title: "Generated docs",
    status: "in_progress",
    nextAction: "Implement writer",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(result.cutoverReady, false);
  assert.equal(codes.has("required_section_missing"), true);
  assert.equal(codes.has("checksum_mismatch"), true);
  assert.equal(codes.has("freshness_drift_detected"), true);
  assert.equal(codes.has("cutover_preflight_failed"), true);

  store.close();
});

test("detects unresolved source refs and utf8 bom issues", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-source-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T16:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Build generated docs and validator",
    releaseGoal: "First ship baseline",
    sourceRef: ".agents/artifacts/MISSING_SOURCE.md"
  });
  store.recordGateRisk({
    riskId: "RISK-01",
    title: "Validator shape still missing",
    severity: "medium",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const taskListPath = generatedDocPath(repoRoot, TASK_LIST_DOC);
  const taskListBuffer = fs.readFileSync(taskListPath);
  fs.writeFileSync(taskListPath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), taskListBuffer]));

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(codes.has("source_ref_unresolved"), true);
  assert.equal(codes.has("utf8_bom_detected"), true);

  store.close();
});

test("detects missing profile-aware packet and profile evidence contracts", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-profile-aware-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T16:30:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Profile-aware validator",
    releaseGoal: "Catch missing packet/profile evidence contracts",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  fs.writeFileSync(
    path.join(repoRoot, "reference", "packets", "PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"),
    "# Broken Packet Template\n",
    "utf8"
  );
  fs.unlinkSync(path.join(repoRoot, "reference", "profiles", "PRF-03_AIRGAPPED_DELIVERY_PROFILE.md"));
  fs.unlinkSync(path.join(repoRoot, "reference", "artifacts", "AUTHORITATIVE_SOURCE_WAVE_LEDGER.md"));

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("packet_template_field_missing"), true);
  assert.equal(codes.has("optional_profile_artifact_missing"), true);
  assert.equal(codes.has("source_wave_ledger_missing"), true);

  store.close();
});

test("detects missing active profile declaration artifact", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-active-profiles-missing-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T16:45:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Active profile artifact validation",
    releaseGoal: "Catch missing active profile declarations",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  fs.unlinkSync(path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"));

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("active_profile_artifact_missing"), true);

  store.close();
});

test("detects structured task table headers, locks, and completed verification drift", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-task-truth-drift-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T16:50:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Structured task truth validation",
    releaseGoal: "Catch task table drift",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    `# Task List

## Active Locks
| Task ID | Scope | Owner | Status | Started At | Notes |
|---|---|---|---|---|---|
| TASK-01 | backend | codex | active | 2026-04-17T16:50:00.000Z | first lock |
| TASK-01 | backend | codex | active | 2026-04-17T16:51:00.000Z | duplicate lock |

## Active Tasks
| Task ID | Title | Scope | Owner | Status | Priority | Verification |
|---|---|---|---|---|---|---|
| TASK-02 | Missing lock task | backend | codex | in_progress | high | - |

## Blocked Tasks
| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |
|---|---|---|---|---|---|
| - | None | - | clear | - | - |

## Completed Tasks
| Task ID | Title | Completed At | Verification | Notes |
|---|---|---|---|---|
| TASK-03 | Closed without evidence | 2026-04-17T16:52:00.000Z | - | missing verification |

## Handoff Log
- none
`,
    "utf8"
  );

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("structured_task_table_header_missing"), true);
  assert.equal(codes.has("structured_task_duplicate_lock"), true);
  assert.equal(codes.has("structured_task_lock_missing"), true);
  assert.equal(codes.has("structured_task_completed_verification_missing"), true);

  store.close();
});

test("detects missing required evidence in registered concrete task packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-concrete-packet-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Catch missing packet evidence in active packet instances",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_BROKEN_ACTIVE_PACKET.md",
    fields: {
      "Profile composition rationale": "",
      "Primary admin entity / surface": "",
      "Domain foundation reference": "",
      "Authoritative source intake reference": ""
    }
  });

  store.upsertArtifact({
    artifactId: "broken-active-packet",
    path: packetPath,
    category: "task_packet",
    title: "Broken active packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("task_packet_required_evidence_missing"), true);

  store.close();
});

test("detects missing shared-source wave evidence in registered concrete task packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-source-wave-missing-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Catch missing shared-source wave evidence in active packet instances",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_SOURCE_WAVE_BROKEN_PACKET.md",
    header: {
      "Shared-source wave status": "pending"
    },
    fields: {
      "Impacted packet set scope": "multi-packet",
      "Authoritative source wave ledger reference": "",
      "Source wave packet disposition": ""
    }
  });

  store.upsertArtifact({
    artifactId: "source-wave-broken-packet",
    path: packetPath,
    category: "task_packet",
    title: "Source wave broken packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("task_packet_required_evidence_missing"), true);

  store.close();
});

test("accepts structured packet-exit metadata without requiring duplicated legacy closeout fields", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-closeout-metadata-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Structured packet-exit metadata",
    releaseGoal: "Accept structured closeout metadata without prose coupling",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_STRUCTURED_CLOSEOUT_METADATA_PACKET.md",
    fields: {
      "Packet exit quality gate reference": "",
      "Exit recommendation": "",
      "Source parity result": "",
      "Validation / security / cleanup evidence": ""
    }
  });

  store.upsertArtifact({
    artifactId: "structured-closeout-metadata-packet",
    path: packetPath,
    category: "task_packet",
    title: "Structured closeout metadata packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("blocks Ready For Code when an active profile declaration is still pending", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-active-profile-pending-blocks-ready-"));
  seedRepoFiles(repoRoot);
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"),
    `# Active Profiles

## Active Profile Table
| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |
|---|---|---|---|---|---|---|
| PRF-08 | Android app profile selected | project profile evidence required | pending | planner | 2026-05-21 | future packets citing PRF-08 |
`,
    "utf8"
  );

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-21T10:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Android profile pending guard",
    releaseGoal: "Block approved packets until active profile evidence is approved",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_ANDROID_PROFILE_PENDING_PACKET.md",
    header: {
      "Active profile dependencies": "PRF-08",
      "Profile evidence status": "approved"
    },
    fields: {
      "Active profile references": "reference/profiles/PRF-08_ANDROID_NATIVE_APP_PROFILE.md",
      "Active profile dependencies": "PRF-08",
      "Profile-specific evidence status": "approved"
    }
  });

  store.upsertArtifact({
    artifactId: "android-profile-pending-packet",
    path: packetPath,
    category: "task_packet",
    title: "Android profile pending packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("active_profile_pending_blocks_ready_for_code"), true);

  store.close();
});

test("detects task packet profile status disagreement between header and evidence fields", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-profile-status-parity-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-21T10:30:00.000Z")
  });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Profile status parity",
    releaseGoal: "Catch packet header/body contradictions",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_PROFILE_STATUS_MISMATCH_PACKET.md",
    header: {
      "Profile evidence status": "approved"
    },
    fields: {
      "Profile-specific evidence status": "pending"
    }
  });

  store.upsertArtifact({
    artifactId: "profile-status-mismatch-packet",
    path: packetPath,
    category: "task_packet",
    title: "Profile status mismatch packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "task_packet_status_contract_mismatch" &&
        finding.field === "Profile-specific evidence status"
    ),
    true
  );

  store.close();
});

test("detects review report references to missing local evidence files", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-review-report-missing-ref-"));
  seedRepoFiles(repoRoot);
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
    [
      "# Review Report",
      "",
      "## Source Parity",
      "- Canonical docs updated: `walkthrough.md`, `task.md`"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-21T11:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "review",
    releaseGateState: "open",
    currentFocus: "Review evidence source parity",
    releaseGoal: "Catch missing closeout evidence references",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const missingRefs = result.findings.filter((finding) => finding.code === "review_report_source_ref_missing");
  assert.equal(result.ok, false);
  assert.equal(missingRefs.length, 2);
  assert.deepEqual(
    new Set(missingRefs.map((finding) => finding.sourceRef)),
    new Set(["walkthrough.md", "task.md"])
  );

  store.close();
});

test("warns about root task and walkthrough files without failing validation", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-root-status-warning-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-22T02:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Root duplicate status surface warning",
    releaseGoal: "Warn without blocking when root task/status files can confuse authority",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  store.close();

  fs.writeFileSync(path.join(repoRoot, "task.md"), "# Legacy task\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "walkthrough.md"), "# Legacy walkthrough\n", "utf8");

  const reopenedStore = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite")
  });
  const result = validateGeneratedStateDocs({
    store: reopenedStore,
    outputDir: repoRoot,
    repoRoot
  });
  reopenedStore.close();

  const warnings = result.findings.filter((finding) => finding.code === "root_status_surface_ambiguous");
  assert.equal(result.ok, true);
  assert.equal(warnings.length, 2);
  assert.deepEqual(new Set(warnings.map((finding) => finding.path.toLowerCase())), new Set(["task.md", "walkthrough.md"]));
});

test("ignores candidate profile tables outside the Active Profile Table section", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-active-profile-candidate-"));
  seedRepoFiles(repoRoot);

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
      "| PRF-08 | candidate only | - | approved | planner | 2026-05-22T02:10:00.000Z | PKT-01_FLOW-01 |"
    ].join("\n"),
    "utf8"
  );

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-22T02:10:00.000Z")
  });

  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Candidate profile parse boundary",
    releaseGoal: "Ignore candidate tables in ACTIVE_PROFILES validation",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });
  store.close();

  assert.equal(result.ok, true);
  assert.equal(
    result.findings.some((finding) => finding.code === "active_profile_required_evidence_missing"),
    false
  );
});

test("accepts supported lane-type declarations when universal minimum metadata is present", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-lane-type-valid-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Lane-typed packet minimum contract",
    releaseGoal: "Accept supported lane-type declarations with explicit minimum metadata",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LANE_TYPE_VALID_PACKET.md",
    fields: {
      "Lane-type declaration": "planning",
      "Lane-type universal minimum sections":
        "Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger",
      "Lane-type required sections":
        "Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Packet Exit Quality Gate; Reopen Trigger",
      "Lane-type conditional sections": "Detailed Behavior; Human Sync / Approval Boundary",
      "Lane-type not-needed sections": "UI/UX Detailed Design when user-facing impact is none"
    }
  });

  store.upsertArtifact({
    artifactId: "lane-type-valid-packet",
    path: packetPath,
    category: "task_packet",
    title: "Lane-type valid packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("keeps undeclared packets on the full baseline without lane-type findings", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-lane-type-undeclared-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Lane-type undeclared fallback",
    releaseGoal: "Keep the legacy full packet baseline when no lane type is declared",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LANE_TYPE_UNDECLARED_PACKET.md"
  });

  store.upsertArtifact({
    artifactId: "lane-type-undeclared-packet",
    path: packetPath,
    category: "task_packet",
    title: "Lane-type undeclared packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const laneTypeFinding = result.findings.find((finding) => finding.code.startsWith("task_packet_lane_type_"));
  assert.equal(result.ok, true);
  assert.equal(laneTypeFinding, undefined);

  store.close();
});

test("rejects unsupported lane-type declarations in concrete task packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-lane-type-invalid-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Lane-type contract rejection",
    releaseGoal: "Fail on unsupported lane-type declarations",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LANE_TYPE_INVALID_PACKET.md",
    fields: {
      "Lane-type declaration": "workflow-redesign"
    }
  });

  store.upsertArtifact({
    artifactId: "lane-type-invalid-packet",
    path: packetPath,
    category: "task_packet",
    title: "Lane-type invalid packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const finding = result.findings.find((item) => item.code === "task_packet_lane_type_contract_invalid");
  assert.equal(result.ok, false);
  assert.ok(finding);

  store.close();
});

test("requires universal minimum metadata for declared lane-type packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-lane-type-universal-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Lane-type universal minimum contract",
    releaseGoal: "Fail when declared lane-type packets omit the universal minimum contract",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LANE_TYPE_UNIVERSAL_MISSING_PACKET.md",
    fields: {
      "Lane-type declaration": "planning",
      "Lane-type required sections": "Goal; Data / Source Impact",
      "Lane-type conditional sections": "Detailed Behavior",
      "Lane-type not-needed sections": "UI/UX Detailed Design when user-facing impact is none"
    }
  });

  store.upsertArtifact({
    artifactId: "lane-type-universal-missing-packet",
    path: packetPath,
    category: "task_packet",
    title: "Lane-type universal missing packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const missingField = result.findings.find(
    (finding) =>
      finding.code === "task_packet_required_evidence_missing" &&
      finding.field === "Lane-type universal minimum sections"
  );
  assert.equal(result.ok, false);
  assert.ok(missingField);

  store.close();
});

test("treats incomplete lane-type section matrix as advisory-only", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-lane-type-advisory-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Lane-type advisory validation",
    releaseGoal: "Keep missing matrix sections advisory-first for the first OPS-10 implementation",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LANE_TYPE_ADVISORY_PACKET.md",
    fields: {
      "Lane-type declaration": "planning",
      "Lane-type universal minimum sections":
        "Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger",
      "Lane-type required sections": "Goal; Non-Goal; Data / Source Impact; Verification Plan"
    }
  });

  store.upsertArtifact({
    artifactId: "lane-type-advisory-packet",
    path: packetPath,
    category: "task_packet",
    title: "Lane-type advisory packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const warningFields = result.findings
    .filter((finding) => finding.code === "task_packet_lane_type_contract_advisory")
    .map((finding) => finding.field)
    .sort();
  assert.equal(result.ok, true);
  assert.deepEqual(warningFields, [
    "Lane-type conditional sections",
    "Lane-type not-needed sections"
  ]);

  store.close();
});

test("detects conflicting structured and human-readable packet-exit values", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-closeout-mismatch-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Structured packet-exit metadata mismatch",
    releaseGoal: "Catch explicit closeout metadata contradictions",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_STRUCTURED_CLOSEOUT_MISMATCH_PACKET.md",
    fields: {
      "Packet exit metadata exit recommendation": "hold"
    }
  });

  store.upsertArtifact({
    artifactId: "structured-closeout-mismatch-packet",
    path: packetPath,
    category: "task_packet",
    title: "Structured closeout mismatch packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const mismatchFinding = result.findings.find(
    (finding) =>
      finding.code === "task_packet_status_contract_mismatch" &&
      finding.field === "Exit recommendation"
  );
  assert.equal(result.ok, false);
  assert.ok(mismatchFinding);

  store.close();
});

test("accepts indented continuation lines for legacy packet-exit evidence fields", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-closeout-continuation-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Legacy packet-exit continuation parsing",
    releaseGoal: "Accept multi-line legacy closeout evidence values",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_LEGACY_CLOSEOUT_CONTINUATION_PACKET.md",
    fields: {
      "Packet exit metadata version": "",
      "Packet exit metadata gate reference": "",
      "Packet exit metadata exit recommendation": "",
      "Packet exit metadata source parity result": "",
      "Packet exit metadata validation / security / cleanup evidence": ""
    }
  });

  const absolutePacketPath = path.join(repoRoot, packetPath);
  const content = fs.readFileSync(absolutePacketPath, "utf8");
  fs.writeFileSync(
    absolutePacketPath,
    content.replace(
      "- Validation / security / cleanup evidence: validator clean and docs updated",
      "- Validation / security / cleanup evidence:\n  validator clean and docs updated"
    ),
    "utf8"
  );

  store.upsertArtifact({
    artifactId: "legacy-closeout-continuation-packet",
    path: packetPath,
    category: "task_packet",
    title: "Legacy closeout continuation packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("detects unregistered concrete task packets in the canonical packet directory", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-unregistered-packet-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Fail when a canonical current-contract packet is not registered",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_UNREGISTERED_ACTIVE_PACKET.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("task_packet_registration_missing"), true);

  store.close();
});

test("detects multi-profile reference drift in registered concrete task packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-multi-profile-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Catch multi-profile citation drift in active packet instances",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_MULTI_PROFILE_DRIFT_PACKET.md",
    fields: {
      "Active profile references": "reference/profiles/PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md"
    }
  });

  store.upsertArtifact({
    artifactId: "multi-profile-drift-packet",
    path: packetPath,
    category: "task_packet",
    title: "Multi-profile drift packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("task_packet_status_contract_mismatch"), true);

  store.close();
});

test("detects shared-source wave ledger drift for registered concrete task packets", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-source-wave-ledger-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Catch shared-source wave ledger drift in active packet instances",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "AUTHORITATIVE_SOURCE_WAVE_LEDGER.md"),
    `# Authoritative Source Wave Ledger

## Approval Rule
- Shared-source wave requires a ledger.

## 4. Impacted Packet Set
| Packet path | Prior source snapshot | Required action | Rebaseline status | Notes |
|---|---|---|---|---|
| reference/packets/PKT-01_OTHER_PACKET.md | 2026-04-23-v1 | reopen | pending | wrong packet |

## 8. Packet Citation Rule
- Impacted packets cite this ledger as Authoritative source wave ledger reference.
`,
    "utf8"
  );

  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_SOURCE_WAVE_LEDGER_DRIFT_PACKET.md",
    header: {
      "Shared-source wave status": "approved"
    },
    fields: {
      "Impacted packet set scope": "multi-packet",
      "Authoritative source wave ledger reference": "reference/artifacts/AUTHORITATIVE_SOURCE_WAVE_LEDGER.md",
      "Source wave packet disposition": "adjust"
    }
  });

  store.upsertArtifact({
    artifactId: "source-wave-ledger-drift-packet",
    path: packetPath,
    category: "task_packet",
    title: "Source wave ledger drift packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("source_wave_packet_missing_from_ledger"), true);

  store.close();
});

test("ignores legacy packet files that do not match the current concrete packet contract", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-legacy-packet-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-17T17:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Concrete task packet validation",
    releaseGoal: "Ignore legacy packet files outside the current packet contract",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });

  fs.writeFileSync(
    path.join(repoRoot, "reference", "packets", "PKT-LEGACY-HISTORICAL.md"),
    `# Legacy Packet

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | LEGACY-01 | historical packet | approved |
| Ready For Code | approve | legacy lane | approved |
`,
    "utf8"
  );

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);

  store.close();
});

test("detects missing required semantic trace for the active work item", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-missing-trace-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-04T10:20:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "QLT-02 semantic trace validation",
    releaseGoal: "Fail when the active work item has no trace artifact",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  const packetPath = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_QLT-02_TRACE_PACKET.md",
    header: {
      "Ready For Code": "approve",
      "User-facing impact": "medium",
      "UX archetype status": "approved",
      "Environment topology status": "approved",
      "Authoritative source intake status": "approved"
    },
    fields: {
      "UX archetype reference": "reference/artifacts/PRODUCT_UX_ARCHETYPE.md",
      "Selected UX archetype": "operator evidence context",
      "Environment topology reference": "reference/artifacts/DEPLOYMENT_PLAN.md",
      "Source environment": "root workspace",
      "Target environment": "root workspace",
      "Execution target": "local machine",
      "Transfer boundary": "root plus standard-template",
      "Rollback boundary": "revert local runtime changes",
      "Authoritative source intake reference": ".agents/artifacts/IMPLEMENTATION_PLAN.md",
      "Authoritative source disposition": "implemented",
      "Current implementation impact": "validator and active context",
      "Existing plan conflict": "none",
      "Impacted packet set scope": "single-packet"
    }
  });
  fs.appendFileSync(
    path.join(repoRoot, packetPath),
    "\n- Semantic trace evidence status: requested\n",
    "utf8"
  );
  store.upsertWorkItem({
    workItemId: "QLT-02",
    title: "Evidence validation",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement semantic evidence contract",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      semanticTraceEvidence: { status: "requested" }
    }
  });
  store.upsertArtifact({
    artifactId: "qlt-02-trace-packet",
    path: packetPath,
    category: "task_packet",
    title: "QLT-02 trace packet",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"),
    `${JSON.stringify(
      {
        ok: true,
        command: "validation-report",
        executedAt: "2026-05-04T10:21:00.000Z",
        cutoverReady: true,
        findings: [],
        gateDecision: "pass",
        traceSummary: {
          path: ".agents/runtime/agent-traces/QLT-02.json",
          workItemId: "QLT-02",
          packetId: "PKT-01_QLT-02_TRACE_PACKET",
          turnClosedAt: "2026-05-04T10:21:00.000Z",
          semanticTraceStatus: "pass",
          warningCount: 0,
          candidateGateCount: 6
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("required_semantic_trace_missing"), true);

  store.close();
});

test("detects ACTIVE_CONTEXT validation executedAt parity mismatch", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-generated-docs-context-parity-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-04T10:30:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "QLT-02 context parity",
    releaseGoal: "Fail when ACTIVE_CONTEXT validation executedAt drifts from validation report",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"),
    `${JSON.stringify(
      {
        ok: true,
        command: "validation-report",
        executedAt: "2026-05-04T10:31:00.000Z",
        cutoverReady: true,
        findings: [],
        gateDecision: "pass"
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  writeActiveContext({
    store,
    repoRoot,
    outputDir: repoRoot,
    validation: {
      ok: true,
      cutoverReady: true,
      findings: [],
      gateDecision: "pass",
      executedAt: "2026-05-04T10:30:59.000Z"
    }
  });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("active_context_validation_executed_at_mismatch"), true);

  store.close();
});

test("detects CURRENT_STATE conflicts against canonical live operational authority", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-current-state-authority-conflict-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-16T09:40:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Canonical developer execution",
    releaseGoal: "Detect CURRENT_STATE authority drift",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Authority simplification",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement slice 1",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    `# Current State

## Snapshot
- Current Stage: planning
- Current Focus: Planner-only wording

## Next Recommended Agent
- Planner
`,
    "utf8"
  );

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const authorityFindings = result.findings.filter(
    (finding) => finding.code === "current_state_operational_authority_conflict"
  );
  assert.equal(result.ok, true);
  assert.equal(authorityFindings.length > 0, true);
  assert.equal(authorityFindings.every((finding) => finding.severity === "warning"), true);

  store.close();
});

test("detects TASK_LIST conflicts against canonical active-work-item authority", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-task-list-authority-conflict-"));
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-05-16T09:45:00.000Z")
  });

  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "Canonical developer execution",
    releaseGoal: "Detect TASK_LIST authority drift",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  store.upsertWorkItem({
    workItemId: "PLN-21",
    title: "Authority simplification",
    status: "in_progress",
    owner: "developer",
    nextAction: "Implement slice 1",
    sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  });
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    `# Task List

## Active Locks
| Task ID | Scope | Owner | Status | Started At | Notes |
|---|---|---|---|---|---|
| PLN-21 | authority | planner | active | 2026-05-16 | wrong owner |

## Active Tasks
| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |
|---|---|---|---|---|---|---|---|
| PLN-21 | Authority simplification | authority | planner | planning | - | - | gate contract |

## Blocked Tasks
| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |
|---|---|---|---|---|---|
| - | None | - | clear | - | - |

## Completed Tasks
| Task ID | Title | Completed At | Verification | Notes |
|---|---|---|---|---|
| - | None | - | - | - |

## Handoff Log
- none
`,
    "utf8"
  );

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const authorityFindings = result.findings.filter(
    (finding) => finding.code === "task_list_operational_authority_conflict"
  );
  assert.equal(result.ok, true);
  assert.equal(authorityFindings.length > 0, true);
  assert.equal(authorityFindings.every((finding) => finding.severity === "warning"), true);

  store.close();
});

test("detects release baseline drift between project artifacts and installable release surfaces", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-release-baseline-drift-"));
  seedRepoFiles(repoRoot);
  seedMaintainerReleaseFiles(repoRoot, { stale: true });

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
    now: createClock("2026-04-27T01:00:00.000Z")
  });

  store.setReleaseState({
    currentStage: "closed",
    releaseGateState: "closed",
    currentFocus: "BASELINE-01 reusable harness starter baseline V1.0 is implemented and verified",
    releaseGoal: "Reusable harness starter baseline is ready for downstream project kickoff",
    sourceRef: ".agents/artifacts/CURRENT_STATE.md",
    metadata: {
      lane: "BASELINE-01",
      workflowState: "closed",
      releaseBaseline: "V1.0"
    }
  });

  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });

  const result = validateGeneratedStateDocs({
    store,
    outputDir: repoRoot,
    repoRoot
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(result.ok, false);
  assert.equal(codes.has("release_baseline_state_drift"), true);
  assert.equal(codes.has("release_baseline_marker_missing"), true);

  store.close();
});

function seedRepoFiles(repoRoot) {
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  for (const fileName of [
    "REQUIREMENTS.md",
    "ARCHITECTURE_GUIDE.md",
    "IMPLEMENTATION_PLAN.md"
  ]) {
    fs.writeFileSync(path.join(repoRoot, ".agents", "artifacts", fileName), `# ${fileName}\n`, "utf8");
  }
  seedProfileAwareValidatorFixtures(repoRoot);
}

function seedMaintainerReleaseFiles(repoRoot, { stale = false } = {}) {
  fs.mkdirSync(path.join(repoRoot, "installer"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "packaging"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "manuals", "human"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });

  fs.writeFileSync(path.join(repoRoot, "installer", "install-harness.js"), "// harness installer\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-windows-exe-installers.js"), "// release build\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "packaging", "build-release-package.js"), "// release build\n", "utf8");
  fs.writeFileSync(
    path.join(repoRoot, "reference", "manuals", "human", "HARNESS_MANUAL.md"),
    `# Harness Manual\n\n${RELEASE_BASELINE.label} installable harness baseline.\n`,
    "utf8"
  );
  if (stale) {
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
      "# Current State\n\n## Snapshot\n- Current Focus: BASELINE-01 reusable harness starter baseline V1.0 is implemented and verified\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
      "# Task List\n\n## Current Release Target\n- Complete reusable harness starter baseline V1.0 for downstream project kickoff.\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "artifacts", "PROJECT_PROGRESS.md"),
      "# Project Progress\n\n## Summary\nTrack the whole-project tracker here.\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"),
      "# Implementation Plan\n\n## Summary\nBASELINE-01 V1.0 lane is closed.\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "artifacts", "REQUIREMENTS.md"),
      "# Requirements\n\n## Summary\nThe next reusable baseline upgrade is still only a direction.\n",
      "utf8"
    );
    fs.writeFileSync(
      path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md"),
      "# Review Report\n\n## 2026-04-26 BASELINE-01 V1.0 Closeout Review\n",
      "utf8"
    );
  }
}

function generatedDocPath(repoRoot, docName) {
  return path.join(repoRoot, ".agents", "runtime", "generated-state-docs", docName);
}

function createClock(startIso) {
  let offset = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + offset++ * 1000).toISOString();
}
