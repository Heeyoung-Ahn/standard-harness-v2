import fs from "node:fs";
import path from "node:path";

import { readPacketBulletFieldValueFromContent, sliceSection } from "./lib/packet-markdown.js";

export const EVIDENCE_MANIFEST_SCHEMA_VERSION = "standard-harness-evidence-manifest/v2.8";
export const SUPPORTED_EVIDENCE_MANIFEST_SCHEMA_VERSIONS = new Set([
  "standard-harness-evidence-manifest/v2.7",
  "standard-harness-evidence-manifest/v2.8"
]);
export const EVIDENCE_MANIFEST_SCHEMA_PATH = "reference/evidence/evidence_manifest.schema.json";

const VALID_TYPES = new Set(["tdd", "security", "browser", "dependency", "release", "manual_exception"]);
const VALID_STATUSES = new Set([
  "pass",
  "conditional_pass",
  "warn",
  "hold",
  "block",
  "blocked_environment",
  "not_run_agent_error",
  "not_required",
  "not_applicable"
]);
const EVIDENCE_MANIFEST_FIELDS = [
  "schema_version",
  "evidence_id",
  "packet_path",
  "work_item_id",
  "evidence_type",
  "status",
  "source_command",
  "generated_at",
  "artifact_paths",
  "summary",
  "limitations"
];

export function runEvidenceManifestCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "audit";
  const options = parsed.options;

  if (subcommand === "create" || subcommand === "new") {
    const manifest = buildEvidenceManifest({ repoRoot, options });
    if (!manifest.ok || !options.apply) {
      return manifest;
    }
    fs.mkdirSync(path.dirname(path.resolve(repoRoot, manifest.targetPath)), { recursive: true });
    fs.writeFileSync(path.resolve(repoRoot, manifest.targetPath), JSON.stringify(manifest.manifest, null, 2) + "\n", "utf8");
    return {
      ...manifest,
      apply: true,
      written: true,
      nextAction: `Evidence manifest written at ${manifest.targetPath}. Reference this path in the packet Evidence Manifest section before closeout.`
    };
  }

  if (subcommand === "validate") {
    const manifestPath = normalizeRelativePath(options.manifest ?? options.path ?? options.file);
    const expectedPacketPath = normalizeRelativePath(options.packet ?? options.packetPath);
    const expectedWorkItemId = normalizeText(options.workItem ?? options.workItemId);
    const result = validateEvidenceManifestAtPath({
      repoRoot,
      manifestPath,
      expectedPacketPath,
      expectedWorkItemId
    });
    return {
      ok: result.ok,
      command: "evidence-manifest",
      subcommand: "validate",
      manifestPath,
      schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
      diagnostics: result.diagnostics,
      manifest: result.manifest,
      nextAction: result.ok ? "Manifest is valid and packet-bound." : "Fix manifest diagnostics before treating evidence as closeout-ready."
    };
  }

  if (subcommand === "audit") {
    const manifests = discoverEvidenceManifestPaths(repoRoot);
    const diagnostics = [];
    const results = manifests.map((manifestPath) => {
      const result = validateEvidenceManifestAtPath({ repoRoot, manifestPath });
      diagnostics.push(...result.diagnostics.map((diagnostic) => ({ ...diagnostic, manifestPath })));
      return {
        manifestPath,
        ok: result.ok,
        diagnosticCount: result.diagnostics.length,
        evidenceType: result.manifest?.evidence_type ?? null,
        packetPath: result.manifest?.packet_path ?? null,
        workItemId: result.manifest?.work_item_id ?? null,
        status: result.manifest?.status ?? null
      };
    });
    return {
      ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
      command: "evidence-manifest",
      subcommand: "audit",
      schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
      manifestCount: manifests.length,
      manifests: results,
      diagnostics,
      nextAction: diagnostics.some((diagnostic) => diagnostic.severity === "error")
        ? "Fix invalid evidence manifests before closeout."
        : manifests.length === 0
          ? "No manifests found; create one with harness:evidence-manifest create --apply when packet evidence is captured."
          : "Evidence manifest audit passed."
    };
  }

  return {
    ok: false,
    command: "evidence-manifest",
    subcommand,
    supported: ["create", "validate", "audit"],
    message: `Unsupported evidence-manifest subcommand: ${subcommand}`
  };
}

