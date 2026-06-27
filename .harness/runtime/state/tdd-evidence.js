import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  normalizePacketHeaderValue,
  readPacketBulletFieldValueFromContent,
  sliceSection
} from "./lib/packet-markdown.js";

const TDD_SECTION = "## TDD Evidence Contract";
const MODE_VALUES = new Set(["required", "exempt", "not-applicable", "not_applicable", "not-needed", "not_needed"]);
const RED_FAILURE_KINDS = new Set(["expected-behavior-failure", "expected-regression-failure", "expected-contract-failure", "expected-test-failure"]);
const BEHAVIOR_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".java", ".kt", ".kts", ".go", ".rs", ".cs", ".php", ".rb", ".swift", ".sql"
]);

export function evaluateTddEvidenceContract({ repoRoot = process.cwd(), content = "", stage = "planning-open", changedFiles = [] } = {}) {
  const section = sliceSection(content, TDD_SECTION) ?? content;
  const fields = {
    mode: normalizeMode(readField(section, "TDD mode") ?? readField(section, "TDD contract mode")),
    redTestFile: readField(section, "Red test file"),
    redCommand: readField(section, "Red command"),
    redExitCode: readField(section, "Red exit code"),
    redFailureKind: normalizeMode(readField(section, "Red failure kind")),
    redRanAt: readField(section, "Red ran at"),
    redOutputExcerpt: readField(section, "Red output excerpt"),
    redOutputArtifact: stripTicks(readField(section, "Red output artifact")),
    redOutputSha256: readField(section, "Red output sha256"),
    greenCommand: readField(section, "Green command"),
    greenExitCode: readField(section, "Green exit code"),
    greenRanAt: readField(section, "Green ran at"),
    greenOutputExcerpt: readField(section, "Green output excerpt"),
    greenOutputArtifact: stripTicks(readField(section, "Green output artifact")),
    greenOutputSha256: readField(section, "Green output sha256"),
    refactorVerified: readField(section, "Refactor verified"),
    behaviorLevelTest: readField(section, "Behavior-level test"),
    testOnlyProductionHook: readField(section, "Test-only production hook"),
    productionCodeWrittenFirst: readField(section, "Production code written first"),
    productionFirstRemediation: readField(section, "Production-first remediation"),
    exceptionReason: readField(section, "TDD exception reason"),
    approvedBy: readField(section, "TDD approved by")
  };
  const behaviorFiles = changedFiles.filter(isBehaviorBearingFile);
  const behaviorChange = behaviorFiles.length > 0;
  const required = behaviorChange || fields.mode === "required";
  const diagnostics = [];
  const closeout = stage === "closeout";

  if (!fields.mode && behaviorChange) {
    diagnostics.push(diagnostic({ field: "TDD mode", status: closeout ? "block" : "hold", current: "missing", expected: "required | exempt | not-applicable", message: "Behavior-bearing changed files require an explicit TDD mode before closeout." }));
  }

  if (fields.mode && !MODE_VALUES.has(fields.mode)) {
    diagnostics.push(diagnostic({ field: "TDD mode", status: closeout ? "block" : "hold", current: fields.mode, expected: "required | exempt | not-applicable", message: `TDD mode ${fields.mode} is not recognized.` }));
  }

  if (fields.mode === "required" || (!fields.mode && required)) {
    for (const [field, label] of [
      [fields.redTestFile, "Red test file"],
      [fields.redCommand, "Red command"],
      [fields.redExitCode, "Red exit code"],
      [fields.redFailureKind, "Red failure kind"],
      [fields.redRanAt, "Red ran at"],
      [fields.redOutputExcerpt, "Red output excerpt"],
      [fields.redOutputArtifact, "Red output artifact"],
      [fields.greenCommand, "Green command"],
      [fields.greenExitCode, "Green exit code"],
      [fields.greenRanAt, "Green ran at"],
      [fields.greenOutputExcerpt, "Green output excerpt"],
      [fields.greenOutputArtifact, "Green output artifact"],
      [fields.behaviorLevelTest, "Behavior-level test"],
      [fields.testOnlyProductionHook, "Test-only production hook"]
    ]) {
      if (!isClosedValue(field)) {
        diagnostics.push(diagnostic({ field: label, status: closeout ? "block" : "hold", current: field || "missing", expected: "closed RED/GREEN execution evidence", message: `${label} is required when TDD mode is required.` }));
      }
    }
    if (fields.redTestFile && !relativeFileExists(repoRoot, fields.redTestFile)) {
      diagnostics.push(diagnostic({ field: "Red test file", status: closeout ? "block" : "hold", current: fields.redTestFile, expected: "existing repository-relative test file", message: `Red test file does not exist: ${fields.redTestFile}.` }));
    }
    validateArtifact(repoRoot, fields.redOutputArtifact, fields.redOutputSha256, diagnostics, closeout, "Red output artifact");
    validateArtifact(repoRoot, fields.greenOutputArtifact, fields.greenOutputSha256, diagnostics, closeout, "Green output artifact");
    validateRedExitCode(fields.redExitCode, diagnostics, closeout);
    validateGreenExitCode(fields.greenExitCode, diagnostics, closeout);
    validateRedFailureKind(fields.redFailureKind, diagnostics, closeout);
    validateTddOrder(fields.redRanAt, fields.greenRanAt, diagnostics, closeout);
    if (!isPositive(fields.refactorVerified)) {
      diagnostics.push(diagnostic({ field: "Refactor verified", status: closeout ? "block" : "hold", current: fields.refactorVerified || "missing", expected: "yes | true | pass | not-needed", message: "Refactor verification must be closed after GREEN." }));
    }
    if (!isPositive(fields.behaviorLevelTest)) {
      diagnostics.push(diagnostic({ field: "Behavior-level test", status: closeout ? "block" : "hold", current: fields.behaviorLevelTest || "missing", expected: "yes | true | verified", message: "TDD evidence must confirm behavior-level testing, not only implementation-detail assertions." }));
    }
    if (!isNegative(fields.testOnlyProductionHook)) {
      diagnostics.push(diagnostic({ field: "Test-only production hook", status: closeout ? "block" : "hold", current: fields.testOnlyProductionHook || "missing", expected: "no | false | none", message: "TDD evidence must not rely on test-only production hooks." }));
    }
    if (isPositive(fields.productionCodeWrittenFirst) && !isClosedValue(fields.productionFirstRemediation)) {
      diagnostics.push(diagnostic({ field: "Production-first remediation", status: closeout ? "block" : "hold", current: fields.productionFirstRemediation || "missing", expected: "deleted/restarted or explicitly reworked under RED/GREEN evidence", message: "Production-first TDD violation requires remediation evidence before closeout." }));
    }
  }

  if (fields.mode === "exempt") {
    if (!isClosedValue(fields.exceptionReason)) diagnostics.push(diagnostic({ field: "TDD exception reason", status: closeout ? "block" : "hold", current: fields.exceptionReason || "missing", expected: "explicit exception rationale", message: "TDD exemption requires an exception reason." }));
    if (!isClosedValue(fields.approvedBy)) diagnostics.push(diagnostic({ field: "TDD approved by", status: closeout ? "block" : "hold", current: fields.approvedBy || "missing", expected: "reviewer or owner approval", message: "TDD exemption requires an approver." }));
  }

  if (["not-applicable", "not_applicable", "not-needed", "not_needed"].includes(fields.mode) && behaviorChange) {
    diagnostics.push(diagnostic({ field: "TDD mode", status: closeout ? "block" : "hold", current: fields.mode, expected: "required or exempt for behavior-bearing code", message: "Behavior-bearing changes cannot use TDD not-applicable without an approved exemption." }));
  }

  return {
    schemaVersion: "standard-harness-tdd-evidence/v2.2",
    ok: diagnostics.every((item) => item.status !== "block"),
    required,
    behaviorChange,
    behaviorFiles,
    fields,
    diagnostics,
    blocking: closeout && diagnostics.length > 0
  };
}

