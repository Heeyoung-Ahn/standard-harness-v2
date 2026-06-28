import fs from "node:fs";
import path from "node:path";

import { ACTIVE_CONTEXT_JSON, writeActiveContext } from "./active-context.js";
import { inspectTaskPacketContract, validateGeneratedStateDocs } from "./drift-validator.js";
import { CURRENT_STATE_DOC, TASK_LIST_DOC, writeGeneratedStateDocs } from "./generate-state-docs.js";
import {
  DEFAULT_GATE_PROFILE_ID,
  GATE_PROFILES,
  resolveGateProfile,
  summarizeGateProfile
} from "./gate-profiles.js";
import {
  AGENT_TRACES_DIR,
  ACTIVE_PROFILES_MARKDOWN,
  ARTIFACT_PATHS,
  CUTOVER_REPORT_JSON,
  CUTOVER_REPORT_MARKDOWN,
  GENERATED_DOCS_DIR,
  REPOSITORY_LAYOUT_MARKDOWN,
  VALIDATION_REPORT_JSON,
  VALIDATION_REPORT_MARKDOWN
} from "./harness-paths.js";
import { looksLikeStarterPlaceholder } from "./init-project.js";
import {
  normalizeDeliveryRouteMode,
  runAgentSession,
  runOrchestratedCloseout,
  runRoleBrief,
  validateDeliveryRouteModeForTransition
} from "./agent-routing.js";
import { decorateCloseoutPackageForCurrentState } from "./closeout-decision.js";
import {
  normalizePacketHeaderValue,
  parseDelimitedList,
  parseTableCells,
  readFirstMarkdownTableBodyLines,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";
import { DEFAULT_DB_PATH } from "./operating-state-store.js";
import {
  formatTaskPacketSemanticFinding,
  inferPacketArtifactId,
  normalizeReadyForCodeState,
  readPacketBulletFieldValue,
  readPacketDeliveryRouteMode,
  readPacketGateProfile,
  readPacketHeaderValue,
  readPacketReadyForCode,
  readPacketRouteClass,
  readPacketSecurityReviewContract,
  readPacketSemanticTraceContract,
  resolvePacketMarkdownPath
} from "./packet-contract.js";
import {
  recommendNextActionFromState,
  runValidator,
  summarizeValidation,
  withStore
} from "./validation-core.js";
import { buildHarnessStatus } from "./status-commands.js";
import { writeValidationReport } from "./validation-report.js";
import { evaluateRiskAdaptiveGate } from "./risk-adaptive-gates.js";
import { RELEASE_BASELINE, isInstallableReleaseMaintainerRepo } from "./release-baseline.js";
import {
  isCanonicallyClosedWorkItem,
  isClosedStatus,
  readCanonicalTaskLifecycleHints,
  resolveHandoffExecution,
  selectActiveWorkItem,
  workflowForOwner
} from "./workflow-routing.js";
import {
  LOW_RISK_CLOSEOUT_TIERS,
  RISK_CLASS_ORDER,
  normalizeCloseoutRiskTier,
  normalizeRiskClass,
  riskClassRank,
  startsApprovedDeliveryForTransition
} from "./transitions/contracts.js";
import { runPacketPreflightCommand } from "./packet-preflight.js";

const PLANNER_HOLD_NEXT_ACTION = "Keep the reusable baseline on planning hold until a new approved lane is selected.";

export function runStateSync({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH } = {}) {
  const orderedSteps = ["validate", "validation-report", "context", "status"];
  const initialValidation = runValidator({ repoRoot, outputDir, dbPath });
  const validationReport = writeValidationReport({ repoRoot, outputDir, dbPath });
  const context = withStore({ dbPath, repoRoot }, (store) => {
    const contextResult = writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: validationReport.report
    });
    return {
      ok: true,
      command: "context",
      jsonPath: contextResult.jsonPath,
      markdownPath: contextResult.markdownPath,
      context: contextResult.context
    };
  });
  const status = buildHarnessStatus({ repoRoot, outputDir, dbPath });
  const preliminaryFailedStep =
    (!initialValidation.ok && "validate") ||
    (!validationReport.ok && "validation-report") ||
    (!context.ok && "context") ||
    (!status.ok && "status") ||
    null;
  const finalPass = Boolean(status.ok && validationReport.ok && context.ok);
  const failedStep = finalPass ? null : preliminaryFailedStep;

  return {
    ok: status.ok,
    command: "sync-state",
    orderedSteps,
    failedStep,
    nextCommand: failedStep ? `npm run harness:${failedStep}` : null,
    nextAction: status.nextAction,
    convergenceNote:
      finalPass && preliminaryFailedStep
        ? `${preliminaryFailedStep} failed before ordered refresh converged; final status is pass.`
        : null,
    scopeNote: "Harness structural/state refresh only; not product verification.",
    technicalValidation: status.technicalValidation,
    workflowGate: status.workflowGate,
    steps: [
      {
        name: "validate",
        ok: initialValidation.ok,
        findingCount: initialValidation.findings.length
      },
      {
        name: "validation-report",
        ok: validationReport.ok,
        gateDecision: validationReport.report.gateDecision
      },
      {
        name: "context",
        ok: context.ok,
        jsonPath: context.jsonPath,
        markdownPath: context.markdownPath
      },
      {
        name: "status",
        ok: status.ok,
        workflowGate: status.workflowGate,
        technicalValidation: status.technicalValidation
      }
    ],
    validationReport: {
      markdownPath: validationReport.markdownPath,
      jsonPath: validationReport.jsonPath,
      gateDecision: validationReport.report.gateDecision
    },
    context: {
      jsonPath: context.jsonPath,
      markdownPath: context.markdownPath
    },
    status
  };
}

export function runTransition({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseTransitionArgs(args);
  if (!options.apply) {
    return withStore({ dbPath, repoRoot }, (store) => buildTransitionPlan({ store, repoRoot, dbPath, options }));
  }

  const applied = withStore({ dbPath, repoRoot }, (store) => {
    const plan = buildTransitionPlan({ store, repoRoot, dbPath, options });
    if (!plan.ok) {
      return plan;
    }
    return applyTransitionPlan({ store, repoRoot, outputDir, plan, options });
  });

  if (!applied.ok) {
    return applied;
  }

  withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir
    })
  );
  const validationReport = writeValidationReport({ repoRoot, outputDir, dbPath });
  const activeContext = withStore({ dbPath, repoRoot }, (store) =>
    writeActiveContext({
      store,
      repoRoot,
      outputDir,
      validation: {
        ok: validationReport.ok,
        cutoverReady: validationReport.report.cutoverReady,
        findings: validationReport.report.findings,
        gateDecision: validationReport.report.gateDecision,
        executedAt: validationReport.report.executedAt
      }
    })
  );
  const validationReportSummary = {
    ok: validationReport.ok,
    markdownPath: validationReport.markdownPath,
    jsonPath: validationReport.jsonPath,
    gateDecision: validationReport.report.gateDecision,
    findingCount: validationReport.report.findings.length
  };

  return {
    ...applied,
    ok: validationReport.ok,
    errors: validationReport.ok
      ? applied.errors
      : [
          ...(applied.errors ?? []),
          "Transition apply completed, but validation report failed; do not treat this handoff as clean."
        ],
    validationReport: validationReportSummary,
    activeContext: {
      jsonPath: activeContext.jsonPath,
      markdownPath: activeContext.markdownPath
    }
  };
}

