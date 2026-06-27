import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const skills = ["dependency_audit", "feature-artifact-sync", "frontend_design", "general_publish", "github_deploy", "operating-common-rollout"];

test("active skills are generated and not placeholders", () => {
  for (const skill of skills) {
    const content = fs.readFileSync(path.join(root, ".agents", "skills", skill, "SKILL.md"), "utf8");
    assert.match(content, /GENERATED FILE/);
    assert.match(content, /^---\r?\n/m);
    assert.match(content, /## Use When/);
    assert.match(content, /## Workflow/);
    assert.match(content, /## Evidence To Produce/);
    assert(!content.includes("Optional skill for projects"));
  }
});

test("skill docs are fresh", () => {
  const result = spawnSync(process.execPath, [".harness/runtime/skills/generate-skill-docs.js", "--dry-run"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
