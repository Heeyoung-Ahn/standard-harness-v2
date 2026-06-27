import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveReviewerProfiles } from "../runtime/state/reviewer-profiles.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("strict approval workflow packet requires security, approval, and data reviewers", () => {
  const result = resolveReviewerProfiles({ repoRoot: root, lane: "strict", profiles: ["PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE"], files: ["src/approval.ts"], text: "approval state machine role permission audit" });
  const ids = result.required.map((item) => item.id);
  assert.equal(result.ok, true);
  for (const id of ["correctness", "scope-guardian", "security", "approval-workflow", "data-integrity"]) assert(ids.includes(id));
});

test("BI dashboard packet requires semantic and UX reviewers", () => {
  const result = resolveReviewerProfiles({ repoRoot: root, lane: "standard", profiles: ["PRF-10_BI_ANALYTICS_PLATFORM_PROFILE"], files: ["src/Dashboard.tsx"], text: "BI dashboard metric catalog semantic model" });
  const ids = result.required.map((item) => item.id);
  assert.equal(result.ok, true);
  for (const id of ["bi-semantic-model", "data-integrity", "ux-accessibility"]) assert(ids.includes(id));
});
