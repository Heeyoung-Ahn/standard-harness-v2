import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  EVIDENCE_MANIFEST_SCHEMA_VERSION,
  buildEvidenceManifest,
  discoverEvidenceManifestPaths,
  discoverPacketEvidenceManifestPaths,
  validateEvidenceManifestAtPath
} from "../evidence-manifest.js";
import {
  normalizePacketHeaderValue,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent,
  sliceSection
} from "../lib/packet-markdown.js";

export const BROWSER_EVIDENCE_SCHEMA_VERSION = "standard-harness-browser-evidence/v2.8";

export const BROWSER_MODES = new Set([
  "codex_browser",
  "playwright",
  "edge_cdp",
  "chrome_cdp",
  "screenshot_trace",
  "screenshot",
  "trace",
  "static",
  "manual",
  "not_applicable"
]);
export const REAL_BROWSER_PASS_MODES = new Set(["codex_browser", "playwright", "edge_cdp", "chrome_cdp", "screenshot_trace"]);
export const TRACE_REQUIRED_MODES = new Set(["playwright", "screenshot_trace"]);
export const OPTIONAL_TRACE_REAL_BROWSER_MODES = new Set(["codex_browser", "edge_cdp", "chrome_cdp"]);
export const FALLBACK_EVIDENCE_TYPES = new Set(["dom_session_transcript", "session_transcript", "dom_snapshot"]);
const BROWSER_EVIDENCE_EXCERPT_LIMIT = 2048;

export const DEFAULT_CODEX_BROWSER_SCENARIOS = [
  {
    id: "APP-SMOKE-FLOW",
    objective: "Open the application landing page and confirm the primary user interface renders."
  },
  {
    id: "PRIMARY-JOURNEY-FLOW",
    objective: "Exercise the primary user journey defined by the active packet."
  },
  {
    id: "ERROR-OR-EDGE-FLOW",
    objective: "Exercise one expected validation, error, or edge path and record the observed result."
  },
  {
    id: "CLOSEOUT-ARTIFACT-FLOW",
    objective: "Open the final report, summary, or closeout-facing screen required by the active packet."
  }
];

export function runBrowserEvidenceCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "audit";
  const options = parsed.options;

  if (subcommand === "prompt" || subcommand === "codex-prompt") {
    const result = buildCodexBrowserPrompt({ repoRoot, options });
    if (!result.ok || !options.apply) return result;
    const absoluteTarget = path.resolve(repoRoot, result.targetPath);
    fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    fs.writeFileSync(absoluteTarget, result.prompt, "utf8");
    return {
      ...result,
      apply: true,
      written: true,
      nextAction: `Codex Browser validation prompt written at ${result.targetPath}. Execute this prompt in Codex Browser, save artifacts, then run browser-evidence intake.`
    };
  }

  if (subcommand === "intake" || subcommand === "codex-intake") {
    const result = buildBrowserEvidenceManifest({
      repoRoot,
      options: {
        ...options,
        engine: options.engine ?? options.browserEngine ?? "codex-browser",
        mode: options.mode ?? options.browserMode ?? "codex-browser",
        runner: options.runner ?? "codex-browser",
        sourceCommand: options.sourceCommand ?? options.command ?? "Codex Browser validation session",
        summary: options.summary ?? "Codex Browser screenshot/session evidence for UI closeout"
      }
    });
    if (!result.ok || !options.apply) return { ...result, subcommand: "intake" };
    const absoluteTarget = path.resolve(repoRoot, result.targetPath);
    fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    fs.writeFileSync(absoluteTarget, JSON.stringify(result.manifest, null, 2) + "\n", "utf8");
    return {
      ...result,
      subcommand: "intake",
      apply: true,
      written: true,
      nextAction: `Codex Browser evidence manifest written at ${result.targetPath}. Run browser-evidence audit and closeout preflight.`
    };
  }

  if (subcommand === "create" || subcommand === "new") {
    const result = buildBrowserEvidenceManifest({ repoRoot, options });
    if (!result.ok || !options.apply) return result;
    const absoluteTarget = path.resolve(repoRoot, result.targetPath);
    fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    fs.writeFileSync(absoluteTarget, JSON.stringify(result.manifest, null, 2) + "\n", "utf8");
    return {
      ...result,
      apply: true,
      written: true,
      nextAction: `Browser evidence manifest written at ${result.targetPath}. Attach it to the packet Evidence Manifest section before closeout.`
    };
  }

  if (subcommand === "audit" || subcommand === "validate") {
    const strict = Boolean(options.strict || options.requireRealBrowser || options.requirePlaywright || options.requireTrace);
    const packetPath = normalizeRelativePath(options.packet ?? options.packetPath);
    if (packetPath) {
      const absolutePacket = path.resolve(repoRoot, packetPath);
      const content = isInside(repoRoot, absolutePacket) && fs.existsSync(absolutePacket)
        ? fs.readFileSync(absolutePacket, "utf8")
        : "";
      const binding = evaluateBrowserEvidenceBinding({
        repoRoot,
        content,
        packetPath,
        workItemId: normalizeText(options.workItem ?? options.workItemId),
        stage: options.stage ?? "closeout",
        changedFiles: parsePathList(options.files ?? options.changedFiles),
        strict
      });
      return {
        ok: binding.ok,
        command: "browser-evidence",
        subcommand: "audit",
        schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
        strict,
        packetPath,
        required: binding.required,
        manifestCount: binding.manifestPaths.length,
        manifests: binding.audits,
        diagnostics: binding.diagnostics,
        nextAction: binding.ok
          ? "Browser evidence audit passed for the packet."
          : "Run Codex Browser validation, intake its artifacts, or repair the packet-bound browser manifest before UI closeout."
      };
    }
    const manifestPaths = options.manifest || options.path || options.file
      ? [normalizeRelativePath(options.manifest ?? options.path ?? options.file)].filter(Boolean)
      : discoverBrowserManifestPaths(repoRoot);
    const audits = manifestPaths.map((manifestPath) => auditBrowserEvidenceManifestAtPath({ repoRoot, manifestPath, strict }));
    const diagnostics = audits.flatMap((audit) => audit.diagnostics.map((diagnostic) => ({ ...diagnostic, manifestPath: audit.manifestPath })));
    const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
    return {
      ok: errorCount === 0,
      command: "browser-evidence",
      subcommand: "audit",
      schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
      strict,
      manifestCount: manifestPaths.length,
      manifests: audits.map((audit) => ({
        manifestPath: audit.manifestPath,
        ok: audit.ok,
        browserEngine: audit.browserEngine,
        browserMode: audit.browserMode,
        screenshotCount: audit.screenshotPaths.length,
        tracePath: audit.tracePath,
        sessionArtifactPath: audit.sessionArtifactPath,
        scenarioCount: audit.scenarioResults.length,
        diagnosticCount: audit.diagnostics.length
      })),
      diagnostics,
      nextAction: errorCount > 0
        ? "Run Codex Browser validation, intake its artifacts, or repair the packet-bound browser manifest before UI closeout."
        : manifestPaths.length === 0
          ? "No browser evidence manifests found. Create one after Codex Browser validation."
          : "Browser evidence audit passed."
    };
  }

  if (subcommand === "run" || subcommand === "capture" || subcommand === "playwright") {
    return runPlaywrightEvidenceCapture({ repoRoot, options });
  }

  return {
    ok: false,
    command: "browser-evidence",
    subcommand,
    supported: ["prompt", "intake", "create", "audit", "run"],
    message: `Unsupported browser-evidence subcommand: ${subcommand}`
  };
}

