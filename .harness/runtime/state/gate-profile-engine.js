import fs from "node:fs";
import path from "node:path";

import {
  normalizePacketHeaderValue,
  parseDelimitedList,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent
} from "./lib/packet-markdown.js";

export const GATE_PROFILE_ENGINE_SCHEMA_VERSION = "standard-harness-gate-profile-engine/v1";
export const BASE_RISK_LEVELS = Object.freeze(["low", "standard", "high", "critical"]);

const DEFAULT_POLICY_PATH = "starter/standard-harness/_harness/policies/gate-profiles.yaml";
const PASS_STATUSES = new Set(["pass", "passed", "PASS", "N/A_RECORDED", "not_applicable_recorded"]);
const BAD_STATUSES = new Set(["missing", "stale", "untrusted", "unresolved", "fail", "failed", "blocked", "BLOCKED", "STALE"]);

export function loadGateProfilePolicy(repoRoot = process.cwd(), policyPath = DEFAULT_POLICY_PATH) {
  const fullPath = path.resolve(repoRoot, policyPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

export function normalizeRiskLevel(value) {
  const normalized = normalizeToken(value);
  if (!normalized) return "standard";
  if (normalized === "normal" || normalized === "medium") return "standard";
  if (normalized === "release-sensitive") return "critical";
  return BASE_RISK_LEVELS.includes(normalized) ? normalized : "standard";
}

export function resolveRequiredGateProfile({
  policy,
  packetType,
  riskLevel = "standard",
  changedZones = [],
  claims = [],
  releaseSensitive = false,
  browserFacing = false,
  securitySensitive = false,
  dataSensitive = false,
  harnessSystem = false,
  starterPromotion = false
} = {}) {
  const gatePolicy = policy ?? loadGateProfilePolicy();
  const normalizedPacketType = normalizeToken(packetType);
  const packetProfile = gatePolicy.packetTypes?.[normalizedPacketType];
  if (!packetProfile) {
    throw new Error(`Unknown packet type: ${packetType}`);
  }

  const explicitOverlays = new Set([
    ...normalizeList(changedZones),
    ...normalizeList(claims)
  ]);
  if (releaseSensitive) explicitOverlays.add("release-sensitive");
  if (browserFacing) explicitOverlays.add("browser-facing");
  if (securitySensitive) explicitOverlays.add("security-sensitive");
  if (dataSensitive) explicitOverlays.add("data-sensitive");
  if (harnessSystem || normalizedPacketType === "harness-system") explicitOverlays.add("harness-system");
  if (starterPromotion || normalizedPacketType === "starter-promotion") explicitOverlays.add("starter-promotion");

  const baseRisk = normalizeRiskLevel(riskLevel);
  const effectiveRisk = explicitOverlays.has("release-sensitive") ? "critical" : baseRisk;
  const requiredGates = new Set(packetProfile.requiredGates ?? []);
  const appliedRules = [];

  applyPolicyGates({
    requiredGates,
    appliedRules,
    rules: gatePolicy.riskLevels?.[effectiveRisk]?.addGates,
    ruleId: `risk:${effectiveRisk}`
  });

  for (const overlay of explicitOverlays) {
    applyPolicyGates({
      requiredGates,
      appliedRules,
      rules: gatePolicy.overlays?.[overlay]?.addGates,
      ruleId: `overlay:${overlay}`
    });
  }

  return {
    schemaVersion: GATE_PROFILE_ENGINE_SCHEMA_VERSION,
    packetType: normalizedPacketType,
    selectedGateProfile: `${normalizedPacketType}:${effectiveRisk}`,
    gateProfileVersion: `${packetProfile.version}+${effectiveRisk}@1`,
    baseRisk,
    effectiveRisk,
    overlays: [...explicitOverlays].sort(),
    requiredGates: [...requiredGates],
    appliedRules
  };
}

export function evaluatePacketGateProfile({ repoRoot = process.cwd(), content = "", changedFiles = [] } = {}) {
  const packetType = readPacketValue(content, "Packet type");
  const riskLevel = readPacketValue(content, "Risk level") ?? readPacketValue(content, "Risk if started now");
  if (!packetType) {
    return { present: false, diagnostics: [] };
  }
  const claims = [
    ...normalizeList(readPacketValue(content, "Claims")),
    ...normalizeList(readPacketValue(content, "Declared claims")),
    ...normalizeList(readPacketValue(content, "Changed zones")),
    ...changedFiles.map(classifyChangedFile).filter(Boolean)
  ];
  const resolved = resolveRequiredGateProfile({
    policy: loadGateProfilePolicy(repoRoot),
    packetType,
    riskLevel,
    changedZones: readPacketValue(content, "Changed zones"),
    claims,
    releaseSensitive: truthyPacketValue(readPacketValue(content, "Release sensitivity")),
    browserFacing: truthyPacketValue(readPacketValue(content, "Browser/UI claims")),
    securitySensitive: truthyPacketValue(readPacketValue(content, "Security/data sensitivity")),
    dataSensitive: truthyPacketValue(readPacketValue(content, "Data sensitivity"))
  });
  return { present: true, diagnostics: [], ...resolved };
}

export function validateNaDecision({
  policy,
  packetType,
  gate,
  ruleId,
  evidence = [],
  substituteChecks = [],
  changedFiles = [],
  claims = []
} = {}) {
  const gatePolicy = policy ?? loadGateProfilePolicy();
  const rule = gatePolicy.naRules?.[ruleId];
  const diagnostics = [];
  if (!rule) diagnostics.push("unknown_na_rule");
  if (rule && !rule.packetTypes?.includes(normalizeToken(packetType))) diagnostics.push("na_rule_packet_type_mismatch");
  if (rule && !rule.gates?.includes(gate)) diagnostics.push("na_rule_gate_mismatch");
  if (evidence.length === 0) diagnostics.push("missing_na_evidence");
  for (const check of rule?.requiredSubstituteChecks ?? []) {
    if (!substituteChecks.includes(check)) diagnostics.push(`missing_substitute_check:${check}`);
  }
  const triggers = new Set([
    ...changedFiles.map(classifyChangedFile).filter(Boolean),
    ...normalizeList(claims)
  ]);
  for (const blocked of rule?.cannotBeUsedWhen ?? []) {
    if (triggers.has(blocked)) diagnostics.push(`na_contradicted_by:${blocked}`);
  }
  return { ok: diagnostics.length === 0, diagnostics };
}

export function closeoutRequiredGateDiagnostics({ requiredGates = [], gateResults = [] } = {}) {
  const resultByGate = new Map(gateResults.map((result) => [result.gate ?? result.gateId, result]));
  const diagnostics = [];
  for (const gate of requiredGates) {
    const result = resultByGate.get(gate);
    if (!result) {
      diagnostics.push({ gate, code: "missing_required_gate" });
      continue;
    }
    const status = result.status ?? "missing";
    if (BAD_STATUSES.has(status) || !PASS_STATUSES.has(status)) {
      diagnostics.push({ gate, code: "required_gate_not_passing", status });
    }
    if (result.fresh === false) diagnostics.push({ gate, code: "required_gate_stale" });
    if (result.trusted === false) diagnostics.push({ gate, code: "required_gate_untrusted" });
    if (result.unresolved === true) diagnostics.push({ gate, code: "required_gate_unresolved" });
  }
  return diagnostics;
}

function applyPolicyGates({ requiredGates, appliedRules, rules, ruleId }) {
  if (!Array.isArray(rules) || rules.length === 0) return;
  for (const gate of rules) requiredGates.add(gate);
  appliedRules.push(ruleId);
}

function readPacketValue(content, label) {
  return readPacketBulletFieldValueFromContent(content, label) ?? readPacketHeaderValueFromContent(content, label);
}

function normalizeToken(value) {
  return normalizePacketHeaderValue(value).replace(/_/g, "-");
}

function normalizeList(value) {
  return parseDelimitedList(value).map(normalizeToken).filter(Boolean);
}

function truthyPacketValue(value) {
  const normalized = normalizeToken(value);
  return Boolean(normalized) && !["no", "none", "false", "not-needed", "not-applicable"].includes(normalized);
}

function classifyChangedFile(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/").toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("browser") || normalized.includes("ui") || normalized.includes("frontend")) return "browser-facing";
  if (normalized.includes("security") || normalized.includes("permission") || normalized.includes("secret")) return "security-sensitive";
  if (normalized.includes("data") || normalized.includes("database") || normalized.includes("schema")) return "data-sensitive";
  if (normalized.startsWith(".harness/runtime/") || normalized.startsWith("_harness/") || normalized.includes("/runtime/")) return "runtime-path-changed";
  return null;
}

function diagnostic(field, status, current, expected) {
  const message = `${field}: expected ${expected}; current ${current}.`;
  return { field, status, current, expected, message, reason: message };
}
