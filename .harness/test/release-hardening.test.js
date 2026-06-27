import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runNonInteractiveInitCommand } from "../runtime/state/init-project.js";
import { runPayloadBoundaryCommand } from "../runtime/state/payload-boundary.js";
import { runV25Command, runV25GateCommand } from "../runtime/state/v2-5-gates.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD_ROOT = path.resolve(TEST_DIR, "..", "..");

test("starter payload exposes V2.8 release identity without carrying release-build artifacts", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(PAYLOAD_ROOT, "package.json"), "utf8"));
  assert.equal(packageJson.version, "2.8.0");
  assert.equal(packageJson.scripts["harness:v26"], "node .harness/runtime/state/harness-cli.js v26");
  assert.equal(packageJson.scripts["harness:v28"], "node .harness/runtime/state/harness-cli.js v28");
  assert.match(packageJson.scripts["harness:risk-gate"], /v25 gate$/);

  assert.equal(fs.existsSync(path.join(PAYLOAD_ROOT, "reference", "artifacts", "V2_6_RELEASE_NOTES.md")), false);
});

test("quick gate reports its scope and integrated follow-up command", () => {
  const gate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "app/page.tsx",
      risk: "normal"
    }
  });

  assert.equal(gate.gateClass, "quick");
  assert.equal(gate.integratedGateCommand, "npm run harness:packet-preflight -- --stage closeout");
  assert.match(gate.scopeNote, /Quick gate/);
  assert.equal(gate.blockingState, "blocked");
  assert.equal(gate.laneDecision.effectiveLane, gate.lane);
});

test("browser evidence reports separate execution states and agent-process misses", () => {
  const missingEvidenceGate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "components/ExpenseForm.tsx",
      risk: "normal",
      browserEvidenceStatus: "not-run-agent-error"
    }
  });

  assert.equal(missingEvidenceGate.ok, false);
  assert.equal(missingEvidenceGate.browserEvidence.status, "not_run_agent_error");
  assert.equal(missingEvidenceGate.browserEvidence.httpSmokeEquivalent, false);
  assert.match(missingEvidenceGate.browserEvidence.message, /agent process/i);

  const backendGate = runV25GateCommand({
    options: {
      stage: "closeout",
      files: "app/approval.js",
      risk: "normal"
    }
  });
  assert.equal(backendGate.browserEvidence.status, "not_required");
});

test("guard decomposes command risk, boundary risk, approval, final decision, and safer alternative", () => {
  const result = runV25Command({
    args: [
      "guard",
      "--command",
      "Remove-Item -Recurse -Force C:\\tmp\\demo",
      "--edit-boundary",
      "src/domain"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.commandRisk.level, "destructive");
  assert.equal(result.boundaryRisk.level, "outside_boundary");
  assert.equal(result.requiredApproval, "explicit_destructive_command_approval");
  assert.equal(result.finalDecision, "block");
  assert.match(result.saferAlternative, /Do not execute/);
});

test("payload boundary command labels clean payload and initialized project semantics", () => {
  const clean = runPayloadBoundaryCommand({ root: PAYLOAD_ROOT, mode: "clean-payload" });
  assert.equal(clean.result.mode, "clean-payload");
  assert.match(clean.result.scopeNote, /clean reusable starter payload/);

  const initialized = runPayloadBoundaryCommand({ root: PAYLOAD_ROOT, mode: "initialized-project" });
  assert.equal(initialized.result.mode, "initialized-project");
  assert.match(initialized.result.scopeNote, /post-init runtime files/);
});

test("non-interactive init helper refuses missing required fields with exact command guidance", () => {
  const result = runNonInteractiveInitCommand({
    args: ["--non-interactive", "--project-name", "Pilot App"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_required_non_interactive_fields");
  assert.deepEqual(result.missingFields, ["--user-goal", "--ops-goal", "--approval-goal"]);
  assert.match(result.commandExample, /npm run harness:init -- --non-interactive/);
});