export function runPlannerPacketOpen({
  repoRoot = process.cwd(),
  outputDir = repoRoot,
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseTransitionArgs(args);
  const preflight = withStore({ dbPath, repoRoot }, (store) =>
    buildPlannerPacketOpenPlan({ store, repoRoot, options })
  );

  if (!preflight.ok) {
    return preflight;
  }

  withStore({ dbPath, repoRoot }, (store) => {
    store.upsertArtifact({
      artifactId: preflight.artifactId,
      path: preflight.packetPath,
      category: "task_packet",
      title: preflight.title,
      sourceRef: preflight.packetPath,
      metadata: {
        ...(store.getArtifactByPath(preflight.packetPath)?.metadata ?? {}),
        workItemId: preflight.workItemId,
        gateProfile: preflight.gateProfile,
        laneType: preflight.laneType ?? null
      }
    });
    store.upsertWorkItem({
      workItemId: preflight.workItemId,
      title: preflight.title,
      status: preflight.status,
      nextAction: preflight.nextAction,
      sourceRef: preflight.packetPath,
      domainHint: preflight.domainHint,
      riskHint: preflight.riskHint,
      owner: "planner",
      metadata: {
        ...(store.getWorkItem(preflight.workItemId)?.metadata ?? {}),
        gateProfile: preflight.gateProfile,
        readyForCode: preflight.readyForCode ?? "pending",
        laneType: preflight.laneType ?? null
      }
    });
  });

  const transitionArgs = [
    "--apply",
    "--work-item",
    preflight.workItemId,
    "--from",
    "planner",
    "--to",
    "planner",
    "--status",
    preflight.status,
    "--gate-profile",
    preflight.gateProfile,
    "--source-ref",
    preflight.packetPath,
    "--summary",
    preflight.summary,
    "--next-action",
    preflight.nextAction
  ];

  if (preflight.currentStage) {
    transitionArgs.push("--current-stage", preflight.currentStage);
  }
  if (preflight.currentFocus) {
    transitionArgs.push("--current-focus", preflight.currentFocus);
  }

  const transitionResult = runTransition({ repoRoot, outputDir, dbPath, args: transitionArgs });

  return {
    ok: transitionResult.ok,
    command: "planner-open-packet",
    apply: true,
    packetPath: preflight.packetPath,
    artifactId: preflight.artifactId,
    workItemId: preflight.workItemId,
    title: preflight.title,
    gateProfile: preflight.gateProfile,
    readyForCode: preflight.readyForCode,
    status: preflight.status,
    nextAction: preflight.nextAction,
    summary: preflight.summary,
    checks: preflight.checks,
    plannedUpdates: transitionResult.plannedUpdates,
    errors: transitionResult.errors ?? [],
    transitionResult
  };
}

function parseTransitionArgs(args) {
  const options = { apply: false, positionals: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      options.positionals.push(arg);
      continue;
    }

    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  const [first, second, third] = options.positionals;
  if (first) {
    if (isNamedTransition(first)) {
      options.transition ??= first;
      options.workItem ??= second;
    } else {
      options.workItem ??= first;
      options.to ??= second;
      options.from ??= third;
    }
  }
  delete options.positionals;
  return options;
}

function buildPlannerPacketOpenPlan({ store, repoRoot, options }) {
  const packetPath = options.packetPath ?? options.packet ?? options.sourceRef;
  const workItemId = options.workItem ?? options.workItemId;
  const title = options.title;
  const owner = normalizeOwner(options.owner ?? "planner");
  const status = options.status ?? "planning";
  const packetAbsolutePath = packetPath ? path.resolve(repoRoot, packetPath) : null;
  const checks = [];
  const errors = [];

  if (!packetPath) {
    errors.push("Missing --packet-path.");
  }
  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (!title) {
    errors.push("Missing --title.");
  }
  if (owner !== "planner") {
    errors.push(`Planner packet opening helper only supports owner planner; received ${options.owner ?? "missing"}.`);
  }
  if (packetPath && (!packetPath.endsWith(".md") || !packetPath.startsWith("reference/packets/"))) {
    errors.push(`Packet path must point to a markdown packet under reference/packets. (${packetPath})`);
  }
  if (packetAbsolutePath && !fs.existsSync(packetAbsolutePath)) {
    errors.push(`Packet path does not exist: ${packetPath}.`);
  }

  const releaseState = store.getReleaseState("current");
  const openWorkItems = store
    .listWorkItems()
    .filter((item) => !isClosedStatus(item.status) && item.workItemId !== workItemId);
  if (openWorkItems.length > 0) {
    errors.push(
      `Planner packet opening requires no other open work items; ${openWorkItems[0].workItemId} (${openWorkItems[0].owner ?? "unassigned"} / ${openWorkItems[0].status}) must be closed or explicitly routed first.`
    );
  }

  const packetContent = packetAbsolutePath && fs.existsSync(packetAbsolutePath)
    ? fs.readFileSync(packetAbsolutePath, "utf8")
    : null;
  const gateProfile =
    resolveGateProfile(options.gateProfile)?.id ??
    resolveGateProfile(readPacketHeaderValue(repoRoot, packetPath, "Gate profile"))?.id ??
    null;
  const readyForCode = readPacketReadyForCode(repoRoot, packetPath) || "pending";
  const laneType = readPacketBulletFieldValue(repoRoot, packetPath, "Lane-type declaration");
  const artifactId = options.artifactId ?? inferPacketArtifactId(packetPath);
  const requiredHeaderRows = [
    "Work item",
    "Ready For Code",
    "Human sync needed",
    "Gate profile",
    "User-facing impact",
    "Layer classification",
    "Active profile dependencies",
    "Profile evidence status",
    "UX archetype status",
    "UX deviation status",
    "Environment topology status",
    "Domain foundation status",
    "Authoritative source intake status",
    "Shared-source wave status",
    "Packet exit gate status",
    "Existing system dependency",
    "New authoritative source impact",
    "Risk if started now"
  ];

  for (const label of requiredHeaderRows) {
    const value = readPacketHeaderValue(repoRoot, packetPath, label);
    checks.push({
      check: `header:${label}`,
      ok: Boolean(value),
      detail: value ?? "missing"
    });
    if (!value) {
      errors.push(`Quick Decision Header is missing required row: ${label}.`);
    }
  }

  if (!gateProfile) {
    errors.push(`Packet gate profile is missing or invalid. (${options.gateProfile ?? "not declared"})`);
  }

  const manifest = packetContent ? sliceSection(packetContent, "## Verification Manifest") : null;
  checks.push({
    check: "verification-manifest",
    ok: Boolean(manifest),
    detail: manifest ? "present" : "missing"
  });
  if (!manifest) {
    errors.push("Packet is missing ## Verification Manifest.");
  }

  for (const marker of plannerOpenRequiredManifestMarkers(gateProfile, { repoRoot, packetPath })) {
    const ok = Boolean(manifest && manifest.toLowerCase().includes(marker.toLowerCase()));
    checks.push({
      check: `manifest:${marker}`,
      ok,
      detail: ok ? "present" : "missing"
    });
    if (!ok) {
      errors.push(`Verification Manifest is missing gate-profile marker: ${marker}.`);
    }
  }

  const semanticContract = packetContent
    ? inspectTaskPacketContract({
        repoRoot,
        packetPath,
        artifactId,
        content: packetContent
      })
    : null;
  const semanticErrors = semanticContract?.findings?.filter((finding) => finding.severity === "error") ?? [];
  checks.push({
    check: "task-packet-semantic-contract",
    ok: semanticErrors.length === 0,
    detail: semanticErrors.length === 0 ? "pass" : `${semanticErrors.length} error(s)`
  });
  for (const finding of semanticErrors) {
    const message = formatTaskPacketSemanticFinding(finding);
    if (!errors.includes(message)) {
      errors.push(message);
    }
  }

  const workItemLabel = workItemId ?? "selected work item";
  const defaultNextAction =
    options.nextAction ??
    `Review the ${workItemLabel} detailed agreement proposal and decide whether to approve, adjust, or hold Ready For Code before implementation opens.`;
  const defaultSummary =
    options.summary ?? `Opened ${workItemLabel} as the selected Planner packet for review before implementation opens.`;

  return {
    ok: errors.length === 0,
    command: "planner-open-packet",
    apply: false,
    packetPath,
    artifactId,
    workItemId,
    title,
    gateProfile,
    readyForCode,
    laneType,
    status,
    owner,
    nextAction: defaultNextAction,
    summary: defaultSummary,
    currentStage: options.currentStage ?? releaseState?.currentStage ?? "planning",
    currentFocus: options.currentFocus ?? releaseState?.currentFocus ?? null,
    domainHint: options.domainHint ?? null,
    riskHint: options.riskHint ?? null,
    checks,
    errors
  };
}

function buildTransitionPlan({ store, repoRoot, dbPath = DEFAULT_DB_PATH, options }) {
  const baseTransitionDefaults = transitionDefaultsFor(options.transition);
  const workItemId = options.workItem ?? options.workItemId;
  const errors = [];
  const workItem = workItemId ? store.getWorkItem(workItemId) : null;
  const releaseState = store.getReleaseState("current");
  const initialFromOwner = normalizeOwner(options.from ?? baseTransitionDefaults.from ?? workItem?.owner);
  const initialToOwner = normalizeOwner(options.to ?? baseTransitionDefaults.to);
  const transitionDefaults = resolveTransitionDefaults({
    transition: options.transition,
    fromOwner: initialFromOwner,
    toOwner: initialToOwner
  });
  const transition = options.transition ?? transitionDefaults.transition ?? baseTransitionDefaults.transition;
  const fromOwner = normalizeOwner(options.from ?? transitionDefaults.from ?? workItem?.owner);
  const toOwner = normalizeOwner(options.to ?? transitionDefaults.to);
  const status = options.status ?? transitionDefaults.status ?? workItem?.status ?? "in_progress";
  const sourceRef = options.sourceRef ?? workItem?.sourceRef ?? releaseState?.sourceRef ?? ".agents/artifacts/TASK_LIST.md";
  const packetSourceRef = workItem?.sourceRef ?? sourceRef;
  const gateProfile = resolveTransitionGateProfile({ options, workItem, repoRoot });
  const packetReadyForCode = readPacketReadyForCode(repoRoot, packetSourceRef) || null;
  const packetDeliveryRouteMode = readPacketDeliveryRouteMode(repoRoot, packetSourceRef);
  const metadataDeliveryRouteMode = normalizeDeliveryRouteMode(workItem?.metadata?.deliveryRouteMode);
  const deliveryRouteMode = packetDeliveryRouteMode ?? metadataDeliveryRouteMode;
  const packetRouteClass = readPacketRouteClass(repoRoot, packetSourceRef);
  const changedFiles = parseListOption(options.changedFiles ?? options.changedFile);
  const packetContent = packetSourceRef && fs.existsSync(path.resolve(repoRoot, packetSourceRef))
    ? fs.readFileSync(path.resolve(repoRoot, packetSourceRef), "utf8")
    : "";
  const riskAdaptiveGate = packetContent
    ? evaluateRiskAdaptiveGate({
        repoRoot,
        content: packetContent,
        packetPath: packetSourceRef,
        stage: startsApprovedDeliveryForTransition(transition) ? "implementation-transition" : isClosedStatus(status) ? "closeout" : "planning-open",
        effectiveRisk: readPacketRiskClass(repoRoot, packetSourceRef) || "normal",
        changedFiles,
        transition,
        deliveryRouteMode,
        routeClass: packetRouteClass,
        gateProfile: gateProfile?.id ?? null
      })
    : null;
  const metadataReadyForCode = normalizeReadyForCodeState(workItem?.metadata?.readyForCode);
  const startsApprovedDelivery = startsApprovedDeliveryForTransition(transition);
  const liveReadyForCode =
    startsApprovedDelivery
      ? packetReadyForCode === "approved"
        ? "approved"
        : metadataReadyForCode
      : metadataReadyForCode ?? packetReadyForCode;
  const lowRiskPlannerCloseoutApproved = isLowRiskPlannerCloseoutApproved({
    repoRoot,
    sourceRef: packetSourceRef,
    workItem
  });
  const closeDecisions = parseListOption(options.closeDecision ?? options.closeDecisions);
  const openReadyForCodeDecision = workItem ? findOpenReadyForCodeTransitionDecision(store, workItem) : null;
  const summary =
    options.summary ??
    transitionDefaults.summary ??
    `${workItemId ?? "work item"} transition ${fromOwner ?? "unknown"} -> ${toOwner ?? "unassigned"}`;
  const nextAction =
    options.nextAction ??
    transitionDefaults.nextAction ??
    workItem?.nextAction ??
    `Continue ${workItemId ?? "the current work item"} as ${toOwner ?? "the next owner"}.`;
  const currentStage =
    options.currentStage ??
    transitionDefaults.currentStage ??
    releaseState?.currentStage ??
    null;
  const currentFocus =
    preserveReleaseBaselineFocus({
      focus:
        options.currentFocus ??
        renderTransitionTextTemplate(transitionDefaults.currentFocusTemplate, workItemId) ??
        releaseState?.currentFocus ??
        null,
      releaseState
    });
  const operatorIdentity = resolveOperatorIdentity(options);
  const ownershipGuard = evaluateOwnershipGuard({
    workItem,
    transition,
    fromOwner,
    toOwner,
    operatorIdentity,
    allowTakeover: options.takeover === true
  });

  if (!workItemId) {
    errors.push("Missing --work-item.");
  }
  if (!workItem) {
    errors.push(`Cannot transition missing work item: ${workItemId ?? "unknown"}.`);
  }
  if (!toOwner) {
    errors.push("Missing --to or named transition target owner.");
  }
  if (transition === "tester-to-planner-low-risk-closeout" && !lowRiskPlannerCloseoutApproved) {
    errors.push(
      `${packetSourceRef ?? sourceRef ?? "The active packet"} must declare - Closeout risk tier: low-risk and have no higher detected risk floor before tester-to-planner-low-risk-closeout can be used.`
    );
  }
  if (fromOwner && workItem?.owner && normalizeOwner(workItem.owner) !== fromOwner) {
    errors.push(`Transition source owner mismatch: expected ${fromOwner}, current owner is ${workItem.owner}.`);
  }
  if (gateProfile == null) {
    errors.push(
      `Invalid gate profile ${options.gateProfile ?? workItem?.metadata?.gateProfile ?? "not declared"}. Expected one of ${Object.keys(GATE_PROFILES).join(", ")}.`
    );
  }
  if (sourceRef && !fs.existsSync(path.resolve(repoRoot, sourceRef))) {
    errors.push(`Transition source_ref does not exist: ${sourceRef}.`);
  }
  if (startsApprovedDelivery && packetReadyForCode !== "approved") {
    errors.push(
      `${transition} requires ${workItemId ?? "the work item"} packet Ready For Code approved; current packet status is ${packetReadyForCode || "missing"}.`
    );
  }
  for (const deliveryRouteError of validateDeliveryRouteModeForTransition({
    transition,
    deliveryRouteMode,
    routeClass: packetRouteClass
  })) {
    errors.push(deliveryRouteError);
  }
  if (
    startsApprovedDelivery &&
    openReadyForCodeDecision &&
    !closeDecisions.includes(openReadyForCodeDecision.decisionId)
  ) {
    errors.push(
      `${transition} requires closing Ready For Code decision ${openReadyForCodeDecision.decisionId} with --close-decision before delivery handoff.`
    );
  }
  if (!ownershipGuard.ok && ownershipGuard.message) {
    errors.push(ownershipGuard.message);
  }
  if (riskAdaptiveGate?.blocking) {
    for (const diagnostic of riskAdaptiveGate.diagnostics.filter((item) => item.status === "block")) {
      errors.push(`V2.5 risk-adaptive gate blocks ${transition}: ${diagnostic.message}`);
    }
  }

  const transitionPreflightStage = preflightStageForTransition({
    transition,
    requestedStage: options.preflightStage ?? options.stage
  });
  const transitionPreflight = transitionPreflightStage
    ? runPacketPreflightCommand({
        repoRoot,
        dbPath,
        args: [
          "--work-item",
          workItemId,
          "--stage",
          transitionPreflightStage,
          ...(changedFiles.length > 0 ? ["--changed-files", changedFiles.join(",")] : [])
        ]
      })
    : null;
  if (transitionPreflight && !transitionPreflight.ok) {
    errors.push(
      `packet-preflight ${transitionPreflight.stage} blocked ${transition}: ${transitionPreflight.errors.join("; ")}`
    );
  }

  let plannerHoldReconciliation = null;
  if (transition === "planner-closeout-hold") {
    plannerHoldReconciliation = evaluatePlannerHoldCloseout({
      store,
      repoRoot,
      workItemId
    });
    for (const blockingItem of plannerHoldReconciliation.blockingWorkItems) {
      errors.push(
        `planner-closeout-hold requires no other open work items; ${blockingItem.workItemId} (${blockingItem.owner ?? "unassigned"} / ${blockingItem.status}) must be closed or explicitly routed first.`
      );
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    command: "transition",
    apply: false,
    transition,
    workItemId: workItemId ?? null,
    workItemTitle: workItem?.title ?? null,
    fromOwner,
    toOwner,
    status,
    gateProfile: gateProfile?.id ?? null,
    readyForCode: liveReadyForCode,
    deliveryRouteMode,
    routeClass: packetRouteClass,
    riskAdaptiveGate,
    transitionPreflight,
    failedPreflight: transitionPreflight && !transitionPreflight.ok
      ? {
          command: "packet-preflight",
          stage: transitionPreflight.stage,
          disposition: transitionPreflight.disposition,
          errors: transitionPreflight.errors
        }
      : null,
    gateProfileSummary: summarizeGateProfile(gateProfile),
    summary,
    nextAction,
    sourceRef,
    packetSourceRef,
    closeDecisions,
    operatorIdentity,
    ownershipGuard,
    currentStage,
    currentFocus,
    releaseGateState: options.releaseGate ?? options.releaseGateState ?? releaseState?.releaseGateState ?? null,
    plannerHoldReconcileIds: plannerHoldReconciliation?.reconcileableWorkItems.map((item) => item.workItemId) ?? [],
    plannedUpdates: [
      ".agents/artifacts/TASK_LIST.md",
      ".agents/artifacts/CURRENT_STATE.md",
      ".agents/artifacts/IMPLEMENTATION_PLAN.md",
      ".agents/artifacts/PROJECT_PROGRESS.md",
      ".harness/operating_state.sqlite",
      ".agents/runtime/generated-state-docs/CURRENT_STATE.md",
      ".agents/runtime/generated-state-docs/TASK_LIST.md",
      ".agents/runtime/ACTIVE_CONTEXT.json",
      ".agents/runtime/ACTIVE_CONTEXT.md",
      ".agents/artifacts/VALIDATION_REPORT.md",
      ".agents/artifacts/VALIDATION_REPORT.json",
      ".agents/runtime/agent-sessions"
    ],
    errors
  };
}

function preflightStageForTransition({ transition, requestedStage = null }) {
  if (["implementation-transition", "closeout"].includes(String(requestedStage ?? "").trim())) {
    return String(requestedStage).trim();
  }
  if (startsApprovedDeliveryForTransition(transition)) {
    return "implementation-transition";
  }
  return null;
}


function readPacketRiskClass(repoRoot, sourceRef) {
  if (!sourceRef) return null;
  const absolutePath = path.resolve(repoRoot, sourceRef);
  if (!fs.existsSync(absolutePath)) return null;
  const content = fs.readFileSync(absolutePath, "utf8");
  const value =
    readPacketHeaderValueFromContent(content, "Risk class") ??
    readPacketHeaderValueFromContent(content, "Risk if started now") ??
    readPacketBulletFieldValueFromContent(content, "Risk class") ??
    readPacketBulletFieldValueFromContent(content, "Risk if started now");
  const normalized = normalizePacketHeaderValue(value);
  return ["low", "normal", "high", "critical"].includes(normalized) ? normalized : null;
}

function transitionDefaultsFor(transition = "custom") {
  const transitions = {
    "planner-to-developer": {
      transition: "planner-to-developer",
      from: "planner",
      to: "developer",
      status: "in_progress",
      currentStage: "implementation",
      currentFocusTemplate: "{workItemId} implementation is in progress.",
      summary: "Planning approved; implementation can proceed.",
      nextAction: "Implement the approved packet scope and hand off to Tester."
    },
    "planner-to-orchestrator": {
      transition: "planner-to-orchestrator",
      from: "planner",
      to: "orchestrator",
      status: "in_progress",
      currentStage: "implementation",
      currentFocusTemplate: "{workItemId} approved delivery orchestration is in progress.",
      summary: "Planning approved; Orchestrator should route the delivery workflow.",
      nextAction: "Route the approved packet through Developer, Tester, Reviewer, bounded remediation, and Planner closeout."
    },
    "orchestrator-to-developer": {
      transition: "orchestrator-to-developer",
      from: "orchestrator",
      to: "developer",
      status: "in_progress",
      currentStage: "implementation",
      currentFocusTemplate: "{workItemId} implementation or remediation is routed by Orchestrator.",
      summary: "Orchestrator routed implementation or remediation to Developer.",
      nextAction: "Implement or remediate only the routed scope, then hand evidence back through the approved route."
    },
    "orchestrator-to-tester": {
      transition: "orchestrator-to-tester",
      from: "orchestrator",
      to: "tester",
      status: "review",
      currentStage: "verification",
      currentFocusTemplate: "{workItemId} is routed by Orchestrator for Tester verification.",
      summary: "Orchestrator routed the implementation to Tester verification.",
      nextAction: "Verify the implementation against the approved packet and report findings without remediation."
    },
    "orchestrator-to-reviewer": {
      transition: "orchestrator-to-reviewer",
      from: "orchestrator",
      to: "reviewer",
      status: "review",
      currentStage: "review",
      currentFocusTemplate: "{workItemId} is routed by Orchestrator for Reviewer conformance assessment.",
      summary: "Orchestrator routed verified work to Reviewer.",
      nextAction: "Review implementation, evidence, SSOT conformance, and closeout readiness."
    },
    "orchestrator-to-planner": {
      transition: "orchestrator-to-planner",
      from: "orchestrator",
      to: "planner",
      status: "planning",
      currentStage: "planning",
      currentFocusTemplate: "{workItemId} is routed by Orchestrator for Planner decision.",
      summary: "Orchestrator routed the packet to Planner for closeout, clarification, or escalation.",
      nextAction: "Decide packet closeout, scope clarification, risk acceptance, or route adjustment from the Orchestrator package."
    },
    "developer-to-tester": {
      transition: "developer-to-tester",
      from: "developer",
      to: "tester",
      status: "review",
      currentStage: "verification",
      currentFocusTemplate: "{workItemId} implementation is ready for Tester verification.",
      summary: "Developer implementation completed; Tester should verify the approved scope.",
      nextAction: "Verify the implementation against the packet acceptance criteria."
    },
    "tester-to-reviewer": {
      transition: "tester-to-reviewer",
      from: "tester",
      to: "reviewer",
      status: "review",
      currentStage: "review",
      currentFocusTemplate: "{workItemId} is under reviewer closeout assessment.",
      summary: "Tester verification completed; Reviewer should assess packet exit readiness.",
      nextAction: "Review implementation, evidence, residual debt, and closeout readiness."
    },
    "tester-to-orchestrator": {
      transition: "tester-to-orchestrator",
      from: "tester",
      to: "orchestrator",
      status: "review",
      currentStage: "verification",
      currentFocusTemplate: "{workItemId} Tester evidence is ready for Orchestrator routing.",
      summary: "Tester completed verification evidence; Orchestrator should route pass, remediation, or escalation.",
      nextAction: "Route Tester evidence to Reviewer, Developer remediation, or Planner escalation as required."
    },
    "tester-to-planner-low-risk-closeout": {
      transition: "tester-to-planner-low-risk-closeout",
      from: "tester",
      to: "planner",
      status: "planning",
      currentStage: "planning",
      currentFocusTemplate: "{workItemId} low-risk closeout is verification-complete; Planner is recording closeout under the approved low-risk path.",
      summary: "Tester verified the approved low-risk scope; Planner should record packet closeout under the low-risk closeout path.",
      nextAction: "Planner should record low-risk closeout and choose the next approved lane."
    },
    "reviewer-to-developer": {
      transition: "reviewer-to-developer",
      from: "reviewer",
      to: "developer",
      status: "in_progress",
      currentStage: "implementation",
      currentFocusTemplate: "{workItemId} reviewer finding remediation is in progress.",
      summary: "Reviewer found remediation work; Developer should address the finding.",
      nextAction: "Remediate the reviewer finding, rerun tests and validation, and hand off to Tester."
    },
    "reviewer-to-orchestrator": {
      transition: "reviewer-to-orchestrator",
      from: "reviewer",
      to: "orchestrator",
      status: "review",
      currentStage: "review",
      currentFocusTemplate: "{workItemId} Reviewer evidence is ready for Orchestrator routing.",
      summary: "Reviewer completed conformance evidence; Orchestrator should route closeout, remediation, or escalation.",
      nextAction: "Route Reviewer evidence to Planner closeout, Developer remediation, or Planner escalation as required."
    },
    "reviewer-to-planner": {
      transition: "reviewer-to-planner",
      from: "reviewer",
      to: "planner",
      status: "planning",
      currentStage: "planning",
      currentFocusTemplate: "{workItemId} closeout is approved; Planner is choosing the next approved lane.",
      summary: "Packet exit approved; Planner should choose or refine the next lane.",
      nextAction: "Plan the next approved lane or close remaining planning decisions."
    },
    "planner-closeout-hold": {
      transition: "planner-closeout-hold",
      from: "planner",
      to: "planner",
      status: "closed",
      currentStage: "planning",
      currentFocusTemplate: "{workItemId} is closed; the reusable baseline is on planner hold with no active lane.",
      summary: "Planner recorded packet closeout and placed the reusable baseline on no-active-lane hold.",
      nextAction: PLANNER_HOLD_NEXT_ACTION
    }
  };
  return transitions[transition] ?? { transition: transition ?? "custom" };
}

function resolveTransitionDefaults({ transition, fromOwner, toOwner }) {
  const namedDefaults = transition ? transitionDefaultsFor(transition) : {};
  if (transition && transition !== "custom") {
    return namedDefaults;
  }
  const inferredTransition = `${fromOwner ?? "unknown"}-to-${toOwner ?? "unknown"}`;
  const inferredDefaults = transitionDefaultsFor(inferredTransition);
  return {
    ...inferredDefaults,
    ...namedDefaults,
    transition: transition ?? inferredDefaults.transition ?? namedDefaults.transition ?? "custom"
  };
}

function renderTransitionTextTemplate(template, workItemId) {
  if (typeof template !== "string" || template.length === 0) {
    return null;
  }
  return template.replaceAll("{workItemId}", workItemId ?? "The active work item");
}

function preserveReleaseBaselineFocus({ focus, releaseState }) {
  if (typeof focus !== "string" || focus.length === 0) {
    return focus ?? null;
  }
  const releaseBaseline = releaseState?.metadata?.releaseBaseline;
  if (!releaseBaseline || focus.includes(releaseBaseline)) {
    return focus;
  }
  const previousFocus = String(releaseState?.currentFocus ?? "");
  const baselinePrefix = previousFocus
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.includes(releaseBaseline));
  if (!baselinePrefix) {
    return focus;
  }
  return `${baselinePrefix}; ${focus}`;
}

function applyTransitionPlan({ store, repoRoot, outputDir, plan, options }) {
  const timestamp = new Date().toISOString();
  if (plan.transition === "planner-closeout-hold") {
    reconcilePlannerHoldCloseout({
      store,
      repoRoot,
      workItemId: plan.workItemId,
      reconcileIds: plan.plannerHoldReconcileIds,
      timestamp
    });
  }
  const metadata = {
    ...(store.getWorkItem(plan.workItemId)?.metadata ?? {}),
    gateProfile: plan.gateProfile,
    packetSourceRef: plan.packetSourceRef ?? plan.sourceRef,
    ...(plan.readyForCode === "approved" ? { readyForCode: "approved" } : {}),
    ...(plan.deliveryRouteMode ? { deliveryRouteMode: plan.deliveryRouteMode } : {}),
    ...(plan.operatorIdentity
      ? {
          activeOperatorId: plan.operatorIdentity.operatorId,
          activeOperatorLabel: plan.operatorIdentity.operatorLabel,
          ownershipClaimedAt: timestamp,
          ownershipMode: plan.ownershipGuard?.mode ?? "claim"
        }
      : {}),
    ...(isClosedStatus(plan.status)
      ? {
          activeOperatorId: null,
          activeOperatorLabel: null,
          ownershipClaimedAt: null,
          ownershipMode: null
        }
      : {}),
    ...(isClosedStatus(plan.status) ? { closedAt: timestamp, closedBy: plan.toOwner ?? "unknown" } : {}),
    lastTransition: {
      transition: plan.transition,
      fromOwner: plan.fromOwner,
      toOwner: plan.toOwner,
      appliedAt: timestamp
    }
  };

  store.transitionWorkItem({
    workItemId: plan.workItemId,
    owner: plan.toOwner,
    status: plan.status,
    nextAction: plan.nextAction,
    sourceRef: plan.sourceRef,
    metadata
  });
  refreshRouteCloseoutPackageForCurrentState({ store, plan });

  const releaseState = store.getReleaseState("current");
  if (releaseState) {
    store.setReleaseState({
      currentStage: plan.currentStage ?? releaseState.currentStage,
      releaseGateState: plan.releaseGateState ?? releaseState.releaseGateState,
      currentFocus: plan.currentFocus ?? releaseState.currentFocus,
      releaseGoal: releaseState.releaseGoal,
      sourceRef: plan.sourceRef ?? releaseState.sourceRef,
      updatedBy: "harness:transition",
      metadata: {
        ...(releaseState.metadata ?? {}),
        lastTransition: metadata.lastTransition
      }
    });
  }

  for (const decisionId of plan.closeDecisions) {
    const decision = store.getDecision(decisionId);
    if (!decision) {
      continue;
    }
    store.recordDecision({
      ...decision,
      decisionNeeded: false,
      status: "closed"
    });
  }

  const handoff = store.appendHandoff({
    handoffId: buildTransitionHandoffId(plan, timestamp),
    handoffSummary: `[${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}] ${plan.summary}`,
    fromRole: plan.fromOwner,
    toRole: plan.toOwner,
    sourceRef: plan.sourceRef,
    payload: buildCompactHandoffPayload(plan)
  });
  recordOrchestratedLoopDiagnostic({ store, plan, handoff });

  updateCanonicalImplementationPlan({ repoRoot, plan });
  updateCanonicalProjectProgress({ repoRoot, plan });
  const generatedDocs = writeGeneratedStateDocs({ store, outputDir, repoRoot });

  return {
    ...plan,
    ok: true,
    apply: true,
    appliedAt: timestamp,
    refreshCommand: "npm run harness:sync-state",
    refreshNote:
      "After this state-changing transition, run harness:sync-state for the ordered refresh path: validate -> validation-report -> context -> status.",
    handoff,
    generatedDocs
  };
}

function resolveTransitionGateProfile({ options, workItem, repoRoot }) {
  const explicit = resolveGateProfile(options.gateProfile);
  if (explicit) {
    return explicit;
  }
  const metadataProfile = resolveGateProfile(workItem?.metadata?.gateProfile);
  if (metadataProfile) {
    return metadataProfile;
  }
  const packetProfile = resolveGateProfile(readPacketGateProfile(repoRoot, workItem?.sourceRef));
  return packetProfile ?? resolveGateProfile(DEFAULT_GATE_PROFILE_ID);
}

function evaluatePlannerHoldCloseout({ store, repoRoot, workItemId }) {
  const lifecycleHints = readCanonicalTaskLifecycleHints({ repoRoot });
  const reconcileableWorkItems = [];
  const blockingWorkItems = [];

  for (const candidate of store.listWorkItems()) {
    if (!candidate || candidate.workItemId === workItemId || isClosedStatus(candidate.status)) {
      continue;
    }
    if (candidate.owner === "planner" && isCanonicallyClosedWorkItem(candidate, lifecycleHints)) {
      reconcileableWorkItems.push(candidate);
      continue;
    }
    blockingWorkItems.push(candidate);
  }

  return {
    reconcileableWorkItems,
    blockingWorkItems
  };
}

function reconcilePlannerHoldCloseout({ store, repoRoot, reconcileIds = [], timestamp }) {
  if (!Array.isArray(reconcileIds) || reconcileIds.length === 0) {
    return;
  }
  const lifecycleHints = readCanonicalTaskLifecycleHints({ repoRoot });
  for (const reconcileId of reconcileIds) {
    const candidate = store.getWorkItem(reconcileId);
    if (!candidate || isClosedStatus(candidate.status)) {
      continue;
    }
    if (candidate.owner !== "planner" || !isCanonicallyClosedWorkItem(candidate, lifecycleHints)) {
      continue;
    }
    store.transitionWorkItem({
      workItemId: candidate.workItemId,
      owner: candidate.owner,
      status: "closed",
      nextAction: candidate.nextAction,
      sourceRef: candidate.sourceRef,
      metadata: {
        ...(candidate.metadata ?? {}),
        reconciledByPlannerCloseoutHold: true,
        closedAt: timestamp,
        closedBy: "planner",
        lastTransition: {
          transition: "planner-closeout-hold-reconcile",
          fromOwner: candidate.owner,
          toOwner: candidate.owner,
          appliedAt: timestamp
        }
      }
    });
  }
}

function refreshRouteCloseoutPackageForCurrentState({ store, plan }) {
  if (plan.deliveryRouteMode !== "orchestrated-closeout" || !plan.workItemId) {
    return null;
  }
  const routeJob = store.listRouteJobs({ workItemId: plan.workItemId })[0] ?? null;
  if (!routeJob?.closeoutPackage) {
    return null;
  }
  return store.updateRouteJob({
    routeJobId: routeJob.routeJobId,
    closeoutPackage: decorateCloseoutPackageForCurrentState({
      closeoutPackage: routeJob.closeoutPackage,
      workItemId: plan.workItemId,
      currentOwner: plan.toOwner,
      currentStatus: plan.status,
      routeJobStatus: routeJob.status,
      executionMode: routeJob.metadata?.executionMode,
      canClaimIndependentReview: routeJob.metadata?.canClaimIndependentReview
    })
  });
}

function plannerOpenRequiredManifestMarkers(gateProfile, options = {}) {
  const markers = {
    light: ["canonical artifact", "handoff"],
    standard: ["approved packet", "targeted test", "validator", "handoff"],
    contract: ["Ready For Code", "root", "standard-template", "targeted", "validator", "active context", "review closeout"],
    release: ["release-baseline", "packaging", "validator", "review closeout"]
  };
  const resolvedMarkers = [...(markers[gateProfile] ?? [])];
  if (
    gateProfile === "contract" &&
    isLowRiskPlannerCloseoutApproved({
      repoRoot: options.repoRoot ?? null,
      packetPath: options.packetPath ?? null,
      sourceRef: options.sourceRef ?? null
    })
  ) {
    return resolvedMarkers.filter((marker) => marker !== "review closeout");
  }
  return resolvedMarkers;
}

function findOpenReadyForCodeTransitionDecision(store, workItem) {
  return store.listDecisions({ status: "open", decisionNeeded: true }).find((decision) => {
    const sameSource = decision.sourceRef === workItem.sourceRef;
    const decisionText = `${decision.decisionId ?? ""} ${decision.title ?? ""}`.toLowerCase();
    return sameSource && decisionText.includes("ready for code");
  });
}

function readPacketCloseoutRiskTier(repoRoot, packetPath, sourceRef) {
  const resolvedPacketPath = resolvePacketMarkdownPath(repoRoot, packetPath, sourceRef);
  if (!resolvedPacketPath) {
    return null;
  }
  const content = fs.readFileSync(resolvedPacketPath, "utf8");
  const matcher = /^-\s*Closeout risk tier\s*:\s*(.*)$/im;
  const match = content.match(matcher);
  return match ? normalizeCloseoutRiskTier(match[1]) : null;
}

function isLowRiskPlannerCloseoutApproved({ repoRoot, packetPath = null, sourceRef = null, workItem = null }) {
  const runtimeTier = normalizeCloseoutRiskTier(workItem?.metadata?.closeoutRiskTier);
  const detectedRiskFloor = detectPacketRiskFloor({ repoRoot, packetPath, sourceRef });
  if (runtimeTier && LOW_RISK_CLOSEOUT_TIERS.has(runtimeTier) && riskClassRank(detectedRiskFloor) <= RISK_CLASS_ORDER.low) {
    return true;
  }
  const packetTier = readPacketCloseoutRiskTier(repoRoot, packetPath, sourceRef);
  return Boolean(packetTier && LOW_RISK_CLOSEOUT_TIERS.has(packetTier) && riskClassRank(detectedRiskFloor) <= RISK_CLASS_ORDER.low);
}

function detectPacketRiskFloor({ repoRoot, packetPath = null, sourceRef = null }) {
  const resolvedPacketPath = resolvePacketMarkdownPath(repoRoot, packetPath, sourceRef);
  if (!resolvedPacketPath) {
    return "low";
  }
  const relativePacketPath = path.relative(repoRoot, resolvedPacketPath).replace(/\\/g, "/");
  const riskHeader = normalizeRiskClass(readPacketHeaderValue(repoRoot, relativePacketPath, "Risk if started now"));
  if (riskHeader) {
    return riskHeader;
  }
  const gateProfile = normalizePacketHeaderValue(readPacketHeaderValue(repoRoot, relativePacketPath, "Gate profile"));
  if (gateProfile === "release") {
    return "high";
  }
  const content = fs.readFileSync(resolvedPacketPath, "utf8").toLowerCase();
  if (
    content.includes("authority-model mutation") ||
    content.includes("authority model mutation") ||
    content.includes("shipped starter payload") ||
    content.includes("release packaging") ||
    content.includes("security-sensitive") ||
    content.includes("data / cutover") ||
    content.includes("data/cutover") ||
    content.includes("artifact retirement execution") ||
    content.includes("authority cutover")
  ) {
    return "high";
  }
  if (
    gateProfile === "contract" ||
    content.includes("validator behavior") ||
    content.includes("workflow/tooling") ||
    content.includes("reusable runtime")
  ) {
    return "normal";
  }
  return "low";
}

function buildTransitionHandoffId(plan, timestamp) {
  const compactTime = timestamp.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${String(plan.workItemId).toLowerCase()}-${plan.transition}-${compactTime}`;
}

function updateCanonicalTaskList({ repoRoot, plan, timestamp }) {
  const taskListPath = path.resolve(repoRoot, ".agents/artifacts/TASK_LIST.md");
  if (!fs.existsSync(taskListPath)) {
    return;
  }
  let content = fs.readFileSync(taskListPath, "utf8");
  if (isClosedStatus(plan.status)) {
    content = removeMarkdownTableRow(content, "## Active Locks", "Task ID", plan.workItemId);
    content = ensureMarkdownTablePlaceholderRow(content, "## Active Locks", [
      "-",
      "None",
      "-",
      "clear",
      "-",
      "-"
    ]);
    content = removeMarkdownTableRow(content, "## Active Tasks", "Task ID", plan.workItemId);
    content = ensureMarkdownTablePlaceholderRow(content, "## Active Tasks", [
      "-",
      "None",
      "-",
      "-",
      "clear",
      "-",
      "-",
      "-"
    ]);
    content = removeMarkdownTableRow(content, "## Completed Tasks", "Task ID", "-");
    content = upsertMarkdownTableRow(content, "## Completed Tasks", "Task ID", plan.workItemId, {
      "Task ID": plan.workItemId,
      Title: plan.workItemTitle ?? plan.workItemId,
      "Completed At": timestamp.slice(0, 10),
      Verification: `transition ${plan.fromOwner ?? "unknown"} -> ${plan.toOwner ?? "unknown"}; gate ${plan.gateProfile}`,
      Notes: `${plan.summary} ${plan.nextAction}`.trim()
    });
  } else {
    content = upsertMarkdownTableRow(content, "## Active Locks", "Task ID", plan.workItemId, {
      "Task ID": plan.workItemId,
      Scope: plan.workItemTitle ?? plan.workItemId,
      Owner: plan.toOwner,
      Status: "active",
      "Started At": timestamp.slice(0, 10),
      Notes: appendOperatorDiagnostic(
        `${plan.transition}; gate ${plan.gateProfile}; ${plan.nextAction}`,
        plan.operatorIdentity
      )
    });
    content = upsertMarkdownTableRow(content, "## Active Tasks", "Task ID", plan.workItemId, {
      "Task ID": plan.workItemId,
      Title: plan.workItemTitle ?? plan.workItemId,
      Scope: plan.workItemTitle ?? plan.workItemId,
      Owner: plan.toOwner,
      Status: plan.status,
      Verification: `gate ${plan.gateProfile}; ${plan.nextAction}`
    });
  }
  content = prependSectionBullet(
    content,
    "## Handoff Log",
    `- ${timestamp.slice(0, 10)}: [${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}] ${plan.summary} | ${appendOperatorDiagnostic(plan.nextAction, plan.operatorIdentity)}`
  );
  content = replaceBulletValue(content, "- Next first action:", plan.nextAction);
  fs.writeFileSync(taskListPath, content, "utf8");
}

function updateCanonicalCurrentState({ repoRoot, plan, timestamp }) {
  const currentStatePath = path.resolve(repoRoot, ".agents/artifacts/CURRENT_STATE.md");
  if (!fs.existsSync(currentStatePath)) {
    return;
  }
  let content = fs.readFileSync(currentStatePath, "utf8");
  content = replaceBulletValue(content, "- Current Stage:", plan.currentStage);
  content = replaceBulletValue(content, "- Current Focus:", plan.currentFocus);
  content = replaceSectionFirstBullet(content, "## Next Recommended Agent", titleCaseOwner(plan.toOwner));
  content = replaceOrPrependSectionBulletContaining(
    content,
    "## Open Decisions / Blockers",
    `\`${plan.workItemId}`,
    buildCurrentWorkItemStateBullet(plan)
  );
  content = replaceSectionBulletContaining(
    content,
    "## Open Decisions / Blockers",
    `under ${plan.workItemId}.`,
    buildApprovedScopeStateBullet(plan)
  );
  content = replaceSectionBulletContaining(
    content,
    "## Open Decisions / Blockers",
    `User-approved \`${plan.workItemId}\` scope remains active.`,
    buildApprovedScopeStateBullet(plan)
  );
  content = replaceOrPrependSectionBulletContaining(
    content,
    "## Current Truth Notes",
    `\`${plan.workItemId}`,
    buildCurrentTruthNote(plan)
  );
  content = replaceSectionBulletContaining(
    content,
    "## Current Truth Notes",
    `\`${path.basename(plan.packetSourceRef ?? "")}\``,
    buildActivePacketStateBullet(plan)
  );
  content = prependSectionBullet(
    content,
    "## Latest Handoff Summary",
    `- ${timestamp.slice(0, 10)}: \`[${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}] ${plan.summary}\``
  );
  fs.writeFileSync(currentStatePath, content, "utf8");
}

