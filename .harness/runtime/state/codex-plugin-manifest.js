import fs from "node:fs";
import path from "node:path";
import { isSafeRelativePluginPath } from "./path-safety.js";

export const DEFAULT_CODEX_PLUGIN_MANIFEST = ".codex-plugin/plugin.json";

export function readCodexPluginManifest({ repoRoot = process.cwd(), manifestPath = DEFAULT_CODEX_PLUGIN_MANIFEST } = {}) {
  const absolute = path.join(repoRoot, manifestPath);
  if (!fs.existsSync(absolute)) return { ok: false, manifest: null, path: manifestPath, error: "missing" };
  try {
    return { ok: true, manifest: JSON.parse(fs.readFileSync(absolute, "utf8")), path: manifestPath, error: null };
  } catch (error) {
    return { ok: false, manifest: null, path: manifestPath, error: error.message };
  }
}

export function validateCodexPluginManifest(manifest) {
  const findings = [];
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, findings: [{ code: "plugin_manifest_unreadable", severity: "error", message: "Codex plugin manifest is missing or invalid JSON." }] };
  }
  for (const field of ["name", "version", "description", "skills"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      findings.push({ code: "plugin_manifest_missing_field", severity: "error", field, message: `${field} is required.` });
    }
  }
  if (manifest.skills && !isSafeRelativePluginPath(manifest.skills)) {
    findings.push({ code: "plugin_manifest_skills_path_unsafe", severity: "error", field: "skills", value: manifest.skills, message: "skills path must be relative and stay inside the plugin payload." });
  }
  const interfaceObject = manifest.interface ?? {};
  if (interfaceObject.category !== "Coding") findings.push({ code: "plugin_manifest_category_not_coding", severity: "warning", value: interfaceObject.category, message: "Codex coding harness plugins should use category Coding." });
  const capabilities = Array.isArray(interfaceObject.capabilities) ? interfaceObject.capabilities : [];
  for (const required of ["Interactive", "Read", "Write"]) {
    if (!capabilities.includes(required)) findings.push({ code: "plugin_manifest_capability_missing", severity: "warning", value: required, message: `Missing recommended capability ${required}.` });
  }
  if (!Array.isArray(interfaceObject.defaultPrompt) || interfaceObject.defaultPrompt.length === 0) {
    findings.push({ code: "plugin_manifest_default_prompt_missing", severity: "warning", message: "defaultPrompt should guide packet/task/evidence flow." });
  }
  return { ok: findings.every((finding) => finding.severity !== "error"), findings };
}

export function validateCodexPluginManifestAtPath({ repoRoot = process.cwd(), manifestPath = DEFAULT_CODEX_PLUGIN_MANIFEST } = {}) {
  const loaded = readCodexPluginManifest({ repoRoot, manifestPath });
  if (!loaded.ok) {
    return { ok: false, manifestPath, findings: [{ code: "plugin_manifest_missing_or_invalid", severity: "error", message: loaded.error ?? "missing" }] };
  }
  const validation = validateCodexPluginManifest(loaded.manifest);
  return { ok: validation.ok, manifestPath, manifest: loaded.manifest, findings: validation.findings };
}
