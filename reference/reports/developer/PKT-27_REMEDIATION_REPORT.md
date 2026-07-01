# PKT-27 Developer Remediation Report

Packet: PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP
Date: 2026-07-01
Owner role: Developer
Status: remediation complete for Tester rerun

## Findings Remediated

- `PKT27-CQR-01` / security F1: sensitive stdout/stderr is no longer persisted as raw normal evidence before rejection. Secret/root-path output writes redacted marker files, including timeout output that contains sensitive material.
- `PKT27-CQR-02` / security F3: automatic worker commands can now pass `declared_artifacts` into `WorkerExecutionRequest`, so artifact-root escape is enforced in the integrated Conductor path.
- Security F2: worker-created side effects outside artifact/evidence roots are detected by a pre/post file snapshot and cause `automatic_execution_blocked` with `worker_side_effect_outside_artifact_root`. Newly created unauthorized side-effect files are removed and recorded with `worker_side_effect_new_file_removed`; modified pre-existing files remain blocked with explicit diagnostic evidence because silent rollback would be unsafe.
- Requirements-parity security artifact gap: added `reference/reports/security/PKT-27-security-review.json`.
- Provider CLI scenario hardening: added built-in Codex and Claude Code adapter scenario coverage for 30 routing/result-recovery cases, including Codex global approval flag ordering before `exec`, Codex final-message artifact recovery, Claude headless JSON parsing, Claude session resume/continue options, invalid option rejection, provider nonzero/unavailable diagnostics, and metadata/sidecar evidence.
- Implementation worker recovery: added `allowedChangeRoots` so real implementation scenarios can intentionally modify bounded product paths while unauthorized side effects remain blocked. Recovered worktree changes are recorded in the output envelope.
- Tool-unavailable recovery: adapter JSON diagnostics such as `claude_code_cli_unavailable` are promoted by `WorkerExecutor` to `tool_unavailable` instead of being flattened into generic nonzero failure.
- Windows provider-output decoding: Codex and Claude adapters now capture subprocess output with `encoding="utf-8", errors="replace"` so provider Unicode output cannot inject Python `UnicodeDecodeError` tracebacks into adapter evidence on CP949 Windows shells.
- Final security delta remediation: normal automatic delivery now rejects Codex `danger-full-access` and Claude `bypassPermissions`, rejects unapproved provider executable overrides unless listed in `approvedProviderExecutables`, and redacts artifact-root files when secret/root-path material is detected in worker artifacts or provider sidecars.

## Verification

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
```

Result: passed, 9 tests after final security delta remediation.

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_provider_cli_adapters.py"
```

Result: passed, 4 test methods covering 32 concrete provider CLI scenarios.

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
```

Result: passed, 6 tests after built-in provider adapter coverage and provider executable approval enforcement.

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

Result: passed. `pretest` Node.js runtime check passed with Node.js 24.14.0, `harness:skills-check`
dry run passed, and root JS test suite passed 492 tests.

Final sequential rerun after a parallel-load timeout flake:

```powershell
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test
```

Result: passed, 241 tests, 1 skipped.

```powershell
$env:PATH='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH; npm test
```

Result: passed, 492 tests. The earlier parallel full-suite run is not used as closeout evidence.

## Live Provider Evidence

```powershell
codex --version
```

Result: `codex-cli 0.142.5`.

```powershell
$env:PATH = $env:PATH + ';' + $env:USERPROFILE + '\.local\bin'; Get-Command claude -ErrorAction SilentlyContinue
```

Result: `C:\Users\user\.local\bin\claude.exe`.

```powershell
$env:PATH = $env:PATH + ';' + $env:USERPROFILE + '\.local\bin'; claude --version
```

Result: `2.1.197 (Claude Code)`. No authenticated Claude worker execution was run
because no Claude account is configured.

Live Codex built-in adapter smoke:

- Copied starter to `C:\tmp\pkt27-live-scenario-codex-*`.
- Ran `conductor-worker-e2e --mode automatic --real-cli-approval --cli-available` with
  `workerPrompts`, `providerTopology`, `providerCli.codex=["codex"]`, and both
  Developer/Reviewer routed to Codex.
- Result: `status=automatic_execution_pass`,
  `deliveryLoopReadiness=automatic_execution_pass`,
  `realCliEvidenceStatus=automatic_execution_pass`, `productizationEvidence=true`,
  `nextRoute=Tester`.

Claude unavailable harness probe:

- Copied starter to `C:\tmp\pkt27-live-claude-unavailable-*`.
- Routed Developer to `claude_code` with missing executable
  `claude-missing-for-pkt27`.
- Result: `status=tool_unavailable`,
  `realCliEvidenceStatus=tool_unavailable`,
  diagnostic `claude_code_cli_unavailable`.

Live Codex adapter scenario probe:

- Ran seven safe live Codex scenarios against the built-in adapter:
  `S01-read-only-final`, `S02-workspace-write-no-edit`, `S05-json-required`,
  `S06-json-events`, `S07-ignore-rules`, `S08-on-request-boundary`,
  `S10-metadata-sidecar`.
- Result after subprocess decoding fix: all seven returned `exitCode=0`, created the
  requested artifact, created the metadata sidecar, and had no traceback or
  `UnicodeDecodeError` in adapter output.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node .harness\runtime\state\harness-cli.js validate
```

Result: pass; non-blocking PKT-24 warning only.

```powershell
$node='C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'; & $node .harness\runtime\state\harness-cli.js validation-report
```

Result: pass; gate decision `pass`.

## Boundary

This remediation report does not approve release, publish, residual risk, Human Owner
acceptance, productization-complete, or packet closeout. It is Developer evidence for
Tester rerun and Reviewer adjudication.
