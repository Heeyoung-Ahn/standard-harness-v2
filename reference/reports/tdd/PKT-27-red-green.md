# PKT-27 TDD Red/Green Evidence

Packet: PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP
Date: 2026-07-01
Owner role: Developer

## Scope

PKT-27 replaces normal user-operated copy/paste worker handling with a Conductor-owned
worker executor and automated delivery loop. Captured worker output remains available
only as bounded recovery evidence, not as normal productization evidence.

## Red Evidence

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
```

Observed pre-implementation failure:

```text
ModuleNotFoundError: No module named 'standard_harness.workflow.worker_executor'
```

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
```

Observed pre-implementation failures:

```text
automatic mode returned execution_blocked instead of automatic_execution_pass
captured output returned execution_blocked instead of captured_output_recovery_only
CLI automatic mode returned execution_blocked instead of automatic_execution_pass
```

Additional A9 remediation RED after Tester review:

```text
test_root_development_path_output_is_blocked_evidence_not_pass
AssertionError: 'automatic_execution_pass' != 'automatic_execution_blocked'
```

Additional envelope-redaction RED:

```text
permission_roots contained an absolute harness root instead of "."
```

Independent closeout lens remediation RED:

```text
secret/root-path stdout was present in normal evidence files after blocked execution
worker side effect outside artifact root returned automatic_execution_pass
automatic mode artifact escape through worker command returned automatic_execution_pass
```

## Green Evidence

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
```

Result:

```text
......
Ran 6 tests in 2.495s
OK
```

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
```

Result:

```text
....
Ran 4 tests in 1.894s
OK
```

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"
```

Result:

```text
......................
Ran 22 tests in 3.646s
OK
```

Command:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test
```

Result:

```text
Ran 241 tests in 35.239s
OK (skipped=1)
```

## Remediation Green Notes

The worker executor now blocks worker stdout/stderr/artifact content that exposes the
harness root or permission roots. Public output envelopes use harness-root relative
paths for permission roots, artifact manifest paths, stdout/stderr refs, envelope refs,
and root-scoped argv values. The automatic delivery loop converts the public redacted
envelope back to an absolute internal envelope only for provider-ledger boundary
validation.

Independent closeout lens remediation added redacted-output persistence checks,
timeout-sensitive-output checks, side-effect detection outside artifact/evidence roots,
and integrated automatic-mode declared-artifact containment.

## Coverage Notes

- Worker executor rejects unsafe shell descriptors, missing timeout/cancel,
  unapproved executables, artifact path escapes, timeouts, nonzero exits, and
  secret-like output.
- Worker executor persists stdout/stderr evidence, structured output envelopes, and
  artifact hashes for approved subprocess runs without exposing harness-root paths in
  the public envelope.
- Provider descriptor examples cover Codex and Claude Code without making either a
  product identity.
- Automatic conductor-worker mode invokes Developer and Reviewer workers from bounded
  command descriptors, records provider runs before adjudication, and returns the next
  route without approval-state mutation.
- Captured-output and fixture modes are explicitly not productization evidence.
