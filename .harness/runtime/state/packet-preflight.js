import fs from "node:fs";
import path from "node:path";

import {
  normalizePacketHeaderValue,
  parseTableCells,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";
import { inspectTaskPacketContract } from "./drift-validator.js";
import {
  evaluateChangeZoneClassification,
  parseChangedFilesOption
} from "./change-zone-map.js";
import { evaluateModelingImpact } from "./modeling-impact.js";
import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import { evaluateParallelBatchPlan } from "./parallel-batch.js";
import { evaluateSecurityReviewEvidence } from "./security-evidence.js";
import { evaluateTddEvidenceContract } from "./tdd-evidence.js";
import { evaluateRiskAdaptiveGate } from "./risk-adaptive-gates.js";
import { selectActiveWorkItem } from "./workflow-routing.js";
import { evaluateEvidenceManifestBinding } from "./evidence-manifest.js";
import { evaluateBrowserEvidenceBinding } from "./browser-evidence.js";
import {
  CLOSEOUT_ENUMS,
  CLOSEOUT_REFERENCE,
  NARRATIVE_DESTINATION,
  STRICT_LITERAL_ENUM_GUIDE,
  inspectCloseoutEnums
} from "./preflight/closeout-contract.js";
import { classifyRisk, emptyRisk } from "./preflight/risk.js";
import {
  blockedNextActionForStage,
  decideStage,
  normalizeStage,
  resolveFinalDisposition
} from "./preflight/stage-decision.js";
const PLANNER_PACKET_CHALLENGE_HEADING = "## Planner Packet Challenge Review";
const PLANNER_PACKET_CHALLENGE_REQUIRED_FIELDS = [
  "Challenge reviewer",
  "Challenge reviewer independence basis",
  "Source refs reviewed",
  "Parent objective coverage",
  "Deferred scope with named follow-up",
  "Acceptance proves behavior change",
  "Failure fixture or failure condition",
  "Reviewer closeout hold basis",
  "First-wave limit check",
  "Guidance-only sufficiency rationale",
  "Challenge evidence artifact path",
  "Findings disposition",
  "Required corrections applied",
  "No self-approval claim"
];
export function runPacketPreflightCommand({
  repoRoot = process.cwd(),
  dbPath = DEFAULT_DB_PATH,
  args = []
} = {}) {
  const options = parseArgs(args);
  return withStore({ repoRoot, dbPath }, (store) => buildPacketPreflight({ store, repoRoot, options }));
}

function buildPacketPreflight({ store, repoRoot, options }) {
  const errors = [];
  const findings = [];
  const checks = [];
  const workItemId = options.workItem ?? options.workItemId ?? null;
  const workItem = workItemId ? store.getWorkItem(workItemId) : null;
  const activeTask = selectActiveWorkItem(store.listWorkItems(), { repoRoot });
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath ?? workItem?.sourceRef ?? activeTask?.sourceRef);
  const content = readRelativeFile(repoRoot, packetPath);

  if (!packetPath) {
    errors.push("Missing --packet or --work-item with a sourceRef.");
  } else if (!content) {
    errors.push(`Packet file not found or unreadable: ${packetPath}.`);
  }

  const stage = normalizeStage(options.stage) ?? inferStage({ options, workItem, content });
  if (options.stage && !normalizeStage(options.stage)) {
    errors.push(`Invalid --stage ${options.stage}. Expected one of ${[...STAGES].join(", ")}.`);
  }

  const packet = content ? inspectPacket(content) : emptyPacket();
  const risk = content ? classifyRisk(packet, content) : emptyRisk();
  const readyForCode = normalizeReadyForCode(packet.header["Ready For Code"] ?? workItem?.metadata?.readyForCode);
  const routeClass = normalizePacketHeaderValue(packet.header["Route class"] ?? packet.fields["Route class"] ?? "");
  const deliveryRouteMode = normalizePacketHeaderValue(packet.header["Delivery route mode"] ?? workItem?.metadata?.deliveryRouteMode ?? "");
  const gateProfile = normalizePacketHeaderValue(packet.header["Gate profile"] ?? packet.fields["Gate profile"] ?? workItem?.metadata?.gateProfile ?? "");
  const changeZone = normalizePacketHeaderValue(packet.header["Change zone"] ?? packet.fields["Change zone"] ?? "");
  const changedFiles = parseChangedFilesOption(options.changedFiles ?? options.changedFile ?? "");
  const changeZoneClassification = content
    ? evaluateChangeZoneClassification({
        repoRoot,
        declaredChangeZone: changeZone,
        changedFiles,
        requestedRouteClass: routeClass || null
      })
    : null;
  const modelingImpact = content
    ? evaluateModelingImpact({
        repoRoot,
        content,
        stage,
        changeZone,
        changedFiles,
        changeZoneClassification
      })
    : null;
  const plannerPacketChallenge = content
    ? evaluatePlannerPacketChallenge({
        content,
        stage,
        effectiveRisk: risk.effective,
        gateProfile,
        changeZone,
        routeClass: changeZoneClassification?.effectiveRouteClass ?? routeClass
      })
    : null;
  const firstImplementationReadiness = content
    ? evaluateFirstImplementationReadiness({
        repoRoot,
        stage,
        workItem,
        workItemId,
        packetPath,
        readyForCode,
        gateProfile,
        deliveryRouteMode,
        routeClass: changeZoneClassification?.effectiveRouteClass ?? routeClass,
        changeZone
      })
    : null;
  const tddEvidence = content
    ? evaluateTddEvidenceContract({ repoRoot, content, stage, changedFiles })
    : null;
  const securityReview = content
    ? evaluateSecurityReviewEvidence({
        repoRoot,
        content,
        packetPath,
        workItemId: workItemId ?? activeTask?.workItemId ?? null,
        stage,
        effectiveRisk: risk.effective,
        changedFiles
      })
    : null;
  const parallelBatch = content
    ? evaluateParallelBatchPlan({ repoRoot, content, stage })
    : null;
  const riskAdaptive = content
    ? evaluateRiskAdaptiveGate({
        repoRoot,
        content,
        packetPath,
        stage,
        effectiveRisk: risk.effective,
        changedFiles,
        gateProfile,
        deliveryRouteMode,
        routeClass: changeZoneClassification?.effectiveRouteClass ?? routeClass
      })
    : null;
  const evidenceManifest = content
    ? evaluateEvidenceManifestBinding({
        repoRoot,
        content,
        packetPath,
        workItemId: workItemId ?? activeTask?.workItemId ?? null,
        stage,
        strict: Boolean(options.strictEvidenceManifest || options.requireEvidenceManifest)
      })
    : null;
  const browserEvidence = content
    ? evaluateBrowserEvidenceBinding({
        repoRoot,
        content,
        packetPath,
        workItemId: workItemId ?? activeTask?.workItemId ?? null,
        stage,
        changedFiles,
        strict: Boolean(options.strictBrowserEvidence || options.requireBrowserEvidence || options.strictEvidenceManifest)
      })
    : null;

  addHeaderCheck(checks, findings, packet, "Ready For Code");
  addHeaderCheck(checks, findings, packet, "Gate profile");
  addHeaderCheck(checks, findings, packet, "Risk if started now");
  addHeaderCheck(checks, findings, packet, "Delivery route mode");
  addHeaderCheck(checks, findings, packet, "Route class");
  addHeaderCheck(checks, findings, packet, "Change zone");

  checks.push({
    field: "Risk preview",
    status: "info",
    current: `declared=${risk.declared}; derived=${risk.derived}; effective=${risk.effective}`,
    expected: "Use effective risk for stage-specific enforcement.",
    reason: risk.triggerReason
  });

  const enumDiagnostics = stage === "closeout" && content
    ? inspectCloseoutEnums(packet)
    : [];
  const semanticDiagnostics = content
    ? inspectSemanticContract({ repoRoot, packetPath, content, stage })
    : [];
  const semanticBlockingDiagnostics = semanticDiagnostics.filter((diagnostic) => diagnostic.blocking);
  const authoringGuide = buildAuthoringGuide({ semanticDiagnostics, enumDiagnostics });

  const stageDecision = decideStage({
    stage,
    readyForCode,
    effectiveRisk: risk.effective,
    enumDiagnostics
  });

  if (changeZoneClassification) {
    checks.push({
      field: "Change zone classification",
      status: changeZoneClassification.ok ? "pass" : "block",
      current:
        changedFiles.length === 0
          ? "no changed files supplied"
          : `${changeZoneClassification.diagnostics.length} classified path(s)`,
      expected: "declared Change zone matches ownership-map path defaults or promotes safely"
    });
    findings.push(...changeZoneClassification.diagnostics);
    if (!changeZoneClassification.ok) {
      errors.push(...changeZoneClassification.errors);
    }
  }

  if (modelingImpact) {
    checks.push({
      field: "Modeling Impact",
      status: modelingImpact.ok ? "pass" : "block",
      current: `${modelingImpact.status}; required=${modelingImpact.required ? "yes" : "no"}`,
      expected: "required core/load-bearing modeling impact is packet-local or promoted with an existing artifact"
    });
    findings.push(...modelingImpact.diagnostics);
    if (!modelingImpact.ok) {
      errors.push(...modelingImpact.diagnostics.map((diagnostic) => diagnostic.message));
    }
  }
  if (plannerPacketChallenge) {
    checks.push({
      field: "Planner Packet Challenge Review",
      status: plannerPacketChallenge.ok ? "pass" : plannerPacketChallenge.required ? "hold" : "info",
      current: plannerPacketChallenge.current,
      expected: plannerPacketChallenge.expected
    });
    findings.push(...plannerPacketChallenge.diagnostics);
    if (!plannerPacketChallenge.ok && plannerPacketChallenge.blocking) {
      errors.push(...plannerPacketChallenge.diagnostics.map((diagnostic) => diagnostic.message));
    }
  }
  if (firstImplementationReadiness) {
    checks.push({
      field: "First implementation readiness",
      status: firstImplementationReadiness.triggerPresent ? "info" : "pass",
      current: firstImplementationReadiness.status,
      expected: "compact readiness boundary before first implementation transition"
    });
  }
  if (tddEvidence) {
    checks.push({
      field: "TDD Evidence Contract",
      status: tddEvidence.blocking ? "block" : tddEvidence.diagnostics.length > 0 ? "hold" : "pass",
      current: tddEvidence.required ? `required; diagnostics=${tddEvidence.diagnostics.length}` : "not required",
      expected: "RED/GREEN/REFACTOR evidence or approved exemption at closeout"
    });
    findings.push(...tddEvidence.diagnostics);
    if (tddEvidence.blocking) {
      errors.push(...tddEvidence.diagnostics.filter((item) => item.status === "block").map((item) => item.message));
    }
  }
  if (securityReview) {
    checks.push({
      field: "CSO Security Review",
      status: securityReview.blocking ? "block" : securityReview.required ? "hold" : "pass",
      current: securityReview.required ? `required; diagnostics=${securityReview.diagnostics.length}` : "not required",
      expected: "packet-bound security review evidence for high-risk/security-sensitive closeout"
    });
    findings.push(...securityReview.diagnostics);
    if (securityReview.blocking) {
      errors.push(...securityReview.diagnostics.filter((item) => item.status === "block").map((item) => item.message));
    }
  }
  if (parallelBatch) {
    checks.push({
      field: "Parallel Batch Plan",
      status: parallelBatch.blocking ? "block" : parallelBatch.present ? "info" : "pass",
      current: parallelBatch.present ? `present; diagnostics=${parallelBatch.diagnostics.length}` : "not declared",
      expected: "file-overlap-safe batch plan when parallel execution is declared"
    });
    findings.push(...parallelBatch.diagnostics);
    if (parallelBatch.blocking) {
      errors.push(...parallelBatch.diagnostics.filter((item) => item.status === "block").map((item) => item.message));
    }
  }


  if (riskAdaptive) {
    checks.push({
      field: "V2.5 Risk-Adaptive Gate",
      status: riskAdaptive.blocking ? "block" : riskAdaptive.diagnostics.length > 0 ? "hold" : "pass",
      current: `${riskAdaptive.lane}; overlays=${riskAdaptive.riskOverlays.length > 0 ? riskAdaptive.riskOverlays.join(",") : "none"}; diagnostics=${riskAdaptive.diagnostics.length}`,
      expected: "risk overlays have stage-appropriate evidence before implementation transition or closeout"
    });
    findings.push(...riskAdaptive.diagnostics);
    if (riskAdaptive.blocking) {
      errors.push(...riskAdaptive.diagnostics.filter((item) => item.status === "block").map((item) => item.message));
    }
  }

  if (evidenceManifest) {
    checks.push({
      field: "Evidence Manifest Contract",
      status: evidenceManifest.blocking ? "block" : evidenceManifest.diagnostics.length > 0 ? "hold" : "pass",
      current: `${evidenceManifest.manifestPaths.length} manifest path(s); diagnostics=${evidenceManifest.diagnostics.length}`,
      expected: "packet-bound evidence manifests use supported V2.7/V2.8 schema and match packet_path/work_item_id"
    });
    findings.push(...evidenceManifest.diagnostics.map((diagnostic) => ({
      field: diagnostic.field ?? "Evidence Manifest",
      status: diagnostic.severity === "error" ? "block" : "hold",
      current: diagnostic.code ?? "diagnostic",
      expected: "valid packet-bound evidence manifest",
      reason: diagnostic.message,
      message: diagnostic.message
    })));
    if (evidenceManifest.blocking) {
      errors.push(...evidenceManifest.diagnostics
        .filter((item) => item.severity === "error")
        .map((item) => item.message));
    }
  }

  if (browserEvidence) {
    checks.push({
      field: "Browser Evidence Contract",
      status: browserEvidence.blocking ? "block" : browserEvidence.diagnostics.length > 0 ? "hold" : "pass",
      current: `required=${browserEvidence.required ? "yes" : "no"}; browser manifests=${browserEvidence.manifestPaths.length}; diagnostics=${browserEvidence.diagnostics.length}`,
      expected: "UI/user-facing closeout has packet-bound Codex Browser or optional Playwright evidence"
    });
    findings.push(...browserEvidence.diagnostics.map((diagnostic) => ({
      field: diagnostic.field ?? "Browser Evidence",
      status: diagnostic.severity === "error" ? "block" : "hold",
      current: diagnostic.code ?? "diagnostic",
      expected: "valid Codex Browser or optional Playwright browser evidence",
      reason: diagnostic.message,
      message: diagnostic.message
    })));
    if (browserEvidence.blocking) {
      errors.push(...browserEvidence.diagnostics
        .filter((item) => item.severity === "error")
        .map((item) => item.message));
    }
  }

  findings.push(...stageDecision.findings);
  if (stageDecision.blocking) {
    errors.push(...stageDecision.errors);
  }
  if (enumDiagnostics.length > 0) {
    errors.push(...enumDiagnostics.map((diagnostic) => diagnostic.message));
  }
  checks.push({
    field: "Task packet semantic contract",
    status: semanticBlockingDiagnostics.length === 0 ? "pass" : "block",
    current:
      semanticDiagnostics.length === 0
        ? "pass"
        : `${semanticBlockingDiagnostics.length} blocking / ${semanticDiagnostics.length} total`,
    expected: "same semantic contract used by packet registration"
  });
  findings.push(...semanticDiagnostics);
  if (semanticBlockingDiagnostics.length > 0) {
    errors.push(...semanticBlockingDiagnostics.map((diagnostic) => diagnostic.message));
  }

  const finalDisposition = resolveFinalDisposition({ stage, errors, stageDecision });
  return {
    ok: errors.length === 0,
    command: "packet-preflight",
    stage,
    disposition: finalDisposition,
    workItemId: workItemId ?? activeTask?.workItemId ?? null,
    packetPath,
    readyForCode,
    gateProfile: gateProfile || "missing",
    deliveryRouteMode: deliveryRouteMode || "missing",
    routeClass: changeZoneClassification?.effectiveRouteClass ?? (routeClass || "missing"),
    requestedRouteClass: routeClass || "missing",
    changeZone: changeZone || "missing",
    changedFiles,
    changeZoneClassification,
    modelingImpact,
    plannerPacketChallenge,
    firstImplementationReadiness,
    tddEvidence,
    securityReview,
    parallelBatch,
    riskAdaptive,
    evidenceManifest,
    browserEvidence,
    authoringGuide,
    risk,
    checks,
    findings,
    semanticDiagnostics,
    enumDiagnostics,
    errors,
    nextAction: errors.length > 0 ? blockedNextActionForStage(stage, stageDecision) : stageDecision.nextAction
  };
}

