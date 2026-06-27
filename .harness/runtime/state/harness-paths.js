import fs from "node:fs";
import path from "node:path";

export const GENERATED_DOCS_DIR = ".agents/runtime/generated-state-docs";
export const RUNTIME_REPORTS_DIR = ".agents/runtime/reports";
export const RECOVERY_REPORTS_DIR = ".agents/runtime/recovery-reports";
export const AGENT_TRACES_DIR = ".agents/runtime/agent-traces";
export const CUTOVER_REPORT_MARKDOWN = `${RUNTIME_REPORTS_DIR}/CUTOVER_PRECHECK.md`;
export const CUTOVER_REPORT_JSON = `${RUNTIME_REPORTS_DIR}/CUTOVER_PRECHECK.json`;
export const VALIDATION_REPORT_MARKDOWN = ".agents/artifacts/VALIDATION_REPORT.md";
export const VALIDATION_REPORT_JSON = ".agents/artifacts/VALIDATION_REPORT.json";
export const ACTIVE_PROFILES_MARKDOWN = ".agents/artifacts/ACTIVE_PROFILES.md";
export const REPOSITORY_LAYOUT_MARKDOWN = "reference/artifacts/REPOSITORY_LAYOUT_OWNERSHIP.md";
export const WORK_ITEM_PACKET_TEMPLATE_MARKDOWN = "reference/packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md";
export const ACTIVE_CONTEXT_PACKET_MARKDOWN = WORK_ITEM_PACKET_TEMPLATE_MARKDOWN;
export const DEV05_PACKET_MARKDOWN = WORK_ITEM_PACKET_TEMPLATE_MARKDOWN;
export const REVIEW_REPORT_MARKDOWN = "reference/artifacts/REVIEW_REPORT.md";

export const ARTIFACT_PATHS = {
  requirements: ".agents/artifacts/REQUIREMENTS.md",
  architecture: ".agents/artifacts/ARCHITECTURE_GUIDE.md",
  plan: ".agents/artifacts/IMPLEMENTATION_PLAN.md",
  progress: ".agents/artifacts/PROJECT_PROGRESS.md",
  ui: "reference/artifacts/UI_DESIGN.md",
  packet: ACTIVE_CONTEXT_PACKET_MARKDOWN,
  activeContextPacket: ACTIVE_CONTEXT_PACKET_MARKDOWN,
  dev05Packet: DEV05_PACKET_MARKDOWN,
  reviewReport: REVIEW_REPORT_MARKDOWN,
  validationReport: VALIDATION_REPORT_MARKDOWN,
  activeProfiles: ACTIVE_PROFILES_MARKDOWN,
  repositoryLayout: REPOSITORY_LAYOUT_MARKDOWN,
  cutoverReport: CUTOVER_REPORT_MARKDOWN,
  active: ".agents/artifacts/CURRENT_STATE.md",
  preventive: ".agents/artifacts/PREVENTIVE_MEMORY.md"
};

export function resolveArtifactPath(repoRoot, key) {
  return path.resolve(path.resolve(repoRoot), getArtifactPath(key));
}

export function resolveArtifactRelativePath(_repoRoot, key) {
  return getArtifactPath(key);
}

export function resolveGeneratedDocReadPath({ outputDir, docName }) {
  return path.resolve(path.resolve(outputDir), GENERATED_DOCS_DIR, docName);
}

export function resolveGeneratedDocRelativePath({ docName }) {
  return `${GENERATED_DOCS_DIR}/${docName}`;
}

export function resolveGeneratedDocWritePaths({ outputDir, docName }) {
  return [path.resolve(path.resolve(outputDir), GENERATED_DOCS_DIR, docName)];
}

export function writeSecondaryFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
  return { ok: true, path: targetPath };
}

export function artifactExists(repoRoot, key) {
  return fs.existsSync(resolveArtifactPath(repoRoot, key));
}

function getArtifactPath(key) {
  const resolved = ARTIFACT_PATHS[key];
  if (!resolved) {
    throw new Error(`Unknown artifact path key: ${key}`);
  }
  return resolved;
}
