# PKT-04B Developer Report

- Packet: `PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING`
- Developer route: Orchestrator -> Developer
- Implementation status: complete for Developer scope after independent-review remediation

## Changed Behavior
- Clean-export contamination classification now rejects representative sensitive-evidence artifacts with a `sensitive_evidence` diagnostic.
- Sensitive-evidence source exemption is path-specific to the managed starter source module, not a blanket `.py` bypass.
- Clean-export classification uses starter-relative paths, preventing false positives from host parent directory names.
- Secret detection covers common secret filenames and bounded text/config/doc content scans, including quoted JSON/YAML-style key-value forms, quoted `Authorization: Bearer ...`, product test fixtures with real secret material, and fine-grained GitHub token forms, while avoiding normal harness source/test/policy false positives.
- Generated validation reports named with hyphens or underscores and root `logs/` directory contents are rejected in clean-export mode.
- Oversized scan-eligible text/config/doc files fail closed as `secrets` instead of silently bypassing content scanning.
- Generic root `.harness` residue is rejected in clean-export mode; approved `.harness/state` residue is tolerated only in installed-runtime mode and is not clean-export proof.
- Installed-runtime mode now tolerates approved `_ops` runtime records while remaining explicitly not clean-export proof.
- Smoke workspace cleanup now deletes/prunes only managed `shv2-starter-` workspaces, refuses unmanaged directories inside the smoke root, and preserves the current diagnostic copy even when pruning.
- PKT-04A compact PMO folder expectations remain enforced.

## Changed Files
- `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`
- `starter/standard-harness/_harness/system/standard_harness/security/redaction.py`
- `starter/standard-harness/_harness/system/standard_harness/starter/smoke_workspace.py`
- `starter/standard-harness/_harness/test/test_operating_folder_contract.py`
- `starter/standard-harness/README.md`
- `reference/packets/PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING.md`
- `reference/reports/artifact-sync/PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING.md`
- `reference/reports/tdd/PKT-04B-red.md`
- `reference/reports/tdd/PKT-04B-green.md`
- `reference/reports/security/PKT-04B-security-review.json`

## Tests And Validation
- RED: `reference/reports/tdd/PKT-04B-red.md`
- GREEN: `reference/reports/tdd/PKT-04B-green.md`
- Focused starter lifecycle: `python.exe _harness\test\test_operating_folder_contract.py` -> 16 passed, 0 failed.
- Starter regression: `python.exe -B -m unittest discover _harness\test` -> 79 passed, 0 failed, 1 skipped.
- Starter installed-runtime validation: `python.exe -B _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime` -> ok; `cleanExportProof: false`; `runtimeGeneratedStateTolerated: true`.
- Starter clean-export smoke validation: filtered clean-candidate bounded temp copy with `python -B` -> ok; `cleanExportProof: true`; `runtimeGeneratedStateTolerated: false`; cleanup status `deleted`.
- Root regression: `node.exe --test .harness/test/*.test.js` with `TEMP`/`TMP` pinned to `C:\tmp` -> 483 passed, 0 failed.
- Root validator: `node.exe .harness\runtime\state\harness-cli.js validate` -> ok, structuralReady true, cutoverReady true, findings 0.

## Security Evidence
- `reference/reports/security/PKT-04B-security-review.json`
- Decision: pass.
- Residual risk: low after behavior-based contamination tests, installed-runtime tests, cleanup safety tests, and clean-export smoke validation.

## Notes
- `npm run harness:validate` was not used as final evidence because this Windows session's npm shim is unreliable; the same harness validator was executed directly with the bundled Node runtime.
- A prior root test attempt failed on Windows temp cleanup `EPERM`; rerun with `TEMP`/`TMP` pinned to `C:\tmp` passed all 483 tests.
- PKT-04B does not approve release, publish, starter promotion, generated-state mutation, PKT-05, PKT-06, or PKT-10 work.