function evaluateFirstImplementationReadiness({
  repoRoot,
  stage,
  workItem,
  workItemId,
  packetPath,
  readyForCode,
  gateProfile,
  deliveryRouteMode,
  routeClass,
  changeZone
}) {
  const owner = normalizePacketHeaderValue(workItem?.owner ?? "");
  const status = normalizePacketHeaderValue(workItem?.status ?? "");
  const implementationOwners = new Set(["developer", "orchestrator", "tester", "reviewer"]);
  const implementationTransition = stage === "implementation-transition";
  const triggerReasons = [];
  const noRepeatReasons = [];

  if (implementationTransition && (!owner || owner === "planner")) {
    triggerReasons.push("implementation transition from planner or no-active owner");
  }
  if (implementationTransition && ["planning", "hold", "blocked"].includes(status)) {
    triggerReasons.push(`current status ${status || "missing"} is pre-implementation`);
  }
  if (implementationTransition && implementationOwners.has(owner)) {
    noRepeatReasons.push(`current owner ${owner} already has active implementation/verification handoff`);
  }
  if (!implementationTransition) {
    noRepeatReasons.push(`stage ${stage} is not implementation-transition`);
  }

  const activeContext = inspectActiveContextFreshness({ repoRoot, workItemId, packetPath });
  if (implementationTransition && activeContext.status !== "fresh") {
    triggerReasons.push(`active context ${activeContext.status}`);
  }

  const triggerPresent = triggerReasons.length > 0 && noRepeatReasons.length === 0;
  const readinessChecks = [
    {
      item: "active lane",
      value: workItemId ? `${workItemId} / ${owner || "missing"} / ${status || "missing"}` : "missing",
      source: "work_item_registry"
    },
    {
      item: "active packet",
      value: packetPath ?? "missing",
      source: "packet sourceRef"
    },
    {
      item: "Ready For Code",
      value: readyForCode,
      source: "packet Quick Decision Header"
    },
    {
      item: "packet/lane/route",
      value: `gate=${gateProfile || "missing"}; route=${routeClass || "missing"}; delivery=${deliveryRouteMode || "missing"}; changeZone=${changeZone || "missing"}`,
      source: "packet metadata"
    },
    {
      item: "canonical/generated boundary",
      value: "packet and operational DB are canonical for this transition; Active Context and generated docs are read models",
      source: "workspace contract"
    },
    {
      item: "validation finding meaning",
      value: "blockers stop the transition; warnings require explanation but do not equal product verification",
      source: "validation report contract"
    },
    {
      item: "root/standard-template parity",
      value: "required when reusable root workflow/runtime/test/manual surfaces change",
      source: "contract gate profile"
    }
  ];

  return {
    schemaVersion: "standard-harness-first-implementation-readiness/v1",
    status: triggerPresent ? "required" : "not-needed",
    triggerPresent,
    triggerReasons,
    noRepeatReasons,
    activeContext,
    readinessChecks,
    allowedNextAction:
      readyForCode === "approved"
        ? "Proceed only with the approved implementation transition and selected route."
        : "Hold before implementation until Ready For Code is explicitly approved.",
    stopCondition:
      "Stop if Ready For Code is not approved, Active Context is stale without sync/repair, the active packet is missing, or the requested work exceeds packet scope.",
    refreshBeforeBroadReread:
      activeContext.status === "fresh"
        ? null
        : "Run sync-state or context --repair before broad rereads or implementation."
  };
}

