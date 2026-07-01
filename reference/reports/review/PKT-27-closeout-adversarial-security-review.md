# PKT-27 Closeout Adversarial Security Review

Lens id: `adversarial_security_review`
Independent agent id: unknown; current dedicated Reviewer lens agent in this Codex thread.
Review date: 2026-07-01
Status: pass after remediation re-review

## Source Refs Reviewed

- `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `reference/reports/developer/PKT-27_DEVELOPER_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-27-red-green.md`
- `reference/reports/security/PKT-27-guard-report.json`
- `starter/standard-harness/_harness/README.md`
- `README.md`
- `starter/standard-harness/README.md`

## Findings

### F1 - blocking - rejected secret/root-path output is persisted before rejection

Source refs:
- `worker_executor.py:80`, `worker_executor.py:89`, `worker_executor.py:90`, `worker_executor.py:95`, `worker_executor.py:105`
- `test_pkt27_worker_executor.py:98`, `test_pkt27_worker_executor.py:111`, `test_pkt27_worker_executor.py:114`, `test_pkt27_worker_executor.py:126`
- Packet A9/A10: `PKT-27...md:198`, `PKT-27...md:199`

The executor writes raw stdout/stderr evidence files before running `_sensitive_output_diagnostics`. If stdout/stderr contains an API key, cookie/session token, provider cache path, or root path, the returned status becomes `automatic_execution_blocked`, but the sensitive material has already been persisted to `stdoutPath`/`stderrPath`. Timeout handling is worse: timeout output is written, then returned as `automatic_execution_timeout` before the sensitive-output scan runs at all.

Current tests assert blocked status and diagnostics only. They do not assert that the persisted stdout/stderr files are absent, redacted, or safe. This fails the adversarial interpretation of A9 and A10 because fail-closed status is not enough if rejected material remains in evidence artifacts.

Required correction/evidence:
- Redact or quarantine subprocess output before persistence, or do not persist rejected sensitive stdout/stderr.
- Run sensitive-output checks for timeout output before writing any timeout evidence.
- Add negative tests that read `stdoutPath`/`stderrPath` for secret, session, provider-cache, and root-path cases and prove no sensitive bytes persist.

Recommended route: Developer remediation, then Tester re-run of PKT-27 targeted tests and security regression tests.

### F2 - blocking - approval-state and generated-state mutation boundary is declarative, not enforced

Source refs:
- `conductor_worker_e2e.py:340`, `conductor_worker_e2e.py:374`
- `worker_executor.py:70`, `worker_executor.py:265`
- `test_pkt27_automated_delivery_loop.py:52`
- `test_pkt14_conductor_worker_e2e.py:42`, `test_pkt14_conductor_worker_e2e.py:507`, `test_pkt14_conductor_worker_e2e.py:536`
- Packet modeling impact: `PKT-27...md:144`

The automatic path runs worker commands with `cwd` set to the harness root and passes `permission_roots=[root]`. The returned envelope and topology records state `approvalStateMutationAllowed=false`, and tests verify those fields, but I did not find enforcement that prevents a worker subprocess from writing `_ops`, state DB files, generated state, approval ledgers, closeout ledgers, or other authority-bearing files under the harness root.

This leaves approval-state mutation boundaries dependent on worker behavior rather than harness enforcement. For a critical command-execution packet, a malicious or defective worker could mutate operating state while still returning output that says approval mutation is not allowed.

Required correction/evidence:
- Add an enforceable write boundary for automatic worker execution, or explicitly restrict worker writable roots to a non-authority artifact workspace.
- Add negative tests with a fake worker attempting to write approval/generated-state/ledger files and prove the run blocks or the mutation is isolated and rejected.
- Ensure approval-state mutation cannot be smuggled through worker artifacts, provider ledgers, or conductor adjudication records.

Recommended route: Developer remediation, with Planner consulted if the intended permission model allows broader writes.

### F3 - high - artifact escape detection relies on declared paths and misses actual side effects

Source refs:
- `worker_executor.py:44`, `worker_executor.py:137`, `worker_executor.py:234`, `worker_executor.py:237`
- `conductor_worker_e2e.py:372`, `conductor_worker_e2e.py:375`
- `test_pkt27_worker_executor.py:83`, `test_pkt27_worker_executor.py:85`
- Packet negative fixture: `PKT-27...md:211`

The executor checks `declared_artifacts` for containment, but automatic conductor execution does not pass declared artifact paths from `workerCommands` into `WorkerExecutionRequest`. The manifest hashes files under `artifact_root`, but a worker can create or modify files outside `artifact_root` and inside the broad harness root without that side effect appearing in the artifact manifest.

This weakens the packet's path traversal/artifact escape claim. The tested `artifact_escape` case proves predeclared outside paths are rejected; it does not prove actual worker side effects outside the artifact root are detected or isolated.

Required correction/evidence:
- Pass and enforce declared artifact paths in automatic mode, or run workers in an isolated artifact workspace and validate side effects.
- Add a fake-worker negative test that writes outside `artifact_root` and prove the run cannot pass as `automatic_execution_pass`.

Recommended route: Developer remediation; Tester should add explicit side-effect checks.

## Passing Surfaces Reviewed

- Unsafe descriptor syntax has meaningful coverage for shell mode, pipes, redirects, subshells, newlines, missing timeout, and unapproved executables.
- Captured-output and fixture modes are downgraded and do not claim productization evidence.
- Provider topology tests reject unsupported providers, authority-looking topology fields, mismatched reviewer/provider/lens evidence, and product identity contamination.
- CLI/status docs now describe automatic execution, recovery-only captured output, and fail-closed diagnostics.

## Residual Risks And Limitations

- I did not run live Codex CLI or Claude Code CLI sessions. This matches Tester-reported untested scope and remains residual risk, not approval.
- `reference/reports/security/PKT-27-security-review.json` is listed as required by the packet and guard boundary, but I found only `reference/reports/security/PKT-27-guard-report.json` in the security report directory during this lens pass.
- This review did not modify implementation code or generated state docs.

## Final Disposition

No blocking release/publish/Human approval claim is made.

The `adversarial_security_review` lens does not pass. PKT-27 should not proceed to Reviewer closeout until the blocking secret persistence and authority-boundary findings are remediated and retested.

## Remediation Re-Review - 2026-07-01

Re-review status: pass after remediation.
Independent agent id: unknown; same dedicated Reviewer lens thread performing remediation re-review.
Scope: F1/F2/F3 remediation, evidence-path consistency, required security review artifact, exact `npm test` evidence, and no release/closeout approval.

### Updated Source Refs Reviewed

- `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/developer/PKT-27_DEVELOPER_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-security-review.json`
- `reference/reports/security/PKT-27-guard-report.json`
- `.agents/artifacts/VALIDATION_REPORT.md`
- `.agents/artifacts/VALIDATION_REPORT.json`
- this prior adversarial security review report

### Remediation Verification

| Prior finding / check | Re-review judgment | Evidence |
|---|---|---|
| F1: raw sensitive/root-path stdout/stderr persisted before rejection | remediated | `worker_executor.py` now runs `_sensitive_output_diagnostics` before normal stdout/stderr persistence and writes redacted marker files via `_write_redacted_output` for sensitive output, including timeout output. `test_timeout_and_secret_output_are_blocked_evidence_not_passes` verifies secret and timeout-secret stdout are not present in persisted output; `test_root_development_path_output_is_blocked_evidence_not_pass` verifies root path is not present. |
| F2: approval/generated-state side effects not enforced | remediated | `worker_executor.py` snapshots permission roots before/after execution excluding artifact/evidence roots, blocks unauthorized side effects with `worker_side_effect_outside_artifact_root`, removes newly created unauthorized files with `worker_side_effect_new_file_removed`, and flags modified existing files with `worker_side_effect_modified_existing_file`. Targeted test `test_worker_side_effect_outside_artifact_root_is_blocked` verifies new unauthorized file removal. I also ran a temp executor check for modified pre-existing side effects; result was `automatic_execution_blocked` with `worker_side_effect_outside_artifact_root,worker_side_effect_modified_existing_file`. |
| F3: automatic Conductor path did not pass declared artifacts | remediated | `conductor_worker_e2e.py` now passes `declared_artifacts=command.get("declared_artifacts")` into `WorkerExecutionRequest`. `test_automatic_mode_rejects_worker_command_artifact_escape` verifies automatic mode rejects declared artifact escape with `worker_artifact_outside_root`. |
| Evidence path mismatch | remediated | `reference/reports/security/PKT-27-guard-report.json` now lists `reference/reports/tester/PKT-27_TESTER_REPORT.md`, matching the actual tester report path and packet required evidence path. |
| Required security review artifact missing | remediated | `reference/reports/security/PKT-27-security-review.json` exists and records `status: pass_after_remediation` with reviewed findings and residual risks. |
| Exact full-suite evidence | remediated | Latest accepted evidence is the sequential rerun set, not earlier parallel-load or timeout flakes. `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test` passed 241 tests with 1 skipped. Developer and Tester reports include exact `$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test` evidence. I reran the same exact npm command with a longer timeout; it exited 0 after pretest runtime check, `harness:skills-check`, and 492 root JS tests passing. |

### Local Verification Commands Run

- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 6 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 4 tests.
- Latest accepted full starter Python evidence from sequential rerun: `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test`: pass, 241 tests, 1 skipped.
- `$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test`: pass, 492 tests.
- Temp executor check for modified pre-existing side effect: `automatic_execution_blocked`; diagnostics `worker_side_effect_outside_artifact_root,worker_side_effect_modified_existing_file`.

Earlier parallel-load and timeout failures are not accepted as closeout evidence for this lens; only the latest sequential pass results above are used for the final remediation re-review judgment.

### Remaining Findings

No blocking or high findings remain for this adversarial security lens after remediation.

One non-blocking observation: the committed PKT-27 worker-executor test suite directly covers newly created unauthorized side-effect removal, while modified pre-existing side-effect blocking is evidenced by implementation review, Developer remediation report, and my temp executor check rather than a named committed unit test. Because the code path is deterministic and was directly exercised in this re-review, I do not treat this as a blocking closeout finding for this lens.

### Residual Risks / Limitations

- Live external Codex CLI or Claude Code subscription execution was not performed. This remains explicitly out of scope for PKT-27 closeout evidence and is covered by deterministic local fake-provider commands plus provider descriptor/tool-unavailable evidence.
- Modified pre-existing unauthorized files are blocked and diagnosed but are not silently rolled back. This is acceptable for the lens because silent rollback can destroy prior state; downstream operators must treat the diagnostic as a failed run requiring review.
- This re-review does not approve packet closeout, release, publish, Human acceptance, residual-risk acceptance, User UAT, starter promotion, or productization-complete.

### Recommended Next Route

Route to Reviewer adjudication / remaining independent closeout lens aggregation. Do not route back to Developer for this adversarial security lens unless another reviewer finds new evidence contradicting the remediation above.

## Final Delta Re-Review - 2026-07-01

Re-review scope: built-in Codex/Claude provider CLI adapters, 30 provider CLI scenario tests, `WorkerExecutor` `allowedChangeRoots` / `worktree_changes`, adapter diagnostic promotion to `tool_unavailable`, live Codex CLI pass, Claude unavailable probe, README, and provider CLI scenario matrix.

Re-review status: hold. This addendum does not approve closeout, release, publish, residual-risk acceptance, Human acceptance, starter promotion, User UAT, or productization-complete.

### Delta Source Refs Reviewed

- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/codex_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/claude_code_cli_adapter.py`
- `starter/standard-harness/_harness/test/test_pkt27_provider_cli_adapters.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/README.md`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-security-review.json`

### Delta Findings

#### F4 - blocking - built-in provider adapter executable override bypasses the executor approval boundary

Source refs:
- `conductor_worker_e2e.py:831`, `conductor_worker_e2e.py:904`
- `codex_cli_adapter.py:30`, `codex_cli_adapter.py:85`
- `claude_code_cli_adapter.py:36`, `claude_code_cli_adapter.py:70`
- `test_pkt27_provider_cli_adapters.py:74`, `test_pkt27_provider_cli_adapters.py:242`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md:41`, `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md:55`

