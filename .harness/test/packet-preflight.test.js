import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runPacketPreflightCommand } from "../runtime/state/packet-preflight.js";
import { runTransition } from "../runtime/state/dev05-tooling.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { seedStandardRepo } from "./dev05-test-helpers.js";

function createRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "packet-preflight-"));
  seedStandardRepo(repoRoot);
  writeOwnershipMap(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const store = createOperatingStateStore({ dbPath });
  store.setReleaseState({
    releaseId: "current",
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Packet preflight test",
    releaseGoal: "Exercise packet preflight",
    sourceRef: ".agents/artifacts/TASK_LIST.md"
  });
  store.close();
  return { repoRoot, dbPath };
}

function writeOwnershipMap(repoRoot) {
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

function withStore(dbPath, callback) {
  const store = createOperatingStateStore({ dbPath });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

function writePacket(repoRoot, packetPath, overrides = {}) {
  const readyForCode = overrides.readyForCode ?? "hold";
  const riskIfStarted = overrides.riskIfStarted ?? "high";
  const gateProfile = overrides.gateProfile ?? "contract";
  const extraScope = overrides.extraScope ?? "- security-sensitive runtime behavior must stay visible.";
  const changeZone = overrides.changeZone ?? "core";
  const routeClass = overrides.routeClass ?? "packet-path";
  const riskClass = overrides.riskClass ?? "normal";
  const closeout = overrides.closeout ?? "";
  const defaultChallengeReview = [
    "## Planner Packet Challenge Review",
    "- Challenge reviewer: independent planning reviewer",
    "- Challenge reviewer independence basis: reviewer is a separate planning reviewer, not the packet author.",
    "- Source refs reviewed: active packet, parent objective, and approved source references.",
    "- Challenge status: pass",
    "- Parent objective coverage: closes the packet-preflight transition guard objective.",
    "- Deferred scope with named follow-up: none",
    "- Acceptance proves behavior change: implementation-transition preflight blocks the missing evidence fixture.",
    "- Failure fixture or failure condition: missing challenge review must block required packets.",
    "- Reviewer closeout hold basis: hold if challenge diagnostics or required fields are absent.",
    "- First-wave limit check: field-level deterministic guard is intentional and not objective avoidance.",
    "- Guidance-only sufficiency rationale: runtime enforcement exists at implementation-transition.",
    "- Challenge evidence artifact path: packet-local challenge ledger.",
    "- Findings disposition: no findings remain.",
    "- Required corrections applied: not-needed because no findings remain.",
    "- No self-approval claim: independent reviewer confirms no self-approval."
  ].join("\n");
  const challengeReview = Object.hasOwn(overrides, "challengeReview")
    ? overrides.challengeReview
    : defaultChallengeReview;
  const defaultModelingImpact = [
    "## Modeling Impact",
    "- Modeling impact status: required",
    "- Critical User Journey: operator approves a packet and preflight protects implementation transition.",
    "- API contract: packet-preflight diagnostic contract only.",
    "- Component responsibility: packet-preflight owns stage-aware modeling checks.",
    "- Allowed dependency direction: runtime helper reads packet markdown and ownership classification only.",
    "- Data ownership: packet-local markdown owns modeling evidence.",
    "- Public contract vs internal/scratch field: Modeling Impact fields are public packet contract.",
    "- Promoted modeling artifact: not-needed",
    "- Not-needed rationale: not-needed because packet-local fields are present.",
    "- Changed-file / classification evidence: test fixture core route"
  ].join("\n");
  const modelingImpact = Object.hasOwn(overrides, "modelingImpact")
    ? overrides.modelingImpact
    : defaultModelingImpact;
  const content = [
    "# PKT-01 OPS-E2E-03 Packet Preflight Test",
    "",
    "## Quick Decision Header",
    "| Item | Proposed | Why | Status |",
    "|---|---|---|---|",
    "| Work item | OPS-E2E-03 Packet preflight | Test packet | approved |",
    `| Ready For Code | ${readyForCode} | RFC gate under test | ${readyForCode === "approved" ? "approved" : "draft"} |`,
    "| Human sync needed | no | Test fixture | approved |",
    `| Gate profile | ${gateProfile} | Contract tooling change | approved |`,
    "| User-facing impact | none | CLI UX not under test | not-needed |",
    "| Layer classification | core | Runtime helper | approved |",
    "| Active profile dependencies | none | Test fixture | not-needed |",
    "| Profile evidence status | not-needed | Test fixture | not-needed |",
    "| UX archetype status | not-needed | Test fixture | not-needed |",
    "| UX deviation status | none | Test fixture | not-needed |",
    "| Environment topology status | not-needed | Test fixture | not-needed |",
    "| Domain foundation status | not-needed | Test fixture | not-needed |",
    "| Authoritative source intake status | not-needed | Test fixture | not-needed |",
    "| Shared-source wave status | not-needed | Test fixture | not-needed |",
    "| Packet exit gate status | pending | Closeout pending | draft |",
    "| Existing system dependency | none | Test fixture | not-needed |",
    "| New authoritative source impact | none | Test fixture | not-needed |",
    `| Risk if started now | ${riskIfStarted} | Risk preview under test | approved |`,
    ...(overrides.includeRouteRows === false
      ? []
      : [
          "| Delivery route mode | orchestrated-closeout | One-turn route | approved |",
          `| Route class | ${routeClass} | Packet-owned workflow | approved |`,
          `| Change zone | ${changeZone} | Change-zone routing fixture | approved |`
        ]),
    "",
    "## 3. Proposed Scope",
    `- Risk class: ${riskClass}`,
    `- Change zone: ${changeZone}`,
    "- Gate profile: contract",
    "- Layer classification: core",
    "- Required reading before code: this packet",
    "- Verification manifest: contract evidence declared",
    extraScope,
    "",
    ...(modelingImpact ? [modelingImpact, ""] : []),
    "## Verification Manifest",
    `- Ready For Code: ${readyForCode}`,
    "- root: run root targeted and full tests",
    "- standard-template: run starter targeted and full tests",
    "- targeted: packet-preflight tests",
    "- validator: run harness validator",
    "- active context: regenerate ACTIVE_CONTEXT artifacts",
    "- review closeout: required before packet close",
    "",
    ...(challengeReview ? [challengeReview, ""] : []),
    closeout
  ].join("\n");
  fs.writeFileSync(path.join(repoRoot, packetPath), content, "utf8");
}

function registerWorkItem(dbPath, packetPath, metadata = {}) {
  withStore(dbPath, (store) => {
    store.upsertWorkItem({
      workItemId: "OPS-E2E-03",
      title: "Packet preflight UX",
      status: "planning",
      owner: "planner",
      nextAction: "Run packet preflight.",
      sourceRef: packetPath,
      metadata: {
        gateProfile: "contract",
        readyForCode: metadata.readyForCode ?? "hold",
        deliveryRouteMode: "orchestrated-closeout",
        routeClass: "packet-path"
      }
    });
  });
}

test("packet-preflight allows high-risk RFC hold during planning-open", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath);
  registerWorkItem(dbPath, packetPath);

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "planning-open"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.disposition, "planning-hold");
  assert.equal(result.risk.effective, "high");
  assert.match(result.risk.triggerReason, /high|security-sensitive/i);
  assert.equal(result.findings.some((finding) => finding.status === "hold"), true);
});

