import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

import { createOperatingStateStore, DEFAULT_DB_PATH } from "./operating-state-store.js";
import { runValidator } from "./validation-core.js";
import { selectActiveWorkItem } from "./workflow-routing.js";
import {
  normalizePacketHeaderValue,
  parseDelimitedList,
  parseMarkdownTable,
  readPacketBulletFieldValueFromContent,
  readPacketHeaderValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";
import { validateEvidenceManifestAtPath } from "./evidence-manifest.js";
import { redactSensitiveText, scanSensitiveText } from "../security/redact-engine.js";

export const P2_SCHEMA_VERSION = "standard-harness-v2.2-conductor-p2/v1";
export const DEFAULT_REVIEWER_PROFILE_DIR = ".agents/runtime/reviewer-profiles";
export const DEFAULT_STALE_INDEX_JSON = ".agents/learnings/stale-index.json";
export const DEFAULT_AUTOMATION_JSON = ".agents/runtime/automation-candidates.json";
export const DEFAULT_AUTOMATION_MD = ".agents/runtime/AUTOMATION_CANDIDATES.md";
export const DEFAULT_DASHBOARD_JSON = ".agents/runtime/DASHBOARD.json";
export const DEFAULT_DASHBOARD_MD = ".agents/runtime/DASHBOARD.md";
export const DEFAULT_ADAPTER_DIR = ".agents/runtime/adapters";
export const DEFAULT_REFACTOR_AUDIT_JSON = ".agents/runtime/refactor-audit.json";
export const DEFAULT_AI_REVIEW_PACKAGE_JSON = ".agents/runtime/ai-review-package.json";
export const DEFAULT_ADVISORY_AI_REVIEW_JSON = ".agents/runtime/advisory-ai-review.json";
export const DEFAULT_ADVISORY_AI_REVIEW_MD = ".agents/runtime/ADVISORY_AI_REVIEW.md";
export const DEFAULT_DIRECTIONAL_PILOT_JSON = ".agents/runtime/directional-regression-pilot.json";
export const DEFAULT_DIRECTIONAL_PILOT_MD = ".agents/runtime/DIRECTIONAL_REGRESSION_PILOT.md";
export const DEFAULT_REQUIREMENT_TRACE_MATRIX_JSON = ".agents/runtime/requirement-trace-matrix.json";
export const DEFAULT_REQUIREMENT_TRACE_MATRIX_MD = ".agents/runtime/REQUIREMENT_TRACE_MATRIX.md";
export const DEFAULT_OPERATOR_DIGEST_JSON = ".agents/runtime/operator-readiness-digest.json";
export const DEFAULT_OPERATOR_DIGEST_MD = ".agents/runtime/OPERATOR_READINESS_DIGEST.md";
export const DEFAULT_RECOVERY_REHEARSAL_JSON = ".agents/runtime/recovery-rehearsal.json";
export const DEFAULT_RECOVERY_REHEARSAL_MD = ".agents/runtime/RECOVERY_REHEARSAL.md";
export const DEFAULT_CONTEXT_BUDGET_POLICY_JSON = ".agents/runtime/context-budget-policy.json";
export const DEFAULT_CONTEXT_BUDGET_POLICY_MD = ".agents/runtime/CONTEXT_BUDGET_POLICY.md";
export const DEFAULT_PACKAGING_READINESS_JSON = ".agents/runtime/packaging-readiness.json";
export const DEFAULT_PACKAGING_READINESS_MD = ".agents/runtime/PACKAGING_READINESS.md";
export const DEFAULT_LEARNING_SOLUTIONS_DIR = ".agents/learnings/solutions";
export const DEFAULT_SYSTEM_IMPROVEMENT_LEDGER = ".agents/artifacts/SYSTEM_IMPROVEMENT_LEDGER.md";
export const DEFAULT_CAPABILITY_REGISTRY = ".agents/runtime/AGENT_CAPABILITY_REGISTRY.json";
export const DEFAULT_REVIEWER_PROFILE_CATALOG = ".agents/modes/reviewer-profiles.json";
export const DEFAULT_REVIEW_SCOPE_DIR = ".agents/runtime/reviews/scopes";
export const DEFAULT_REVIEW_FINDINGS_DIR = ".agents/runtime/reviews/findings";

const DEFAULT_STALENESS_DAYS = 180;
const DEFAULT_AUTOMATION_THRESHOLD = 3;
const DEFAULT_CONTEXT_BUDGET_POLICY = {
  default: {
    micro: { maxReadFiles: 4, targetTokens: 1000 },
    standard: { maxReadFiles: 8, targetTokens: 2000 },
    strict: { maxReadFiles: 6, targetTokens: 1600 },
    release: { maxReadFiles: 10, targetTokens: 2400 }
  },
  planner: {
    standard: { maxReadFiles: 8, targetTokens: 2200 },
    strict: { maxReadFiles: 6, targetTokens: 1800 }
  },
  developer: {
    standard: { maxReadFiles: 10, targetTokens: 2400 },
    strict: { maxReadFiles: 8, targetTokens: 2000 }
  },
  reviewer: {
    standard: { maxReadFiles: 7, targetTokens: 1800 },
    strict: { maxReadFiles: 5, targetTokens: 1400 }
  },
  tester: {
    standard: { maxReadFiles: 8, targetTokens: 1800 },
    strict: { maxReadFiles: 6, targetTokens: 1400 }
  }
};
const SECURITY_PATTERNS = [/auth/i, /permission/i, /rbac/i, /access[- ]?control/i, /\bforbidden\b/i, /secret/i, /credential/i, /token/i, /webhook/i, /\.github\/workflows/i, /lock$/i, /package-lock\.json$/i, /pnpm-lock\.yaml$/i, /yarn\.lock$/i, /bun\.lockb?$/i];
const DATA_PATTERNS = [/spreadsheet/i, /excel/i, /csv/i, /etl/i, /import/i, /export/i, /reconciliation/i, /finance/i, /expense/i, /accounting/i, /metric/i, /dashboard/i, /semantic-model/i, /schema/i, /migration/i, /database/i, /sql/i];
const GOVERNANCE_PATTERNS = [/approval/i, /workflow/i, /state[- ]?machine/i, /state transition/i, /role/i, /permission/i, /audit/i, /policy/i, /exception/i];
const STRONG_GOVERNANCE_PATTERNS = [/self[- ]?approve/i, /manager approval/i, /finance confirmation/i, /approval workflow/i, /approval state[- ]?machine/i, /state[- ]?machine/i, /state transition/i, /rbac/i, /role visibility/i, /authorization/i, /permission/i, /audit log/i, /\bforbidden\b/i, /policy exception/i];
const UI_PATTERNS = [/ui/i, /ux/i, /component/i, /screen/i, /page/i, /view/i, /dashboard/i, /form/i];
const RELEASE_PATTERNS = [/deploy/i, /release/i, /cutover/i, /rollback/i, /sre/i, /canary/i, /monitor/i, /topology/i, /ci/i, /cd/i];
const CORE_PATTERNS = [/architecture/i, /api/i, /contract/i, /runtime/i, /harness/i, /shared/i, /core/i, /integration/i, /boundary/i];
const REVIEW_SCOPE_MODES = new Set(["pull-request", "pull_request", "local-branch", "local_branch", "commit-range", "commit_range", "working-tree", "working_tree"]);
const LEARNING_TRACK_VALUES = new Set(["bug", "knowledge", "decision", "pattern", "workflow", "implementation", "data", "security", "architecture"]);
const LEARNING_STATUS_VALUES = new Set(["active", "fresh", "stale", "hold-pattern", "retired", "superseded", "deprecated", "draft", "pending"]);
const DIRECTION_PRINCIPLES = [
  { key: "friction_loop", label: "Friction loop", meaning: "Harness friction is preserved as evidence, review, and learning.", evidenceKeys: ["compoundLearning", "closeoutPreflight"] },
  { key: "long_memory", label: "Long memory", meaning: "Repeated problems are managed through solution notes, learning, and staleness checks.", evidenceKeys: ["compoundLearning"] },
  { key: "compound_engineering", label: "Compound engineering", meaning: "Implementation problems feed patterns that smooth later implementation.", evidenceKeys: ["compoundLearning", "manualFollowing"] },
  { key: "tdd_realism", label: "TDD realism", meaning: "Behavior changes leave RED/GREEN evidence.", evidenceKeys: ["tdd"] },
  { key: "confidence_control", label: "Confidence control", meaning: "The harness prevents overclaimed completion, approval, or pass states.", evidenceKeys: ["harnessValidation", "closeoutPreflight"] },
  { key: "anti_rubber_stamp", label: "Anti-rubber-stamp", meaning: "User or AI agreement does not replace evidence and approval boundaries.", evidenceKeys: ["harnessValidation", "securityReview"] },
  { key: "product_verification", label: "Product verification", meaning: "Harness structural validation is separate from product behavior verification.", evidenceKeys: ["productVerification", "harnessValidation"] },
  { key: "security_requirement_review", label: "Security and requirement review", meaning: "Security, requirement trace, and closeout review remain independent evidence.", evidenceKeys: ["securityReview", "closeoutPreflight"] },
  { key: "real_browser_evidence", label: "Real browser evidence", meaning: "Web UI evidence is real-browser evidence or an honest blocked/warn state.", evidenceKeys: ["browserEvidence"] },
  { key: "skill_invocation", label: "Skill invocation", meaning: "Required workflow skills and roles are visible in the pilot.", evidenceKeys: ["manualFollowing", "closeoutPreflight"] },
  { key: "manual_fidelity", label: "Manual fidelity", meaning: "Human instructions match runnable commands and failure modes.", evidenceKeys: ["manualFollowing"] },
  { key: "anti_spaghetti", label: "Anti-spaghetti", meaning: "Packet modeling, module boundaries, and review resist code tangling.", evidenceKeys: ["closeoutPreflight", "harnessValidation"] },
  { key: "refactor_awareness", label: "Refactor awareness", meaning: "Accumulated code state and refactor candidates are surfaced without unapproved refactors.", evidenceKeys: ["harnessValidation"] },
  { key: "ai_assisted_review", label: "AI-assisted review", meaning: "AI judge/reviewer output remains advisory and authority-bounded.", evidenceKeys: ["securityReview", "closeoutPreflight"] },
  { key: "token_discipline", label: "Token discipline", meaning: "Context budget controls read and output scope.", evidenceKeys: ["contextBudget"] },
  { key: "maintenance_docs", label: "Maintenance docs", meaning: "Maintenance docs are created or updated as closeout artifacts.", evidenceKeys: ["manualFollowing", "closeoutPreflight"] }
];

export function runP2Command({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "report";
  const apply = Boolean(parsed.options.apply || parsed.options.write);
  if (subcommand === "reviewer-profile") {
    return runReviewerProfileCommand({ repoRoot, outputDir, dbPath, args: parsed.positionals.slice(1), options: parsed.options, apply });
  }
  if (subcommand === "learning-staleness" || subcommand === "stale-learnings") {
    return runLearningStalenessCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "automation-candidates" || subcommand === "automation") {
    return runAutomationCandidatesCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "adapter-manifest" || subcommand === "adapter") {
    return runAdapterManifestCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "refactor-audit") {
    return runRefactorAuditCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "ai-review-package" || subcommand === "ai-review") {
    return runAiReviewPackageCommand({ outputDir, options: parsed.options, apply });
  }
  if (subcommand === "ai-review-runner" || subcommand === "advisory-ai-review" || subcommand === "ai-review-advisory") {
    return runAdvisoryAiReviewCommand({ outputDir, options: parsed.options, apply });
  }
  if (subcommand === "directional-pilot" || subcommand === "directional-regression-pilot") {
    return runDirectionalRegressionPilotCommand({ outputDir, options: parsed.options, apply });
  }
  if (subcommand === "trace-matrix" || subcommand === "requirement-trace" || subcommand === "requirement-trace-matrix") {
    return runRequirementTraceMatrixCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "operator-digest" || subcommand === "readiness-digest" || subcommand === "digest") {
    return runUnifiedOperatorDigestCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "recovery-rehearsal" || subcommand === "recovery") {
    return runRecoveryRehearsalCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "context-budget-policy" || subcommand === "context-policy") {
    return runContextBudgetPolicyCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "packaging-readiness" || subcommand === "release-readiness-smoke" || subcommand === "version-readiness") {
    return runPackagingReadinessCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "review-scope") {
    return runReviewScopeCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "review-findings") {
    return runReviewFindingsCommand({ repoRoot, outputDir, options: parsed.options, apply });
  }
  if (subcommand === "dashboard") {
    return runConductorDashboardCommand({ repoRoot, outputDir, dbPath, options: parsed.options, apply });
  }
  if (subcommand === "plan-quality") {
    return runPlanQualityCommand({ repoRoot, options: parsed.options });
  }
  if (subcommand === "report") {
    return runP2ConductorReport({ repoRoot, outputDir, dbPath, options: parsed.options, apply });
  }
  return {
    ok: false,
    command: "p2",
    subcommand,
    message: `Unsupported P2 subcommand: ${subcommand}`,
    supported: ["report", "reviewer-profile", "learning-staleness", "automation-candidates", "adapter-manifest", "refactor-audit", "ai-review-package", "ai-review-runner", "directional-pilot", "trace-matrix", "operator-digest", "recovery-rehearsal", "context-budget-policy", "packaging-readiness", "review-scope", "review-findings", "dashboard", "plan-quality"]
  };
}

export function runP2ConductorReport({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, options = {}, apply = false } = {}) {
  const learning = scanLearningStaleness({ repoRoot, now: options.now, thresholdDays: numberOption(options.thresholdDays, DEFAULT_STALENESS_DAYS) });
  const automation = detectAutomationCandidates({ repoRoot, threshold: numberOption(options.threshold, DEFAULT_AUTOMATION_THRESHOLD) });
  const dashboard = buildConductorDashboard({ repoRoot, dbPath, learning, automation });
  const writes = [];
  if (apply) {
    const staleWrite = writeJsonArtifact(outputDir, DEFAULT_STALE_INDEX_JSON, learning);
    writes.push(staleWrite.relativePath);
    const automationJson = writeJsonArtifact(outputDir, DEFAULT_AUTOMATION_JSON, automation);
    const automationMd = writeTextArtifact(outputDir, DEFAULT_AUTOMATION_MD, renderAutomationMarkdown(automation));
    writes.push(automationJson.relativePath, automationMd.relativePath);
    const dashboardJson = writeJsonArtifact(outputDir, DEFAULT_DASHBOARD_JSON, dashboard);
    const dashboardMd = writeTextArtifact(outputDir, DEFAULT_DASHBOARD_MD, renderDashboardMarkdown(dashboard));
    writes.push(dashboardJson.relativePath, dashboardMd.relativePath);
  }
  return {
    ok: true,
    command: "p2",
    subcommand: "report",
    apply,
    schemaVersion: P2_SCHEMA_VERSION,
    learningSummary: summarizeLearningScan(learning),
    automationSummary: summarizeAutomationScan(automation),
    dashboardSummary: dashboard.summary,
    artifactsWritten: writes,
    nextAction: dashboard.summary.blockingFindings > 0
      ? "Resolve harness validation blockers before execution."
      : automation.promotions.length > 0
        ? "Promote repeated manual friction into a harness/system improvement packet."
        : learning.stale.length > 0
          ? "Refresh stale compound learning references before relying on them."
          : "P2 conductor surfaces are current."
  };
}

export function runReviewerProfileCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [], options = {}, apply = false } = {}) {
  const store = createOperatingStateStore({ dbPath: resolveDbPath(repoRoot, dbPath), createIfMissing: false, migrate: false });
  try {
    const workItem = resolveWorkItem({ store, repoRoot, workItemId: options.workItem ?? options.workItemId });
    const packet = workItem?.sourceRef ? readPacket(repoRoot, workItem.sourceRef) : null;
    const changedFiles = parseDelimitedList(options.changedFiles ?? options.files ?? packet?.header.changedFiles ?? "");
    const result = buildReviewerProfileRecommendation({
      repoRoot,
      workItem,
      packet,
      changedFiles,
      stage: options.stage ?? "review",
      riskClass: options.risk ?? options.riskClass,
      gateProfile: options.gateProfile,
      changeZone: options.changeZone,
      activeProfilesInput: parseDelimitedList(options.profiles ?? options.activeProfiles ?? ""),
      userFacingImpact: options.userFacingImpact,
      textHints: options.text ?? options.hints ?? ""
    });
    let outputPath = null;
    if (apply) {
      const safeName = safeId(workItem?.workItemId ?? "unassigned-review");
      const artifact = writeJsonArtifact(outputDir, `${DEFAULT_REVIEWER_PROFILE_DIR}/${safeName}.json`, result);
      outputPath = artifact.relativePath;
    }
    return {
      ok: result.requiredProfiles.length > 0,
      command: "p2",
      subcommand: "reviewer-profile",
      apply,
      workItemId: workItem?.workItemId ?? null,
      packetPath: packet?.path ?? null,
      outputPath,
      ...result
    };
  } finally {
    store.close();
  }
}

