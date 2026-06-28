const REQUIRED_PMO_FOLDERS = [
  "day-wrap-up",
  "wbs"
];
const PMO_STRUCTURED_STATE_RECORDS = [
  "source-intake",
  "daily-reports",
  "status",
  "risks",
  "blockers"
];
const GENERATED_PMO_VIEW_FOLDERS = ["day-start"];
const FORBIDDEN_PMO_FOLDERS = ["daily-wrap-up"];
const PMO_SURFACE_CONTRACT = {
  humanMarkdownFolders: ["day-wrap-up"],
  structuredFolders: ["wbs"],
  generatedViews: GENERATED_PMO_VIEW_FOLDERS,
  structuredStateRecords: PMO_STRUCTURED_STATE_RECORDS,
  forbiddenFolders: FORBIDDEN_PMO_FOLDERS
};

const REQUIRED_WBS_COLUMNS = [
  "wbs_id",
  "parent_id",
  "packet_id",
  "title",
  "status",
  "owner_role",
  "priority",
  "risk_level",
  "planned_start",
  "planned_finish",
  "evidence_index_path",
  "closeout_report_path",
  "updated_at"
];

const REPORT_LINE_LIMIT = 60;
const APPROVAL_AUTHORITY_TERMS = [
  "pm approves implementation",
  "pm approves testing",
  "pm approves review",
  "pm approves release",
  "pm approves closeout",
  "pm approves residual risk",
  "pmo approves implementation",
  "pmo approves testing",
  "pmo approves review",
  "pmo approves release",
  "pmo approves closeout",
  "pmo approves residual risk"
];

function buildDayStartReport(sources = {}) {
  const reportDate = text(sources.reportDate);
  const packetId = text(sources.packetId) || "unknown-packet";
  const markdown = renderReport({
    title: `Day Start ${reportDate}`,
    sections: [
      ["Last State", [packetLabel(sources)]],
      ["Next Work", [text(sources.nextWork)]],
      ["Blockers", list(sources.blockers)],
      ["Risks", list(sources.risks)],
      ["Decisions Needed", list(sources.decisionsNeeded)],
      ["Sources", sourceLines(sources)]
    ]
  });
  return report({
    reportType: "day-start",
    persistence: "generated-view",
    reportPathPrefix: "_ops/views/pmo",
    reportDate,
    packetId,
    sourceWatermark: sources.sourceWatermark,
    evidenceIndexPath: sources.evidenceIndexPath,
    markdown
  });
}

function buildDayWrapUpReport(sources = {}) {
  const reportDate = text(sources.reportDate);
  const packetId = text(sources.packetId) || "unknown-packet";
  const markdown = renderReport({
    title: `Day Wrap-Up ${reportDate}`,
    sections: [
      ["Completed Work", list(sources.completedWork)],
      ["Incomplete Work", list(sources.incompleteWork)],
      ["New Risks", list(sources.risks)],
      ["WBS Changes", list(sources.wbsChanges)],
      ["Next Work", [text(sources.nextWork)]],
      ["Blockers", list(sources.blockers)],
      ["Questions", list(sources.questions)],
      ["Sources", sourceLines(sources)]
    ]
  });
  return report({
    reportType: "day-wrap-up",
    persistence: "durable-markdown",
    reportPathPrefix: "product/docs/pmo",
    reportDate,
    packetId,
    sourceWatermark: sources.sourceWatermark,
    evidenceIndexPath: sources.evidenceIndexPath,
    markdown
  });
}

