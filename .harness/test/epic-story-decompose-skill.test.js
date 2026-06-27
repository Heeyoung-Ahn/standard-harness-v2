import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("epic/story decomposition skill ships in the starter with conditional Planner discoverability", () => {
  const skill = readText(".agents/skills/epic_story_decompose/SKILL.md");
  const planWorkflow = readText(".agents/workflows/planner.md");

  for (const marker of [
    "# Epic Story Decompose",
    "## Use When",
    "## Do Not Use When",
    "## Candidate Boundary Model",
    "## Decomposition Flow",
    "## Output Format",
    "## Split / Merge Heuristics",
    "## Blocker Checks",
    "## Authority Boundary",
    "`source authority`",
    "`user outcome`",
    "`changed surface`",
    "`ownership boundary`",
    "`dependency`",
    "`gate/risk/route`",
    "`verification burden`",
    "`split reason`",
    "`merge reason`",
    "`defer reason`",
    "`approval state`",
    "Ready For Code",
    "Standard packet approval",
    "planning candidates only",
    "must not approve implementation",
    "must not approve implementation, open packets, change Ready For Code"
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(marker)), `missing skill marker: ${marker}`);
  }

  assert.match(
    planWorkflow,
    /Use `\.agents\/skills\/epic_story_decompose\/SKILL\.md` when turning a broad epic, story, roadmap item, feature set, source intake, requirements output, architecture output, or large user request into packet-ready candidate boundaries so the Planner produces candidate packets, sequence, split\/merge\/defer rationale, gate\/risk\/route hints, and missing evidence while stopping before packet opening or Ready For Code approval unless separately authorized\./
  );
  assert.doesNotMatch(sectionText(planWorkflow, "Must Read SSOT"), /epic_story_decompose/);
  assert.doesNotMatch(sectionText(planWorkflow, "Read First"), /epic_story_decompose/);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
