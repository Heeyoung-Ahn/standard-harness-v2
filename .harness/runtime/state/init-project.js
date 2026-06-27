import fs from "node:fs";
import path from "node:path";

import { writeActiveContext } from "./active-context.js";
import { writeGeneratedStateDocs } from "./generate-state-docs.js";
import { createOperatingStateStore } from "./operating-state-store.js";

export const STARTER_PACKAGE_NAME = "standard-harness-starter";
export const KNOWN_PROFILES = {
  "PRF-01": {
    label: "PRF-01 admin grid application profile",
    architectureNote:
      "`PRF-01` active: dense administrative grid, search/filter/sort, row action, bulk operation."
  },
  "PRF-02": {
    label: "PRF-02 authoritative spreadsheet source profile",
    architectureNote:
      "`PRF-02` active: spreadsheet-backed authoritative planning, field mapping, or operational source."
  },
  "PRF-03": {
    label: "PRF-03 airgapped delivery profile",
    architectureNote:
      "`PRF-03` active: transfer-bound or airgapped delivery with explicit bundle and integrity evidence."
  },
  "PRF-04": {
    label: "PRF-04 legacy Excel/VBA-MariaDB replacement profile",
    architectureNote:
      "`PRF-04` active: legacy Excel/VBA-MariaDB replacement with source inventory, migration, reconciliation, and parallel-run evidence."
  },
  "PRF-05": {
    label: "PRF-05 Python/Django backoffice profile",
    architectureNote:
      "`PRF-05` active: Python/Django backoffice implementation with source-root, version, migration, DB, service, admin, and test conventions."
  },
  "PRF-06": {
    label: "PRF-06 workflow approval application profile",
    architectureNote:
      "`PRF-06` active: workflow-heavy application with state machine, approval matrix, permission matrix, audit, and reopen/rollback evidence."
  },
  "PRF-07": {
    label: "PRF-07 lightweight web/app profile",
    architectureNote:
      "`PRF-07` active: lightweight web/app implementation with source-root, runtime, persistence, auth, deployment, and simple acceptance boundaries."
  },
  "PRF-08": {
    label: "PRF-08 Android native app profile",
    architectureNote:
      "`PRF-08` active: Android native implementation with Gradle/AGP, package namespace, SDK, signing, permissions, device test, and release-channel evidence."
  },
  "PRF-09": {
    label: "PRF-09 Node/frontend web app profile",
    architectureNote:
      "`PRF-09` active: Node or frontend web app implementation with package ownership, build, test, environment, API, and deployment evidence."
  },
  "PRF-10": {
    label: "PRF-10 BI analytics platform profile",
    architectureNote:
      "`PRF-10` active: BI or analytics platform implementation with source inventory, semantic model, metric catalog, refresh/lineage, and dashboard governance evidence."
  }
};

export const REQUIRED_STARTER_FILES = [
  "AGENTS.md",
  "README.md",
  "START_HERE.md",
  "package.json",
  "reference/manuals/human/HARNESS_MANUAL.md",
  ".agents/rules/agent_behavior.md",
  ".agents/artifacts/CURRENT_STATE.md",
  ".agents/artifacts/TASK_LIST.md",
  ".agents/artifacts/REQUIREMENTS.md",
  ".agents/artifacts/ARCHITECTURE_GUIDE.md",
  ".agents/artifacts/IMPLEMENTATION_PLAN.md",
  ".agents/artifacts/ACTIVE_PROFILES.md",
  ".agents/artifacts/PROJECT_PROGRESS.md",
  ".agents/artifacts/PREVENTIVE_MEMORY.md",
  ".agents/skills/day_start/SKILL.md",
  ".agents/skills/day_wrap_up/SKILL.md",
  "reference/planning/PLN-00_DEEP_INTERVIEW.md",
  "reference/planning/PLN-01_REQUIREMENTS_FREEZE.md",
  "reference/artifacts/UI_DESIGN.md",
  "reference/artifacts/DEPLOYMENT_PLAN.md",
  "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
  "reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.md",
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
  "reference/artifacts/BI_DATA_SOURCE_INVENTORY.md",
  "reference/artifacts/BI_METRIC_CATALOG.md",
  "reference/artifacts/BI_SEMANTIC_MODEL.md",
  "reference/artifacts/BI_REFRESH_AND_LINEAGE_PLAN.md",
  "reference/artifacts/BI_DASHBOARD_GOVERNANCE.md",
  "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
  "reference/profiles/README.md",
  "reference/profiles/PRF-04_LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE.md",
  "reference/profiles/PRF-05_PYTHON_DJANGO_BACKOFFICE_PROFILE.md",
  "reference/profiles/PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE.md",
  "reference/profiles/PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md",
  "reference/profiles/PRF-08_ANDROID_NATIVE_APP_PROFILE.md",
  "reference/profiles/PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md",
  "reference/profiles/PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md"
];

