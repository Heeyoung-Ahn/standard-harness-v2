import { REDACTION_PATTERNS } from "./redact-patterns.js";

const MAX_SCAN_BYTES = 2_000_000;

export function normalizeForSecretScan(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

export function scanSensitiveText(value, { includeLow = false } = {}) {
  const normalized = normalizeForSecretScan(value);
  if (Buffer.byteLength(normalized, "utf8") > MAX_SCAN_BYTES) {
    return [{ type: "SCAN_INPUT_TOO_LARGE", tier: "HIGH", count: 1, failClosed: true }];
  }
  const findings = [];
  for (const patternDef of REDACTION_PATTERNS) {
    if (!includeLow && patternDef.tier === "LOW") continue;
    const pattern = new RegExp(patternDef.pattern.source, patternDef.pattern.flags.includes("g") ? patternDef.pattern.flags : `${patternDef.pattern.flags}g`);
    const matches = [...normalized.matchAll(pattern)];
    if (matches.length > 0) {
      findings.push({ id: patternDef.id, type: patternDef.type, tier: patternDef.tier, count: matches.length });
    }
  }
  return findings;
}

export function redactSensitiveText(value) {
  let output = normalizeForSecretScan(value);
  for (const patternDef of REDACTION_PATTERNS) {
    const pattern = new RegExp(patternDef.pattern.source, patternDef.pattern.flags.includes("g") ? patternDef.pattern.flags : `${patternDef.pattern.flags}g`);
    output = output.replace(pattern, `[REDACTED:${patternDef.type}]`);
  }
  return output;
}

export function hasUnredactedHighOrMediumSecret(value) {
  return scanSensitiveText(value).some((finding) => ["HIGH", "MEDIUM"].includes(finding.tier));
}
