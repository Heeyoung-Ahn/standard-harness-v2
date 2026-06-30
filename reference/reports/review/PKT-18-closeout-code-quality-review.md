# PKT-18 Closeout Code Quality Review

## Lens Metadata

- Lens id: `code_quality_review`
- Agent id: `codex-code-quality-review-20260630-02`
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Review date: 2026-06-30
- Review type: re-review after remediation.
- Scope: independent code-quality lens over PKT-18 implementation and evidence only.
- Authority boundary: evidence only. This report grants no Ready For Code, release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, Reviewer adjudication, or Planner closeout approval.
- Root v1.0 approval boundary: PKT-18 Ready For Code evidence is treated as Human Owner delegated Planner approval only. v2.0 starter `Conductor` concepts are not treated as current root approval authority.

## Sources Reviewed

- `reference/packets/PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE.md`
- `reference/reports/planner/PKT-18_READY_FOR_CODE_DELEGATION.md`
- `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-18_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`
- `reference/reports/security/PKT-18-security-review.json`
- `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
- `starter/standard-harness/_harness/test/test_pkt18_fresh_starter_qa.py`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/reviewer.md`
- `.agents/skills/code_review_checklist/SKILL.md`

## Current-Source Coverage

- Retained validation evidence answer exclusion: confirmed. `NON_ANSWER_PROJECT_PROVENANCE = {"inherited-root-reference", "retained-reference-evidence"}` is used by `_is_claim_supporting_source`, so retained validation evidence can support evidence refs but cannot become a fresh QA answer source by itself.
- Evidence-ref namespace hardening: confirmed. `_valid_evidence_ref` now requires resolved paths to remain inside allowed namespaces via `_path_within_repo_subdir` / `_path_within_repo_subdir_exists` for `_ops/evidence`, `reference/reports/validation`, and `product/docs/packets`.
- Focused remediation fixtures: confirmed. `test_pkt18_fresh_starter_qa.py` now contains 7 focused tests, including `test_retained_validation_evidence_is_not_an_answer_source_by_itself` and `test_evidence_ref_traversal_cannot_escape_allowed_namespaces`.
- Evidence updates: Developer, Tester, and TDD reports record focused PKT-18 tests passing 7 tests and starter regression passing 156 tests with 1 skipped.

## Findings

| Severity | Source Ref | Affected Surface | Finding | Required Action | Route |
|---|---|---|---|---|---|
| none | inspected PKT-18 packet, reports, `question_answering.py`, and `test_pkt18_fresh_starter_qa.py` | PKT-18 code-quality lens scope | No blocking, high, medium, or low code-quality finding remains after remediation. | None for this lens. Preserve evidence and approval boundaries through Reviewer adjudication. | Reviewer |

## Quality Matrix

