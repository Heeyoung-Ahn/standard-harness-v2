import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runValidator } from "../runtime/state/dev05-tooling.js";
import { createOperatingStateStore } from "../runtime/state/operating-state-store.js";
import { createClock, seedStandardRepo, writeStateSurfaces } from "./dev05-test-helpers.js";
import { seedProfileAwareValidatorFixtures, writeConcreteTaskPacketFixture } from "./profile-aware-validator-fixtures.js";

const BI_REQUIRED_FIELDS = new Set([
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
]);

function overwriteActiveProfilesForBi(repoRoot, packetPath) {
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"),
    [
      "# Active Profiles",
      "",
      "## Active Profile Table",
      "| Profile ID | Activation reason | Required evidence artifacts | Evidence status | Activated by | Activated at | Applies to packets |",
      "|---|---|---|---|---|---|---|",
      `| PRF-10 | BI analytical model and governance are implementation-critical | reference/artifacts/BI_DATA_SOURCE_INVENTORY.md, reference/artifacts/BI_METRIC_CATALOG.md, reference/artifacts/BI_SEMANTIC_MODEL.md, reference/artifacts/BI_REFRESH_AND_LINEAGE_PLAN.md, reference/artifacts/BI_DASHBOARD_GOVERNANCE.md | approved | planner | 2026-05-25T01:00:00.000Z | ${path.basename(packetPath, ".md")} |`
    ].join("\n"),
    "utf8"
  );
}

function seedBiValidationRepo({ fields = {} } = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dev05-bi-profile-"));
  seedStandardRepo(repoRoot);
  seedProfileAwareValidatorFixtures(repoRoot);

  const packetRef = writeConcreteTaskPacketFixture(repoRoot, {
    fileName: "PKT-01_BI_PROFILE_VALIDATOR_TEST.md",
    header: {
      "Ready For Code": "approved",
      "User-facing impact": "none",
      "Layer classification": "project packet",
      "Active profile dependencies": "PRF-10",
      "Profile evidence status": "approved",
      "UX archetype status": "not-needed",
      "UX deviation status": "none",
      "Environment topology status": "approved",
      "Domain foundation status": "approved",
      "Authoritative source intake status": "approved",
      "Shared-source wave status": "not-needed",
      "Packet exit gate status": "pending",
      "Improvement promotion status": "none",
      "Existing system dependency": "none",
      "New authoritative source impact": "analyzed",
      "Risk if started now": "low"
    },
    fields: {
      "Active profile references": "reference/profiles/PRF-10_BI_ANALYTICS_PLATFORM_PROFILE.md",
      "Profile composition rationale": "BI semantic and governance evidence is required before implementation.",
      "Active profile dependencies": "PRF-10",
      "Profile-specific evidence status": "approved",
      ...fields
    }
  });

  overwriteActiveProfilesForBi(repoRoot, packetRef);

  const dbPath = path.join(repoRoot, ".harness", "operating_state.sqlite");
  const store = createOperatingStateStore({ dbPath, now: createClock("2026-05-25T01:05:00.000Z") });
  store.setReleaseState({
    currentStage: "implementation",
    releaseGateState: "open",
    currentFocus: "OPS-39 BI optional profile validator enforcement",
    releaseGoal: "Enforce PRF-10 packet evidence when BI profile is active.",
    sourceRef: packetRef
  });
  store.upsertWorkItem({
    workItemId: "OPS-39",
    title: "BI optional profile validator enforcement",
    status: "in_progress",
    owner: "developer",
    nextAction: "Validate PRF-10 packet evidence before implementation.",
    sourceRef: packetRef,
    metadata: { gateProfile: "contract", readyForCode: "approved" }
  });
  store.upsertArtifact({
    artifactId: "PKT-01_BI_PROFILE_VALIDATOR_TEST",
    path: packetRef,
    category: "task_packet",
    title: "BI optional profile validator test packet",
    sourceRef: packetRef,
    metadata: { workItemId: "OPS-39" }
  });
  writeStateSurfaces({ store, repoRoot });
  store.close();

  return { repoRoot, dbPath };
}

test("validator accepts PRF-10 packets when all BI evidence fields are present", () => {
  const { repoRoot, dbPath } = seedBiValidationRepo();

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "task_packet_required_evidence_missing" &&
        BI_REQUIRED_FIELDS.has(finding.field)
    ),
    false
  );
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "active_profile_unknown" ||
        (finding.code === "profile_contract_file_missing" && finding.profileId === "PRF-10") ||
        (finding.code === "profile_contract_marker_missing" && finding.profileId === "PRF-10")
    ),
    false
  );
});

test("validator rejects PRF-10 packets when required BI evidence is missing", () => {
  const { repoRoot, dbPath } = seedBiValidationRepo({
    fields: {
      "BI metric catalog reference": ""
    }
  });

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });

  assert.equal(result.ok, false);
  assert.equal(
    result.findings.some(
      (finding) =>
        finding.code === "task_packet_required_evidence_missing" &&
        finding.field === "BI metric catalog reference"
    ),
    true
  );
});

test("validator explains malformed Active Profile Table columns", () => {
  const { repoRoot, dbPath } = seedBiValidationRepo();
  fs.writeFileSync(
    path.join(repoRoot, ".agents", "artifacts", "ACTIVE_PROFILES.md"),
    [
      "# Active Profiles",
      "",
      "## Active Profile Table",
      "| Profile ID | Activation reason | Evidence status |",
      "|---|---|---|",
      "| PRF-10 | BI profile | approved |"
    ].join("\n"),
    "utf8"
  );

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  const message = result.findings
    .filter((finding) => finding.code === "active_profile_table_malformed")
    .map((finding) => finding.message)
    .join("\n");

  assert.match(message, /Expected Active Profile Table columns/);
  assert.match(message, /Profile ID \| Activation reason \| Required evidence artifacts/);
  assert.match(message, /Preserve the reusable ## Active Profile Table template/);
});

test("validator explains optional profile reference path pattern", () => {
  const { repoRoot, dbPath } = seedBiValidationRepo({
    fields: {
      "Active profile references": "reference/profiles/PRF-09_NODE_FRONTEND_WEB_APP_PROFILE.md"
    }
  });

  const result = runValidator({ repoRoot, dbPath, outputDir: repoRoot });
  const message = result.findings
    .filter((finding) => finding.code === "task_packet_status_contract_mismatch")
    .map((finding) => finding.message)
    .join("\n");

  assert.match(message, /declares PRF-10/);
  assert.match(message, /reference\/profiles\/PRF-10_/);
});
