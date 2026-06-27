import fs from "node:fs";
import path from "node:path";

import {
  classifyLane as classifySharedLane,
  explainLane as explainSharedLane,
  normalizeLane as normalizeSharedLane,
  normalizeRisk,
  resolveLaneDecision
} from "./lane-classifier.js";

export const V23_SCHEMA_VERSION = "standard-harness-v2.3-lean-conductor/v1";
export const DEFAULT_DOC_ROUTE = ".agents/runtime/DOC_ROUTE.json";
export const DEFAULT_CONTEXT_BUDGET = ".agents/runtime/CONTEXT_BUDGET.json";
export const DEFAULT_ACTIVE_CONTEXT_BRIEF = ".agents/runtime/ACTIVE_CONTEXT.brief.md";
export const DEFAULT_FRICTION_DIR = "reference/reports/friction";
export const DEFAULT_LEAN_PACKET_DIR = "reference/packets";

const HUMAN_MANUAL_PATTERNS = [
  "START_HERE.md",
  "reference/manuals/human/**",
  "reference/manuals/full/**",
  "reference/manuals/*GUIDE*.md",
  "reference/manuals/*PLAYBOOK*.md",
  "reference/manuals/CLOUD_LOCAL_MERGE_PLAYBOOK.md",
  "reference/manuals/AUTOMATION_CATALOG.md"
];

const DEFAULT_SSOT_READ = [
  ".agents/runtime/ACTIVE_CONTEXT.brief.md",
  ".agents/runtime/DOC_ROUTE.json",
  ".agents/ssot/AI_OPERATING_CONTRACT.md"
];

const SSOT_BY_PHASE = {
  "day-start": [],
  "day-wrap-up": [".agents/ssot/CONTEXT_BUDGET_RULES.md", ".agents/ssot/EVIDENCE_GATE_RULES.md"],
  planning: [".agents/ssot/PACKET_LANE_RULES.md", ".agents/ssot/HUMAN_CONDUCTOR_RULES.md"],
  packet: [".agents/ssot/PACKET_LANE_RULES.md", ".agents/ssot/EVIDENCE_GATE_RULES.md"],
  implementation: [".agents/ssot/PACKET_LANE_RULES.md", ".agents/ssot/EVIDENCE_GATE_RULES.md"],
  review: [".agents/ssot/ROLE_AUTHORITY_MATRIX.md", ".agents/ssot/EVIDENCE_GATE_RULES.md"],
  release: [".agents/ssot/ROLE_AUTHORITY_MATRIX.md", ".agents/ssot/EVIDENCE_GATE_RULES.md", ".agents/ssot/HUMAN_CONDUCTOR_RULES.md"],
  investigation: [".agents/ssot/ROUTING_RULES.md", ".agents/ssot/EVIDENCE_GATE_RULES.md"]
};

const CARD_BY_PHASE = {
  "day-start": "reference/manuals/cards/DAY_START_CARD.md",
  "day-wrap-up": "reference/manuals/cards/DAY_WRAP_UP_CARD.md",
  planning: "reference/manuals/cards/FIRST_PACKET_CARD.md",
  packet: "reference/manuals/cards/FIRST_PACKET_CARD.md",
  implementation: "reference/manuals/cards/TDD_CARD.md",
  review: "reference/manuals/cards/CLOSEOUT_CARD.md",
  release: "reference/manuals/cards/RELEASE_CARD.md",
  investigation: "reference/manuals/lanes/LANE_INVESTIGATION.md"
};

const TOKEN_BUDGET_BY_LANE = {
  micro: 800,
  "docs-only": 800,
  light: 1500,
  standard: 3000,
  strict: 6000,
  release: 6000,
  investigation: 4000
};

const PACKET_TEMPLATE_BY_LANE = {
  micro: "reference/packets/templates/MICRO_NOTE.md",
  "docs-only": "reference/packets/templates/DOCS_ONLY_PACKET.md",
  light: "reference/packets/templates/LIGHT_PACKET.md",
  standard: "reference/packets/templates/STANDARD_PACKET.md",
  strict: "reference/packets/templates/STRICT_PACKET.md",
  release: "reference/packets/templates/RELEASE_PACKET.md",
  investigation: "reference/packets/templates/INVESTIGATION_PACKET.md"
};