function readField(content, label) { return readPacketBulletFieldValueFromContent(content, label); }
function normalizeMode(value) { const normalized = normalizePacketHeaderValue(value ?? ""); return normalized || null; }
function stripTicks(value) { return value ? String(value).trim().replace(/^`|`$/g, "") : null; }

function validateRedExitCode(value, diagnostics, closeout) {
  const code = Number(value);
  if (!Number.isInteger(code) || code === 0) {
    diagnostics.push(diagnostic({ field: "Red exit code", status: closeout ? "block" : "hold", current: value || "missing", expected: "non-zero exit code", message: "RED test must fail with a non-zero exit code before implementation." }));
  }
}

function validateGreenExitCode(value, diagnostics, closeout) {
  const code = Number(value);
  if (!Number.isInteger(code) || code !== 0) {
    diagnostics.push(diagnostic({ field: "Green exit code", status: closeout ? "block" : "hold", current: value || "missing", expected: "0", message: "GREEN verification must pass with exit code 0." }));
  }
}

function validateRedFailureKind(value, diagnostics, closeout) {
  if (!RED_FAILURE_KINDS.has(value)) {
    diagnostics.push(diagnostic({ field: "Red failure kind", status: closeout ? "block" : "hold", current: value || "missing", expected: [...RED_FAILURE_KINDS].join(" | "), message: "RED failure must be an expected behavior/regression/contract failure, not an incidental runtime error." }));
  }
}