test("packet-preflight blocks high-risk RFC hold during implementation-transition", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath);
  registerWorkItem(dbPath, packetPath);

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "implementation-blocked");
  assert.match(result.errors.join("\n"), /Ready For Code approved/);
});

test("packet-preflight reports first implementation readiness for planner implementation transition", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal"
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.firstImplementationReadiness.status, "required");
  assert.equal(result.firstImplementationReadiness.triggerPresent, true);
  assert.equal(
    result.firstImplementationReadiness.readinessChecks.some((check) => check.item === "Ready For Code" && check.value === "approved"),
    true
  );
  assert.match(result.firstImplementationReadiness.refreshBeforeBroadReread, /sync-state|repair/);
  assert.equal(
    result.checks.some((check) => check.field === "First implementation readiness" && check.current === "required"),
    true
  );
});

test("packet-preflight suppresses first implementation readiness after implementation handoff exists", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal"
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });
  withStore(dbPath, (store) => {
    const item = store.getWorkItem("OPS-E2E-03");
    store.upsertWorkItem({
      ...item,
      owner: "developer",
      status: "in_progress"
    });
  });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.firstImplementationReadiness.status, "not-needed");
  assert.equal(result.firstImplementationReadiness.triggerPresent, false);
  assert.equal(
    result.firstImplementationReadiness.noRepeatReasons.some((reason) => /developer/.test(reason)),
    true
  );
});

