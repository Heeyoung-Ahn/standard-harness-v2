import fs from "node:fs";
import path from "node:path";

import { ACTIVE_CONTEXT_JSON, ACTIVE_CONTEXT_MARKDOWN } from "./active-context.js";
import {
  AGENT_TRACES_DIR,
  REVIEW_REPORT_MARKDOWN,
  VALIDATION_REPORT_JSON,
  resolveGeneratedDocReadPath
} from "./harness-paths.js";
import {
  CURRENT_STATE_DOC,
  TASK_LIST_DOC,
  COMPATIBILITY_CURRENT_STATE_PATH,
  COMPATIBILITY_TASK_LIST_PATH,
  calculateChecksum
} from "./generate-state-docs.js";
import { GATE_PROFILE_IDS, resolveGateProfile } from "./gate-profiles.js";
import { looksLikeStarterPlaceholder } from "./init-project.js";
import {
  escapeRegExp,
  parseMarkdownTable,
  parseTableCells,
  readFirstMarkdownTableBodyLines,
  readLabeledBulletValue,
  readPacketBulletFieldValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";
import {
  evaluateChangeZoneClassification,
  extractFastPathChangedFiles,
  normalizeChangeZone
} from "./change-zone-map.js";
import { evaluateModelingImpact, summarizeModelingImpact } from "./modeling-impact.js";
import {
  RELEASE_BASELINE,
  ROOT_RELEASE_BASELINE_MARKERS,
  isInstallableReleaseMaintainerRepo
} from "./release-baseline.js";
import {
  WORKFLOW_CONTRACT_SECTIONS,
  findMissingWorkflowContractSections,
  prioritizeOpenWorkItems,
  selectActiveWorkItem,
  resolveHandoffExecution,
  workflowForOwner
} from "./workflow-routing.js";
import {
  countTableRows,
  extractSummaryCount,
  readValidationReportSummary,
  wrapSourceRefs
} from "./validation/document-summary.js";

const REQUIRED_SECTIONS = {
  [CURRENT_STATE_DOC]: ["## Current Focus Summary", "## Decision Required Summary", "## Decision Required Detail"],
  [TASK_LIST_DOC]: ["## Blocked / At Risk Summary", "## Blocked / At Risk Detail"]
};

const PACKET_TEMPLATE_PATH = "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md";
const SOURCE_WAVE_LEDGER_PATH = "reference/artifacts/AUTHORITATIVE_SOURCE_WAVE_LEDGER.md";
const ACTIVE_PROFILES_PATH = ".agents/artifacts/ACTIVE_PROFILES.md";
const TASK_LIST_PATH = ".agents/artifacts/TASK_LIST.md";
const CURRENT_STATE_PATH = ".agents/artifacts/CURRENT_STATE.md";
const REPOSITORY_LAYOUT_PATH = "reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.md";
const GATE_PROFILE_CONTRACT_PATH = ".harness/runtime/state/gate-profiles.js";
const RUNTIME_SCHEMA_AUTHORITY_PATH = ".harness/runtime/state/operating_state.schema.json";
const RUNTIME_SCHEMA_COMPATIBILITY_PATH = ".agents/runtime/operating_state.schema.json";
const RISK_CLASS_ORDER = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4
};
const ROUTE_CLASS_VALUES = new Set(["fast-path", "packet-path", "strict-path"]);
const WORKFLOW_CONTRACT_PATHS = [
  ".agents/workflows/deployer.md",
  ".agents/workflows/designer.md",
  ".agents/workflows/developer.md",
  ".agents/workflows/documenter.md",
  ".agents/workflows/handoff_coordinator.md",
  ".agents/workflows/orchestrator.md",
  ".agents/workflows/project_manager.md",
  ".agents/workflows/planner.md",
  ".agents/workflows/reviewer.md",
  ".agents/workflows/tester.md"
];
const AGENT_BEHAVIOR_GUIDE_PATH = ".agents/rules/agent_behavior.md";
const AGENT_BEHAVIOR_SKILL_PATHS = [
  ".agents/skills/day_start/SKILL.md",
  ".agents/skills/day_wrap_up/SKILL.md"
];
const AGENT_BEHAVIOR_GUIDE_REQUIRED_MARKERS = [
  "# Agent Behavior Contract",
  "Think Before Coding",
  "Simplicity First",
  "Surgical Changes",
  "Goal-Driven Execution",
  "Project Design SSOT Precedence",
  "Developer implements",
  "Tester verifies",
  "Reviewer checks"
];
const WORKFLOW_BEHAVIOR_REQUIRED_MARKERS = [
  "## Behavior Contract",
  ".agents/rules/agent_behavior.md",
  "Think Before Coding",
  "Simplicity First",
  "Surgical Changes",
  "Goal-Driven Execution",
  "project design SSOT"
];
const SKILL_BEHAVIOR_REQUIRED_MARKERS = [
  "## Behavior Checks",
  ".agents/rules/agent_behavior.md",
  "Think Before Coding",
  "Simplicity First",
  "Surgical Changes",
  "Goal-Driven Execution",
  "project design SSOT"
];
const TASK_PACKET_DIRECTORY = "reference/packets";
const TASK_PACKET_ARTIFACT_CATEGORY = "task_packet";
const TASK_PACKET_DISCOVERY_EXCLUDED_FILES = new Set([
  path.basename(PACKET_TEMPLATE_PATH),
  "README.md"
]);
const TASK_PACKET_DISCOVERY_REQUIRED_MARKERS = [
  "## Quick Decision Header",
  "| Layer classification |",
  "| Domain foundation status |",
  "| Authoritative source intake status |",
  "- Required reading before code:"
];
const TASK_PACKET_SUPPORTED_LANE_TYPES = new Set([
  "planning",
  "narrow-runtime",
  "validation-review",
  "release-security"
]);
const TASK_PACKET_LANE_TYPE_DECLARATION_LABEL = "Lane-type declaration";
const TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_LABEL = "Lane-type universal minimum sections";
const TASK_PACKET_LANE_TYPE_MATRIX_LABELS = [
  "Lane-type required sections",
  "Lane-type conditional sections",
  "Lane-type not-needed sections"
];
const TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_TOKENS = [
  "goal",
  "non-goal",
  "in scope",
  "out of scope",
  "data / source impact",
  "verification plan",
  "refactor / residual debt disposition",
  "packet exit quality gate",
  "reopen trigger"
];
const SOURCE_WAVE_LEDGER_REQUIRED_MARKERS = [
  "## Approval Rule",
  "## 4. Impacted Packet Set",
  "## 8. Packet Citation Rule",
  "| Packet path | Prior source snapshot | Required action | Rebaseline status | Notes |"
];
const STRUCTURED_TASK_TABLE_HEADERS = {
  "## Active Locks": ["Task ID", "Scope", "Owner", "Status", "Started At", "Notes"],
  "## Active Tasks": ["Task ID", "Title", "Scope", "Owner", "Status", "Priority", "Depends On", "Verification"],
  "## Blocked Tasks": ["Task ID", "Blocker", "Owner", "Status", "Unblock Condition", "Verification"],
  "## Completed Tasks": ["Task ID", "Title", "Completed At", "Verification", "Notes"]
};
const TASK_STATUSES_REQUIRING_LOCK = new Set([
  "in progress",
  "in execution",
  "executing",
  "review"
]);
const PACKET_TEMPLATE_REQUIRED_MARKERS = [
  "| Risk class |",
  "| Route class |",
  "| Layer classification |",
  "| Active profile dependencies |",
  "| Profile evidence status |",
  "| Shared-source wave status |",
  "| Layer classification agreement |",
  "| Optional profile evidence approval |",
  "- Active profile references:",
  "- Profile composition rationale:",
  "- Active profile dependencies:",
  "- Profile-specific evidence status:",
  "- Lane-type declaration:",
  "- Lane-type universal minimum sections:",
  "- Lane-type required sections:",
  "- Lane-type conditional sections:",
  "- Lane-type not-needed sections:",
  "- UX archetype reference:",
  "- Environment topology reference:",
  "- Domain foundation reference:",
  "- Authoritative source intake reference:",
  "- Impacted packet set scope:",
  "- Authoritative source wave ledger reference:",
  "- Source wave packet disposition:",
  "- Packet exit quality gate reference:",
  "- Improvement candidate reference:",
  "- Gate profile:",
  "- Risk class:",
  "- Route class:",
  "- Risk classification rationale:",
  "- Critical human confirmation:",
  "- Critical confirmation owner:",
  "- Critical confirmation status:",
  "- Critical confirmation evidence path:",
  "- Verification manifest:",
  "- Primary admin entity / surface:",
  "- Grid interaction model:",
  "- Search / filter / sort / pagination behavior:",
  "- Row action / bulk action rule:",
  "- Edit / save / confirm / audit pattern:",
  "- Source spreadsheet artifact:",
  "- Workbook / sheet / tab / range trace:",
  "- Header / column mapping:",
  "- Row key / record identity rule:",
  "- Source snapshot / version:",
  "- Transformation / normalization assumptions:",
  "- Reconciliation / overwrite rule:",
  "- Transfer package / bundle artifact:",
  "- Transfer medium / handoff channel:",
  "- Checksum / integrity evidence:",
  "- Offline dependency bundle status:",
  "- Ingress verification / import step:",
  "- Rollback package / recovery bundle:",
  "- Manual custody / operator handoff:",
  "- Product source root:",
  "- Legacy system source inventory:",
  "- VBA module / macro / function inventory:",
  "- MariaDB schema snapshot:",
  "- Current import / export / report paths:",
  "- Source-of-truth ownership:",
  "- Migration / reconciliation plan:",
  "- Parallel-run / reconciliation evidence:",
  "- Python / Django version policy:",
  "- Supported-version / security-support rationale:",
  "- Dependency manager:",
  "- Django app / module boundary:",
  "- Settings / environment policy:",
  "- Migration policy:",
  "- DB compatibility policy:",
  "- Transaction / service boundary:",
  "- Auth / permission / admin boundary:",
  "- Background job boundary:",
  "- Test convention:",
  "- Static / media / admin customization boundary:",
  "- State machine artifact:",
  "- Approval rule matrix:",
  "- Role / permission matrix:",
  "- Audit event spec:",
  "- Exception / rollback / reopen rule:",
  "- Runtime / framework:",
  "- Rendering / app mode:",
  "- Data persistence boundary:",
  "- Auth / user identity requirement:",
  "- Deployment target:",
  "- External API / integration boundary:",
  "- Lightweight acceptance:",
  "- Android package namespace:",
  "- Kotlin / Java policy:",
  "- Gradle / AGP version:",
  "- minSdk / targetSdk:",
  "- Signing policy:",
  "- Build variants / flavors:",
  "- Permissions policy:",
  "- Local storage policy:",
  "- Network security / API boundary:",
  "- Navigation structure:",
  "- Offline / sync policy:",
  "- Notification policy:",
  "- Privacy / data policy:",
  "- Device / emulator test plan:",
  "- Release channel:",
  "- BI data source inventory reference:",
  "- BI metric catalog reference:",
  "- BI semantic model reference:",
  "- BI refresh and lineage plan reference:",
  "- BI dashboard governance reference:",
  "- Primary analytical subject area:",
  "- Source-to-model mapping summary:",
  "- Metric ownership and certification summary:",
  "- Freshness / latency expectation:",
  "- Access / role / row-filter rule:",
  "- Reconciliation / backfill / rollback rule:"
];

const OPTIONAL_PROFILE_REQUIREMENTS = [
  {
    profileId: "PRF-01",
    relativePath: "reference/profiles/PRF-01_ADMIN_GRID_APPLICATION_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Primary admin entity / surface:",
      "- Grid interaction model:",
      "- Search / filter / sort / pagination behavior:",
      "- Row action / bulk action rule:",
      "- Edit / save pattern:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-02",
    relativePath: "reference/profiles/PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Source spreadsheet artifact:",
      "- Workbook / sheet / tab / range trace:",
      "- Header / column mapping:",
      "- Row key / record identity rule:",
      "- Source snapshot / version:",
      "- Transformation / normalization assumptions:",
      "- Reconciliation / overwrite rule:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-03",
    relativePath: "reference/profiles/PRF-03_AIRGAPPED_DELIVERY_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Transfer package / bundle artifact:",
      "- Transfer medium / handoff channel:",
      "- Checksum / integrity evidence:",
      "- Offline dependency bundle status:",
      "- Ingress verification / import step:",
      "- Rollback package / recovery bundle:",
      "- Manual custody / operator handoff:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-04",
    relativePath: "reference/profiles/PRF-04_LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- Legacy system source inventory:",
      "- Workbook / sheet / tab / range trace:",
      "- Header / column mapping:",
      "- VBA module / macro / function inventory:",
      "- MariaDB schema snapshot:",
      "- Current import / export / report paths:",
      "- Source-of-truth ownership:",
      "- Migration / reconciliation plan:",
      "- Parallel-run / reconciliation evidence:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-05",
    relativePath: "reference/profiles/PRF-05_PYTHON_DJANGO_BACKOFFICE_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- Python / Django version policy:",
      "- Supported-version / security-support rationale:",
      "- Dependency manager:",
      "- Django app / module boundary:",
      "- Settings / environment policy:",
      "- Migration policy:",
      "- DB compatibility policy:",
      "- Transaction / service boundary:",
      "- Auth / permission / admin boundary:",
      "- Background job boundary:",
      "- Test convention:",
      "- Static / media / admin customization boundary:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-06",
    relativePath: "reference/profiles/PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- State machine artifact:",
      "- Approval rule matrix:",
      "- Role / permission matrix:",
      "- Audit event spec:",
      "- Exception / rollback / reopen rule:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-07",
    relativePath: "reference/profiles/PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- Runtime / framework:",
      "- Rendering / app mode:",
      "- Data persistence boundary:",
      "- Auth / user identity requirement:",
      "- Deployment target:",
      "- External API / integration boundary:",
      "- Lightweight acceptance:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-08",
    relativePath: "reference/profiles/PRF-08_ANDROID_NATIVE_APP_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- Android package namespace:",
      "- Kotlin / Java policy:",
      "- Gradle / AGP version:",
      "- minSdk / targetSdk:",
      "- Signing policy:",
      "- Build variants / flavors:",
      "- Permissions policy:",
      "- Local storage policy:",
      "- Network security / API boundary:",
      "- Navigation structure:",
      "- Offline / sync policy:",
      "- Notification policy:",
      "- Privacy / data policy:",
      "- Device / emulator test plan:",
      "- Release channel:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-09",
    relativePath: "reference/profiles/PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 8. Required Packet Evidence",
      "## 10. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- Package ownership policy:",
      "- Node.js product runtime policy:",
      "- Package manager:",
      "- Framework / bundler:",
      "- Build command:",
      "- Test command:",
      "- Environment variable policy:",
      "- API / backend boundary:",
      "- Static asset / routing policy:",
      "- Deployment target:",
      "- Profile deviation / exception:"
    ]
  },
  {
    profileId: "PRF-10",
    relativePath: "reference/profiles/PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md",
    requiredMarkers: [
      "## Approval Rule",
      "## 5. Required Packet Evidence",
      "## 8. Packet Citation Rule",
      "- Active profile references:",
      "- Product source root:",
      "- BI data source inventory reference:",
      "- BI metric catalog reference:",
      "- BI semantic model reference:",
      "- BI refresh and lineage plan reference:",
      "- BI dashboard governance reference:",
      "- Primary analytical subject area:",
      "- Source-to-model mapping summary:",
      "- Metric ownership and certification summary:",
      "- Freshness / latency expectation:",
      "- Access / role / row-filter rule:",
      "- Reconciliation / backfill / rollback rule:",
      "- Profile deviation / exception:"
    ]
  }
];

const TASK_PACKET_REQUIRED_HEADER_ITEMS = [
  { label: "Ready For Code" },
  { label: "User-facing impact" },
  { label: "Layer classification" },
  { label: "Active profile dependencies", aliases: ["Active profile dependency"] },
  { label: "Profile evidence status" },
  { label: "UX archetype status" },
  { label: "Environment topology status" },
  { label: "Domain foundation status" },
  { label: "Authoritative source intake status" },
  { label: "Shared-source wave status" },
  { label: "Packet exit gate status" },
  { label: "Existing system dependency" },
  { label: "New authoritative source impact" }
];
const PLANNER_PACKET_CHALLENGE_HEADING = "## Planner Packet Challenge Review";
const PLANNER_PACKET_CHALLENGE_EVIDENCE_FIELDS = [
  "Challenge reviewer",
  "Challenge reviewer independence basis",
  "Source refs reviewed",
  "Challenge evidence artifact path",
  "Findings disposition",
  "Required corrections applied",
  "No self-approval claim"
];
const TASK_PACKET_EXACT_FIELD_ENUMS = [
  {
    label: "Change zone",
    expected: ["core", "load-bearing", "padded", "prototype"],
    noteLabel: "Change-zone rationale"
  },
  {
    label: "Schema impact classification",
    expected: ["none", "not-needed", "not needed", "no", "low", "medium", "high", "conditional"],
    noteLabel: "Schema impact note"
  }
];
const ACTIVE_CONTEXT_MARKDOWN_REQUIRED_MARKERS = [
  "# 활성 컨텍스트",
  "## 시작 계약",
  "## 다음 작업",
  "## 먼저 다시 읽을 항목",
  "## 검증 상태"
];

const TASK_PACKET_PROFILE_FIELD_REQUIREMENTS = {
  "PRF-01": [
    "Primary admin entity / surface",
    "Grid interaction model",
    "Search / filter / sort / pagination behavior",
    "Row action / bulk action rule",
    "Edit / save / confirm / audit pattern"
  ],
  "PRF-02": [
    "Source spreadsheet artifact",
    "Workbook / sheet / tab / range trace",
    "Header / column mapping",
    "Row key / record identity rule",
    "Source snapshot / version",
    "Transformation / normalization assumptions",
    "Reconciliation / overwrite rule"
  ],
  "PRF-03": [
    "Transfer package / bundle artifact",
    "Transfer medium / handoff channel",
    "Checksum / integrity evidence",
    "Offline dependency bundle status",
    "Ingress verification / import step",
    "Rollback package / recovery bundle",
    "Manual custody / operator handoff"
  ],
  "PRF-04": [
    "Product source root",
    "Legacy system source inventory",
    "Workbook / sheet / tab / range trace",
    "Header / column mapping",
    "VBA module / macro / function inventory",
    "MariaDB schema snapshot",
    "Current import / export / report paths",
    "Source-of-truth ownership",
    "Migration / reconciliation plan",
    "Parallel-run / reconciliation evidence"
  ],
  "PRF-05": [
    "Product source root",
    "Python / Django version policy",
    "Supported-version / security-support rationale",
    "Dependency manager",
    "Django app / module boundary",
    "Settings / environment policy",
    "Migration policy",
    "DB compatibility policy",
    "Transaction / service boundary",
    "Auth / permission / admin boundary",
    "Background job boundary",
    "Test convention",
    "Static / media / admin customization boundary"
  ],
  "PRF-06": [
    "Product source root",
    "State machine artifact",
    "Approval rule matrix",
    "Role / permission matrix",
    "Audit event spec",
    "Exception / rollback / reopen rule"
  ],
  "PRF-07": [
    "Product source root",
    "Runtime / framework",
    "Rendering / app mode",
    "Data persistence boundary",
    "Auth / user identity requirement",
    "Deployment target",
    "External API / integration boundary",
    "Lightweight acceptance"
  ],
  "PRF-08": [
    "Product source root",
    "Android package namespace",
    "Kotlin / Java policy",
    "Gradle / AGP version",
    "minSdk / targetSdk",
    "Signing policy",
    "Build variants / flavors",
    "Permissions policy",
    "Local storage policy",
    "Network security / API boundary",
    "Navigation structure",
    "Offline / sync policy",
    "Notification policy",
    "Privacy / data policy",
    "Device / emulator test plan",
    "Release channel"
  ],
  "PRF-09": [
    "Product source root",
    "Package ownership policy",
    "Node.js product runtime policy",
    "Package manager",
    "Framework / bundler",
    "Build command",
    "Test command",
    "Environment variable policy",
    "API / backend boundary",
    "Static asset / routing policy",
    "Deployment target"
  ],
  "PRF-10": [
    "Product source root",
    "BI data source inventory reference",
    "BI metric catalog reference",
    "BI semantic model reference",
    "BI refresh and lineage plan reference",
    "BI dashboard governance reference",
    "Primary analytical subject area",
    "Source-to-model mapping summary",
    "Metric ownership and certification summary",
    "Freshness / latency expectation",
    "Access / role / row-filter rule",
    "Reconciliation / backfill / rollback rule"
  ]
};

