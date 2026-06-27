import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { initializeProjectStarter, inspectStarterInitializationState, normalizeActiveProfiles } from "../runtime/state/init-project.js";
import { assertNoUnexpectedStderr } from "./cli-stderr-helpers.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

test("initializes a copied starter repo and seeds active-context-ready state", () => {
  const repoRoot = copyStarterRepo();
  assert.equal(inspectStarterInitializationState(repoRoot).status, "fresh");

  const result = initializeProjectStarter({
    repoRoot,
    projectName: "Starter Operations Suite",
    userGoal: "업무 운영 담당자가 월별 실행 현황을 빠르게 판단한다.",
    opsGoal: "운영자와 AI가 현재 기준선, active packet, 다음 행동을 빠르게 복원한다.",
    approvalGoal: "PLN-00과 PLN-01을 닫아 첫 설계/구현 lane을 승인한다.",
    activeProfiles: ["PRF-01", "PRF-02"],
    now: createClock("2026-04-23T10:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.projectSlug, "starter-operations-suite");
  assert.equal(fs.existsSync(path.join(repoRoot, ".harness", "operating_state.sqlite")), true);

  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.name, "starter-operations-suite");

  const currentState = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"), "utf8");
  const taskList = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"), "utf8");
  const requirements = fs.readFileSync(path.join(repoRoot, ".agents", "artifacts", "REQUIREMENTS.md"), "utf8");
  const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
  const implementationPlan = fs.readFileSync(
    path.join(repoRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"),
    "utf8"
  );
  const architectureGuide = fs.readFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ARCHITECTURE_GUIDE.md"),
    "utf8"
  );
  const generatedState = fs.readFileSync(
    path.join(repoRoot, ".agents", "runtime", "generated-state-docs", "CURRENT_STATE.md"),
    "utf8"
  );

  assert.match(currentState, /Current Stage: kickoff_interview/);
  assert.match(currentState, /Starter Operations Suite/);
  assert.match(currentState, /START_HERE\.md/);
  assert.match(currentState, /PROJECT_STARTER_DOC_PACK/);
  assert.match(taskList, /PROJECT_STARTER_DOC_PACK/);
  assert.match(readme, /START_HERE\.md/);
  assert.match(readme, /README는 저장소 개요이고 .*START_HERE\.md.*사람용 시작 정본/);
  assert.match(readme, /primary authority는 `reference\/manuals\/human\/HARNESS_MANUAL\.md`/);
  assert.match(result.nextAction, /PROJECT_STARTER_DOC_PACK/);
  assert.match(requirements, /PRF-01 admin grid application profile/);
  assert.match(requirements, /PRF-02 authoritative spreadsheet source profile/);
  assert.match(implementationPlan, /Selected profiles at bootstrap:/);
  assert.match(architectureGuide, /## Authoring Flow/);
  assert.doesNotMatch(architectureGuide, /## Active Profiles And Exceptions/);
  assert.match(generatedState, /Release stage: kickoff_interview/);

  const store = createOperatingStateStore({
    dbPath: path.join(repoRoot, ".harness", "operating_state.sqlite")
  });
  assert.match(store.getReleaseState("current").currentFocus, /Starter Operations Suite/);
  assert.equal(store.getWorkItem("PLN-00").status, "in_progress");
  assert.equal(store.getWorkItem("PLN-01").status, "todo");

  const activeContext = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), "utf8")
  );
  const activeContextMarkdown = fs.readFileSync(
    path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md"),
    "utf8"
  );
  store.close();

  assert.equal(activeContext.project.name, "Starter Operations Suite");
  assert.equal(activeContext.release.stage, "kickoff_interview");
  assert.equal(activeContext.activeTask.workItemId, "PLN-00");
  assert.equal(activeContext.nextWork.action.includes("PLN-00"), true);
  assert.match(activeContextMarkdown, /# 활성 컨텍스트/);
  assert.equal(inspectStarterInitializationState(repoRoot).status, "initialized");
});

test("initializes copied starter with PRF-10 alone and with PRF-09 composition", () => {
  assert.deepEqual(normalizeActiveProfiles("prf-10"), ["PRF-10"]);
  assert.deepEqual(normalizeActiveProfiles("PRF-09,PRF-10"), ["PRF-09", "PRF-10"]);

  const biOnlyRoot = copyStarterRepo();
  const biOnly = initializeProjectStarter({
    repoRoot: biOnlyRoot,
    projectName: "BI Evidence Portal",
    userGoal: "분석 사용자가 인증된 지표와 대시보드를 확인한다.",
    opsGoal: "운영자와 AI가 BI evidence staging 상태를 복원한다.",
    approvalGoal: "PRF-10 evidence 기준을 닫아 BI-heavy packet을 준비한다.",
    activeProfiles: ["PRF-10"],
    now: createClock("2026-05-31T01:00:00.000Z")
  });

  assert.equal(biOnly.ok, true);
  assert.deepEqual(biOnly.activeProfiles, ["PRF-10"]);
  const biOnlyProfiles = fs.readFileSync(path.join(biOnlyRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"), "utf8");
  const biOnlyPlan = fs.readFileSync(path.join(biOnlyRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"), "utf8");
  assert.match(biOnlyProfiles, /PRF-10/);
  assert.match(biOnlyPlan, /BI\/analytics platform/);

  const webBiRoot = copyStarterRepo();
  const webBi = initializeProjectStarter({
    repoRoot: webBiRoot,
    projectName: "Web BI Console",
    userGoal: "웹 화면에서 인증된 분석 결과를 확인한다.",
    opsGoal: "Node frontend와 BI evidence 경계를 함께 복원한다.",
    approvalGoal: "PRF-09와 PRF-10 조합 기준을 닫는다.",
    activeProfiles: ["PRF-09", "PRF-10"],
    now: createClock("2026-05-31T02:00:00.000Z")
  });

  assert.equal(webBi.ok, true);
  assert.deepEqual(webBi.activeProfiles, ["PRF-09", "PRF-10"]);
  const webBiProfiles = fs.readFileSync(path.join(webBiRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"), "utf8");
  const webBiPlan = fs.readFileSync(path.join(webBiRoot, ".agents", "artifacts", "IMPLEMENTATION_PLAN.md"), "utf8");
  assert.match(webBiProfiles, /PRF-09/);
  assert.match(webBiProfiles, /PRF-10/);
  assert.match(webBiPlan, /Node 또는 frontend web app/);
  assert.match(webBiPlan, /BI\/analytics platform/);
});

test("actual standard-template source is already a fresh starter seed", () => {
  if (detectStarterSource() === path.resolve(TEST_DIR, "..", "..")) {
    const sourceState = inspectStarterInitializationState(detectStarterSource()).status;
    if (sourceState === "initialized") {
      return;
    }
    assert.equal(sourceState, "fresh");
  }

  const repoRoot = copyStarterRepo({ reset: false });

  const result = initializeProjectStarter({
    repoRoot,
    projectName: "Fresh Source Starter",
    userGoal: "사용자가 starter source 그대로 kickoff를 시작한다.",
    opsGoal: "운영자와 AI가 fresh starter 기준으로 재진입한다.",
    approvalGoal: "PLN-00과 PLN-01을 닫아 첫 구현 lane을 연다.",
    activeProfiles: [],
    now: createClock("2026-05-17T04:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json")), true);
  assert.equal(fs.existsSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json")), false);
});

test("refuses to reinitialize an already-edited repo without force", () => {
  const repoRoot = copyStarterRepo();
  const currentStatePath = path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md");
  fs.writeFileSync(
    currentStatePath,
    fs.readFileSync(currentStatePath, "utf8").replace("Current Stage: not started", "Current Stage: kickoff_interview"),
    "utf8"
  );

  assert.throws(
    () =>
      initializeProjectStarter({
        repoRoot,
        projectName: "Already Edited Repo",
        userGoal: "goal",
        opsGoal: "ops",
        approvalGoal: "approval"
      }),
    /does not look like a fresh standard harness starter/
  );
});

test("classifies initialized starters before force reinitialization", () => {
  const repoRoot = copyStarterRepo();

  initializeProjectStarter({
    repoRoot,
    projectName: "Already Initialized Repo",
    userGoal: "goal",
    opsGoal: "ops",
    approvalGoal: "approval",
    now: createClock("2026-05-21T08:00:00.000Z")
  });

  const state = inspectStarterInitializationState(repoRoot);
  assert.equal(state.status, "initialized");
  assert.equal(state.dbExists, true);
  assert.equal(state.activeContextExists, true);

  assert.throws(
    () =>
      initializeProjectStarter({
        repoRoot,
        projectName: "Already Initialized Repo",
        userGoal: "goal",
        opsGoal: "ops",
        approvalGoal: "approval"
      }),
    /already appears to be initialized/
  );
});

test("non-interactive init CLI succeeds in a copied starter with all required fields", () => {
  const repoRoot = copyStarterRepo();
  const result = runInitCli(repoRoot, [
    "--non-interactive",
    "--project-name",
    "CI Starter Project",
    "--project-slug",
    "ci-starter-project",
    "--user-goal",
    "사용자가 CI 초기화 경로를 검증한다.",
    "--ops-goal",
    "운영자가 생성된 상태와 다음 행동을 확인한다.",
    "--approval-goal",
    "PLN-00과 PLN-01을 닫기 전 baseline을 확인한다.",
    "--profiles",
    "none"
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assertNoUnexpectedStderr(result.stderr);
  assert.match(result.stdout, /Standard harness starter initialized/);
  assert.equal(inspectStarterInitializationState(repoRoot).status, "initialized");

  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.name, "ci-starter-project");
});

test("non-interactive init CLI fails fast with an exact example when required fields are missing", () => {
  const repoRoot = copyStarterRepo();
  const result = runInitCli(repoRoot, ["--non-interactive", "--project-name", "Missing Goals"]);

  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Non-interactive initialization requires explicit project goals/);
  assert.match(result.stderr, /- Missing: --user-goal, --ops-goal, --approval-goal/);
  assert.match(
    result.stderr,
    /npm run harness:init -- --non-interactive --project-name "Missing Goals" --project-slug "missing-goals" --user-goal "<user goal>" --ops-goal "<operator goal>" --approval-goal "<approval goal>" --profiles PRF-10/
  );
});

function copyStarterRepo({ reset = true } = {}) {
  const sourceRoot = detectStarterSource();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "standard-harness-init-"));
  fs.cpSync(sourceRoot, repoRoot, {
    recursive: true,
    filter: (src) => !path.normalize(src).split(path.sep).some((part) => (
      part === "node_modules" ||
      part === ".git" ||
      part === ".expo" ||
      part.startsWith(".tmp-")
    ))
  });
  if (reset) {
    resetCopiedStarterToFreshState(repoRoot);
  }
  return repoRoot;
}

function detectStarterSource() {
  const repoRoot = path.resolve(TEST_DIR, "..", "..");
  const nestedStarter = path.join(repoRoot, "standard-template");
  if (fs.existsSync(path.join(nestedStarter, "AGENTS.md"))) {
    return nestedStarter;
  }
  return repoRoot;
}

function createClock(startIso) {
  let offset = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + offset++ * 1000).toISOString();
}

function runInitCli(repoRoot, args) {
  return spawnSync(process.execPath, [path.join(repoRoot, ".agents", "scripts", "init-project.js"), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 10_000
  });
}

function resetCopiedStarterToFreshState(repoRoot) {
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md"),
    `# Current State

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
- No handoff has been recorded yet.
`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"),
    `# Task List

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
- No handoff has been recorded yet.
`,
    "utf8"
  );
  removeCopiedStarterRuntimeArtifacts(repoRoot);
}

function removeCopiedStarterRuntimeArtifacts(repoRoot) {
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(path.join(repoRoot, ".harness", `operating_state.sqlite${suffix}`), { force: true });
  }
  fs.rmSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"), { force: true });
  fs.rmSync(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.md"), { force: true });
  fs.rmSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.json"), { force: true });
  fs.rmSync(path.join(repoRoot, ".agents", "artifacts", "VALIDATION_REPORT.md"), { force: true });

  for (const relativeDir of [
    path.join(".agents", "runtime", "generated-state-docs"),
    path.join(".agents", "runtime", "agent-traces")
  ]) {
    const targetDir = path.join(repoRoot, relativeDir);
    if (!fs.existsSync(targetDir)) {
      continue;
    }
    for (const entry of fs.readdirSync(targetDir)) {
      fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
    }
  }

  const packetsDir = path.join(repoRoot, "reference", "packets");
  if (!fs.existsSync(packetsDir)) {
    return;
  }
  for (const entry of fs.readdirSync(packetsDir)) {
    if (entry === "README.md" || entry.endsWith("_TEMPLATE.md")) {
      continue;
    }
    fs.rmSync(path.join(packetsDir, entry), { recursive: true, force: true });
  }
}
