# PKT-27 Closeout Challenge Review

## Metadata
- Lens id: `challenge_review`
- Independent agent id: `codex-reviewer-lens-2026-07-01-challenge-review` (no platform subagent UUID exposed in this thread)
- Packet: `PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP`
- Review date: 2026-07-01
- Status: pass
- Final disposition: no blocking challenge-review findings. The implementation does not appear to narrow the original requirement into Human Owner copy/paste, captured-output intake, or fixture-only readiness.

## Source Refs Reviewed
- `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- `.agents/artifacts/REQUIREMENTS.md` (`SHV2-REQ-070` and acceptance baseline)
- `.agents/artifacts/ARCHITECTURE_GUIDE.md` (Provider-Neutral Orchestration Architecture)
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` (PKT-27 productization blocker row)
- `reference/reports/review/PKT-27-planner-challenge-review.md`
- `reference/reports/review/PKT-27-packet-doc-review.md`
- `reference/reports/developer/PKT-27_DEVELOPER_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-27-red-green.md`
- `reference/reports/security/PKT-27-guard-report.json`
- `.agents/artifacts/VALIDATION_REPORT.md`
- `.agents/artifacts/VALIDATION_REPORT.json`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`

## Challenge Findings
No findings after second pass.

## Second-Pass Notes
- Source alignment: `SHV2-REQ-070`, the architecture guide, implementation plan, and PKT-27 all require the selected Conductor to invoke bounded worker CLIs through a provider-neutral executor, capture/validate/persist output envelopes, adjudicate, and route next work without Human Owner prompt/result copy-paste. The changed implementation adds `WorkerExecutor` and an `automatic` Conductor path instead of only renaming the old captured-output path.
- Acceptance and evidence coverage: A1-A12 are mapped in the Tester report, and direct code/test review found behavior-level coverage for subprocess invocation, envelope fields, evidence recording before adjudication, next-route selection, provider-neutral Codex/Claude examples, recovery/fixture downgrades, unsafe descriptor rejection, secret/root-path blocking, timeout handling, CLI JSON contract, and validation/state-sync evidence.
- Risk and regression pressure: captured-output and fixture execution are explicitly downgraded to non-productization evidence. Timeout, nonzero exit, unapproved executables, shell-like descriptors, artifact escapes, and sensitive output are blocked or surfaced as non-pass evidence rather than overclaimed as automatic delivery success.
- Authority boundaries: worker output, verifier output, Conductor adjudication, generated state, and reports remain evidence-only and do not approve Ready For Code, closeout, release, residual risk, User UAT, or productization-complete.

## Focused Verification Run By This Lens
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 5 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 3 tests.

## A1-A12 Challenge Disposition
- A1: pass. Automatic mode invokes bounded local worker commands through `WorkerExecutor` when approval, CLI availability, topology, command safety, timeout, artifact root, and descriptor preconditions are satisfied.
- A2: pass. Executor captures stdout/stderr refs, exit code, duration, timeout/cancel state, artifact manifest hashes, input snapshot hash, and envelope refs.
- A3: pass. Automated delivery-loop test verifies provider runs are recorded before Conductor adjudication.
- A4: pass. Adjudication routes to `Tester`, keeps `truth_claim` false, and keeps approval mutation disabled.
- A5: pass for packet scope. Tests cover Codex descriptor readiness and Claude Code `tool_unavailable` evidence without product-identity contamination.
- A6: pass. Captured-output mode is `captured_output_recovery_only` and `productizationEvidence=false`.
- A7: pass. Fixture mode is `fixture_only` and cannot satisfy automatic delivery-loop readiness.
- A8: pass. Negative tests cover shell, pipes, missing timeout, unapproved executable, and artifact escape; legacy PKT-14 tests retain broader descriptor negatives.
- A9: pass. Secret-like output and root development path leakage are blocked as `worker_output_secret_rejected`; public envelopes use relative refs.
- A10: pass. Timeout returns `automatic_execution_timeout` / `worker_timeout_not_pass` without hanging the loop.
- A11: pass. CLI JSON contract exposes automatic/recovery/fixture distinctions; README states automatic delivery is normal and copy/paste is not.
- A12: pass by Tester evidence plus focused rerun. Full starter/root regression, validation-report, and sync-state are reported passing; this lens reran the two PKT-27 targeted suites.

## Limitations
- This challenge lens did not run live authenticated Codex CLI or Claude Code CLI calls. The reviewed acceptance allows deterministic local fake-provider commands plus provider descriptor/tool-unavailable evidence for PKT-27.
- This lens did not rerun full starter regression, root JS tests, `harness:validate`, `validation-report`, or `sync-state`; it reviewed Tester/validation evidence for those and reran the focused PKT-27 behavior tests.
- Separate closeout lenses still need to cover adversarial security, code quality/regression, and evidence/requirements parity. This report does not replace them.
- This report does not approve release, publish, starter promotion, residual-risk acceptance, Human UAT, productization-complete, or Human Owner approval.

## Recommended Route
Continue Reviewer closeout only after the remaining required independent closeout lens artifacts are present and adjudicated. No Developer remediation is recommended from this challenge-review lens.

## Remediation Confirmation - 2026-07-01

### Sources Re-Reviewed
- `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-security-review.json`
- `.agents/artifacts/VALIDATION_REPORT.md`
- `.agents/artifacts/VALIDATION_REPORT.json`
- `reference/reports/review/PKT-27-closeout-challenge-review.md`
- `reference/reports/review/PKT-27-closeout-adversarial-security-review.md`
- `reference/reports/review/PKT-27-closeout-regression-review.md`
- `reference/reports/review/PKT-27-closeout-requirements-parity-review.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`

### Judgment After Remediation
- Status: pass after remediation for `challenge_review`.
- Required judgment: the implementation still removes Human prompt/result copy-paste from the normal delivery loop. The `automatic` path invokes worker commands through `WorkerExecutor`, persists provider run evidence before Conductor adjudication, and routes next work without relying on captured-output intake as the normal path.
- Convenience-closeout risk: no blocking challenge-review risk remains. Captured-output and fixture modes remain downgraded, and the remediation adds behavior-level guards for sensitive output persistence, unauthorized worker side effects, and integrated declared-artifact containment rather than relying on vocabulary-only conformance.
- Residual limitation: live external Codex CLI / Claude Code CLI subscription execution was not run; this remains outside PKT-27 closeout scope per the packet, Tester report, and security review JSON. This lens does not adjudicate the other lens reports or approve closeout.

### Focused Verification Rerun
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 6 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 4 tests.

### Recommended Next Route
Route to Reviewer adjudication / closeout-evidence reconciliation for PKT-27. No Developer remediation is recommended from this challenge-review lens. This report does not approve packet closeout, release, publish, starter promotion, residual-risk acceptance, Human UAT, productization-complete, or Human Owner approval.

## Final Delta Re-Review - 2026-07-01

### Scope
- Review request: final delta challenge re-review only.
- Delta reviewed: built-in Codex/Claude provider CLI adapters, 30 scenario tests, `WorkerExecutor` `allowedChangeRoots` / `worktree_changes`, adapter diagnostic promotion to `tool_unavailable`, README automatic-loop documentation, and provider scenario matrix report.
- Closeout authority: not approved by this report. This is challenge-lens evidence only.
- Generated-state boundary: generated state docs were not edited by this lens.

### Sources Re-Reviewed
- `starter/standard-harness/_harness/system/standard_harness/workflow/codex_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/claude_code_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_provider_cli_adapters.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/README.md`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-security-review.json`

