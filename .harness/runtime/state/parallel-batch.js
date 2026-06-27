import fs from "node:fs";
import path from "node:path";

import { readPacketBulletFieldValueFromContent, sliceSection } from "./lib/packet-markdown.js";

const PARALLEL_SECTION = "## Parallel Execution Plan";

export function evaluateParallelBatchPlan({ repoRoot = process.cwd(), content = "", stage = "planning-open" } = {}) {
  const section = sliceSection(content, PARALLEL_SECTION) ?? content;
  const planPath = stripTicks(readPacketBulletFieldValueFromContent(section, "Parallel batch plan path"));
  if (!planPath || isNotNeededPath(planPath)) {
    return { schemaVersion: "standard-harness-parallel-batch/v2.2", ok: true, present: false, diagnostics: [], blocking: false };
  }
  const closeout = stage === "closeout";
  const loaded = readJson(repoRoot, planPath);
  if (!loaded.ok) {
    const diag = buildDiagnostic({ field: "Parallel batch plan path", status: closeout ? "block" : "hold", current: planPath, expected: "readable batch JSON", message: loaded.error });
    return { schemaVersion: "standard-harness-parallel-batch/v2.2", ok: !closeout, present: true, planPath, diagnostics: [diag], blocking: closeout };
  }
  const diagnostics = validateBatch(loaded.plan, { repoRoot, closeout });
  return { schemaVersion: "standard-harness-parallel-batch/v2.2", ok: diagnostics.every((item) => item.status !== "block"), present: true, planPath, plan: loaded.plan, diagnostics, blocking: diagnostics.some((item) => item.status === "block") };
}

export function buildSerialParallelBatchPlan({
  packetPath,
  workItemId,
  evidenceOutput,
  files = [],
  unitId = null
} = {}) {
  const normalizedFiles = Array.isArray(files) ? files.map(normalizePath).filter(Boolean) : [];
  const normalizedWorkItemId = String(workItemId ?? "WORK-ITEM").trim();
  return {
    schema_version: "parallel-execution-plan/v1",
    batch_id: `${normalizedWorkItemId}-SERIAL`,
    packet_path: packetPath ?? null,
    work_item_id: normalizedWorkItemId,
    strategy: "serial",
    conflict_policy: {
      on_file_overlap: "serial_downgrade"
    },
    units: [
      {
        unit_id: unitId ?? `${normalizedWorkItemId}-serial`,
        files: {
          modify: normalizedFiles
        },
        actual_files: {
          touched: normalizedFiles
        },
        evidence_output: normalizePath(evidenceOutput) ?? evidenceOutput ?? null
      }
    ],
    dependency_graph_status: "not-needed; serial execution",
    actual_file_reconciliation: "pass",
    merge_after_test_evidence: "not-needed; serial execution",
    cleanup_evidence: "not-needed; serial execution",
    decision: "serial execution; no fan-out"
  };
}

function readJson(repoRoot, relativePath) {
  const normalized = normalizePath(relativePath);
  const root = path.resolve(repoRoot);
  const target = normalized ? path.resolve(root, normalized) : null;
  if (!normalized || !target || !isInside(root, target)) return { ok: false, error: `Parallel batch plan path escapes repository root: ${relativePath}.` };
  if (!fs.existsSync(target)) return { ok: false, error: `Parallel batch plan does not exist: ${relativePath}.` };
  try { return { ok: true, plan: JSON.parse(fs.readFileSync(target, "utf8")) }; }
  catch (error) { return { ok: false, error: `Parallel batch plan JSON is unreadable: ${error.message}.` }; }
}

