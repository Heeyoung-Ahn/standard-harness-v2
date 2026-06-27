import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateCodexPluginManifestAtPath } from "../runtime/state/codex-plugin-manifest.js";
import { enumerateCodexPluginPayload } from "../runtime/state/codex-plugin-writer.js";

const starterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Codex plugin manifest exists and validates", () => {
  const result = validateCodexPluginManifestAtPath({ repoRoot: starterRoot });
  assert.equal(result.ok, true);
  assert.equal(result.manifest.name, "standard-harness");
  assert.equal(result.manifest.skills, "./.agents/skills/");
});

test("Codex plugin payload includes generated skills", () => {
  const files = enumerateCodexPluginPayload({ repoRoot: starterRoot });
  assert(files.includes(".codex-plugin/plugin.json"));
  assert(files.some((file) => file === ".agents/skills/dependency_audit/SKILL.md"));
});
