import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CORE_TABLES,
  OptimisticConcurrencyError,
  SCHEMA_VERSION,
  ValidationError,
  createOperatingStateStore
} from "../runtime/state/operating-state-store.js";

test("bootstraps the core schema and exposes the expected tables", () => {
  const store = createOperatingStateStore({ dbPath: ":memory:" });

  assert.equal(store.getSchemaVersion(), SCHEMA_VERSION);
  assert.deepEqual(store.listCoreTables(), CORE_TABLES);

  store.close();
});

test("supports the mutable command surface with optimistic concurrency", () => {
  const store = createOperatingStateStore({
    dbPath: ":memory:",
    now: createClock("2026-04-17T12:00:00.000Z")
  });

  const releaseState = store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Freeze requirements",
    releaseGoal: "First ship baseline"
  });
  assert.equal(releaseState.version, 1);

  const updatedRelease = store.setReleaseState(
    {
      releaseId: "current",
      currentStage: "implementation",
      releaseGateState: "open",
      currentFocus: "Build DB foundation",
      releaseGoal: "First ship baseline"
    },
    { expectedVersion: 1 }
  );
  assert.equal(updatedRelease.version, 2);

  assert.throws(
    () =>
      store.setReleaseState(
        {
          releaseId: "current",
          currentStage: "stale",
          releaseGateState: "blocked",
          currentFocus: "Bad update",
          releaseGoal: "Bad update"
        },
        { expectedVersion: 1 }
      ),
    OptimisticConcurrencyError
  );

  const workItem = store.upsertWorkItem({
    workItemId: "DEV-01",
    title: "DB foundation",
    status: "ready",
    nextAction: "Implement schema"
  });
  assert.equal(workItem.version, 1);

  const transitioned = store.transitionWorkItem({
    workItemId: "DEV-01",
    status: "in_progress",
    nextAction: "Wire command surface"
  });
  assert.equal(transitioned.status, "in_progress");
  assert.equal(transitioned.version, 2);

  const decision = store.recordDecision({
    decisionId: "DEC-DB-ENGINE",
    title: "Choose DB engine",
    decisionNeeded: true,
    impactSummary: "Impacts runtime and local setup",
    noResponseBehavior: "Hold implementation"
  });
  assert.equal(decision.decisionNeeded, true);

  const risk = store.recordGateRisk({
    riskId: "RISK-MIGRATION",
    title: "Migration shape not fixed",
    severity: "medium",
    unblockCondition: "Agree on initial store contract"
  });
  assert.equal(risk.severity, "medium");

  const handoff = store.appendHandoff({
    handoffId: "handoff-001",
    handoffSummary: "DB foundation packet prepared",
    fromRole: "planner",
    toRole: "implementer"
  });
  assert.equal(handoff.handoffId, "handoff-001");

  const artifact = store.upsertArtifact({
    artifactId: "requirements",
    path: "REQUIREMENTS.md",
    category: "canonical_doc",
    title: "Requirements"
  });
  assert.equal(artifact.path, "REQUIREMENTS.md");

  const projection = store.refreshProjection({
    projectionName: "CURRENT_STATE.md",
    checksum: "abc123",
    sourceRevision: "release_state@2"
  });
  assert.equal(projection.checksum, "abc123");
  assert.equal(projection.freshnessState, "fresh");

  store.close();
});

test("orders recent handoffs by actual timestamp across timezone offsets", () => {
  const store = createOperatingStateStore({ dbPath: ":memory:" });

  store.appendHandoff({
    handoffId: "handoff-local-offset",
    handoffSummary: "Earlier handoff written with a local offset timestamp",
    fromRole: "developer",
    toRole: "developer",
    createdAt: "2026-05-03T00:01:03.3222041+09:00"
  });
  store.appendHandoff({
    handoffId: "handoff-utc-latest",
    handoffSummary: "Later handoff written with a UTC timestamp",
    fromRole: "tester",
    toRole: "developer",
    createdAt: "2026-05-02T15:29:54.731Z"
  });

  const recentHandoffs = store.listRecentHandoffs(2);

  assert.equal(recentHandoffs[0].handoffId, "handoff-utc-latest");
  assert.equal(recentHandoffs[1].handoffId, "handoff-local-offset");
  assert.equal(store.getLatestOperationalTimestamp(), "2026-05-02T15:29:54.731Z");
  assert.equal(store.getLatestMutationTimestamp(), "2026-05-02T15:29:54.731Z");

  store.close();
});

test("creates a repo-local sqlite file and rejects invalid repo-relative paths", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-store-"));
  const dbPath = path.join(tempDir, ".harness", "operating_state.sqlite");
  const store = createOperatingStateStore({
    dbPath,
    now: createClock("2026-04-17T13:00:00.000Z")
  });

  assert.equal(fs.existsSync(dbPath), true);

  assert.throws(
    () =>
      store.upsertArtifact({
        artifactId: "bad-artifact",
        path: "C:/absolute/file.txt",
        category: "canonical_doc",
        title: "Bad artifact"
      }),
    ValidationError
  );

  store.close();
});

function createClock(startIso) {
  let offset = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + offset++ * 1000).toISOString();
}

test("records v2.4 risk-adaptive evidence tables", () => {
  const store = createOperatingStateStore({
    dbPath: ":memory:",
    now: createClock("2026-06-08T00:00:00.000Z")
  });

  const abstention = store.recordAbstentionDecision({
    decisionId: "ABS-01",
    workItemId: "PKT-01",
    issueStatus: "not-reproducible",
    codeChangeRequired: false,
    evidencePath: "reference/reports/abstention/ABS-01.json",
    decision: "abstain"
  });
  assert.equal(abstention.decision, "abstain");

  const contextEvent = store.recordContextUsageEvent({
    eventId: "CTX-01",
    workItemId: "PKT-01",
    lane: "standard",
    phase: "implementation",
    filePath: ".agents/runtime/DOC_ROUTE.json",
    estimatedTokens: 120,
    readReason: "route-selected",
    reusedFromCache: true
  });
  assert.equal(contextEvent.reused_from_cache, 1);

  const dependency = store.recordDependencyIntake({
    intakeId: "DEP-01",
    workItemId: "PKT-01",
    packageName: "leftpad",
    ecosystem: "npm",
    registryVerified: true,
    installScriptRisk: "absent",
    decision: "allow"
  });
  assert.equal(dependency.registry_verified, 1);

  const evidenceQuality = store.recordEvidenceQualityReport({
    reportId: "EVQ-01",
    workItemId: "PKT-01",
    packetId: "PKT-01",
    mode: "behavior",
    decision: "allow",
    evidence: { redObserved: true }
  });
  assert.equal(evidenceQuality.decision, "allow");

  const secretScan = store.recordSecretScanReport({
    reportId: "SEC-01",
    workItemId: "PKT-01",
    severity: "high",
    status: "block",
    findings: [{ kind: "token" }]
  });
  assert.equal(secretScan.status, "block");

  const untrusted = store.recordUntrustedContentReport({
    reportId: "UTC-01",
    workItemId: "PKT-01",
    trustLabel: "untrusted-external",
    status: "digest-only",
    findings: [{ pattern: "ignore previous instructions" }]
  });
  assert.equal(untrusted.trust_label, "untrusted-external");

  store.close();
});
