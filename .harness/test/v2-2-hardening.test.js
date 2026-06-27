import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateParallelBatchPlan } from "../runtime/state/parallel-batch.js";
import { scanSensitiveText } from "../runtime/security/redact-engine.js";
import { evaluateSecurityReviewEvidence } from "../runtime/state/security-evidence.js";
import { evaluateTddEvidenceContract } from "../runtime/state/tdd-evidence.js";
import {
  buildAdapterManifest,
  scanLearningStaleness,
  validateReviewFindingArtifacts,
  validateReviewScopeArtifacts
} from "../runtime/state/v2-p2-conductor.js";

function tmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("v2.2 TDD hardening rejects RED evidence that did not fail", () => {
  const repoRoot = tmp("v22-tdd-red-zero-");
  fs.mkdirSync(path.join(repoRoot, "test"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "reports", "tdd"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "test", "budget.test.ts"), "// test\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "red.log"), "unexpected pass\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "green.log"), "pass\n", "utf8");
  const content = [
    "# Packet",
    "",
    "## TDD Evidence Contract",
    "- TDD mode: required",
    "- Red test file: test/budget.test.ts",
    "- Red command: npm test -- budget.test.ts",
    "- Red exit code: 0",
    "- Red failure kind: expected-behavior-failure",
    "- Red ran at: 2026-01-01T00:00:00.000Z",
    "- Red output excerpt: unexpected pass",
    "- Red output artifact: reference/reports/tdd/red.log",
    "- Green command: npm test -- budget.test.ts",
    "- Green exit code: 0",
    "- Green ran at: 2026-01-01T00:01:00.000Z",
    "- Green output excerpt: pass",
    "- Green output artifact: reference/reports/tdd/green.log",
    "- Refactor verified: yes",
    "- Behavior-level test: yes",
    "- Test-only production hook: no"
  ].join("\n");

  const result = evaluateTddEvidenceContract({ repoRoot, content, stage: "closeout", changedFiles: ["src/approval.ts"] });

  assert.equal(result.blocking, true);
  assert(result.diagnostics.some((item) => item.field === "Red exit code"));
});

