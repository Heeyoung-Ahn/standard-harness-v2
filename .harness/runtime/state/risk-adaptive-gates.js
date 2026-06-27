import fs from "node:fs";
import path from "node:path";

import {
  buildContextMeter,
  buildDocRoute,
  detectRiskOverlays,
  evaluateReproductionGate
} from "./v2-4-risk-adaptive.js";
import {
  normalizePacketHeaderValue,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent
} from "./lib/packet-markdown.js";

export const RISK_ADAPTIVE_GATE_SCHEMA_VERSION = "standard-harness-v2.5-risk-adaptive-gate/v1";

const IMPLEMENTATION_BLOCKING_OVERLAYS = new Set([
  "abstention-required",
  "dependency-sensitive",
  "secret-sensitive",
  "untrusted-content",
  "guard-mode"
]);

const CLOSEOUT_BLOCKING_OVERLAYS = new Set([
  "abstention-required",
  "dependency-sensitive",
  "secret-sensitive",
  "untrusted-content",
  "guard-mode",
  "browser-evidence",
  "evidence-quality",
  "release-canary"
]);

const OVERLAY_LABELS = {
  "abstention-required": "Abstention/Reproduction Gate",
  "dependency-sensitive": "Dependency Intake Gate",
  "secret-sensitive": "Secret Scan Gate",
  "untrusted-content": "Untrusted Content Gate",
  "guard-mode": "Guard/Freeze Gate",
  "browser-evidence": "Browser Evidence Gate",
  "evidence-quality": "Evidence Quality Gate",
  "release-canary": "Release/Canary Gate"
};

const PASS_VALUES = new Set(["pass", "passed", "allow", "allowed", "ok", "clean", "complete", "completed", "approved", "redacted", "stripped", "not-needed", "not needed", "not_applicable", "not-applicable", "none"]);
const FAIL_VALUES = new Set(["fail", "failed", "block", "blocked", "deny", "denied", "hold", "pending", "todo", "tbd", "unknown", "missing", "unclear", "not recorded", "not-recorded"]);

export function evaluateRiskAdaptiveGate({
  repoRoot = process.cwd(),
  content = "",
  packetPath = null,
  stage = "planning-open",
  effectiveRisk = "normal",
  changedFiles = [],
  options = {},
  transition = null,
  deliveryRouteMode = null,
  routeClass = null,
  gateProfile = null
} = {}) {
  const packetText = String(content ?? "");
  const lane = normalizeLaneValue(
    options.lane ??
      readPacketField(packetText, "Lane") ??
      readPacketField(packetText, "Lane type") ??
      options.defaultLane ??
      "standard"
  );
  const packetChangedFiles = extractChangedFiles({ content: packetText, changedFiles });
  const overlayOptions = {
    overlays: readPacketField(packetText, "Risk overlay") ?? readPacketField(packetText, "Risk overlays") ?? options.overlays,
    command: readPacketField(packetText, "Command") ?? readPacketField(packetText, "Repro command") ?? options.command,
    behaviorChange: hasAffirmativePacketField(packetText, ["Behavior change", "Behavior under test", "TDD required"]),
    bugFix: hasAffirmativePacketField(packetText, ["Bug fix", "Issue status", "Repro status"]),
    guard: hasAffirmativePacketField(packetText, ["Guard mode", "Freeze mode"])
  };
  const issueStatusForOverlay = readPacketField(packetText, "Issue status") ?? readPacketField(packetText, "Repro status");
  const codeChangeForOverlay = readPacketField(packetText, "Code change required");
  if (isMeaningful(issueStatusForOverlay)) overlayOptions.issueStatus = issueStatusForOverlay;
  if (isMeaningful(codeChangeForOverlay)) overlayOptions.codeChangeRequired = codeChangeForOverlay;
  let riskOverlays = detectRiskOverlays({
    changedFiles: packetChangedFiles,
    risk: effectiveRisk,
    text: [
      readPacketField(packetText, "Risk overlay"),
      readPacketField(packetText, "Risk overlays"),
      readPacketField(packetText, "Risk trigger"),
      readPacketField(packetText, "Risk triggers"),
      readPacketField(packetText, "Untrusted content source"),
      readPacketField(packetText, "Command"),
      readPacketField(packetText, "Repro command"),
      options.text
    ].filter(Boolean).join("\n"),
    options: overlayOptions,
    lane
  });
  if (riskOverlays.includes("guard-mode") && !isGuardModeExplicit({ packetText, options, effectiveRisk })) {
    riskOverlays = riskOverlays.filter((overlay) => overlay !== "guard-mode");
  }
  const phase = stage === "implementation-transition" ? "implementation" : stage === "closeout" ? "review" : "planning";
  const route = buildDocRoute({ lane, phase, risk: effectiveRisk, riskOverlays, changedFiles: packetChangedFiles });
  const contextMeter = buildContextMeter({ repoRoot, lane, route, readFiles: route.read, phase });
  const diagnostics = [];

  if (contextMeter.budgetStatus === "fail") {
    diagnostics.push(buildDiagnostic({
      overlay: "context-budget-v2",
      status: "hold",
      current: `${contextMeter.estimatedTokensRead}/${contextMeter.targetTokens} tokens; ${contextMeter.actualReadFiles}/${contextMeter.maxDocuments} files`,
      expected: "routed read set stays within lane context budget",
      message: `Context Budget v2 is over budget for lane ${lane}. Run harness:context-prune or reduce routed reads before broad reread; this is not an implementation blocker by itself.`
    }));
  }

  for (const overlay of riskOverlays) {
    diagnostics.push(...evaluateOverlay({ repoRoot, content: packetText, overlay, stage, packetChangedFiles }));
  }

  const blocking = diagnostics.some((diagnostic) => diagnostic.status === "block");
  return {
    schemaVersion: RISK_ADAPTIVE_GATE_SCHEMA_VERSION,
    ok: !blocking,
    blocking,
    gateEffect: stage === "implementation-transition" || stage === "closeout" ? "blocking" : "planning-advisory",
    stage,
    lane,
    phase,
    effectiveRisk,
    packetPath,
    changedFiles: packetChangedFiles,
    transition,
    deliveryRouteMode,
    routeClass,
    gateProfile,
    riskOverlays,
    routeSummary: {
      readCount: route.read.length,
      fallbackCount: route.fallback.length,
      targetTokens: route.budget?.targetTokens,
      maxDocuments: route.budget?.maxDocuments,
      humanManualAutoRead: route.read.some(isHumanManualPath)
    },
    contextBudget: {
      status: contextMeter.budgetStatus,
      estimatedTokensRead: contextMeter.estimatedTokensRead,
      targetTokens: contextMeter.targetTokens,
      actualReadFiles: contextMeter.actualReadFiles,
      maxDocuments: contextMeter.maxDocuments
    },
    diagnostics,
    nextAction: blocking
      ? "Resolve blocking V2.5 risk-adaptive overlay evidence before implementation transition or closeout."
      : riskOverlays.length > 0
        ? "Proceed with overlay-specific digest evidence attached to the packet or generated report path."
        : "No V2.5 overlay gate is currently required; keep default context lean."
  };
}

