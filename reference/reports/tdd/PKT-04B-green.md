# PKT-04B GREEN Evidence

- Packet: `PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING`
- Route: Orchestrator -> Developer
- TDD status: GREEN after implementation and independent-review remediation.

## Implemented Behavior
- `StarterContaminationChecker` now classifies sensitive evidence artifacts as `sensitive_evidence`, with only the managed starter source module `validation/sensitive_evidence.py` exempted.
- Clean-export classification now uses starter-relative paths for contamination rules while keeping absolute paths in diagnostics.
- Secret detection now covers common secret filenames and bounded content scans for product/_ops artifacts without flagging normal harness source/test fixture files.
- Installed-runtime mode now tolerates approved `_ops` runtime records while clean-export mode still rejects packet history, evidence history, and generated active context.
- Smoke cleanup now deletes only managed `shv2-starter-` workspaces, ignores unmanaged stale directories, and prunes preserved managed workspaces to the configured retention count.
- Generic root `.harness` residue is rejected in clean-export mode while approved installed-runtime `.harness/state` residue is tolerated only in installed-runtime mode.
- Secret content detection now covers quoted JSON/YAML-style key-value forms, `Authorization: Bearer ...`, and fine-grained GitHub token forms while avoiding known policy-id false positives.
- Generated validation reports named with hyphens or underscores, root `logs/` directory contents, and product test fixtures containing real secret material are rejected.
- Oversized scan-eligible text/config/doc files fail closed as `secrets` instead of silently bypassing content scanning.
- Cache artifacts containing `sensitive_evidence` in their bytecode path are classified as `cache_files` before sensitive-evidence path checks, preserving installed-runtime cache tolerance.

## Focused Command
`C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -B -m unittest _harness.test.test_operating_folder_contract.OperatingFolderContractTests.test_smoke_workspace_cleanup_requires_managed_workspace_prefix _harness.test.test_operating_folder_contract.OperatingFolderContractTests.test_stale_smoke_cleanup_ignores_unmanaged_directories _harness.test.test_operating_folder_contract.OperatingFolderContractTests.test_preserved_smoke_workspaces_are_pruned_to_one_managed_copy`

Workdir: `starter/standard-harness`

Result: `Ran 3 tests`; `OK`.

## Full Focused Lifecycle Command
`C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe _harness\test\test_operating_folder_contract.py`

Workdir: `starter/standard-harness`

Result: `Ran 16 tests in 9.032s`; `OK`.

## Disposition
- GREEN accepted for contamination classification, installed-runtime tolerance, clean-export strictness, PMO folder contract, and smoke cleanup behavior.
