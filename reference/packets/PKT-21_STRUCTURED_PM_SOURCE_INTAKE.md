# PKT-21 Structured PM Source Intake

> POST-PKT-20 PLANNING PACKET. PKT-17 through PKT-20 are closed for their approved
> scopes. PKT-20 closed only as hold/unavailable/narrowed real-provider evidence;
> real-provider readiness remains unproven. PM summaries and WBS inputs remain
> source/evidence only and cannot approve implementation, release, closeout,
> residual risk, User UAT, productization-complete, or Conductor delegation.

## Purpose
PKT-21 ingests structured PM TSV/CSV/WBS sources into operating intelligence without
turning PM summaries into approval authority. It closes the final required
productization packet in the PKT-17 through PKT-21 set.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-21_STRUCTURED_PM_SOURCE_INTAKE` | Required productization packet for structured PM source intake. | selected |
| Ready For Code | approved | Delegated Ready For Code is approved for PKT-21 only after independent planning challenge and packet_doc_review corrections were applied. | approved |
| Human sync needed | no-open-decisions | Scope follows Requirements and Implementation Plan. | selected |
| Packet type | `harness-system` | PM source intake and operating intelligence are reusable harness behavior. | selected |
| Risk level | high | PM summaries can be mistaken for approval authority. | selected |
| Risk class | high / PM / source-authority | Structured source intake affects QA and status answers. | selected |
| Gate profile | release | Productization completion depends on this packet. | selected |
| Gate profile version | harness-system@1+high@1+release-boundary | High/core/release-sensitive PM source intake requires strict gates. | selected |
| Required gates | packet-doc-review; planner-challenge; implementation-transition preflight; PM TSV/CSV/WBS parser tests; authority-boundary negative tests; QA/freshness tests; starter regression; root validation; security review; four independent closeout lenses; Reviewer adjudication; Planner closeout | PM source intake can otherwise be mistaken for approval authority or productization-complete. | selected |
| Route class | packet-path | Runtime behavior, parser tests, authority tests, and review evidence are required. | selected |
| Change zone | core | PM source intake and operating intelligence are core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | PM/operator reports and QA answers may change, but no product browser UI or end-user product surface is in scope. | closed |
| Layer classification | core | PM operating intelligence is core. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No browser UI surface is included. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | not-needed | No product User UAT scope is included. | closed |
| Environment topology status | approved | Local PM source fixtures only. | selected |
| Domain foundation status | approved | Domain is PM TSV/CSV/WBS source intake and authority boundary. | selected |
| System context status | approved | PMO reports, WBS parser, operating intelligence index, and QA source trust are impacted. | selected |
| Authoritative source intake status | approved | Source is Requirements, Implementation Plan, and prior PM/QA packet boundaries. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Closeout evidence is not produced yet. | pending |
| Existing system dependency | internal | Builds on PMO, WBS, operating intelligence, and QA source index code. | selected |
| New authoritative source impact | analyzed | Implements approved productization plan. | closed |
| Risk if started now | controlled | Reviews and delegated Ready For Code evidence are recorded; implementation remains bounded to PKT-21 scope. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pass | Independent planning challenge findings were applied before Ready For Code. | closed |
| Packet doc review | pass | Independent packet document review findings were applied before Ready For Code. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; PM Source Intake Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: WBS fixture contract; source freshness checks
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; release publication; live provider execution
- Layer classification: core
- N/A decisions: UI/browser evidence not required because no browser UI is changed; real provider execution not required; release/publish/starter promotion not approved; product User UAT not in scope; design trace not applicable because no UI/design artifact is changed.
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-04 PM rhythm, PKT-13 operating intelligence QA, PMO/WBS code, source index and authority-boundary tests.
- Environment topology reference: local TSV/CSV/WBS fixtures only.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: local fixture/evidence paths.
- Execution target: PM TSV/CSV/WBS parser tests, operating-intelligence index tests, QA answer tests, harness validation.
- Transfer boundary: only packet-bound PM TSV/CSV/WBS fixtures and structured source records
  may be ingested; PM rows remain evidence/read-model inputs and cannot mutate approval state.
- Rollback boundary: revert packet-scoped source/docs/evidence changes through git if needed;
  remove only packet-created fixture/temp files with exact paths under destructive-command guard.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; PKT-04 and PKT-13 closeout evidence.
- Existing schema source artifact: internal PMO/WBS/source-index schemas.
- Table / column naming compatibility: TSV/CSV/WBS headers must be explicit and tested.
- Data operation / ownership compatibility: PM records are source/evidence only and cannot approve gates.
- Migration / rollback / cutover compatibility: not-needed.
- Authoritative source intake reference: SHV2-REQ-026, 027, 038, 039, 043, 057 and post-PKT-16 productization plan.
- Authoritative source disposition: accepted for packet planning; PM source authority remains limited.
- Current implementation impact: may change PM source parser, WBS ingest, operating intelligence indexing, and QA answers.
- Existing plan conflict: none.
- Impacted packet set scope: PKT-21 only.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A maintainer ingests structured PM TSV/CSV/WBS status sources, asks operating-intelligence questions, and receives source-cited answers without PM rows granting approval authority.
- API contract: PM source intake must expose explicit records with packet/status/evidence/freshness fields, WBS round-trip output, QA source records, and authority-boundary diagnostics.
- Component responsibility: PMO parser owns TSV/CSV/WBS header validation and source-record conversion; operating-intelligence QA owns source eligibility, freshness diagnostics, and answer citation; gate/approval workflows remain authoritative for Ready For Code, closeout, release, residual risk, User UAT, and productization-complete.
- Data ownership: PM source rows are coordination/read-model evidence only. They may support status, blockers, risks, next work, and QA citations but cannot mutate packet state, approval state, release state, residual-risk disposition, or Conductor delegation.
- Allowed dependency direction: PMO intake may feed operating-intelligence source indexes and QA answers; approval/gate state must not depend on PM source rows.
- Public contract vs internal/scratch field: public contract is structured PM source intake, freshness diagnostics, WBS round-trip integrity, and QA citation behavior. Internal parser fixture names and temporary test rows are not product authority.
- Promoted artifact: required before implementation if reusable field names are introduced; for PKT-21 this is satisfied by tested PM source headers and WBS/source-record field contracts in code and tests rather than a new standalone schema unless implementation discovers a broader reusable schema need.

## Goal
- Ingest structured PM TSV/CSV/WBS sources into operating intelligence.
- Preserve PM source freshness and non-authority boundaries.
- Enable QA answers to cite PM sources without treating them as approval.

## Non-Goal
- Do not make PM summaries approval authority.
- Do not implement release/publish/promotion, provider smoke, or design trace.

## Source Authority
- Requirements: SHV2-REQ-026, 027, 038, 039, 043, 057.
- Implementation Plan: PKT-21 row.
- PKT-04 PM rhythm and PKT-13 operating-intelligence QA boundaries.

## PM Source Intake Contract
PM TSV/CSV/WBS records may support status, blockers, risks, next work, and QA answers.
They cannot approve Ready For Code, implementation, closeout, release, residual risk, or
productization completion.

Minimum PM source record fields:
- `source_id`
- `source_type`
- `packet_id`
- `title`
- `status`
- `owner_role`
- `priority`
- `risk_level`
- `blocker`
- `next_work`
- `evidence_index_path`
- `closeout_report_path`
- `source_watermark`
- `freshness_status`
- `updated_at`

Minimum WBS round-trip invariants:
- TSV/CSV headers are explicit and validated.
- Packet id, status, evidence index path, closeout report path, freshness status, and updated timestamp survive parse/build round trip.
- PM source rows become `sourceType=pmo`, `authorityTier=coordination`, and answer-eligible only when fresh, non-sensitive, non-prompt-like, and evidence-linked.
- Any PM row that claims approval, closeout, release, residual-risk acceptance, productization-complete, User UAT, or Conductor delegated approval is diagnostic evidence only and must not mutate gate state.

## Data / Source Impact
- Source impact classification: high
- Data impact classification: high
- Schema impact classification: conditional
- Source impact note: PM/WBS parser and operating intelligence indexes may change.
- Data impact note: TSV/CSV/WBS fixtures and source records are packet-bound.
- Schema impact note: explicit headers and record fields must be tested.

## In Scope
- PM TSV/CSV/WBS fixture parsing.
- Authority-boundary tests.
- Source freshness checks.
- QA answer tests and WBS round-trip evidence.

## Out Of Scope
- Release packaging, provider execution, design trace, product UI.

## Acceptance
| ID | Acceptance Criterion | Evidence Required |
|---|---|---|
| A1 | PM TSV/CSV/WBS fixtures ingest into operating intelligence. | Parser and index tests. |
| A2 | PM sources cannot approve gates. | Authority-boundary negative tests. |
| A3 | Source freshness is checked. | Freshness diagnostics. |
| A4 | QA answers cite PM sources correctly. | QA answer tests. |
| A5 | Productization packet set can be evaluated after PKT-21 closeout only with PKT-20's narrowed real-provider limitation preserved and without PM source evidence approving release, publish, starter promotion, residual risk, User UAT, or productization-complete. | Reviewer adjudication and Planner closeout. |

## Expected Negative Fixtures
- PM TSV says Ready For Code approved and must not approve.
- PM CSV says closeout, release, residual risk, User UAT, productization-complete, or Conductor delegated approval is approved and must not approve.
- Stale PM row shapes answer without freshness warning and must fail.
- WBS round-trip loses packet/status/evidence relation and must fail.
- Prompt-like PM row enters answer, handoff, wiki, or context-pack target as instruction and must fail/omit.

## Verification Plan
- PM TSV/CSV fixture tests.
- WBS round-trip tests.
- Authority-boundary tests.
- Source freshness and QA answer tests.
- Harness validation and independent closeout lenses.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| PM fixture parser | PM TSV/CSV tests | `reference/reports/test/PKT-21_TESTER_REPORT.md` |
| WBS round trip | WBS parser/export tests | `reference/reports/test/PKT-21_TESTER_REPORT.md` |
| Authority boundary | PM approval negative tests | `reference/reports/test/PKT-21_TESTER_REPORT.md` |
| QA answers | operating-intelligence QA tests | `reference/reports/test/PKT-21_TESTER_REPORT.md` |
| Ready For Code evidence | delegated Ready For Code record | `reference/reports/planner/PKT-21_READY_FOR_CODE_DELEGATION.md` |
| Release/productization boundary | non-approval boundary checks | `reference/reports/review/PKT-21_REVIEW_REPORT.md`; `reference/reports/closeout/PKT-21_PLANNER_CLOSEOUT.md` |
| Security evidence | prompt-like/stale/approval-injection review | `reference/reports/security/PKT-21-security-review.json` |
| release-baseline | release baseline non-approval boundary check | `reference/reports/review/PKT-21_REVIEW_REPORT.md` |
| packaging | package/publish/starter-promotion non-execution boundary check | `reference/reports/review/PKT-21_REVIEW_REPORT.md` |
| Harness validator | root harness validation | `.agents/artifacts/VALIDATION_REPORT.md` |
| Starter regression | focused starter Python tests and starter validation | `reference/reports/test/PKT-21_TESTER_REPORT.md` |
| Independent closeout lenses | challenge, adversarial security, code quality, evidence review | `reference/reports/review/PKT-21-closeout-*.md` |
| review closeout | Reviewer adjudication and Planner closeout | `reference/reports/review/PKT-21_REVIEW_REPORT.md`; `reference/reports/closeout/PKT-21_PLANNER_CLOSEOUT.md` |

## TDD Evidence Contract
- TDD mode: required
- Red test file: starter/standard-harness/_harness/test/test_pkt21_structured_pm_source_intake.py
- Red command: py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt21_structured_pm_source_intake.py"
- Red exit code: 1
- Red failure kind: expected-test-failure
- Red ran at: 2026-06-30T14:30:00+09:00
- Red output excerpt: ModuleNotFoundError: No module named 'standard_harness.pmo.source_intake'
- Red output artifact: reference/reports/tdd/PKT-21-red.md
- Green command: py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt21_structured_pm_source_intake.py"
- Green exit code: 0
- Green ran at: 2026-06-30T14:35:00+09:00
- Green output excerpt: Ran 7 tests; OK
- Green output artifact: reference/reports/tdd/PKT-21-green.md
- Refactor verified: pass
- Behavior-level test: verified
- Test-only production hook: none
- Production code written first: no
- Production-first remediation: not-needed

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-21_STRUCTURED_PM_SOURCE_INTAKE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-21-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-21-packet-doc-review.md` | required before Ready For Code |
| Ready For Code delegation | `reference/reports/planner/PKT-21_READY_FOR_CODE_DELEGATION.md` | required before Orchestrator routing |
| Developer report | `reference/reports/developer/PKT-21_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-21_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-21-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-21_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-21_PLANNER_CLOSEOUT.md` | required to mark closed |

