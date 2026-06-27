import fs from "node:fs";
import path from "node:path";

export const DEFAULT_INDEX = "reference/reviewer-profiles/REVIEWER_PROFILE_INDEX.json";

export function loadReviewerProfileIndex({ repoRoot = process.cwd(), indexPath = DEFAULT_INDEX } = {}) {
  const absolute = path.join(repoRoot, indexPath);
  if (!fs.existsSync(absolute)) {
    return {
      ok: false,
      indexPath,
      index: null,
      findings: [{ code: "reviewer_index_missing", severity: "error", path: indexPath }]
    };
  }
  const index = JSON.parse(fs.readFileSync(absolute, "utf8"));
  return { ok: true, indexPath, index, findings: [] };
}

export function resolveReviewerProfiles({ repoRoot = process.cwd(), lane = "standard", profiles = [], files = [], text = "" } = {}) {
  const loaded = loadReviewerProfileIndex({ repoRoot });
  if (!loaded.ok) return { ok: false, required: [], optional: [], findings: loaded.findings };
  const index = loaded.index;
  const required = new Set(index.default_reviewers ?? []);
  for (const reviewer of index.lane_reviewers?.[lane] ?? []) required.add(reviewer);
  const profileText = `${profiles.join("\n")}\n${text}\n${files.join("\n")}`;
  for (const [profile, reviewers] of Object.entries(index.profile_reviewers ?? {})) {
    if (profiles.includes(profile) || profileText.includes(profile)) {
      for (const reviewer of reviewers) required.add(reviewer);
    }
  }
  if (/auth|permission|secret|webhook|dependency|\.github\/workflows|package\.json|lock/i.test(profileText)) required.add("security");
  if (/migration|database|metric|reconciliation|asset|budget|ledger/i.test(profileText)) required.add("data-integrity");
  if (/approval|workflow|state machine|permission matrix|audit/i.test(profileText)) required.add("approval-workflow");
  if (/dashboard|semantic|metric catalog|BI_|PRF-10/i.test(profileText)) required.add("bi-semantic-model");
  if (/tsx|jsx|css|ui|frontend|screen|form|accessibility|dashboard/i.test(profileText)) required.add("ux-accessibility");
  if (/release|deploy|rollback|canary|publish/i.test(profileText) || lane === "release") required.add("release-readiness");
  const profileDocs = [...required].map((id) => ({
    id,
    path: `reference/reviewer-profiles/${id}.md`,
    exists: fs.existsSync(path.join(repoRoot, `reference/reviewer-profiles/${id}.md`))
  }));
  return {
    ok: profileDocs.every((doc) => doc.exists),
    lane,
    profiles,
    files,
    required: profileDocs,
    missing: profileDocs.filter((doc) => !doc.exists)
  };
}