export function validateGeneratedStateDocs({
  store,
  outputDir = process.cwd(),
  repoRoot = outputDir
}) {
  const findings = [];
  const riskClassifications = [];
  const currentStatePath = resolveGeneratedDocReadPath({ outputDir, docName: CURRENT_STATE_DOC });
  const taskListPath = resolveGeneratedDocReadPath({ outputDir, docName: TASK_LIST_DOC });

  const currentStateContent = readUtf8File(currentStatePath, findings);
  const taskListContent = readUtf8File(taskListPath, findings);

  if (currentStateContent != null) {
    validateRequiredSections(CURRENT_STATE_DOC, currentStateContent, findings);
    validateProjectionState(store, CURRENT_STATE_DOC, currentStateContent, findings);
    validateDecisionParity(store, currentStateContent, findings);
  }

  if (taskListContent != null) {
    validateRequiredSections(TASK_LIST_DOC, taskListContent, findings);
    validateProjectionState(store, TASK_LIST_DOC, taskListContent, findings);
    validateRiskParity(store, taskListContent, findings);
  }

  validateActiveContextContract({ store, repoRoot, outputDir, findings });
  validateCompatibilityFallbackSurface({
    store,
    repoRoot,
    relativePath: CURRENT_STATE_PATH,
    requiredMarkers: ["## Snapshot", "## Next Recommended Agent", "## Latest Handoff Summary"],
    findings
  });
  validateCompatibilityFallbackSurface({
    store,
    repoRoot,
    relativePath: TASK_LIST_PATH,
    requiredMarkers: ["## Active Locks", "## Active Tasks", "## Completed Tasks", "## Handoff Log"],
    findings
  });
  validateSourceRefs(store, repoRoot, findings);
  validateFreshness(store, findings);
  validateHarnessOwnedPaths(repoRoot, findings);
  validateStructuredTaskTruth(repoRoot, findings);
  validateRootStatusSurfaceWarnings(repoRoot, findings);
  validateDerivedOperationalSurfaceConflicts({ store, repoRoot, findings });
  validateActiveProfiles(repoRoot, findings);
  validateProfileAwareContracts(repoRoot, findings);
  validateRegisteredTaskPackets(store, repoRoot, findings, riskClassifications);
  validateActiveProfileUsageContracts({ store, repoRoot, findings });
  validateReviewReportReferences(repoRoot, findings);
  validateGateProfileContracts(store, repoRoot, findings);
  validateWorkflowContracts(repoRoot, findings);
  validateStarterSync(repoRoot, findings);
  validateRuntimeSchemaAuthority(repoRoot, findings);
  validateReleaseBaselineConsistency(store, repoRoot, findings);

  const blockingFindings = findings.filter((finding) => finding.severity === "error");
  const structuralReady = blockingFindings.length === 0;
  const cutoverReady = structuralReady;

  if (!structuralReady) {
    findings.push({
      code: "structural_preflight_failed",
      severity: "error",
      message: "Structural preflight failed because unresolved generated-doc or harness-state findings remain."
    });
    findings.push({
      code: "cutover_preflight_failed",
      severity: "error",
      message: "Compatibility alias: cutover preflight failed because unresolved structural findings remain."
    });
  }

  return {
    ok: blockingFindings.length === 0,
    structuralReady,
    cutoverReady,
    findings,
    riskClassifications
  };
}

export function inspectTaskPacketContract({
  repoRoot = process.cwd(),
  packetPath,
  artifactId = null,
  content = null,
  stage = "validation-report"
} = {}) {
  const findings = [];
  if (!packetPath) {
    findings.push({
      code: "task_packet_missing",
      severity: "warning",
      packetPath: packetPath ?? null,
      message: "Task packet semantic inspection requires packetPath."
    });
    return { ok: false, findings, header: null, fields: {} };
  }

  const resolvedPacketPath = path.resolve(repoRoot, packetPath);
  const packetContent =
    content ??
    readRequiredUtf8File({
      filePath: resolvedPacketPath,
      findings,
      missingCode: "task_packet_missing",
      missingMessage: `Missing task packet artifact: ${packetPath}.`,
      pathKey: "packetPath"
    });
  if (packetContent == null) {
    return { ok: false, findings, header: null, fields: {} };
  }

  const artifact = {
    artifactId: artifactId ?? path.basename(packetPath, path.extname(packetPath)),
    path: packetPath
  };
  const riskClassifications = [];
  const header = parseQuickDecisionHeader(packetContent);
  if (!header) {
    findings.push({
      code: "task_packet_header_missing",
      severity: "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      message: `${artifact.path} is missing the Quick Decision Header table required for task-packet validation.`
    });
    return { ok: false, findings, header: null, fields: {} };
  }

  const fields = parseBulletFields(packetContent);
  validateTaskPacketHeader({ artifact, header, findings });
  validateTaskPacketEvidence({
    artifact,
    header,
    fields,
    content: packetContent,
    repoRoot,
    stage,
    findings,
    riskClassifications
  });
  validateTaskPacketExactFieldEnums({ artifact, fields, findings });

  return {
    ok: findings.every((finding) => finding.severity !== "error"),
    findings,
    header,
    fields,
    riskClassification: riskClassifications[0] ?? null
  };
}

function validateHarnessOwnedPaths(repoRoot, findings) {
  const packageJsonPath = path.resolve(repoRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const requiredPaths = [
    ".harness/runtime/state/harness-cli.js",
    ".harness/runtime/state/dev05-cli.js",
    ".harness/runtime/state/cli-dispatch-table.js",
    ".harness/runtime/state/cli-help.js",
    ".harness/runtime/state/drift-validator.js",
    GATE_PROFILE_CONTRACT_PATH,
    ".harness/runtime/state/active-context.js",
    ".harness/test",
    REPOSITORY_LAYOUT_PATH
  ];

  for (const relativePath of requiredPaths) {
    if (fs.existsSync(path.resolve(repoRoot, relativePath))) {
      continue;
    }

    findings.push({
      code: "harness_owned_path_missing",
      severity: "warning",
      path: relativePath,
      message: `Missing required harness-owned path ${relativePath}.`
    });
  }

  validatePackageCommandSurface(repoRoot, findings);
}

function validatePackageCommandSurface(repoRoot, findings) {
  const packageJsonPath = path.resolve(repoRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const requiredScripts = [
    "test",
    "harness:init",
    "harness:validate",
    "harness:doctor",
    "harness:status",
    "harness:next",
    "harness:explain",
    "harness:validation-report",
    "harness:context",
    "harness:transition",
    "harness:migration-preview",
    "harness:migration-apply",
    "harness:cutover-preflight",
    "harness:cutover-report"
  ];

  for (const script of requiredScripts) {
    if (packageJson.scripts?.[script]) {
      continue;
    }
    findings.push({
      code: "harness_command_missing",
      severity: "error",
      path: "package.json",
      script,
      message: `package.json is missing required harness command ${script}.`
    });
  }
}

function validateStructuredTaskTruth(repoRoot, findings) {
  const taskListPath = path.resolve(repoRoot, TASK_LIST_PATH);
  if (!fs.existsSync(taskListPath)) {
    findings.push({
      code: "structured_task_truth_missing",
      severity: "error",
      path: TASK_LIST_PATH,
      message: `${TASK_LIST_PATH} is required as the structured task truth artifact.`
    });
    return;
  }

  const content = fs.readFileSync(taskListPath, "utf8");
  const requiredSections = [
    "## Active Locks",
    "## Active Tasks",
    "## Blocked Tasks",
    "## Completed Tasks",
    "## Handoff Log"
  ];
  const parsedTables = {};

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      findings.push({
        code: "structured_task_table_missing",
        severity: "warning",
        path: TASK_LIST_PATH,
        section,
        message: `${TASK_LIST_PATH} is missing required section ${section}.`
      });
      continue;
    }

    if (section === "## Handoff Log") {
      continue;
    }

    const sectionContent = sliceSection(content, section);
    const table = parseMarkdownTable(sectionContent);
    if (!table) {
      findings.push({
        code: "structured_task_table_malformed",
        severity: "error",
        path: TASK_LIST_PATH,
        section,
        message: `${TASK_LIST_PATH} section ${section} must expose a Markdown table.`
      });
      continue;
    }

    parsedTables[section] = table;
    for (const header of STRUCTURED_TASK_TABLE_HEADERS[section] ?? []) {
      if (table.headers.includes(header)) {
        continue;
      }
      findings.push({
        code: "structured_task_table_header_missing",
        severity: "error",
        path: TASK_LIST_PATH,
        section,
        header,
        message: `${TASK_LIST_PATH} section ${section} is missing required table header ${header}.`
      });
    }
  }

  validateStructuredTaskConsistency(parsedTables, findings);
}

function validateDerivedOperationalSurfaceConflicts({ store, repoRoot, findings }) {
  if (looksLikeStarterPlaceholder(repoRoot)) {
    return;
  }
  validateCurrentStateOperationalAuthorityConflict({ store, repoRoot, findings });
  validateTaskListOperationalAuthorityConflict({ store, repoRoot, findings });
}

function validateCurrentStateOperationalAuthorityConflict({ store, repoRoot, findings }) {
  const currentStatePath = path.resolve(repoRoot, CURRENT_STATE_PATH);
  if (!fs.existsSync(currentStatePath)) {
    return;
  }

  const releaseState = store.getReleaseState("current");
  const content = fs.readFileSync(currentStatePath, "utf8");
  const snapshot = sliceSection(content, "## Snapshot");
  const currentStage = readLabeledBulletValue(snapshot, "Current Stage");
  const currentFocus = readLabeledBulletValue(snapshot, "Current Focus");
  const nextRecommendedAgent = extractFirstValue(sliceSection(content, "## Next Recommended Agent"));
  const handoffExecution = resolveHandoffExecution({
    repoRoot,
    workItems: store.listWorkItems(),
    latestHandoff: store.listRecentHandoffs(1)[0] ?? null
  });

  if (
    hasConcreteValue(currentStage, { allowUnknown: false }) &&
    normalizeValue(currentStage) !== normalizeValue(releaseState?.currentStage ?? "unknown")
  ) {
    findings.push({
      code: "current_state_operational_authority_conflict",
      severity: "warning",
      path: CURRENT_STATE_PATH,
      field: "Current Stage",
      message: `${CURRENT_STATE_PATH} Current Stage does not match canonical release state.`
    });
  }

  if (
    hasConcreteValue(currentFocus, { allowUnknown: false }) &&
    normalizeValue(currentFocus) !== normalizeValue(releaseState?.currentFocus ?? "unknown")
  ) {
    findings.push({
      code: "current_state_operational_authority_conflict",
      severity: "warning",
      path: CURRENT_STATE_PATH,
      field: "Current Focus",
      message: `${CURRENT_STATE_PATH} Current Focus does not match canonical release state.`
    });
  }

  const expectedWorkflow = handoffExecution.workflow === "manual_selection_required" ? null : handoffExecution.workflow;
  const declaredWorkflow = workflowForOwner(nextRecommendedAgent);
  if (
    hasConcreteValue(nextRecommendedAgent, { allowUnknown: false }) &&
    handoffExecution.resolvedBy !== "default_planner" &&
    expectedWorkflow &&
    declaredWorkflow !== expectedWorkflow
  ) {
    findings.push({
      code: "current_state_operational_authority_conflict",
      severity: "warning",
      path: CURRENT_STATE_PATH,
      field: "Next Recommended Agent",
      message: `${CURRENT_STATE_PATH} Next Recommended Agent does not match canonical live routing.`
    });
  }
}

function validateTaskListOperationalAuthorityConflict({ store, repoRoot, findings }) {
  const taskListPath = path.resolve(repoRoot, TASK_LIST_PATH);
  if (!fs.existsSync(taskListPath)) {
    return;
  }

  const expectedActiveTask = selectActiveWorkItem(store.listWorkItems(), { repoRoot });
  const content = fs.readFileSync(taskListPath, "utf8");
  const activeTasksTable = parseMarkdownTable(sliceSection(content, "## Active Tasks"));
  const activeTaskRows = taskRows(activeTasksTable?.rows ?? []);

  if (!expectedActiveTask) {
    if (activeTaskRows.length > 0) {
      findings.push({
        code: "task_list_operational_authority_conflict",
        severity: "warning",
        path: TASK_LIST_PATH,
        message: `${TASK_LIST_PATH} records an active task even though canonical live state has no active work item.`
      });
    }
    return;
  }

  const matchingRow = activeTaskRows.find((row) => normalizeValue(row["Task ID"] ?? "") === normalizeValue(expectedActiveTask.workItemId));
  if (!matchingRow) {
    return;
  }

  if (normalizeTaskStatus(matchingRow.Status) !== normalizeTaskStatus(expectedActiveTask.status)) {
    findings.push({
      code: "task_list_operational_authority_conflict",
      severity: "warning",
      path: TASK_LIST_PATH,
      taskId: expectedActiveTask.workItemId,
      field: "Status",
      message: `${TASK_LIST_PATH} task ${expectedActiveTask.workItemId} status does not match canonical live state.`
    });
  }

  const expectedOwnerWorkflow = workflowForOwner(expectedActiveTask.owner ?? "");
  const declaredOwnerWorkflow = workflowForOwner(matchingRow.Owner);
  if (
    hasConcreteValue(matchingRow.Owner, { allowUnknown: false }) &&
    expectedOwnerWorkflow !== "manual_selection_required" &&
    declaredOwnerWorkflow !== expectedOwnerWorkflow
  ) {
    findings.push({
      code: "task_list_operational_authority_conflict",
      severity: "warning",
      path: TASK_LIST_PATH,
      taskId: expectedActiveTask.workItemId,
      field: "Owner",
      message: `${TASK_LIST_PATH} task ${expectedActiveTask.workItemId} owner does not match canonical live routing.`
    });
  }
}

function validateStructuredTaskConsistency(parsedTables, findings) {
  const activeLockRows = taskRows(parsedTables["## Active Locks"]?.rows ?? []);
  const activeTaskRows = taskRows(parsedTables["## Active Tasks"]?.rows ?? []);
  const completedTaskRows = taskRows(parsedTables["## Completed Tasks"]?.rows ?? []);
  const lockedTaskIds = new Set();
  const lockedScopes = new Map();

  for (const row of activeLockRows) {
    const taskId = row["Task ID"];
    const scope = row.Scope;
    if (lockedTaskIds.has(taskId)) {
      findings.push({
        code: "structured_task_duplicate_lock",
        severity: "error",
        path: TASK_LIST_PATH,
        taskId,
        message: `${TASK_LIST_PATH} declares duplicate active lock for task ${taskId}.`
      });
    }
    lockedTaskIds.add(taskId);

    if (hasConcreteValue(scope, { allowUnknown: false })) {
      const normalizedScope = normalizeValue(scope);
      if (lockedScopes.has(normalizedScope)) {
        findings.push({
          code: "structured_task_duplicate_lock",
          severity: "error",
          path: TASK_LIST_PATH,
          taskId,
          scope,
          message: `${TASK_LIST_PATH} declares duplicate active lock scope ${scope}.`
        });
      }
      lockedScopes.set(normalizedScope, taskId);
    }
  }

  for (const row of activeTaskRows) {
    const taskId = row["Task ID"];
    const status = normalizeTaskStatus(row.Status);
    if (TASK_STATUSES_REQUIRING_LOCK.has(status) && !lockedTaskIds.has(taskId)) {
      findings.push({
        code: "structured_task_lock_missing",
        severity: "error",
        path: TASK_LIST_PATH,
        taskId,
        status: row.Status,
        message: `${TASK_LIST_PATH} marks task ${taskId} as ${row.Status} without a matching active lock.`
      });
    }
  }

  for (const row of completedTaskRows) {
    if (!hasConcreteValue(row.Verification, { allowUnknown: false })) {
      findings.push({
        code: "structured_task_completed_verification_missing",
        severity: "error",
        path: TASK_LIST_PATH,
        taskId: row["Task ID"],
        message: `${TASK_LIST_PATH} completed task ${row["Task ID"]} is missing verification evidence.`
      });
    }
  }
}

function taskRows(rows) {
  return rows.filter((row) => hasConcreteValue(row["Task ID"], { allowUnknown: false }));
}

function extractFirstValue(sectionContent) {
  if (!sectionContent) {
    return null;
  }

  for (const rawLine of sectionContent.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("## ")) {
      continue;
    }
    if (line.startsWith("- ")) {
      return line.slice(2).trim();
    }
    return line;
  }

  return null;
}

function normalizeTaskStatus(value) {
  return normalizeValue(value ?? "").replace(/[_-]/g, " ");
}

function isClosedWorkItemStatus(status) {
  return ["closed", "done", "complete", "completed"].includes(normalizeTaskStatus(status));
}

function validateActiveProfiles(repoRoot, findings) {
  const activeProfilesPath = path.resolve(repoRoot, ACTIVE_PROFILES_PATH);
  if (!fs.existsSync(activeProfilesPath)) {
    findings.push({
      code: "active_profile_artifact_missing",
      severity: "error",
      path: ACTIVE_PROFILES_PATH,
      message: `${ACTIVE_PROFILES_PATH} is required even when no optional profiles are active.`
    });
    return;
  }

  const content = fs.readFileSync(activeProfilesPath, "utf8");
  const sectionContent = sliceSection(content, "## Active Profile Table") ?? content;
  const requiredColumns = [
    "Profile ID",
    "Activation reason",
    "Required evidence artifacts",
    "Evidence status",
    "Activated by",
    "Activated at",
    "Applies to packets"
  ];

  for (const column of requiredColumns) {
    if (content.includes(column)) {
      continue;
    }
    findings.push({
      code: "active_profile_table_malformed",
      severity: "error",
      path: ACTIVE_PROFILES_PATH,
      column,
      message:
        `${ACTIVE_PROFILES_PATH} is missing required column ${column}. ` +
        "Expected Active Profile Table columns: Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets. " +
        "Preserve the reusable ## Active Profile Table template when customizing copied starter content."
    });
  }

  for (const line of readFirstMarkdownTableBodyLines(sectionContent).filter((item) => item.startsWith("| PRF-"))) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const [profileId = "", , evidenceArtifacts = "", evidenceStatus = ""] = cells;
    const profile = OPTIONAL_PROFILE_REQUIREMENTS.find((item) => item.profileId === profileId);
    if (!profile) {
      findings.push({
        code: "active_profile_unknown",
        severity: "error",
        path: ACTIVE_PROFILES_PATH,
        profileId,
        message: `${ACTIVE_PROFILES_PATH} declares unknown profile ${profileId}.`
      });
      continue;
    }

    if (!fs.existsSync(path.resolve(repoRoot, profile.relativePath))) {
      findings.push({
        code: "active_profile_reference_missing",
        severity: "error",
        path: ACTIVE_PROFILES_PATH,
        profileId,
        message: `${ACTIVE_PROFILES_PATH} declares ${profileId}, but ${profile.relativePath} is missing.`
      });
    }

    if (normalizeValue(evidenceStatus) === "approved" && !hasConcreteValue(evidenceArtifacts)) {
      findings.push({
        code: "active_profile_required_evidence_missing",
        severity: "error",
        path: ACTIVE_PROFILES_PATH,
        profileId,
        message: `${ACTIVE_PROFILES_PATH} marks ${profileId} approved without required evidence artifacts.`
      });
    }
  }
}

