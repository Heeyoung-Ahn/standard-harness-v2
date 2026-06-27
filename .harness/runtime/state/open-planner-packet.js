import { DEFAULT_DB_PATH } from "./operating-state-store.js";
import { runPlannerPacketOpen } from "./dev05-tooling.js";

const repoRoot = process.env.REPO_ROOT ?? process.cwd();
const outputDir = repoRoot;
const dbPath = process.env.HARNESS_DB_PATH ?? DEFAULT_DB_PATH;

const result = runPlannerPacketOpen({
  repoRoot,
  outputDir,
  dbPath,
  args: process.argv.slice(2)
});

process.stdout.write(`${formatSummary(result)}\n\n${JSON.stringify(result, null, 2)}\n`);
process.exit(result.ok === false ? 1 : 0);

function formatSummary(result) {
  return [
    "Harness Planner Open",
    `- Result: ${result.ok ? "pass" : "fail"}`,
    `- Packet: ${result.packetPath ?? "missing"}`,
    `- Work item: ${result.workItemId ?? "missing"}`,
    `- Gate profile: ${result.gateProfile ?? "missing"}`,
    `- Checks: ${Array.isArray(result.checks) ? result.checks.filter((item) => item.ok).length : 0}/${Array.isArray(result.checks) ? result.checks.length : 0}`,
    `- Next action: ${result.nextAction ?? "none"}`
  ].join("\n");
}
