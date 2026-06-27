import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = fs.readFileSync(path.join(root, ".agents/rules/HARNESS_OPERATING_CONTRACT.md"), "utf8");
const pm = fs.readFileSync(path.join(root, ".agents/workflows/project_manager.md"), "utf8");
const orchestrator = fs.readFileSync(path.join(root, ".agents/workflows/orchestrator.md"), "utf8");

test("operating contract is active and not draft", () => {
  assert.equal(contract.includes("Draft under"), false);
  assert.match(contract, /Active governance contract/);
});

test("operating contract defines conflict resolution", () => {
  assert.match(contract, /Decision Authority Matrix/);
  assert.match(contract, /Conflict Resolution Procedure/);
  assert.match(contract, /CONFLICT_RESOLUTION_RECORD/);
  assert.match(contract, /pm_orchestrator_collision/);
});

test("PM and Orchestrator documents reference collision handling", () => {
  assert.match(pm, /PM \/ Orchestrator Collision Handling/);
  assert.match(orchestrator, /PM \/ Orchestrator Collision Handling/);
});
