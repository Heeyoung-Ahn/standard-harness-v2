import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PMO_STRUCTURED_STATE_RECORDS,
  PMO_SURFACE_CONTRACT,
  REQUIRED_PMO_FOLDERS,
  buildDayStartReport,
  validatePmoPlacement
} from "../runtime/state/pmo-daily-reports.js";

test("PKT-04A keeps only compact human PMO folders mandatory", () => {
  assert.deepEqual(REQUIRED_PMO_FOLDERS, ["day-wrap-up", "wbs"]);
  assert.deepEqual(PMO_SURFACE_CONTRACT.humanMarkdownFolders, ["day-wrap-up"]);
  assert.deepEqual(PMO_SURFACE_CONTRACT.structuredFolders, ["wbs"]);
  assert.equal(PMO_SURFACE_CONTRACT.generatedViews.includes("day-start"), true);
  assert.deepEqual(PMO_STRUCTURED_STATE_RECORDS, [
    "source-intake",
    "daily-reports",
    "status",
    "risks",
    "blockers"
  ]);
});

test("PKT-04A placement validation rejects legacy and structured-state PMO Markdown folders", () => {
  assert.equal(
    validatePmoPlacement({
      paths: ["product/docs/pmo/day-wrap-up", "product/docs/pmo/wbs"]
    }).ok,
    true
  );

  const diagnostics = validatePmoPlacement({
    paths: [
      "product/docs/pmo/day-wrap-up",
      "product/docs/pmo/wbs",
      "product/docs/pmo/daily-wrap-up",
      "product/docs/pmo/source-intake",
      "product/docs/pmo/day-start"
    ]
  }).diagnostics;
  const codes = diagnostics.map((item) => item.code);

  assert(codes.includes("legacy_pmo_folder"));
  assert(codes.includes("structured_pmo_state_as_markdown_folder"));
  assert(codes.includes("generated_pmo_view_as_required_markdown_folder"));
});

test("PKT-04A day-start report is generated-view output, not required product Markdown", () => {
  const report = buildDayStartReport({
    packetId: "PKT-04A",
    reportDate: "2026-06-28",
    nextWork: "Continue compact PMO validation.",
    evidenceIndexPath: "_ops/evidence/PKT-04A/evidence-index.json",
    sourceWatermark: 42
  });

  assert.equal(report.reportType, "day-start");
  assert.equal(report.persistence, "generated-view");
  assert.equal(report.reportPath, "_ops/views/pmo/day-start/2026-06-28.md");
});

test("PKT-04A root and starter reviewer contracts expose four minimum review lenses", () => {
  const rootReviewer = readFileSync(".agents/workflows/reviewer.md", "utf8");
  const starterReviewPolicy = readFileSync(
    "starter/standard-harness/_harness/policies/review-governance.yaml",
    "utf8"
  );
  const expectedLenses = [
    "challenge_review",
    "adversarial_security_review",
    "code_quality_review",
    "evidence_review"
  ];

  for (const lens of expectedLenses) {
    assert(rootReviewer.includes(lens), `root reviewer missing ${lens}`);
    assert(starterReviewPolicy.includes(lens), `starter review policy missing ${lens}`);
  }
  assert(rootReviewer.includes("approved scope"));
  assert(rootReviewer.includes("auth/authz bypass"));
  assert(rootReviewer.includes("module boundary"));
  assert(rootReviewer.includes("packet acceptance maps to tests"));
}
);