### Findings

#### F1 - Blocking: built-in provider adapters still expose unbounded provider permission modes outside executor-observable roots
- Source ref: `starter/standard-harness/_harness/system/standard_harness/workflow/codex_cli_adapter.py` lines 12 and 37-45; `starter/standard-harness/_harness/system/standard_harness/workflow/claude_code_cli_adapter.py` lines 12-18 and 51-60; `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py` lines 63-74 and 108-120; `starter/standard-harness/_harness/README.md` lines 197-215.
- Affected surface: built-in Codex/Claude provider adapter safety, bounded worker execution, `allowedChangeRoots`, and closeout challenge readiness.
- Challenged claim: the final adapter delta fully preserves bounded local CLI execution and side-effect containment.
- Weakness: the Codex adapter allowlist includes `danger-full-access`, and the Claude Code adapter allowlist includes `bypassPermissions`. The executor monitors and blocks side effects under `permission_roots` while excluding `artifact_root`, `evidence_root`, and declared `allowed_change_roots`, but it does not and cannot observe provider-side writes outside the harness root. A provider CLI launched with unbounded permission mode could write outside the root without appearing in `worktree_changes` or side-effect diagnostics. The current 30 scenario matrix covers supported routing and failure cases, but it does not include negative cases proving these unbounded modes are rejected or require a separate explicit elevated execution policy outside normal PKT-27 automatic delivery.
- Required correction or evidence: reject `danger-full-access` and `bypassPermissions` for normal automatic delivery, or gate them behind a separate explicit policy/approval state that is not productization-closeout evidence. Add negative tests proving Codex `danger-full-access` and Claude `bypassPermissions` cannot pass normal automatic delivery-loop readiness, and update README/scenario matrix accordingly. If a future packet wants elevated provider modes, it must define separate security approval, residual-risk, and evidence boundaries.
- Recommended route: Developer remediation, then Tester rerun of adapter and automated-loop suites, then challenge-lens re-review.

