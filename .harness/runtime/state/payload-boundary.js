import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_PATHS = [
  "docs/planning",
  "docs/operator",
  "final-artifacts",
  "maintainer",
  "tests",
  "tools",
  ".harness/extensions",
  ".harness/memory",
  ".harness/packets",
  ".harness/profiles",
  ".harness/reports",
  ".harness/review-lenses",
  ".harness/rules",
  ".harness/schema",
  ".harness/skills",
  ".harness/state",
  ".harness/workflows",
  "Makefile",
  "UPGRADE_NOTES_v1.1.md"
];

function normalizeRelative(relativePath) {
  return relativePath.replaceAll(path.sep, "/").replace(/^\.\//, "");
}

export function checkPayloadBoundary({ root = process.cwd(), mode = "clean-payload" } = {}) {
  const findings = [];
  for (const forbidden of FORBIDDEN_PATHS) {
    const candidate = path.join(root, forbidden);
    if (fs.existsSync(candidate)) {
      findings.push({
        severity: "block",
        path: forbidden,
        reason: "Root Codex Core Harness production-project artifact is not allowed in the reusable standard-harness payload."
      });
    }
  }

  const generatedRuntimeFindings = findGeneratedRuntimeArtifacts(root);
  findings.push(...generatedRuntimeFindings);
  findings.push(...findCodexPluginPayloadFindings(root));

  return {
    ok: findings.length === 0,
    mode,
    scopeNote: scopeNoteForMode(mode),
    payloadRoot: root,
    forbiddenPathCount: findings.length,
    findings
  };
}

function findCodexPluginPayloadFindings(root) {
  const findings = [];
  const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) return findings;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const skills = String(manifest.skills ?? "");
    if (path.isAbsolute(skills) || skills.includes("..")) {
      findings.push({
        severity: "block",
        path: ".codex-plugin/plugin.json",
        reason: "Codex plugin skills path must be relative and must not traverse outside the starter payload."
      });
    }
  } catch {
    findings.push({
      severity: "block",
      path: ".codex-plugin/plugin.json",
      reason: "Codex plugin manifest must be valid JSON."
    });
  }
  return findings;
}

function scopeNoteForMode(mode) {
  if (mode === "initialized-project") {
    return "Initialized-project mode: post-init runtime files can exist in a working project, but must not be packaged into the clean reusable starter payload.";
  }
  if (mode === "root-repository") {
    return "Root-repository mode: use this only to inspect packaging boundaries; root operating harness files are not part of the reusable starter payload.";
  }
  return "Clean-payload mode: verifies the clean reusable starter payload does not contain maintainer/root-only artifacts or prebuilt runtime state.";
}

function findGeneratedRuntimeArtifacts(root) {
  const findings = [];
  const generatedArtifacts = [
    ".harness/operating_state.sqlite",
    ".harness/operating_state.sqlite-shm",
    ".harness/operating_state.sqlite-wal",
    ".agents/runtime/ACTIVE_CONTEXT.json",
    ".agents/runtime/ACTIVE_CONTEXT.md",
    ".agents/artifacts/VALIDATION_REPORT.json",
    ".agents/artifacts/VALIDATION_REPORT.md"
  ];

  for (const relativePath of generatedArtifacts) {
    const candidate = path.join(root, relativePath);
    if (fs.existsSync(candidate)) {
      findings.push({
        severity: "block",
        path: normalizeRelative(relativePath),
        reason: "Generated runtime state must not be prebuilt into the reusable standard-harness payload."
      });
    }
  }

  return findings;
}

export function runPayloadBoundaryCommand({ root = process.cwd(), json = true, mode = "clean-payload" } = {}) {
  const result = checkPayloadBoundary({ root, mode });
  const lines = json
    ? [JSON.stringify(result, null, 2)]
    : [
        `Payload boundary: ${result.ok ? "pass" : "fail"}`,
        `Mode: ${result.mode}`,
        `Scope: ${result.scopeNote}`,
        `Forbidden findings: ${result.forbiddenPathCount}`,
        ...result.findings.map((finding) => `- ${finding.path}: ${finding.reason}`)
      ];
  return { result, output: lines.join("\n") };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const modeIndex = process.argv.indexOf("--mode");
  const mode = modeArg
    ? modeArg.slice("--mode=".length)
    : modeIndex >= 0 && process.argv[modeIndex + 1]
      ? process.argv[modeIndex + 1]
      : "clean-payload";
  const { result, output } = runPayloadBoundaryCommand({
    root: process.cwd(),
    json: !process.argv.includes("--text"),
    mode
  });
  console.log(output);
  process.exitCode = result.ok ? 0 : 1;
}
