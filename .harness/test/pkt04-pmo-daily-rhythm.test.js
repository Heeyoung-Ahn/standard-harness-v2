import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_PMO_FOLDERS,
  REQUIRED_WBS_COLUMNS,
  buildDayStartReport,
  buildDayWrapUpReport,
  buildWbsTsv,
  validatePmoPlacement,
  validatePmoReport,
  validateWbsTsv
} from "../runtime/state/pmo-daily-reports.js";

const SOURCES = {
  packetId: "PKT-04",
  packetTitle: "PM Daily Rhythm",
  sourceWatermark: 42,
  nextWork: "Implement PM daily rhythm.",
  evidenceIndexPath: "_ops/evidence/PKT-04/evidence-index.json",
  closeoutReportPath: "product/docs/packets/PKT-04/closeout.md",
  blockers: ["No blocker"],
  risks: ["PM reports must not approve closeout"],
  decisionsNeeded: ["Approve residual risk only if review finds one"],
  completedWork: ["Day report generator"],
  incompleteWork: ["PKT-05 long memory"],
  wbsChanges: ["PKT-04 marked in progress"],
  questions: ["Any PMO wording adjustment?"]
};

test("PKT-04 builds one-page day-start report with coordination-only authority and source links", () => {
  const report = buildDayStartReport({ ...SOURCES, reportDate: "2026-06-28" });

  assert.equal(report.persistence, "generated-view");
  assert.equal(report.reportPath, "_ops/views/pmo/day-start/2026-06-28.md");
  assert.equal(report.authority, "coordination-only");
  assert.equal(report.sourceWatermark, 42);
  assert(report.markdown.includes("_ops/evidence/PKT-04/evidence-index.json"));
  assert.equal(validatePmoReport({ report, canonicalSourceWatermark: 42 }).ok, true);
});

test("PKT-04 day-wrap-up report includes completed incomplete WBS and question prompts", () => {
  const report = buildDayWrapUpReport({ ...SOURCES, reportDate: "2026-06-28" });

  assert.equal(report.reportPath, "product/docs/pmo/day-wrap-up/2026-06-28.md");
  assert(report.markdown.includes("Day report generator"));
  assert(report.markdown.includes("PKT-05 long memory"));
  assert(report.markdown.includes("PKT-04 marked in progress"));
  assert(report.markdown.includes("Any PMO wording adjustment?"));
  assert.equal(validatePmoReport({ report, canonicalSourceWatermark: 42 }).ok, true);
});

test("PKT-04 report validation blocks stale overlong authority claims and missing evidence links", () => {
  const report = buildDayStartReport({
    ...SOURCES,
    sourceWatermark: 7,
    evidenceIndexPath: "",
    nextWork: "PM approves implementation, testing, review, release, closeout, and residual risk.",
    reportDate: "2026-06-28"
  });
  report.markdown += `\n${Array.from({ length: 70 }, (_, index) => `extra line ${index}`).join("\n")}`;

  const codes = validatePmoReport({ report, canonicalSourceWatermark: 42 }).diagnostics.map((item) => item.code);
  assert(codes.includes("pmo_report_stale"));
  assert(codes.includes("pmo_report_too_long"));
  assert(codes.includes("pmo_report_claims_approval_authority"));
  assert(codes.includes("pmo_report_missing_evidence_index_link"));
});

test("PKT-04 WBS TSV uses the selected minimum columns and evidence links", () => {
  const tsv = buildWbsTsv({
    rows: [
      {
        wbs_id: "1.4",
        parent_id: "1",
        packet_id: "PKT-04",
        title: "PM Daily Rhythm",
        status: "in_progress",
        owner_role: "orchestrator",
        priority: "P1",
        risk_level: "high",
        planned_start: "2026-06-28",
        planned_finish: "2026-06-28",
        evidence_index_path: "_ops/evidence/PKT-04/evidence-index.json",
        closeout_report_path: "product/docs/packets/PKT-04/closeout.md",
        updated_at: "2026-06-28T00:00:00Z"
      }
    ]
  });

  assert.deepEqual(tsv.split("\n")[0].split("\t"), REQUIRED_WBS_COLUMNS);
  assert.equal(validateWbsTsv({ tsv }).ok, true);
});

test("PKT-04 placement validation requires the PMO minimum folder contract", () => {
  const paths = REQUIRED_PMO_FOLDERS.map((folder) => `product/docs/pmo/${folder}`);
  assert.equal(validatePmoPlacement({ paths }).ok, true);

  const codes = validatePmoPlacement({ paths: ["product/docs/pmo/wbs"] }).diagnostics.map((item) => item.code);
  assert(codes.includes("missing_pmo_folder"));
});
