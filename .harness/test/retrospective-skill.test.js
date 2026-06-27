import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("retrospective skill ships in the starter with Planner closeout trigger", () => {
  const skill = readText(".agents/skills/retrospective/SKILL.md");
  const dayWrap = readText(".agents/skills/day_wrap_up/SKILL.md");
  const dayStart = readText(".agents/skills/day_start/SKILL.md");
  const planWorkflow = readText(".agents/workflows/planner.md");
  const pmWorkflow = readText(".agents/workflows/project_manager.md");

  for (const marker of [
    "# Retrospective",
    "## Use When",
    "## Do Not Use When",
    "Planner closeout",
    "Harness friction means the tokens or repeated actions spent operating the harness exceed the actual project work",
    "Packet authoring or registration required repeated structural rewrites",
    "preflight passed but later registration semantic checks failed",
    "## Retrospective Shape",
    "Keep",
    "Improve",
    "Try",
    "## Promotion Candidate Fields",
    "Trigger",
    "Preventive Rule",
    "Check Method",
    "Target Layer",
    "Evidence / Source",
    "Promotion Status",
    "Linked Follow-Up Item",
    "repeated-friction evidence",
    "## Candidate Append Rule",
    "append a bounded entry",
    "Promotion Status: proposed",
    "memory capture only",
    "must not approve implementation",
    "edit `Active Preventive Rules`",
    "mark candidates `approved` or `promoted` without user approval",
    "implement real harness changes",
    "current route authority",
    "Root maintainer preventive history stays root-only"
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(marker)), `missing marker: ${marker}`);
  }

  for (const marker of [
    "## Preventive Memory Triage",
    "## Harness Improvement Threshold",
    "ask the user which candidates should be approved, deferred, rejected, merged, or kept as note-only",
    "three or more actual harness improvement candidates are approved and still unimplemented",
    "This threshold is a priority signal for the next PM `day_start`",
    "not approval to implement the improvements"
  ]) {
    assert.match(dayWrap, new RegExp(escapeRegExp(marker)), `missing day-wrap marker: ${marker}`);
  }

  for (const marker of [
    "## Harness Improvement Priority",
    "guide the day's priority toward harness improvement planning",
    "put harness improvement planning in `Today's Top Priorities`",
    "recommend `Planner` as the next workflow",
    "do not approve, open, implement, test, review, or close the improvement packet inside day start",
    "only as a PM priority signal"
  ]) {
    assert.match(dayStart, new RegExp(escapeRegExp(marker)), `missing day-start marker: ${marker}`);
  }

  assert.match(
    planWorkflow,
    /Use `\.agents\/skills\/retrospective\/SKILL\.md` during Planner closeout when completed work produced repeated friction, remediation loops, review\/test gaps, operator confusion, or a candidate lesson for `\.agents\/artifacts\/PREVENTIVE_MEMORY\.md`\./
  );
  assert.doesNotMatch(sectionText(planWorkflow, "Must Read SSOT"), /retrospective/);
  assert.doesNotMatch(sectionText(planWorkflow, "Read First"), /retrospective/);
  assert.match(pmWorkflow, /Use `\.agents\/skills\/day_start\/SKILL\.md`/);
  assert.match(pmWorkflow, /Use `\.agents\/skills\/day_wrap_up\/SKILL\.md`/);
  assert.doesNotMatch(pmWorkflow, /retrospective/);
  assert.doesNotMatch(readText(".agents/workflows/reviewer.md"), /retrospective/);
  assert.doesNotMatch(readText(".agents/workflows/orchestrator.md"), /retrospective/);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