export function buildCodexBrowserPrompt({ repoRoot = process.cwd(), options = {} } = {}) {
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath);
  const workItemId = normalizeText(options.workItem ?? options.workItemId);
  const baseUrl = normalizeText(options.baseUrl ?? options.url) ?? "http://127.0.0.1:<port>";
  const targetPath = normalizeRelativePath(options.output ?? options.out ?? "evidence/browser/codex/codex-browser-validation-prompt.md");
  const scenarioOverrides = parseTextList(options.scenario ?? options.scenarios);
  const scenarios = scenarioOverrides.length > 0
    ? scenarioOverrides.map((scenario, index) => ({ id: `CUSTOM-SCENARIO-${index + 1}`, objective: scenario }))
    : DEFAULT_CODEX_BROWSER_SCENARIOS;
  const diagnostics = [];
  if (!packetPath) diagnostics.push(errorDiagnostic("packet_path", "missing_or_invalid", "Codex Browser prompt requires --packet."));
  if (!workItemId) diagnostics.push(errorDiagnostic("work_item_id", "missing", "Codex Browser prompt requires --work-item."));
  if (!targetPath) diagnostics.push(errorDiagnostic("output", "unsafe_path", "Output path must be repository-relative."));

  const manifestPath = normalizeRelativePath(options.manifest ?? options.manifestPath ?? `reference/evidence/manifests/${safeId(workItemId ?? "work-item")}-browser.json`);
  const artifactRoot = normalizeRelativePath(options.artifactRoot ?? "evidence/browser/codex") ?? "evidence/browser/codex";
  const prompt = [
    "# Codex Browser Validation Prompt",
    "",
    "Run this validation in Codex Browser. Use the live application, not static/curl evidence.",
    "",
    "## Packet binding",
    "",
    `- Packet path: ${packetPath ?? "<required>"}`,
    `- Work item ID: ${workItemId ?? "<required>"}`,
    `- Target URL: ${baseUrl}`,
    `- Evidence manifest target: ${manifestPath ?? "<required>"}`,
    `- Artifact root: ${artifactRoot}`,
    "",
    "## Required browser flows",
    "",
    ...scenarios.flatMap((scenario, index) => [
      `${index + 1}. ${scenario.id}`,
      `   - Objective: ${scenario.objective}`,
      "   - Required result: record pass/fail and observed result.",
      `   - Required screenshot path: ${artifactRoot}/${scenario.id.toLowerCase()}.png`,
      ""
    ]),
    "## Required evidence to save",
    "",
    "- Screenshot artifact for each required flow.",
    "- Browser session/trace artifact if the Codex Browser session exposes one.",
    "- Console error summary.",
    "- Network error summary.",
    "- Observed result per scenario; do not mark pass from screenshots alone.",
    "- Limitations, including whether a trace/session artifact was unavailable.",
    "",
    "## Intake command template",
    "",
    "After the browser run, replace artifact paths as needed and run:",
    "",
    "```bash",
    `npm run harness:browser-evidence -- intake --apply --packet ${packetPath ?? "<packet>"} --work-item ${workItemId ?? "<work-item>"} --status pass --screenshot ${artifactRoot}/app-smoke-flow.png,${artifactRoot}/primary-journey-flow.png,${artifactRoot}/error-or-edge-flow.png,${artifactRoot}/closeout-artifact-flow.png --session ${artifactRoot}/codex-browser-session.md --log ${artifactRoot}/console.log --report ${artifactRoot}/browser-evidence.md --observed-result "Codex Browser validated the packet-defined UI flows." --scenario-result "APP-SMOKE-FLOW=pass:Application shell rendered" --scenario-result "PRIMARY-JOURNEY-FLOW=pass:Primary journey matched packet acceptance criteria" --scenario-result "ERROR-OR-EDGE-FLOW=pass:Expected validation or edge path was observed" --scenario-result "CLOSEOUT-ARTIFACT-FLOW=pass:Closeout-facing artifact was available" --console-errors none --network-errors none --limitation "Trace artifact unavailable unless Codex Browser exported a trace/session artifact" --output ${manifestPath ?? "reference/evidence/manifests/<work-item>-browser.json"}`,
    "```",
    "",
    "## Closeout check",
    "",
    "```bash",
    `npm run harness:browser-evidence -- audit --packet ${packetPath ?? "<packet>"} --work-item ${workItemId ?? "<work-item>"} --strict`,
    `npm run harness:packet-preflight -- --stage closeout --packet ${packetPath ?? "<packet>"} --work-item ${workItemId ?? "<work-item>"} --strict-browser-evidence --strict-evidence-manifest`,
    "```",
    ""
  ].join("\n");

  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    command: "browser-evidence",
    subcommand: "prompt",
    schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
    targetPath,
    packetPath,
    workItemId,
    scenarioCount: scenarios.length,
    prompt,
    diagnostics,
    nextAction: diagnostics.length > 0
      ? "Provide --packet and --work-item before applying the Codex Browser prompt."
      : "Run again with --apply to write the Codex Browser validation prompt."
  };
}

