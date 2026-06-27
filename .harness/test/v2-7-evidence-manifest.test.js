import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildEvidenceManifest,
  evaluateEvidenceManifestBinding,
  runEvidenceManifestCommand,
  validateEvidenceManifestAtPath
} from "../runtime/state/evidence-manifest.js";
import { runPacketPreflightCommand } from "../runtime/state/packet-preflight.js";

function tempRepo(prefix = "v27-evidence-") {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(repoRoot, "reference", "packets"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "evidence", "manifests"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "reports", "tdd"), { recursive: true });
  return repoRoot;
}

function writePacket(repoRoot, packetPath, manifestPath) {
  fs.writeFileSync(
    path.join(repoRoot, packetPath),
    [
      "# V2.7 Packet",
      "",
      "## Quick Decision Header",
      "| Item | Current | Needed | Notes |",
      "|---|---|---|---|",
      "| Work item | WI-01 | WI-01 | - |",
      "| Ready For Code | approved | approved | - |",
      "| Gate profile | standard | standard | - |",
      "| Risk if started now | low | low | - |",
      "| Delivery route mode | role-by-role | role-by-role | - |",
      "| Route class | packet-path | packet-path | - |",
      "| Change zone | padded | padded | - |",
      "| User-facing impact | none | none | - |",
      "| Layer classification | runtime | runtime | - |",
      "| Active profile dependencies | none | none | - |",
      "| Profile evidence status | not-needed | not-needed | - |",
      "| UX archetype status | not-needed | not-needed | - |",
      "| UX deviation status | not-needed | not-needed | - |",
      "| Environment topology status | not-needed | not-needed | - |",
      "| Domain foundation status | not-needed | not-needed | - |",
      "| Authoritative source intake status | not-needed | not-needed | - |",
      "| Shared-source wave status | not-needed | not-needed | - |",
      "| Packet exit gate status | approved | approved | - |",
      "| Existing system dependency | none | none | - |",
      "| New authoritative source impact | none | none | - |",
      "",
      "## Planner Packet Challenge Review",
      "- Challenge reviewer: independent reviewer",
      "- Challenge reviewer independence basis: not packet author",
      "- Source refs reviewed: packet source",
      "- Challenge status: pass",
      "- Parent objective coverage: V2.7 manifest binding",
      "- Deferred scope with named follow-up: none",
      "- Acceptance proves behavior change: preflight blocks misbound manifest",
      "- Failure fixture or failure condition: wrong packet_path manifest",
      "- Reviewer closeout hold basis: invalid manifest binding",
      "- First-wave limit check: within V2.7 hardening",
      "- Guidance-only sufficiency rationale: runtime enforcement added",
      "- Challenge evidence artifact path: reference/evidence/manifests/WI-01-tdd.json",
      "- Findings disposition: no findings",
      "- Required corrections applied: not-needed",
      "- No self-approval claim: independent reviewer",
      "",
      "## Verification Manifest",
      "- Ready For Code: approved",
      "- targeted test: node --test .harness/test/v2-7-evidence-manifest.test.js",
      "- validator: pass",
      "- handoff: packet-bound evidence manifest",
      "",
      "## Evidence Manifest",
      `- Evidence manifest path: ${manifestPath}`,
      "",
      "## 15. Packet Exit Quality Gate",
      "- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
      "- Exit recommendation: approved",
      "- Packet exit metadata exit recommendation: approved",
      "- Source parity result: pass",
      "- Packet exit metadata source parity result: pass",
      "- Validation / security / cleanup evidence: pass",
      "- Packet exit metadata validation / security / cleanup evidence: pass"
    ].join("\n"),
    "utf8"
  );
}

test("v2.7 evidence manifest create and validate keeps packet binding", () => {
  const repoRoot = tempRepo();
  try {
    fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "green.log"), "pass\n", "utf8");
    const preview = buildEvidenceManifest({
      repoRoot,
      options: {
        type: "tdd",
        workItem: "WI-01",
        packet: "reference/packets/PKT-01.md",
        sourceCommand: "npm test",
        artifact: "reference/reports/tdd/green.log",
        output: "reference/evidence/manifests/WI-01-tdd.json"
      }
    });
    assert.equal(preview.ok, true);
    const applied = runEvidenceManifestCommand({
      repoRoot,
      args: [
        "create",
        "--apply",
        "--type", "tdd",
        "--work-item", "WI-01",
        "--packet", "reference/packets/PKT-01.md",
        "--source-command", "npm test",
        "--artifact", "reference/reports/tdd/green.log",
        "--output", "reference/evidence/manifests/WI-01-tdd.json"
      ]
    });
    assert.equal(applied.ok, true);
    assert.equal(applied.written, true);
    const validation = validateEvidenceManifestAtPath({
      repoRoot,
      manifestPath: "reference/evidence/manifests/WI-01-tdd.json",
      expectedPacketPath: "reference/packets/PKT-01.md",
      expectedWorkItemId: "WI-01"
    });
    assert.equal(validation.ok, true);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("v2.7 evidence manifest binding blocks wrong packet_path at closeout", () => {
  const repoRoot = tempRepo();
  try {
    fs.writeFileSync(
      path.join(repoRoot, "reference", "evidence", "manifests", "wrong.json"),
      JSON.stringify({
        schema_version: "standard-harness-evidence-manifest/v2.7",
        evidence_id: "TDD-WI-01",
        packet_path: "reference/packets/OTHER.md",
        work_item_id: "WI-01",
        evidence_type: "tdd",
        status: "pass",
        source_command: "npm test",
        generated_at: "2026-06-09T00:00:00.000Z",
        artifact_paths: ["reference/reports/tdd/green.log"],
        summary: "pass",
        limitations: []
      }, null, 2),
      "utf8"
    );
    const content = [
      "# Packet",
      "",
      "## Evidence Manifest",
      "- Evidence manifest path: reference/evidence/manifests/wrong.json"
    ].join("\n");
    const binding = evaluateEvidenceManifestBinding({
      repoRoot,
      content,
      packetPath: "reference/packets/PKT-01.md",
      workItemId: "WI-01",
      stage: "closeout"
    });
    assert.equal(binding.blocking, true);
    assert(binding.diagnostics.some((diagnostic) => diagnostic.code === "packet_binding_mismatch"));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("packet-preflight includes V2.7 evidence manifest diagnostics", () => {
  const repoRoot = tempRepo();
  const packetPath = "reference/packets/PKT-01.md";
  const manifestPath = "reference/evidence/manifests/WI-01-tdd.json";
  try {
    fs.writeFileSync(path.join(repoRoot, "reference", "reports", "tdd", "green.log"), "pass\n", "utf8");
    writePacket(repoRoot, packetPath, manifestPath);
    runEvidenceManifestCommand({
      repoRoot,
      args: [
        "create",
        "--apply",
        "--type", "tdd",
        "--work-item", "WI-01",
        "--packet", packetPath,
        "--source-command", "npm test",
        "--artifact", "reference/reports/tdd/green.log",
        "--output", manifestPath
      ]
    });
    const result = runPacketPreflightCommand({
      repoRoot,
      dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite"),
      args: ["--stage", "closeout", "--packet", packetPath, "--work-item", "WI-01"]
    });
    assert.equal(result.evidenceManifest.manifestPaths.length, 1);
    assert.equal(result.evidenceManifest.ok, true);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
