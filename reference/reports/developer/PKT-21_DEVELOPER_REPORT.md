# PKT-21 Developer Report

## Scope
- Packet: `PKT-21_STRUCTURED_PM_SOURCE_INTAKE`
- Implemented scope: structured PM TSV/CSV source intake, WBS/PM round-trip support, PM source to operating-intelligence source conversion, authority-overclaim diagnostics, stale/prompt-like PM source diagnostics, and focused tests.
- Files changed:
  - `starter/standard-harness/_harness/system/standard_harness/pmo/source_intake.py`
  - `starter/standard-harness/_harness/test/test_pkt21_structured_pm_source_intake.py`

## Implementation Summary
- Added explicit `REQUIRED_PM_SOURCE_COLUMNS`.
- Added PM TSV builder and TSV/CSV parser.
- Added validation diagnostics for missing fields, stale rows, PM approval-overclaim rows, and prompt-like PM rows.
- Remediated closeout review findings by requiring `closeout_report_path`, adding sensitive PM row detection/redaction, and broadening prompt/control-text detection.
- Added conversion from PM records to `LongMemorySourceIndexBuilder` source records with `source_type=pmo`, `authority_tier=coordination`, `project_provenance=copied-project`, evidence refs, freshness, and `approval_state_mutation_allowed=false`.
- Approval-overclaim summaries are sanitized so PM rows can remain diagnostic evidence without entering QA answers as approval instructions.
- Sensitive PM rows are converted with `classification=SENSITIVE`, sanitized summaries, and QA omission diagnostics.

## TDD
- RED evidence: `reference/reports/tdd/PKT-21-red.md`
- GREEN evidence: `reference/reports/tdd/PKT-21-green.md`

## Verification
| Command | Result |
|---|---|
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt21_structured_pm_source_intake.py"` | pass, 7 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pmo*.py"` | pass, 8 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"` | pass, 10 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt18_fresh_starter_qa.py"` | pass, 7 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test` | pass, 163 tests, 1 skipped |
| `py -3 -B starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter` | pass |
| bundled Node `harness-cli.js validate` | pass; remaining warnings only for future PKT-22/PKT-23 planning packets |

## Boundaries
- PM rows do not approve Ready For Code, closeout, release, publish, starter promotion, residual risk, User UAT, productization-complete, real-provider readiness, or Conductor delegation.
- PKT-20 real-provider readiness remains unproven and is not changed by PKT-21.
