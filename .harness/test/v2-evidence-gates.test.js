import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildLearningSolution, runLearningCommand } from "../runtime/state/compound-learning.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { evaluateParallelBatchPlan } from "../runtime/state/parallel-batch.js";
import { evaluateSecurityReviewEvidence } from "../runtime/state/security-evidence.js";
import { evaluateTddEvidenceContract } from "../runtime/state/tdd-evidence.js";

test("v2 TDD evidence gate blocks behavior-bearing closeout without RED/GREEN evidence", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-tdd-missing-"));
  const content = [
    "# Packet",
    "",
    "## TDD Evidence Contract",
    "- TDD mode: required"
  ].join("\n");

  const result = evaluateTddEvidenceContract({
    repoRoot,
    content,
    stage: "closeout",
    changedFiles: ["src/budget/calculateBudget.ts"]
  });

  assert.equal(result.blocking, true);
  assert.equal(result.diagnostics.some((item) => item.field === "Red command"), true);
  assert.equal(result.diagnostics.some((item) => item.field === "Green command"), true);
});

test("v2 TDD evidence gate accepts closed RED/GREEN/REFACTOR evidence", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-tdd-pass-"));
  fs.mkdirSync(path.join(repoRoot, "test"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "reports", "tdd"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "test", "budget.test.ts"), "// failing regression then green\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "red.log"), "expected failure reproduced\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "green.log"), "test passed\n", "utf8");
  const content = [
    "# Packet",
    "",
    "## TDD Evidence Contract",
    "- TDD mode: required",
    "- Red test file: test/budget.test.ts",
    "- Red command: npm test -- budget.test.ts",
    "- Red exit code: 1",
    "- Red failure kind: expected-regression-failure",
    "- Red ran at: 2026-01-01T00:00:00.000Z",
    "- Red output excerpt: expected failure reproduced",
    "- Red output artifact: reference/reports/tdd/red.log",
    "- Green command: npm test -- budget.test.ts",
    "- Green exit code: 0",
    "- Green ran at: 2026-01-01T00:01:00.000Z",
    "- Green output excerpt: test passed",
    "- Green output artifact: reference/reports/tdd/green.log",
    "- Refactor verified: yes",
    "- Behavior-level test: yes",
    "- Test-only production hook: no"
  ].join("\n");

  const result = evaluateTddEvidenceContract({
    repoRoot,
    content,
    stage: "closeout",
    changedFiles: ["src/budget/calculateBudget.ts"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.blocking, false);
  assert.deepEqual(result.diagnostics, []);
});

test("v2 CSO evidence gate blocks high-risk closeout without bound report", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-cso-missing-"));
  const content = [
    "# Packet",
    "",
    "## CSO Security Review",
    "- Security review evidence status: pending"
  ].join("\n");

  const result = evaluateSecurityReviewEvidence({
    repoRoot,
    content,
    packetPath: "reference/packets/PKT-SEC.md",
    workItemId: "SEC-01",
    stage: "closeout",
    effectiveRisk: "high",
    changedFiles: ["src/auth/permissions.ts"]
  });

  assert.equal(result.required, true);
  assert.equal(result.blocking, true);
  assert.equal(result.diagnostics.some((item) => item.field === "Security review report path"), true);
});

test("v2 CSO evidence gate accepts packet-bound redacted pass report", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-cso-pass-"));
  fs.mkdirSync(path.join(repoRoot, "reference", "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "reports", "SEC-01.json"),
    JSON.stringify({
      schema_version: "standard-harness-cso-security-review/v2.2",
      packet_path: "reference/packets/PKT-SEC.md",
      work_item_id: "SEC-01",
      mode: "daily",
      phases_run: [0, 1, 2, 3, 9, 10, 12, 13, 14],
      filter_stats: { raw_candidates: 1, suppressed_false_positives: 0, main_findings: 1 },
      decision: "pass",
      findings: [
        {
          id: "SEC-001",
          severity: "low",
          status: "fixed",
          confidence: 9,
          phase: 9,
          fingerprint: "sha256:sec-001",
          file: "src/auth/permissions.ts",
          line: 12,
          evidence_quote_redacted: "role check now denies unauthorized approval",
          exploit_scenario: "Unauthorized user attempts approval state transition.",
          impact: "Invalid approval state would be blocked.",
          recommendation: "Keep regression coverage on permission boundary."
        }
      ]
    }, null, 2),
    "utf8"
  );
  const content = [
    "# Packet",
    "",
    "## CSO Security Review",
    "- Security review evidence status: pass",
    "- Security review report path: reference/reports/SEC-01.json",
    "- Security review decision: pass"
  ].join("\n");

  const result = evaluateSecurityReviewEvidence({
    repoRoot,
    content,
    packetPath: "reference/packets/PKT-SEC.md",
    workItemId: "SEC-01",
    stage: "closeout",
    effectiveRisk: "high",
    changedFiles: ["src/auth/permissions.ts"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.blocking, false);
  assert.deepEqual(result.diagnostics, []);
});

test("v2 parallel batch gate blocks overlapping files without safe policy", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-parallel-block-"));
  fs.mkdirSync(path.join(repoRoot, "reference", "batches"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "batches", "PB-01.json"),
    JSON.stringify({
      batch_id: "PB-01",
      strategy: "parallel_shared",
      units: [
        { unit_id: "U-1", files: { modify: ["src/shared.ts"] } },
        { unit_id: "U-2", files: { modify: ["src/shared.ts"] } }
      ],
      conflict_policy: { on_file_overlap: "block" }
    }, null, 2),
    "utf8"
  );
  const content = [
    "# Packet",
    "",
    "## Parallel Execution Plan",
    "- Parallel batch plan path: reference/batches/PB-01.json"
  ].join("\n");

  const result = evaluateParallelBatchPlan({ repoRoot, content, stage: "closeout" });

  assert.equal(result.blocking, true);
  assert.equal(result.diagnostics.some((item) => item.field === "parallel_batch.file_overlap"), true);
});

test("v2 read-only empty store does not create on-disk DB", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-readonly-store-"));
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const store = createOperatingStateStore({ dbPath, createIfMissing: false, migrate: false });
  assert.equal(store.readOnlyEmptyState, true);
  assert.equal(fs.existsSync(dbPath), false);
  assert.deepEqual(store.listWorkItems(), []);
  store.close();
  assert.equal(fs.existsSync(dbPath), false);
});

test("v2 compound learning command writes a packet-bound solution note", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-learning-"));
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const result = runLearningCommand({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    args: [
      "--apply",
      "--packet", "reference/packets/PKT-01.md",
      "--work-item", "WI-01",
      "--solution-id", "SOL-TEST-01",
      "--summary", "Budget approval edge case fixed.",
      "--verification", "Regression test passed."
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.written, true);
  assert.equal(fs.existsSync(path.join(repoRoot, result.solutionPath)), true);
  assert.match(fs.readFileSync(path.join(repoRoot, result.solutionPath), "utf8"), /source_packet_id: reference\/packets\/PKT-01.md/);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "learnings", "CONCEPTS.md")), true);
});

test("v2 compound learning preview validates required fields without writing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v2-learning-preview-"));
  const result = buildLearningSolution({
    repoRoot,
    outputDir: repoRoot,
    options: { packet: "reference/packets/PKT-01.md", workItem: "WI-01" }
  });

  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(repoRoot, result.solutionPath)), false);
});
