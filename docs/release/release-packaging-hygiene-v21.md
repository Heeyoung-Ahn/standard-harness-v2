# V2.1 Release Packaging Hygiene

Release archives are built from `git ls-files`, not recursive filesystem snapshots.

Excluded artifacts include local runtime state, generated SQLite state, bytecode, virtual environments, build output, and cache folders. Required release documentation must be tracked before it can enter an archive.

Verification commands:

```powershell
python tools\run_full_regression.py
python -m unittest tests.contract.test_release_packaging_hygiene tests.contract.test_full_regression_runner_contract tests.contract.test_release_archive_uses_tracked_files_only tests.contract.test_release_archive_excludes_untracked_temp_files tests.contract.test_full_regression_runner_records_last_test
```