export function buildBrowserEvidenceManifest({ repoRoot = process.cwd(), options = {} } = {}) {
  const screenshotPaths = parsePathList(options.screenshot ?? options.screenshots ?? options.screenshotPath ?? options.screenshotPaths);
  const tracePath = normalizeRelativePath(options.trace ?? options.tracePath);
  const sessionArtifactPath = normalizeRelativePath(options.session ?? options.sessionPath ?? options.browserSession ?? options.sessionArtifact ?? options.sessionArtifactPath);
  const logPath = normalizeRelativePath(options.log ?? options.logPath ?? options.consoleLog);
  const reportPath = normalizeRelativePath(options.report ?? options.reportPath);
  const evidenceType = normalizeBrowserEvidenceType(options.evidenceType ?? options.browserEvidenceType, {
    screenshotPaths,
    tracePath,
    sessionArtifactPath
  });
  const policy = normalizeBrowserPolicy(options.browserPolicy ?? options.policy ?? options.strictPolicy);
  const toolingFailure = normalizeToolingFailure(options.toolingFailure ?? options.failure ?? options.failureReason);
  const fallbackEvidence = buildFallbackEvidence(options);
  const artifacts = [
    ...screenshotPaths,
    tracePath,
    sessionArtifactPath,
    logPath,
    reportPath,
    ...parsePathList(options.artifact ?? options.artifacts)
  ].filter(Boolean);
  const requestedEngine = normalizeBrowserEngine(options.engine ?? options.browserEngine);
  const browserMode = normalizeBrowserMode(
    options.mode ?? options.browserMode ?? requestedEngine ?? defaultBrowserMode({ requestedEngine, tracePath, sessionArtifactPath, screenshotPaths })
  );
  const browserEngine = requestedEngine ?? browserEngineForMode(browserMode);
  const status = normalizeStatus(options.status ?? (REAL_BROWSER_PASS_MODES.has(browserMode) ? "pass" : "warn"));
  const scenarioResults = parseScenarioResults(options.scenarioResult ?? options.scenarioResults);
  const scenarioIds = parseTextList(options.scenario ?? options.scenarios ?? options.scenarioId ?? options.scenarioIds);
  if (scenarioResults.length === 0 && scenarioIds.length > 0) {
    const observed = normalizeText(options.observedResult ?? options.observed ?? options.result);
    scenarioResults.push(...scenarioIds.map((scenarioId) => ({
      scenario_id: scenarioId,
      status: status === "pass" ? "pass" : "warn",
      observed_result: observed ?? "Recorded by browser evidence intake."
    })));
  }
  const observedResult = normalizeText(options.observedResult ?? options.observed ?? options.result);
  const consoleErrors = parseTextList(options.consoleErrors ?? options.consoleError);
  const networkErrors = parseTextList(options.networkErrors ?? options.networkError);
  const scenarioCount = numberOrNull(options.scenarioCount ?? options.scenarios) ?? (scenarioResults.length > 0 ? scenarioResults.length : null);
  const passedScenarios = numberOrNull(options.passedScenarios ?? options.passed) ?? (scenarioResults.length > 0 ? scenarioResults.filter((scenario) => scenario.status === "pass").length : null);
  const browserDetails = {
    schema_version: BROWSER_EVIDENCE_SCHEMA_VERSION,
    browser_mode: browserMode,
    browser_engine: browserEngine,
    runner: normalizeText(options.runner) ?? browserEngine ?? "codex-browser",
    browser_name: normalizeText(options.browserName ?? options.browser) ?? (browserEngine === "codex-browser" ? "codex-browser" : "chromium"),
    base_url: normalizeText(options.baseUrl ?? options.url) ?? null,
    viewport: normalizeText(options.viewport) ?? "1280x900",
    scenario_count: scenarioCount,
    passed_scenarios: passedScenarios,
    scenario_results: scenarioResults,
    observed_result: observedResult,
    evidence_type: evidenceType,
    policy,
    fallback_evidence: fallbackEvidence,
    tooling_failure: toolingFailure,
    screenshot_paths: screenshotPaths,
    trace_path: tracePath,
    session_artifact_path: sessionArtifactPath,
    log_path: logPath,
    report_path: reportPath,
    console_errors: consoleErrors,
    network_errors: networkErrors
  };
  const manifestResult = buildEvidenceManifest({
    repoRoot,
    options: {
      ...options,
      type: "browser",
      status,
      sourceCommand: options.sourceCommand ?? options.command ?? "Browser evidence intake",
      artifact: artifacts,
      summary: options.summary ?? `${browserEngine ?? browserMode ?? "browser"} browser evidence for ${options.workItem ?? options.workItemId ?? "unknown work item"}`
    }
  });
  const diagnostics = [...manifestResult.diagnostics];
  if (!browserMode) {
    diagnostics.push(errorDiagnostic("browser_details.browser_mode", "missing_or_invalid", `Expected one of ${[...BROWSER_MODES].join(", ")}.`));
  }
  if (status === "pass" && !REAL_BROWSER_PASS_MODES.has(browserMode)) {
    diagnostics.push(errorDiagnostic("browser_details.browser_mode", "static_or_manual_pass", "Pass browser evidence requires Codex Browser or Playwright real-browser evidence, not static/manual evidence."));
  }
  if (status === "pass" && String(browserDetails.base_url ?? "").trim().toLowerCase().startsWith("file://")) {
    diagnostics.push(errorDiagnostic(
      "browser_details.base_url",
      "local_http_required",
      "Pass browser evidence must use a local HTTP URL such as http://127.0.0.1:<port>; file:// renders do not prove the app runtime path."
    ));
  }
  if (status === "pass" && policy.screenshot_required && screenshotPaths.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.screenshot_paths", "missing", "Pass browser evidence requires at least one screenshot artifact."));
  }
  if (status === "pass" && FALLBACK_EVIDENCE_TYPES.has(evidenceType) && !policy.dom_session_sufficient) {
    diagnostics.push(errorDiagnostic("browser_details.evidence_type", "fallback_not_strict_pass", "DOM/session fallback cannot be strict pass unless the active browser policy declares it sufficient."));
  }
  if (status === "conditional_pass" && FALLBACK_EVIDENCE_TYPES.has(evidenceType) && !observedResult && scenarioResults.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.observed_result", "missing", "Conditional DOM/session browser evidence requires observed_result or scenario_results."));
  }
  if (status === "pass" && TRACE_REQUIRED_MODES.has(browserMode) && !tracePath) {
    diagnostics.push(errorDiagnostic("browser_details.trace_path", "missing", "Playwright pass evidence requires a trace artifact."));
  }
  if (status === "pass" && browserMode === "codex_browser" && !observedResult && scenarioResults.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.observed_result", "missing", "Codex Browser pass evidence requires observed_result or scenario_results."));
  }
  return {
    ...manifestResult,
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    command: "browser-evidence",
    subcommand: "create",
    schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
    manifest: {
      ...manifestResult.manifest,
      schema_version: EVIDENCE_MANIFEST_SCHEMA_VERSION,
      browser_details: browserDetails
    },
    diagnostics,
    nextAction: diagnostics.length > 0
      ? "Fix browser evidence manifest diagnostics before applying."
      : "Run again with --apply to write the browser evidence manifest."
  };
}

