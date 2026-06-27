import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "reference", "skills-src");
const OUT = path.join(ROOT, ".agents", "skills");
const DRY_RUN = process.argv.includes("--dry-run");
const HEADER_LINES = [
  "<!--",
  "GENERATED FILE. DO NOT EDIT DIRECTLY.",
  "Source: reference/skills-src/<skill>/SKILL.md.tmpl",
  "Regenerate: npm run harness:skills-generate",
  "Check: npm run harness:skills-check",
  "-->",
  ""
];
const FORBIDDEN_PLACEHOLDERS = ["MODEL_OVERLAY", "CLAUDE_PREAMBLE", "HOST_SPECIFIC_TOOLS", "TELEMETRY", "AUTO_UPDATE"];

function render(template, skill) {
  template = template.replace(/\r\n/g, "\n");
  for (const forbidden of FORBIDDEN_PLACEHOLDERS) {
    if (template.includes(`{{${forbidden}}}`)) throw new Error(`Forbidden skill placeholder ${forbidden} in ${skill}`);
  }
  return insertGeneratedHeader(template, skill);
}

function insertGeneratedHeader(content, skill) {
  content = content.replace(/\r\n/g, "\n");
  const header = HEADER_LINES.map((line) => line.replace("<skill>", skill)).join("\n");
  if (!content.startsWith("---\n")) return header + content.trimEnd() + "\n";
  const end = content.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`Frontmatter was opened but not closed for ${skill}`);
  const frontmatter = content.slice(0, end + 5);
  const body = content.slice(end + 5).replace(/^\n+/, "");
  return `${frontmatter}\n${header}${body.trimEnd()}\n`;
}

function* skillTemplates() {
  if (!fs.existsSync(SRC)) return;
  for (const name of fs.readdirSync(SRC).sort()) {
    if (name === "shared") continue;
    const tmpl = path.join(SRC, name, "SKILL.md.tmpl");
    if (fs.existsSync(tmpl)) yield { name, tmpl };
  }
}

let changed = false;
for (const { name, tmpl } of skillTemplates()) {
  const rendered = render(fs.readFileSync(tmpl, "utf8"), name);
  const outDir = path.join(OUT, name);
  const outFile = path.join(outDir, "SKILL.md");
  const existing = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
  if (normalizeNewlines(existing) !== normalizeNewlines(rendered)) {
    changed = true;
    if (!DRY_RUN) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, rendered, "utf8");
    }
  }
}

if (DRY_RUN && changed) {
  console.error("Generated skill docs are stale. Run npm run harness:skills-generate.");
  process.exit(1);
}

function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}
