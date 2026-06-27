import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const promotedSkills = [
  "writing-plans",
  "executing-plans",
  "verification-before-completion",
  "requesting-code-review",
  "receiving-code-review",
  "security-review",
  "destructive-command-guard",
  "operator-support",
  "subagent-driven-development",
  "compound-learning",
  "memory-search"
];

const mergedOrCoveredSkills = {
  brainstorming: [".agents/skills/requirements_deep_interview/SKILL.md", ".agents/skills/architecture_design/SKILL.md"],
  "review-plan-engineering": [".agents/skills/adversarial_review/SKILL.md", ".agents/skills/code_review_checklist/SKILL.md"],
  "review-plan-security": [".agents/skills/security-review/SKILL.md"],
  "review-plan-operator": [".agents/skills/operator-support/SKILL.md"],
  "review-plan-devex": [".agents/skills/code_review_checklist/SKILL.md"]
};

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("root methodology skills promoted into active payload skill surface", () => {
  for (const skill of promotedSkills) {
    const relativePath = `.agents/skills/${skill}/SKILL.md`;
    const content = readText(relativePath);
    assert.match(content, /^# /, `${skill} should have a title`);
    assert.match(content, /## Use When/, `${skill} should define Use When`);
    assert.match(content, /## Do Not Use When/, `${skill} should define Do Not Use When`);
    assert.match(content, /## Authority Boundary/, `${skill} should define Authority Boundary`);
    assert.doesNotMatch(content, /tools\/harness_cli\.py|C:\\20_GitHub\\standard-harness/);
  }
});

test("merged methodology skills have documented active coverage and are not duplicate active skills", () => {
  for (const [rootSkill, coveragePaths] of Object.entries(mergedOrCoveredSkills)) {
    assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "skills", rootSkill, "SKILL.md")), false);
    for (const coveragePath of coveragePaths) {
      assert.equal(fs.existsSync(path.join(repoRoot, coveragePath)), true, `${rootSkill} coverage missing ${coveragePath}`);
    }
  }
});

test("skill catalog defines automatic skill selection and role affinity", () => {
  const catalog = readText("reference/artifacts/SKILL_MARKETPLACE_CATALOG.md");
  assert.match(catalog, /The user does not need to name a skill explicitly/);
  assert.match(catalog, /Role Skill Affinity/);
  for (const skill of promotedSkills) {
    assert.match(catalog, new RegExp(escapeRegExp(`.agents/skills/${skill}/SKILL.md`)), `catalog missing ${skill}`);
  }
  for (const role of ["Planner", "Developer", "Tester", "Reviewer", "Project Manager", "Orchestrator"]) {
    assert.match(catalog, new RegExp(`\\| ${escapeRegExp(role)} \\|`), `catalog missing role ${role}`);
  }
});

test("entry contract requires intent-based skill selection without loading every skill", () => {
  const entry = readText("AGENTS.md");
  assert.match(entry, /Use the matching skill even when the user does not explicitly name a skill/);
  assert.match(entry, /Skill use is automatic when intent matches a skill/);
  assert.match(entry, /Default context must not include all skill bodies|Load only the matching skill body needed/);
});

test("reference skills is not reintroduced as active runtime surface", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "reference", "skills")), false);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
