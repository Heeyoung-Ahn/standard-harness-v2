# PKT-14 Tester Report

- Work item: `PKT-14_CONDUCTOR_WORKER_E2E`
- Workflow: Tester
- Status: pass; ready for Orchestrator route to Reviewer

## Tested Scope
- Copied-starter `conductor-worker-e2e` JSON CLI contract.
- Deterministic fixture worker/verifier route.
- Output envelope refs, provider/conductor adjudication, and read-model authority boundary.
- Real CLI evidence status separation.
- Trusted captured-output real-smoke ingestion boundary.
- Unsafe command, invalid packet id, missing readiness precondition, failed/timeout
  capture, inline capture, and sensitive capture rejection.
- Operating QA queryability for fixture vs real CLI evidence status.
- Root/starter validation evidence produced by Developer.

## Commands And Results
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"`
  - Result: pass, 11 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_provider_neutral_orchestration.py"`
  - Result: pass, 14 tests, 1 skipped.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"`
  - Result: pass, 8 tests.
- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test`
  - Result: pass, 134 tests, 1 skipped.
- `npm.cmd run harness:validate`
  - Result: pass, 0 findings.
- `npm.cmd test`
  - Result: pass, 483 tests.
- `python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-14 --mode fixture`
  - Result: pass.
  - `selectedRoute`: `cross_llm_worker_verifier`
  - `realCliEvidenceStatus`: `not_applicable`
  - `authorityBoundary.approvalStateMutationAllowed`: `false`
- `python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness operating-qa --question "Did PKT-14 use fixture evidence or real CLI evidence?" --max-answer-chars 1200`
  - Result: pass.
  - Evidence refs include `_ops/evidence/PKT-14/conductor-worker-e2e/evidence-index.json`.
  - Diagnostic ids: `[]`.

## Acceptance Matrix
| Acceptance | Tester Result | Evidence |
| --- | --- | --- |
| A1 Operator-facing E2E surface | pass | CLI fixture command returns required JSON contract fields. |
| A2 Worker execution and envelope intake | pass | Focused tests and fixture CLI produce worker/verifier envelopes and ledger records. |
| A3 Real CLI smoke boundary | pass with manual-required live-provider boundary | Real CLI live execution not run; fixture reports `not_applicable`; trusted captured-output path requires hash-verified `_ops/capture/**` artifact, role/provider/adapter records, successful exit/non-timeout status, and sensitive-material screening. |
| A4 Adjudication without approval authority | pass | `truth_claim=false`; `approvalStateMutationAllowed=false`. |
| A5 Security and boundary negative cases | pass | Focused tests and provider orchestration regression cover unsafe descriptors, invalid packet ids, missing timeout/cancel readiness, failed/timeout capture, inline capture rejection, sensitive capture rejection, path/stale/direct-mutation/mock-success boundaries. |
| A6 Scope control and operating intelligence | pass | No PKT-15 scope observed; operating-qa query returns pass for fixture/real CLI status question. |

## Untested / Manual-Required Scope
- Authenticated real Codex CLI / Claude Code CLI smoke was not executed. This remains
  explicit manual-required boundary evidence, not a failed test. Captured real-smoke
  ingestion is tested through hash-verified harness capture artifacts, not live provider
  CLI execution.

## Recommendation
Route to Reviewer. No Tester blocker is open.