The outer `WorkerExecutor` approves and executes the Python adapter script with `shell=false`, but the built-in adapter then executes `providerCli.codex` or `providerCli.claude_code` from descriptor-controlled JSON. The adapter scenario tests explicitly accept provider argv override cases. That means the executor approval check can be satisfied by `sys.executable` while the inner adapter launches an arbitrary executable or argv prefix supplied through `providerCli`.

This is not shell injection, but it is an unapproved executable boundary bypass. A descriptor could route provider execution through a different local binary while still appearing to be a Codex or Claude provider adapter run.

Required correction/evidence:
- Remove arbitrary provider executable override from normal product mode, or validate provider argv through an explicit nested provider executable allowlist owned by the same command descriptor policy.
- Reject provider argv prefixes whose executable is not exactly an approved Codex/Claude provider executable for the selected provider.
- Add negative tests proving `providerCli.codex=["powershell", ...]`, `providerCli.codex=["cmd", ...]`, and mismatched provider executables are rejected before inner subprocess execution.
- Keep fake-provider argv override only in test-only helpers if needed; do not expose it as normal descriptor behavior.

Recommended route: Developer remediation, then Tester rerun of provider adapter and automatic delivery-loop tests.

#### F5 - blocking - sensitive artifact and sidecar content can remain after a blocked run