const PROGRESS_ROWS = [
  {
    phase: "Planning",
    id: "PLN-00",
    task: "Kickoff interview",
    status: "in_progress",
    notes: "Close implementation-critical discovery and approval boundaries first.",
    source: "reference/planning/PLN-00_DEEP_INTERVIEW.md",
    domain: "기준선 정렬"
  },
  {
    phase: "Planning",
    id: "PLN-01",
    task: "Requirements freeze",
    status: "todo",
    notes: "Freeze the project-specific requirements baseline after user confirmation.",
    source: ".agents/artifacts/REQUIREMENTS.md",
    domain: "기준선 정렬"
  },
  {
    phase: "Planning",
    id: "PLN-02",
    task: "Baseline sync",
    status: "todo",
    notes: "Align architecture / implementation / UI after requirements approval.",
    source: ".agents/artifacts/ARCHITECTURE_GUIDE.md",
    domain: "기준선 정렬"
  },
  {
    phase: "Design",
    id: "DSG-01",
    task: "Rough UX direction",
    status: "todo",
    notes: "Lock the rough direction and global behavior contract.",
    source: "reference/artifacts/UI_DESIGN.md",
    domain: "기준선 정렬"
  },
  {
    phase: "Packet",
    id: "PKT-01",
    task: "First work packet approval",
    status: "todo",
    notes: "Use the standard packet template before any code starts.",
    source: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    domain: "운영 품질"
  },
  {
    phase: "Build",
    id: "DEV-01",
    task: "First approved implementation packet",
    status: "todo",
    notes: "Replace this starter row with the first real implementation packet.",
    source: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    domain: "상태 저장소"
  },
  {
    phase: "Build",
    id: "DEV-02",
    task: "Implementation and canonical-doc sync",
    status: "todo",
    notes: "Keep code and live artifacts aligned while building.",
    source: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    domain: "상태 문서·복원"
  },
  {
    phase: "Test",
    id: "DEV-03",
    task: "Generated docs / validator verification",
    status: "todo",
    notes: "Check generated docs and validator parity.",
    source: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    domain: "검증·컷오버"
  },
  {
    phase: "Test",
    id: "DEV-04",
    task: "Active context and operator re-entry check",
    status: "todo",
    notes: "Verify CLI-first context and operator re-entry against the approved baseline.",
    source: "reference/artifacts/UI_DESIGN.md",
    domain: "활성 컨텍스트"
  },
  {
    phase: "Release",
    id: "DEV-05",
    task: "Deploy / test / cutover readiness",
    status: "todo",
    notes: "Close environment topology, rollback, and release-readiness checks.",
    source: "reference/artifacts/DEPLOYMENT_PLAN.md",
    domain: "검증·컷오버"
  },
  {
    phase: "Quality",
    id: "QLT-01",
    task: "Packet exit quality gate",
    status: "todo",
    notes: "Record closeout evidence before moving to the next packet.",
    source: "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
    domain: "운영 품질"
  },
  {
    phase: "Security",
    id: "SEC-01",
    task: "Security and operational risk review",
    status: "todo",
    notes: "Review code path, scripts, dependencies, and release risks.",
    source: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    domain: "운영 품질"
  },
  {
    phase: "Test",
    id: "TST-01",
    task: "Acceptance and parity verification",
    status: "todo",
    notes: "Check acceptance, generated docs, and live truth parity.",
    source: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    domain: "검증·컷오버"
  },
  {
    phase: "Test",
    id: "TST-02",
    task: "Operator comprehension check",
    status: "todo",
    notes: "Confirm first-view comprehension before release.",
    source: "reference/artifacts/UI_DESIGN.md",
    domain: "활성 컨텍스트"
  },
  {
    phase: "Review",
    id: "REV-01",
    task: "Release review gate",
    status: "todo",
    notes: "Close the release gate with evidence and review alignment.",
    source: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    domain: "운영 품질"
  }
];

const DOMAIN_BY_PHASE = {
  Planning: "기준선 정렬",
  Design: "기준선 정렬",
  Packet: "운영 품질",
  Build: "상태 저장소",
  Quality: "운영 품질",
  Security: "운영 품질",
  Test: "검증·컷오버",
  Review: "운영 품질"
};