function updateCanonicalImplementationPlan({ repoRoot, plan }) {
  const implementationPlanPath = path.resolve(repoRoot, ".agents/artifacts/IMPLEMENTATION_PLAN.md");
  if (!fs.existsSync(implementationPlanPath)) {
    return;
  }
  let content = fs.readFileSync(implementationPlanPath, "utf8");
  content = replaceSectionBullets(
    content,
    "## Operator Next Action",
    isClosedStatus(plan.status)
      ? [
          `- \`${plan.workItemId}\` is closed; latest closeout handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`.`,
          `- ${plan.nextAction}`,
          `- Source packet: \`${plan.sourceRef}\`.`,
          "- Preserve packet-before-code, active-context derived authority, generated-doc immutability, root/starter sync, Tester/Reviewer separation, and human approval gates."
        ]
      : [
          `- \`${plan.workItemId}\` active handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`.`,
          `- ${plan.nextAction}`,
          `- Source packet: \`${plan.sourceRef}\`.`,
          "- Preserve packet-before-code, active-context derived authority, generated-doc immutability, root/starter sync, Tester/Reviewer separation, and human approval gates."
        ]
  );
  fs.writeFileSync(implementationPlanPath, content, "utf8");
}

function buildCurrentWorkItemStateBullet(plan) {
  if (isClosedStatus(plan.status)) {
    return `- \`${plan.workItemId}\` is closed; latest handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`. ${plan.nextAction}`;
  }
  const approvalText = plan.readyForCode === "approved"
    ? "Ready For Code is approved"
    : `Ready For Code status is ${plan.readyForCode ?? "unknown"}`;
  return `- \`${plan.workItemId}\` ${approvalText}; active handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`. ${plan.nextAction}`;
}

function buildApprovedScopeStateBullet(plan) {
  if (isClosedStatus(plan.status)) {
    return `- User-approved \`${plan.workItemId}\` scope is closed; latest handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`.`;
  }
  return `- User-approved \`${plan.workItemId}\` scope remains active. Ready For Code is approved; current handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`. ${plan.nextAction}`;
}

function buildCurrentTruthNote(plan) {
  if (isClosedStatus(plan.status)) {
    return `- \`${plan.workItemId}\` is closed. Latest handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`; stage is \`${plan.currentStage ?? "unknown"}\`; gate profile is \`${plan.gateProfile ?? "unknown"}\`.`;
  }
  return `- \`${plan.workItemId}\` remains the active work item. Current handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`; stage is \`${plan.currentStage ?? "unknown"}\`; gate profile is \`${plan.gateProfile ?? "unknown"}\`.`;
}