function validateBatch(plan, { repoRoot, closeout }) {
  const diagnostics = [];
  const units = Array.isArray(plan.units) ? plan.units : [];
  const strategy = String(plan.strategy ?? "serial").trim().replace(/-/g, "_");
  const conflictPolicy = plan.conflict_policy ?? plan.conflictPolicy ?? {};
  if (units.length === 0) diagnostics.push(buildDiagnostic({ field: "parallel_batch.units", status: closeout ? "block" : "hold", current: "empty", expected: "one or more units", message: "Parallel batch plan must contain units." }));
  if (!["serial", "parallel_shared", "parallel_worktree"].includes(strategy)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.strategy", status: closeout ? "block" : "hold", current: strategy, expected: "serial | parallel_shared | parallel_worktree", message: "Parallel batch strategy is not recognized." }));

  const ownership = new Map();
  for (const unit of units) {
    const unitId = unit.unit_id ?? unit.unitId ?? "unknown-unit";
    const declaredFiles = collectFiles(unit.files ?? unit.declared_files ?? unit.declaredFiles);
    if (!unit.evidence_output && closeout) diagnostics.push(buildDiagnostic({ field: "parallel_batch.unit.evidence_output", status: "block", current: unitId, expected: "evidence_output path for each closeout unit", message: `Parallel unit ${unitId} must provide evidence_output at closeout.` }));
    for (const file of declaredFiles) {
      const previous = ownership.get(file) ?? [];
      previous.push(unitId);
      ownership.set(file, previous);
    }
    diagnostics.push(...validateActualFiles(unit, unitId, declaredFiles, closeout));
    if (strategy === "parallel_worktree" && !normalizePath(unit.worktree_path ?? unit.worktreePath)) {
      diagnostics.push(buildDiagnostic({ field: "parallel_batch.unit.worktree_path", status: closeout ? "block" : "hold", current: unitId, expected: "repository-relative worktree path", message: `Parallel worktree unit ${unitId} must declare worktree_path.` }));
    }
  }

  const overlaps = [...ownership.entries()].filter(([, unitIds]) => new Set(unitIds).size > 1);
  if (overlaps.length > 0) {
    const overlapSummary = overlaps.map(([file, unitIds]) => `${file}: ${[...new Set(unitIds)].join(",")}`);
    const policy = String(conflictPolicy.on_file_overlap ?? conflictPolicy.onFileOverlap ?? "block").replace(/-/g, "_");
    const safePolicy = policy === "serial_downgrade" || (policy === "require_worktree" && strategy === "parallel_worktree");
    diagnostics.push(buildDiagnostic({ field: "parallel_batch.file_overlap", status: safePolicy ? "hold" : "block", current: overlapSummary.join("; "), expected: "serial_downgrade or parallel_worktree with require_worktree", message: safePolicy ? "Parallel batch has file overlap; safe policy downgrades or requires worktree isolation." : "Parallel batch has file overlap without a safe conflict policy." }));
  }

  if (strategy !== "serial") {
    diagnostics.push(...validateBaseline(plan, closeout));
    diagnostics.push(...validateDependencyGraph(plan, closeout));
    diagnostics.push(...validateMergeEvidence(plan, closeout));
  }
  if (strategy === "parallel_worktree") {
    diagnostics.push(...validateWorktree(repoRoot, plan, units, closeout));
  }
  return diagnostics;
}

function validateBaseline(plan, closeout) {
  const diagnostics = [];
  const baseline = plan.baseline ?? {};
  const exitCode = Number(baseline.exit_code ?? baseline.exitCode);
  if (!baseline.command || !Number.isInteger(exitCode)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.baseline", status: closeout ? "block" : "hold", current: "missing", expected: "baseline.command and baseline.exit_code", message: "Parallel execution requires baseline test evidence before fan-out." }));
  else if (exitCode !== 0) diagnostics.push(buildDiagnostic({ field: "parallel_batch.baseline.exit_code", status: closeout ? "block" : "hold", current: String(exitCode), expected: "0", message: "Parallel execution cannot start from a failing baseline." }));
  return diagnostics;
}

function validateDependencyGraph(plan, closeout) {
  const edges = normalizeEdges(plan.dependency_graph?.edges ?? plan.dependencyGraph?.edges ?? []);
  const cycle = findCycle(edges);
  return cycle.length ? [buildDiagnostic({ field: "parallel_batch.dependency_graph", status: closeout ? "block" : "hold", current: cycle.join(" -> "), expected: "acyclic unit dependency graph", message: "Parallel batch dependency graph contains a cycle." })] : [];
}

function validateMergeEvidence(plan, closeout) {
  const diagnostics = [];
  const units = Array.isArray(plan.units) ? plan.units : [];
  const unitIds = new Set(units.map((unit) => String(unit.unit_id ?? unit.unitId ?? "").trim()).filter(Boolean));
  const merge = plan.merge ?? {};
  const order = Array.isArray(merge.order) ? merge.order.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  if (order.length === 0) {
    diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.order", status: closeout ? "block" : "hold", current: "missing/empty", expected: "ordered list of all unit ids", message: "Parallel batch must record the orchestrator merge order." }));
  } else {
    for (const unitId of unitIds) {
      if (!order.includes(unitId)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.order", status: closeout ? "block" : "hold", current: order.join(", "), expected: `includes ${unitId}`, message: `Merge order does not include parallel unit ${unitId}.` }));
    }
    for (const unitId of order) {
      if (!unitIds.has(unitId)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.order", status: closeout ? "block" : "hold", current: unitId, expected: "known unit id", message: `Merge order references unknown parallel unit ${unitId}.` }));
    }
  }

  const test = merge.after_each_merge_test ?? merge.afterEachMergeTest ?? merge.after_merge_test ?? merge.afterMergeTest;
  const exitCode = test ? Number(test.exit_code ?? test.exitCode) : null;
  if (!test || !test.command) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.after_each_merge_test.command", status: closeout ? "block" : "hold", current: "missing", expected: "post-merge test command", message: "Parallel batch must record post-merge test command evidence." }));
  if (!test || !Number.isInteger(exitCode)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.after_each_merge_test.exit_code", status: closeout ? "block" : "hold", current: test?.exit_code ?? test?.exitCode ?? "missing", expected: "0", message: "Parallel batch must record post-merge test exit code evidence." }));
  else if (exitCode !== 0) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.after_each_merge_test.exit_code", status: closeout ? "block" : "hold", current: String(exitCode), expected: "0", message: "Post-merge test evidence must pass." }));
  const conflicts = Array.isArray(merge.conflicts) ? merge.conflicts : [];
  if (conflicts.length > 0) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.conflicts", status: "block", current: conflicts.join(", "), expected: "no merge conflicts", message: "Parallel batch with conflicts must abort and rerun affected units serially." }));
  if (merge.cleanup_verified !== true && merge.cleanupVerified !== true) diagnostics.push(buildDiagnostic({ field: "parallel_batch.merge.cleanup_verified", status: closeout ? "block" : "hold", current: "missing/false", expected: "true", message: "Parallel batch must verify worktree/branch cleanup." }));
  return diagnostics;
}

function validateWorktree(repoRoot, plan, units, closeout) {
  const diagnostics = [];
  const worktree = plan.worktree ?? {};
  const rootPath = normalizePath(worktree.root);
  if (worktree.enabled !== true || !rootPath) diagnostics.push(buildDiagnostic({ field: "parallel_batch.worktree", status: closeout ? "block" : "hold", current: "missing", expected: "worktree.enabled true and worktree.root", message: "parallel_worktree strategy requires explicit worktree isolation." }));
  if (worktree.gitignored_verified !== true && worktree.gitignoredVerified !== true) diagnostics.push(buildDiagnostic({ field: "parallel_batch.worktree.gitignored_verified", status: closeout ? "block" : "hold", current: "missing/false", expected: "true", message: "Worktree root must be verified as gitignored." }));
  if (rootPath && fs.existsSync(path.join(repoRoot, ".gitignore"))) {
    const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
    const listed = gitignore.split(/\r?\n/).some((line) => line.trim().replace(/^\//, "").replace(/\/$/, "") === rootPath.replace(/^\//, "").replace(/\/$/, ""));
    if (!listed) diagnostics.push(buildDiagnostic({ field: "parallel_batch.worktree.root", status: "hold", current: rootPath, expected: "listed in .gitignore", message: "Worktree root is not explicitly listed in .gitignore." }));
  }
  for (const unit of units) {
    const unitId = unit.unit_id ?? unit.unitId ?? "unknown-unit";
    const unitPath = normalizePath(unit.worktree_path ?? unit.worktreePath);
    if (rootPath && unitPath && !(unitPath === rootPath || unitPath.startsWith(`${rootPath.replace(/\/$/, "")}/`))) diagnostics.push(buildDiagnostic({ field: "parallel_batch.unit.worktree_path", status: closeout ? "block" : "hold", current: unitPath, expected: `under ${rootPath}`, message: `Unit ${unitId} worktree_path must live under the batch worktree root.` }));
  }
  return diagnostics;
}

function validateActualFiles(unit, unitId, declaredFiles, closeout) {
  const actual = collectActualFiles(unit.actual_files ?? unit.actualFiles);
  const declared = new Set(declaredFiles);
  const diagnostics = [];
  for (const file of actual) {
    if (!declared.has(file)) diagnostics.push(buildDiagnostic({ field: "parallel_batch.unit.actual_files", status: closeout ? "block" : "hold", current: `${unitId}: ${file}`, expected: "actual files subset of declared files", message: `Parallel unit ${unitId} touched file outside declared scope: ${file}.` }));
  }
  return diagnostics;
}

function collectFiles(files = {}) {
  if (Array.isArray(files)) return files.map(normalizePath).filter(Boolean);
  return [...(files.create ?? []), ...(files.modify ?? []), ...(files.test ?? []), ...(files.read ?? [])].map(normalizePath).filter(Boolean);
}

function collectActualFiles(files = {}) {
  if (Array.isArray(files)) return files.map(normalizePath).filter(Boolean);
  return [...(files.created ?? []), ...(files.modified ?? []), ...(files.deleted ?? []), ...(files.touched ?? [])].map(normalizePath).filter(Boolean);
}

function normalizePath(value) {
  const text = String(value ?? "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
  if (!text || path.isAbsolute(text) || text.split("/").includes("..")) return null;
  return text;
}

function stripTicks(value) { return value ? String(value).trim().replace(/^`|`$/g, "") : null; }
function isNotNeededPath(value) {
  return ["not-needed", "not needed", "none", "n/a", "na", "not-applicable", "not applicable"].includes(String(value ?? "").trim().toLowerCase());
}
function isInside(root, target) { const rel = path.relative(path.resolve(root), path.resolve(target)); return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)); }
function normalizeEdges(edges) { if (!Array.isArray(edges)) return []; return edges.map((edge) => Array.isArray(edge) ? [String(edge[0] ?? ""), String(edge[1] ?? "")] : [String(edge.from ?? edge.source ?? ""), String(edge.to ?? edge.target ?? "")]).filter(([a,b]) => a && b); }
function findCycle(edges) { const graph = new Map(); for (const [a,b] of edges) { graph.set(a, [...(graph.get(a) ?? []), b]); if (!graph.has(b)) graph.set(b, []); } const visiting = new Set(), visited = new Set(), stack = []; function dfs(n){ if (visiting.has(n)) return stack.slice(stack.indexOf(n)).concat(n); if (visited.has(n)) return []; visiting.add(n); stack.push(n); for (const m of graph.get(n) ?? []) { const c = dfs(m); if (c.length) return c; } stack.pop(); visiting.delete(n); visited.add(n); return []; } for (const n of graph.keys()) { const c = dfs(n); if (c.length) return c; } return []; }
function buildDiagnostic({ field, status, current, expected, message }) { return { field, status, current, expected, message, reason: message, code: "parallel_batch_plan" }; }
