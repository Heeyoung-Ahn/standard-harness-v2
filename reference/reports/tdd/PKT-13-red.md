# PKT-13 RED Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Date: 2026-06-30
- Command:
  `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"`
- Result: expected RED failure.

## Expected Failures
- `operating-qa` CLI exited `2` because the command did not exist.
- `LongMemoryQuestionAnsweringService.answer(..., max_sources=3)` raised
  `unexpected keyword argument 'max_sources'`.
- Source discovery did not include `review` and `friction` source types or `trustStatus`.
- Reset policy still reported `resetCommandImplemented: false`.

## Disposition
These failures matched PKT-13 acceptance A1, A2, A3, and A5 before implementation.

## Remediation RED: Independent Review Findings

After four independent closeout lenses, Developer added focused RED tests for accepted
review findings.

Command:
`py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"`

Result: expected RED failure with 4 failing tests.

Expected failures:
- `test_discovery_skips_raw_evidence_bodies_before_answer_budgeting`: raw evidence file
  `_ops/evidence/PKT-13/raw-browser-dump.log` was unexpectedly discovered.
- `test_prompt_like_source_text_is_omitted_from_answers`: missing
  `prompt_like_source_omitted` diagnostic.
- `test_missing_classification_policy_fails_closed`: missing
  `classification_policy_unavailable` diagnostic.
- `test_retained_reference_evidence_can_be_cited_after_ops_reset_and_regeneration`:
  reset policy did not report `reference/**` preserved path.

Disposition: failures reproduced the accepted Reviewer findings for broad raw evidence
loading, prompt-like source text, classifier fail-open behavior, and reset/retention
evidence overclaim.

## Remediation RED: Retained Reference Evidence Trust

After adversarial security rerun, Developer added a focused RED test for retained
`reference/**` evidence trust.

Command:
`py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"`

Result: expected RED failure.

Expected failure:
- `test_untrusted_retained_reference_evidence_blocks_regenerated_answers` returned
  `status: pass` for a retained `reference/reports/validation/*-evidence-index.json`
  fixture whose entries were `fail`, `untrusted`, `stale`, `open`, and `sensitive`.

Disposition: failure reproduced the adversarial security finding that retained
reference evidence-index records were accepted by file existence only.

## Remediation RED: Question-Relevant Bounded Retrieval

After code-quality rerun, Developer added a focused RED test for budget-limited risk and
next-work answers.

Command:
`py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"`

Result: expected RED failure.

Expected failure:
- `test_budget_limited_risk_and_next_questions_keep_relevant_sources` returned risk text
  from earlier packet summaries instead of the eligible risk source when `max_sources=4`.

Disposition: failure reproduced the code-quality finding that answer-time source caps
could drop question-relevant risk/next sources while still returning `status: pass`.
