import fs from "node:fs";
import path from "node:path";

const PACKET_TEMPLATE_FIXTURE = `# Work Item Packet Template

| Layer classification | core / optional profile / project packet | rationale | draft |
| Gate profile | light / standard / contract / release | verification strength | draft |
| Risk class | low / normal / high / critical | declared risk | draft |
| Route class | fast-path / packet-path / strict-path | route metadata only | draft |
| Active profile dependencies | none / [profile ids] | rationale | draft |
| Profile evidence status | not-needed / pending / approved | rationale | draft |
| Shared-source wave status | not-needed / pending / approved | rationale | draft |

- Active profile references:
- Profile composition rationale:
- Active profile dependencies:
- Profile-specific evidence status:
- Lane-type declaration:
- Lane-type universal minimum sections:
- Lane-type required sections:
- Lane-type conditional sections:
- Lane-type not-needed sections:
- UX archetype reference:
- Environment topology reference:
- Domain foundation reference:
- Authoritative source intake reference:
- Impacted packet set scope:
- Authoritative source wave ledger reference:
- Source wave packet disposition:
- Packet exit quality gate reference:
- Improvement candidate reference:
- Gate profile:
- Risk class:
- Route class:
- Risk classification rationale:
- Critical human confirmation:
- Critical confirmation owner:
- Critical confirmation status:
- Critical confirmation evidence path:
- Verification manifest:
- Primary admin entity / surface:
- Grid interaction model:
- Search / filter / sort / pagination behavior:
- Row action / bulk action rule:
- Edit / save / confirm / audit pattern:
- Source spreadsheet artifact:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- Row key / record identity rule:
- Source snapshot / version:
- Transformation / normalization assumptions:
- Reconciliation / overwrite rule:
- Transfer package / bundle artifact:
- Transfer medium / handoff channel:
- Checksum / integrity evidence:
- Offline dependency bundle status:
- Ingress verification / import step:
- Rollback package / recovery bundle:
- Manual custody / operator handoff:
- Product source root:
- Legacy system source inventory:
- VBA module / macro / function inventory:
- MariaDB schema snapshot:
- Current import / export / report paths:
- Source-of-truth ownership:
- Migration / reconciliation plan:
- Parallel-run / reconciliation evidence:
- Python / Django version policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Django app / module boundary:
- Settings / environment policy:
- Migration policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Test convention:
- Static / media / admin customization boundary:
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Runtime / framework:
- Rendering / app mode:
- Data persistence boundary:
- Auth / user identity requirement:
- Deployment target:
- External API / integration boundary:
- Lightweight acceptance:
- Android package namespace:
- Kotlin / Java policy:
- Gradle / AGP version:
- minSdk / targetSdk:
- Signing policy:
- Build variants / flavors:
- Permissions policy:
- Local storage policy:
- Network security / API boundary:
- Navigation structure:
- Offline / sync policy:
- Notification policy:
- Privacy / data policy:
- Device / emulator test plan:
- Release channel:
- Package ownership policy:
- Node.js product runtime policy:
- Package manager:
- Framework / bundler:
- Build command:
- Test command:
- Environment variable policy:
- API / backend boundary:
- Static asset / routing policy:
- BI data source inventory reference:
- BI metric catalog reference:
- BI semantic model reference:
- BI refresh and lineage plan reference:
- BI dashboard governance reference:
- Primary analytical subject area:
- Source-to-model mapping summary:
- Metric ownership and certification summary:
- Freshness / latency expectation:
- Access / role / row-filter rule:
- Reconciliation / backfill / rollback rule:

| Layer classification agreement | yes / no | owner | pending | notes |
| Optional profile evidence approval | yes / no | owner | pending | notes |
`;

