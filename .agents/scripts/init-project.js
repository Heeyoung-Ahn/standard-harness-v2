import process from "node:process";
import { parseArgs } from "node:util";
import readline from "node:readline/promises";

import {
  KNOWN_PROFILES,
  inspectStarterInitializationState,
  initializeProjectStarter,
  normalizeActiveProfiles,
  runNonInteractiveInitCommand,
  slugifyProjectName
} from "../../.harness/runtime/state/init-project.js";

const MIN_NODE_MAJOR = 24;

const HELP = `Usage: node .agents/scripts/init-project.js [options]

Options:
  --project-name <name>      Human-readable project name
  --project-slug <slug>      package.json name override
  --user-goal <text>         Primary user goal
  --ops-goal <text>          Primary operator goal
  --approval-goal <text>     First approval target
  --profiles <list>          Comma-separated short profile IDs (PRF-10, PRF-9, PRF-10,PRF-9, or none)
  --force                    Reinitialize an already-edited starter repo
  --non-interactive          Do not prompt; requires explicit project/goal fields and fills only derived defaults
  --help                     Show this message
`;

enforceSupportedNodeRuntime();

const options = parseArgs({
  options: {
    "project-name": { type: "string" },
    "project-slug": { type: "string" },
    "user-goal": { type: "string" },
    "ops-goal": { type: "string" },
    "approval-goal": { type: "string" },
    profiles: { type: "string" },
    force: { type: "boolean" },
    "non-interactive": { type: "boolean" },
    help: { type: "boolean" }
  },
  allowPositionals: false
}).values;

if (options.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

if (options["non-interactive"]) {
  const readiness = runNonInteractiveInitCommand({
    repoRoot: process.cwd(),
    args: process.argv.slice(2)
  });
  if (!readiness.ok) {
    process.stderr.write(
      [
        "Non-interactive initialization requires explicit project goals.",
        `- Missing: ${readiness.missingFields.join(", ")}`,
        `- Example: ${readiness.commandExample}`
      ].join("\n") + "\n"
    );
    process.exit(1);
  }
}

let forceInitialization = Boolean(options.force);
const starterState = inspectStarterInitializationState(process.cwd());
if (!forceInitialization && starterState.status === "initialized") {
  process.stdout.write(
    [
      "Standard harness initialization appears to be already complete.",
      `- Operating DB present: ${starterState.dbExists ? "yes" : "no"}`,
      `- Active Context present: ${starterState.activeContextExists ? "yes" : "no"}`,
      "",
      "You can exit without changes, or reinitialize with --force if you intentionally want to reset harness state and starter docs.",
      "Reinitializing a project already in progress can overwrite governance docs and reset handoff / packet state. Product source files are not the target, but the project operating history can be lost."
    ].join("\n") + "\n"
  );

  if (options["non-interactive"]) {
    process.stdout.write("No changes made. Re-run with --force to reinitialize.\n");
    process.exit(0);
  }

  const answer = await prompt("Reinitialize now? Type RESET to continue, or press Enter to exit", "");
  if (answer !== "RESET") {
    process.stdout.write("No changes made. Initialization exited.\n");
    process.exit(0);
  }
  forceInitialization = true;
}

if (!forceInitialization && starterState.status === "edited") {
  process.stderr.write(
    [
      starterState.message,
      "No changes made.",
      "Re-run with --force only if you intentionally want to reset and reinitialize this folder."
    ].join("\n") + "\n"
  );
  process.exit(1);
}

const projectName =
  options["project-name"] ??
  (options["non-interactive"] ? defaultProjectName(process.cwd()) : await prompt("Project name", defaultProjectName(process.cwd())));
const projectSlug =
  options["project-slug"] ??
  (options["non-interactive"] ? slugifyProjectName(projectName) : await prompt("Project slug", slugifyProjectName(projectName)));
const userGoal =
  options["user-goal"] ??
  (options["non-interactive"]
    ? `${projectName} 사용자가 지금 판단해야 하는 핵심 문제를 빠르게 해결한다.`
    : await prompt("User goal", `${projectName} 사용자가 지금 판단해야 하는 핵심 문제를 빠르게 해결한다.`));
const opsGoal =
  options["ops-goal"] ??
  (options["non-interactive"]
    ? `${projectName} 운영 상태와 다음 행동을 CLI와 Active Context에서 빠르게 복원한다.`
    : await prompt("Operator goal", `${projectName} 운영 상태와 다음 행동을 CLI와 Active Context에서 빠르게 복원한다.`));
const approvalGoal =
  options["approval-goal"] ??
  (options["non-interactive"]
    ? `${projectName}의 PLN-00과 PLN-01을 닫아 첫 구현 lane을 연다.`
    : await prompt("Approval goal", `${projectName}의 PLN-00과 PLN-01을 닫아 첫 구현 lane을 연다.`));
const profiles =
  options.profiles ??
  (options["non-interactive"]
    ? "none"
    : await prompt(
        "Active profiles",
        "none",
        "Use comma-separated short IDs like PRF-10,PRF-9 or type none. Do not use profile filenames."
      ));

try {
  const result = initializeProjectStarter({
    repoRoot: process.cwd(),
    projectName,
    projectSlug,
    userGoal,
    opsGoal,
    approvalGoal,
    activeProfiles: normalizeActiveProfiles(profiles),
    force: forceInitialization
  });

  process.stdout.write(
    [
      "Standard harness starter initialized.",
      `- Project name: ${result.projectName}`,
      `- Project slug: ${result.projectSlug}`,
      `- Active profiles: ${result.activeProfiles.length ? result.activeProfiles.join(", ") : "none"}`,
      `- DB path: ${result.dbPath}`,
      `- Next action: ${result.nextAction}`,
      "",
      "Initialization is complete.",
      "Do this next:",
      "- Open START_HERE.md",
      "- Fill reference/artifacts/PROJECT_STARTER_DOC_PACK.md",
      "- Run npm run harness:status",
      "- Run npm run harness:context",
      "- Close PLN-00 and PLN-01 before syncing architecture / implementation / UI",
      "- Open the first implementation packet only after PLN-01 is approved"
    ].join("\n") + "\n"
  );
  process.exit(0);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown initialization error"}\n`);
  process.exit(1);
}

async function prompt(label, fallback, hint) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const suffix = hint ? `\n${hint}\n` : " ";
    const answer = await rl.question(`${label} [${fallback}]${suffix}`);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

function defaultProjectName(cwd) {
  return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? "new-project";
}

function enforceSupportedNodeRuntime() {
  const version = process.versions.node ?? "";
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);

  if (Number.isInteger(major) && major >= MIN_NODE_MAJOR) {
    return;
  }

  process.stderr.write(
    `Node.js ${MIN_NODE_MAJOR} or newer is required before initializing the standard harness starter.\nDetected version: v${version || "unknown"}\n`
  );
  process.exit(1);
}

void KNOWN_PROFILES;
