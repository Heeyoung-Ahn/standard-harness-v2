import path from "node:path";

export const AUTHORITY_DENIAL = Object.freeze({
  grantsReleaseApproval: false,
  grantsPublishApproval: false,
  grantsImplementationApproval: false,
  grantsPacketCloseout: false,
  grantsRiskClosure: false,
  grantsProductVerification: false,
  grantsResidualRiskAcceptance: false
});

export const PROMOTION_BOUNDARY_CONTRACT = Object.freeze({
  schemaVersion: "1.0",
  validationKind: "starter_promotion_boundary",
  description:
    "Classifies files from a future product project so only reusable standard-harness starter improvements can be exported into a clean starter candidate.",
  authority: AUTHORITY_DENIAL,
  includePrefixes: [
    ".harness/runtime/",
    ".harness/test/",
    ".codex-plugin/",
    ".agents/artifacts/",
    ".agents/modes/",
    ".agents/runtime/",
    ".agents/rules/",
    ".agents/scripts/",
    ".agents/ssot/",
    ".agents/workflows/",
    ".agents/skills/",
    "reference/"
  ],
  includeFiles: ["START_HERE.md", "AGENTS.md", "README.md"],
  reviewFiles: ["package.json"],
  projectSpecificGovernanceFiles: [
    ".agents/artifacts/REQUIREMENTS.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    ".agents/artifacts/PREVENTIVE_MEMORY.md",
    ".agents/artifacts/PROJECT_HISTORY.md"
  ],
  starterTemplateReferenceFiles: ["reference/planning/PLN-00_DEEP_INTERVIEW.md"],
  excludePrefixes: [
    ".harness/packets/",
    ".harness/reports/",
    ".harness/cache/",
    ".harness/logs/",
    "reference/evidence/",
    "reference/handoffs/",
    "evidence/",
    "verification/",
    "src/",
    "app/",
    "apps/",
    "product/",
    "docs/requirements/",
    "docs/planning/",
    "docs/decisions/"
  ],
  excludeFiles: [
    ".env",
    ".env.local",
    ".env.production",
    ".harness/operating_state.sqlite",
    ".harness/operating_state.sqlite-shm",
    ".harness/operating_state.sqlite-wal",
    ".agents/runtime/ACTIVE_CONTEXT.json",
    ".agents/runtime/ACTIVE_CONTEXT.md",
    ".agents/artifacts/VALIDATION_REPORT.json",
    ".agents/artifacts/VALIDATION_REPORT.md",
    "browser-session.json",
    "raw-transcript.md"
  ],
  excludeReferencePlanningNamePatterns: [
    /^\d{4}-\d{2}-\d{2}.*handoff.*\.md$/i,
    /handoff/i,
    /\bpkb\b/i
  ],
  excludeReferencePacketNamePatterns: [/^(?!PKT-01_WORK_ITEM_PACKET_TEMPLATE\.md$).+\.md$/i],
  excludeNameFragments: [
    "credential",
    "credentials",
    "secret",
    "secrets",
    "session",
    "transcript"
  ]
});

export function normalizePromotionPath(candidatePath) {
  return String(candidatePath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function classifyPromotionPath(candidatePath) {
  const normalized = normalizePromotionPath(candidatePath);
  const lower = normalized.toLowerCase();
  const validationKind = PROMOTION_BOUNDARY_CONTRACT.validationKind;

  if (!normalized) {
    return {
      decision: "exclude",
      validationKind,
      path: normalized,
      reason: "Empty path cannot be promoted."
    };
  }

  if (isExcludedPath(normalized)) {
    return {
      decision: "exclude",
      validationKind,
      path: normalized,
      reason:
        "Path matches contamination, secret, runtime state, report, product code, transcript, or project-specific exclusion boundary."
    };
  }

  if (PROMOTION_BOUNDARY_CONTRACT.projectSpecificGovernanceFiles.some((file) => lower === file.toLowerCase())) {
    return {
      decision: "review",
      reviewKind: "project_governance_memory",
      validationKind,
      path: normalized,
      reason:
        "Project governance, requirements, implementation plan, or preventive memory may be customized; require manual starter-template review before promotion."
    };
  }

  if (isStarterTemplateReferenceFile(normalized)) {
    return {
      decision: "review",
      reviewKind: "starter_template_reference",
      validationKind,
      path: normalized,
      reason:
        "Reference planning or packet template may be reusable, but must be reviewed so project-specific planning state is not promoted."
    };
  }

  if (PROMOTION_BOUNDARY_CONTRACT.reviewFiles.includes(normalized)) {
    return {
      decision: "review",
      reviewKind: "package_json_harness_scripts",
      validationKind,
      path: normalized,
      reason:
        "package.json requires harness scripts and metadata extraction; do not blindly copy product dependency or script drift."
    };
  }

  if (
    PROMOTION_BOUNDARY_CONTRACT.includeFiles.includes(normalized) ||
    PROMOTION_BOUNDARY_CONTRACT.includePrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    return {
      decision: "include",
      validationKind,
      path: normalized,
      reason: "Path matches reusable standard-harness starter promotion allowlist."
    };
  }

  return {
    decision: "review",
    reviewKind: "unclassified_path",
    validationKind,
    path: normalized,
    reason: "Path is not part of the explicit promotion allowlist or denylist."
  };
}

export function isExcludedPath(candidatePath) {
  const normalized = normalizePromotionPath(candidatePath);
  const lower = normalized.toLowerCase();
  const base = path.posix.basename(lower);
  return (
    PROMOTION_BOUNDARY_CONTRACT.excludeFiles.some((file) => lower === file.toLowerCase()) ||
    PROMOTION_BOUNDARY_CONTRACT.excludePrefixes.some((prefix) => lower.startsWith(prefix.toLowerCase())) ||
    isProjectSpecificReferencePlanningPath(normalized) ||
    isProjectSpecificReferencePacketPath(normalized) ||
    PROMOTION_BOUNDARY_CONTRACT.excludeNameFragments.some((fragment) => base.includes(fragment))
  );
}

function isStarterTemplateReferenceFile(normalizedPath) {
  const lower = normalizePromotionPath(normalizedPath).toLowerCase();
  return PROMOTION_BOUNDARY_CONTRACT.starterTemplateReferenceFiles.some((file) => lower === file.toLowerCase());
}

function isProjectSpecificReferencePlanningPath(normalizedPath) {
  const lower = normalizePromotionPath(normalizedPath).toLowerCase();
  if (!lower.startsWith("reference/planning/")) return false;
  if (isStarterTemplateReferenceFile(lower)) return false;
  const base = path.posix.basename(lower);
  return PROMOTION_BOUNDARY_CONTRACT.excludeReferencePlanningNamePatterns.some((pattern) => pattern.test(base));
}

function isProjectSpecificReferencePacketPath(normalizedPath) {
  const lower = normalizePromotionPath(normalizedPath).toLowerCase();
  if (!lower.startsWith("reference/packets/")) return false;
  if (isStarterTemplateReferenceFile(lower)) return false;
  const base = path.posix.basename(lower);
  return PROMOTION_BOUNDARY_CONTRACT.excludeReferencePacketNamePatterns.some((pattern) => pattern.test(base));
}
