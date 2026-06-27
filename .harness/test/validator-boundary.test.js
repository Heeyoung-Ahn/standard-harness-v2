import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectTaskPacketContract } from "../runtime/state/drift-validator.js";
import { runValidator } from "../runtime/state/validation-core.js";
import { seedStandardRepo, seedStarterRepo } from "./dev05-test-helpers.js";
import { assertNoUnexpectedStderr } from "./cli-stderr-helpers.js";

const starterRoot = path.resolve(process.cwd());

test("validator boundary keeps public exports and schema fields stable", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validator-boundary-"));
  seedStandardRepo(repoRoot);

  const validation = runValidator({
    repoRoot,
    outputDir: repoRoot,
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite")
  });

  assert.equal(typeof validation.ok, "boolean");
  assert.equal(typeof validation.structuralReady, "boolean");
  assert.equal(typeof validation.cutoverReady, "boolean");
  assert.equal(Array.isArray(validation.findings), true);
  assert.equal(Array.isArray(validation.riskClassifications), true);
  for (const finding of validation.findings) {
    assert.equal(typeof finding.code, "string");
    assert.match(finding.severity, /^(error|warn|warning|info)$/);
    assert.equal(typeof finding.message, "string");
  }

  const packetInspection = inspectTaskPacketContract({ repoRoot, packetPath: null });
  assert.equal(packetInspection.ok, false);
  assert.deepEqual(Object.keys(packetInspection).sort(), ["fields", "findings", "header", "ok"]);
  assert.equal(packetInspection.findings[0].code, "task_packet_missing");
  assert.equal(packetInspection.findings[0].severity, "warning");
  assert.equal(typeof packetInspection.findings[0].message, "string");
});

test("validator boundary is documented and split behind a stable wrapper", () => {
  const validationDir = path.join(starterRoot, ".harness", "runtime", "state", "validation");
  const notesPath = path.join(starterRoot, "reference", "runtime", "RUNTIME_BOUNDARY_NOTES.md");
  const notes = fs.readFileSync(notesPath, "utf8");

  assert.equal(fs.existsSync(validationDir), true);
  assert.match(notes, /\.harness\/runtime\/state\/drift-validator\.js/);
  assert.match(notes, /\.harness\/runtime\/state\/validation\//);
  assert.match(notes, /transition-commands\.js/);
  assert.match(notes, /packet-preflight\.js/);
  assert.match(notes, /validation-report\.js/);
});

test("validator CLI surfaces preserve bootstrap hold output shape and exit codes", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validator-boundary-cli-bootstrap-"));
  seedStarterRepo(repoRoot);

  const validate = runHarnessCli(["validate"], { cwd: repoRoot });
  assert.equal(validate.status, 1);
  assert.equal(validate.json.ok, false);
  assert.equal(validate.json.structuralReady, false);
  assert.equal(validate.json.cutoverReady, false);
  assert.equal(validate.json.findings[0].code, "starter_bootstrap_pending");

  const status = runHarnessCli(["status"], { cwd: repoRoot });
  assert.equal(status.status, 1);
  assert.match(status.stdout, /Harness Status/);
  assert.equal(status.json.command, "status");
  assert.equal(status.json.technicalValidation.blockingFindingCount, 1);
  assert.match(status.json.nextAction, /harness:init/);

  const report = runHarnessCli(["validation-report"], { cwd: repoRoot });
  assert.equal(report.status, 1);
  assert.match(report.stdout, /Harness Validation Report/);
  assert.equal(report.json.command, "validation-report");
  assert.equal(report.json.markdownPath, null);
  assert.equal(report.json.jsonPath, null);
  assert.equal(report.json.report.gateDecision, "hold");
  assert.equal(report.json.report.writeMode, "read-only-bootstrap-pending");
  assert.equal(report.json.report.findings[0].code, "starter_bootstrap_pending");
});

function runHarnessCli(args, { cwd = starterRoot } = {}) {
  const result = spawnSync(process.execPath, [path.join(starterRoot, ".harness/runtime/state/harness-cli.js"), ...args], {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.error, undefined);
  assertNoUnexpectedStderr(result.stderr);
  return {
    status: result.status,
    stdout: result.stdout,
    json: parseTrailingJson(result.stdout)
  };
}

function parseTrailingJson(stdout) {
  const start = stdout.indexOf("{");
  assert.notEqual(start, -1);
  return JSON.parse(stdout.slice(start));
}
