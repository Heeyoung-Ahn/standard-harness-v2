export const CLOSEOUT_EVIDENCE_INDEX_SCHEMA_VERSION = "standard-harness-closeout-evidence-index/v1";
export const CLOSEOUT_REPORT_SCHEMA_VERSION = "standard-harness-closeout-report/v1";
export const MAX_CLOSEOUT_REPORT_BODY_LINES = 120;

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  "evidenceId",
  "evidenceType",
  "sourcePath",
  "status",
  "trustStatus",
  "freshnessStatus",
  "resolutionStatus",
  "redactionStatus"
]);

const PASSING_STATUSES = new Set(["pass", "passed", "PASS", "not_applicable_recorded", "N/A_RECORDED"]);
const TRUSTED_STATUSES = new Set(["trusted", "accepted-risk"]);
const FRESH_STATUSES = new Set(["fresh"]);
const RESOLVED_STATUSES = new Set(["resolved", "not-applicable"]);
const RAW_EVIDENCE_MARKERS = ["```", "BEGIN LOG", "Traceback (most recent call last)", "npm ERR!", "at Object.<anonymous>"];

export function buildEvidenceIndex({
  packetId,
  entries = [],
  requiredGates = [],
  generatedBy = "closeout-evidence-index-validator"
} = {}) {
  const normalizedPacketId = normalizeText(packetId) || "unknown-packet";
  return {
    schemaVersion: CLOSEOUT_EVIDENCE_INDEX_SCHEMA_VERSION,
    packetId: normalizedPacketId,
    evidenceIndexPath: `_ops/evidence/${normalizedPacketId}/evidence-index.json`,
    generatedBy,
    requiredGates: [...requiredGates],
    entries: entries.map(normalizeEvidenceEntry)
  };
}

export function validateEvidenceIndex({ index, requiredGates = [] } = {}) {
  const diagnostics = [];
  if (!index || typeof index !== "object") {
    return { ok: false, diagnostics: [{ code: "invalid_evidence_index", field: "index" }] };
  }
  const entries = Array.isArray(index.entries) ? index.entries.map(normalizeEvidenceEntry) : [];
  if (!Array.isArray(index.entries)) diagnostics.push({ code: "invalid_evidence_entries", field: "entries" });

  for (const [entryIndex, entry] of entries.entries()) {
    for (const field of REQUIRED_EVIDENCE_FIELDS) {
      if (!normalizeText(entry[field])) {
        diagnostics.push({ code: "missing_evidence_index_field", field, entryIndex });
      }
    }
    if (entry.status === "not_applicable_recorded") {
      const na = entry.naRecord ?? {};
      if (!normalizeText(na.reason)) diagnostics.push({ code: "invalid_na_record", field: "reason", evidenceId: entry.evidenceId });
      if (!normalizeText(na.substituteCheck)) diagnostics.push({ code: "invalid_na_record", field: "substituteCheck", evidenceId: entry.evidenceId });
      if (!normalizeText(na.evidenceLink)) diagnostics.push({ code: "invalid_na_record", field: "evidenceLink", evidenceId: entry.evidenceId });
    }
  }

  for (const gate of requiredGates) {
    const matching = entries.find((entry) => entry.requiredGate === gate);
    if (!matching) {
      diagnostics.push({ code: "missing_required_gate_evidence", gate });
      continue;
    }
    if (!PASSING_STATUSES.has(matching.status)) {
      diagnostics.push({ code: "required_gate_not_passing", gate, evidenceId: matching.evidenceId, status: matching.status });
    }
    if (!TRUSTED_STATUSES.has(matching.trustStatus)) {
      diagnostics.push({ code: "required_gate_untrusted", gate, evidenceId: matching.evidenceId, trustStatus: matching.trustStatus });
    }
    if (!FRESH_STATUSES.has(matching.freshnessStatus)) {
      diagnostics.push({ code: "required_gate_stale", gate, evidenceId: matching.evidenceId, freshnessStatus: matching.freshnessStatus });
    }
    if (!RESOLVED_STATUSES.has(matching.resolutionStatus)) {
      diagnostics.push({ code: "required_gate_unresolved", gate, evidenceId: matching.evidenceId, resolutionStatus: matching.resolutionStatus });
    }
  }

  return { ok: diagnostics.length === 0, diagnostics };
}

