import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runEvidenceCommand, runFirstPacketCommand } from "../runtime/state/fresh-start-helpers.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { seedStandardRepo, writeOpsPacket } from "./dev05-test-helpers.js";

function createRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-start-helper-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const store = createOperatingStateStore({ dbPath });
  store.setReleaseState({
    releaseId: "current",
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Fresh helper test",
    releaseGoal: "Exercise fresh-start helpers",
    sourceRef: ".agents/artifacts/TASK_LIST.md"
  });
  store.close();
  return { repoRoot, dbPath };
}

function withStore(dbPath, callback) {
  const store = createOperatingStateStore({ dbPath });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

function writePacket(repoRoot, packetPath, workItemId, manifestMarkers = null) {
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "hold",
    packetTitle: `PKT-01 ${workItemId} Test Packet`,
    workItemTitle: `${workItemId} Test Packet`,
    manifestMarkers
  });
}

test("first-packet previews and applies starter placeholder reconciliation", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_FP-01_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "FP-01");
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "DEV-01",
      title: "First approved implementation packet",
      status: "todo",
      owner: "planner",
      nextAction: "Replace this starter row.",
      sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"
    });
  });

  const preview = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-01", "--packet", packetPath]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.apply, false);
  assert.equal(preview.placeholderItems[0].workItemId, "DEV-01");

  const applied = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-01", "--packet", packetPath, "--apply"]
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.apply, true);

  withStore(dbPath, (store) => {
    assert.equal(store.getWorkItem("DEV-01").status, "closed");
    assert.equal(store.getWorkItem("FP-01").status, "planning");
    assert.equal(store.getArtifactByPath(packetPath).category, "task_packet");
  });
});

test("first-packet reconciles copied-starter bootstrap checklist items", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_FP-BOOTSTRAP_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "FP-BOOTSTRAP");
  const starterIds = ["PLN-00", "PLN-01", "DSG-01", "TST-01", "REV-01", "QLT-01"];
  withStore(dbPath, (store) => {
    for (const workItemId of starterIds) {
      store.upsertWorkItem({
        workItemId,
        title: `${workItemId} copied starter checklist row`,
        status: "todo",
        owner: "planner",
        nextAction: "Replace this copied-starter row.",
        sourceRef: ".agents/artifacts/TASK_LIST.md"
      });
    }
  });

  const applied = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-BOOTSTRAP", "--packet", packetPath, "--apply"]
  });
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.placeholderItems.map((item) => item.workItemId).sort(), starterIds.sort());

  withStore(dbPath, (store) => {
    for (const workItemId of starterIds) {
      assert.equal(store.getWorkItem(workItemId).status, "closed");
    }
    assert.equal(store.getWorkItem("FP-BOOTSTRAP").status, "planning");
  });
});

test("first-packet fails fast when a real active task exists", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_FP-02_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "FP-02");
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "REAL-01",
      title: "Real active task",
      status: "in_progress",
      owner: "developer",
      nextAction: "Finish real work.",
      sourceRef: "reference/packets/PKT-01_REAL-01.md"
    });
  });

  const result = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-02", "--packet", packetPath]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Existing active task REAL-01/);
});

test("first-packet reports work item row mismatch with structured readiness diagnostics", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_FP-MISMATCH_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "WRONG-01");

  const result = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-MISMATCH", "--packet", packetPath]
  });

  assert.equal(result.ok, false);
  assert.equal(result.firstPacketReadiness.packetPath, packetPath);
  assert.equal(result.firstPacketReadiness.requestedWorkItemId, "FP-MISMATCH");
  assert.match(result.firstPacketReadiness.parsedWorkItemRow, /WRONG-01/);
  assert.equal(result.firstPacketReadiness.workItemReference.field, "Quick Decision Header > Work item");
  assert.equal(result.firstPacketReadiness.workItemReference.current.includes("WRONG-01"), true);
  assert.equal(result.firstPacketReadiness.workItemReference.expected, "include FP-MISMATCH");
  assert.equal(result.firstPacketReadiness.workItemReference.status, "block");
  assert.match(result.firstPacketReadiness.workItemReference.nextAction, /FP-MISMATCH/);
  assert.equal(result.firstPacketReadiness.verificationManifest.present, true);
  assert.match(result.errors.join("\n"), /current=.*WRONG-01/);
  assert.match(result.errors.join("\n"), /expected="include FP-MISMATCH"/);
});