export function auditBrowserEvidenceManifestAtPath({ repoRoot = process.cwd(), manifestPath, strict = false } = {}) {
  const diagnostics = [];
  const normalizedManifestPath = normalizeRelativePath(manifestPath);
  const general = validateEvidenceManifestAtPath({ repoRoot, manifestPath: normalizedManifestPath });
  diagnostics.push(...general.diagnostics);
  const manifest = general.manifest;
  if (!manifest) {
    return emptyAudit({ manifestPath: normalizedManifestPath, diagnostics });
  }
  if (manifest.evidence_type !== "browser") {
    diagnostics.push(errorDiagnostic("evidence_type", "not_browser", "Browser evidence audit requires evidence_type=browser."));
  }
  const details = manifest.browser_details ?? {};
  const browserMode = normalizeBrowserMode(details.browser_mode ?? manifest.browser_mode);
  const browserEngine = normalizeBrowserEngine(details.browser_engine ?? details.runner) ?? browserEngineForMode(browserMode);
  const evidenceType = normalizeBrowserEvidenceType(details.evidence_type, {});
  const policy = normalizeBrowserPolicy(details.policy ?? manifest.browser_policy);
  const toolingFailure = normalizeToolingFailure(details.tooling_failure ?? manifest.tooling_failure);
  const screenshotPaths = Array.isArray(details.screenshot_paths) ? details.screenshot_paths.map(normalizeRelativePath).filter(Boolean) : [];
  const tracePath = normalizeRelativePath(details.trace_path);
  const sessionArtifactPath = normalizeRelativePath(details.session_artifact_path ?? details.session_path);
  const logPath = normalizeRelativePath(details.log_path);
  const reportPath = normalizeRelativePath(details.report_path);
  const observedResult = normalizeText(details.observed_result ?? manifest.observed_result);
  const scenarioResults = Array.isArray(details.scenario_results)
    ? details.scenario_results.map(normalizeScenarioResult).filter(Boolean)
    : [];
  const consoleErrors = Array.isArray(details.console_errors) ? details.console_errors.filter((item) => normalizeText(item)) : [];
  const networkErrors = Array.isArray(details.network_errors) ? details.network_errors.filter((item) => normalizeText(item)) : [];
  const evidenceState = classifyBrowserEvidenceState({ manifest, browserMode, evidenceType, policy, screenshotPaths, tracePath, toolingFailure });

  if (!details || Object.keys(details).length === 0) {
    diagnostics.push((strict ? errorDiagnostic : warnDiagnostic)(
      "browser_details",
      "missing",
      "Browser evidence manifest should include browser_details with engine, mode, artifact paths, scenario result, and runner metadata."
    ));
  }
  if (!browserMode) {
    diagnostics.push((strict ? errorDiagnostic : warnDiagnostic)("browser_details.browser_mode", "missing_or_invalid", `Expected one of ${[...BROWSER_MODES].join(", ")}.`));
  }
  if (manifest.status === "pass" && !REAL_BROWSER_PASS_MODES.has(browserMode)) {
    diagnostics.push((strict ? errorDiagnostic : warnDiagnostic)(
      "browser_details.browser_mode",
      "static_only_not_real_browser",
      "Pass browser evidence must be Codex Browser or Playwright real-browser evidence, not static/manual evidence."
    ));
  }
  if (strict && manifest.status === "pass" && String(details.base_url ?? "").trim().toLowerCase().startsWith("file://")) {
    diagnostics.push(errorDiagnostic(
      "browser_details.base_url",
      "local_http_required",
      "Strict browser pass evidence must use local HTTP; file:// evidence can hide routing, asset, and runtime failures."
    ));
  }

  if (strict && !["pass", "conditional_pass", "not_required", "not_applicable", "blocked_environment", "not_run_agent_error"].includes(manifest.status)) {
    diagnostics.push(errorDiagnostic(
      "status",
      "strict_browser_evidence_not_pass",
      `Strict browser evidence audit requires pass, conditional_pass, not_required, not_applicable, blocked_environment, or not_run_agent_error; current status is ${manifest.status}.`
    ));
  }
  if (strict && ["blocked_environment", "not_run_agent_error"].includes(manifest.status)) {
    diagnostics.push(errorDiagnostic(
      "browser_details.tooling_failure",
      "browser_tooling_failure",
      `Browser evidence tooling did not complete: ${toolingFailure ?? manifest.status}. This is an evidence tooling failure, not product verification pass.`
    ));
  }
  if (strict && ["pass", "conditional_pass"].includes(manifest.status) && policy.screenshot_required && screenshotPaths.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.screenshot_paths", "screenshot_required_for_strict_pass", "Strict browser policy requires screenshot evidence; DOM/session fallback must stay hold or blocked_environment unless policy allows it."));
  }
  if (strict && manifest.status === "pass" && screenshotPaths.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.screenshot_paths", "missing", "Strict browser evidence requires at least one screenshot path."));
  }
  if (strict && manifest.status === "pass" && TRACE_REQUIRED_MODES.has(browserMode) && !tracePath) {
    diagnostics.push(errorDiagnostic("browser_details.trace_path", "missing", "Strict Playwright browser evidence requires a trace path."));
  }
  if (strict && manifest.status === "pass" && OPTIONAL_TRACE_REAL_BROWSER_MODES.has(browserMode) && !tracePath && !sessionArtifactPath) {
    diagnostics.push(warnDiagnostic("browser_details.session_artifact_path", "missing_optional", "Codex Browser evidence should include a trace or browser session artifact when the Codex environment exposes one."));
  }
  if (strict && manifest.status === "pass" && browserMode === "codex_browser" && !observedResult && scenarioResults.length === 0) {
    diagnostics.push(errorDiagnostic("browser_details.observed_result", "missing", "Codex Browser pass evidence requires observed_result or scenario_results."));
  }
  if (strict && manifest.status === "pass" && consoleErrors.length > 0) {
    diagnostics.push(errorDiagnostic("browser_details.console_errors", "console_errors_present", `Strict pass evidence cannot contain console errors: ${consoleErrors.join("; ")}`));
  }
  if (strict && manifest.status === "pass" && networkErrors.length > 0) {
    diagnostics.push(errorDiagnostic("browser_details.network_errors", "network_errors_present", `Strict pass evidence cannot contain network errors: ${networkErrors.join("; ")}`));
  }
  if (strict && manifest.status === "pass" && Array.isArray(manifest.artifact_paths) && manifest.artifact_paths.length === 0) {
    diagnostics.push(errorDiagnostic("artifact_paths", "empty_for_strict_pass", "Strict browser evidence requires at least one artifact path."));
  }

  for (const artifactPath of [...screenshotPaths, tracePath, sessionArtifactPath, logPath, reportPath].filter(Boolean)) {
    const resolved = path.resolve(repoRoot, artifactPath);
    if (!isInside(repoRoot, resolved)) {
      diagnostics.push(errorDiagnostic("browser_details.artifact", "unsafe_path", `Browser artifact escapes repository: ${artifactPath}.`));
    } else if (!fs.existsSync(resolved)) {
      diagnostics.push(errorDiagnostic("browser_details.artifact", "missing", `Browser artifact does not exist: ${artifactPath}.`));
    }
  }

  const artifactPaths = Array.isArray(manifest.artifact_paths) ? manifest.artifact_paths.map(normalizeRelativePath).filter(Boolean) : [];
  for (const requiredArtifact of [...screenshotPaths, tracePath, sessionArtifactPath].filter(Boolean)) {
    if (!artifactPaths.includes(requiredArtifact)) {
      diagnostics.push(warnDiagnostic("artifact_paths", "browser_artifact_not_manifested", `Browser artifact ${requiredArtifact} is not listed in artifact_paths.`));
    }
  }

  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    manifestPath: normalizedManifestPath,
    manifest,
    browserEngine,
    browserMode,
    evidenceType,
    evidenceState,
    policy: {
      name: policy.name,
      screenshotRequired: policy.screenshot_required,
      traceRequired: policy.trace_required,
      domSessionSufficient: policy.dom_session_sufficient
    },
    screenshotPaths,
    tracePath,
    sessionArtifactPath,
    logPath,
    reportPath,
    observedResult,
    scenarioResults,
    consoleErrors,
    networkErrors,
    strict,
    diagnostics,
    nextAction: nextActionForBrowserEvidenceState(evidenceState, diagnostics)
  };
}

