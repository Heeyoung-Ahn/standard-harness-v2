# PKT-13 Source Model Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Status: pass

## Implemented Source Model
`LongMemorySourceDiscovery` now discovers queryable operating-intelligence records for:

- packet state: `_ops/packets/**`, `reference/packets/**`
- evidence: `_ops/evidence/**`, `reference/reports/validation/**`
- closeout: `product/docs/packets/**`, `reference/reports/closeout/**`
- review: `_ops/reviews/**`, `reference/reports/review/**`
- PM: `_ops/pmo/**`, `product/docs/pmo/**`
- wiki and wiki proposals: `_ops/wiki/**`, `_ops/wiki-proposals/**`
- decisions, risks, blockers, friction, active context

Every normalized source record includes `sourceType`, `path`, `category`,
`authorityTier`, `trustStatus`, `freshnessStatus`, `classification`, `evidenceRefs`, and
`answerEligibility`.

## Verification
- `test_source_model_covers_closeout_review_friction_active_context_and_trust_status`
  verifies closeout, review, friction, active-context, and trust status coverage.
- `test_long_memory_question_answering.py` verifies packet, evidence, wiki, wiki proposal,
  PM, blocker, decision, risk, and active-context coverage.

## Boundary
Hidden placeholder files such as `.gitkeep` are ignored so clean starter seed folders do
not become false source records.
