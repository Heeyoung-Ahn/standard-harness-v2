#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { buildDocsCommandInventory } from "../state/docs-command-inventory.js";

const repoRoot = process.env.REPO_ROOT ?? process.cwd();
const inventory = buildDocsCommandInventory({ repoRoot });
const compatibilityReport = {
  ...inventory,
  unique_scripts: inventory.uniqueScripts,
  command_count: inventory.commandCount,
  doc_count: inventory.docCount
};
const outputPath = path.resolve(repoRoot, "verification", "v2.8", "docs_command_inventory.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(compatibilityReport, null, 2) + "\n", "utf8");
if (!inventory.ok) {
  console.error(JSON.stringify(compatibilityReport, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(compatibilityReport, null, 2));
