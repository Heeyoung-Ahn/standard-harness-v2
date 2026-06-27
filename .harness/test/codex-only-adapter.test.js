import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { buildCodexAdapterManifest, validateAdapterManifest, runV24Command } from "../runtime/state/v2-4-risk-adaptive.js";

const starterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Codex adapter manifest is Codex-only", () => {
  const manifest = buildCodexAdapterManifest();
  const serialized = JSON.stringify(manifest).toLowerCase();
  assert.equal(manifest.target, "codex");
  for (const forbidden of ["claude", "gemini", "opencode", "kiro"]) assert.equal(serialized.includes(forbidden), false);
  assert.equal(validateAdapterManifest(manifest).ok, true);
});

test("checked-in harness adapter manifest is Codex-only", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(starterRoot, ".agents/runtime/HARNESS_ADAPTER_MANIFEST.json"), "utf8"));
  assert.equal(manifest.schemaVersion, "standard-harness-codex-adapter-manifest/v1");
  assert.equal(validateAdapterManifest(manifest).ok, true);
});

test("v24 adapter-manifest defaults to Codex-only", () => {
  const result = runV24Command({ repoRoot: starterRoot, args: ["adapter-manifest"] });
  assert.equal(result.ok, true);
  assert.equal(result.manifest.target, "codex");
  assert.equal(result.manifest.codex.nativePluginSupported, true);
});