test("packet-preflight blocks core implementation-transition when modeling impact is missing", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    modelingImpact: null
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "implementation-blocked");
  assert.equal(result.modelingImpact.required, true);
  assert.equal(result.findings.some((finding) => finding.field === "Modeling Impact"), true);
  assert.match(result.errors.join("\n"), /Modeling Impact/);
});

test("packet-preflight allows padded implementation-transition without modeling impact", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    riskClass: "low",
    gateProfile: "light",
    changeZone: "padded",
    routeClass: "fast-path",
    extraScope: "- isolated UI copy change.",
    modelingImpact: null
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      "src/components/ReportForm.tsx"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelingImpact.required, false);
  assert.equal(result.modelingImpact.status, "absent");
});

test("packet-preflight accepts promoted modeling artifact when it exists", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "reference", "artifacts", "MODELING_TEST.md"), "# Modeling\n", "utf8");
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    modelingImpact: [
      "## Modeling Impact",
      "- Modeling impact status: promoted",
      "- Critical User Journey: not-needed",
      "- API contract: not-needed",
      "- Component responsibility: not-needed",
      "- Allowed dependency direction: not-needed",
      "- Data ownership: not-needed",
      "- Public contract vs internal/scratch field: not-needed",
      "- Promoted modeling artifact: reference/artifacts/MODELING_TEST.md",
      "- Not-needed rationale: not-needed because promoted artifact is authoritative.",
      "- Changed-file / classification evidence: test fixture core route"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelingImpact.status, "promoted");
  assert.equal(result.modelingImpact.promotedArtifact, "reference/artifacts/MODELING_TEST.md");
});

test("packet-preflight planning-open reports missing challenge review without blocking packet opening", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, { challengeReview: null });
  registerWorkItem(dbPath, packetPath);

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "planning-open"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.plannerPacketChallenge.required, true);
  assert.equal(result.plannerPacketChallenge.ok, false);
  assert.equal(result.findings.some((finding) => finding.field === "Planner Packet Challenge Review" && finding.status === "hold"), true);
});

test("packet-preflight blocks required implementation-transition when challenge review is missing", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "high",
    challengeReview: null
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "implementation-blocked");
  assert.equal(result.plannerPacketChallenge.required, true);
  assert.match(result.errors.join("\n"), /Planner Packet Challenge Review/);
});

test("packet-preflight blocks required implementation-transition when challenge status is not pass", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "high",
    challengeReview: [
      "## Planner Packet Challenge Review",
      "- Challenge reviewer: independent planning reviewer",
      "- Challenge reviewer independence basis: pending",
      "- Source refs reviewed: pending",
      "- Challenge status: pending",
      "- Parent objective coverage: pending",
      "- Deferred scope with named follow-up: pending",
      "- Acceptance proves behavior change: pending",
      "- Failure fixture or failure condition: pending",
      "- Reviewer closeout hold basis: pending",
      "- First-wave limit check: pending",
      "- Guidance-only sufficiency rationale: pending",
      "- Challenge evidence artifact path: pending",
      "- Findings disposition: pending",
      "- Required corrections applied: pending",
      "- No self-approval claim: pending"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.plannerPacketChallenge.status, "pending");
  assert.match(result.errors.join("\n"), /Challenge status/);
  assert.match(result.errors.join("\n"), /pass or approved explicit exemption/);
});

