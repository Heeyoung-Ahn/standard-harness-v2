import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  runPlannerPacketOpen,
  runStateSync,
  runTransition
} from "../runtime/state/transition-commands.js";

const starterRoot = path.resolve(process.cwd());

test("transition boundary keeps public wrapper exports stable", () => {
  assert.equal(typeof runTransition, "function");
  assert.equal(typeof runPlannerPacketOpen, "function");
  assert.equal(typeof runStateSync, "function");
});

test("transition boundary is documented and split behind the public wrapper", () => {
  const transitionsDir = path.join(starterRoot, ".harness", "runtime", "state", "transitions");
  const notesPath = path.join(starterRoot, "reference", "runtime", "RUNTIME_BOUNDARY_NOTES.md");
  const notes = fs.readFileSync(notesPath, "utf8");

  assert.equal(fs.existsSync(transitionsDir), true);
  assert.match(notes, /\.harness\/runtime\/state\/transition-commands\.js/);
  assert.match(notes, /\.harness\/runtime\/state\/transitions\//);
  assert.match(notes, /drift-validator\.js/);
  assert.match(notes, /packet-preflight\.js/);
  assert.match(notes, /validation-report\.js/);
});