test("v2.2 CSO hardening blocks missing phases, low-confidence daily findings, and raw secrets", () => {
  const repoRoot = tmp("v22-cso-hardening-");
  fs.mkdirSync(path.join(repoRoot, "reference", "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "reports", "SEC.json"),
    JSON.stringify({
      packet_path: "reference/packets/PKT-SEC.md",
      work_item_id: "SEC-01",
      mode: "daily",
      phases_run: [0, 1],
      decision: "pass_with_findings",
      findings: [{
        id: "SEC-LOWCONF",
        severity: "medium",
        status: "open",
        confidence: 5,
        phase: 9,
        fingerprint: "sha256:lowconf",
        file: "src/auth.ts",
        line: 10,
        evidence_quote_redacted: "api_key='sk-abcdefghijklmnopqrstuvwxyz'",
        exploit_scenario: "token leakage",
        impact: "credential misuse",
        recommendation: "redact token"
      }]
    }, null, 2),
    "utf8"
  );
  const content = ["# Packet", "", "## CSO Security Review", "- Security review evidence status: pass", "- Security review report path: reference/reports/SEC.json"].join("\n");

  const result = evaluateSecurityReviewEvidence({ repoRoot, content, packetPath: "reference/packets/PKT-SEC.md", workItemId: "SEC-01", stage: "closeout", effectiveRisk: "high", changedFiles: ["src/auth.ts"] });

  assert.equal(result.blocking, true);
  assert(result.diagnostics.some((item) => item.field === "CSO phases run"));
  assert(result.diagnostics.some((item) => item.message.includes("confidence >= 8")));
  assert(result.diagnostics.some((item) => item.field === "Security report redaction" || item.field === "Security finding redaction"));
  assert(scanSensitiveText("sk-abcdefghijklmnopqrstuvwxyz").some((finding) => finding.type === "OPENAI_KEY"));
});

test("v2.2 parallel hardening blocks missing post-merge lifecycle evidence", () => {
  const repoRoot = tmp("v22-parallel-life-");
  fs.mkdirSync(path.join(repoRoot, "reference", "batches"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "batches", "PB.json"),
    JSON.stringify({
      batch_id: "PB-01",
      strategy: "parallel_worktree",
      baseline: { command: "npm test", exit_code: 0 },
      worktree: { enabled: true, root: ".worktrees/PB-01", gitignored_verified: true },
      units: [
        { unit_id: "U-1", files: { modify: ["src/a.ts"] }, actual_files: { modified: ["src/a.ts"] }, evidence_output: "reference/reports/u1.json", worktree_path: ".worktrees/PB-01/U-1" },
        { unit_id: "U-2", files: { modify: ["src/b.ts"] }, actual_files: { modified: ["src/b.ts"] }, evidence_output: "reference/reports/u2.json", worktree_path: ".worktrees/PB-01/U-2" }
      ],
      merge: { order: [] }
    }, null, 2),
    "utf8"
  );
  const content = ["# Packet", "", "## Parallel Execution Plan", "- Parallel batch plan path: reference/batches/PB.json"].join("\n");

  const result = evaluateParallelBatchPlan({ repoRoot, content, stage: "closeout" });

  assert.equal(result.blocking, true);
  assert(result.diagnostics.some((item) => item.field === "parallel_batch.merge.order"));
  assert(result.diagnostics.some((item) => item.field === "parallel_batch.merge.after_each_merge_test.command"));
  assert(result.diagnostics.some((item) => item.field === "parallel_batch.merge.cleanup_verified"));
});

test("v2.2 compound learning scanner flags schema gaps and duplicate overlap", () => {
  const repoRoot = tmp("v22-learning-schema-");
  fs.mkdirSync(path.join(repoRoot, ".agents", "learnings", "solutions"), { recursive: true });
  for (const name of ["SOL-A.md", "SOL-B.md"]) {
    fs.writeFileSync(
      path.join(repoRoot, ".agents", "learnings", "solutions", name),
      [
        "---",
        `solution_id: ${name.replace(".md", "")}`,
        "source_packet_id: reference/packets/PKT-MISSING.md",
        "work_item_id: WI-1",
        "track: bug",
        "problem_type: approval_bug",
        "component: approval-state-machine",
        "status: active",
        "last_verified_at: 2020-01-01",
        "---",
        "# Learning"
      ].join("\n"),
      "utf8"
    );
  }

  const result = scanLearningStaleness({ repoRoot, now: "2026-01-01T00:00:00.000Z", thresholdDays: 180 });

  assert.equal(result.stale.length, 2);
  assert(result.notes[0].reasons.some((reason) => reason.field === "source_packet_path"));
  assert.equal(result.overlapWarnings.length, 1);
});

test("v2.2 review artifact validators enforce no-mutation scope and finding schema", () => {
  const repoRoot = tmp("v22-review-artifacts-");
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "reviews", "scopes"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime", "reviews", "findings"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "reviews", "scopes", "scope.json"),
    JSON.stringify({ base_ref: "origin/main", head_ref: "HEAD", mode: "local_branch", review_mode: "write", changed_files: ["../escape.ts"] }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "reviews", "findings", "findings.json"),
    JSON.stringify({ findings: [{ id: "REV-1", severity: "P5", confidence: 120, reviewer: "qa", file: "src/a.ts", line: 1, title: "bad", evidence: "x", recommendation: "fix", fingerprint: "dup", validation_status: "invalid" }] }, null, 2),
    "utf8"
  );

  const scope = validateReviewScopeArtifacts({ repoRoot });
  const findings = validateReviewFindingArtifacts({ repoRoot });

  assert.equal(scope.ok, false);
  assert(scope.findings.some((item) => item.code === "review_scope_not_read_only"));
  assert(scope.findings.some((item) => item.code === "review_scope_changed_file_unsafe"));
  assert.equal(findings.ok, false);
  assert(findings.findings.some((item) => item.code === "review_finding_severity_invalid"));
  assert(findings.findings.some((item) => item.code === "review_finding_confidence_invalid"));
});

test("v2.2 adapter manifest safety detects secret-like values and unsafe paths", () => {
  const repoRoot = tmp("v22-adapter-safety-");
  fs.mkdirSync(path.join(repoRoot, ".agents", "runtime"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "runtime", "AGENT_CAPABILITY_REGISTRY.json"),
    JSON.stringify({ mounts: ["../outside"], env: { OPENAI_API_KEY: "sk-abcdefghijklmnopqrstuvwxyz" } }, null, 2),
    "utf8"
  );

  const manifest = buildAdapterManifest({ repoRoot, target: "codex" });

  assert.equal(manifest.capabilitySafety.ok, false);
  assert(manifest.capabilitySafety.findings.some((item) => item.code === "adapter_manifest_secret_like_value"));
  assert(manifest.capabilitySafety.findings.some((item) => item.code === "adapter_manifest_unsafe_path"));
});