### Delta Items That Passed This Lens
- Built-in adapter coverage exists for Codex and Claude Code. The provider adapter test file covers 30 concrete scenarios across four test methods: Codex routing/recovery, Codex failure classification, Claude routing/recovery, and Claude failure classification.
- Codex global approval flag ordering before `exec` is implemented and scenario-tested.
- Codex final-message artifact recovery through `--output-last-message` is implemented and scenario-tested.
- Claude headless JSON parsing, JSON sidecar recovery, resume/continue options, default limits, invalid permission mode, nonzero exit, unavailable executable, parse failure, and empty-result diagnostics are scenario-tested.
- `WorkerExecutor` now records allowed product/worktree changes under declared `allowed_change_roots` as `worktree_changes`.
- Adapter diagnostics such as `claude_code_cli_unavailable` are promoted to `tool_unavailable` instead of generic `automatic_execution_failed`.
- README and provider scenario matrix document the automatic delivery loop, built-in adapter path, captured-output recovery-only boundary, and `allowedChangeRoots` behavior.

### Focused Verification Run By This Re-Review
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"`: pass, 4 test methods covering 30 scenario rows.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 8 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 5 tests.
- Execution note: the first sandboxed test attempt failed with `CreateProcessAsUserW failed: 5`; the same non-destructive commands were rerun outside the sandbox and passed.

### Final Delta Judgment
- Challenge status for this final delta: hold / fail until F1 is remediated.
- Closeout recommendation: do not approve closeout from the challenge lens while unbounded provider permission modes remain available in the normal built-in adapter path.
- Residual risk after F1 remediation: live Claude Code CLI was unavailable on this machine, so Claude live-provider execution remains represented by adapter scenario tests and `tool_unavailable` evidence rather than authenticated live Claude execution.

### Recommended Next Route
Route to Developer for bounded-permission remediation, then Tester for targeted rerun, then Reviewer challenge re-review. This report does not approve packet closeout, release, publish, starter promotion, residual-risk acceptance, Human UAT, productization-complete, or Human Owner approval.

## Final Delta Remediation Re-Review - 2026-07-01

### Scope
- Review request: re-review only whether the prior final-delta challenge hold `F1` is remediated.
- Prior hold: built-in provider adapters exposed unbounded permission modes (`danger-full-access`, `bypassPermissions`) in the normal automatic adapter path while executor side-effect monitoring cannot observe writes outside the harness root.
- Closeout authority: not approved by this report. This is challenge-lens remediation evidence only.
- Generated-state boundary: generated state docs were not edited by this lens.

### Sources Re-Reviewed
- `starter/standard-harness/_harness/system/standard_harness/workflow/codex_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/claude_code_cli_adapter.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_provider_cli_adapters.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/README.md`
- `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`

### Findings
No findings after second pass for the prior `F1` hold.

### F1 Remediation Disposition
- Status: remediated for challenge-lens purposes.
- Codex elevated sandbox: `danger-full-access` is now rejected in the normal adapter path and covered by `codex_danger_full_access_rejected`.
- Claude elevated permission mode: `bypassPermissions` is now rejected and covered by `claude_bypass_permissions_rejected`.
- Provider executable override: built-in provider CLI overrides beyond default `codex` / `claude` require `approvedProviderExecutables`; the automated-loop test covers rejection of unapproved overrides.
- Sensitive artifact / sidecar handling: `WorkerExecutor` now redacts artifact-root files when sensitive material is detected in stdout, stderr, artifacts, or provider sidecars.
- Documentation parity: README and provider scenario matrix now state that elevated provider modes are outside the normal automatic delivery loop and require a separate elevated policy/approval path.

### Focused Verification Run By This Re-Review
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"`: pass, 4 test methods covering 32 scenario rows.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 9 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 6 tests.
- Execution note: the first sandboxed test attempt failed with `CreateProcessAsUserW failed: 5`; the same non-destructive commands were rerun outside the sandbox and passed.

### Second-Pass Notes
- Source alignment: the remediation preserves PKT-27's bounded local CLI execution model instead of expanding normal automatic delivery into unbounded provider control.
- Acceptance and evidence coverage: the exact previously missing negative coverage now exists for Codex elevated sandbox, Claude elevated permission mode, unapproved provider executable overrides, and sensitive artifact/sidecar redaction.
- Risk and regression pressure: the remaining allowed modes are bounded to `read-only` / `workspace-write` for Codex and non-bypass Claude permission modes, with separate policy required for any future elevated execution.
- Authority boundaries: this remediation does not create approval, closeout, release, residual-risk, User UAT, starter promotion, or productization-complete authority.

### Final Delta Judgment
- Challenge status for the prior F1 hold: pass after remediation.
- Closeout recommendation from this re-review: no challenge-lens blocker remains from F1, but this report does not approve closeout. Reviewer adjudication must still evaluate the full closeout package and other required lenses.
- Residual risk: live authenticated Claude Code worker execution was not proven in this re-review. The current evidence remains adapter scenario tests plus unavailable/diagnostic paths for Claude unless another evidence artifact proves live authenticated Claude execution.

### Recommended Next Route
Route to Reviewer adjudication / closeout-evidence reconciliation. No Developer remediation is recommended from this F1 remediation re-review. This report does not approve packet closeout, release, publish, starter promotion, residual-risk acceptance, Human UAT, productization-complete, or Human Owner approval.