export function runV23Command({ repoRoot = process.cwd(), outputDir = repoRoot, args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "report";
  const options = parsed.options;
  const apply = Boolean(options.apply || options.write);

  if (subcommand === "manual-route" || subcommand === "route") {
    return runManualRouteCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "lane" || subcommand === "classify-lane") {
    return runLaneCommand({ repoRoot, options });
  }
  if (subcommand === "context-brief" || subcommand === "brief") {
    return runContextBriefCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "packet" || subcommand === "packet-lean") {
    return runLeanPacketCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "friction-report" || subcommand === "friction") {
    return runFrictionReportCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "day-start") {
    return runDayStartBriefCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "day-wrap-up" || subcommand === "day-wrapup") {
    return runDayWrapUpBriefCommand({ repoRoot, outputDir, options, apply });
  }
  if (subcommand === "policy-audit" || subcommand === "doc-policy") {
    return runDocumentPolicyAuditCommand({ repoRoot, options });
  }
  if (subcommand === "report") {
    return runV23ReportCommand({ repoRoot, outputDir, options, apply });
  }

  return {
    ok: false,
    command: "v23",
    subcommand,
    message: `Unsupported V2.3 subcommand: ${subcommand}`,
    supported: ["report", "manual-route", "lane", "context-brief", "packet", "friction-report", "day-start", "day-wrap-up", "policy-audit"]
  };
}

export function runV23ReportCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = classifyLaneFromOptions(options);
  const route = buildDocRoute({ lane, phase: options.phase ?? "day-start", risk: options.risk, profiles: parseList(options.profiles), changedFiles: parseFiles(options.files ?? options.changedFiles) });
  const audit = auditDocumentPolicies({ repoRoot });
  const friction = buildFrictionReport({ repoRoot, lane, route });
  const writes = [];
  if (apply) {
    writes.push(writeJsonArtifact(outputDir, DEFAULT_DOC_ROUTE, route).relativePath);
    writes.push(writeJsonArtifact(outputDir, DEFAULT_CONTEXT_BUDGET, buildContextBudget()).relativePath);
    writes.push(writeTextArtifact(outputDir, DEFAULT_ACTIVE_CONTEXT_BRIEF, renderActiveContextBrief({ lane, phase: route.phase, route, options })).relativePath);
    writes.push(writeJsonArtifact(outputDir, `${DEFAULT_FRICTION_DIR}/FRICTION-SUMMARY.json`, friction).relativePath);
    writes.push(writeTextArtifact(outputDir, `${DEFAULT_FRICTION_DIR}/FRICTION-SUMMARY.md`, renderFrictionMarkdown(friction)).relativePath);
  }
  return {
    ok: audit.ok,
    command: "v23",
    subcommand: "report",
    apply,
    schemaVersion: V23_SCHEMA_VERSION,
    lane,
    routeSummary: summarizeRoute(route),
    policyAudit: summarizePolicyAudit(audit),
    frictionSummary: summarizeFriction(friction),
    artifactsWritten: writes,
    nextAction: audit.ok ? "Use DOC_ROUTE.json and ACTIVE_CONTEXT.brief.md as the default LLM read set." : "Fix document read-policy errors before relying on automatic routing."
  };
}

export function runManualRouteCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? classifyLaneFromOptions(options));
  const phase = normalizePhase(options.phase ?? "day-start");
  const route = buildDocRoute({ lane, phase, risk: options.risk, profiles: parseList(options.profiles), changedFiles: parseFiles(options.files ?? options.changedFiles) });
  let outputPath = null;
  if (apply) {
    outputPath = writeJsonArtifact(outputDir, DEFAULT_DOC_ROUTE, route).relativePath;
  }
  return { ok: true, command: "v23", subcommand: "manual-route", apply, outputPath, ...route, summary: summarizeRoute(route) };
}

