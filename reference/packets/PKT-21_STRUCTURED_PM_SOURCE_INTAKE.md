# PKT-21 Structured PM Source Intake

> PROVISIONAL SEQUENCE DRAFT. Do not request Ready For Code or Orchestrator routing until
> PKT-17 closeout evidence is reviewed and this packet is re-planned against PKT-17 results.

> PLANNING PACKET. Ready For Code is pending until independent Planner Packet
> Challenge Review, independent `packet_doc_review`, and explicit approval evidence are
> recorded. PM summaries and WBS inputs remain source/evidence only and cannot approve
> implementation, release, closeout, or residual risk.

## Purpose
PKT-21 ingests structured PM TSV/CSV/WBS sources into operating intelligence without
turning PM summaries into approval authority. It closes the final required
productization packet in the PKT-17 through PKT-21 set.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-21_STRUCTURED_PM_SOURCE_INTAKE` | Required productization packet for structured PM source intake. | selected |
| Ready For Code | pending | Independent reviews and explicit approval evidence are required. | pending |
| Human sync needed | no-open-decisions | Scope follows Requirements and Implementation Plan. | selected |
| Packet type | `harness-system` | PM source intake and operating intelligence are reusable harness behavior. | selected |
| Risk level | high | PM summaries can be mistaken for approval authority. | selected |
| Risk class | high / PM / source-authority | Structured source intake affects QA and status answers. | selected |
| Gate profile | release | Productization completion depends on this packet. | selected |
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
| Risk if started now | high | Implementation must wait for reviews and Ready For Code approval. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pending | Required before Ready For Code. | pending |
| Packet doc review | pending | Required before Ready For Code. | pending |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; PM Source Intake Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: WBS fixture contract; source freshness checks
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; release publication; live provider execution
- Layer classification: core
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
| A5 | Productization packet set can be evaluated after PKT-21 closeout. | Planner closeout. |

## Expected Negative Fixtures
- PM TSV says Ready For Code approved and must not approve.
- Stale PM row shapes answer without freshness warning and must fail.
- WBS round-trip loses packet/status/evidence relation and must fail.

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

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-21_STRUCTURED_PM_SOURCE_INTAKE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-21-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-21-packet-doc-review.md` | required before Ready For Code |
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
- Challenge reviewer: pending independent planning reviewer.
- Challenge evidence path: `reference/reports/review/PKT-21-planner-challenge-review.md`
- Challenge status: pending.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: pending independent packet document reviewer.
- Packet doc review evidence path: `reference/reports/review/PKT-21-packet-doc-review.md`
- Packet doc review status: pending.

## Human Sync / Approval Boundary
- Open decisions: none beyond Ready For Code approval after independent review pass.

## Security Review Request
- Security review required: yes.
- Focus: prompt injection in PM rows, stale source authority, sensitive operational records.

## Refactor / Residual Debt Disposition
- Refactor only PM/source-index paths needed for acceptance.

## Packet Exit Quality Gate
- Source parity status: pending
- Acceptance evidence status: pending
- Test evidence status: pending
- Security evidence status: pending
- Reviewer adjudication: pending
- Planner closeout: pending
- Exit recommendation: hold

## Reopen Trigger
Reopen if PM intake requires new external systems, release approval, or broad operating-intelligence redesign.