function inspectActiveContextFreshness({ repoRoot, workItemId, packetPath }) {
  const activeContextPath = path.resolve(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json");
  if (!fs.existsSync(activeContextPath)) {
    return {
      status: "missing",
      path: ".agents/runtime/ACTIVE_CONTEXT.json",
      reason: "Active Context is missing."
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(activeContextPath, "utf8"));
    const selectedWorkItem = parsed.selectedLane?.workItemId ?? parsed.activeTask?.workItemId ?? null;
    const selectedPacket = parsed.sources?.activePacket ?? parsed.activeTask?.sourceRef ?? null;
    if (workItemId && selectedWorkItem && selectedWorkItem !== workItemId) {
      return {
        status: "stale",
        path: ".agents/runtime/ACTIVE_CONTEXT.json",
        reason: `Active Context selected work item ${selectedWorkItem} does not match ${workItemId}.`
      };
    }
    if (packetPath && selectedPacket && normalizeRelativePath(selectedPacket) !== normalizeRelativePath(packetPath)) {
      return {
        status: "stale",
        path: ".agents/runtime/ACTIVE_CONTEXT.json",
        reason: `Active Context active packet ${selectedPacket} does not match ${packetPath}.`
      };
    }
    return {
      status: "fresh",
      path: ".agents/runtime/ACTIVE_CONTEXT.json",
      generatedAt: parsed.generatedAt ?? null
    };
  } catch (error) {
    return {
      status: "unreadable",
      path: ".agents/runtime/ACTIVE_CONTEXT.json",
      reason: error.message
    };
  }
}

function buildAuthoringGuide({ semanticDiagnostics, enumDiagnostics }) {
  const exactLiteralDiagnostics = semanticDiagnostics.filter(
    (diagnostic) => diagnostic.code === "task_packet_exact_enum_value_invalid"
  );
  const activeExactFields = new Set([
    ...exactLiteralDiagnostics.map((diagnostic) => diagnostic.field),
    ...enumDiagnostics.map((diagnostic) => diagnostic.field)
  ]);

  return {
    exactFieldRule: "Exact enum fields must contain the enum value only; punctuation and spaces are part of the exact value.",
    strictLiteralEnums: STRICT_LITERAL_ENUM_GUIDE.map((entry) => ({
      ...entry,
      activeDiagnostic: activeExactFields.has(entry.field)
    })),
    verificationManifest: {
      heading: "## Verification Manifest",
      minimalExample: [
        "- Ready For Code: approved",
        "- root: targeted/full root checks",
        "- standard-template: targeted/full starter checks",
        "- targeted: packet-specific regression",
        "- validator: harness validator pass",
        "- active context: regenerated or not-needed",
        "- review closeout: Reviewer report or not-needed"
      ]
    },
    evidenceManifest: {
      heading: "## Evidence Manifest",
      minimalExample: [
        "- Evidence manifest path: reference/evidence/manifests/WI-01-tdd.json",
        "- Security evidence manifest path: reference/evidence/manifests/WI-01-security.json"
      ],
      createCommand: "npm run harness:evidence-manifest -- create --type tdd --work-item WI-01 --packet reference/packets/PKT-01.md --source-command 'npm test' --apply"
    },
    plannerPacketChallenge: {
      heading: PLANNER_PACKET_CHALLENGE_HEADING,
      requiredWhen: "all user-requested planning packets before Ready For Code; low-risk fast-path may use an explicit sourced exemption record, never a silent skip",
      minimalExample: [
        "- Challenge reviewer: independent planning reviewer",
        "- Challenge reviewer independence basis: reviewer is not the packet author",
        "- Source refs reviewed: packet, parent objective, approved source",
        "- Challenge status: pass",
        "- Parent objective coverage: names the parent objective slice this packet closes",
        "- Deferred scope with named follow-up: none, or follow-up packet id",
        "- Acceptance proves behavior change: concrete behavior/evidence, not marker-only existence",
        "- Failure fixture or failure condition: negative fixture or stated hold condition",
        "- Reviewer closeout hold basis: what later review may fail",
        "- First-wave limit check: not objective avoidance",
        "- Guidance-only sufficiency rationale: intentional level, or runtime enforcement planned",
        "- Challenge evidence artifact path: packet-local ledger or external evidence path",
        "- Findings disposition: no findings, or findings applied/deferred with owner",
        "- Required corrections applied: applied, or not-needed because no findings",
        "- No self-approval claim: independent reviewer, not packet author"
      ]
    },
    closeoutMetadataExample: {
      reference: CLOSEOUT_REFERENCE,
      fields: CLOSEOUT_ENUMS.map((entry) => ({
        field: entry.field,
        expected: entry.expected
      })),
      narrativeDestination: NARRATIVE_DESTINATION
    }
  };
}

function evaluatePlannerPacketChallenge({ content, stage, effectiveRisk, gateProfile, changeZone, routeClass }) {
  const explicitRequired = normalizePacketHeaderValue(readPacketBulletFieldValueFromContent(content, "Planner packet challenge required") ?? "");
  const fastPathExempt =
    effectiveRisk === "low" &&
    changeZone === "padded" &&
    routeClass === "fast-path" &&
    (gateProfile === "light" || gateProfile === "standard" || !gateProfile);
  const requiredReasons = [
    "universal planning packet challenge/exemption gate",
    effectiveRisk === "high" || effectiveRisk === "critical" ? `effective risk ${effectiveRisk}` : null,
    changeZone === "core" || changeZone === "load-bearing" ? `Change zone ${changeZone}` : null,
    gateProfile === "contract" || gateProfile === "release" ? `Gate profile ${gateProfile}` : null,
    routeClass === "packet-path" && !fastPathExempt ? "Route class packet-path" : null,
    routeClass === "strict-path" ? "Route class strict-path" : null,
    ["yes", "required", "true"].includes(explicitRequired) ? "packet declares challenge required" : null
  ].filter(Boolean);
  const required = true;
  const section = sliceSection(content, PLANNER_PACKET_CHALLENGE_HEADING) ?? "";
  const status = normalizePacketHeaderValue(readPacketBulletFieldValueFromContent(section, "Challenge status") ?? "");
  const statusIsPass = status === "pass";
  const statusIsExemption = ["exempt", "exemption-approved", "approved-exemption"].includes(status);
  const statusAccepted = statusIsPass || (statusIsExemption && fastPathExempt);
  const missingFields = PLANNER_PACKET_CHALLENGE_REQUIRED_FIELDS.filter((field) => {
    const value = readPacketBulletFieldValueFromContent(section, field);
    return !isClosedChallengeField(value);
  });
  const diagnostics = [];
  if (required && !section) {
    diagnostics.push({
      field: "Planner Packet Challenge Review",
      status: stage === "implementation-transition" ? "block" : "hold",
      current: "missing",
      expected: PLANNER_PACKET_CHALLENGE_HEADING,
      reason: `Challenge review is required because ${requiredReasons.join(", ")}.`,
      message: `Planner Packet Challenge Review is required before implementation transition because ${requiredReasons.join(", ")}.`
    });
  }
  if (required && statusIsExemption && !fastPathExempt) {
    diagnostics.push({
      field: "Challenge status",
      status: stage === "implementation-transition" ? "block" : "hold",
      current: status,
      expected: "pass unless low-risk fast-path explicit exemption is valid",
      reason: "Only low-risk padded fast-path packets may use explicit challenge exemption.",
      message: "Planner Packet Challenge Review exemption is only allowed for low-risk padded fast-path packets."
    });
  }
  if (required && !statusAccepted) {
    diagnostics.push({
      field: "Challenge status",
      status: stage === "implementation-transition" ? "block" : "hold",
      current: status || "missing",
      expected: "pass or approved explicit low-risk exemption",
      reason: "Planning packets must pass packet-quality challenge review or record a valid explicit exemption before Ready For Code delivery.",
      message: `Planner Packet Challenge Review requires Challenge status: pass or approved explicit exemption before implementation transition; current value is ${status || "missing"}.`
    });
  }
  for (const field of missingFields) {
    diagnostics.push({
      field,
      status: stage === "implementation-transition" ? "block" : "hold",
      current: readPacketBulletFieldValueFromContent(section, field) || "missing",
      expected: "closed challenge-review evidence",
      reason: "Required challenge review fields must show non-pending packet-quality evidence.",
      message: `Planner Packet Challenge Review field "${field}" must be closed before implementation transition.`
    });
  }
  diagnostics.push(...inspectChallengeFieldQuality({ section, stage, required }));

  const blocking = required && stage === "implementation-transition" && diagnostics.length > 0;
  return {
    ok: !required || diagnostics.length === 0,
    required,
    requiredReasons,
    status: status || "missing",
    current: required
      ? `required; status=${status || "missing"}; missingFields=${missingFields.length}`
      : "not required",
    expected: required
      ? "Challenge status pass or approved explicit exemption with closed source/evidence/disposition fields"
      : "optional only when packet contract explicitly disables the universal gate",
    diagnostics,
    blocking
  };
}

function inspectChallengeFieldQuality({ section, stage, required }) {
  if (!required || !section) {
    return [];
  }
  const diagnostics = [];
  const deferredScope = readPacketBulletFieldValueFromContent(section, "Deferred scope with named follow-up") ?? "";
  const deferredNormalized = normalizePacketHeaderValue(deferredScope);
  if (
    deferredScope &&
    !["none", "not-needed", "no-deferred-scope"].includes(deferredNormalized) &&
    !/follow[- ]?up|next packet|OPS-[A-Z0-9-]+|PKT-[A-Z0-9-]+/i.test(deferredScope)
  ) {
    diagnostics.push(buildChallengeQualityDiagnostic({
      field: "Deferred scope with named follow-up",
      stage,
      current: deferredScope,
      expected: "none, not-needed, or named follow-up packet",
      reason: "Deferred scope must not escape without a named owner.",
      message: "Planner Packet Challenge Review deferred scope must name a follow-up packet or state none/not-needed."
    }));
  }

  const acceptance = readPacketBulletFieldValueFromContent(section, "Acceptance proves behavior change") ?? "";
  if (/document exists|artifact exists|marker only|presence only|exists only/i.test(acceptance)) {
    diagnostics.push(buildChallengeQualityDiagnostic({
      field: "Acceptance proves behavior change",
      stage,
      current: acceptance,
      expected: "behavior-changing evidence, not marker-only artifact existence",
      reason: "Acceptance must prove the parent objective changes behavior.",
      message: "Planner Packet Challenge Review acceptance evidence cannot be marker-only artifact/document existence."
    }));
  }

  const noSelfApproval = readPacketBulletFieldValueFromContent(section, "No self-approval claim") ?? "";
  if (noSelfApproval && !/no self|not self|independent|sub-agent|adversarial/i.test(noSelfApproval)) {
    diagnostics.push(buildChallengeQualityDiagnostic({
      field: "No self-approval claim",
      stage,
      current: noSelfApproval,
      expected: "explicit no-self-approval or independent reviewer claim",
      reason: "Planner must not self-pass the challenge review.",
      message: "Planner Packet Challenge Review must explicitly rule out self-approval."
    }));
  }

  return diagnostics;
}

function buildChallengeQualityDiagnostic({ field, stage, current, expected, reason, message }) {
  return {
    field,
    status: stage === "implementation-transition" ? "block" : "hold",
    current: current || "missing",
    expected,
    reason,
    message
  };
}

function isClosedChallengeField(value) {
  const normalized = normalizePacketHeaderValue(value);
  return Boolean(value) && !["pending", "draft", "todo", "tbd", "unknown", "missing", "fail", "hold"].includes(normalized);
}

function inspectPacket(content) {
  const header = readQuickDecisionHeader(content);
  const fields = readBulletFields(content);
  const closeout = readBulletFields(sliceSection(content, "## 15. Packet Exit Quality Gate") ?? "");
  return { header, fields, closeout };
}

function emptyPacket() {
  return { header: {}, fields: {}, closeout: {} };
}

function inspectSemanticContract({ repoRoot, packetPath, content, stage }) {
  const semanticContract = inspectTaskPacketContract({
    repoRoot,
    packetPath,
    content,
    stage
  });
  const semanticErrors = semanticContract.findings?.filter((finding) => finding.severity === "error") ?? [];
  return semanticErrors.map((finding) => {
    const allowedPlanningHold =
      stage === "planning-open" && finding.code === "risk_class_high_requires_packet_approval_evidence";
    return {
      field: finding.headerItem ?? finding.field ?? "Task packet semantic contract",
      status: allowedPlanningHold ? "hold" : "block",
      current: finding.currentValue ?? finding.effectiveRiskClass ?? finding.declaredRiskClass ?? finding.headerItem ?? finding.field ?? "semantic error",
      expected: semanticFindingExpected(finding),
      code: finding.code,
      blocking: !allowedPlanningHold,
      reason: finding.message,
      message: formatSemanticFindingMessage(finding)
    };
  });
}

function semanticFindingExpected(finding) {
  if (Array.isArray(finding.expectedValues) && finding.expectedValues.length > 0) {
    return finding.expectedValues.join(" | ");
  }
  if (finding.headerItem) {
    return `approved status for ${finding.headerItem}`;
  }
  if (finding.code === "risk_class_high_requires_packet_approval_evidence") {
    return "Ready For Code approved with verification evidence before implementation transition";
  }
  return "registered packet semantic contract";
}

function formatSemanticFindingMessage(finding) {
  const details = [
    finding.code ? `code=${finding.code}` : null,
    finding.headerItem ? `field=${finding.headerItem}` : null,
    finding.field ? `field=${finding.field}` : null
  ].filter(Boolean);
  return `Task packet semantic preflight failed: ${finding.message}${details.length > 0 ? ` (${details.join("; ")})` : ""}`;
}

function addHeaderCheck(checks, findings, packet, field) {
  const current = packet.header[field] ?? packet.fields[field] ?? "";
  const status = current ? "pass" : "warn";
  const check = {
    field,
    status,
    current: current || "missing",
    expected: "Quick Decision Header row"
  };
  checks.push(check);
  if (!current) {
    findings.push({
      ...check,
      reason: `${field} is missing from the packet authoring preflight surface.`
    });
  }
}

function readQuickDecisionHeader(content) {
  const section = sliceSection(content, "## Quick Decision Header") ?? "";
  const rows = {};
  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) {
      continue;
    }
    const cells = parseTableCells(line);
    if (cells.length < 4 || /^-+$/.test(cells[0]) || cells[0].toLowerCase() === "item") {
      continue;
    }
    rows[cells[0].trim()] = cells[1]?.trim() ?? "";
  }
  return rows;
}

