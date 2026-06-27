import fs from "node:fs";
import path from "node:path";

import { parseArgs, parseList } from "./arguments.js";
import { resolveReviewerProfiles } from "./index-resolver.js";

export function runReviewerProfilesCommand({ repoRoot = process.cwd(), args = [] } = {}) {
  const parsed = parseArgs(args);
  const subcommand = parsed.positionals[0] ?? "resolve";
  const options = parsed.options;
  const result = resolveReviewerProfiles({
    repoRoot,
    lane: options.lane ?? "standard",
    profiles: parseList(options.profiles),
    files: parseList(options.files ?? options.changedFiles),
    text: options.text ?? ""
  });
  if (["resolve", "list"].includes(subcommand)) return { ok: result.ok, command: "reviewers", subcommand, ...result };
  if (subcommand === "report") {
    const missingReports = result.required.filter((profile) => !fs.existsSync(path.join(repoRoot, "reference", "reports", "reviewer-profiles", `${profile.id}.json`)));
    return { ok: result.ok && missingReports.length === 0, command: "reviewer-report", subcommand, required: result.required, missingReports };
  }
  return { ok: false, command: "reviewers", subcommand, supported: ["resolve", "list", "report"] };
}