export function buildEvidenceManifest({ repoRoot = process.cwd(), options = {} } = {}) {
  const evidenceType = normalizeEvidenceType(options.type ?? options.evidenceType);
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath);
  const workItemId = normalizeText(options.workItem ?? options.workItemId);
  const status = normalizeStatus(options.status ?? "pass");
  const sourceCommand = normalizeText(options.sourceCommand ?? options.command);
  const evidenceId = normalizeText(options.evidenceId ?? buildDefaultEvidenceId({ workItemId, evidenceType }));
  const artifactPaths = parsePathList(options.artifact ?? options.artifactPath ?? options.artifacts ?? options.artifactPaths);
  const limitations = parseTextList(options.limitation ?? options.limitations);
  const summary = normalizeText(options.summary) || `${evidenceType ?? "unknown"} evidence for ${workItemId ?? "unknown work item"}`;
  const generatedAt = normalizeText(options.generatedAt) || new Date().toISOString();
  const targetPath = normalizeRelativePath(
    options.output ?? options.out ?? `reference/evidence/manifests/${safeId(workItemId ?? "work-item")}-${safeId(evidenceType ?? "evidence")}.json`
  );
  const diagnostics = [];

  if (!evidenceType) {
    diagnostics.push(errorDiagnostic("evidence_type", "missing_or_invalid", `Expected one of ${[...VALID_TYPES].join(", ")}.`));
  }
  if (!packetPath) {
    diagnostics.push(errorDiagnostic("packet_path", "missing_or_invalid", "Evidence manifest requires a repository-relative packet_path."));
  }
  if (!workItemId) {
    diagnostics.push(errorDiagnostic("work_item_id", "missing", "Evidence manifest requires work_item_id."));
  }
  if (!status) {
    diagnostics.push(errorDiagnostic("status", "missing_or_invalid", `Expected one of ${[...VALID_STATUSES].join(", ")}.`));
  }
  if (!sourceCommand && status !== "not_applicable") {
    diagnostics.push(errorDiagnostic("source_command", "missing", "Evidence manifest requires source_command unless status is not_applicable."));
  }
  if (!targetPath) {
    diagnostics.push(errorDiagnostic("targetPath", "unsafe", "Output path must be repository-relative and must not escape the repository."));
  }

  const manifest = {
    schema_version: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    evidence_id: evidenceId,
    packet_path: packetPath,
    work_item_id: workItemId,
    evidence_type: evidenceType,
    status,
    source_command: sourceCommand || "not_applicable",
    generated_at: generatedAt,
    artifact_paths: artifactPaths,
    summary,
    limitations
  };

  if (evidenceType === "browser") {
    const browserDetails = buildBrowserDetailsFromOptions(options);
    if (browserDetails) manifest.browser_details = browserDetails;
  }

  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    command: "evidence-manifest",
    subcommand: "create",
    apply: false,
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    targetPath,
    manifest,
    diagnostics,
    nextAction: diagnostics.length > 0
      ? "Fix required manifest fields before applying."
      : "Run again with --apply to write the evidence manifest."
  };
}