export function buildReviewerProfileRecommendation({
  repoRoot = process.cwd(),
  workItem = null,
  packet = null,
  changedFiles = [],
  stage = "review",
  riskClass = null,
  gateProfile = null,
  changeZone = null,
  activeProfilesInput = [],
  userFacingImpact = null,
  textHints = ""
} = {}) {
  const content = packet?.content ?? "";
  const profiles = loadReviewerProfileCatalog(repoRoot);
  const risk = normalizePacketHeaderValue(riskClass ?? packet?.header.riskClass ?? packet?.header.riskIfStarted ?? workItem?.riskHint ?? workItem?.metadata?.riskClass ?? "normal");
  const resolvedGateProfile = normalizePacketHeaderValue(gateProfile ?? packet?.header.gateProfile ?? workItem?.metadata?.gateProfile ?? "standard");
  const resolvedChangeZone = normalizePacketHeaderValue(changeZone ?? packet?.header.changeZone ?? "");
  const explicitProfileText = Array.isArray(activeProfilesInput) ? activeProfilesInput.join(" ") : String(activeProfilesInput ?? "");
  const activeProfiles = unique([
    ...extractProfileIds(packet?.header.activeProfileDependencies ?? content),
    ...extractProfileIds(explicitProfileText)
  ]);
  const resolvedUserFacingImpact = normalizePacketHeaderValue(userFacingImpact ?? packet?.header.userFacingImpact ?? "none");
  const text = [content, workItem?.title, workItem?.domainHint, workItem?.riskHint, changedFiles.join("\n"), textHints, activeProfiles.join("\n")].join("\n");
  const reviewerSignals = buildReviewerSignals({
    text,
    activeProfiles,
    changedFiles,
    risk,
    gateProfile: resolvedGateProfile,
    changeZone: resolvedChangeZone
  });
  const required = new Map();
  const recommended = new Map();

  addProfile(required, profiles, "qa-lead", "Every implementation closeout needs independent verification evidence.");

  if (reviewerSignals.positive.some((signal) => signal.profileId === "cso")) {
    addProfile(required, profiles, "cso", "Security-sensitive risk, approval/BI profile, dependency, credential, auth, webhook, or CI/CD surface detected.");
  } else if (reviewerSignals.localOnlyNoExternalSurface && matchesAny(text, SECURITY_PATTERNS)) {
    reviewerSignals.suppressed.push({ profileId: "cso", code: "local_only_no_security_surface", reason: "Security keyword appears only in explicit local-only/no-auth/no-external context." });
  }
  if (reviewerSignals.positive.some((signal) => signal.profileId === "data-correctness")) {
    addProfile(required, profiles, "data-correctness", "Authoritative source, spreadsheet, metric, database, reconciliation, or BI/data surface detected.");
  } else if (reviewerSignals.localOnlyNoExternalSurface && (matchesAny(text, DATA_PATTERNS) || /\bno\s+(?:db|database|sql|schema|migration)\b/i.test(String(text ?? "")))) {
    reviewerSignals.suppressed.push({ profileId: "data-correctness", code: "local_only_no_data_surface", reason: "Data keyword appears only in explicit local-only/no-DB/no-external context." });
  }
  if (reviewerSignals.positive.some((signal) => signal.profileId === "governance")) {
    addProfile(required, profiles, "governance", "Approval workflow, role, permission, audit, exception, or policy surface detected.");
  } else if (reviewerSignals.localOnlyNoExternalSurface && matchesAny(text, GOVERNANCE_PATTERNS)) {
    reviewerSignals.suppressed.push({ profileId: "governance", code: "local_only_no_governance_surface", reason: "Governance keyword appears only in explicit local-only/no-role/no-audit context." });
  }
  if (reviewerSignals.positive.some((signal) => signal.profileId === "staff-engineer")) {
    addProfile(required, profiles, "staff-engineer", "Core/load-bearing contract, architecture, API, integration, or shared runtime surface detected.");
  } else if (reviewerSignals.localOnlyNoExternalSurface && matchesAny(text, CORE_PATTERNS)) {
    reviewerSignals.suppressed.push({ profileId: "staff-engineer", code: "local_only_no_core_surface", reason: "Core keyword appears only in explicit local-only/no-API/no-integration context." });
  }
  if (resolvedUserFacingImpact !== "none" || matchesAny(text, UI_PATTERNS)) {
    addProfile(recommended, profiles, "ux-reviewer", "User-facing or UI/UX surface detected.");
  }
  if (reviewerSignals.positive.some((signal) => signal.profileId === "release-sre")) {
    addProfile(required, profiles, "release-sre", "Deploy, cutover, rollback, monitoring, topology, or release gate detected.");
  } else if (reviewerSignals.localOnlyNoExternalSurface && matchesAny(text, RELEASE_PATTERNS)) {
    reviewerSignals.suppressed.push({ profileId: "release-sre", code: "local_only_no_release_surface", reason: "Release keyword appears only in explicit no-deploy/no-external context." });
  }
  if (/harness|automation|system improvement|compound|learning|ledger/i.test(text)) {
    addProfile(recommended, profiles, "automation-governor", "Harness/system-improvement or compound-learning surface detected.");
  }

  return {
    schemaVersion: P2_SCHEMA_VERSION,
    stage,
    riskClass: risk || "normal",
    gateProfile: resolvedGateProfile || "standard",
    changeZone: resolvedChangeZone || "unknown",
    activeProfiles,
    changedFiles,
    requiredProfiles: [...required.values()],
    recommendedProfiles: [...recommended.values()].filter((profile) => !required.has(profile.profileId)),
    minimumReviewSet: [...required.values()].map((profile) => profile.profileId),
    reviewerSignals: {
      positive: reviewerSignals.positive,
      negative: reviewerSignals.negative,
      suppressed: reviewerSignals.suppressed
    }
  };
}

export function runLearningStalenessCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const result = scanLearningStaleness({ repoRoot, now: options.now, thresholdDays: numberOption(options.thresholdDays, DEFAULT_STALENESS_DAYS) });
  let outputPath = null;
  if (apply) {
    outputPath = writeJsonArtifact(outputDir, DEFAULT_STALE_INDEX_JSON, result).relativePath;
  }
  return {
    ok: true,
    command: "p2",
    subcommand: "learning-staleness",
    apply,
    outputPath,
    ...summarizeLearningScan(result),
    result
  };
}

export function scanLearningStaleness({ repoRoot = process.cwd(), now = new Date().toISOString(), thresholdDays = DEFAULT_STALENESS_DAYS } = {}) {
  const root = path.resolve(repoRoot);
  const dir = path.join(root, DEFAULT_LEARNING_SOLUTIONS_DIR);
  const scannedAt = new Date(now).toISOString();
  const notes = [];
  if (!fs.existsSync(dir)) {
    return {
      schemaVersion: P2_SCHEMA_VERSION,
      scannedAt,
      thresholdDays,
      root: DEFAULT_LEARNING_SOLUTIONS_DIR,
      notes,
      stale: []
    };
  }
  for (const fileName of fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort()) {
    const relativePath = path.posix.join(DEFAULT_LEARNING_SOLUTIONS_DIR, fileName);
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    const frontmatter = parseFrontmatter(content);
    const bodyFields = parseBodyFields(content);
    const fileRefs = unique([
      ...parseDelimitedList(frontmatter.files_changed ?? frontmatter.file_refs ?? frontmatter.affected_files ?? ""),
      ...parseDelimitedList(bodyFields["files changed"] ?? bodyFields["file refs"] ?? bodyFields["affected files"] ?? "")
    ]);
    const sourcePacketId = frontmatter.source_packet_id ?? bodyFields["source packet"] ?? bodyFields["source packet id"] ?? "";
    const sourcePacketPath = frontmatter.source_packet_path ?? bodyFields["source packet path"] ?? sourcePacketId;
    const lastVerifiedRaw = frontmatter.last_verified_at ?? bodyFields["last verified at"] ?? bodyFields["last verified"] ?? "";
    const reasons = [];
    for (const field of ["solution_id", "source_packet_id", "source_packet_path", "work_item_id", "track", "problem_type", "module", "component", "status", "verification_command", "verification_exit_code"]) {
      if (!hasConcreteValue(frontmatter[field])) {
        reasons.push({ code: "learning_frontmatter_field_missing", field, message: `${relativePath} is missing ${field}.` });
      }
    }
    const track = normalizePacketHeaderValue(frontmatter.track ?? "");
    if (track && !LEARNING_TRACK_VALUES.has(track)) {
      reasons.push({ code: "learning_track_invalid", track: frontmatter.track, expected: [...LEARNING_TRACK_VALUES].join(" | "), message: `${relativePath} has invalid learning track ${frontmatter.track}.` });
    }
    const learningStatus = normalizePacketHeaderValue(frontmatter.status ?? "");
    if (learningStatus && !LEARNING_STATUS_VALUES.has(learningStatus)) {
      reasons.push({ code: "learning_status_invalid", status: frontmatter.status, expected: [...LEARNING_STATUS_VALUES].join(" | "), message: `${relativePath} has invalid learning status ${frontmatter.status}.` });
    }
    const verificationExitCode = Number(frontmatter.verification_exit_code);
    if (learningStatus === "active" && (!Number.isInteger(verificationExitCode) || verificationExitCode !== 0)) {
      reasons.push({ code: "learning_verification_exit_code_not_zero", value: frontmatter.verification_exit_code, message: `${relativePath} active learning must cite passing verification_exit_code 0.` });
    }
    if (sourcePacketPath && looksLikePath(sourcePacketPath) && !relativeExists(root, sourcePacketPath)) {
      reasons.push({ code: "learning_source_packet_missing", sourcePacketId: sourcePacketPath, message: `${relativePath} cites missing source packet ${sourcePacketPath}.` });
    }
    for (const ref of fileRefs) {
      if (!relativeExists(root, ref)) {
        reasons.push({ code: "learning_file_reference_missing", file: ref, message: `${relativePath} cites missing file reference ${ref}.` });
      }
    }
    const age = computeAgeDays(lastVerifiedRaw, scannedAt);
    const lifecycleStatus = learningStatus || "active";
    const intentionalHoldPattern = lifecycleStatus === "hold-pattern";
    const retiredLearning = lifecycleStatus === "retired" || lifecycleStatus === "deprecated" || lifecycleStatus === "superseded";
    if (!hasConcreteValue(lastVerifiedRaw) || String(lastVerifiedRaw).toLowerCase() === "pending") {
      reasons.push({ code: "learning_last_verified_missing", message: `${relativePath} does not have a concrete last_verified_at value.` });
    } else if (age != null && age > thresholdDays && !intentionalHoldPattern && !retiredLearning) {
      reasons.push({ code: "learning_last_verified_expired", ageDays: age, thresholdDays, message: `${relativePath} was last verified ${age} day(s) ago.` });
    } else if (age == null) {
      reasons.push({ code: "learning_last_verified_invalid", value: lastVerifiedRaw, message: `${relativePath} has invalid last_verified_at value ${lastVerifiedRaw}.` });
    }
    const effectiveReasons = intentionalHoldPattern
      ? reasons.filter((reason) => reason.code !== "learning_verification_exit_code_not_zero" && reason.code !== "learning_last_verified_expired")
      : retiredLearning
        ? reasons.filter((reason) => reason.code !== "learning_last_verified_expired")
        : reasons;
    const note = {
      path: relativePath,
      solutionId: frontmatter.solution_id ?? path.basename(fileName, ".md"),
      sourcePacketId,
      workItemId: frontmatter.work_item_id ?? bodyFields["work item"] ?? bodyFields["work item id"] ?? "",
      problemType: frontmatter.problem_type ?? "unknown",
      track: frontmatter.track ?? "unknown",
      component: frontmatter.component ?? "",
      fileRefs,
      lastVerifiedAt: hasConcreteValue(lastVerifiedRaw) ? lastVerifiedRaw : null,
      lifecycleStatus,
      status: intentionalHoldPattern ? "hold-pattern" : retiredLearning ? "retired" : effectiveReasons.length > 0 ? "stale" : "fresh",
      stalenessAction: intentionalHoldPattern
        ? "retain_as_intentional_failing_pattern"
        : retiredLearning
          ? "archive_no_active_refresh"
          : effectiveReasons.length > 0
            ? "refresh_before_reuse"
            : "current",
      reasons: effectiveReasons
    };
    notes.push(note);
  }
  const overlapWarnings = detectLearningOverlap(notes);
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    scannedAt,
    thresholdDays,
    root: DEFAULT_LEARNING_SOLUTIONS_DIR,
    notes,
    stale: notes.filter((note) => note.status === "stale"),
    overlapWarnings
  };
}

export function runAutomationCandidatesCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const result = detectAutomationCandidates({ repoRoot, threshold: numberOption(options.threshold, DEFAULT_AUTOMATION_THRESHOLD) });
  const artifacts = [];
  if (apply) {
    artifacts.push(writeJsonArtifact(outputDir, DEFAULT_AUTOMATION_JSON, result).relativePath);
    artifacts.push(writeTextArtifact(outputDir, DEFAULT_AUTOMATION_MD, renderAutomationMarkdown(result)).relativePath);
  }
  return {
    ok: true,
    command: "p2",
    subcommand: "automation-candidates",
    apply,
    artifacts,
    ...summarizeAutomationScan(result),
    result
  };
}

export function detectAutomationCandidates({ repoRoot = process.cwd(), threshold = DEFAULT_AUTOMATION_THRESHOLD } = {}) {
  const root = path.resolve(repoRoot);
  const entries = [];
  const ledgerPath = path.join(root, DEFAULT_SYSTEM_IMPROVEMENT_LEDGER);
  if (fs.existsSync(ledgerPath)) {
    const content = fs.readFileSync(ledgerPath, "utf8");
    const table = parseMarkdownTable(content);
    if (table) {
      for (const row of table.rows) {
        const candidate = pickRowValue(row, ["Next automation", "Automation candidate", "System improvement", "Next Automation"]);
        const workItem = pickRowValue(row, ["Work item", "Work Item", "Item", "Date"]);
        if (hasConcreteValue(candidate)) {
          entries.push({ source: DEFAULT_SYSTEM_IMPROVEMENT_LEDGER, workItem, candidate, normalized: normalizeCandidate(candidate) });
        }
      }
    }
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^[-*]\s*(?:Next automation|Automation candidate|Next Automation)\s*:\s*(.+)$/i);
      if (match && hasConcreteValue(match[1])) {
        entries.push({ source: DEFAULT_SYSTEM_IMPROVEMENT_LEDGER, candidate: match[1].trim(), normalized: normalizeCandidate(match[1]) });
      }
    }
  }
  const solutionDir = path.join(root, DEFAULT_LEARNING_SOLUTIONS_DIR);
  if (fs.existsSync(solutionDir)) {
    for (const fileName of fs.readdirSync(solutionDir).filter((name) => name.endsWith(".md"))) {
      const relativePath = path.posix.join(DEFAULT_LEARNING_SOLUTIONS_DIR, fileName);
      const content = fs.readFileSync(path.join(root, relativePath), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^[-*]\s*(?:Next automation|Automation candidate|Automation or harness improvement candidate)\s*:\s*(.+)$/i);
        if (match && hasConcreteValue(match[1])) {
          entries.push({ source: relativePath, candidate: match[1].trim(), normalized: normalizeCandidate(match[1]) });
        }
      }
    }
  }
  const grouped = new Map();
  for (const entry of entries) {
    if (!entry.normalized) {
      continue;
    }
    const current = grouped.get(entry.normalized) ?? { candidate: entry.candidate, normalized: entry.normalized, count: 0, sources: [] };
    current.count += 1;
    current.sources.push({ source: entry.source, workItem: entry.workItem ?? null, candidate: entry.candidate });
    grouped.set(entry.normalized, current);
  }
  const candidates = [...grouped.values()].sort((left, right) => right.count - left.count || left.normalized.localeCompare(right.normalized));
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    threshold,
    sourcePaths: [DEFAULT_SYSTEM_IMPROVEMENT_LEDGER, DEFAULT_LEARNING_SOLUTIONS_DIR],
    entries,
    candidates,
    promotions: candidates.filter((candidate) => candidate.count >= threshold)
  };
}

export function runRefactorAuditCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const result = buildRefactorAudit({
    repoRoot,
    maxLines: numberOption(options.maxLines ?? options.max_lines, 600),
    hotspotPaths: parseDelimitedList(options.hotspotPaths ?? options.hotspot_paths ?? ".harness/runtime/state,.agents/workflows,reference/packets"),
    mode: options.mode ?? "advisory"
  });
  let outputPath = null;
  if (apply) {
    outputPath = writeJsonArtifact(outputDir, DEFAULT_REFACTOR_AUDIT_JSON, result).relativePath;
  }
  return { command: "p2", subcommand: "refactor-audit", apply, outputPath, ...result };
}

export function buildRefactorAudit({ repoRoot = process.cwd(), maxLines = 600, hotspotPaths = [".harness/runtime/state"], mode = "advisory" } = {}) {
  const root = path.resolve(repoRoot);
  const normalizedHotspots = hotspotPaths.map((entry) => normalizeRelativePath(entry)).filter(Boolean);
  const files = listRefactorAuditFiles(root, normalizedHotspots);
  const findings = [];
  const fileRecords = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    const content = fs.readFileSync(absolute, "utf8");
    fileRecords.push({ file, content });
    const lines = content.split(/\r?\n/).length;
    if (lines > maxLines) {
      findings.push(buildStructureDebtFinding({
        code: "oversized_file",
        path: file,
        severity: "warn",
        confidence: "high",
        rationale: `File has ${lines} lines, above threshold ${maxLines}.`,
        nextAction: "Open a focused refactor packet to split responsibilities before adding more behavior.",
        details: { lineCount: lines, threshold: maxLines }
      }));
    }
    if (/\.harness\/runtime\/state\//.test(file.replace(/\\/g, "/")) && (/validation|transition|packet|browser|risk|conductor|guard/i.test(file) || /import\s+|from\s+["']\.\.\/|createOperatingStateStore|runValidator/.test(content))) {
      findings.push(buildStructureDebtFinding({
        code: "runtime_boundary_candidate",
        path: file,
        severity: "info",
        confidence: "medium",
        rationale: "Runtime state file touches a load-bearing harness boundary or cross-module imports.",
        nextAction: "Keep future changes packetized and consider extracting boundary modules in a refactor packet.",
        recommendedPacketType: "refactor"
      }));
    }
    const importCount = (content.match(/\bimport\b/g) ?? []).length;
    if (importCount >= 8) {
      findings.push(buildStructureDebtFinding({
        code: "coupling_hotspot",
        path: file,
        severity: "info",
        confidence: "medium",
        rationale: `File imports ${importCount} modules, which indicates possible coupling.`,
        nextAction: "Review dependency direction and split orchestration from leaf logic in a refactor packet.",
        details: { importCount }
      }));
    }
  }
  findings.push(...detectDuplicateCommandWiring(fileRecords));
  findings.push(...detectCircularImports(fileRecords));
  findings.push(...detectBoundaryViolations(fileRecords));
  findings.push(...detectRepeatedLogicCandidates(fileRecords));
  const auditMode = String(mode ?? "advisory").trim().toLowerCase() === "strict" ? "strict" : "advisory";
  const blocking = auditMode === "strict" && findings.some((finding) => ["high", "critical"].includes(finding.severity));
  if (blocking) {
    for (const finding of findings.filter((finding) => ["high", "critical"].includes(finding.severity))) {
      finding.gateEffect = "hold";
    }
  }
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok: !blocking,
    mode: auditMode,
    status: blocking ? "hold" : "advisory",
    blocking,
    mutationPolicy: "read_only",
    authority: "advisory_only",
    canMutateCode: false,
    canCloseTechnicalDebt: false,
    canApproveRefactor: false,
    canRelease: false,
    canClosePacket: false,
    scannedFiles: files.length,
    maxLines,
    hotspotPaths: normalizedHotspots,
    findings,
    nextAction: blocking
      ? "Strict refactor audit found severe structure debt; open or approve a focused refactor packet before relying on closeout."
      : findings.length > 0
        ? "Review advisory refactor candidates; open a separate approved packet before changing code."
        : "No refactor hotspots found within configured audit paths."
  };
}

export function runAiReviewPackageCommand({ outputDir = process.cwd(), options = {}, apply = false } = {}) {
  const result = buildAiReviewPackage({
    packetPath: options.packet ?? options.packetPath ?? "",
    workItemId: options.workItem ?? options.workItemId ?? "",
    provider: options.provider ?? "manual-offline",
    input: options.input ?? options.text ?? "",
    deterministicDecision: options.deterministicDecision ?? options.deterministic ?? "not-run",
    aiDecision: options.aiDecision ?? options.ai ?? "not-run"
  });
  let outputPath = null;
  if (apply) {
    outputPath = writeJsonArtifact(outputDir, DEFAULT_AI_REVIEW_PACKAGE_JSON, result).relativePath;
  }
  return { ok: true, command: "p2", subcommand: "ai-review-package", apply, outputPath, ...result };
}

export function buildAiReviewPackage({ packetPath = "", workItemId = "", provider = "manual-offline", input = "", deterministicDecision = "not-run", aiDecision = "not-run" } = {}) {
  const rawText = String(input ?? "");
  const boundedText = rawText.length > 4000 ? `${rawText.slice(0, 4000)}\n[TRUNCATED]` : rawText;
  const redactedText = redactSensitiveText(boundedText);
  const promptInjectionFindings = detectPromptInjectionSignals(redactedText);
  const secretFindings = scanSensitiveText(rawText);
  const disagreementDisposition = deterministicDecision === "block" && aiDecision && aiDecision !== "block"
    ? "deterministic_block_wins"
    : deterministicDecision !== aiDecision && aiDecision !== "not-run"
      ? "record_disagreement_for_human_review"
      : "no_disagreement";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "ai_review_input_package",
    provider,
    packetPath,
    workItemId,
    authority: "advisory_only",
    canSetApproval: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    canOverrideReviewer: false,
    inputPackage: {
      redactedText,
      bounded: rawText.length <= 4000,
      maxChars: 4000,
      secretFindingCount: secretFindings.length,
      promptInjectionFindings,
      untrustedInstructionHandling: promptInjectionFindings.length > 0 ? "evidence_only" : "normal_evidence"
    },
    deterministicDecision,
    aiDecision,
    disagreementDisposition,
    nextAction: "Use AI review output as advisory evidence only; deterministic gates and human role authority remain binding."
  };
}