function buildActivePacketStateBullet(plan) {
  const packetName = path.basename(plan.packetSourceRef ?? plan.sourceRef ?? "active packet");
  if (isClosedStatus(plan.status)) {
    return `- \`${packetName}\` is closed with the latest handoff \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`.`;
  }
  return `- \`${packetName}\` remains the active packet for scope boundary, human approval text, and audit evidence; live handoff is \`${plan.fromOwner ?? "unknown"} -> ${plan.toOwner}\`; live stage is ${describeStageForPacket(plan.currentStage)}.`;
}

function describeStageForPacket(currentStage) {
  if (currentStage === "implementation") {
    return "Developer implementation";
  }
  if (currentStage === "verification") {
    return "Tester verification";
  }
  if (currentStage === "review") {
    return "Reviewer closeout review";
  }
  if (currentStage === "planning") {
    return "planning";
  }
  return currentStage ?? "the active workflow stage";
}

function updateCanonicalProjectProgress({ repoRoot, plan }) {
  const progressPath = path.resolve(repoRoot, ".agents/artifacts/PROJECT_PROGRESS.md");
  if (!fs.existsSync(progressPath)) {
    return;
  }
  const progressStatus = isClosedStatus(plan.status)
    ? "done"
    : (plan.currentStage ?? plan.status ?? "in_progress");
  let content = fs.readFileSync(progressPath, "utf8");
  content = updateMarkdownTableRow(content, "## Progress Board", "Task ID", plan.workItemId, {
    Status: progressStatus,
    Notes: `${plan.summary} ${plan.nextAction}`.trim()
  });
  fs.writeFileSync(progressPath, content, "utf8");
}

function updateMarkdownTableRow(content, sectionHeading, keyColumn, keyValue, updates) {
  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  if (tableStart === -1 || !lines[tableStart + 1]?.includes("---")) {
    return content;
  }
  const headers = parseTableCells(lines[tableStart]);
  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) {
    return content;
  }
  for (let index = tableStart + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) {
      break;
    }
    const cells = parseTableCells(lines[index]);
    if (cells[keyIndex] !== keyValue) {
      continue;
    }
    const nextCells = headers.map((header, cellIndex) => updates[header] ?? cells[cellIndex] ?? "");
    lines[index] = `| ${nextCells.map(escapeMarkdownCell).join(" | ")} |`;
    const updatedSection = lines.join("\n");
    return `${content.slice(0, range.start)}${updatedSection}${content.slice(range.end)}`;
  }
  return content;
}

