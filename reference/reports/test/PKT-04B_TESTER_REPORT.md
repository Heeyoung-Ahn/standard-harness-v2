# PKT-04B Tester Report

- Packet: `PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING`
- Tester route: Developer -> Tester under Orchestrator
- Verification status: pass

## Commands Run
- `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe _harness\test\test_operating_folder_contract.py`
  - Workdir: `starter/standard-harness`
  - Result: pass, 16 tests passed, 0 failed.
- `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -B -m unittest discover _harness\test`
  - Workdir: `starter/standard-harness`
  - Result: pass, 79 tests passed, 0 failed, 1 skipped.
- `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -B _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime`
  - Workdir: `starter/standard-harness`
  - Result: ok; `validationMode: installed-runtime`; `cleanExportProof: false`; `runtimeGeneratedStateTolerated: true`.
- Filtered clean-candidate smoke validation using `create_starter_smoke_copy(root)`, `python -B harness_cli.py validate --starter --clean-export`, and `cleanup_starter_smoke_copy(copy)`.
  - Result: ok; `validationMode: clean-export`; `cleanExportProof: true`; `runtimeGeneratedStateTolerated: false`; cleanup status `deleted`.
- `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --test .harness/test/*.test.js`
  - Workdir: repository root
  - Environment: `TEMP=C:\tmp`, `TMP=C:\tmp`
  - Result: pass, 483 tests passed, 0 failed.
- `C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .harness\runtime\state\harness-cli.js validate`
  - Workdir: repository root
  - Result: ok, structuralReady true, cutoverReady true, findings 0.

## Acceptance Coverage
- Clean-export and installed-runtime modes are distinguishable by CLI output and validation flags.
- Clean-export validation rejects representative non-cache contamination, including secrets and sensitive-evidence artifacts.
- Secret-content validation covers quoted JSON/YAML key-value forms, quoted `Authorization: Bearer ...`, fine-grained GitHub token forms, root docs, `_harness` policy files, product test fixtures, and larger product docs.
- Generated validation reports named with hyphens or underscores and root `logs/` directory contents are rejected.
- Oversized scan-eligible text/config/doc files fail closed as `secrets`.
- Clean-export validation rejects generic root `.harness` residue while installed-runtime tolerates approved `.harness/state` residue only as non-export runtime state.
- Installed-runtime validation is not reported as clean-export proof and tolerates approved `_ops` runtime records.
- Starter operating-folder tests preserve PKT-04A compact PMO expectations.
- Smoke-copy validation deletes successful temporary copies under the bounded temp root.
- Cleanup refuses unmanaged smoke directories, prunes preserved managed copies, and does not delete the current preserved diagnostic copy.
- Root/starter regressions validate after the PKT-04B change.

## Residual Test Gaps
- No browser evidence was run because PKT-04B has no browser/UI surface.
- No dependency audit was run because no third-party dependency changed.
- Starter promotion/export packaging was not run because PKT-10 remains out of scope.

## Recommendation
- Route to Reviewer for source parity, evidence quality, independent closeout lens evaluation, and closeout preflight.
