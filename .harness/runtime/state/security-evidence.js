import fs from "node:fs";
import path from "node:path";

import {
  normalizePacketHeaderValue,
  readPacketBulletFieldValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";
import { hasUnredactedHighOrMediumSecret, redactSensitiveText, scanSensitiveText } from "../security/redact-engine.js";

const SECURITY_SECTION = "## CSO Security Review";
const SENSITIVE_PATTERNS = [
  /(?:^|\/)\.env(?:\.|$|\/)/i,
  /secret|credential|token|oauth|apikey|api-key|webhook|auth|permission|rbac|role/i,
  /package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$|bun\.lockb?$|ci\/|\.github\/workflows\//i
];
const REQUIRED_CSO_PHASES = new Set([0, 1, 12, 13, 14]);
const VALID_CSO_MODES = new Set(["daily", "comprehensive", "scoped", "diff", "release"]);

export function evaluateSecurityReviewEvidence({ repoRoot = process.cwd(), content = "", packetPath = null, workItemId = null, stage = "planning-open", effectiveRisk = "low", changedFiles = [] } = {}) {
  const section = sliceSection(content, SECURITY_SECTION) ?? content;
  const fields = {
    status: normalizePacketHeaderValue(readField(section, "Security review evidence status") ?? readField(section, "CSO review status")),
    reportPath: stripTicks(readField(section, "Security review report path") ?? readField(section, "CSO report path")),
    decision: normalizePacketHeaderValue(readField(section, "Security review decision") ?? readField(section, "CSO decision")),
    scope: readField(section, "Security review evidence scope") ?? readField(section, "CSO scope")
  };
  const sensitiveFiles = changedFiles.filter((file) => SENSITIVE_PATTERNS.some((pattern) => pattern.test(file)));
  const required = ["high", "critical"].includes(effectiveRisk) || sensitiveFiles.length > 0 || mentionsSecuritySensitive(content);
  const closeout = stage === "closeout";
  const diagnostics = [];
  let report = null;

  if (required && closeout && !["pass", "approved", "not-needed"].includes(fields.status)) {
    diagnostics.push(diagnostic({ field: "Security review evidence status", status: "block", current: fields.status || "missing", expected: "pass | approved | not-needed with rationale", message: "Required CSO/security review evidence is not closed at packet closeout." }));
  }

  if (fields.reportPath) {
    const loaded = readSecurityReport(repoRoot, fields.reportPath);
    if (!loaded.ok) {
      diagnostics.push(diagnostic({ field: "Security review report path", status: closeout ? "block" : "hold", current: fields.reportPath, expected: "readable JSON report", message: loaded.error }));
    } else {
      report = loaded.report;
      diagnostics.push(...validateReportBinding({ report, packetPath, workItemId, closeout }));
      diagnostics.push(...validateReportEnvelope({ report, closeout }));
      diagnostics.push(...validateReportFindings({ report, closeout }));
      diagnostics.push(...validateReportRedaction({ report, closeout }));
    }
  } else if (required && closeout) {
    diagnostics.push(diagnostic({ field: "Security review report path", status: "block", current: "missing", expected: "packet-bound CSO report JSON", message: "Required security review must link a packet-bound JSON report." }));
  }

  const blocking = closeout && diagnostics.some((item) => item.status === "block");
  return {
    schemaVersion: "standard-harness-security-review/v2.2",
    ok: !blocking,
    required,
    effectiveRisk,
    sensitiveFiles,
    fields,
    report,
    diagnostics,
    blocking
  };
}

export { redactSensitiveText };

export function buildSecurityReviewScaffold({
  packetPath,
  workItemId,
  mode = "scoped",
  decision = "pending",
  phases = [0, 1, 12, 13, 14],
  findings = [],
  deferredRisks = [],
  scope = "packet-bound security review scaffold"
} = {}) {
  const normalizedFindings = Array.isArray(findings) ? findings : [];
  const normalizedDeferredRisks = Array.isArray(deferredRisks) ? deferredRisks : [];
  return {
    schema_version: "standard-harness-security-review/v2.2",
    packet_path: packetPath ?? null,
    work_item_id: workItemId ?? null,
    mode,
    decision,
    scope,
    phases_run: phases.map(Number).filter((phase) => Number.isInteger(phase)),
    findings: normalizedFindings,
    deferred_risks: normalizedDeferredRisks,
    filter_stats: {
      raw_findings: normalizedFindings.length,
      suppressed_findings: normalizedFindings.filter((finding) => {
        const status = normalizePacketHeaderValue(finding?.status ?? "");
        return ["suppressed", "false-positive", "false_positive"].includes(status);
      }).length,
      main_findings: normalizedFindings.filter((finding) => {
        const status = normalizePacketHeaderValue(finding?.status ?? "");
        return !["suppressed", "false-positive", "false_positive"].includes(status);
      }).length
    }
  };
}

function readField(content, label) { return readPacketBulletFieldValueFromContent(content, label); }
function stripTicks(value) { return value ? String(value).trim().replace(/^`|`$/g, "") : null; }
function mentionsSecuritySensitive(content) { return /security-sensitive|auth\b|permission|secret|credential|webhook|dependency supply chain|ci\/cd|cso|threat model/i.test(content); }

function readSecurityReport(repoRoot, relativePath) {
  const target = path.resolve(repoRoot, relativePath);
  const root = path.resolve(repoRoot);
  if (!target.startsWith(root)) return { ok: false, error: `Security report path escapes repository root: ${relativePath}.` };
  if (!fs.existsSync(target)) return { ok: false, error: `Security report does not exist: ${relativePath}.` };
  try { return { ok: true, report: JSON.parse(fs.readFileSync(target, "utf8")) }; }
  catch (error) { return { ok: false, error: `Security report JSON is unreadable: ${error.message}.` }; }
}

function validateReportBinding({ report, packetPath, workItemId, closeout }) {
  const diagnostics = [];
  const reportPacketPath = report.packet_path ?? report.packetPath ?? report.packet_id ?? report.packetId;
  const reportWorkItemId = report.work_item_id ?? report.workItemId;
  if (packetPath && reportPacketPath && !matchesPacket(reportPacketPath, packetPath)) diagnostics.push(diagnostic({ field: "Security report packet binding", status: closeout ? "block" : "hold", current: reportPacketPath, expected: packetPath, message: "Security report is not bound to the active packet." }));
  if (workItemId && reportWorkItemId && String(reportWorkItemId) !== String(workItemId)) diagnostics.push(diagnostic({ field: "Security report work item binding", status: closeout ? "block" : "hold", current: reportWorkItemId, expected: workItemId, message: "Security report is not bound to the active work item." }));
  if (!reportPacketPath && !reportWorkItemId) diagnostics.push(diagnostic({ field: "Security report binding", status: closeout ? "block" : "hold", current: "missing", expected: "packet_id/packet_path or work_item_id", message: "Security report must identify the packet or work item it reviews." }));
  return diagnostics;
}

function validateReportEnvelope({ report, closeout }) {
  const diagnostics = [];
  const mode = normalizePacketHeaderValue(report.mode ?? "daily");
  const phases = Array.isArray(report.phases_run ?? report.phasesRun) ? (report.phases_run ?? report.phasesRun).map(Number) : [];
  if (!VALID_CSO_MODES.has(mode)) diagnostics.push(diagnostic({ field: "CSO mode", status: closeout ? "block" : "hold", current: mode || "missing", expected: "daily | comprehensive | scoped | diff | release", message: "CSO report must declare a recognized audit mode." }));
  for (const phase of REQUIRED_CSO_PHASES) {
    if (!phases.includes(phase)) diagnostics.push(diagnostic({ field: "CSO phases run", status: closeout ? "block" : "hold", current: phases.join(",") || "missing", expected: "0, 1, 12, 13, 14", message: `CSO report must record required phase ${phase} as run.` }));
  }
  if (!report.filter_stats && !report.filterStats) diagnostics.push(diagnostic({ field: "CSO filter stats", status: "hold", current: "missing", expected: "filter_stats with raw/suppressed/main counts", message: "CSO report should include filter_stats to document false-positive suppression quality." }));
  return diagnostics;
}

function validateReportFindings({ report, closeout }) {
  const diagnostics = [];
  const decision = normalizePacketHeaderValue(report.decision ?? "");
  const mode = normalizePacketHeaderValue(report.mode ?? "daily");
  const findings = Array.isArray(report.findings) ? report.findings : [];
  if (["block", "blocked", "fail", "failed"].includes(decision)) diagnostics.push(diagnostic({ field: "Security review decision", status: closeout ? "block" : "hold", current: decision, expected: "pass or pass_with_findings without open high/critical findings", message: "Security review decision blocks closeout." }));
  for (const [index, finding] of findings.entries()) {
    const severity = normalizePacketHeaderValue(finding.severity ?? "");
    const status = normalizePacketHeaderValue(finding.status ?? "open");
    const confidence = Number(finding.confidence ?? finding.confidence_score ?? finding.confidenceScore);
    const highImpact = ["high", "critical"].includes(severity);
    for (const [field, value] of [
      ["file", finding.file],
      ["line", finding.line],
      ["evidence_quote_redacted", finding.evidence_quote_redacted ?? finding.evidenceExcerptRedacted ?? finding.evidence_excerpt_redacted],
      ["exploit_scenario", finding.exploit_scenario ?? finding.exploitScenario],
      ["impact", finding.impact],
      ["recommendation", finding.recommendation],
      ["fingerprint", finding.fingerprint ?? finding.id]
    ]) {
      if (!isClosedValue(value)) diagnostics.push(diagnostic({ field: `Security finding ${field}`, status: closeout ? "block" : "hold", current: finding.title ?? `${severity || "finding"}#${index + 1}`, expected: field, message: `Security finding ${index + 1} requires ${field}.` }));
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 10) diagnostics.push(diagnostic({ field: "Security finding confidence", status: closeout ? "block" : "hold", current: finding.confidence ?? "missing", expected: "0-10", message: "Security finding confidence must be 0-10." }));
    if (mode === "daily" && Number.isFinite(confidence) && confidence < 8 && !["suppressed", "false-positive", "false_positive"].includes(status)) diagnostics.push(diagnostic({ field: "Security finding confidence", status: closeout ? "block" : "hold", current: String(confidence), expected: ">= 8 in daily main report", message: "Daily CSO main findings require confidence >= 8 or suppression." }));
    const phase = Number(finding.phase ?? finding.cso_phase ?? finding.csoPhase);
    if (!Number.isInteger(phase) || phase < 0 || phase > 14) diagnostics.push(diagnostic({ field: "Security finding phase", status: closeout ? "block" : "hold", current: finding.phase ?? "missing", expected: "0-14", message: "Security finding must cite the CSO phase that produced it." }));
    if (highImpact && !["fixed", "false-positive", "false_positive", "accepted", "closed"].includes(status)) diagnostics.push(diagnostic({ field: "Security finding disposition", status: closeout ? "block" : "hold", current: `${severity}/${status}`, expected: "high/critical findings fixed, accepted, or false_positive with rationale", message: "Open high/critical security finding blocks closeout." }));
    if (highImpact && status === "accepted") {
      const approval = finding.accepted_risk ?? finding.acceptedRisk ?? {};
      if (!isClosedValue(approval.approved_by ?? approval.approvedBy) || !isClosedValue(approval.reason)) diagnostics.push(diagnostic({ field: "Accepted risk approval", status: closeout ? "block" : "hold", current: "missing", expected: "accepted_risk.approved_by and reason", message: "Accepted high/critical security risk requires explicit approval and rationale." }));
    }
  }
  return diagnostics;
}

function validateReportRedaction({ report, closeout }) {
  const diagnostics = [];
  const raw = JSON.stringify(report);
  const secretFindings = scanSensitiveText(raw).filter((finding) => !raw.includes(`[REDACTED:${finding.type}]`));
  if (secretFindings.length > 0) diagnostics.push(diagnostic({ field: "Security report redaction", status: closeout ? "block" : "hold", current: secretFindings.map((item) => item.type).join(", "), expected: "redacted sensitive values", message: "Security review artifact contains raw secret-like material." }));
  for (const finding of Array.isArray(report.findings) ? report.findings : []) {
    const quote = finding.evidence_quote_redacted ?? finding.evidence_excerpt_redacted ?? finding.evidenceExcerptRedacted ?? "";
    if (quote && (String(quote) !== redactSensitiveText(quote) || hasUnredactedHighOrMediumSecret(quote))) diagnostics.push(diagnostic({ field: "Security finding redaction", status: closeout ? "block" : "hold", current: "raw secret-like evidence", expected: "redacted excerpt", message: "Security finding evidence must contain redacted excerpts only." }));
  }
  return diagnostics;
}

function matchesPacket(left, right) { const normalize = (value) => String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, ""); return normalize(left) === normalize(right) || path.basename(normalize(left)) === path.basename(normalize(right)); }
function isClosedValue(value) { const normalized = normalizePacketHeaderValue(value ?? ""); return Boolean(value) && !["pending", "draft", "todo", "tbd", "unknown", "missing", "fail", "hold"].includes(normalized); }
function diagnostic({ field, status, current, expected, message }) { return { field, status, current, expected, message, reason: message, code: "security_review_evidence" }; }
