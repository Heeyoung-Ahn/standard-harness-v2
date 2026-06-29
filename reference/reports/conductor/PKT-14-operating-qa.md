# PKT-14 Operating QA Evidence

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Scope: worker/adjudication source queryability
- Command: `python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness operating-qa --question "Did PKT-14 use fixture evidence or real CLI evidence?" --max-answer-chars 1200`
- Exit code: 0
- Status: pass

## Result Summary
- `operatingQa.status`: `pass`
- `diagnostic_ids`: `[]`
- Evidence refs include `_ops/evidence/PKT-14/conductor-worker-e2e/evidence-index.json`
- Answer states that PKT-14 Conductor worker E2E used fixture evidence.
- Risk section states that fixture evidence must not be treated as real CLI evidence and
  that real CLI smoke may be manual-required.

## Source Model
- Queryability is supplied by `memorySources` in
  `_ops/evidence/PKT-14/conductor-worker-e2e/evidence-index.json`.
- The runner does not synthesize `_ops/wiki`, `_ops/friction`, `_ops/risks`, or
  `_ops/decisions` prose files for this QA path.
- Focused regression:
  `test_fixture_e2e_records_worker_verifier_adjudication_and_qa_source` asserts the
  answer references `evidence-index.json` and those ad hoc source folders are absent.

## Authority Boundary
The operating QA response remains a read model only. It cannot approve Ready For Code,
implementation, closeout, release, residual risk, or human gates.
