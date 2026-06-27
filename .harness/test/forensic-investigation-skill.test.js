import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("forensic investigation skill ships with bounded starter discoverability", () => {
  const skill = readText(".agents/skills/forensic_investigation/SKILL.md");
  const template = readText("reference/artifacts/investigations/CASE_FILE_TEMPLATE.md");
  const reviewWorkflow = readText(".agents/workflows/reviewer.md");

  for (const marker of [
    "# Forensic Investigation",
    "## Use When",
    "## Do Not Use When",
    "## Evidence Grades",
    "Confirmed",
    "Deduced",
    "Hypothesized",
    "missing required evidence",
    "Contradiction Map",
    "Recommended Route",
    "reference/artifacts/investigations/",
    "must not become a new SSOT",
    "must not implement code",
    "verify as Tester",
    "approve as Reviewer",
    "close as Planner",
    "change approval state",
    "edit generated state docs manually",
    "do not mirror root-specific cases"
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(marker)), `missing skill marker: ${marker}`);
  }

  for (const marker of [
    "# Investigation Case File",
    "## Source Inventory",
    "## Confirmed Findings",
    "## Deduced Findings",
    "## Hypothesized Findings",
    "## Missing Evidence",
    "## Contradiction Map",
    "## Recommended Route",
    "## Authority Boundary",
    "must not implement remediation",
    "approve implementation",
    "close packets",
    "waive missing evidence",
    "change approval state"
  ]) {
    assert.match(template, new RegExp(escapeRegExp(marker)), `missing template marker: ${marker}`);
  }

  assert.match(
    reviewWorkflow,
    /Use `\.agents\/skills\/forensic_investigation\/SKILL\.md` when review or closeout evidence has conflicting source claims, missing required evidence that blocks a claim, or an ambiguous root cause that needs Confirmed \/ Deduced \/ Hypothesized classification\./
  );
  assert.doesNotMatch(sectionText(reviewWorkflow, "Must Read SSOT"), /forensic_investigation/);
  assert.doesNotMatch(sectionText(reviewWorkflow, "Read First"), /forensic_investigation/);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