function validatePmoReport({ report, canonicalSourceWatermark = undefined } = {}) {
  const diagnostics = [];
  const markdown = text(report?.markdown);
  const evidenceIndexPath = text(report?.evidenceIndexPath);
  if (report?.authority !== "coordination-only") {
    diagnostics.push({ code: "pmo_report_invalid_authority", field: "authority" });
  }
  if (bodyLineCount(markdown) > REPORT_LINE_LIMIT) {
    diagnostics.push({ code: "pmo_report_too_long", field: "markdown" });
  }
  if (!evidenceIndexPath || !markdown.includes(evidenceIndexPath)) {
    diagnostics.push({ code: "pmo_report_missing_evidence_index_link", field: "evidenceIndexPath" });
  }
  if (canonicalSourceWatermark !== undefined && Number(report?.sourceWatermark || 0) < Number(canonicalSourceWatermark)) {
    diagnostics.push({ code: "pmo_report_stale", field: "sourceWatermark" });
  }
  const lowerMarkdown = markdown.toLowerCase();
  if (APPROVAL_AUTHORITY_TERMS.some((term) => lowerMarkdown.includes(term))) {
    diagnostics.push({ code: "pmo_report_claims_approval_authority", field: "markdown" });
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

function validatePmoPlacement({ paths = [] } = {}) {
  const normalized = new Set(paths.map((item) => text(item).replaceAll("\\", "/")));
  const diagnostics = [];
  for (const folder of REQUIRED_PMO_FOLDERS) {
    const expected = `product/docs/pmo/${folder}`;
    if (!normalized.has(expected)) {
      diagnostics.push({ code: "missing_pmo_folder", path: expected });
    }
  }
  for (const folder of FORBIDDEN_PMO_FOLDERS) {
    const legacy = `product/docs/pmo/${folder}`;
    if (normalized.has(legacy)) {
      diagnostics.push({ code: "legacy_pmo_folder", path: legacy });
    }
  }
  for (const folder of PMO_STRUCTURED_STATE_RECORDS) {
    const structured = `product/docs/pmo/${folder}`;
    if (normalized.has(structured)) {
      diagnostics.push({ code: "structured_pmo_state_as_markdown_folder", path: structured });
    }
  }
  for (const folder of GENERATED_PMO_VIEW_FOLDERS) {
    const generated = `product/docs/pmo/${folder}`;
    if (normalized.has(generated)) {
      diagnostics.push({ code: "generated_pmo_view_as_required_markdown_folder", path: generated });
    }
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

function buildWbsTsv({ rows = [] } = {}) {
  const lines = [REQUIRED_WBS_COLUMNS.join("\t")];
  for (const row of rows) {
    lines.push(REQUIRED_WBS_COLUMNS.map((column) => sanitizeCell(row?.[column])).join("\t"));
  }
  return `${lines.join("\n")}\n`;
}

function validateWbsTsv({ tsv = "" } = {}) {
  const diagnostics = [];
  const lines = text(tsv).split(/\r?\n/).filter(Boolean);
  const headers = lines.length > 0 ? lines[0].split("\t") : [];
  for (const column of REQUIRED_WBS_COLUMNS) {
    if (!headers.includes(column)) {
      diagnostics.push({ code: "missing_wbs_tsv_column", field: column });
    }
  }
  const rows = lines.slice(1).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  if (rows.length === 0) {
    diagnostics.push({ code: "missing_wbs_tsv_row", field: "rows" });
  }
  rows.forEach((row, rowIndex) => {
    if (!text(row.evidence_index_path)) {
      diagnostics.push({ code: "missing_wbs_evidence_index_path", field: "evidence_index_path", rowIndex });
    }
    if (!text(row.closeout_report_path)) {
      diagnostics.push({ code: "missing_wbs_closeout_report_path", field: "closeout_report_path", rowIndex });
    }
  });
  return { ok: diagnostics.length === 0, diagnostics };
}

function report({
  reportType,
  persistence,
  reportPathPrefix,
  reportDate,
  packetId,
  sourceWatermark,
  evidenceIndexPath,
  markdown
}) {
  return {
    reportType,
    persistence,
    reportPath: `${reportPathPrefix}/${reportType}/${reportDate}.md`,
    packetId,
    authority: "coordination-only",
    sourceWatermark: Number(sourceWatermark || 0),
    evidenceIndexPath: text(evidenceIndexPath),
    markdown
  };
}

function renderReport({ title, sections }) {
  const lines = [`# ${title}`, "", "Authority: coordination-only", ""];
  for (const [heading, values] of sections) {
    lines.push(`## ${heading}`);
    const cleanValues = values.map(text).filter(Boolean);
    lines.push(...(cleanValues.length > 0 ? cleanValues.map((value) => `- ${value}`) : ["- None"]));
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function sourceLines(sources) {
  const lines = [];
  if (text(sources.evidenceIndexPath)) {
    lines.push(`Evidence index: ${text(sources.evidenceIndexPath)}`);
  }
  if (text(sources.closeoutReportPath)) {
    lines.push(`Closeout report: ${text(sources.closeoutReportPath)}`);
  }
  if (text(sources.sourceWatermark)) {
    lines.push(`Source watermark: ${text(sources.sourceWatermark)}`);
  }
  return lines;
}

function packetLabel(sources) {
  const packetId = text(sources.packetId) || "unknown-packet";
  const packetTitle = text(sources.packetTitle);
  return packetTitle ? `${packetId}: ${packetTitle}` : packetId;
}

function bodyLineCount(markdown) {
  return markdown.split(/\r?\n/).filter((line) => line.trim()).length;
}

function list(value) {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }
  const normalized = text(value);
  return normalized ? [normalized] : [];
}

function sanitizeCell(value) {
  return text(value).replaceAll("\t", " ").replaceAll("\n", " ");
}

function text(value) {
  return String(value ?? "").trim();
}

export {
  GENERATED_PMO_VIEW_FOLDERS,
  FORBIDDEN_PMO_FOLDERS,
  PMO_STRUCTURED_STATE_RECORDS,
  PMO_SURFACE_CONTRACT,
  REQUIRED_PMO_FOLDERS,
  REQUIRED_WBS_COLUMNS,
  buildDayStartReport,
  buildDayWrapUpReport,
  buildWbsTsv,
  validatePmoPlacement,
  validatePmoReport,
  validateWbsTsv
};
