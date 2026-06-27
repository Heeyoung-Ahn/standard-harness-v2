import fs from "node:fs";
import path from "node:path";

import { VALIDATION_REPORT_JSON } from "../harness-paths.js";
import { sliceSection } from "../lib/packet-markdown.js";

export function readValidationReportSummary(repoRoot) {
  const reportPath = path.resolve(repoRoot, VALIDATION_REPORT_JSON);
  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const resolved = report?.report ?? report;
    const findings = Array.isArray(resolved.findings) ? resolved.findings : [];
    return {
      ok: Boolean(resolved.ok),
      cutoverReady: resolved.cutoverReady != null ? Boolean(resolved.cutoverReady) : Boolean(resolved.ok),
      findingCount:
        typeof resolved.findingCount === "number" ? resolved.findingCount : findings.length,
      blockingFindingCount:
        typeof resolved.blockingFindingCount === "number"
          ? resolved.blockingFindingCount
          : findings.filter((finding) => finding?.severity === "error").length,
      gateDecision: resolved.gateDecision ?? (resolved.ok ? "pass" : "hold"),
      executedAt: resolved.executedAt ?? null,
      traceSummary: resolved.traceSummary ?? null
    };
  } catch {
    return null;
  }
}

export function extractSummaryCount(content, sectionHeading) {
  const section = sliceSection(content, sectionHeading);
  if (!section) {
    return -1;
  }

  const firstBullet = section
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("- "));
  if (!firstBullet) {
    return -1;
  }

  const match = firstBullet.match(/(\d+)/);
  return match ? Number(match[1]) : -1;
}

export function countTableRows(content, sectionHeading) {
  const section = sliceSection(content, sectionHeading);
  if (!section) {
    return -1;
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 3) {
    return 0;
  }

  const dataRows = lines.slice(2);
  if (dataRows.length === 1 && isEmptyPlaceholderRow(dataRows[0])) {
    return 0;
  }

  return dataRows.length;
}

export function wrapSourceRefs(rowType, rows) {
  return rows.map((row) => ({
    rowType,
    rowId:
      row.releaseId ??
      row.workItemId ??
      row.decisionId ??
      row.riskId ??
      row.handoffId ??
      row.artifactId ??
      "unknown",
    sourceRef: row.sourceRef ?? null
  }));
}

function isEmptyPlaceholderRow(row) {
  const cells = row
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  return cells[0] === "-";
}