export function initializeProjectStarter({
  repoRoot = process.cwd(),
  projectName,
  projectSlug,
  userGoal,
  opsGoal,
  approvalGoal,
  activeProfiles = [],
  force = false,
  now = defaultNow
} = {}) {
  const resolvedRoot = path.resolve(repoRoot);
  ensureStarterLayout(resolvedRoot);
  ensureStarterSafe(resolvedRoot, { force });

  const normalizedProjectName = requireNonEmpty(projectName, "projectName");
  const normalizedProjectSlug = sanitizePackageName(
    projectSlug ? requireNonEmpty(projectSlug, "projectSlug") : slugifyProjectName(normalizedProjectName)
  );
  const normalizedUserGoal = requireNonEmpty(userGoal, "userGoal");
  const normalizedOpsGoal = requireNonEmpty(opsGoal, "opsGoal");
  const normalizedApprovalGoal = requireNonEmpty(approvalGoal, "approvalGoal");
  const normalizedProfiles = normalizeActiveProfiles(activeProfiles);
  const initializedAt = now();
  const initializedDate = initializedAt.slice(0, 10);

  const currentFocus = `Fill PROJECT_STARTER_DOC_PACK, close PLN-00 kickoff interview, and approve PLN-01 requirements freeze for ${normalizedProjectName}.`;
  const releaseGoal = `Define the first approved project baseline for ${normalizedProjectName} on top of the standard harness starter.`;
  const bootstrapSummary = `Bootstrapped ${normalizedProjectName} from the standard harness starter and opened kickoff discovery plus starter-doc-pack closure.`;

  writeFile(
    resolvedRoot,
    "README.md",
    buildProjectReadme({
      projectName: normalizedProjectName,
      projectSlug: normalizedProjectSlug,
      initializedDate,
      activeProfiles: normalizedProfiles
    })
  );
  writeFile(
    resolvedRoot,
    ".agents/artifacts/CURRENT_STATE.md",
    buildCurrentStateDoc({
      projectName: normalizedProjectName,
      currentFocus,
      releaseGoal,
      initializedDate,
      bootstrapSummary
    })
  );
  writeFile(
    resolvedRoot,
    ".agents/artifacts/TASK_LIST.md",
    buildTaskListDoc({
      projectName: normalizedProjectName,
      currentFocus,
      bootstrapSummary,
      initializedDate
    })
  );
  writeFile(
    resolvedRoot,
    ".agents/artifacts/ACTIVE_PROFILES.md",
    buildActiveProfilesDoc({
      activeProfiles: normalizedProfiles,
      initializedDate,
      activatedBy: "harness:init"
    })
  );
  writeFile(
    resolvedRoot,
    ".agents/artifacts/PROJECT_PROGRESS.md",
    buildProjectProgressDoc({
      projectName: normalizedProjectName
    })
  );

  updateFile(
    resolvedRoot,
    ".agents/artifacts/REQUIREMENTS.md",
    (text) =>
      updateRequirementsText(text, {
        projectName: normalizedProjectName,
        userGoal: normalizedUserGoal,
        opsGoal: normalizedOpsGoal,
        approvalGoal: normalizedApprovalGoal,
        activeProfiles: normalizedProfiles
      })
  );
  updateFile(
    resolvedRoot,
    ".agents/artifacts/ARCHITECTURE_GUIDE.md",
    (text) => updateArchitectureText(text)
  );
  updateFile(
    resolvedRoot,
    ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    (text) =>
      updateImplementationPlanText(text, {
        projectName: normalizedProjectName,
        currentFocus,
        activeProfiles: normalizedProfiles
      })
  );
  updatePackageJson(resolvedRoot, normalizedProjectSlug);

  const dbPath = path.join(resolvedRoot, ".harness", "operating_state.sqlite");
  resetOperatingStateArtifacts(dbPath);
  const store = createOperatingStateStore({
    dbPath,
    now: typeof now === "function" ? now : defaultNow
  });

  try {
    store.setReleaseState({
      currentStage: "kickoff_interview",
      releaseGateState: "open",
      currentFocus,
      releaseGoal,
      sourceRef: ".agents/artifacts/CURRENT_STATE.md",
      updatedBy: "harness:init",
      metadata: {
        projectName: normalizedProjectName,
        projectSlug: normalizedProjectSlug,
        initializedDate,
        activeProfiles: normalizedProfiles
      }
    });

    store.recordDecision({
      decisionId: "DEC-INIT-01",
      title: `Approve initial project goals and active profile scope for ${normalizedProjectName}`,
      decisionNeeded: true,
      impactSummary: "Defines the first executable planning lane and baseline artifact scope.",
      sourceRef: ".agents/artifacts/REQUIREMENTS.md",
      status: "open",
      metadata: {
        initializedDate
      }
    });

    store.recordGateRisk({
      riskId: "RISK-INIT-01",
      title: `${normalizedProjectName} requirements baseline is not approved yet`,
      severity: "medium",
      status: "open",
      unblockCondition: "Fill PROJECT_STARTER_DOC_PACK and close PLN-00/PLN-01 with explicit user confirmation.",
      sourceRef: ".agents/artifacts/REQUIREMENTS.md",
      metadata: {
        initializedDate
      }
    });

    for (const row of PROGRESS_ROWS) {
      store.upsertWorkItem({
        workItemId: row.id,
        title: row.task,
        status: row.status,
        nextAction: row.id === "PLN-00" ? currentFocus : defaultNextAction(row.id, normalizedProjectName),
        sourceRef: row.source,
        domainHint: row.domain ?? DOMAIN_BY_PHASE[row.phase] ?? "운영 품질",
        metadata: {
          phase: row.phase,
          notes: row.notes
        }
      });
    }

    store.appendHandoff({
      handoffId: `handoff-init-${initializedDate}`,
      createdAt: initializedAt,
      handoffSummary: bootstrapSummary,
      fromRole: "bootstrap",
      toRole: "planner",
      sourceRef: ".agents/artifacts/CURRENT_STATE.md",
      payload: {
        projectName: normalizedProjectName,
        projectSlug: normalizedProjectSlug,
        activeProfiles: normalizedProfiles
      }
    });

    for (const artifact of starterArtifactSeed()) {
      store.upsertArtifact(artifact);
    }

    writeGeneratedStateDocs({ store, outputDir: resolvedRoot });
    writeActiveContext({ store, repoRoot: resolvedRoot, outputDir: resolvedRoot });
  } finally {
    store.close();
  }

  return {
    ok: true,
    projectName: normalizedProjectName,
    projectSlug: normalizedProjectSlug,
    repoRoot: resolvedRoot,
    dbPath,
    activeProfiles: normalizedProfiles,
    initializedDate,
    nextAction: currentFocus
  };
}