export function runAdvisoryAiReviewCommand({ outputDir = process.cwd(), options = {}, apply = false } = {}) {
  const reviewFile = options.reviewFile ?? options.review ?? options.fixture;
  const reviewFixture = reviewFile ? readAdvisoryReviewFixture(outputDir, reviewFile) : null;
  const inputPackage = reviewFixture?.package ?? parseAdvisoryJsonOption(options.package ?? options.inputPackage ?? options.input, null) ?? buildAiReviewPackage({
    packetPath: options.packet ?? options.packetPath ?? "",
    workItemId: options.workItem ?? options.workItemId ?? "",
    provider: options.provider ?? "mock-offline",
    input: options.text ?? ""
  });
  const mockOutput = reviewFixture?.mockOutput ?? parseAdvisoryJsonOption(options.mockOutput ?? options.output ?? options.findings, {});
  const guardOverlays = reviewFixture?.guardOverlays ?? parseAdvisoryJsonOption(options.guardOverlays ?? options.overlays, []);
  const result = buildAdvisoryAiReview({ inputPackage, mockOutput, guardOverlays });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_ADVISORY_AI_REVIEW_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_ADVISORY_AI_REVIEW_MD, renderAdvisoryAiReviewMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "ai-review-runner",
    apply,
    outputPaths,
    ...result,
    ok: result.ok
  };
}

function readAdvisoryReviewFixture(repoRoot, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const absolute = path.resolve(repoRoot, normalized);
  if (!isInside(repoRoot, absolute) || !fs.existsSync(absolute)) {
    return null;
  }
  return readJsonIfExists(absolute);
}

export function buildAdvisoryAiReview({ inputPackage = null, mockOutput = {}, guardOverlays = [] } = {}) {
  const normalizedInput = normalizeAdvisoryInputPackage(inputPackage);
  const normalizedOutput = normalizeAdvisoryOutput(mockOutput);
  const overlays = normalizeAdvisoryGuardOverlays(guardOverlays);
  const validationFindings = [
    ...normalizedInput.validationFindings,
    ...normalizedOutput.validationFindings
  ];
  const findings = normalizedOutput.findings.map((finding, index) => {
    const evidenceQuoteRedacted = redactSensitiveText(finding.evidenceQuote ?? finding.evidenceQuoteRedacted ?? "");
    return {
      findingId: finding.findingId || `AI-FIND-${index + 1}`,
      severity: finding.severity,
      category: finding.category,
      file: finding.file ?? null,
      line: finding.line ?? null,
      evidenceQuoteRedacted,
      recommendation: finding.recommendation,
      disposition: finding.disposition
    };
  });
  const hasBlockingValidation = validationFindings.some((finding) => finding.status === "block");
  const hasHold = overlays.some((overlay) => overlay.status === "hold" || overlay.status === "block")
    || findings.some((finding) => finding.disposition === "needs-human-review")
    || normalizedInput.secretFindingCount > 0;
  const hasWarn = overlays.some((overlay) => overlay.status === "warn") || findings.length > 0;
  const decision = hasBlockingValidation ? "block" : hasHold ? "hold" : hasWarn ? "warn" : "pass";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "advisory_ai_review",
    inputSchemaVersion: "advisory-ai-review-input/v1",
    outputSchemaVersion: "advisory-ai-review-output/v1",
    authority: "advisory_only",
    provider: normalizedInput.provider,
    packetPath: normalizedInput.packetPath,
    workItemId: normalizedInput.workItemId,
    ok: validationFindings.length === 0,
    decision,
    canSetApproval: false,
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    canRepair: false,
    canAcceptResidualRisk: false,
    canOverrideReviewer: false,
    canOverrideGuard: false,
    canVerifyProduct: false,
    promptInjectionDisposition: normalizedInput.promptInjectionFindings.length > 0 ? "evidence_only" : "normal_evidence",
    redaction: {
      applied: normalizedInput.redactionApplied,
      secretFindingCount: normalizedInput.secretFindingCount,
      bounded: normalizedInput.bounded,
      maxChars: normalizedInput.maxChars
    },
    disagreement: normalizeAdvisoryDisagreement(normalizedInput),
    guardOverlays: overlays,
    findings,
    validationFindings,
    nextAction: validationFindings.length > 0
      ? "Fix advisory AI review schema findings before using this report as review evidence."
      : "Review advisory findings with the authoritative human/reviewer workflow; this report grants no approval."
  };
}

export function renderAdvisoryAiReviewMarkdown(review) {
  const findings = review.findings.map((finding) => `| ${finding.findingId} | ${finding.severity} | ${finding.category} | ${finding.file ?? ""}:${finding.line ?? ""} | ${finding.disposition} | ${finding.recommendation ?? ""} |`);
  const validation = review.validationFindings.map((finding) => `| ${finding.status} | ${finding.code} | ${finding.message} |`);
  const overlays = review.guardOverlays.map((overlay) => `| ${overlay.kind} | ${overlay.status} | ${overlay.nextAction ?? ""} |`);
  return [
    "# Advisory AI Review",
    "",
    `Schema version: ${review.schemaVersion}`,
    `Input schema: ${review.inputSchemaVersion}`,
    `Output schema: ${review.outputSchemaVersion}`,
    `Decision: ${review.decision}`,
    "",
    "## Authority",
    "",
    "No approval authority. This advisory AI review cannot approve implementation, close packets, release, close risks, accept residual risk, override guard decisions, or prove product behavior.",
    "",
    "## Summary",
    "",
    `- Provider: ${review.provider}`,
    `- Packet: ${review.packetPath}`,
    `- Work item: ${review.workItemId}`,
    `- Prompt injection disposition: ${review.promptInjectionDisposition}`,
    `- Secret finding count before redaction: ${review.redaction.secretFindingCount}`,
    `- Next action: ${review.nextAction}`,
    "",
    "## Findings",
    "",
    "| Finding | Severity | Category | Location | Disposition | Recommendation |",
    "|---|---|---|---|---|---|",
    ...(findings.length > 0 ? findings : ["| none | info | none |  | deferred | No advisory findings. |"]),
    "",
    "## Guard Overlays",
    "",
    "| Kind | Status | Next action |",
    "|---|---|---|",
    ...(overlays.length > 0 ? overlays : ["| none | pass | No guard overlay supplied. |"]),
    "",
    "## Validation Findings",
    "",
    "| Status | Code | Message |",
    "|---|---|---|",
    ...(validation.length > 0 ? validation : ["| pass | none | Advisory AI review output is schema-valid. |"])
  ].join("\n") + "\n";
}

export function runDirectionalRegressionPilotCommand({ outputDir = process.cwd(), options = {}, apply = false } = {}) {
  const evidenceFile = options.evidenceFile ?? options.evidence ?? options.manifest;
  const evidenceInput = evidenceFile ? readDirectionalEvidenceFile(outputDir, evidenceFile) : {};
  const result = buildDirectionalRegressionPilot({
    packetId: options.packetId ?? options.packet ?? "PVH-PKT-008",
    repoRoot: outputDir,
    evidence: evidenceInput.evidence ?? evidenceInput
  });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_DIRECTIONAL_PILOT_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_DIRECTIONAL_PILOT_MD, renderDirectionalRegressionPilotMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "directional-pilot",
    apply,
    outputPaths,
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    ...result,
    ok: result.completionStatus === "pass"
  };
}

export function buildDirectionalRegressionPilot({ packetId = "PVH-PKT-008", evidence = {}, repoRoot = process.cwd() } = {}) {
  const requiredEvidence = buildDirectionalPilotEvidence(evidence, repoRoot);
  const evidenceIntegrity = evaluateDirectionalPilotIntegrity(requiredEvidence);
  const checkLanes = {
    cleanPayload: {
      kind: "clean_payload",
      validationKind: "reusable_payload_boundary",
      evidenceKey: "cleanPayload",
      command: requiredEvidence.cleanPayload.command,
      status: requiredEvidence.cleanPayload.status
    },
    initializedProject: {
      kind: "initialized_project",
      validationKind: "initialized_project_runtime",
      evidenceKey: "initializedProject",
      command: requiredEvidence.initializedProject.command,
      status: requiredEvidence.initializedProject.status
    },
    productVerification: {
      kind: "product_behavior",
      validationKind: "product_behavior",
      evidenceKey: "productVerification",
      command: requiredEvidence.productVerification.command,
      status: requiredEvidence.productVerification.status
    },
    harnessValidation: {
      kind: "harness_structural_state",
      validationKind: "harness_structural_state",
      evidenceKey: "harnessValidation",
      command: requiredEvidence.harnessValidation.command,
      status: requiredEvidence.harnessValidation.status
    }
  };
  const browserStatus = normalizePilotStatus(requiredEvidence.browserEvidence.status);
  const completionStatus = evidenceIntegrity.blocking > 0 ? "block" : evidenceIntegrity.holds > 0 ? "hold" : evidenceIntegrity.warnings > 0 ? "warn" : "pass";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "directional_regression_pilot",
    packetId,
    generatedAt: new Date().toISOString(),
    ok: true,
    authority: "evidence_only_no_approval",
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    checkLanes,
    requiredEvidence,
    evidenceIntegrity,
    completionStatus,
    laneTaxonomyVersion: "directional-pilot-lanes/v1",
    browserEvidenceDisposition: ["pass", "conditional_pass"].includes(browserStatus)
      ? "real_browser_or_policy_allowed_pass"
      : "honest_blocked_or_warn_allowed",
    directionPrinciples: DIRECTION_PRINCIPLES.map((principle) => ({
      ...principle,
      evidence: principle.evidenceKeys.map((key) => ({
        key,
        status: requiredEvidence[key]?.status ?? "missing",
        command: requiredEvidence[key]?.command ?? "missing"
      }))
    })),
    runbook: [
      "Run clean-payload checks before initialized-project checks.",
      "Record product behavior evidence separately from harness structural/state validation.",
      "Record browser evidence as pass only when real-browser or policy-approved conditional evidence exists; otherwise use warn/hold/blocked_environment/not_run_agent_error.",
      "Attach packet-bound security review, compound learning, context-budget, manual-following, and closeout-preflight evidence.",
      "Use this pilot report as evidence only; it grants no approval, release, risk closure, or closeout authority."
    ],
    nextAction: "Run the pilot commands, fill evidence statuses, then use packet closeout to record which direction principles were verified."
  };
}

export function renderDirectionalRegressionPilotMarkdown(pilot) {
  const principleRows = pilot.directionPrinciples.map((principle) => {
    const evidence = principle.evidence.map((item) => `${item.key}=${item.status}`).join("<br>");
    return `| ${principle.label} | ${evidence} | ${principle.meaning} |`;
  });
  const evidenceRows = Object.entries(pilot.requiredEvidence).map(([key, item]) => {
    const artifact = item.artifact?.path ? `${item.artifact.path} (${item.artifact.exists ? "exists" : "missing"})` : "";
    return `| ${key} | ${item.status} | \`${item.command}\` | ${item.provenance || "default"} | ${artifact} | ${item.note || ""} |`;
  });
  const integrityRows = pilot.evidenceIntegrity.findings.map((finding) => `| ${finding.lane} | ${finding.status} | ${finding.code} | ${finding.message} |`);
  return [
    "# Directional Regression Pilot",
    "",
    `Packet: ${pilot.packetId}`,
    `Schema version: ${pilot.schemaVersion}`,
    `Completion status: ${pilot.completionStatus}`,
    `Lane taxonomy: ${pilot.laneTaxonomyVersion}`,
    "",
    "## Authority",
    "",
    "No approval authority. This pilot report is evidence only and cannot approve implementation, close packets, release, close risk, or accept residual risk.",
    "",
    "## Clean-payload checks",
    "",
    `- Command: \`${pilot.checkLanes.cleanPayload.command}\``,
    `- Status: ${pilot.checkLanes.cleanPayload.status}`,
    "",
    "## Initialized-project checks",
    "",
    `- Command: \`${pilot.checkLanes.initializedProject.command}\``,
    `- Status: ${pilot.checkLanes.initializedProject.status}`,
    "",
    "## Validation Boundary",
    "",
    "Harness validation is not product verification. Product behavior evidence must be recorded separately from harness structural/state validation.",
    "Product behavior evidence remains separate from harness validation in every completed pilot report.",
    "",
    "## Evidence integrity",
    "",
    `- Integrity ok: ${pilot.evidenceIntegrity.ok ? "yes" : "no"}`,
    `- Blocking findings: ${pilot.evidenceIntegrity.blocking}`,
    `- Hold findings: ${pilot.evidenceIntegrity.holds}`,
    `- Warning findings: ${pilot.evidenceIntegrity.warnings}`,
    "",
    "| Lane | Status | Code | Message |",
    "|---|---|---|---|",
    ...(integrityRows.length > 0 ? integrityRows : ["| all | pass | none | No integrity findings. |"]),
    "",
    "## Required Evidence",
    "",
    "| Evidence | Status | Command | Provenance | Artifact | Note |",
    "|---|---|---|---|---|---|",
    ...evidenceRows,
    "",
    "## Direction Principle Map",
    "",
    "| Direction principle | Evidence | Meaning |",
    "|---|---|---|",
    ...principleRows,
    "",
    "## Runbook",
    "",
    ...pilot.runbook.map((item, index) => `${index + 1}. ${item}`),
    "",
    `Next action: ${pilot.nextAction}`
  ].join("\n") + "\n";
}

export function runRequirementTraceMatrixCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const rows = loadRequirementTraceRows({ repoRoot, options });
  const result = buildRequirementTraceMatrix({ repoRoot, rows });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_REQUIREMENT_TRACE_MATRIX_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_REQUIREMENT_TRACE_MATRIX_MD, renderRequirementTraceMatrixMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "trace-matrix",
    apply,
    outputPaths,
    ...result,
    ok: result.completionStatus === "pass"
  };
}

export function buildRequirementTraceMatrix({ repoRoot = process.cwd(), rows = [] } = {}) {
  const matrixRows = rows.map((row, index) => buildRequirementTraceRow({ repoRoot, row, index }));
  const findings = matrixRows.flatMap((row) => row.findings.map((finding) => ({ requirementId: row.requirementId, ...finding })));
  const completionStatus = findings.some((finding) => finding.status === "block")
    ? "block"
    : findings.some((finding) => finding.status === "hold")
      ? "hold"
      : findings.some((finding) => finding.status === "warn")
        ? "warn"
        : "pass";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "requirement_trace_matrix",
    matrixSchemaVersion: "requirement-trace-matrix/v1",
    authority: "evidence_only_no_approval",
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    canRepair: false,
    canAcceptResidualRisk: false,
    productHarnessBoundary: "product requirement coverage remains separate from harness structural validation",
    completionStatus,
    ok: completionStatus === "pass",
    summary: {
      rows: matrixRows.length,
      pass: matrixRows.filter((row) => row.status === "pass").length,
      warn: matrixRows.filter((row) => row.status === "warn").length,
      hold: matrixRows.filter((row) => row.status === "hold").length,
      block: matrixRows.filter((row) => row.status === "block").length,
      findings: findings.length
    },
    findings,
    rows: matrixRows,
    nextAction: completionStatus === "pass"
      ? "Trace matrix is evidence-complete. Use packet preflight and review gates for closeout; this report grants no approval."
      : "Resolve trace findings before relying on the matrix for closeout evidence."
  };
}

export function renderRequirementTraceMatrixMarkdown(matrix) {
  const rows = matrix.rows.map((row) => [
    row.requirementId,
    row.validationKind,
    row.status,
    row.packet.exists ? row.packet.path : `${row.packet.path ?? "missing"} (missing)`,
    row.coverage.tests.map((item) => `${item.path}=${item.exists ? "exists" : "missing"}`).join("<br>") || "missing",
    row.coverage.evidenceManifests.map((item) => `${item.path}=${item.status}`).join("<br>") || "missing",
    row.coverage.documentation.map((item) => `${item.path}=${item.exists ? "exists" : "missing"}`).join("<br>") || "missing",
    row.nextAction
  ].map((value) => String(value ?? "").replace(/\|/g, "\\|")).join(" | "));
  const findings = matrix.findings.map((finding) => `| ${finding.requirementId} | ${finding.status} | ${finding.code} | ${finding.message} |`);
  return [
    "# Requirement Trace Matrix",
    "",
    `Schema version: ${matrix.schemaVersion}`,
    `Matrix schema: ${matrix.matrixSchemaVersion}`,
    `Completion status: ${matrix.completionStatus}`,
    "",
    "## Authority",
    "",
    "No approval authority. This trace matrix cannot approve implementation, close packets, release, close risks, accept residual risk, or prove product behavior by itself.",
    "",
    "## Product And Harness Boundary",
    "",
    "Product requirement coverage remains separate from harness structural validation.",
    "",
    "## Summary",
    "",
    `- Rows: ${matrix.summary.rows}`,
    `- Pass: ${matrix.summary.pass}`,
    `- Warn: ${matrix.summary.warn}`,
    `- Hold: ${matrix.summary.hold}`,
    `- Block: ${matrix.summary.block}`,
    "",
    "## Rows",
    "",
    "| Requirement | Kind | Status | Packet | Tests | Evidence | Docs | Next action |",
    "|---|---|---|---|---|---|---|---|",
    ...(rows.length > 0 ? rows.map((row) => `| ${row} |`) : ["| none | none | hold | missing | missing | missing | missing | Add trace rows. |"]),
    "",
    "## Findings",
    "",
    "| Requirement | Status | Code | Message |",
    "|---|---|---|---|",
    ...(findings.length > 0 ? findings : ["| all | pass | none | No trace findings. |"])
  ].join("\n") + "\n";
}

export function runUnifiedOperatorDigestCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const surfaces = loadOperatorDigestSurfaces({ repoRoot, options });
  const result = buildUnifiedOperatorDigest({ repoRoot, surfaces });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_OPERATOR_DIGEST_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_OPERATOR_DIGEST_MD, renderUnifiedOperatorDigestMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "operator-digest",
    apply,
    outputPaths,
    ...result,
    ok: result.decision === "ready"
  };
}

