# PKT-13 Tester Report

## Scope
- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Workflow: Tester
- Tested scope: starter operating-intelligence QA service, named `operating-qa` CLI contract, source-model coverage, bounded retrieval diagnostics, authority/freshness behavior, sensitive/reset boundaries, and root validation parity.
- Untested scope: real Codex CLI / Claude Code CLI worker E2E, automatic friction call-site promotion, starter-promotion rehearsal, browser UI, and release/publish flow. These are explicitly out of PKT-13 scope and remain PKT-14/PKT-15 follow-ups.

## Acceptance Mapping
| Acceptance | Tester Result | Evidence |
| --- | --- | --- |
| A1 Source Model | Pass. Source records include source type, path/id, authority tier, trust/freshness status, sensitivity, evidence refs, and answer eligibility for operating-intelligence sources including packet, evidence, closeout, review, PM/wiki/decision/risk/blocker/friction/context-style sources. Missing categories emit diagnostics instead of inferred claims. | `starter/standard-harness/_harness/test/test_pkt13_operating_intelligence_qa.py`; `reference/reports/memory/PKT-13-source-model.md` |
| A2 Human Owner QA Contract | Pass. `operating-qa --question` is present and returns the required JSON answer/read-model contract, including authority-boundary refusal for approval/closeout/release requests. Clean starter seed returns blocked/no-source diagnostics instead of unsupported claims. | `reference/reports/memory/PKT-13-qa-cli.md` |
| A3 Bounded Retrieval And Context Budget | Pass. `max_sources` and answer character limits are tested; source budget diagnostics are emitted and raw broad evidence body loading is not required for claims. | `reference/reports/memory/PKT-13-context-budget.md` |
| A4 Authority And Freshness | Pass. Generated/current-context-like sources are read-model data only and cannot approve gates or override packet/evidence/review/closeout authority. Stale, low-authority, and missing-evidence conditions block or diagnose answer claims. | `reference/reports/validation/PKT-13-negative-sources.md`; `starter/standard-harness/_harness/test/test_long_memory_question_answering.py` |
| A5 Sensitive Evidence And Reset/Retention Boundary | Pass. Sensitive/prompt-like sources are omitted from answer claims, fake `_ops/evidence/**` refs are rejected, retained `reference/**` and `product/docs/packets/**` evidence refs can remain valid, and reset policy reports `ops-reset` with `_ops` read models resettable while `_harness/**` and `product/**` are preserved. | `reference/reports/memory/PKT-13-reset-retention.md`; `reference/reports/validation/PKT-13-negative-sources.md` |
| A6 Scope Control | Pass. No real provider CLI worker execution, friction call-site automation, starter-promotion rehearsal, browser UI, or release/publish behavior was added or claimed. | packet out-of-scope section; changed-file review |

## Commands Re-Run By Tester
| Command | Result |
| --- | --- |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"` | Pass: 10 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"` | Pass: 8 tests |
| `npm.cmd run harness:validate` | Pass: `findings: []`, `structuralReady: true`, `cutoverReady: true` |

## Prior Developer Evidence Reviewed
| Evidence | Result |
| --- | --- |
| Full starter Python discovery: `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` | Pass: 123 tests, 1 skipped |
| Root Node regression: `npm.cmd test` | Pass: 483 tests |
| Root validation: `npm.cmd run harness:validate` | Pass: findings empty |
| State sync: `npm.cmd run harness:sync-state` | Pass: finding count 0 |
| CLI smoke: `py -3 -B starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness operating-qa --question "What happened and what should happen next?"` | Pass: clean starter seed returns blocked/no-source diagnostics without unsupported claims |

## Tester Disposition
- Recommendation: pass to Reviewer.
- Blocking findings: none.
- Residual risk: Reviewer must still run the four independent closeout lenses required by PKT-13 because this is a high-risk harness-system/core contract change.
- Handoff boundary: Reviewer may adjudicate source parity and evidence quality but must not replace missing independent lens evidence with this Tester report.

## Remediation Verification
- Remediation source: `reference/reports/developer/PKT-13_REMEDIATION.md`
- Reviewer blockers retested: raw evidence broad loading, prompt-like source rejection,
  classifier fail-closed behavior, and retained reference evidence after reset.
- Tester rerun after Developer handoff: 2026-06-30.

| Command | Result |
| --- | --- |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"` | Pass: 10 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"` | Pass: 8 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt05_security_and_transition_gates.py"` | Pass: 3 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` | Pass: 123 tests, 1 skipped |
| `npm.cmd run harness:validate` | Pass: `findings: []`, `structuralReady: true`, `cutoverReady: true` |

Remediation acceptance:
- A3 bounded retrieval: pass. Raw non-index evidence under `_ops/evidence/**` is not
  discovered or answer-eligible; answer-time source caps still emit diagnostics, and
  risk/next questions keep relevant risk and PM/context sources before truncation.
- A4/A5 authority and sensitive-source handling: pass. Prompt-like source text is
  omitted with diagnostics, and missing classifier policy fails closed.
- A5 reset/retention: pass. Retained `reference/**` evidence can be cited after `_ops`
  reset only after source regeneration, and retained reference evidence-index entries
  must pass trusted/fresh/resolved/clean validation before they can support claims.

Remaining Tester note:
- PM structured TSV/CSV source coverage was not expanded during remediation. Tester treats
  that as a Reviewer/Planner scope-disposition question because PKT-13 implementation
  still covers PM Markdown summaries and does not claim PKT-15 promotion rehearsal.
