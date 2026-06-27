import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildDocsCommandInventory, runDocsCommandInventoryCommand } from "../runtime/state/docs-command-inventory.js";

function tempRepo(prefix = "v28-docs-") {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(repoRoot, "reference", "manuals"), { recursive: true });
  return repoRoot;
}

test("docs command inventory passes when documented npm scripts exist", () => {
  const repoRoot = tempRepo();
  try {
    fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ scripts: { "harness:validate": "node validate.js", "browser:evidence": "node browser.js" } }, null, 2), "utf8");
    fs.writeFileSync(path.join(repoRoot, "README.md"), "Run `npm run harness:validate` then `npm run browser:evidence`.\n", "utf8");
    const inventory = buildDocsCommandInventory({ repoRoot });
    assert.equal(inventory.ok, true);
    assert.deepEqual(inventory.uniqueScripts, ["browser:evidence", "harness:validate"]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("docs command inventory blocks missing package scripts", () => {
  const repoRoot = tempRepo();
  try {
    fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ scripts: { "harness:validate": "node validate.js" } }, null, 2), "utf8");
    fs.writeFileSync(path.join(repoRoot, "START_HERE.md"), "Run `npm run missing:script`.\n", "utf8");
    const inventory = buildDocsCommandInventory({ repoRoot });
    assert.equal(inventory.ok, false);
    assert(inventory.diagnostics.some((diagnostic) => diagnostic.code === "missing_package_script"));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("docs command inventory command can write verification artifact", () => {
  const repoRoot = tempRepo();
  try {
    fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ scripts: { "harness:validate": "node validate.js" } }, null, 2), "utf8");
    fs.writeFileSync(path.join(repoRoot, "README.md"), "Run `npm run harness:validate`.\n", "utf8");
    const result = runDocsCommandInventoryCommand({ repoRoot, args: ["audit", "--write"] });
    assert.equal(result.ok, true);
    assert.equal(result.outputPath, "verification/v2.8/docs_command_inventory.json");
    assert.equal(fs.existsSync(path.join(repoRoot, result.outputPath)), true);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