export function buildUnifiedOperatorDigest({ repoRoot = process.cwd(), surfaces = {} } = {}) {
  const normalized = normalizeDigestSurfaces({ repoRoot, surfaces });
  const evidenceTable = Object.entries(normalized).map(([surface, item]) => ({
    surface,
    status: item.status,
    decision: item.decision,
    validationKind: item.validationKind,
    sourcePath: item.sourcePath,
    nextAction: item.nextAction
  }));
  const blockers = evidenceTable
    .filter((row) => row.status === "block" || row.decision === "block")
    .map((row) => ({ surface: row.surface, status: "block", sourcePath: row.sourcePath, nextAction: row.nextAction }));
  const holds = evidenceTable
    .filter((row) => row.status === "hold" || row.decision === "hold")
    .map((row) => ({ surface: row.surface, status: "hold", sourcePath: row.sourcePath, nextAction: row.nextAction }));
  const warnings = evidenceTable
    .filter((row) => row.status === "warn" || row.decision === "warn" || row.status === "blocked_environment")
    .map((row) => ({ surface: row.surface, status: row.status, sourcePath: row.sourcePath, nextAction: row.nextAction }));
  const openRisks = normalizeDigestRisks(surfaces.risk?.risks ?? surfaces.risks ?? []);
  for (const risk of openRisks.filter((risk) => risk.closeoutBlocked || ["high", "critical"].includes(risk.severity))) {
    const missing = [];
    if (!risk.owner) missing.push("owner");
    if (!risk.impact) missing.push("impact");
    if (!risk.mitigation) missing.push("mitigation");
    if (risk.closeoutBlocked || missing.length > 0) {
      blockers.push({
        surface: "risk",
        status: "block",
        sourcePath: surfaces.risk?.sourcePath ?? null,
        nextAction: missing.length > 0
          ? `Complete ${risk.riskId ?? "risk"} ${missing.join(", ")} before closeout.`
          : risk.mitigation || `Resolve ${risk.riskId ?? "risk"} before closeout.`
      });
    }
  }
  const decision = blockers.length > 0 ? "block" : holds.length > 0 ? "hold" : warnings.length > 0 ? "warn" : "ready";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "operator_readiness_digest",
    digestSchemaVersion: "operator-readiness-digest/v1",
    authority: "evidence_only_no_approval",
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canCloseRisk: false,
    canRepair: false,
    canAcceptResidualRisk: false,
    productHarnessBoundary: "product verification remains separate from harness structural validation",
    decision,
    ok: decision === "ready",
    blocking: blockers.length > 0,
    summary: {
      surfaces: evidenceTable.length,
      blockers: blockers.length,
      holds: holds.length,
      warnings: warnings.length,
      openRisks: openRisks.length
    },
    nonTechnicalSummary: buildDigestNonTechnicalSummary(decision, blockers, holds, warnings),
    nextAction: buildDigestNextAction({ decision, blockers, holds, warnings }),
    evidenceTable,
    blockers,
    holds,
    warnings,
    openRisks,
    reviewerProfile: surfaces.reviewerProfile ?? surfaces.traceMatrix?.reviewerProfile ?? null,
    specialistReview: surfaces.specialistReview ?? surfaces.traceMatrix?.specialistReview ?? null,
    securityReview: surfaces.securityReview ?? null,
    residualRisk: surfaces.residualRisk ?? surfaces.traceMatrix?.residualRisk ?? null
  };
}

export function renderUnifiedOperatorDigestMarkdown(digest) {
  const rows = digest.evidenceTable.map((row) => `| ${row.surface} | ${row.status} | ${row.validationKind ?? ""} | ${row.sourcePath ?? ""} | ${row.nextAction ?? ""} |`);
  const blockers = digest.blockers.map((blocker) => `| ${blocker.surface} | ${blocker.status} | ${blocker.sourcePath ?? ""} | ${blocker.nextAction ?? ""} |`);
  const risks = digest.openRisks.map((risk) => `| ${risk.riskId ?? ""} | ${risk.severity} | ${risk.owner ?? ""} | ${risk.impact ?? ""} | ${risk.mitigation ?? ""} | ${risk.closeoutBlocked ? "yes" : "no"} |`);
  return [
    "# Unified Operator Readiness Digest",
    "",
    `Schema version: ${digest.schemaVersion}`,
    `Digest schema: ${digest.digestSchemaVersion}`,
    `Decision: ${digest.decision}`,
    `Blocking: ${digest.blocking ? "yes" : "no"}`,
    "",
    "## Authority",
    "",
    "No approval authority. This digest cannot approve implementation, close packets, release, close risks, accept residual risk, or prove product behavior by itself.",
    "",
    "## Product And Harness Boundary",
    "",
    "Product verification remains separate from harness structural validation.",
    "",
    "## Summary",
    "",
    digest.nonTechnicalSummary,
    "",
    `Next action: ${digest.nextAction}`,
    "",
    "## Evidence Table",
    "",
    "| Surface | Status | Validation kind | Source | Next action |",
    "|---|---|---|---|---|",
    ...(rows.length > 0 ? rows : ["| none | hold | none | none | Add readiness surfaces. |"]),
    "",
    "## Blockers",
    "",
    "| Surface | Status | Source | Next action |",
    "|---|---|---|---|",
    ...(blockers.length > 0 ? blockers : ["| none | pass | none | No blocking surface. |"]),
    "",
    "## Open Risks",
    "",
    "| Risk | Severity | Owner | Impact | Mitigation | Closeout blocked |",
    "|---|---|---|---|---|---|",
    ...(risks.length > 0 ? risks : ["| none | none | none | none | none | no |"])
  ].join("\n") + "\n";
}

export function runRecoveryRehearsalCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const state = loadRecoveryRehearsalState({ repoRoot, options });
  const result = buildRecoveryRehearsal({ repoRoot, state });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_RECOVERY_REHEARSAL_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_RECOVERY_REHEARSAL_MD, renderRecoveryRehearsalMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "recovery-rehearsal",
    apply,
    outputPaths,
    ...result
  };
}

export function buildRecoveryRehearsal({ repoRoot = process.cwd(), state = {} } = {}) {
  const findings = [];
  for (const artifact of Array.isArray(state.generatedArtifacts) ? state.generatedArtifacts : []) {
    const artifactPath = normalizeRelativePath(artifact.path ?? artifact.artifactPath);
    const absolutePath = artifactPath ? path.resolve(repoRoot, artifactPath) : null;
    const exists = absolutePath && isInside(repoRoot, absolutePath) && fs.existsSync(absolutePath);
    const expectedDigest = artifact.expectedDigest ?? artifact.expectedHash ?? null;
    const actualDigest = artifact.actualDigest ?? (exists ? hashFile(absolutePath) : null);
    if (!exists || (expectedDigest && actualDigest && expectedDigest !== actualDigest)) {
      findings.push(recoveryFinding({
        code: "generated_artifact_drift",
        status: "hold",
        path: artifactPath,
        message: exists
          ? `${artifactPath} digest differs from the expected generated-state digest.`
          : `${artifactPath} is missing.`,
        nextAction: "Run harness:sync-state, then rerun recovery rehearsal before editing generated files manually."
      }));
    }
  }

  const activePackets = listActivePacketIds(repoRoot);
  const runtimeActivePacketId = String(state.runtimeActivePacketId ?? state.activePacketId ?? "").trim();
  if (runtimeActivePacketId && (activePackets.length !== 1 || activePackets[0] !== runtimeActivePacketId)) {
    findings.push(recoveryFinding({
      code: "active_packet_runtime_mismatch",
      status: "hold",
      path: ".harness/packets/active",
      message: `Runtime active packet ${runtimeActivePacketId} does not match active packet files (${activePackets.join(", ") || "none"}).`,
      nextAction: "Run harness:status and harness:sync-state; resolve packet/runtime mismatch before continuing transitions."
    }));
  }

  const transition = state.transition ?? {};
  if (String(transition.status ?? "").toLowerCase() === "failed") {
    findings.push(recoveryFinding({
      code: "failed_transition_retry",
      status: transition.canRetry === false ? "hold" : "warn",
      path: transition.sourcePath ?? null,
      message: "A previous transition failed and needs an explicit retry or recovery decision.",
      nextAction: transition.canRetry === false
        ? "Inspect the failed transition report and route to Planner before retrying."
        : `Retry the transition command after sync-state: ${transition.command ?? "npm run harness:transition -- --apply"}.`
    }));
  }

  const pilot = state.partialPilotOutput ?? readJsonSurface(repoRoot, DEFAULT_DIRECTIONAL_PILOT_JSON);
  if (pilot && isPartialPilotOutput(pilot)) {
    findings.push(recoveryFinding({
      code: "partial_pilot_output",
      status: "hold",
      path: pilot.sourcePath ?? DEFAULT_DIRECTIONAL_PILOT_JSON,
      message: "Directional pilot output is partial, pending, or has failed integrity evidence.",
      nextAction: "Complete or rerun directional-pilot evidence ingestion before using the pilot as closeout evidence."
    }));
  }

  const unavailable = state.unavailableState ?? state.unavailable ?? null;
  if (unavailable) {
    findings.push(recoveryFinding({
      code: "unavailable_state",
      status: "blocked_environment",
      path: unavailable.path ?? null,
      message: `${unavailable.kind ?? "state"} is unavailable for a safe recovery rehearsal.`,
      nextAction: "Stop mutation, preserve logs, clear external locks or restore state availability, then rerun recovery rehearsal."
    }));
  }

  const status = findings.some((finding) => finding.status === "block")
    ? "block"
    : findings.some((finding) => finding.status === "hold")
      ? "hold"
      : findings.some((finding) => finding.status === "blocked_environment")
        ? "blocked_environment"
        : findings.some((finding) => finding.status === "warn")
          ? "warn"
          : "pass";

  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "recovery_rehearsal",
    recoverySchemaVersion: "recovery-rehearsal/v1",
    status,
    ok: ["pass", "warn"].includes(status),
    blocking: ["block", "hold", "blocked_environment"].includes(status),
    mutationPolicy: "report_first_read_only",
    authority: "diagnostic_only_no_repair_authority",
    canRepair: false,
    canMutateState: false,
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canAcceptResidualRisk: false,
    summary: {
      findings: findings.length,
      activePackets: activePackets.length
    },
    findings,
    nextAction: findings[0]?.nextAction ?? "No recovery rehearsal findings; continue with authoritative validation and closeout gates."
  };
}

export function renderRecoveryRehearsalMarkdown(result) {
  const rows = result.findings.map((finding) => `| ${finding.status} | ${finding.code} | ${finding.path ?? ""} | ${finding.nextAction} |`);
  return [
    "# Recovery Rehearsal",
    "",
    `Schema version: ${result.schemaVersion}`,
    `Status: ${result.status}`,
    `Blocking: ${result.blocking ? "yes" : "no"}`,
    "",
    "## Authority",
    "",
    "No repair authority. This report cannot mutate state, approve implementation, close packets, release, or accept residual risk.",
    "",
    "## Findings",
    "",
    "| Status | Code | Path | Next action |",
    "|---|---|---|---|",
    ...(rows.length > 0 ? rows : ["| pass | none |  | No recovery findings. |"]),
    "",
    `Next action: ${result.nextAction}`
  ].join("\n") + "\n";
}

export function runContextBudgetPolicyCommand({ outputDir = process.cwd(), options = {}, apply = false } = {}) {
  const result = buildContextBudgetPolicy({
    role: options.role,
    lane: options.lane,
    mode: options.mode ?? options.enforcement,
    actualReadFiles: numberOption(options.actualReadFiles ?? options.readFiles ?? options.reads, 0),
    estimatedTokensRead: numberOption(options.estimatedTokensRead ?? options.tokens, 0),
    policy: loadContextBudgetPolicyOption(options.policy)
  });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_CONTEXT_BUDGET_POLICY_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_CONTEXT_BUDGET_POLICY_MD, renderContextBudgetPolicyMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "context-budget-policy",
    apply,
    outputPaths,
    ...result
  };
}

export function buildContextBudgetPolicy({
  role = "developer",
  lane = "standard",
  mode = "advisory",
  actualReadFiles = 0,
  estimatedTokensRead = 0,
  policy = DEFAULT_CONTEXT_BUDGET_POLICY
} = {}) {
  const normalizedMode = normalizeContextBudgetMode(mode);
  const normalizedRole = String(role ?? "developer").trim().toLowerCase() || "developer";
  const normalizedLane = String(lane ?? "standard").trim().toLowerCase() || "standard";
  const limits = policy?.[normalizedRole]?.[normalizedLane] ?? policy?.default?.[normalizedLane] ?? policy?.default?.standard ?? DEFAULT_CONTEXT_BUDGET_POLICY.default.standard;
  const maxReadFiles = Number(limits.maxReadFiles ?? limits.maxDocuments ?? 8);
  const targetTokens = Number(limits.targetTokens ?? limits.maxTokens ?? 2000);
  const findings = [];
  if (Number(actualReadFiles) > maxReadFiles) {
    findings.push(contextBudgetFinding({
      code: "role_lane_max_read_exceeded",
      actual: Number(actualReadFiles),
      limit: maxReadFiles,
      message: `${normalizedRole}/${normalizedLane} read ${actualReadFiles} files, exceeding the max-read policy of ${maxReadFiles}.`
    }));
  }
  if (Number(estimatedTokensRead) > targetTokens) {
    findings.push(contextBudgetFinding({
      code: "role_lane_token_budget_exceeded",
      actual: Number(estimatedTokensRead),
      limit: targetTokens,
      message: `${normalizedRole}/${normalizedLane} estimated ${estimatedTokensRead} read tokens, exceeding the target of ${targetTokens}.`
    }));
  }

  const hasViolations = findings.length > 0;
  const status = !hasViolations
    ? "pass"
    : normalizedMode === "strict"
      ? "block"
      : normalizedMode === "warn"
        ? "warn"
        : "advisory";
  const blocking = status === "block";
  const gateEffect = blocking ? "hard_fail" : status === "warn" ? "warn" : "advisory";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "context_budget_policy",
    contextBudgetPolicySchemaVersion: "context-budget-policy/v1",
    role: normalizedRole,
    lane: normalizedLane,
    mode: normalizedMode,
    status,
    ok: !blocking,
    blocking,
    exitCode: blocking ? 1 : 0,
    gateEffect,
    mutationPolicy: "read_only",
    authority: "policy_evidence_only",
    canRepair: false,
    canApprove: false,
    canClosePacket: false,
    canRelease: false,
    canAcceptResidualRisk: false,
    limits: { maxReadFiles, targetTokens },
    actual: { actualReadFiles: Number(actualReadFiles), estimatedTokensRead: Number(estimatedTokensRead) },
    findings,
    nextAction: buildContextBudgetNextAction({ status, normalizedMode })
  };
}

export function renderContextBudgetPolicyMarkdown(result) {
  const rows = result.findings.map((finding) => `| ${finding.code} | ${finding.actual} | ${finding.limit} | ${finding.nextAction} |`);
  return [
    "# Context Budget Policy",
    "",
    `Schema version: ${result.schemaVersion}`,
    `Role: ${result.role}`,
    `Lane: ${result.lane}`,
    `Mode: ${result.mode}`,
    `Status: ${result.status}`,
    `Gate effect: ${result.gateEffect}`,
    "",
    "## Authority",
    "",
    "No approval authority. This policy report cannot approve implementation, close packets, release, repair state, or accept residual risk.",
    "",
    "## Findings",
    "",
    "| Code | Actual | Limit | Next action |",
    "|---|---:|---:|---|",
    ...(rows.length > 0 ? rows : ["| none | 0 | 0 | No context budget action required. |"]),
    "",
    `Next action: ${result.nextAction}`
  ].join("\n") + "\n";
}

export function runPackagingReadinessCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const manifest = loadPackagingReadinessManifest({ repoRoot, options });
  const result = buildPackagingReadiness({ repoRoot, manifest });
  const outputPaths = [];
  if (apply) {
    outputPaths.push(writeJsonArtifact(outputDir, DEFAULT_PACKAGING_READINESS_JSON, result).relativePath);
    outputPaths.push(writeTextArtifact(outputDir, DEFAULT_PACKAGING_READINESS_MD, renderPackagingReadinessMarkdown(result)).relativePath);
  }
  return {
    command: "p2",
    subcommand: "packaging-readiness",
    apply,
    outputPaths,
    ...result
  };
}

export function buildPackagingReadiness({ repoRoot = process.cwd(), manifest = null } = {}) {
  const checks = Object.entries((manifest ?? buildDefaultPackagingReadinessManifest(repoRoot)).checks ?? {})
    .map(([key, value]) => normalizePackagingReadinessCheck({ repoRoot, key, value }));
  const findings = [];
  for (const check of checks) {
    if (["hold", "block", "warn"].includes(check.status)) {
      findings.push({
        code: packagingFindingCode(check.key, check.status),
        status: check.status,
        lane: check.lane,
        sourcePath: check.sourcePath,
        message: check.message,
        nextAction: check.nextAction
      });
    }
  }
  const decision = findings.some((finding) => finding.status === "block")
    ? "block"
    : findings.some((finding) => finding.status === "hold")
      ? "hold"
      : findings.some((finding) => finding.status === "warn")
        ? "warn"
        : "ready";
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    artifactType: "packaging_readiness_smoke",
    packagingReadinessSchemaVersion: "packaging-readiness/v1",
    authority: "evidence_only_no_release_authority",
    productDeploymentReadiness: "not_claimed",
    canDeploy: false,
    canPublish: false,
    canApproveRelease: false,
    canClosePacket: false,
    canCloseRisk: false,
    canAcceptResidualRisk: false,
    decision,
    ok: decision === "ready",
    blocking: ["block", "hold"].includes(decision),
    summary: {
      checks: checks.length,
      reusablePayload: checks.filter((check) => check.lane === "reusable_payload").length,
      initializedProject: checks.filter((check) => check.lane === "initialized_project").length,
      findings: findings.length
    },
    checks,
    findings,
    nextAction: findings[0]?.nextAction ?? "Packaging readiness smoke is clean; still use explicit release approval before publishing or deploying."
  };
}

export function renderPackagingReadinessMarkdown(result) {
  const rows = result.checks.map((check) => `| ${check.key} | ${check.lane} | ${check.status} | ${check.sourcePath ?? ""} | ${check.nextAction} |`);
  const findings = result.findings.map((finding) => `| ${finding.status} | ${finding.code} | ${finding.sourcePath ?? ""} | ${finding.nextAction} |`);
  return [
    "# Packaging Readiness Smoke",
    "",
    `Schema version: ${result.schemaVersion}`,
    `Decision: ${result.decision}`,
    `Blocking: ${result.blocking ? "yes" : "no"}`,
    "",
    "## Authority",
    "",
    "Evidence only. This report cannot publish, deploy, approve release readiness, close packets, close risks, accept residual risk, or prove product behavior.",
    "",
    "## Checks",
    "",
    "| Check | Lane | Status | Source | Next action |",
    "|---|---|---|---|---|",
    ...(rows.length > 0 ? rows : ["| none | none | hold |  | Add packaging readiness checks. |"]),
    "",
    "## Findings",
    "",
    "| Status | Code | Source | Next action |",
    "|---|---|---|---|",
    ...(findings.length > 0 ? findings : ["| pass | none |  | No packaging readiness findings. |"]),
    "",
    `Next action: ${result.nextAction}`
  ].join("\n") + "\n";
}

export function runAdapterManifestCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const target = safeTarget(options.target ?? "codex");
  if (target !== "codex" && !options.allowLegacyTarget) {
    return { ok: false, command: "p2", subcommand: "adapter-manifest", apply, outputPath: null, code: "non_codex_target_disabled", message: "standard-harness v2.6 is Codex-only. Use --allow-legacy-target only for migration diagnostics." };
  }
  const result = buildAdapterManifest({ repoRoot, target });
  let outputPath = null;
  if (apply) {
    outputPath = writeJsonArtifact(outputDir, `${DEFAULT_ADAPTER_DIR}/${target}.json`, result).relativePath;
  }
  return {
    ok: true,
    command: "p2",
    subcommand: "adapter-manifest",
    apply,
    outputPath,
    manifest: result
  };
}

export function buildAdapterManifest({ repoRoot = process.cwd(), target = "codex" } = {}) {
  const capabilityRegistry = readJsonIfExists(path.join(repoRoot, DEFAULT_CAPABILITY_REGISTRY)) ?? defaultCapabilityRegistry();
  const capabilitySafety = validateCapabilityRegistrySafety(capabilityRegistry);
  const workflows = listMarkdownFiles(path.join(repoRoot, ".agents", "workflows")).map((filePath) => path.basename(filePath, ".md"));
  return {
    schemaVersion: P2_SCHEMA_VERSION,
    target: safeTarget(target),
    generatedAt: new Date().toISOString(),
    adapterBoundary: {
      purpose: "Describe how another agent runtime may consume Standard Harness without changing canonical governance artifacts.",
      canonicalSourceOfTruth: [".agents/artifacts/*", "reference/packets/*", ".harness/operating_state.sqlite"],
      generatedOutputsAreNotAuthority: [".agents/runtime/*", "reference/reports/*"]
    },
    workflows,
    commands: {
      validate: "npm run harness:validate",
      context: "npm run harness:context",
      packetPreflight: "npm run harness:packet-preflight",
      p2Report: "npm run harness:p2 -- report --apply"
    },
    capabilities: capabilityRegistry,
    capabilitySafety,
    evidenceContracts: {
      tdd: "RED/GREEN/REFACTOR evidence for behavior-bearing code.",
      security: "Packet-bound CSO review report for high/security-risk work.",
      parallel: "Parallel batch plan with file-overlap/worktree policy.",
      compound: "Closeout learning note with staleness scan."
    }
  };
}

