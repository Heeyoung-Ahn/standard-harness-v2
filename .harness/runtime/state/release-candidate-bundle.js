import fs from "node:fs";
import path from "node:path";

import { AUTHORITY_DENIAL, normalizePromotionPath } from "./promotion-boundary.js";
import { buildPromotionPlan } from "./promote-starter.js";

const REQUIRED_BLOCKERS = new Set([
  "PKT-20_REAL_PROVIDER_WORKER_SMOKE",
  "PKT-21_STRUCTURED_PM_SOURCE_INTAKE"
]);

const FORBIDDEN_BUNDLE_PATH_PATTERNS = [
  ".agents/runtime/",
  ".agents/artifacts/current_state.md",
  ".agents/artifacts/task_list.md",
  ".agents/artifacts/validation_report.md",
  ".agents/artifacts/validation_report.json",
  ".harness/operating_state.sqlite",
  ".harness/cache/",
  ".harness/logs/",
  "node_modules/",
  ".env",
  ".env.local",
  "provider-cache",
  "credential",
  "api-key",
  "session-token"
];

const RELEASE_CANDIDATE_TARGET_PREFIX = "standard-harness-pkt19-";

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bnpm\s+publish\b/i,
  /\bgh\s+release\b/i,
  /\bgit\s+push\b/i,
  /\bdeploy\b/i,
  /\brelease:publish\b/i,
  /\bstarter\s+promotion\s+apply\b/i
];

export function runReleaseCandidateBundleCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "create";
  if (subcommand === "create") {
    return createReleaseCandidateBundle({ repoRoot, options: parsed.options });
  }
  if (subcommand === "validate") {
    return validateReleaseCandidateBundleAtPath({
      repoRoot,
      bundlePath: parsed.options.bundle ?? parsed.options.path ?? parsed.options.file
    });
  }
  return {
    ok: false,
    command: "release-candidate-bundle",
    subcommand,
    supported: ["create", "validate"],
    nextAction: "Use create or validate."
  };
}

export function createReleaseCandidateBundle({ repoRoot = process.cwd(), options = {} } = {}) {
  const targetRoot = normalizeTarget({ repoRoot, target: options.to ?? options.out ?? options.output });
  const packetPath = normalizeRelativePath(
    options.packet ?? "reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md"
  );
  const workItemId = normalizeText(options.workItem ?? "PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE");
  const diagnostics = [];

  if (!targetRoot) {
    diagnostics.push(errorDiagnostic("target", "missing_or_unsafe", "Release-candidate bundle requires --to <target>."));
  } else {
    diagnostics.push(...validateTarget({ repoRoot, targetRoot }));
  }
  if (!packetPath) {
    diagnostics.push(errorDiagnostic("packet", "missing_or_unsafe", "Packet path must be repository-relative."));
  }
  if (!workItemId) {
    diagnostics.push(errorDiagnostic("workItem", "missing", "Work item id is required."));
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return createResult({ ok: false, targetRoot, packetPath, workItemId, diagnostics });
  }

  const starterCandidateTarget = path.join(targetRoot, "starter-candidate");
  const promotionPlan = buildPromotionPlan({ repoRoot, targetRoot: starterCandidateTarget });
  const bundle = buildReleaseCandidateBundle({
    repoRoot,
    targetRoot,
    packetPath,
    workItemId,
    promotionPlan
  });
  const validation = validateReleaseCandidateBundle({ bundle });
  if (!validation.ok) {
    return createResult({ ok: false, targetRoot, packetPath, workItemId, diagnostics: validation.diagnostics, bundle });
  }

  fs.mkdirSync(targetRoot, { recursive: true });
  const bundlePath = path.join(targetRoot, "release-candidate-bundle.json");
  const commandInventoryPath = path.join(targetRoot, "command-inventory.json");
  const unresolvedRisksPath = path.join(targetRoot, "unresolved-risks.json");
  const rollbackNotesPath = path.join(targetRoot, "rollback-notes.md");

  fs.writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  fs.writeFileSync(commandInventoryPath, `${JSON.stringify(bundle.commandInventory, null, 2)}\n`, "utf8");
  fs.writeFileSync(unresolvedRisksPath, `${JSON.stringify(bundle.unresolvedRisks, null, 2)}\n`, "utf8");
  fs.writeFileSync(rollbackNotesPath, renderRollbackNotes(bundle), "utf8");

  return createResult({
    ok: true,
    targetRoot,
    packetPath,
    workItemId,
    diagnostics: [],
    bundle,
    writtenFiles: [
      path.relative(repoRoot, bundlePath).replace(/\\/g, "/"),
      path.relative(repoRoot, commandInventoryPath).replace(/\\/g, "/"),
      path.relative(repoRoot, unresolvedRisksPath).replace(/\\/g, "/"),
      path.relative(repoRoot, rollbackNotesPath).replace(/\\/g, "/")
    ]
  });
}

