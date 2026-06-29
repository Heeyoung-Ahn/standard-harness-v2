import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  closeoutRequiredGateDiagnostics,
  evaluatePacketGateProfile,
  loadGateProfilePolicy,
  normalizeRiskLevel,
  resolveRequiredGateProfile,
  validateNaDecision
} from "../runtime/state/gate-profile-engine.js";
import { runPacketPreflightCommand } from "../runtime/state/packet-preflight.js";

test("PKT-02 risk aliases keep normal compatible with standard", () => {
  assert.equal(normalizeRiskLevel("normal"), "standard");
  assert.equal(normalizeRiskLevel("medium"), "standard");
  assert.equal(normalizeRiskLevel("standard"), "standard");
});

test("PKT-02 resolver keeps low docs-only lightweight", () => {
  const policy = loadGateProfilePolicy();
  const resolved = resolveRequiredGateProfile({ policy, packetType: "docs-only", riskLevel: "low" });

  assert.equal(resolved.effectiveRisk, "low");
  assert.deepEqual(resolved.requiredGates, ["schema", "boundary", "docs-command-if-command-changed", "closeout"]);
});

test("PKT-02 resolver escalates release-sensitive product packets", () => {
  const policy = loadGateProfilePolicy();
  const resolved = resolveRequiredGateProfile({
    policy,
    packetType: "product-feature",
    riskLevel: "normal",
    releaseSensitive: true,
    browserFacing: true
  });

  assert.equal(resolved.baseRisk, "standard");
  assert.equal(resolved.effectiveRisk, "critical");
  assert(resolved.requiredGates.includes("release-grade-validation"));
  assert(resolved.requiredGates.includes("rollback-or-backout-evidence"));
  assert(resolved.requiredGates.includes("user-workflow-review"));
  assert(resolved.requiredGates.includes("human-residual-risk-approval"));
});

test("PKT-02 resolver escalates security-data and high risk evidence", () => {
  const policy = loadGateProfilePolicy();
  const resolved = resolveRequiredGateProfile({
    policy,
    packetType: "security-data",
    riskLevel: "high",
    securitySensitive: true,
    dataSensitive: true
  });

  assert(resolved.requiredGates.includes("security-hard-gate"));
  assert(resolved.requiredGates.includes("independent-review"));
  assert(resolved.requiredGates.includes("data-integrity-review"));
  assert(resolved.requiredGates.includes("residual-risk-tracking"));
});

test("PKT-02 N/A decisions require evidence and reject contradictory claims", () => {
  const policy = loadGateProfilePolicy();
  const result = validateNaDecision({
    policy,
    packetType: "docs-only",
    gate: "e2e-applicability",
    ruleId: "docs-only-no-runtime-change",
    evidence: ["EV-1"],
    substituteChecks: ["docs-command-inventory", "requirements-metadata-validation"],
    changedFiles: [".harness/runtime/state/packet-preflight.js"],
    claims: ["browser-workflow-claim"]
  });

  assert.equal(result.ok, false);
  assert(result.diagnostics.includes("na_contradicted_by:runtime-path-changed"));
  assert(result.diagnostics.includes("na_contradicted_by:browser-workflow-claim"));
});

test("PKT-02 closeout diagnostics block missing, stale, untrusted, or unresolved gates", () => {
  const diagnostics = closeoutRequiredGateDiagnostics({
    requiredGates: ["schema", "security-hard-gate", "closeout"],
    gateResults: [
      { gate: "schema", status: "PASS", trusted: true, fresh: true },
      { gate: "security-hard-gate", status: "PASS", trusted: false, fresh: false, unresolved: true }
    ]
  });

  assert.deepEqual(
    diagnostics.map((item) => item.code).sort(),
    ["missing_required_gate", "required_gate_stale", "required_gate_unresolved", "required_gate_untrusted"].sort()
  );
});

test("PKT-02 packet preflight exposes computed gate profile when packet type is declared", () => {
  const packet = [
    "# Gate profile fixture",
    "",
    "## Quick Decision Header",
    "| Item | Proposed | Why | Status |",
    "|---|---|---|---|",
    "| Ready For Code | approved | fixture | approved |",
    "| Gate profile | standard | fixture | approved |",
    "| Risk if started now | normal | fixture | approved |",
    "| Packet type | product-bugfix | fixture | approved |",
    "| Risk level | high | fixture | approved |",
    "",
    "- Required reading before code: fixture",
    "- Verification manifest: fixture"
  ].join("\n");

  const computed = evaluatePacketGateProfile({
    content: packet,
    changedFiles: ["product/src/security.ts"]
  });

  assert.equal(computed.present, true);
  assert.equal(computed.packetType, "product-bugfix");
  assert.equal(computed.effectiveRisk, "high");
  assert(computed.requiredGates.includes("independent-review"));

  const rootOnlyPacket = "reference/packets/PKT-02_RISK_ADAPTIVE_GATE_PROFILE_ENGINE.md";
  if (fs.existsSync(rootOnlyPacket)) {
    const preflight = runPacketPreflightCommand({
      args: ["--packet", rootOnlyPacket, "--stage", "planning-open"]
    });
    assert.equal(preflight.computedGateProfile.present, true);
    assert.equal(preflight.computedGateProfile.packetType, "harness-system");
    assert.equal(preflight.computedGateProfile.effectiveRisk, "high");
    assert(preflight.computedGateProfile.requiredGates.includes("harness-validation"));
    assert(preflight.computedGateProfile.requiredGates.includes("independent-review"));
  }
});
