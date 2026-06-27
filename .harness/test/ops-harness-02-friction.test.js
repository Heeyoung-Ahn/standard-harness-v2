import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  auditBrowserEvidenceManifestAtPath,
  buildBrowserEvidenceManifest
} from "../runtime/state/browser-evidence/core.js";
import {
  buildSerialParallelBatchPlan,
  evaluateParallelBatchPlan
} from "../runtime/state/parallel-batch.js";
import {
  buildSecurityReviewScaffold,
  evaluateSecurityReviewEvidence
} from "../runtime/state/security-evidence.js";
import {
  evaluateNpmRegistryDiagnostic
} from "../runtime/state/v2-4-risk-adaptive.js";

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ops-harness-02-"));
}

test("npm registry diagnostic classifies npm-only TLS chain failures without disabling strict SSL", () => {
  const result = evaluateNpmRegistryDiagnostic({
    npmPingOutput: [
      "npm notice PING https://registry.npmjs.org/",
      "npm error code SELF_SIGNED_CERT_IN_CHAIN",
      "npm error request to https://registry.npmjs.org/-/ping failed, reason: self-signed certificate in certificate chain"
    ].join("\n"),
    npmViewOutput: "npm error code SELF_SIGNED_CERT_IN_CHAIN",
    curlHeadOutput: "HTTP/1.1 200 OK"
  });

  assert.equal(result.ok, false);
  assert.equal(result.classification, "certificate-chain");
  assert.equal(result.networkLayer, "node-npm-tls");
  assert.match(result.summary, /curl.*200/i);
  assert.ok(result.secureRemediations.some((item) => /NODE_OPTIONS=--use-system-ca/i.test(item)));
  assert.ok(result.secureRemediations.some((item) => /cafile/i.test(item)));
  assert.ok(!JSON.stringify(result).includes("strict-ssl=false"));
});

test("Edge CDP browser evidence can be a real-browser pass only over local HTTP", () => {
  const repoRoot = makeTempRepo();
  fs.mkdirSync(path.join(repoRoot, "reference", "evidence", "browser"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "reference", "evidence", "browser", "edge.png"), "png-placeholder");

  const httpResult = buildBrowserEvidenceManifest({
    repoRoot,
    options: {
      packet: "reference/packets/PKT.md",
      workItem: "OPS-HARNESS-02",
      status: "pass",
      mode: "edge-cdp",
      engine: "edge-cdp",
      baseUrl: "http://127.0.0.1:5173",
      screenshot: "reference/evidence/browser/edge.png",
      observedResult: "Edge CDP rendered the target route."
    }
  });
  assert.equal(httpResult.ok, true, JSON.stringify(httpResult.diagnostics));

  fs.mkdirSync(path.join(repoRoot, "reference", "evidence", "manifests"), { recursive: true });
  const manifestPath = "reference/evidence/manifests/OPS-HARNESS-02-browser.json";
  fs.writeFileSync(path.join(repoRoot, manifestPath), JSON.stringify(httpResult.manifest, null, 2));
  const audit = auditBrowserEvidenceManifestAtPath({ repoRoot, manifestPath, strict: true });
  assert.equal(audit.ok, true, JSON.stringify(audit.diagnostics));

  const fileResult = buildBrowserEvidenceManifest({
    repoRoot,
    options: {
      packet: "reference/packets/PKT.md",
      workItem: "OPS-HARNESS-02",
      status: "pass",
      mode: "edge-cdp",
      engine: "edge-cdp",
      baseUrl: "file:///C:/project/dist/index.html",
      screenshot: "reference/evidence/browser/edge.png",
      observedResult: "A local file URL rendered."
    }
  });
  assert.equal(fileResult.ok, false);
  assert.ok(fileResult.diagnostics.some((item) => item.code === "local_http_required"));
});

test("security review scaffold is packet-bound and separates deferred risks from findings", () => {
  const repoRoot = makeTempRepo();
  const packetPath = "reference/packets/OPS-HARNESS-02_CLOSEOUT_FRICTION_REDUCTION.md";
  const reportPath = "reference/reports/security/OPS-HARNESS-02.json";
  const report = buildSecurityReviewScaffold({
    packetPath,
    workItemId: "OPS-HARNESS-02",
    decision: "pass",
    deferredRisks: [
      {
        id: "ROOT-ROLLOUT-DEFERRED",
        reason: "Root standard-harness rollout is outside this project-local packet."
      }
    ]
  });

  fs.mkdirSync(path.join(repoRoot, "reference", "reports", "security"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, reportPath), JSON.stringify(report, null, 2));
  const content = [
    "## CSO Security Review",
    "- Security review evidence status: pass",
    `- Security review report path: \`${reportPath}\``,
    "- Security review decision: pass",
    "- Security review evidence scope: OPS-HARNESS-02 project-local harness friction changes."
  ].join("\n");
  const evaluated = evaluateSecurityReviewEvidence({
    repoRoot,
    content,
    packetPath,
    workItemId: "OPS-HARNESS-02",
    stage: "closeout",
    effectiveRisk: "high"
  });

  assert.equal(evaluated.ok, true, JSON.stringify(evaluated.diagnostics));
  assert.deepEqual(report.findings, []);
  assert.equal(report.deferred_risks.length, 1);
});

test("serial parallel-batch scaffold validates and not-needed plan path is treated as absent", () => {
  const repoRoot = makeTempRepo();
  const packetPath = "reference/packets/OPS-HARNESS-02_CLOSEOUT_FRICTION_REDUCTION.md";
  const planPath = "reference/reports/parallel/OPS-HARNESS-02.json";
  const plan = buildSerialParallelBatchPlan({
    packetPath,
    workItemId: "OPS-HARNESS-02",
    evidenceOutput: "reference/reports/developer/OPS-HARNESS-02.md",
    files: [".harness/runtime/state/browser-evidence/core.js"]
  });

  fs.mkdirSync(path.join(repoRoot, "reference", "reports", "parallel"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, planPath), JSON.stringify(plan, null, 2));
  const evaluated = evaluateParallelBatchPlan({
    repoRoot,
    stage: "closeout",
    content: [
      "## Parallel Execution Plan",
      `- Parallel batch plan path: \`${planPath}\``
    ].join("\n")
  });
  assert.equal(evaluated.ok, true, JSON.stringify(evaluated.diagnostics));

  const absent = evaluateParallelBatchPlan({
    repoRoot,
    stage: "closeout",
    content: [
      "## Parallel Execution Plan",
      "- Parallel batch plan path: not-needed"
    ].join("\n")
  });
  assert.equal(absent.present, false);
  assert.equal(absent.ok, true);
});