export function buildReleaseCandidateBundle({ repoRoot, targetRoot, packetPath, workItemId, promotionPlan }) {
  const planItems = promotionPlan.items ?? [];
  const includedPaths = planItems
    .filter((item) => item.decision === "include")
    .map((item) => item.path)
    .filter((itemPath) => !isForbiddenBundleStatePath(itemPath));
  const excludedPaths = planItems.filter((item) => item.decision === "exclude").map((item) => item.path);
  const reviewLanes = planItems
    .filter((item) => item.decision === "review")
    .map((item) => ({
      path: item.path,
      reviewKind: item.reviewKind ?? "unclassified_review",
      reason: item.reason
    }));
  const forbiddenStateExclusions = planItems.map((item) => item.path).filter(isForbiddenBundleStatePath);
  return {
    schemaVersion: "standard-harness-release-candidate-bundle/v1",
    command: "release-candidate-bundle",
    packetPath,
    workItemId,
    generatedAt: new Date().toISOString(),
    targetRoot,
    starterCandidateTarget: path.join(targetRoot, "starter-candidate"),
    packageManifest: {
      sourceLabel: path.basename(path.resolve(repoRoot)),
      summary: promotionPlan.summary,
      releaseReadiness: promotionPlan.releaseReadiness,
      includedPathCount: includedPaths.length,
      reviewLaneCount: reviewLanes.length,
      excludedPathCount: excludedPaths.length,
      includedPaths
    },
    commandInventory: buildCommandInventory(targetRoot),
    evidenceInputs: [
      noApprovalInput("PKT-17", "reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md"),
      noApprovalInput("PKT-18", "reference/reports/closeout/PKT-18_PLANNER_CLOSEOUT.md")
    ],
    securityDependencyEvidence: {
      dependencyAuditRequired: true,
      commands: [
        "npm run harness:dependency-intake -- --apply",
        "npm run harness:secret-scan -- --apply",
        "npm run harness:untrusted-scan -- --apply"
      ],
      reportPath: "reference/reports/dependency-audit/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md",
      securityReportPath: "reference/reports/security/PKT-19-security-review.json"
    },
    unresolvedRisks: [
      {
        id: "PKT-20_REAL_PROVIDER_WORKER_SMOKE",
        status: "open",
        reason: "Real provider worker smoke remains required before productization-complete claims."
      },
      {
        id: "PKT-21_STRUCTURED_PM_SOURCE_INTAKE",
        status: "open",
        reason: "Structured PM source intake remains required before productization-complete claims."
      },
      ...reviewLanes.map((lane) => ({
        id: `review-lane:${lane.path}`,
        status: "open",
        reason: lane.reason,
        reviewKind: lane.reviewKind
      }))
    ],
    forbiddenStateExclusions,
    rollback: {
      scope: "packet-scoped source, docs, evidence, and local bundle artifacts only",
      localBundleTarget: targetRoot,
      cleanupRule: "Delete only the exact local bundle target after reviewing the absolute path.",
      gitRollback: "Revert PKT-19 commit if packet-scoped source/docs/evidence changes must be backed out."
    },
    authority: AUTHORITY_DENIAL,
    approvalBoundary: {
      grantsReleaseApproval: false,
      grantsPublishApproval: false,
      grantsPromotionApproval: false,
      grantsResidualRiskAcceptance: false,
      grantsProductizationComplete: false,
      grantsUserUatApproval: false
    }
  };
}

export function validateReleaseCandidateBundleAtPath({ repoRoot = process.cwd(), bundlePath } = {}) {
  const resolvedBundlePath = resolveBundlePath({ repoRoot, bundlePath });
  if (!resolvedBundlePath) {
    return {
      ok: false,
      command: "release-candidate-bundle",
      subcommand: "validate",
      diagnostics: [errorDiagnostic("bundle", "missing_or_unsafe", "Bundle path must be repository-relative or absolute.")]
    };
  }
  if (!fs.existsSync(resolvedBundlePath)) {
    return {
      ok: false,
      command: "release-candidate-bundle",
      subcommand: "validate",
      bundlePath: resolvedBundlePath,
      diagnostics: [errorDiagnostic("bundle", "missing", `Bundle not found: ${resolvedBundlePath}.`)]
    };
  }
  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(resolvedBundlePath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      command: "release-candidate-bundle",
      subcommand: "validate",
      bundlePath: resolvedBundlePath,
      diagnostics: [errorDiagnostic("bundle", "json_parse_failed", error.message)]
    };
  }
  const validation = validateReleaseCandidateBundle({ bundle });
  return {
    ok: validation.ok,
    command: "release-candidate-bundle",
    subcommand: "validate",
    bundlePath: resolvedBundlePath,
    diagnostics: validation.diagnostics,
    authority: AUTHORITY_DENIAL,
    nextAction: validation.ok
      ? "Release-candidate bundle is valid evidence only; release/publish/promotion remains unapproved."
      : "Fix bundle diagnostics before treating it as release-candidate evidence."
  };
}

