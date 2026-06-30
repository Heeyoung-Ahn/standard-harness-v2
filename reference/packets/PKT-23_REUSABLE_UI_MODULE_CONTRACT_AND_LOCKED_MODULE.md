# PKT-23 Reusable UI Module Contract And Locked Module

> PROVISIONAL SEQUENCE DRAFT. Do not request Ready For Code or Orchestrator routing until
> PKT-17 closeout evidence is reviewed and this packet is re-planned against PKT-17 results.

> PLANNING PACKET. Ready For Code is pending until independent Planner Packet
> Challenge Review, independent `packet_doc_review`, and explicit approval evidence are
> recorded. This packet defines reusable UI module contracts; it does not implement a
> product UI, approve release, or start User UAT.

## Purpose
PKT-23 adds reusable UI module contracts and locked-module policy for common UI surfaces.
It ensures UI/design-related packets classify common modules during design projection and
start modularization before Developer implementation, reducing table/form/modal/navigation
drift across screens.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE` | Required design-maturity packet after PKT-22. | selected |
| Ready For Code | pending | Independent reviews and explicit approval evidence are required. | pending |
| Human sync needed | no-open-decisions | User already approved UI/design-only module trace and implementation-reusable mockup direction. | selected |
| Packet type | `harness-system` | UI module contracts are reusable design-system planning behavior. | selected |
| Risk level | high | Weak module locking can cause UI drift or block irrelevant non-UI work. | selected |
| Risk class | high / design-system / planning-authority | Locked modules affect future UI implementation and review. | selected |
| Gate profile | contract | Schema/validator/negative tests and design-stage classification are required. | selected |
| Route class | packet-path | Runtime/schema/validator tests and review evidence are required. | selected |
| Change zone | core | UI module contract validators and packet trace are core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | Affects future UI/design planning contracts, not a shipped product UI or end-user product surface. | closed |
| Layer classification | core | Reusable module governance is core. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No actual product UI is implemented. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | conditional | Future UI/product packets inherit product readiness only when user-facing/UAT-bound. | selected |
| Environment topology status | approved | Local schema/validator/test execution only. | selected |
| Domain foundation status | approved | Domain is reusable UI module contract, locked module policy, and design-stage module classification. | selected |
| System context status | approved | UI module schemas, validators, design-to-packet trace, and review/test expectations are impacted. | selected |
| Authoritative source intake status | approved | Source is SHV2-REQ-062, 063, 064 and user clarification on implementation-reusable mockups/modules. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Closeout evidence is not produced yet. | pending |
| Existing system dependency | internal | Builds on PKT-22 design projection and current trace validators. | selected |
| New authoritative source impact | analyzed | Implements approved post-PKT-16 design trace extension. | closed |
| Risk if started now | high | Implementation must wait for reviews and Ready For Code approval. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pending | Required before Ready For Code. | pending |
| Packet doc review | pending | Required before Ready For Code. | pending |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Reusable UI Module Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Locked-module policy; responsive/interaction/accessibility metadata; used-by screen trace
- Lane-type not-needed sections: actual product UI implementation; release publication; live provider execution
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-22 packet/closeout when available, design projection schemas, packet trace validators, frontend/design skill guidance.
- Environment topology reference: local schema/validator/test execution only.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: local starter/root tests and fixture directories.
- Execution target: UI module contract tests, design-stage module classification tests, locked-module negative tests, responsive/interaction/accessibility checks, trace validation, harness validation.
- Transfer boundary: only structured UI module contract fixtures and packet-bound evidence may
  be created; module contracts cannot approve requirements, implementation, release, User UAT,
  or product verification.
- Rollback boundary: revert packet-scoped source/docs/evidence changes through git if needed;
  remove only packet-created fixture/temp files with exact paths under destructive-command guard.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; PKT-22 design projection contract when closed.
- Existing schema source artifact: internal design projection/module schemas or not-needed if newly added.
- Table / column naming compatibility: not-needed.
- Data operation / ownership compatibility: module contracts are planning/design artifacts only and cannot approve gates.
- Migration / rollback / cutover compatibility: not-needed.
- Authoritative source intake reference: SHV2-REQ-062, 063, 064 and Human Owner UI/design module clarification.
- Authoritative source disposition: accepted for packet planning; module contracts remain design/planning authority only.
- Current implementation impact: may change UI module contract schemas, design-stage classification policy, locked-module policy, design-to-packet trace, and review/test expectations.
- Existing plan conflict: none; non-UI packets must not be blocked by UI module fields.
- Impacted packet set scope: PKT-23 only.

## Goal
- Add module contracts for app shell, left navigation, top bar, table/data grid, modal,
  drawer, form field set, detail panel, empty/error/permission states, and toast/notification.
- Require design-stage module classification when UI/design packets create implementation-reusable mockups.
- Define locked-module do-not-change rules, variants, responsive behavior, interaction states,
  accessibility requirements, used-by screens, and visual references.

## Non-Goal
- Do not implement actual product UI modules.
- Do not require UI module trace for non-UI packets.
- Do not approve release, User UAT, or product verification.

## Source Authority
- Requirements: SHV2-REQ-062, 063, 064.
- Implementation Plan: PKT-23 row.
- User decision: UI/design packet only; implementation-reusable mockups must start common modularization during design.

## Reusable UI Module Contract
Each module contract must declare module id, purpose, allowed variants, responsive
behavior, interaction states, accessibility requirements, do-not-change rules, used-by
screens, and visual reference. Locked modules may be reused and tested; changing a locked
contract requires packet-scoped approval and trace.

## Data / Source Impact
- Source impact classification: high
- Data impact classification: conditional
- Schema impact classification: high
- Source impact note: module contract schemas, validators, and trace diagnostics may change.
- Data impact note: module contract fixtures and projection records are structured planning data.
- Schema impact note: schema additions are expected and require tests.

## In Scope
- UI module contract schema.
- Design-stage module classification policy.
- Locked-module do-not-change negative tests.
- Responsive/interaction/accessibility metadata checks.
- Used-by screen trace validation.

## Out Of Scope
- Product UI component implementation, release, User UAT, provider execution, PM ingestion.

## Acceptance
| ID | Acceptance Criterion | Evidence Required |
|---|---|---|
| A1 | Module contract schema validates required module fields. | Schema tests. |
| A2 | Design-stage module classification is required for UI/design mockups. | Validator tests. |
| A3 | Locked-module do-not-change rules fail closed. | Negative tests. |
| A4 | Responsive, interaction, accessibility, and used-by screen metadata are checked. | Contract tests. |
| A5 | Non-UI packets are not blocked by module fields. | Conditional trace tests. |

## Expected Negative Fixtures
- UI mockup creates a common table/modal/nav without module classification and must fail.
- Locked module contract changes without packet trace and must fail.
- Module missing accessibility/responsive/interaction metadata and must fail.
- Non-UI packet missing UI module id is blocked and must fail the validator test.

## Verification Plan
- Module contract tests.
- Design-stage module classification tests.
- Do-not-change negative tests.
- Responsive/interaction/accessibility checks.
- Used-by screen trace validation.
- Harness validation and independent closeout lenses.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| Module schema | targeted schema tests | `reference/reports/test/PKT-23_TESTER_REPORT.md` |
| Classification | design-stage module classification tests | `reference/reports/test/PKT-23_TESTER_REPORT.md` |
| Locked module | do-not-change negative tests | `reference/reports/test/PKT-23_TESTER_REPORT.md` |
| Conditional trace | non-UI not-blocked and UI-required trace tests | `reference/reports/test/PKT-23_TESTER_REPORT.md` |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-23-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-23-packet-doc-review.md` | required before Ready For Code |
| Developer report | `reference/reports/developer/PKT-23_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-23_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-23-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-23_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-23_PLANNER_CLOSEOUT.md` | required to mark closed |