test("packet-preflight blocks challenge pass with deferred scope missing named follow-up", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "high",
    challengeReview: [
      "## Planner Packet Challenge Review",
      "- Challenge reviewer: independent planning reviewer",
      "- Challenge reviewer independence basis: reviewer is separate from the packet author.",
      "- Source refs reviewed: active packet and parent objective.",
      "- Challenge status: pass",
      "- Parent objective coverage: closes packet transition guard.",
      "- Deferred scope with named follow-up: deferred semantic review later.",
      "- Acceptance proves behavior change: implementation-transition blocks the negative fixture.",
      "- Failure fixture or failure condition: missing review blocks.",
      "- Reviewer closeout hold basis: hold if unresolved challenge findings remain.",
      "- First-wave limit check: not objective avoidance.",
      "- Guidance-only sufficiency rationale: runtime guard included.",
      "- Challenge evidence artifact path: packet-local challenge ledger.",
      "- Findings disposition: no findings remain.",
      "- Required corrections applied: applied.",
      "- No self-approval claim: independent reviewer, not self."
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /deferred scope must name a follow-up/i);
});

test("packet-preflight blocks challenge pass with marker-only acceptance evidence", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "high",
    challengeReview: [
      "## Planner Packet Challenge Review",
      "- Challenge reviewer: independent planning reviewer",
      "- Challenge reviewer independence basis: reviewer is separate from the packet author.",
      "- Source refs reviewed: active packet and parent objective.",
      "- Challenge status: pass",
      "- Parent objective coverage: closes packet transition guard.",
      "- Deferred scope with named follow-up: none",
      "- Acceptance proves behavior change: document exists only.",
      "- Failure fixture or failure condition: missing review blocks.",
      "- Reviewer closeout hold basis: hold if unresolved challenge findings remain.",
      "- First-wave limit check: not objective avoidance.",
      "- Guidance-only sufficiency rationale: runtime guard included.",
      "- Challenge evidence artifact path: packet-local challenge ledger.",
      "- Findings disposition: no findings remain.",
      "- Required corrections applied: applied.",
      "- No self-approval claim: independent reviewer, not self."
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /marker-only artifact\/document existence/i);
});

test("packet-preflight blocks low-risk padded fast-path when challenge review is absent", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    riskClass: "low",
    gateProfile: "light",
    changeZone: "padded",
    routeClass: "fast-path",
    extraScope: "- isolated padded copy change.",
    modelingImpact: null,
    challengeReview: null
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      "src/components/ReportForm.tsx"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "implementation-blocked");
  assert.equal(result.plannerPacketChallenge.required, true);
  assert.match(result.errors.join("\n"), /Planner Packet Challenge Review/);
});

test("packet-preflight allows low-risk padded fast-path with explicit challenge exemption record", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    riskClass: "low",
    gateProfile: "light",
    changeZone: "padded",
    routeClass: "fast-path",
    extraScope: "- isolated padded copy change.",
    modelingImpact: null,
    challengeReview: [
      "## Planner Packet Challenge Review",
      "- Challenge reviewer: low-risk exemption reviewer",
      "- Challenge reviewer independence basis: reviewer is separate from the packet author.",
      "- Source refs reviewed: packet header and fast-path scope.",
      "- Challenge status: exempt",
      "- Parent objective coverage: isolated low-risk copy change only.",
      "- Deferred scope with named follow-up: none",
      "- Acceptance proves behavior change: explicit exemption record is required before transition.",
      "- Failure fixture or failure condition: absent challenge review blocks even low-risk fast-path.",
      "- Reviewer closeout hold basis: hold if exemption evidence is missing.",
      "- First-wave limit check: exemption is limited to padded fast-path scope.",
      "- Guidance-only sufficiency rationale: packet-preflight enforces explicit exemption evidence.",
      "- Challenge evidence artifact path: packet-local challenge exemption ledger.",
      "- Findings disposition: no findings remain.",
      "- Required corrections applied: not-needed because exemption has no findings.",
      "- No self-approval claim: independent reviewer, not self."
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      "src/components/ReportForm.tsx"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.plannerPacketChallenge.required, true);
  assert.equal(result.plannerPacketChallenge.status, "exempt");
});