function upsertMarkdownTableRow(content, sectionHeading, keyColumn, keyValue, updates) {
  const updated = updateMarkdownTableRow(content, sectionHeading, keyColumn, keyValue, updates);
  if (updated !== content) {
    return updated;
  }

  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  if (tableStart === -1 || !lines[tableStart + 1]?.includes("---")) {
    return content;
  }
  const headers = parseTableCells(lines[tableStart]);
  const row = headers.map((header) => updates[header] ?? "");
  let insertIndex = tableStart + 2;
  while (insertIndex < lines.length && lines[insertIndex].trim().startsWith("|")) {
    insertIndex += 1;
  }
  lines.splice(insertIndex, 0, `| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  return `${content.slice(0, range.start)}${lines.join("\n")}${content.slice(range.end)}`;
}

function removeMarkdownTableRow(content, sectionHeading, keyColumn, keyValue) {
  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  if (tableStart === -1 || !lines[tableStart + 1]?.includes("---")) {
    return content;
  }
  const headers = parseTableCells(lines[tableStart]);
  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) {
    return content;
  }
  for (let index = tableStart + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) {
      break;
    }
    const cells = parseTableCells(lines[index]);
    if (cells[keyIndex] !== keyValue) {
      continue;
    }
    lines.splice(index, 1);
    return `${content.slice(0, range.start)}${lines.join("\n")}${content.slice(range.end)}`;
  }
  return content;
}

function ensureMarkdownTablePlaceholderRow(content, sectionHeading, rowValues) {
  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const tableStart = lines.findIndex((line) => line.trim().startsWith("|"));
  if (tableStart === -1 || !lines[tableStart + 1]?.includes("---")) {
    return content;
  }
  const dataRows = [];
  for (let index = tableStart + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) {
      break;
    }
    dataRows.push(lines[index]);
  }
  if (dataRows.length > 0) {
    return content;
  }
  lines.splice(tableStart + 2, 0, `| ${rowValues.map(escapeMarkdownCell).join(" | ")} |`);
  return `${content.slice(0, range.start)}${lines.join("\n")}${content.slice(range.end)}`;
}

function prependSectionBullet(content, sectionHeading, bullet) {
  const start = content.indexOf(sectionHeading);
  if (start === -1 || content.includes(bullet)) {
    return content;
  }
  const insertAt = content.indexOf("\n", start);
  if (insertAt === -1) {
    return `${content}\n${bullet}\n`;
  }
  return `${content.slice(0, insertAt + 1)}${bullet}\n${content.slice(insertAt + 1)}`;
}

function replaceBulletValue(content, prefix, value) {
  if (!value) {
    return content;
  }
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}.*$`, "m");
  return pattern.test(content) ? content.replace(pattern, `${prefix} ${value}`) : content;
}

