# PKT-27 Closeout Regression Review

## Metadata
- Lens id: `code_quality_review`
- Review type: module-boundary / maintainability / regression review
- Independent agent id: current Codex reviewer lens thread; no stable spawned-agent id exposed
- Review date: 2026-07-01
- Status: pass after final delta re-review
- Remediation re-review status: pass after remediation re-review (historical current-before-final-delta status)
- Initial review status: fail - blocking code-quality/regression findings (historical; see initial findings and initial disposition below)
- Scope boundary: review only; no implementation edits, no generated-state edits, no approval-state changes

## Source Refs Reviewed
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `.agents/workflows/reviewer.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/rules/agent_behavior.md`
- `.agents/skills/code_review_checklist/SKILL.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`
- `reference/reports/review/PKT-27-planner-challenge-review.md`
- `reference/reports/review/PKT-27-packet-doc-review.md`
- `reference/reports/tdd/PKT-27-red-green.md`
- `reference/reports/developer/PKT-27_DEVELOPER_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-guard-report.json`
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`

## Independent Checks Run
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 5 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 3 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`: pass, 22 tests.

## Initial Findings (Historical)

| ID | Severity | Surface | Finding | Evidence | Required action |
|---|---|---|---|---|---|
| PKT27-CQR-01 | blocking | `worker_executor.py` evidence capture / redaction ordering | Sensitive stdout/stderr is written to evidence files before sensitive-output rejection runs, and blocked results still expose the written paths. This means a worker that emits a secret-like token can be rejected while the raw sensitive output remains persisted under `_ops/evidence`, which is not a safe reject/redact boundary. | `worker_executor.py:87-90` writes stdout/stderr, `worker_executor.py:105` starts sensitive-output diagnostics after the write, and `worker_executor.py:114-120` returns `automatic_execution_blocked` with the persisted stdout/stderr paths. Existing tests assert blocked status only; they do not assert the sensitive content was not persisted. | Move sensitive-output handling before durable stdout/stderr persistence, or persist only redacted/quarantined-safe content. Add a regression test proving secret-like stdout/stderr/artifact content is not left in normal evidence files or public refs after a blocked result. |
| PKT27-CQR-02 | blocking | Conductor automatic path / artifact-root enforcement | The integrated automatic Conductor path does not pass declared artifact paths into `WorkerExecutionRequest`, so the executor's declared-artifact escape check is not exercised in the product path. A worker command can be given an argv artifact destination outside `artifact_root`; the executor will only hash files that appear under `artifact_root` and will not prove or reject the outside write. | `worker_executor.py:222-240` has a declared-artifact containment check, but `conductor_worker_e2e.py:366-381` constructs `WorkerExecutionRequest` without `declared_artifacts`. The positive automatic descriptor in `test_pkt27_automated_delivery_loop.py:120-155` passes artifact destinations only inside `argv`, and no integrated negative test covers an argv destination outside `artifact_root`. | Bind worker command artifact outputs to explicit descriptor fields and pass them to `WorkerExecutionRequest.declared_artifacts`, or otherwise validate argv-derived artifact destinations before execution. Add an integrated automatic-mode negative test proving path escape through worker command artifact arguments fails before or during execution and cannot be counted as evidence. |
| PKT27-CQR-03 | medium | Evidence path consistency | Packet-required evidence paths do not fully match present files. The packet requires `reference/reports/test/PKT-27_TESTER_REPORT.md` and `reference/reports/security/PKT-27-security-review.json`; the reviewed tree has `reference/reports/tester/PKT-27_TESTER_REPORT.md` and `reference/reports/security/PKT-27-guard-report.json`, but no packet security-review JSON was found. This is not the primary code-quality failure, but it is an integration risk for closeout automation. | Packet required evidence table: `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md:254-255`. Present report listing showed `reference/reports/tester/PKT-27_TESTER_REPORT.md` and `reference/reports/security/PKT-27-guard-report.json` only for PKT-27 security scope. | Align evidence paths or update the packet through the proper authority. Produce the required security review artifact before overall Reviewer adjudication. |

