# PKT-13 Operating Intelligence And QA Artifact Sync

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Status: implementation evidence captured

## Sync Matrix

| Source Change | Required Artifact / Surface | Status | Owner |
| --- | --- | --- | --- |
| PKT-13 hardening scope opened from implementation-plan rows. | `reference/packets/PKT-13_OPERATING_INTELLIGENCE_AND_QA.md` | Ready For Code approved and implementation-ready metadata added | Planner |
| Human Owner QA CLI/status contract implemented. | `starter/standard-harness/_harness/system/standard_harness/cli/main.py`; `reference/reports/memory/PKT-13-qa-cli.md` | implemented | Developer / Tester |
| Operating-intelligence source model implemented. | `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`; `reference/reports/memory/PKT-13-source-model.md` | implemented | Developer / Tester |
| Bounded retrieval and stale/sensitive negative fixtures required. | `test_pkt13_operating_intelligence_qa.py`; `test_long_memory_question_answering.py`; `PKT-13-context-budget.md`; `PKT-13-negative-sources.md` | implemented | Developer / Tester / Reviewer |
| `ops-reset` / evidence-retention behavior selected. | `PKT-13-reset-retention.md`; operating-folder reset test | implemented | Developer / Tester |
| Starter command docs updated for new CLI command. | `starter/standard-harness/START_HERE.md` | implemented | Developer |
| PKT-14 and PKT-15 scope excluded. | Packet out-of-scope and closeout review questions. | preserved | Planner / Reviewer |

## Documentation Impact

- `START_HERE.md` now documents `operating-qa` as a read-model command and repeats that
  it cannot approve Ready For Code, implementation, closeout, release, residual risk, or
  human gates.
- Do not edit generated state manually.
- Do not treat PKT-13 as approval for provider CLI E2E, automatic friction capture call sites, or starter-promotion rehearsal.

## Current Evidence
- TDD: `reference/reports/tdd/PKT-13-red.md`; `reference/reports/tdd/PKT-13-green.md`
- Source model: `reference/reports/memory/PKT-13-source-model.md`
- QA CLI: `reference/reports/memory/PKT-13-qa-cli.md`
- Context budget: `reference/reports/memory/PKT-13-context-budget.md`
- Reset/retention: `reference/reports/memory/PKT-13-reset-retention.md`
- Negative sources: `reference/reports/validation/PKT-13-negative-sources.md`
- Starter validation: `reference/reports/validation/PKT-13-starter-validation.md`
- Root validation/regression: `reference/reports/validation/PKT-13-root-validation.json`;
  `reference/reports/validation/PKT-13-root-regression.md`
