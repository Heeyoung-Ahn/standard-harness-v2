import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ACTIVE_CONTEXT_JSON, ACTIVE_CONTEXT_MARKDOWN, writeActiveContext } from "../runtime/state/active-context.js";
import { resolveRepairNextAction, runContextRepair } from "../runtime/state/context-repair.js";
import { writeGeneratedStateDocs } from "../runtime/state/generate-state-docs.js";
import { RECOVERY_REPORTS_DIR } from "../runtime/state/harness-paths.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { seedProfileAwareValidatorFixtures } from "./profile-aware-validator-fixtures.js";

test("context repair restores missing Active Context and writes report without DB mutation", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-context-repair-"));
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath,
    now: createClock("2026-05-13T09:00:00.000Z")
  });
  seedState(store);
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  const beforeMutation = store.getLatestMutationTimestamp();
  store.close();

  fs.unlinkSync(path.join(repoRoot, ACTIVE_CONTEXT_JSON));
  fs.unlinkSync(path.join(repoRoot, ACTIVE_CONTEXT_MARKDOWN));

  const result = runContextRepair({
    repoRoot,
    outputDir: repoRoot,
    dbPath,
    timestamp: "2026-05-13T10:00:00.000Z"
  });

  assert.equal(result.command, "context --repair");
  assert.equal(result.confidence, "High");
  assert.equal(result.report.validationStatus, "clean");
  assert.equal(result.report.authorityMutation, false);
  assert.equal(result.report.dbMutation, "none");
  assert.ok(fs.existsSync(path.join(repoRoot, ACTIVE_CONTEXT_JSON)));
  assert.ok(fs.existsSync(path.join(repoRoot, ACTIVE_CONTEXT_MARKDOWN)));
  assert.ok(fs.existsSync(result.reportPath));
  assert.ok(fs.existsSync(result.latestReportPath));
  assert.equal(path.basename(result.reportPath), "context-repair-2026-05-13T100000000Z.json");
  assert.equal(path.basename(result.latestReportPath), "latest-context-repair.json");
  assert.deepEqual(JSON.parse(fs.readFileSync(result.reportPath, "utf8")), result.report);

  const afterStore = createOperatingStateStore({ dbPath });
  assert.equal(afterStore.getLatestMutationTimestamp(), beforeMutation);
  afterStore.close();
});

test("context --repair CLI prints operator summary and writes persistent JSON report", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-context-repair-cli-"));
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  seedRepoFiles(repoRoot);

  const store = createOperatingStateStore({
    dbPath,
    now: createClock("2026-05-13T11:00:00.000Z")
  });
  seedState(store);
  writeGeneratedStateDocs({ store, outputDir: repoRoot });
  writeActiveContext({ store, repoRoot, outputDir: repoRoot });
  store.close();

  fs.unlinkSync(path.join(repoRoot, ACTIVE_CONTEXT_JSON));

  const cliPath = path.resolve(".harness", "runtime", "state", "dev05-cli.js");
  const result = spawnSync(process.execPath, [cliPath, "context", "--repair"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      REPO_ROOT: repoRoot,
      HARNESS_DB_PATH: dbPath
    },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Harness Context Repair/);
  assert.match(result.stdout, /- Confidence: High/);
  assert.match(result.stdout, /- DB mutation: none/);
  assert.ok(fs.existsSync(path.join(repoRoot, RECOVERY_REPORTS_DIR, "latest-context-repair.json")));
});

test("context repair suggests rerunning validation-report and context for low confidence", () => {
  const nextAction = resolveRepairNextAction({
    confidence: "Low",
    validation: {
      findings: [{ code: "source_ref_unresolved", severity: "error" }]
    }
  });

  assert.match(nextAction, /validation-report/);
  assert.match(nextAction, /context/);
  assert.match(nextAction, /manual maintainer action is required/i);
});

test("context repair suggests migration-apply when migration changes remain", () => {
  const nextAction = resolveRepairNextAction({
    confidence: "Medium",
    validation: {
      findings: [{ code: "migration_change_pending", severity: "error" }]
    }
  });

  assert.match(nextAction, /migration-apply/);
  assert.match(nextAction, /validation-report/);
  assert.match(nextAction, /context/);
});

function seedRepoFiles(repoRoot) {
  fs.mkdirSync(path.join(repoRoot, ".agents", "artifacts"), { recursive: true });
  for (const fileName of [
    "REQUIREMENTS.md",
    "ARCHITECTURE_GUIDE.md",
    "IMPLEMENTATION_PLAN.md",
    "CURRENT_STATE.md",
    "TASK_LIST.md",
    "ACTIVE_PROFILES.md"
  ]) {
    fs.writeFileSync(path.join(repoRoot, ".agents", "artifacts", fileName), `# ${fileName}\n`, "utf8");
  }
  seedProfileAwareValidatorFixtures(repoRoot);
}

function seedState(store) {
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "Context repair test",
    releaseGoal: "Restore missing derived re-entry files",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });
  store.upsertArtifact({
    artifactId: "requirements",
    path: ".agents/artifacts/REQUIREMENTS.md",
    category: "canonical_doc",
    title: "Requirements",
    sourceRef: ".agents/artifacts/REQUIREMENTS.md"
  });
}

function createClock(startIso) {
  let offset = 0;
  const base = Date.parse(startIso);
  return () => new Date(base + offset++ * 1000).toISOString();
}
