# PKT-23 Reusable UI Module Contract And Locked Module

> PLANNING PACKET. Ready For Code is approved for PKT-23 only after independent
> Planner Packet Challenge Review, independent `packet_doc_review`, and explicit
> delegated approval evidence were recorded. This packet defines reusable UI module
> contracts; it does not implement a product UI, approve release, or start User UAT.

## Purpose
PKT-23 adds reusable UI module contracts and locked-module policy for common UI surfaces.
It ensures UI/design-related packets classify common modules during design projection and
start modularization before Developer implementation, reducing table/form/modal/navigation
drift across screens.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE` | Required design-maturity packet after PKT-22. | selected |
| Ready For Code | approved | Independent planning challenge, packet_doc_review, and delegated approval evidence are recorded for PKT-23 only. | approved |
| Human sync needed | no-open-decisions | User already approved UI/design-only module trace and implementation-reusable mockup direction. | selected |
| Packet type | `harness-system` | UI module contracts are reusable design-system planning behavior. | selected |
| Risk level | high | Weak module locking can cause UI drift or block irrelevant non-UI work. | selected |
| Risk class | high / design-system / planning-authority | Locked modules affect future UI implementation and review. | selected |
| Gate profile | contract | Schema/validator/negative tests and design-stage classification are required. | selected |
| Gate profile version | harness-system@1+high@1+contract-boundary | High/core reusable UI module contracts require strict planning and authority-boundary gates. | selected |
| Required gates | packet-doc-review; planner-challenge; implementation-transition preflight; module contract schema tests; design-stage module classification tests; locked-module negative tests; responsive/interaction/accessibility metadata tests; used-by screen trace tests; non-UI not-blocked tests; starter regression; root validation; security review; four independent closeout lenses; Reviewer adjudication; Planner closeout | Locked modules can otherwise become visual-only guidance, block non-UI packets, or bypass packet approval. | selected |
| Route class | packet-path | Runtime/schema/validator tests and review evidence are required. | selected |
| Change zone | core | UI module contract validators and packet trace are core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | Affects future UI/design planning contracts, not a shipped product UI or end-user product surface. | closed |
| Layer classification | core | Reusable module governance is core. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No actual product UI is implemented. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | not-needed | PKT-23 defines reusable planning contracts only and does not implement a user-facing product UI. | closed |
| Environment topology status | approved | Local schema/validator/test execution only. | selected |
| Domain foundation status | approved | Domain is reusable UI module contract, locked module policy, and design-stage module classification. | selected |
| System context status | approved | UI module schemas, validators, design-to-packet trace, and review/test expectations are impacted. | selected |
| Authoritative source intake status | approved | Source is SHV2-REQ-062, 063, 064 and user clarification on implementation-reusable mockups/modules. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | approved | Reviewer adjudication and Planner closeout are recorded for PKT-23 scope. | closed |
| Existing system dependency | internal | Builds on PKT-22 design projection and current trace validators. | selected |
| New authoritative source impact | analyzed | Implements approved post-PKT-16 design trace extension. | closed |
| Risk if started now | controlled-after-review | Independent reviews and delegated Ready For Code approval are recorded; implementation must remain inside PKT-23 scope. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pass | Independent challenge review passed with no required corrections. | closed |
| Packet doc review | pass | Independent packet document review passed with no required corrections. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Reusable UI Module Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Locked-module policy; responsive/interaction/accessibility metadata; used-by screen trace
- Lane-type not-needed sections: actual product UI implementation; release publication; live provider execution
- Layer classification: core
- N/A decisions: actual product UI implementation and real browser capture are not required because PKT-23 defines reusable UI module contracts and lock validation, not product screens; Product Readiness/User UAT gate is not applicable because no user-facing runtime state changes; release/publish/starter promotion are not approved.
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

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A Planner or Designer identifies common UI modules during design projection, locks reusable contracts before implementation, and lets Developer and Tester reuse those contracts without screen-by-screen drift.
- API contract: UI module validation must expose structured module contract diagnostics for module id, purpose, allowed variants, responsive behavior, interaction states, accessibility requirements, do-not-change rules, used-by screens, visual references, packet trace, and non-UI not-blocked behavior.
- Component responsibility: Reusable UI module validators own module contract structure, design-stage classification, locked-module change trace, and used-by screen metadata; PKT-22 design projection validators own screen/flow/browser expectation contracts and may reference module ids; approval/gate workflows remain authoritative for Ready For Code, closeout, release, residual risk, User UAT, and productization-complete.
- Data ownership: UI module contracts are design/planning contracts only. They may support implementation reuse, review, test expectations, and drift detection, but cannot create requirements, approve implementation, approve release, mutate packet state, or close acceptance.
- Allowed dependency direction: UI/design packet trace may depend on module contracts; module contracts may reference screen projection ids and packet ids; non-UI packet validation must not depend on module contract fields.
- Public contract vs internal/scratch field: public contract is the structured reusable UI module contract and validator diagnostics. Fixture names, local examples, and visual-reference placeholders are not product UI authority.
- Promoted artifact: required before implementation if reusable schema names or validator diagnostics are introduced; for PKT-23 this may be satisfied by tested Python contracts and validator behavior unless implementation discovers a broader schema registry need.
- Browser evidence classification: expectation/contract only. Real browser screenshots, console evidence, and interaction evidence become required when a later UI/design packet implements or changes a product browser surface.

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

Minimum common module families:
- app shell
- left navigation
- top bar
- table / data grid
- modal
- drawer
- form field set
- detail panel
- empty/error/permission state
- toast / notification

Locked module changes must cite packet id, screen projection ids when UI/design scope is
involved, reason for change, allowed variant impact, and evidence target ids. A locked
module contract may fail validation when do-not-change rules are altered without this
trace, but the module contract itself cannot approve that change.

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
| A6 | Common module families have contract fixtures or templates for app shell, navigation, top bar, data grid, modal, drawer, form field set, detail panel, state surfaces, and toast/notification. | Schema/template tests. |
| A7 | Module contracts remain planning/design authority only and cannot approve implementation, release, User UAT, or closeout. | Projection-only authority negative tests. |

## Expected Negative Fixtures
- UI mockup creates a common table/modal/nav without module classification and must fail.
- Locked module contract changes without packet trace and must fail.
- Module missing accessibility/responsive/interaction metadata and must fail.
- Module missing allowed variants, do-not-change rules, used-by screens, or visual reference must fail.
- Module contract claims Ready For Code, implementation approval, release approval, User UAT, closeout, productization-complete, or requirement authority and must fail.
- Non-UI packet missing UI module id must pass without UI module trace diagnostics.

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
| Authority boundary | projection-only negative tests | `reference/reports/test/PKT-23_TESTER_REPORT.md`; `reference/reports/security/PKT-23-security-review.json` |
| Frontend/design planning evidence | frontend-design report | `reference/reports/frontend-design/PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE.md` |
| Ready For Code evidence | delegated Ready For Code record | `reference/reports/planner/PKT-23_READY_FOR_CODE_DELEGATION.md` |
| standard-template | focused and full starter test evidence for `starter/standard-harness` | `reference/reports/test/PKT-23_TESTER_REPORT.md` |
| validator | root harness validation and packet preflight evidence | `reference/reports/test/PKT-23_TESTER_REPORT.md`; `.agents/artifacts/VALIDATION_REPORT.json` |
| active context | regenerated Active Context after routing and closeout transitions | `.agents/runtime/ACTIVE_CONTEXT.json`; `reference/reports/test/PKT-23_TESTER_REPORT.md` |
| Root validation / packet preflight | harness validation and packet preflight | `reference/reports/test/PKT-23_TESTER_REPORT.md`; `.agents/artifacts/VALIDATION_REPORT.json` |
| Independent closeout lenses | challenge, adversarial security, code quality, evidence review | `reference/reports/review/PKT-23-closeout-*.md` |
| review closeout | Reviewer adjudication and Planner closeout | `reference/reports/review/PKT-23_REVIEW_REPORT.md`; `reference/reports/closeout/PKT-23_PLANNER_CLOSEOUT.md` |

## TDD Evidence Contract
- TDD mode: required
- Red test file: starter/standard-harness/_harness/test/test_pkt23_reusable_ui_module_contract.py
- Red command: py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt23_reusable_ui_module_contract.py"
- Red exit code: 1
- Red failure kind: expected-contract-failure
- Red ran at: 2026-06-30T16:06:00Z
- Red output excerpt: ModuleNotFoundError: No module named 'standard_harness.design.ui_module'
- Red output artifact: reference/reports/tdd/PKT-23-red.md
- Red output sha256: E2DF5E0378BB95D1B11EC3AA07EE62FB93BD81FC4667325DE56336AADCB23EF1
- Green command: py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt23_reusable_ui_module_contract.py"
- Green exit code: 0
- Green ran at: 2026-06-30T16:08:00Z
- Green output excerpt: Ran 13 tests in 0.002s; OK
- Green output artifact: reference/reports/tdd/PKT-23-green.md
- Green output sha256: 02850FBF4FEB3196F0643F46B90C8670AADCD9164E865383DE526B749CC4B6A9
- Refactor verified: yes
- Behavior-level test: yes
- Test-only production hook: no
- Red expectation: tests fail before reusable UI module contract implementation.
- Green expectation: focused tests pass after implementation and before Tester closeout.

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE.md` | required before Ready For Code |
| Frontend design report | `reference/reports/frontend-design/PKT-23_REUSABLE_UI_MODULE_CONTRACT_AND_LOCKED_MODULE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-23-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-23-packet-doc-review.md` | required before Ready For Code |
| Ready For Code delegation | `reference/reports/planner/PKT-23_READY_FOR_CODE_DELEGATION.md` | required before Orchestrator routing |
| Developer report | `reference/reports/developer/PKT-23_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-23_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-23-security-review.json` | required before closeout |
| Closeout challenge review | `reference/reports/review/PKT-23-closeout-challenge-review.md` | required before Reviewer adjudication |
| Closeout adversarial security review | `reference/reports/review/PKT-23-closeout-adversarial-security-review.md` | required before Reviewer adjudication |
| Closeout code quality review | `reference/reports/review/PKT-23-closeout-code-quality-review.md` | required before Reviewer adjudication |
| Closeout evidence review | `reference/reports/review/PKT-23-closeout-evidence-review.md` | required before Reviewer adjudication |
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
- Challenge reviewer: independent Planner Packet Challenge Reviewer; agent `019f1941-b6e0-70c3-86c1-d7fb887be1db`.
- Challenge reviewer independence basis: review-only agent; no file edits; not packet author, Developer, Tester, Orchestrator, Reviewer adjudicator, Planner closeout owner, or generated summary.
- Source refs reviewed: packet, `.agents/artifacts/REQUIREMENTS.md` SHV2-REQ-062/063/064, `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-22/PKT-23 rows, `.agents/artifacts/ARCHITECTURE_GUIDE.md` approval/delegation boundaries.
- Parent objective coverage: pass.
- Deferred scope with named follow-up: not-needed
- Deferred scope rationale: product UI implementation, browser evidence, release, User UAT, provider execution, and product verification are out of scope and owned by later UI/design packets when applicable.
- Acceptance proves behavior change: pass; A1-A7 require schema, validator, locked-module, metadata, conditional trace, common-family, and authority-boundary tests.
- Failure fixture or failure condition: pass; missing module classification, unauthorized locked-module change, missing metadata, authority claims, and non-UI not-blocked behavior are covered.
- Reviewer closeout hold basis: pass; closeout may hold on missing Developer/Tester/security evidence, independent lenses, Reviewer adjudication, Planner closeout, or failed authority/trace tests.
- First-wave limit check: pass.
- Guidance-only sufficiency rationale: pass; scope requires tested schemas, validators, and negative fixtures.
- Challenge evidence artifact path: `reference/reports/review/PKT-23-planner-challenge-review.md`
- Findings disposition: no required corrections.
- Required corrections applied: not-needed.
- No self-approval claim: independent reviewer, not packet author
- Challenge status: pass

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: independent Packet Document Reviewer; agent `019f1941-f627-7ca3-8ac5-113466c14025`.
- Packet doc review evidence path: `reference/reports/review/PKT-23-packet-doc-review.md`
- Packet doc review completed before Ready For Code: yes
- Packet doc reviewer independence basis: independent review-only Packet Document Reviewer; no file edits; not Planner, Developer, Tester, Orchestrator, Reviewer adjudicator, or generated summary.
- Requirements direction alignment: pass.
- Implementation-plan sequencing alignment: pass.
- Architecture/source SSOT alignment: pass.
- Human/Planner intent preservation: pass.
- v1.0 root-harness operating constraint coverage: pass.
- v2.0 product philosophy coverage: pass.
- Acceptance strength: pass.
- Verification scope strength: pass.
- Deferred/out-of-scope ownership: pass.
- Required corrections: not-needed
- Findings disposition: no required corrections.
- No self-approval claim: yes.
- Packet doc review status: pass

## Human Sync / Approval Boundary
- Open decisions: none.
- Delegated Ready For Code evidence: `reference/reports/planner/PKT-23_READY_FOR_CODE_DELEGATION.md`.
- Human Owner delegated PKT-17 through PKT-23 Ready For Code and closeout approval execution to the Conductor/Planner path for this run. In the root v1.0 development harness, this is recorded as a packet-scoped Planner approval record and does not inject a product Conductor runtime concept into the starter payload.
- Module contracts cannot approve implementation, release, User UAT, closeout, residual-risk acceptance, productization-complete, or requirements.

## Security Review Request
- Security review required: yes.
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-23-security-review.json
- Focus: approval bypass, accessibility metadata omission, design projection authority misuse, prompt-like visual references.

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: parallel where practical; adversarial security recheck after remediation
- challenge_review agent: `019f194d-86b6-7702-9470-ff573e6d8e38`
- challenge_review independence basis: independent challenge reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- challenge_review status: pass
- challenge_review finding count: 0 after closeout-shape remediation
- challenge_review reviewer disposition: accepted after security evidence, independent lens evidence, canonical packet exit gate, and structured behavior verification remediation
- challenge_review evidence path: reference/reports/review/PKT-23-closeout-challenge-review.md
- adversarial_security_review agent: `019f1954-5831-7bf2-877d-812cd16278ce`
- adversarial_security_review independence basis: independent adversarial security reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0 after remediation
- adversarial_security_review reviewer disposition: accepted after authority synonym, screen projection trace, and accessibility placeholder remediation
- adversarial_security_review evidence path: reference/reports/review/PKT-23-closeout-adversarial-security-review.md
- code_quality_review agent: `019f194e-114c-73f2-b29a-6fa121ec1232`
- code_quality_review independence basis: independent code-quality reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: accepted
- code_quality_review evidence path: reference/reports/review/PKT-23-closeout-code-quality-review.md
- evidence_review agent: `019f194e-5786-7833-9805-2669b1898451`
- evidence_review independence basis: independent evidence reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: accepted
- evidence_review evidence path: reference/reports/review/PKT-23-closeout-evidence-review.md

## Refactor / Residual Debt Disposition
- Refactor only module contract/trace surfaces needed for acceptance.

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
- Reviewer adjudication: pass (`reference/reports/review/PKT-23_REVIEW_REPORT.md`)
- Planner closeout: approved (`reference/reports/closeout/PKT-23_PLANNER_CLOSEOUT.md`)
- Exit recommendation: approved

## Reopen Trigger
Reopen if actual product UI implementation, visual design approval, or User UAT readiness is pulled into this packet.
