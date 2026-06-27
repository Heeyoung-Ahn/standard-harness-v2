export const GATE_PROFILES = {
  light: {
    id: "light",
    label: "Light",
    summary: "Docs-only or note-only work with no executable, runtime, generated-surface, or reusable contract impact.",
    requiredEvidence: [
      "canonical artifact update",
      "validator if generated/runtime state is touched",
      "turn-close handoff note"
    ],
    forbids: [
      "runtime code changes",
      "workflow contract changes",
      "active-context command/state changes",
      "root/starter reusable drift"
    ]
  },
  standard: {
    id: "standard",
    label: "Standard",
    summary: "Normal approved implementation packet with targeted tests and validator evidence.",
    requiredEvidence: [
      "approved packet scope",
      "targeted tests for changed behavior",
      "TDD evidence contract or approved exemption for behavior-bearing code",
      "harness validator",
      "handoff evidence"
    ],
    forbids: [
      "unapproved approval-boundary changes",
      "release packaging changes"
    ]
  },
  contract: {
    id: "contract",
    label: "Contract",
    summary: "Reusable runtime, workflow, validator, active-context command/state, packet-template, or root/starter contract change.",
    requiredEvidence: [
      "approved packet scope and Ready For Code",
      "root and standard-template synchronization",
      "targeted regression tests",
      "TDD evidence contract or approved exemption for behavior-bearing code",
      "CSO security evidence when risk/profile triggers apply",
      "parallel batch evidence when parallel execution is declared",
      "root test suite",
      "starter test suite",
      "harness validator",
      "active context evidence when re-entry state is affected",
      "review closeout"
    ],
    forbids: [
      "Developer self-approval",
      "generated-doc manual authority",
      "derived context canonical write authority"
    ]
  },
  release: {
    id: "release",
    label: "Release",
    summary: "Packaging, installer, release manual, cutover, security, or release-baseline change.",
    requiredEvidence: [
      "approved release packet",
      "release-baseline parity checks",
      "root and standard-template synchronization",
      "packaging/manual evidence",
      "security or cutover evidence where applicable",
      "CSO security evidence when risk/profile triggers apply",
      "full validator and review closeout"
    ],
    forbids: [
      "partial release-baseline drift",
      "unreviewed packaging or installer change"
    ]
  }
};

export const GATE_PROFILE_IDS = Object.freeze(Object.keys(GATE_PROFILES));
export const DEFAULT_GATE_PROFILE_ID = "standard";

export function resolveGateProfile(value) {
  const id = normalizeGateProfileId(value);
  return id ? GATE_PROFILES[id] ?? null : null;
}

export function normalizeGateProfileId(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, "-");
  return normalized || null;
}

export function summarizeGateProfile(profile) {
  if (!profile) {
    return null;
  }
  return {
    id: profile.id,
    label: profile.label,
    summary: profile.summary,
    requiredEvidence: [...profile.requiredEvidence],
    forbids: [...profile.forbids]
  };
}
