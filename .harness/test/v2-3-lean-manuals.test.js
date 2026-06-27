import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import {
  auditDocumentPolicies,
  buildDocRoute,
  classifyLane,
  runV23Command
} from "../runtime/state/v2-3-lean-manuals.js";

const starterRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(starterRoot, relativePath), "utf8");
}

test("v2.3 separates agent SSOT from Korean human manuals", () => {
  const aiContract = read(".agents/ssot/AI_OPERATING_CONTRACT.md");
  assert.match(aiContract, /audience: agent/);
  assert.match(aiContract, /authority: ssot/);
  assert.match(aiContract, /Do not auto-read human manuals/);

  const humanGuide = read("reference/manuals/human/HUMAN_GUIDE.md");
  assert.match(humanGuide, /audience: human/);
  assert.match(humanGuide, /language: ko/);
  assert.match(humanGuide, /llm_read_policy: never_auto_read/);
  assert.match(humanGuide, /사람 운영자/);
});



test("v2.3 keeps root START_HERE as canonical human start and manual under human path", () => {
  const rootStart = read("START_HERE.md");
  assert.match(rootStart, /ROOT_START_HERE/);
  assert.match(rootStart, /canonical_human_start: true/);
  assert.match(rootStart, /reference\/manuals\/human\/HARNESS_MANUAL\.md/);
  assert.match(rootStart, /\.agents\/ssot\/AI_OPERATING_CONTRACT\.md/);
  assert.equal(fs.existsSync(path.join(starterRoot, "reference/manuals/human/START_HERE.md")), false);

  const humanManual = read("reference/manuals/human/HARNESS_MANUAL.md");
  assert.match(humanManual, /HUMAN_HARNESS_MANUAL_FULL/);
  assert.match(humanManual, /audience: human/);
  assert.match(humanManual, /llm_read_policy: never_auto_read/);
  assert.match(humanManual, /AI 기본 read set/);
  assert.equal(fs.existsSync(path.join(starterRoot, "reference/manuals/HARNESS_MANUAL.md")), false);
});

test("v2.3 manual route never auto-reads human manuals", () => {
  const route = buildDocRoute({ lane: "light", phase: "implementation", risk: "low", changedFiles: ["src/example.js"] });
  assert.equal(route.read.includes(".agents/ssot/AI_OPERATING_CONTRACT.md"), true);
  assert.equal(route.read.some((entry) => entry.includes("reference/manuals/human")), false);
  assert.equal(route.read.includes("reference/manuals/human/HARNESS_MANUAL.md"), false);
  assert.equal(route.do_not_read.includes("START_HERE.md"), true);
  assert.equal(route.do_not_read.includes("reference/manuals/human/**"), true);
  assert.equal(route.budget.targetTokens, 1500);
});

test("v2.3 lane classifier keeps strict gates only where risk requires", () => {
  assert.equal(classifyLane({ changedFiles: ["README.md"], risk: "low" }), "micro");
  assert.equal(classifyLane({ changedFiles: ["src/view.js"], risk: "low" }), "light");
  assert.equal(classifyLane({ changedFiles: ["src/auth/roles.js"], risk: "normal" }), "strict");
  assert.equal(classifyLane({ changedFiles: ["deploy/rollback.md"], risk: "normal" }), "release");
  assert.equal(classifyLane({ changedFiles: ["src/app.js"], risk: "normal" }), "standard");
});

test("v2.3 context brief writes route and budget without using human manual as read set", () => {
  const temp = fs.mkdtempSync(path.join(starterRoot, ".tmp-v23-"));
  try {
    fs.mkdirSync(path.join(temp, ".agents", "runtime"), { recursive: true });
    fs.mkdirSync(path.join(temp, ".agents", "ssot"), { recursive: true });
    const result = runV23Command({ repoRoot: temp, outputDir: temp, args: ["context-brief", "--lane", "light", "--phase", "implementation", "--apply"] });
    assert.equal(result.ok, true);
    const route = JSON.parse(fs.readFileSync(path.join(temp, ".agents", "runtime", "DOC_ROUTE.json"), "utf8"));
    assert.equal(route.read.some((entry) => entry.includes("reference/manuals/human")), false);
    assert.equal(fs.existsSync(path.join(temp, ".agents", "runtime", "ACTIVE_CONTEXT.brief.md")), true);
    assert.equal(fs.existsSync(path.join(temp, ".harness", "operating_state.sqlite")), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("v2.3 lean packet creates lane-sized packet instead of full template", () => {
  const temp = fs.mkdtempSync(path.join(starterRoot, ".tmp-v23-packet-"));
  try {
    fs.mkdirSync(path.join(temp, "reference", "packets", "templates"), { recursive: true });
    fs.copyFileSync(path.join(starterRoot, "reference", "packets", "templates", "LIGHT_PACKET.md"), path.join(temp, "reference", "packets", "templates", "LIGHT_PACKET.md"));
    const result = runV23Command({ repoRoot: temp, outputDir: temp, args: ["packet", "--lane", "light", "--id", "PKT-LIGHT-01", "--title", "Small fix", "--apply"] });
    assert.equal(result.ok, true);
    const content = fs.readFileSync(path.join(temp, result.outputPath), "utf8");
    assert.match(content, /Light Packet/);
    assert.match(content, /Lane: light/);
    assert.doesNotMatch(content, /CSO\/security review required/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("v2.3 document policy audit blocks human manual auto-read", () => {
  const audit = auditDocumentPolicies({ repoRoot: starterRoot });
  assert.equal(audit.ok, true);
  assert.equal(audit.checks.filter((check) => check.severity === "error").length, 0);
});
