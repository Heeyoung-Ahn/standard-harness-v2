import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { runPacketPreflightCommand } from "../runtime/state/packet-preflight.js";
import { evaluateRiskAdaptiveGate } from "../runtime/state/risk-adaptive-gates.js";
import { runTransition } from "../runtime/state/transition-commands.js";
import { writeValidationReport } from "../runtime/state/validation-report.js";
import { runV25Command } from "../runtime/state/v2-5-risk-adaptive.js";

const starterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function tempRepo(name = "v25") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  fs.mkdirSync(path.join(root, ".harness"), { recursive: true });
  fs.mkdirSync(path.join(root, "reference", "packets"), { recursive: true });
  return root;
}

function writePacket(root, rel, extra = "") {
  const content = [
    "# V2.5 Packet",
    "",
    "| Field | Value |",
    "|---|---|",
    "| Ready For Code | approved |",
    "| Gate profile | standard |",
    "| Risk class | normal |",
    "| Delivery route mode | role-by-role |",
    "| Route class | packet-path |",
    "| Change zone | padded |",
    "",
    "## Lean Work Packet",
    "- Work item: V25-01",
    "- Lane: standard",
    "- Goal: integrate V2.5 risk gates",
    "- Files expected: package.json",
    "- Issue status: confirmed",
    "- Code change required: yes",
    "- Repro command: npm test",
    "- Observed result: failure reproduced",
    "- Expected result: pass after fix",
    extra,
    ""
  ].join("\n");
  const absolute = path.join(root, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return content;
}

test("v2.5 risk gate blocks dependency-sensitive implementation without dependency intake evidence", () => {
  const root = tempRepo("v25-gate-dependency");
  try {
    const content = writePacket(root, "reference/packets/PKT-V25.md");
    const gate = evaluateRiskAdaptiveGate({
      repoRoot: root,
      content,
      packetPath: "reference/packets/PKT-V25.md",
      stage: "implementation-transition",
      effectiveRisk: "normal",
      changedFiles: ["package.json"]
    });
    assert.equal(gate.ok, false);
    assert.equal(gate.blocking, true);
    assert.equal(gate.riskOverlays.includes("dependency-sensitive"), true);
    assert.equal(gate.diagnostics.some((item) => item.overlay === "dependency-sensitive" && item.status === "block"), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2.5 packet-preflight enforces risk-adaptive overlay evidence before implementation transition", () => {
  const root = tempRepo("v25-preflight");
  try {
    const packetPath = "reference/packets/PKT-V25.md";
    writePacket(root, packetPath);
    const result = runPacketPreflightCommand({
      repoRoot: root,
      dbPath: path.join(root, ".harness", "operating_state.sqlite"),
      args: ["--packet", packetPath, "--stage", "implementation-transition", "--changed-files", "package.json"]
    });
    assert.equal(result.ok, false);
    assert.equal(result.riskAdaptive.blocking, true);
    assert.match(result.errors.join("\n"), /Dependency Intake Gate/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2.5 transition blocks planner-to-developer when required overlay evidence is missing", () => {
  const root = tempRepo("v25-transition");
  try {
    const packetPath = "reference/packets/PKT-V25.md";
    writePacket(root, packetPath);
    const dbPath = path.join(root, ".harness", "operating_state.sqlite");
    const store = createOperatingStateStore({ dbPath });
    store.setReleaseState({ currentStage: "planning", releaseGateState: "open", currentFocus: "V25 gate", releaseGoal: "V25" });
    store.upsertWorkItem({ workItemId: "V25-01", title: "V25 transition", owner: "planner", status: "planning", sourceRef: packetPath, nextAction: "transition", metadata: { gateProfile: "standard", readyForCode: "approved" } });
    store.close();

    const result = runTransition({
      repoRoot: root,
      dbPath,
      outputDir: root,
      args: ["--transition", "planner-to-developer", "--work-item", "V25-01", "--changed-files", "package.json"]
    });
    assert.equal(result.ok, false);
    assert.equal(result.riskAdaptiveGate.blocking, true);
    assert.match(result.errors.join("\n"), /V2\.5 risk-adaptive gate blocks/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2.5 risk gate passes dependency-sensitive transition with explicit dependency intake decision", () => {
  const root = tempRepo("v25-gate-pass");
  try {
    const content = writePacket(root, "reference/packets/PKT-V25.md", "- Dependency intake decision: allow");
    const gate = evaluateRiskAdaptiveGate({
      repoRoot: root,
      content,
      packetPath: "reference/packets/PKT-V25.md",
      stage: "implementation-transition",
      effectiveRisk: "normal",
      changedFiles: ["package.json"]
    });
    assert.equal(gate.ok, true);
    assert.equal(gate.blocking, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2.5 validation report surfaces blocking risk-adaptive diagnostics for the active packet", () => {
  const root = tempRepo("v25-validation-report");
  try {
    const packetPath = "reference/packets/PKT-V25.md";
    writePacket(root, packetPath);
    const dbPath = path.join(root, ".harness", "operating_state.sqlite");
    const store = createOperatingStateStore({ dbPath });
    store.setReleaseState({ currentStage: "planning", releaseGateState: "open", currentFocus: "V25 report", releaseGoal: "V25" });
    store.upsertWorkItem({ workItemId: "V25-01", title: "V25 report", owner: "planner", status: "planning", sourceRef: packetPath, nextAction: "report", metadata: { gateProfile: "standard", readyForCode: "approved" } });
    store.close();

    const report = writeValidationReport({ repoRoot: root, outputDir: root, dbPath });
    assert.equal(report.report.riskAdaptive.gateEffect, "blocking-in-packet-preflight-and-transition");
    assert.equal(report.report.riskAdaptive.blocking, true);
    assert.equal(report.report.riskAdaptive.diagnostics.some((item) => item.status === "block"), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("v2.5 CLI namespace exposes the integrated risk gate", () => {
  const root = tempRepo("v25-cli");
  try {
    const packetPath = "reference/packets/PKT-V25.md";
    writePacket(root, packetPath);
    const result = runV25Command({ repoRoot: root, args: ["gate", "--packet", packetPath, "--stage", "implementation-transition", "--changed-files", "package.json"] });
    assert.equal(result.ok, false);
    assert.equal(result.command, "v25");
    assert.equal(result.subcommand, "gate");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