function readBulletFields(content) {
  const fields = {};
  if (!content) {
    return fields;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const match = rawLine.trim().match(/^-\s*([^:]+):\s*(.*)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  }
  return fields;
}

function inferStage({ options, workItem, content }) {
  if (options.transition && /^planner-to-(developer|orchestrator)$/i.test(options.transition)) {
    return "implementation-transition";
  }
  const packetExitStatus = normalizePacketHeaderValue(readPacketHeaderValueFromContent(content ?? "", "Packet exit gate status") ?? "");
  const closeoutRecommendation = normalizePacketHeaderValue(
    readPacketBulletFieldValueFromContent(sliceSection(content ?? "", "## 15. Packet Exit Quality Gate") ?? "", "Exit recommendation") ?? ""
  );
  if (packetExitStatus === "approved" || closeoutRecommendation === "approved") {
    return "closeout";
  }
  if (workItem?.owner === "planner" || !workItem) {
    return "planning-open";
  }
  return "implementation-transition";
}

function normalizeReadyForCode(value) {
  const normalized = normalizePacketHeaderValue(value);
  if (normalized === "approve") {
    return "approved";
  }
  if (["approved", "hold", "pending", "draft"].includes(normalized)) {
    return normalized;
  }
  return normalized || "missing";
}

function stripInlineFormatting(value) {
  return String(value ?? "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^__|__$/g, "")
    .trim();
}

function readRelativeFile(repoRoot, relativePath) {
  if (!relativePath) {
    return null;
  }
  const target = path.resolve(repoRoot, relativePath);
  const root = path.resolve(repoRoot);
  if (!target.startsWith(root) || !fs.existsSync(target)) {
    return null;
  }
  return fs.readFileSync(target, "utf8");
}

function normalizeRelativePath(value) {
  if (!value) {
    return null;
  }
  return String(value).replace(/\\/g, "/").replace(/^\.\//, "");
}

function withStore({ repoRoot, dbPath }, callback) {
  const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
  const store = createOperatingStateStore({ dbPath: resolvedDbPath });
  try {
    return callback(store);
  } finally {
    store.close();
  }
}

function parseArgs(args) {
  const options = { positionals: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
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
  const [first] = options.positionals;
  if (first) {
    options.workItem ??= first;
  }
  delete options.positionals;
  return options;
}
