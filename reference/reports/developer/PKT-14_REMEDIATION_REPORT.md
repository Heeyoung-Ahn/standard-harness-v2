# PKT-14 Reviewer Remediation Report

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Workflow: Developer remediation after independent lens review
- Status: ready for independent lens rerun

## Remediated Findings
- Code quality CQ-1: real CLI readiness now routes through
  `ProviderOrchestrationPolicy.prepare_execution`; the runner no longer performs
  standalone unsafe command validation.
- Code quality CQ-2: runner-created `_ops/wiki`, `_ops/friction`, `_ops/risks`, and
  `_ops/decisions` prose sources were removed. Operating QA discovery now reads
  `memorySources` embedded in the generated evidence index.
- Challenge F1: trusted captured-output real-smoke path is implemented and covered by
  `test_real_cli_captured_smoke_records_worker_verifier_path`.
- Challenge F2: timeout and cancellation readiness are explicit preconditions and are
  covered by `test_real_cli_missing_timeout_or_cancel_precondition_blocks`.
- Challenge F3: operating QA sourceability is evidence-index backed and asserted by
  `test_fixture_e2e_records_worker_verifier_adjudication_and_qa_source`.
- Security Finding 1: packet id is validated before `_ops/evidence/<packet-id>` path
  construction; path traversal and separator forms are blocked by `invalid_packet_id`.
- Security Finding 2: provider policy now rejects `>` and `<` redirect tokens.
- Evidence EV-1: unsafe command descriptor negative matrix covers newline, pipe,
  redirect, subshell/interpolation, and `shell: true`.
- Evidence EV-2: real CLI live execution remains an explicit approval boundary; trusted
  captured-output ingestion is implemented and unit-verified.
- Evidence EV-3: evidence reports now include raw status summaries and the fixture
  evidence-index SHA-256.
- Code quality CQ-3: real-smoke pass no longer comes from a trusted boolean plus fixture
  synthesis. It now requires role/provider/adapter-specific captured output records and
  writes captured artifacts/envelopes from those records; missing, failed, or timed-out
  captures are blocked.
- Security captured-output finding: real-smoke capture records no longer come from inline
  public descriptor JSON. They must come from a hash-verified `_ops/capture/**` harness
  capture artifact, and descriptor/capture payloads are recursively rejected before
  persistence when sensitive keys or values are present.

## Verification
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`
  - Pass, 11 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_provider_neutral_orchestration.py"`
  - Pass, 14 tests, 1 skipped.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"`
  - Pass, 8 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"`
  - Pass, 10 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test`
  - Pass, 134 tests, 1 skipped.

## Boundary
This report does not close PKT-14. It records Developer remediation evidence for Tester,
Reviewer, and independent lens rerun.
