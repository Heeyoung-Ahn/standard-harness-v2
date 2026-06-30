import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AUTHORITY_DENIAL,
  classifyPromotionPath,
  normalizePromotionPath
} from "./promotion-boundary.js";

const PLACEHOLDER_DIRS = [".agents/runtime"];

export function runPromoteStarterCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const options = parsePromotionArgs(args);
  if (!options.to) {
    return failPromotion({
      reason: "Missing required --to target path.",
      nextAction: "Run npm run harness:promote-starter -- --to <new-clean-starter-path>."
    });
  }

  const targetRoot = path.resolve(repoRoot, options.to);
  const sourceRoot = path.resolve(repoRoot);
  const targetSafety = validateTarget({ sourceRoot, targetRoot, force: options.force });
  if (!targetSafety.ok) return targetSafety;

  const plan = buildPromotionPlan({ repoRoot: sourceRoot, targetRoot });
  if (options.dryRun) {
    return {
      ok: true,
      command: "promote-starter",
      dryRun: true,
      sourceRoot,
      targetRoot,
      summary: summarizePlan(plan),
      plan,
      releaseReadiness: evaluateReleaseReadiness(plan),
      authority: AUTHORITY_DENIAL,
      nextAction: "Review include/exclude/review lanes, then rerun without --dry-run to export."
    };
  }

  fs.mkdirSync(targetRoot, { recursive: true });
  for (const item of plan.items.filter((entry) => entry.decision === "include")) {
    copyFile(sourceRoot, targetRoot, item.path);
  }
  writeStarterSeedArtifacts(targetRoot);
  writeMergedPackageJson({ sourceRoot, targetRoot });
  writePlaceholders(targetRoot);
  writeExportProvenance({ sourceRoot, targetRoot, plan });
  const contaminationAudit = auditStarterCandidate({ candidateRoot: targetRoot });
  const freshVerification = options.verify
    ? verifyStarterCandidate({ candidateRoot: targetRoot })
    : buildFreshStarterVerificationPlan({ candidateRoot: targetRoot });

  return {
    ok: contaminationAudit.ok && (!options.verify || freshVerification.ok),
    command: "promote-starter",
    dryRun: false,
    sourceRoot,
    targetRoot,
    summary: summarizePlan(plan),
    contaminationAudit,
    freshVerification,
    releaseReadiness: evaluateReleaseReadiness(plan),
    writtenFiles: listFiles(targetRoot),
    authority: AUTHORITY_DENIAL,
    nextAction: promotionNextAction({ verify: options.verify, freshVerification })
  };
}

export function buildPromotionPlan({ repoRoot = process.cwd(), targetRoot = null } = {}) {
  const items = [];
  for (const filePath of listFiles(repoRoot)) {
    const classification = classifyPromotionPath(filePath);
    items.push({
      path: filePath,
      decision: classification.decision,
      reason: classification.reason,
      reviewKind: classification.reviewKind ?? null,
      validationKind: classification.validationKind
    });
  }

  items.sort((left, right) => left.path.localeCompare(right.path));
  return {
    sourceRoot: path.resolve(repoRoot),
    targetRoot: targetRoot ? path.resolve(targetRoot) : null,
    items,
    summary: summarizePlan({ items }),
    releaseReadiness: evaluateReleaseReadiness({ items }),
    authority: AUTHORITY_DENIAL
  };
}