function validateWorkflowContracts(repoRoot, findings) {
  const roots = [
    {
      label: "root",
      rootPath: repoRoot,
      displayPrefix: ""
    }
  ];
  const starterRoot = path.resolve(repoRoot, "standard-template");

  if (fs.existsSync(path.resolve(starterRoot, ".agents", "workflows"))) {
    roots.push({
      label: "standard-template",
      rootPath: starterRoot,
      displayPrefix: "standard-template"
    });
  }

  for (const root of roots) {
    validateWorkflowContractRoot(root, findings);
  }
}

function validateWorkflowContractRoot({ label, rootPath, displayPrefix }, findings) {
  const workflowDir = path.resolve(rootPath, ".agents", "workflows");
  if (!fs.existsSync(workflowDir)) {
    return;
  }

  for (const relativePath of WORKFLOW_CONTRACT_PATHS) {
    const absolutePath = path.resolve(rootPath, relativePath);
    const displayPath = displayPrefix
      ? path.posix.join(displayPrefix, relativePath)
      : relativePath;

    if (!fs.existsSync(absolutePath)) {
      findings.push({
        code: "workflow_contract_file_missing",
        severity: "error",
        path: displayPath,
        root: label,
        message: `${displayPath} is required for supported handoff routing.`
      });
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    const missingSections = findMissingWorkflowContractSections(content);
    for (const section of missingSections) {
      findings.push({
        code: "workflow_contract_section_missing",
        severity: "error",
        path: displayPath,
        root: label,
        section,
        expectedSections: WORKFLOW_CONTRACT_SECTIONS,
        message: `${displayPath} is missing required workflow contract section ${section}.`
      });
    }
    validateRequiredContentMarkers({
      content,
      markers: WORKFLOW_BEHAVIOR_REQUIRED_MARKERS,
      code: "workflow_behavior_guidance_missing",
      severity: "error",
      path: displayPath,
      root: label,
      findings
    });
  }

  validateAgentBehaviorGuidanceRoot({ label, rootPath, displayPrefix }, findings);
}

function validateAgentBehaviorGuidanceRoot({ label, rootPath, displayPrefix }, findings) {
  const guidePath = path.resolve(rootPath, AGENT_BEHAVIOR_GUIDE_PATH);
  const guideDisplayPath = displayPrefix
    ? path.posix.join(displayPrefix, AGENT_BEHAVIOR_GUIDE_PATH)
    : AGENT_BEHAVIOR_GUIDE_PATH;

  if (!fs.existsSync(guidePath)) {
    findings.push({
      code: "agent_behavior_guidance_missing",
      severity: "error",
      path: guideDisplayPath,
      root: label,
      message: `${guideDisplayPath} is required so reusable agent behavior guidance cannot silently regress.`
    });
  } else {
    validateRequiredContentMarkers({
      content: fs.readFileSync(guidePath, "utf8"),
      markers: AGENT_BEHAVIOR_GUIDE_REQUIRED_MARKERS,
      code: "agent_behavior_guidance_incomplete",
      severity: "error",
      path: guideDisplayPath,
      root: label,
      findings
    });
  }

  for (const relativePath of AGENT_BEHAVIOR_SKILL_PATHS) {
    const skillPath = path.resolve(rootPath, relativePath);
    const displayPath = displayPrefix
      ? path.posix.join(displayPrefix, relativePath)
      : relativePath;

    if (!fs.existsSync(skillPath)) {
      findings.push({
        code: "skill_behavior_guidance_missing",
        severity: "error",
        path: displayPath,
        root: label,
        message: `${displayPath} must include reusable day-start/day-wrap-up behavior guidance.`
      });
      continue;
    }

    validateRequiredContentMarkers({
      content: fs.readFileSync(skillPath, "utf8"),
      markers: SKILL_BEHAVIOR_REQUIRED_MARKERS,
      code: "skill_behavior_guidance_incomplete",
      severity: "error",
      path: displayPath,
      root: label,
      findings
    });
  }
}

function validateRequiredContentMarkers({ content, markers, code, severity, path: artifactPath, root, findings }) {
  for (const marker of markers) {
    if (content.includes(marker)) {
      continue;
    }
    findings.push({
      code,
      severity,
      path: artifactPath,
      root,
      marker,
      message: `${artifactPath} is missing required reusable behavior guidance marker: ${marker}.`
    });
  }
}

function validateStarterSync(repoRoot, findings) {
  const starterRoot = path.resolve(repoRoot, "standard-template");
  if (!fs.existsSync(starterRoot)) {
    return;
  }

  const syncPaths = [
    "AGENTS.md",
    ".agents/rules/HARNESS_OPERATING_CONTRACT.md",
    AGENT_BEHAVIOR_GUIDE_PATH,
    ...AGENT_BEHAVIOR_SKILL_PATHS,
    RUNTIME_SCHEMA_COMPATIBILITY_PATH,
    ".agents/scripts/init-project.js",
    ".harness/runtime/state/active-context.js",
    ".harness/runtime/state/harness-cli.js",
    ".harness/runtime/state/cli-dispatch-table.js",
    ".harness/runtime/state/cli-help.js",
    ".harness/runtime/state/closeout-decision.js",
    ".harness/runtime/state/dev05-cli.js",
    ".harness/runtime/state/dev05-tooling.js",
    ".harness/runtime/state/drift-validator.js",
    ".harness/runtime/state/migration-cutover.js",
    ".harness/runtime/state/packet-contract.js",
    ".harness/runtime/state/status-commands.js",
    ".harness/runtime/state/transition-commands.js",
    ".harness/runtime/state/validation-core.js",
    ".harness/runtime/state/validation-report.js",
    GATE_PROFILE_CONTRACT_PATH,
    ".harness/runtime/state/generate-state-docs.js",
    ".harness/runtime/state/harness-paths.js",
    ".harness/runtime/state/lib/packet-markdown.js",
    ".harness/runtime/state/init-project.js",
    RUNTIME_SCHEMA_AUTHORITY_PATH,
    ".harness/runtime/state/operating-state-store.js",
    ".harness/runtime/state/release-baseline.js",
    ".harness/runtime/state/workflow-routing.js",
    ".harness/test/active-context.test.js",
    ".harness/test/dev05-tooling.test.js",
    ".harness/test/generated-state-docs.test.js",
    ".harness/test/init-project.test.js",
    ".harness/test/operating-state-store.test.js",
    ".harness/test/profile-aware-validator-fixtures.js",
    "reference/README.md",
    "reference/manuals/human/HARNESS_MANUAL.md",
    "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    "reference/profiles/README.md",
    "reference/artifacts/LEGACY_SYSTEM_INTAKE.md",
    "reference/artifacts/MIGRATION_RECONCILIATION_PLAN.md",
    "reference/artifacts/DJANGO_BACKOFFICE_CONVENTIONS.md",
    "reference/artifacts/WORKFLOW_STATE_MACHINE.md",
    "reference/artifacts/APPROVAL_RULE_MATRIX.md",
    "reference/artifacts/ROLE_PERMISSION_MATRIX.md",
    "reference/artifacts/AUDIT_EVENT_SPEC.md",
    "reference/artifacts/EXCEPTION_REOPEN_ROLLBACK_RULES.md",
    "reference/artifacts/LIGHTWEIGHT_APP_BASELINE.md",
    "reference/artifacts/ANDROID_APP_BASELINE.md",
    "reference/artifacts/NODE_FRONTEND_APP_BASELINE.md",
    "reference/profiles/PRF-01_ADMIN_GRID_APPLICATION_PROFILE.md",
    "reference/profiles/PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md",
    "reference/profiles/PRF-03_AIRGAPPED_DELIVERY_PROFILE.md",
    "reference/profiles/PRF-04_LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE.md",
    "reference/profiles/PRF-05_PYTHON_DJANGO_BACKOFFICE_PROFILE.md",
    "reference/profiles/PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE.md",
    "reference/profiles/PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md",
    "reference/profiles/PRF-08_ANDROID_NATIVE_APP_PROFILE.md",
    "reference/profiles/PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md",
    ...WORKFLOW_CONTRACT_PATHS,
    REPOSITORY_LAYOUT_PATH
  ];

  for (const relativePath of syncPaths) {
    const rootPath = path.resolve(repoRoot, relativePath);
    const starterPath = path.resolve(starterRoot, relativePath);
    if (!fs.existsSync(rootPath) || !fs.existsSync(starterPath)) {
      findings.push({
        code: "starter_sync_drift",
        severity: "error",
        path: relativePath,
        rootPath: normalizePathForFinding(rootPath),
        starterPath: normalizePathForFinding(starterPath),
        remediation: "Mirror the reusable file between root and standard-template, then rerun harness:validate or harness:sync-state.",
        message:
          `Root/starter sync path ${relativePath} is missing on one side. ` +
          `root=${normalizePathForFinding(rootPath)}; starter=${normalizePathForFinding(starterPath)}. ` +
          "Mirror the reusable file between root and standard-template, then rerun harness:validate or harness:sync-state."
      });
      continue;
    }

    if (fs.readFileSync(rootPath, "utf8") !== fs.readFileSync(starterPath, "utf8")) {
      findings.push({
        code: "starter_sync_drift",
        severity: "error",
        path: relativePath,
        rootPath: normalizePathForFinding(rootPath),
        starterPath: normalizePathForFinding(starterPath),
        remediation: "Mirror the reusable file between root and standard-template, then rerun harness:validate or harness:sync-state.",
        message:
          `Root and standard-template differ for reusable sync path ${relativePath}. ` +
          `root=${normalizePathForFinding(rootPath)}; starter=${normalizePathForFinding(starterPath)}. ` +
          "Mirror the reusable file between root and standard-template, then rerun harness:validate or harness:sync-state."
      });
    }
  }
}

function normalizePathForFinding(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function validateRuntimeSchemaAuthority(repoRoot, findings) {
  const authorityPath = path.resolve(repoRoot, RUNTIME_SCHEMA_AUTHORITY_PATH);
  const compatibilityPath = path.resolve(repoRoot, RUNTIME_SCHEMA_COMPATIBILITY_PATH);

  if (!fs.existsSync(authorityPath) || !fs.existsSync(compatibilityPath)) {
    return;
  }

  const authoritySchema = readJsonFileOrNull(authorityPath);
  const compatibilitySchema = readJsonFileOrNull(compatibilityPath);
  if (!authoritySchema || !compatibilitySchema) {
    return;
  }

  if (authoritySchema.schemaRole !== "authoritative_runtime_schema") {
    findings.push({
      code: "runtime_schema_authority_mismatch",
      severity: "error",
      path: RUNTIME_SCHEMA_AUTHORITY_PATH,
      message: `${RUNTIME_SCHEMA_AUTHORITY_PATH} must declare schemaRole authoritative_runtime_schema.`
    });
  }

  if (authoritySchema.compatibilitySummaryPath !== RUNTIME_SCHEMA_COMPATIBILITY_PATH) {
    findings.push({
      code: "runtime_schema_authority_mismatch",
      severity: "error",
      path: RUNTIME_SCHEMA_AUTHORITY_PATH,
      message:
        `${RUNTIME_SCHEMA_AUTHORITY_PATH} must point compatibilitySummaryPath to ${RUNTIME_SCHEMA_COMPATIBILITY_PATH}.`
    });
  }

  if (compatibilitySchema.schemaRole !== "compatibility_summary") {
    findings.push({
      code: "runtime_schema_authority_mismatch",
      severity: "error",
      path: RUNTIME_SCHEMA_COMPATIBILITY_PATH,
      message: `${RUNTIME_SCHEMA_COMPATIBILITY_PATH} must declare schemaRole compatibility_summary.`
    });
  }

  if (compatibilitySchema.authoritySource !== RUNTIME_SCHEMA_AUTHORITY_PATH) {
    findings.push({
      code: "runtime_schema_authority_mismatch",
      severity: "error",
      path: RUNTIME_SCHEMA_COMPATIBILITY_PATH,
      message: `${RUNTIME_SCHEMA_COMPATIBILITY_PATH} must point authoritySource to ${RUNTIME_SCHEMA_AUTHORITY_PATH}.`
    });
  }
}

function readJsonFileOrNull(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function validateReleaseBaselineConsistency(store, repoRoot, findings) {
  if (!isInstallableReleaseMaintainerRepo(repoRoot)) {
    return;
  }

  const releaseState = store.getReleaseState("current");
  if (!releaseState) {
    findings.push({
      code: "release_baseline_state_missing",
      severity: "error",
      message: "Maintainer release repo is missing the current release_state row."
    });
    return;
  }

  const releaseBaseline = releaseState.metadata?.releaseBaseline;
  if (
    releaseBaseline !== RELEASE_BASELINE.label ||
    !String(releaseState.currentFocus ?? "").includes(RELEASE_BASELINE.label) ||
    !String(releaseState.releaseGoal ?? "").includes(RELEASE_BASELINE.label)
  ) {
    findings.push({
      code: "release_baseline_state_drift",
      severity: "error",
      path: ".harness/operating_state.sqlite",
      expectedReleaseBaseline: RELEASE_BASELINE.label,
      actualReleaseBaseline: releaseBaseline ?? "missing",
      message:
        "Maintainer release baseline is implemented, but release_state still points at a different or missing baseline label."
    });
  }

  for (const requirement of ROOT_RELEASE_BASELINE_MARKERS) {
    const absolutePath = path.resolve(repoRoot, requirement.relativePath);
    const content = readRequiredUtf8File({
      filePath: absolutePath,
      findings,
      missingCode: "release_baseline_artifact_missing",
      missingMessage: `Missing required release-baseline artifact ${requirement.relativePath}.`
    });
    if (content == null || content.includes(requirement.marker)) {
      continue;
    }

    findings.push({
      code: "release_baseline_marker_missing",
      severity: "error",
      path: requirement.relativePath,
      expectedMarker: requirement.marker,
      message: `${requirement.relativePath} does not declare the current ${RELEASE_BASELINE.label} release baseline marker.`
    });
  }
}

function readUtf8File(filePath, findings) {
  return readRequiredUtf8File({
    filePath,
    findings,
    missingCode: "generation_failed",
    missingMessage: `Missing generated surface: ${path.basename(filePath)}`,
    pathKey: "path"
  });
}

function readRequiredUtf8File({
  filePath,
  findings,
  missingCode,
  missingMessage,
  pathKey = "path"
}) {
  if (!fs.existsSync(filePath)) {
    findings.push({
      code: missingCode,
      severity: "error",
      [pathKey]: filePath,
      message: missingMessage
    });
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    findings.push({
      code: "utf8_bom_detected",
      severity: "error",
      path: filePath,
      message: `${path.basename(filePath)} must be UTF-8 without BOM.`
    });
  }

  const content = buffer.toString("utf8");
  if (content.includes("\uFFFD")) {
    findings.push({
      code: "mojibake_detected",
      severity: "error",
      path: filePath,
      message: `${path.basename(filePath)} contains replacement characters that indicate mojibake.`
    });
  }

  return content;
}

function validateProfileAwareContracts(repoRoot, findings) {
  validateContractMarkers({
    repoRoot,
    relativePath: PACKET_TEMPLATE_PATH,
    requiredMarkers: PACKET_TEMPLATE_REQUIRED_MARKERS,
    missingFileCode: "packet_template_missing",
    missingMarkerCode: "packet_template_field_missing",
    findings
  });

  validateContractMarkers({
    repoRoot,
    relativePath: SOURCE_WAVE_LEDGER_PATH,
    requiredMarkers: SOURCE_WAVE_LEDGER_REQUIRED_MARKERS,
    missingFileCode: "source_wave_ledger_missing",
    missingMarkerCode: "source_wave_ledger_field_missing",
    findings
  });

  for (const profile of OPTIONAL_PROFILE_REQUIREMENTS) {
    validateContractMarkers({
      repoRoot,
      relativePath: profile.relativePath,
      requiredMarkers: profile.requiredMarkers,
      missingFileCode: "optional_profile_artifact_missing",
      missingMarkerCode: "optional_profile_evidence_missing",
      findings,
      profileId: profile.profileId
    });
  }
}

function validateRegisteredTaskPackets(store, repoRoot, findings, riskClassifications = []) {
  const registeredArtifacts = store.listArtifacts({ category: TASK_PACKET_ARTIFACT_CATEGORY });
  const activeWorkItemIds = new Set(
    store
      .listWorkItems()
      .filter((item) => !["completed", "closed", "done", "cancelled"].includes(normalizeValue(item.status)))
      .map((item) => normalizeOptionalValue(item.workItemId))
      .filter(Boolean)
  );
  const activeWorkItemSourceRefs = new Set(
    store
      .listWorkItems()
      .filter((item) => !["completed", "closed", "done", "cancelled"].includes(normalizeValue(item.status)))
      .map((item) => normalizeOptionalPath(item.sourceRef))
      .filter(Boolean)
  );

  for (const artifact of registeredArtifacts) {
    validateRegisteredTaskPacket({
      artifact,
      repoRoot,
      findings,
      riskClassifications,
      activeWorkItemIds,
      activeWorkItemSourceRefs
    });
  }

  for (const packetPath of discoverConcreteTaskPacketCandidates(repoRoot)) {
    const existingArtifact = store.getArtifactByPath(packetPath);
    if (existingArtifact?.category === TASK_PACKET_ARTIFACT_CATEGORY) {
      continue;
    }

    if (!existingArtifact) {
      findings.push({
        code: "task_packet_registration_missing",
        severity: "error",
        packetPath,
        message:
          `${packetPath} matches the current concrete task-packet contract under ${TASK_PACKET_DIRECTORY} ` +
          `but is not registered in artifact_index as category ${TASK_PACKET_ARTIFACT_CATEGORY}.`
      });
      validateRegisteredTaskPacket({
        artifact: createDiscoveredTaskPacketArtifact(packetPath),
        repoRoot,
        findings,
        riskClassifications
      });
      continue;
    }

    findings.push({
      code: "task_packet_registration_category_mismatch",
      severity: "error",
      artifactId: existingArtifact.artifactId,
      packetPath,
      category: existingArtifact.category,
      message:
        `${packetPath} matches the current concrete task-packet contract under ${TASK_PACKET_DIRECTORY} ` +
        `but artifact_index registers it as category ${existingArtifact.category} instead of ${TASK_PACKET_ARTIFACT_CATEGORY}.`
    });
    validateRegisteredTaskPacket({ artifact: existingArtifact, repoRoot, findings, riskClassifications });
  }
}

function validateActiveProfileUsageContracts({ store, repoRoot, findings }) {
  const activeProfiles = readActiveProfileRows(repoRoot);
  const constrainedProfiles = new Map(
    [...activeProfiles.entries()].filter(([, profile]) => {
      const status = normalizeValue(profile.evidenceStatus ?? "");
      return status && status !== "approved" && status !== "not-needed" && status !== "deferred-with-reason";
    })
  );
  if (constrainedProfiles.size === 0) {
    return;
  }

  const packetPaths = new Set([
    ...store
      .listArtifacts({ category: TASK_PACKET_ARTIFACT_CATEGORY })
      .map((artifact) => artifact.path)
      .filter(Boolean),
    ...discoverConcreteTaskPacketCandidates(repoRoot)
  ]);

  for (const packetPath of packetPaths) {
    const resolvedPacketPath = path.resolve(repoRoot, packetPath);
    if (!fs.existsSync(resolvedPacketPath)) {
      continue;
    }

    const content = fs.readFileSync(resolvedPacketPath, "utf8");
    const header = parseQuickDecisionHeader(content);
    if (!header) {
      continue;
    }

    const readyForCode = normalizeValue(getHeaderProposed(header, "Ready For Code"));
    const readyForCodeApproved = readyForCode === "approve" || readyForCode === "approved";
    if (!readyForCodeApproved) {
      continue;
    }

    const profileDependencies = extractProfileIds(
      getHeaderProposedWithAliases(header, "Active profile dependencies", ["Active profile dependency"])
    );
    for (const profileId of profileDependencies) {
      const profile = constrainedProfiles.get(profileId);
      if (!profile) {
        continue;
      }

      findings.push({
        code: "active_profile_pending_blocks_ready_for_code",
        severity: "error",
        path: ACTIVE_PROFILES_PATH,
        packetPath,
        profileId,
        message:
          `${packetPath} is marked Ready For Code approved while ${ACTIVE_PROFILES_PATH} ` +
          `keeps ${profileId} evidence status as ${profile.evidenceStatus || "missing"}.`
      });
    }
  }
}

function readActiveProfileRows(repoRoot) {
  const activeProfilesPath = path.resolve(repoRoot, ACTIVE_PROFILES_PATH);
  if (!fs.existsSync(activeProfilesPath)) {
    return new Map();
  }

  const rows = new Map();
  const content = fs.readFileSync(activeProfilesPath, "utf8");
  const sectionContent = sliceSection(content, "## Active Profile Table") ?? content;
  for (const line of readFirstMarkdownTableBodyLines(sectionContent).filter((item) => item.startsWith("| PRF-"))) {
    const cells = parseTableCells(line);
    const [profileId, activationReason, evidenceArtifacts, evidenceStatus, activatedBy, activatedAt, appliesToPackets] =
      cells;
    if (!profileId) {
      continue;
    }
    rows.set(profileId, {
      profileId,
      activationReason,
      evidenceArtifacts,
      evidenceStatus,
      activatedBy,
      activatedAt,
      appliesToPackets
    });
  }
  return rows;
}

function validateRootStatusSurfaceWarnings(repoRoot, findings) {
  const repoEntries = fs.existsSync(repoRoot) ? fs.readdirSync(repoRoot, { withFileTypes: true }) : [];
  const canonicalSurfaceGuidance =
    "Treat .agents/artifacts/TASK_LIST.md, .agents/artifacts/CURRENT_STATE.md, and the active packet as canonical harness authority.";
  for (const filename of ["task.md", "walkthrough.md"]) {
    const entry = repoEntries.find((item) => item.isFile() && item.name.toLowerCase() === filename);
    if (!entry) {
      continue;
    }
    findings.push({
      code: "root_status_surface_ambiguous",
      severity: "warning",
      path: entry.name,
      message: `${entry.name} exists at the repository root and can be mistaken for live harness task/state authority. ${canonicalSurfaceGuidance}`
    });
  }
}

function validateReviewReportReferences(repoRoot, findings) {
  const reportPath = path.resolve(repoRoot, REVIEW_REPORT_MARKDOWN);
  if (!fs.existsSync(reportPath)) {
    return;
  }

  const content = fs.readFileSync(reportPath, "utf8");
  for (const localRef of extractReviewReportLocalRefs(content)) {
    if (fs.existsSync(path.resolve(repoRoot, localRef))) {
      continue;
    }

    findings.push({
      code: "review_report_source_ref_missing",
      severity: "error",
      path: REVIEW_REPORT_MARKDOWN,
      sourceRef: localRef,
      message: `${REVIEW_REPORT_MARKDOWN} cites missing local evidence/source reference ${localRef}.`
    });
  }
}

function extractReviewReportLocalRefs(content) {
  const refs = new Set();
  const inlineCodeMatcher = /`([^`]+)`/g;
  for (const line of content.split(/\r?\n/)) {
    if (!/canonical docs updated/i.test(line)) {
      continue;
    }
    for (const match of line.matchAll(inlineCodeMatcher)) {
      const ref = normalizeReviewReportLocalRef(match[1]);
      if (ref) {
        refs.add(ref);
      }
    }
  }
  return [...refs];
}

function normalizeReviewReportLocalRef(value) {
  const ref = String(value ?? "").trim().replace(/\\/g, "/");
  if (!ref || ref.includes(" ") || /^[a-z]+:\/\//i.test(ref)) {
    return null;
  }
  if (/^(node|npm|pnpm|yarn|git|npx)(\.cmd)?$/i.test(ref)) {
    return null;
  }
  if (!/\.(md|json|js|mjs|cjs|ts|tsx|jsx|sql|db|sqlite)$/i.test(ref)) {
    return null;
  }
  if (path.isAbsolute(ref)) {
    return null;
  }
  return ref.replace(/^\.\//, "");
}

function validateGateProfileContracts(store, repoRoot, findings) {
  const activePacketWorkItems = prioritizeOpenWorkItems(store.listWorkItems(), { repoRoot })
    .filter((item) => item.sourceRef?.startsWith(`${TASK_PACKET_DIRECTORY}/`) && item.sourceRef.endsWith(".md"))
    .filter((item) => item.sourceRef !== PACKET_TEMPLATE_PATH);

  for (const workItem of activePacketWorkItems) {
    const packetPath = path.resolve(repoRoot, workItem.sourceRef);
    const content = readRequiredUtf8File({
      filePath: packetPath,
      findings,
      missingCode: "gate_profile_packet_missing",
      missingMessage: `Active work item ${workItem.workItemId} points to missing gate-profile packet ${workItem.sourceRef}.`,
      pathKey: "packetPath"
    });
    if (content == null) {
      continue;
    }

    const header = parseQuickDecisionHeader(content);
    validateReadyForCodeConsistency({ store, workItem, header, findings });
    const gateProfileValue = header ? getHeaderProposed(header, "Gate profile") : null;
    if (!hasConcreteValue(gateProfileValue, { allowUnknown: false })) {
      findings.push({
        code: "gate_profile_missing",
        severity: "error",
        workItemId: workItem.workItemId,
        packetPath: workItem.sourceRef,
        message: `${workItem.sourceRef} must declare one approved Gate profile for active work item ${workItem.workItemId}.`
      });
      continue;
    }

    const gateProfile = resolveGateProfile(gateProfileValue);
    if (!gateProfile) {
      findings.push({
        code: "gate_profile_invalid",
        severity: "error",
        workItemId: workItem.workItemId,
        packetPath: workItem.sourceRef,
        gateProfile: gateProfileValue,
        message: `${workItem.sourceRef} declares invalid Gate profile ${gateProfileValue}. Expected one of ${GATE_PROFILE_IDS.join(", ")}.`
      });
      continue;
    }

    const metadataGateProfile = resolveGateProfile(workItem.metadata?.gateProfile);
    if (metadataGateProfile && metadataGateProfile.id !== gateProfile.id) {
      findings.push({
        code: "gate_profile_metadata_mismatch",
        severity: "error",
        workItemId: workItem.workItemId,
        packetPath: workItem.sourceRef,
        gateProfile: gateProfile.id,
        metadataGateProfile: metadataGateProfile.id,
        message: `${workItem.workItemId} metadata gate profile ${metadataGateProfile.id} does not match packet gate profile ${gateProfile.id}.`
      });
    }

    validateGateProfileEvidence({ workItem, packetPath: workItem.sourceRef, content, header, gateProfile, findings });
  }
}

function validateReadyForCodeConsistency({ store, workItem, header, findings }) {
  if (!header) {
    return;
  }

  const packetReadyForCodeApproved = isReadyForCodeApproved(getHeaderProposed(header, "Ready For Code"));
  const metadataReadyForCodeApproved = isReadyForCodeApproved(workItem.metadata?.readyForCode);
  const openDecision = findOpenReadyForCodeDecision(store, workItem);

  if (packetReadyForCodeApproved && !metadataReadyForCodeApproved) {
    findings.push({
      code: "ready_for_code_metadata_mismatch",
      severity: "error",
      workItemId: workItem.workItemId,
      packetPath: workItem.sourceRef,
      message: `${workItem.workItemId} packet marks Ready For Code approved, but work_item metadata readyForCode is not approved.`
    });
  }

  if (!packetReadyForCodeApproved && metadataReadyForCodeApproved) {
    findings.push({
      code: "ready_for_code_metadata_mismatch",
      severity: "error",
      workItemId: workItem.workItemId,
      packetPath: workItem.sourceRef,
      message: `${workItem.workItemId} work_item metadata marks Ready For Code approved, but packet header does not.`
    });
  }

  if (packetReadyForCodeApproved && openDecision) {
    findings.push({
      code: "ready_for_code_decision_open",
      severity: "error",
      workItemId: workItem.workItemId,
      decisionId: openDecision.decisionId,
      packetPath: workItem.sourceRef,
      message: `${workItem.workItemId} packet marks Ready For Code approved, but decision ${openDecision.decisionId} is still open in decision_registry.`
    });
  }
}

function findOpenReadyForCodeDecision(store, workItem) {
  return store.listDecisions({ status: "open", decisionNeeded: true }).find((decision) => {
    const sameSource = decision.sourceRef === workItem.sourceRef;
    const decisionText = `${decision.decisionId ?? ""} ${decision.title ?? ""}`.toLowerCase();
    return sameSource && decisionText.includes("ready for code");
  });
}

function isReadyForCodeApproved(value) {
  const normalized = normalizeValue(String(value ?? ""));
  return normalized === "approved" || normalized === "approve";
}

function validateGateProfileEvidence({ workItem, packetPath, content, header, gateProfile, findings }) {
  const layerClassification = normalizeValue(getHeaderProposed(header, "Layer classification"));
  if (gateProfile.id === "light" && ["core", "contract", "release"].includes(layerClassification)) {
    findings.push({
      code: "gate_profile_incompatible",
      severity: "error",
      workItemId: workItem.workItemId,
      packetPath,
      gateProfile: gateProfile.id,
      message: `${packetPath} cannot use light gate profile for ${layerClassification} layer work.`
    });
  }
  const fields = parseBulletFields(content);
  validateCloseoutRiskFloor({ workItem, packetPath, content, header, fields, gateProfile, findings });

  const manifest = sliceSection(content, "## Verification Manifest");
  if (!manifest) {
    findings.push({
      code: "gate_profile_evidence_missing",
      severity: "error",
      workItemId: workItem.workItemId,
      packetPath,
      gateProfile: gateProfile.id,
      message: `${packetPath} must include ## Verification Manifest for gate profile ${gateProfile.id}.`
    });
    return;
  }

  const requiredMarkers = gateProfileEvidenceMarkers(gateProfile.id, {
    header,
    fields,
    content
  });
  for (const marker of requiredMarkers) {
    if (manifest.toLowerCase().includes(marker.toLowerCase())) {
      continue;
    }
    findings.push({
      code: "gate_profile_evidence_missing",
      severity: "error",
      workItemId: workItem.workItemId,
      packetPath,
      gateProfile: gateProfile.id,
      marker,
      message: `${packetPath} Verification Manifest for ${gateProfile.id} is missing evidence marker: ${marker}.`
    });
  }
}

