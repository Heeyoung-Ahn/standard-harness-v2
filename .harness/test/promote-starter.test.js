import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AUTHORITY_DENIAL,
  classifyPromotionPath,
  PROMOTION_BOUNDARY_CONTRACT
} from "../runtime/state/promotion-boundary.js";
import {
  auditStarterCandidate,
  buildPromotionPlan,
  verifyStarterCandidate,
  runPromoteStarterCommand
} from "../runtime/state/promote-starter.js";

function withTempDir(prefix, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFile(root, relativePath, content = "fixture\n") {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

test("promotion boundary includes reusable harness starter surfaces", () => {
  const included = [
    ".harness/runtime/state/harness-cli.js",
    ".harness/test/promote-starter.test.js",
    ".codex-plugin/plugin.json",
    ".agents/runtime/DOC_ROUTE.json",
    ".agents/runtime/HARNESS_ADAPTER_MANIFEST.json",
    ".agents/rules/entry.md",
    ".agents/scripts/init-project.js",
    ".agents/ssot/AI_OPERATING_CONTRACT.md",
    ".agents/workflows/implement.md",
    ".agents/skills/planning/SKILL.md",
    "reference/commands/COMMAND_TAXONOMY.md",
    "reference/manuals/human/getting-started.md",
    "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md",
    "reference/profiles/PRF-07_LIGHTWEIGHT_WEB_APP_PROFILE.md",
    "reference/runtime/STARTER_SEED_AND_GENERATED_STATE.md",
    "reference/reports/README.md",
    "reference/schemas/evidence.schema.json",
    "reference/artifacts/API_CONTRACT.md",
    "START_HERE.md",
    "AGENTS.md",
    "README.md"
  ];

  for (const candidate of included) {
    const result = classifyPromotionPath(candidate);
    assert.equal(result.decision, "include", `${candidate} should be included`);
    assert.equal(result.validationKind, "starter_promotion_boundary");
  }
});

test("promotion boundary reviews or excludes project-specific planning and governance memory", () => {
  const excluded = [
    "reference/planning/2026-06-15_OFFICE_PC_RESTART_HANDOFF.md",
    "reference/planning/PRODUCT-PKB-001.md",
    "reference/packets/OPS-HARNESS-01_SKILL_ROUTING_AND_STARTER_BOUNDARY.md",
    "reference/evidence/OPS-HARNESS-01/walkthrough.md"
  ];

  for (const candidate of excluded) {
    const result = classifyPromotionPath(candidate);
    assert.equal(result.decision, "exclude", `${candidate} should be excluded`);
    assert.match(result.reason, /project-specific|evidence|contamination/i);
  }

  const reviewed = [
    ".agents/artifacts/REQUIREMENTS.md",
    ".agents/artifacts/IMPLEMENTATION_PLAN.md",
    ".agents/artifacts/PREVENTIVE_MEMORY.md",
    "reference/planning/PLN-00_DEEP_INTERVIEW.md"
  ];

  for (const candidate of reviewed) {
    const result = classifyPromotionPath(candidate);
    assert.equal(result.decision, "review", `${candidate} should require manual review`);
    assert.match(result.reviewKind, /governance|planning|starter_template/);
  }
});

test("promotion boundary excludes future product project contamination", () => {
  const excluded = [
    "src/app/page.tsx",
    "app/product/customer.ts",
    ".agents/runtime/ACTIVE_CONTEXT.json",
    ".harness/packets/active/PKT-001.md",
    ".harness/reports/security/SECURITY_REVIEW.md",
    "reference/evidence/manifests/PKT-001.json",
    ".agents/artifacts/VALIDATION_REPORT.json",
    ".harness/operating_state.sqlite",
    ".harness/cache/session.json",
    "docs/requirements/PRODUCT_REQUIREMENTS.md",
    ".env",
    ".env.local",
    "browser-session.json",
    "raw-transcript.md"
  ];

  for (const candidate of excluded) {
    const result = classifyPromotionPath(candidate);
    assert.equal(result.decision, "exclude", `${candidate} should be excluded`);
  }
});

test("promotion boundary deny rules override include rules", () => {
  const result = classifyPromotionPath("reference/artifacts/raw-transcript.md");
  assert.equal(result.decision, "exclude");
  assert.match(result.reason, /contamination|secret|transcript|runtime/i);
});

test("promotion boundary treats package json as harness-script merge surface", () => {
  const result = classifyPromotionPath("package.json");
  assert.equal(result.decision, "review");
  assert.equal(result.reviewKind, "package_json_harness_scripts");
  assert.match(result.reason, /harness scripts/i);
});

test("promotion boundary exposes no-authority metadata", () => {
  assert.equal(PROMOTION_BOUNDARY_CONTRACT.schemaVersion, "1.0");
  assert.equal(AUTHORITY_DENIAL.grantsReleaseApproval, false);
  assert.equal(AUTHORITY_DENIAL.grantsPublishApproval, false);
  assert.equal(AUTHORITY_DENIAL.grantsImplementationApproval, false);
  assert.equal(AUTHORITY_DENIAL.grantsPacketCloseout, false);
  assert.equal(AUTHORITY_DENIAL.grantsRiskClosure, false);
  assert.equal(AUTHORITY_DENIAL.grantsProductVerification, false);
  assert.equal(AUTHORITY_DENIAL.grantsResidualRiskAcceptance, false);
});

test("promotion dry-run plans include exclude and review lanes without writing target", () => {
  withTempDir("promote-source-", (source) => {
    withTempDir("promote-target-", (targetParent) => {
      const target = path.join(targetParent, "starter");
      writeFile(source, ".harness/runtime/state/harness-cli.js");
      writeFile(source, ".agents/runtime/ACTIVE_CONTEXT.json", "{}");
      writeFile(source, "package.json", JSON.stringify({ scripts: { "harness:validate": "node ok.js", dev: "vite" } }));

      const result = runPromoteStarterCommand({ repoRoot: source, args: ["--dry-run", "--to", target] });

      assert.equal(result.ok, true);
      assert.equal(result.dryRun, true);
      assert.equal(fs.existsSync(target), false);
      assert.deepEqual(result.summary, { include: 1, exclude: 1, review: 1 });
      assert.equal(result.authority.grantsReleaseApproval, false);
    });
  });
});

test("promotion export writes only reusable starter files and placeholders to safe target", () => {
  withTempDir("promote-source-", (source) => {
    withTempDir("promote-target-", (targetParent) => {
      const target = path.join(targetParent, "starter");
      writeFile(source, ".harness/runtime/state/harness-cli.js", "export const ok = true;\n");
      writeFile(source, ".harness/test/example.test.js");
      writeFile(source, ".codex-plugin/plugin.json", "{}");
      writeFile(source, ".agents/artifacts/REQUIREMENTS.md");
      writeFile(source, ".agents/rules/entry.md");
      writeFile(source, ".agents/scripts/init-project.js");
      writeFile(source, ".agents/ssot/AI_OPERATING_CONTRACT.md");
      writeFile(source, ".agents/runtime/ACTIVE_CONTEXT.json", "{}");
      writeFile(source, "reference/commands/COMMAND_TAXONOMY.md");
      writeFile(source, "src/product.js");
      writeFile(source, "README.md", "# Product project with improved harness\n");
      writeFile(source, "package.json", JSON.stringify({
        name: "product-project",
        scripts: {
          pretest: "node .harness/runtime/state/check-node-version.js",
          test: "node --test .harness/test/*.test.js",
          "harness:validate": "node .harness/runtime/state/harness-cli.js validate",
          "browser:evidence:prompt": "node .harness/runtime/state/harness-cli.js browser-evidence prompt",
          dev: "vite"
        },
        dependencies: { vite: "latest" }
      }));

      const result = runPromoteStarterCommand({ repoRoot: source, args: ["--to", target] });

      assert.equal(result.ok, true);
      assert.equal(fs.existsSync(path.join(source, ".agents/runtime/ACTIVE_CONTEXT.json")), true);
      assert.equal(fs.existsSync(path.join(target, ".harness/runtime/state/harness-cli.js")), true);
      assert.equal(fs.existsSync(path.join(target, ".harness/test/example.test.js")), true);
      assert.equal(fs.existsSync(path.join(target, ".codex-plugin/plugin.json")), true);
      assert.equal(fs.existsSync(path.join(target, ".agents/artifacts/REQUIREMENTS.md")), true);
      assert.notEqual(
        fs.readFileSync(path.join(target, ".agents/artifacts/REQUIREMENTS.md"), "utf8"),
        "fixture\n"
      );
      assert.match(
        fs.readFileSync(path.join(target, ".agents/artifacts/CURRENT_STATE.md"), "utf8"),
        /Current Stage: not started/
      );
      assert.equal(fs.existsSync(path.join(target, ".agents/rules/entry.md")), true);
      assert.equal(fs.existsSync(path.join(target, ".agents/scripts/init-project.js")), true);
      assert.equal(fs.existsSync(path.join(target, ".agents/ssot/AI_OPERATING_CONTRACT.md")), true);
      assert.equal(fs.existsSync(path.join(target, "reference/commands/COMMAND_TAXONOMY.md")), true);
      assert.equal(fs.existsSync(path.join(target, ".agents/runtime/ACTIVE_CONTEXT.json")), false);
      assert.equal(fs.existsSync(path.join(target, "src/product.js")), false);
      assert.equal(fs.existsSync(path.join(target, ".agents/runtime/.gitkeep")), true);
      const exportedPackage = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
      assert.deepEqual(Object.keys(exportedPackage.scripts), [
        "pretest",
        "test",
        "harness:validate",
        "browser:evidence:prompt"
      ]);
      assert.equal(exportedPackage.dependencies, undefined);
    });
  });
});

test("promotion export blocks unsafe target paths", () => {
  withTempDir("promote-source-", (source) => {
    writeFile(source, "README.md", "# source\n");
    const missing = runPromoteStarterCommand({ repoRoot: source, args: [] });
    assert.equal(missing.ok, false);
    assert.match(missing.nextAction, /--to/);

    const sourceTarget = runPromoteStarterCommand({ repoRoot: source, args: ["--to", source] });
    assert.equal(sourceTarget.ok, false);
    assert.match(sourceTarget.nextAction, /separate target/i);

    const nonEmptyTarget = path.join(source, "existing-target");
    fs.mkdirSync(nonEmptyTarget);
    writeFile(nonEmptyTarget, "README.md", "occupied\n");
    const nonEmpty = runPromoteStarterCommand({ repoRoot: source, args: ["--to", nonEmptyTarget] });
    assert.equal(nonEmpty.ok, false);
    assert.match(nonEmpty.nextAction, /--force/);
  });
});

test("contamination audit passes clean starter candidate with provenance marker", () => {
  withTempDir("promote-clean-", (candidate) => {
    writeFile(candidate, "README.md", "# clean\n");
    writeFile(candidate, ".harness/runtime/state/harness-cli.js");
    writeFile(candidate, ".harness/promotion/EXPORT_PROVENANCE.json", JSON.stringify({ source: "fixture" }));

    const audit = auditStarterCandidate({ candidateRoot: candidate });

    assert.equal(audit.ok, true);
    assert.equal(audit.decision, "pass");
    assert.equal(audit.summary.block, 0);
    assert.equal(audit.summary.hold, 0);
    assert.equal(audit.authority.grantsReleaseApproval, false);
  });
});

test("contamination audit blocks product runtime evidence and secret contamination", () => {
  withTempDir("promote-contaminated-", (candidate) => {
    writeFile(candidate, "src/product.js");
    writeFile(candidate, ".agents/runtime/ACTIVE_CONTEXT.json", "{}");
    writeFile(candidate, "reference/evidence/manifests/PKT-001.json", "{}");
    writeFile(candidate, ".env.local", "TOKEN=secret\n");
    writeFile(candidate, "raw-transcript.md", "session text\n");
    writeFile(candidate, ".harness/promotion/EXPORT_PROVENANCE.json", JSON.stringify({ source: "fixture" }));

    const audit = auditStarterCandidate({ candidateRoot: candidate });

    assert.equal(audit.ok, false);
    assert.equal(audit.decision, "block");
    assert.ok(audit.findings.some((finding) => finding.lane === "product_code"));
    assert.ok(audit.findings.some((finding) => finding.lane === "runtime_state"));
    assert.ok(audit.findings.some((finding) => finding.lane === "evidence_report"));
    assert.ok(audit.findings.some((finding) => finding.lane === "secret_session_transcript"));
  });
});

test("contamination audit holds when export provenance is missing", () => {
  withTempDir("promote-missing-provenance-", (candidate) => {
    writeFile(candidate, "README.md", "# no provenance\n");

    const audit = auditStarterCandidate({ candidateRoot: candidate });

    assert.equal(audit.ok, false);
    assert.equal(audit.decision, "hold");
    assert.ok(audit.findings.some((finding) => finding.lane === "provenance"));
  });
});

test("fresh starter verification keeps reusable payload and initialized project lanes separate", () => {
  withTempDir("promote-verify-", (candidate) => {
    const calls = [];
    const result = verifyStarterCandidate({
      candidateRoot: candidate,
      runCommand: (step) => {
        calls.push(step.command);
        return { exitCode: 0, stdout: "ok", stderr: "" };
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.decision, "pass");
    assert.deepEqual(
      result.lanes.map((lane) => lane.lane),
      [
        "reusable_payload",
        "reusable_payload",
        "reusable_payload",
        "reusable_payload",
        "initialized_project",
        "initialized_project",
        "initialized_project",
        "initialized_project"
      ]
    );
    assert.deepEqual(calls, [
      "npm install",
      "npm test",
      "npm run harness:payload-boundary",
      "npm run harness:validate",
      'npm run harness:init -- --non-interactive --project-name "Promoted Starter Smoke" --project-slug "promoted-starter-smoke" --user-goal "Verify promoted starter" --ops-goal "Verify harness promotion workflow" --approval-goal "Keep approval boundaries explicit" --profiles none',
      "npm run harness:sync-state",
      "npm run harness:validate",
      "npm run harness:status"
    ]);
    assert.equal(result.authority.grantsProductVerification, false);
  });
});

test("fresh starter verification accepts pre-init validate bootstrap hold only for clean starter lane", () => {
  withTempDir("promote-verify-bootstrap-", (candidate) => {
    const result = verifyStarterCandidate({
      candidateRoot: candidate,
      runCommand: (step) => {
        if (step.validationKind === "starter_pre_init_bootstrap_hold") {
          return { exitCode: 1, stdout: '{"code":"starter_bootstrap_pending"}', stderr: "" };
        }
        return { exitCode: 0, stdout: "ok", stderr: "" };
      }
    });

    assert.equal(result.ok, true);
    const bootstrapLane = result.lanes.find((lane) => lane.validationKind === "starter_pre_init_bootstrap_hold");
    assert.equal(bootstrapLane.status, "pass");
    assert.equal(bootstrapLane.expectedHold, true);
    assert.equal(bootstrapLane.exitCode, 1);
  });
});

test("fresh starter verification blocks on first failing command", () => {
  withTempDir("promote-verify-fail-", (candidate) => {
    const result = verifyStarterCandidate({
      candidateRoot: candidate,
      runCommand: (step) => {
        if (step.command === "npm test") {
          return { exitCode: 1, stdout: "", stderr: "tests failed" };
        }
        return { exitCode: 0, stdout: "ok", stderr: "" };
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.decision, "block");
    assert.equal(result.lanes.find((lane) => lane.command === "npm test").status, "block");
    assert.match(result.nextAction, /Fix npm test/);
  });
});

test("starter promotion workflow is documented for human operators", () => {
  const repoRoot = process.cwd();
  const manualPath = path.join(repoRoot, "reference/manuals/human/starter-promotion.md");
  assert.equal(fs.existsSync(manualPath), true);
  const manual = fs.readFileSync(manualPath, "utf8");

  assert.match(manual, /future product project/i);
  assert.match(manual, /npm run harness:promote-starter -- --to <new-clean-starter-path>/);
  assert.match(manual, /--dry-run/);
  assert.match(manual, /--force/);
  assert.match(manual, /--verify/);
  assert.match(manual, /source product project/i);
  assert.match(manual, /target clean starter candidate/i);
  assert.match(manual, /include/i);
  assert.match(manual, /exclude/i);
  assert.match(manual, /review/i);
  assert.match(manual, /contamination audit/i);
  assert.match(manual, /fresh starter verification/i);
  assert.match(
    manual,
    /does not grant release, publish, approval, closeout, risk closure, product verification, or residual-risk acceptance/i
  );
});

test("starter promotion command is discoverable from entry manuals", () => {
  const repoRoot = process.cwd();
  const docs = [
    "START_HERE.md",
    "README.md",
    "reference/manuals/MANUAL_INDEX.md",
    "reference/manuals/human/commands.md"
  ];

  for (const doc of docs) {
    const text = fs.readFileSync(path.join(repoRoot, doc), "utf8");
    assert.match(text, /harness:promote-starter/, `${doc} should mention harness:promote-starter`);
    assert.match(text, /starter-promotion\.md/, `${doc} should link starter-promotion.md`);
  }
});
