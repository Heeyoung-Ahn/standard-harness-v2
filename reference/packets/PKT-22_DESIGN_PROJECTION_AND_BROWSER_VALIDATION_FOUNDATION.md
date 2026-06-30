# PKT-22 Design Projection And Browser Validation Foundation

> PROVISIONAL SEQUENCE DRAFT. Do not request Ready For Code or Orchestrator routing until
> PKT-17 closeout evidence is reviewed and this packet is re-planned against PKT-17 results.

> PLANNING PACKET. Ready For Code is pending until independent Planner Packet
> Challenge Review, independent `packet_doc_review`, and explicit approval evidence are
> recorded. This packet defines UI/design planning contracts; it does not implement a
> product UI, approve release, or start User UAT.

## Purpose
PKT-22 adds design projection contracts for UI/design-related packets so screens,
wireframes, implementation-reusable mockups, UI handoffs, required states,
accessibility expectations, and browser-validation expectations become verifiable
planning projections without becoming requirements or approval authority.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-22_DESIGN_PROJECTION_AND_BROWSER_VALIDATION_FOUNDATION` | Required design-maturity packet after productization sequence planning. | selected |
| Ready For Code | pending | Independent reviews and explicit approval evidence are required. | pending |
| Human sync needed | no-open-decisions | User already set conditional UI/design trace and implementation-reusable mockup direction. | selected |
| Packet type | `harness-system` | Design projection contracts are reusable harness behavior. | selected |
| Risk level | high | Weak design contracts let mockups become ambiguous or untestable. | selected |
| Risk class | high / design / planning-authority | Design projections must not become approval authority. | selected |
| Gate profile | contract | Schema/validator/trace behavior and negative authority tests are required. | selected |
| Route class | packet-path | Runtime/schema/validator tests and review evidence are required. | selected |
| Change zone | core | Planning projection validators and packet trace are core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | Affects future UI/design planning contracts, not a shipped product UI or end-user product surface. | closed |
| Layer classification | core | Design projection governance is reusable core behavior. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No actual product UI is implemented in this packet. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | conditional | Future UI/design packets inherit product-readiness gates only when user-facing/UAT-bound. | selected |
| Environment topology status | approved | Local schema/validator/test/browser-expectation contract only. | selected |
| Domain foundation status | approved | Domain is design projection, implementation-reusable mockup contract, and browser validation expectation. | selected |
| System context status | approved | Projection schemas, validators, packet trace, designer handoff, and browser evidence expectations are impacted. | selected |
| Authoritative source intake status | approved | Source is SHV2-REQ-059 through SHV2-064 and user clarification on UI/design-only trace. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Closeout evidence is not produced yet. | pending |
| Existing system dependency | internal | Builds on current projection/trace/planning hardening validators. | selected |
| New authoritative source impact | analyzed | Implements approved post-PKT-16 design trace extension. | closed |
| Risk if started now | high | Implementation must wait for reviews and Ready For Code approval. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pending | Required before Ready For Code. | pending |
| Packet doc review | pending | Required before Ready For Code. | pending |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Design Projection Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Browser validation expectation contract; accessibility metadata; implementation-reusable mockup contract
- Lane-type not-needed sections: actual product UI implementation; release publication; live provider execution
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-16 planning hardening, projection validators, packet trace validators, browser evidence contract, frontend/design skills.
- Environment topology reference: local schema/validator/test execution only.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: local starter/root tests and fixture directories.
- Execution target: projection schema tests, implementation-reusable mockup contract tests, browser validation expectation tests, packet trace diagnostics, harness validation.
- Transfer boundary: only structured projection fixtures and packet-bound evidence may be
  created; design projections cannot create requirements, approvals, release claims, or User UAT claims.
- Rollback boundary: revert packet-scoped source/docs/evidence changes through git if needed;
  remove only packet-created fixture/temp files with exact paths under destructive-command guard.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`.
- Existing schema source artifact: internal projection/trace schemas or not-needed if new schema is packet-local.
- Table / column naming compatibility: not-needed.
- Data operation / ownership compatibility: design projections are planning artifacts only and cannot approve gates.
- Migration / rollback / cutover compatibility: not-needed.
- Authoritative source intake reference: SHV2-REQ-059, 060, 061, 062, 064 and Human Owner UI/design-only design trace decision.
- Authoritative source disposition: accepted for packet planning; design artifacts remain projection-only.
- Current implementation impact: may change projection schemas, validators, packet trace diagnostics, and design handoff/browser expectation docs.
- Existing plan conflict: none; non-UI packets must not be blocked by design trace fields.
- Impacted packet set scope: PKT-22 only; PKT-23 owns reusable UI module locking.

## Goal
- Add screen, wireframe, implementation-reusable mockup, UI handoff, required-state,
  accessibility, and browser-validation expectation contracts.
- Require screen projection ids and UI module ids only for UI/design-related packets or
  packets that include design artifacts.
- Keep design projections projection-only and non-authoritative.