export function runConductorDashboardCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, options = {}, apply = false } = {}) {
  const dashboard = buildConductorDashboard({ repoRoot, dbPath });
  const artifacts = [];
  if (apply) {
    artifacts.push(writeJsonArtifact(outputDir, DEFAULT_DASHBOARD_JSON, dashboard).relativePath);
    artifacts.push(writeTextArtifact(outputDir, DEFAULT_DASHBOARD_MD, renderDashboardMarkdown(dashboard)).relativePath);
  }
  return {
    ok: true,
    command: "p2",
    subcommand: "dashboard",
    apply,
    artifacts,
    summary: dashboard.summary,
    dashboard
  };
}

export function buildConductorDashboard({ repoRoot = process.cwd(), dbPath = DEFAULT_DB_PATH, learning = null, automation = null } = {}) {
  const store = createOperatingStateStore({ dbPath: resolveDbPath(repoRoot, dbPath), createIfMissing: false, migrate: false });
  try {
    const validation = runValidator({ repoRoot, outputDir: repoRoot, dbPath });
    const workItems = store.listWorkItems();
    const decisions = store.listDecisions();
    const gateRisks = store.listGateRisks();
    const artifacts = store.listArtifacts();
    const learningScan = learning ?? scanLearningStaleness({ repoRoot });
    const automationScan = automation ?? detectAutomationCandidates({ repoRoot });
    const workByStatus = countBy(workItems, (item) => item.status ?? "unknown");
    const riskBySeverity = countBy(gateRisks, (risk) => risk.severity ?? "unknown");
    return {
      schemaVersion: P2_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      readOnlyEmptyState: Boolean(store.readOnlyEmptyState),
      summary: {
        validatorOk: validation.ok,
        blockingFindings: validation.findings.filter((finding) => finding.severity === "error").length,
        workItems: workItems.length,
        openDecisions: decisions.filter((decision) => decision.status === "open" && decision.decisionNeeded).length,
        openRisks: gateRisks.filter((risk) => risk.status === "open").length,
        staleLearnings: learningScan.stale.length,
        automationPromotions: automationScan.promotions.length
      },
      validation,
      workByStatus,
      riskBySeverity,
      artifactCount: artifacts.length,
      learning: summarizeLearningScan(learningScan),
      automation: summarizeAutomationScan(automationScan),
      conductorLoop: ["plan", "work", "review", "compound"],
      nextAction: automationScan.promotions.length > 0
        ? "Open a system-improvement packet for promoted automation candidates."
        : learningScan.stale.length > 0
          ? "Refresh stale compound learning notes."
          : validation.ok
            ? "Continue approved work under the conductor loop."
            : "Resolve validator blockers before execution."
    };
  } finally {
    store.close();
  }
}


export function runReviewScopeCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const result = validateReviewScopeArtifacts({ repoRoot, artifactDir: options.dir ?? options.artifactDir ?? DEFAULT_REVIEW_SCOPE_DIR });
  let outputPath = null;
  if (apply && options.example) {
    outputPath = writeJsonArtifact(outputDir, `${DEFAULT_REVIEW_SCOPE_DIR}/review-scope-example.json`, buildReviewScopeExample()).relativePath;
  }
  return { ok: result.ok, command: "p2", subcommand: "review-scope", apply, outputPath, ...result };
}

export function runReviewFindingsCommand({ repoRoot = process.cwd(), outputDir = repoRoot, options = {}, apply = false } = {}) {
  const result = validateReviewFindingArtifacts({ repoRoot, artifactDir: options.dir ?? options.artifactDir ?? DEFAULT_REVIEW_FINDINGS_DIR });
  let outputPath = null;
  if (apply && options.example) {
    outputPath = writeJsonArtifact(outputDir, `${DEFAULT_REVIEW_FINDINGS_DIR}/review-findings-example.json`, { findings: [buildReviewFindingExample()] }).relativePath;
  }
  return { ok: result.ok, command: "p2", subcommand: "review-findings", apply, outputPath, ...result };
}

export function validateReviewScopeArtifacts({ repoRoot = process.cwd(), artifactDir = DEFAULT_REVIEW_SCOPE_DIR } = {}) {
  const root = path.resolve(repoRoot);
  const files = collectJsonArtifactFiles(root, artifactDir);
  const findings = [];
  const scopes = [];
  for (const { relativePath, absolutePath } of files) {
    const scope = readJsonOrFinding(absolutePath, relativePath, findings, "review_scope_invalid_json");
    if (!scope) continue;
    scopes.push({ path: relativePath, baseRef: scope.base_ref ?? scope.baseRef, headRef: scope.head_ref ?? scope.headRef, changedFileCount: Array.isArray(scope.changed_files ?? scope.changedFiles) ? (scope.changed_files ?? scope.changedFiles).length : 0 });
    validateReviewScopeArtifact(scope, { artifactPath: relativePath, findings });
  }
  return { status: files.length === 0 ? "not-configured" : "validated", scopes, findings, ok: findings.every((finding) => finding.severity !== "error") };
}

export function validateReviewFindingArtifacts({ repoRoot = process.cwd(), artifactDir = DEFAULT_REVIEW_FINDINGS_DIR } = {}) {
  const root = path.resolve(repoRoot);
  const files = collectJsonArtifactFiles(root, artifactDir);
  const findings = [];
  const findingArtifacts = [];
  const fingerprints = new Map();
  for (const { relativePath, absolutePath } of files) {
    const artifact = readJsonOrFinding(absolutePath, relativePath, findings, "review_findings_invalid_json");
    if (!artifact) continue;
    const list = Array.isArray(artifact.findings) ? artifact.findings : [artifact];
    findingArtifacts.push({ path: relativePath, findingCount: list.length });
    for (const [index, finding] of list.entries()) {
      validateReviewFinding(finding, { artifactPath: relativePath, findingIndex: index, findings, fingerprints });
    }
  }
  return { status: files.length === 0 ? "not-configured" : "validated", findingArtifacts, findings, ok: findings.every((finding) => finding.severity !== "error") };
}

function validateReviewScopeArtifact(scope, { artifactPath, findings }) {
  for (const [field, value] of [
    ["base_ref", scope.base_ref ?? scope.baseRef],
    ["head_ref", scope.head_ref ?? scope.headRef],
    ["mode", scope.mode],
    ["review_mode", scope.review_mode ?? scope.reviewMode]
  ]) {
    if (!hasConcreteValue(value)) findings.push({ code: "review_scope_required_field_missing", severity: "error", artifactPath, field, message: `${artifactPath} is missing review scope field ${field}.` });
  }
  const mode = normalizePacketHeaderValue(scope.mode ?? "");
  if (mode && !REVIEW_SCOPE_MODES.has(mode)) findings.push({ code: "review_scope_mode_invalid", severity: "error", artifactPath, mode: scope.mode, expected: [...REVIEW_SCOPE_MODES].join(" | "), message: `${artifactPath} mode must describe the actual review scope source.` });
  const reviewMode = normalizePacketHeaderValue(scope.review_mode ?? scope.reviewMode ?? "");
  if (reviewMode && !["no-mutation", "read-only"].includes(reviewMode)) findings.push({ code: "review_scope_not_read_only", severity: "error", artifactPath, reviewMode, message: `${artifactPath} review_mode must be no-mutation/read-only.` });
  const changedFiles = scope.changed_files ?? scope.changedFiles;
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) findings.push({ code: "review_scope_changed_files_missing", severity: "error", artifactPath, message: `${artifactPath} must declare changed_files from the actual diff/base ref.` });
  for (const file of changedFiles ?? []) {
    const normalized = normalizeRelativePath(typeof file === "string" ? file : file.path);
    if (!normalized) findings.push({ code: "review_scope_changed_file_unsafe", severity: "error", artifactPath, file, message: `${artifactPath} contains unsafe changed file path.` });
  }
  const deletedFiles = scope.deleted_files ?? scope.deletedFiles ?? [];
  for (const file of deletedFiles) {
    const normalized = normalizeRelativePath(typeof file === "string" ? file : file.path);
    if ((normalized?.startsWith(".agents/") || normalized?.startsWith("reference/") || normalized?.startsWith(".harness/")) && !hasConcreteValue(scope.protected_artifact_deletion_approved_by ?? scope.protectedArtifactDeletionApprovedBy)) {
      findings.push({ code: "review_scope_protected_artifact_deletion_unapproved", severity: "error", artifactPath, file: normalized, message: `${artifactPath} deletes protected artifact ${normalized} without explicit approval.` });
    }
  }
}

function validateReviewFinding(finding, { artifactPath, findingIndex, findings, fingerprints }) {
  const required = ["id", "severity", "confidence", "reviewer", "file", "line", "title", "evidence", "recommendation", "fingerprint", "validation_status"];
  for (const field of required) {
    if (!hasConcreteValue(finding[field])) findings.push({ code: "review_finding_required_field_missing", severity: "error", artifactPath, findingIndex, field, message: `${artifactPath} finding ${findingIndex + 1} is missing ${field}.` });
  }
  const severity = normalizePacketHeaderValue(finding.severity ?? "");
  if (severity && !["p0", "p1", "p2", "p3"].includes(severity)) findings.push({ code: "review_finding_severity_invalid", severity: "error", artifactPath, findingIndex, findingSeverity: finding.severity, message: `${artifactPath} finding ${findingIndex + 1} severity must be P0-P3.` });
  const confidence = Number(finding.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) findings.push({ code: "review_finding_confidence_invalid", severity: "error", artifactPath, findingIndex, confidence: finding.confidence, message: `${artifactPath} finding ${findingIndex + 1} confidence must be 0-100.` });
  const status = normalizePacketHeaderValue(finding.validation_status ?? "");
  if (status && !["verified", "unverified", "tentative", "false-positive", "suppressed"].includes(status)) findings.push({ code: "review_finding_validation_status_invalid", severity: "error", artifactPath, findingIndex, status: finding.validation_status, message: `${artifactPath} finding ${findingIndex + 1} validation_status must be verified, unverified, tentative, false-positive, or suppressed.` });
  const secretFindings = scanSensitiveText(JSON.stringify(finding ?? {}));
  if (secretFindings.length > 0) {
    findings.push({ code: "review_finding_unredacted_secret_like_evidence", severity: "error", artifactPath, findingIndex, secretTypes: unique(secretFindings.map((secret) => secret.type)), message: `${artifactPath} finding ${findingIndex + 1} contains unredacted secret-like evidence.` });
  }
  const fingerprint = String(finding.fingerprint ?? "").trim();
  if (fingerprint) {
    const first = fingerprints.get(fingerprint);
    if (first) findings.push({ code: "review_finding_duplicate_fingerprint", severity: "error", artifactPath, findingIndex, fingerprint, duplicateOf: first, message: `${artifactPath} duplicates review finding fingerprint ${fingerprint}; dedupe before closeout.` });
    else fingerprints.set(fingerprint, artifactPath);
  }
}

function buildReviewScopeExample() {
  return { schemaVersion: P2_SCHEMA_VERSION, base_ref: "origin/main", head_ref: "HEAD", mode: "local_branch", review_mode: "no-mutation", changed_files: ["src/example.ts"], deleted_files: [], protected_artifact_deletion_approved_by: null };
}

function buildReviewFindingExample() {
  return { id: "REV-001", severity: "P2", confidence: 85, reviewer: "staff-engineer", file: "src/example.ts", line: 1, title: "Example finding", evidence: "quoted evidence", recommendation: "fix recommendation", fingerprint: "sha256:example", validation_status: "verified" };
}

export function runPlanQualityCommand({ repoRoot = process.cwd(), options = {} } = {}) {
  const packetPath = options.packet ?? options.packetPath;
  if (!packetPath) {
    return { ok: false, command: "p2", subcommand: "plan-quality", message: "Missing --packet path." };
  }
  const packet = readPacket(repoRoot, packetPath);
  if (!packet) {
    return { ok: false, command: "p2", subcommand: "plan-quality", message: `Packet not found: ${packetPath}.` };
  }
  const result = evaluatePlanQuality({ packet, stage: options.stage ?? "planning-open" });
  return { command: "p2", subcommand: "plan-quality", packetPath, ...result };
}

export function evaluatePlanQuality({ packet, stage = "planning-open" } = {}) {
  const content = packet?.content ?? "";
  const diagnostics = [];
  requireSectionText(content, "## 1. Goal", "Goal", diagnostics);
  requireSectionText(content, "## 2. Non-Goal", "Non-Goal", diagnostics);
  requireSectionText(content, "## 3. User Problem And Expected Outcome", "User Problem And Expected Outcome", diagnostics);
  requireAcceptance(content, diagnostics);
  const readyForCode = normalizePacketHeaderValue(packet?.header.readyForCode ?? readPacketHeaderValueFromContent(content, "Ready For Code") ?? "");
  const userFacingImpact = normalizePacketHeaderValue(packet?.header.userFacingImpact ?? readPacketHeaderValueFromContent(content, "User-facing impact") ?? "none");
  const shipValue = sliceSection(content, "## Ship Value Contract");
  if ((readyForCode === "approved" || stage === "closeout") && userFacingImpact !== "none") {
    if (!shipValue) {
      diagnostics.push(buildPlanDiagnostic("Ship Value Contract", "block", "missing", "user-visible value and human taste decision", "User-facing Ready For Code work must state the ship value contract."));
    } else {
      for (const field of ["User-visible value", "Human taste decision", "Ship decision"]) {
        if (!hasConcreteValue(readPacketBulletFieldValueFromContent(shipValue, field))) {
          diagnostics.push(buildPlanDiagnostic(field, "block", "missing", "concrete value", `${field} must be closed for user-facing work.`));
        }
      }
    }
  } else if (!shipValue) {
    diagnostics.push(buildPlanDiagnostic("Ship Value Contract", "warn", "missing", "recommended", "Plans-as-code prefers explicit value/taste/ship boundary even when not user-facing."));
  }
  const allocation = sliceSection(content, "## 50/50 Allocation Review");
  if (stage === "closeout" && !allocation) {
    diagnostics.push(buildPlanDiagnostic("50/50 Allocation Review", "warn", "missing", "feature/system improvement allocation", "Closeout should record reusable learning or system-improvement disposition."));
  }
  const blocking = diagnostics.some((diagnostic) => diagnostic.status === "block");
  return {
    ok: !blocking,
    schemaVersion: P2_SCHEMA_VERSION,
    stage,
    diagnostics,
    blocking
  };
}


function detectLearningOverlap(notes) {
  const grouped = new Map();
  for (const note of notes) {
    const key = normalizeCandidate([note.track, note.problemType, note.component].filter(Boolean).join(" "));
    if (!key) continue;
    const peers = grouped.get(key) ?? [];
    peers.push(note.path);
    grouped.set(key, peers);
  }
  return [...grouped.entries()].filter(([, peers]) => peers.length > 1).map(([key, peers]) => ({ code: "learning_high_overlap_update_existing_recommended", key, notePaths: peers, recommendation: "Update/consolidate an existing solution note instead of creating a duplicate." }));
}

function validateCapabilityRegistrySafety(registry) {
  const findings = [];
  const serialized = JSON.stringify(registry ?? {});
  const secretFindings = scanSensitiveText(serialized);
  if (secretFindings.length > 0) findings.push({ code: "adapter_manifest_secret_like_value", severity: "error", secretTypes: secretFindings.map((finding) => finding.type), message: "Capability registry/adapter manifest contains secret-like values. Use placeholders or references only." });
  for (const candidatePath of collectPotentialAdapterPaths(registry)) {
    if (!normalizeRelativePath(candidatePath)) findings.push({ code: "adapter_manifest_unsafe_path", severity: "error", path: candidatePath, message: "Adapter manifest contains unsafe path; use repository-relative paths only." });
  }
  return { ok: findings.every((finding) => finding.severity !== "error"), findings };
}

function collectPotentialAdapterPaths(value) {
  const paths = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    for (const [key, val] of Object.entries(node)) {
      if (/path|paths|mount|mounts|write/i.test(key)) {
        if (Array.isArray(val)) paths.push(...val.map((item) => typeof item === "string" ? item : item?.path));
        else if (typeof val === "string") paths.push(val);
      }
      if (typeof val === "object") walk(val);
    }
  }
  walk(value);
  return paths.filter(Boolean);
}

function collectJsonArtifactFiles(root, artifactDir) {
  const normalized = normalizeRelativePath(artifactDir);
  if (!normalized) return [];
  const absoluteDir = path.resolve(root, normalized);
  if (!isInside(root, absoluteDir) || !fs.existsSync(absoluteDir)) return [];
  const stat = fs.statSync(absoluteDir);
  if (stat.isFile()) return [{ relativePath: normalized, absolutePath: absoluteDir }];
  return fs.readdirSync(absoluteDir).filter((file) => file.endsWith(".json")).sort().map((file) => ({ relativePath: path.posix.join(normalized, file), absolutePath: path.join(absoluteDir, file) }));
}

function readJsonOrFinding(absolutePath, relativePath, findings, code) {
  try { return JSON.parse(fs.readFileSync(absolutePath, "utf8")); }
  catch (error) { findings.push({ code, severity: "error", artifactPath: relativePath, message: `${relativePath} is not valid JSON: ${error.message}` }); return null; }
}

function resolveWorkItem({ store, repoRoot, workItemId }) {
  if (workItemId) {
    return store.getWorkItem(workItemId);
  }
  return selectActiveWorkItem(store.listWorkItems(), { repoRoot }) ?? store.listWorkItems()[0] ?? null;
}

