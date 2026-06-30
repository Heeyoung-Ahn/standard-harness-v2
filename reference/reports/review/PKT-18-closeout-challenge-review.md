# PKT-18 Closeout Challenge Review

## Lens Metadata
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Lens id: `challenge_review`
- Independent agent id: `codex-pkt18-challenge-review-20260630`
- Initial review date: 2026-06-30
- Re-review date: 2026-06-30
- Authority: evidence only. This report grants no Ready For Code, implementation, closeout, release, publish, starter-promotion, residual-risk, productization-completion, or User UAT approval.
- Independence basis: reviewer did not author the packet, implementation, remediation, Developer report, Tester report, TDD evidence, Planner approval record, or Reviewer adjudication.

## Sources Reviewed
- `reference/packets/PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE.md`
- `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-18_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`
- `reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md`
- `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
- `starter/standard-harness/_harness/test/test_pkt18_fresh_starter_qa.py`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/reviewer.md`

## Finding Disposition
| Finding | Prior severity | Prior status | Remediation evidence | Re-review disposition |
|---|---:|---|---|---|
| Retained `reference/reports/validation/**` evidence could become a standalone QA answer source, weakening A3 copied-project-only source intent. | high | hold | `question_answering.py` now defines `NON_ANSWER_PROJECT_PROVENANCE = {"inherited-root-reference", "retained-reference-evidence"}` and `_is_claim_supporting_source()` excludes those provenances. `test_pkt18_fresh_starter_qa.py` adds `test_retained_validation_evidence_is_not_an_answer_source_by_itself`, asserting blocked status, empty `sourceRefs`, and no retained validation answer text. Developer, Tester, and TDD reports record the remediation and passing 6-test targeted run plus broader 155-test starter regression. | resolved |

## Findings
No open challenge findings after remediation re-review.

## Remediation Evidence
| Evidence | Source | Re-review judgment |
|---|---|---|
| Non-answer provenance guard | `question_answering.py`: `NON_ANSWER_PROJECT_PROVENANCE` and `_is_claim_supporting_source()` | Pass. Retained validation evidence can remain evidence/ref proof without becoming an answer source. |
| Regression fixture | `test_pkt18_fresh_starter_qa.py`: `test_retained_validation_evidence_is_not_an_answer_source_by_itself` | Pass. The fixture directly covers the previous gap: retained validation evidence alone blocks QA and produces no `sourceRefs`. |
| Developer remediation statement | `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md` | Pass. Developer report states retained validation evidence is evidence/ref proof only and records targeted/broader regression evidence. |
| Tester re-verification | `reference/reports/test/PKT-18_TESTER_REPORT.md` | Pass. Tester report adds retained-validation standalone-source coverage and records the targeted, broader, exported-starter, root regression, and harness validation evidence. |
| TDD evidence | `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md` | Pass. TDD evidence records retained validation evidence as a RED pressure item and the remediation as GREEN/REFACTOR evidence. |

## Behavior Verification Evidence
- Verification type: test
- Command: `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py`
- Result: pass
- Evidence source: `reference/reports/test/PKT-18_TESTER_REPORT.md` records 6 passing targeted tests.
- Behavior verified: retained validation evidence alone keeps QA blocked with empty `sourceRefs` and no retained-validation answer text.

- Verification type: regression test
- Command: `py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test*.py"`
- Result: pass
- Evidence source: `reference/reports/test/PKT-18_TESTER_REPORT.md` records 155 passing starter tests and 1 skipped test.
- Behavior verified: PKT-18 QA/source-trust changes did not break broader starter Python regression coverage.