function validateCloseoutRiskFloor({ workItem, packetPath, content, header, fields, gateProfile, findings }) {
  const declaredRisk = declaredRiskClassFromTier(getFieldValue(fields ?? {}, "Closeout risk tier"));
  if (!declaredRisk) {
    return;
  }
  const detectedFloor = detectRiskFloor({ content, header, gateProfile });
  if (riskClassRank(declaredRisk) >= riskClassRank(detectedFloor)) {
    return;
  }
  findings.push({
    code: "closeout_risk_floor_mismatch",
    severity: "error",
    workItemId: workItem.workItemId,
    packetPath,
    declaredRisk,
    detectedRiskFloor: detectedFloor,
    message: `${packetPath} declares closeout risk ${declaredRisk}, but detected risk floor is ${detectedFloor}. Effective risk class must use the higher value.`
  });
}

function validateTaskPacketRiskClassification({
  artifact,
  header,
  fields,
  content,
  repoRoot,
  readyForCodeApproved,
  findings,
  riskClassifications
}) {
  const declaredRisk = declaredPacketRiskClass({ header, fields });
  const routeClass = declaredRouteClass({ header, fields });
  const changeZone = declaredChangeZone({ header, fields });
  if (routeClass.raw && !routeClass.value) {
    findings.push({
      code: "route_class_metadata_unrecognized",
      severity: "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      routeClass: routeClass.raw,
      message:
        `${artifact.path} declares routeClass ${routeClass.raw}, but OPS-44 only recognizes ` +
        "`fast-path`, `packet-path`, and `strict-path` as visibility-only route metadata."
    });
  }

  if (changeZone.raw && !changeZone.value) {
    findings.push({
      code: "change_zone_metadata_unrecognized",
      severity: "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      changeZone: changeZone.raw,
      message:
        `${artifact.path} declares Change zone ${changeZone.raw}, but the ownership classifier recognizes ` +
        "`core`, `load-bearing`, `padded`, and `prototype`."
    });
  }

  if (!declaredRisk && !routeClass.raw && !changeZone.raw) {
    return;
  }

  const derivedRisk = derivePacketRiskClass({ content, header, fields });
  const effectiveRisk =
    riskClassRank(declaredRisk ?? "low") >= riskClassRank(derivedRisk)
      ? declaredRisk ?? "low"
      : derivedRisk;
  const changeZoneClassification = evaluateChangeZoneClassification({
    repoRoot,
    declaredChangeZone: changeZone.value,
    changedFiles: changeZone.value ? extractFastPathChangedFiles(content) : [],
    requestedRouteClass: routeClass.value
  });
  const routeDecision = resolveRouteDecision({
    content,
    requestedRouteClass: routeClass.value,
    effectiveRiskClass: effectiveRisk,
    changeZoneClassification
  });
  const modelingImpact = evaluateModelingImpact({
    repoRoot,
    content,
    stage: "validation-report",
    changeZone: changeZone.value,
    changedFiles: changeZoneClassification.diagnostics.map((diagnostic) => diagnostic.path),
    changeZoneClassification
  });
  const classification = {
    artifactId: artifact.artifactId,
    packetPath: artifact.path,
    declaredRiskClass: declaredRisk,
    derivedRiskClass: derivedRisk,
    effectiveRiskClass: effectiveRisk,
    routeClass: routeClass.value,
    requestedRouteClass: routeClass.value,
    chosenRouteClass: routeDecision.chosenRouteClass,
    routeEligibility: routeDecision.routeEligibility,
    routeRejectionReasons: routeDecision.routeRejectionReasons,
    fastPathNoteStatus: routeDecision.fastPathNoteStatus,
    changeZone: {
      declared: changeZone.value,
      changedFiles: changeZoneClassification.diagnostics.map((diagnostic) => diagnostic.path),
      effectiveRouteClass: changeZoneClassification.effectiveRouteClass,
      diagnostics: changeZoneClassification.diagnostics
    },
    modelingImpact: summarizeModelingImpact(modelingImpact),
    gateEffect: riskGateEffect(effectiveRisk)
  };
  riskClassifications.push(classification);

  for (const diagnostic of changeZoneClassification.diagnostics.filter((item) => item.status !== "pass")) {
    findings.push({
      code: diagnostic.status === "block" ? "change_zone_path_mismatch_blocked" : "change_zone_route_promoted",
      severity: diagnostic.status === "block" ? "error" : "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: "Change zone",
      currentValue: diagnostic.current,
      expectedValues: [diagnostic.expected],
      routeClass: diagnostic.routeClass,
      matchedRule: diagnostic.matchedRule,
      message:
        `${artifact.path} declares Change zone ${diagnostic.current} for ${diagnostic.path}, ` +
        `but ownership map expects ${diagnostic.expected} via ${diagnostic.matchedRule}; ${diagnostic.nextAction}`
    });
  }

  if (declaredRisk && riskClassRank(declaredRisk) < riskClassRank(derivedRisk)) {
    findings.push({
      code: "risk_class_declared_below_derived",
      severity: "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      declaredRiskClass: declaredRisk,
      derivedRiskClass: derivedRisk,
      effectiveRiskClass: effectiveRisk,
      message:
        `${artifact.path} declares riskClass ${declaredRisk}, but validator-derived risk is ${derivedRisk}. ` +
        `Effective risk class is ${effectiveRisk}.`
    });
  }

  if (effectiveRisk === "high" && !hasHighRiskApprovalEvidence({ content, readyForCodeApproved })) {
    findings.push({
      code: "risk_class_high_requires_packet_approval_evidence",
      severity: readyForCodeApproved ? "error" : "warning",
      gateEffect: "hold",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      effectiveRiskClass: effectiveRisk,
      message:
        `${artifact.path} has effective riskClass high, so it must keep an approved packet, ` +
        "explicit Ready For Code approval, and verification/evidence markers before proceeding."
    });
  }

  if (effectiveRisk === "critical" && !hasCriticalHumanConfirmation(fields)) {
    findings.push({
      code: "risk_class_critical_human_confirmation_missing",
      severity: "error",
      gateEffect: "hard_stop",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      effectiveRiskClass: effectiveRisk,
      message:
        `${artifact.path} has effective riskClass critical. Critical work is a hard stop until ` +
        "explicit human confirmation, owner, approved/confirmed status, and evidence path are recorded in packet/evidence text."
    });
  }
}

function gateProfileEvidenceMarkers(profileId, options = {}) {
  const markers = {
    light: ["canonical artifact", "handoff"],
    standard: ["approved packet", "targeted test", "validator", "handoff"],
    contract: ["Ready For Code", "root", "standard-template", "targeted", "validator", "active context", "review closeout"],
    release: ["release-baseline", "packaging", "validator", "review closeout"]
  };
  const resolvedMarkers = [...(markers[profileId] ?? [])];
  const closeoutRiskTier = normalizeCloseoutRiskTier(
    getFieldValue(options.fields ?? {}, "Closeout risk tier")
  );
  const declaredRisk = declaredRiskClassFromTier(closeoutRiskTier);
  const detectedFloor = detectRiskFloor({
    content: options.content ?? "",
    header: options.header ?? {},
    gateProfile: resolveGateProfile(profileId)
  });
  if (
    profileId === "contract" &&
    declaredRisk === "low" &&
    riskClassRank(detectedFloor) <= RISK_CLASS_ORDER.low
  ) {
    return resolvedMarkers.filter((marker) => marker !== "review closeout");
  }
  return resolvedMarkers;
}

function normalizeCloseoutRiskTier(value) {
  if (value == null) {
    return null;
  }
  const normalized = normalizeValue(value);
  return normalized || null;
}

