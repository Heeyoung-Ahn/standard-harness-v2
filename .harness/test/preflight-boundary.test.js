import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  blockedNextActionForStage,
  decideStage,
  normalizeStage,
  resolveFinalDisposition
} from "../runtime/state/preflight/stage-decision.js";
import { classifyRisk, emptyRisk } from "../runtime/state/preflight/risk.js";
import {
  CLOSEOUT_REFERENCE,
  NARRATIVE_DESTINATION,
  inspectCloseoutEnums
} from "../runtime/state/preflight/closeout-contract.js";
import {
  applyRequestedSecurityReviewGate,
  buildBootstrapPendingValidationReport
} from "../runtime/state/preflight/validation-report-contract.js";
import { runPacketPreflightCommand } from "../runtime/state/packet-preflight.js";
import { writeValidationReport } from "../runtime/state/validation-report.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { seedStandardRepo, seedStarterRepo, writeOpsPacket, writeStateSurfaces } from "./dev05-test-helpers.js";
import { assertNoUnexpectedStderr } from "./cli-stderr-helpers.js";

test("preflight boundary modules preserve stage and risk decisions", () => {
  assert.equal(normalizeStage("implementation-transition"), "implementation-transition");
  assert.equal(normalizeStage("unknown"), null);

  const planning = decideStage({
    stage: "planning-open",
    readyForCode: "hold",
    effectiveRisk: "high",
    enumDiagnostics: []
  });
  assert.equal(planning.disposition, "planning-hold");
  assert.equal(planning.blocking, false);

  const implementation = decideStage({
    stage: "implementation-transition",
    readyForCode: "hold",
    effectiveRisk: "high",
    enumDiagnostics: []
  });
  assert.equal(implementation.disposition, "implementation-blocked");
  assert.equal(implementation.blocking, true);
  assert.match(implementation.errors.join("\n"), /Ready For Code approved/);
  assert.equal(resolveFinalDisposition({ stage: "implementation-transition", errors: implementation.errors, stageDecision: implementation }), "implementation-blocked");
  assert.match(blockedNextActionForStage("implementation-transition", implementation), /Resolve blocking implementation-transition diagnostics/);

  const risk = classifyRisk(
    { header: { "Risk if started now": "high" }, fields: {} },
    "- security-sensitive runtime behavior"
  );
  assert.equal(risk.declared, "high");
  assert.equal(risk.effective, "high");
  assert.equal(emptyRisk().triggerReason, "packet unavailable");
});

test("preflight closeout module preserves enum diagnostics contract", () => {
  const packet = {
    closeout: {
      "Packet exit quality gate reference": CLOSEOUT_REFERENCE,
      "Exit recommendation": "approved",
      "Source parity result": "aligned with parity notes",
      "Validation / security / cleanup evidence": "pass",
      "Packet exit metadata gate reference": CLOSEOUT_REFERENCE,
      "Packet exit metadata exit recommendation": "approved",
      "Packet exit metadata source parity result": "pass",
      "Packet exit metadata validation / security / cleanup evidence": "pass"
    }
  };

  const diagnostics = inspectCloseoutEnums(packet);

  assert.equal(diagnostics[0].field, "Source parity result");
  assert.equal(diagnostics[0].current, "aligned with parity notes");
  assert.deepEqual(diagnostics[0].expected, ["pass", "fail", "pending", "not-needed"]);
  assert.equal(diagnostics[0].narrativeDestination, NARRATIVE_DESTINATION);
});

test("validation-report contract module preserves bootstrap and requested-security gate semantics", () => {
  const executedAt = "2026-06-12T00:00:00.000Z";
  const bootstrap = buildBootstrapPendingValidationReport({
    executedAt,
    validatorVersion: "test-validator",
    validation: {
      findings: [{ code: "starter_bootstrap_pending", severity: "error", message: "bootstrap required" }],
      riskClassifications: [{ path: "starter", risk: "bootstrap" }]
    },
    candidateGates: [{ id: "required-evidence-present" }]
  });

  assert.equal(bootstrap.ok, false);
  assert.equal(bootstrap.command, "validation-report");
  assert.equal(bootstrap.validatorVersion, "test-validator");
  assert.equal(bootstrap.executedAt, executedAt);
  assert.equal(bootstrap.gateDecision, "hold");
  assert.equal(bootstrap.traceSummary, null);
  assert.equal(bootstrap.writeMode, "read-only-bootstrap-pending");
  assert.equal(bootstrap.findings[0].code, "starter_bootstrap_pending");

  const report = {
    ok: true,
    cutoverReady: true,
    gateDecision: "pass",
    findings: [{ code: "validator_pass", severity: "info", message: "pass" }]
  };
  applyRequestedSecurityReviewGate({
    report,
    securityReview: {
      summary: { contractStatus: "requested" },
      additionalFindings: [{ code: "security_review_blocking", severity: "error", message: "review blocks" }]
    }
  });
  assert.equal(report.ok, false);
  assert.equal(report.cutoverReady, false);
  assert.equal(report.gateDecision, "hold");
  assert.equal(report.findings.some((finding) => finding.code === "security_review_blocking"), true);
});

