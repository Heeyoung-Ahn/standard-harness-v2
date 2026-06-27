import fs from "node:fs";
import path from "node:path";
import { validateCodexPluginManifestAtPath, DEFAULT_CODEX_PLUGIN_MANIFEST } from "./codex-plugin-manifest.js";
import { isSafeManagedPath } from "./path-safety.js";

const MANAGED_MANIFEST_PATH = ".agents/runtime/CODEX_INSTALL_MANIFEST.json";

function parseArgs(args = []) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = args[index + 1];
    if (next == null || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { positionals, options };
}

export function enumerateCodexPluginPayload({ repoRoot = process.cwd() } = {}) {
  const files = [];
  const add = (rel) => {
    if (fs.existsSync(path.join(repoRoot, rel))) files.push(rel);
  };
  add(DEFAULT_CODEX_PLUGIN_MANIFEST);
  for (const root of [".agents/skills", "reference/reviewer-profiles"]) {
    const absolute = path.join(repoRoot, root);
    if (!fs.existsSync(absolute)) continue;
    for (const rel of walk(absolute, repoRoot)) files.push(rel);
  }
  return [...new Set(files)].sort();
}

function* walk(dir, repoRoot) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(absolute, repoRoot);
    else yield path.relative(repoRoot, absolute).replace(/\\/g, "/");
  }
}

export function buildCodexInstallManifest({ repoRoot = process.cwd() } = {}) {
  const payload = enumerateCodexPluginPayload({ repoRoot });
  return {
    version: 1,
    pluginName: "standard-harness",
    runtime: "codex",
    generatedAt: new Date().toISOString(),
    pluginManifest: DEFAULT_CODEX_PLUGIN_MANIFEST,
    managedArtifacts: payload,
    safety: {
      unsafePaths: payload.filter((rel) => !isSafeManagedPath(repoRoot, rel))
    }
  };
}

export function runCodexPluginCommand({ repoRoot = process.cwd(), outputDir = repoRoot, args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "validate";
  const apply = Boolean(parsed.options.apply || parsed.options.write);
  const validation = validateCodexPluginManifestAtPath({ repoRoot });
  const manifest = buildCodexInstallManifest({ repoRoot });
  const safe = manifest.safety.unsafePaths.length === 0;
  const writes = [];

  if (subcommand === "validate") {
    return { ok: validation.ok && safe, command: "codex-plugin", subcommand, validation, payloadCount: manifest.managedArtifacts.length, unsafePaths: manifest.safety.unsafePaths };
  }
  if (["dry-run", "payload"].includes(subcommand)) {
    return { ok: validation.ok && safe, command: "codex-plugin", subcommand, apply: false, validation, manifest };
  }
  if (["sync", "manifest"].includes(subcommand)) {
    if (apply) {
      const out = path.join(outputDir, MANAGED_MANIFEST_PATH);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");
      writes.push(MANAGED_MANIFEST_PATH);
    }
    return { ok: validation.ok && safe, command: "codex-plugin", subcommand, apply, validation, artifactsWritten: writes, manifest: apply ? null : manifest };
  }
  return { ok: false, command: "codex-plugin", subcommand, message: `Unsupported codex-plugin subcommand: ${subcommand}`, supported: ["validate", "dry-run", "payload", "manifest", "sync"] };
}