test("first-packet lists open bootstrap decisions and risks before mutation", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_FP-BLOCKERS_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "FP-BLOCKERS");
  withStore(dbPath, (store) => {
    store.recordDecision({
      decisionId: "DEC-INIT-01",
      title: "Starter decision",
      decisionNeeded: true,
      impactSummary: "Must close before first packet",
      status: "open",
      sourceRef: ".agents/artifacts/CURRENT_STATE.md"
    });
    store.recordGateRisk({
      riskId: "RISK-INIT-01",
      title: "Starter risk",
      severity: "high",
      status: "open",
      unblockCondition: "Close risk",
      sourceRef: ".agents/artifacts/TASK_LIST.md"
    });
  });

  const result = runFirstPacketCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "FP-BLOCKERS", "--packet", packetPath]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.firstPacketReadiness.openBootstrapDecisions.map((decision) => decision.decisionId), ["DEC-INIT-01"]);
  assert.deepEqual(result.firstPacketReadiness.openBootstrapRisks.map((risk) => risk.riskId), ["RISK-INIT-01"]);
  assert.equal(result.firstPacketReadiness.blockingDiagnostics.some((diagnostic) => diagnostic.field === "Bootstrap decisions"), true);
  assert.equal(result.firstPacketReadiness.blockingDiagnostics.some((diagnostic) => diagnostic.field === "Bootstrap risks"), true);
  assert.match(result.errors.join("\n"), /Open bootstrap decisions before mutation: DEC-INIT-01/);
  assert.match(result.errors.join("\n"), /Open bootstrap risks before mutation: RISK-INIT-01/);
});

test("evidence scaffold creates walkthrough and captures manifest product command", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_EVD-01_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "EVD-01", [
    "- Ready For Code: approved",
    "- root: run root tests",
    "- standard-template: run starter tests",
    "- targeted: helper tests",
    "- validator: run harness validator",
    "- active context: regenerate context",
    "- review closeout: required",
    "- product command: node -e \"console.log('product ok')\""
  ]);
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "EVD-01",
      title: "Evidence test packet",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: packetPath
    });
  });

  const preview = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-01"]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.productCommands.length, 1);

  const applied = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-01", "--apply"]
  });
  assert.equal(applied.ok, true);
  assert.equal(applied.productResults[0].status, "pass");
  const walkthrough = fs.readFileSync(path.join(repoRoot, "reference", "artifacts", "WALKTHROUGH.md"), "utf8");
  assert.match(walkthrough, /Product Verification/);
  assert.match(walkthrough, /product ok/);
});

test("evidence scaffold de-duplicates identical product command entries", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_EVD-DEDUP_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "EVD-DEDUP", [
    "- Ready For Code: approved",
    "- root: run root tests",
    "- standard-template: run starter tests",
    "- targeted: helper tests",
    "- validator: run harness validator",
    "- active context: regenerate context",
    "- review closeout: required",
    "- product command: node -e \"console.log('dedup ok')\"",
    "- product test command: node -e \"console.log('dedup ok')\""
  ]);
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "EVD-DEDUP",
      title: "Evidence dedupe test packet",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: packetPath
    });
  });

  const preview = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-DEDUP"]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.productCommands.length, 1);
  assert.match(preview.productCommands[0].sourceLine, /duplicate:/);
});

test("evidence scaffold blocks likely trailing prose punctuation before product command execution", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_EVD-PUNCT_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "EVD-PUNCT", [
    "- Ready For Code: approved",
    "- root: run root tests",
    "- standard-template: run starter tests",
    "- targeted: helper tests",
    "- validator: run harness validator",
    "- active context: regenerate context",
    "- review closeout: required",
    "- product command: npm run test:product."
  ]);
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "EVD-PUNCT",
      title: "Evidence punctuation test packet",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: packetPath
    });
  });

  const preview = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-PUNCT"]
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.productCommands[0].command, "npm run test:product.");
  assert.equal(preview.productCommands[0].diagnostics[0].code, "likely_trailing_prose_punctuation");

  const applied = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-PUNCT", "--apply"]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.productResults[0].status, "blocked");
  assert.equal(applied.productResults[0].exitCode, null);
  const walkthrough = fs.readFileSync(path.join(repoRoot, "reference", "artifacts", "WALKTHROUGH.md"), "utf8");
  assert.match(walkthrough, /Likely trailing prose punctuation detected/);
  assert.match(walkthrough, /Command was not executed/);
});