export function runLaneCommand({ repoRoot = process.cwd(), options = {} } = {}) {
  const changedFiles = parseFiles(options.files ?? options.changedFiles);
  const profiles = parseList(options.profiles);
  const laneDecision = resolveLaneDecision({
    changedFiles,
    risk: options.risk,
    profiles,
    text: options.text ?? ""
  });
  return { ok: true, command: "v23", subcommand: "lane", schemaVersion: V23_SCHEMA_VERSION, lane: laneDecision.lane, laneDecision, changedFiles, risk: normalizeRisk(options.risk), profiles, rationale: explainLane({ lane: laneDecision.lane, changedFiles, risk: options.risk, profiles, text: options.text ?? "" }) };
}

export function runContextBriefCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? classifyLaneFromOptions(options));
  const phase = normalizePhase(options.phase ?? "day-start");
  const route = buildDocRoute({ lane, phase, risk: options.risk, profiles: parseList(options.profiles), changedFiles: parseFiles(options.files ?? options.changedFiles) });
  const brief = renderActiveContextBrief({ repoRoot, lane, phase, route, options });
  const budget = buildContextBudget();
  const writes = [];
  if (apply) {
    writes.push(writeTextArtifact(outputDir, DEFAULT_ACTIVE_CONTEXT_BRIEF, brief).relativePath);
    writes.push(writeJsonArtifact(outputDir, DEFAULT_DOC_ROUTE, route).relativePath);
    writes.push(writeJsonArtifact(outputDir, DEFAULT_CONTEXT_BUDGET, budget).relativePath);
  }
  return { ok: true, command: "v23", subcommand: "context-brief", apply, lane, phase, briefPath: apply ? DEFAULT_ACTIVE_CONTEXT_BRIEF : null, routePath: apply ? DEFAULT_DOC_ROUTE : null, artifactsWritten: writes, routeSummary: summarizeRoute(route), preview: apply ? null : brief };
}

export function runLeanPacketCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? classifyLaneFromOptions(options));
  const templatePath = PACKET_TEMPLATE_BY_LANE[lane] ?? PACKET_TEMPLATE_BY_LANE.standard;
  const template = readTextIfExists(path.join(repoRoot, templatePath)) ?? `# ${lane} Packet\n`;
  const id = safeId(options.id ?? options.workItem ?? options.workItemId ?? `${lane}-${new Date().toISOString().slice(0, 10)}`);
  const title = String(options.title ?? `${lane} packet`).trim();
  const target = normalizeRelativePath(options.output ?? `${DEFAULT_LEAN_PACKET_DIR}/${id}.md`);
  const content = renderLeanPacket({ lane, template, id, title, options });
  let outputPath = null;
  if (apply) {
    outputPath = writeTextArtifact(outputDir, target, content).relativePath;
  }
  return { ok: true, command: "v23", subcommand: "packet", apply, lane, templatePath, outputPath: outputPath ?? target, preview: apply ? null : content };
}

export function runFrictionReportCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? classifyLaneFromOptions(options));
  const route = buildDocRoute({ lane, phase: options.phase ?? "day-start", risk: options.risk, profiles: parseList(options.profiles), changedFiles: parseFiles(options.files ?? options.changedFiles) });
  const report = buildFrictionReport({ repoRoot, lane, route });
  const writes = [];
  if (apply) {
    writes.push(writeJsonArtifact(outputDir, `${DEFAULT_FRICTION_DIR}/FRICTION-${today()}.json`, report).relativePath);
    writes.push(writeTextArtifact(outputDir, `${DEFAULT_FRICTION_DIR}/FRICTION-SUMMARY.md`, renderFrictionMarkdown(report)).relativePath);
  }
  return { ok: true, command: "v23", subcommand: "friction-report", apply, artifactsWritten: writes, ...summarizeFriction(report), report };
}

