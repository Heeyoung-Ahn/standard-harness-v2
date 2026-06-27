import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { KNOWN_PROFILES, REQUIRED_STARTER_FILES, normalizeActiveProfiles } from "../runtime/state/init-project.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function targetRoots() {
  const roots = [{ label: "root", prefix: "" }];
  if (fs.existsSync(path.join(repoRoot, "standard-template", "AGENTS.md"))) {
    roots.push({ label: "standard-template", prefix: "standard-template/" });
  }
  return roots;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("PRF-10 is visible in init profile catalog and help text", () => {
  assert.equal(KNOWN_PROFILES["PRF-10"].label, "PRF-10 BI analytics platform profile");
  assert.deepEqual(normalizeActiveProfiles("PRF-10"), ["PRF-10"]);
  assert.deepEqual(normalizeActiveProfiles("PRF-09,PRF-10"), ["PRF-09", "PRF-10"]);
  assert.deepEqual(normalizeActiveProfiles("PRF-10, PRF-9"), ["PRF-09", "PRF-10"]);
  assert.throws(
    () => normalizeActiveProfiles("PRF-10_BI_ANALYTICS_PLATFORM_PROFILE"),
    /Use short profile IDs such as PRF-10 or PRF-10,PRF-9/
  );

  for (const target of targetRoots()) {
    const help = readText(`${target.prefix}.agents/scripts/init-project.js`);
    const initCatalog = readText(`${target.prefix}.harness/runtime/state/init-project.js`);

    assert.match(help, /short profile IDs/, `${target.label} help omits short profile ID guidance`);
    assert.match(help, /PRF-10,PRF-9/, `${target.label} help omits PRF-10,PRF-9 example`);
    assert.match(help, /requires explicit project\/goal fields/, `${target.label} help overstates non-interactive defaults`);
    assert.match(initCatalog, /"PRF-10"/, `${target.label} catalog omits PRF-10`);
    assert.match(
      initCatalog,
      /PRF-10_BI_ANALYTICS_PLATFORM_PROFILE\.md/,
      `${target.label} required starter files omit PRF-10 profile`
    );
  }
});

test("PRF-10 required starter files include BI evidence artifacts", () => {
  const requiredBiArtifacts = [
    "reference/artifacts/BI_DATA_SOURCE_INVENTORY.md",
    "reference/artifacts/BI_METRIC_CATALOG.md",
    "reference/artifacts/BI_SEMANTIC_MODEL.md",
    "reference/artifacts/BI_REFRESH_AND_LINEAGE_PLAN.md",
    "reference/artifacts/BI_DASHBOARD_GOVERNANCE.md"
  ];

  for (const artifactPath of requiredBiArtifacts) {
    assert.equal(
      REQUIRED_STARTER_FILES.includes(artifactPath),
      true,
      `root required starter files omit ${artifactPath}`
    );

    for (const target of targetRoots()) {
      const initCatalog = readText(`${target.prefix}.harness/runtime/state/init-project.js`);
      assert.match(initCatalog, new RegExp(escapeRegExp(artifactPath)), `${target.label} guard omits ${artifactPath}`);
    }
  }
});

test("PRF-10 staging guidance is consistent across reusable docs", () => {
  const stagingTerms = ["draft", "approved", "deferred-with-reason", "not-needed"];

  for (const target of targetRoots()) {
    for (const docPath of [
      `${target.prefix}reference/profiles/PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md`,
      `${target.prefix}reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md`,
      `${target.prefix}reference/manuals/human/HARNESS_MANUAL.md`
    ]) {
      const doc = readText(docPath);
      for (const term of stagingTerms) {
        assert.match(doc, new RegExp(term), `${docPath} omits ${term}`);
      }
      assert.match(doc, /Ready For Code/, `${docPath} omits Ready For Code context`);
    }
  }
});