export function validateReleaseCandidateBundle({ bundle }) {
  const diagnostics = [];
  if (bundle?.schemaVersion !== "standard-harness-release-candidate-bundle/v1") {
    diagnostics.push(errorDiagnostic("schemaVersion", "invalid", "Expected standard-harness-release-candidate-bundle/v1."));
  }
  for (const field of ["packageManifest", "commandInventory", "evidenceInputs", "securityDependencyEvidence", "unresolvedRisks", "rollback", "authority", "approvalBoundary"]) {
    if (bundle?.[field] == null) diagnostics.push(errorDiagnostic(field, "missing", `Bundle is missing ${field}.`));
  }
  for (const input of bundle?.evidenceInputs ?? []) {
    if (input?.authority?.grantsReleaseApproval !== false) {
      diagnostics.push(errorDiagnostic("evidenceInputs", "release_overclaim", `${input.id ?? "input"} grants release approval.`));
    }
  }
  for (const [key, value] of Object.entries(bundle?.authority ?? {})) {
    if (value === true) diagnostics.push(errorDiagnostic("authority", "approval_overclaim", `Authority flag ${key} must be false.`));
  }
  for (const [key, value] of Object.entries(bundle?.approvalBoundary ?? {})) {
    if (value === true) diagnostics.push(errorDiagnostic("approvalBoundary", "approval_overclaim", `Approval boundary flag ${key} must be false.`));
  }
  for (const command of bundle?.commandInventory ?? []) {
    if (FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(command.command ?? ""))) {
      diagnostics.push(errorDiagnostic("commandInventory", "forbidden_mutation_command", `Forbidden command in bundle: ${command.command}`));
    }
  }
  const unresolvedIds = new Set((bundle?.unresolvedRisks ?? []).map((risk) => risk.id));
  for (const required of REQUIRED_BLOCKERS) {
    if (!unresolvedIds.has(required)) {
      diagnostics.push(errorDiagnostic("unresolvedRisks", "missing_productization_blocker", `Missing unresolved blocker: ${required}.`));
    }
  }
  const includedPaths = bundle?.packageManifest?.includedPaths ?? [];
  for (const includedPath of includedPaths) {
    if (isForbiddenBundleStatePath(includedPath)) {
      diagnostics.push(errorDiagnostic("packageManifest", "forbidden_state_included", `Forbidden state path included: ${includedPath}.`));
    }
  }
  if ((bundle?.forbiddenStateExclusions ?? []).length === 0) {
    diagnostics.push(errorDiagnostic("forbiddenStateExclusions", "missing", "Bundle must prove forbidden root/local/runtime state was excluded."));
  }
  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    diagnostics
  };
}

function buildCommandInventory(targetRoot) {
  return [
    {
      command: `npm run harness:promote-starter -- --dry-run --to ${path.join(targetRoot, "starter-candidate")}`,
      mutation: "none",
      purpose: "Plan clean starter package lanes without writing a starter candidate."
    },
    {
      command: `npm run harness:release-candidate -- create --to ${targetRoot}`,
      mutation: "local-target-write",
      purpose: "Write local release-candidate evidence bundle artifacts only."
    },
    {
      command: "npm run harness:validate",
      mutation: "none",
      purpose: "Validate root harness state after packet evidence is generated."
    },
    {
      command: "npm run harness:evidence-manifest validate --manifest reference/evidence/manifests/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE-release.json --packet reference/packets/PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE.md --work-item PKT-19_RELEASE_CANDIDATE_PACKAGING_AND_EVIDENCE_BUNDLE",
      mutation: "none",
      purpose: "Validate packet-bound release evidence manifest."
    }
  ];
}

function noApprovalInput(id, evidencePath) {
  return {
    id,
    evidencePath,
    use: "input-evidence-only",
    authority: AUTHORITY_DENIAL
  };
}

