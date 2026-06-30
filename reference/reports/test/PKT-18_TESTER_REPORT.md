# PKT-18 Tester Report

## Route
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Role: Tester
- Date: 2026-06-30
- Developer evidence reviewed: `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`
- TDD evidence reviewed: `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`
- Result: pass for PKT-18 tested scope

## Tested Scope
- Fresh copied-starter QA source provenance.
- Inherited root memory omission.
- Copied-project source precedence.
- No-trusted-source abstain/fail-closed behavior.
- Invalid root evidence-ref rejection.
- PM approval overclaim rejection.
- Stale generated Active Context rejection.
- Sensitive evidence omission and redaction disposition.
- Retained validation evidence excluded as a standalone answer source.
- Evidence-ref traversal rejected when resolved paths escape allowed evidence namespaces.
- Local DB/cache non-import into long-memory sources.
- Clean export smoke and initialized-project onboarding/status smoke.
- Root/starter regression and harness structural validation.

## Acceptance Verification
| Acceptance | Tester evidence | Result |
|---|---|---|
| A1 Fresh copied starter does not answer from inherited root hardening memory. | `test_fresh_qa_omits_inherited_root_hardening_memory_and_fails_closed`; exported starter PKT-18 tests pass. | pass |
| A2 QA abstains or fails closed when trusted project-specific sources are absent. | exported `operating-qa --question "What happened and can you approve release?"` returned `operatingQa.status=blocked`, no source refs, and `approval_authority_refused`. | pass |
| A3 After init/source creation, QA cites only copied-project trusted sources. | `test_copied_project_sources_win_over_newer_inherited_root_memory` asserts all answer refs have `projectProvenance=copied-project`; retained reference evidence is narrowed to validation evidence only. | pass |
| A4 Onboarding smoke guides first packet creation without implying approval. | fresh export verification initialized a copied project and `harness:status`/`harness:sync-state` directed Planner to PLN-00/PLN-01 while workflow gate remained blocked on open decision; authority grants remained false. | pass |
| A5 Productization remains incomplete after PKT-18. | fresh export `releaseReadiness.decision=block`; unresolved review count remains 30; no release/publish/promotion authority granted. | pass |
| A6 PKT-17 clean export evidence is present before PKT-18 implementation starts. | Ready For Code record cites `reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md`; implementation-transition preflight passed before Developer route. | pass |

## Negative Fixture Matrix
| Fixture | Evidence | Result |
|---|---|---|
| Root PKT-14/PKT-16/PKT-17-style reference memory shapes fresh QA | inherited-root test and source omission diagnostic | pass |
| Generated summaries or stale Active Context shape answer | stale generated Active Context test yields `stale_source` / `low_authority_source` and blocked answer | pass |
| PM summary claims approval authority | PM authority-overclaim test yields `prompt_like_source_omitted`; exported QA refuses approval | pass |
| Mixed copied-project source plus newer inherited-root source prefers root | copied-project precedence test passes | pass |
| Evidence index path resolves outside copied project | invalid evidence-ref test rejects root closeout evidence and accepts retained validation evidence only | pass |
| Retained validation evidence becomes standalone QA authority | retained validation evidence test keeps answer blocked and source refs empty | pass |
| Evidence ref traversal escapes `_ops/evidence` or retained validation namespaces | traversal fixture rejects `_ops/evidence/../...` and `reference/reports/validation/../...` refs | pass |
| Sensitive memory enters QA answer | sensitive source test yields `omitted_sensitive_source` and `sensitive-sources-omitted` | pass |
| Local DB/cache influences answer | discovery test confirms `.harness/operating_state.sqlite` and `_ops/cache/runtime.txt` are not imported | pass |
| Onboarding output implies Ready For Code/release/closeout/User UAT approval | export authority grants all false; QA authority boundary says it cannot approve these gates | pass |

## Commands Executed / Evidence
| Command / Check | Result |
|---|---|
| `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` | pass, 7 tests |
| `py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test*.py"` | pass, 156 tests, 1 skipped |
| `npm run harness:promote-starter -- --to C:\tmp\standard-harness-pkt18-fresh-smoke-20260630d --verify` | pass; include 993, exclude 76, review 30; contamination audit pass; fresh verification pass |
| exported starter `py -3 _harness\test\test_pkt18_fresh_starter_qa.py` | pass, 7 tests |
| exported starter `py -3 _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "What happened and can you approve release?"` | exit 0; `operatingQa.status=blocked`; no sources; `approval_authority_refused` |
| `npm test` | pass, 485 tests |
| `npm run harness:validate` / `npm run harness:sync-state` | pass structurally; open workflow gate remains Tester/Reviewer closeout, and PKT-19 through PKT-23 remain future RFC holds |

## Untested / Not Applicable
- Browser UI evidence: not applicable; PKT-18 has no browser UI surface.
- Real provider worker smoke: not applicable; owned by PKT-20.
- Release candidate packaging: not applicable; owned by PKT-19.
- Structured PM bulk intake: not applicable; owned by PKT-21.
- Design trace / UI module contract: not applicable; owned by PKT-22 and PKT-23.
- Actual User UAT: not approved and not applicable to PKT-18.

## Tester Recommendation
- Route to Reviewer after independent closeout lenses are collected.
- No Developer remediation is required for PKT-18 tested scope.
- This report does not approve release, publish, actual starter promotion, residual-risk acceptance, productization completion, User UAT, or PKT-19 through PKT-23.
