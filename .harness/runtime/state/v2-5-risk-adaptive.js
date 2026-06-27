import fs from "node:fs";
import path from "node:path";

import { evaluateRiskAdaptiveGate } from "./risk-adaptive-gates.js";
import { runV24Command } from "./v2-4-risk-adaptive.js";

export const V25_SCHEMA_VERSION = "standard-harness-v2.5-risk-adaptive/v1";

export function runV25Command({ repoRoot = process.cwd(), outputDir = repoRoot, args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "gate";
  const options = parsed.options;
  if (["gate", "risk-gate", "preflight-gate"].includes(subcommand)) {
    return runRiskGateCommand({ repoRoot, options });
  }
  if (["report", "lane", "manual-route", "context-brief", "packet", "context-meter", "context-prune", "repro-check", "abstain", "dependency-intake", "evidence-quality", "secret-scan", "untrusted-scan", "guard", "freeze", "policy-audit"].includes(subcommand)) {
    const delegated = runV24Command({ repoRoot, outputDir, args });
    return { ...delegated, command: "v25", delegatedTo: "v24-compatible-risk-adaptive-cli" };
  }
  return {
    ok: false,
    command: "v25",
    subcommand,
    message: `Unsupported V2.5 subcommand: ${subcommand}`,
    supported: ["gate", "report", "lane", "manual-route", "context-meter", "context-prune", "repro-check", "abstain", "dependency-intake", "evidence-quality", "secret-scan", "untrusted-scan", "guard", "freeze", "policy-audit"]
  };
}

export function runRiskGateCommand({ repoRoot = process.cwd(), options = {} } = {}) {
  const packetPath = normalizeRelativePath(options.packet ?? options.packetPath ?? "");
  const absolutePath = packetPath ? path.resolve(repoRoot, packetPath) : null;
  const content = absolutePath && fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : String(options.content ?? "");
  const stage = options.stage ?? "implementation-transition";
  const changedFiles = parseList(options.changedFiles ?? options.changedFile ?? options.files);
  const result = evaluateRiskAdaptiveGate({
    repoRoot,
    content,
    packetPath: packetPath || null,
    stage,
    effectiveRisk: options.risk ?? options.effectiveRisk ?? "normal",
    changedFiles,
    options
  });
  return {
    ok: result.ok,
    command: "v25",
    subcommand: "gate",
    schemaVersion: V25_SCHEMA_VERSION,
    ...result
  };
}

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--") continue;
    if (token.startsWith("--")) {
      const withoutPrefix = token.slice(2);
      const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s).filter((part) => part !== undefined);
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      if (inlineValue !== undefined) options[key] = inlineValue;
      else if (args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
      else options[key] = true;
    } else {
      positionals.push(token);
    }
  }
  return { options, positionals };
}

function parseList(value) {
  if (!value || value === true) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/");
  if (!text || text === ".") return "";
  if (path.isAbsolute(text)) return "";
  const normalized = path.posix.normalize(text);
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized === "..") return "";
  return normalized;
}
