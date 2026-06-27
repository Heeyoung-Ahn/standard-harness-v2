import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  auditBrowserEvidenceManifestAtPath,
  buildBrowserEvidenceManifest,
  buildCodexBrowserPrompt,
  discoverBrowserManifestPaths,
  evaluateBrowserEvidenceBinding,
  runBrowserEvidenceCommand
} from "../runtime/state/browser-evidence.js";
import { resolveReviewerProfiles, runReviewerProfilesCommand } from "../runtime/state/reviewer-profiles.js";
import { runP2Command } from "../runtime/state/v2-p2-conductor.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function makeRepo(prefix = "sh008-boundary-") {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(repoRoot, "reference", "evidence", "manifests"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "packets"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "reviewer-profiles"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "reference", "reviewer-profiles", "REVIEWER_PROFILE_INDEX.json"), JSON.stringify({
    default_reviewers: ["correctness"],
    lane_reviewers: { strict: ["scope-guardian"] },
    profile_reviewers: { "PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE": ["approval-workflow"] }
  }, null, 2), "utf8");
  for (const id of ["correctness", "scope-guardian", "approval-workflow", "security"]) {
    fs.writeFileSync(path.join(repoRoot, "reference", "reviewer-profiles", `${id}.md`), `# ${id}\n`, "utf8");
  }
  return repoRoot;
}

