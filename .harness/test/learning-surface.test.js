import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { appendLearning, searchLearnings, pruneLearnings } from "../runtime/state/learning-surface.js";

test("learning surface appends, searches, and flags stale file references", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learn-surface-"));
  try {
    appendLearning({ repoRoot: dir, entry: { key: "bi.metric.sample", insight: "Metric reconciliation needs source-owned samples.", type: "pitfall", files: ["missing.md"] } });
    const hits = searchLearnings({ repoRoot: dir, query: "source-owned" });
    assert.equal(hits.length, 1);
    const prune = pruneLearnings({ repoRoot: dir });
    assert.equal(prune.ok, false);
    assert.equal(prune.stale[0].reason, "learning_file_reference_missing");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
