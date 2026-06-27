import path from "node:path";

const RELEASE_PATTERNS = [/deploy/i, /release/i, /cutover/i, /rollback/i, /migration/i, /monitor/i, /sre/i];
const STRICT_PATTERNS = [/auth/i, /permission/i, /rbac/i, /secret/i, /credential/i, /token/i, /webhook/i, /ci/i, /cd/i, /approval/i, /workflow/i, /audit/i, /database/i, /schema/i, /sql/i, /core/i, /runtime/i, /security/i];
const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst"]);
const LANE_ORDER = ["micro", "docs-only", "light", "standard", "strict", "release"];

export function classifyLane({ changedFiles = [], risk = "normal", profiles = [], text = "" } = {}) {
  const normalizedRisk = normalizeRisk(risk);
  const files = changedFiles.map((file) => String(file).trim()).filter(Boolean);
  const normalizedProfiles = profiles.map((profile) => String(profile).trim()).filter(Boolean);
  const joined = [files.join("\n"), normalizedProfiles.join("\n"), text].join("\n");
  if (["critical", "high"].includes(normalizedRisk)) return "strict";
  if (matchesAny(joined, RELEASE_PATTERNS)) return "release";
  if (normalizedProfiles.some((profile) => ["PRF-06"].includes(String(profile).toUpperCase()))) return "strict";
  if (matchesAny(joined, STRICT_PATTERNS)) return "strict";
  if (files.length > 0 && files.every((file) => DOC_EXTENSIONS.has(path.extname(file).toLowerCase()))) {
    return files.length <= 2 ? "micro" : "docs-only";
  }
  if (files.length > 0 && files.length <= 2 && normalizedRisk === "low") return "light";
  return "standard";
}

export function resolveLaneDecision({
  declaredLane = null,
  packetLane = null,
  changedFiles = [],
  risk = "normal",
  profiles = [],
  text = ""
} = {}) {
  const inferredLane = classifyLane({ changedFiles, risk, profiles, text });
  const normalizedPacketLane = normalizeLane(packetLane);
  const normalizedDeclaredLane = normalizeLane(declaredLane);
  const warnings = [];

  if (normalizedPacketLane) {
    return {
      declaredLane: normalizedDeclaredLane,
      packetLane: normalizedPacketLane,
      inferredLane,
      effectiveLane: normalizedPacketLane,
      lane: normalizedPacketLane,
      laneSource: "packet",
      warnings
    };
  }

  if (normalizedDeclaredLane) {
    const effectiveLane = stricterLane(normalizedDeclaredLane, inferredLane);
    if (effectiveLane !== normalizedDeclaredLane) {
      warnings.push({
        code: "declared_lane_lower_than_inferred",
        severity: "warning",
        declaredLane: normalizedDeclaredLane,
        inferredLane,
        effectiveLane,
        message: `Declared lane ${normalizedDeclaredLane} is lower than inferred lane ${inferredLane}; using ${effectiveLane}.`
      });
    }
    return {
      declaredLane: normalizedDeclaredLane,
      packetLane: null,
      inferredLane,
      effectiveLane,
      lane: effectiveLane,
      laneSource: warnings.length > 0 ? "inferred-over-declared" : "declared",
      warnings
    };
  }

  return {
    declaredLane: null,
    packetLane: null,
    inferredLane,
    effectiveLane: inferredLane,
    lane: inferredLane,
    laneSource: "inferred",
    warnings
  };
}

export function explainLane({ lane, changedFiles = [], risk = "normal", profiles = [], text = "" }) {
  const reasons = [];
  if (["critical", "high"].includes(normalizeRisk(risk))) reasons.push("high/critical risk escalates to strict");
  if (matchesAny([changedFiles.join("\n"), text].join("\n"), RELEASE_PATTERNS)) reasons.push("release/cutover/migration surface detected");
  if (profiles.some((profile) => String(profile).toUpperCase() === "PRF-06")) reasons.push("PRF-06 approval workflow escalates to strict");
  if (matchesAny([changedFiles.join("\n"), text].join("\n"), STRICT_PATTERNS)) reasons.push("strict change surface detected");
  if (changedFiles.length > 0 && changedFiles.every((file) => DOC_EXTENSIONS.has(path.extname(file).toLowerCase()))) reasons.push("documentation-only files detected");
  if (reasons.length === 0) reasons.push("default standard lane");
  return reasons;
}

export function normalizeLane(value) {
  const lane = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  return LANE_ORDER.includes(lane) ? lane : null;
}

export function normalizeRisk(value) {
  const risk = String(value ?? "normal").trim().toLowerCase();
  return ["low", "normal", "high", "critical"].includes(risk) ? risk : "normal";
}

export function compareLaneStrictness(left, right) {
  return laneRank(left) - laneRank(right);
}

function stricterLane(left, right) {
  return compareLaneStrictness(left, right) >= 0 ? left : right;
}

function laneRank(lane) {
  const normalized = normalizeLane(lane) ?? "standard";
  return LANE_ORDER.indexOf(normalized);
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text ?? "")));
}