## Required Closeout Lens Mapping
| Lens | PKT-23 Question |
|---|---|
| `challenge_review` | Does module locking reduce UI drift without blocking irrelevant packets? |
| `adversarial_security_review` | Can module contracts bypass packet/design approval or hide accessibility gaps? |
| `code_quality_review` | Are module contracts integrated with PKT-22 projection/trace patterns? |
| `evidence_review` | Does evidence prove schema, classification, lock, metadata, and conditional trace behavior? |

## Planner Packet Challenge Review
- Challenge reviewer: pending independent planning reviewer.
- Challenge evidence path: `reference/reports/review/PKT-23-planner-challenge-review.md`
- Challenge status: pending.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: pending independent packet document reviewer.
- Packet doc review evidence path: `reference/reports/review/PKT-23-packet-doc-review.md`
- Packet doc review status: pending.

## Human Sync / Approval Boundary
- Open decisions: none beyond Ready For Code approval after independent review pass.
- Module contracts cannot approve implementation, release, User UAT, closeout, or requirements.

## Security Review Request
- Security review required: yes.
- Focus: approval bypass, accessibility metadata omission, design projection authority misuse, prompt-like visual references.

## Refactor / Residual Debt Disposition
- Refactor only module contract/trace surfaces needed for acceptance.

## Packet Exit Quality Gate
- Source parity status: pending
- Acceptance evidence status: pending
- Test evidence status: pending
- Security evidence status: pending
- Reviewer adjudication: pending
- Planner closeout: pending
- Exit recommendation: hold

## Reopen Trigger
Reopen if actual product UI implementation, visual design approval, or User UAT readiness is pulled into this packet.