## Required Closeout Lens Mapping
| Lens | PKT-21 Question |
|---|---|
| `challenge_review` | Does PM intake improve source intelligence without granting authority? |
| `adversarial_security_review` | Can PM rows inject prompt-like approval or stale status? |
| `code_quality_review` | Are parsers/indexes structured and reusable? |
| `evidence_review` | Does evidence prove parsing, freshness, authority, QA, and WBS round trip? |

## Planner Packet Challenge Review
- Challenge reviewer: independent planning reviewer `019f18db-a5a8-7e10-b335-ebef5d3a2b30`.
- Challenge reviewer independence basis: reviewer did not author the packet, implement code, act as Developer/Tester/Orchestrator, mutate approval state, or approve Ready For Code.
- Source refs reviewed: PKT-21 packet; Requirements SHV2-REQ-026, 027, 038, 039, 043, 057; Implementation Plan PKT-21 row; post-PKT-20 closeout boundary.
- Parent objective coverage: PKT-21 closes structured PM source intake for the PKT-17 through PKT-21 productization set without changing release/publish/productization approval.
- Deferred scope with named follow-up: none for PM intake; real-provider readiness limitation remains from PKT-20 and is not solved by PKT-21.
- Acceptance proves behavior change: parser, WBS round-trip, freshness, authority-boundary negative tests, QA answer tests, and closeout evidence are required.
- Failure fixture or failure condition: PM rows claiming approval, stale PM rows shaping answers, WBS relation loss, and prompt-like PM rows must fail or be omitted.
- Reviewer closeout hold basis: hold if PM source rows become gate authority, if PKT-20 narrowed limitation is dropped, or if productization-complete is claimed from PM evidence.
- First-wave limit check: PKT-21 remains scoped to PM source intake and does not absorb release, provider smoke, UI/design, or product User UAT.
- Guidance-only sufficiency rationale: implementation requires deterministic parser/QA tests, not prose-only guidance.
- Challenge evidence artifact path: reference/reports/review/PKT-21-planner-challenge-review.md
- Challenge status: pass
- Findings disposition: stale sequencing, missing gate declarations, weak A5, missing fixture contract, and narrow negative fixtures were corrected.
- Required corrections applied: applied
- No self-approval claim: independent reviewer is not the packet author; this review does not approve Ready For Code, implementation, closeout, release, residual risk, or productization-complete.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: independent packet document reviewer `019f18db-d037-7803-aee5-bcbd7a0f939b`.
- Packet doc reviewer independence basis: reviewer is not the packet author, Developer, Tester, Orchestrator, or Planner; reviewer did not mutate approval state or approve Ready For Code.
- Packet doc review evidence path: reference/reports/review/PKT-21-packet-doc-review.md
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: behavior/evidence acceptance is sufficient after corrections.
- Verification scope strength: parser, WBS, authority, freshness, QA, validator, security, starter regression, and closeout evidence are named.
- Deferred/out-of-scope ownership: real-provider readiness limitation remains PKT-20 residual boundary; release/publish/productization approval remains outside PKT-21.
- Required corrections: applied
- Findings disposition: no findings remain after packet correction.
- No self-approval claim: this review does not approve Ready For Code, implementation, closeout, release, residual risk, or productization-complete.

