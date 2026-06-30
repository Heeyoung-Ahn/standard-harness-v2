# PKT-18 TDD Evidence

## Packet
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Date: 2026-06-30
- Scope: fresh copied-starter QA provenance, inherited-root omission, abstain/fail-closed behavior, and authority-boundary fixtures.

## RED / Failure Pressure
- Negative fixtures were added for behaviors that must not be accepted at closeout:
  - inherited `reference/packets` and root closeout/review memory shaping a fresh copied-starter answer;
  - copied-project source losing to a newer inherited-root source;
  - evidence refs pointing at root closeout evidence;
  - PM summaries attempting approval authority;
  - stale generated Active Context and low-authority sources shaping an answer;
  - sensitive evidence entering answer context;
  - retained validation evidence becoming copied-project answer authority instead of evidence-ref proof only;
  - traversal evidence refs escaping allowed evidence namespaces;
  - local DB/cache files becoming memory sources.

## GREEN Evidence
| Command | Result |
|---|---|
| `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` | pass, 7 tests |
| `py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test*.py"` | pass, 156 tests, 1 skipped |

## REFACTOR Evidence
- Behavior is implemented in `standard_harness.memory.question_answering` through existing discovery, index-building, evidence-ref validation, and answer-composition contracts.
- No new release, publish, or approval authority path was added.
- Reference retention was narrowed to validation evidence only, preserving clean-export/fresh-starter boundaries.
- After challenge review, retained validation evidence was further narrowed so it can support evidence refs but cannot become a QA answer source by itself.
- After adversarial security review, evidence-ref validation was further narrowed so resolved paths cannot escape allowed evidence namespaces through `../`.

## Residual Limits
- This TDD evidence supports PKT-18 only.
- It does not approve release, publish, starter promotion, productization completion, residual-risk acceptance, User UAT, or PKT-19 through PKT-23.