export function auditStarterCandidate({ candidateRoot = process.cwd() } = {}) {
  const findings = [];
  for (const filePath of listFiles(candidateRoot)) {
    if (isAllowedCleanPlaceholder(filePath)) continue;
    const classification = classifyPromotionPath(filePath);
    if (classification.decision === "exclude") {
      findings.push(auditFindingForPath(filePath));
      continue;
    }
    const contentFinding = auditContentForSecrets({ candidateRoot, filePath });
    if (contentFinding) {
      findings.push(contentFinding);
    }
  }

  const provenancePath = path.join(candidateRoot, ".harness/promotion/EXPORT_PROVENANCE.json");
  if (!fs.existsSync(provenancePath)) {
    findings.push({
      severity: "hold",
      lane: "provenance",
      path: ".harness/promotion/EXPORT_PROVENANCE.json",
      reason: "Export provenance marker is required before treating a candidate as promotion-generated."
    });
  }

  const summary = summarizeFindings(findings);
  return {
    ok: summary.block === 0 && summary.hold === 0,
    command: "promote-starter",
    auditKind: "starter_contamination_audit",
    decision: summary.block > 0 ? "block" : summary.hold > 0 ? "hold" : summary.warn > 0 ? "warn" : "pass",
    candidateRoot: path.resolve(candidateRoot),
    summary,
    findings,
    authority: AUTHORITY_DENIAL,
    nextAction:
      summary.block > 0
        ? "Remove blocked contamination and rerun promotion export from the source project."
        : summary.hold > 0
          ? "Regenerate the candidate through harness:promote-starter so provenance is available."
          : "Proceed to fresh starter verification."
  };
}

function isAllowedCleanPlaceholder(filePath) {
  return normalizePromotionPath(filePath) === ".agents/runtime/.gitkeep";
}

