import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runV25Command } from "../runtime/state/v2-5-gates.js";

test("v25 repro-check blocks implementation when code change requirement is unknown", () => {
  const result = runV25Command({
    args: [
      "repro-check",
      "--issue-status",
      "confirmed",
      "--code-change-required",
      "unknown",
      "--command",
      "node --test product-tests/*.test.js",
      "--observed",
      "fails",
      "--expected",
      "pass"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.decision, "investigate");
  assert.equal(result.implementationAllowed, false);
});

test("v25 abstain apply fails for not-reproducible no-change outcome without evidence", () => {
  const result = runV25Command({
    args: [
      "abstain",
      "--apply",
      "--issue-status",
      "not-reproducible",
      "--code-change-required",
      "no"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.decision, "block");
  assert.deepEqual(result.missingApplyEvidence, [
    "--repro-command or --evidence",
    "--observed",
    "--expected or --rationale"
  ]);
});

test("v25 abstain apply writes no-change evidence without changed product files", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "abstain-no-change-"));
  try {
    const result = runV25Command({
      repoRoot,
      args: [
        "abstain",
        "--apply",
        "--issue-status",
        "not-reproducible",
        "--code-change-required",
        "no",
        "--repro-command",
        "node --test product-tests/*.test.js",
        "--observed",
        "all tests pass; duplicate approval not reproduced",
        "--expected",
        "duplicate approval failure"
      ]
    });

    assert.equal(result.ok, true);
    assert.equal(result.noCodeChange, true);
    assert.deepEqual(result.changedProductFiles, []);
    assert.equal(result.artifactsWritten.length, 1);

    const report = JSON.parse(fs.readFileSync(path.join(repoRoot, result.artifactsWritten[0]), "utf8"));
    assert.equal(report.noCodeChange, true);
    assert.deepEqual(report.changedProductFiles, []);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
