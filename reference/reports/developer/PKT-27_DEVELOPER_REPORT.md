# PKT-27 Developer Report

Packet: PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP
Date: 2026-07-01
Owner role: Developer
Status: implementation complete for Developer handoff

## Implemented Changes

- Added `standard_harness.workflow.worker_executor.WorkerExecutor` and
  `WorkerExecutionRequest`.
- Added bounded subprocess execution with `shell=false`, approved executable checks,
  timeout/cancel preconditions, unsafe token rejection, artifact-root containment,
  stdout/stderr capture, output envelope persistence, artifact hashing, timeout/failure
  status, and secret-like output blocking.
- Added A9 remediation for root development path leakage: worker stdout/stderr/artifact
  content that exposes the harness root or permission roots is blocked, and public
  worker envelopes use harness-root relative path references.
- Added post-closeout-lens security remediation: sensitive blocked outputs are persisted
  only as redacted markers, timeout output is scanned before timeout evidence can pass,
  worker side effects outside artifact/evidence roots are blocked, and automatic mode
  passes declared artifacts into the executor.
- Added provider descriptor readiness examples for `codex` and `claude_code`, returning
  either safe descriptors or explicit `tool_unavailable` without product-identity
  contamination.
- Extended `ConductorWorkerE2ERunner` with `automatic` mode that reads
  `providerTopology`, routes Developer/Reviewer work, invokes bounded worker commands,
  records provider runs, records conductor adjudication, writes evidence index, and
  returns Tester as the next route.
- Added internal ledger-envelope conversion so provider boundary validation still uses
  absolute scoped paths while public evidence remains redacted.
- Changed trusted captured output from normal pass evidence to
  `captured_output_recovery_only` with `productizationEvidence=false`.
- Changed fixture mode to `fixture_only` readiness and non-productization evidence.
- Updated existing PKT-14 Conductor-Worker tests to preserve provider-topology
  regression coverage under the new captured-output recovery-only contract.
- Updated `_harness/README.md` to state that normal delivery loop execution is automatic
  and that Human Owner copy/paste of worker prompts/results is not the normal operating
  model.

## Verification

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

## Boundary

This report does not approve closeout, release, residual risk, or Human Owner acceptance.
It is Developer evidence for Orchestrator routing to Tester/Reviewer.
