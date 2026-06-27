import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runTransition } from "../runtime/state/dev05-tooling.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { createClock, seedStandardRepo, writeOpsPacket, writeStateSurfaces } from "./dev05-test-helpers.js";

function createImplementationTransitionRepo({ challengeReview = "missing" } = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "transition-apply-safety-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-APPLY_SAFETY.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    packetTitle: "PKT-01 FLOW-APPLY Transition Apply Safety",
    workItemTitle: "FLOW-APPLY Transition Apply Safety"
  });
  if (challengeReview === "missing") {
    const absolutePacketPath = path.join(repoRoot, packetPath);
    const packet = fs.readFileSync(absolutePacketPath, "utf8");
    fs.writeFileSync(absolutePacketPath, packet.replace(/\n## Planner Packet Challenge Review[\s\S]*$/m, "\n"), "utf8");
  }

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-06-13T00:00:00.000Z") });
  store.setReleaseState({
    currentStage: "planning",
    releaseGateState: "open",
    currentFocus: "FLOW-APPLY transition apply safety",
    releaseGoal: "Prove blocked apply does not mutate state.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-APPLY",
    title: "Transition apply safety",
    status: "planning",
    owner: "planner",
    nextAction: "Run transition apply safety fixture.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved",
      deliveryRouteMode: "role-by-role"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-APPLY_SAFETY",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-APPLY transition apply safety packet",
    sourceRef: packetPath,
    metadata: {
      workItemId: "FLOW-APPLY"
    }
  });
  writeStateSurfaces({ store, repoRoot });
  const before = snapshotState({ store, repoRoot });
  store.close();
  return { repoRoot, dbPath, packetPath, before };
}

function snapshotState({ store, repoRoot }) {
  return {
    workItem: store.getWorkItem("FLOW-APPLY"),
    release: store.getReleaseState("current"),
    handoffs: store.listRecentHandoffs(20),
    currentState: readIfExists(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md")),
    taskList: readIfExists(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md")),
    activeContext: readIfExists(path.join(repoRoot, ".agents", "runtime", "ACTIVE_CONTEXT.json"))
  };
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

test("blocked implementation-transition apply names packet preflight and leaves state unchanged", () => {
  const { repoRoot, dbPath, before } = createImplementationTransitionRepo({ challengeReview: "missing" });

  const result = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["planner-to-developer", "--work-item", "FLOW-APPLY", "--apply"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.apply, false);
  assert.equal(result.transitionPreflight?.stage, "implementation-transition");
  assert.equal(result.transitionPreflight?.ok, false);
  assert.match(result.errors.join("\n"), /packet-preflight/i);
  assert.match(result.errors.join("\n"), /Planner Packet Challenge Review/);

  const store = createOperatingStateStore({ dbPath });
  const after = snapshotState({ store, repoRoot });
  store.close();

  assert.equal(after.workItem.owner, before.workItem.owner);
  assert.equal(after.workItem.status, before.workItem.status);
  assert.equal(after.workItem.nextAction, before.workItem.nextAction);
  assert.equal(after.release.currentStage, before.release.currentStage);
  assert.equal(after.release.currentFocus, before.release.currentFocus);
  assert.deepEqual(after.handoffs, before.handoffs);
  assert.equal(after.currentState, before.currentState);
  assert.equal(after.taskList, before.taskList);
  assert.equal(after.activeContext, before.activeContext);
});

test("successful implementation-transition apply still writes handoff and state", () => {
  const { repoRoot, dbPath, before } = createImplementationTransitionRepo({ challengeReview: "present" });

  const result = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: ["planner-to-developer", "--work-item", "FLOW-APPLY", "--apply"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.apply, true);
  assert.equal(result.transitionPreflight?.ok, true);

  const store = createOperatingStateStore({ dbPath });
  const after = snapshotState({ store, repoRoot });
  store.close();

  assert.equal(after.workItem.owner, "developer");
  assert.equal(after.workItem.status, "in_progress");
  assert.equal(after.release.currentStage, "implementation");
  assert.equal(after.handoffs.length, before.handoffs.length + 1);
});

test("explicit closeout preflight apply block leaves state unchanged", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "transition-closeout-safety-"));
  seedStandardRepo(repoRoot);
  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const packetPath = "reference/packets/PKT-01_FLOW-CLOSE_SAFETY.md";
  writeOpsPacket(repoRoot, packetPath, {
    gateProfile: "contract",
    includeManifest: true,
    readyForCode: "approved",
    closeoutRiskTier: "low-risk",
    packetTitle: "PKT-01 FLOW-CLOSE Transition Closeout Safety",
    workItemTitle: "FLOW-CLOSE Transition Closeout Safety"
  });

  const store = createOperatingStateStore({ dbPath, now: createClock("2026-06-13T00:10:00.000Z") });
  store.setReleaseState({
    currentStage: "verification",
    releaseGateState: "open",
    currentFocus: "FLOW-CLOSE closeout transition safety",
    releaseGoal: "Prove explicit closeout preflight block does not mutate state.",
    sourceRef: packetPath
  });
  store.upsertWorkItem({
    workItemId: "FLOW-CLOSE",
    title: "Transition closeout safety",
    status: "review",
    owner: "tester",
    nextAction: "Run explicit closeout preflight fixture.",
    sourceRef: packetPath,
    metadata: {
      gateProfile: "contract",
      readyForCode: "approved"
    }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_FLOW-CLOSE_SAFETY",
    path: packetPath,
    category: "task_packet",
    title: "FLOW-CLOSE transition closeout safety packet",
    sourceRef: packetPath,
    metadata: {
      workItemId: "FLOW-CLOSE"
    }
  });
  writeStateSurfaces({ store, repoRoot });
  const before = {
    workItem: store.getWorkItem("FLOW-CLOSE"),
    release: store.getReleaseState("current"),
    handoffs: store.listRecentHandoffs(20),
    currentState: readIfExists(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md")),
    taskList: readIfExists(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"))
  };
  store.close();

  const result = runTransition({
    repoRoot,
    dbPath,
    outputDir: repoRoot,
    args: [
      "tester-to-planner-low-risk-closeout",
      "--work-item",
      "FLOW-CLOSE",
      "--preflight-stage",
      "closeout",
      "--apply"
    ]
  });

  assert.equal(result.ok, false);
  assert.equal(result.apply, false);
  assert.equal(result.transitionPreflight?.stage, "closeout");
  assert.match(result.errors.join("\n"), /packet-preflight closeout blocked/);

  const afterStore = createOperatingStateStore({ dbPath });
  const after = {
    workItem: afterStore.getWorkItem("FLOW-CLOSE"),
    release: afterStore.getReleaseState("current"),
    handoffs: afterStore.listRecentHandoffs(20),
    currentState: readIfExists(path.join(repoRoot, ".agents", "artifacts", "CURRENT_STATE.md")),
    taskList: readIfExists(path.join(repoRoot, ".agents", "artifacts", "TASK_LIST.md"))
  };
  afterStore.close();

  assert.equal(after.workItem.owner, before.workItem.owner);
  assert.equal(after.workItem.status, before.workItem.status);
  assert.equal(after.release.currentStage, before.release.currentStage);
  assert.deepEqual(after.handoffs, before.handoffs);
  assert.equal(after.currentState, before.currentState);
  assert.equal(after.taskList, before.taskList);
});
