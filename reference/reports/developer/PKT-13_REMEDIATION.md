# PKT-13 Developer Remediation

## Source
- Routed from: Reviewer -> Orchestrator -> Developer
- Primary evidence: `reference/reports/review/PKT-13_REVIEW_REPORT.md`
- Accepted findings: raw evidence broad loading, prompt-like source leakage, classifier
  fail-open behavior, reset/retention overclaim.

## Finding Disposition
| Finding | Disposition | Remediation |
| --- | --- | --- |
| A3 raw evidence broad loading | accepted | Evidence discovery now reads index-like evidence records and skips non-index raw evidence by default. Sensitive-looking raw evidence paths are represented path-only as omitted sources without body loading. |
| Prompt-like source rejection missing | accepted | Prompt/control-like source text is omitted with `prompt_like_source_omitted` diagnostics for answer, wiki, handoff, and context-pack targets. |
| Classifier policy failure was fail-open | accepted | Discovery sources are classified `UNCLASSIFIED` when the policy cannot load, and index/answer behavior fails closed with `classification_policy_unavailable`. |
| Reset/retention evidence overclaimed retained reference behavior | accepted | Reset policy now reports `reference/**` as retained evidence reference material when present, and a post-reset regeneration test proves retained reference evidence can be cited. |
| Retained `reference/**` evidence accepted by file existence only | accepted | Retained reference evidence-index records now use the same pass/trusted/fresh/resolved/clean entry validation as `_ops/evidence/**` indexes. A negative test proves failing/untrusted/stale/open/sensitive retained indexes block answers. |
| Bounded retrieval can drop risk/next sources while still passing | accepted | Answer source selection now orders by question intent before applying `max_sources`, and a regression test proves budget-limited risk/next answers keep relevant risk and PM/context sources. |
| PM structured-source coverage narrower than wording | deferred to Reviewer/Planner judgment | No PM scope expansion was implemented. PKT-13 still indexes PM Markdown summaries; structured PM/WBS coverage should remain a follow-up or Planner clarification if Reviewer requires it. |

## Code Changes
- `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
  - added path gating for evidence discovery;
  - added prompt-like source diagnostics and promotion omission records;
  - added fail-closed classification-policy diagnostics;
  - added retained `reference/**` reset-policy path.
  - added trusted-entry validation for retained `reference/**` evidence-index records.
  - added question-intent ordering before source-budget truncation.
- `starter/standard-harness/_harness/test/test_pkt13_operating_intelligence_qa.py`
  - added RED/GREEN tests for raw evidence skipping, prompt-like source omission,
    classifier fail-closed behavior, retained reference evidence after reset, and
    budget-limited risk/next source relevance.
- `starter/standard-harness/_harness/test/test_long_memory_question_answering.py`
  - seeded classification policy in normal discovery fixtures and kept sensitive evidence
    tests body-safe.

## Verification
| Command | Result |
| --- | --- |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"` | pass, 10 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"` | pass, 8 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt05_security_and_transition_gates.py"` | pass, 3 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"` | pass, 16 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` | pass, 123 tests, 1 skipped |
| `py -3 -B starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness operating-qa --question "What happened and what should happen next?"` | pass, clean starter seed returns blocked/no-source diagnostics without unsupported claims |
| `npm.cmd test` | pass, 483 tests |
| `npm.cmd run harness:validate` | pass, findings `[]` |

## Developer Handoff
- Recommendation: return to Tester.
- Required Tester focus: rerun PKT-13 acceptance tests, confirm the accepted Reviewer
  findings are remediated, and preserve the remaining PM structured-source question for
  Reviewer/Planner disposition if still considered material.
