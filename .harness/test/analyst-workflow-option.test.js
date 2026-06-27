import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("Analyst workflow ships in the starter with Planner discoverability", () => {
  const analystWorkflow = readText(".agents/workflows/analyst.md");
  const planWorkflow = readText(".agents/workflows/planner.md");

  for (const marker of [
    "# Analyst Workflow",
    "## Role",
    "## Mission",
    "## Authority",
    "## Non-Authority",
    "## Use When",
    "## Do Not Use When",
    "## Analysis Flow",
    "## Analyst Brief Output",
    "## Planner Handoff",
    "pre-planning analysis",
    "source intake",
    "option framing",
    "tradeoffs",
    "open questions",
    "Do not open, register, approve, close, or mutate packets",
    "Do not mark Ready For Code approved",
    "analysis input only and not Ready For Code approval"
  ]) {
    assert.match(analystWorkflow, new RegExp(escapeRegExp(marker)), `missing Analyst workflow marker: ${marker}`);
  }

  assert.match(
    planWorkflow,
    /Use `\.agents\/workflows\/analyst\.md` when a user request, source intake, or option space needs pre-planning analysis, comparison, tradeoff framing, assumptions, risks, and open questions before Planner can responsibly define a packet; Analyst output is an input brief only and must stop before packet opening, Ready For Code approval, state mutation, or implementation\./
  );
  assert.doesNotMatch(sectionText(planWorkflow, "Must Read SSOT"), /analyst\.md/);
  assert.doesNotMatch(sectionText(planWorkflow, "Read First"), /analyst\.md/);
});

test("Planner close response checklist ships in the starter", () => {
  const planWorkflow = readText(".agents/workflows/planner.md");
  const checklist = sectionText(planWorkflow, "Planner Close Response Checklist");

  for (const marker of [
    "packet purpose in plain language",
    "implementation impact if approved",
    "in-scope boundary",
    "out-of-scope boundary",
    "open decision items with meaning, realistic alternatives, recommended option, and reason",
    "explicit statement when no decision remains except Ready For Code approval",
    "revise the user-facing response before ending the turn",
    "Mention this checklist in `Current Work`"
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(marker)), `missing checklist marker: ${marker}`);
  }
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
