const STAGES = new Set(["planning-open", "implementation-transition", "closeout"]);

export function normalizeStage(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return STAGES.has(normalized) ? normalized : null;
}

export function decideStage({ stage, readyForCode, effectiveRisk, enumDiagnostics }) {
  const rfcApproved = readyForCode === "approved";
  if (stage === "planning-open") {
    if ((effectiveRisk === "high" || effectiveRisk === "critical") && !rfcApproved) {
      return {
        disposition: "planning-hold",
        blocking: false,
        errors: [],
        findings: [
          {
            field: "Ready For Code",
            status: "hold",
            current: readyForCode,
            expected: "approved before implementation transition",
            reason: "High effective risk may be opened for planning, but must stay on hold before implementation."
          }
        ],
        nextAction: "Keep the packet in planning hold, record explicit Ready For Code approval, then run implementation-transition preflight.",
        blockedNextAction: "Keep the packet in planning hold until Ready For Code is approved."
      };
    }
    return {
      disposition: "planning-ready",
      blocking: false,
      errors: [],
      findings: [],
      nextAction: "Planning-open preflight passed. Continue Planner review or request Ready For Code approval.",
      blockedNextAction: "Resolve planning preflight findings."
    };
  }

  if (stage === "implementation-transition") {
    const findings = [];
    const errors = [];
    if (!rfcApproved) {
      findings.push({
        field: "Ready For Code",
        status: "block",
        current: readyForCode,
        expected: "approved",
        reason: "Implementation transitions require explicit Ready For Code approval."
      });
      errors.push(`Implementation transition requires Ready For Code approved; current value is ${readyForCode}.`);
    }
    if ((effectiveRisk === "high" || effectiveRisk === "critical") && !rfcApproved) {
      findings.push({
        field: "Effective risk",
        status: "block",
        current: effectiveRisk,
        expected: "Ready For Code approved before planner-to-developer or planner-to-orchestrator",
        reason: "High effective risk cannot leave Planner while RFC is unapproved."
      });
    }
    return {
      disposition: errors.length > 0 ? "implementation-blocked" : "implementation-ready",
      blocking: errors.length > 0,
      errors,
      findings,
      nextAction: "Implementation-transition preflight passed. Apply planner-to-developer or planner-to-orchestrator.",
      blockedNextAction: "Approve Ready For Code and close any related decision before implementation transition."
    };
  }

  return {
    disposition: enumDiagnostics.length > 0 ? "closeout-blocked" : "closeout-ready",
    blocking: enumDiagnostics.length > 0,
    errors: [],
    findings: enumDiagnostics.length > 0
      ? [{
          field: "Packet Exit Quality Gate",
          status: "block",
          current: `${enumDiagnostics.length} enum mismatch(es)`,
          expected: "all closeout enum fields match canonical values",
          reason: "Narrative belongs in closeout notes, not exact enum fields."
        }]
      : [],
    nextAction: "Closeout enum preflight passed. Continue Tester/Reviewer/Planner closeout.",
    blockedNextAction: "Move narrative text to closeout notes and set exact enum fields to canonical values."
  };
}

export function resolveFinalDisposition({ stage, errors, stageDecision }) {
  if (errors.length === 0) {
    return stageDecision.disposition;
  }
  if (stage === "implementation-transition") {
    return "implementation-blocked";
  }
  if (stage === "closeout") {
    return "closeout-blocked";
  }
  return stageDecision.disposition;
}

export function blockedNextActionForStage(stage, stageDecision) {
  if (stage === "implementation-transition") {
    return "Resolve blocking implementation-transition diagnostics before planner-to-developer or planner-to-orchestrator.";
  }
  if (stage === "closeout") {
    return "Resolve closeout diagnostics before Tester/Reviewer/Planner closeout.";
  }
  return stageDecision.blockedNextAction;
}
