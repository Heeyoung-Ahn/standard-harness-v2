import fs from "node:fs";
import path from "node:path";

export function isSafeManagedPath(rootDir, candidate) {
  const normalized = normalizeSafeRelativePath(candidate);
  if (!normalized) return false;
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(resolvedRoot, normalized);
  if (!isInside(resolvedRoot, resolvedCandidate)) return false;

  // If both root and candidate exist, reject symlink-mediated escapes by comparing real paths.
  try {
    if (fs.existsSync(resolvedRoot) && fs.existsSync(resolvedCandidate)) {
      const realRoot = fs.realpathSync(resolvedRoot);
      const realCandidate = fs.realpathSync(resolvedCandidate);
      return isInside(realRoot, realCandidate);
    }
  } catch {
    return false;
  }
  return true;
}

export function isSafeRelativePluginPath(candidate) {
  return Boolean(normalizeSafeRelativePath(candidate));
}

export function normalizeSafeRelativePath(candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") return null;
  if (path.isAbsolute(candidate)) return null;
  let decoded = candidate.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = candidate.trim();
  }
  const normalized = decoded.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/g, "");
  if (normalized === "" || normalized === "." || normalized === "..") return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === "")) return null;
  return path.posix.normalize(normalized);
}

function isInside(root, absolutePath) {
  const relative = path.relative(path.resolve(root), path.resolve(absolutePath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
