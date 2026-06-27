import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveLaneDecision } from "../runtime/state/lane-classifier.js";
import { runV23Command } from "../runtime/state/v2-3-lean-manuals.js";
import { runV25GateCommand } from "../runtime/state/v2-5-gates.js";

test("shared classifier marks approval and RBAC work strict when lane is omitted", () => {
  const decision = resolveLaneDecision({
    changedFiles: ["src/domain/expense-approval.js"],
    risk: "normal",
    text: "approval rbac manager permission"
  });

  assert.equal(decision.inferredLane, "strict");
  assert.equal(decision.effectiveLane, "strict");
  assert.equal(decision.laneSource, "inferred");
});

test("v23 lane and v25 gate converge when lane is omitted", () => {
  const args = ["lane", "--files", "src/domain/expense-approval.js", "--risk", "normal", "--text", "approval"];
  const lane = runV23Command({ args });
  const gate = runV25GateCommand({
    options: {
      files: "src/domain/expense-approval.js",
      risk: "normal",
      text: "approval"
    }
  });

  assert.equal(lane.lane, "strict");
  assert.equal(gate.lane, "strict");
  assert.equal(gate.laneDecision.laneSource, "inferred");
});

test("explicit lower lane records warning and uses stricter inferred lane", () => {
  const gate = runV25GateCommand({
    options: {
      lane: "light",
      files: "src/domain/expense-approval.js",
      risk: "normal",
      text: "approval"
    }
  });

  assert.equal(gate.laneDecision.declaredLane, "light");
  assert.equal(gate.laneDecision.inferredLane, "strict");
  assert.equal(gate.laneDecision.effectiveLane, "strict");
  assert.equal(gate.laneDecision.laneSource, "inferred-over-declared");
  assert.equal(gate.warnings[0].code, "declared_lane_lower_than_inferred");
});

test("packet lane override records packet source", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lane-packet-override-"));
  try {
    fs.mkdirSync(path.join(repoRoot, "reference", "packets"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "reference", "packets", "PKT-LANE.md"),
      ["---", "lane: standard", "---", "# Packet", "", "- Lane: standard"].join("\n"),
      "utf8"
    );

    const gate = runV25GateCommand({
      repoRoot,
      options: {
        packet: "reference/packets/PKT-LANE.md",
        files: "src/domain/expense-approval.js",
        risk: "normal",
        text: "approval"
      }
    });

    assert.equal(gate.laneDecision.packetLane, "standard");
    assert.equal(gate.laneDecision.inferredLane, "strict");
    assert.equal(gate.laneDecision.effectiveLane, "standard");
    assert.equal(gate.laneDecision.laneSource, "packet");
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("v25 gate does not require browser evidence for backend file under app directory", () => {
  const gate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "app/approval.js",
      risk: "normal"
    }
  });

  assert.equal(gate.browserEvidence.required, false);
  assert.equal(gate.ok, true);
});

test("v25 gate requires browser evidence for UI paths and explicit user-facing signals", () => {
  const pageGate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "app/page.tsx",
      risk: "normal"
    }
  });
  const componentGate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "components/Form.tsx",
      risk: "normal"
    }
  });
  const explicitGate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "src/domain/approval.js",
      risk: "normal",
      userFacingImpact: "medium"
    }
  });

  assert.equal(pageGate.browserEvidence.required, true);
  assert.equal(pageGate.ok, false);
  assert.equal(componentGate.browserEvidence.required, true);
  assert.equal(componentGate.ok, false);
  assert.equal(explicitGate.browserEvidence.required, true);
  assert.equal(explicitGate.ok, false);
});
