# PKT-27 Tester Report

Packet: PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP
Date: 2026-07-01
Owner role: Tester
Status: pass for Reviewer routing

## Tested Scope

- Worker executor safe subprocess invocation, evidence capture, timeout handling,
  unsafe descriptor rejection, unapproved executable rejection, path escape rejection,
  secret/root-path leakage blocking, and provider descriptor readiness/tool-unavailable
  outcomes.
- Automatic Conductor-Worker delivery loop: provider topology routing,
  Developer/Reviewer worker command execution, provider run evidence persistence before
  adjudication, authority boundary preservation, and next-route selection.
- Captured-output and fixture modes: verified as recovery/fixture only and not
  productization evidence.
- Existing Conductor-Worker E2E/provider-topology regression surface from PKT-14.
- Full starter Python test suite and root harness JS test suite.
- Harness validate, validation-report, and sync-state.

## Acceptance Mapping

| ID | Tester result | Evidence |
|---|---|---|
| A1 | pass | `test_pkt27_worker_executor.py`, `test_pkt27_automated_delivery_loop.py` |
| A2 | pass | Worker envelope test verifies stdout/stderr refs, exit code, duration, hashes, artifacts, timeout/cancel fields, input snapshot hash. |
| A3 | pass | Automatic loop test verifies provider runs are recorded before conductor adjudication. |
| A4 | pass | Automatic loop test verifies `truth_claim=false`, `approvalStateMutationAllowed=false`, and next route `Tester`. |
| A5 | pass | Provider descriptor tests cover Codex descriptor readiness and Claude Code `tool_unavailable`, both without product identity. |
| A6 | pass | Captured-output recovery-only test verifies `captured_output_recovery_only` and `productizationEvidence=false`. |
| A7 | pass | Fixture test verifies `fixture_only` readiness and non-productization evidence. |
| A8 | pass | Unsafe descriptor matrix covers shell, pipe, missing timeout, unapproved executable, and artifact escape. |
| A9 | pass after remediation | Root path leakage and secret output now block as `worker_output_secret_rejected`; sensitive blocked output is redacted in evidence files; newly created worker side effects outside artifact/evidence roots are blocked and removed; public envelopes use root-relative refs. |
| A10 | pass | Timeout test returns `automatic_execution_timeout` and `worker_timeout_not_pass`. |
| A11 | pass | CLI automatic contract and README parity verified by tests/docs update. |
| A12 | pass | Starter Python suite, exact `npm test`, harness validate, validation-report, and sync-state pass. |

## Verification Evidence

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
```

Result: passed, 6 tests.

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
```

Result: passed, 4 tests.

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"
```

Result: passed, 22 tests.

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test
```

Result: passed, 241 tests, 1 skipped.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node --test .harness\test\*.test.js
```

Result: passed, 492 tests.

```powershell
$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test
```

Result: passed. `pretest` Node.js runtime check passed with Node.js 24.14.0,
`harness:skills-check` dry run passed, and root JS test suite passed 492 tests.

Final sequential rerun after rejecting a parallel-load timeout flake as closeout evidence:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test
```

Result: passed, 241 tests, 1 skipped.

```powershell
$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test
```

Result: passed, 492 tests.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node .harness\runtime\state\harness-cli.js validate
```

Result: pass. Non-blocking existing warning remains for `PKT-24_SURVEY_APP_WEB_REVIEW`.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node .harness\runtime\state\harness-cli.js validation-report
```

Result: pass, gate decision pass.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node .harness\runtime\state\harness-cli.js sync-state
```

Result: pass, workflow gate open for Tester verification.

## Untested Scope

- Real external Codex or Claude Code subscription CLI invocation against live provider
  services was not performed. PKT-27 acceptance is satisfied with deterministic local
  fake provider commands plus provider descriptor/tool-unavailable evidence.
- Release, publish, starter promotion, residual-risk acceptance, User UAT, and
  productization-complete approval are outside Tester authority and remain separate
  approval gates.

## Recommendation

Route to Reviewer for closeout review. No Tester blocking findings remain.
