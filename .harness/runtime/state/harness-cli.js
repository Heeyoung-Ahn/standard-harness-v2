import { pathToFileURL } from "node:url";

import { createCommandTable } from "./cli-dispatch-table.js";
import { renderUsage } from "./cli-help.js";
import { DEFAULT_DB_PATH } from "./operating-state-store.js";

export function main({
  argv = process.argv,
  env = process.env,
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
  entrypointPath = ".harness/runtime/state/harness-cli.js"
} = {}) {
  const command = argv[2];
  const repoRoot = env.REPO_ROOT ?? cwd;
  const outputDir = repoRoot;
  const dbPath = env.HARNESS_DB_PATH ?? DEFAULT_DB_PATH;
  const commands = createCommandTable({ repoRoot, outputDir, dbPath, args: argv.slice(3) });

  if (!command || !commands[command]) {
    stderr.write(renderUsage({ entrypointPath }));
    return 1;
  }

  const result = commands[command]();
  stdout.write(`${formatResult(result)}\n`);
  return result.ok === false || result.cutoverReady === false ? 1 : 0;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  process.exit(main());
}

function formatResult(result) {
  if (["codex-start", "codex-plugin", "codex-ready", "codex-task", "reviewers", "reviewer-report", "learn", "doctor", "status", "next", "handoff", "explain", "validation-report", "context", "context --repair", "sync-state", "transition", "risk", "first-packet", "evidence", "evidence-manifest", "browser-evidence", "docs-commands", "promote-starter", "release-candidate-bundle", "packet-preflight", "brief", "agent", "orchestrate", "learning", "p2", "v23", "v24", "v25", "v26", "v27", "v28"].includes(result.command)) {
    return `${formatHumanSummary(result)}\n\n${JSON.stringify(result, null, 2)}`;
  }

  return JSON.stringify(result, null, 2);
}

