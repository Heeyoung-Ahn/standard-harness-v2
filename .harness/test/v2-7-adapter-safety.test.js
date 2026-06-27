import assert from "node:assert/strict";
import test from "node:test";

import { validateAdapterCommand } from "../runtime/state/adapter-safety.js";
import { runV25Command, runV27Command } from "../runtime/state/v2-5-gates.js";

test("adapter safety blocks shell metacharacters", () => {
  const result = validateAdapterCommand({ command: "node safe.js; rm -rf tmp", allowlist: ["node"] });
  assert.equal(result.ok, false);
  assert(result.diagnostics.some((diagnostic) => diagnostic.code === "shell_metacharacter"));
});

test("adapter safety blocks non-allowlisted command", () => {
  const result = validateAdapterCommand({ command: "python script.py", allowlist: ["node"] });
  assert.equal(result.ok, false);
  assert(result.diagnostics.some((diagnostic) => diagnostic.code === "command_not_allowlisted"));
});

test("adapter safety accepts shell-free allowlisted argv", () => {
  const result = validateAdapterCommand({ command: "node adapter.js --json", allowlist: ["node"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.argv, ["node", "adapter.js", "--json"]);
});

test("v25 adapter-guard blocks path traversal", () => {
  const result = runV25Command({
    args: ["adapter-guard", "--command", "node adapter.js", "--allowlist", "node", "--path", "../secrets.txt"]
  });
  assert.equal(result.ok, false);
  assert.equal(result.decision, "block");
});

test("v27 adapter-guard preserves safety result", () => {
  const result = runV27Command({
    args: ["adapter-guard", "--command", "node adapter.js", "--allowlist", "node"]
  });
  assert.equal(result.command, "v27");
  assert.equal(result.ok, true);
  assert.equal(result.decision, "allow");
});