## Positive Observations
- `WorkerExecutor` is a focused new service rather than burying subprocess details directly in provider orchestration.
- The Conductor automatic path reuses `ConductorRoutingPolicy`, `ConductorLedger`, `ProviderOrchestrationPolicy`, and `ProviderOrchestrationLedger` instead of replacing the existing ledgers.
- PKT-14 captured-output behavior is explicitly downgraded to `captured_output_recovery_only`, and fixture mode remains `fixture_only`; the targeted PKT-14/PKT-25 regression test file passed independently.
- Tests cover approved executable checks, shell/token rejection, timeout, nonzero exit, provider descriptor readiness/tool-unavailable, authority-boundary fields, evidence-before-adjudication ordering, and CLI JSON contract shape.

## Limitations
- I did not run full starter discovery, root JS tests, `harness:validate`, `harness:validation-report`, or `sync-state`; I reviewed Developer/Tester evidence for those broader checks and independently reran only the targeted PKT-27 and PKT-14 regression tests listed above.
- Live external Codex CLI or Claude Code CLI execution was not reviewed; Tester evidence states this was not performed and that deterministic local fake-provider commands were used.
- This lens is not the adversarial security lens or evidence-parity lens. The findings above are raised because they affect code-quality, module-boundary integration, and regression risk, not because this report is taking over those other lenses.

## Initial Review Final Disposition (Historical)
- Code-quality / regression lens disposition: fail.
- Blocking findings: yes, `PKT27-CQR-01` and `PKT27-CQR-02`.
- Recommended route: return to Developer through Orchestrator-controlled remediation, then rerun targeted PKT-27 executor, automated delivery-loop, PKT-14/PKT-25 regression tests, and relevant security/evidence checks.
- No release, publish, starter promotion, residual-risk, Human approval, productization-complete, or packet closeout approval is claimed by this report.

## Remediation Re-review - 2026-07-01

