export function buildCloseoutEvidenceAuthority({ executionMode, canClaimIndependentReview } = {}) {
  const independent = Boolean(canClaimIndependentReview);
  const routeExecutionEvidenceOnly = !independent || executionMode === "mock-adapter";
  return {
    routeExecutionEvidenceOnly,
    independentReviewClaim: independent,
    implementationEvidenceRequired: true,
    testEvidenceRequired: true,
    reviewEvidenceRequired: true,
    note: routeExecutionEvidenceOnly
      ? "Route execution evidence is not implementation, test, or review evidence; use packet, walkthrough, and review artifacts for those claims."
      : "Route execution may claim independent role execution, but packet, walkthrough, and review artifacts still own closeout evidence."
  };
}

export function buildPlannerCloseoutDecisionRequest({ workItemId, currentOwner, currentStatus, routeJobStatus } = {}) {
  const owner = normalizeOwner(currentOwner);
  const status = normalizeOwner(currentStatus);
  const id = workItemId ?? "WORK-ITEM";
  if (status === "closed") {
    return [
      "Packet is already closed; do not rerun closeout transitions.",
      "Run: npm run harness:sync-state."
    ].join(" ");
  }
  if (routeJobStatus && routeJobStatus !== "completed") {
    return "Route job is not completed; resolve the route job before Planner closeout.";
  }
  if (owner === "planner") {
    return [
      "Planner closeout session completed; current owner is already planner, so do not rerun orchestrator-to-planner.",
      `Then run: npm run harness:transition -- --transition planner-closeout-hold --work-item ${id} --apply;`,
      "npm run harness:sync-state."
    ].join(" ");
  }
  if (owner === "orchestrator") {
    return [
      "Planner closeout session completed; review closeout package before final packet state mutation.",
      `Then run: npm run harness:transition -- --transition orchestrator-to-planner --work-item ${id} --apply;`,
      `npm run harness:transition -- --transition planner-closeout-hold --work-item ${id} --apply;`,
      "npm run harness:sync-state."
    ].join(" ");
  }
  return [
    `Planner closeout session completed, but current owner is ${owner || "unknown"}.`,
    "Do not run a stale closeout transition sequence; route or reconcile the owner before closeout."
  ].join(" ");
}

export function decorateCloseoutPackageForCurrentState({
  closeoutPackage,
  workItemId,
  currentOwner,
  currentStatus,
  routeJobStatus,
  executionMode,
  canClaimIndependentReview
} = {}) {
  if (!closeoutPackage) {
    return null;
  }
  return {
    ...closeoutPackage,
    plannerDecisionRequest: buildPlannerCloseoutDecisionRequest({
      workItemId: workItemId ?? closeoutPackage.workItemId,
      currentOwner,
      currentStatus,
      routeJobStatus
    }),
    evidenceAuthority: buildCloseoutEvidenceAuthority({
      executionMode,
      canClaimIndependentReview
    })
  };
}

function normalizeOwner(value) {
  return String(value ?? "").trim().toLowerCase();
}
