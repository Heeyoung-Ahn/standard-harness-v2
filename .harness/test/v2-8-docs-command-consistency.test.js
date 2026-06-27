import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("V2.8 documentation command linter finds no missing npm scripts", () => {
  const result = childProcess.spawnSync(process.execPath, [".harness/runtime/docs/docs-command-linter.js"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(repoRoot, "verification", "v2.8", "docs_command_inventory.json"), "utf8"));
  assert.equal(report.ok, true);
  assert(report.unique_scripts.includes("browser:evidence:prompt"));
  assert(report.unique_scripts.includes("harness:browser-evidence"));
  assert(report.unique_scripts.includes("harness:v28"));
});
