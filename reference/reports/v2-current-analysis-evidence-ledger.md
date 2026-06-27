# V2 Current Analysis Evidence Ledger

## Purpose
Evidence ledger for `reference/reports/v2-current-analysis-for-v2-2.md`.

## Scope
- Spot checks performed by the main agent during planning analysis.
- This is not Tester evidence and does not approve PKT-01 or Ready For Code.

## Command Evidence

### Starter Validation
- Working directory: `starter/standard-harness/`
- Command: `python _harness\bin\harness_cli.py --json --harness-root . validate --starter`
- Result:

```json
{"diagnostics": [], "status": "ok"}
```

### Starter Check
- Working directory: `starter/standard-harness/`
- Command: `python _harness\bin\harness_cli.py --json --harness-root . starter-check`
- Result:

```json
{"starter": {"diagnostics": [], "status": "ok"}, "status": "ok"}
```

### CLI Help
- Working directory: `starter/standard-harness/`
- Command: `python _harness\bin\harness_cli.py --help`
- Result summary:
  - Shows generic dispatcher help.
  - Does not list subcommands or command-specific examples.

### Starter File Count
- Command: `Get-ChildItem -Recurse -File starter\standard-harness | Measure-Object`
- Result: 304 files before Python cache cleanup; 228 files after removing `__pycache__` output.

### Starter File Type Count After Cache Cleanup

```json
[
  {"Count": 161, "Name": ".py"},
  {"Count": 25, "Name": ".yaml"},
  {"Count": 21, "Name": ".json"},
  {"Count": 18, "Name": ".gitkeep"},
  {"Count": 3, "Name": ".md"}
]
```

### Starter Runtime Scale
- Command: count lines in `starter/standard-harness/_harness/system/standard_harness/**/*.py`
- Result: about 15,529 lines across 236 Python files.

### Root v1 Test Surface
- Command: `Get-ChildItem -Recurse -File .harness\test | Measure-Object`
- Result: 61 files.

### Legacy Archive Scale
- Command: `Get-ChildItem -Recurse -File reference\legacy\current-root-v2-docs | Measure-Object`
- Result: 95 files.
- Largest legacy Markdown examples:
  - `docs/implementation/standard-harness-final-product-deferred-implementation-plan-v1.md`: 1,426 lines.
  - `docs/requirements/standard-harness-integrated-requirements-v0.2.md`: 1,130 lines.
  - `docs/implementation/standard-harness-implementation-plan-v1.md`: 1,027 lines.
  - `docs/requirements/standard-harness-v2-1-integrated-work-plan.md`: 963 lines.

## Evidence Limitations
- The Python CLI generates `__pycache__` in the starter tree when executed normally.
- The current starter validator may still pass in installed/copied mode while runtime-generated cache files exist.
- Therefore, current `validate --starter` evidence proves current validator acceptance, not clean payload export readiness.
- No complete copied-repo lifecycle smoke test was executed in this analysis.
