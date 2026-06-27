import fs from "node:fs";
import path from "node:path";

import { DEFAULT_DB_PATH } from "./operating-state-store.js";
import { withStore } from "./validation-core.js";

const DEFAULT_LEARNING_DIR = ".agents/learnings/solutions";
const CONCEPTS_PATH = ".agents/learnings/CONCEPTS.md";
const LEARNING_SCHEMA_VERSION = "standard-harness-learning-solution/v2.2";

export function runLearningCommand({ repoRoot = process.cwd(), outputDir = repoRoot, dbPath = DEFAULT_DB_PATH, args = [] } = {}) {
  const options = parseArgs(args);
  const result = buildLearningSolution({ repoRoot, outputDir, options });
  if (!result.ok || !options.apply) {
    return { command: "learning", apply: Boolean(options.apply), ...result };
  }
  fs.mkdirSync(path.dirname(result.absolutePath), { recursive: true });
  fs.writeFileSync(result.absolutePath, result.content, "utf8");
  ensureConceptsFile(repoRoot);
  withStore({ repoRoot, dbPath }, (store) => {
    store.upsertArtifact({
      artifactId: result.solutionId,
      path: result.solutionPath,
      category: "learning_solution",
      title: options.title ?? result.solutionId,
      sourceRef: options.packet,
      metadata: { workItemId: options.workItem, problemType: options.problemType ?? "implementation", v2Feature: "compound-learning", schemaVersion: LEARNING_SCHEMA_VERSION }
    });
    store.recordLearningSolution({
      solutionId: result.solutionId,
      sourcePacketId: options.packet,
      workItemId: options.workItem,
      problemType: options.problemType ?? "implementation",
      solutionPath: result.solutionPath,
      metadata: { title: options.title ?? result.solutionId, verification: options.verification ?? "pending", schemaVersion: LEARNING_SCHEMA_VERSION }
    });
  });
  return { command: "learning", apply: true, ...result, written: true, conceptsPath: CONCEPTS_PATH };
}

export function buildLearningSolution({ repoRoot = process.cwd(), outputDir = repoRoot, options = {} } = {}) {
  const errors = [];
  const packet = normalizeRelative(options.packet);
  const workItem = options.workItem ?? options.workItemId ?? null;
  if (!packet) errors.push("Missing --packet for compound learning solution note.");
  if (!workItem) errors.push("Missing --work-item for compound learning solution note.");
  const summary = options.summary ?? "pending";
  const verification = options.verification ?? "pending";
  const verificationCommand = options.verificationCommand ?? options.verification ?? "pending";
  const verificationExitCode = options.verificationExitCode ?? options.exitCode ?? "pending";
  const problemType = options.problemType ?? "implementation";
  const track = options.track ?? inferTrack(problemType);
  const status = options.status ?? "active";
  const moduleName = options.module ?? "pending";
  const component = options.component ?? "pending";
  const filesChanged = options.filesChanged ?? options.fileRefs ?? "pending";
  const rootCause = options.rootCause ?? "pending";
  const solutionId = options.solutionId ?? `SOL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${safeId(workItem ?? "PACKET")}`;
  const solutionPath = normalizeRelative(options.output ?? `${DEFAULT_LEARNING_DIR}/${solutionId}.md`);
  const absolutePath = path.resolve(outputDir, solutionPath);
  const root = path.resolve(repoRoot);
  if (!absolutePath.startsWith(root)) errors.push(`Learning solution path escapes repository root: ${solutionPath}.`);
  const content = renderSolutionNote({ solutionId, packet, workItem, problemType, summary, verification, verificationCommand, verificationExitCode, track, status, moduleName, component, filesChanged, rootCause, title: options.title });
  return { ok: errors.length === 0, errors, solutionId, solutionPath, absolutePath, content };
}

function renderSolutionNote({ solutionId, packet, workItem, problemType, summary, verification, verificationCommand, verificationExitCode, track, status, moduleName, component, filesChanged, rootCause, title }) {
  const now = new Date().toISOString();
  return [
    "---",
    `solution_id: ${solutionId}`,
    `source_packet_id: ${packet}`,
    `source_packet_path: ${packet}`,
    `work_item_id: ${workItem}`,
    `track: ${track}`,
    `problem_type: ${problemType}`,
    `module: ${moduleName}`,
    `component: ${component}`,
    `status: ${status}`,
    `root_cause: ${rootCause}`,
    `file_refs: ${filesChanged}`,
    `files_changed: ${filesChanged}`,
    `last_verified_at: ${verificationExitCode === "0" || verificationExitCode === 0 ? now : "pending"}`,
    `verification_command: ${verificationCommand}`,
    `verification_exit_code: ${verificationExitCode}`,
    `schema_version: ${LEARNING_SCHEMA_VERSION}`,
    "---",
    "",
    `# ${title ?? solutionId}`,
    "",
    "## Problem",
    summary,
    "",
    "## Root Cause",
    rootCause,
    "",
    "## Solution",
    summary,
    "",
    "## Verification",
    verification,
    "",
    "## Related Solutions",
    "- pending",
    "",
    "## Staleness Check",
    `- Last verified at: ${verificationExitCode === "0" || verificationExitCode === 0 ? now : "pending"}`,
    "- File refs exist: pending",
    "",
    "## Next Automation",
    "- pending"
  ].join("\n") + "\n";
}

function ensureConceptsFile(repoRoot) {
  const target = path.resolve(repoRoot, CONCEPTS_PATH);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "# Concepts\n\n> GENERATED/MAINTAINED learning index for compound closeout notes. Keep only stable vocabulary that improves retrieval.\n", "utf8");
}

function inferTrack(problemType) { return /bug|defect|incident|regression/i.test(problemType) ? "bug" : "knowledge"; }
function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) { options[key] = true; continue; }
    options[key] = next; index += 1;
  }
  return options;
}
function normalizeRelative(value) { return value ? String(value).replace(/\\/g, "/").replace(/^\.\//, "") : null; }
function safeId(value) { return String(value ?? "item").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toUpperCase(); }
