import test from "node:test";
import assert from "node:assert/strict";

import { normalizeKnownNodeRuntimeWarnings } from "./cli-stderr-helpers.js";

test("normalizes only the expected Node SQLite ExperimentalWarning block", () => {
  const stderr = [
    "(node:1234) ExperimentalWarning: SQLite is an experimental feature and might change at any time",
    "(Use `node --trace-warnings ...` to show where the warning was created)",
    ""
  ].join("\n");

  assert.equal(normalizeKnownNodeRuntimeWarnings(stderr), "");
});

test("does not hide unrelated stderr output", () => {
  const stderr = [
    "(node:1234) ExperimentalWarning: SQLite is an experimental feature and might change at any time",
    "(Use `node --trace-warnings ...` to show where the warning was created)",
    "Error: real command failure",
    ""
  ].join("\n");

  assert.equal(normalizeKnownNodeRuntimeWarnings(stderr), "Error: real command failure\n");
});
