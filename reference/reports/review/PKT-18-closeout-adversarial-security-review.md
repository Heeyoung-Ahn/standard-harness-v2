# PKT-18 Closeout Adversarial Security Review

## Lens
- Lens id: `adversarial_security_review`
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Agent id: `codex-pkt18-adversarial-security-review-20260630`
- Date: 2026-06-30
- Independence basis: read-only closeout lens; not the Developer, Tester, Planner, Orchestrator, packet author, generated summary, or Reviewer adjudication.
- Authority boundary: evidence only. This report does not approve release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, Reviewer closeout, Planner closeout, or any approval-state change.

## Sources Reviewed
- `reference/packets/PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE.md`
- `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-18_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`
- `reference/reports/security/PKT-18-security-review.json`
- `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
- `starter/standard-harness/_harness/test/test_pkt18_fresh_starter_qa.py`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/reviewer.md`

## Re-Review Scope
- Re-review trigger: Developer remediation after prior `hold`.
- Remediation claims checked:
  - retained validation evidence is excluded from answer eligibility;
  - evidence refs require resolved paths to stay under allowed subdirectories;
  - `test_evidence_ref_traversal_cannot_escape_allowed_namespaces` passes.
- Focused verification run: `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` -> pass, 7 tests, OK.

## Structured Behavior Verification Evidence
- Verification type: test
- Command: `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py`
- Exit code: 0
- Result: pass
- Scope verified: PKT-18 fresh starter QA adversarial security remediation fixtures, including retained validation evidence non-answer eligibility and evidence-ref traversal namespace rejection.
- Evidence basis: focused verification run already recorded in this lens report; 7 tests ran and passed.
- Authority boundary: evidence only; this verification does not grant release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, Reviewer closeout, Planner closeout, or approval-state change.

## Findings

No open adversarial security findings remain after remediation re-review.

| Prior severity | Prior finding | Remediation evidence | Disposition | Residual action |
|---|---|---|---|---|---|
| high | Retained `reference/reports/validation` evidence can become answer authority without copied-project provenance. | `question_answering.py` now defines `NON_ANSWER_PROJECT_PROVENANCE = {"inherited-root-reference", "retained-reference-evidence"}` and `_is_claim_supporting_source` rejects sources whose `projectProvenance` is in that set. `test_retained_validation_evidence_is_not_an_answer_source_by_itself` asserts the retained validation source keeps the answer blocked, leaves `sourceRefs` empty, and does not leak the retained summary into the answer. Developer, Tester, and TDD reports record this remediation. Focused test run passed 7 tests. | closed | Reviewer adjudication still must consider this lens with the full closeout package; this lens grants no approval. |
| high | Evidence ref validation accepts traversal out of `_ops/evidence`. | `question_answering.py` now validates refs through `_path_within_repo_subdir` and `_path_within_repo_subdir_exists`, requiring resolved paths to stay under `_ops/evidence`, `reference/reports/validation`, or `product/docs/packets` as applicable. `test_evidence_ref_traversal_cannot_escape_allowed_namespaces` rejects `_ops/evidence/../...` and `reference/reports/validation/../...` refs. Developer, Tester, TDD, and security JSON reports record this remediation. Focused test run passed 7 tests. | closed | Reviewer adjudication still must consider this lens with the full closeout package; this lens grants no approval. |

## Security Matrix

| Surface | Adversarial question | Evidence reviewed | Result |
|---|---|---|---|
| Stale root memory leakage | Can root packet/review/closeout memory shape a fresh copied-starter answer? | PKT-18 test `test_fresh_qa_omits_inherited_root_hardening_memory_and_fails_closed`; Developer and Tester reports. | pass for direct inherited-root reference prefixes. |
| Retained reference leakage | Can retained reference validation evidence shape an answer without copied-project provenance? | Code review; `NON_ANSWER_PROJECT_PROVENANCE`; `test_retained_validation_evidence_is_not_an_answer_source_by_itself`; Developer, Tester, TDD reports; focused 7-test run. | pass. Retained validation evidence is evidence/ref proof only and is not answer-eligible. |
| Generated-state leakage | Can stale Active Context or generated summaries shape answers? | PKT-18 PM/stale/sensitive test and Tester negative fixture matrix. | pass for stale generated Active Context fixture. |
| Sensitive evidence leakage | Can secret/sensitive evidence enter answer context, wiki, handoff, or context packs? | `SensitiveEvidenceValidator` path in `question_answering.py`; PKT-18 sensitive-source fixture; security review JSON. | pass for tested sensitive source omission and redaction disposition. |
| PM approval overclaim | Can PM summaries or QA grant Ready For Code, closeout, release, residual risk, or UAT approval? | Prompt-like source filtering, `_asks_for_approval`, QA authority boundary, exported QA evidence in Tester report. | pass for tested PM approval-overclaim and QA approval-refusal fixtures. |
| Path/evidence ref traversal | Can an evidence ref escape the trusted evidence namespace while still passing validation? | `_valid_evidence_ref`, `_path_within_repo_subdir`, `test_evidence_ref_traversal_cannot_escape_allowed_namespaces`; security review JSON; focused 7-test run. | pass. Traversal out of allowed namespaces is rejected. |
| Fail-closed behavior | Does QA block when trusted sources are absent or diagnostics are blocking? | Tester report, no-source/inherited-memory fixtures, retained-validation fixture, traversal fixture. | pass for tested no-source, inherited-memory, retained-reference, and traversal cases. |
| Authority overclaims | Do implementation reports or outputs claim release/productization completion? | Packet, Developer report, Tester report, security review JSON. | pass. Reports consistently deny release, publish, promotion, residual-risk acceptance, productization completion, User UAT, and closeout approval. |

## Adversarial Checks Performed
- Read-only source and evidence review against packet acceptance, requirements, implementation plan, architecture guide, and reviewer workflow.
- Re-reviewed `question_answering.py` remediation for provenance and resolved-subdirectory checks.
- Re-reviewed `test_pkt18_fresh_starter_qa.py` remediation fixtures:
  - `test_retained_validation_evidence_is_not_an_answer_source_by_itself`
  - `test_evidence_ref_traversal_cannot_escape_allowed_namespaces`
- Re-reviewed Developer report, Tester report, TDD evidence, and security review JSON for matching remediation evidence and authority-boundary language.
- Ran focused verification: `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` -> pass, 7 tests, OK.

## Limitations
- I did not edit implementation or tests.
- I did not rerun the full root `npm test` or full starter unittest suite in this lens; I relied on recorded Developer/Tester evidence for broad regression and ran the focused PKT-18 test file for the remediated security surfaces.
- I did not inspect PKT-17 closeout internals beyond PKT-18's cited dependency and source-boundary expectations.
- This lens does not adjudicate code quality, evidence quality, challenge review, Reviewer closeout, Planner closeout, release readiness, or residual-risk acceptance.

## Final Status

`pass`

Reason: the two prior adversarial security findings are remediated with code changes, regression tests, updated Developer/Tester/TDD/security evidence, and a focused passing PKT-18 test run. This pass is lens evidence only and grants no release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, Reviewer closeout, Planner closeout, or approval-state change.