function evaluateOverlay({ repoRoot, content, overlay, stage, packetChangedFiles }) {
  const diagnostics = [];
  const required = isOverlayRequiredAtStage(overlay, stage);
  const nonBlockingStatus = stage === "planning-open" ? "hold" : "info";
  if (!required) {
    diagnostics.push(buildDiagnostic({
      overlay,
      status: "info",
      current: "detected",
      expected: "overlay evidence before closeout when the risk remains in scope",
      message: `${labelForOverlay(overlay)} is detected; evidence is not blocking at ${stage}.`
    }));
    return diagnostics;
  }

  if (overlay === "abstention-required") {
    const gate = evaluateReproductionGate({
      issueStatus: field(content, "Issue status") ?? field(content, "Repro status") ?? "unclear",
      codeChangeRequired: field(content, "Code change required") ?? "unknown",
      commandText: field(content, "Repro command") ?? field(content, "Command") ?? "not recorded",
      observed: field(content, "Observed result") ?? field(content, "Observed") ?? "not recorded",
      expected: field(content, "Expected result") ?? field(content, "Expected") ?? "not recorded",
      scope: field(content, "Scope") ?? field(content, "Repro scope") ?? "not recorded"
    });
    const implementation = stage === "implementation-transition";
    const pass = implementation ? gate.implementationAllowed : gate.ok || gate.noCodeChangeSuccessAllowed;
    diagnostics.push(buildDiagnostic({
      overlay,
      status: pass ? "pass" : "block",
      current: `${gate.issueStatus}; code-change=${gate.codeChangeRequired}; decision=${gate.decision}`,
      expected: implementation ? "confirmed/partial reproduction with codeChangeRequired yes" : "closed reproduction/abstention decision",
      message: pass
        ? `${labelForOverlay(overlay)} passed.`
        : `${labelForOverlay(overlay)} blocks ${stage}: ${gate.nextAction}`
    }));
    return diagnostics;
  }

  if (overlay === "dependency-sensitive") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Dependency intake report path", "Dependency intake evidence path", "Dependency report path"],
      statusFields: ["Dependency intake decision", "Dependency intake status", "Dependency gate status"],
      acceptJson: (json) => json?.ok === true || json?.decision === "allow",
      expected: "dependency intake report with decision allow"
    }));
    return diagnostics;
  }

  if (overlay === "secret-sensitive") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Secret scan report path", "Secret scan evidence path", "Security scan report path"],
      statusFields: ["Secret scan status", "Secret gate status"],
      acceptJson: (json) => json?.ok === true && Number(json?.highFindingCount ?? 0) === 0,
      expected: "secret scan report with zero high findings"
    }));
    return diagnostics;
  }

  if (overlay === "untrusted-content") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Untrusted content report path", "Untrusted content digest path", "Untrusted scan report path"],
      statusFields: ["Untrusted content status", "Untrusted gate status"],
      acceptJson: (json) => json?.ok === true,
      expected: "untrusted content scan/digest with executable instructions stripped or blocked"
    }));
    return diagnostics;
  }

  if (overlay === "guard-mode") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Guard report path", "Guard state path", "Freeze report path"],
      statusFields: ["Guard mode status", "Freeze mode status", "Guard decision"],
      acceptJson: (json) => json?.ok === true || json?.guardState?.mode === "frozen",
      expected: "guard/freeze report with valid edit boundary and no destructive command"
    }));
    return diagnostics;
  }

  if (overlay === "evidence-quality") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Evidence quality report path", "Evidence digest path", "TDD evidence report path"],
      statusFields: ["Evidence quality status", "Evidence gate status", "TDD evidence status"],
      acceptJson: (json) => json?.ok === true || json?.decision === "pass",
      expected: "evidence quality digest/report with RED/GREEN or approved exemption"
    }));
    return diagnostics;
  }

  if (overlay === "browser-evidence") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Browser evidence path", "Browser digest path", "QA evidence path"],
      statusFields: ["Browser evidence status", "QA evidence status"],
      acceptJson: (json) => json?.ok === true || json?.status === "pass",
      expected: "browser/QA evidence digest or explicit not-needed rationale"
    }));
    return diagnostics;
  }

  if (overlay === "release-canary") {
    diagnostics.push(evaluateReportOrStatus({
      repoRoot,
      content,
      overlay,
      stage,
      reportFields: ["Release canary report path", "Canary report path", "Release evidence path"],
      statusFields: ["Release canary status", "Release evidence status"],
      acceptJson: (json) => json?.ok === true || json?.status === "pass",
      expected: "release/canary evidence digest with rollback or hold condition"
    }));
    return diagnostics;
  }

  diagnostics.push(buildDiagnostic({
    overlay,
    status: nonBlockingStatus,
    current: "detected",
    expected: "no evaluator registered",
    message: `${labelForOverlay(overlay)} has no dedicated evaluator; treat as planning hold until evidence is named.`
  }));
  return diagnostics;
}