function parsePromotionArgs(args) {
  const options = { dryRun: false, force: false, verify: false, to: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--verify") options.verify = true;
    else if (arg === "--to") {
      options.to = args[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--to=")) {
      options.to = arg.slice("--to=".length);
    }
  }
  return options;
}

export function buildFreshStarterVerificationPlan({ candidateRoot = process.cwd() } = {}) {
  return {
    ok: true,
    command: "promote-starter",
    verificationKind: "fresh_starter_verification_plan",
    candidateRoot: path.resolve(candidateRoot),
    decision: "not_run",
    lanes: verificationSteps().map((step) => ({
      lane: step.lane,
      command: step.command,
      status: "not_run",
      validationKind: step.validationKind
    })),
    authority: AUTHORITY_DENIAL,
    nextAction: "Run harness:promote-starter with --verify to execute the fresh starter verification commands."
  };
}

export function verifyStarterCandidate({
  candidateRoot = process.cwd(),
  runCommand = runVerificationCommand
} = {}) {
  const lanes = [];
  for (const step of verificationSteps()) {
    const outcome = runCommand(step, { cwd: candidateRoot });
    const exitCode = Number(outcome.exitCode ?? outcome.status ?? 1);
    const combinedOutput = `${String(outcome.stdout ?? "")}\n${String(outcome.stderr ?? "")}`;
    const expectedHold =
      step.acceptedFailureCode && exitCode !== 0 && combinedOutput.includes(step.acceptedFailureCode);
    const status = exitCode === 0 || expectedHold ? "pass" : "block";
    lanes.push({
      lane: step.lane,
      command: step.command,
      status,
      validationKind: step.validationKind,
      expectedHold,
      exitCode,
      stdout: String(outcome.stdout ?? ""),
      stderr: String(outcome.stderr ?? "")
    });
    if (status === "block") break;
  }

  const blocked = lanes.find((lane) => lane.status === "block");
  return {
    ok: !blocked && lanes.length === verificationSteps().length,
    command: "promote-starter",
    verificationKind: "fresh_starter_verification",
    candidateRoot: path.resolve(candidateRoot),
    decision: blocked ? "block" : "pass",
    lanes,
    authority: AUTHORITY_DENIAL,
    nextAction: blocked
      ? `Fix ${blocked.command} in the exported starter candidate, then rerun fresh starter verification.`
      : "Fresh starter verification evidence is available; this is not product verification or release approval."
  };
}

function verificationSteps() {
  return [
    {
      lane: "reusable_payload",
      command: "npm install",
      validationKind: "dependency_install"
    },
    {
      lane: "reusable_payload",
      command: "npm test",
      validationKind: "payload_tests"
    },
    {
      lane: "reusable_payload",
      command: "npm run harness:payload-boundary",
      validationKind: "clean_payload_boundary"
    },
    {
      lane: "reusable_payload",
      command: "npm run harness:validate",
      validationKind: "starter_pre_init_bootstrap_hold",
      acceptedFailureCode: "starter_bootstrap_pending"
    },
    {
      lane: "initialized_project",
      command:
        'npm run harness:init -- --non-interactive --project-name "Promoted Starter Smoke" --project-slug "promoted-starter-smoke" --user-goal "Verify promoted starter" --ops-goal "Verify harness promotion workflow" --approval-goal "Keep approval boundaries explicit" --profiles none',
      validationKind: "non_interactive_init"
    },
    {
      lane: "initialized_project",
      command: "npm run harness:sync-state",
      validationKind: "generated_state_convergence"
    },
    {
      lane: "initialized_project",
      command: "npm run harness:validate",
      validationKind: "post_init_harness_structural_validation"
    },
    {
      lane: "initialized_project",
      command: "npm run harness:status",
      validationKind: "initialized_project_status"
    }
  ];
}

function runVerificationCommand(step, { cwd }) {
  const result = spawnSync(step.command, {
    cwd,
    shell: true,
    encoding: "utf8",
    windowsHide: true
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? ""
  };
}

function validateTarget({ sourceRoot, targetRoot, force }) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedTarget = path.resolve(targetRoot);
  if (resolvedSource === resolvedTarget) {
    return failPromotion({
      reason: "Promotion target cannot be the source product project.",
      nextAction: "Choose a separate target directory outside the source project root."
    });
  }

  const relativeTarget = path.relative(resolvedSource, resolvedTarget);
  if (relativeTarget && !relativeTarget.startsWith("..") && !path.isAbsolute(relativeTarget)) {
    return failPromotion({
      reason: "Promotion target cannot be inside the source product project.",
      nextAction: "Choose a separate target directory outside the source project root."
    });
  }

  if (fs.existsSync(targetRoot) && fs.readdirSync(targetRoot).length > 0 && !force) {
    return failPromotion({
      reason: "Promotion target already exists and is not empty.",
      nextAction: "Use a new empty target path or rerun with --force after reviewing the target."
    });
  }

  return { ok: true };
}

function failPromotion({ reason, nextAction }) {
  return {
    ok: false,
    command: "promote-starter",
    reason,
    nextAction,
    authority: AUTHORITY_DENIAL
  };
}

function summarizePlan(plan) {
  const items = plan.items ?? [];
  return {
    include: items.filter((item) => item.decision === "include").length,
    exclude: items.filter((item) => item.decision === "exclude").length,
    review: items.filter((item) => item.decision === "review").length
  };
}

function evaluateReleaseReadiness(plan) {
  const unresolvedReviewLanes = (plan.items ?? [])
    .filter((item) => item.decision === "review")
    .map((item) => ({
      path: item.path,
      reviewKind: item.reviewKind ?? "unclassified_review",
      reason: item.reason
    }));
  const unresolvedReviewCount = unresolvedReviewLanes.length;
  return {
    decision: unresolvedReviewCount > 0 ? "block" : "pass",
    unresolvedReviewCount,
    unresolvedReviewLanes,
    authority: AUTHORITY_DENIAL,
    nextAction:
      unresolvedReviewCount > 0
        ? "Resolve, adjudicate, or explicitly keep every review lane as non-release before making any release-ready claim."
        : "No unresolved review lanes remain; still use release, publish, promotion, closeout, and risk gates before any approval claim."
  };
}

function promotionNextAction({ verify, freshVerification }) {
  if (!verify) {
    return "Run with --verify, or manually run npm install, npm test, npm run harness:payload-boundary, pre-init validate, non-interactive init, sync-state, post-init validate, and status in the exported starter candidate.";
  }
  if (freshVerification?.ok) {
    return "Review promotion output and authority boundary; fresh starter verification evidence is available.";
  }
  return freshVerification?.nextAction ?? "Fix fresh starter verification findings, then rerun with --verify.";
}

function copyFile(sourceRoot, targetRoot, relativePath) {
  const normalized = normalizePromotionPath(relativePath);
  const source = path.join(sourceRoot, normalized);
  const target = path.join(targetRoot, normalized);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function writeMergedPackageJson({ sourceRoot, targetRoot }) {
  const sourcePackagePath = path.join(sourceRoot, "package.json");
  if (!fs.existsSync(sourcePackagePath)) return;

  const sourcePackage = JSON.parse(fs.readFileSync(sourcePackagePath, "utf8"));
  const harnessScripts = Object.fromEntries(
    Object.entries(sourcePackage.scripts ?? {}).filter(
      ([name]) =>
        name === "pretest" ||
        name === "test" ||
        name.startsWith("harness:") ||
        name.startsWith("docs:") ||
        name.startsWith("browser:")
    )
  );
  if (harnessScripts.test) {
    harnessScripts.test = "node --test .harness/test/promote-starter.test.js";
  }
  const starterPackage = {
    name: "standard-harness-clean-starter",
    private: true,
    type: sourcePackage.type ?? "module",
    engines: sourcePackage.engines,
    scripts: harnessScripts,
    version: sourcePackage.version,
    description: "Clean starter candidate exported from a standard-harness product project."
  };
  for (const key of Object.keys(starterPackage)) {
    if (starterPackage[key] === undefined) delete starterPackage[key];
  }
  fs.writeFileSync(path.join(targetRoot, "package.json"), `${JSON.stringify(starterPackage, null, 2)}\n`, "utf8");
}

function writePlaceholders(targetRoot) {
  for (const relativeDir of PLACEHOLDER_DIRS) {
    const dir = path.join(targetRoot, relativeDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitkeep"), "", "utf8");
  }
}

function writeStarterSeedArtifacts(targetRoot) {
  const seedFiles = {
    ".agents/artifacts/CURRENT_STATE.md": starterCurrentState(),
    ".agents/artifacts/TASK_LIST.md": starterTaskList(),
    ".agents/artifacts/REQUIREMENTS.md": starterRequirements(),
    ".agents/artifacts/ARCHITECTURE_GUIDE.md": starterArchitectureGuide(),
    ".agents/artifacts/IMPLEMENTATION_PLAN.md": starterImplementationPlan(),
    ".agents/artifacts/ACTIVE_PROFILES.md": starterActiveProfiles(),
    ".agents/artifacts/PROJECT_PROGRESS.md": starterProjectProgress(),
    ".agents/artifacts/PROJECT_HISTORY.md": starterProjectHistory(),
    ".agents/artifacts/PREVENTIVE_MEMORY.md": starterPreventiveMemory()
  };

  for (const [relativePath, content] of Object.entries(seedFiles)) {
    writeSeedFile(targetRoot, relativePath, content, { overwrite: true });
  }

  for (const [relativePath, content] of Object.entries(starterReferenceSeedFiles())) {
    writeSeedFile(targetRoot, relativePath, content, { overwrite: false });
  }
}

function writeSeedFile(targetRoot, relativePath, content, { overwrite }) {
  const target = path.join(targetRoot, relativePath);
  if (!overwrite && fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${content.trim()}\n`, "utf8");
}

function starterReferenceSeedFiles() {
  const profileIds = ["PRF-04", "PRF-05", "PRF-06", "PRF-07", "PRF-08", "PRF-09", "PRF-10"];
  return {
    "reference/planning/PLN-00_DEEP_INTERVIEW.md": starterReferenceDoc("PLN-00 Deep Interview"),
    "reference/planning/PLN-01_REQUIREMENTS_FREEZE.md": starterReferenceDoc("PLN-01 Requirements Freeze"),
    "reference/artifacts/PROJECT_STARTER_DOC_PACK.md": starterReferenceDoc("Project Starter Doc Pack"),
    "reference/artifacts/UI_DESIGN.md": starterReferenceDoc("UI Design"),
    "reference/artifacts/DEPLOYMENT_PLAN.md": starterReferenceDoc("Deployment Plan"),
    "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md": starterReferenceDoc("Packet Exit Quality Gate"),
    "reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.md": starterReferenceDoc("Repository Layout Ownership"),
    "reference/artifacts/LEGACY_SYSTEM_INTAKE.md": starterReferenceDoc("Legacy System Intake"),
    "reference/artifacts/MIGRATION_RECONCILIATION_PLAN.md": starterReferenceDoc("Migration Reconciliation Plan"),
    "reference/artifacts/DJANGO_BACKOFFICE_CONVENTIONS.md": starterReferenceDoc("Django Backoffice Conventions"),
    "reference/artifacts/WORKFLOW_STATE_MACHINE.md": starterReferenceDoc("Workflow State Machine"),
    "reference/artifacts/APPROVAL_RULE_MATRIX.md": starterReferenceDoc("Approval Rule Matrix"),
    "reference/artifacts/ROLE_PERMISSION_MATRIX.md": starterReferenceDoc("Role Permission Matrix"),
    "reference/artifacts/AUDIT_EVENT_SPEC.md": starterReferenceDoc("Audit Event Spec"),
    "reference/artifacts/EXCEPTION_REOPEN_ROLLBACK_RULES.md": starterReferenceDoc("Exception Reopen Rollback Rules"),
    "reference/artifacts/LIGHTWEIGHT_APP_BASELINE.md": starterReferenceDoc("Lightweight App Baseline"),
    "reference/artifacts/ANDROID_APP_BASELINE.md": starterReferenceDoc("Android App Baseline"),
    "reference/artifacts/NODE_FRONTEND_APP_BASELINE.md": starterReferenceDoc("Node Frontend App Baseline"),
    "reference/artifacts/BI_DATA_SOURCE_INVENTORY.md": starterReferenceDoc("BI Data Source Inventory"),
    "reference/artifacts/BI_METRIC_CATALOG.md": starterReferenceDoc("BI Metric Catalog"),
    "reference/artifacts/BI_SEMANTIC_MODEL.md": starterReferenceDoc("BI Semantic Model"),
    "reference/artifacts/BI_REFRESH_AND_LINEAGE_PLAN.md": starterReferenceDoc("BI Refresh And Lineage Plan"),
    "reference/artifacts/BI_DASHBOARD_GOVERNANCE.md": starterReferenceDoc("BI Dashboard Governance"),
    "reference/profiles/README.md": starterReferenceDoc("Profile Index"),
    ...Object.fromEntries(
      profileIds.map((profileId) => [
        `reference/profiles/${profileId}_${profileSeedName(profileId)}.md`,
        starterReferenceDoc(`${profileId} Optional Profile`)
      ])
    )
  };
}

function profileSeedName(profileId) {
  return {
    "PRF-04": "LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE",
    "PRF-05": "PYTHON_DJANGO_BACKOFFICE_PROFILE",
    "PRF-06": "WORKFLOW_APPROVAL_APPLICATION_PROFILE",
    "PRF-07": "LIGHTWEIGHT_WEB_APP_PROFILE",
    "PRF-08": "ANDROID_NATIVE_APP_PROFILE",
    "PRF-09": "NODE_FRONTEND_WEB_APP_PROFILE",
    "PRF-10": "BI_ANALYTICS_PLATFORM_PROFILE"
  }[profileId];
}

function starterReferenceDoc(title) {
  return `# ${title}

## Purpose
- Starter placeholder. Replace or expand this artifact when the active project or optional profile requires it.

## Status
- seed`;
}

function starterCurrentState() {
  return `# Current State

## Snapshot
- Current Stage: not started
- Current Focus: run starter initialization and close the kickoff baseline before any implementation packet opens
- Current Release Goal: define the first approved project baseline on top of the copied standard harness starter

## Next Recommended Agent
- Planner

## Must Read Next
- \`START_HERE.md\`
- \`.agents/artifacts/REQUIREMENTS.md\`
- \`reference/planning/PLN-00_DEEP_INTERVIEW.md\`
- \`reference/planning/PLN-01_REQUIREMENTS_FREEZE.md\`

## Open Decisions / Blockers
- Run \`INIT_STANDARD_HARNESS.cmd\` or \`npm run harness:init\` before real work begins.
- This project was bootstrapped from the current standard harness starter.
- Replace starter placeholders with project-specific kickoff content before claiming a live lane is active.

## Latest Handoff Summary
- No handoff has been recorded yet.`;
}

function starterTaskList() {
  return `# Task List

## Current Release Target
- Close the kickoff baseline so the first approved project packet can open safely

## Active Locks
| Task ID | Scope | Owner | Status | Started At | Notes |
|---|---|---|---|---|---|
| - | None | - | clear | - | Starter is waiting for initialization. |

## Active Tasks
| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |
|---|---|---|---|---|---|---|---|
| BOOT-00 | Initialize copied starter | starter bootstrap | project operator | starter_pending | P0 | \`INIT_STANDARD_HARNESS.cmd\` or \`npm run harness:init\` | generated docs and validation guidance |
- Run \`INIT_STANDARD_HARNESS.cmd\` or \`npm run harness:init\` before real work begins.

## Blocked Tasks
| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |
|---|---|---|---|---|---|
| - | None | - | clear | - | - |

## Completed Tasks
| Task ID | Title | Completed At | Verification | Notes |
|---|---|---|---|---|
| - | None | - | - | - |

## Handoff Log
- No handoff has been recorded yet.`;
}

function starterRequirements() {
  return `# Requirements

## Summary
이 문서는 새 프로젝트가 표준 하네스 starter 위에서 시작할 때 프로젝트별 요구, 승인 경계, active profile, 핵심 acceptance를 닫는 기준 문서로 사용한다.

### 사용자 목표
- Replace this placeholder during \`npm run harness:init\`.

### 운영 목표
- Replace this placeholder during \`npm run harness:init\`.

### 승인 목표
- Replace this placeholder during \`npm run harness:init\`.

## Active Profile Selection
- none

## Open Questions
- Replace starter placeholders using PROJECT_STARTER_DOC_PACK and close implementation-critical discovery questions before PLN-01 approval.

## Deferred Items
- none yet

## Starter Health Customization Boundary
- Preserve this section when customizing project requirements.
- Safe to customize: product-only requirements, product acceptance notes, approval boundary details, and project-specific open questions.
- Keep reusable starter-health guidance intact unless an approved packet decision changes the starter contract.`;
}

function starterArchitectureGuide() {
  return `# Architecture Guide

## Purpose
- Preserve the starter architecture baseline until project requirements justify changes.

## Summary
- This starter architecture guide is a placeholder until PLN-01 requirements freeze is approved.

## Authoring Flow
- Fill PROJECT_STARTER_DOC_PACK.
- Close PLN-00 kickoff discovery.
- Approve PLN-01 requirements freeze.
- Then synchronize architecture, implementation plan, UI, and packet scope.

## Architecture Memory Boundary
- Architecture memory is project-local after initialization.
- Do not copy root maintainer decisions or historical packet evidence into this starter seed.
- Product-specific component names, module boundaries, data flow, integrations, and architecture decisions are safe to customize after approval.

${starterHealthBoundary()}`;
}

function starterImplementationPlan() {
  return `# Implementation Plan

## Current Plan Summary
- This is the clean starter implementation-plan seed.
- Replace it with project-specific plan rows only after PLN-01 requirements freeze and packet approval.

## Optional Profile Activation
- Selected profiles at bootstrap: none.
- Activate optional profiles only when project evidence requires them.

## Current Iteration
- Run starter initialization and close the kickoff baseline before opening implementation packets.

## Dependency Order And Blocking Conditions
- Do not open implementation packets before PLN-00 kickoff discovery and PLN-01 requirements freeze are complete.
- Keep architecture, requirements, implementation plan, profile selection, and approval boundaries aligned before Ready For Code.
- Preserve generated-doc immutability, packet-before-code, Active Context derived authority, and role-owned approval boundaries.

## Root / Standard-Template Sync Requirements
- This copied starter seed does not carry root repository sync obligations.
- Reusable starter-health changes require an approved packet decision in the source harness before they are promoted into a starter payload.

## Operator Next Action
- Start PLN-00 deep interview.
- Fill \`reference/artifacts/PROJECT_STARTER_DOC_PACK.md\` before treating the kickoff baseline as concrete.
- Approve PLN-01 requirements freeze before syncing architecture, implementation, and UI baselines.
- Open the first project packet only after requirements freeze, architecture baseline, and profile selection are aligned.

## Long-Memory Boundary
- Implementation-plan memory is project-local after initialization.
- This is not a root long history log.
- Do not copy root maintainer history, review evidence, packet evidence, or root-specific operating memory into this starter seed.
- Architecture Memory Boundary details belong in \`.agents/artifacts/ARCHITECTURE_GUIDE.md\`; keep this plan focused on approved sequencing and implementation scope.

${starterHealthBoundary()}`;
}

function starterActiveProfiles() {
  return `# Active Profiles

## Purpose
This artifact declares optional profiles that are active for the current project or packet set. Profiles are explicit-only.

## Active Profile Table
| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |
|---|---|---|---|---|---|---|
| - | None currently active | - | not-needed | - | - | - |

## Activation Rule
- Declare a profile here before packets cite it as active.`;
}

function starterProjectProgress() {
  return `# Project Progress

## Summary
Track the whole project kickoff-to-release board here after starter initialization.

## Progress Board
| Phase | Task ID | Task | Status | Notes | Source |
| --- | --- | --- | --- | --- | --- |
| Planning | PLN-00 | Kickoff interview | in_progress | Close implementation-critical discovery first. | reference/planning/PLN-00_DEEP_INTERVIEW.md |
| Planning | PLN-01 | Requirements freeze | todo | Freeze the project-specific requirements baseline after user confirmation. | .agents/artifacts/REQUIREMENTS.md |`;
}

function starterProjectHistory() {
  return `# Project History

## Purpose
- Keep durable project milestones and decisions here after initialization.
- Do not copy root maintainer packet history, review evidence, or project-specific operating memory into a clean starter.

## Long-Memory Boundary
- Project history is project-local long memory.
- This is not a root long history log.
- Reusable starter-health guidance belongs in starter docs and policies, not root-specific history.
- Promote durable lessons only through packet closeout, review evidence, or an approved retrospective.

${starterHealthBoundary()}

## Entries
- none yet`;
}

function starterPreventiveMemory() {
  return `# Preventive Memory

## Purpose
- Capture durable lessons only after packet closeout or approved retrospective evidence.

## Long-Memory Boundary
- Preventive memory is project-local after initialization.
- This is not a root long history log.
- Do not copy root maintainer friction, packet history, or project-specific evidence into this starter seed.

${starterHealthBoundary()}

## Entries
- none yet`;
}

function starterHealthBoundary() {
  return `## Starter Health Customization Boundary
- Preserve this section when customizing project artifacts.
- Safe to customize: product-only requirements, implementation notes, approval boundary details, project-specific history, and local acceptance details.
- Keep reusable starter-health guidance intact unless an approved packet decision changes the starter contract.`;
}

function writeExportProvenance({ sourceRoot, targetRoot, plan }) {
  const provenancePath = path.join(targetRoot, ".harness/promotion/EXPORT_PROVENANCE.json");
  fs.mkdirSync(path.dirname(provenancePath), { recursive: true });
  fs.writeFileSync(
    provenancePath,
    `${JSON.stringify(
      {
        schemaVersion: "1.0",
        generatedBy: "harness:promote-starter",
        generatedAt: new Date().toISOString(),
        sourceLabel: path.basename(path.resolve(sourceRoot)),
        targetLabel: path.basename(path.resolve(targetRoot)),
        summary: summarizePlan(plan),
        authority: AUTHORITY_DENIAL
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

function auditFindingForPath(filePath) {
  const normalized = normalizePromotionPath(filePath);
  return {
    severity: "block",
    lane: auditLaneForPath(normalized),
    path: normalized,
    reason: "File matches a starter promotion contamination boundary."
  };
}

function auditContentForSecrets({ candidateRoot, filePath }) {
  if (!isTextAuditCandidate(filePath)) return null;
  const absolutePath = path.join(candidateRoot, filePath);
  let content;
  try {
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile() || stats.size > 1024 * 1024) return null;
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
  const contentLower = content.toLowerCase();
  const secretPatterns = [
    /\b[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|SESSION)[A-Z0-9_]*\s*=\s*['"]?(?:sk-[a-z0-9_-]{8,}|secret[-_a-z0-9]{6,}|[a-z0-9_-]{24,})/i,
    /\bbearer\s+[a-z0-9._-]{12,}/i,
    /\b(?:cookie|set-cookie)\s*[:=]/i,
    /\bsession secret\b/i
  ];
  if (!secretPatterns.some((pattern) => pattern.test(content)) && !contentLower.includes("private key")) {
    return null;
  }
  return {
    severity: "block",
    lane: "secret_content",
    path: normalizePromotionPath(filePath),
    reason: "File content matches a high-confidence secret, credential, session, token, or transcript marker; value redacted."
  };
}

function isTextAuditCandidate(filePath) {
  const normalized = normalizePromotionPath(filePath);
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith(".harness/") ||
    lower.startsWith("starter/standard-harness/_harness/") ||
    lower.startsWith("reference/reports/")
  ) {
    return false;
  }
  const ext = path.posix.extname(normalized).toLowerCase();
  return new Set([
    "",
    ".cmd",
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ps1",
    ".py",
    ".sh",
    ".ts",
    ".txt",
    ".yaml",
    ".yml"
  ]).has(ext);
}

function auditLaneForPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.startsWith("src/") || lower.startsWith("app/") || lower.startsWith("apps/") || lower.startsWith("product/")) {
    return "product_code";
  }
  if (
    lower.startsWith(".agents/runtime/") ||
    lower.startsWith(".harness/cache/") ||
    lower.startsWith(".harness/logs/") ||
    lower.includes("operating_state.sqlite")
  ) {
    return "runtime_state";
  }
  if (
    lower.startsWith(".harness/packets/") ||
    lower.startsWith(".harness/reports/") ||
    lower.startsWith("reference/evidence/") ||
    lower.startsWith("reference/reports/") ||
    lower.startsWith(".agents/artifacts/") ||
    lower.startsWith("verification/")
  ) {
    return "evidence_report";
  }
  if (
    matchesSensitivePathName(lower) ||
    lower === ".env" ||
    lower.startsWith(".env.")
  ) {
    return "secret_session_transcript";
  }
  if (lower.startsWith("docs/requirements/") || lower.startsWith("docs/planning/") || lower.startsWith("docs/decisions/")) {
    return "project_specific_docs";
  }
  return "generated_or_excluded";
}

function matchesSensitivePathName(filePath) {
  const base = path.posix.basename(filePath);
  return [
    "api-key",
    "api_key",
    "apikey",
    ".pyc",
    "auth-",
    "auth_",
    "auth-token",
    "auth_token",
    "bearer",
    "bearer-token",
    "bearer_token",
    "cookie",
    "secret",
    "credential",
    "provider-cache",
    "raw-log",
    "raw_secret",
    "refresh-token",
    "refresh_token",
    "session",
    "session-token",
    "session_token",
    "-token",
    "_token",
    "token.",
    "tokens.",
    "transcript"
  ].some((fragment) => base.includes(fragment));
}

function summarizeFindings(findings) {
  return {
    pass: findings.length === 0 ? 1 : 0,
    warn: findings.filter((finding) => finding.severity === "warn").length,
    hold: findings.filter((finding) => finding.severity === "hold").length,
    block: findings.filter((finding) => finding.severity === "block").length
  };
}

function listFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  walk(root, "");
  return files.map(normalizePromotionPath).sort();

  function walk(currentRoot, relativeRoot) {
    for (const entry of fs.readdirSync(currentRoot, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentRoot, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }
}