function declaredRiskClassFromTier(value) {
  const normalized = normalizeCloseoutRiskTier(value);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("low")) {
    return "low";
  }
  if (normalized.startsWith("normal") || normalized.startsWith("standard")) {
    return "normal";
  }
  if (normalized.startsWith("medium")) {
    return "normal";
  }
  if (normalized.startsWith("high") || normalized.startsWith("release")) {
    return "high";
  }
  if (normalized.startsWith("critical")) {
    return "critical";
  }
  return null;
}

function riskClassRank(value) {
  return RISK_CLASS_ORDER[value] ?? RISK_CLASS_ORDER.low;
}

function detectRiskFloor({ content = "", header = {}, gateProfile = null } = {}) {
  const headerRisk = declaredRiskClassFromTier(getHeaderProposed(header, "Risk if started now"));
  if (headerRisk) {
    return headerRisk;
  }
  let detectedRisk = "low";
  if (gateProfile?.id === "release") {
    detectedRisk = maxRiskClass(detectedRisk, "high");
  }
  const haystack = String(content ?? "").toLowerCase();
  if (
    haystack.includes("authority-model mutation") ||
    haystack.includes("authority model mutation") ||
    haystack.includes("shipped starter payload") ||
    haystack.includes("release packaging") ||
    haystack.includes("security-sensitive") ||
    haystack.includes("data / cutover") ||
    haystack.includes("data/cutover") ||
    haystack.includes("artifact retirement execution") ||
    haystack.includes("authority cutover")
  ) {
    detectedRisk = maxRiskClass(detectedRisk, "high");
  }
  if (
    gateProfile?.id === "contract" ||
    haystack.includes("validator behavior") ||
    haystack.includes("workflow/tooling") ||
    haystack.includes("reusable runtime")
  ) {
    detectedRisk = maxRiskClass(detectedRisk, "normal");
  }
  return detectedRisk;
}

function declaredPacketRiskClass({ header, fields }) {
  return (
    declaredRiskClassFromTier(getHeaderProposed(header, "Risk class")) ??
    declaredRiskClassFromTier(getFieldValue(fields, "Risk class"))
  );
}

function declaredRouteClass({ header, fields }) {
  const raw =
    getHeaderProposed(header, "Route class") ||
    getFieldValue(fields, "Route class") ||
    "";
  const normalized = normalizeValue(raw);
  if (!normalized || normalized === "not-needed" || normalized === "none") {
    return { raw: normalized || null, value: null };
  }
  if (ROUTE_CLASS_VALUES.has(normalized)) {
    return { raw: normalized, value: normalized };
  }
  return { raw: normalized, value: null };
}

function declaredChangeZone({ header, fields }) {
  const raw =
    getHeaderProposed(header, "Change zone") ||
    getFieldValue(fields, "Change zone") ||
    "";
  const normalized = normalizeValue(raw);
  if (!normalized || normalized === "not-needed" || normalized === "none") {
    return { raw: normalized || null, value: null };
  }
  return { raw: normalized, value: normalizeChangeZone(normalized) };
}

function resolveRouteDecision({
  content = "",
  requestedRouteClass = null,
  effectiveRiskClass = "low",
  changeZoneClassification = null
} = {}) {
  const normalizedRoute = ROUTE_CLASS_VALUES.has(requestedRouteClass) ? requestedRouteClass : null;
  const ownershipRoute = changeZoneClassification?.effectiveRouteClass ?? null;
  const ownershipRejectionReasons =
    changeZoneClassification?.diagnostics
      ?.filter((diagnostic) => diagnostic.status !== "pass")
      .map((diagnostic) =>
        `change-zone ${diagnostic.path}: declared ${diagnostic.current}, expected ${diagnostic.expected}, ` +
        `matched ${diagnostic.matchedRule}, route ${diagnostic.routeClass}`
      ) ?? [];
  const mergeOwnershipRoute = (decision) => {
    const chosenRouteClass = stricterRouteClass(decision.chosenRouteClass, ownershipRoute);
    const routeRejectionReasons =
      chosenRouteClass !== decision.chosenRouteClass
        ? [...decision.routeRejectionReasons, ...ownershipRejectionReasons]
        : decision.routeRejectionReasons;
    return {
      ...decision,
      chosenRouteClass,
      routeEligibility:
        routeRejectionReasons.length > 0 && decision.routeEligibility === "eligible"
          ? "rejected"
          : decision.routeEligibility,
      routeRejectionReasons
    };
  };

  if (normalizedRoute === "strict-path") {
    return mergeOwnershipRoute({
      chosenRouteClass: "strict-path",
      routeEligibility: "not-applicable",
      routeRejectionReasons: [],
      fastPathNoteStatus: "not-applicable"
    });
  }
  if (normalizedRoute !== "fast-path") {
    return mergeOwnershipRoute({
      chosenRouteClass: normalizedRoute ?? "packet-path",
      routeEligibility: "not-applicable",
      routeRejectionReasons: [],
      fastPathNoteStatus: "not-applicable"
    });
  }

  const fastPathNote = inspectFastPathNote(content);
  const rejectionReasons = [];

  if (effectiveRiskClass !== "low") {
    rejectionReasons.push(`effective riskClass ${effectiveRiskClass} exceeds the low-risk fast-path threshold`);
  }

  if (!fastPathNote.present) {
    rejectionReasons.push("Fast Path Note section is missing");
  } else {
    if (fastPathNote.missingFields.length > 0) {
      rejectionReasons.push(`Fast Path Note is missing required fields: ${fastPathNote.missingFields.join(", ")}`);
    }
    if (fastPathNote.invalidChecklist.length > 0) {
      rejectionReasons.push(
        `Fast Path Note strict-path checklist is incomplete or ambiguous: ${fastPathNote.invalidChecklist.join(", ")}`
      );
    }
  }

  if (fastPathNote.strictPathTriggers.length > 0) {
    rejectionReasons.push(
      `strict-path checklist triggered: ${fastPathNote.strictPathTriggers.map((item) => `${item.label}: ${item.value}`).join(", ")}`
    );
  }

  if (rejectionReasons.length === 0) {
    return mergeOwnershipRoute({
      chosenRouteClass: "fast-path",
      routeEligibility: "eligible",
      routeRejectionReasons: [],
      fastPathNoteStatus: "complete"
    });
  }

  return mergeOwnershipRoute({
    chosenRouteClass: fastPathNote.strictPathTriggers.length > 0 ? "strict-path" : "packet-path",
    routeEligibility: "rejected",
    routeRejectionReasons: rejectionReasons,
    fastPathNoteStatus: fastPathNote.present ? "incomplete" : "missing"
  });
}

function inspectFastPathNote(content = "") {
  const noteSection = sliceSection(content, "## Fast Path Note") ?? sliceSection(content, "## Fast-Path Note");
  const requiredFieldLabels = [
    "requested change",
    "why low risk",
    "files changed",
    "verification run",
    "residual risk",
    "follow-up needed"
  ];
  const requiredChecklistLabels = [
    "data migration",
    "auth/security",
    "external api contract",
    "release/deploy/cutover",
    "schema change",
    "workflow/validator authority",
    "architecture or reusable runtime change"
  ];

  if (!noteSection) {
    return {
      present: false,
      fields: new Map(),
      checklist: new Map(),
      missingFields: requiredFieldLabels,
      invalidChecklist: requiredChecklistLabels,
      strictPathTriggers: []
    };
  }

  const fields = new Map();
  for (const line of noteSection.split("\n")) {
    const match = line.match(/^\s*-\s*([^:]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    fields.set(normalizeValue(match[1]), normalizeValue(match[2]) ?? "");
  }

  const missingFields = requiredFieldLabels.filter((label) => !fields.get(label));
  const invalidChecklist = [];
  const strictPathTriggers = [];

  for (const label of requiredChecklistLabels) {
    const value = fields.get(label) ?? "";
    if (!value) {
      invalidChecklist.push(label);
      continue;
    }
    if (isExplicitNegativeChecklistValue(value)) {
      continue;
    }
    if (isExplicitAffirmativeChecklistValue(value)) {
      strictPathTriggers.push({ label, value });
      continue;
    }
    invalidChecklist.push(label);
  }

  return {
    present: true,
    fields,
    checklist: fields,
    missingFields,
    invalidChecklist,
    strictPathTriggers
  };
}

function isExplicitNegativeChecklistValue(value) {
  return ["no", "none", "not-needed", "not needed", "false", "n/a", "na"].includes(value);
}

function isExplicitAffirmativeChecklistValue(value) {
  return ["yes", "y", "true", "required", "present"].includes(value);
}

function derivePacketRiskClass({ content = "", header = {}, fields = new Map() } = {}) {
  let detectedRisk = "low";
  const gateProfile = resolveGateProfile(normalizeValue(getHeaderProposed(header, "Gate profile")));
  if (gateProfile?.id === "release") {
    detectedRisk = maxRiskClass(detectedRisk, "high");
  }
  if (gateProfile?.id === "contract") {
    detectedRisk = maxRiskClass(detectedRisk, "normal");
  }

  const schemaImpact = normalizeValue(getFieldValue(fields, "Schema impact classification"));
  if (schemaImpact && !["none", "not-needed", "not needed", "no"].includes(schemaImpact)) {
    detectedRisk = maxRiskClass(detectedRisk, "high");
  }

  const haystack = riskScannerContent(content);
  if (
    haystack.includes("critical-risk trigger")
  ) {
    detectedRisk = maxRiskClass(detectedRisk, "critical");
  }
  if (
    haystack.includes("validator enforcement") ||
    haystack.includes("workflow authority") ||
    haystack.includes("workflow routing") ||
    haystack.includes("operational db schema") ||
    haystack.includes("db schema") ||
    haystack.includes("data migration") ||
    haystack.includes("release packaging") ||
    haystack.includes("release/deploy") ||
    haystack.includes("deploy/cutover execution") ||
    haystack.includes("data / cutover") ||
    haystack.includes("data/cutover") ||
    haystack.includes("authority cutover") ||
    haystack.includes("cutover execution") ||
    haystack.includes("external contract") ||
    haystack.includes("external api") ||
    haystack.includes("authentication") ||
    haystack.includes("authorization") ||
    haystack.includes("auth boundary") ||
    haystack.includes("security-sensitive") ||
    haystack.includes("security review") ||
    haystack.includes("bi semantic") ||
    haystack.includes("authority-model mutation") ||
    haystack.includes("authority model mutation")
  ) {
    detectedRisk = maxRiskClass(detectedRisk, "high");
  }
  if (
    haystack.includes("reusable runtime") ||
    haystack.includes("workflow/tooling")
  ) {
    detectedRisk = maxRiskClass(detectedRisk, "normal");
  }
  return detectedRisk;
}

function riskScannerContent(content) {
  let scoped = String(content ?? "");
  for (const heading of ["## 2. Non-Goal", "## 5. Out Of Scope", "## 17. Reopen Trigger", "## Fast Path Note", "## Fast-Path Note"]) {
    const section = sliceSection(scoped, heading);
    if (section) {
      scoped = scoped.replace(section, "");
    }
  }
  return scoped.toLowerCase();
}

function maxRiskClass(left, right) {
  return riskClassRank(left) >= riskClassRank(right) ? left : right;
}

function stricterRouteClass(left, right) {
  const leftValue = ROUTE_CLASS_VALUES.has(left) ? left : "packet-path";
  const rightValue = ROUTE_CLASS_VALUES.has(right) ? right : null;
  if (!rightValue) {
    return leftValue;
  }
  const rank = {
    "fast-path": 1,
    "packet-path": 2,
    "strict-path": 3
  };
  return rank[rightValue] > rank[leftValue] ? rightValue : leftValue;
}

function riskGateEffect(riskClass) {
  if (riskClass === "critical") {
    return "hard_stop";
  }
  if (riskClass === "high") {
    return "hold_if_missing_approval_or_evidence";
  }
  return "none";
}

function hasHighRiskApprovalEvidence({ content, readyForCodeApproved }) {
  if (!readyForCodeApproved) {
    return false;
  }
  const haystack = String(content ?? "").toLowerCase();
  return (
    haystack.includes("## verification manifest") &&
    haystack.includes("ready for code") &&
    (haystack.includes("targeted") || haystack.includes("validator"))
  );
}

function hasCriticalHumanConfirmation(fields) {
  const confirmation = getFieldValue(fields, "Critical human confirmation");
  const owner = getFieldValue(fields, "Critical confirmation owner");
  const status = normalizeValue(getFieldValue(fields, "Critical confirmation status"));
  const evidencePath = getFieldValue(fields, "Critical confirmation evidence path");
  return (
    hasConcreteValue(confirmation, { allowNone: false, allowUnknown: false }) &&
    hasConcreteValue(owner, { allowNone: false, allowUnknown: false }) &&
    ["approved", "confirmed"].includes(status) &&
    hasConcreteValue(evidencePath, { allowNone: false, allowUnknown: false })
  );
}

function validateRegisteredTaskPacket({
  artifact,
  repoRoot,
  findings,
  riskClassifications = [],
  activeWorkItemIds = new Set(),
  activeWorkItemSourceRefs = new Set()
}) {
  const packetPath = path.resolve(repoRoot, artifact.path);
  const content = readRequiredUtf8File({
    filePath: packetPath,
    findings,
    missingCode: "task_packet_missing",
    missingMessage: `Missing registered task packet artifact: ${artifact.path}.`,
    pathKey: "packetPath"
  });

  if (content == null) {
    const finding = findings.at(-1);
    if (finding?.code === "task_packet_missing") {
      finding.artifactId = artifact.artifactId;
      finding.packetPath = artifact.path;
    }
    return;
  }

  const header = parseQuickDecisionHeader(content);
  if (!header) {
    findings.push({
      code: "task_packet_header_missing",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      message: `${artifact.path} is missing the Quick Decision Header table required for task-packet validation.`
    });
    return;
  }

  const fields = parseBulletFields(content);
  validateTaskPacketHeader({ artifact, header, findings });
  const challengeEnforcementRequired =
    activeWorkItemIds.has(normalizeOptionalValue(artifact.metadata?.workItemId)) ||
    activeWorkItemSourceRefs.has(normalizeOptionalPath(artifact.path));
  validateTaskPacketEvidence({
    artifact,
    header,
    fields,
    content,
    repoRoot,
    findings,
    riskClassifications,
    challengeEnforcementRequired
  });
}

function validateTaskPacketHeader({ artifact, header, findings }) {
  for (const item of TASK_PACKET_REQUIRED_HEADER_ITEMS) {
    const row = getHeaderRow(header, item.label, item.aliases);
    if (!row) {
      findings.push({
        code: "task_packet_header_field_missing",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: item.label,
        message: `${artifact.path} is missing Quick Decision Header row ${item.label}.`
      });
      continue;
    }

    if (!hasStatedHeaderValue(row.proposed)) {
      findings.push({
        code: "task_packet_header_value_missing",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: item.label,
        message: `${artifact.path} does not provide a concrete proposed value for ${item.label}.`
      });
    }
  }
}

function validateTaskPacketEvidence({
  artifact,
  header,
  fields,
  content,
  repoRoot,
  stage = "validation-report",
  findings,
  riskClassifications = [],
  challengeEnforcementRequired = false
}) {
  const readyForCode = normalizeValue(getHeaderProposed(header, "Ready For Code"));
  const readyForCodeApproved = readyForCode === "approve" || readyForCode === "approved";
  const userFacingImpact = normalizeValue(getHeaderProposed(header, "User-facing impact"));
  const profileDependencies = extractProfileIds(
    getHeaderProposedWithAliases(header, "Active profile dependencies", ["Active profile dependency"])
  );
  const profileEvidenceStatus = normalizeValue(getHeaderProposed(header, "Profile evidence status"));
  const profileSpecificEvidenceStatus = normalizeValue(getFieldValue(fields, "Profile-specific evidence status"));
  const uxArchetypeStatus = normalizeValue(getHeaderProposed(header, "UX archetype status"));
  const uxDeviationStatus = normalizeValue(getHeaderProposed(header, "UX deviation status"));
  const environmentTopologyStatus = normalizeValue(getHeaderProposed(header, "Environment topology status"));
  const domainFoundationStatus = normalizeValue(getHeaderProposed(header, "Domain foundation status"));
  const authoritativeSourceStatus = normalizeValue(getHeaderProposed(header, "Authoritative source intake status"));
  const sharedSourceWaveStatus = normalizeValue(getHeaderProposed(header, "Shared-source wave status"));
  const packetExitGateStatus = normalizeValue(getHeaderProposed(header, "Packet exit gate status"));
  const existingSystemDependency = normalizeValue(getHeaderProposed(header, "Existing system dependency"));
  const newAuthoritativeSourceImpact = normalizeValue(getHeaderProposed(header, "New authoritative source impact"));
  const schemaImpactClassification = getFieldValue(fields, "Schema impact classification");
  const impactedPacketSetScope = normalizeValue(getFieldValue(fields, "Impacted packet set scope"));
  const sourceWaveLedgerReference = getFieldValue(fields, "Authoritative source wave ledger reference");
  const sourceWavePacketDisposition = normalizeValue(getFieldValue(fields, "Source wave packet disposition"));
  validateTaskPacketRiskClassification({
    artifact,
    header,
    fields,
    content,
    repoRoot,
    readyForCodeApproved,
    findings,
    riskClassifications
  });
  const packetExitFields = new Map([
    ...fields.entries(),
    ...parseSectionBulletFields(content, "## 15. Packet Exit Quality Gate").entries()
  ]);
  const packetExitMetadataVersion = getFieldValue(packetExitFields, "Packet exit metadata version");
  const packetExitStructuredContracts = [
    {
      label: "Packet exit quality gate reference",
      metadataLabel: "Packet exit metadata gate reference"
    },
    {
      label: "Exit recommendation",
      metadataLabel: "Packet exit metadata exit recommendation"
    },
    {
      label: "Source parity result",
      metadataLabel: "Packet exit metadata source parity result"
    },
    {
      label: "Validation / security / cleanup evidence",
      metadataLabel: "Packet exit metadata validation / security / cleanup evidence"
    }
  ];
  const hasStructuredPacketExitMetadata =
    hasConcreteValue(packetExitMetadataVersion, { allowUnknown: false }) ||
    packetExitStructuredContracts.some((contract) =>
      hasConcreteValue(getFieldValue(packetExitFields, contract.metadataLabel))
    );

  requireTaskPacketField({
    artifact,
    fields,
    label: "Layer classification",
    findings,
    message: "Registered task packets must record Layer classification."
  });

  requireTaskPacketField({
    artifact,
    fields,
    label: "Required reading before code",
    findings,
    message: "Registered task packets must record Required reading before code."
  });

  validateTaskPacketLaneTypeContract({ artifact, fields, findings });
  validatePlannerPacketChallengeEvidence({
    artifact,
    header,
    content,
    readyForCodeApproved,
    challengeEnforcementRequired,
    findings
  });
  validateContextDocsImpactContract({
    artifact,
    header,
    fields,
    content,
    stage,
    findings
  });

  if (
    hasConcreteValue(getHeaderProposed(header, "Profile evidence status"), { allowUnknown: false }) &&
    hasConcreteValue(getFieldValue(fields, "Profile-specific evidence status"), { allowUnknown: false }) &&
    profileEvidenceStatus !== profileSpecificEvidenceStatus
  ) {
    findings.push({
      code: "task_packet_status_contract_mismatch",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      headerItem: "Profile evidence status",
      field: "Profile-specific evidence status",
      message:
        `${artifact.path} records Profile evidence status as ${profileEvidenceStatus} in the header ` +
        `but Profile-specific evidence status as ${profileSpecificEvidenceStatus} in packet evidence.`
    });
  }

  if (profileDependencies.length > 0) {
    requireTaskPacketField({
      artifact,
      fields,
      label: "Active profile references",
      aliases: ["Active profile reference"],
      findings,
      message: `Task packet ${artifact.path} declares active optional profiles but does not cite Active profile references.`
    });
    requireTaskPacketField({
      artifact,
      fields,
      label: "Profile-specific evidence status",
      findings,
      message: `Task packet ${artifact.path} declares active optional profiles but does not record Profile-specific evidence status.`
    });

    if (profileDependencies.length > 1) {
      requireTaskPacketField({
        artifact,
        fields,
        label: "Profile composition rationale",
        findings,
        message: `${artifact.path} declares multiple active optional profiles but does not record Profile composition rationale.`
      });
    }

    const activeProfileReferences = getFieldValueWithAliases(fields, [
      "Active profile references",
      "Active profile reference"
    ]);
    if (hasConcreteValue(activeProfileReferences)) {
      for (const profileDependency of profileDependencies) {
        if (activeProfileReferences.includes(`reference/profiles/${profileDependency}_`)) {
          continue;
        }

        findings.push({
          code: "task_packet_status_contract_mismatch",
          severity: "error",
          artifactId: artifact.artifactId,
          packetPath: artifact.path,
          headerItem: "Active profile dependencies",
          message:
            `${artifact.path} declares ${profileDependency} but Active profile references does not cite that profile. ` +
            `Expected a concrete profile path containing reference/profiles/${profileDependency}_...`
        });
      }
    }

    if (readyForCodeApproved && profileEvidenceStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Profile evidence status",
        message: `${artifact.path} is marked Ready For Code approve while Profile evidence status is ${profileEvidenceStatus || "missing"}.`
      });
    }

    if (readyForCodeApproved || profileEvidenceStatus === "approved") {
      const requiredProfileFields = new Set();
      for (const profileDependency of profileDependencies) {
        for (const label of TASK_PACKET_PROFILE_FIELD_REQUIREMENTS[profileDependency] ?? []) {
          requiredProfileFields.add(label);
        }
      }

      for (const label of requiredProfileFields) {
        requireTaskPacketField({
          artifact,
          fields,
          label,
          findings,
          message: `${artifact.path} is missing ${label} required by one of its active optional profiles.`
        });
      }
    }
  }

  if (userFacingImpact && userFacingImpact !== "none") {
    requireTaskPacketField({
      artifact,
      fields,
      label: "UX archetype reference",
      findings,
      message: `${artifact.path} has user-facing impact but does not cite a UX archetype reference.`
    });
    requireTaskPacketField({
      artifact,
      fields,
      label: "Selected UX archetype",
      findings,
      message: `${artifact.path} has user-facing impact but does not record Selected UX archetype.`
    });

    if (readyForCodeApproved && uxArchetypeStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "UX archetype status",
        message: `${artifact.path} is marked Ready For Code approve while UX archetype status is ${uxArchetypeStatus || "missing"}.`
      });
    }

    if (uxDeviationStatus && uxDeviationStatus !== "none") {
      requireTaskPacketField({
        artifact,
        fields,
        label: "Archetype deviation / approval",
        findings,
        message: `${artifact.path} declares UX deviation but does not record Archetype deviation / approval.`
      });
    }
  }

  if (environmentTopologyStatus && environmentTopologyStatus !== "not-needed") {
    for (const label of [
      "Environment topology reference",
      "Source environment",
      "Target environment",
      "Execution target",
      "Transfer boundary",
      "Rollback boundary"
    ]) {
      requireTaskPacketField({
        artifact,
        fields,
        label,
        findings,
        message: `${artifact.path} is missing ${label} required by the environment topology contract.`
      });
    }

    if (readyForCodeApproved && environmentTopologyStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Environment topology status",
        message: `${artifact.path} is marked Ready For Code approve while Environment topology status is ${environmentTopologyStatus || "missing"}.`
      });
    }
  }

  if (
    (domainFoundationStatus && domainFoundationStatus !== "not-needed") ||
    (existingSystemDependency && existingSystemDependency !== "none") ||
    hasConcreteValue(schemaImpactClassification, { allowNone: false, allowUnknown: false })
  ) {
    requireTaskPacketField({
      artifact,
      fields,
      label: "Domain foundation reference",
      findings,
      message: `${artifact.path} requires data-impact evidence but does not cite Domain foundation reference.`
    });
    requireTaskPacketField({
      artifact,
      fields,
      label: "Schema impact classification",
      findings,
      message: `${artifact.path} requires data-impact evidence but does not record Schema impact classification.`,
      allowUnknown: false
    });

    if (readyForCodeApproved && domainFoundationStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Domain foundation status",
        message: `${artifact.path} is marked Ready For Code approve while Domain foundation status is ${domainFoundationStatus || "missing"}.`
      });
    }

    if (existingSystemDependency === "confirmed") {
      for (const label of [
        "Existing schema source artifact",
        "Table / column naming compatibility",
        "Data operation / ownership compatibility",
        "Migration / rollback / cutover compatibility"
      ]) {
        requireTaskPacketField({
          artifact,
          fields,
          label,
          findings,
          message: `${artifact.path} confirms an existing-system dependency but does not record ${label}.`
        });
      }
    }
  }

  if (
    (authoritativeSourceStatus && authoritativeSourceStatus !== "not-needed") ||
    (newAuthoritativeSourceImpact && newAuthoritativeSourceImpact !== "none")
  ) {
    for (const label of [
      "Authoritative source intake reference",
      "Authoritative source disposition",
      "Current implementation impact"
    ]) {
      requireTaskPacketField({
        artifact,
        fields,
        label,
        findings,
        message: `${artifact.path} requires authoritative-source evidence but does not record ${label}.`
      });
    }

    requireTaskPacketField({
      artifact,
      fields,
      label: "Existing plan conflict",
      findings,
      message: `${artifact.path} requires authoritative-source evidence but does not record Existing plan conflict.`,
      allowNone: true
    });
    requireTaskPacketField({
      artifact,
      fields,
      label: "Impacted packet set scope",
      findings,
      message: `${artifact.path} requires authoritative-source evidence but does not record Impacted packet set scope.`,
      allowNone: false,
      allowUnknown: false
    });

    if (readyForCodeApproved && authoritativeSourceStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Authoritative source intake status",
        message: `${artifact.path} is marked Ready For Code approve while Authoritative source intake status is ${authoritativeSourceStatus || "missing"}.`
      });
    }
  }

  if (impactedPacketSetScope === "multi-packet" || (sharedSourceWaveStatus && sharedSourceWaveStatus !== "not-needed")) {
    requireTaskPacketField({
      artifact,
      fields,
      label: "Authoritative source wave ledger reference",
      findings,
      message: `${artifact.path} participates in a shared-source wave but does not cite Authoritative source wave ledger reference.`
    });
    requireTaskPacketField({
      artifact,
      fields,
      label: "Source wave packet disposition",
      findings,
      message: `${artifact.path} participates in a shared-source wave but does not record Source wave packet disposition.`,
      allowNone: false,
      allowUnknown: false
    });

    if (impactedPacketSetScope === "multi-packet" && sharedSourceWaveStatus === "not-needed") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Shared-source wave status",
        message: `${artifact.path} declares multi-packet source-wave impact while Shared-source wave status is not-needed.`
      });
    }

    if (impactedPacketSetScope !== "multi-packet" && sharedSourceWaveStatus && sharedSourceWaveStatus !== "not-needed") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Shared-source wave status",
        message: `${artifact.path} records Shared-source wave status ${sharedSourceWaveStatus} without declaring multi-packet source-wave scope.`
      });
    }

    if (readyForCodeApproved && sharedSourceWaveStatus !== "approved") {
      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        headerItem: "Shared-source wave status",
        message: `${artifact.path} is marked Ready For Code approve while Shared-source wave status is ${sharedSourceWaveStatus || "missing"}.`
      });
    }

    if (
      hasConcreteValue(sourceWaveLedgerReference) &&
      hasConcreteValue(sourceWavePacketDisposition, { allowNone: false, allowUnknown: false })
    ) {
      validateSourceWaveLedgerMembership({
        artifact,
        ledgerReference: sourceWaveLedgerReference,
        packetDisposition: sourceWavePacketDisposition,
        repoRoot,
        findings
      });
    }
  }

  if (packetExitGateStatus === "approved") {
    if (hasStructuredPacketExitMetadata) {
      requireTaskPacketField({
        artifact,
        fields: packetExitFields,
        label: "Packet exit metadata version",
        findings,
        message: `${artifact.path} uses structured packet-exit metadata but does not record Packet exit metadata version.`,
        allowUnknown: false
      });
    }

    for (const contract of packetExitStructuredContracts) {
      if (hasStructuredPacketExitMetadata) {
        requireTaskPacketField({
          artifact,
          fields: packetExitFields,
          label: contract.metadataLabel,
          findings,
          message: `${artifact.path} uses structured packet-exit metadata but does not record ${contract.metadataLabel}.`
        });
      }

      requireTaskPacketField({
        artifact,
        fields: packetExitFields,
        label: contract.label,
        aliases: hasStructuredPacketExitMetadata ? [contract.metadataLabel] : [],
        findings,
        message: `${artifact.path} marks Packet exit gate as approved but does not record ${contract.label}.`
      });

      if (!hasStructuredPacketExitMetadata) {
        continue;
      }

      const metadataValue = getFieldValue(packetExitFields, contract.metadataLabel);
      const legacyValue = getFieldValue(packetExitFields, contract.label);
      if (!hasConcreteValue(metadataValue) || !hasConcreteValue(legacyValue)) {
        continue;
      }

      if (normalizeValue(metadataValue) === normalizeValue(legacyValue)) {
        continue;
      }

      findings.push({
        code: "task_packet_status_contract_mismatch",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        field: contract.label,
        message:
          `${artifact.path} records conflicting packet-exit values for ${contract.label}: ` +
          `structured metadata and the human-readable closeout field must match.`
      });
    }
  }
}