export function evaluateBrowserEvidenceBinding({
  repoRoot = process.cwd(),
  content = "",
  packetPath = null,
  workItemId = null,
  stage = "planning-open",
  changedFiles = [],
  strict = false
} = {}) {
  const required = isBrowserEvidenceRequired({ content, stage, changedFiles });
  const manifestPaths = discoverBrowserManifestPathsForPacket({ repoRoot, content });
  const diagnostics = [];
  const audits = manifestPaths.map((manifestPath) => auditBrowserEvidenceManifestAtPath({ repoRoot, manifestPath, strict: strict || required }));
  for (const audit of audits) {
    diagnostics.push(...audit.diagnostics.map((diagnostic) => ({ ...diagnostic, manifestPath: audit.manifestPath })));
    const manifest = audit.manifest;
    if (!manifest) continue;
    const manifestPacketPath = normalizeRelativePath(manifest.packet_path);
    if (packetPath && manifestPacketPath !== normalizeRelativePath(packetPath)) {
      diagnostics.push(errorDiagnostic(
        "packet_path",
        "packet_binding_mismatch",
        `Browser evidence manifest packet_path ${manifestPacketPath ?? "missing"} does not match active packet ${normalizeRelativePath(packetPath)}.`
      ));
    }
    if (workItemId && manifest.work_item_id !== workItemId) {
      diagnostics.push(errorDiagnostic(
        "work_item_id",
        "work_item_binding_mismatch",
        `Browser evidence manifest work_item_id ${manifest.work_item_id ?? "missing"} does not match ${workItemId}.`
      ));
    }
  }
  if (required && manifestPaths.length === 0) {
    diagnostics.push(errorDiagnostic("Browser evidence manifest path", "missing", "UI/user-facing closeout requires a packet-bound browser evidence manifest."));
  }
  if (required && audits.length > 0 && !audits.some((audit) => ["pass", "conditional_pass"].includes(audit.evidenceState) && REAL_BROWSER_PASS_MODES.has(audit.browserMode))) {
    diagnostics.push(errorDiagnostic("browser_details.browser_mode", "no_real_browser_pass", "UI closeout requires at least one pass browser manifest from Codex Browser or Playwright real-browser evidence."));
  }
  const sufficientAudits = audits.filter((audit) => ["pass", "conditional_pass", "not_required", "not_applicable"].includes(audit.evidenceState) && audit.ok);
  if (required && audits.length > 0 && sufficientAudits.length === 0 && !diagnostics.some((diagnostic) => diagnostic.code === "no_real_browser_pass")) {
    diagnostics.push(errorDiagnostic("browser_details.evidence_state", "no_sufficient_browser_evidence", "UI closeout has browser evidence, but no manifest satisfies the active browser evidence policy."));
  }
  const finalErrorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  return {
    ok: finalErrorCount === 0,
    required,
    blocking: stage === "closeout" && finalErrorCount > 0,
    strict: strict || required,
    schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
    manifestPaths,
    audits: audits.map((audit) => ({
      manifestPath: audit.manifestPath,
      ok: audit.ok,
      browserEngine: audit.browserEngine,
      browserMode: audit.browserMode,
      evidenceType: audit.evidenceType,
      evidenceState: audit.evidenceState,
      status: audit.manifest?.status ?? null,
      screenshotCount: audit.screenshotPaths.length,
      tracePath: audit.tracePath,
      sessionArtifactPath: audit.sessionArtifactPath,
      scenarioCount: audit.scenarioResults.length,
      diagnosticCount: audit.diagnostics.length
    })),
    diagnostics,
    nextAction: audits.length > 0
      ? nextActionForBrowserEvidenceState(
          sufficientAudits[0]?.evidenceState ?? audits[0].evidenceState,
          diagnostics
        )
      : required
        ? "Run Codex Browser validation and attach a packet-bound browser evidence manifest before UI closeout."
        : "Browser evidence is not required for this packet/stage.",
    message: required
      ? "Browser evidence is required for this UI/user-facing closeout."
      : "Browser evidence is not required for this packet/stage."
  };
}