## Human Sync / Approval Boundary
- Open decisions: none beyond Ready For Code approval after independent review pass.

## Security Review Request
- Security review required: yes.
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-21-security-review.json
- Focus: prompt injection in PM rows, stale source authority, sensitive operational records.

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: parallel where practical
- challenge_review agent: `019f18ea-94e2-79b1-ade6-69be61fd98a9`
- challenge_review independence basis: independent challenge reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review reviewer disposition: accepted
- challenge_review evidence path: reference/reports/review/PKT-21-closeout-challenge-review.md
- adversarial_security_review agent: `019f18eb-1182-7471-9d82-d1e31cd3e884`
- adversarial_security_review independence basis: independent adversarial security reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review reviewer disposition: accepted after remediation
- adversarial_security_review evidence path: reference/reports/review/PKT-21-closeout-adversarial-security-review.md
- code_quality_review agent: `019f18eb-3b18-79a3-ac5b-ce09ae6ab008`
- code_quality_review independence basis: independent code-quality reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: accepted after remediation
- code_quality_review evidence path: reference/reports/review/PKT-21-closeout-code-quality-review.md
- evidence_review agent: `019f18f5-85b0-7850-86d2-fbda1719accf`
- evidence_review independence basis: independent evidence reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: accepted with validation timestamp caveat noted for Reviewer adjudication
- evidence_review evidence path: reference/reports/review/PKT-21-closeout-evidence-review.md

## Refactor / Residual Debt Disposition
- Refactor only PM/source-index paths needed for acceptance.

## 15. Packet Exit Quality Gate
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Source parity status: pass
- Acceptance evidence status: pass
- Test evidence status: pass
- Security evidence status: pass
- Reviewer adjudication: pass
- Planner closeout: approved
- Exit recommendation: approved

## Reopen Trigger
Reopen if PM intake requires new external systems, release approval, or broad operating-intelligence redesign.