export function evaluateEvidenceManifestBinding({
  repoRoot = process.cwd(),
  content = "",
  packetPath = null,
  workItemId = null,
  stage = "planning-open",
  strict = false
} = {}) {
  const manifestPaths = discoverPacketEvidenceManifestPaths({ repoRoot, content });
  const diagnostics = [];
  const results = [];
  for (const manifestPath of manifestPaths) {
    const result = validateEvidenceManifestAtPath({
      repoRoot,
      manifestPath,
      expectedPacketPath: normalizeRelativePath(packetPath),
      expectedWorkItemId: normalizeText(workItemId)
    });
    diagnostics.push(...result.diagnostics.map((diagnostic) => ({ ...diagnostic, manifestPath })));
    results.push({
      manifestPath,
      ok: result.ok,
      evidenceType: result.manifest?.evidence_type ?? null,
      status: result.manifest?.status ?? null,
      packetPath: result.manifest?.packet_path ?? null,
      workItemId: result.manifest?.work_item_id ?? null
    });
  }

  if (strict && stage === "closeout" && manifestPaths.length === 0) {
    diagnostics.push(errorDiagnostic(
      "Evidence Manifest",
      "missing_for_strict_closeout",
      "Strict closeout requires at least one packet-bound evidence manifest."
    ));
  }

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  return {
    ok: errorCount === 0,
    required: Boolean(strict && stage === "closeout"),
    blocking: errorCount > 0 && (stage === "closeout" || stage === "implementation-transition"),
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    manifestPaths,
    manifests: results,
    diagnostics,
    message: manifestPaths.length === 0
      ? "No packet evidence manifest paths were declared."
      : `${manifestPaths.length} evidence manifest path(s) declared and checked.`
  };
}

export function validateEvidenceManifestAtPath({ repoRoot = process.cwd(), manifestPath, expectedPacketPath = null, expectedWorkItemId = null } = {}) {
  const diagnostics = [];
  const normalizedManifestPath = normalizeRelativePath(manifestPath);
  if (!normalizedManifestPath) {
    return {
      ok: false,
      manifest: null,
      diagnostics: [errorDiagnostic("manifestPath", "missing_or_unsafe", "Manifest path must be repository-relative.")]
    };
  }
  const absolutePath = path.resolve(repoRoot, normalizedManifestPath);
  if (!isInside(repoRoot, absolutePath) || !fs.existsSync(absolutePath)) {
    return {
      ok: false,
      manifest: null,
      diagnostics: [errorDiagnostic("manifestPath", "missing", `Evidence manifest not found: ${normalizedManifestPath}.`)]
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      manifest: null,
      diagnostics: [errorDiagnostic("manifest", "json_parse_failed", `Evidence manifest JSON parse failed: ${error.message}`)]
    };
  }

  for (const field of EVIDENCE_MANIFEST_FIELDS) {
    if (manifest[field] == null || (typeof manifest[field] === "string" && manifest[field].trim() === "")) {
      diagnostics.push(errorDiagnostic(field, "missing", `Evidence manifest is missing required field ${field}.`));
    }
  }

  if (!SUPPORTED_EVIDENCE_MANIFEST_SCHEMA_VERSIONS.has(manifest.schema_version)) {
    diagnostics.push(errorDiagnostic("schema_version", "invalid", `Expected one of ${[...SUPPORTED_EVIDENCE_MANIFEST_SCHEMA_VERSIONS].join(", ")}.`));
  }
  if (!VALID_TYPES.has(manifest.evidence_type)) {
    diagnostics.push(errorDiagnostic("evidence_type", "invalid", `Expected one of ${[...VALID_TYPES].join(", ")}.`));
  }
  if (!VALID_STATUSES.has(manifest.status)) {
    diagnostics.push(errorDiagnostic("status", "invalid", `Expected one of ${[...VALID_STATUSES].join(", ")}.`));
  }
  if (!Array.isArray(manifest.artifact_paths)) {
    diagnostics.push(errorDiagnostic("artifact_paths", "invalid", "artifact_paths must be an array."));
  } else {
    for (const artifactPath of manifest.artifact_paths) {
      const normalizedArtifact = normalizeRelativePath(artifactPath);
      if (!normalizedArtifact) {
        diagnostics.push(errorDiagnostic("artifact_paths", "unsafe_path", `Artifact path escapes repository or is invalid: ${artifactPath}.`));
        continue;
      }
      const absoluteArtifact = path.resolve(repoRoot, normalizedArtifact);
      if (!isInside(repoRoot, absoluteArtifact)) {
        diagnostics.push(errorDiagnostic("artifact_paths", "unsafe_path", `Artifact path escapes repository: ${artifactPath}.`));
      }
    }
  }
  if (!Array.isArray(manifest.limitations)) {
    diagnostics.push(errorDiagnostic("limitations", "invalid", "limitations must be an array."));
  }
  const manifestPacketPath = normalizeRelativePath(manifest.packet_path);
  if (!manifestPacketPath) {
    diagnostics.push(errorDiagnostic("packet_path", "invalid", "packet_path must be repository-relative."));
  }
  if (expectedPacketPath && manifestPacketPath && manifestPacketPath !== expectedPacketPath) {
    diagnostics.push(errorDiagnostic(
      "packet_path",
      "packet_binding_mismatch",
      `Evidence manifest packet_path ${manifestPacketPath} does not match active packet ${expectedPacketPath}.`
    ));
  }
  if (expectedWorkItemId && manifest.work_item_id !== expectedWorkItemId) {
    diagnostics.push(errorDiagnostic(
      "work_item_id",
      "work_item_binding_mismatch",
      `Evidence manifest work_item_id ${manifest.work_item_id ?? "missing"} does not match ${expectedWorkItemId}.`
    ));
  }
  if (manifest.status === "pass" && String(manifest.source_command ?? "").trim() === "") {
    diagnostics.push(errorDiagnostic("source_command", "missing", "Pass evidence requires source_command."));
  }
  if (manifest.status === "pass" && Array.isArray(manifest.artifact_paths) && manifest.artifact_paths.length === 0) {
    diagnostics.push(warnDiagnostic("artifact_paths", "empty_for_pass", "Pass evidence should cite at least one artifact path."));
  }

  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    manifest,
    diagnostics
  };
}