export function discoverBrowserManifestPaths(repoRoot = process.cwd()) {
  const paths = [];
  for (const manifestPath of discoverEvidenceManifestPaths(repoRoot)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.resolve(repoRoot, manifestPath), "utf8"));
      if (manifest.evidence_type === "browser") paths.push(manifestPath);
    } catch {
      // Invalid manifests are left to evidence-manifest audit; browser audit only filters readable browser manifests.
    }
  }
  return paths.sort();
}

export function discoverBrowserManifestPathsForPacket({ repoRoot, content }) {
  const paths = new Set();
  for (const manifestPath of discoverPacketEvidenceManifestPaths({ repoRoot, content })) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.resolve(repoRoot, manifestPath), "utf8"));
      if (manifest.evidence_type === "browser") paths.add(manifestPath);
    } catch {
      if (/browser/i.test(manifestPath)) paths.add(manifestPath);
    }
  }
  const labels = [
    "Browser evidence manifest path",
    "Browser evidence manifest",
    "Codex Browser evidence manifest path",
    "Playwright evidence manifest path"
  ];
  const sections = [content, sliceSection(content, "## Evidence Manifest") ?? "", sliceSection(content, "## Verification Manifest") ?? ""];
  for (const section of sections) {
    for (const label of labels) {
      const value = readPacketBulletFieldValueFromContent(section, label);
      for (const candidate of parsePathList(value)) {
        if (candidate.endsWith(".json")) paths.add(candidate);
      }
    }
  }
  return [...paths].sort();
}

export function isBrowserEvidenceRequired({ content, stage, changedFiles }) {
  if (stage !== "closeout") return false;
  const riskOverlay = normalizeText(readPacketField(content, "Risk overlay") ?? readPacketField(content, "Risk overlays")) ?? "";
  if (/browser-evidence/i.test(riskOverlay)) return true;
  const explicit = normalizePacketHeaderValue(readPacketField(content, "Browser evidence required") ?? "");
  if (["yes", "required", "true", "pass-required"].includes(explicit)) return true;
  const userFacing = normalizePacketHeaderValue(readPacketHeaderValueFromContent(content, "User-facing impact") ?? readPacketField(content, "User-facing impact") ?? "");
  if (userFacing && !["none", "no", "not-needed", "not_applicable", "low"].includes(userFacing)) return true;
  return changedFiles.some((filePath) => /(^|\/)(src\/web|web|ui|frontend)\//.test(String(filePath).replace(/\\/g, "/")) || /\.(html|css|jsx|tsx|vue|svelte)$/.test(String(filePath)));
}

export function readPacketField(content, label) {
  return readPacketBulletFieldValueFromContent(content, label) ?? readPacketHeaderValueFromContent(content, label);
}

export function emptyAudit({ manifestPath, diagnostics }) {
  return {
    ok: false,
    manifestPath,
    manifest: null,
    browserEngine: null,
    browserMode: null,
    screenshotPaths: [],
    tracePath: null,
    sessionArtifactPath: null,
    logPath: null,
    reportPath: null,
    observedResult: null,
    scenarioResults: [],
    consoleErrors: [],
    networkErrors: [],
    strict: false,
    diagnostics
  };
}

export function runPlaywrightEvidenceCapture({ repoRoot = process.cwd(), options = {} } = {}) {
  const artifactRoot = normalizeRelativePath(options.artifactRoot ?? "verification/evidence/browser/playwright") ?? "verification/evidence/browser/playwright";
  const runLog = normalizeRelativePath(options.log ?? `${artifactRoot}/playwright-run.log`);
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(repoRoot, "package.json"), "utf8"));
  if (!packageJson.scripts?.["browser:playwright:test"] && !packageJson.scripts?.["browser:test"]) {
    return {
      ok: false,
      command: "browser-evidence",
      subcommand: "run",
      schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
      diagnostics: [errorDiagnostic("browser:playwright:test", "missing_script", "Optional Playwright capture requires browser:playwright:test or browser:test.")],
      nextAction: "Use Codex Browser prompt/intake as the canonical path, or add optional Playwright scripts."
    };
  }
  fs.mkdirSync(path.resolve(repoRoot, artifactRoot), { recursive: true });
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const scriptName = packageJson.scripts?.["browser:playwright:test"] ? "browser:playwright:test" : "browser:test";
  const result = childProcess.spawnSync(npmCommand, ["run", scriptName], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, BROWSER_EVIDENCE_DIR: artifactRoot }
  });
  fs.mkdirSync(path.dirname(path.resolve(repoRoot, runLog)), { recursive: true });
  fs.writeFileSync(path.resolve(repoRoot, runLog), [
    `$ npm run ${scriptName}`,
    `exitCode=${result.status ?? "null"}`,
    "",
    "## stdout",
    result.stdout ?? "",
    "",
    "## stderr",
    result.stderr ?? ""
  ].join("\n"), "utf8");
  const screenshotRoot = path.resolve(repoRoot, "evidence", "browser", "screenshots");
  const screenshots = fs.existsSync(screenshotRoot)
    ? walkFiles(screenshotRoot).filter((file) => file.endsWith(".png")).map((file) => path.relative(repoRoot, file).replace(/\\/g, "/"))
    : [];
  const manifestResult = buildBrowserEvidenceManifest({
    repoRoot,
    options: {
      packet: options.packet ?? options.packetPath,
      workItem: options.workItem ?? options.workItemId,
      screenshot: screenshots,
      trace: artifactRoot,
      log: runLog,
      report: `${artifactRoot}/playwright-report.json`,
      output: options.output ?? `reference/evidence/manifests/${safeId(options.workItem ?? options.workItemId ?? "work-item")}-browser.json`,
      status: result.status === 0 ? "pass" : "block",
      sourceCommand: `npm run ${scriptName}`,
      mode: "playwright",
      engine: "playwright"
    }
  });
  if (result.status === 0 && (options.apply || options.write) && manifestResult.ok) {
    fs.mkdirSync(path.dirname(path.resolve(repoRoot, manifestResult.targetPath)), { recursive: true });
    fs.writeFileSync(path.resolve(repoRoot, manifestResult.targetPath), JSON.stringify(manifestResult.manifest, null, 2) + "\n", "utf8");
    manifestResult.written = true;
  }
  return {
    ok: result.status === 0,
    command: "browser-evidence",
    subcommand: "run",
    schemaVersion: BROWSER_EVIDENCE_SCHEMA_VERSION,
    exitCode: result.status,
    artifactRoot,
    runLog,
    screenshotCount: screenshots.length,
    manifestPath: manifestResult.targetPath,
    manifestWritten: Boolean(manifestResult.written),
    diagnostics: manifestResult.diagnostics,
    nextAction: result.status === 0
      ? "Optional Playwright browser evidence captured. Audit the packet-bound manifest before closeout."
      : "Use Codex Browser prompt/intake as the canonical path, or inspect the optional Playwright run log."
  };
}