## Non-Goal
- Do not implement real product screens.
- Do not force design trace on non-UI packets.
- Do not approve release, User UAT, or product verification.

## Source Authority
- Requirements: SHV2-REQ-059, 060, 061, 062, 064.
- Implementation Plan: PKT-22 row and post-productization design trace extension.
- User decision: UI/design-related packets only; mockups must be implementation-reusable and common modularization starts at design stage.

## Design Projection Contract
Screen/wireframe/mockup/handoff records must include screen id, related requirements,
feature tree nodes, user-flow ids, required states, reusable UI modules, accessibility
requirements, browser validation expectations, data/interaction notes, responsive
constraints, and evidence targets when applicable. Mockups must be implementation-reusable
assets or contracts rather than standalone images.

## Data / Source Impact
- Source impact classification: high
- Data impact classification: conditional
- Schema impact classification: high
- Source impact note: projection schemas, validators, and packet trace diagnostics may change.
- Data impact note: design projection fixtures and evidence records are structured planning data.
- Schema impact note: schema additions are expected and must include negative authority tests.

## In Scope
- Screen/wireframe/mockup/design handoff schemas.
- Browser validation expectation contract.
- Required UI state and accessibility metadata checks.
- Conditional packet trace diagnostics for UI/design packets.
- Projection-only negative tests.

## Out Of Scope
- Reusable UI module locking implementation; PKT-23 owns it.
- Product UI implementation, release, User UAT, provider execution, PM ingestion.

## Acceptance
| ID | Acceptance Criterion | Evidence Required |
|---|---|---|
| A1 | Design projection schemas validate required fields. | Schema tests. |
| A2 | Mockup contract requires implementation-reusable detail. | Contract tests. |
| A3 | Projection artifacts cannot create requirements or approvals. | Negative authority tests. |
| A4 | UI/design packets require screen/design trace; non-UI packets do not. | Conditional packet trace tests. |
| A5 | Browser validation expectations and accessibility metadata are testable. | Validator tests. |

## Expected Negative Fixtures
- Non-UI packet blocked for missing screen projection id and must fail the validator test.
- UI packet with design artifacts but missing screen/flow/module/state/accessibility/browser expectation trace must fail.
- Mockup described only as an image with no reusable contract must fail.
- Design projection claims Ready For Code, release, or requirement authority and must fail.

## Verification Plan
- Projection schema tests.
- Mockup contract tests.
- Required-state/accessibility/browser expectation tests.
- Conditional packet trace diagnostics.
- Projection-only authority negative tests.
- Harness validation and independent closeout lenses.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| Projection schemas | targeted schema tests | `reference/reports/test/PKT-22_TESTER_REPORT.md` |
| Mockup contract | implementation-reusable mockup tests | `reference/reports/test/PKT-22_TESTER_REPORT.md` |
| Trace diagnostics | UI/design conditional packet trace tests | `reference/reports/test/PKT-22_TESTER_REPORT.md` |
| Authority boundary | projection-only negative tests | `reference/reports/test/PKT-22_TESTER_REPORT.md` |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-22_DESIGN_PROJECTION_AND_BROWSER_VALIDATION_FOUNDATION.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-22-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-22-packet-doc-review.md` | required before Ready For Code |
| Developer report | `reference/reports/developer/PKT-22_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-22_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-22-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-22_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-22_PLANNER_CLOSEOUT.md` | required to mark closed |

## Required Closeout Lens Mapping
| Lens | PKT-22 Question |
|---|---|
| `challenge_review` | Does design trace apply only where relevant and avoid guidance-only closure? |
| `adversarial_security_review` | Can design projections bypass requirements, packets, or approval gates? |
| `code_quality_review` | Are schemas/validators integrated with existing planning hardening surfaces? |
| `evidence_review` | Does evidence prove schema, trace, accessibility, browser expectation, and authority behavior? |

## Planner Packet Challenge Review
- Challenge reviewer: pending independent planning reviewer.
- Challenge evidence path: `reference/reports/review/PKT-22-planner-challenge-review.md`
- Challenge status: pending.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: pending independent packet document reviewer.
- Packet doc review evidence path: `reference/reports/review/PKT-22-packet-doc-review.md`
- Packet doc review status: pending.

## Human Sync / Approval Boundary
- Open decisions: none beyond Ready For Code approval after independent review pass.
- Design projection artifacts cannot approve implementation, release, User UAT, closeout, or requirements.

## Security Review Request
- Security review required: yes.
- Focus: projection authority bypass, prompt-like design text, sensitive screen data, approval overclaims.

## Refactor / Residual Debt Disposition
- Refactor only projection/trace/browser expectation surfaces needed for acceptance.

## Packet Exit Quality Gate
- Source parity status: pending
- Acceptance evidence status: pending
- Test evidence status: pending
- Security evidence status: pending
- Reviewer adjudication: pending
- Planner closeout: pending
- Exit recommendation: hold

## Reopen Trigger
Reopen if product UI implementation, actual browser evidence capture, or reusable module locking must be pulled into this packet.