function readPacket(repoRoot, packetPath) {
  const normalized = normalizeRelativePath(packetPath);
  if (!normalized) {
    return null;
  }
  const absolutePath = path.resolve(repoRoot, normalized);
  if (!isInside(repoRoot, absolutePath) || !fs.existsSync(absolutePath)) {
    return null;
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  return {
    path: normalized,
    absolutePath,
    content,
    header: {
      readyForCode: readPacketHeaderValueFromContent(content, "Ready For Code"),
      gateProfile: readPacketHeaderValueFromContent(content, "Gate profile"),
      riskClass: readPacketHeaderValueFromContent(content, "Risk class"),
      riskIfStarted: readPacketHeaderValueFromContent(content, "Risk if started now"),
      changeZone: readPacketHeaderValueFromContent(content, "Change zone"),
      userFacingImpact: readPacketHeaderValueFromContent(content, "User-facing impact"),
      activeProfileDependencies: readPacketHeaderValueFromContent(content, "Active profile dependencies"),
      changedFiles: readPacketBulletFieldValueFromContent(content, "Changed files")
    }
  };
}

function loadReviewerProfileCatalog(repoRoot) {
  const external = readJsonIfExists(path.join(repoRoot, DEFAULT_REVIEWER_PROFILE_CATALOG));
  const defaultProfiles = defaultReviewerProfileCatalog();
  if (!external?.profiles || typeof external.profiles !== "object") {
    return defaultProfiles;
  }
  return { ...defaultProfiles, ...external.profiles };
}

function defaultReviewerProfileCatalog() {
  return {
    "qa-lead": {
      profileId: "qa-lead",
      label: "QA Lead",
      mode: "qa",
      focus: ["acceptance evidence", "regression", "failure fixtures"]
    },
    cso: {
      profileId: "cso",
      label: "Chief Security Officer",
      mode: "cso",
      focus: ["threat model", "secret handling", "auth/permission", "supply chain"]
    },
    "data-correctness": {
      profileId: "data-correctness",
      label: "Data Correctness Reviewer",
      mode: "data-review",
      focus: ["authoritative sources", "spreadsheet mapping", "metric lineage", "reconciliation"]
    },
    governance: {
      profileId: "governance",
      label: "Governance Reviewer",
      mode: "governance",
      focus: ["approval boundary", "roles", "audit events", "state transitions"]
    },
    "staff-engineer": {
      profileId: "staff-engineer",
      label: "Staff Engineer",
      mode: "staff-engineer",
      focus: ["architecture", "contracts", "integration boundaries", "load-bearing changes"]
    },
    "release-sre": {
      profileId: "release-sre",
      label: "Release/SRE Reviewer",
      mode: "release-sre",
      focus: ["cutover", "rollback", "monitoring", "operational safety"]
    },
    "ux-reviewer": {
      profileId: "ux-reviewer",
      label: "UX Reviewer",
      mode: "ux-review",
      focus: ["human taste decision", "interaction", "user-visible ship value"]
    },
    "automation-governor": {
      profileId: "automation-governor",
      label: "Automation Governor",
      mode: "compound-system",
      focus: ["50/50 allocation", "automation promotion", "learning capture"]
    }
  };
}

function addProfile(target, catalog, profileId, reason) {
  const profile = catalog[profileId] ?? { profileId, label: profileId, mode: profileId, focus: [] };
  const existing = target.get(profileId);
  if (existing) {
    existing.reasons.push(reason);
    return;
  }
  target.set(profileId, { ...profile, reasons: [reason] });
}

function buildReviewerSignals({ text, activeProfiles = [], changedFiles = [], risk = "normal", gateProfile = "standard", changeZone = "" } = {}) {
  const positiveText = stripReviewerNegativePhrases(text);
  const negative = [];
  const positive = [];
  const suppressed = [];
  const activeProfileSet = new Set(activeProfiles);
  const highRisk = ["high", "critical"].includes(normalizePacketHeaderValue(risk));
  const resolvedGateProfile = normalizePacketHeaderValue(gateProfile);
  const resolvedChangeZone = normalizePacketHeaderValue(changeZone);
  const localOnlyNoExternalSurface = hasLocalOnlyNoExternalSurface(text, activeProfileSet, changedFiles);

  if (localOnlyNoExternalSurface) {
    negative.push({
      code: "local_only_no_external_surface",
      reason: "Explicit local-only/browser-only scope with no auth, DB/API, deployment, or external network surface."
    });
  }

  if (highRisk || activeProfiles.some((id) => ["PRF-06", "PRF-10"].includes(id)) || matchesAny(positiveText, SECURITY_PATTERNS)) {
    positive.push({ profileId: "cso", code: "security_surface" });
  }
  if (activeProfiles.some((id) => ["PRF-02", "PRF-10"].includes(id)) || matchesAny(positiveText, DATA_PATTERNS)) {
    positive.push({ profileId: "data-correctness", code: "data_surface" });
  }
  const governancePatterns = localOnlyNoExternalSurface ? STRONG_GOVERNANCE_PATTERNS : GOVERNANCE_PATTERNS;
  if (activeProfileSet.has("PRF-06") || matchesAny(positiveText, governancePatterns)) {
    positive.push({ profileId: "governance", code: "governance_surface" });
  }
  if (["core", "load-bearing"].includes(resolvedChangeZone) || ["contract", "release"].includes(resolvedGateProfile) || matchesAny(positiveText, CORE_PATTERNS)) {
    positive.push({ profileId: "staff-engineer", code: "core_surface" });
  }
  if (matchesAny(positiveText, RELEASE_PATTERNS) || resolvedGateProfile === "release") {
    positive.push({ profileId: "release-sre", code: "release_surface" });
  }

  return {
    localOnlyNoExternalSurface,
    positive: uniqueProfileSignals(positive),
    negative,
    suppressed
  };
}

function hasLocalOnlyNoExternalSurface(text, activeProfileSet, changedFiles) {
  const value = String(text ?? "");
  const lower = value.toLowerCase();
  const hasLocalOnly = /\blocal[- ]only\b|\bclient[- ]only\b|\bstatic browser\b|\bbrowser[- ]only\b|\blocal browser\b/.test(lower);
  const hasNoAuth = /\bno\s+auth(?:entication)?\b/.test(lower);
  const hasNoDataStore = /\bno\s+(?:db|database|sql|schema|migration)\b/.test(lower);
  const hasNoApi = /\bno\s+(?:api|backend api|external api)\b/.test(lower);
  const hasNoDeploy = /\bno\s+(?:deploy|deployment|release)\b/.test(lower);
  const hasNoExternal = /\bno\s+external\s+(?:network|integration|api|service)\b/.test(lower);
  const looksLocalFiles = changedFiles.length > 0 && changedFiles.every((file) => !/\.github[\\/]|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$|bun\.lockb?$|server|api|migration|schema|database|sql/i.test(String(file)));
  const hasPrf07Only = activeProfileSet.has("PRF-07") && !["PRF-02", "PRF-06", "PRF-10"].some((id) => activeProfileSet.has(id));
  const negativeCount = [hasNoAuth, hasNoDataStore, hasNoApi, hasNoDeploy, hasNoExternal].filter(Boolean).length;
  return hasLocalOnly && negativeCount >= 3 && (hasPrf07Only || looksLocalFiles);
}

function stripReviewerNegativePhrases(text) {
  return String(text ?? "")
    .replace(/\bno\s+auth(?:entication)?\b/gi, "")
    .replace(/\bno\s+(?:db|database|sql|schema|migration)\b/gi, "")
    .replace(/\bno\s+(?:api|backend api|external api)\b/gi, "")
    .replace(/\bno\s+(?:deploy|deployment|release)\b/gi, "")
    .replace(/\bno\s+external\s+(?:network|integration|api|service)\b/gi, "")
    .replace(/\bno\s+roles?\b/gi, "")
    .replace(/\bno\s+rbac\b/gi, "")
    .replace(/\bno\s+audit\s+logs?\b/gi, "")
    .replace(/\bno\s+governance\s+policy\b/gi, "")
    .replace(/\bnot\s+a\s+business\s+approval\s+workflow\b/gi, "");
}

function uniqueProfileSignals(signals) {
  const seen = new Set();
  return signals.filter((signal) => {
    const key = `${signal.profileId}:${signal.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(String(text ?? "")));
}

function listRefactorAuditFiles(root, hotspotPaths) {
  const results = [];
  for (const hotspot of hotspotPaths) {
    const start = path.join(root, hotspot);
    if (!fs.existsSync(start)) {
      continue;
    }
    const stat = fs.statSync(start);
    if (stat.isFile()) {
      if (/\.(?:js|mjs|cjs|ts|tsx|jsx|md)$/i.test(start)) {
        results.push(normalizeRelativePath(path.relative(root, start)));
      }
      continue;
    }
    for (const file of walkFiles(start)) {
      if (/\.(?:js|mjs|cjs|ts|tsx|jsx|md)$/i.test(file)) {
        results.push(normalizeRelativePath(path.relative(root, file)));
      }
    }
  }
  return unique(results).sort();
}

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(absolute));
    } else if (entry.isFile()) {
      results.push(absolute);
    }
  }
  return results;
}

function detectPromptInjectionSignals(text) {
  const patterns = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /developer\s+message/i,
    /system\s+prompt/i,
    /send\s+(?:the\s+)?(?:token|secret|credential)/i,
    /approve\s+(?:the\s+)?(?:release|packet|risk)/i
  ];
  return patterns
    .filter((pattern) => pattern.test(String(text ?? "")))
    .map((pattern) => ({ pattern: String(pattern), handling: "evidence_only" }));
}

function buildStructureDebtFinding({ code, path: findingPath, severity = "info", confidence = "low", rationale, nextAction, recommendedPacketType = "refactor", details = {} }) {
  return {
    code,
    path: findingPath,
    severity,
    confidence,
    rationale,
    nextAction,
    recommendedPacketType,
    gateEffect: "advisory",
    ...details
  };
}

function detectDuplicateCommandWiring(fileRecords) {
  const commands = new Map();
  for (const record of fileRecords) {
    for (const match of record.content.matchAll(/harness:[A-Za-z0-9:_-]+/g)) {
      const command = match[0];
      const current = commands.get(command) ?? [];
      current.push(record.file);
      commands.set(command, current);
    }
  }
  const findings = [];
  for (const [command, paths] of commands.entries()) {
    const uniquePaths = unique(paths);
    if (uniquePaths.length > 1) {
      findings.push(buildStructureDebtFinding({
        code: "duplicate_command_wiring",
        path: uniquePaths[0],
        severity: "medium",
        confidence: "high",
        rationale: `Command ${command} is wired in multiple files: ${uniquePaths.join(", ")}.`,
        nextAction: "Open a refactor packet to consolidate command wiring behind one dispatch surface.",
        details: { command, duplicatePaths: uniquePaths }
      }));
    }
  }
  return findings;
}

function detectCircularImports(fileRecords) {
  const byPath = new Map(fileRecords.map((record) => [normalizeSlash(record.file), record]));
  const edges = new Map();
  for (const record of fileRecords) {
    const from = normalizeSlash(record.file);
    const imports = [];
    for (const match of record.content.matchAll(/import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const resolved = normalizeSlash(path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier.endsWith(".js") ? specifier : `${specifier}.js`)));
      if (byPath.has(resolved)) imports.push(resolved);
    }
    edges.set(from, imports);
  }
  const findings = [];
  for (const [from, imports] of edges.entries()) {
    for (const target of imports) {
      if ((edges.get(target) ?? []).includes(from) && from < target) {
        findings.push(buildStructureDebtFinding({
          code: "circular_import",
          path: from,
          severity: "high",
          confidence: "high",
          rationale: `Circular import detected between ${from} and ${target}.`,
          nextAction: "Open a refactor packet to extract shared contracts or invert one dependency.",
          details: { cycle: [from, target] }
        }));
      }
    }
  }
  return findings;
}

function detectBoundaryViolations(fileRecords) {
  const findings = [];
  for (const record of fileRecords) {
    const normalized = normalizeSlash(record.file);
    if (/\.harness\/runtime\//.test(normalized) && /reference\/manuals|manuals\//.test(record.content.replace(/\\/g, "/"))) {
      findings.push(buildStructureDebtFinding({
        code: "boundary_violation",
        path: record.file,
        severity: "high",
        confidence: "medium",
        rationale: "Runtime code imports or references manual-facing content, crossing runtime/manual boundaries.",
        nextAction: "Open a refactor packet to move shared constants into a runtime-safe reference module."
      }));
    }
    if (/reference\/manuals\//.test(normalized) && /\.harness\/runtime/.test(record.content.replace(/\\/g, "/"))) {
      findings.push(buildStructureDebtFinding({
        code: "boundary_violation",
        path: record.file,
        severity: "medium",
        confidence: "medium",
        rationale: "Manual content depends on runtime internals instead of documented command surfaces.",
        nextAction: "Open a documentation refactor packet to replace runtime internals with public commands.",
        recommendedPacketType: "documentation-refactor"
      }));
    }
  }
  return findings;
}

function detectRepeatedLogicCandidates(fileRecords) {
  const bodies = new Map();
  for (const record of fileRecords) {
    const normalizedBody = record.content
      .replace(/\/\/.*$/gm, "")
      .replace(/\s+/g, " ")
      .trim();
    if (normalizedBody.length < 40) continue;
    const current = bodies.get(normalizedBody) ?? [];
    current.push(record.file);
    bodies.set(normalizedBody, current);
  }
  const findings = [];
  for (const paths of bodies.values()) {
    const uniquePaths = unique(paths);
    if (uniquePaths.length > 1) {
      findings.push(buildStructureDebtFinding({
        code: "repeated_logic_candidate",
        path: uniquePaths[0],
        severity: "medium",
        confidence: "medium",
        rationale: `Similar implementation body appears in ${uniquePaths.length} files.`,
        nextAction: "Open a refactor packet to extract shared helper logic if behavior is intentionally duplicated.",
        details: { duplicatePaths: uniquePaths }
      }));
    }
  }
  return findings;
}

function normalizeSlash(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function parseAdvisoryJsonOption(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function normalizeAdvisoryInputPackage(inputPackage) {
  const validationFindings = [];
  if (!inputPackage || typeof inputPackage !== "object") {
    validationFindings.push({ status: "block", code: "missing_input_package", message: "Advisory AI review requires an input package." });
  }
  const pkg = inputPackage && typeof inputPackage === "object" ? inputPackage : {};
  const packageInput = pkg.inputPackage && typeof pkg.inputPackage === "object" ? pkg.inputPackage : {};
  if (!pkg.packetPath) validationFindings.push({ status: "block", code: "missing_packet_path", message: "Input package must include packetPath." });
  if (!pkg.workItemId) validationFindings.push({ status: "block", code: "missing_work_item_id", message: "Input package must include workItemId." });
  if (!packageInput.redactedText && packageInput.redactedText !== "") {
    validationFindings.push({ status: "block", code: "missing_redacted_text", message: "Input package must include redactedText." });
  }
  const redactedText = String(packageInput.redactedText ?? "");
  const secretFindings = scanSensitiveText(redactedText);
  if (secretFindings.length > 0) {
    validationFindings.push({ status: "block", code: "unredacted_secret_in_input_package", message: "Input package contains unredacted secret-like material." });
  }
  return {
    provider: pkg.provider ?? "mock-offline",
    packetPath: pkg.packetPath ?? "",
    workItemId: pkg.workItemId ?? "",
    deterministicDecision: pkg.deterministicDecision ?? "not-run",
    aiDecision: pkg.aiDecision ?? "not-run",
    disagreementDisposition: pkg.disagreementDisposition ?? "no_disagreement",
    promptInjectionFindings: Array.isArray(packageInput.promptInjectionFindings) ? packageInput.promptInjectionFindings : [],
    secretFindingCount: Number(packageInput.secretFindingCount ?? 0),
    redactionApplied: redactedText !== String(packageInput.rawText ?? redactedText) || redactedText.includes("REDACTED"),
    bounded: packageInput.bounded !== false,
    maxChars: Number(packageInput.maxChars ?? 4000),
    validationFindings
  };
}

function normalizeAdvisoryOutput(mockOutput) {
  const validationFindings = [];
  const output = mockOutput && typeof mockOutput === "object" ? mockOutput : {};
  const rawFindings = Array.isArray(output.findings) ? output.findings : [];
  if (!Array.isArray(output.findings)) {
    validationFindings.push({ status: "block", code: "missing_findings_array", message: "Advisory output must include a findings array." });
  }
  const findings = rawFindings.map((finding, index) => {
    const normalized = {
      findingId: stringOrEmpty(finding.findingId ?? finding.id),
      severity: normalizeAdvisorySeverity(finding.severity),
      category: stringOrEmpty(finding.category),
      file: stringOrEmpty(finding.file ?? finding.path),
      line: finding.line == null ? null : Number(finding.line),
      evidenceQuote: stringOrEmpty(finding.evidenceQuote ?? finding.evidenceQuoteRedacted ?? finding.evidence_quote_redacted),
      recommendation: stringOrEmpty(finding.recommendation),
      disposition: normalizeAdvisoryDisposition(finding.disposition)
    };
    if (!normalized.findingId) validationFindings.push({ status: "block", code: "missing_finding_id", message: `Finding ${index + 1} must include findingId.` });
    if (!normalized.severity) validationFindings.push({ status: "block", code: "invalid_severity", message: `Finding ${index + 1} has unsupported severity.` });
    if (!normalized.category) validationFindings.push({ status: "block", code: "missing_category", message: `Finding ${index + 1} must include category.` });
    if (!normalized.recommendation) validationFindings.push({ status: "block", code: "missing_recommendation", message: `Finding ${index + 1} must include recommendation.` });
    if (!normalized.disposition) validationFindings.push({ status: "block", code: "invalid_disposition", message: `Finding ${index + 1} has unsupported disposition.` });
    return normalized;
  });
  return { findings, validationFindings };
}

function normalizeAdvisoryGuardOverlays(guardOverlays) {
  const list = Array.isArray(guardOverlays) ? guardOverlays : [];
  return list.map((overlay) => ({
    kind: sanitizeDigestSurfaceName(overlay.kind ?? overlay.name ?? "overlay"),
    status: normalizeDigestStatus(overlay.status ?? "warn"),
    nextAction: overlay.nextAction ?? overlay.message ?? "Review guard overlay before closeout."
  }));
}

function normalizeAdvisoryDisagreement(inputPackage) {
  if (inputPackage.deterministicDecision !== inputPackage.aiDecision && inputPackage.aiDecision !== "not-run") {
    return {
      deterministicDecision: inputPackage.deterministicDecision,
      aiDecision: inputPackage.aiDecision,
      disposition: "needs-human-review"
    };
  }
  return {
    deterministicDecision: inputPackage.deterministicDecision,
    aiDecision: inputPackage.aiDecision,
    disposition: "deferred"
  };
}

function normalizeAdvisorySeverity(value) {
  const severity = String(value ?? "").trim().toLowerCase();
  return new Set(["critical", "high", "medium", "low", "info"]).has(severity) ? severity : "";
}

function normalizeAdvisoryDisposition(value) {
  const disposition = String(value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "-");
  return new Set(["accepted", "rejected", "needs-human-review", "deferred"]).has(disposition) ? disposition : "";
}

function stringOrEmpty(value) {
  return String(value ?? "").trim();
}

function buildDirectionalPilotEvidence(evidence, repoRoot = process.cwd()) {
  const defaults = {
    tdd: { status: "pending", command: "node --test .harness/test/v2-p2-conductor.test.js", note: "RED/GREEN pilot fixture evidence." },
    cleanPayload: { status: "pending", command: "npm.cmd run harness:payload-boundary", note: "Clean reusable starter payload boundary." },
    initializedProject: { status: "pending", command: "npm.cmd test", note: "Initialized project runtime and tests." },
    productVerification: { status: "warn", command: "product-specific acceptance command", note: "Product behavior evidence is separate from harness validation." },
    harnessValidation: { status: "pending", command: "python tools\\harness_cli.py validate", note: "Harness structural/state validation only." },
    browserEvidence: { status: "not_required", command: "npm run browser:evidence:audit", note: "Use pass only for real-browser or policy-approved conditional evidence." },
    securityReview: { status: "pending", command: "python tools\\harness_cli.py security-review --path final-artifacts\\standard-harness --write-report", note: "Packet-bound security review evidence." },
    compoundLearning: { status: "pending", command: "write solution memory", note: "Reusable learning captured when applicable." },
    contextBudget: { status: "pending", command: "npm run harness:context-meter -- --enforcement warn --role reviewer", note: "Context budget evidence." },
    manualFollowing: { status: "pending", command: "follow reference/artifacts/DIRECTIONAL_REGRESSION_PILOT.md", note: "Future-agent runbook is checked in." },
    closeoutPreflight: { status: "pending", command: "npm run harness:packet-preflight -- --stage closeout", note: "Closeout evidence preflight." }
  };
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const supplied = evidence?.[key] ?? {};
    const requestedStatus = normalizePilotStatus(supplied.status ?? fallback.status);
    const artifact = inspectPilotEvidenceArtifact(repoRoot, supplied.artifactPath ?? supplied.artifact?.path, supplied.artifactSha256 ?? supplied.artifact?.sha256);
    const provenance = normalizePilotProvenance(supplied.provenance);
    const integrityFindings = [];
    const command = String(supplied.command ?? fallback.command);
    const exitCode = supplied.exitCode ?? supplied.exit_code ?? null;
    const cwd = supplied.cwd == null ? null : String(supplied.cwd);
    const timestamp = supplied.timestamp == null ? null : String(supplied.timestamp);
    const sourceLane = supplied.sourceLane ?? supplied.source_lane ?? key;

    if (hasStrictPilotEvidenceFields(supplied)) {
      if (!command) {
        integrityFindings.push({ code: "command_missing", status: "hold", message: "Evidence record must include the command that produced the evidence." });
      }
      if (!Number.isInteger(exitCode)) {
        integrityFindings.push({ code: "exit_code_missing", status: "hold", message: "Evidence record must include an integer exitCode." });
      }
      if (!cwd) {
        integrityFindings.push({ code: "cwd_missing", status: "warn", message: "Evidence record should include the command cwd." });
      }
      if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
        integrityFindings.push({ code: "timestamp_invalid", status: "warn", message: "Evidence record should include a valid timestamp." });
      }
      if (String(sourceLane) !== key) {
        integrityFindings.push({ code: "source_lane_mismatch", status: "hold", message: `Evidence sourceLane '${sourceLane}' does not match lane '${key}'.` });
      }
      if (requestedStatus === "pass" && provenance === "manual") {
        integrityFindings.push({ code: "manual_pass_requires_artifact", status: "hold", message: "Manual evidence cannot produce pass without generated artifact proof." });
      }
      if (requestedStatus === "pass" && !artifact.path) {
        integrityFindings.push({ code: "artifact_path_missing", status: "hold", message: "Pass evidence must include an artifactPath." });
      }
      if (artifact.path && !artifact.exists) {
        integrityFindings.push({ code: "artifact_missing", status: "hold", message: `Evidence artifact does not exist: ${artifact.path}.` });
      }
      if (artifact.sha256 && artifact.exists && !artifact.sha256Matches) {
        integrityFindings.push({ code: "artifact_hash_mismatch", status: "hold", message: `Evidence artifact hash does not match: ${artifact.path}.` });
      }
      if (requestedStatus === "pass" && Number.isInteger(exitCode) && exitCode !== 0) {
        integrityFindings.push({ code: "pass_exit_code_nonzero", status: "hold", message: "Pass evidence requires exitCode 0." });
      }
    }
    const status = integrityFindings.some((finding) => finding.status === "block")
      ? "block"
      : integrityFindings.some((finding) => finding.status === "hold")
        ? "hold"
        : requestedStatus;
    return [
      key,
      {
        status,
        requestedStatus,
        command,
        exitCode,
        cwd,
        timestamp,
        sourceLane: String(sourceLane),
        provenance,
        artifact,
        integrityFindings,
        note: String(supplied.note ?? fallback.note)
      }
    ];
  }));
}

function readDirectionalEvidenceFile(repoRoot, filePath) {
  const absolutePath = path.isAbsolute(String(filePath)) ? String(filePath) : path.resolve(repoRoot, String(filePath));
  if (!isInside(repoRoot, absolutePath)) {
    throw new Error(`Evidence file escapes repository root: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function hasSuppliedPilotEvidence(value) {
  return value && typeof value === "object" && Object.keys(value).length > 0;
}

function hasStrictPilotEvidenceFields(value) {
  if (!hasSuppliedPilotEvidence(value)) {
    return false;
  }
  return ["exitCode", "exit_code", "cwd", "timestamp", "artifactPath", "artifact", "artifactSha256", "sourceLane", "source_lane", "provenance"].some((key) => Object.hasOwn(value, key));
}

function normalizePilotProvenance(value) {
  const provenance = String(value ?? "default").trim().toLowerCase().replace(/-/g, "_");
  return ["generated", "manual", "default", "imported"].includes(provenance) ? provenance : "manual";
}

function inspectPilotEvidenceArtifact(repoRoot, artifactPath, expectedSha256) {
  const normalized = normalizeRelativePath(artifactPath);
  if (!normalized) {
    return {
      path: artifactPath ? String(artifactPath) : null,
      exists: false,
      sha256: expectedSha256 ? String(expectedSha256) : null,
      actualSha256: null,
      sha256Matches: false
    };
  }
  const absolutePath = path.resolve(repoRoot, normalized);
  const exists = isInside(repoRoot, absolutePath) && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  const actualSha256 = exists ? crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex") : null;
  const sha256 = expectedSha256 ? String(expectedSha256) : null;
  return {
    path: normalized,
    exists,
    sha256,
    actualSha256,
    sha256Matches: Boolean(sha256 && actualSha256 && sha256 === actualSha256)
  };
}

function evaluateDirectionalPilotIntegrity(requiredEvidence) {
  const findings = [];
  for (const [lane, item] of Object.entries(requiredEvidence)) {
    if (["pending", "missing"].includes(item.status)) {
      findings.push({
        lane,
        code: "pilot_lane_missing",
        status: "hold",
        message: `Lane '${lane}' still needs completed evidence.`
      });
    } else if (["block", "blocked_environment", "not_run_agent_error"].includes(item.status)) {
      findings.push({
        lane,
        code: "pilot_lane_blocked",
        status: "hold",
        message: `Lane '${lane}' is not passable and must remain visible as ${item.status}.`
      });
    } else if (["warn", "hold"].includes(item.status)) {
      findings.push({
        lane,
        code: "pilot_lane_not_pass",
        status: item.status,
        message: `Lane '${lane}' is ${item.status} and cannot be counted as pass.`
      });
    }
    for (const finding of item.integrityFindings ?? []) {
      findings.push({ lane, ...finding });
    }
  }
  return {
    ok: findings.length === 0,
    blocking: findings.filter((finding) => finding.status === "block").length,
    holds: findings.filter((finding) => finding.status === "hold").length,
    warnings: findings.filter((finding) => finding.status === "warn").length,
    findings
  };
}

function loadRequirementTraceRows({ repoRoot = process.cwd(), options = {} } = {}) {
  if (options.rows) {
    const parsed = JSON.parse(String(options.rows));
    return Array.isArray(parsed) ? parsed : parsed.rows ?? [];
  }
  const traceFile = options.traceFile ?? options.trace ?? options.matrix;
  if (traceFile) {
    const normalized = normalizeRelativePath(traceFile);
    const absolutePath = normalized ? path.resolve(repoRoot, normalized) : null;
    if (!absolutePath || !isInside(repoRoot, absolutePath)) {
      throw new Error(`Trace matrix file escapes repository root: ${traceFile}`);
    }
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    return Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.requirements ?? [];
  }
  const defaultTrace = path.resolve(repoRoot, "reference/evidence/trace-matrix.json");
  if (fs.existsSync(defaultTrace)) {
    const parsed = JSON.parse(fs.readFileSync(defaultTrace, "utf8"));
    return Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.requirements ?? [];
  }
  return [];
}

function loadOperatorDigestSurfaces({ repoRoot = process.cwd(), options = {} } = {}) {
  if (options.surfaces) {
    return JSON.parse(String(options.surfaces));
  }
  const digestFile = options.digestFile ?? options.file;
  if (digestFile) {
    const normalized = normalizeRelativePath(digestFile);
    const absolutePath = normalized ? path.resolve(repoRoot, normalized) : null;
    if (!absolutePath || !isInside(repoRoot, absolutePath)) {
      throw new Error(`Digest surface file escapes repository root: ${digestFile}`);
    }
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    return parsed.surfaces ?? parsed;
  }
  return {
    traceMatrix: readJsonSurface(repoRoot, DEFAULT_REQUIREMENT_TRACE_MATRIX_JSON),
    directionalPilot: readJsonSurface(repoRoot, DEFAULT_DIRECTIONAL_PILOT_JSON),
    operatorStatus: readJsonSurface(repoRoot, ".agents/runtime/DASHBOARD.json")
  };
}

function readJsonSurface(repoRoot, relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  if (!isInside(repoRoot, absolutePath) || !fs.existsSync(absolutePath)) {
    return null;
  }
  const parsed = readJsonIfExists(absolutePath);
  return parsed ? { ...parsed, sourcePath: relativePath } : null;
}

function loadRecoveryRehearsalState({ repoRoot, options = {} }) {
  if (options.state) {
    return JSON.parse(String(options.state));
  }
  const stateFile = options.stateFile ?? options.file;
  if (stateFile) {
    const normalized = normalizeRelativePath(stateFile);
    const absolutePath = normalized ? path.resolve(repoRoot, normalized) : null;
    if (!absolutePath || !isInside(repoRoot, absolutePath)) {
      throw new Error(`Recovery state file escapes repository root: ${stateFile}`);
    }
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  }
  const generatedArtifacts = [];
  if (options.artifactPath || options.generatedArtifact) {
    generatedArtifacts.push({
      path: options.artifactPath ?? options.generatedArtifact,
      expectedDigest: options.expectedDigest,
      actualDigest: options.actualDigest
    });
  }
  return {
    generatedArtifacts,
    runtimeActivePacketId: options.runtimeActivePacket ?? options.runtimeActivePacketId,
    transition: options.transitionStatus
      ? {
          status: options.transitionStatus,
          canRetry: options.transitionCanRetry !== false && options.transitionCanRetry !== "false",
          command: options.transitionCommand
        }
      : null,
    unavailableState: options.unavailableKind
      ? {
          kind: options.unavailableKind,
          path: options.unavailablePath
        }
      : null
  };
}

function recoveryFinding({ code, status, path: findingPath, message, nextAction }) {
  return {
    code,
    status,
    path: findingPath ?? null,
    message,
    nextAction,
    repairAuthority: false,
    gateEffect: status === "block" || status === "hold" ? "hold" : status === "blocked_environment" ? "environment_hold" : "warn"
  };
}

function listActivePacketIds(repoRoot) {
  const activeDir = path.resolve(repoRoot, ".harness", "packets", "active");
  if (!isInside(repoRoot, activeDir) || !fs.existsSync(activeDir)) {
    return [];
  }
  return fs.readdirSync(activeDir)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .map((name) => path.basename(name, ".md"))
    .sort();
}

function isPartialPilotOutput(pilot = {}) {
  if (pilot.evidenceIntegrity && pilot.evidenceIntegrity.ok === false) {
    return true;
  }
  const status = normalizeDigestStatus(pilot.completionStatus ?? pilot.status ?? pilot.ok);
  if (!["pass", "conditional_pass", "not_required"].includes(status)) {
    return true;
  }
  const lanes = Object.values(pilot.checkLanes ?? {});
  return lanes.some((lane) => !["pass", "conditional_pass", "not_required", "not_applicable"].includes(normalizeDigestStatus(lane?.status ?? lane?.ok)));
}

function loadContextBudgetPolicyOption(value) {
  if (!value || value === true) {
    return DEFAULT_CONTEXT_BUDGET_POLICY;
  }
  return JSON.parse(String(value));
}

function normalizeContextBudgetMode(value) {
  const normalized = String(value ?? "advisory").trim().toLowerCase();
  return ["advisory", "warn", "strict"].includes(normalized) ? normalized : "advisory";
}

function contextBudgetFinding({ code, actual, limit, message }) {
  return {
    code,
    actual,
    limit,
    message,
    nextAction: "Reduce default reads, move broad evidence to fallback-only, or explicitly choose advisory/warn mode before continuing."
  };
}

function buildContextBudgetNextAction({ status, normalizedMode }) {
  if (status === "pass") {
    return "Context budget is within the role/lane policy.";
  }
  if (status === "block") {
    return "Strict context budget hard-fail: reduce reads or lower enforcement only with explicit packet rationale.";
  }
  if (status === "warn") {
    return "Context budget warning: reduce reads or record rationale before closeout.";
  }
  return `Context budget is advisory in ${normalizedMode} mode; inspect findings before relying on broad context.`;
}

function hashFile(absolutePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
}

function loadPackagingReadinessManifest({ repoRoot, options = {} }) {
  if (options.readiness) {
    return JSON.parse(String(options.readiness));
  }
  const readinessFile = options.readinessFile ?? options.packagingFile ?? options.file;
  if (readinessFile) {
    const normalized = normalizeRelativePath(readinessFile);
    const absolutePath = normalized ? path.resolve(repoRoot, normalized) : null;
    if (!absolutePath || !isInside(repoRoot, absolutePath)) {
      throw new Error(`Packaging readiness file escapes repository root: ${readinessFile}`);
    }
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    return parsed.checks ? parsed : parsed.packagingReadiness ?? parsed;
  }
  return buildDefaultPackagingReadinessManifest(repoRoot);
}

function buildDefaultPackagingReadinessManifest(repoRoot) {
  return {
    checks: {
      payloadBoundary: packagingPathCheck(repoRoot, "package.json", "reusable_payload"),
      starterCopy: packagingPathCheck(repoRoot, ".agents/scripts/init-project.js", "initialized_project"),
      commandTaxonomy: packagingMultiPathCheck(repoRoot, ["reference/commands/COMMAND_TAXONOMY.md", "reference/reports/docs-command-inventory/docs_command_inventory.json"], "reusable_payload"),
      manualEntryPoints: packagingMultiPathCheck(repoRoot, ["START_HERE.md", "README.md", "reference/manuals/human/HARNESS_MANUAL.md"], "reusable_payload"),
      migrationNotes: packagingMultiPathCheck(repoRoot, ["reference/commands/COMPATIBILITY_COMMAND_POLICY.md", "reference/artifacts/MIGRATION_RECONCILIATION_PLAN.md"], "reusable_payload"),
      versionNotes: packagingPathCheck(repoRoot, "package.json", "reusable_payload"),
      rollbackNotes: packagingPathCheck(repoRoot, "reference/artifacts/EXCEPTION_REOPEN_ROLLBACK_RULES.md", "reusable_payload"),
      deprecatedDocsPolicy: packagingPathCheck(repoRoot, "reference/DEPRECATION_CANDIDATES.md", "reusable_payload")
    }
  };
}

function packagingPathCheck(repoRoot, sourcePath, lane) {
  const absolutePath = path.resolve(repoRoot, sourcePath);
  const exists = isInside(repoRoot, absolutePath) && fs.existsSync(absolutePath);
  return {
    status: exists ? "pass" : "missing",
    lane,
    sourcePath,
    message: exists ? `${sourcePath} exists.` : `${sourcePath} is missing.`
  };
}

function packagingMultiPathCheck(repoRoot, sourcePaths, lane) {
  const missing = sourcePaths.filter((sourcePath) => {
    const absolutePath = path.resolve(repoRoot, sourcePath);
    return !isInside(repoRoot, absolutePath) || !fs.existsSync(absolutePath);
  });
  return {
    status: missing.length === 0 ? "pass" : "missing",
    lane,
    sourcePath: sourcePaths.join(", "),
    message: missing.length === 0
      ? `${sourcePaths.join(", ")} exist.`
      : `Missing packaging readiness path(s): ${missing.join(", ")}.`
  };
}

function normalizePackagingReadinessCheck({ repoRoot, key, value = {} }) {
  const lane = normalizePackagingLane(value.lane ?? value.scope);
  const sourcePath = value.sourcePath ?? value.path ?? null;
  let status = normalizeDigestStatus(value.status ?? value.decision ?? value.ok);
  if (sourcePath && status === "pass") {
    for (const onePath of String(sourcePath).split(",").map((item) => normalizeRelativePath(item)).filter(Boolean)) {
      const absolutePath = path.resolve(repoRoot, onePath);
      if (!isInside(repoRoot, absolutePath) || !fs.existsSync(absolutePath)) {
        status = "hold";
        break;
      }
    }
  }
  const severity = status === "block" ? "block" : status === "hold" ? "hold" : status === "warn" ? "warn" : "pass";
  return {
    key,
    lane,
    status: severity,
    sourcePath,
    message: value.message ?? defaultPackagingMessage(key, severity),
    nextAction: value.nextAction ?? defaultPackagingNextAction(key, severity)
  };
}

function normalizePackagingLane(value) {
  const normalized = String(value ?? "reusable_payload").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized === "initialized_project" ? "initialized_project" : "reusable_payload";
}

function packagingFindingCode(key, status) {
  const suffix = status === "warn" ? "warning" : status === "block" ? "blocked" : "missing";
  return `${String(key).replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}_${suffix}`;
}

function defaultPackagingMessage(key, status) {
  if (status === "pass") return `${key} packaging readiness check passed.`;
  return `${key} packaging readiness check is ${status}.`;
}

function defaultPackagingNextAction(key, status) {
  if (status === "pass") return "No action required for this packaging readiness check.";
  const actions = {
    migrationNotes: "Add or update migration/compatibility notes before claiming packaging readiness.",
    versionNotes: "Record version or change-note evidence before claiming packaging readiness.",
    rollbackNotes: "Add rollback or recovery notes before claiming packaging readiness.",
    commandTaxonomy: "Run docs command inventory and update command taxonomy before packaging.",
    manualEntryPoints: "Restore START_HERE, README, and human manual entry points before packaging.",
    starterCopy: "Run or repair starter init/copy smoke before packaging.",
    payloadBoundary: "Run harness:payload-boundary and resolve clean-payload findings."
  };
  return actions[key] ?? `Resolve ${key} ${status} before packaging readiness closeout.`;
}

function normalizeDigestSurfaces({ repoRoot, surfaces }) {
  const entries = {};
  for (const [key, value] of Object.entries(surfaces ?? {})) {
    if (!value) continue;
    entries[key] = normalizeDigestSurface(key, value);
    if (key === "guard" && Array.isArray(value.overlays)) {
      for (const overlay of value.overlays) {
        const overlayKind = sanitizeDigestSurfaceName(overlay.kind ?? overlay.name ?? "overlay");
        entries[`guard:${overlayKind}`] = normalizeDigestSurface(`guard:${overlayKind}`, {
          ...overlay,
          validationKind: overlay.validationKind ?? overlay.validation_kind ?? "guard_overlay",
          sourcePath: overlay.sourcePath ?? value.sourcePath ?? value.outputPath ?? value.path ?? null
        });
      }
    }
  }
  if (Object.keys(entries).length === 0) {
    entries.status = {
      status: "hold",
      decision: "hold",
      validationKind: "harness_structural_state",
      sourcePath: null,
      nextAction: "Run source readiness commands or provide a digest surface file."
    };
  }
  return entries;
}

function normalizeDigestSurface(surface, value = {}) {
  const status = normalizeDigestStatus(value.status ?? value.completionStatus ?? value.decision ?? value.ok);
  const decision = digestDecisionForStatus(status);
  return {
    status,
    decision,
    validationKind: value.validationKind ?? value.validation_kind ?? inferDigestValidationKind(surface),
    sourcePath: value.sourcePath ?? value.outputPath ?? value.path ?? null,
    nextAction: value.nextAction ?? value.message ?? defaultDigestSurfaceNextAction(surface, status)
  };
}

function digestDecisionForStatus(status) {
  if (status === "block") return "block";
  if (status === "hold" || status === "not_run_agent_error") return "hold";
  if (status === "warn" || status === "blocked_environment") return "warn";
  return "ready";
}

function sanitizeDigestSurfaceName(value) {
  return String(value ?? "surface")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "surface";
}

function normalizeDigestStatus(value) {
  if (value === true) return "pass";
  if (value === false) return "block";
  const normalized = String(value ?? "pass").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = {
    ready: "pass",
    ok: "pass",
    passed: "pass",
    warning: "warn",
    blocked: "block",
    fail: "block",
    failed: "block",
    missing: "hold",
    pending: "hold",
    not_applicable: "not_required"
  };
  const status = aliases[normalized] ?? normalized;
  return new Set(["pass", "conditional_pass", "warn", "hold", "block", "blocked_environment", "not_run_agent_error", "not_required"]).has(status) ? status : "warn";
}

function inferDigestValidationKind(surface) {
  const normalized = String(surface ?? "").toLowerCase();
  if (normalized.includes("trace")) return "requirement_trace";
  if (normalized.includes("pilot")) return "directional_pilot";
  if (normalized.includes("security")) return "security_review";
  if (normalized.includes("browser")) return "browser_evidence";
  if (normalized.includes("risk")) return "risk_gate";
  if (normalized.includes("guard")) return "guard_overlay";
  if (normalized.includes("context")) return "context_budget";
  return "harness_structural_state";
}

function defaultDigestSurfaceNextAction(surface, status) {
  if (status === "pass" || status === "not_required" || status === "conditional_pass") {
    return "No action required for this surface.";
  }
  return `Resolve ${surface} readiness before closeout.`;
}

function normalizeDigestRisks(values) {
  return (Array.isArray(values) ? values : []).map((risk) => {
    const severity = String(risk.severity ?? risk.riskClass ?? "normal").trim().toLowerCase();
    return {
      riskId: risk.riskId ?? risk.risk_id ?? null,
      severity: ["low", "normal", "high", "critical"].includes(severity) ? severity : "normal",
      owner: String(risk.owner ?? "").trim(),
      impact: String(risk.impact ?? "").trim(),
      mitigation: String(risk.mitigation ?? "").trim(),
      closeoutBlocked: Boolean(risk.closeoutBlocked ?? risk.closeout_blocked ?? false)
    };
  });
}

function buildDigestNonTechnicalSummary(decision, blockers, holds, warnings) {
  if (decision === "ready") {
    return "No blocking readiness findings are present in the supplied surfaces.";
  }
  if (decision === "block") {
    return `${blockers.length} blocking readiness surface(s) must be resolved before closeout or release claims.`;
  }
  if (decision === "hold") {
    return `${holds.length} readiness surface(s) are on hold and need evidence before closeout.`;
  }
  return `${warnings.length} readiness warning(s) should be reviewed before closeout.`;
}

function buildDigestNextAction({ decision, blockers, holds, warnings }) {
  if (decision === "ready") {
    return "Use authoritative packet-preflight, review, and closeout gates before claiming completion; digest grants no approval.";
  }
  const first = blockers[0] ?? holds[0] ?? warnings[0];
  return first?.nextAction ?? "Inspect digest evidence table and resolve the first non-pass surface.";
}

function buildRequirementTraceRow({ repoRoot, row, index }) {
  const requirementId = String(row.requirementId ?? row.requirement_id ?? `REQ-${index + 1}`).trim();
  const validationKind = normalizeTraceValidationKind(row.validationKind ?? row.requirementType ?? row.kind);
  const packetPath = normalizeRelativePath(row.packetPath ?? row.packet_path ?? row.packet);
  const packet = inspectTracePath(repoRoot, packetPath);
  const packetContent = packet.path && packet.exists ? fs.readFileSync(path.resolve(repoRoot, packet.path), "utf8") : "";
  const implementationFiles = parseTracePathList(row.implementationFiles ?? row.files ?? row.implementation ?? row.implementation_files);
  const tests = parseTracePathList(row.tests ?? row.testPaths ?? row.test_paths);
  const evidenceManifests = parseTracePathList(row.evidenceManifests ?? row.evidenceManifestPaths ?? row.evidence ?? row.evidence_manifests);
  const documentation = parseTracePathList(row.documentation ?? row.docs ?? row.docPaths ?? row.document_paths);
  const resolvedEvidenceManifests = evidenceManifests.length > 0 ? evidenceManifests : extractTraceEvidenceManifestPaths(packetContent);
  const resolvedDocumentation = documentation.length > 0 ? documentation : extractTraceDocumentationPaths(packetContent);
  const findings = [];
  const coverage = {
    implementationFiles: implementationFiles.map((item) => inspectTracePath(repoRoot, item)),
    tests: tests.map((item) => inspectTracePath(repoRoot, item)),
    evidenceManifests: resolvedEvidenceManifests.map((item) => inspectTraceEvidenceManifest(repoRoot, item)),
    documentation: resolvedDocumentation.map((item) => inspectTracePath(repoRoot, item))
  };

  if (!packet.path || !packet.exists) {
    findings.push(traceFinding("packet_missing", "hold", `Packet path is missing or not found for ${requirementId}.`));
  }
  if (coverage.implementationFiles.length === 0 || coverage.implementationFiles.some((item) => !item.exists)) {
    findings.push(traceFinding("missing_implementation_file", "hold", `Requirement ${requirementId} needs existing implementation file coverage.`));
  }
  if (coverage.tests.length === 0 || coverage.tests.some((item) => !item.exists)) {
    findings.push(traceFinding("missing_test", "hold", `Requirement ${requirementId} needs at least one existing test path.`));
  }
  if (coverage.evidenceManifests.length === 0 || coverage.evidenceManifests.some((item) => !item.exists || !item.ok)) {
    findings.push(traceFinding("missing_evidence_manifest", "hold", `Requirement ${requirementId} needs packet-bound evidence manifest coverage.`));
  }
  for (const manifest of coverage.evidenceManifests) {
    if (manifest.exists && manifest.status && !["pass", "conditional_pass", "not_required", "not_applicable"].includes(manifest.status)) {
      findings.push(traceFinding("evidence_not_pass", manifest.status === "block" ? "block" : "hold", `Evidence manifest ${manifest.path} is ${manifest.status}.`));
    }
  }
  if (coverage.documentation.length === 0 || coverage.documentation.some((item) => !item.exists)) {
    findings.push(traceFinding("missing_documentation", "warn", `Requirement ${requirementId} should cite existing documentation.`));
  }

  const reviewerProfile = normalizeTraceObject(row.reviewerProfile ?? row.reviewer_profile);
  const specialistReview = normalizeTraceObject(row.specialistReview ?? row.specialist_review);
  const securityReview = normalizeTraceObject(row.securityReview ?? row.security_review);
  const residualRisk = normalizeTraceObject(row.residualRisk ?? row.residual_risk);
  const risk = normalizeTraceRisk(row.risk);

  if (reviewerProfile.status && !["pass", "not_required", "not_applicable"].includes(normalizeTraceStatus(reviewerProfile.status))) {
    findings.push(traceFinding("reviewer_profile_not_pass", "hold", `Reviewer profile status is ${reviewerProfile.status}.`));
  }
  if (specialistReview.status && !["pass", "not_required", "not_applicable"].includes(normalizeTraceStatus(specialistReview.status))) {
    findings.push(traceFinding("specialist_review_not_pass", "hold", `Specialist review status is ${specialistReview.status}.`));
  }
  if (validationKind === "security_review" || securityReview.required === true || securityReview.status) {
    const status = normalizeTraceStatus(securityReview.status ?? "missing");
    if (!["pass", "not_required", "not_applicable"].includes(status)) {
      findings.push(traceFinding("security_review_missing", "hold", `Security review status is ${securityReview.status ?? "missing"}.`));
    }
  }
  if (risk.severity === "critical" || risk.severity === "high") {
    if (!risk.owner) {
      findings.push(traceFinding(`${risk.severity}_risk_owner_missing`, "block", `${risk.severity} risk must name an owner.`));
    }
    if (!risk.impact) {
      findings.push(traceFinding(`${risk.severity}_risk_impact_missing`, "block", `${risk.severity} risk must name impact.`));
    }
    if (!risk.mitigation) {
      findings.push(traceFinding(`${risk.severity}_risk_mitigation_missing`, "block", `${risk.severity} risk must name mitigation.`));
    }
  }
  if (risk.closeoutBlocked === true) {
    findings.push(traceFinding("risk_closeout_blocked", "block", `Risk ${risk.riskId ?? requirementId} blocks closeout.`));
  }

  const status = findings.some((finding) => finding.status === "block")
    ? "block"
    : findings.some((finding) => finding.status === "hold")
      ? "hold"
      : findings.some((finding) => finding.status === "warn")
        ? "warn"
        : "pass";

  return {
    requirementId,
    requirementTitle: String(row.requirementTitle ?? row.title ?? requirementId),
    validationKind,
    status,
    packet,
    coverage,
    reviewerProfile,
    specialistReview,
    securityReview,
    residualRisk,
    risk,
    findings,
    authority: "evidence_only_no_approval",
    nextAction: status === "pass"
      ? "Use packet preflight and review gates before closeout; trace row grants no approval."
      : buildTraceNextAction(findings)
  };
}

function inspectTracePath(repoRoot, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) {
    return { path: relativePath ? String(relativePath) : null, exists: false };
  }
  return {
    path: normalized,
    exists: relativeExists(repoRoot, normalized)
  };
}

function inspectTraceEvidenceManifest(repoRoot, relativePath) {
  const inspected = inspectTracePath(repoRoot, relativePath);
  if (!inspected.path || !inspected.exists) {
    return { ...inspected, ok: false, status: "missing", diagnostics: [] };
  }
  const result = validateEvidenceManifestAtPath({ repoRoot, manifestPath: inspected.path });
  return {
    ...inspected,
    ok: result.ok,
    status: result.manifest?.status ?? "invalid",
    evidenceType: result.manifest?.evidence_type ?? null,
    packetPath: result.manifest?.packet_path ?? null,
    diagnostics: result.diagnostics
  };
}

function normalizeTraceValidationKind(value) {
  const normalized = String(value ?? "harness_validation").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = {
    product: "product_behavior",
    product_verification: "product_behavior",
    harness: "harness_validation",
    harness_structural_state: "harness_validation",
    security: "security_review",
    browser: "browser_evidence",
    doc: "documentation",
    docs: "documentation",
    reviewer: "reviewer_status"
  };
  return aliases[normalized] ?? normalized;
}

function normalizeTraceRisk(value = {}) {
  const severity = String(value.severity ?? value.riskClass ?? value.risk_class ?? "normal").trim().toLowerCase();
  return {
    riskId: value.riskId ?? value.risk_id ?? null,
    severity: ["low", "normal", "high", "critical"].includes(severity) ? severity : "normal",
    owner: String(value.owner ?? "").trim(),
    impact: String(value.impact ?? "").trim(),
    mitigation: String(value.mitigation ?? "").trim(),
    closeoutBlocked: Boolean(value.closeoutBlocked ?? value.closeout_blocked ?? false)
  };
}

function normalizeTraceObject(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...value };
}

function normalizeTraceStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  const aliases = { missing: "missing", blocked: "block", failed: "block", warning: "warn", not_needed: "not_required" };
  return aliases[normalized] ?? normalized;
}

function buildTraceNextAction(findings) {
  const first = findings.find((finding) => finding.status === "block") ?? findings.find((finding) => finding.status === "hold") ?? findings[0];
  if (!first) {
    return "No trace findings.";
  }
  const actionByCode = {
    missing_test: "Add or cite a test path for this requirement.",
    missing_evidence_manifest: "Create or cite a packet-bound evidence manifest.",
    missing_documentation: "Add or cite documentation for this requirement.",
    security_review_missing: "Attach packet-bound security review evidence.",
    reviewer_profile_not_pass: "Resolve reviewer profile requirements before closeout.",
    specialist_review_not_pass: "Resolve specialist reviewer evidence before closeout.",
    risk_closeout_blocked: "Resolve or explicitly route the open risk before closeout."
  };
  return actionByCode[first.code] ?? first.message;
}

function traceFinding(code, status, message) {
  return { code, status, message };
}

function parseTracePathList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(parseTracePathList);
  }
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((item) => normalizeRelativePath(item.replace(/^`|`$/g, "").trim()))
    .filter(Boolean);
}

