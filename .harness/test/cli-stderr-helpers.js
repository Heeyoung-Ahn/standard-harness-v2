import assert from "node:assert/strict";

const SQLITE_EXPERIMENTAL_WARNING_RE =
  /^\(node:\d+\) ExperimentalWarning: SQLite is an experimental feature and might change at any time\r?\n\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\r?\n?/gm;

export function normalizeKnownNodeRuntimeWarnings(stderr = "") {
  return String(stderr).replace(SQLITE_EXPERIMENTAL_WARNING_RE, "");
}

export function assertNoUnexpectedStderr(stderr) {
  assert.equal(normalizeKnownNodeRuntimeWarnings(stderr), "");
}
