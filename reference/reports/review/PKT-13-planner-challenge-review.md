# PKT-13 Planner Challenge Review

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Reviewer agent: `019f143b-dda5-7d51-a67d-ff490315f338`
- Review type: `challenge_review`
- Initial decision: fail
- Final decision: pass
- Current status: pass after corrections
- Date: 2026-06-30

## Initial Findings

1. Blocking: the packet did not name the Human Owner QA CLI/status command.
2. Blocking: reset/retention was still a proposed disposition, not a closed PKT-13 contract.

## Required Corrections

- Name the exact QA/status command, expected invocation shape, and required JSON fields.
- Close the reset/retention decision: define which query/index artifacts reset with `_ops`, which evidence records remain retained, what diagnostics appear after reset, and which tests prove non-bypass.
- Add explicit evidence expectations for command smoke, post-reset query behavior, and evidence-retention preservation.

## Corrections Applied

- PKT-13 now names `operating-qa` as the Human Owner QA command.
- Required copied-starter invocation is specified as:
  `python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "<question>"`.
- Reset/retention is closed against existing `ops-reset`: resettable QA/index `_ops` read models reset; `_harness/**`, `product/**`, and retained evidence records are preserved; post-reset QA must fail closed with no-source/freshness diagnostics until source regeneration.
- Added reset/retention evidence path `reference/reports/memory/PKT-13-reset-retention.md` and verification requirements.

## Rerun Result

Final independent challenge rerun passed.

Second-pass checks:

- `operating-qa` is explicitly named with copied-starter invocation.
- Reset/retention is closed against existing `ops-reset`, with resettable `_ops` QA/read models, preserved `_harness/**` and `product/**`, retained evidence boundaries, and post-reset fail-closed diagnostics.
- PKT-14 and PKT-15 non-absorption remains explicit.
- Existing `ops-reset` implementation removes `_ops` only and recreates required folders, so the packet reset boundary is implementable against current code.

Regression check:

- `py -3 -B -m unittest discover -s _harness\test -p "test_long_memory_question_answering.py"` passed with `8` tests OK.

Ready For Code may be requested after independent `packet_doc_review` pass and explicit Human Owner approval.
