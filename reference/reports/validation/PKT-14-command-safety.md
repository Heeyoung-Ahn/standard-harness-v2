# PKT-14 Command Safety Evidence

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Scope: unsafe command descriptor rejection
- Command: `py -3 starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-14 --mode real-smoke --real-cli-approval --command-descriptor-json '{"argv":["codex","exec","$(Get-Content secret.txt)"],"shell":false,"timeout_seconds":120,"cancel_supported":true,"non_interactive_capture":true,"input_snapshot_current":true,"explicit_local_configuration":true,"authenticated_outside_repo":true,"captured_output":{"trusted_harness_capture":true}}'`
- Exit code: 0
- Status: pass

## Result Summary
- Result status: `execution_blocked`
- `realCliEvidenceStatus`: `execution_blocked`
- Diagnostics: `unsafe_command_descriptor`, `untrusted_shell_interpolation`
- No worker runs, verifier runs, output envelopes, or evidence refs were produced.

## Negative Matrix
- Newline in argv token: blocked by `unsafe_command_descriptor`.
- Pipe token: blocked by `unsafe_command_descriptor`.
- Redirect tokens `>` and `<`: blocked by `unsafe_command_descriptor`.
- Subshell/interpolation token `$(`: blocked by `unsafe_command_descriptor`.
- `shell: true`: blocked by `unsafe_command_descriptor`.
- Missing `timeout_seconds`: blocked by `execution_preconditions_missing`.
- Missing/false `cancel_supported`: blocked by `execution_preconditions_missing`.
- Invalid packet ids containing path separators, traversal, drive syntax, or empty value:
  blocked by `invalid_packet_id` before any `_ops` path is created.

## Raw Output Evidence
- Unsafe descriptor CLI raw status: `{"status":"ok","conductorWorkerE2E":{"status":"execution_blocked","realCliEvidenceStatus":"execution_blocked","diagnostic_ids":["unsafe_command_descriptor","untrusted_shell_interpolation"],"workerRuns":[],"verifierRuns":[],"evidenceRefs":[]}}`
- Packet path escape CLI raw status: `{"status":"ok","conductorWorkerE2E":{"status":"execution_blocked","realCliEvidenceStatus":"execution_blocked","diagnostic_ids":["invalid_packet_id"],"workerRuns":[],"verifierRuns":[],"evidenceRefs":[]}}`

## Regression Coverage
- Focused test command: `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`
- Result: pass, 11 tests.
- Provider policy command safety command: `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_provider_neutral_orchestration.py"`
- Result: pass, 14 tests, 1 skipped.
