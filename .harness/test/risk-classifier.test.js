import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inspectTaskPacketContract } from "../runtime/state/drift-validator.js";
import { seedStandardRepo, writeOpsPacket } from "./dev05-test-helpers.js";

function inspectRiskPacket({
  gateProfile = "standard",
  readyForCode = "approved",
  includeManifest = true,
  riskClass,
  routeClass = "packet-path",
  changeZone = null,
  ownershipMap = false,
  extraBullets = [],
  extraContent = "",
  fastPathNote = null
}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "risk-classifier-"));
  seedStandardRepo(repoRoot);
  if (ownershipMap) {
    fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, "reference", "artifacts", "REPOSITORY_LAYOUT_OWNERSHIP.json"),
      JSON.stringify({
        schemaVersion: "test/v1",
        precedence: "most-specific wins",
        rules: [
          {
            pathPattern: ".harness/runtime/**",
            ownerLayer: "harness-runtime",
            defaultChangeZone: "core",
            routeImplication: "packet-path",
            productionEligibility: "allowed",
            exceptionRationale: "runtime is core"
          },
          {
            pathPattern: "src/**",
            ownerLayer: "product-source",
            defaultChangeZone: "padded",
            routeImplication: "fast-path-eligible",
            productionEligibility: "allowed",
            exceptionRationale: "product source is padded"
          }
        ]
      }, null, 2),
      "utf8"
    );
  }
  const packetPath = "reference/packets/PKT-01_RISK_CLASSIFIER_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile,
    includeManifest,
    readyForCode,
    packetTitle: "PKT-01 Risk classifier test",
    workItemTitle: "Risk classifier test"
  });
  const absolutePath = path.join(repoRoot, packetPath);
  let content = fs.readFileSync(absolutePath, "utf8");
  content = content.replace(
    "| User-facing impact |",
    `| Risk class | ${riskClass} | Declared test risk | approved |\n` +
      `| Route class | ${routeClass} | Visibility-only route metadata | approved |\n` +
      "| User-facing impact |"
  );
  if (changeZone) {
    content = content.replace(
      "| User-facing impact |",
      `| Change zone | ${changeZone} | Declared change-zone fixture | approved |\n` +
        "| User-facing impact |"
    );
  }
  content = content.replace(
    "- Verification manifest:",
    [
      ...(changeZone ? [`- Change zone: ${changeZone}`] : []),
      "- Verification manifest:"
    ].join("\n")
  );
  content = content.replace(
    "- Verification manifest:",
    [
      `- Risk class: ${riskClass}`,
      `- Route class: ${routeClass}`,
      "- Risk classification rationale: targeted validator fixture",
      "- Critical human confirmation: not-needed",
      "- Critical confirmation owner: not-needed",
      "- Critical confirmation status: not-needed",
      "- Critical confirmation evidence path: not-needed",
      ...extraBullets,
      "- Verification manifest:"
    ].join("\n")
  );
  if (extraContent) {
    content += `\n${extraContent}\n`;
  }
  if (fastPathNote) {
    content += `\n## Fast Path Note\n${fastPathNote.map((line) => `- ${line}`).join("\n")}\n`;
  }
  fs.writeFileSync(absolutePath, content, "utf8");
  return inspectTaskPacketContract({ repoRoot, packetPath });
}

test("risk classifier records low, normal, high, and critical effective classes", () => {
  const low = inspectRiskPacket({ gateProfile: "light", riskClass: "low" });
  assert.equal(low.riskClassification.effectiveRiskClass, "low");

  const normal = inspectRiskPacket({ gateProfile: "contract", riskClass: "normal" });
  assert.equal(normal.riskClassification.effectiveRiskClass, "normal");

  const high = inspectRiskPacket({ gateProfile: "contract", riskClass: "high" });
  assert.equal(high.riskClassification.effectiveRiskClass, "high");

  const critical = inspectRiskPacket({ gateProfile: "standard", riskClass: "critical" });
  assert.equal(critical.riskClassification.effectiveRiskClass, "critical");
});

