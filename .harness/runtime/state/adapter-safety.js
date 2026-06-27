import path from "node:path";

export const DEFAULT_ADAPTER_COMMAND_ALLOWLIST = ["node", "npm", "npx", "codex"];
const SHELL_METACHARACTER_PATTERN = /(?:[;&|`$<>]|\$\(|\n|\r)/;

export function validateAdapterCommand({ command, allowlist = DEFAULT_ADAPTER_COMMAND_ALLOWLIST, repoRoot = process.cwd(), paths = [] } = {}) {
  const diagnostics = [];
  const text = String(command ?? "").trim();
  if (!text) {
    diagnostics.push(errorDiagnostic("command", "missing", "Adapter command is required."));
    return { ok: false, argv: [], diagnostics, executed: false };
  }
  if (SHELL_METACHARACTER_PATTERN.test(text) || /\b&&\b/.test(text) || /\b\|\|\b/.test(text)) {
    diagnostics.push(errorDiagnostic("command", "shell_metacharacter", "Adapter command contains shell metacharacters and must not be executed through a shell."));
  }

  const argv = splitCommandLine(text);
  if (argv.error) {
    diagnostics.push(errorDiagnostic("command", "parse_failed", argv.error));
    return { ok: false, argv: [], diagnostics, executed: false };
  }
  if (argv.tokens.length === 0) {
    diagnostics.push(errorDiagnostic("command", "missing", "Adapter command is empty after parsing."));
  }

  const executable = argv.tokens[0] ?? null;
  const normalizedAllowlist = normalizeAllowlist(allowlist);
  if (executable && !normalizedAllowlist.has(path.basename(executable))) {
    diagnostics.push(errorDiagnostic(
      "command",
      "command_not_allowlisted",
      `Adapter command ${path.basename(executable)} is not allowlisted. Allowed: ${[...normalizedAllowlist].join(", ")}.`
    ));
  }

  for (const candidate of paths) {
    const pathDiagnostic = validateRepositoryPath({ repoRoot, candidate });
    if (pathDiagnostic) diagnostics.push(pathDiagnostic);
  }

  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    argv: argv.tokens,
    diagnostics,
    executed: false,
    allowlist: [...normalizedAllowlist]
  };
}

export function splitCommandLine(command) {
  const tokens = [];
  let current = "";
  let quote = null;
  let escaped = false;
  for (const char of String(command ?? "")) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (escaped) current += "\\";
  if (quote) return { tokens: [], error: "Unclosed quote in adapter command." };
  if (current) tokens.push(current);
  return { tokens, error: null };
}

export function validateRepositoryPath({ repoRoot = process.cwd(), candidate } = {}) {
  const raw = String(candidate ?? "").trim();
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (path.isAbsolute(decoded)) {
    return errorDiagnostic("path", "absolute_path", `Path must be repository-relative: ${raw}.`);
  }
  const normalized = decoded.replace(/\\/g, "/");
  if (normalized.split("/").includes("..") || normalized.includes("/../")) {
    return errorDiagnostic("path", "path_traversal", `Path traversal is not allowed: ${raw}.`);
  }
  const absolute = path.resolve(repoRoot, normalized);
  const relative = path.relative(path.resolve(repoRoot), absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return errorDiagnostic("path", "repo_escape", `Path escapes repository root: ${raw}.`);
  }
  return null;
}

function normalizeAllowlist(allowlist) {
  const source = Array.isArray(allowlist)
    ? allowlist
    : String(allowlist ?? "").split(/[;,\n]/);
  const normalized = source.map((item) => path.basename(String(item).trim())).filter(Boolean);
  return new Set(normalized.length > 0 ? normalized : DEFAULT_ADAPTER_COMMAND_ALLOWLIST);
}

function errorDiagnostic(field, code, message) {
  return { field, code, severity: "error", message };
}