export function runDayStartBriefCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? classifyLaneFromOptions(options));
  const route = buildDocRoute({ lane, phase: "day-start", risk: options.risk, profiles: parseList(options.profiles), changedFiles: parseFiles(options.files ?? options.changedFiles) });
  const text = [
    "# Day Start Brief",
    "",
    `- Active lane: ${lane}`,
    `- Active packet: ${options.packet ?? "select or open one packet"}`,
    `- Owner: ${options.owner ?? "planner"}`,
    `- Blocker: ${options.blocker ?? "none declared"}`,
    `- Next action: ${options.nextAction ?? "confirm lane, route docs, then work the active packet"}`,
    `- Required command: npm run harness:v23 -- manual-route -- --lane ${lane} --phase day-start --apply`,
    `- Required docs: ${route.read.join(", ")}`,
    "- Do not read: human full manuals or raw logs by default"
  ].join("\n") + "\n";
  let outputPath = null;
  if (apply) outputPath = writeTextArtifact(outputDir, ".agents/runtime/DAY_START.brief.md", text).relativePath;
  return { ok: true, command: "v23", subcommand: "day-start", apply, lane, outputPath, routeSummary: summarizeRoute(route), brief: text };
}

export function runDayWrapUpBriefCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const lane = normalizeLane(options.lane ?? "standard");
  const text = [
    "# Day Wrap-up Brief",
    "",
    `- Lane: ${lane}`,
    `- Done: ${options.done ?? "not recorded"}`,
    `- Not done: ${options.notDone ?? "not recorded"}`,
    `- Current blocker: ${options.blocker ?? "none declared"}`,
    `- Next action: ${options.nextAction ?? "refresh context and continue from the active packet"}`,
    `- Evidence digest: ${options.evidenceDigest ?? "not recorded"}`,
    `- Learning candidate: ${options.learning ?? "not recorded"}`
  ].join("\n") + "\n";
  let outputPath = null;
  if (apply) outputPath = writeTextArtifact(outputDir, ".agents/runtime/DAY_WRAP_UP.brief.md", text).relativePath;
  return { ok: true, command: "v23", subcommand: "day-wrap-up", apply, lane, outputPath, brief: text };
}

export function runDocumentPolicyAuditCommand({ repoRoot = process.cwd(), options = {} } = {}) {
  const result = auditDocumentPolicies({ repoRoot, includeAllMarkdown: Boolean(options.all) });
  return { ok: result.ok, command: "v23", subcommand: "policy-audit", ...result, summary: summarizePolicyAudit(result) };
}

export function buildDocRoute({ lane = "standard", phase = "day-start", risk = "normal", profiles = [], changedFiles = [] } = {}) {
  const normalizedLane = normalizeLane(lane);
  const normalizedPhase = normalizePhase(phase);
  const read = unique([
    ...DEFAULT_SSOT_READ,
    ...(SSOT_BY_PHASE[normalizedPhase] ?? SSOT_BY_PHASE.planning),
    ...(normalizedLane === "strict" || normalizedLane === "release" ? [".agents/ssot/ROLE_AUTHORITY_MATRIX.md", ".agents/ssot/HUMAN_CONDUCTOR_RULES.md"] : []),
    ...(normalizedLane === "micro" || normalizedLane === "docs-only" ? [".agents/ssot/CONTEXT_BUDGET_RULES.md"] : [])
  ]);
  const fallback = unique([
    CARD_BY_PHASE[normalizedPhase] ?? "reference/manuals/cards/FIRST_PACKET_CARD.md",
    `reference/manuals/lanes/LANE_${normalizedLane.toUpperCase().replace(/-/g, "_")}.md`
  ]);
  const targetTokens = TOKEN_BUDGET_BY_LANE[normalizedLane] ?? TOKEN_BUDGET_BY_LANE.standard;
  return {
    schemaVersion: "standard-harness-v2.3-doc-route/v1",
    lane: normalizedLane,
    phase: normalizedPhase,
    risk: normalizeRisk(risk),
    profiles: unique(profiles.map((profile) => String(profile).trim()).filter(Boolean)),
    changedFiles: unique(changedFiles),
    read,
    do_not_read: HUMAN_MANUAL_PATTERNS,
    fallback,
    budget: {
      targetTokens,
      maxDocuments: normalizedPhase === "day-start" ? 3 : (normalizedLane === "strict" || normalizedLane === "release" || normalizedPhase === "implementation" || normalizedPhase === "review" ? 5 : 3)
    },
    policy: "Human manuals are for humans. AI agents read only routed SSOT/reference/digest surfaces by default."
  };
}