export function walkFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

export function safeId(value) {
  return String(value ?? "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

export function normalizeBrowserEvidenceType(value, { screenshotPaths = [], tracePath = null, sessionArtifactPath = null } = {}) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  const aliases = {
    dom_session: "dom_session_transcript",
    codex_browser_session: "dom_session_transcript",
    session: "session_transcript",
    transcript: "session_transcript",
    dom: "dom_snapshot",
    screenshot: "screenshot",
    screenshots: "screenshot",
    trace: "trace",
    playwright_trace: "trace"
  };
  const type = aliases[normalized] ?? normalized;
  if (["screenshot", "trace", "dom_session_transcript", "session_transcript", "dom_snapshot", "static"].includes(type)) {
    return type;
  }
  if (tracePath) return "trace";
  if (screenshotPaths.length > 0) return "screenshot";
  if (sessionArtifactPath) return "dom_session_transcript";
  return "static";
}

export function normalizeBrowserPolicy(value) {
  if (value && typeof value === "object") {
    return {
      name: normalizeText(value.name) ?? "custom",
      screenshot_required: Boolean(value.screenshot_required ?? value.screenshotRequired),
      trace_required: Boolean(value.trace_required ?? value.traceRequired),
      dom_session_sufficient: Boolean(value.dom_session_sufficient ?? value.domSessionSufficient)
    };
  }
  const normalized = String(value ?? "screenshot-required").trim().toLowerCase().replaceAll("_", "-");
  if (["dom-session-allowed", "dom-session-sufficient", "session-fallback-pass", "fallback-pass"].includes(normalized)) {
    return {
      name: normalized,
      screenshot_required: false,
      trace_required: false,
      dom_session_sufficient: true
    };
  }
  if (["trace-required", "playwright-trace-required"].includes(normalized)) {
    return {
      name: normalized,
      screenshot_required: true,
      trace_required: true,
      dom_session_sufficient: false
    };
  }
  if (["not-required", "not-required-for-packet"].includes(normalized)) {
    return {
      name: normalized,
      screenshot_required: false,
      trace_required: false,
      dom_session_sufficient: false
    };
  }
  return {
    name: "screenshot-required",
    screenshot_required: true,
    trace_required: false,
    dom_session_sufficient: false
  };
}

export function normalizeToolingFailure(value) {
  const text = normalizeText(value);
  if (!text || ["none", "not_applicable", "n/a"].includes(text.toLowerCase())) return null;
  return text.toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

export function buildFallbackEvidence(options = {}) {
  const domSnapshot = sanitizeBrowserEvidenceText(options.domSnapshot ?? options.dom ?? options.domExcerpt);
  const sessionTranscript = sanitizeBrowserEvidenceText(options.sessionTranscript ?? options.transcript ?? options.sessionText);
  if (!domSnapshot.value && !sessionTranscript.value) {
    return null;
  }
  return {
    dom_snapshot_excerpt: domSnapshot.value,
    session_transcript_excerpt: sessionTranscript.value,
    max_excerpt_chars: BROWSER_EVIDENCE_EXCERPT_LIMIT,
    redaction_applied: domSnapshot.redacted || sessionTranscript.redacted,
    truncated: domSnapshot.truncated || sessionTranscript.truncated,
    prompt_injection_text_treated_as_data: true
  };
}

export function sanitizeBrowserEvidenceText(value) {
  let text = String(value ?? "");
  if (!text.trim()) {
    return { value: "", redacted: false, truncated: false };
  }
  let redacted = false;
  const replacements = [
    [/\b(Cookie|Set-Cookie)\s*:\s*[^\n;]+(?:;[^\n]+)?/gi, "$1: [REDACTED_COOKIE]"],
    [/\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Authorization: Bearer [REDACTED_TOKEN]"],
    [/\b(localStorage|sessionStorage)\.[A-Za-z0-9_-]*token[A-Za-z0-9_-]*\s*=\s*[^;\n]+/gi, "$1.[REDACTED_STORAGE_TOKEN]=[REDACTED]"],
    [/\b[A-Za-z0-9_-]*(token|secret|password|credential)[A-Za-z0-9_-]*\s*[:=]\s*[^;\n]+/gi, "[REDACTED_CREDENTIAL_FIELD]"],
    [/\bsk-[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_SECRET]"],
    [/ignore\s+(all\s+)?previous\s+instructions/gi, "[REDACTED_PROMPT_INJECTION]"],
    [/run\s+(the\s+)?tool/gi, "[REDACTED_TOOL_INSTRUCTION]"]
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) {
      redacted = true;
      text = text.replace(pattern, replacement);
    }
  }
  const truncated = text.length > BROWSER_EVIDENCE_EXCERPT_LIMIT;
  if (truncated) {
    text = text.slice(0, BROWSER_EVIDENCE_EXCERPT_LIMIT);
  }
  return { value: text, redacted, truncated };
}

export function classifyBrowserEvidenceState({ manifest, browserMode, evidenceType, policy, screenshotPaths, tracePath, toolingFailure }) {
  const status = normalizeStatus(manifest?.status);
  if (status === "not_required" || status === "not_applicable") return status;
  if (status === "blocked_environment") return "blocked_environment";
  if (status === "not_run_agent_error") return "not_run_agent_error";
  if (toolingFailure) return "blocked_environment";
  if (status === "block") return "hold";
  if (status === "warn" || status === "hold") return status;
  if (status === "conditional_pass") {
    if (FALLBACK_EVIDENCE_TYPES.has(evidenceType) && policy.dom_session_sufficient) return "conditional_pass";
    return "hold";
  }
  if (status === "pass") {
    if (policy.trace_required && !tracePath) return "hold";
    if (policy.screenshot_required && screenshotPaths.length === 0) return "hold";
    if (FALLBACK_EVIDENCE_TYPES.has(evidenceType) && !policy.dom_session_sufficient) return "hold";
    if (REAL_BROWSER_PASS_MODES.has(browserMode)) return "pass";
  }
  return "hold";
}

export function nextActionForBrowserEvidenceState(evidenceState, diagnostics = []) {
  if (evidenceState === "pass" || evidenceState === "conditional_pass" || evidenceState === "not_required" || evidenceState === "not_applicable") {
    return "Browser evidence satisfies the active browser evidence policy.";
  }
  if (evidenceState === "blocked_environment" || evidenceState === "not_run_agent_error") {
    return "Record the browser tooling failure separately, retry screenshot/trace capture when possible, or revise the packet policy before closeout.";
  }
  if (diagnostics.some((diagnostic) => /screenshot/i.test(`${diagnostic.code} ${diagnostic.message}`))) {
    return "Capture screenshot evidence or explicitly configure a DOM/session-sufficient browser policy before strict closeout.";
  }
  return "Repair browser evidence manifest diagnostics before UI closeout.";
}

export function parseArgs(args = []) {
  const options = { apply: false };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (token === "--strict") {
      options.strict = true;
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
      addOptionValue(options, key, inlineValue);
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      addOptionValue(options, key, args[++index]);
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

export function addOptionValue(options, key, value) {
  if (options[key] == null || options[key] === false) {
    options[key] = value;
  } else if (Array.isArray(options[key])) {
    options[key].push(value);
  } else {
    options[key] = [options[key], value];
  }
}

export function parsePathList(value) {
  if (Array.isArray(value)) return value.flatMap(parsePathList);
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((item) => normalizeRelativePath(item.replace(/^`|`$/g, "").trim()))
    .filter(Boolean);
}

export function parseTextList(value) {
  if (Array.isArray(value)) return value.flatMap(parseTextList);
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter((item) => item && !["none", "null", "n/a", "not_applicable", "[]"].includes(item.toLowerCase()));
}

export function parseScenarioResults(value) {
  const entries = parseTextList(value);
  return entries.map((entry, index) => {
    const equals = entry.match(/^([^=:]+)=(pass|warn|block|not_applicable|fail|failed|passed|warning):(.*)$/i);
    if (equals) {
      return normalizeScenarioResult({ scenario_id: equals[1].trim(), status: normalizeStatus(equals[2]), observed_result: equals[3].trim() });
    }
    const colon = entry.match(/^([^:]+):(pass|warn|block|not_applicable|fail|failed|passed|warning):(.*)$/i);
    if (colon) {
      return normalizeScenarioResult({ scenario_id: colon[1].trim(), status: normalizeStatus(colon[2]), observed_result: colon[3].trim() });
    }
    return normalizeScenarioResult({ scenario_id: `scenario-${index + 1}`, status: "pass", observed_result: entry });
  }).filter(Boolean);
}

export function normalizeScenarioResult(value) {
  if (!value || typeof value !== "object") return null;
  const scenarioId = normalizeText(value.scenario_id ?? value.scenarioId ?? value.id);
  const status = normalizeStatus(value.status ?? "pass");
  const observedResult = normalizeText(value.observed_result ?? value.observedResult ?? value.observed ?? value.result);
  if (!scenarioId || !status || !observedResult) return null;
  return { scenario_id: scenarioId, status, observed_result: observedResult };
}

export function normalizeBrowserMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  const aliases = {
    codex: "codex_browser",
    codex_browser_session: "codex_browser",
    codexbrowser: "codex_browser",
    playwright_trace: "playwright",
    playwright_screenshot_trace: "playwright",
    real_browser: "codex_browser",
    edge: "edge_cdp",
    msedge: "edge_cdp",
    microsoft_edge: "edge_cdp",
    edge_cdp: "edge_cdp",
    msedge_cdp: "edge_cdp",
    microsoft_edge_cdp: "edge_cdp",
    chrome: "chrome_cdp",
    google_chrome: "chrome_cdp",
    chrome_cdp: "chrome_cdp",
    chromium_cdp: "chrome_cdp"
  };
  const mode = aliases[normalized] ?? normalized;
  return BROWSER_MODES.has(mode) ? mode : null;
}

export function normalizeBrowserEngine(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("_", "-");
  if (["codex", "codex-browser", "codexbrowser"].includes(normalized)) return "codex-browser";
  if (["playwright", "chromium-playwright"].includes(normalized)) return "playwright";
  if (["edge", "edge-cdp", "msedge", "msedge-cdp", "microsoft-edge", "microsoft-edge-cdp"].includes(normalized)) return "edge-cdp";
  if (["chrome", "chrome-cdp", "google-chrome", "google-chrome-cdp", "chromium-cdp"].includes(normalized)) return "chrome-cdp";
  if (["static", "curl", "http-smoke", "manual", "not-applicable"].includes(normalized)) return normalized;
  return null;
}

export function browserEngineForMode(mode) {
  if (mode === "codex_browser") return "codex-browser";
  if (mode === "playwright" || mode === "screenshot_trace") return "playwright";
  if (mode === "edge_cdp") return "edge-cdp";
  if (mode === "chrome_cdp") return "chrome-cdp";
  if (mode === "static" || mode === "manual" || mode === "not_applicable") return mode;
  if (mode === "screenshot" || mode === "trace") return "manual";
  return null;
}

export function defaultBrowserMode({ requestedEngine, tracePath, sessionArtifactPath, screenshotPaths }) {
  if (requestedEngine === "codex-browser") return "codex_browser";
  if (requestedEngine === "playwright") return "playwright";
  if (requestedEngine === "edge-cdp") return "edge_cdp";
  if (requestedEngine === "chrome-cdp") return "chrome_cdp";
  if (tracePath && screenshotPaths.length > 0) return "playwright";
  if (sessionArtifactPath && screenshotPaths.length > 0) return "codex_browser";
  if (screenshotPaths.length > 0) return "codex_browser";
  return "static";
}

export function normalizeStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  const aliases = {
    passed: "pass",
    conditionally_passed: "conditional_pass",
    conditional: "conditional_pass",
    warning: "warn",
    failed: "block",
    fail: "block",
    blocked: "block",
    environment_blocked: "blocked_environment",
    agent_error: "not_run_agent_error",
    not_run: "not_run_agent_error",
    na: "not_applicable",
    n_a: "not_applicable"
  };
  return aliases[normalized] ?? normalized;
}

export function normalizeRelativePath(value) {
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

export function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function errorDiagnostic(field, code, message) {
  return { field, code, severity: "error", message };
}

export function warnDiagnostic(field, code, message) {
  return { field, code, severity: "warn", message };
}

export function isInside(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