function replaceSectionFirstBullet(content, sectionHeading, value) {
  if (!value) {
    return content;
  }
  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const updatedSection = section.replace(/^-\s+.*$/m, `- ${value}`);
  return `${content.slice(0, range.start)}${updatedSection}${content.slice(range.end)}`;
}

function replaceOrPrependSectionBulletContaining(content, sectionHeading, needle, bullet) {
  const range = findSectionRange(content, sectionHeading);
  if (!range || !needle || !bullet) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const existingIndex = lines.findIndex((line) => line.trim().startsWith("- ") && line.includes(needle));

  if (existingIndex !== -1) {
    lines[existingIndex] = bullet;
  } else {
    const headingIndex = lines.findIndex((line) => line.trim() === sectionHeading);
    lines.splice(headingIndex === -1 ? 1 : headingIndex + 1, 0, bullet);
  }

  return `${content.slice(0, range.start)}${lines.join("\n")}${content.slice(range.end)}`;
}

function replaceSectionBulletContaining(content, sectionHeading, needle, bullet) {
  const range = findSectionRange(content, sectionHeading);
  if (!range || !needle || !bullet) {
    return content;
  }
  const section = content.slice(range.start, range.end);
  const lines = section.split(/\r?\n/);
  const replaced = lines.map((line) => (line.startsWith("- ") && line.includes(needle) ? bullet : line));
  if (replaced.join("\n") === section) {
    return content;
  }
  return `${content.slice(0, range.start)}${replaced.join("\n")}${content.slice(range.end)}`;
}