Source refs:
- `worker_executor.py:102`, `worker_executor.py:124`, `worker_executor.py:165`, `worker_executor.py:367`, `worker_executor.py:481`
- `codex_cli_adapter.py:85`
- `claude_code_cli_adapter.py:115`, `claude_code_cli_adapter.py:117`
- `test_pkt27_worker_executor.py:98`, `test_pkt27_worker_executor.py:124`, `test_pkt27_worker_executor.py:130`
- `reference/reports/security/PKT-27-security-review.json`

The executor scans stdout, stderr, and files under `artifact_root` for sensitive material. However, when sensitive material is detected, `_write_redacted_output()` redacts only stdout/stderr evidence files. It does not remove, redact, quarantine, or hash-and-withhold sensitive artifacts already written by the adapter or provider. Built-in Codex and Claude adapters write result artifacts and Claude writes a full JSON sidecar before the outer executor performs the sensitive-output scan.

Current tests prove blocked stdout is redacted, but they do not prove artifact files or sidecars are safe after a secret/root-path rejection. This leaves a path for provider result artifacts, Claude JSON sidecars, or Codex final-message artifacts to retain credentials, session identifiers, local roots, cache paths, or raw provider content even when the run status is blocked.

Required correction/evidence:
- On `worker_output_secret_rejected`, redact, quarantine outside normal evidence refs, or remove artifact-root files before returning the blocked result.
- Ensure blocked results do not expose artifact paths that contain sensitive bytes.
- Add negative tests where the worker/provider artifact and Claude-style sidecar contain `sk-`, `.codex`, `.claude`, cookie/session text, and harness-root paths; tests must read the files after execution and prove sensitive bytes are not present.
- Update the security review JSON after remediation; the current `stdout/stderr and artifact redaction` scope is not fully proven by the cited tests.