test("fast-path route is promoted when change-zone ownership map detects core path", () => {
  const result = inspectRiskPacket({
    gateProfile: "light",
    riskClass: "low",
    routeClass: "fast-path",
    changeZone: "padded",
    ownershipMap: true,
    fastPathNote: [
      "requested change: update runtime helper",
      "why low risk: fixture claim",
      "data migration: no",
      "auth/security: no",
      "external api contract: no",
      "release/deploy/cutover: no",
      "schema change: no",
      "workflow/validator authority: no",
      "architecture or reusable runtime change: no",
      "files changed: .harness/runtime/state/packet-preflight.js",
      "verification run: targeted tests",
      "residual risk: low",
      "follow-up needed: none"
    ]
  });

  assert.equal(result.riskClassification.requestedRouteClass, "fast-path");
  assert.equal(result.riskClassification.chosenRouteClass, "packet-path");
  assert.equal(
    result.riskClassification.routeRejectionReasons.some((reason) => reason.includes("change-zone")),
    true
  );
  assert.equal(
    result.findings.some((finding) => finding.code === "change_zone_path_mismatch_blocked"),
    true
  );
});

test("risk classifier raises declared low when derived risk is higher without lowering human-declared high", () => {
  const mismatch = inspectRiskPacket({
    gateProfile: "standard",
    riskClass: "low",
    extraContent: "## Risk Fixture\n- This fixture changes validator enforcement."
  });
  assert.equal(mismatch.riskClassification.declaredRiskClass, "low");
  assert.equal(mismatch.riskClassification.derivedRiskClass, "high");
  assert.equal(mismatch.riskClassification.effectiveRiskClass, "high");
  assert.equal(
    mismatch.findings.some((finding) => finding.code === "risk_class_declared_below_derived"),
    true
  );

  const declaredHigh = inspectRiskPacket({ gateProfile: "light", riskClass: "high" });
  assert.equal(declaredHigh.riskClassification.declaredRiskClass, "high");
  assert.equal(declaredHigh.riskClassification.derivedRiskClass, "low");
  assert.equal(declaredHigh.riskClassification.effectiveRiskClass, "high");
});

test("high risk holds without Ready For Code approval and verification evidence", () => {
  const result = inspectRiskPacket({
    gateProfile: "standard",
    readyForCode: "hold",
    includeManifest: false,
    riskClass: "high"
  });
  const finding = result.findings.find(
    (candidate) => candidate.code === "risk_class_high_requires_packet_approval_evidence"
  );
  assert.equal(finding?.gateEffect, "hold");
});

test("task packet semantic contract reports context/docs impact diagnostics with correction route", () => {
  const result = inspectRiskPacket({
    gateProfile: "contract",
    readyForCode: "approved",
    riskClass: "normal",
    extraBullets: [
      "- Schema impact classification: high",
      "- Domain context: none",
      "- System boundary impact: reusable runtime helper",
      "- System context: unknown",
      "- Architecture: not-needed",
      "- API/interface doc impact: update-required",
      "- Docs parity status: fail"
    ]
  });

  const codes = new Set(result.findings.map((finding) => finding.code));
  assert.equal(codes.has("context_impact_domain_context_missing"), true);
  assert.equal(codes.has("context_impact_status_blocks_transition"), true);
  assert.equal(codes.has("development_docs_parity_blocks_closeout"), true);
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.field === "Domain context" &&
        finding.currentValue === "none" &&
        finding.expectedValues.includes("citation-only") &&
        finding.route === "Planner"
    ),
    true
  );
});

test("critical risk hard-stops without explicit human confirmation", () => {
  const result = inspectRiskPacket({
    gateProfile: "standard",
    riskClass: "low",
    extraContent: "## Risk Fixture\n- critical-risk trigger: irreversible production exposure."
  });
  assert.equal(result.riskClassification.derivedRiskClass, "critical");
  assert.equal(result.riskClassification.effectiveRiskClass, "critical");
  const finding = result.findings.find(
    (candidate) => candidate.code === "risk_class_critical_human_confirmation_missing"
  );
  assert.equal(finding?.gateEffect, "hard_stop");
});