function validateTddOrder(redRanAt, greenRanAt, diagnostics, closeout) {
  const red = parseDate(redRanAt);
  const green = parseDate(greenRanAt);
  if (!red) diagnostics.push(diagnostic({ field: "Red ran at", status: closeout ? "block" : "hold", current: redRanAt || "missing", expected: "parseable timestamp", message: "RED execution timestamp is missing or invalid." }));
  if (!green) diagnostics.push(diagnostic({ field: "Green ran at", status: closeout ? "block" : "hold", current: greenRanAt || "missing", expected: "parseable timestamp", message: "GREEN execution timestamp is missing or invalid." }));
  if (red && green && red.getTime() > green.getTime()) {
    diagnostics.push(diagnostic({ field: "RED before GREEN", status: closeout ? "block" : "hold", current: `${redRanAt} > ${greenRanAt}`, expected: "RED timestamp earlier than GREEN timestamp", message: "RED evidence must be captured before GREEN evidence." }));
  }
}

function validateArtifact(repoRoot, relativePath, expectedHash, diagnostics, closeout, label) {
  if (!relativePath) {
    diagnostics.push(diagnostic({ field: label, status: closeout ? "block" : "hold", current: "missing", expected: "repository-relative output log artifact", message: `${label} is required for replayable TDD evidence.` }));
    return;
  }
  const target = path.resolve(repoRoot, relativePath);
  const root = path.resolve(repoRoot);
  if (!target.startsWith(root) || !fs.existsSync(target)) {
    diagnostics.push(diagnostic({ field: label, status: closeout ? "block" : "hold", current: relativePath, expected: "existing repository-relative output log artifact", message: `${label} does not exist: ${relativePath}.` }));
    return;
  }
  if (isClosedValue(expectedHash)) {
    const actual = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
    if (actual !== String(expectedHash).trim().toLowerCase()) {
      diagnostics.push(diagnostic({ field: `${label} sha256`, status: "block", current: actual, expected: expectedHash, message: `${label} SHA-256 does not match recorded evidence hash.` }));
    }
  }
}

function isBehaviorBearingFile(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/").toLowerCase();
  if (!normalized || normalized.includes("/test") || normalized.includes("/tests") || normalized.includes("__tests__")) return false;
  if (/\.(md|mdx|txt|json|ya?ml|css|scss|png|jpg|jpeg|gif|svg)$/.test(normalized)) return false;
  return BEHAVIOR_EXTENSIONS.has(path.extname(normalized));
}
function relativeFileExists(repoRoot, relativePath) { const target = path.resolve(repoRoot, String(relativePath ?? "").replace(/^`|`$/g, "")); const root = path.resolve(repoRoot); return target.startsWith(root) && fs.existsSync(target); }
function isClosedValue(value) { const normalized = normalizePacketHeaderValue(value ?? ""); return Boolean(value) && !["pending", "draft", "todo", "tbd", "unknown", "missing", "fail", "hold"].includes(normalized); }
function isPositive(value) { const normalized = normalizePacketHeaderValue(value ?? ""); return ["yes", "true", "pass", "passed", "verified", "not-needed", "not_needed"].includes(normalized); }
function isNegative(value) { const normalized = normalizePacketHeaderValue(value ?? ""); return ["no", "false", "none", "not-needed", "not_needed"].includes(normalized); }
function parseDate(value) { if (!isClosedValue(value)) return null; const parsed = Date.parse(value); return Number.isFinite(parsed) ? new Date(parsed) : null; }
function diagnostic({ field, status, current, expected, message }) { return { field, status, current, expected, message, reason: message, code: "tdd_evidence_contract" }; }
