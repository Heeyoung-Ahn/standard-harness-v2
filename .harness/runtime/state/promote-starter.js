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
      authority: AUTHORITY_DENIAL,
      nextAction: "Review include/exclude/review lanes, then rerun without --dry-run to export."
    };
  }

  fs.mkdirSync(targetRoot, { recursive: true });
  for (const item of plan.items.filter((entry) => entry.decision === "include")) {
    copyFile(sourceRoot, targetRoot, item.path);
  }
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
  if (path.resolve(sourceRoot) === path.resolve(targetRoot)) {
    return failPromotion({
      reason: "Promotion target cannot be the source product project.",
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
        sourceRoot,
        targetRoot,
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
    lower.includes("secret") ||
    lower.includes("credential") ||
    lower.includes("session") ||
    lower.includes("transcript") ||
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