### Updated Sources Reviewed
- `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py`
- `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `reference/reports/developer/PKT-27_REMEDIATION_REPORT.md`
- `reference/reports/tester/PKT-27_TESTER_REPORT.md`
- `reference/reports/security/PKT-27-security-review.json`
- `reference/reports/security/PKT-27-guard-report.json`
- `.agents/artifacts/VALIDATION_REPORT.md`
- `.agents/artifacts/VALIDATION_REPORT.json`
- this prior regression review report

### Independent Checks Run After Remediation
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 6 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 4 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`: pass, 22 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test`: latest sequential rerun pass, 241 tests, 1 skipped. Any prior parallel-load timeout/failure was not accepted as closeout evidence.
- `$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test`: pass. Pretest Node.js runtime check passed with Node.js 24.14.0, `harness:skills-check` dry run passed, and root JS suite passed 492 tests.

### Required Verification Points
- Sensitive output redaction before evidence persistence: pass. `worker_executor.py` now computes `sensitive` before normal stdout/stderr writes and uses `_write_redacted_output` for sensitive blocked results (`worker_executor.py:94`, `worker_executor.py:108`, `worker_executor.py:149`, `worker_executor.py:414`). Tests assert secret and timeout-secret output are not present in persisted stdout evidence (`test_pkt27_worker_executor.py:98`).
- Automatic path `declared_artifacts` propagation: pass. `conductor_worker_e2e.py` passes `command.get("declared_artifacts")` into `WorkerExecutionRequest` (`conductor_worker_e2e.py:380`), and the integrated automatic-mode escape test blocks `worker_artifact_outside_root` (`test_pkt27_automated_delivery_loop.py:122`).
- Side-effect blocking/removal diagnostics: pass for newly created unauthorized files. The executor snapshots permission roots, blocks writes outside artifact/evidence roots, removes newly created side-effect files, and reports `worker_side_effect_outside_artifact_root` plus `worker_side_effect_new_file_removed` (`worker_executor.py:100`, `worker_executor.py:402`, `worker_executor.py:405`). Test coverage is present at `test_pkt27_worker_executor.py:149`.
- Evidence path consistency: pass for this lens. The packet now requires `reference/reports/tester/PKT-27_TESTER_REPORT.md` and `reference/reports/security/PKT-27-security-review.json`; both exist. The guard report also uses `reference/reports/tester/PKT-27_TESTER_REPORT.md` and includes `reference/reports/security/PKT-27-security-review.json` (`PKT-27-guard-report.json:19-20`).
- Full starter Python regression evidence: pass. Use the latest sequential rerun result only: 241 tests passed with 1 skipped. Prior parallel-load timeout/failure evidence is rejected for closeout purposes.
- Exact `npm test` evidence: pass. Use the latest exact `npm test` run with bundled Node prepended to PATH; 492 root JS tests passed after pretest and skills-check.
- No regression to PKT-14 behavior: pass for the reviewed regression surface. The PKT-14 Conductor worker E2E test suite passed 22 tests, including captured-output recovery behavior and PKT-25 provider-topology regression coverage.

### Finding Disposition
| ID | Prior severity | Remediation status | Re-review judgment |
|---|---|---|---|
| PKT27-CQR-01 | blocking | remediated | pass. Sensitive output is checked before normal persistence and sensitive blocked evidence is redacted. |
| PKT27-CQR-02 | blocking | remediated | pass. Integrated automatic mode now propagates `declared_artifacts` and has an escape negative test. |
| PKT27-CQR-03 | medium | remediated | pass. Tester and security evidence paths are now consistent across packet, guard report, and local files. |

### Remaining Findings
- None for the `code_quality_review` / regression lens after this remediation re-review.

### Residual Risks And Limitations
- Live external Codex CLI or Claude Code CLI subscription execution was not performed; this remains an explicit out-of-scope/residual evidence limitation already recorded by Tester and security evidence.
- Side-effect cleanup is intentionally limited: newly created unauthorized side-effect files are removed, while modified pre-existing files are blocked and diagnosed rather than silently rolled back. This is acceptable for this lens because silent rollback could destroy user-owned state, but it remains a behavior operators should understand.
- `.agents/artifacts/VALIDATION_REPORT.*` reports gate decision `pass` for structural/state validation and workflow evidence consistency only. It is not product closeout, release, or Human approval evidence.

### Re-review Final Disposition
- Code-quality / regression lens disposition after remediation: pass.
- Blocking findings remaining: none.
- Recommended next route: continue to Reviewer adjudication / remaining required independent closeout-lens disposition under the existing Orchestrator-controlled closeout route.
- This report does not approve packet closeout, release, publish, starter promotion, residual risk, Human Owner acceptance, User UAT, or productization-complete.

## Final Delta Re-review - 2026-07-01

### Delta Scope Reviewed
- Built-in provider CLI adapters: `codex_cli_adapter.py` and `claude_code_cli_adapter.py`.
- Automatic Conductor integration for provider-built adapter commands, `declared_artifacts`, `allowedChangeRoots` / `allowed_change_roots`, and `tool_unavailable` propagation in `conductor_worker_e2e.py`.
- WorkerExecutor final-delta behavior for `allowed_change_roots`, `worktree_changes`, side-effect blocking/removal diagnostics, and adapter diagnostic promotion.
- PKT-27 provider CLI scenario tests, executor tests, automated delivery-loop tests, and PKT-14 compatibility tests.
- README automatic provider adapter documentation and `reference/reports/research/PKT-27_PROVIDER_CLI_SCENARIO_MATRIX.md`.
- Latest Tester evidence, including final sequential full-suite pass evidence.

### Independent Checks Run For This Delta
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"`: pass, 4 unittest methods covering the 30 table-driven provider CLI scenarios.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"`: pass, 8 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"`: pass, 5 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`: pass, 22 tests.
- Note: initial sandboxed `py` launches failed before test execution with `CreateProcessAsUserW failed: 5`; the checks above were rerun outside the sandbox because this was a process-creation failure, not a unittest failure.