export function runNonInteractiveInitCommand({ args = [], repoRoot = process.cwd() } = {}) {
  const parsed = parseInitArgs(args);
  if (!parsed.options.nonInteractive) {
    return {
      ok: true,
      mode: "interactive",
      reason: "interactive_prompt_allowed",
      missingFields: []
    };
  }

  const required = ["projectName", "userGoal", "opsGoal", "approvalGoal"];
  const labels = {
    projectName: "--project-name",
    userGoal: "--user-goal",
    opsGoal: "--ops-goal",
    approvalGoal: "--approval-goal"
  };
  const missingFields = required
    .filter((field) => !hasText(parsed.options[field]))
    .map((field) => labels[field]);

  if (missingFields.length > 0) {
    const projectName = parsed.options.projectName || defaultProjectName(repoRoot);
    const projectSlug = parsed.options.projectSlug || slugifyProjectName(projectName);
    return {
      ok: false,
      mode: "non-interactive",
      reason: "missing_required_non_interactive_fields",
      missingFields,
      commandExample:
        `npm run harness:init -- --non-interactive --project-name "${projectName}" --project-slug "${projectSlug}" ` +
        `--user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles PRF-10`,
      nextAction: "Provide all required non-interactive init fields, or run harness:init interactively."
    };
  }

  return {
    ok: true,
    mode: "non-interactive",
    reason: "ready",
    missingFields: [],
    options: parsed.options
  };
}

function parseInitArgs(args = []) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const raw = token.slice(2);
    const [rawKey, inlineValue] = raw.split(/=(.*)/s).filter((part) => part !== undefined);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      options[key] = args[++index];
    } else {
      options[key] = true;
    }
  }
  return { options };
}