export function classifyLane({ changedFiles = [], risk = "normal", profiles = [], text = "" } = {}) {
  return classifySharedLane({ changedFiles, risk, profiles, text });
}

export function auditDocumentPolicies({ repoRoot = process.cwd(), includeAllMarkdown = false } = {}) {
  const checks = [];
  const root = path.resolve(repoRoot);
  const required = [
    "START_HERE.md",
    "reference/manuals/human/HARNESS_MANUAL.md",
    "reference/manuals/human/HUMAN_GUIDE.md",
    ".agents/ssot/AI_OPERATING_CONTRACT.md",
    ".agents/ssot/PACKET_LANE_RULES.md",
    ".agents/runtime/DOC_ROUTE.json",
    ".agents/runtime/ACTIVE_CONTEXT.brief.md"
  ];
  for (const rel of required) {
    const absolute = path.join(root, rel);
    if (!fs.existsSync(absolute)) {
      checks.push({ code: "required_doc_missing", severity: "error", path: rel, message: `${rel} is missing.` });
      continue;
    }
    if (rel.endsWith(".md")) {
      const fm = parseFrontmatter(readTextIfExists(absolute) ?? "");
      validatePolicyForPath(rel, fm, checks);
    }
  }
  if (includeAllMarkdown) {
    for (const rel of collectMarkdownFiles(root)) {
      const fm = parseFrontmatter(readTextIfExists(path.join(root, rel)) ?? "");
      if (rel.startsWith("reference/manuals/human/") && fm.llm_read_policy !== "never_auto_read") {
        checks.push({ code: "human_manual_auto_readable", severity: "error", path: rel, message: `${rel} must be never_auto_read.` });
      }
    }
  }
  const routePath = path.join(root, DEFAULT_DOC_ROUTE);
  if (fs.existsSync(routePath)) {
    const route = JSON.parse(fs.readFileSync(routePath, "utf8"));
    for (const rel of route.read ?? []) {
      if (isHumanManualPath(rel)) checks.push({ code: "doc_route_reads_human_manual", severity: "error", path: rel, message: `DOC_ROUTE must not auto-read human manual ${rel}.` });
    }
  }
  return { schemaVersion: V23_SCHEMA_VERSION, checks, ok: checks.every((check) => check.severity !== "error") };
}

function validatePolicyForPath(rel, fm, checks) {
  if (rel.startsWith(".agents/ssot/")) {
    if (fm.audience !== "agent") checks.push({ code: "ssot_audience_not_agent", severity: "error", path: rel, value: fm.audience, message: `${rel} must declare audience: agent.` });
    if (fm.authority !== "ssot") checks.push({ code: "ssot_authority_missing", severity: "error", path: rel, value: fm.authority, message: `${rel} must declare authority: ssot.` });
    if (!["default", "route_selected"].includes(fm.llm_read_policy)) checks.push({ code: "ssot_read_policy_invalid", severity: "error", path: rel, value: fm.llm_read_policy, message: `${rel} must be default or route_selected.` });
  }
  if (isHumanManualPath(rel)) {
    if (fm.audience !== "human") checks.push({ code: "human_manual_audience_invalid", severity: "error", path: rel, value: fm.audience, message: `${rel} must declare audience: human.` });
    if (fm.llm_read_policy !== "never_auto_read") checks.push({ code: "human_manual_policy_invalid", severity: "error", path: rel, value: fm.llm_read_policy, message: `${rel} must declare llm_read_policy: never_auto_read.` });
    if (String(fm.default_context ?? "false") !== "false") checks.push({ code: "human_manual_default_context_enabled", severity: "error", path: rel, message: `${rel} must not be default context.` });
  }
}