function extractTraceEvidenceManifestPaths(content) {
  const paths = new Set();
  for (const label of ["Evidence manifest path", "Evidence manifest paths", "Evidence manifest", "TDD evidence manifest path", "Security evidence manifest path", "Browser evidence manifest path"]) {
    for (const candidate of parseTracePathList(readPacketBulletFieldValueFromContent(content, label))) {
      if (candidate.endsWith(".json")) {
        paths.add(candidate);
      }
    }
  }
  for (const match of String(content ?? "").matchAll(/(?:reference|verification)\/[^\s)`'"|]+?\.json/g)) {
    const normalized = normalizeRelativePath(match[0].replace(/[),.;:]+$/g, ""));
    if (normalized && normalized.includes("evidence") && normalized.includes("manifest")) {
      paths.add(normalized);
    }
  }
  return [...paths].sort();
}

function extractTraceDocumentationPaths(content) {
  const paths = new Set();
  for (const label of ["Documentation", "Documentation path", "Documentation paths", "Docs", "Doc path"]) {
    for (const candidate of parseTracePathList(readPacketBulletFieldValueFromContent(content, label))) {
      if (candidate.endsWith(".md")) {
        paths.add(candidate);
      }
    }
  }
  for (const match of String(content ?? "").matchAll(/reference\/artifacts\/[^\s)`'"|]+?\.md/g)) {
    const normalized = normalizeRelativePath(match[0].replace(/[),.;:]+$/g, ""));
    if (normalized) {
      paths.add(normalized);
    }
  }
  return [...paths].sort();
}