test("packet-preflight blocks not-needed modeling impact when changed files classify load-bearing", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    gateProfile: "standard",
    changeZone: "padded",
    routeClass: "fast-path",
    modelingImpact: [
      "## Modeling Impact",
      "- Modeling impact status: not-needed",
      "- Not-needed rationale: isolated UI work only"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      ".harness/runtime/state/packet-preflight.js"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "implementation-blocked");
  assert.equal(result.modelingImpact.required, true);
  assert.equal(result.findings.some((finding) => finding.field === "Modeling impact status"), true);
});

test("planner-to-orchestrator still blocks when Ready For Code is unapproved", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath);
  registerWorkItem(dbPath, packetPath);

  const result = runTransition({
    repoRoot,
    dbPath,
    args: ["--transition", "planner-to-orchestrator", "--work-item", "OPS-E2E-03"]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Ready For Code approved/);
});

test("packet-preflight reports closeout enum mismatches with field current expected and narrative destination", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: "- validator behavior exact enum UX.",
    closeout: [
      "## 15. Packet Exit Quality Gate",
      "- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Exit recommendation: approved",
      "- Source parity result: aligned with root/starter parity.",
      "- Validation / security / cleanup evidence: pass",
      "- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Packet exit metadata exit recommendation: approved",
      "- Packet exit metadata source parity result: pass",
      "- Packet exit metadata validation / security / cleanup evidence: pass"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "closeout"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.disposition, "closeout-blocked");
  assert.equal(result.enumDiagnostics[0].field, "Source parity result");
  assert.equal(result.enumDiagnostics[0].current, "aligned with root/starter parity.");
  assert.deepEqual(result.enumDiagnostics[0].expected, ["pass", "fail", "pending", "not-needed"]);
  assert.equal(result.enumDiagnostics[0].narrativeDestination, "Closeout notes or REVIEW_REPORT.md");
  assert.equal(
    result.authoringGuide.strictLiteralEnums.some(
      (entry) => entry.field === "Source parity result" && entry.activeDiagnostic === true
    ),
    true
  );
  assert.equal(result.authoringGuide.closeoutMetadataExample.reference, "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md");
});

test("packet-preflight reports missing authoring rows with field names", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, { includeRouteRows: false });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--packet", packetPath, "--stage", "planning-open"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.findings.some((finding) => finding.field === "Delivery route mode" && finding.current === "missing"), true);
  assert.equal(result.findings.some((finding) => finding.field === "Route class" && finding.current === "missing"), true);
});

test("packet-preflight blocks padded change zone on core ownership paths", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    changeZone: "padded"
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      ".harness/runtime/state/packet-preflight.js"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.changeZoneClassification.ok, false);
  assert.equal(result.changeZoneClassification.diagnostics[0].status, "block");
  assert.equal(result.changeZoneClassification.diagnostics[0].expected, "core");
  assert.match(result.errors.join("\n"), /declares Change zone padded/);
});

test("packet-preflight allows padded change zone on padded ownership paths", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    gateProfile: "standard",
    changeZone: "padded",
    routeClass: "fast-path"
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: [
      "--work-item",
      "OPS-E2E-03",
      "--stage",
      "implementation-transition",
      "--changed-files",
      "src/components/ReportForm.tsx"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.changeZoneClassification.diagnostics[0].status, "pass");
  assert.equal(result.routeClass, "fast-path");
});

test("packet-preflight blocks registration semantic contract errors before planner packet open", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: [
      "- Layer classification: core",
      "- Schema impact classification: none; explanatory text belongs in a note field.",
      "- Domain foundation reference: conditional"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "planning-open"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.semanticDiagnostics.some((diagnostic) => diagnostic.code === "task_packet_exact_enum_value_invalid"), true);
  assert.match(result.authoringGuide.exactFieldRule, /punctuation and spaces/);
  assert.equal(
    result.authoringGuide.strictLiteralEnums.some(
      (entry) =>
        entry.field === "Schema impact classification" &&
        entry.expected.includes("conditional") &&
        entry.noteField === "Schema impact note" &&
        entry.activeDiagnostic === true
    ),
    true
  );
  assert.equal(result.authoringGuide.verificationManifest.heading, "## Verification Manifest");
  assert.match(result.authoringGuide.verificationManifest.minimalExample.join("\n"), /standard-template/);
  assert.match(result.errors.join("\n"), /Schema impact classification/);
  assert.match(result.errors.join("\n"), /Schema impact note/);
});