function evaluateReportOrStatus({ repoRoot, content, overlay, stage, reportFields, statusFields, acceptJson, expected }) {
  const reportPath = firstField(content, reportFields);
  const status = normalizeStatus(firstField(content, statusFields));
  if (status && PASS_VALUES.has(status)) {
    return buildDiagnostic({ overlay, status: "pass", current: status, expected, message: `${labelForOverlay(overlay)} passed by packet status.` });
  }
  if (status && FAIL_VALUES.has(status)) {
    return buildDiagnostic({ overlay, status: "block", current: status, expected, message: `${labelForOverlay(overlay)} blocks ${stage}: packet status is ${status}.` });
  }
  if (reportPath) {
    const resolved = resolveReportPath(repoRoot, reportPath);
    if (!resolved.safe || !fs.existsSync(resolved.absolutePath)) {
      return buildDiagnostic({ overlay, status: "block", current: reportPath, expected, message: `${labelForOverlay(overlay)} report path is missing or unsafe.` });
    }
    const json = readJsonIfPossible(resolved.absolutePath);
    if (json && acceptJson(json)) {
      return buildDiagnostic({ overlay, status: "pass", current: reportPath, expected, message: `${labelForOverlay(overlay)} passed by report artifact.` });
    }
    if (json) {
      return buildDiagnostic({ overlay, status: "block", current: reportPath, expected, message: `${labelForOverlay(overlay)} report exists but does not satisfy the required decision.` });
    }
    return buildDiagnostic({ overlay, status: "pass", current: reportPath, expected, message: `${labelForOverlay(overlay)} report path exists; non-JSON artifact accepted as digest evidence.` });
  }
  return buildDiagnostic({
    overlay,
    status: isOverlayRequiredAtStage(overlay, stage) ? "block" : "hold",
    current: "missing",
    expected,
    message: `${labelForOverlay(overlay)} requires packet status or report path before ${stage}.`
  });
}

function isOverlayRequiredAtStage(overlay, stage) {
  if (stage === "implementation-transition") return IMPLEMENTATION_BLOCKING_OVERLAYS.has(overlay);
  if (stage === "closeout") return CLOSEOUT_BLOCKING_OVERLAYS.has(overlay);
  return false;
}