function normalizePilotStatus(value) {
  const status = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  const allowed = new Set(["pass", "conditional_pass", "warn", "hold", "block", "blocked_environment", "not_run_agent_error", "not_required", "pending", "missing"]);
  return allowed.has(status) ? status : "warn";
}

function extractProfileIds(value) {
  return unique((String(value ?? "").match(/PRF-\d{2}/gi) ?? []).map((id) => id.toUpperCase()));
}

function parseFrontmatter(content) {
  const match = String(content ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

function parseBodyFields(content) {
  const result = {};
  for (const rawLine of String(content ?? "").split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*]\s+/, "");
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key && value) {
      result[key] = value;
    }
  }
  return result;
}

function computeAgeDays(value, nowIso) {
  if (!hasConcreteValue(value) || String(value).toLowerCase() === "pending") {
    return null;
  }
  const then = Date.parse(value);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(then) || !Number.isFinite(now)) {
    return null;
  }
  return Math.floor((now - then) / 86400000);
}

function looksLikePath(value) {
  const text = String(value ?? "");
  return text.includes("/") || text.endsWith(".md") || text.endsWith(".json");
}

function relativeExists(root, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) {
    return false;
  }
  const absolutePath = path.resolve(root, normalized);
  return isInside(root, absolutePath) && fs.existsSync(absolutePath);
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/").replace(/^`|`$/g, "").replace(/^\.\//, "");
  if (!text || path.isAbsolute(text) || text.includes("..")) {
    return null;
  }
  return path.posix.normalize(text);
}

function pickRowValue(row, labels) {
  const entries = Object.entries(row);
  for (const label of labels) {
    const exact = entries.find(([key]) => key.toLowerCase() === label.toLowerCase());
    if (exact) {
      return exact[1];
    }
  }
  const normalizedLabels = labels.map((label) => normalizeCandidate(label));
  const fuzzy = entries.find(([key]) => normalizedLabels.includes(normalizeCandidate(key)));
  return fuzzy?.[1] ?? "";
}

function normalizeCandidate(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.;:]+$/g, "");
}

function summarizeLearningScan(scan) {
  return {
    notes: scan.notes.length,
    stale: scan.stale.length,
    thresholdDays: scan.thresholdDays
  };
}

function summarizeAutomationScan(scan) {
  return {
    entries: scan.entries.length,
    candidates: scan.candidates.length,
    promotions: scan.promotions.length,
    threshold: scan.threshold
  };
}

function writeJsonArtifact(root, relativePath, value) {
  return writeTextArtifact(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeTextArtifact(root, relativePath, content) {
  const normalized = normalizeRelativePath(relativePath);
  const absolutePath = path.resolve(root, normalized);
  if (!isInside(root, absolutePath)) {
    throw new Error(`Artifact path escapes repository root: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  return { relativePath: normalized, absolutePath };
}

function renderAutomationMarkdown(result) {
  const rows = result.candidates.map((candidate) => `| ${candidate.candidate} | ${candidate.count} | ${candidate.count >= result.threshold ? "promote" : "watch"} | ${candidate.sources.map((source) => source.source).join("<br>")} |`);
  return [
    "# Automation Candidates",
    "",
    `Schema version: ${result.schemaVersion}`,
    `Promotion threshold: ${result.threshold}`,
    "",
    "| Candidate | Count | Disposition | Sources |",
    "|---|---:|---|---|",
    ...(rows.length > 0 ? rows : ["| None | 0 | none | none |"])
  ].join("\n") + "\n";
}

function renderDashboardMarkdown(dashboard) {
  return [
    "# Standard Harness P2 Conductor Dashboard",
    "",
    `Generated at: ${dashboard.generatedAt}`,
    "",
    "## Summary",
    `- Validator ok: ${dashboard.summary.validatorOk ? "yes" : "no"}`,
    `- Blocking findings: ${dashboard.summary.blockingFindings}`,
    `- Work items: ${dashboard.summary.workItems}`,
    `- Open decisions: ${dashboard.summary.openDecisions}`,
    `- Open risks: ${dashboard.summary.openRisks}`,
    `- Stale learnings: ${dashboard.summary.staleLearnings}`,
    `- Automation promotions: ${dashboard.summary.automationPromotions}`,
    "",
    "## Conductor Loop",
    dashboard.conductorLoop.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    "",
    `Next action: ${dashboard.nextAction}`
  ].join("\n") + "\n";
}

function readJsonIfExists(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

function defaultCapabilityRegistry() {
  return {
    local_files: { enabled: true, evidence_required: "changed file list" },
    git_operations: { enabled: true, allowed: ["status", "diff", "branch", "worktree"], restricted: ["push", "force-push"] },
    terminal_logs: { enabled: true, evidence_required: "command output excerpt" },
    browser_ui: { enabled: "profile-dependent", evidence_required: "screenshot or Playwright report" },
    playwright: { enabled: "profile-dependent", evidence_required: "test report path" },
    sentry_logs: { enabled: "project-dependent", evidence_required: "incident/log reference" }
  };
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((file) => file.endsWith(".md")).map((file) => path.join(dir, file));
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function requireSectionText(content, heading, label, diagnostics) {
  const section = sliceSection(content, heading);
  if (!hasConcreteValue(section)) {
    diagnostics.push(buildPlanDiagnostic(label, "block", "missing", "concrete section text", `${label} must be specified.`));
  }
}

function requireAcceptance(content, diagnostics) {
  const section = sliceSection(content, "## 10. Acceptance") ?? sliceSection(content, "## Acceptance");
  if (!section || !section.split(/\r?\n/).some((line) => /^[-*]\s+/.test(line.trim()) && hasConcreteValue(line.replace(/^[-*]\s+/, "")))) {
    diagnostics.push(buildPlanDiagnostic("Acceptance", "block", "missing", "at least one observable acceptance bullet", "Plan must include observable acceptance criteria."));
  }
}

function buildPlanDiagnostic(field, status, current, expected, message) {
  return { code: "plan_quality", field, status, current, expected, message, reason: message };
}

function safeTarget(value) {
  return safeId(value).toLowerCase();
}

function safeId(value) {
  const text = String(value ?? "item").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return text || "item";
}

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function hasConcreteValue(value) {
  const text = String(value ?? "").trim();
  if (!text || text.includes("[") || text.includes("]")) {
    return false;
  }
  const normalized = normalizePacketHeaderValue(text);
  return !["tbd", "todo", "pending", "unknown", "n/a", "na", "-", "not-needed", "none"].includes(normalized);
}

function numberOption(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function resolveDbPath(repoRoot, dbPath) {
  return path.isAbsolute(dbPath) ? dbPath : path.resolve(repoRoot, dbPath);
}

function isInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseArgs(args) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
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
  return { positionals, options };
}