### Delta Findings

No blocking code-quality or regression findings were found in the final delta.

| Area | Judgment | Evidence / rationale |
|---|---|---|
| Built-in Codex / Claude adapters | pass | Adapters are bounded subprocess wrappers rather than a new orchestration layer. They build provider-specific CLI commands, recover final artifacts/sidecars, classify failures, and keep provider output as evidence. The 30 scenario matrix is covered by table-driven tests. |
| Conductor/provider/evidence integration | pass | Conductor continues to own routing/adjudication while WorkerExecutor owns execution/capture. `declared_artifacts` and `allowedChangeRoots` are propagated into `WorkerExecutionRequest`; missing provider CLI diagnostics are surfaced as `tool_unavailable` rather than product failure. |
| WorkerExecutor `allowedChangeRoots` / `worktree_changes` | pass with residual risk | Declared change roots are validated inside permission roots, undeclared side effects are blocked and newly created side-effect files are removed, and allowed changes are recorded in `outputEnvelope.evidence_provenance.worktree_changes`. Residual risk: broad `allowedChangeRoots` values remain policy-sensitive and should stay constrained by packet/provider descriptor policy in future changes. |
| Side-effect blocking/removal diagnostics | pass | Focused executor tests verify undeclared writes outside artifact/evidence roots produce `worker_side_effect_outside_artifact_root` plus removal diagnostics and remove the new file. |
| Adapter diagnostic promotion | pass | Provider adapter unavailable diagnostics such as `claude_code_cli_unavailable` are promoted to top-level `tool_unavailable`, preserving provider-readiness boundaries without overclaiming automatic provider success. |
| README and scenario matrix | pass | README documents built-in adapter command behavior, `tool_unavailable`, `allowedChangeRoots`, and recovery-mode boundaries. Scenario matrix records 30 provider CLI scenarios and separates live Codex / unavailable-Claude evidence from closeout approval. |
| PKT-14 compatibility | pass | PKT-14 targeted suite still passes. Captured-output and fixture paths remain downgraded recovery/fixture evidence and do not satisfy normal automatic delivery-loop readiness. |
| Test quality | pass with limitations | The delta has meaningful positive and negative coverage for command construction, provider failures, JSON parsing, unavailable tools, artifact sidecars, side-effect blocking, allowed worktree changes, and PKT-14/27 compatibility. Limitation: adapter command tests primarily patch `subprocess.run` and assert command tokens/side effects; they do not fully prove live authenticated Claude execution, and Codex global-option ordering is better covered by code/scenario evidence than by an explicit ordering assertion. |

### Remaining Residual Risks
- Live authenticated Claude Code CLI execution remains unproven on this workstation because the tool is unavailable; current evidence correctly treats that as `tool_unavailable`, not product failure.
- Live Codex adapter evidence is recorded in the scenario matrix/Developer evidence, but this re-review independently reran deterministic tests only.
- `allowedChangeRoots` is intentionally powerful for implementation scenarios; future packet/provider policies should keep it narrow and avoid approving whole-repo or authority-state roots unless separately justified.
- This delta review did not rerun full starter discovery or root `npm test`; it relies on latest Tester sequential evidence for those broad regressions and independently reran only the targeted suites listed above.

### Final Delta Disposition
- Code-quality / regression lens disposition after final delta: pass.
- Blocking findings remaining after final delta: none.
- Recommended next route: continue to Reviewer adjudication / remaining required independent closeout-lens disposition under the existing Orchestrator-controlled closeout route.
- This report does not approve packet closeout, release, publish, starter promotion, residual risk, Human Owner acceptance, User UAT, or productization-complete.