## Conformance Matrix
| Area | Approved intent / SSOT | Evidence reviewed | Challenge judgment |
|---|---|---|---|
| SHV2-REQ-049 intent preservation | Preserve Human Owner intent from planning through implementation, verification, review, closeout, and memory. | Packet Fresh QA Contract; updated implementation; Developer, Tester, and TDD reports. | Pass for challenge lens. The previously narrowed copied-project-only source intent is restored. |
| SHV2-REQ-050 precise planning | Packet must name intended outcome, non-goals, forbidden reinterpretations, acceptance, and evidence targets. | PKT-18 packet sections for goal, non-goal, Fresh QA Contract, A1-A6, negative fixtures, and closeout hold basis. | Pass. |
| SHV2-REQ-051 implementation conformance | Closeout must prove which intent slice was implemented and what remains deferred. | Developer report acceptance mapping; Tester report; code and tests. | Pass for challenge lens. A3 remediation is now explicit in code and tests. |
| SHV2-REQ-052 final hardening semantics | Product philosophy must be executable and must block scope narrowing and evidence shortcuts. | Inherited-root omission, stale source rejection, prompt-like PM authority, sensitive source omission, retained-validation non-answer, and local DB/cache non-import evidence. | Pass for challenge lens. |
| SHV2-REQ-055 fresh copied-starter QA | QA must answer only from initialized project-specific trusted sources and fail closed/abstain on inherited root memory, stale evidence, or unsupported authority. | `question_answering.py`; `test_pkt18_fresh_starter_qa.py`; Tester negative fixture matrix. | Pass for challenge lens. Retained validation evidence is no longer answer-eligible. |
| SHV2-REQ-057 productization completion | PKT-17 through PKT-21 are required before productization completion. | Packet A5; Developer and Tester reports; PKT-17 closeout. | Pass. PKT-18 evidence preserves productization-incomplete and leaves PKT-19 through PKT-23 separate. |
| Architecture source trust and memory authority | Generated summaries, wiki, PM summaries, evidence, and LLM context are data/read models, not approval authority; root history must not become starter memory. | Architecture Guide refs; code diagnostics; Tester authority-overclaim evidence. | Pass for challenge lens. |
| Packet acceptance A1 | Fresh copied starter does not answer from inherited root hardening memory. | Inherited-root omission test and Tester report. | Pass. |
| Packet acceptance A2 | QA abstains/fails closed when trusted project-specific sources are absent. | Inherited-root, retained-validation-alone, and exported QA blocked evidence. | Pass. |
| Packet acceptance A3 | After init/source creation, QA cites only copied-project trusted sources. | Mixed-source precedence test; retained-validation non-answer test; implementation answer-eligibility guard. | Pass. |
| Packet acceptance A4 | Onboarding smoke guides first packet creation without implying approval. | Tester export/status/sync-state evidence and authority false fields. | Pass for challenge lens. |
| Packet acceptance A5 | Productization remains incomplete after PKT-18. | Packet, Developer report, Tester report. | Pass. |
| Packet acceptance A6 | PKT-17 clean export evidence is present before PKT-18 implementation starts. | PKT-17 Planner closeout and PKT-18 approval/evidence references. | Pass. |

## Second-Pass Note
Rechecked source alignment, acceptance/evidence coverage, risk/regression pressure, authority boundaries, and the packet-bound evidence path after remediation. The previous A3 retained-validation answer-source finding is resolved by code-level non-answer provenance handling plus a direct regression fixture and Tester/TDD evidence.

## Limitations
- This is a challenge lens, not the full Reviewer adjudication.
- I did not rerun the test commands in this re-review; I inspected updated implementation, test code, Developer report, Tester report, and TDD evidence.
- I did not perform the separate adversarial security, code quality, or evidence review lenses.
- This report only judges scope narrowing, intent preservation, acceptance reinterpretation, fixture-only behavior, vocabulary-only conformance, and premature completion risk.

## Final Status
Status: pass for the `challenge_review` lens.

Rationale: The prior high finding is resolved. Retained validation evidence is now excluded from QA answer eligibility through `NON_ANSWER_PROJECT_PROVENANCE`, and `test_retained_validation_evidence_is_not_an_answer_source_by_itself` proves retained validation evidence alone keeps QA blocked with no answer source refs. The reviewed remediation aligns with PKT-18 A3 and SHV2-REQ-055 without broadening PKT-18 into release, provider, PM-ingestion, design, or productization-completion scope.

This report grants no approval beyond challenge-review evidence.