test("packet-preflight public result keeps named boundary fields across stages", () => {
  const { repoRoot, dbPath, packetPath } = createPreflightRepo();

  const planning = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "planning-open"]
  });
  assertPacketPreflightShape(planning);
  assert.equal(planning.stage, "planning-open");
  assert.equal(planning.disposition, "planning-hold");
  assert.equal(planning.ok, true);

  const implementation = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "implementation-transition"]
  });
  assertPacketPreflightShape(implementation);
  assert.equal(implementation.stage, "implementation-transition");
  assert.equal(implementation.disposition, "implementation-blocked");
  assert.equal(implementation.ok, false);
  assert.match(implementation.errors.join("\n"), /Ready For Code approved/);

  fs.appendFileSync(
    path.join(repoRoot, packetPath),
    [
      "",
      "## 15. Packet Exit Quality Gate",
      "- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Exit recommendation: approved",
      "- Source parity result: pass",
      "- Validation / security / cleanup evidence: pass",
      "- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Packet exit metadata exit recommendation: approved",
      "- Packet exit metadata source parity result: pass",
      "- Packet exit metadata validation / security / cleanup evidence: pass"
    ].join("\n"),
    "utf8"
  );
  const closeout = runPacketPreflightCommand({
    repoRoot,
    dbPath,
    args: ["--work-item", "OPS-E2E-03", "--stage", "closeout"]
  });
  assertPacketPreflightShape(closeout);
  assert.equal(closeout.stage, "closeout");
  assert.match(closeout.disposition, /^closeout-/);
});

test("validation-report bootstrap pending remains read-only and writes no artifacts", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-report-bootstrap-"));
  seedStarterRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const before = listRuntimeArtifacts(repoRoot);

  const result = writeValidationReport({ repoRoot, outputDir: repoRoot, dbPath });

  assert.equal(result.ok, false);
  assert.equal(result.markdownPath, null);
  assert.equal(result.jsonPath, null);
  assert.equal(result.report.gateDecision, "hold");
  assert.equal(result.report.writeMode, "read-only-bootstrap-pending");
  assert.equal(result.report.traceSummary, null);
  assert.equal(result.report.findings[0].code, "starter_bootstrap_pending");
  assert.deepEqual(listRuntimeArtifacts(repoRoot), before);
});

test("validation-report convergence keeps returned JSON markdown context and trace decisions aligned", () => {
  const { repoRoot, dbPath } = createValidationRepo();

  const result = writeValidationReport({ repoRoot, outputDir: repoRoot, dbPath });
  const persisted = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"));
  const markdown = fs.readFileSync(result.markdownPath, "utf8");
  const activeContext = JSON.parse(fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8"));
  const trace = JSON.parse(fs.readFileSync(path.join(repoRoot, result.report.traceSummary.path), "utf8"));

  assert.equal(result.report.gateDecision, persisted.gateDecision);
  assert.equal(activeContext.validation.gateDecision, result.report.gateDecision);
  assert.equal(trace.semanticTrace.validatorGateDecision, result.report.gateDecision);
  assert.equal(result.report.traceSummary.workItemId, "OPS-E2E-03");
  assert.equal(Array.isArray(result.report.candidateGates), true);
  assert.equal(result.report.candidateGates.length > 0, true);
  assert.match(markdown, /## Semantic Trace/);
  assert.match(markdown, /## Candidate Gates/);
  assert.match(markdown, /## V2\.5 Risk-Adaptive Gate Summary/);
});

test("packet-preflight and validation-report CLI contracts keep headings and trailing JSON", () => {
  const cliRoot = fs.mkdtempSync(path.join(os.tmpdir(), "preflight-cli-contract-"));
  seedStarterRepo(cliRoot);

  const preflight = runHarnessCli(["packet-preflight", "--stage", "planning-open"], cliRoot);
  assert.equal(preflight.status, 1);
  assert.match(preflight.stdout, /Packet Preflight/);
  assert.equal(preflight.json.command, "packet-preflight");
  assert.equal(typeof preflight.json.ok, "boolean");
  assert.equal(Array.isArray(preflight.json.errors), true);

  const report = runHarnessCli(["validation-report"], cliRoot);
  assert.equal(report.status, 1);
  assert.match(report.stdout, /Harness Validation Report/);
  assert.equal(report.json.command, "validation-report");
  assert.equal(report.json.report.gateDecision, "hold");
  assert.equal(report.json.report.writeMode, "read-only-bootstrap-pending");
  assert.equal(fs.existsSync(path.join(cliRoot, ".agents", "artifacts", "VALIDATION_REPORT.md")), false);
  assert.equal(fs.existsSync(path.join(cliRoot, ".agents", "artifacts", "VALIDATION_REPORT.json")), false);
});

function createPreflightRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "preflight-boundary-"));
  seedStandardRepo(repoRoot);
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
        }
      ]
    }, null, 2),
    "utf8"
  );
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "hold",
    riskIfStarted: "high"
  });
  withStore(dbPath, (store) => {
    store.setReleaseState({
      releaseId: "current",
      currentStage: "planning",
      releaseGateState: "open",
      currentFocus: "Preflight boundary test",
      releaseGoal: "Exercise SH-016 boundary",
      sourceRef: ".agents/artifacts/TASK_LIST.md"
    });
    store.upsertWorkItem({
      workItemId: "OPS-E2E-03",
      title: "Preflight boundary test",
      status: "planning",
      owner: "planner",
      nextAction: "Run packet preflight.",
      sourceRef: packetPath,
      metadata: {
        readyForCode: "hold",
        gateProfile: "contract",
        deliveryRouteMode: "orchestrated-closeout",
        routeClass: "packet-path"
      }
    });
  });
  return { repoRoot, dbPath, packetPath };
}

function createValidationRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "validation-report-boundary-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_OPS-E2E-03_TEST.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    riskIfStarted: "low"
  });
  withStore(dbPath, (store) => {
    store.setReleaseState({
      releaseId: "current",
      currentStage: "implementation",
      releaseGateState: "open",
      currentFocus: "Validation report boundary test",
      releaseGoal: "Exercise validation report convergence",
      sourceRef: ".agents/artifacts/TASK_LIST.md"
    });
    store.upsertWorkItem({
      workItemId: "OPS-E2E-03",
      title: "Validation report boundary test",
      status: "in_progress",
      owner: "developer",
      nextAction: "Run validation report.",
      sourceRef: packetPath,
      metadata: {
        readyForCode: "approved",
        gateProfile: "contract",
        deliveryRouteMode: "orchestrated-closeout",
        routeClass: "packet-path"
      }
    });
    writeStateSurfaces({ store, repoRoot });
  });
  return { repoRoot, dbPath };
}

function assertPacketPreflightShape(result) {
  for (const key of [
    "ok",
    "command",
    "stage",
    "disposition",
    "nextAction",
    "errors",
    "checks",
    "findings",
    "readyForCode",
    "gateProfile",
    "routeClass",
    "changeZone",
    "semanticDiagnostics",
    "enumDiagnostics",
    "riskAdaptive",
    "evidenceManifest",
    "browserEvidence"
  ]) {
    assert.equal(Object.hasOwn(result, key), true, `missing ${key}`);
  }
  assert.equal(result.command, "packet-preflight");
  assert.equal(Array.isArray(result.errors), true);
  assert.equal(Array.isArray(result.checks), true);
  assert.equal(Array.isArray(result.findings), true);
  assert.equal(Array.isArray(result.semanticDiagnostics), true);
  assert.equal(Array.isArray(result.enumDiagnostics), true);
}

function listRuntimeArtifacts(repoRoot) {
  return [
    ".agents/artifacts/VALIDATION_REPORT.json",
    ".agents/artifacts/VALIDATION_REPORT.md",
    ".agents/runtime/ACTIVE_CONTEXT.json",
    ".agents/runtime/ACTIVE_CONTEXT.md",
    ".agents/runtime/generated-state-docs",
    ".agents/runtime/agent-traces"
  ]
    .flatMap((relativePath) => {
      const absolutePath = path.join(repoRoot, relativePath);
      if (!fs.existsSync(absolutePath)) {
        return [];
      }
      const stats = fs.statSync(absolutePath);
      if (!stats.isDirectory()) {
        return [relativePath];
      }
      return fs.readdirSync(absolutePath).map((entry) => path.join(relativePath, entry).replace(/\\/g, "/"));
    })
    .sort();
}

function withStore(dbPath, callback) {
  const store = createOperatingStateStore({ dbPath });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

function runHarnessCli(args, cwd) {
  const result = spawnSync(process.execPath, [".harness/runtime/state/harness-cli.js", ...args], {
    cwd,
    encoding: "utf8"
  });
  assert.equal(result.error, undefined);
  assertNoUnexpectedStderr(result.stderr);
  return {
    status: result.status,
    stdout: result.stdout,
    json: parseTrailingJson(result.stdout)
  };
}

function parseTrailingJson(stdout) {
  const start = stdout.indexOf("{");
  assert.notEqual(start, -1);
  return JSON.parse(stdout.slice(start));
}