function renderActiveContextBrief({ repoRoot = process.cwd(), lane, phase, route, options = {} }) {
  const existing = readExistingActiveContext(repoRoot);
  const activePacket = options.packet ?? existing.activePacket ?? existing.activeTask?.sourceRef ?? "none selected";
  const owner = options.owner ?? existing.owner ?? existing.activeTask?.owner ?? "planner";
  const nextAction = options.nextAction ?? existing.nextAction ?? existing.nextWork?.action ?? "use DOC_ROUTE.json, confirm lane, then proceed with the active packet";
  return [
    "---",
    "doc_id: ACTIVE_CONTEXT_BRIEF",
    "audience: agent",
    "authority: generated-runtime",
    "language: en",
    "llm_read_policy: default",
    "default_context: true",
    "token_budget: 1000",
    "---",
    "# Active Context Brief",
    "",
    `- Current lane: ${lane}`,
    `- Current phase: ${phase}`,
    `- Active packet: ${activePacket}`,
    `- Current owner: ${owner}`,
    `- Next action: ${nextAction}`,
    `- Blocking gate: ${options.blocker ?? "none declared"}`,
    `- Required evidence: digest first; raw logs only on fail/unknown/mismatch`,
    `- Required docs: ${route.read.join(", ")}`,
    `- Do not read: ${route.do_not_read.join(", ")}`,
    ""
  ].join("\n");
}

function renderLeanPacket({ lane, template, id, title, options }) {
  const header = [
    "<!-- Standard Harness v2.3 lean packet. Expand only when lane/risk requires it. -->",
    `<!-- lane: ${lane}; id: ${id} -->`,
    ""
  ].join("\n");
  return `${header}${template}\n\n## V2.3 Lean Metadata\n\n- Packet id: ${id}\n- Title: ${title}\n- Lane: ${lane}\n- Human conductor decision: ${options.humanDecision ?? "pending"}\n- Evidence digest path: ${options.evidenceDigest ?? "pending"}\n- Manual route: .agents/runtime/DOC_ROUTE.json\n`;
}

function buildFrictionReport({ repoRoot = process.cwd(), lane = "standard", route }) {
  const root = path.resolve(repoRoot);
  const humanManuals = collectMarkdownFiles(root).filter((rel) => isHumanManualPath(rel));
  const ssotFiles = collectMarkdownFiles(root).filter((rel) => rel.startsWith(".agents/ssot/"));
  const manualBytes = sumBytes(root, humanManuals);
  const ssotBytes = sumBytes(root, ssotFiles);
  return {
    schemaVersion: V23_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    lane,
    routeReadCount: route.read.length,
    routeTargetTokens: route.budget.targetTokens,
    humanManualCount: humanManuals.length,
    humanManualBytes: manualBytes,
    ssotCount: ssotFiles.length,
    ssotBytes,
    estimatedHumanManualTokens: Math.ceil(manualBytes / 4),
    estimatedSsotTokens: Math.ceil(ssotBytes / 4),
    frictionRisks: [
      ...(route.read.some((rel) => isHumanManualPath(rel)) ? ["route_reads_human_manual"] : []),
      ...(route.read.length > route.budget.maxDocuments ? ["route_document_count_exceeds_budget"] : []),
      ...(route.budget.targetTokens > 6000 ? ["route_token_budget_high"] : [])
    ]
  };
}

function renderFrictionMarkdown(report) {
  return [
    "# V2.3 Friction Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Lane: ${report.lane}`,
    "",
    "## Summary",
    `- Route read count: ${report.routeReadCount}`,
    `- Route target tokens: ${report.routeTargetTokens}`,
    `- Human manual count: ${report.humanManualCount}`,
    `- Estimated human manual tokens if read all: ${report.estimatedHumanManualTokens}`,
    `- SSOT count: ${report.ssotCount}`,
    `- Estimated SSOT tokens if read all: ${report.estimatedSsotTokens}`,
    `- Friction risks: ${report.frictionRisks.length > 0 ? report.frictionRisks.join(", ") : "none"}`,
    "",
    "Policy: read routed SSOT and digest first; do not auto-read human manuals."
  ].join("\n") + "\n";
}

function summarizeRoute(route) {
  return { lane: route.lane, phase: route.phase, readCount: route.read.length, fallbackCount: route.fallback.length, targetTokens: route.budget.targetTokens, humanManualAutoRead: route.read.some((rel) => isHumanManualPath(rel)) };
}

function summarizePolicyAudit(audit) {
  return { ok: audit.ok, errors: audit.checks.filter((check) => check.severity === "error").length, warnings: audit.checks.filter((check) => check.severity === "warning").length };
}

