import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCloseoutReport,
  buildEvidenceIndex,
  validateCloseoutReport,
  validateEvidenceIndex,
  validateWikiProposalBoundary
} from "../runtime/state/closeout-evidence-index.js";

const PASSING_GATE_ENTRY = {
  evidenceId: "EV-harness-validation",
  evidenceType: "test",
  sourcePath: "reference/reports/testing/PKT-03_TEST_REPORT.md",
  status: "pass",
  trustStatus: "trusted",
  freshnessStatus: "fresh",
  resolutionStatus: "resolved",
  redactionStatus: "not-sensitive",
  requiredGate: "harness-validation",
  claimId: "PKT-03",
  acceptanceId: "report-validation"
};

test("PKT-03 builds closeout report under product docs with evidence index link", () => {
  const index = buildEvidenceIndex({
    packetId: "PKT-03",
    requiredGates: ["harness-validation"],
    entries: [PASSING_GATE_ENTRY]
  });
  const report = buildCloseoutReport({
    packetId: "PKT-03",
    evidenceIndex: index,
    sections: {
      originalIntent: "Create one concise closeout report.",
      implementedResult: "Report links evidence index.",
      acceptanceStatus: "pass"
    }
  });

  assert.equal(report.reportPath, "product/docs/packets/PKT-03/closeout.md");
  assert.equal(report.evidenceIndexPath, "_ops/evidence/PKT-03/evidence-index.json");
  assert(report.markdown.includes("[Evidence index](_ops/evidence/PKT-03/evidence-index.json)"));
  assert.equal(validateCloseoutReport({ report, evidenceIndex: index, requiredGates: ["harness-validation"] }).ok, true);
});

test("PKT-03 evidence index blocks missing stale untrusted unresolved required gate evidence", () => {
  const index = buildEvidenceIndex({
    packetId: "PKT-03",
    requiredGates: ["harness-validation", "independent-review"],
    entries: [
      {
        ...PASSING_GATE_ENTRY,
        status: "fail",
        trustStatus: "untrusted",
        freshnessStatus: "stale",
        resolutionStatus: "unresolved"
      }
    ]
  });

  const codes = validateEvidenceIndex({ index, requiredGates: ["harness-validation", "independent-review"] })
    .diagnostics.map((item) => item.code)
    .sort();

  assert.deepEqual(
    codes,
    [
      "missing_required_gate_evidence",
      "required_gate_not_passing",
      "required_gate_stale",
      "required_gate_unresolved",
      "required_gate_untrusted"
    ].sort()
  );
});

test("PKT-03 N/A records require reason substitute check and evidence link", () => {
  const index = buildEvidenceIndex({
    packetId: "PKT-03",
    entries: [
      {
        ...PASSING_GATE_ENTRY,
        evidenceId: "EV-e2e-na",
        status: "not_applicable_recorded",
        requiredGate: "e2e-applicability",
        naRecord: { reason: "No browser surface changed." }
      }
    ]
  });

  const codes = validateEvidenceIndex({ index }).diagnostics.map((item) => item.code);
  assert.equal(codes.filter((code) => code === "invalid_na_record").length, 2);
});

test("PKT-03 closeout report blocks raw dumps and overlong reports", () => {
  const report = buildCloseoutReport({
    packetId: "PKT-03",
    sections: {
      originalIntent: "x",
      implementedResult: Array.from({ length: 130 }, (_, index) => `line ${index}`).join("\n"),
      acceptanceStatus: "```log\nraw output\n```"
    }
  });

  const codes = validateCloseoutReport({ report }).diagnostics.map((item) => item.code);
  assert(codes.includes("closeout_report_too_long"));
  assert(codes.includes("raw_evidence_dump_in_report"));
});

test("PKT-03 wiki proposal boundary blocks direct wiki mutation", () => {
  const result = validateWikiProposalBoundary({
    paths: ["_ops/wiki/packet-memory.md", "_ops/wiki-proposals/PKT-03.json"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "documenter_direct_wiki_mutation");
});
