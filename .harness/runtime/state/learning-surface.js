import fs from "node:fs";
import path from "node:path";

const LEARNING_FILE = ".harness/runtime/learnings/learnings.jsonl";

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = args[i + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    i += 1;
  }
  return { options, positionals };
}

export function readLearnings({ repoRoot = process.cwd(), file = LEARNING_FILE } = {}) {
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) return [];
  return fs.readFileSync(absolute, "utf8").split(/\n/).filter(Boolean).map((line, index) => {
    try {
      return { ...JSON.parse(line), line: index + 1 };
    } catch (error) {
      return { version: 1, type: "invalid", key: `invalid-line-${index + 1}`, insight: error.message, line: index + 1, invalid: true };
    }
  });
}

export function searchLearnings({ repoRoot = process.cwd(), query = "" } = {}) {
  const q = String(query).toLowerCase();
  return readLearnings({ repoRoot }).filter((entry) => [entry.key, entry.insight, entry.type, ...(entry.applies_to ?? []), ...(entry.files ?? [])].join("\n").toLowerCase().includes(q));
}

export function pruneLearnings({ repoRoot = process.cwd() } = {}) {
  const entries = readLearnings({ repoRoot });
  const stale = [];
  for (const entry of entries) {
    for (const file of entry.files ?? []) {
      if (!fs.existsSync(path.join(repoRoot, file))) stale.push({ key: entry.key, line: entry.line, reason: "learning_file_reference_missing", file });
    }
  }
  const seen = new Map();
  const contradictions = [];
  for (const entry of entries) {
    const key = `${entry.type}:${entry.key}`;
    if (seen.has(key) && seen.get(key) !== entry.insight) contradictions.push({ key: entry.key, type: entry.type, previous: seen.get(key), latest: entry.insight });
    seen.set(key, entry.insight);
  }
  return { ok: stale.length === 0 && contradictions.length === 0, stale, contradictions, count: entries.length };
}

export function appendLearning({ repoRoot = process.cwd(), entry } = {}) {
  const enriched = { version: 1, ts: new Date().toISOString(), authority: "learning_non_authoritative", ...entry };
  const absolute = path.join(repoRoot, LEARNING_FILE);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.appendFileSync(absolute, JSON.stringify(enriched) + "\n", "utf8");
  return enriched;
}

export function runLearningSurfaceCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "recent";
  const options = parsed.options;
  if (["recent", "list"].includes(subcommand)) return { ok: true, command: "learn", subcommand, entries: readLearnings({ repoRoot }).slice(-Number(options.limit ?? 20)) };
  if (subcommand === "search") return { ok: true, command: "learn", subcommand, query: options.query ?? parsed.positionals.slice(1).join(" "), entries: searchLearnings({ repoRoot, query: options.query ?? parsed.positionals.slice(1).join(" ") }) };
  if (subcommand === "prune") return { command: "learn", subcommand, ...pruneLearnings({ repoRoot }) };
  if (subcommand === "export") {
    const entries = readLearnings({ repoRoot });
    return { ok: true, command: "learn", subcommand, markdown: ["# Harness Learnings", "", ...entries.map((e) => `- **${e.key}** (${e.type ?? "pattern"}): ${e.insight}`)].join("\n") };
  }
  if (subcommand === "add") {
    if (!options.key || !options.insight) return { ok: false, command: "learn", subcommand, message: "--key and --insight are required." };
    const entry = appendLearning({ repoRoot, entry: { key: options.key, insight: options.insight, type: options.type ?? "pattern", confidence: Number(options.confidence ?? 5), applies_to: String(options.appliesTo ?? "").split(",").filter(Boolean), files: String(options.files ?? "").split(",").filter(Boolean) } });
    return { ok: true, command: "learn", subcommand, entry };
  }
  return { ok: false, command: "learn", subcommand, supported: ["recent", "list", "search", "prune", "export", "add"] };
}