| Review Area | Judgment | Basis |
|---|---|---|
| Module boundary | pass | PKT-18 behavior remains inside existing `standard_harness.memory.question_answering` discovery, index-building, evidence-ref validation, and answer-composition contracts. No new approval, release, Conductor, or external control surface was added. |
| Dependency direction | pass | The memory QA path depends on existing evidence classification and sensitive-evidence validation helpers, while CLI callers continue to consume the memory service. The implementation does not depend on root `.agents`, root generated state, root packet history as authority, or v2.0 Conductor approval concepts. |
| Maintainability | pass | The remediation added explicit named boundaries (`NON_ANSWER_PROJECT_PROVENANCE`, retained reference evidence prefix, resolved-subdir helpers) rather than ad hoc per-test branches. Trust fields remain normalized as `projectProvenance`, `projectId`, `trustStatus`, `trustDecision`, and `answerEligibility`. |
| Error handling / fail-closed behavior | pass | Missing classifier/validator config falls back to diagnostics instead of crashing. Inherited-root, retained-reference answer sources, prompt-like content, sensitive sources, stale/generated sources, low-authority sources, invalid/traversing evidence refs, missing evidence links, no-source categories, and approval questions are diagnostic-driven and block answers where appropriate. |
| Source provenance / authority handling | pass | Inherited root packet/report evidence is omitted for fresh copied-starter QA. Retained validation evidence is limited to evidence/ref proof and is explicitly excluded from answer eligibility. Evidence refs must resolve inside allowed subdirectories before being accepted. |
| Test quality | pass | The focused test file covers inherited-root omission, copied-project precedence over newer root memory, invalid root evidence-ref rejection with retained validation evidence allowed, retained validation evidence not becoming standalone answer authority, traversal rejection, PM approval overclaim rejection, stale generated Active Context, sensitive source omission, and local DB/cache non-import. |
| Regression risk | pass with residual scope limits | Developer, Tester, and TDD reports record focused PKT-18 tests passing 7 tests and starter regression passing 156 tests with 1 skipped. Developer and Tester evidence also record clean export verification, exported operating-qa blocked approval behavior, root `npm test`, and harness validation. Later release packaging, provider smoke, PM source intake, design trace, and User UAT remain outside PKT-18. |
| Approval-boundary preservation | pass | QA output refuses Ready For Code, closeout, release, residual risk, and human gate approval. Reports preserve release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, and PKT-19 through PKT-23 as unapproved. |

## Structured Behavior Verification

- Verification type: test
- Result: pass
- Command: `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py`
- Exit code: 0
- Command result: pass, 7 focused PKT-18 tests.
- Evidence source: `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`; `reference/reports/test/PKT-18_TESTER_REPORT.md`; `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`.
- Verification type: regression test
- Result: pass
- Command: `py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test*.py"`
- Exit code: 0
- Command result: pass, 156 tests with 1 skipped.
- Evidence source: `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md`; `reference/reports/test/PKT-18_TESTER_REPORT.md`; `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md`.
- Verification type: source inspection
- Result: pass
- Source inspection basis: `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py` shows retained validation evidence excluded from answer eligibility and resolved-subdir evidence-ref validation for allowed namespaces.
- Source inspection basis: `starter/standard-harness/_harness/test/test_pkt18_fresh_starter_qa.py` contains 7 focused tests, including remediation fixtures for retained validation evidence and traversal evidence refs.
- Evidence basis: `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md` records `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` passing 7 tests and starter unittest discovery passing 156 tests with 1 skipped.
- Evidence basis: `reference/reports/test/PKT-18_TESTER_REPORT.md` records the same focused 7-test pass and 156-test starter regression pass, plus clean export verification, `operating-qa` blocked approval behavior, root `npm test` passing 485 tests, and harness validation passing structurally.
- Evidence basis: `reference/reports/tdd/PKT-18_TDD_EVIDENCE.md` records RED/GREEN pressure for retained validation evidence answer exclusion and traversal evidence-ref namespace hardening.

## Limitations

- This lens did not rerun Python tests because the user limited writes to this report file and Python test execution can create cache artifacts. The judgment relies on updated Developer/Tester/TDD command evidence plus direct source and test inspection.
- Tester evidence includes one exported-starter command row that still says the exported PKT-18 test run passed 5 tests, while Developer evidence records exported payload 7 tests and current source contains 7 focused tests. This is not a code-quality hold, but the evidence lens or Reviewer adjudication may choose to normalize that row.
- This lens did not review release packaging, real provider worker smoke, structured PM bulk intake, design projection, reusable UI modules, actual starter promotion, or User UAT; these remain outside PKT-18 and are owned by later packets or explicit future approval.
- This lens does not replace the remaining independent closeout lenses, Reviewer adjudication, or Planner closeout.

## Final Status

Status: **pass**

PKT-18 implementation quality is acceptable for this independent `code_quality_review` lens after remediation. The current source keeps source-trust behavior inside existing QA/source-index contracts, excludes retained validation evidence from answer eligibility, validates evidence refs against resolved allowed subdirectories, preserves fail-closed behavior, and has targeted regression coverage. Evidence remains packet-bound and grants no approval.