test("critical risk proceeds only when packet evidence records human confirmation", () => {
  const result = inspectRiskPacket({
    gateProfile: "standard",
    riskClass: "critical",
    extraBullets: [
      "- Critical human confirmation: user explicitly approved critical fixture",
      "- Critical confirmation owner: user",
      "- Critical confirmation status: approved",
      "- Critical confirmation evidence path: reference/packets/PKT-01_RISK_CLASSIFIER_TEST.md"
    ]
  });
  assert.equal(
    result.findings.some((finding) => finding.code === "risk_class_critical_human_confirmation_missing"),
    false
  );
});

test("fast-path stays eligible only for low-risk packets with a complete Fast Path Note", () => {
  const result = inspectRiskPacket({
    gateProfile: "light",
    riskClass: "low",
    routeClass: "fast-path",
    fastPathNote: [
      "requested change: tighten local validation-report wording",
      "why low risk: no runtime schema or workflow authority change",
      "data migration: no",
      "auth/security: no",
      "external api contract: no",
      "release/deploy/cutover: no",
      "schema change: no",
      "workflow/validator authority: no",
      "architecture or reusable runtime change: no",
      "files changed: .harness/runtime/state/dev05-tooling.js",
      "verification run: node --test .harness/test/risk-classifier.test.js",
      "residual risk: low",
      "follow-up needed: none"
    ]
  });

  assert.equal(result.riskClassification.requestedRouteClass, "fast-path");
  assert.equal(result.riskClassification.chosenRouteClass, "fast-path");
  assert.equal(result.riskClassification.routeEligibility, "eligible");
  assert.deepEqual(result.riskClassification.routeRejectionReasons, []);
});

test("fast-path falls back to packet-path when risk is not low or the Fast Path Note is incomplete", () => {
  const highRisk = inspectRiskPacket({
    gateProfile: "contract",
    riskClass: "normal",
    routeClass: "fast-path",
    fastPathNote: [
      "requested change: edit reusable route logic",
      "why low risk: claimed low risk",
      "data migration: no",
      "auth/security: no",
      "external api contract: no",
      "release/deploy/cutover: no",
      "schema change: no",
      "workflow/validator authority: no",
      "architecture or reusable runtime change: no",
      "files changed: reusable runtime files",
      "verification run: targeted tests",
      "residual risk: medium",
      "follow-up needed: none"
    ]
  });
  assert.equal(highRisk.riskClassification.chosenRouteClass, "packet-path");
  assert.equal(highRisk.riskClassification.routeEligibility, "rejected");
  assert.equal(
    highRisk.riskClassification.routeRejectionReasons.some((reason) => reason.includes("effective riskClass normal")),
    true
  );

  const incomplete = inspectRiskPacket({
    gateProfile: "light",
    riskClass: "low",
    routeClass: "fast-path",
    fastPathNote: [
      "requested change: local copy fix",
      "why low risk: no behavior change",
      "data migration: no",
      "auth/security: no",
      "external api contract: no",
      "release/deploy/cutover: no",
      "schema change: no",
      "workflow/validator authority: no",
      "architecture or reusable runtime change: no",
      "files changed: README.md",
      "residual risk: low"
    ]
  });
  assert.equal(incomplete.riskClassification.chosenRouteClass, "packet-path");
  assert.equal(
    incomplete.riskClassification.routeRejectionReasons.some((reason) => reason.includes("follow-up needed")),
    true
  );
});

test("fast-path escalates to strict-path when the structured strict-path checklist fires", () => {
  const result = inspectRiskPacket({
    gateProfile: "light",
    riskClass: "low",
    routeClass: "fast-path",
    fastPathNote: [
      "requested change: update integration contract",
      "why low risk: test fixture",
      "data migration: no",
      "auth/security: no",
      "external api contract: yes",
      "release/deploy/cutover: no",
      "schema change: no",
      "workflow/validator authority: no",
      "architecture or reusable runtime change: no",
      "files changed: contract docs",
      "verification run: targeted tests",
      "residual risk: normal",
      "follow-up needed: packet-path or strict-path review"
    ]
  });

  assert.equal(result.riskClassification.chosenRouteClass, "strict-path");
  assert.equal(result.riskClassification.routeEligibility, "rejected");
  assert.equal(
    result.riskClassification.routeRejectionReasons.some((reason) => reason.includes("external api contract: yes")),
    true
  );
});
