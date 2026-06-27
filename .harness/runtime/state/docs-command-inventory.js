import fs from "node:fs";
import path from "node:path";

export const DOCS_COMMAND_SCHEMA_VERSION = "standard-harness-docs-command-inventory/v2.8";

export function runDocsCommandInventoryCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "audit";
  const options = parsed.options;
  if (!["audit", "inventory", "validate"].includes(subcommand)) {
    return {
      ok: false,
      command: "docs-commands",
      subcommand,
      supported: ["audit", "inventory"],
      message: `Unsupported docs-commands subcommand: ${subcommand}`
    };
  }
  const result = buildDocsCommandInventory({ repoRoot });
  if (options.write || options.apply) {
    const outputPath = normalizeRelativePath(options.output ?? "verification/v2.8/docs_command_inventory.json");
    if (!outputPath) {
      result.diagnostics.push(errorDiagnostic("output", "unsafe_path", "Output path must be repository-relative."));
    } else {
      fs.mkdirSync(path.dirname(path.resolve(repoRoot, outputPath)), { recursive: true });
      fs.writeFileSync(path.resolve(repoRoot, outputPath), JSON.stringify(result, null, 2) + "\n", "utf8");
      result.outputPath = outputPath;
    }
  }
  const errorCount = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  return {
    ...result,
    ok: errorCount === 0,
    command: "docs-commands",
    subcommand,
    nextAction: errorCount > 0
      ? "Fix missing package scripts or update the manuals before release."
      : "Documentation command inventory passed."
  };
}

export function buildDocsCommandInventory({ repoRoot = process.cwd() } = {}) {
  const packageJsonPath = path.resolve(repoRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
  const docs = discoverDocFiles(repoRoot);
  const commands = [];
  for (const docPath of docs) {
    const content = fs.readFileSync(path.resolve(repoRoot, docPath), "utf8");
    for (const match of content.matchAll(/npm\s+run\s+([a-zA-Z0-9:_-]+)/g)) {
      commands.push({ docPath, command: `npm run ${match[1]}`, script: match[1] });
    }
  }
  const diagnostics = [];
  for (const command of commands) {
    if (!scripts.has(command.script)) {
      diagnostics.push(errorDiagnostic(
        "npm run",
        "missing_package_script",
        `${command.docPath} references ${command.command}, but package.json has no ${command.script} script.`
      ));
    }
  }
  const uniqueScripts = [...new Set(commands.map((command) => command.script))].sort();
  return {
    ok: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length === 0,
    schemaVersion: DOCS_COMMAND_SCHEMA_VERSION,
    docCount: docs.length,
    commandCount: commands.length,
    uniqueScripts,
    unique_scripts: uniqueScripts,
    doc_count: docs.length,
    command_count: commands.length,
    commands,
    diagnostics
  };
}

function discoverDocFiles(repoRoot) {
  const candidates = ["README.md", "START_HERE.md"];
  const manualsRoot = path.resolve(repoRoot, "reference", "manuals");
  if (fs.existsSync(manualsRoot)) walk(manualsRoot, (filePath) => candidates.push(path.relative(repoRoot, filePath).replace(/\\/g, "/")));
  return candidates.filter((docPath) => fs.existsSync(path.resolve(repoRoot, docPath))).sort();
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, callback);
    else if (entry.isFile() && entry.name.endsWith(".md")) callback(fullPath);
  }
}

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split(/=(.*)/s).filter((part) => part !== undefined);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) options[key] = inlineValue;
    else if (args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
    else options[key] = true;
  }
  return { positionals, options };
}

function normalizeRelativePath(value) {
  const text = String(value ?? "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!text || path.isAbsolute(text)) return null;
  if (text.split("/").includes("..")) return null;
  return path.posix.normalize(text);
}

function errorDiagnostic(field, code, message) {
  return { field, code, severity: "error", message };
}
