import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const starterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readText(relativePath) {
  return fs.readFileSync(path.join(starterRoot, relativePath), "utf8");
}

function readHumanManual() {
  return [
    "reference/manuals/human/HARNESS_MANUAL.md",
    "reference/manuals/human/index.md",
    "reference/manuals/human/getting-started.md",
    "reference/manuals/human/operations.md",
    "reference/manuals/human/commands.md",
    "reference/manuals/human/troubleshooting.md"
  ]
    .filter((relativePath) => fs.existsSync(path.join(starterRoot, relativePath)))
    .map(readText)
    .join("\n\n");
}

function assertHumanOnlyFrontMatter(content) {
  assert.match(content, /^audience: human$/m);
  assert.match(content, /^language: ko$/m);
  assert.match(content, /^llm_read_policy: never_auto_read$/m);
  assert.match(content, /^default_context: false$/m);
}

function assertContainsCommands(content, commands) {
  for (const command of commands) {
    assert.match(content, new RegExp(escapeRegExp(command)), `missing command: ${command}`);
  }
}

function assertStarterHealthCustomizationBoundary(surface) {
  assert.match(surface, /Starter Health Customization Boundary/);
  assert.match(surface, /Preserve this section/);
  assert.match(surface, /Safe to customize/);
  assert.match(surface, /reusable starter-health guidance/);
  assert.match(surface, /product-only/);
  assert.match(surface, /packet decision/);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("starter docs document copied-starter smoke and SQLite warning disposition", () => {
  const docs = ["START_HERE.md", "reference/manuals/human/HARNESS_MANUAL.md"];
  for (const docPath of docs) {
    const doc = readText(docPath);

    assertContainsCommands(doc, [
      "npm test",
      "npm run harness:validate",
      "npm run harness:status",
      "npm run harness:context",
      "npm run harness:validation-report"
    ]);
    assert.match(doc, /known acceptable warning/);
    assert.match(doc, /SQLite dependency\/runtime 변경/);
    if (docPath === "reference/manuals/human/HARNESS_MANUAL.md") {
      assert.match(doc, /LLM Judge/);
      assert.match(doc, /advisory-only/);
      assert.match(doc, /invalid-context/);
    }
  }
});

test("starter docs put AI Codex CI non-interactive init before human interactive init", () => {
  const startHere = readText("START_HERE.md");
  const manual = readHumanManual();
  const nonInteractiveCommand =
    'npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none';

  for (const surface of [startHere, manual]) {
    assert.match(surface, /AI\/Codex\/CI/);
    assert.match(surface, new RegExp(escapeRegExp(nonInteractiveCommand)));
    assert.match(surface, /human interactive|사람.*interactive|사람.*대화형/i);
    const bareInteractiveIndex = surface.search(/\n(?:\d+\. )?`?npm run harness:init`?\r?\n/);
    assert.notEqual(bareInteractiveIndex, -1, "surface must still document the bare interactive init command");
    assert.ok(
      surface.indexOf(nonInteractiveCommand) < bareInteractiveIndex,
      "non-interactive init command must appear before the bare interactive init command"
    );
  }
});

test("starter AGENTS entry contract has fresh-starter Active Context fallback", () => {
  const contract = readText("AGENTS.md");

  assert.match(contract, /ACTIVE_CONTEXT\.json` when present/);
  assert.match(contract, /Fresh copied starter fallback/);
  assert.match(contract, /START_HERE\.md/);
  assert.match(contract, /harness:init/);
  assert.match(contract, /harness:context/);
  assert.match(contract, /generated `ACTIVE_CONTEXT\.\*` or `VALIDATION_REPORT\.\*` files are missing/);
  assert.match(contract, /not treat missing generated runtime state in a fresh starter as product failure/);
});

test("starter AGENTS entry contract defines guarded active skill invocation", () => {
  const contract = readText("AGENTS.md");

  assert.match(contract, /## Skill Invocation/);
  assert.match(contract, /`\.agents\/skills\/\*\/SKILL\.md` is the single active skill source for Codex/);
  assert.match(contract, /Before substantive work, search `\.agents\/skills`/);
  assert.match(contract, /Load only the matching skill body needed for the task/);
  assert.match(contract, /approval, security, and packet boundaries/);
  assert.match(contract, /If the requested skill name or alias is ambiguous, ask for clarification or decline the skill route/);
  assert.match(contract, /`reference\/skills-src\/\*` is a generation source/);
  assert.doesNotMatch(contract, /reference\/skills\/\*/);
});

test("starter docs keep manual authority and short entry pointers", () => {
  const manual = readHumanManual();
  assert.match(manual, /Docs\/smoke authority boundary/);
  assert.match(manual, /reference\/manuals\/human\/HARNESS_MANUAL\.md`가 운영 기준과 smoke 해석의 primary authority/);
  assert.match(manual, /README\.md`는 저장소 개요이고 `START_HERE\.md`는 사람용 시작 정본/);
  assert.match(manual, /root maintainer history, review evidence, walkthrough evidence, OPS\/PLN packet history는 root-only/);
  assert.match(manual, /새 smoke fixture, install\/copy 실행 흐름, release packaging smoke/);
  assert.match(manual, /targeted docs\/smoke tests, root full tests, `standard-template` full tests/);
  assert.match(manual, /product\/feature verification pass가 아니다/);

  const readme = readText("README.md");
  const startHere = readText("START_HERE.md");
  assert.match(readme, /START_HERE\.md`는 사람용 시작 정본/);
  assert.match(readme, /README.*저장소 개요이고.*START_HERE\.md.*사람용 시작 정본/);
  assert.match(readme, /primary authority는 `reference\/manuals\/human\/HARNESS_MANUAL\.md`/);
  assert.match(startHere, /사람 운영자가 처음 읽는 정본 시작 문서/);

  const packetTemplate = readText("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md");
  assert.match(packetTemplate, /Docs\/smoke packet note/);
  assert.match(packetTemplate, /reference\/manuals\/human\/HARNESS_MANUAL\.md` as the primary human guide/);
  assert.match(packetTemplate, /START_HERE\.md` as the human start document/);
  assert.match(packetTemplate, /do not ship root maintainer history\/evidence/);
  assert.match(packetTemplate, /new smoke fixture or install\/copy execution flow grows/);
});

test("starter manual documents generated-state repair without direct generated-file edits", () => {
  const manual = readHumanManual();

  assertContainsCommands(manual, [
    "npm run harness:sync-state",
    "npm run harness:validation-report",
    "npm run harness:context"
  ]);
  assert.match(manual, /generated file을 직접 고치지/);
  assert.match(manual, /Copied starter init smoke/);
  assert.match(manual, /Refresh\/evidence sequence/);
  assert.match(manual, /Fresh-start drill evidence smoke/);
});

test("starter docs and packet template document ordered refresh and route-mode selection", () => {
  const surfaces = [
    "reference/manuals/human/HARNESS_MANUAL.md",
    "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md"
  ];

  for (const surfacePath of surfaces) {
    const surface = readText(surfacePath);

    assert.match(surface, /harness:sync-state|npm run harness:sync-state/);
    assert.match(surface, /validate -> validation-report -> context -> status/);
    assert.match(surface, /role-by-role/);
    assert.match(surface, /orchestrated-closeout/);
    assert.match(surface, /planner-to-developer/);
    assert.match(surface, /planner-to-orchestrator/);
  }
});

test("starter manual preserves generic fresh-start drill guidance without standalone E2E manual", () => {
  assert.equal(
    fs.existsSync(path.join(starterRoot, "reference/manuals/FRESH_START_E2E_PROJECT_IMPLEMENTATION_MANUAL.md")),
    false,
    "fresh-start E2E manual should not ship as a standalone starter manual"
  );

  const manual = readHumanManual();
  assert.match(manual, /Fresh-start drill pattern/);
  assert.match(manual, /retired E2E worked manual/);
  assert.match(manual, /프로젝트 이름, work item ID, product command, browser smoke, evidence filename/);
  assert.match(manual, /Copied starter init smoke/);
  assert.match(manual, /Refresh\/evidence sequence/);
  assert.match(manual, /Fresh-start drill evidence smoke/);
  assert.match(manual, /init -> kickoff -> first packet -> Developer -> Tester -> Reviewer -> Planner closeout/);
  assert.match(manual, /harness:first-packet/);
  assert.match(manual, /preview\/apply discipline/);
  assert.match(manual, /harness:evidence -- --type walkthrough/);
  assert.match(manual, /harness:evidence -- --type review-report/);
  assert.match(manual, /validate -> validation-report -> context -> status/);
  assert.match(manual, /browser smoke/);
  assert.match(manual, /browser smoke evidence: not-needed/);
  assert.match(manual, /browser smoke selected filters\/week\/date/);
  assert.match(manual, /browser smoke screenshot\/artifact path/);
  assert.match(manual, /closeout enum field/);
  assert.doesNotMatch(manual, /구매 승인 콘솔/);
  assert.doesNotMatch(manual, /PA-01/);
});

test("starter docs explain the full kickoff-to-deployment project flow", () => {
  const manual = readHumanManual();
  assert.match(manual, /End-to-end operator journey/);
  assert.match(manual, /kickoff -> requirements freeze -> packet -> Developer -> Tester -> Reviewer -> Planner closeout -> deployment\/cutover packet when needed/);
  assert.match(manual, /매 작업 운영 루프/);
  assert.match(manual, /배포는 review closeout 이후 자동으로 끝나는 단계가 아니라/);
  assert.match(manual, /harness structural\/state validation만 뜻한다/);

  const startHere = readText("START_HERE.md");
  assert.match(startHere, /kickoff 이후 전체 흐름/);
  assert.match(startHere, /Fresh-start drill pattern/);
  assert.match(startHere, /Verification Manifest/);
  assert.match(startHere, /deployment\/cutover packet when needed/);
  assert.match(startHere, /HARNESS_FILE_ROUTE_AUDIT_MATRIX\.md/);
  assert.match(startHere, /초기화 직후 `codex-ready`가 `HOLD`를 반환하는 것은 정상일 수 있습니다/);
  assert.match(startHere, /`PLN-00` kickoff interview, `PLN-01` requirements freeze, `PROJECT_STARTER_DOC_PACK`/);

  const matrix = readText("reference/artifacts/HARNESS_FILE_ROUTE_AUDIT_MATRIX.md");
  assert.match(matrix, /Whole Project Flow Audit/);
  assert.match(matrix, /First project start/);
  assert.match(matrix, /Fresh kickoff deep interview/);
  assert.match(matrix, /Requirements authoring \/ rebase/);
  assert.match(matrix, /Fresh-start drill/);
  assert.match(matrix, /Analyst/);
  assert.match(matrix, /Orchestrator/);
  assert.match(matrix, /reference\/artifacts\/WALKTHROUGH\.md/);
  assert.match(matrix, /reference\/artifacts\/REVIEW_REPORT\.md/);
  assert.match(matrix, /reference\/artifacts\/HANDOFF_ARCHIVE\.md/);
  assert.match(matrix, /not mandatory starter-shipped files/);
  assert.match(matrix, /Orchestrator -> Developer -> Tester -> Reviewer -> Planner/);
  assert.match(matrix, /harness validation pass를 release approval로 취급/);
});

test("starter readme introduces the harness philosophy and differentiating traits", () => {
  const readme = readText("README.md");

  assert.match(readme, /Context Window 한계 대응/);
  assert.match(readme, /재진입 안정성/);
  assert.match(readme, /승인 경계 보존/);
  assert.match(readme, /범위 오염 방지/);
  assert.match(readme, /Lean by default, strict where risk demands/);
  assert.match(readme, /Human plans, harnessed AI executes/);
  assert.match(readme, /Context economy is a product feature/);
  assert.match(readme, /Friction is observed, recorded, and improved/);
  assert.match(readme, /Compound Engineering and reusable learning/);
  assert.match(readme, /Active Context/);
  assert.match(readme, /packet/i);
  assert.match(readme, /evidence/i);
  assert.match(readme, /starter payload/i);
  assert.match(readme, /generated runtime state/);
  assert.match(readme, /## README Traceability/);
  assert.doesNotMatch(readme, /## 기본 smoke 명령/);
});

test("starter embeds a README traceability matrix for philosophy-to-implementation mapping", () => {
  const readme = readText("README.md");

  assert.match(readme, /## README Traceability/);
  assert.match(readme, /\| README 핵심 주장 \| 구현 파일 \| 테스트 \| 운영 명령 \|/);
  assert.match(readme, /Context Window 한계 대응/);
  assert.match(readme, /재진입 안정성/);
  assert.match(readme, /승인 경계 보존/);
  assert.match(readme, /Friction is observed, recorded, and improved/);
  assert.match(readme, /Compound Engineering and reusable learning/);
  assert.match(readme, /Starter payload는 clean reusable operating payload다/);
  assert.match(readme, /Codex 지향 표면/);
  assert.match(readme, /harness:payload-boundary/);
  assert.match(readme, /harness:codex-ready/);
  assert.match(readme, /packet-preflight/);
  assert.equal(
    fs.existsSync(path.join(starterRoot, "reference", "artifacts", "README_TRACEABILITY_MATRIX.md")),
    false,
    "README traceability should live in README itself, not a separate artifact file"
  );
});

test("starter operator manual exposes practical option combinations and prompt cookbook", () => {
  const manual = readHumanManual();

  assert.match(manual, /One-page lifecycle/);
  assert.match(manual, /Option combination matrix/);
  assert.match(manual, /Prompt cookbook/);
  assert.match(manual, /PRF-01/);
  assert.match(manual, /PRF-10/);
  assert.match(manual, /Risk class/);
  assert.match(manual, /Route class/);
  assert.match(manual, /Gate profile/);
  assert.match(manual, /Workflow role/);
  assert.match(manual, /Evidence set/);
  assert.match(manual, /Deployment\/cutover path/);
  assert.match(manual, /Fast Path Note 요청/);
  assert.match(manual, /Strict-path checklist 요청/);
  assert.match(manual, /Strict\/high path friction is intentional/);
  assert.match(manual, /Sandbox\/pilot evidence bundle guidance/);
  assert.match(manual, /Production readiness.*not-claimed/);
  assert.match(manual, /learning confidence, not production readiness/);
  assert.match(manual, /harness validation pass는 structural\/state validation/);
  assert.doesNotMatch(manual, /\bOPS-\d+\b/);

  const matrix = readText("reference/artifacts/HARNESS_FILE_ROUTE_AUDIT_MATRIX.md");
  assert.match(matrix, /Option combination matrix/);
  assert.match(matrix, /primary guide/);
});

test("starter manual documents shipped advanced command references and hand-editable boundaries", () => {
  const manual = readHumanManual();

  assert.match(manual, /npm run harness:brief/);
  assert.match(manual, /npm run harness:agent/);
  assert.match(manual, /npm run harness:orchestrate/);
  assert.match(manual, /advanced\/operator command/);
  assert.match(manual, /advanced\/orchestration command/);
  assert.match(manual, /Orchestrator가 직접 구현, 테스트, 리뷰, approval, packet closeout을 대체한다는 뜻이 아니다/);
  assert.match(manual, /non-editable generated\/runtime surface 예시/);
  assert.match(manual, /active workflow나 approved packet이 요구할 때만 직접 편집/);
});

test("starter first-packet and preflight guidance documents strict literals and compact manifest examples", () => {
  const manual = readHumanManual();
  assert.match(manual, /firstPacketReadiness/);
  assert.match(manual, /Quick Decision Header > Work item/);
  assert.match(manual, /authoringGuide/);
  assert.match(manual, /strict literal enum/);
  assert.match(manual, /Schema impact classification/);
  assert.match(manual, /conditional/);
  assert.match(manual, /## Verification Manifest/);

  const packetTemplate = readText("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md");
  assert.match(packetTemplate, /First-packet readiness note/);
  assert.match(packetTemplate, /open bootstrap decisions\/risks/);
  assert.match(packetTemplate, /Strict literal copy examples/);
  assert.match(packetTemplate, /Change zone: core/);
  assert.match(packetTemplate, /Schema impact classification: none/);
  assert.match(packetTemplate, /Verification Manifest compact example/);
  assert.match(packetTemplate, /standard-template: targeted\/full starter checks/);

  const closeout = readText("reference/artifacts/PACKET_EXIT_QUALITY_GATE.md");
  assert.match(closeout, /Copy-ready closeout metadata example/);
  assert.match(closeout, /Packet exit metadata source parity result: pass/);
  assert.match(closeout, /Validation \/ security \/ cleanup evidence: pass/);
  assert.match(closeout, /Closeout notes/);
});

test("PVH-PKT-006 first-user manual maps evidence states to exact next actions", () => {
  const manual = readHumanManual();
  assert.match(manual, /First-time operator state runbook/);
  for (const state of ["pass", "warn", "hold", "block", "blocked_environment", "not_run_agent_error", "not_required"]) {
    assert.match(manual, new RegExp(`\\|\\s*\`${escapeRegExp(state)}\`\\s*\\|[^\\n]+\\|[^\\n]+\\|`), `missing state runbook row: ${state}`);
  }
  assert.match(manual, /product behavior verification/i);
  assert.match(manual, /structural\/state validation/i);
  assert.match(manual, /does not prove product behavior/i);
});

test("PVH-PKT-006 security review and packet examples are preflightable", () => {
  const closeout = readText("reference/manuals/closeout.md");
  const packetTemplate = readText("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md");
  const browserManual = readText("reference/manuals/browser-evidence.md");

  assert.match(closeout, /Minimal CSO security review pass example/);
  assert.match(closeout, /"schema_version": "standard-harness-security-review\/v2\.2"/);
  assert.match(closeout, /"packet_path": "reference\/packets\/PKT-01\.md"/);
  assert.match(closeout, /"work_item_id": "WI-01"/);
  assert.match(closeout, /"phases_run": \[0, 1, 12, 13, 14\]/);
  assert.match(closeout, /"filter_stats": \{ "raw_candidates": 0, "suppressed_false_positives": 0, "main_findings": 0 \}/);
  assert.doesNotMatch(closeout, /sk-[A-Za-z0-9_-]{12,}/);

  assert.match(packetTemplate, /targeted test/);
  assert.match(packetTemplate, /handoff/);
  assert.match(browserManual, /blocked_environment/);
  assert.match(browserManual, /not_run_agent_error/);
  assert.match(browserManual, /not_required/);
});

test("starter planner packet challenge loop is documented across planner, manual, and packet template", () => {
  const workflow = readText(".agents/workflows/planner.md");
  assert.match(workflow, /Planner Packet Challenge Loop/);
  assert.match(workflow, /adversarial_review\/SKILL\.md/);
  assert.match(workflow, /parent objective/);
  assert.match(workflow, /first-wave limit/);
  assert.match(workflow, /Challenge status: pass/);

  const manual = readHumanManual();
  assert.match(manual, /Planner Packet Challenge Review/);
  assert.match(manual, /packet 자체를 검토/);
  assert.match(manual, /implementation-transition.*non-pass를 block/);
  assert.match(manual, /Failure fixture or failure condition/);

  const packetTemplate = readText("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md");
  assert.match(packetTemplate, /## Planner Packet Challenge Review/);
  assert.match(packetTemplate, /Parent objective coverage/);
  assert.match(packetTemplate, /Deferred scope with named follow-up/);
  assert.match(packetTemplate, /Reviewer closeout hold basis/);
  assert.match(packetTemplate, /Guidance-only sufficiency rationale/);
  assert.match(packetTemplate, /Challenge reviewer independence basis/);
  assert.match(packetTemplate, /No self-approval claim/);

  for (const surfacePath of [
    ".agents/workflows/reviewer.md",
    "reference/artifacts/PACKET_EXIT_QUALITY_GATE.md",
    ".agents/artifacts/SYSTEM_CONTEXT.md"
  ]) {
    const surface = readText(surfacePath);

    assert.match(surface, /Planner Packet Challenge Review/);
    assert.match(surface, /self-approved|self-approval/);
    assert.match(surface, /findings disposition|Findings disposition/);
  }
});

test("starter prototype lane contract blocks production promotion without modeling packet boundary", () => {
  const manual = readHumanManual();
  assert.match(manual, /Prototype lane/);
  assert.match(manual, /production-forbidden/);
  assert.match(manual, /Prototype sandbox path/);
  assert.match(manual, /Learning goal/);
  assert.match(manual, /Evidence type: CUJ\/UX\/customer feedback/);
  assert.match(manual, /Production-copy prohibition/);
  assert.match(manual, /Promotion target packet/);
  assert.match(manual, /Modeling Impact required/);
  assert.match(manual, /learning evidence/);
  assert.match(manual, /direct copy\/merge/);
  assert.match(manual, /closeout hold/);

  const packetTemplate = readText("reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md");
  assert.match(packetTemplate, /## Prototype Lane Contract/);
  assert.match(packetTemplate, /Prototype sandbox path/);
  assert.match(packetTemplate, /`prototypes\/\*\*`/);
  assert.match(packetTemplate, /separate repo \/ separate worktree/);
  assert.match(packetTemplate, /Learning goal/);
  assert.match(packetTemplate, /Evidence type: not-needed \/ CUJ \/ UX \/ customer feedback/);
  assert.match(packetTemplate, /Production-copy prohibition/);
  assert.match(packetTemplate, /without Modeling Impact and product packet approval/);
  assert.match(packetTemplate, /Promotion target packet/);
  assert.match(packetTemplate, /Modeling Impact required: yes \/ not-needed/);
  assert.match(packetTemplate, /must not claim product verification, production readiness, release readiness, or reusable implementation approval/);
  assert.match(packetTemplate, /Hold when sandbox path, learning goal\/evidence type, production-copy prohibition, promotion target packet, or Modeling Impact requirement is missing/);

  const systemContext = readText(".agents/artifacts/SYSTEM_CONTEXT.md");
  assert.match(systemContext, /Production-Forbidden Prototype Lane/);
  assert.match(systemContext, /learning surfaces, not production implementation sources/);
  assert.match(systemContext, /re-approved under Modeling Impact and product packet scope/);
  assert.match(systemContext, /permits direct copy\/merge into production/);
});

test("starter long-memory boundary guidance stays generic", () => {
  const surfaces = [
    "reference/manuals/human/HARNESS_MANUAL.md",
    ".agents/artifacts/PROJECT_HISTORY.md",
    ".agents/artifacts/ARCHITECTURE_GUIDE.md",
    ".agents/artifacts/PREVENTIVE_MEMORY.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  ];

  for (const surfacePath of surfaces) {
    const surface = readText(surfacePath);

    assert.match(surface, /Long-Memory Boundary|long history log|Architecture Memory Boundary/);
    assert.match(surface, /root maintainer|maintainer history|root maintainer history/);
  }

  const history = readText(".agents/artifacts/PROJECT_HISTORY.md");
  assert.doesNotMatch(history, /OPS-48A_GENERATED_STATE_RFC_CONTRADICTION/);
  assert.doesNotMatch(history, /OPS-47_VALIDATION_SPLIT/);

  for (const forbiddenPath of [
    ".agents/artifacts/ADR.md",
    ".agents/artifacts/RISK_REGISTER.md",
    ".agents/artifacts/CHANGELOG.md"
  ]) {
    assert.equal(fs.existsSync(path.join(starterRoot, forbiddenPath)), false, `${forbiddenPath} must not be created in OPS-48 first wave`);
  }
});

test("starter health customization boundaries preserve architecture and implementation-plan guardrails", () => {
  const surfaces = [
    ".agents/artifacts/REQUIREMENTS.md",
    ".agents/artifacts/ARCHITECTURE_GUIDE.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md"
  ];

  for (const surfacePath of surfaces) {
    const surface = readText(surfacePath);

    assertStarterHealthCustomizationBoundary(surface);
  }

  const requirements = readText(".agents/artifacts/REQUIREMENTS.md");
  assert.match(requirements, /Summary/);
  assert.match(requirements, /approval boundary/i);
  assert.match(requirements, /open questions/i);
  assert.match(requirements, /deferred items/i);
  assert.match(requirements, /## Open Questions/);
  assert.match(requirements, /## Deferred Items/);

  const architectureGuide = readText(".agents/artifacts/ARCHITECTURE_GUIDE.md");
  assert.match(architectureGuide, /Purpose/);
  assert.match(architectureGuide, /Authoring Flow/);
  assert.match(architectureGuide, /Architecture Memory Boundary/);
  assert.match(architectureGuide, /component names, module boundaries, data flow, integrations/);

  const implementationPlan = readText(".agents/artifacts/IMPLEMENTATION_PLAN.md");
  assert.match(implementationPlan, /Current Plan Summary/);
  assert.match(implementationPlan, /Dependency Order And Blocking Conditions/);
  assert.match(implementationPlan, /Root \/ Standard-Template Sync Requirements/);
  assert.match(implementationPlan, /generated-doc immutability, packet-before-code, Active Context derived authority/);
});

test("fresh-start report directory is scaffolded with authority boundaries", () => {
  const readme = readText("reference/reports/README.md");

  assert.match(readme, /fresh-start validation reports/);
  assert.match(readme, /not canonical state/);
  assert.match(readme, /VALIDATION_REPORT/);
  assert.match(readme, /product acceptance evidence/);
});

test("starter E2E report guidance requires telemetry provenance without false precision", () => {
  const readme = readText("reference/reports/README.md");

  assert.match(readme, /E2E Effort \/ Token Reporting Contract/);
  assert.match(readme, /Telemetry status: measured \| estimated \| unavailable/);
  assert.match(readme, /`measured`: use only when the report cites a concrete runtime, tool, log, trace, or accounting source/);
  assert.match(readme, /`estimated`: use when the report infers the value; include the estimation method/);
  assert.match(readme, /`unavailable`: use when telemetry is absent; include the unavailable rationale/);
  assert.match(readme, /Measured product implementation tokens/);
  assert.match(readme, /Measured harness compliance tokens/);
  assert.match(readme, /Estimated product \/ harness split/);
  assert.match(readme, /Estimation method/);
  assert.match(readme, /Evidence source/);
  assert.match(readme, /Unavailable rationale/);
  assert.match(readme, /Do not invent exact token\/cost metrics/);
  assert.match(readme, /Reviewer holds reports that present exact token\/cost numbers without measured evidence/);
  assert.match(readme, /No reusable fresh-start E2E report template is currently shipped/);
  assert.match(readme, /Sandbox \/ Pilot Evidence Bundle/);
  assert.match(readme, /Production readiness.*not-claimed/);
  assert.match(readme, /Payload separation/);
  assert.match(readme, /does not weaken strict\/high production gates/);
  assert.match(readme, /Harness validation proves harness structure and state consistency/);
});

test("starter skill marketplace catalog preserves compact discovery and authority boundaries", () => {
  const catalog = readText("reference/artifacts/SKILL_MARKETPLACE_CATALOG.md");

  assert.match(catalog, /Skill Marketplace Catalog/);
  assert.match(catalog, /Version: v1/);
  assert.match(catalog, /Default context must not include all skill bodies/);
  assert.match(catalog, /New projects receive pointers and selected active skills/);
  assert.match(catalog, /Load a skill body when the active packet, workflow, role task, user request, request intent, or risk surface matches that skill/);
  assert.match(catalog, /The user does not need to name a skill explicitly/);
  assert.match(catalog, /Role\/workflow selection remains the primary execution boundary/);
  assert.match(catalog, /\.agents\/skills\/\*` is the single active skill surface/);
  assert.match(catalog, /reference\/skills-src\/\*` is a generation source/);
  assert.match(catalog, /Skill output does not override packet authority, Ready For Code approval, Tester verification, Reviewer closeout, Planner closeout, or product acceptance/);
  assert.match(catalog, /Onboarding\/setup skills are explicit and versioned/);
  assert.match(catalog, /writing-plans\/SKILL\.md/);
  assert.match(catalog, /executing-plans\/SKILL\.md/);
  assert.match(catalog, /verification-before-completion\/SKILL\.md/);
  assert.match(catalog, /requesting-code-review\/SKILL\.md/);
  assert.match(catalog, /receiving-code-review\/SKILL\.md/);
  assert.match(catalog, /security-review\/SKILL\.md/);
  assert.match(catalog, /destructive-command-guard\/SKILL\.md/);
  assert.match(catalog, /operator-support\/SKILL\.md/);
  assert.match(catalog, /subagent-driven-development\/SKILL\.md/);
  assert.match(catalog, /compound-learning\/SKILL\.md/);
  assert.match(catalog, /memory-search\/SKILL\.md/);
  assert.match(catalog, /adversarial_review\/SKILL\.md/);
  assert.match(catalog, /requirements_deep_interview\/SKILL\.md/);
  assert.match(catalog, /architecture_design\/SKILL\.md/);
  assert.match(catalog, /epic_story_decompose\/SKILL\.md/);
  assert.match(catalog, /forensic_investigation\/SKILL\.md/);
  assert.match(catalog, /retrospective\/SKILL\.md/);
  assert.match(catalog, /day_start\/SKILL\.md/);
  assert.match(catalog, /day_wrap_up\/SKILL\.md/);
  assert.match(catalog, /version_closeout\/SKILL\.md/);
  assert.match(catalog, /conflict_resolver\/SKILL\.md/);
  assert.match(catalog, /dependency_audit\/SKILL\.md/);
  assert.match(catalog, /feature-artifact-sync\/SKILL\.md/);
  assert.match(catalog, /frontend_design\/SKILL\.md/);
  assert.match(catalog, /general_publish\/SKILL\.md/);
  assert.match(catalog, /github_deploy\/SKILL\.md/);
  assert.match(catalog, /operating-common-rollout\/SKILL\.md/);
  assert.match(catalog, /Role Skill Affinity/);
  assert.match(catalog, /Planner owns scope and approval boundaries/);
  assert.match(catalog, /Developer implements only approved scope/);
  assert.match(catalog, /subagent use still requires explicit user or approved packet authorization/);
  assert.match(catalog, /Minimum-contract-deferred/);
  assert.match(catalog, /OPS-SKILL-01A_CONFLICT_RESOLVER_MINIMUM_CONTRACT/);
  assert.doesNotMatch(catalog, /read all `.agents\/skills\/\*` by default/i);
  assert.doesNotMatch(catalog, /reference\/skills\/[^s]/);
  assert.doesNotMatch(catalog, /conflict_resolver[^.\n]*(resolves|handles)[^.\n]*(multi-agent|multi-session|branch|queue)/i);

  for (const surfacePath of [
    ".agents/workflows/planner.md",
    ".agents/artifacts/SYSTEM_CONTEXT.md",
    "reference/manuals/human/HARNESS_MANUAL.md"
  ]) {
    const surface = readText(surfacePath);

    assert.match(surface, /SKILL_MARKETPLACE_CATALOG\.md/);
    assert.match(surface, /selected skill body|selected active skills/);
    assert.match(surface, /must not (include|load) all skill bodies/);
    assert.match(surface, /Skill output does not override packet authority/);
    assert.match(surface, /conflict_resolver/);
    assert.match(surface, /minimum-contract-deferred|OPS-SKILL-01A_CONFLICT_RESOLVER_MINIMUM_CONTRACT/);
    assert.doesNotMatch(surface, /read all `.agents\/skills\/\*` by default/i);
  }
});

test("starter command taxonomy classifies every package script once", () => {
  const taxonomy = readText("reference/commands/COMMAND_TAXONOMY.md");
  const policy = readText("reference/commands/COMPATIBILITY_COMMAND_POLICY.md");
  const packageJson = JSON.parse(readText("package.json"));
  const scripts = Object.keys(packageJson.scripts).sort();
  const requiredGroups = [
    "core starter lifecycle",
    "Codex workflow",
    "evidence/review",
    "security/risk gates",
    "learning/operator diagnostics",
    "compatibility namespaces",
    "maintenance/internal"
  ];

  for (const group of requiredGroups) {
    assert.match(taxonomy, new RegExp(`### ${escapeRegExp(group)}`));
  }

  const rows = [...taxonomy.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/gm)]
    .map((match) => ({ script: match[1], group: match[2].trim() }))
    .filter((row) => scripts.includes(row.script));
  const classified = rows.map((row) => row.script).sort();
  const duplicates = classified.filter((script, index) => classified.indexOf(script) !== index);

  assert.deepEqual(duplicates, [], "scripts must not be classified more than once");
  assert.deepEqual(classified, scripts, "taxonomy must classify every package.json script exactly once");
  for (const row of rows) {
    assert.ok(requiredGroups.includes(row.group), `unexpected command group for ${row.script}: ${row.group}`);
  }

  for (const namespace of ["harness:v23", "harness:v24", "harness:v25", "harness:v26", "harness:v27", "harness:v28"]) {
    assert.match(policy, new RegExp(escapeRegExp(namespace)));
  }
  assert.match(policy, /separate approved deprecation packet/);

  for (const surfacePath of [
    "README.md",
    "START_HERE.md",
    "reference/manuals/operator/OPERATOR_QUICKSTART.md",
    "reference/manuals/human/HARNESS_MANUAL.md"
  ]) {
    const surface = readText(surfacePath);
    assert.match(surface, /reference\/commands\/COMMAND_TAXONOMY\.md/);
    assert.match(surface, /reference\/commands\/COMPATIBILITY_COMMAND_POLICY\.md/);
  }
});

test("starter seed and generated runtime state semantics are documented", () => {
  const semantics = readText("reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md");
  const readme = readText("README.md");
  const startHere = readText("START_HERE.md");
  const quickstart = readText("reference/manuals/operator/OPERATOR_QUICKSTART.md");
  const driftRecovery = readText("reference/manuals/operator/DRIFT_RECOVERY_RUNBOOK.md");
  const manual = readHumanManual();

  for (const term of [
    "starter seed",
    "read surface",
    "generated runtime output",
    "post-init project state",
    "starter_bootstrap_pending",
    "ACTIVE_CONTEXT.brief.md"
  ]) {
    assert.match(semantics, new RegExp(escapeRegExp(term)));
  }

  for (const surface of [readme, startHere, quickstart, driftRecovery, manual]) {
    assert.match(surface, /STARTER_SEED_AND_GENERATED_STATE\.md/);
    assert.match(surface, /starter_bootstrap_pending/);
    assert.match(surface, /pre-init|초기화 전/);
    assert.match(surface, /post-init|초기화 후/);
  }

  assert.match(semantics, /not live project truth/i);
  assert.match(semantics, /do not edit generated runtime output as source authority/i);
});

test("PVH-FUP-006 first-run rehearsal gives one classified primary path", () => {
  const rehearsal = readText("reference/manuals/human/first-run-rehearsal.md");
  const manualIndex = readText("reference/manuals/MANUAL_INDEX.md");
  const gettingStarted = readText("reference/manuals/human/getting-started.md");
  const commandBlocks = [...rehearsal.matchAll(/```(?:bash|powershell|sh)\s*\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  const nonInteractiveInitCommand =
    'npm run harness:init -- --non-interactive --project-name "My Project" --project-slug "my-project" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles none';

  assert.match(rehearsal, /# 5-Minute First-Run Rehearsal/);
  assert.match(rehearsal, /Primary path/);
  assert.match(rehearsal, /Harness validation is not product verification/);
  assert.match(rehearsal, /harness:packaging-readiness/);
  assert.match(rehearsal, /browser evidence/i);
  assert.match(rehearsal, /\| State \| Exact next action \|/);
  assert.match(rehearsal, /starter_bootstrap_pending/);
  assert.match(rehearsal, /Ready For Code hold/);
  assert.match(rehearsal, /closeout/);
  assert.match(rehearsal, /Command block classification/);
  assert.match(rehearsal, /non-interactive init/);
  assert.match(
    rehearsal,
    new RegExp(escapeRegExp(nonInteractiveInitCommand)),
    "first-run rehearsal must include the copy-ready non-interactive init command it promises"
  );
  assert(commandBlocks.length >= 3);

  for (const block of commandBlocks) {
    assert.match(block, /^# classification: (executable|preflight|manual-only)$/m);
    assert.doesNotMatch(block, /rm\s+-rf|git\s+push|npm\s+publish|deploy/i);
    if (/^# classification: executable$/m.test(block)) {
      assert.doesNotMatch(block, /<[^>\n]+>/, "executable first-run command blocks must not contain placeholders");
    }
  }

  assert.match(manualIndex, /first-run-rehearsal\.md/);
  assert.match(gettingStarted, /first-run-rehearsal\.md/);
});

test("PVH-FUP-010 post-validation manual coverage map is complete and authority-bounded", () => {
  const mapPath = "reference/manuals/human/post-validation-coverage-map.md";
  const map = readText(mapPath);
  const manualIndex = readText("reference/manuals/MANUAL_INDEX.md");
  const gettingStarted = readText("reference/manuals/human/getting-started.md");
  const commands = readText("reference/manuals/human/commands.md");
  const operatorQuickstart = readText("reference/manuals/operator/OPERATOR_QUICKSTART.md");
  const agents = readText("AGENTS.md");
  const requiredRows = [
    ["PVH-FUP-001", "harness:directional-pilot", ".agents/runtime/directional-regression-pilot.json"],
    ["PVH-FUP-002", "harness:trace-matrix", ".agents/runtime/requirement-trace-matrix.json"],
    ["PVH-FUP-003", "harness:ai-review-runner", ".agents/runtime/advisory-ai-review.json"],
    ["PVH-FUP-004", "harness:operator-digest", ".agents/runtime/operator-readiness-digest.json"],
    ["PVH-FUP-005", "harness:refactor-audit", ".agents/runtime/refactor-audit.json"],
    ["PVH-FUP-006", "human/first-run-rehearsal.md", "reference/manuals/human/first-run-rehearsal.md"],
    ["PVH-FUP-007", "harness:recovery-rehearsal", ".agents/runtime/recovery-rehearsal.json"],
    ["PVH-FUP-008", "harness:packaging-readiness", ".agents/runtime/packaging-readiness.json"],
    ["PVH-FUP-009", "harness:sync-state", "reference/manuals/human/first-run-rehearsal.md"]
  ];

  assertHumanOnlyFrontMatter(map);
  assert.match(map, /post-validation operating flow/i);
  assert.match(map, /\| Improvement ID \| Operator question \| When to run \| Command surface \| Classified representative command \| Primary manual \| Detailed reference \| Expected evidence \| Status interpretation \| Verification test hook \| Authority boundary \| Source refs \|/);
  assert.match(map, /ready.*evidence-surface status/i);
  assert.match(map, /pass.*evidence-surface status/i);
  assert.match(map, /does not grant approval, release readiness, product verification, security approval, closeout, risk closure, or residual-risk acceptance/i);
  assert.match(map, /operator-digest.*summary\/navigation/i);
  assert.match(map, /underlying.*packet-preflight.*transition.*risk.*guard.*browser.*security.*trace.*closeout/i);

  for (const [packetId, commandSurface, evidencePath] of requiredRows) {
    const rowPattern = new RegExp(`\\|\\s*\`${escapeRegExp(packetId)}\`\\s*\\|[^\\n]*${escapeRegExp(commandSurface)}[^\\n]*${escapeRegExp(evidencePath)}[^\\n]*does not grant approval`, "i");
    assert.match(map, rowPattern, `missing complete coverage row for ${packetId}`);
  }

  assert.match(commands, /### `npm run harness:directional-pilot`/);
  assert.match(commands, /### `npm run harness:trace-matrix`/);
  assert.match(commands, /directional-regression-pilot\.json/);
  assert.match(commands, /requirement-trace-matrix\.json/);
  assert.match(commands, /no approval/i);
  assert.match(commands, /not product verification/i);

  for (const surface of [manualIndex, gettingStarted, operatorQuickstart]) {
    assert.match(surface, new RegExp(escapeRegExp(mapPath)));
  }
  assert.doesNotMatch(agents, new RegExp(escapeRegExp(mapPath)), "coverage map must not be in the default agent read set");
});

test("human manual is split into human-only chapters outside AI default read set", () => {
  const manual = readText("reference/manuals/human/HARNESS_MANUAL.md");
  const startHere = readText("START_HERE.md");
  const readme = readText("README.md");
  const operatorIndex = readText("reference/manuals/operator/MANUAL_INDEX.md");
  const agents = readText("AGENTS.md");
  const chapters = [
    "index.md",
    "getting-started.md",
    "operations.md",
    "commands.md",
    "troubleshooting.md"
  ];

  assertHumanOnlyFrontMatter(manual);
  assert.match(manual, /canonical_human_manual: true/);
  assert.match(manual, /canonical index/i);
  assert.doesNotMatch(manual, /^## 1\. 하네스란 무엇인가$/m);

  for (const chapterName of chapters) {
    const chapterPath = `reference/manuals/human/${chapterName}`;
    const chapter = readText(chapterPath);

    assertHumanOnlyFrontMatter(chapter);
    assert.match(chapter, /# /, `${chapterPath} should have a heading`);
    assert.doesNotMatch(agents, new RegExp(escapeRegExp(chapterPath)), `${chapterPath} must not be in AGENTS default read set`);
    assert.match(manual, new RegExp(escapeRegExp(chapterPath)), `${chapterPath} must be linked from HARNESS_MANUAL.md`);
  }

  assert.match(startHere, /reference\/manuals\/human\/index\.md/);
  assert.match(startHere, /reference\/manuals\/human\/commands\.md/);
  assert.match(readme, /reference\/manuals\/human\/index\.md/);
  assert.match(operatorIndex, /reference\/manuals\/human\/index\.md/);

  const commandsChapter = readText("reference/manuals/human/commands.md");
  assert.match(commandsChapter, /reference\/commands\/COMMAND_TAXONOMY\.md/);
  assertContainsCommands(commandsChapter, [
    "npm test",
    "npm run harness:validate",
    "npm run harness:status",
    "npm run harness:context",
    "npm run harness:validation-report"
  ]);
});

test("reference lifecycle and deprecation indexes classify optional reference surfaces", () => {
  const lifecycle = readText("reference/REFERENCE_LIFECYCLE_INDEX.md");
  const deprecations = readText("reference/DEPRECATION_CANDIDATES.md");
  const referenceReadme = readText("reference/README.md");
  const routeMatrix = readText("reference/artifacts/HARNESS_FILE_ROUTE_AUDIT_MATRIX.md");
  const agents = readText("AGENTS.md");
  const topLevelReferenceDirs = [
    "artifacts",
    "commands",
    "evidence",
    "manuals",
    "packets",
    "planning",
    "profiles",
    "reports",
    "reviewer-profiles",
    "runtime",
    "schemas",
    "skills-src"
  ];
  const requiredCategories = [
    "route-selected starter essential",
    "optional profile package",
    "optional artifact template",
    "compatibility reference",
    "generated schema/reference contract",
    "deprecation candidate"
  ];

  for (const doc of [lifecycle, deprecations]) {
    assert.match(doc, /^audience: agent-and-human$/m);
    assert.match(doc, /^language: en$/m);
    assert.match(doc, /^llm_read_policy: route_selected$/m);
    assert.match(doc, /^default_context: false$/m);
  }

  for (const category of requiredCategories) {
    assert.match(lifecycle, new RegExp(escapeRegExp(category)), `missing lifecycle category: ${category}`);
  }

  assert.match(lifecycle, /outside the default constitutional AI load order/i);
  assert.match(lifecycle, /Lifecycle owner/i);
  assert.match(lifecycle, /Default read policy/i);
  assert.match(lifecycle, /reference\/README\.md/);
  for (const dirName of topLevelReferenceDirs) {
    const row = new RegExp(`\\|\\s*\`reference/${escapeRegExp(dirName)}/\`\\s*\\|`, "m");
    assert.match(lifecycle, row, `missing top-level reference classification: ${dirName}`);
  }

  assert.match(lifecycle, /reference\/commands\/COMMAND_TAXONOMY\.md/);
  assert.match(lifecycle, /reference\/commands\/COMPATIBILITY_COMMAND_POLICY\.md/);
  assert.match(lifecycle, /reference\/runtime\/STARTER_SEED_AND_GENERATED_STATE\.md/);
  assert.match(lifecycle, /reference\/skills-src\/\*` is a generation source/);
  assert.doesNotMatch(lifecycle, /reference\/skills\/\*` is an active skill surface/);

  assert.match(deprecations, /candidate only/i);
  assert.match(deprecations, /not deprecated, removed, hidden, renamed, behavior-changed, or compatibility-weakened/i);
  assert.match(deprecations, /future approved deprecation\/removal packet/i);
  assert.match(deprecations, /migration guidance/i);
  assert.match(deprecations, /reference\/skills/);

  assert.match(referenceReadme, /reference\/REFERENCE_LIFECYCLE_INDEX\.md/);
  assert.match(referenceReadme, /reference\/DEPRECATION_CANDIDATES\.md/);
  assert.match(routeMatrix, /reference\/REFERENCE_LIFECYCLE_INDEX\.md/);
  assert.doesNotMatch(agents, /reference\/REFERENCE_LIFECYCLE_INDEX\.md/);
  assert.doesNotMatch(agents, /reference\/DEPRECATION_CANDIDATES\.md/);
});

test("test taxonomy classifies version and legacy fixtures without weakening assertions", () => {
  const taxonomy = readText(".harness/test/TEST_TAXONOMY.md");
  const referenceReadme = readText("reference/README.md");
  const requiredCategories = [
    "current behavior test",
    "compatibility regression fixture",
    "integration smoke test",
    "docs/policy validation",
    "security/risk gate test",
    "helper-only fixture support"
  ];
  const requiredInventory = [
    "dev05-test-helpers.js",
    "dev05-tooling.test.js",
    "prf10-profile-connect.test.js",
    "v2-2-hardening.test.js",
    "v2-3-lean-manuals.test.js",
    "v2-4-risk-adaptive.test.js",
    "v2-5-risk-adaptive-gates.test.js",
    "v2-7-adapter-safety.test.js",
    "v2-7-evidence-manifest.test.js",
    "v2-7-gate-semantics.test.js",
    "v2-8-browser-evidence.test.js",
    "v2-8-docs-command-consistency.test.js",
    "v2-8-docs-commands.test.js",
    "v2-evidence-gates.test.js",
    "v2-p2-conductor.test.js"
  ];

  assert.match(taxonomy, /^audience: agent-and-human$/m);
  assert.match(taxonomy, /^language: en$/m);
  assert.match(taxonomy, /^llm_read_policy: route_selected$/m);
  assert.match(taxonomy, /^default_context: false$/m);

  for (const category of requiredCategories) {
    assert.match(taxonomy, new RegExp(escapeRegExp(category)), `missing test category: ${category}`);
  }
  for (const fileName of requiredInventory) {
    assert.match(taxonomy, new RegExp(`\\|\\s*\`${escapeRegExp(fileName)}\`\\s*\\|`, "m"), `missing inventory row: ${fileName}`);
  }

  assert.match(taxonomy, /Protected behavior/);
  assert.match(taxonomy, /Related runtime\/command surface/);
  assert.match(taxonomy, /Rename\/removal policy/);
  assert.match(taxonomy, /No helper extraction performed/);
  assert.match(taxonomy, /setup-only/i);
  assert.match(taxonomy, /Do not delete assertions without documented replacement/i);
  assert.match(taxonomy, /approval, security, validation, evidence, and risk-gate assertions were not weakened/i);
  assert.match(referenceReadme, /\.harness\/test\/TEST_TAXONOMY\.md/);
});
