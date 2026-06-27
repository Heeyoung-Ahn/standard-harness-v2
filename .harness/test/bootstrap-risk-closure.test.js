import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runRiskCommand } from "../runtime/state/bootstrap-risk-closure.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { seedStandardRepo } from "./dev05-test-helpers.js";

function createRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-risk-closure-"));
  seedStandardRepo(repoRoot);
  fs.mkdirSync(path.join(repoRoot, ".harness"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "{}", "utf8");
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const store = createOperatingStateStore({ dbPath });
  store.recordGateRisk({
    riskId: "RISK-INIT-01",
    title: "Requirements baseline is not approved",
    severity: "medium",
    status: "open",
    unblockCondition: "Close with explicit baseline evidence.",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md",
    metadata: {
      initializedDate: "2026-06-13"
    }
  });
  store.upsertWorkItem({
    workItemId: "PKT-01",
    title: "First implementation packet",
    status: "planning",
    owner: "planner",
    nextAction: "Wait for Ready For Code.",
    sourceRef: "reference/packets/PKT-01_TEST.md",
    metadata: {
      readyForCode: "hold"
    }
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

test("risk close requires explicit reason and authoritative evidence before mutating", () => {
  const { repoRoot, dbPath } = createRepo();

  const missingReason = runRiskCommand({
    repoRoot,
    dbPath,
    args: ["close", "RISK-INIT-01", "--evidence", ".agents/artifacts/REQUIREMENTS.md", "--apply"]
  });
  assert.equal(missingReason.ok, false);

  withStore(dbPath, (store) => {
    assert.equal(store.getGateRisk("RISK-INIT-01").status, "open");
  });

  const closed = runRiskCommand({
    repoRoot,
    dbPath,
    args: [
      "close",
      "RISK-INIT-01",
      "--reason",
      "Requirements baseline was reviewed and accepted for first packet planning.",
      "--evidence",
      ".agents/artifacts/REQUIREMENTS.md",
      "--apply"
    ]
  });
  assert.equal(closed.ok, true);
  assert.equal(closed.apply, true);
  assert.equal(closed.status, "closed");
  assert.equal(closed.approvalBoundary.grantsReadyForCode, false);

  withStore(dbPath, (store) => {
    const risk = store.getGateRisk("RISK-INIT-01");
    assert.equal(risk.status, "closed");
    assert.equal(risk.metadata.closureReason, "Requirements baseline was reviewed and accepted for first packet planning.");
    assert.equal(risk.metadata.closureEvidence, ".agents/artifacts/REQUIREMENTS.md");
    assert.equal(risk.metadata.riskClosureHistory.length, 1);
    const workItem = store.getWorkItem("PKT-01");
    assert.equal(workItem.status, "planning");
    assert.equal(workItem.metadata.readyForCode, "hold");
  });
});

test("risk defer requires reason, evidence, owner, and date while staying non-closed", () => {
  const { repoRoot, dbPath } = createRepo();

  const missingFollowUp = runRiskCommand({
    repoRoot,
    dbPath,
    args: [
      "defer",
      "RISK-INIT-01",
      "--reason",
      "Project owner accepted temporary tracking.",
      "--evidence",
      ".agents/artifacts/REQUIREMENTS.md",
      "--apply"
    ]
  });
  assert.equal(missingFollowUp.ok, false);

  const deferred = runRiskCommand({
    repoRoot,
    dbPath,
    args: [
      "defer",
      "RISK-INIT-01",
      "--reason",
      "Project owner accepted temporary tracking.",
      "--evidence",
      ".agents/artifacts/REQUIREMENTS.md",
      "--follow-up-owner",
      "planner",
      "--follow-up-date",
      "2026-06-30",
      "--apply"
    ]
  });
  assert.equal(deferred.ok, true);
  assert.equal(deferred.status, "deferred");
  assert.equal(deferred.nonClosed, true);

  withStore(dbPath, (store) => {
    const risk = store.getGateRisk("RISK-INIT-01");
    assert.equal(risk.status, "deferred");
    assert.equal(risk.metadata.followUp.owner, "planner");
    assert.equal(risk.metadata.followUp.date, "2026-06-30");
    assert.equal(store.listGateRisks().some((entry) => entry.riskId === "RISK-INIT-01" && entry.status !== "closed"), true);
  });
});

test("risk command rejects unknown risks and non-authoritative evidence without mutation", () => {
  const { repoRoot, dbPath } = createRepo();
  const before = withStore(dbPath, (store) => store.getGateRisk("RISK-INIT-01"));

  const unknown = runRiskCommand({
    repoRoot,
    dbPath,
    args: [
      "close",
      "RISK-MISSING",
      "--reason",
      "A reason",
      "--evidence",
      ".agents/artifacts/REQUIREMENTS.md",
      "--apply"
    ]
  });
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors.join("\n"), /Unknown risk/);

  for (const evidence of [
    "generated summary says ok",
    "rough agreement in chat",
    "I approve WORK_PACKET PVH-PKT-001",
    ".agents/runtime/ACTIVE_CONTEXT.json"
  ]) {
    const rejected = runRiskCommand({
      repoRoot,
      dbPath,
      args: [
        "close",
        "RISK-INIT-01",
        "--reason",
        "A reason",
        "--evidence",
        evidence,
        "--apply"
      ]
    });
    assert.equal(rejected.ok, false, evidence);
    assert.match(rejected.errors.join("\n"), /authoritative evidence/i);
  }

  withStore(dbPath, (store) => {
    const after = store.getGateRisk("RISK-INIT-01");
    assert.equal(after.status, before.status);
    assert.equal(after.version, before.version);
  });
});

test("risk list is read-only before harness init creates an operating state DB", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-risk-no-db-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");

  const listed = runRiskCommand({ repoRoot, dbPath, args: ["list"] });
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.risks, []);
  assert.equal(fs.existsSync(dbPath), false);

  const close = runRiskCommand({
    repoRoot,
    dbPath,
    args: [
      "close",
      "RISK-INIT-01",
      "--reason",
      "A reason",
      "--evidence",
      ".agents/artifacts/REQUIREMENTS.md",
      "--apply"
    ]
  });
  assert.equal(close.ok, false);
  assert.match(close.errors.join("\n"), /No operating state DB/);
  assert.equal(fs.existsSync(dbPath), false);
});
