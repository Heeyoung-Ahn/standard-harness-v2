import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCodexReadinessDashboard } from "../runtime/state/codex-ready-dashboard.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";

function copyMinimalRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-ready-"));
  fs.mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".agents", "ssot"), { recursive: true });
  fs.mkdirSync(path.join(dir, "reference", "reviewer-profiles"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".codex-plugin", "plugin.json"), JSON.stringify({ name: "standard-harness", version: "2.6.0", description: "x", skills: "./.agents/skills/", interface: { category: "Coding", capabilities: ["Interactive", "Read", "Write"], defaultPrompt: ["x"] } }), "utf8");
  fs.writeFileSync(path.join(dir, ".agents", "ssot", "AI_OPERATING_CONTRACT.md"), "# ssot\n", "utf8");
  fs.writeFileSync(path.join(dir, "reference", "reviewer-profiles", "REVIEWER_PROFILE_INDEX.json"), JSON.stringify({ default_reviewers: ["correctness"], lane_reviewers: { standard: ["correctness"] }, profile_reviewers: {} }), "utf8");
  fs.writeFileSync(path.join(dir, "reference", "reviewer-profiles", "correctness.md"), "# Correctness\n", "utf8");
  return dir;
}

test("codex readiness holds on starter without active packet", () => {
  const dir = copyMinimalRepo();
  try {
    const result = buildCodexReadinessDashboard({ repoRoot: dir });
    assert.equal(result.verdict, "HOLD");
    assert(result.gates.some((gate) => gate.gate === "Active packet" && gate.status === "FAIL"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("codex readiness holds when initialized kickoff still has open decisions", () => {
  const dir = copyMinimalRepo();
  try {
    fs.mkdirSync(path.join(dir, ".agents", "runtime"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".agents", "runtime", "ACTIVE_CONTEXT.json"), JSON.stringify({ ok: true }), "utf8");
    const dbPath = path.join(dir, ".harness", "operating_state.sqlite");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const store = createOperatingStateStore({ dbPath });
    try {
      store.recordDecision({
        decisionId: "DEC-INIT-01",
        title: "Approve kickoff baseline",
        decisionNeeded: true,
        impactSummary: "Implementation cannot begin before this is closed.",
        status: "open",
        sourceRef: ".agents/artifacts/REQUIREMENTS.md"
      });
    } finally {
      store.close();
    }

    const result = buildCodexReadinessDashboard({ repoRoot: dir });
    assert.equal(result.verdict, "HOLD");
    assert.equal(result.ok, false);
    assert(result.gates.some((gate) => gate.gate === "Workflow decisions" && gate.status === "FAIL"));
    assert.match(result.reason, /open workflow decision/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