test("evidence scaffold preserves quoted command punctuation", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_EVD-QUOTED_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "EVD-QUOTED", [
    "- Ready For Code: approved",
    "- root: run root tests",
    "- standard-template: run starter tests",
    "- targeted: helper tests",
    "- validator: run harness validator",
    "- active context: regenerate context",
    "- review closeout: required",
    "- product command: node -e \"console.log('quoted punctuation ok.')\""
  ]);
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "EVD-QUOTED",
      title: "Evidence quoted punctuation test packet",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: packetPath
    });
  });

  const applied = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "walkthrough", "--work-item", "EVD-QUOTED", "--apply"]
  });

  assert.equal(applied.ok, true);
  assert.equal(applied.productResults[0].status, "pass");
  assert.equal(applied.productResults[0].diagnostics.length, 0);
  const walkthrough = fs.readFileSync(path.join(repoRoot, "reference", "artifacts", "WALKTHROUGH.md"), "utf8");
  assert.match(walkthrough, /quoted punctuation ok\./);
});

test("evidence scaffold appends review report without overwriting existing content", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_REV-01_TEST_PACKET.md";
  writePacket(repoRoot, packetPath, "REV-01");
  const reportPath = path.join(repoRoot, "reference", "artifacts", "REVIEW_REPORT.md");
  fs.writeFileSync(reportPath, "# Review Report\n\n## Existing\n- keep me\n", "utf8");
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "REV-01",
      title: "Review evidence test",
      status: "review",
      owner: "reviewer",
      nextAction: "Review.",
      sourceRef: packetPath
    });
  });

  const result = runEvidenceCommand({
    repoRoot,
    dbPath,
    args: ["--type", "review-report", "--work-item", "REV-01", "--apply"]
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, "append");
  const report = fs.readFileSync(reportPath, "utf8");
  assert.match(report, /keep me/);
  assert.match(report, /REV-01 Review Report/);
});

test("evidence scaffold records product evidence gap and product command failure separately", () => {
  const { repoRoot, dbPath } = createRepo();
  const gapPacket = "reference/packets/PKT-01_GAP-01_TEST_PACKET.md";
  writePacket(repoRoot, gapPacket, "GAP-01");
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "GAP-01",
      title: "Gap evidence test",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: gapPacket
    });
  });
  runEvidenceCommand({ repoRoot, dbPath, args: ["--type", "walkthrough", "--work-item", "GAP-01", "--apply"] });
  let walkthrough = fs.readFileSync(path.join(repoRoot, "reference", "artifacts", "WALKTHROUGH.md"), "utf8");
  assert.match(walkthrough, /Product evidence gap/);

  const failPacket = "reference/packets/PKT-01_FAIL-01_TEST_PACKET.md";
  writePacket(repoRoot, failPacket, "FAIL-01", [
    "- Ready For Code: approved",
    "- root: run root tests",
    "- standard-template: run starter tests",
    "- targeted: helper tests",
    "- validator: run harness validator",
    "- active context: regenerate context",
    "- review closeout: required",
    "- product command: node -e \"process.exit(2)\""
  ]);
  withStore(dbPath, (store) => {
    store.transitionWorkItem({ workItemId: "GAP-01", status: "closed", owner: "planner" });
    store.upsertWorkItem({
      workItemId: "FAIL-01",
      title: "Failing product evidence test",
      status: "in_progress",
      owner: "tester",
      nextAction: "Capture evidence.",
      sourceRef: failPacket
    });
  });
  const failResult = runEvidenceCommand({ repoRoot, dbPath, args: ["--type", "walkthrough", "--work-item", "FAIL-01", "--apply"] });
  assert.equal(failResult.productResults[0].status, "fail");
  walkthrough = fs.readFileSync(path.join(repoRoot, "reference", "artifacts", "WALKTHROUGH.md"), "utf8");
  assert.match(walkthrough, /Status: fail/);
});
