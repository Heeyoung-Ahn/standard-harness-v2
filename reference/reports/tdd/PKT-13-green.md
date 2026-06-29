# PKT-13 GREEN Evidence

- Work item: `PKT-13_OPERATING_INTELLIGENCE_AND_QA`
- Date: 2026-06-30
- TDD mode: focused RED/GREEN for operating-intelligence QA behavior.

## Focused Commands
| Command | Result |
| --- | --- |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"` | pass, 10 tests after remediation |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"` | pass, 8 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt05_security_and_transition_gates.py"` | pass, 3 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"` | pass, 16 tests |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_compound_feedback_promotion.py"` | pass, 11 tests |

## Broad Commands
| Command | Result |
| --- | --- |
| `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` | pass, 123 tests, 1 skipped |
| `npm.cmd test` | pass, 483 node tests |
| `npm.cmd run harness:validate` | pass, findings `[]` |

## CLI Smoke
Command:
`py -3 -B starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness operating-qa --question "What happened and what should happen next?"`

Result: command exited `0` and returned JSON `status: ok` with an `operatingQa` read-model
answer. On the clean starter seed it correctly returned `operatingQa.status: blocked`,
empty `sourceRefs`, empty `evidenceRefs`, and `no_source:*` diagnostics instead of
inferring claims from placeholder files.

## Remediation GREEN
Independent review findings were remediated by:
- skipping non-index raw evidence bodies during discovery unless the path itself is
  sensitive-looking, in which case a path-only omitted source is recorded without reading
  the raw body;
- adding prompt-like/control-text omission diagnostics for answer, wiki, handoff, and
  context-pack targets;
- failing closed with `classification_policy_unavailable` when discovery cannot load the
  classification policy;
- recording `reference/**` as retained evidence reference material in reset policy and
  testing post-reset regenerated citation behavior;
- validating retained `reference/**` evidence-index records with the same
  pass/trusted/fresh/resolved/clean entry criteria used for `_ops/evidence/**` indexes.
- ordering answer sources by question intent before applying `max_sources`, so
  budget-limited risk and next-work answers keep relevant risk/PM/context sources instead
  of falling back to unrelated packet summaries.
