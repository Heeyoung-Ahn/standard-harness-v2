import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyOwnershipPath,
  evaluateChangeZoneClassification,
  readOwnershipMap
} from "../runtime/state/change-zone-map.js";

function createRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "change-zone-map-"));
  fs.mkdirSync(path.join(repoRoot, "reference", "artifacts"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "reference", "artifacts", "REPOSITORY_LAYOUT_OWNERSHIP.json"),
    JSON.stringify({
      schemaVersion: "test/v1",
      precedence: "most-specific wins",
      rules: [
        {
          pathPattern: ".harness/runtime/**",
          ownerLayer: "harness-runtime",
          defaultChangeZone: "core",
          routeImplication: "packet-path",
          productionEligibility: "allowed",
          exceptionRationale: "runtime is core"
        },
        {
          pathPattern: "src/api/**",
          ownerLayer: "product-api",
          defaultChangeZone: "load-bearing",
          routeImplication: "packet-path",
          productionEligibility: "allowed",
          exceptionRationale: "api is load-bearing"
        },
        {
          pathPattern: "src/**",
          ownerLayer: "product-source",
          defaultChangeZone: "padded",
          routeImplication: "fast-path-eligible",
          productionEligibility: "allowed",
          exceptionRationale: "product source is padded by default"
        },
        {
          pathPattern: "prototypes/**",
          ownerLayer: "prototype",
          defaultChangeZone: "prototype",
          routeImplication: "production-forbidden",
          productionEligibility: "forbidden-until-promoted",
          exceptionRationale: "prototype lane"
        }
      ]
    }, null, 2),
    "utf8"
  );
  return repoRoot;
}

test("ownership map deterministically resolves most-specific path pattern", () => {
  const repoRoot = createRepo();
  const ownershipMap = readOwnershipMap({ repoRoot });

  assert.equal(ownershipMap.ok, true);
  assert.equal(classifyOwnershipPath("src/components/Button.tsx", ownershipMap).defaultChangeZone, "padded");
  assert.equal(classifyOwnershipPath("src/api/reports.ts", ownershipMap).defaultChangeZone, "load-bearing");
  assert.equal(classifyOwnershipPath(".harness/runtime/state/packet-preflight.js", ownershipMap).defaultChangeZone, "core");
  assert.equal(classifyOwnershipPath("prototypes/demo/app.js", ownershipMap).routeImplication, "production-forbidden");
});

test("padded declaration blocks core or load-bearing changed paths", () => {
  const repoRoot = createRepo();
  const result = evaluateChangeZoneClassification({
    repoRoot,
    declaredChangeZone: "padded",
    changedFiles: [".harness/runtime/state/packet-preflight.js", "src/api/reports.ts"],
    requestedRouteClass: "fast-path"
  });

  assert.equal(result.ok, false);
  assert.equal(result.effectiveRouteClass, "packet-path");
  assert.equal(result.diagnostics.length, 2);
  assert.equal(result.diagnostics.every((diagnostic) => diagnostic.status === "block"), true);
  assert.match(result.errors.join("\n"), /ownership map expects core|ownership map expects load-bearing/);
});

test("unclassified paths default to packet-path promotion instead of padded", () => {
  const repoRoot = createRepo();
  const result = evaluateChangeZoneClassification({
    repoRoot,
    declaredChangeZone: "padded",
    changedFiles: ["unknown/tooling/file.txt"],
    requestedRouteClass: "fast-path"
  });

  assert.equal(result.ok, true);
  assert.equal(result.effectiveRouteClass, "packet-path");
  assert.equal(result.diagnostics[0].status, "promote");
  assert.equal(result.diagnostics[0].matchedRule, "unclassified");
});
