import fs from "node:fs";
import path from "node:path";

import { normalizePacketHeaderValue } from "./lib/packet-markdown.js";

const REQUIRED_CHANGE_ZONES = new Set(["core", "load-bearing"]);
const REQUIRED_MODELING_FIELDS = [
  "Critical User Journey",
  "API contract",
  "Component responsibility",
  "Allowed dependency direction",
  "Data ownership",
  "Public contract vs internal/scratch field"
];

const STATUS_ALIASES = {
  required: "required",
  yes: "required",
  documented: "required",
  local: "required",
  promoted: "promoted",
  artifact: "promoted",
  "not-needed": "not-needed",
  "not needed": "not-needed",
  none: "not-needed",
  no: "not-needed"
};

export function evaluateModelingImpact({
  repoRoot = process.cwd(),
  content = "",
  stage = "planning-open",
  changeZone = null,
  changedFiles = [],
  changeZoneClassification = null
} = {}) {
  const impact = parseModelingImpact(content);
  const triggers = modelingRequirementTriggers({ content, changeZone, changedFiles, changeZoneClassification });
  const required = triggers.length > 0;
  const blockingStage = stage === "implementation-transition" || stage === "closeout";
  const diagnostics = [];

  if (!required) {
    if (impact.status === "not-needed" && !hasConcreteValue(impact.fields["Not-needed rationale"])) {
      diagnostics.push(buildDiagnostic({
        status: "warn",
        field: "Modeling Impact",
        current: "not-needed without rationale",
        expected: "not-needed rationale",
        trigger: "not-required",
        nextAction: "Add a short rationale or remove the optional Modeling Impact block."
      }));
    }
    return buildResult({ impact, required, triggers, diagnostics, blockingStage, repoRoot });
  }

  if (!impact.sectionFound) {
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field: "Modeling Impact",
      current: "missing",
      expected: "packet-local Modeling Impact block",
      trigger: triggers[0],
      nextAction: "Return to Planner and record CUJ/API/component/data ownership before implementation proceeds."
    }));
    return buildResult({ impact, required, triggers, diagnostics, blockingStage, repoRoot });
  }

  if (!impact.status) {
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field: "Modeling impact status",
      current: "missing",
      expected: "required | promoted | not-needed",
      trigger: triggers[0],
      nextAction: "Set Modeling impact status and fill the matching packet-local evidence."
    }));
  }

  if (impact.status === "not-needed") {
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field: "Modeling impact status",
      current: "not-needed",
      expected: "required or promoted",
      trigger: triggers[0],
      nextAction: "Core/load-bearing or contract-boundary work needs modeling evidence before implementation proceeds."
    }));
  }

  if (impact.status === "promoted") {
    inspectPromotedArtifact({ repoRoot, impact, diagnostics, blockingStage, trigger: triggers[0] });
    return buildResult({ impact, required, triggers, diagnostics, blockingStage, repoRoot });
  }

  for (const field of REQUIRED_MODELING_FIELDS) {
    if (hasConcreteValue(impact.fields[field])) {
      continue;
    }
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field,
      current: "missing",
      expected: "compact packet-local modeling evidence",
      trigger: triggers[0],
      nextAction: "Fill the Modeling Impact field or cite a promoted modeling artifact."
    }));
  }

  if ((changedFiles ?? []).length > 0 && !hasConcreteValue(impact.fields["Changed-file / classification evidence"])) {
    diagnostics.push(buildDiagnostic({
      status: "warn",
      field: "Changed-file / classification evidence",
      current: "missing",
      expected: "changed path or ownership-map evidence",
      trigger: "changed files supplied",
      nextAction: "Record the path evidence that made modeling impact required."
    }));
  }

  return buildResult({ impact, required, triggers, diagnostics, blockingStage, repoRoot });
}

export function summarizeModelingImpact(result) {
  if (!result) {
    return null;
  }
  return {
    required: result.required,
    status: result.status,
    triggerCount: result.triggers.length,
    diagnosticCount: result.diagnostics.length,
    blockingDiagnosticCount: result.diagnostics.filter((diagnostic) => diagnostic.status === "block").length,
    triggers: result.triggers
  };
}

function buildResult({ impact, required, triggers, diagnostics, blockingStage }) {
  const blockingDiagnostics = diagnostics.filter((diagnostic) => diagnostic.status === "block");
  return {
    ok: blockingStage ? blockingDiagnostics.length === 0 : true,
    required,
    status: impact.status ?? (impact.sectionFound ? "missing" : "absent"),
    sectionFound: impact.sectionFound,
    fields: impact.fields,
    promotedArtifact: impact.promotedArtifact,
    triggers,
    diagnostics
  };
}

