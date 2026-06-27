import { normalizePacketHeaderValue } from "../lib/packet-markdown.js";

const RISK_ORDER = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4
};

export function classifyRisk(packet, content) {
  const declared = normalizeRisk(
    packet.header["Risk class"] ??
    packet.fields["Risk class"] ??
    packet.header["Risk if started now"] ??
    "low"
  );
  const derived = deriveRisk(packet, content);
  const effective = maxRisk(declared, derived.risk);
  return {
    declared,
    derived: derived.risk,
    effective,
    triggerReason: derived.reason,
    readyForCodeGate: effective === "high" || effective === "critical"
      ? "implementation transition requires explicit Ready For Code approval"
      : "standard Ready For Code enforcement"
  };
}

export function emptyRisk() {
  return {
    declared: "low",
    derived: "low",
    effective: "low",
    triggerReason: "packet unavailable",
    readyForCodeGate: "packet unavailable"
  };
}

function deriveRisk(packet, content) {
  const riskIfStarted = normalizeRisk(packet.header["Risk if started now"] ?? "");
  if (riskIfStarted !== "low") {
    return {
      risk: riskIfStarted,
      reason: `Risk if started now declares ${riskIfStarted}.`
    };
  }

  const haystack = content.toLowerCase();
  const highTriggers = [
    "authority-model mutation",
    "authority model mutation",
    "shipped starter payload",
    "release packaging",
    "security-sensitive",
    "data / cutover",
    "data/cutover",
    "artifact retirement execution",
    "authority cutover"
  ];
  const highTrigger = highTriggers.find((trigger) => haystack.includes(trigger));
  if (highTrigger) {
    return { risk: "high", reason: `content trigger: ${highTrigger}` };
  }

  const gateProfile = normalizePacketHeaderValue(packet.header["Gate profile"] ?? packet.fields["Gate profile"] ?? "");
  if (gateProfile === "contract") {
    return { risk: "normal", reason: "gate profile contract." };
  }

  const normalTriggers = ["validator behavior", "workflow/tooling", "reusable runtime"];
  const normalTrigger = normalTriggers.find((trigger) => haystack.includes(trigger));
  if (normalTrigger) {
    return { risk: "normal", reason: `content trigger: ${normalTrigger}` };
  }

  return { risk: "low", reason: "no elevated risk trigger." };
}

function normalizeRisk(value) {
  const normalized = normalizePacketHeaderValue(value);
  if (normalized.includes("critical")) {
    return "critical";
  }
  if (normalized.includes("high")) {
    return "high";
  }
  if (normalized.includes("normal") || normalized.includes("medium")) {
    return "normal";
  }
  return "low";
}

function maxRisk(left, right) {
  return RISK_ORDER[left] >= RISK_ORDER[right] ? left : right;
}
