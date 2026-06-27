import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("requirements authoring guidance ships in the starter with conditional Planner discoverability", () => {
  const skill = readText(".agents/skills/requirements_deep_interview/SKILL.md");
  const guide = readText("reference/manuals/REQUIREMENTS_AUTHORING_GUIDE.md");
  const planWorkflow = readText(".agents/workflows/planner.md");

  for (const marker of [
    "# Requirements Deep Interview",
    "## Use When",
    "## Do Not Use When",
    "## Five-Field Requirements Kernel",
    "`goal`",
    "`users / roles`",
    "`scope boundary`",
    "`workflow / behavior`",
    "`evidence / approval state`",
    "decision queue",
    "Assumption",
    "Answer Status",
    "Downstream Impact",
    "Blocker Status",
    "## Freeze-Blocker Checks",
    "Requirements Freeze",
    "architecture sync",
    "implementation planning",
    "UI/design sync",
    "packet drafting",
    "Ready For Code",
    "PRD-style notes",
    "never replace `.agents/artifacts/REQUIREMENTS.md`"
  ]) {
    assert.match(skill, new RegExp(escapeRegExp(marker)), `missing skill marker: ${marker}`);
  }

  for (const marker of [
    "## Coached Authoring Flow",
    "## Five-Field Requirements Kernel",
    "## Freeze-Blocker Check",
    ".agents/skills/requirements_deep_interview/SKILL.md",
    "일반 reference read에는 이 스킬을 로드하지 않는다",
    "coaching helper",
    "Planner workflow authority",
    "human approval을 대체하지 않는다",
    "coached authoring flow를 직접 사용한다",
    "five-field requirements kernel",
    "Department requester",
    "threshold 이상 요청은 manager approval",
    "ordinary packet acceptance tests",
    "DEPLOYMENT_PLAN.md`를 요구하지 않는다",
    "Freeze blocker가 있으면",
    "Ready For Code로 진행하지 않는다",
    "요구사항 권위가 될 수 없다"
  ]) {
    assert.match(guide, new RegExp(escapeRegExp(marker)), `missing guide marker: ${marker}`);
  }

  assert.match(
    planWorkflow,
    /Use `\.agents\/skills\/requirements_deep_interview\/SKILL\.md` when drafting, rebasing, or structurally updating `\.agents\/artifacts\/REQUIREMENTS\.md` so the Planner builds a decision queue, records assumptions and blocker status, maps answers into the five-field requirements kernel, and stops before downstream baselines, packet drafting, or Ready For Code when Requirements Freeze is not closed enough\./
  );
  assert.doesNotMatch(sectionText(planWorkflow, "Must Read SSOT"), /requirements_deep_interview/);
  assert.doesNotMatch(sectionText(planWorkflow, "Read First"), /requirements_deep_interview/);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents/skills/product_requirements/SKILL.md")), false);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