function formatHumanSummary(result) {
  if (result.command === "codex-start") {
    return [
      "Standard Harness Codex Start",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Readiness: ${result.readiness?.verdict ?? "unknown"}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "codex-plugin") {
    return [
      "Standard Harness Codex Plugin",
      `- Subcommand: ${result.subcommand ?? "validate"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Payload files: ${result.payloadCount ?? result.manifest?.managedArtifacts?.length ?? "n/a"}`,
      `- Unsafe paths: ${result.unsafePaths?.length ?? result.manifest?.safety?.unsafePaths?.length ?? 0}`
    ].join("\n");
  }

  if (result.command === "codex-ready") {
    return [
      "Standard Harness Codex Readiness",
      `- Verdict: ${result.verdict ?? "unknown"}`,
      `- Lane: ${result.lane ?? "n/a"}`,
      `- Packet: ${result.packet ?? "none"}`,
      `- Gates: ${result.gates?.map((gate) => `${gate.gate}=${gate.status}`).join(", ") ?? "n/a"}`,
      `- Reason: ${result.reason ?? "none"}`,
      `- Next hard gate: ${result.nextHardGateCommand ?? "npm run harness:packet-preflight"}`,
      `- Approval boundary: ${result.approvalBoundary ?? "codex-ready is not an approval gate"}`
    ].join("\n");
  }

  if (result.command === "codex-task") {
    return [
      "Standard Harness Codex Task Brief",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Task: ${result.taskId ?? "unknown"}`,
      `- Lane: ${result.lane ?? "n/a"}`,
      `- Apply: ${result.apply ? "yes" : "no"}`,
      `- Artifacts: ${result.artifactsWritten?.join(", ") || "preview-only"}`
    ].join("\n");
  }

  if (result.command === "reviewers" || result.command === "reviewer-report") {
    return [
      "Standard Harness Reviewer Profiles",
      `- Subcommand: ${result.subcommand ?? "resolve"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Required: ${result.required?.map((profile) => profile.id).join(", ") || "none"}`,
      `- Missing: ${result.missing?.map((profile) => profile.id).join(", ") || result.missingReports?.map((profile) => profile.id).join(", ") || "none"}`
    ].join("\n");
  }

  if (result.command === "learn") {
    return [
      "Standard Harness Learnings",
      `- Subcommand: ${result.subcommand ?? "recent"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Entries: ${result.entries?.length ?? result.count ?? "n/a"}`,
      `- Stale: ${result.stale?.length ?? 0}`,
      `- Contradictions: ${result.contradictions?.length ?? 0}`
    ].join("\n");
  }

  if (result.command === "doctor") {
    return [
      "Harness Doctor",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Summary: ${result.summary}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "status") {
    const lastHandoff = result.handoff
      ? `${result.handoff.createdAt} ${result.handoff.fromRole} -> ${result.handoff.toRole} | ${result.handoff.summary}`
      : "none recorded";
    const assignment = result.assignment
      ? `${result.assignment.owner}: [${result.assignment.workItemId}] ${result.assignment.title} (${result.assignment.status}${formatRouteSummary(result.assignment)})${formatOperatorSummary(result.assignment)}`
      : "none";
    return [
      "Harness Status",
      `- Stage: ${result.stage}`,
      `- Gate: ${result.gateState}`,
      `- Focus: ${result.focus}`,
      `- Last handoff: ${lastHandoff}`,
      `- Current assignment: ${assignment}`,
      `- Next owner: ${result.nextOwner ?? "unassigned"}`,
      `- Open blockers: ${result.openBlockers}`,
      `- Open decisions: ${result.openDecisions}`,
      `- Harness state validation: ${result.technicalValidation.ok ? "pass" : "fail"} (${result.technicalValidation.blockingFindingCount} blocker(s); runtime validation ready: ${result.technicalValidation.runtimeValidationReady ? "yes" : "no"}; not product verification)`,
      `- Workflow gate: ${result.workflowGate.status}, ${result.workflowGate.detail}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "next") {
    const nextTask = result.nextTask
      ? `[${result.nextTask.workItemId}] ${result.nextTask.title} (${result.nextTask.status})`
      : "none";
    return [
      "Harness Next",
      `- Validation: ${result.validation.ok ? "pass" : "fail"}`,
      `- Next owner: ${result.nextOwner ?? "unassigned"}`,
      `- Next task: ${nextTask}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "handoff") {
    const nextTask = result.nextTask
      ? `[${result.nextTask.workItemId}] ${result.nextTask.title} (${result.nextTask.status})`
      : "none";
    return [
      "Harness Handoff",
      `- Result: ${result.ok ? "ready" : result.routeStatus}`,
      `- Next owner: ${result.nextOwner ?? "unassigned"}`,
      `- Route: ${result.workflow}`,
      `- Resolved by: ${result.resolvedBy}`,
      `- Next task: ${nextTask}`,
      `- Command hint: ${result.commandHints.npm} | ${result.commandHints.portable}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "explain") {
    return [
      "Harness Explain",
      `- Result: ${result.ok ? "no blockers" : "blocked"}`,
      `- Summary: ${result.summary}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "transition") {
    const mode = result.apply ? "apply" : "preview";
    return [
      "Harness Transition",
      `- Mode: ${mode}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Transition: ${result.transition}`,
      `- Work item: ${result.workItemId}`,
      `- From/To: ${result.fromOwner} -> ${result.toOwner}`,
      `- Status: ${result.status}`,
      `- Gate profile: ${result.gateProfile ?? "not declared"}`,
      ...(result.apply
        ? [
            `- Refresh command: ${result.refreshCommand ?? "npm run harness:sync-state"}`,
            `- Refresh order: validate -> validation-report -> context -> status`
          ]
        : []),
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "risk") {
    return [
      "Harness Risk",
      `- Subcommand: ${result.subcommand ?? "list"}`,
      `- Mode: ${result.apply ? "apply" : "preview"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Risk: ${result.riskId ?? (result.risks ? `${result.risks.length} listed` : "missing")}`,
      `- Status: ${result.status ?? "n/a"}`,
      `- Approval grant: Ready For Code=${result.approvalBoundary?.grantsReadyForCode === true ? "yes" : "no"}, implementation=${result.approvalBoundary?.grantsImplementationApproval === true ? "yes" : "no"}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "first-packet") {
    return [
      "Harness First Packet",
      `- Mode: ${result.apply ? "apply" : "preview"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Work item: ${result.workItemId ?? "missing"}`,
      `- Packet: ${result.packetPath ?? "missing"}`,
      `- Placeholder reconcile: ${result.placeholderItems?.length ?? 0}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "evidence") {
    return [
      "Harness Evidence",
      `- Mode: ${result.apply ? "apply" : "preview"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Type: ${result.type ?? "missing"}`,
      `- Work item: ${result.workItemId ?? "missing"}`,
      `- Target: ${result.targetPath ?? "missing"}`,
      `- Product commands: ${result.productCommands?.length ?? result.productResults?.length ?? 0}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }


  if (result.command === "evidence-manifest") {
    return [
      "Harness Evidence Manifest",
      `- Subcommand: ${result.subcommand ?? "audit"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Schema: ${result.schemaVersion ?? "n/a"}`,
      `- Target: ${result.targetPath ?? result.manifestPath ?? "n/a"}`,
      `- Manifests: ${result.manifestCount ?? result.manifests?.length ?? (result.manifest ? 1 : 0)}`,
      `- Diagnostics: ${result.diagnostics?.length ?? 0}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }


  if (result.command === "browser-evidence") {
    return [
      "Harness Browser Evidence",
      `- Subcommand: ${result.subcommand ?? "audit"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Schema: ${result.schemaVersion ?? "n/a"}`,
      `- Strict: ${result.strict ? "yes" : "no"}`,
      `- Target: ${result.targetPath ?? result.manifestPath ?? "n/a"}`,
      `- Manifests: ${result.manifestCount ?? result.manifests?.length ?? (result.manifest ? 1 : 0)}`,
      `- Diagnostics: ${result.diagnostics?.length ?? 0}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "docs-commands") {
    return [
      "Harness Docs Command Inventory",
      `- Subcommand: ${result.subcommand ?? "audit"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Docs: ${result.docCount ?? 0}`,
      `- Commands: ${result.commandCount ?? 0}`,
      `- Diagnostics: ${result.diagnostics?.length ?? 0}`,
      `- Output: ${result.outputPath ?? "not written"}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "promote-starter") {
    return [
      "Harness Promote Starter",
      `- Mode: ${result.dryRun ? "dry-run" : "export"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Include: ${result.summary?.include ?? 0}`,
      `- Exclude: ${result.summary?.exclude ?? 0}`,
      `- Review: ${result.summary?.review ?? 0}`,
      `- Target: ${result.targetRoot ?? "missing"}`,
      "- Authority: evidence-only; no release, publish, approval, closeout, risk-closure, product-verification, or residual-risk acceptance",
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "release-candidate-bundle") {
    return [
      "Harness Release Candidate Bundle",
      `- Subcommand: ${result.subcommand ?? "create"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Target: ${result.targetRoot ?? "missing"}`,
      `- Bundle: ${result.bundlePath ?? "n/a"}`,
      `- Diagnostics: ${result.diagnostics?.length ?? 0}`,
      `- Unresolved risks: ${result.summary?.unresolvedRisks ?? "n/a"}`,
      "- Authority: evidence-only; no release, publish, promotion, productization-complete, User UAT, or residual-risk approval",
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "packet-preflight") {
    return [
      "Harness Packet Preflight",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Stage: ${result.stage}`,
      `- Disposition: ${result.disposition}`,
      `- Work item: ${result.workItemId ?? "missing"}`,
      `- Packet: ${result.packetPath ?? "missing"}`,
      `- Ready For Code: ${result.readyForCode ?? "missing"}`,
      `- Risk: declared=${result.risk?.declared ?? "unknown"}; derived=${result.risk?.derived ?? "unknown"}; effective=${result.risk?.effective ?? "unknown"}`,
      `- Risk trigger: ${result.risk?.triggerReason ?? "unknown"}`,
      `- Evidence manifests: ${result.evidenceManifest?.manifestPaths?.length ?? 0}; diagnostics=${result.evidenceManifest?.diagnostics?.length ?? 0}`,
      `- Enum diagnostics: ${result.enumDiagnostics?.length ?? 0}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "brief") {
    return [
      "Harness Role Brief",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Work item: ${result.workItemId ?? "unknown"}`,
      `- Role: ${result.role ?? "unknown"}`,
      `- Brief: ${result.briefPath ?? "not written"}`
    ].join("\n");
  }

  if (result.command === "agent") {
    return [
      "Harness Agent",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Work item: ${result.workItemId ?? "unknown"}`,
      `- Role: ${result.role ?? "unknown"}`,
      `- Session: ${result.sessionId ?? "not-created"}`,
      `- Output: ${result.outputPath ?? "not-written"}`
    ].join("\n");
  }

  if (result.command === "orchestrate") {
    return [
      "Harness Orchestrate",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Work item: ${result.workItemId ?? "unknown"}`,
      `- Route job: ${result.routeJob?.routeJobId ?? "not-created"}`,
      `- Sessions: ${result.sessions?.length ?? 0}`
    ].join("\n");
  }

  if (result.command === "learning") {
    return [
      "Harness Learning",
      `- Mode: ${result.apply ? "apply" : "preview"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Solution: ${result.solutionId ?? "missing"}`,
      `- Output: ${result.solutionPath ?? "not planned"}`,
      `- Written: ${result.written ? "yes" : "no"}`
    ].join("\n");
  }


  if (result.command === "p2") {
    return [
      "Harness P2 Conductor",
      `- Subcommand: ${result.subcommand ?? "report"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Apply: ${result.apply ? "yes" : "no"}`,
      `- Next action: ${result.nextAction ?? result.message ?? "none"}`
    ].join("\n");
  }

  if (result.command === "v23") {
    return [
      "Harness V2.3 Lean Conductor",
      `- Subcommand: ${result.subcommand ?? "report"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Apply: ${result.apply ? "yes" : "no"}`,
      `- Lane: ${result.lane ?? result.summary?.lane ?? "n/a"}`,
      `- Next action: ${result.nextAction ?? result.message ?? "Use routed SSOT and avoid human manuals in default LLM context."}`
    ].join("\n");
  }
  if (result.command === "v24") {
    return [
      "Harness V2.4 Risk-Adaptive Conductor",
      `- Subcommand: ${result.subcommand ?? "report"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Apply: ${result.apply ? "yes" : "no"}`,
      `- Lane: ${result.lane ?? result.summary?.lane ?? "n/a"}`,
      `- Risk overlays: ${Array.isArray(result.riskOverlays) && result.riskOverlays.length > 0 ? result.riskOverlays.join(", ") : "none"}`,
      `- Next action: ${result.nextAction ?? result.message ?? "Use risk-adaptive overlays and keep default context lean."}`
    ].join("\n");
  }


  if (["v25", "v26", "v27", "v28"].includes(result.command)) {
    return [
      result.command === "v28"
        ? "Harness V2.8 Browser Evidence and Manual Hardening Gate"
        : result.command === "v27"
        ? "Harness V2.7 Release-Hardening Gate"
        : result.command === "v26"
          ? "Harness V2.6 Gate Compatibility Alias"
          : "Harness V2.5 Gate",
      `- Subcommand: ${result.subcommand ?? "gate"}`,
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Gate class: ${result.gateClass ?? "n/a"}`,
      `- Hard gate: ${result.notHardGate ? "no" : result.hardGate ? "yes" : "n/a"}`,
      `- Stage: ${result.stage ?? "unspecified"}`,
      `- Lane: ${result.lane ?? "n/a"}`,
      `- Lane source: ${result.laneDecision?.laneSource ?? "unknown"}`,
      `- Blocking state: ${result.blockingState ?? "n/a"}`,
      `- Warnings: ${result.warnings?.length ?? 0}`,
      `- Required hard gates: ${result.hardGateCommands?.join("; ") ?? "packet-preflight; validate"}`,
      `- Next action: ${result.nextAction ?? "none"}`
    ].join("\n");
  }

  if (result.command === "context") {
    return [
      "Harness Context",
      `- JSON: ${result.jsonPath}`,
      `- Markdown: ${result.markdownPath}`,
      `- Current task: ${result.context.activeTask?.workItemId ?? "none"}`,
      `- Next workflow: ${result.context.nextWork.workflow ?? "manual_selection_required"}`,
      `- Next action: ${result.context.nextWork.action}`
    ].join("\n");
  }

  if (result.command === "context --repair") {
    return [
      "Harness Context Repair",
      `- Confidence: ${result.confidence}`,
      `- Report: ${result.reportPath}`,
      `- Latest pointer: ${result.latestReportPath}`,
      `- Validation: ${result.report.validationStatus}`,
      `- Regenerated: ${result.report.regeneratedArtifacts.length}`,
      `- Authority mutation: ${result.report.authorityMutation ? "yes" : "no"}`,
      `- DB mutation: ${result.report.dbMutation}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  if (result.command === "sync-state") {
    return [
      "Harness Sync State",
      `- Result: ${result.ok ? "pass" : "fail"}`,
      `- Ordered steps: ${result.orderedSteps.join(" -> ")}`,
      `- Validate: ${result.steps[0].ok ? "pass" : "fail"}`,
      `- Validation report: ${result.steps[1].ok ? result.steps[1].gateDecision : "fail"}`,
      `- Context: ${result.steps[2].ok ? "pass" : "fail"}`,
      `- Status: ${result.steps[3].ok ? "pass" : "fail"}`,
      `- Failed step: ${result.failedStep ?? "none"}`,
      ...(result.convergenceNote ? [`- Convergence note: ${result.convergenceNote}`] : []),
      `- Harness state validation: ${result.technicalValidation.ok ? "pass" : "fail"} (${result.technicalValidation.blockingFindingCount} blocker(s); runtime validation ready: ${result.technicalValidation.runtimeValidationReady ? "yes" : "no"}; not product verification)`,
      `- Workflow gate: ${result.workflowGate.status}, ${result.workflowGate.detail}`,
      `- Next command: ${result.nextCommand ?? "none"}`,
      `- Scope: ${result.scopeNote}`,
      `- Next action: ${result.nextAction}`
    ].join("\n");
  }

  return [
    "Harness Validation Report",
    `- Result: ${result.ok ? "pass" : "fail"}`,
    "- Scope: harness structural/state validation only; product/feature verification evidence remains Tester/Reviewer/product-specific acceptance.",
    `- Markdown: ${result.markdownPath}`,
    `- JSON: ${result.jsonPath}`,
    `- Gate decision: ${result.report.gateDecision}`,
    `- Next action: ${result.report.nextAction}`
  ].join("\n");
}

function formatOperatorSummary(assignment) {
  if (!assignment?.activeOperatorId && !assignment?.activeOperatorLabel) {
    return "";
  }

  const operatorLabel = assignment.activeOperatorLabel ?? assignment.activeOperatorId;
  if (
    assignment.activeOperatorId &&
    assignment.activeOperatorLabel &&
    assignment.activeOperatorLabel !== assignment.activeOperatorId
  ) {
    return ` / operator ${operatorLabel} (${assignment.activeOperatorId})`;
  }
  return ` / operator ${operatorLabel}`;
}

function formatRouteSummary(assignment) {
  if (!assignment?.chosenRouteClass) {
    return "";
  }
  if (
    assignment.requestedRouteClass &&
    assignment.requestedRouteClass !== assignment.chosenRouteClass
  ) {
    return ` / route ${assignment.chosenRouteClass}; requested ${assignment.requestedRouteClass}`;
  }
  return ` / route ${assignment.chosenRouteClass}`;
}