function summarizeFriction(report) {
  return { lane: report.lane, routeReadCount: report.routeReadCount, targetTokens: report.routeTargetTokens, humanManualsBlockedFromDefault: true, frictionRiskCount: report.frictionRisks.length };
}

function buildContextBudget() {
  return { schemaVersion: "standard-harness-v2.3-context-budget/v1", defaultReadSetMaxDocuments: 3, budgets: TOKEN_BUDGET_BY_LANE, neverAutoRead: HUMAN_MANUAL_PATTERNS, rawEvidencePolicy: "read digest first; open raw logs only on fail, unknown, mismatch, or explicit human request" };
}

function classifyLaneFromOptions(options) {
  return classifyLane({ changedFiles: parseFiles(options.files ?? options.changedFiles), risk: options.risk, profiles: parseList(options.profiles), text: options.text ?? "" });
}

function normalizeLane(value) {
  return normalizeSharedLane(value) ?? "standard";
}

function normalizePhase(value) {
  const phase = String(value ?? "day-start").trim().toLowerCase().replace(/_/g, "-");
  return SSOT_BY_PHASE[phase] ? phase : phase === "wrap-up" ? "day-wrap-up" : "day-start";
}

const explainLane = explainSharedLane;

function isHumanManualPath(rel) {
  const normalized = String(rel ?? "").replace(/\\/g, "/");
  return normalized.startsWith("reference/manuals/human/") || normalized.startsWith("reference/manuals/full/") || /reference\/manuals\/.*(GUIDE|PLAYBOOK|CATALOG)\.md$/i.test(normalized) || normalized === "START_HERE.md";
}

function parseFiles(value) {
  return parseList(value).map((item) => normalizeRelativePath(item)).filter(Boolean);
}

function parseList(value) {
  if (Array.isArray(value)) return value.flatMap((item) => parseList(item));
  return String(value ?? "").split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") continue;
    if (token.startsWith("--")) {
      const withoutPrefix = token.slice(2);
      const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s).filter((part) => part !== undefined);
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      if (inlineValue !== undefined) options[key] = inlineValue;
      else if (args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
      else options[key] = true;
    } else {
      positionals.push(token);
    }
  }
  return { positionals, options };
}

function parseFrontmatter(content) {
  const match = String(content ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) result[key] = value;
  }
  return result;
}

function readExistingActiveContext(repoRoot) {
  for (const rel of [".agents/runtime/ACTIVE_CONTEXT.json", ".agents/runtime/ACTIVE_CONTEXT.compact.json"]) {
    const absolute = path.join(repoRoot, rel);
    if (fs.existsSync(absolute)) {
      try { return JSON.parse(fs.readFileSync(absolute, "utf8")); }
      catch { return {}; }
    }
  }
  return {};
}

function collectMarkdownFiles(root) {
  const result = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules"].includes(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) result.push(path.relative(root, absolute).replace(/\\/g, "/"));
    }
  }
  walk(root);
  return result.sort();
}

function sumBytes(root, rels) {
  return rels.reduce((sum, rel) => {
    try { return sum + fs.statSync(path.join(root, rel)).size; }
    catch { return sum; }
  }, 0);
}

function readTextIfExists(absolutePath) {
  try { return fs.readFileSync(absolutePath, "utf8"); }
  catch { return null; }
}

function writeJsonArtifact(root, relativePath, value) {
  return writeTextArtifact(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextArtifact(root, relativePath, content) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) throw new Error(`Unsafe artifact path: ${relativePath}`);
  const absolute = path.resolve(root, normalized);
  if (!isInside(root, absolute)) throw new Error(`Artifact path escapes repository root: ${relativePath}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return { relativePath: normalized, absolutePath: absolute };
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/").replace(/^`|`$/g, "").replace(/^\.\//, "");
  if (!text || path.isAbsolute(text) || text.split("/").includes("..")) return null;
  return path.posix.normalize(text);
}

function isInside(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text ?? "")));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeId(value) {
  return String(value ?? "packet").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "packet";
}

function today() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
