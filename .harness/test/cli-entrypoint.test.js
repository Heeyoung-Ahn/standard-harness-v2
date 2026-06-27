import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { normalizeKnownNodeRuntimeWarnings } from "./cli-stderr-helpers.js";

const repoRoot = process.cwd();
const stateRuntime = path.join(repoRoot, ".harness", "runtime", "state");
const stableEntrypoint = path.join(stateRuntime, "harness-cli.js");
const legacyEntrypoint = path.join(stateRuntime, "dev05-cli.js");

function runNodeCli(entrypoint, args = []) {
  return spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      REPO_ROOT: repoRoot
    },
    encoding: "utf8"
  });
}

test("stable CLI entrypoint and legacy wrapper expose identical command behavior", async () => {
  const { createCommandTable } = await import("../runtime/state/cli-dispatch-table.js");
  const { COMMAND_NAMES, renderUsage } = await import("../runtime/state/cli-help.js");

  const commandTable = createCommandTable({
    repoRoot,
    outputDir: repoRoot,
    dbPath: ".harness/operating_state.sqlite",
    args: []
  });
  assert.equal(typeof commandTable.v24, "function");
  assert.equal(typeof commandTable.risk, "function");
  assert.equal(COMMAND_NAMES.includes("v24"), true);
  assert.equal(COMMAND_NAMES.includes("risk"), true);
  assert.match(renderUsage({ entrypointPath: ".harness/runtime/state/harness-cli.js" }), /harness-cli\.js/);

  const stable = runNodeCli(stableEntrypoint, ["v24"]);
  const legacy = runNodeCli(legacyEntrypoint, ["v24"]);

  assert.equal(stable.status, 0);
  assert.equal(legacy.status, 0);
  assert.equal(legacy.stdout, stable.stdout);
  assert.equal(normalizeKnownNodeRuntimeWarnings(legacy.stderr), normalizeKnownNodeRuntimeWarnings(stable.stderr));
});

test("dev05 CLI is a thin compatibility wrapper and package scripts use the stable entrypoint", () => {
  const wrapperSource = fs.readFileSync(legacyEntrypoint, "utf8");
  assert.match(wrapperSource, /harness-cli\.js/);
  assert.equal(wrapperSource.includes("const commands ="), false);
  assert.equal(wrapperSource.split(/\r?\n/).filter((line) => line.trim()).length <= 8, true);

  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const legacyScriptEntries = Object.entries(packageJson.scripts)
    .filter(([scriptName]) => scriptName.startsWith("harness:") || scriptName.startsWith("browser:evidence"))
    .filter(([, command]) => command.includes(".harness/runtime/state/dev05-cli.js"));

  assert.deepEqual(legacyScriptEntries, []);
  assert.equal(packageJson.scripts["harness:validate"], "node .harness/runtime/state/harness-cli.js validate");
  assert.equal(packageJson.scripts["harness:risk"], "node .harness/runtime/state/harness-cli.js risk");
  assert.equal(packageJson.scripts["harness:v28"], "node .harness/runtime/state/harness-cli.js v28");
});
