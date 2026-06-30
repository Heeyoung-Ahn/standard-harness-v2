# PKT-18 Developer Report

## Scope
- Packet: `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE`
- Role: Developer
- Status: implementation complete for PKT-18 routed scope
- Date: 2026-06-30
- Approval basis: `reference/reports/planner/PKT-18_READY_FOR_CODE_DELEGATION.md`

## Changed Files
| Path | Purpose |
|---|---|
| `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py` | Adds copied-project provenance, inherited-root omission, stricter retained reference evidence handling, source-ref trust fields, and fail-closed QA behavior. |
| `starter/standard-harness/_harness/test/test_pkt18_fresh_starter_qa.py` | Adds PKT-18 negative and precedence fixtures for inherited root memory, copied-project precedence, invalid evidence refs, PM authority overclaim, stale generated Active Context, sensitive memory, and local DB/cache non-import. |
| `reference/packets/PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE.md` | Records approved PKT-18 packet boundary, required evidence, closeout hold basis, and Human Owner delegated Planner Ready For Code boundary. |
| `reference/reports/planner/PKT-18_READY_FOR_CODE_DELEGATION.md` | Records scoped Ready For Code approval for PKT-18 only. |

## Implementation Summary
- `LongMemorySourceDiscovery` now labels source provenance from source path before indexing.
- `LongMemorySourceIndexBuilder` omits inherited root packet/report/review/security/test/developer/planner evidence sources from fresh copied-starter QA with `inherited_root_source_omitted` diagnostics.
- QA source refs now expose `projectProvenance`, `projectId`, and `trustDecision`, so Tester/Reviewer can see why a source was eligible or rejected.
- Reference evidence retained from `reference/` is limited to `reference/reports/validation/`; root closeout/review/test/developer/planner evidence refs are rejected as copied-project authority.
- Retained validation evidence is allowed only as evidence/ref proof and is not eligible as a fresh QA answer source.
- Evidence-ref validation now checks resolved paths stay under the allowed `_ops/evidence`, `reference/reports/validation`, or `product/docs/packets` namespaces, preventing `../` traversal from validating out-of-namespace files.
- Sensitive, prompt-like, stale, generated, low-authority, missing-evidence, and no-source diagnostics keep QA fail-closed.

## Acceptance Mapping
| Acceptance | Developer implementation evidence | Status |
|---|---|---|
| A1 fresh copy does not answer from inherited root hardening memory | `test_fresh_qa_omits_inherited_root_hardening_memory_and_fails_closed` | pass |
| A2 no trusted copied-project source abstains/fails closed | inherited-root and approval-overclaim negative tests produce `status=blocked` | pass |
| A3 copied-project sources win over inherited-root sources | `test_copied_project_sources_win_over_newer_inherited_root_memory` | pass |
| A4 onboarding/source guidance does not imply approval | QA answer authority boundary refuses Ready For Code, closeout, release, residual risk, and human gates; export smoke also preserved authority false fields | pass |
| A5 productization remains incomplete | no release/publish/promotion/productization-complete authority changed; PKT-19 through PKT-23 remain separate | pass |
| A6 PKT-17 dependency present before implementation | `reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md` was cited in PKT-18 RFC evidence | pass |

## Verification Run By Developer
| Command / Check | Result |
|---|---|
| `py -3 starter\standard-harness\_harness\test\test_pkt18_fresh_starter_qa.py` | pass, 7 tests |
| `py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test*.py"` | pass, 156 tests, 1 skipped |
| `npm run harness:promote-starter -- --to C:\tmp\standard-harness-pkt18-fresh-smoke-20260630d --verify` | pass; include 993, exclude 76, review 30; clean export verification passed; release readiness remained blocked; all authority grants remained false |
| exported payload `py -3 _harness\test\test_pkt18_fresh_starter_qa.py` from `C:\tmp\standard-harness-pkt18-fresh-smoke-20260630d\starter\standard-harness` | pass, 7 tests |
| exported payload `py -3 _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "What happened and can you approve release?"` from `C:\tmp\standard-harness-pkt18-fresh-smoke-20260630d\starter\standard-harness` | exit 0; operating QA `status=blocked`; `approval_authority_refused`; answer refused unsupported release approval |
| `npm test` | pass, 485 tests |
| `npm run harness:validate` | pass structurally; warnings remain for future PKT-19 through PKT-23 RFC/evidence holds |

## TDD Notes
- RED pressure: PKT-18 was driven by negative fixtures that would previously allow inherited root/reference evidence to influence a fresh copied-starter QA answer.
- GREEN result: new PKT-18 fixtures pass and broader starter Python regression passes.
- REFACTOR result: source provenance and trust decisions were added inside existing long-memory QA/source-index boundaries instead of adding a new authority surface.
- Review remediation: independent challenge review found retained validation evidence could still become an answer source; Developer changed it to evidence-ref-only for answer eligibility and added a regression fixture.
- Security remediation: independent adversarial security review found namespace traversal could escape `_ops/evidence`; Developer changed validation to resolved-subdir checks and added a traversal fixture.

## Authority Boundary
- Developer report does not approve release, publish, actual starter promotion, residual-risk acceptance, productization completion, User UAT, or PKT-19 through PKT-23 implementation.
- PKT-18 implementation remains scoped to fresh starter QA/source trust/onboarding smoke.
