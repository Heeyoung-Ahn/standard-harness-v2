export function buildBootstrapPendingValidationReport({
  executedAt,
  validatorVersion,
  validation,
  candidateGates
}) {
  return {
    ok: false,
    command: "validation-report",
    validatorVersion,
    executedAt,
    cutoverReady: false,
    structuralReady: false,
    profileSummary: { declared: [], selected: [], activeProfileCount: 0 },
    riskClassifications: validation.riskClassifications ?? [],
    findings: validation.findings,
    nextAction: "Run INIT_STANDARD_HARNESS.cmd or npm run harness:init.",
    gateDecision: "hold",
    candidateGates,
    traceSummary: null,
    writeMode: "read-only-bootstrap-pending"
  };
}

export function applyRequestedSecurityReviewGate({ report, securityReview }) {
  if (!securityReview) {
    return report;
  }
  report.securityReview = securityReview.summary;
  if (securityReview.summary.contractStatus !== "requested") {
    return report;
  }

  report.findings = [...report.findings, ...securityReview.additionalFindings];
  const hasBlockingSecurityFinding = report.findings.some((finding) => finding?.severity === "error");
  report.ok = !hasBlockingSecurityFinding;
  report.cutoverReady = !hasBlockingSecurityFinding;
  report.gateDecision = hasBlockingSecurityFinding ? "hold" : "pass";
  return report;
}
