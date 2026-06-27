export const RISK_CLASS_ORDER = {
  low: 1,
  normal: 2,
  high: 3
};

export const LOW_RISK_CLOSEOUT_TIERS = new Set(["low-risk", "low-risk-planner-closeout"]);

export function startsApprovedDeliveryForTransition(transition) {
  return transition === "planner-to-developer" || transition === "planner-to-orchestrator";
}

export function normalizeCloseoutRiskTier(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, "-");
  return normalized || null;
}

export function riskClassRank(value) {
  return RISK_CLASS_ORDER[normalizeRiskClass(value)] ?? RISK_CLASS_ORDER.low;
}

export function normalizeRiskClass(value) {
  const normalized = normalizeCloseoutRiskTier(value);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("low")) {
    return "low";
  }
  if (normalized.startsWith("normal") || normalized.startsWith("standard")) {
    return "normal";
  }
  if (normalized.startsWith("high") || normalized.startsWith("release")) {
    return "high";
  }
  return null;
}
