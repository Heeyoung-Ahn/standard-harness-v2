import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("adversarial review skill ships in the starter with required guidance", () => {
  const rootSkill = readText(".agents/skills/adversarial_review/SKILL.md");
  const reviewWorkflow = readText(".agents/workflows/reviewer.md");

  for (const marker of [
    "# Adversarial Review",
    "## Use When",
    "## Do Not Use When",
    "## Review Lenses",
    "Source alignment",
    "Acceptance and evidence coverage",
    "Risk and regression pressure",
    "Authority-boundary preservation",
    "## Finding Format",
    "Source ref",
    "Recommended route",
    "## Zero-Finding Rule",
    "missing evidence as a finding",
    "must not approve implementation",
    "override Reviewer or Planner judgment"
  ]) {
    assert.match(rootSkill, new RegExp(escapeRegExp(marker)), `missing marker: ${marker}`);
  }

  assert.match(
    reviewWorkflow,
    /Use `\.agents\/skills\/adversarial_review\/SKILL\.md` when closeout, zero-finding review, high-risk evidence, or requirements\/source-alignment judgment needs a deliberate challenge pass\./
  );
  assert.doesNotMatch(sectionText(reviewWorkflow, "Must Read SSOT"), /adversarial_review/);
  assert.doesNotMatch(sectionText(reviewWorkflow, "Read First"), /adversarial_review/);
});

function sectionText(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`));
  assert.ok(match, `missing section: ${heading}`);
  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