const CONTEXT_STATUS_SUPPORTED = new Set([
  "none",
  "citation-only",
  "subset-summary",
  "update-required",
  "rebaseline-required"
]);
const CONTEXT_STATUS_HOLD_VALUES = new Set([
  "unknown",
  "stale",
  "unsupported",
  "rebaseline-required"
]);
const DOCS_PARITY_HOLD_VALUES = new Set(["pending", "fail"]);
const OPTIONAL_DEVELOPER_DOC_TEMPLATE_PATHS = [
  "reference/artifacts/DEVELOPMENT_GUIDE.md",
  "reference/artifacts/API_CONTRACT.md",
  "reference/artifacts/DATABASE_MODEL.md",
  "reference/artifacts/TESTING_GUIDE.md",
  "reference/artifacts/RUNBOOK.md"
];

function validateContextDocsImpactContract({ artifact, header, fields, content, stage, findings }) {
  const contextImpactFields = new Map([
    ...fields.entries(),
    ...parseSectionBulletFields(content, "## Context Impact Classification").entries()
  ]);
  const domainContext = normalizeImpactStatus(getFieldValue(contextImpactFields, "Domain context"));
  const systemContext = normalizeImpactStatus(getFieldValue(contextImpactFields, "System context"));
  const architecture = normalizeImpactStatus(getFieldValue(contextImpactFields, "Architecture"));
  const domainImpact = hasDomainContextImpact({ header, fields });
  const systemImpact = hasSystemContextImpact({ header, fields });
  const architectureBoundaryImpact = hasArchitectureBoundaryImpact({ fields, content });
  const docsImpact = hasDevelopmentDocsImpact({ fields });
  const docsParity = normalizeImpactStatus(getFieldValue(fields, "Docs parity status"));
  const requiredDocPaths = getFieldValue(fields, "Required doc paths");
  const optionalTemplateReferenced = OPTIONAL_DEVELOPER_DOC_TEMPLATE_PATHS.find((templatePath) =>
    normalizeOptionalPath(requiredDocPaths).includes(templatePath.toLowerCase())
  );

  if (domainImpact && domainContext === "none") {
    findings.push(buildContextDocsFinding({
      artifact,
      stage,
      gateStage: "implementation-transition",
      code: "context_impact_domain_context_missing",
      field: "Domain context",
      currentValue: getFieldValue(contextImpactFields, "Domain context") || "missing",
      expectedValues: ["citation-only", "subset-summary", "update-required", "rebaseline-required"],
      route: "Planner",
      reason: "Data, schema, source-intake, or existing-system impact cannot use Domain context: none.",
      message: `${artifact.path} declares domain/data/source impact but records Domain context as none.`
    }));
  }

  if (systemImpact && systemContext === "none") {
    findings.push(buildContextDocsFinding({
      artifact,
      stage,
      gateStage: "implementation-transition",
      code: "context_impact_system_context_missing",
      field: "System context",
      currentValue: getFieldValue(contextImpactFields, "System context") || "missing",
      expectedValues: ["citation-only", "subset-summary", "update-required", "rebaseline-required"],
      route: "Planner",
      reason: "Shared module, integration, external dependency, reusable workflow/runtime, or known hotspot impact cannot use System context: none.",
      message: `${artifact.path} declares shared/runtime/system impact but records System context as none.`
    }));
  }

  for (const [field, value, required] of [
    ["Domain context", domainContext, domainImpact],
    ["System context", systemContext, systemImpact]
  ]) {
    if (!required || !value || value === "none") {
      continue;
    }
    if (!CONTEXT_STATUS_SUPPORTED.has(value) || CONTEXT_STATUS_HOLD_VALUES.has(value)) {
      findings.push(buildContextDocsFinding({
        artifact,
        stage,
        gateStage: "implementation-transition",
        code: "context_impact_status_blocks_transition",
        field,
        currentValue: getFieldValue(contextImpactFields, field) || "missing",
        expectedValues: ["citation-only", "subset-summary", "update-required"],
        route: "Planner",
        reason: "Context status is stale, unknown, unsupported, or requires rebaseline before implementation can start.",
        message: `${artifact.path} records ${field} as ${getFieldValue(contextImpactFields, field) || "missing"}, which cannot enter implementation without Planner correction.`
      }));
    }
  }

  if (architectureBoundaryImpact && !["update-required", "rebaseline-required"].includes(architecture)) {
    findings.push(buildContextDocsFinding({
      artifact,
      stage,
      gateStage: "implementation-transition",
      code: "context_impact_architecture_rebaseline_missing",
      field: "Architecture",
      currentValue: getFieldValue(contextImpactFields, "Architecture") || "missing",
      expectedValues: ["update-required", "rebaseline-required"],
      route: "Planner",
      reason: "Architecture boundary changes require an architecture update or rebaseline status.",
      message: `${artifact.path} declares an architecture boundary change without Architecture update-required or rebaseline-required.`
    }));
  }

  if (docsImpact && DOCS_PARITY_HOLD_VALUES.has(docsParity)) {
    findings.push(buildContextDocsFinding({
      artifact,
      stage,
      gateStage: "closeout",
      code: "development_docs_parity_blocks_closeout",
      field: "Docs parity status",
      currentValue: getFieldValue(fields, "Docs parity status") || "missing",
      expectedValues: ["pass", "not-needed"],
      route: "Developer docs parity update or Planner approved follow-up/defer disposition",
      reason: "Declared development documentation impact cannot close with pending or failing docs parity.",
      message: `${artifact.path} declares development documentation impact but records Docs parity status as ${getFieldValue(fields, "Docs parity status") || "missing"}.`
    }));
  }

  if (optionalTemplateReferenced && !docsImpact) {
    findings.push(buildContextDocsFinding({
      artifact,
      stage,
      gateStage: "implementation-transition",
      code: "optional_developer_doc_template_requires_activation",
      field: "Required doc paths",
      currentValue: requiredDocPaths,
      expectedValues: ["Development Documentation Impact activates the optional template path"],
      route: "Planner",
      reason: "Optional developer doc templates are packet-activated and must not become default required reads.",
      message: `${artifact.path} references packet-activated optional developer doc template ${optionalTemplateReferenced} without declared development documentation impact.`
    }));
  }
}

function buildContextDocsFinding({
  artifact,
  stage,
  gateStage,
  code,
  field,
  currentValue,
  expectedValues,
  route,
  reason,
  message
}) {
  const blocking = stage === gateStage;
  return {
    code,
    severity: blocking ? "error" : "warning",
    gateEffect: `${gateStage}_hold`,
    artifactId: artifact.artifactId,
    packetPath: artifact.path,
    field,
    currentValue,
    expectedValues,
    route,
    reason,
    message: `${message} Expected ${expectedValues.join(" | ")}; correction route: ${route}.`
  };
}

function hasDomainContextImpact({ header, fields }) {
  return [
    getFieldValue(fields, "Schema impact classification"),
    getHeaderProposed(header, "Existing system dependency"),
    getHeaderProposed(header, "New authoritative source impact"),
    getHeaderProposed(header, "Authoritative source intake status"),
    getFieldValue(fields, "Authoritative source disposition"),
    getFieldValue(fields, "Existing program / DB dependency"),
    getFieldValue(fields, "Existing schema source artifact")
  ].some(isImpactfulValue);
}

function hasSystemContextImpact({ header, fields }) {
  return [
    getHeaderProposed(header, "System context status"),
    getFieldValue(fields, "System boundary impact"),
    getFieldValue(fields, "Shared module / hotspot impact"),
    getFieldValue(fields, "validator / cutover impact"),
    getFieldValue(fields, "Harness validation / product verification boundary")
  ].some(isImpactfulValue);
}

function hasArchitectureBoundaryImpact({ fields, content }) {
  return [
    getFieldValue(fields, "Architecture doc impact"),
    getFieldValue(fields, "System boundary impact"),
    getFieldValue(fields, "Component responsibility"),
    getFieldValue(fields, "Allowed dependency direction")
  ].some((value) => /architecture boundary|boundary change|update-required|rebaseline-required/i.test(value)) ||
    /architecture boundary|boundary change/i.test(content);
}

function hasDevelopmentDocsImpact({ fields }) {
  const impactFields = [
    "Project overview impact",
    "Setup/dev environment impact",
    "Architecture doc impact",
    "Domain doc impact",
    "API/interface doc impact",
    "Database/data model doc impact",
    "Module guide impact",
    "Testing doc impact",
    "Deploy/operations doc impact",
    "History/decision doc impact",
    "Security/permission doc impact",
    "AI/automation doc impact",
    "Documentation impact",
    "Markdown / docs impact"
  ];
  return impactFields.some((field) => isImpactfulValue(getFieldValue(fields, field))) ||
    normalizeImpactStatus(getFieldValue(fields, "Docs must be updated before implementation")) === "yes" ||
    normalizeImpactStatus(getFieldValue(fields, "Docs must be updated before closeout")) === "yes";
}

function isImpactfulValue(value) {
  const normalized = normalizeImpactStatus(value);
  return Boolean(normalized) &&
    !["none", "not-needed", "not needed", "no", "not-requested", "cite-only", "citation-only"].includes(normalized);
}