function extractChangedFiles({ content, changedFiles }) {
  const explicit = Array.isArray(changedFiles) ? changedFiles : [];
  const packetValues = [
    field(content, "Files expected"),
    field(content, "Files changed"),
    field(content, "Changed files"),
    field(content, "Files"),
    field(content, "Modified files")
  ].filter(Boolean);
  return unique([...explicit, ...packetValues.flatMap(splitList)]).map(normalizeRelativePath).filter(Boolean);
}

function firstField(content, names) {
  for (const name of names) {
    const value = field(content, name);
    if (isMeaningful(value)) return value.trim();
  }
  return "";
}

function field(content, name) {
  return readPacketField(content, name) ?? "";
}

function readPacketField(content, name) {
  return readPacketBulletFieldValueFromContent(content, name) ?? readPacketHeaderValueFromContent(content, name) ?? null;
}

function hasAffirmativePacketField(content, names) {
  return names.some((name) => {
    const value = readPacketField(content, name);
    if (!value) return false;
    const normalized = normalizePacketHeaderValue(value);
    return !["no", "none", "not-needed", "not needed", "not-applicable", "not_applicable", "false", "missing", "pending", "unknown"].includes(normalized);
  });
}

function isGuardModeExplicit({ packetText, options = {}, effectiveRisk }) {
  if (normalizeStatus(effectiveRisk) === "critical") return true;
  if (options.guard === true || options.freeze === true) return true;
  if (hasAffirmativePacketField(packetText, ["Guard mode", "Freeze mode", "Guard required", "Freeze required", "Guard/Freeze Gate"])) return true;
  const commandText = [
    readPacketField(packetText, "Command"),
    readPacketField(packetText, "Repro command"),
    readPacketField(packetText, "Destructive command"),
    options.command,
    options.text
  ].filter(Boolean).join("\n");
  return looksDestructiveCommand(commandText);
}

function looksDestructiveCommand(value) {
  const text = String(value ?? "");
  if (!text.trim()) return false;
  return [
    /\brm\s+-[^\n]*[rf][^\n]*\s+(?:\.|\/|~|\*)/i,
    /\bgit\s+push\b[^\n]*(?:--force|-f)\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+-[^\n]*(?:x|f|d){2,}/i,
    /\bRemove-Item\b[^\n]*(?:-Recurse|-r)\b[^\n]*(?:-Force|-f)\b/i,
    /\b(?:del|erase)\b[^\n]*(?:\/s|\/q)/i,
    /\brmdir\b[^\n]*(?:\/s|\/q)/i,
    /\bDROP\s+(?:TABLE|DATABASE)\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bkubectl\s+delete\b/i,
    /\bterraform\s+destroy\b/i,
    /\b(?:aws|az|gcloud)\b[^\n]*\bdelete\b/i
  ].some((pattern) => pattern.test(text));
}

function buildDiagnostic({ overlay, status, current, expected, message }) {
  return {
    field: labelForOverlay(overlay),
    overlay,
    status,
    current,
    expected,
    reason: message,
    message
  };
}

function labelForOverlay(overlay) {
  return OVERLAY_LABELS[overlay] ?? overlay;
}

function normalizeLaneValue(value) {
  const normalized = normalizePacketHeaderValue(value);
  if (["minimal", "micro"].includes(normalized)) return "micro";
  if (["docs", "docs-only", "documentation-only"].includes(normalized)) return "docs-only";
  if (["light", "standard", "strict", "release", "investigation"].includes(normalized)) return normalized;
  if (["contract", "full-governance"].includes(normalized)) return "standard";
  return "standard";
}

function normalizeStatus(value) {
  return normalizePacketHeaderValue(value ?? "");
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/");
  if (!text || text === ".") return "";
  if (path.isAbsolute(text)) return "";
  const normalized = path.posix.normalize(text);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === "..") return "";
  return normalized;
}

function resolveReportPath(repoRoot, value) {
  const normalized = normalizeRelativePath(String(value ?? "").split(/\s+/)[0]);
  if (!normalized) return { safe: false, relativePath: "", absolutePath: "" };
  const absolutePath = path.resolve(repoRoot, normalized);
  const root = path.resolve(repoRoot);
  return { safe: absolutePath === root || absolutePath.startsWith(`${root}${path.sep}`), relativePath: normalized, absolutePath };
}

function readJsonIfPossible(absolutePath) {
  if (!absolutePath.endsWith(".json")) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

function isMeaningful(value) {
  const normalized = normalizeStatus(value);
  return Boolean(normalized) && !["pending", "todo", "tbd", "unknown", "missing", "not recorded", "not-recorded"].includes(normalized);
}

function splitList(value) {
  return String(value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isHumanManualPath(rel) {
  return rel === "START_HERE.md" || rel.startsWith("reference/manuals/human/") || rel.includes("HARNESS_MANUAL.md");
}