Recommended route: Developer remediation, then Tester security regression.

#### F6 - blocking - provider permission options allow unbounded local execution modes inconsistent with bounded worker execution

Source refs:
- `codex_cli_adapter.py:12`, `codex_cli_adapter.py:38`
- `claude_code_cli_adapter.py:12`, `claude_code_cli_adapter.py:57`
- `starter/standard-harness/_harness/README.md:199`, `starter/standard-harness/_harness/README.md:208`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md:34`, `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md:50`

The Codex adapter allows `danger-full-access`, and the Claude adapter allowlist includes `bypassPermissions`. The executor can detect file changes under configured permission roots, but it cannot prevent a provider CLI running with unbounded permissions from reading or mutating locations outside those roots, using provider caches, or invoking external side effects. This contradicts PKT-27's bounded local worker execution model.

The README also documents these options as supported normal adapter options, which makes the risky modes part of the operator-facing contract rather than a private test escape hatch.

Required correction/evidence:
- Remove `danger-full-access` from normal Codex adapter allowed sandbox values for PKT-27, or require an explicit separate unsafe-provider-mode diagnostic that cannot satisfy `automatic_execution_pass`.
- Remove `bypassPermissions` from normal Claude adapter allowed permission modes, or make it an explicit blocked/unavailable diagnostic for normal delivery-loop evidence.
- Add negative tests proving those modes cannot produce `automatic_execution_pass` or productization evidence.
- If a future packet wants an unsafe local provider mode, route it as a separate approval/security packet; do not close PKT-27 with it in the normal product workflow.

Recommended route: Developer remediation, with Planner only if the intended product policy is to allow an explicit unsafe mode outside PKT-27 normal acceptance.

### Passing Delta Surfaces

- The top-level `WorkerExecutor` still uses `subprocess.run(..., shell=False)` and rejects shell descriptors, pipes, redirects, subshell/newline tokens, missing timeout, unapproved outer executables, and declared artifact escape.
- Adapter diagnostics such as `claude_code_cli_unavailable` are promoted to `tool_unavailable`; Claude absence is handled as provider/tool availability evidence, not product failure.
- `allowedChangeRoots` records intentional bounded implementation changes in `worktree_changes`, and unauthorized side effects under scanned permission roots are blocked.
- Live Codex CLI evidence and Claude unavailable probe are useful operational evidence, but they do not close the security findings above.
- Raw provider stdout/stderr are not intentionally forwarded as normal adapter metadata; the remaining leakage concern is artifact/sidecar persistence after blocked sensitive output.

### Residual Risks / Limitations

- I did not approve closeout.
- I did not rerun live Codex or Claude commands in this re-review; I reviewed the current code, tests, Developer/Tester reports, security JSON, README, and scenario matrix.
- Worktree side-effect detection remains limited to configured roots. That is acceptable only if provider permission modes cannot escape the bounded execution model.

### Recommended Next Route

Route to Developer remediation for F4, F5, and F6, then Tester rerun of:

- `test_pkt27_provider_cli_adapters.py`
- `test_pkt27_worker_executor.py`
- `test_pkt27_automated_delivery_loop.py`
- full starter unittest discovery
- root `npm test`

After remediation and Tester evidence, rerun this adversarial security lens. Do not proceed to Reviewer closeout from this lens status.

## F4/F5/F6 Remediation Re-Review - 2026-07-01

Re-review scope: only the prior final-delta adversarial security hold findings F4, F5, and F6.

Re-review status: pass for F4/F5/F6 remediation. This addendum does not approve packet closeout, release, publish, residual-risk acceptance, Human acceptance, starter promotion, User UAT, or productization-complete.

### Remediation Source Refs Reviewed

- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/codex_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/claude_code_cli_adapter.py`
- `starter/standard-harness/_harness/test/test_pkt27_provider_cli_adapters.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/README.md`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`

### Remediation Verification

| Prior finding | Re-review judgment | Evidence |
|---|---|---|
| F4: built-in provider adapter executable override bypasses the executor approval boundary | remediated | `conductor_worker_e2e.py` now validates provider argv through `_provider_cli_argv_diagnostics`. Default `[codex]` and `[claude]` command names remain the normal built-in provider commands; any override beyond that must appear in `approvedProviderExecutables` / `approved_provider_executables` or returns `provider_cli_executable_not_approved`. `test_automatic_mode_rejects_unapproved_provider_cli_override` covers the automatic runner path. |
| F5: sensitive artifact and sidecar content can remain after a blocked run | remediated | `worker_executor.py` now calls `_redact_artifact_root(artifact_root)` when sensitive output/artifact content is detected, including timeout-sensitive paths. `test_secret_artifact_content_is_redacted_after_rejection` writes `sk-artifact-secret` into the artifact root and verifies the resulting artifact is redacted. |
| F6: provider permission options allow unbounded local execution modes inconsistent with bounded worker execution | remediated | `codex_cli_adapter.py` removed `danger-full-access` from `CODEX_SANDBOX_VALUES`; `claude_code_cli_adapter.py` removed `bypassPermissions` from `CLAUDE_PERMISSION_MODES`. Provider adapter failure scenarios now include `codex_danger_full_access_rejected` and `claude_bypass_permissions_rejected`, both rejected before subprocess execution. README and scenario matrix now describe those modes as rejected in the normal automatic path. |

### Local Verification Commands Run

- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"`: pass, 4 test methods covering the provider adapter scenario matrix.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 9 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 6 tests.

### Second-Pass Note

I rechecked source alignment, acceptance/evidence coverage, risk/regression pressure, and authority boundaries only for F4/F5/F6. The reviewed delta now blocks unapproved provider executable overrides, redacts sensitive artifact-root files after secret/root-path detection, rejects Codex `danger-full-access`, rejects Claude `bypassPermissions`, preserves top-level `shell=false` execution, and keeps provider absence as `tool_unavailable` evidence rather than a product failure.

### Residual Risks / Limitations

- Default provider command names `codex` and `claude` are still resolved by the local environment. This is acceptable for the F4 remediation as implemented because arbitrary descriptor-supplied overrides are now approval-gated, but downstream closeout should keep local PATH/tool provenance as residual operational risk.
- This re-review did not rerun the full starter Python suite or root `npm test`; it relied on Developer/Tester report evidence for those broad suites and reran the F4/F5/F6 targeted tests locally.
- This re-review does not approve Reviewer closeout or any release/productization gate.

### Recommended Next Route

No Developer remediation is required for F4/F5/F6 from this adversarial security lens. Route to Reviewer adjudication / remaining closeout aggregation, subject to other independent lens results and required gate evidence.