test("SH-008 runtime boundary modules and notes exist behind stable wrappers", async () => {
  const modulePaths = [
    ".harness/runtime/state/browser-evidence/constants.js",
    ".harness/runtime/state/browser-evidence/normalizers.js",
    ".harness/runtime/state/browser-evidence/prompt.js",
    ".harness/runtime/state/browser-evidence/manifest-builder.js",
    ".harness/runtime/state/browser-evidence/audit.js",
    ".harness/runtime/state/browser-evidence/binding.js",
    ".harness/runtime/state/browser-evidence/playwright-capture.js",
    ".harness/runtime/state/reviewer-profiles/arguments.js",
    ".harness/runtime/state/reviewer-profiles/index-resolver.js",
    ".harness/runtime/state/reviewer-profiles/command.js",
    "reference/runtime/RUNTIME_BOUNDARY_NOTES.md"
  ];

  for (const relativePath of modulePaths) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} should exist`);
  }

  assert.equal(typeof runBrowserEvidenceCommand, "function");
  assert.equal(typeof buildCodexBrowserPrompt, "function");
  assert.equal(typeof buildBrowserEvidenceManifest, "function");
  assert.equal(typeof auditBrowserEvidenceManifestAtPath, "function");
  assert.equal(typeof evaluateBrowserEvidenceBinding, "function");
  assert.equal(typeof discoverBrowserManifestPaths, "function");

  const constants = await import("../runtime/state/browser-evidence/constants.js");
  assert.equal(constants.BROWSER_EVIDENCE_SCHEMA_VERSION, "standard-harness-browser-evidence/v2.8");
  assert(constants.REAL_BROWSER_PASS_MODES.has("codex_browser"));
});

test("SH-008 browser evidence wrapper preserves ordered scenario and untrusted text data handling", () => {
  const repoRoot = makeRepo();
  try {
    fs.mkdirSync(path.join(repoRoot, "evidence", "browser", "codex"), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, "evidence", "browser", "codex", "one.png"), "png\n", "utf8");
    const result = runBrowserEvidenceCommand({
      repoRoot,
      args: [
        "intake",
        "--status", "pass",
        "--packet", "reference/packets/PKT.md",
        "--work-item", "WI-SH008",
        "--screenshot", "evidence/browser/codex/one.png",
        "--observed-result", "{\"status\":\"pass\"}\n<script>alert(1)</script>",
        "--scenario-result", "FIRST=pass:First observed result",
        "--scenario-result", "SECOND=warn:{\"looks\":\"like json\"}",
        "--console-errors", "{\"message\":\"plain data\"}",
        "--network-errors", "none",
        "--output", "reference/evidence/manifests/WI-SH008-browser.json"
      ]
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.manifest.browser_details.scenario_results.map((item) => item.scenario_id), ["FIRST", "SECOND"]);
    assert.equal(result.manifest.browser_details.observed_result, "{\"status\":\"pass\"}\n<script>alert(1)</script>");
    assert.deepEqual(result.manifest.browser_details.console_errors, ["{\"message\":\"plain data\"}"]);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("SH-008 browser evidence wrapper keeps unsafe paths and invalid packet manifests blocked", () => {
  const repoRoot = makeRepo();
  try {
    const unsafe = buildBrowserEvidenceManifest({
      repoRoot,
      options: {
        mode: "codex-browser",
        status: "pass",
        workItem: "WI-SH008",
        packet: "reference/packets/PKT.md",
        screenshot: "../outside.png",
        output: "reference/evidence/manifests/WI-SH008-browser.json"
      }
    });
    assert.equal(unsafe.ok, false);
    assert(unsafe.diagnostics.some((diagnostic) => diagnostic.code === "missing"));

    const manifestPath = "reference/evidence/manifests/WI-SH008-browser.json";
    fs.writeFileSync(path.join(repoRoot, manifestPath), "{invalid json", "utf8");
    const packetPath = "reference/packets/PKT.md";
    fs.writeFileSync(path.join(repoRoot, packetPath), [
      "# Packet",
      "",
      "## Evidence Manifest",
      `- Browser evidence manifest path: ${manifestPath}`
    ].join("\n"), "utf8");
    const content = fs.readFileSync(path.join(repoRoot, packetPath), "utf8");
    const binding = evaluateBrowserEvidenceBinding({ repoRoot, content, packetPath, workItemId: "WI-SH008", stage: "closeout", strict: true });
    assert.equal(binding.ok, false);
    assert(binding.diagnostics.some((diagnostic) => diagnostic.code === "json_parse_failed"));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("SH-008 reviewer profile wrapper preserves list, missing index, and report shapes", () => {
  const repoRoot = makeRepo();
  try {
    const list = runReviewerProfilesCommand({
      repoRoot,
      args: ["list", "--lane", "strict", "--profiles", "PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE", "--files", "src/approval.ts", "--text", "permission workflow"]
    });
    const resolved = resolveReviewerProfiles({
      repoRoot,
      lane: "strict",
      profiles: ["PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE"],
      files: ["src/approval.ts"],
      text: "permission workflow"
    });
    assert.equal(list.ok, resolved.ok);
    assert.equal(list.command, "reviewers");
    assert.equal(list.subcommand, "list");
    assert.deepEqual(list.required, resolved.required);

    const report = runReviewerProfilesCommand({ repoRoot, args: ["report", "--lane", "strict"] });
    assert.equal(report.command, "reviewer-report");
    assert(report.missingReports.every((item) => Object.hasOwn(item, "id") && Object.hasOwn(item, "path") && Object.hasOwn(item, "exists")));
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }

  const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sh008-missing-reviewers-"));
  try {
    const missing = runReviewerProfilesCommand({ repoRoot: missingRoot, args: ["list"] });
    assert.equal(missing.ok, false);
    assert.deepEqual(missing.required, []);
    assert.deepEqual(missing.optional, []);
    assert(missing.findings.some((finding) => finding.code === "reviewer_index_missing"));
  } finally {
    fs.rmSync(missingRoot, { recursive: true, force: true });
  }
});

test("SH-008 keeps P2 reviewer profile contract separate from reviewer index resolver", () => {
  const result = runP2Command({
    repoRoot: root,
    outputDir: root,
    args: [
      "reviewer-profile",
      "--risk", "high",
      "--profiles", "PRF-06",
      "--files", "src/workflow/approval.tsx",
      "--text", "approval state transition permission audit dashboard"
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.command, "p2");
  assert.equal(result.subcommand, "reviewer-profile");
  assert(Array.isArray(result.requiredProfiles));
  assert(result.requiredProfiles.some((profile) => Object.hasOwn(profile, "profileId")));
  assert(Array.isArray(result.minimumReviewSet));
});