function normalizeImpactStatus(value) {
  return normalizeValue(String(value ?? "").replace(/`/g, "").trim());
}

function validatePlannerPacketChallengeEvidence({
  artifact,
  header,
  content,
  readyForCodeApproved,
  challengeEnforcementRequired,
  findings
}) {
  const section = sliceSection(content, PLANNER_PACKET_CHALLENGE_HEADING) ?? "";
  const explicitRequired = ["yes", "required", "true"].includes(
    normalizeOptionalValue(readPacketBulletFieldValueFromContent(content, "Planner packet challenge required"))
  );
  const mustHaveSection = challengeEnforcementRequired || explicitRequired;
  if (!mustHaveSection) {
    return;
  }
  const severity = readyForCodeApproved ? "error" : "warning";
  const gateProfile = normalizeValue(getHeaderProposed(header, "Gate profile"));
  const routeClass = normalizeValue(getHeaderProposed(header, "Route class"));
  const changeZone = normalizeValue(getHeaderProposed(header, "Change zone"));
  const riskIfStarted = normalizeValue(getHeaderProposed(header, "Risk if started now"));
  const fastPathExemptionEligible =
    riskIfStarted === "low" &&
    changeZone === "padded" &&
    routeClass === "fast-path" &&
    (gateProfile === "light" || gateProfile === "standard" || !gateProfile);

  if (!section) {
    findings.push({
      code: "planner_packet_challenge_review_missing",
      severity,
      gateEffect: "implementation_transition_hold",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      message:
        `${artifact.path} is missing ${PLANNER_PACKET_CHALLENGE_HEADING}; user-requested planning packets ` +
        "must record challenge review or an explicit low-risk exemption before implementation transition."
    });
    return;
  }

  const status = normalizeValue(readPacketBulletFieldValueFromContent(section, "Challenge status"));
  const statusIsExemption = ["exempt", "exemption-approved", "approved-exemption"].includes(status);
  const statusAccepted = status === "pass" || (statusIsExemption && fastPathExemptionEligible);
  if (!statusAccepted) {
    findings.push({
      code: "planner_packet_challenge_status_unresolved",
      severity,
      gateEffect: "implementation_transition_hold",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: "Challenge status",
      currentValue: status || "missing",
      expectedValues: ["pass", "exempt for eligible low-risk fast-path only"],
      message:
        `${artifact.path} must record Challenge status pass or a valid explicit low-risk exemption before implementation transition.`
    });
  }

  for (const field of PLANNER_PACKET_CHALLENGE_EVIDENCE_FIELDS) {
    const value = readPacketBulletFieldValueFromContent(section, field);
    if (hasConcreteValue(value, { allowUnknown: false })) {
      continue;
    }
    findings.push({
      code: "planner_packet_challenge_evidence_missing",
      severity,
      gateEffect: "implementation_transition_hold",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field,
      message: `${artifact.path} Planner Packet Challenge Review must record ${field} before implementation transition.`
    });
  }
}

function validateTaskPacketLaneTypeContract({ artifact, fields, findings }) {
  const laneTypeDeclaration = getFieldValue(fields, TASK_PACKET_LANE_TYPE_DECLARATION_LABEL);
  const declaration = parseTaskPacketLaneTypeDeclaration(laneTypeDeclaration);
  if (!declaration.declared) {
    return;
  }

  if (declaration.reason === "multiple") {
    findings.push({
      code: "task_packet_lane_type_contract_invalid",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: TASK_PACKET_LANE_TYPE_DECLARATION_LABEL,
      message:
        `${artifact.path} must declare exactly one supported lane type when ` +
        `${TASK_PACKET_LANE_TYPE_DECLARATION_LABEL} is used.`
    });
    return;
  }

  if (declaration.reason === "unsupported") {
    findings.push({
      code: "task_packet_lane_type_contract_invalid",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: TASK_PACKET_LANE_TYPE_DECLARATION_LABEL,
      message:
        `${artifact.path} declares unsupported lane type ${declaration.value}. ` +
        `Supported values are ${[...TASK_PACKET_SUPPORTED_LANE_TYPES].join(", ")}.`
    });
    return;
  }

  requireTaskPacketField({
    artifact,
    fields,
    label: TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_LABEL,
    findings,
    message:
      `${artifact.path} declares lane type ${declaration.laneType} but does not preserve ` +
      `${TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_LABEL}.`
  });

  const universalMinimumValue = getFieldValue(fields, TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_LABEL);
  if (hasConcreteValue(universalMinimumValue)) {
    const normalizedUniversalMinimum = normalizeValue(universalMinimumValue);
    for (const token of TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_TOKENS) {
      if (normalizedUniversalMinimum.includes(token)) {
        continue;
      }

      findings.push({
        code: "task_packet_lane_type_contract_invalid",
        severity: "error",
        artifactId: artifact.artifactId,
        packetPath: artifact.path,
        field: TASK_PACKET_LANE_TYPE_UNIVERSAL_MINIMUM_LABEL,
        message:
          `${artifact.path} declares lane type ${declaration.laneType} but its universal minimum ` +
          `contract does not include ${token}.`
      });
    }
  }

  for (const label of TASK_PACKET_LANE_TYPE_MATRIX_LABELS) {
    const value = getFieldValue(fields, label);
    if (hasConcreteValue(value)) {
      continue;
    }

    findings.push({
      code: "task_packet_lane_type_contract_advisory",
      severity: "warning",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: label,
      message:
        `${artifact.path} declares lane type ${declaration.laneType} but does not record ${label}. ` +
        "The first OPS-10 implementation should keep lane-typed minimums explicit even when enforcement is advisory-first."
    });
  }
}

function validateTaskPacketExactFieldEnums({ artifact, fields, findings }) {
  for (const contract of TASK_PACKET_EXACT_FIELD_ENUMS) {
    const value = getFieldValue(fields, contract.label);
    if (!value) {
      continue;
    }
    const normalized = normalizeValue(value);
    if (contract.expected.includes(normalized)) {
      continue;
    }
    findings.push({
      code: "task_packet_exact_enum_value_invalid",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      field: contract.label,
      currentValue: value,
      expectedValues: contract.expected,
      message:
        `${artifact.path} field ${contract.label} has current value "${value}"; ` +
        `expected exact one of ${contract.expected.join(" | ")}. ` +
        `Put explanatory text in ${contract.noteLabel} instead of the enum value.`
    });
  }
}

function requireTaskPacketField({
  artifact,
  fields,
  label,
  aliases = [],
  findings,
  message,
  allowNone = false,
  allowUnknown = false
}) {
  const value = getFieldValueWithAliases(fields, [label, ...aliases]);
  if (hasConcreteValue(value, { allowNone, allowUnknown })) {
    return;
  }

  findings.push({
    code: "task_packet_required_evidence_missing",
    severity: "error",
    artifactId: artifact.artifactId,
    packetPath: artifact.path,
    field: label,
    message
  });
}

function validateContractMarkers({
  repoRoot,
  relativePath,
  requiredMarkers,
  missingFileCode,
  missingMarkerCode,
  findings,
  profileId = null
}) {
  const resolvedPath = path.resolve(repoRoot, relativePath);
  const content = readRequiredUtf8File({
    filePath: resolvedPath,
    findings,
    missingCode: missingFileCode,
    missingMessage: `Missing required contract artifact: ${relativePath}.`,
    pathKey: "contractPath"
  });
  if (content == null) {
    if (findings.at(-1)?.code === missingFileCode) {
      findings.at(-1).contractPath = relativePath;
      if (profileId) {
        findings.at(-1).profileId = profileId;
      }
    }
    return;
  }

  for (const marker of requiredMarkers) {
    if (content.includes(marker)) {
      continue;
    }

    findings.push({
      code: missingMarkerCode,
      severity: "error",
      contractPath: relativePath,
      profileId,
      marker,
      message: `${relativePath} is missing required marker ${marker}.`
    });
  }
}

function parseQuickDecisionHeader(content) {
  const section = sliceSection(content, "## Quick Decision Header");
  if (!section) {
    return null;
  }

  const tableLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (tableLines.length < 3) {
    return null;
  }

  const rows = new Map();
  for (const line of tableLines.slice(2)) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 4 || !cells[0] || cells[0].startsWith("---")) {
      continue;
    }

    rows.set(cells[0], {
      proposed: cells[1],
      why: cells[2],
      status: cells[3]
    });
  }

  return rows;
}

function parseBulletFields(content) {
  const fields = new Map();

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^- ([^:]+):(.*)$/);
    if (!match) {
      continue;
    }

    fields.set(match[1].trim(), match[2].trim());
  }

  return fields;
}

function parseSectionBulletFields(content, sectionHeading) {
  const section = sliceSection(content, sectionHeading) ?? sliceSectionByHeadingLine(content, sectionHeading);
  if (!section) {
    return new Map();
  }

  const fields = new Map();
  let currentLabel = null;
  let currentValue = "";

  function commitCurrentField() {
    if (!currentLabel) {
      return;
    }
    fields.set(currentLabel, currentValue.trim());
  }

  for (const rawLine of section.split("\n")) {
    const match = rawLine.match(/^\s*-\s+([^:]+):(.*)$/);
    if (match) {
      commitCurrentField();
      currentLabel = match[1].trim();
      currentValue = match[2].trim();
      continue;
    }

    if (currentLabel && rawLine.trim() === "") {
      continue;
    }

    if (currentLabel && /^\s+/.test(rawLine) && rawLine.trim() && !rawLine.trim().startsWith("-")) {
      currentValue = `${currentValue} ${rawLine.trim()}`.trim();
      continue;
    }

    commitCurrentField();
    currentLabel = null;
    currentValue = "";
  }

  commitCurrentField();
  return fields;
}

function sliceSectionByHeadingLine(content, sectionHeading) {
  if (!content || !sectionHeading) {
    return null;
  }

  const escapedHeading = escapeRegExp(sectionHeading.trim()).replace(/\\\s+/g, "\\s+");
  const headingMatch = String(content).match(new RegExp(`^${escapedHeading}\\s*$`, "im"));
  if (!headingMatch || headingMatch.index == null) {
    return null;
  }

  const afterStart = String(content).slice(headingMatch.index + headingMatch[0].length).trimStart();
  const nextHeadingMatch = afterStart.match(/\n##\s+/);
  if (!nextHeadingMatch) {
    return afterStart;
  }

  return afterStart.slice(0, nextHeadingMatch.index).trimEnd();
}

function parseTaskPacketLaneTypeDeclaration(value) {
  const rawValue = String(value ?? "").trim();
  const normalized = normalizeValue(rawValue);
  if (!normalized || normalized === "none" || normalized === "undeclared" || normalized === "not-declared") {
    return { declared: false };
  }

  const tokens = rawValue
    .split(/[,+/;|]/)
    .map((token) => normalizeValue(token))
    .filter(Boolean);

  if (tokens.length !== 1) {
    return { declared: true, reason: "multiple", value: rawValue };
  }

  if (!TASK_PACKET_SUPPORTED_LANE_TYPES.has(tokens[0])) {
    return { declared: true, reason: "unsupported", value: rawValue };
  }

  return { declared: true, laneType: tokens[0] };
}

function getHeaderProposed(header, item) {
  return header.get(item)?.proposed ?? "";
}

function getHeaderProposedWithAliases(header, item, aliases = []) {
  return getHeaderRow(header, item, aliases)?.proposed ?? "";
}

function getHeaderRow(header, item, aliases = []) {
  for (const candidate of [item, ...aliases]) {
    const row = header.get(candidate);
    if (row) {
      return row;
    }
  }

  return null;
}

function getFieldValue(fields, label) {
  const exactValue = fields.get(label);
  if (exactValue !== undefined) {
    return exactValue;
  }

  const normalizedLabel = normalizeValue(label);
  for (const [fieldLabel, value] of fields.entries()) {
    if (normalizeValue(fieldLabel) === normalizedLabel) {
      return value;
    }
  }

  return "";
}

function getFieldValueWithAliases(fields, labels) {
  for (const label of labels) {
    const value = getFieldValue(fields, label);
    if (value) {
      return value;
    }
  }

  return "";
}

function hasStatedHeaderValue(value) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed.includes("[") || trimmed.includes("]")) {
    return false;
  }

  return !trimmed.includes(" / ");
}

function hasConcreteValue(value, { allowNone = false, allowUnknown = true } = {}) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  const normalized = normalizeValue(trimmed);
  if (!trimmed || trimmed === "-" || trimmed.includes("[") || trimmed.includes("]")) {
    return false;
  }
  if (!allowNone && normalized === "none") {
    return false;
  }
  if (!allowUnknown && normalized === "unknown") {
    return false;
  }
  return true;
}

function normalizeValue(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeOptionalValue(value) {
  const text = String(value ?? "").trim();
  return text ? normalizeValue(text) : "";
}

function normalizeOptionalPath(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").toLowerCase();
}

function extractProfileIds(value) {
  const matches = value.match(/PRF-\d+/gi) ?? [];
  return [...new Set(matches.map((match) => match.toUpperCase()))];
}

function validateSourceWaveLedgerMembership({
  artifact,
  ledgerReference,
  packetDisposition,
  repoRoot,
  findings
}) {
  const ledgerPath = path.resolve(repoRoot, ledgerReference);
  const content = readRequiredUtf8File({
    filePath: ledgerPath,
    findings,
    missingCode: "source_wave_ledger_instance_missing",
    missingMessage: `${artifact.path} cites missing authoritative source wave ledger ${ledgerReference}.`,
    pathKey: "contractPath"
  });

  if (content == null) {
    const finding = findings.at(-1);
    if (finding?.code === "source_wave_ledger_instance_missing") {
      finding.artifactId = artifact.artifactId;
      finding.packetPath = artifact.path;
      finding.contractPath = ledgerReference;
    }
    return;
  }

  const packetRow = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.includes(`| ${artifact.path} |`));

  if (!packetRow) {
    findings.push({
      code: "source_wave_packet_missing_from_ledger",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      contractPath: ledgerReference,
      message: `${artifact.path} cites ${ledgerReference} but the impacted packet set does not include that packet path.`
    });
    return;
  }

  if (!packetRow.toLowerCase().includes(packetDisposition)) {
    findings.push({
      code: "source_wave_packet_disposition_mismatch",
      severity: "error",
      artifactId: artifact.artifactId,
      packetPath: artifact.path,
      contractPath: ledgerReference,
      message: `${artifact.path} records Source wave packet disposition ${packetDisposition} but ${ledgerReference} does not match that disposition in the impacted packet row.`
    });
  }
}

function discoverConcreteTaskPacketCandidates(repoRoot) {
  const packetDir = path.resolve(repoRoot, TASK_PACKET_DIRECTORY);
  if (!fs.existsSync(packetDir)) {
    return [];
  }

  return fs
    .readdirSync(packetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => path.extname(entry.name).toLowerCase() === ".md")
    .filter((entry) => !TASK_PACKET_DISCOVERY_EXCLUDED_FILES.has(entry.name))
    .map((entry) => ({
      relativePath: `${TASK_PACKET_DIRECTORY}/${entry.name}`,
      absolutePath: path.join(packetDir, entry.name)
    }))
    .filter(({ absolutePath }) => looksLikeConcreteTaskPacket(fs.readFileSync(absolutePath, "utf8")))
    .map(({ relativePath }) => relativePath);
}

function looksLikeConcreteTaskPacket(content) {
  if (!content) {
    return false;
  }

  const hasRequiredMarkers = TASK_PACKET_DISCOVERY_REQUIRED_MARKERS.every((marker) => content.includes(marker));
  if (!hasRequiredMarkers) {
    return false;
  }

  return (
    content.includes("| Active profile dependencies |") ||
    content.includes("| Active profile dependency |")
  );
}

function createDiscoveredTaskPacketArtifact(packetPath) {
  return {
    artifactId: `discovered:${packetPath}`,
    path: packetPath
  };
}

function validateRequiredSections(projectionName, content, findings) {
  for (const section of REQUIRED_SECTIONS[projectionName] ?? []) {
    if (!content.includes(section)) {
      findings.push({
        code: "required_section_missing",
        severity: "error",
        projectionName,
        section,
        message: `${projectionName} is missing required section ${section}.`
      });
    }
  }
}

function validateProjectionState(store, projectionName, content, findings) {
  const projection = store.getGenerationState(projectionName);
  if (!projection) {
    findings.push({
      code: "generation_failed",
      severity: "error",
      projectionName,
      message: `${projectionName} has no generation_state row.`
    });
    return;
  }

  const checksum = calculateChecksum(content);
  if (projection.checksum !== checksum) {
    findings.push({
      code: "checksum_mismatch",
      severity: "error",
      projectionName,
      message: `${projectionName} checksum does not match generation_state.`
    });
    findings.push({
      code: "stale_generated_view",
      severity: "error",
      projectionName,
      message: `${projectionName} content no longer matches the last generated projection state.`
    });
  }
}

function validateCompatibilityFallbackSurface({ store, repoRoot, relativePath, requiredMarkers: _requiredMarkers, findings }) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  const content = readRequiredUtf8File({
    filePath: absolutePath,
    findings,
    missingCode: "generation_failed",
    missingMessage: `${relativePath} generated compatibility surface is missing.`,
    pathKey: "path"
  });
  if (content == null) {
    return;
  }

  const projection = store.getGenerationState(relativePath);
  if (!projection) {
    findings.push({
      code: "generation_failed",
      severity: "error",
      projectionName: relativePath,
      message: `${relativePath} has no generation_state row.`
    });
  }
}

function validateDecisionParity(store, content, findings) {
  const openDecisions = store.listDecisions({ status: "open", decisionNeeded: true });
  const summaryCount = extractSummaryCount(content, "## Decision Required Summary");
  const detailCount = countTableRows(content, "## Decision Required Detail");

  if (summaryCount !== openDecisions.length) {
    findings.push({
      code: "generated_docs_parity_mismatch",
      severity: "error",
      projectionName: CURRENT_STATE_DOC,
      message: `Decision summary count ${summaryCount} does not match DB count ${openDecisions.length}.`
    });
  }

  if (summaryCount !== detailCount) {
    findings.push({
      code: "count_detail_parity_mismatch",
      severity: "error",
      projectionName: CURRENT_STATE_DOC,
      message: `Decision summary count ${summaryCount} does not match detail row count ${detailCount}.`
    });
  }
}

function validateRiskParity(store, content, findings) {
  const openRisks = store.listGateRisks({ status: "open" });
  const summaryCount = extractSummaryCount(content, "## Blocked / At Risk Summary");
  const detailCount = countTableRows(content, "## Blocked / At Risk Detail");

  if (summaryCount !== openRisks.length) {
    findings.push({
      code: "generated_docs_parity_mismatch",
      severity: "error",
      projectionName: TASK_LIST_DOC,
      message: `Blocked/risk summary count ${summaryCount} does not match DB count ${openRisks.length}.`
    });
  }

  if (summaryCount !== detailCount) {
    findings.push({
      code: "count_detail_parity_mismatch",
      severity: "error",
      projectionName: TASK_LIST_DOC,
      message: `Blocked/risk summary count ${summaryCount} does not match detail row count ${detailCount}.`
    });
  }
}

function validateSourceRefs(store, repoRoot, findings) {
  const releaseState = store.getReleaseState("current");
  const entries = [
    ...wrapSourceRefs("release_state", releaseState ? [releaseState] : []),
    ...wrapSourceRefs("work_item_registry", store.listWorkItems()),
    ...wrapSourceRefs("decision_registry", store.listDecisions()),
    ...wrapSourceRefs("gate_risk_registry", store.listGateRisks()),
    ...wrapSourceRefs("handoff_log", store.listRecentHandoffs(50)),
    ...wrapSourceRefs("artifact_index", store.listArtifacts())
  ];

  for (const entry of entries) {
    if (!entry.sourceRef) {
      continue;
    }

    const resolved = path.resolve(repoRoot, entry.sourceRef);
    if (!fs.existsSync(resolved)) {
      findings.push({
        code: "source_ref_unresolved",
        severity: "error",
        rowType: entry.rowType,
        rowId: entry.rowId,
        sourceRef: entry.sourceRef,
        message: `${entry.rowType}:${entry.rowId} points to missing source_ref ${entry.sourceRef}.`
      });
    }
  }
}

function validateFreshness(store, findings) {
  const latestSourceChange = store.getLatestOperationalTimestamp();
  if (!latestSourceChange) {
    return;
  }

  for (const projectionName of [
    CURRENT_STATE_DOC,
    TASK_LIST_DOC,
    COMPATIBILITY_CURRENT_STATE_PATH,
    COMPATIBILITY_TASK_LIST_PATH,
    ACTIVE_CONTEXT_JSON,
    ACTIVE_CONTEXT_MARKDOWN
  ]) {
    const projection = store.getGenerationState(projectionName);
    if (!projection) {
      continue;
    }

    if (projection.generatedAt < latestSourceChange) {
      findings.push({
        code: "stale_generated_view",
        severity: "error",
        projectionName,
        message: `${projectionName} is stale relative to the latest DB mutation timestamp.`
      });
      findings.push({
        code: "freshness_drift_detected",
        severity: "error",
        projectionName,
        message: `${projectionName} is stale relative to the latest DB mutation timestamp.`
      });
    }
  }
}

function validateActiveContextContract({ store, repoRoot, outputDir, findings }) {
  const jsonPath = path.resolve(outputDir, ACTIVE_CONTEXT_JSON);
  const markdownPath = path.resolve(outputDir, ACTIVE_CONTEXT_MARKDOWN);
  const jsonContent = readRequiredUtf8File({
    filePath: jsonPath,
    findings,
    missingCode: "active_context_missing",
    missingMessage: `${ACTIVE_CONTEXT_JSON} is required as the first re-entry contract surface.`,
    pathKey: "path"
  });
  const markdownContent = readRequiredUtf8File({
    filePath: markdownPath,
    findings,
    missingCode: "active_context_missing",
    missingMessage: `${ACTIVE_CONTEXT_MARKDOWN} is required as the human-facing re-entry contract surface.`,
    pathKey: "path"
  });

  if (jsonContent != null) {
    validateProjectionState(store, ACTIVE_CONTEXT_JSON, jsonContent, findings);
    validateActiveContextJson({ store, repoRoot, content: jsonContent, findings });
  }

  if (markdownContent != null) {
    validateProjectionState(store, ACTIVE_CONTEXT_MARKDOWN, markdownContent, findings);
    validateRequiredContentMarkers({
      content: markdownContent,
      markers: ACTIVE_CONTEXT_MARKDOWN_REQUIRED_MARKERS,
      code: "active_context_markdown_incomplete",
      severity: "error",
      path: ACTIVE_CONTEXT_MARKDOWN,
      root: "root",
      findings
    });
  }
}

function validateActiveContextJson({ store, repoRoot, content, findings }) {
  let context;
  try {
    context = JSON.parse(content);
  } catch (error) {
    findings.push({
      code: "active_context_json_parse_failed",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      message: `${ACTIVE_CONTEXT_JSON} is not valid JSON: ${error.message}`
    });
    return;
  }

  const requiredChecks = [
    [context.schemaVersion, "schemaVersion"],
    [context.reentryContract?.firstRead === ACTIVE_CONTEXT_JSON, "reentryContract.firstRead"],
    [Array.isArray(context.reentryContract?.mustReadNext) && context.reentryContract.mustReadNext.length > 0, "reentryContract.mustReadNext"],
    [typeof context.reentryContract?.digest === "string" && context.reentryContract.digest.length > 0, "reentryContract.digest"],
    [typeof context.nextWork?.action === "string" && context.nextWork.action.length > 0, "nextWork.action"],
    [typeof context.nextWork?.owner === "string" && context.nextWork.owner.length > 0, "nextWork.owner"],
    [Array.isArray(context.nextWork?.evidencePaths), "nextWork.evidencePaths"],
    [Array.isArray(context.nextWork?.fixLoopHistory), "nextWork.fixLoopHistory"],
    [typeof context.sources?.currentState === "string" && context.sources.currentState.length > 0, "sources.currentState"],
    [typeof context.sources?.taskList === "string" && context.sources.taskList.length > 0, "sources.taskList"],
    [typeof context.sources?.validationReport === "string" && context.sources.validationReport.length > 0, "sources.validationReport"]
  ];

  for (const [passed, field] of requiredChecks) {
    if (passed) {
      continue;
    }
    findings.push({
      code: "active_context_contract_missing_field",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      field,
      message: `${ACTIVE_CONTEXT_JSON} is missing required contract field ${field}.`
    });
  }

  const mustReadNext = context.reentryContract?.mustReadNext ?? [];
  const validationReportExists = fs.existsSync(path.resolve(repoRoot, VALIDATION_REPORT_JSON));
  const activeContextRequiredPaths = [
    validationReportExists ? VALIDATION_REPORT_JSON : null,
    ...(Array.isArray(context.nextWork?.requiredSsot) ? context.nextWork.requiredSsot : []),
    ...(Array.isArray(context.nextWork?.evidencePaths) ? context.nextWork.evidencePaths : [])
  ].filter(Boolean);
  for (const requiredPath of activeContextRequiredPaths) {
    if (mustReadNext.includes(requiredPath)) {
      continue;
    }
    findings.push({
      code: "active_context_must_read_missing",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      requiredPath,
      message: `${ACTIVE_CONTEXT_JSON} mustReadNext does not include ${requiredPath}.`
    });
  }

  const workItems = store.listWorkItems();
  const expectedActiveTask = selectActiveWorkItem(workItems, { repoRoot });
  const recentHandoffs = store.listRecentHandoffs(50);
  const latestHandoff = recentHandoffs[0] ?? null;
  const routeHandoff = resolveRouteHandoffForValidation({ activeTask: expectedActiveTask, recentHandoffs, latestHandoff });
  const handoffExecution = resolveHandoffExecution({
    repoRoot,
    workItems,
    latestHandoff: routeHandoff,
    includeWorkflowDetails: true
  });
  const expectedWorkflow =
    handoffExecution.workflow === "manual_selection_required" ||
    handoffExecution.routeStatus === "planner_fallback_blocked"
      ? null
      : handoffExecution.workflow;
  if ((context.nextWork?.workflow ?? null) !== expectedWorkflow) {
    findings.push({
      code: "active_context_route_mismatch",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      message: `${ACTIVE_CONTEXT_JSON} nextWork.workflow does not match the current workflow routing result.`
    });
  }

  if ((context.nextWork?.owner ?? null) !== (handoffExecution.owner ?? null)) {
    findings.push({
      code: "active_context_route_mismatch",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      message: `${ACTIVE_CONTEXT_JSON} nextWork.owner does not match the current workflow routing result.`
    });
  }

  if ((context.selectedLane?.workItemId ?? null) !== (expectedActiveTask?.workItemId ?? null)) {
    findings.push({
      code: "active_context_route_mismatch",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      message: `${ACTIVE_CONTEXT_JSON} selectedLane.workItemId does not match the active work item.`
    });
  }

  if (expectedWorkflow && !mustReadNext.includes(expectedWorkflow)) {
    findings.push({
      code: "active_context_must_read_missing",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      requiredPath: expectedWorkflow,
      message: `${ACTIVE_CONTEXT_JSON} mustReadNext does not include the next workflow contract ${expectedWorkflow}.`
    });
  }

  if (context.sources?.activePacket && !mustReadNext.includes(context.sources.activePacket)) {
    findings.push({
      code: "active_context_must_read_missing",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      requiredPath: context.sources.activePacket,
      message: `${ACTIVE_CONTEXT_JSON} mustReadNext does not include the active packet source.`
    });
  }

  const sourceTrace = context.reentryContract?.sourceTrace ?? [];
  const sourceTraceRequiredPaths = [
    validationReportExists ? VALIDATION_REPORT_JSON : null,
    ...(Array.isArray(context.nextWork?.requiredSsot) ? context.nextWork.requiredSsot : []),
    ...(Array.isArray(context.nextWork?.evidencePaths) ? context.nextWork.evidencePaths : []),
    context.sources?.activePacket
  ].filter(Boolean);
  for (const requiredPath of sourceTraceRequiredPaths) {
    if (sourceTrace.includes(requiredPath)) {
      continue;
    }
    findings.push({
      code: "active_context_source_trace_missing",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      requiredPath,
      message: `${ACTIVE_CONTEXT_JSON} sourceTrace does not include ${requiredPath}.`
    });
  }

  validateActiveContextValidationParity({ context, repoRoot, findings });
  validateActiveWorkItemSemanticTrace({ context, repoRoot, findings });
}

function resolveRouteHandoffForValidation({ activeTask, recentHandoffs, latestHandoff }) {
  if (!activeTask) {
    return latestHandoff;
  }

  return recentHandoffs.find((handoff) => handoffMatchesWorkItemForValidation(handoff, activeTask)) ?? null;
}

function handoffMatchesWorkItemForValidation(handoff, workItem) {
  if (!handoff || !workItem) {
    return false;
  }

  const payload = handoff.payload ?? {};
  if (payload.workItemId && payload.workItemId === workItem.workItemId) {
    return true;
  }

  if (handoff.sourceRef && workItem.sourceRef && handoff.sourceRef === workItem.sourceRef) {
    return true;
  }

  return false;
}

function validateActiveContextValidationParity({ context, repoRoot, findings }) {
  const report = readValidationReportSummary(repoRoot);
  if (!report || !context.validation) {
    return;
  }

  const parityFields = [
    ["ok", context.validation.ok, report.ok],
    ["cutoverReady", context.validation.cutoverReady, report.cutoverReady],
    ["findingCount", context.validation.findingCount, report.findingCount],
    ["blockingFindingCount", context.validation.blockingFindingCount, report.blockingFindingCount],
    ["gateDecision", context.validation.gateDecision, report.gateDecision]
  ];
  for (const [field, contextValue, reportValue] of parityFields) {
    if (contextValue === reportValue) {
      continue;
    }
    findings.push({
      code: "validation_report_context_parity_break",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      field,
      message: `${ACTIVE_CONTEXT_JSON} validation.${field} does not match ${VALIDATION_REPORT_JSON}.`
    });
  }

  if ((context.validation.executedAt ?? null) !== (report.executedAt ?? null)) {
    findings.push({
      code: "active_context_validation_executed_at_mismatch",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      message: `${ACTIVE_CONTEXT_JSON} validation.executedAt does not match ${VALIDATION_REPORT_JSON}.`
    });
  }

  const contextTracePath = context.validation.traceSummary?.path ?? null;
  const reportTracePath = report.traceSummary?.path ?? null;
  if ((contextTracePath ?? null) !== (reportTracePath ?? null)) {
    findings.push({
      code: "validation_report_context_parity_break",
      severity: "error",
      path: ACTIVE_CONTEXT_JSON,
      field: "traceSummary.path",
      message: `${ACTIVE_CONTEXT_JSON} validation.traceSummary.path does not match ${VALIDATION_REPORT_JSON}.`
    });
  }
}

function readPacketBulletFieldValue(repoRoot, sourceRef, label) {
  if (!sourceRef || !sourceRef.endsWith(".md")) {
    return null;
  }
  const packetPath = path.resolve(repoRoot, sourceRef);
  if (!fs.existsSync(packetPath)) {
    return null;
  }
  const content = fs.readFileSync(packetPath, "utf8");
  return readPacketBulletFieldValueFromContent(content, label);
}

function normalizeSemanticTraceEvidenceStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "not-requested";
  }
  if (normalized === "requested" || normalized === "request" || normalized === "enabled" || normalized === "on") {
    return "requested";
  }
  return "not-requested";
}

const WORKFLOW_SELECTION_BASIS_VALUES = new Set(["active_task_owner", "latest_handoff", "default_planner"]);

function resolveSemanticTraceContract({ activeTask, repoRoot }) {
  if (!activeTask?.workItemId) {
    return { requested: false };
  }
  const runtimeStatus = activeTask.metadata?.semanticTraceEvidence?.status ?? null;
  const packetStatus = readPacketBulletFieldValue(repoRoot, activeTask.sourceRef, "Semantic trace evidence status");
  return {
    requested: normalizeSemanticTraceEvidenceStatus(runtimeStatus ?? packetStatus) === "requested"
  };
}

function validateWorkflowDisciplineTrace({ trace, activeTask, findings, expectedRelativePath }) {
  const discipline = trace.workflowDiscipline;
  if (!discipline || typeof discipline !== "object") {
    findings.push({
      code: "workflow_selection_basis_missing",
      severity: "warn",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} is missing workflowDiscipline evidence for workflow/route enforcement review.`
    });
    return;
  }

  if (!WORKFLOW_SELECTION_BASIS_VALUES.has(String(discipline.workflowSelectionBasis ?? "").trim().toLowerCase())) {
    findings.push({
      code: "workflow_selection_basis_missing",
      severity: "warn",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} does not record a recognized workflowSelectionBasis.`
    });
  }

  const workflowClaimed = typeof discipline.workflowContractPath === "string" && discipline.workflowContractPath.length > 0;
  const requiredReadEvidence = discipline.requiredReadEvidence ?? {};
  const missingReadEvidence = [];
  if (workflowClaimed && requiredReadEvidence.activeContextDeclared !== true) {
    missingReadEvidence.push(ACTIVE_CONTEXT_JSON);
  }
  if (workflowClaimed && requiredReadEvidence.packetDeclared !== true && activeTask?.sourceRef) {
    missingReadEvidence.push(activeTask.sourceRef);
  }
  if (workflowClaimed && requiredReadEvidence.workflowContractDeclared !== true) {
    missingReadEvidence.push(discipline.workflowContractPath);
  }
  if (missingReadEvidence.length > 0) {
    findings.push({
      code: "required_read_evidence_missing_for_workflow_claim",
      severity: "warn",
      gateEffect: "closeout_hold",
      tracePath: expectedRelativePath,
      missingReadEvidence,
      message: `${expectedRelativePath} claims workflow ${discipline.workflowContractPath} without declared required-read evidence for ${missingReadEvidence.join(", ")}.`
    });
  }

  if (
    workflowClaimed &&
    requiredReadEvidence.workflowContractDeclared === true &&
    discipline.entryPreconditionStatus === "blocked"
  ) {
    findings.push({
      code: "workflow_file_read_but_entry_precondition_bypassed",
      severity: "warn",
      gateEffect: "closeout_hold",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} records workflow contract read evidence for ${discipline.workflowContractPath} while entry preconditions were still blocked.`
    });
  }

  if (discipline.entryPreconditionStatus === "blocked" && discipline.mutatingIntentDetected === true) {
    findings.push({
      code: "route_authority_mismatch_known_but_bypassed",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} records blocked workflow/route preconditions while mutating or verification intent was still active.`
    });
  }

  if (
    discipline.entryPreconditionStatus === "blocked" &&
    discipline.workflowSelectionBasis &&
    discipline.workflowSelectionBasis !== "active_task_owner"
  ) {
    findings.push({
      code: "task_answer_drifted_before_route_state_restoration",
      severity: "warn",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} still relied on fallback workflow selection while route restoration remained blocked.`
    });
  }

  if (trace.handoff?.toRole && trace.role && trace.handoff.toRole !== trace.role) {
    findings.push({
      code: "workflow_owner_changed_without_structured_routing",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} active role ${trace.role} does not match the latest routed owner ${trace.handoff.toRole}.`
    });
  }
}

function validateActiveWorkItemSemanticTrace({ context, repoRoot, findings }) {
  const activeTask = context.activeTask;
  if (!activeTask?.workItemId) {
    return;
  }
  const traceContract = resolveSemanticTraceContract({ activeTask, repoRoot });
  if (!traceContract.requested) {
    return;
  }

  const report = readValidationReportSummary(repoRoot);
  const expectedRelativePath = `${AGENT_TRACES_DIR}/${activeTask.workItemId}.json`;
  const tracePath = path.resolve(repoRoot, expectedRelativePath);
  const traceContent = readRequiredUtf8File({
    filePath: tracePath,
    findings,
    missingCode: "required_semantic_trace_missing",
    missingMessage: `${expectedRelativePath} is required for the active work item semantic trace contract.`,
    pathKey: "tracePath"
  });
  if (traceContent == null) {
    return;
  }

  let trace;
  try {
    trace = JSON.parse(traceContent);
  } catch (error) {
    findings.push({
      code: "required_semantic_trace_missing",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} is not valid JSON: ${error.message}`
    });
    return;
  }

  for (const field of [
    "schemaVersion",
    "workItemId",
    "packetId",
    "role",
    "workflow",
    "turnClosedAt",
    "requiredSsot",
    "declaredReadEvidence",
    "approvedDesignRefs",
    "implementationRefs",
    "verificationRefs",
    "workflowDiscipline",
    "semanticTrace",
    "selfCheck",
    "handoff"
  ]) {
    if (trace[field] !== undefined && trace[field] !== null) {
      continue;
    }
    findings.push({
      code: "required_semantic_trace_missing",
      severity: "error",
      tracePath: expectedRelativePath,
      field,
      message: `${expectedRelativePath} is missing required field ${field}.`
    });
  }

  if ((trace.workItemId ?? null) !== activeTask.workItemId) {
    findings.push({
      code: "contradictory_evidence",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} workItemId does not match the active work item.`
    });
  }

  const expectedPacketId = context.sources?.activePacket
    ? path.basename(context.sources.activePacket, path.extname(context.sources.activePacket))
    : null;
  if (expectedPacketId && (trace.packetId ?? null) !== expectedPacketId) {
    findings.push({
      code: "contradictory_evidence",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} packetId does not match the active packet source.`
    });
  }

  if ((trace.role ?? null) !== (activeTask.owner ?? null)) {
    findings.push({
      code: "contradictory_evidence",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} role does not match the active work item owner.`
    });
  }

  if (report?.executedAt && (trace.turnClosedAt ?? null) !== report.executedAt) {
    findings.push({
      code: "stale_evidence",
      severity: "error",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} turnClosedAt does not match ${VALIDATION_REPORT_JSON} executedAt.`
    });
  }

  for (const ref of [
    ...(Array.isArray(trace.requiredSsot) ? trace.requiredSsot : []),
    ...(Array.isArray(trace.declaredReadEvidence) ? trace.declaredReadEvidence : []),
    ...(Array.isArray(trace.approvedDesignRefs) ? trace.approvedDesignRefs : []),
    ...(Array.isArray(trace.implementationRefs) ? trace.implementationRefs : []),
    ...(Array.isArray(trace.verificationRefs) ? trace.verificationRefs : [])
  ]) {
    if (!ref || fs.existsSync(path.resolve(repoRoot, ref))) {
      continue;
    }
    findings.push({
      code: "broken_source_reference",
      severity: "error",
      tracePath: expectedRelativePath,
      sourceRef: ref,
      message: `${expectedRelativePath} points to missing source reference ${ref}.`
    });
  }

  if ((trace.declaredReadEvidence?.length ?? 0) < 3) {
    findings.push({
      code: "evidence_linkage_thin",
      severity: "warn",
      tracePath: expectedRelativePath,
      message: `${expectedRelativePath} has thin declaredReadEvidence linkage for reviewer review.`
    });
  }

  validateWorkflowDisciplineTrace({ trace, activeTask, findings, expectedRelativePath });
}

