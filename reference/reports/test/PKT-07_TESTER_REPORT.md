# PKT-07 Tester Report

## Tested Scope
- Conductor selection and entry-file target mapping.
- Selected entry generation and forbidden approval-bypass text rejection.
- Scoped Conductor delegated Ready For Code and Closeout approval validation.
- Planner delegated approval rejection.
- Delegation invalidation for packet hash, risk ceiling, untrusted channel, and missing
  evidence prerequisites.
- Risk/importance routing for direct, single-worker, cross-LLM, and packet-authoring loops.
- Command descriptor and path escape safety.
- Queryable Conductor ledger/read-model events and replay compatibility.
- Delegation lifecycle, forged grant rejection, Human hard-stop validation, and
  verified-by-harness prerequisite enforcement.
- WorkerTaskEnvelope-shaped routing outputs, worker output refs, and adjudication records.
- Adapter real-path/symlink escape protection where symlink creation is available.
- Provider execution readiness rejection for unsafe command descriptors.
- Existing provider-neutral orchestration behavior.
- Clean starter provider-entry contamination behavior.

## Evidence
- `reference/reports/tdd/PKT-07-green.md`

## Tester Judgment
- Focused PKT-07 behavior passed.
- Existing PKT-06 provider orchestration regression passed.
- Starter full unittest discovery passed.
- Starter installed-runtime validation passed.
- Root validation passed after task-packet artifact registration repair and generated-state
  sync; `npm run harness:validate` returned `ok: true` with no findings.
- Remaining residual: one symlink escape regression is skipped when Windows symlink
  creation is unavailable.
