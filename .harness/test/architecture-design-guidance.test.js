import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("architecture design guidance ships in the starter with conditional Planner discoverability", () => {
  const skill = readText(".agents/skills/architecture_design/SKILL.md");
  const planWorkflow = readText(".agents/workflows/planner.md");

  for (const marker of [
    "# Architecture Design",
    "## Use When",
    "## Do Not Use When",
    "## Decision Queue",
    "## Step Confirmation Model",
    "## Blocker Checks",
    "Requirements Freeze",
    "ARCHITECTURE_GUIDE.md",
    "stack / runtime",
    "component structure",
    "data model / domain",
    "interface / integration",
    "deployment topology",
    "quality constraints",
    "Assumption",
    "Answer Status",
    "Downstream Impact",
    "Blocker Status",
    "Ready For Code",
    "competing SSOT"
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(marker)), `missing skill marker: ${marker}`);
  }

  assert.match(
    planWorkflow,
    /Use `\.agents\/skills\/architecture_design\/SKILL\.md` when drafting, rebasing, or structurally updating `\.agents\/artifacts\/ARCHITECTURE_GUIDE\.md` after Requirements Freeze so the Planner builds an architecture decision queue, confirms one step at a time, records assumptions and blocker status, and stops before downstream baselines, packet drafting, or Ready For Code when architecture decisions are not closed enough\./
  );
  assert.doesNotMatch(sectionText(planWorkflow, "Must Read SSOT"), /architecture_design/);
  assert.doesNotMatch(sectionText(planWorkflow, "Read First"), /architecture_design/);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
