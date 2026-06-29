# PKT-12 Copied Starter Smoke Evidence

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Status: pass

## Commands
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"` exited `0`; `16` tests passed.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` exited `0`; full starter suite passed with `113` tests and `1` skip.
- `StarterContaminationChecker().check_root(starter_root, validation_mode="clean-export")` returned `diagnostic_count: 0`.
- Starter source-clean scan returned `cache_dirs: 0` and `pyc_files: 0`.

## Smoke Boundary
- This evidence covers static copied-starter cleanliness and local smoke-copy validation only.
- It does not claim PKT-15 starter-promotion dry-run, copied-starter rehearsal loop, or promotion lifecycle closure.

## Forbidden Payload Coverage
- Root `.git`, `.agents`, `.codex`, `.harness`, root `AGENTS.md`, provider-specific entry contracts, local DB/state, generated validation reports, real `_ops` packet/evidence/active-context history, logs, caches, secrets, sensitive evidence, release evidence, and nested `starter/standard-harness/**` payload leakage are rejected by tests or direct PKT-12 negative fixtures.
- Real `_ops/wiki/**` and `_ops/wiki-proposals/**` state is classified as `real_wiki_state` and rejected from copied-starter source payloads.
- Verification commands use `-B` after source-clean remediation so the starter tree stays free of generated `.pyc` cache artifacts.
- Clean-export evidence checks cache directories as well as `.pyc` files, preventing source payload contamination by generated `__pycache__` or `.pytest_cache` directories.