export function normalizeActiveProfiles(activeProfiles) {
  const values = Array.isArray(activeProfiles)
    ? activeProfiles
    : String(activeProfiles ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const normalized = [...new Set(values.map(normalizeProfileToken).filter((item) => item !== "NONE"))];
  for (const profile of normalized) {
    if (!KNOWN_PROFILES[profile]) {
      throw new Error(`Unknown optional profile: ${profile}. Use short profile IDs such as PRF-10 or PRF-10,PRF-9.`);
    }
  }
  return normalized.sort();
}

function normalizeProfileToken(value) {
  const token = String(value ?? "").trim().toUpperCase();
  if (!token) {
    return "";
  }
  if (token === "NONE") {
    return "NONE";
  }
  if (/^PRF-\d$/.test(token)) {
    return token.replace(/^PRF-(\d)$/, "PRF-0$1");
  }
  if (/^PRF-\d{2}$/.test(token)) {
    return token;
  }
  throw new Error(`Unknown optional profile: ${token}. Use short profile IDs such as PRF-10 or PRF-10,PRF-9.`);
}

export function slugifyProjectName(projectName) {
  return sanitizePackageName(projectName);
}

export function looksLikeStarterPlaceholder(repoRoot) {
  const currentStatePath = path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md");
  const taskListPath = path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md");
  if (!fs.existsSync(currentStatePath) || !fs.existsSync(taskListPath)) {
    return false;
  }
  const currentState = readFile(currentStatePath);
  const taskList = readFile(taskListPath);
  return (
    currentState.includes("Current Stage: not started") &&
    taskList.includes("Run `INIT_STANDARD_HARNESS.cmd` or `npm run harness:init` before real work begins.")
  );
}

export function inspectStarterInitializationState(repoRoot) {
  const resolvedRoot = path.resolve(repoRoot);
  if (looksLikeStarterPlaceholder(resolvedRoot)) {
    return {
      status: "fresh",
      message: "This folder still looks like an uninitialized standard harness starter."
    };
  }

  const dbExists = fs.existsSync(path.join(resolvedRoot, ".harness", "operating_state.sqlite"));
  const activeContextExists = fs.existsSync(path.join(resolvedRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"));
  if (dbExists || activeContextExists) {
    return {
      status: "initialized",
      dbExists,
      activeContextExists,
      message: "This folder already appears to have completed standard harness initialization."
    };
  }

  return {
    status: "edited",
    dbExists,
    activeContextExists,
    message:
      "This folder no longer looks like a fresh standard harness starter, but no initialized harness state was detected."
  };
}

function ensureStarterLayout(repoRoot) {
  for (const relativePath of REQUIRED_STARTER_FILES) {
    if (!fs.existsSync(path.join(repoRoot, relativePath))) {
      throw new Error(`Missing required starter path: ${relativePath}`);
    }
  }
}

function ensureStarterSafe(repoRoot, { force }) {
  if (force) {
    return;
  }

  const starterState = inspectStarterInitializationState(repoRoot);
  if (starterState.status !== "fresh") {
    throw new Error(
      starterState.status === "initialized"
        ? "The standard harness already appears to be initialized. Re-run with --force only if you intentionally want to reset and reinitialize it."
        : "The target repo does not look like a fresh standard harness starter. Re-run with --force only if you intentionally want to reinitialize it."
    );
  }
}

function buildProjectReadme({ projectName, projectSlug, initializedDate, activeProfiles }) {
  const activeProfileLine = activeProfiles.length
    ? activeProfiles.map((profile) => `${profile} (${KNOWN_PROFILES[profile].label})`).join(", ")
    : "none";
  return [
    `# ${projectName}`,
    "",
    `이 저장소는 ${initializedDate}에 표준 하네스 스타터로 초기화되었다.`,
    "",
    "## 가장 먼저",
    "- `START_HERE.md`",
    "- `reference/manuals/human/index.md`",
    "- `reference/manuals/human/commands.md`",
    "- `reference/manuals/human/HARNESS_MANUAL.md`",
    "- `INIT_STANDARD_HARNESS.cmd`",
    "- `npm run harness:init`",
    "",
    "## Harness Bootstrap",
    `- Project slug: \`${projectSlug}\``,
    `- Active optional profiles: ${activeProfileLine}`,
    "- Next step: fill PROJECT_STARTER_DOC_PACK, close PLN-00 and PLN-01, then sync architecture before opening implementation.",
    "",
    "## What This Harness Protects",
    "- Context Window 한계 대응: Active Context and compact route-selected state keep long work resumable without loading the whole repository.",
    "- 재진입 안정성: generated runtime state and handoff projections let a new LLM session recover the current packet, evidence, and next owner.",
    "- 승인 경계 보존: validation, packet-preflight, reviewer, and closeout surfaces preserve human approval boundaries instead of treating AI output as authority.",
    "- 범위 오염 방지: packet scope, evidence manifests, and starter payload checks keep product changes, operating state, and reusable harness payload separate.",
    "- Lean by default, strict where risk demands.",
    "- Human plans, harnessed AI executes.",
    "- Context economy is a product feature.",
    "- Friction is observed, recorded, and improved.",
    "- Compound Engineering and reusable learning are captured through packet evidence and learning commands.",
    "- The starter payload is the reusable operating payload; generated runtime state is post-init project state, not source authority.",
    "",
    "## Entry Authority",
    "- README는 저장소 개요이고 START_HERE.md는 사람용 시작 정본이다.",
    "- 운영 기준과 smoke 해석의 primary authority는 `reference/manuals/human/HARNESS_MANUAL.md`다.",
    "- `START_HERE.md`는 사람용 시작 정본이고, 세부 운영 기준은 `reference/manuals/human/HARNESS_MANUAL.md`를 따른다.",
    "- Human manual index: `reference/manuals/human/index.md`; command chapter: `reference/manuals/human/commands.md`.",
    "- Command taxonomy: `reference/commands/COMMAND_TAXONOMY.md`; compatibility policy: `reference/commands/COMPATIBILITY_COMMAND_POLICY.md`.",
    "- Starter seed / generated runtime state semantics: `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md`.",
    "- In pre-init clean payload state, `starter_bootstrap_pending` is an expected hold; post-init project state starts after `npm run harness:init` creates runtime output.",
    "",
    "## First Commands",
    "- `npm test`",
    "- `npm run harness:validate`",
    "- `npm run harness:doctor`",
    "- `npm run harness:status`",
    "- `npm run harness:next`",
    "- `npm run harness:context`",
    "- `npm run harness:validation-report`",
    "- `npm run harness:promote-starter` - see `reference/manuals/human/starter-promotion.md` before exporting a future clean starter candidate.",
    "",
    "## Truth Contract",
    "- `.agents/artifacts/*` is governance Markdown truth.",
    "- `.harness/operating_state.sqlite` is hot operational DB state.",
    "- `.agents/runtime/generated-state-docs/*` is derived output.",
    "- `.agents/runtime/ACTIVE_CONTEXT.json` is compact AI-facing state.",
    "- `.agents/runtime/ACTIVE_CONTEXT.md` is Korean human-facing state.",
    "- `reference/*` is optional reference material.",
    "",
    "## Product Code",
    "- Harness runtime is isolated under `.harness/runtime/`.",
    "- Harness tests are isolated under `.harness/test/`.",
    "- Product code may use `src/`, `app/`, `backend/`, `frontend/`, `server/`, or another project-selected path.",
    "",
    "## README Traceability",
    "| README 핵심 주장 | 구현 파일 | 테스트 | 운영 명령 |",
    "| --- | --- | --- | --- |",
    "| Context Window 한계 대응 | `.agents/runtime/ACTIVE_CONTEXT.json`, `.agents/runtime/ACTIVE_CONTEXT.md` | `.harness/test/active-context.test.js` | `npm run harness:context` |",
    "| 재진입 안정성 | `.agents/artifacts/CURRENT_STATE.md`, `.agents/runtime/generated-state-docs/` | `.harness/test/init-project.test.js` | `npm run harness:sync-state` |",
    "| 승인 경계 보존 | `reference/packets/`, `.harness/runtime/state/risk-adaptive-gates.js` | `.harness/test/v2-5-risk-adaptive-gates.test.js` | `npm run harness:packet-preflight` |",
    "| Friction is observed, recorded, and improved | `.harness/runtime/state/v2-p2-conductor.js` | `.harness/test/v2-p2-conductor.test.js` | `npm run harness:friction-report` |",
    "| Compound Engineering and reusable learning | `.harness/runtime/state/compound-learning.js` | `.harness/test/v2-evidence-gates.test.js` | `npm run harness:learn` |",
    "| Starter payload는 clean reusable operating payload다 | `.harness/runtime/state/payload-boundary.js`, `reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md` | `.harness/test/payload-boundary.test.js` | `npm run harness:payload-boundary` |",
    "| Codex 지향 표면 | `.codex-plugin/plugin.json`, `.agents/skills/` | `.harness/test/agent-routing.test.js` | `npm run harness:codex-ready` |",
    "| Packet and evidence gates protect scope | `reference/packets/`, `reference/evidence/` | `.harness/test/v2-7-evidence-manifest.test.js` | `npm run harness:packet-preflight` |"
  ].join("\n");
}

function buildCurrentStateDoc({ projectName, currentFocus, releaseGoal, initializedDate, bootstrapSummary }) {
  return [
    "# Current State",
    "",
    "## Snapshot",
    "- Current Stage: kickoff_interview",
    `- Current Focus: ${currentFocus}`,
    `- Current Release Goal: ${releaseGoal}`,
    "",
    "## Next Recommended Agent",
    "- Planner",
    "",
    "## Must Read Next",
    "- `START_HERE.md`",
    "- `reference/artifacts/PROJECT_STARTER_DOC_PACK.md`",
    "- `.agents/artifacts/REQUIREMENTS.md`",
    "- `reference/planning/PLN-00_DEEP_INTERVIEW.md`",
    "- `reference/planning/PLN-01_REQUIREMENTS_FREEZE.md`",
    "",
    "## Open Decisions / Blockers",
    "- No active blocker is currently recorded.",
    `- ${projectName} was bootstrapped from the current standard harness starter on ${initializedDate}.`,
    "- Use `PROJECT_STARTER_DOC_PACK.md` to replace kickoff placeholders before claiming the baseline is concrete.",
    "- Close PLN-00 and PLN-01 before claiming a project-specific implementation lane is active.",
    "- Do not sync architecture / implementation / UI or open the first task packet before PLN-01 is approved.",
    "",
    "## Latest Handoff Summary",
    `- ${initializedDate}: ${bootstrapSummary}`
  ].join("\n");
}

function buildTaskListDoc({ projectName, currentFocus, bootstrapSummary, initializedDate }) {
  return [
    "# Task List",
    "",
    "## Current Release Target",
    `- Close the starter doc pack, kickoff baseline, and requirements freeze so ${projectName} can open its first approved project packet safely.`,
    "",
    "## Active Locks",
    "| Task ID | Scope | Owner | Status | Started At | Notes |",
    "|---|---|---|---|---|---|",
    `| PLN-00 | requirements discovery | planner | active | ${initializedDate} | kickoff interview lane and starter-doc-pack closure |`,
    "",
    "## Active Tasks",
    "| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |",
    "|---|---|---|---|---|---|---|---|",
    "| PLN-00 | Kickoff interview | requirements discovery | planner | in_progress | P0 | `reference/planning/PLN-00_DEEP_INTERVIEW.md` | starter doc pack + requirements draft |",
    "| PLN-01 | Requirements freeze | baseline approval | planner | todo | P0 | `.agents/artifacts/REQUIREMENTS.md` | freeze/defer/open-question decision |",
    "- Use `START_HERE.md` as the kickoff checklist if a planner or PM is opening this repo first.",
    "- Use `reference/artifacts/PROJECT_STARTER_DOC_PACK.md` as the rough-baseline gap checklist before deep interview answers are promoted.",
    `- ${currentFocus}`,
    "- Sync architecture / implementation / UI baseline only after requirements freeze approval.",
    "- Activate optional profiles only when the project actually needs them.",
    "- Do not open project packets before the requirements freeze is approved and the baseline artifacts are aligned.",
    "- Keep `.agents/artifacts/PROJECT_PROGRESS.md` aligned with actual execution state.",
    "",
    "## Blocked Tasks",
    "| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |",
    "|---|---|---|---|---|---|",
    "| - | None | - | clear | - | - |",
    "",
    "## Completed Tasks",
    "| Task ID | Title | Completed At | Verification | Notes |",
    "|---|---|---|---|---|",
    "| BOOT-00 | Starter initialization | " + initializedDate + " | " + bootstrapSummary + " | active-context state seeded |",
    "",
    "## Handoff Log",
    `- ${initializedDate}: ${bootstrapSummary}`
  ].join("\n");
}

function buildActiveProfilesDoc({ activeProfiles, initializedDate, activatedBy }) {
  const rows = activeProfiles.length
    ? activeProfiles.map(
        (profile) =>
          `| ${profile} | selected during starter initialization | project profile evidence artifact required before Ready For Code | pending | ${activatedBy} | ${initializedDate} | future packets citing ${profile} |`
      )
    : ["| - | None currently active | - | not-needed | - | - | - |"];

  return [
    "# Active Profiles",
    "",
    "## Purpose",
    "This artifact declares optional profiles that are active for the current project or packet set. Profiles are explicit-only; a profile file existing under `reference/profiles/` does not activate it.",
    "",
    "## Active Profile Table",
    "| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |",
    "|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Activation Rule",
    "- Declare a profile here before packets cite it as active.",
    "- A packet that declares active profile dependencies must cite the matching profile reference and provide the required evidence.",
    "- Evidence status may be `pending`, `approved`, `deferred-with-reason`, or `not-needed`.",
    "- `Ready For Code` is blocked when a related active profile has missing or pending required evidence."
  ].join("\n");
}

function buildProjectProgressDoc({ projectName }) {
  return [
    "# Project Progress",
    "",
    "## Summary",
    `Track the whole project kickoff-to-release board for ${projectName} here. Human-facing summaries stay readable here, while AI-facing state is generated into ACTIVE_CONTEXT artifacts.`,
    "",
    "## Progress Board",
    "| Phase | Task ID | Task | Status | Notes | Source |",
    "| --- | --- | --- | --- | --- | --- |",
    ...PROGRESS_ROWS.map(
      (row) => `| ${row.phase} | ${row.id} | ${row.task} | ${row.status} | ${row.notes} | ${row.source} |`
    )
  ].join("\n");
}

function updateRequirementsText(text, { projectName, userGoal, opsGoal, approvalGoal, activeProfiles }) {
  let next = replaceSection(
    text,
    "## Summary",
    `이 문서는 ${projectName}가 현재 표준 하네스 baseline 위에서 시작할 때 사용하는 사용자 친화적 기준 문서다. 이 문서는 프로젝트별 요구, 승인 경계, active profile, 핵심 acceptance를 닫는 기준 문서로 유지한다.`
  );
  next = replaceSection(next, "### 사용자 목표", `- ${userGoal}`);
  next = replaceSection(next, "### 운영 목표", `- ${opsGoal}`);
  next = replaceSection(next, "### 승인 목표", `- ${approvalGoal}`);
  next = replaceSection(next, "## Active Profile Selection", renderActiveProfiles(activeProfiles));
  next = replaceSection(
    next,
    "## Open Questions",
    `- Replace starter placeholders using PROJECT_STARTER_DOC_PACK and close implementation-critical discovery questions for ${projectName} in PLN-00 before PLN-01 approval.`
  );
  next = replaceSection(next, "## Deferred Items", "- none yet");
  return next;
}

function updateArchitectureText(text) {
  ensureSectionPresent(text, "## Authoring Flow");
  return text;
}

function updateImplementationPlanText(text, { projectName, currentFocus, activeProfiles }) {
  let next = replaceSection(
    text,
    "## Optional Profile Activation",
    [
      `- Selected profiles at bootstrap: ${renderActiveProfilesInline(activeProfiles)}.`,
      "- `PRF-01`: 내부 운영자/관리자가 dense record grid를 search/filter/sort하며 row action, detail view, bulk operation을 반복 수행하는 제품일 때만 활성화한다.",
      "- `PRF-02`: spreadsheet가 planning, field mapping, backlog, operational source-of-truth의 authoritative input surface일 때만 활성화한다.",
      "- `PRF-03`: transfer boundary가 airgapped이거나 manual-transfer / removable-media / offline bundle handoff가 반복되는 delivery work일 때만 활성화한다.",
      "- `PRF-04`: Excel/VBA/MariaDB와 수작업 운영 절차가 기존 production logic인 legacy replacement일 때만 활성화한다.",
      "- `PRF-05`: Python/Django backoffice 제품을 구현하며 source root, version, migration, DB, service/admin/test convention이 필요한 경우 활성화한다.",
      "- `PRF-06`: 상태전이, 승인, 권한, 감사, 예외/reopen/rollback 규칙이 핵심인 workflow application일 때 활성화한다.",
      "- `PRF-07`: 작은 웹앱, 단순 내부 도구, 경량 앱처럼 강한 업무시스템 gate가 과한 경우 활성화한다.",
      "- `PRF-08`: Android native 앱, Gradle/AGP, signing, permissions, device test, release channel이 필요한 경우 활성화한다.",
      "- `PRF-09`: Node 또는 frontend web app에서 package ownership, build/test, env, API, deploy boundary가 필요한 경우 활성화한다.",
      "- `PRF-10`: BI/analytics platform에서 source inventory, semantic model, metric catalog, refresh/lineage, dashboard governance evidence가 필요한 경우 활성화한다."
    ].join("\n")
  );
  next = replaceSection(next, "## Current Iteration", `- ${currentFocus}`);
  next = replaceSection(
    next,
    "## Operator Next Action",
    [
      `- Start PLN-00 deep interview for ${projectName}.`,
      "- Fill `reference/artifacts/PROJECT_STARTER_DOC_PACK.md` before treating the kickoff baseline as concrete.",
      "- Approve PLN-01 requirements freeze before syncing `.agents/artifacts/ARCHITECTURE_GUIDE.md`, `.agents/artifacts/IMPLEMENTATION_PLAN.md`, and `reference/artifacts/UI_DESIGN.md`.",
      "- Open the first project packet only after requirements freeze, architecture baseline, and profile selection are aligned."
    ].join("\n")
  );
  return next;
}

function starterArtifactSeed() {
  return [
    {
      artifactId: "requirements",
      path: ".agents/artifacts/REQUIREMENTS.md",
      category: "canonical_doc",
      title: "Requirements",
      sourceRef: ".agents/artifacts/REQUIREMENTS.md"
    },
    {
      artifactId: "architecture",
      path: ".agents/artifacts/ARCHITECTURE_GUIDE.md",
      category: "canonical_doc",
      title: "Architecture Guide",
      sourceRef: ".agents/artifacts/ARCHITECTURE_GUIDE.md"
    },
    {
      artifactId: "implementation-plan",
      path: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
      category: "canonical_doc",
      title: "Implementation Plan",
      sourceRef: ".agents/artifacts/IMPLEMENTATION_PLAN.md"
    },
    {
      artifactId: "project-progress",
      path: ".agents/artifacts/PROJECT_PROGRESS.md",
      category: "canonical_doc",
      title: "Project Progress",
      sourceRef: ".agents/artifacts/PROJECT_PROGRESS.md"
    },
    {
      artifactId: "current-state",
      path: ".agents/artifacts/CURRENT_STATE.md",
      category: "canonical_doc",
      title: "Current State",
      sourceRef: ".agents/artifacts/CURRENT_STATE.md"
    },
    {
      artifactId: "task-list",
      path: ".agents/artifacts/TASK_LIST.md",
      category: "canonical_doc",
      title: "Task List",
      sourceRef: ".agents/artifacts/TASK_LIST.md"
    },
    {
      artifactId: "preventive-memory",
      path: ".agents/artifacts/PREVENTIVE_MEMORY.md",
      category: "canonical_doc",
      title: "Preventive Memory",
      sourceRef: ".agents/artifacts/PREVENTIVE_MEMORY.md"
    },
    {
      artifactId: "ui-design",
      path: "reference/artifacts/UI_DESIGN.md",
      category: "reference_doc",
      title: "UI Design",
      sourceRef: "reference/artifacts/UI_DESIGN.md"
    },
    {
      artifactId: "packet-template",
      path: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
      category: "reference_doc",
      title: "Work Item Packet Template",
      sourceRef: "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"
    }
  ];
}

function defaultNextAction(workItemId, projectName) {
  switch (workItemId) {
    case "PLN-01":
      return `Freeze the ${projectName} requirements baseline after PROJECT_STARTER_DOC_PACK and PLN-00 are concrete.`;
    case "PLN-02":
      return "Sync architecture, implementation, and UI after requirements approval.";
    case "DSG-01":
      return "Lock the rough direction and global behavior contract.";
    case "PKT-01":
      return "Open the first project packet only after PLN-01 is approved and the baseline sync is complete.";
    case "DEV-03":
      return "Run validator and generated-doc checks after the first implementation packet changes live truth.";
    case "DEV-04":
      return "Verify active context and operator-facing re-entry surfaces against the approved baseline.";
    case "DEV-05":
      return "Close environment topology, rollback, and release-readiness checks.";
    default:
      return "Wait for the upstream planning gate to close.";
  }
}

function defaultProjectName(cwd) {
  return String(cwd ?? process.cwd()).split(/[\\/]/).filter(Boolean).at(-1) ?? "new-project";
}

function renderActiveProfiles(activeProfiles) {
  if (activeProfiles.length === 0) {
    return "- none";
  }
  return activeProfiles.map((profile) => `- ${KNOWN_PROFILES[profile].label}`).join("\n");
}

function renderActiveProfilesInline(activeProfiles) {
  if (activeProfiles.length === 0) {
    return "none";
  }
  return activeProfiles.map((profile) => KNOWN_PROFILES[profile].label).join(", ");
}

function updatePackageJson(repoRoot, packageName) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(readFile(packageJsonPath));
  packageJson.name = packageName;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function updateFile(repoRoot, relativePath, updater) {
  const filePath = path.join(repoRoot, relativePath);
  fs.writeFileSync(filePath, updater(readFile(filePath)), "utf8");
}

function writeFile(repoRoot, relativePath, content) {
  const filePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content}\n`, "utf8");
}

function replaceSection(text, heading, body) {
  const escapedHeading = escapeRegExp(heading);
  const pattern = new RegExp(`(${escapedHeading}\\r?\\n)([\\s\\S]*?)(?=\\r?\\n## |\\r?\\n### |$)`);
  if (!pattern.test(text)) {
    throw new Error(`Could not find section: ${heading}`);
  }
  return text.replace(pattern, `$1${body.trim()}\n`);
}

function ensureSectionPresent(text, heading) {
  if (!text.includes(heading)) {
    throw new Error(`Could not find section: ${heading}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resetOperatingStateArtifacts(dbPath) {
  ensureRepoLocalHarnessPath(dbPath);
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

function ensureRepoLocalHarnessPath(targetPath) {
  const normalized = path.resolve(targetPath);
  if (!normalized.includes(`${path.sep}.harness${path.sep}`) && !normalized.endsWith(`${path.sep}.harness`)) {
    throw new Error(`Refusing to touch a non-harness path: ${normalized}`);
  }
}

function sanitizePackageName(value) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new Error("Could not derive a valid package name.");
  }
  return normalized;
}

function requireNonEmpty(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function defaultNow() {
  return new Date().toISOString();
}