function renderRollbackNotes(bundle) {
  return [
    "# PKT-19 Rollback Notes",
    "",
    `- Work item: \`${bundle.workItemId}\``,
    `- Local bundle target: \`${bundle.targetRoot}\``,
    "- Scope: packet-scoped source, docs, evidence, and local bundle artifacts only.",
    "- Cleanup: delete only the exact local bundle target after verifying the absolute path.",
    "- Git rollback: revert the PKT-19 commit if packet-scoped source/docs/evidence changes must be backed out.",
    "- Not authorized: release, publish, starter promotion, remote deploy, residual-risk acceptance, productization-complete claim, or User UAT entry.",
    ""
  ].join("\n");
}

function createResult({ ok, targetRoot, packetPath, workItemId, diagnostics, bundle = null, writtenFiles = [] }) {
  return {
    ok,
    command: "release-candidate-bundle",
    subcommand: "create",
    targetRoot,
    packetPath,
    workItemId,
    bundlePath: targetRoot ? path.join(targetRoot, "release-candidate-bundle.json") : null,
    writtenFiles,
    diagnostics,
    summary: bundle
      ? {
          include: bundle.packageManifest?.summary?.include ?? 0,
          exclude: bundle.packageManifest?.summary?.exclude ?? 0,
          review: bundle.packageManifest?.summary?.review ?? 0,
          unresolvedRisks: bundle.unresolvedRisks?.length ?? 0,
          forbiddenStateExclusions: bundle.forbiddenStateExclusions?.length ?? 0
        }
      : null,
    releaseReadiness: bundle?.packageManifest?.releaseReadiness ?? null,
    authority: AUTHORITY_DENIAL,
    nextAction: ok
      ? "Validate the bundle, create the packet evidence manifest, and keep release/publish/promotion unapproved."
      : "Fix release-candidate bundle diagnostics before using this evidence."
  };
}

function validateTarget({ repoRoot, targetRoot }) {
  const diagnostics = [];
  const sourceRoot = path.resolve(repoRoot);
  const resolvedTarget = path.resolve(targetRoot);
  if (resolvedTarget === sourceRoot) {
    diagnostics.push(errorDiagnostic("target", "same_as_source", "Bundle target cannot be the repository root."));
  }
  const relativeTarget = path.relative(sourceRoot, resolvedTarget);
  if (relativeTarget && !relativeTarget.startsWith("..") && !path.isAbsolute(relativeTarget)) {
    diagnostics.push(errorDiagnostic("target", "inside_source", "Bundle target cannot be inside the repository root."));
  }
  if (!isAllowedReleaseCandidateTarget(resolvedTarget)) {
    diagnostics.push(errorDiagnostic(
      "target",
      "outside_release_candidate_tmp",
      `Bundle target must be under C:\\tmp and start with ${RELEASE_CANDIDATE_TARGET_PREFIX}.`
    ));
  }
  if (fs.existsSync(resolvedTarget) && fs.readdirSync(resolvedTarget).length > 0) {
    diagnostics.push(errorDiagnostic("target", "not_empty", "Bundle target must be a new empty directory."));
  }
  return diagnostics;
}

function isAllowedReleaseCandidateTarget(targetRoot) {
  const resolvedTarget = path.resolve(targetRoot);
  const targetName = path.basename(resolvedTarget).toLowerCase();
  if (!targetName.startsWith(RELEASE_CANDIDATE_TARGET_PREFIX)) return false;
  const requiredRoot = process.platform === "win32" ? path.resolve("C:\\tmp") : path.resolve("/tmp");
  return isInside(requiredRoot, resolvedTarget) && resolvedTarget !== requiredRoot;
}

function isForbiddenBundleStatePath(filePath) {
  const normalized = normalizePromotionPath(filePath).toLowerCase();
  return FORBIDDEN_BUNDLE_PATH_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") continue;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s).filter((part) => part !== undefined);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      options[key] = args[++index];
    } else {
      options[key] = true;
    }
  }
  return { positionals, options };
}

function normalizeTarget({ repoRoot, target }) {
  const text = normalizeText(target);
  if (!text) return null;
  return path.resolve(repoRoot, text);
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/").replace(/^`|`$/g, "").replace(/^\.\//, "");
  if (!text || path.isAbsolute(text)) return null;
  if (text.split("/").includes("..") || text.includes("/../") || text === "..") return null;
  return path.posix.normalize(text);
}

function resolveBundlePath({ repoRoot, bundlePath }) {
  const text = String(bundlePath ?? "").trim().replace(/^`|`$/g, "");
  if (!text) return null;
  if (path.isAbsolute(text)) return path.resolve(text);
  const normalized = normalizeRelativePath(text);
  return normalized ? path.resolve(repoRoot, normalized) : null;
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function errorDiagnostic(field, code, message) {
  return { field, code, severity: "error", message };
}

function isInside(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