function replaceSectionBullets(content, sectionHeading, bullets) {
  const range = findSectionRange(content, sectionHeading);
  if (!range) {
    return `${content.trimEnd()}\n\n${sectionHeading}\n${bullets.join("\n")}\n`;
  }
  return `${content.slice(0, range.start)}${sectionHeading}\n${bullets.join("\n")}\n${content.slice(range.end)}`;
}

function findSectionRange(content, sectionHeading) {
  const start = content.indexOf(sectionHeading);
  if (start === -1) {
    return null;
  }
  const after = content.slice(start + sectionHeading.length);
  const next = after.match(/\n##\s+/);
  return {
    start,
    end: next ? start + sectionHeading.length + next.index : content.length
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function parseListOption(value) {
  if (!value || value === true) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOwner(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeOperatorId(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function normalizeOperatorLabel(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function resolveOperatorIdentity(options = {}) {
  const operatorId = normalizeOperatorId(options.operator ?? process.env.HARNESS_OPERATOR_ID);
  if (!operatorId) {
    return null;
  }

  return {
    operatorId,
    operatorLabel: normalizeOperatorLabel(options.operatorLabel ?? process.env.HARNESS_OPERATOR_LABEL) ?? operatorId
  };
}

function readActiveOperatorClaim(workItem) {
  const operatorId = normalizeOperatorId(workItem?.metadata?.activeOperatorId);
  if (!operatorId) {
    return null;
  }

  return {
    operatorId,
    operatorLabel: normalizeOperatorLabel(workItem?.metadata?.activeOperatorLabel) ?? operatorId,
    ownershipClaimedAt: workItem?.metadata?.ownershipClaimedAt ?? null,
    ownershipMode: workItem?.metadata?.ownershipMode ?? null
  };
}

function evaluateOwnershipGuard({
  workItem,
  transition,
  fromOwner,
  toOwner,
  operatorIdentity,
  allowTakeover = false
}) {
  const activeClaim = readActiveOperatorClaim(workItem);
  if (!activeClaim) {
    return {
      ok: true,
      mode: operatorIdentity ? "claim" : "untracked",
      activeClaim,
      requestedOperatorId: operatorIdentity?.operatorId ?? null,
      requestedOperatorLabel: operatorIdentity?.operatorLabel ?? null
    };
  }

  if (!operatorIdentity) {
    return {
      ok: false,
      mode: "missing-operator",
      activeClaim,
      requestedOperatorId: null,
      requestedOperatorLabel: null,
      message:
        `Ownership claim exists for ${formatOperatorIdentity(activeClaim)} on ${workItem?.workItemId ?? "the active work item"}. ` +
        `Re-run ${transition ?? "the mutating transition"} with --operator <id> to confirm ownership or use a planner-routed --takeover.`
    };
  }

  if (activeClaim.operatorId === operatorIdentity.operatorId) {
    return {
      ok: true,
      mode: "continuation",
      activeClaim,
      requestedOperatorId: operatorIdentity.operatorId,
      requestedOperatorLabel: operatorIdentity.operatorLabel
    };
  }

  const plannerRouted = [fromOwner, toOwner, workItem?.owner].some((owner) => normalizeOwner(owner) === "planner");
  if (allowTakeover && plannerRouted) {
    return {
      ok: true,
      mode: "takeover",
      activeClaim,
      requestedOperatorId: operatorIdentity.operatorId,
      requestedOperatorLabel: operatorIdentity.operatorLabel
    };
  }

  if (allowTakeover) {
    return {
      ok: false,
      mode: "takeover-blocked",
      activeClaim,
      requestedOperatorId: operatorIdentity.operatorId,
      requestedOperatorLabel: operatorIdentity.operatorLabel,
      message:
        `Ownership takeover for ${workItem?.workItemId ?? "the active work item"} is blocked because ${transition ?? "this transition"} is not planner-routed. ` +
        `Current claim: ${formatOperatorIdentity(activeClaim)}. Route through Planner before using --takeover.`
    };
  }

  return {
    ok: false,
    mode: "conflict",
    activeClaim,
    requestedOperatorId: operatorIdentity.operatorId,
    requestedOperatorLabel: operatorIdentity.operatorLabel,
    message:
      `Ownership conflict: ${workItem?.workItemId ?? "the active work item"} is currently claimed by ${formatOperatorIdentity(activeClaim)}, ` +
      `but this transition was requested by ${formatOperatorIdentity(operatorIdentity)}. Use a planner-routed --takeover to supersede the active claim.`
  };
}

function formatOperatorIdentity(operatorIdentity) {
  if (!operatorIdentity?.operatorId) {
    return "untracked operator";
  }
  if (
    operatorIdentity.operatorLabel &&
    normalizeOperatorLabel(operatorIdentity.operatorLabel)?.toLowerCase() !== operatorIdentity.operatorId
  ) {
    return `${operatorIdentity.operatorLabel} (${operatorIdentity.operatorId})`;
  }
  return operatorIdentity.operatorId;
}

function appendOperatorDiagnostic(text, operatorIdentity) {
  const base = String(text ?? "").trim();
  if (!operatorIdentity?.operatorId) {
    return base;
  }
  return `${base}; operator ${formatOperatorIdentity(operatorIdentity)}`;
}

function titleCaseOwner(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : null;
}

function uniquePathList(paths) {
  return [...new Set((paths ?? []).filter((item) => typeof item === "string" && item.length > 0))];
}

function normalizeRoleValue(role) {
  return String(role ?? "").trim().toLowerCase();
}

function resolveNextWorkflowForRole(role) {
  const workflow = workflowForOwner(role);
  return workflow === "manual_selection_required" ? null : workflow;
}

function approvalBoundaryForRole(role) {
  switch (normalizeRoleValue(role)) {
    case "planner":
      return "Do not start implementation, testing, or closeout work until the required route and approval are explicit.";
    case "developer":
      return "Implement only the approved packet scope. Do not change approval state, workflow authority, or unrelated governance surfaces.";
    case "orchestrator":
      return "Route only approved packet execution. Do not implement, test, review, approve scope or risk, or close packets.";
    case "tester":
      return "Verify the approved scope only. Do not rewrite implementation or change approval state.";
    case "reviewer":
      return "Assess closeout readiness only. Do not implement fixes or change approval state from the review lane.";
    default:
      return "Stay inside the approved packet and workflow authority. Escalate instead of guessing.";
  }
}

function doNotCrossForRole(role) {
  switch (normalizeRoleValue(role)) {
    case "planner":
      return [
        "No implementation or approval-state mutation.",
        "No testing or reviewer closeout work.",
        "No guessing a workflow when the route is unclear."
      ];
    case "developer":
      return [
        "No approval-state changes.",
        "No unrelated routing or governance edits.",
        "No manual edits to generated state docs."
      ];
    case "orchestrator":
      return [
        "No code remediation by Orchestrator.",
        "No Tester or Reviewer judgment substitution.",
        "No scope, risk, SSOT applicability, or packet closeout approval.",
        "No manual edits to generated state docs."
      ];
    case "tester":
      return [
        "No implementation changes.",
        "No approval-state changes.",
        "No manual edits to generated state docs."
      ];
    case "reviewer":
      return [
        "No implementation changes.",
        "No tester verification rewrite.",
        "No packet closeout without reviewer rationale."
      ];
    default:
      return ["Do not exceed the current packet scope or workflow authority."];
  }
}

function buildCompactHandoffPayload(plan) {
  return {
    transition: plan.transition,
    workItemId: plan.workItemId,
    gateProfile: plan.gateProfile,
    completedScope: plan.summary,
    nextWorkflow: resolveNextWorkflowForRole(plan.toOwner),
    nextFirstAction: plan.nextAction,
    requiredSsot: buildRequiredSsotForRole(plan),
    approvalBoundary: approvalBoundaryForRole(plan.toOwner),
    doNotCross: doNotCrossForRole(plan.toOwner),
    routeReason: plan.summary,
    evidencePaths: buildEvidencePathsForRole(plan),
    operatorContext: buildOperatorContext(plan),
    fixLoopHistory: [],
    blockedHumanDiagnostic: null,
    closeoutPackage: null
  };
}

function buildOperatorContext(plan) {
  const activeClaim = plan.ownershipGuard?.activeClaim ?? null;
  const requestedOperator = plan.operatorIdentity ?? null;
  if (!activeClaim && !requestedOperator) {
    return null;
  }

  return {
    requestedOperatorId: requestedOperator?.operatorId ?? null,
    requestedOperatorLabel: requestedOperator?.operatorLabel ?? null,
    activeOperatorId: activeClaim?.operatorId ?? requestedOperator?.operatorId ?? null,
    activeOperatorLabel: activeClaim?.operatorLabel ?? requestedOperator?.operatorLabel ?? null,
    ownershipClaimedAt: activeClaim?.ownershipClaimedAt ?? null,
    ownershipMode: plan.ownershipGuard?.mode ?? activeClaim?.ownershipMode ?? null
  };
}

function buildRequiredSsotForRole(plan) {
  switch (normalizeRoleValue(plan.toOwner)) {
    case "planner":
      return uniquePathList([ARTIFACT_PATHS.requirements, ARTIFACT_PATHS.plan, plan.sourceRef]);
    case "developer":
      return uniquePathList([plan.sourceRef]);
    case "orchestrator":
      return uniquePathList([
        plan.sourceRef,
        ARTIFACT_PATHS.requirements,
        ARTIFACT_PATHS.plan,
        ".agents/workflows/orchestrator.md",
        ".agents/workflows/developer.md",
        ".agents/workflows/tester.md",
        ".agents/workflows/reviewer.md",
        VALIDATION_REPORT_JSON,
        VALIDATION_REPORT_MARKDOWN
      ]);
    case "tester":
      return uniquePathList([plan.sourceRef, VALIDATION_REPORT_JSON, VALIDATION_REPORT_MARKDOWN]);
    case "reviewer":
      return uniquePathList([
        plan.sourceRef,
        "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
        VALIDATION_REPORT_JSON,
        VALIDATION_REPORT_MARKDOWN
      ]);
    default:
      return uniquePathList([plan.sourceRef]);
  }
}

function buildEvidencePathsForRole(plan) {
  const commonEvidence = [plan.sourceRef, VALIDATION_REPORT_JSON, VALIDATION_REPORT_MARKDOWN];
  const routeEvidence = inferRouteEvidencePaths(plan);
  switch (normalizeRoleValue(plan.toOwner)) {
    case "orchestrator":
      return uniquePathList([
        ...commonEvidence,
        ...routeEvidence,
        "reference/artifacts/WALKTHROUGH.md",
        "reference/artifacts/REVIEW_REPORT.md",
        "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md"
      ]);
    case "developer":
      return uniquePathList([...commonEvidence, ...routeEvidence]);
    case "tester":
      return uniquePathList([...commonEvidence, ...routeEvidence, "reference/artifacts/WALKTHROUGH.md"]);
    case "reviewer":
      return uniquePathList([
        ...commonEvidence,
        ...routeEvidence,
        "reference/artifacts/WALKTHROUGH.md",
        "reference/artifacts/REVIEW_REPORT.md",
        "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md"
      ]);
    case "planner":
      return uniquePathList([
        ...commonEvidence,
        ...routeEvidence,
        "reference/artifacts/REVIEW_REPORT.md",
        "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md"
      ]);
    default:
      return uniquePathList(commonEvidence);
  }
}

function inferRouteEvidencePaths(plan) {
  const text = `${plan.summary ?? ""}\n${plan.nextAction ?? ""}`;
  return /reference\/artifacts\/REVIEW_REPORT\.md|review[_ -]?report\.md/i.test(text)
    ? ["reference/artifacts/REVIEW_REPORT.md"]
    : [];
}

function recordOrchestratedLoopDiagnostic({ store, plan, handoff }) {
  if (plan.deliveryRouteMode !== "orchestrated-closeout" || !plan.workItemId) {
    return null;
  }
  if (!["tester-to-orchestrator", "reviewer-to-orchestrator", "orchestrator-to-developer"].includes(plan.transition)) {
    return null;
  }
  const routeJob = store.listRouteJobs({ workItemId: plan.workItemId })[0] ?? null;
  if (!routeJob) {
    return null;
  }
  const findingKeys = extractFindingKeysFromRouteText(`${plan.summary ?? ""}\n${plan.nextAction ?? ""}`);
  const previousCounts = routeJob.sameFindingCounts ?? {};
  const nextCounts = { ...previousCounts };
  const reportingFinding = ["tester-to-orchestrator", "reviewer-to-orchestrator"].includes(plan.transition);
  for (const findingKey of findingKeys) {
    nextCounts[findingKey] = reportingFinding ? (nextCounts[findingKey] ?? 0) + 1 : (nextCounts[findingKey] ?? 1);
  }
  const maxSameFindingCount = Math.max(0, ...Object.values(nextCounts).map((value) => Number(value) || 0));
  const fullLoopCount = routeJob.loopCount ?? 0;
  const blockedHumanDiagnostic =
    maxSameFindingCount >= 2 || fullLoopCount >= 3
      ? {
          routeJobId: routeJob.routeJobId,
          reason: maxSameFindingCount >= 2 ? "same-finding-repeat-threshold" : "full-loop-threshold",
          findingKeys,
          sameFindingCount: maxSameFindingCount,
          fullLoopCount,
          lastFailingRole: plan.fromOwner,
          lastDeveloperAttempt: routeJob.metadata?.lastDeveloperAttempt ?? 0,
          evidenceRefs: handoff?.payload?.evidencePaths ?? [],
          recommendedHumanDecision: "Planner or user should inspect the bounded-loop threshold before continuing.",
          userInputRequired: true
        }
      : null;
  const userInputRequired = Boolean(blockedHumanDiagnostic);
  const updatedRouteJob = store.updateRouteJob({
    routeJobId: routeJob.routeJobId,
    status: userInputRequired ? "blocked-human" : "running",
    currentRole: userInputRequired ? plan.fromOwner : plan.toOwner,
    sameFindingCounts: nextCounts,
    metadata: {
      ...(routeJob.metadata ?? {}),
      lastTransitionDiagnostic: {
        transition: plan.transition,
        handoffId: handoff?.handoffId ?? null,
        findingKeys,
        userInputRequired
      },
      lastFailingRole: plan.fromOwner,
      ...(findingKeys[0] ? { lastFindingKey: findingKeys[0] } : {}),
      userInputRequired,
      ...(blockedHumanDiagnostic ? { blockedHumanDiagnostic } : {})
    }
  });
  store.appendRouteEvent({
    routeJobId: routeJob.routeJobId,
    sessionId: null,
    fromRole: plan.fromOwner,
    toRole: userInputRequired ? "blocked-human" : plan.toOwner,
    eventType: userInputRequired
      ? "blocked_human_threshold_reached"
      : plan.toOwner === "developer"
        ? "developer_remediation_requested"
        : "route_loop_diagnostic",
    result: userInputRequired ? "blocked-human" : "continue",
    evidencePaths: handoff?.payload?.evidencePaths ?? [],
    payload: {
      transition: plan.transition,
      handoffId: handoff?.handoffId ?? null,
      findingKeys,
      sameFindingCount: maxSameFindingCount,
      fullLoopCount,
      userInputRequired,
      blockedHumanDiagnostic
    }
  });
  return updatedRouteJob;
}

function extractFindingKeysFromRouteText(text) {
  const matches = String(text ?? "").match(/\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+){1,}\b/g) ?? [];
  return uniquePathList(matches.map((value) => value.toLowerCase()));
}

function isNamedTransition(value) {
  const defaults = transitionDefaultsFor(value);
  return defaults.transition === value && Boolean(defaults.to);
}