function parseModelingImpact(content) {
  const section = sliceHeadingContaining(content, "modeling impact");
  if (!section) {
    return { sectionFound: false, fields: {}, status: null, promotedArtifact: null };
  }

  const fields = {};
  for (const rawLine of section.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^-\s*([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    fields[normalizeFieldLabel(match[1])] = match[2].trim();
  }

  const status = normalizeModelingStatus(fields["Modeling impact status"]);
  const promotedArtifact =
    stripInlineFormatting(fields["Promoted modeling artifact"] ?? fields["Promoted artifact"] ?? "");
  return { sectionFound: true, fields, status, promotedArtifact: promotedArtifact || null };
}

function modelingRequirementTriggers({ content, changeZone, changedFiles, changeZoneClassification }) {
  const triggers = [];
  const normalizedZone = normalizePacketHeaderValue(changeZone);
  if (REQUIRED_CHANGE_ZONES.has(normalizedZone)) {
    triggers.push(`Change zone ${normalizedZone}`);
  }

  for (const diagnostic of changeZoneClassification?.diagnostics ?? []) {
    if (REQUIRED_CHANGE_ZONES.has(diagnostic.expected)) {
      triggers.push(`changed path ${diagnostic.path} classified ${diagnostic.expected}`);
    }
  }

  const lower = String(content ?? "").toLowerCase();
  const boundarySignals = [
    ["api contract", /\bapi contract\b|\bexternal api contract:\s*yes\b/],
    ["schema boundary", /\bschema change:\s*yes\b|\bschema impact classification:\s*(low|medium|high|conditional)\b/],
    ["auth/security boundary", /\bauth\/security:\s*yes\b|\bauth \/ permission\b|\bsecurity-sensitive\b/],
    ["shared dependency boundary", /\bshared module \/ hotspot impact:\s*(?!none|not-needed|not needed)/]
  ];
  for (const [label, pattern] of boundarySignals) {
    if (pattern.test(lower)) {
      triggers.push(label);
    }
  }

  return [...new Set(triggers)];
}

function inspectPromotedArtifact({ repoRoot, impact, diagnostics, blockingStage, trigger }) {
  if (!impact.promotedArtifact) {
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field: "Promoted modeling artifact",
      current: "missing",
      expected: "existing artifact path",
      trigger,
      nextAction: "Cite the promoted modeling artifact or keep modeling impact packet-local."
    }));
    return;
  }

  const absolutePath = path.resolve(repoRoot, impact.promotedArtifact);
  const root = path.resolve(repoRoot);
  if (!absolutePath.startsWith(root) || !fs.existsSync(absolutePath)) {
    diagnostics.push(buildDiagnostic({
      status: blockingStage ? "block" : "hold",
      field: "Promoted modeling artifact",
      current: impact.promotedArtifact,
      expected: "existing artifact path",
      trigger,
      nextAction: "Create the promoted artifact, fix the path, or move the modeling evidence back into the packet."
    }));
  }
}

function buildDiagnostic({ status, field, current, expected, trigger, nextAction }) {
  return {
    field,
    status,
    current,
    expected,
    changeZone: trigger ?? "not-detected",
    matchedRule: trigger ?? "not-detected",
    reason: trigger ? `Modeling impact required by ${trigger}.` : "Modeling impact evidence is incomplete.",
    nextAction,
    message: `${field} current=${current}; expected=${expected}; next action: ${nextAction}`
  };
}

function normalizeModelingStatus(value) {
  const normalized = normalizePacketHeaderValue(value);
  return STATUS_ALIASES[normalized] ?? null;
}

function normalizeFieldLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function hasConcreteValue(value) {
  const normalized = normalizePacketHeaderValue(value);
  return Boolean(normalized && !["missing", "pending", "tbd", "unknown", "not-needed", "not needed", "none", "no"].includes(normalized));
}

function stripInlineFormatting(value) {
  return String(value ?? "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|__$/g, "")
    .trim();
}

function sliceHeadingContaining(content, needle) {
  const text = String(content ?? "");
  const headingPattern = /^##+\s+(.+)$/gim;
  let match;
  while ((match = headingPattern.exec(text))) {
    if (!match[1].toLowerCase().includes(needle)) {
      continue;
    }
    const start = match.index;
    headingPattern.lastIndex = start + match[0].length;
    const next = /^##+\s+.+$/gim;
    next.lastIndex = start + match[0].length;
    const nextMatch = next.exec(text);
    return text.slice(start, nextMatch ? nextMatch.index : text.length);
  }
  return null;
}