export function buildCloseoutReport({
  packetId,
  sections = {},
  evidenceIndexPath = null,
  evidenceIndex = null
} = {}) {
  const normalizedPacketId = normalizeText(packetId) || "unknown-packet";
  const reportPath = `product/docs/packets/${normalizedPacketId}/closeout.md`;
  const resolvedEvidenceIndexPath =
    evidenceIndexPath || evidenceIndex?.evidenceIndexPath || `_ops/evidence/${normalizedPacketId}/evidence-index.json`;
  const normalizedSections = {
    originalIntent: sections.originalIntent ?? sections.packetObjective ?? "N/A",
    implementedResult: sections.implementedResult ?? sections.actualChanges ?? "N/A",
    acceptanceStatus: sections.acceptanceStatus ?? "N/A",
    testEvidenceSummary: sections.testEvidenceSummary ?? sections.testEvidenceAndTrustStatus ?? "N/A",
    reviewEvidenceSummary: sections.reviewEvidenceSummary ?? sections.requirementsReview ?? "N/A",
    remainingRisks: sections.remainingRisks ?? "N/A",
    followUpWork: sections.followUpWork ?? sections.followUpPacketRequired ?? "N/A",
    wikiMemoryUpdates: sections.wikiMemoryUpdates ?? sections.wikiProposalSummary ?? "N/A",
    pmImpact: sections.pmImpact ?? "N/A"
  };
  const markdown = renderCloseoutMarkdown({ packetId: normalizedPacketId, sections: normalizedSections, evidenceIndexPath: resolvedEvidenceIndexPath });
  return {
    schemaVersion: CLOSEOUT_REPORT_SCHEMA_VERSION,
    packetId: normalizedPacketId,
    reportPath,
    artifactPath: reportPath,
    evidenceIndexPath: resolvedEvidenceIndexPath,
    sections: normalizedSections,
    markdown
  };
}

export function validateCloseoutReport({ report, evidenceIndex = null, requiredGates = [] } = {}) {
  const diagnostics = [];
  if (!report || typeof report !== "object") {
    return { ok: false, diagnostics: [{ code: "invalid_closeout_report", field: "report" }] };
  }
  const reportPath = normalizeText(report.reportPath ?? report.artifactPath ?? report.artifact_path);
  if (!reportPath.startsWith("product/docs/packets/")) {
    diagnostics.push({ code: "invalid_closeout_report_path", reportPath });
  }
  const markdown = normalizeText(report.markdown);
  const bodyLines = markdown.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("[Evidence index]")).length;
  if (bodyLines > MAX_CLOSEOUT_REPORT_BODY_LINES) {
    diagnostics.push({ code: "closeout_report_too_long", bodyLines, maxBodyLines: MAX_CLOSEOUT_REPORT_BODY_LINES });
  }
  if (RAW_EVIDENCE_MARKERS.some((marker) => markdown.includes(marker))) {
    diagnostics.push({ code: "raw_evidence_dump_in_report" });
  }
  const indexPath = normalizeText(report.evidenceIndexPath ?? report.evidence_index_path);
  if (!indexPath.startsWith("_ops/evidence/")) {
    diagnostics.push({ code: "missing_evidence_index_link", field: "evidenceIndexPath" });
  }
  if (evidenceIndex) {
    diagnostics.push(...validateEvidenceIndex({ index: evidenceIndex, requiredGates }).diagnostics);
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

export function validateWikiProposalBoundary({ paths = [] } = {}) {
  const diagnostics = [];
  for (const candidate of paths) {
    const normalized = normalizePath(candidate);
    if (normalized.startsWith("_ops/wiki/")) {
      diagnostics.push({ code: "documenter_direct_wiki_mutation", path: candidate });
    }
    if (normalized.includes("..")) {
      diagnostics.push({ code: "unsafe_wiki_proposal_path", path: candidate });
    }
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

function normalizeEvidenceEntry(entry) {
  const source = entry && typeof entry === "object" ? entry : {};
  return {
    evidenceId: normalizeText(source.evidenceId ?? source.id),
    evidenceType: normalizeText(source.evidenceType ?? source.type),
    sourcePath: normalizeText(source.sourcePath ?? source.path),
    status: normalizeText(source.status),
    trustStatus: normalizeText(source.trustStatus ?? source.trust),
    freshnessStatus: normalizeText(source.freshnessStatus ?? source.freshness),
    resolutionStatus: normalizeText(source.resolutionStatus ?? source.resolution),
    redactionStatus: normalizeText(source.redactionStatus ?? source.redaction),
    sensitivity: normalizeText(source.sensitivity ?? "none"),
    requiredGate: normalizeText(source.requiredGate ?? source.gate),
    claimId: normalizeText(source.claimId ?? source.claim),
    acceptanceId: normalizeText(source.acceptanceId ?? source.acceptance),
    naRecord: source.naRecord ?? source.na_record ?? null
  };
}

function renderCloseoutMarkdown({ packetId, sections, evidenceIndexPath }) {
  const labels = [
    ["Original intent", sections.originalIntent],
    ["Implemented result", sections.implementedResult],
    ["Acceptance status", sections.acceptanceStatus],
    ["Test evidence summary", sections.testEvidenceSummary],
    ["Review evidence summary", sections.reviewEvidenceSummary],
    ["Remaining risks", sections.remainingRisks],
    ["Follow-up work", sections.followUpWork],
    ["Wiki / memory updates", sections.wikiMemoryUpdates],
    ["PM impact", sections.pmImpact]
  ];
  const lines = [`# ${packetId} Closeout Report`, "", `[Evidence index](${evidenceIndexPath})`, ""];
  for (const [label, value] of labels) {
    lines.push(`## ${label}`, formatValue(value), "");
  }
  return `${lines.join("\n").trim()}\n`;
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.map((item) => `- ${item}`).join("\n") : "N/A";
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `- ${key}: ${item}`).join("\n") || "N/A";
  return normalizeText(value) || "N/A";
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePath(value) {
  return normalizeText(value).replace(/\\/g, "/").replace(/^\/+/, "");
}
