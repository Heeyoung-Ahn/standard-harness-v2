import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createReleaseCandidateBundle,
  validateReleaseCandidateBundle,
  validateReleaseCandidateBundleAtPath
} from "../runtime/state/release-candidate-bundle.js";

function withTempDir(prefix, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function withReleaseCandidateTarget(prefix, fn) {
  const root = process.platform === "win32" ? "C:\\tmp" : "/tmp";
  fs.mkdirSync(root, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, `standard-harness-pkt19-${prefix}`));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFile(root, relativePath, content = "fixture\n") {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function writeSource(root) {
  writeFile(root, ".harness/runtime/state/harness-cli.js", "export const ok = true;\n");
  writeFile(root, ".harness/test/example.test.js");
  writeFile(root, ".agents/runtime/ACTIVE_CONTEXT.json", "{}");
  writeFile(root, ".agents/artifacts/CURRENT_STATE.md", "# generated\n");
  writeFile(root, ".agents/artifacts/TASK_LIST.md", "# generated\n");
  writeFile(root, ".agents/artifacts/VALIDATION_REPORT.json", "{}");
  writeFile(root, ".agents/artifacts/VALIDATION_REPORT.md", "# generated\n");
  writeFile(root, ".harness/operating_state.sqlite", "not a real sqlite db\n");
  writeFile(root, ".env.local", "TOKEN=secret-fixture\n");
  writeFile(root, "package.json", JSON.stringify({ scripts: { "harness:validate": "node ok.js" } }));
}

test("release candidate bundle writes local evidence with no approval authority", () => {
  withTempDir("pkt19-source-", (source) => {
    withReleaseCandidateTarget("target-", (target) => {
      writeSource(source);

      const result = createReleaseCandidateBundle({ repoRoot: source, options: { to: target } });

      assert.equal(result.ok, true);
      assert.equal(fs.existsSync(path.join(target, "release-candidate-bundle.json")), true);
      assert.equal(fs.existsSync(path.join(target, "command-inventory.json")), true);
      assert.equal(fs.existsSync(path.join(target, "unresolved-risks.json")), true);
      assert.equal(fs.existsSync(path.join(target, "rollback-notes.md")), true);
      assert.equal(result.authority.grantsReleaseApproval, false);
      assert.equal(result.releaseReadiness.decision, "block");
      assert.equal(result.summary.forbiddenStateExclusions >= 7, true);
      const writtenBundle = JSON.parse(fs.readFileSync(path.join(target, "release-candidate-bundle.json"), "utf8"));
      assert.equal(writtenBundle.packageManifest.includedPaths.includes(".agents/artifacts/CURRENT_STATE.md"), false);
      assert.equal(writtenBundle.packageManifest.includedPaths.includes(".agents/artifacts/TASK_LIST.md"), false);

      const validation = validateReleaseCandidateBundleAtPath({
        repoRoot: source,
        bundlePath: path.join(target, "release-candidate-bundle.json")
      });
      assert.equal(validation.ok, true);
      assert.equal(validation.authority.grantsPublishApproval, false);
    });
  });
});

test("release candidate bundle validation rejects approval overclaims", () => {
  const bundle = validBundleFixture();
  bundle.authority.grantsReleaseApproval = true;
  bundle.approvalBoundary.grantsResidualRiskAcceptance = true;
  bundle.evidenceInputs[0].authority.grantsReleaseApproval = true;

  const validation = validateReleaseCandidateBundle({ bundle });

  assert.equal(validation.ok, false);
  assert.ok(validation.diagnostics.some((item) => item.code === "approval_overclaim"));
  assert.ok(validation.diagnostics.some((item) => item.code === "release_overclaim"));
});

test("release candidate bundle validation rejects publish and deploy commands", () => {
  const bundle = validBundleFixture();
  bundle.commandInventory.push({ command: "npm publish", mutation: "remote-registry", purpose: "bad" });
  bundle.commandInventory.push({ command: "gh release create v1.0.0", mutation: "remote-release", purpose: "bad" });

  const validation = validateReleaseCandidateBundle({ bundle });

  assert.equal(validation.ok, false);
  assert.ok(validation.diagnostics.some((item) => item.code === "forbidden_mutation_command"));
});

test("release candidate bundle validation keeps PKT-20 and PKT-21 as blockers", () => {
  const bundle = validBundleFixture();
  bundle.unresolvedRisks = bundle.unresolvedRisks.filter((risk) => risk.id !== "PKT-21_STRUCTURED_PM_SOURCE_INTAKE");

  const validation = validateReleaseCandidateBundle({ bundle });

  assert.equal(validation.ok, false);
  assert.ok(validation.diagnostics.some((item) => item.code === "missing_productization_blocker"));
});

test("release candidate bundle validation rejects forbidden state inclusion", () => {
  const bundle = validBundleFixture();
  bundle.packageManifest.includedPaths.push(".agents/runtime/ACTIVE_CONTEXT.json");
  bundle.packageManifest.includedPaths.push(".agents/artifacts/CURRENT_STATE.md");

  const validation = validateReleaseCandidateBundle({ bundle });

  assert.equal(validation.ok, false);
  assert.ok(validation.diagnostics.some((item) => item.code === "forbidden_state_included"));
});

test("release candidate bundle refuses targets outside the packet tmp boundary", () => {
  withTempDir("pkt19-source-target-boundary-", (source) => {
    withTempDir("pkt19-target-parent-", (targetParent) => {
      writeSource(source);
      const result = createReleaseCandidateBundle({
        repoRoot: source,
        options: { to: path.join(targetParent, "bundle") }
      });

      assert.equal(result.ok, false);
      assert.ok(result.diagnostics.some((item) => item.code === "outside_release_candidate_tmp"));
    });
  });
});

test("release candidate bundle refuses targets inside the source repository", () => {
  withTempDir("pkt19-source-target-", (source) => {
    writeSource(source);
    const result = createReleaseCandidateBundle({
      repoRoot: source,
      options: { to: path.join(source, "release-candidate") }
    });

    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((item) => item.code === "inside_source"));
  });
});

function validBundleFixture() {
  return {
    schemaVersion: "standard-harness-release-candidate-bundle/v1",
    packageManifest: {
      summary: { include: 1, exclude: 3, review: 1 },
      includedPaths: [".harness/runtime/state/harness-cli.js"],
      releaseReadiness: { decision: "block" }
    },
    commandInventory: [
      { command: "npm run harness:promote-starter -- --dry-run --to C:\\tmp\\starter", mutation: "none" }
    ],
    evidenceInputs: [
      {
        id: "PKT-17",
        evidencePath: "reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md",
        authority: { grantsReleaseApproval: false }
      }
    ],
    securityDependencyEvidence: {
      dependencyAuditRequired: true,
      reportPath: "reference/reports/dependency-audit/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md"
    },
    unresolvedRisks: [
      { id: "PKT-20_REAL_PROVIDER_WORKER_SMOKE", status: "open" },
      { id: "PKT-21_STRUCTURED_PM_SOURCE_INTAKE", status: "open" }
    ],
    forbiddenStateExclusions: [".agents/runtime/ACTIVE_CONTEXT.json", ".agents/artifacts/CURRENT_STATE.md"],
    rollback: { scope: "packet" },
    authority: {
      grantsReleaseApproval: false,
      grantsPublishApproval: false,
      grantsImplementationApproval: false,
      grantsPacketCloseout: false,
      grantsRiskClosure: false,
      grantsProductVerification: false,
      grantsResidualRiskAcceptance: false
    },
    approvalBoundary: {
      grantsReleaseApproval: false,
      grantsPublishApproval: false,
      grantsPromotionApproval: false,
      grantsResidualRiskAcceptance: false,
      grantsProductizationComplete: false,
      grantsUserUatApproval: false
    }
  };
}