test("packet-preflight blocks domain impact with Domain context none during implementation-transition", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: [
      "- Schema impact classification: high",
      "- Domain context: none",
      "- System context: not-needed",
      "- Architecture: not-needed"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.semanticDiagnostics.some((diagnostic) => diagnostic.code === "context_impact_domain_context_missing"),
    true
  );
  assert.match(result.errors.join("\n"), /Domain context/);
  assert.match(result.errors.join("\n"), /correction route: Planner/);
});

test("packet-preflight blocks system impact with stale System context during implementation-transition", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: [
      "- System boundary impact: reusable runtime helper",
      "- Domain context: not-needed",
      "- System context: stale",
      "- Architecture: not-needed"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.semanticDiagnostics.some((diagnostic) => diagnostic.code === "context_impact_status_blocks_transition"),
    true
  );
  assert.match(result.errors.join("\n"), /System context/);
});

test("packet-preflight blocks docs parity pending only at closeout for declared docs impact", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: [
      "- Domain context: not-needed",
      "- System context: not-needed",
      "- Architecture: not-needed",
      "- API/interface doc impact: update-required",
      "- Docs parity status: pending"
    ].join("\n"),
    closeout: [
      "## 15. Packet Exit Quality Gate",
      "- Packet exit metadata version: v1",
      "- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Packet exit metadata exit recommendation: approved",
      "- Packet exit metadata source parity result: pass",
      "- Packet exit metadata validation / security / cleanup evidence: pass",
      "- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Exit recommendation: approved",
      "- Source parity result: pass",
      "- Validation / security / cleanup evidence: pass"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const implementation = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });
  assert.equal(implementation.ok, true);

  const closeout = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "closeout"]
  });
  assert.equal(closeout.ok, false);
  assert.equal(
    closeout.semanticDiagnostics.some((diagnostic) => diagnostic.code === "development_docs_parity_blocks_closeout"),
    true
  );
  assert.match(closeout.errors.join("\n"), /Docs parity status/);
});

test("packet-preflight allows consistent none context and docs impact", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "low",
    riskClass: "low",
    extraScope: [
      "- Schema impact classification: none",
      "- Existing system dependency: none",
      "- Domain context: none",
      "- System boundary impact: none",
      "- Shared module / hotspot impact: none",
      "- System context: none",
      "- Architecture: none",
      "- Documentation impact: none",
      "- Docs parity status: not-needed"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, true);
  assert.equal(
    result.semanticDiagnostics.some((diagnostic) => diagnostic.code.startsWith("context_impact_")),
    false
  );
  assert.equal(
    result.semanticDiagnostics.some((diagnostic) => diagnostic.code === "development_docs_parity_blocks_closeout"),
    false
  );
});

test("packet-preflight blocks optional developer doc template without docs impact activation", () => {
  const { repoRoot, dbPath } = createRepo();
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writePacket(repoRoot, packetPath, {
    readyForCode: "approved",
    riskIfStarted: "normal",
    extraScope: [
      "- Domain context: not-needed",
      "- System context: not-needed",
      "- Architecture: not-needed",
      "- Documentation impact: none",
      "- Required doc paths: reference/artifacts/DEVELOPMENT_GUIDE.md",
      "- Docs parity status: not-needed"
    ].join("\n")
  });
  registerWorkItem(dbPath, packetPath, { readyForCode: "approved" });

  const result = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.semanticDiagnostics.some((diagnostic) => diagnostic.code === "optional_developer_doc_template_requires_activation"),
    true
  );
  assert.match(result.errors.join("\n"), /packet-activated/);
});
