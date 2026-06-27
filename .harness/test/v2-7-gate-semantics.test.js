import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCodexReadinessDashboard } from "../runtime/state/codex-ready-dashboard.js";
import { runV26Command, runV27Command } from "../runtime/state/v2-5-gates.js";

function copyMinimalRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v27-ready-"));
  fs.mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".agents", "ssot"), { recursive: true });
  fs.mkdirSync(path.join(dir, "reference", "reviewer-profiles"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".codex-plugin", "plugin.json"), JSON.stringify({ name: "standard-harness", version: "2.7.0", description: "x", skills: "./.agents/skills/", interface: { category: "Coding", capabilities: ["Interactive", "Read", "Write"], defaultPrompt: ["x"] } }), "utf8");
  fs.writeFileSync(path.join(dir, ".agents", "ssot", "AI_OPERATING_CONTRACT.md"), "# ssot\n", "utf8");
  fs.writeFileSync(path.join(dir, "reference", "reviewer-profiles", "REVIEWER_PROFILE_INDEX.json"), JSON.stringify({ default_reviewers: ["correctness"], lane_reviewers: { standard: ["correctness"] }, profile_reviewers: {} }), "utf8");
  fs.writeFileSync(path.join(dir, "reference", "reviewer-profiles", "correctness.md"), "# Correctness\n", "utf8");
  return dir;
}

test("v26 explicitly says it is not a hard approval gate", () => {
  const result = runV26Command({ args: ["gate", "--stage", "implementation-transition"] });
  assert.equal(result.command, "v26");
  assert.equal(result.notHardGate, true);
  assert.equal(result.approvalSubstitute, false);
  assert(result.hardGateCommands.some((command) => command.includes("packet-preflight")));
});

test("v27 exposes release-hardening required contracts", () => {
  const result = runV27Command({ args: ["gate", "--stage", "closeout"] });
  assert.equal(result.command, "v27");
  assert.equal(result.releaseHardeningContract, true);
  assert(result.requiredContracts.includes("packet-preflight hard gate"));
  assert(result.hardGateCommands.some((command) => command.includes("evidence-manifest audit")));
});

test("codex-ready returns approval boundary and next hard gate", () => {
  const dir = copyMinimalRepo();
  try {
    const result = buildCodexReadinessDashboard({ repoRoot: dir });
    assert.equal(result.approvalSubstitute, false);
    assert.match(result.approvalBoundary, /not an implementation or closeout approval gate/);
    assert(result.hardGateCommands.some((command) => command.includes("packet-preflight")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