const PROFILE_FIXTURES = {
  "AUTHORITATIVE_SOURCE_WAVE_LEDGER.md": `# Authoritative Source Wave Ledger

## Approval Rule
- One authoritative source change that affects more than one open packet must be tracked as a shared-source wave.

## 4. Impacted Packet Set
| Packet path | Prior source snapshot | Required action | Rebaseline status | Notes |
|---|---|---|---|---|
| reference/packets/PKT-01_ACTIVE_PACKET.md | 2026-04-23-v1 | adjust | pending | example row |

## 8. Packet Citation Rule
- Impacted packets cite this ledger as Authoritative source wave ledger reference.
`,
  "PRF-01_ADMIN_GRID_APPLICATION_PROFILE.md": `# Admin Grid Application Profile

## Approval Rule
- Active profile references:
- Primary admin entity / surface:
- Grid interaction model:
- Search / filter / sort / pagination behavior:
- Row action / bulk action rule:
- Edit / save pattern:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Primary admin entity / surface:
- Grid interaction model:
- Search / filter / sort / pagination behavior:
- Row action / bulk action rule:
- Edit / save pattern:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md": `# Authoritative Spreadsheet Source Profile

## Approval Rule
- Active profile references:
- Source spreadsheet artifact:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- Row key / record identity rule:
- Source snapshot / version:
- Transformation / normalization assumptions:
- Reconciliation / overwrite rule:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Source spreadsheet artifact:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- Row key / record identity rule:
- Source snapshot / version:
- Transformation / normalization assumptions:
- Reconciliation / overwrite rule:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-03_AIRGAPPED_DELIVERY_PROFILE.md": `# Airgapped Delivery Profile

## Approval Rule
- Active profile references:
- Transfer package / bundle artifact:
- Transfer medium / handoff channel:
- Checksum / integrity evidence:
- Offline dependency bundle status:
- Ingress verification / import step:
- Rollback package / recovery bundle:
- Manual custody / operator handoff:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Transfer package / bundle artifact:
- Transfer medium / handoff channel:
- Checksum / integrity evidence:
- Offline dependency bundle status:
- Ingress verification / import step:
- Rollback package / recovery bundle:
- Manual custody / operator handoff:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-04_LEGACY_EXCEL_VBA_MARIADB_REPLACEMENT_PROFILE.md": `# Legacy Excel/VBA-MariaDB Replacement Profile

## Approval Rule
- Active profile references:
- Product source root:
- Legacy system source inventory:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- VBA module / macro / function inventory:
- MariaDB schema snapshot:
- Current import / export / report paths:
- Source-of-truth ownership:
- Migration / reconciliation plan:
- Parallel-run / reconciliation evidence:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Legacy system source inventory:
- Workbook / sheet / tab / range trace:
- Header / column mapping:
- VBA module / macro / function inventory:
- MariaDB schema snapshot:
- Current import / export / report paths:
- Source-of-truth ownership:
- Migration / reconciliation plan:
- Parallel-run / reconciliation evidence:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-05_PYTHON_DJANGO_BACKOFFICE_PROFILE.md": `# Python/Django Backoffice Profile

## Approval Rule
- Active profile references:
- Product source root:
- Python / Django version policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Django app / module boundary:
- Settings / environment policy:
- Migration policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Test convention:
- Static / media / admin customization boundary:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Python / Django version policy:
- Supported-version / security-support rationale:
- Dependency manager:
- Django app / module boundary:
- Settings / environment policy:
- Migration policy:
- DB compatibility policy:
- Transaction / service boundary:
- Auth / permission / admin boundary:
- Background job boundary:
- Test convention:
- Static / media / admin customization boundary:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-06_WORKFLOW_APPROVAL_APPLICATION_PROFILE.md": `# Workflow Approval Application Profile

## Approval Rule
- Active profile references:
- Product source root:
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- State machine artifact:
- Approval rule matrix:
- Role / permission matrix:
- Audit event spec:
- Exception / rollback / reopen rule:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md": `# Lightweight Web/App Profile

## Approval Rule
- Active profile references:
- Product source root:
- Runtime / framework:
- Rendering / app mode:
- Data persistence boundary:
- Auth / user identity requirement:
- Deployment target:
- External API / integration boundary:
- Lightweight acceptance:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Runtime / framework:
- Rendering / app mode:
- Data persistence boundary:
- Auth / user identity requirement:
- Deployment target:
- External API / integration boundary:
- Lightweight acceptance:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-08_ANDROID_NATIVE_APP_PROFILE.md": `# Android Native App Profile

## Approval Rule
- Active profile references:
- Product source root:
- Android package namespace:
- Kotlin / Java policy:
- Gradle / AGP version:
- minSdk / targetSdk:
- Signing policy:
- Build variants / flavors:
- Permissions policy:
- Local storage policy:
- Network security / API boundary:
- Navigation structure:
- Offline / sync policy:
- Notification policy:
- Privacy / data policy:
- Device / emulator test plan:
- Release channel:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Android package namespace:
- Kotlin / Java policy:
- Gradle / AGP version:
- minSdk / targetSdk:
- Signing policy:
- Build variants / flavors:
- Permissions policy:
- Local storage policy:
- Network security / API boundary:
- Navigation structure:
- Offline / sync policy:
- Notification policy:
- Privacy / data policy:
- Device / emulator test plan:
- Release channel:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md": `# Node/Frontend Web App Profile

## Approval Rule
- Active profile references:
- Product source root:
- Package ownership policy:
- Node.js product runtime policy:
- Package manager:
- Framework / bundler:
- Build command:
- Test command:
- Environment variable policy:
- API / backend boundary:
- Static asset / routing policy:
- Deployment target:
- Profile deviation / exception:

## 8. Required Packet Evidence
- Active profile references:
- Product source root:
- Package ownership policy:
- Node.js product runtime policy:
- Package manager:
- Framework / bundler:
- Build command:
- Test command:
- Environment variable policy:
- API / backend boundary:
- Static asset / routing policy:
- Deployment target:
- Profile deviation / exception:

## 10. Packet Citation Rule
- Active profile references:
`,
  "PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md": `# BI Analytics Platform Profile

## Approval Rule
- Active profile references:
- Product source root:
- BI data source inventory reference:
- BI metric catalog reference:
- BI semantic model reference:
- BI refresh and lineage plan reference:
- BI dashboard governance reference:
- Primary analytical subject area:
- Source-to-model mapping summary:
- Metric ownership and certification summary:
- Freshness / latency expectation:
- Access / role / row-filter rule:
- Reconciliation / backfill / rollback rule:
- Profile deviation / exception:

## 5. Required Packet Evidence
- Active profile references:
- Product source root:
- BI data source inventory reference:
- BI metric catalog reference:
- BI semantic model reference:
- BI refresh and lineage plan reference:
- BI dashboard governance reference:
- Primary analytical subject area:
- Source-to-model mapping summary:
- Metric ownership and certification summary:
- Freshness / latency expectation:
- Access / role / row-filter rule:
- Reconciliation / backfill / rollback rule:
- Profile deviation / exception:

## 8. Packet Citation Rule
- Active profile references:
`
};

const ACTIVE_PROFILES_FIXTURE = `# Active Profiles

## Active Profile Table
| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |
|---|---|---|---|---|---|---|
| - | None currently active | - | not-needed | - | - | - |
`;

const TASK_LIST_FIXTURE = `# Task List

## Active Locks
| Task ID | Scope | Owner | Status | Started At | Notes |
|---|---|---|---|---|---|
| - | None | - | clear | - | - |

## Active Tasks
| Task ID | Title | Scope | Owner | Status | Priority | Depends On | Verification |
|---|---|---|---|---|---|---|---|
| - | None | - | - | closed | - | - | - |

## Blocked Tasks
| Task ID | Blocker | Owner | Status | Unblock Condition | Verification |
|---|---|---|---|---|---|
| - | None | - | clear | - | - |

## Completed Tasks
| Task ID | Title | Completed At | Verification | Notes |
|---|---|---|---|---|
| - | None | - | - | - |

## Handoff Log
- none
`;

const DEFAULT_CONCRETE_TASK_PACKET = {
  header: {
    "Ready For Code": "approve",
    "Gate profile": "standard",
    "User-facing impact": "high",
    "Layer classification": "project packet",
    "Active profile dependencies": "PRF-01 + PRF-02",
    "Profile evidence status": "approved",
    "UX archetype status": "approved",
    "UX deviation status": "none",
    "Environment topology status": "approved",
    "Domain foundation status": "approved",
    "Authoritative source intake status": "approved",
    "Shared-source wave status": "not-needed",
    "Packet exit gate status": "approved",
    "Improvement promotion status": "none",
    "Existing system dependency": "confirmed",
    "New authoritative source impact": "analyzed",
    "Risk if started now": "low"
  },
  fields: {
    "Layer classification": "project packet",
    "Required reading before code": "requirements, architecture, implementation plan, active packet",
    "Gate profile": "standard",
    "Verification manifest": "approved packet, targeted tests, validator, handoff evidence",
    "Active profile references":
      "reference/profiles/PRF-01_ADMIN_GRID_APPLICATION_PROFILE.md, reference/profiles/PRF-02_AUTHORITATIVE_SPREADSHEET_SOURCE_PROFILE.md",
    "Profile composition rationale": "The work item combines admin-grid workflow and authoritative spreadsheet ingestion.",
    "Active profile dependencies": "PRF-01 + PRF-02",
    "Profile-specific evidence status": "approved",
    "Lane-type declaration": "",
    "Lane-type universal minimum sections": "",
    "Lane-type required sections": "",
    "Lane-type conditional sections": "",
    "Lane-type not-needed sections": "",
    "Primary admin entity / surface": "budget line item grid",
    "Grid interaction model": "dense grid with inline detail drawer",
    "Search / filter / sort / pagination behavior": "server-backed search, filter, sort, and pagination",
    "Row action / bulk action rule": "row review and bulk approve are both available",
    "Edit / save / confirm / audit pattern": "explicit save with audit trail confirmation",
    "Source spreadsheet artifact": "reference/artifacts/source.xlsx",
    "Workbook / sheet / tab / range trace": "WorkbookA / Sheet1 / TabA / A1:H40",
    "Header / column mapping": "source columns mapped to packet fields",
    "Row key / record identity rule": "row id uses workbook primary key",
    "Source snapshot / version": "2026-04-23-v1",
    "Transformation / normalization assumptions": "trim whitespace and normalize dates",
    "Reconciliation / overwrite rule": "source workbook wins after operator review",
    "Profile deviation / exception": "none",
    "UX archetype reference": "reference/artifacts/PRODUCT_UX_ARCHETYPE.md",
    "Selected UX archetype": "admin-operations-surface",
    "Archetype deviation / approval": "none",
    "Environment topology reference": "reference/artifacts/DEPLOYMENT_PLAN.md",
    "Source environment": "local workstation",
    "Target environment": "staging",
    "Execution target": "staging application host",
    "Transfer boundary": "internal handoff",
    "Rollback boundary": "restore previous packet bundle",
    "Domain foundation reference": "reference/artifacts/DOMAIN_CONTEXT.md",
    "Schema impact classification": "medium",
    "Authoritative source refs": "reference/artifacts/source.xlsx",
    "Authoritative source intake reference": "reference/artifacts/AUTHORITATIVE_SOURCE_INTAKE.md",
    "Impacted packet set scope": "single-packet",
    "Authoritative source wave ledger reference": "none",
    "Source wave packet disposition": "none",
    "Authoritative source disposition": "implemented",
    "Existing plan conflict": "none",
    "Current implementation impact": "aligned after packet sync",
    "Existing schema source artifact": "reference/artifacts/schema.sql",
    "Table / column naming compatibility": "aligned with the existing program",
    "Data operation / ownership compatibility": "existing ownership model preserved",
    "Migration / rollback / cutover compatibility": "compatible with current rollback plan",
    "Product source root": "src/",
    "Product test root": "test/",
    "Product runtime requirements": "declared in packet",
    "Harness/product boundary exceptions": "none",
    "Legacy system source inventory": "reference/artifacts/LEGACY_SYSTEM_INTAKE.md",
    "VBA module / macro / function inventory": "reference/artifacts/VBA_INVENTORY.md",
    "MariaDB schema snapshot": "reference/artifacts/LEGACY_SCHEMA_SNAPSHOT.md",
    "Current import / export / report paths": "documented in legacy intake",
    "Source-of-truth ownership": "legacy workbook until cutover",
    "Migration / reconciliation plan": "reference/artifacts/MIGRATION_RECONCILIATION_PLAN.md",
    "Parallel-run / reconciliation evidence": "reference/artifacts/PARALLEL_RUN_EVIDENCE.md",
    "Python / Django version policy": "Django LTS-compatible policy",
    "Supported-version / security-support rationale": "security-supported Django version selected",
    "Dependency manager": "uv or pip-tools",
    "Django project / module boundary": "config plus apps",
    "Django app / module boundary": "domain apps split by bounded context",
    "Settings / environment policy": "environment-specific settings via env vars",
    "Migration policy": "reviewed migrations only",
    "DB compatibility policy": "compatible with target DB",
    "Transaction / service boundary": "domain services own writes",
    "Auth / permission / admin boundary": "role-backed permissions",
    "Background job boundary": "explicit queue boundary",
    "Test convention": "unit plus integration tests",
    "Static / media / admin customization boundary": "declared per app",
    "State machine artifact": "reference/artifacts/WORKFLOW_STATE_MACHINE.md",
    "Approval rule matrix": "reference/artifacts/APPROVAL_RULE_MATRIX.md",
    "Role / permission matrix": "reference/artifacts/ROLE_PERMISSION_MATRIX.md",
    "Audit event spec": "reference/artifacts/AUDIT_EVENT_SPEC.md",
    "Exception / rollback / reopen rule": "reference/artifacts/EXCEPTION_REOPEN_ROLLBACK_RULES.md",
    "Runtime / framework": "Vite",
    "Rendering / app mode": "single-page app",
    "Data persistence boundary": "server API",
    "Auth / user identity requirement": "session auth",
    "Deployment target": "internal web host",
    "External API / integration boundary": "none",
    "Lightweight acceptance": "single happy path and error state verified",
    "Android package namespace": "com.example.app",
    "Kotlin / Java policy": "Kotlin-first",
    "Gradle / AGP version": "declared in version catalog",
    "minSdk / targetSdk": "project-approved SDK levels",
    "Signing policy": "debug locally, release via secured keystore",
    "Build variants / flavors": "debug and release",
    "Permissions policy": "least-permission manifest",
    "Local storage policy": "encrypted storage when sensitive",
    "Network security / API boundary": "HTTPS-only API boundary",
    "Navigation structure": "single-activity navigation",
    "Offline / sync policy": "online-only unless packet says otherwise",
    "Notification policy": "none by default",
    "Privacy / data policy": "no sensitive telemetry by default",
    "Device / emulator test plan": "emulator smoke and target device check",
    "Release channel": "internal track",
    "Package ownership policy": "root package keeps harness scripts and product scripts are namespaced",
    "Node.js product runtime policy": "product runtime declared separately from harness Node 24",
    "Package manager": "npm",
    "Framework / bundler": "Vite",
    "Build command": "npm run product:build",
    "Test command": "npm run product:test",
    "Environment variable policy": "documented env file with no secrets committed",
    "API / backend boundary": "HTTPS API boundary",
    "Static asset / routing policy": "SPA fallback routing",
    "BI data source inventory reference": "reference/artifacts/BI_DATA_SOURCE_INVENTORY.md",
    "BI metric catalog reference": "reference/artifacts/BI_METRIC_CATALOG.md",
    "BI semantic model reference": "reference/artifacts/BI_SEMANTIC_MODEL.md",
    "BI refresh and lineage plan reference": "reference/artifacts/BI_REFRESH_AND_LINEAGE_PLAN.md",
    "BI dashboard governance reference": "reference/artifacts/BI_DASHBOARD_GOVERNANCE.md",
    "Primary analytical subject area": "finance operations analytics",
    "Source-to-model mapping summary": "source CRM and ERP datasets map into certified subject-area marts",
    "Metric ownership and certification summary": "finance ops owns the metrics and certifies published definitions",
    "Freshness / latency expectation": "hourly refresh with stale-data disclosure after SLA breach",
    "Access / role / row-filter rule": "finance analysts get full access and regional managers are row-filtered",
    "Reconciliation / backfill / rollback rule": "daily reconciliation with controlled backfill and previous snapshot rollback",
    "Packet exit metadata version": "v1",
    "Packet exit metadata gate reference": "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
    "Packet exit metadata exit recommendation": "approve",
    "Packet exit metadata source parity result": "aligned",
    "Packet exit metadata validation / security / cleanup evidence": "validator clean and docs updated",
    "Packet exit quality gate reference": "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
    "Exit recommendation": "approve",
    "Source parity result": "aligned",
    "Validation / security / cleanup evidence": "validator clean and docs updated"
  }
};

export function seedProfileAwareValidatorFixtures(repoRoot) {
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "packets"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "profiles"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"),
    ACTIVE_PROFILES_FIXTURE,
    "utf8"
  );

  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    TASK_LIST_FIXTURE,
    "utf8"
  );

  fs.writeFileSync(
    path.join(repoRoot, "reference", "packets", "PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"),
    PACKET_TEMPLATE_FIXTURE,
    "utf8"
  );

  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "AUTHORITATIVE_SOURCE_WAVE_LEDGER.md"),
    PROFILE_FIXTURES["AUTHORITATIVE_SOURCE_WAVE_LEDGER.md"],
    "utf8"
  );

  for (const [fileName, content] of Object.entries(PROFILE_FIXTURES)) {
    if (fileName === "AUTHORITATIVE_SOURCE_WAVE_LEDGER.md") {
      continue;
    }
    fs.writeFileSync(path.join(repoRoot, "reference", "profiles", fileName), content, "utf8");
  }
}

export function writeConcreteTaskPacketFixture(
  repoRoot,
  { fileName = "PKT-01_ACTIVE_PACKET.md", header = {}, fields = {} } = {}
) {
  const resolvedHeader = { ...DEFAULT_CONCRETE_TASK_PACKET.header, ...header };
  const resolvedFields = { ...DEFAULT_CONCRETE_TASK_PACKET.fields, ...fields };
  const packetPath = path.join(repoRoot, "reference", "packets", fileName);

  fs.writeFileSync(packetPath, buildConcreteTaskPacketFixture(resolvedHeader, resolvedFields), "utf8");
  return `reference/packets/${fileName}`;
}

function buildConcreteTaskPacketFixture(header, fields) {
  const activeProfileDependencies =
    header["Active profile dependencies"] ?? header["Active profile dependency"] ?? "none";
  const activeProfileReferences =
    fields["Active profile references"] ?? fields["Active profile reference"] ?? "none";

  return `# Concrete Task Packet

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Ready For Code | ${header["Ready For Code"]} | concrete packet validation | approved |
| Gate profile | ${header["Gate profile"]} | verification strength for this packet | approved |
| User-facing impact | ${header["User-facing impact"]} | packet affects user-facing flow | approved |
| Layer classification | ${header["Layer classification"]} | packet boundary is explicit | approved |
| Active profile dependencies | ${activeProfileDependencies} | packet depends on reusable optional profiles | approved |
| Profile evidence status | ${header["Profile evidence status"]} | profile evidence state | approved |
| UX archetype status | ${header["UX archetype status"]} | UX contract state | approved |
| UX deviation status | ${header["UX deviation status"]} | deviation state | approved |
| Environment topology status | ${header["Environment topology status"]} | topology contract state | approved |
| Domain foundation status | ${header["Domain foundation status"]} | data-impact contract state | approved |
| Authoritative source intake status | ${header["Authoritative source intake status"]} | source-intake state | approved |
| Shared-source wave status | ${header["Shared-source wave status"]} | source-wave rebaseline state | approved |
| Packet exit gate status | ${header["Packet exit gate status"]} | closeout readiness | approved |
| Improvement promotion status | ${header["Improvement promotion status"]} | improvement state | approved |
| Existing system dependency | ${header["Existing system dependency"]} | integration dependency | approved |
| New authoritative source impact | ${header["New authoritative source impact"]} | source impact state | approved |
| Risk if started now | ${header["Risk if started now"]} | remaining ambiguity | approved |

## 8. UI/UX Detailed Design
- Active profile references: ${activeProfileReferences}
- Profile composition rationale: ${fields["Profile composition rationale"]}
- Profile-specific evidence status: ${fields["Profile-specific evidence status"]}
- Primary admin entity / surface: ${fields["Primary admin entity / surface"]}
- Grid interaction model: ${fields["Grid interaction model"]}
- Search / filter / sort / pagination behavior: ${fields["Search / filter / sort / pagination behavior"]}
- Row action / bulk action rule: ${fields["Row action / bulk action rule"]}
- Edit / save / confirm / audit pattern: ${fields["Edit / save / confirm / audit pattern"]}
- Source spreadsheet artifact: ${fields["Source spreadsheet artifact"]}
- Workbook / sheet / tab / range trace: ${fields["Workbook / sheet / tab / range trace"]}
- Header / column mapping: ${fields["Header / column mapping"]}
- Row key / record identity rule: ${fields["Row key / record identity rule"]}
- Source snapshot / version: ${fields["Source snapshot / version"]}
- Transformation / normalization assumptions: ${fields["Transformation / normalization assumptions"]}
- Reconciliation / overwrite rule: ${fields["Reconciliation / overwrite rule"]}
- Profile deviation / exception: ${fields["Profile deviation / exception"]}
- UX archetype reference: ${fields["UX archetype reference"]}
- Selected UX archetype: ${fields["Selected UX archetype"]}
- Archetype deviation / approval: ${fields["Archetype deviation / approval"]}

## 9. Data / Source Impact
- Layer classification: ${fields["Layer classification"]}
- Required reading before code: ${fields["Required reading before code"]}
- Active profile dependencies: ${fields["Active profile dependencies"]}
- Lane-type declaration: ${fields["Lane-type declaration"]}
- Lane-type universal minimum sections: ${fields["Lane-type universal minimum sections"]}
- Lane-type required sections: ${fields["Lane-type required sections"]}
- Lane-type conditional sections: ${fields["Lane-type conditional sections"]}
- Lane-type not-needed sections: ${fields["Lane-type not-needed sections"]}
- Environment topology reference: ${fields["Environment topology reference"]}
- Source environment: ${fields["Source environment"]}
- Target environment: ${fields["Target environment"]}
- Execution target: ${fields["Execution target"]}
- Transfer boundary: ${fields["Transfer boundary"]}
- Rollback boundary: ${fields["Rollback boundary"]}
- Domain foundation reference: ${fields["Domain foundation reference"]}
- Schema impact classification: ${fields["Schema impact classification"]}
- Authoritative source refs: ${fields["Authoritative source refs"]}
- Authoritative source intake reference: ${fields["Authoritative source intake reference"]}
- Impacted packet set scope: ${fields["Impacted packet set scope"]}
- Authoritative source wave ledger reference: ${fields["Authoritative source wave ledger reference"]}
- Source wave packet disposition: ${fields["Source wave packet disposition"]}
- Authoritative source disposition: ${fields["Authoritative source disposition"]}
- Existing plan conflict: ${fields["Existing plan conflict"]}
- Current implementation impact: ${fields["Current implementation impact"]}
- Existing schema source artifact: ${fields["Existing schema source artifact"]}
- Table / column naming compatibility: ${fields["Table / column naming compatibility"]}
- Data operation / ownership compatibility: ${fields["Data operation / ownership compatibility"]}
- Migration / rollback / cutover compatibility: ${fields["Migration / rollback / cutover compatibility"]}
- Product source root: ${fields["Product source root"]}
- Product test root: ${fields["Product test root"]}
- Product runtime requirements: ${fields["Product runtime requirements"]}
- Harness/product boundary exceptions: ${fields["Harness/product boundary exceptions"]}
- Legacy system source inventory: ${fields["Legacy system source inventory"]}
- VBA module / macro / function inventory: ${fields["VBA module / macro / function inventory"]}
- MariaDB schema snapshot: ${fields["MariaDB schema snapshot"]}
- Current import / export / report paths: ${fields["Current import / export / report paths"]}
- Source-of-truth ownership: ${fields["Source-of-truth ownership"]}
- Migration / reconciliation plan: ${fields["Migration / reconciliation plan"]}
- Parallel-run / reconciliation evidence: ${fields["Parallel-run / reconciliation evidence"]}
- Python / Django version policy: ${fields["Python / Django version policy"]}
- Supported-version / security-support rationale: ${fields["Supported-version / security-support rationale"]}
- Dependency manager: ${fields["Dependency manager"]}
- Django project / module boundary: ${fields["Django project / module boundary"]}
- Django app / module boundary: ${fields["Django app / module boundary"]}
- Settings / environment policy: ${fields["Settings / environment policy"]}
- Migration policy: ${fields["Migration policy"]}
- DB compatibility policy: ${fields["DB compatibility policy"]}
- Transaction / service boundary: ${fields["Transaction / service boundary"]}
- Auth / permission / admin boundary: ${fields["Auth / permission / admin boundary"]}
- Background job boundary: ${fields["Background job boundary"]}
- Test convention: ${fields["Test convention"]}
- Static / media / admin customization boundary: ${fields["Static / media / admin customization boundary"]}
- State machine artifact: ${fields["State machine artifact"]}
- Approval rule matrix: ${fields["Approval rule matrix"]}
- Role / permission matrix: ${fields["Role / permission matrix"]}
- Audit event spec: ${fields["Audit event spec"]}
- Exception / rollback / reopen rule: ${fields["Exception / rollback / reopen rule"]}
- Runtime / framework: ${fields["Runtime / framework"]}
- Rendering / app mode: ${fields["Rendering / app mode"]}
- Data persistence boundary: ${fields["Data persistence boundary"]}
- Auth / user identity requirement: ${fields["Auth / user identity requirement"]}
- Deployment target: ${fields["Deployment target"]}
- External API / integration boundary: ${fields["External API / integration boundary"]}
- Lightweight acceptance: ${fields["Lightweight acceptance"]}
- Android package namespace: ${fields["Android package namespace"]}
- Kotlin / Java policy: ${fields["Kotlin / Java policy"]}
- Gradle / AGP version: ${fields["Gradle / AGP version"]}
- minSdk / targetSdk: ${fields["minSdk / targetSdk"]}
- Signing policy: ${fields["Signing policy"]}
- Build variants / flavors: ${fields["Build variants / flavors"]}
- Permissions policy: ${fields["Permissions policy"]}
- Local storage policy: ${fields["Local storage policy"]}
- Network security / API boundary: ${fields["Network security / API boundary"]}
- Navigation structure: ${fields["Navigation structure"]}
- Offline / sync policy: ${fields["Offline / sync policy"]}
- Notification policy: ${fields["Notification policy"]}
- Privacy / data policy: ${fields["Privacy / data policy"]}
- Device / emulator test plan: ${fields["Device / emulator test plan"]}
- Release channel: ${fields["Release channel"]}
- Package ownership policy: ${fields["Package ownership policy"]}
- Node.js product runtime policy: ${fields["Node.js product runtime policy"]}
- Package manager: ${fields["Package manager"]}
- Framework / bundler: ${fields["Framework / bundler"]}
- Build command: ${fields["Build command"]}
- Test command: ${fields["Test command"]}
- Environment variable policy: ${fields["Environment variable policy"]}
- API / backend boundary: ${fields["API / backend boundary"]}
- Static asset / routing policy: ${fields["Static asset / routing policy"]}
- BI data source inventory reference: ${fields["BI data source inventory reference"]}
- BI metric catalog reference: ${fields["BI metric catalog reference"]}
- BI semantic model reference: ${fields["BI semantic model reference"]}
- BI refresh and lineage plan reference: ${fields["BI refresh and lineage plan reference"]}
- BI dashboard governance reference: ${fields["BI dashboard governance reference"]}
- Primary analytical subject area: ${fields["Primary analytical subject area"]}
- Source-to-model mapping summary: ${fields["Source-to-model mapping summary"]}
- Metric ownership and certification summary: ${fields["Metric ownership and certification summary"]}
- Freshness / latency expectation: ${fields["Freshness / latency expectation"]}
- Access / role / row-filter rule: ${fields["Access / role / row-filter rule"]}
- Reconciliation / backfill / rollback rule: ${fields["Reconciliation / backfill / rollback rule"]}

## 14. Verification Plan
- Gate profile: ${fields["Gate profile"]}
- Verification manifest: ${fields["Verification manifest"]}

## 15. Packet Exit Quality Gate
- Packet exit metadata version: ${fields["Packet exit metadata version"]}
- Packet exit metadata gate reference: ${fields["Packet exit metadata gate reference"]}
- Packet exit metadata exit recommendation: ${fields["Packet exit metadata exit recommendation"]}
- Packet exit metadata source parity result: ${fields["Packet exit metadata source parity result"]}
- Packet exit metadata validation / security / cleanup evidence: ${fields["Packet exit metadata validation / security / cleanup evidence"]}
- Packet exit quality gate reference: ${fields["Packet exit quality gate reference"]}
- Exit recommendation: ${fields["Exit recommendation"]}
- Source parity result: ${fields["Source parity result"]}
- Validation / security / cleanup evidence: ${fields["Validation / security / cleanup evidence"]}
`;
}