export function discoverPacketEvidenceManifestPaths({ repoRoot = process.cwd(), content = "" } = {}) {
  const paths = new Set();
  const sections = [content, sliceSection(content, "## Evidence Manifest") ?? "", sliceSection(content, "## Verification Manifest") ?? ""];
  const fieldLabels = [
    "Evidence manifest path",
    "Evidence manifest paths",
    "Evidence manifest",
    "TDD evidence manifest path",
    "Security evidence manifest path",
    "Browser evidence manifest path",
    "Dependency evidence manifest path",
    "Release evidence manifest path"
  ];
  for (const section of sections) {
    for (const label of fieldLabels) {
      const value = readPacketBulletFieldValueFromContent(section, label);
      for (const candidate of parsePathList(value)) {
        if (candidate.endsWith(".json")) paths.add(candidate);
      }
    }
    for (const match of section.matchAll(/(?:reference|verification)\/[^\s)`'"|]+?\.json/g)) {
      const normalized = normalizeRelativePath(match[0].replace(/[),.;:]+$/g, ""));
      if (normalized && normalized.includes("evidence") && normalized.includes("manifest")) {
        paths.add(normalized);
      }
    }
  }
  return [...paths].filter((candidate) => {
    const absolute = path.resolve(repoRoot, candidate);
    return isInside(repoRoot, absolute);
  });
}

export function discoverEvidenceManifestPaths(repoRoot) {
  const roots = ["reference/evidence/manifests", "verification/evidence/manifests"];
  const found = [];
  for (const root of roots) {
    const absoluteRoot = path.resolve(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) continue;
    walkJsonFiles(absoluteRoot, (filePath) => {
      found.push(path.relative(repoRoot, filePath).replace(/\\/g, "/"));
    });
  }
  return found.sort();
}

function walkJsonFiles(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsonFiles(fullPath, callback);
    else if (entry.isFile() && entry.name.endsWith(".json")) callback(fullPath);
  }
}

function buildBrowserDetailsFromOptions(options = {}) {
  const screenshotPaths = parsePathList(options.screenshot ?? options.screenshots ?? options.screenshotPath ?? options.screenshotPaths);
  const tracePath = normalizeRelativePath(options.trace ?? options.tracePath);
  const logPath = normalizeRelativePath(options.log ?? options.logPath);
  const reportPath = normalizeRelativePath(options.report ?? options.reportPath);
  const browserMode = normalizeBrowserModeForEvidence(options.engine ?? options.browserEngine ?? options.browserMode ?? options.mode)
    ?? (tracePath && screenshotPaths.length > 0 ? "playwright" : screenshotPaths.length > 0 ? "codex-browser" : "static");
  const scenarioIds = parseTextList(options.scenario ?? options.scenarioId ?? options.scenarios ?? options.scenarioIds);
  const observedResult = normalizeText(options.observedResult ?? options.result ?? options.observed ?? options.observedResults);
  const consoleErrors = parseTextList(options.consoleError ?? options.consoleErrors);
  const networkErrors = parseTextList(options.networkError ?? options.networkErrors);
  if (!browserMode && screenshotPaths.length === 0 && !tracePath && !logPath && !reportPath && scenarioIds.length === 0 && !observedResult) return null;
  return {
    schema_version: "standard-harness-browser-evidence/v2.8",
    browser_mode: browserMode,
    browser_engine: browserMode,
    runner: normalizeText(options.runner) ?? (browserMode === "codex-browser" ? "codex-browser-prompt-intake" : browserMode ?? "unknown"),
    browser_name: normalizeText(options.browserName ?? options.browser) ?? (browserMode === "codex-browser" ? "codex-browser" : "chromium"),
    base_url: normalizeText(options.baseUrl ?? options.url),
    viewport: normalizeText(options.viewport) ?? "1280x900",
    scenario_id: scenarioIds[0] ?? null,
    scenario_ids: scenarioIds,
    scenario_count: finiteNumberOrNull(options.scenarioCount ?? options.scenariosCount) ?? (scenarioIds.length || null),
    passed_scenarios: finiteNumberOrNull(options.passedScenarios ?? options.passed),
    observed_result: observedResult,
    console_errors: consoleErrors,
    network_errors: networkErrors,
    screenshot_paths: screenshotPaths,
    trace_path: tracePath,
    log_path: logPath,
    report_path: reportPath
  };
}

function normalizeBrowserModeForEvidence(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  const aliases = {
    codex: "codex-browser",
    codexbrowser: "codex-browser",
    "codex-browser-tool": "codex-browser",
    playwright: "playwright",
    "playwright-trace": "playwright",
    "playwright-screenshot-trace": "playwright",
    static: "static",
    "http-static": "http-static",
    "http-smoke": "http-static",
    manual: "manual",
    "not-applicable": "not_applicable",
    na: "not_applicable"
  };
  return aliases[text] ?? (text || null);
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildDefaultEvidenceId({ workItemId, evidenceType }) {
  const prefix = String(evidenceType ?? "evidence").toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `${prefix}-${safeId(workItemId ?? Date.now())}`;
}

function parseArgs(args = []) {
  const options = { apply: false };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (token === "--") continue;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s).filter((part) => part !== undefined);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      options[key] = args[++index];
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

function parsePathList(value) {
  if (Array.isArray(value)) return value.flatMap(parsePathList);
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((item) => normalizeRelativePath(item.replace(/^`|`$/g, "").trim()))
    .filter(Boolean);
}

function parseTextList(value) {
  if (Array.isArray(value)) return value.flatMap(parseTextList);
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEvidenceType(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  return VALID_TYPES.has(normalized) ? normalized : null;
}

function normalizeStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  const aliases = {
    passed: "pass",
    conditionally_passed: "conditional_pass",
    conditional: "conditional_pass",
    failed: "block",
    fail: "block",
    blocked: "block",
    warning: "warn",
    environment_blocked: "blocked_environment",
    agent_error: "not_run_agent_error",
    not_run: "not_run_agent_error",
    na: "not_applicable",
    n_a: "not_applicable"
  };
  const status = aliases[normalized] ?? normalized;
  return VALID_STATUSES.has(status) ? status : null;
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/").replace(/^`|`$/g, "").replace(/^\.\//, "");
  if (!text || path.isAbsolute(text)) return null;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }
  if (decoded.split("/").includes("..") || decoded.includes("/../") || decoded === "..") return null;
  return path.posix.normalize(decoded);
}

function errorDiagnostic(field, code, message) {
  return { field, code, severity: "error", message };
}

function warnDiagnostic(field, code, message) {
  return { field, code, severity: "warn", message };
}

function safeId(value) {
  return String(value ?? "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function isInside(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
