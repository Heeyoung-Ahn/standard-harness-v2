import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkPayloadBoundary, runPayloadBoundaryCommand } from "../runtime/state/payload-boundary.js";

function withTempPayload(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "payload-boundary-"));
  try {
    fs.mkdirSync(path.join(dir, ".agents", "runtime"), { recursive: true });
    fs.mkdirSync(path.join(dir, ".agents", "artifacts"), { recursive: true });
    fs.mkdirSync(path.join(dir, ".harness", "runtime", "state"), { recursive: true });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("payload boundary passes for a clean starter payload shape", () => {
  withTempPayload((dir) => {
    fs.writeFileSync(path.join(dir, "README.md"), "# Standard Harness\n", "utf8");
    const result = checkPayloadBoundary({ root: dir });
    assert.equal(result.ok, true);
    assert.equal(result.findings.length, 0);
  });
});

test("payload boundary blocks root Codex Core Harness operating paths", () => {
  withTempPayload((dir) => {
    fs.mkdirSync(path.join(dir, "tools"), { recursive: true });
    fs.writeFileSync(path.join(dir, "tools", "harness_cli.py"), "print('root only')\n", "utf8");
    fs.mkdirSync(path.join(dir, "docs", "planning"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs", "planning", "V2_6_IMPLEMENTATION_PLAN.md"), "# plan\n", "utf8");

    const result = checkPayloadBoundary({ root: dir });
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.findings.map((finding) => finding.path).sort(),
      ["docs/planning", "tools"]
    );
  });
});

test("payload boundary blocks prebuilt runtime state", () => {
  withTempPayload((dir) => {
    fs.writeFileSync(path.join(dir, ".harness", "operating_state.sqlite"), "", "utf8");
    fs.writeFileSync(path.join(dir, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "{}", "utf8");
    const result = checkPayloadBoundary({ root: dir });
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.findings.map((finding) => finding.path).sort(),
      [".agents/runtime/ACTIVE_CONTEXT.json", ".harness/operating_state.sqlite"]
    );
  });
});

test("payload boundary command emits machine-readable pass output", () => {
  withTempPayload((dir) => {
    const { result, output } = runPayloadBoundaryCommand({ root: dir });
    assert.equal(result.ok, true);
    assert.match(output, /"ok": true/);
    assert.match(output, /"forbiddenPathCount": 0/);
  });
});
