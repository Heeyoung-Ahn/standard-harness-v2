# PKT-13 Context Budget Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Status: pass

## Bounded Retrieval
`LongMemoryQuestionAnsweringService.answer()` now accepts:

- `max_sources`
- `max_answer_chars`

When eligible sources exceed `max_sources`, the answer trims `sourceRefs` and adds the
`source_budget_limited` diagnostic. The answer composes from compact source summaries and
evidence refs.

After independent review, source discovery was also hardened so raw evidence bodies are
not broadly loaded before answer-time budgeting. Evidence discovery now prefers
index-like evidence records such as `evidence-index.json` and `evidence-manifest.json`.
Non-index raw evidence is skipped by default; sensitive-looking raw evidence paths are
represented as path-only omitted sources without reading the body.

## Verification
- `test_answer_uses_bounded_retrieval_and_reports_budget_diagnostic` passed with
  `max_sources=3`, verifying the diagnostic and source cap.
- `test_budget_limited_risk_and_next_questions_keep_relevant_sources` passed with
  `max_sources=4`, verifying question-relevant risk and next-work sources are selected
  before source budgeting.
- `test_discovery_skips_raw_evidence_bodies_before_answer_budgeting` passed, proving a
  raw browser dump under `_ops/evidence/**` is not discovered, summarized, or included in
  answer sections.
- Full starter regression passed with 123 Python tests after the relevance-ordering
  remediation.
- Root Node regression passed with 483 tests.
