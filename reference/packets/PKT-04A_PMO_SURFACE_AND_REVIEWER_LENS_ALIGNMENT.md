# PKT-04A PMO Surface And Reviewer Lens Alignment

This is a Planner-opened implementation packet draft after PKT-04 closeout. It narrows the
PMO folder contract into a compact human review surface plus structured operating-state
contract, and it adds a small Reviewer lens checklist contract. It does not approve
implementation.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: This repository's implementation target is the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root 파일을 수정할 수는 있지만, 그 이유는 starter v2.0 구현/검증/운영을 위한 것이어야 합니다.
- v2.0 philosophy parity gate: before Ready For Code and closeout, confirm the packet preserves the clean starter payload, provider-neutral product identity, compact human review surface, structured operating state, evidence-backed closeout, and root/starter boundary.
- Gate status: pass for planning. This packet reduces PMO human-facing folder pressure and clarifies Reviewer lenses without expanding PKT-04 implementation scope.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT | Reclassify PMO surfaces and add minimum Reviewer lens checklists after PKT-04. | selected |
| Ready For Code | approved | Human Owner explicitly approved PKT-04A Ready For Code on 2026-06-28 and requested Orchestrator delivery. | approved |
| Human sync needed | no | Human Owner approved the PMO surface simplification and Reviewer lens minimum for implementation. | closed |
| Packet type | harness-system | The packet changes reusable starter PMO and review/closeout contracts. | selected |
| Risk level | high | Review and closeout contracts are load-bearing; weak wording could either overproduce documents or under-review future packets. | selected |
| Gate profile | contract | The packet changes reusable root/starter contract surfaces and workflow expectations. | selected |
| Route class | packet-path | Implementation needs explicit packet scope, tests, review, and closeout. | selected |
| Change zone | core | PMO surface and Reviewer contracts are core Standard Harness v2 operating behavior. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer, Tester, Reviewer, bounded remediation, and Planner closeout through Orchestrator. | selected |
| User-facing impact | low | Starter PMO folder shape and Reviewer explanations affect human-readable contracts, but no browser/UI surface is in scope. | selected |
| Layer classification | core | The packet changes the reusable Standard Harness v2 operating layer. | selected |
| Active profile dependencies | none | No optional product profile is required. | closed |
| Profile evidence status | approved | No profile-specific evidence is required. | closed |
| UX archetype status | approved | No browser UI component is in scope; day-start is classified as a generated/screen-oriented human view, not a UI implementation packet. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | not-needed | No deployment topology change is in scope. | closed |
| Domain foundation status | approved | No copied-project product domain model is changed; this is harness PMO/review behavior. | closed |
| Authoritative source intake status | approved | Sources are user clarification, Requirements Markdown-explosion limits, PKT-04 closeout, and current Reviewer workflow. | selected |
| Shared-source wave status | not-needed | This is a single small refinement packet; root/starter parity is required as verification. | closed |
| Packet exit gate status | pass | Implementation, tests, security review, Reviewer evidence, and Planner closeout are recorded. | closed |
| Existing system dependency | internal | Depends on PKT-04 PM report/WBS behavior, folder policy, contamination checks, Reviewer workflow, and packet templates. | selected |
| New authoritative source impact | analyzed | This packet clarifies that broad PMO categories do not imply many human Markdown folders. | selected |
| Risk if started now | high | Starting without explicit approval could delete useful structure or weaken review gates. | selected |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Packet Scope; Problem Statement; Acceptance Criteria; Verification Manifest; Planner Packet Challenge Review.
- Lane-type conditional sections: Development Documentation Impact; Feature Artifact Sync Matrix; Modeling Impact; Security Review Request.
- Lane-type not-needed sections: UI implementation; environment topology; release packaging; browser evidence; copied-project product domain data changes.
- Planner packet challenge required: yes
- Work item title: PMO Surface And Reviewer Lens Alignment
- Parent objective: Keep the Standard Harness v2 starter compact and reviewable while preserving structured PMO state and evidence-backed review/closeout.
- Scope boundary: reclassify PMO surfaces, reduce mandatory human-facing PMO folder pressure, and add four Reviewer lens minimum checklists only.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/artifacts/SYSTEM_CONTEXT.md`; `.agents/workflows/reviewer.md`; this packet; `reference/packets/PKT-04_PM_DAILY_RHYTHM_AND_WBS_LOOP.md`; `reference/reports/closeout/PKT-04_PLANNER_CLOSEOUT.md`; `starter/standard-harness/_harness/policies/project-operating-folders.yaml`; `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`; `starter/standard-harness/_harness/system/standard_harness/validation/pmo_reports.py`.
- UX archetype reference: not-needed
- Selected UX archetype: not-needed
- Domain foundation reference: not-needed
- Schema impact classification: high
- Schema impact note: PMO placement and Reviewer lens fields may change starter-visible contracts.
- Authoritative source intake reference: `.agents/artifacts/REQUIREMENTS.md` lines on Markdown explosion, structured operating records, PM rhythm, `SHV2-REQ-026`, `SHV2-REQ-037`, `SHV2-REQ-038`, `SHV2-REQ-043`, and explicit user direction after PKT-04.
- Authoritative source disposition: accepted for packet planning; Developer must treat broad PMO categories as structured-state obligations unless the packet selects a human-facing Markdown surface.
- Current implementation impact: approved for PKT-04A scope only after Human Owner Ready For Code approval on 2026-06-28.
- Existing plan conflict: PKT-04 closed with an 8-folder PMO seed contract, but user review identified that the result conflicts with compact human review surface intent.
- Impacted packet set scope: PKT-04A only. PKT-05 long memory remains deferred unless this packet only updates its dependency note.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed

## Problem Statement
PKT-04 correctly added PM day reports, WBS support, stale-summary checks, and PM authority
guards. During human review, the copied starter PMO folder view looked like many documents
would need to be read or maintained. That conflicts with the v2.0 direction that human
review surfaces must stay compact and high-volume state must be structured, indexed, and
queryable.

The same review surfaced a second contract gap: Reviewer work needs four explicitly named
minimum lenses so Planner, Orchestrator, Reviewer, and closeout reports share the same
small vocabulary without creating long role manuals.

## In Scope
- Reclassify PKT-04's PMO surface into:
  - minimum human-facing surface,
  - structured operating-state / evidence surface,
  - optional generated view or export surface.
- Reduce mandatory `product/docs/pmo/` seed folders so a fresh starter does not imply many human Markdown documents.
- Treat day-start as screen/generated brief first; if persisted, it must remain maximum one page and explicitly optional unless the implementation packet selects otherwise.
- Keep day-wrap-up as the durable human-facing Markdown daily close report.
- Keep WBS as TSV/CSV-compatible structured tracking, not prose-first Markdown.
- Move or reclassify `source-intake`, `daily-reports`, `status`, `risks`, and `blockers` as structured records, indexes, report sections, or optional exports instead of mandatory human Markdown folders.
- Remove the empty legacy `daily-wrap-up` folder if it still exists.
- Add minimum Reviewer lens checklists for `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`.
- Reflect the lens checklist in the smallest suitable surfaces, with `.agents/workflows/reviewer.md` as the root development contract and the starter payload Reviewer contract/template surface as the product target.
- Preserve root/starter reusable parity for PMO validation and Reviewer lens behavior.
- Add or update tests/validators that prove the new PMO minimum surface, no legacy duplicate folder, structured-state classification, and Reviewer lens checklist presence.

## Out Of Scope
- No PKT-04 behavior expansion beyond contract cleanup.
- No PKT-05 long-memory or question-answering implementation.
- No provider-neutral orchestration implementation.
- No browser UI implementation for the day-start screen.
- No raw evidence dumps in PM reports.
- No new long Reviewer manual.
- No removal of PMO tracking, WBS, risks, blockers, status, or source-intake capability; only reclassification away from mandatory human Markdown folder pressure.
- No release, publish, package metadata change, or starter promotion.
- No `starter/standard-harness/AGENTS.md`.
- No Ready For Code approval by implication.

## PMO Surface / Structured State Decision
| Surface | Selected Classification | Expected Location / Shape | Human Review Burden |
| --- | --- | --- | --- |
| Day-start | generated/screen-oriented human brief; optional persisted export | generated view or optional max-one-page report if a future packet chooses to persist it | read when starting work; not a growing folder of required Markdown |
| Day-wrap-up | durable human-facing Markdown close report | `product/docs/pmo/day-wrap-up/<date>.md` or equivalent selected by implementation | one page per workday when produced |
| WBS | structured tracking | TSV/CSV under a minimal WBS contract, preferably one table or a small folder only if multiple tables are justified | reviewed as table, not prose |
| Risks | structured state and report section | `_ops` SQLite/JSON/index record plus day reports/closeout links | summarized, not separate required Markdown |
| Blockers | structured state and report section | `_ops` SQLite/JSON/index record plus day reports/closeout links | summarized, not separate required Markdown |
| Status | structured state and generated summary | Active Context / validation/status read model plus day reports | summarized, not separate required Markdown |
| Source intake | packet/source artifact reference or structured index | packet/source refs, evidence index, or `_ops` index | referenced, not a required PMO Markdown folder |
| Daily records | structured event/state history | `_ops` event/store/index, optional report export | queried/summarized, not manually read as many files |

## Reviewer Lens Minimum Checklist Decision
### `challenge_review`
Purpose: verify that the user's original requirements, planning intent, Planner-approved SSOT, and packet acceptance are reflected in the result.
- Did the implementation narrow or omit approved scope?
- Does the implementation satisfy work/product intent, not only tests?
- Did implementation reinterpret scope without Planner approval?

### `adversarial_security_review`
Purpose: check security weaknesses, attack paths, permission bypass, data exposure, and auth/session issues.
- auth/authz bypass
- secret/session/token exposure
- injection/path traversal/untrusted input
- fail-closed behavior for protected flows
- residual security risk and owner decision

### `code_quality_review`
Purpose: check stability, extensibility, structure, and maintainability.
- module boundary and dependency direction
- error handling and transaction/state consistency
- testability and meaningful negative cases
- temporary workaround or modeling bypass
- maintainability/regression risk

### `evidence_review`
Purpose: check test, browser, DB, runtime, and closeout evidence quality.
- packet acceptance maps to tests and evidence
- schema-only, API-only, or render-only evidence is not overvalued
- browser evidence, DB restart persistence, and audit proof meet the actual requirement level when applicable

## Reviewer Lens Reflection Targets
| Target | Proposed Disposition | Reason |
| --- | --- | --- |
| `.agents/workflows/reviewer.md` | update-required | Root Reviewer workflow is the current development contract. |
| starter Reviewer workflow/contract surface | update-required if present, otherwise add to the existing starter workflow/template location only | Starter payload is the product target. |
| packet template checklist | conditional | Add a short pointer only if the packet template currently controls Reviewer closeout fields. |
| Orchestrator workflow | conditional | Add a short route check only if Orchestrator currently names review readiness without lens vocabulary. |
| Planner closeout text | not-needed by default | Planner owns closeout decision, but should not duplicate Reviewer procedure unless a validator needs the marker. |

## Development Documentation Impact
- Project overview impact: not-needed
- Setup/dev environment impact: none
- Architecture doc impact: conditional; update if PMO surface classification changes documented architecture.
- Domain doc impact: not-needed
- API/interface doc impact: not-needed
- Database/data model doc impact: conditional; update only if structured PMO state schema changes.
- Module guide impact: conditional; update only if PMO or Reviewer modules/templates move.
- Testing doc impact: conditional; update only if validator/test command expectations change.
- Deploy/operations doc impact: none
- History/decision doc impact: durable-decision
- Security/permission doc impact: conditional; Reviewer security lens wording is review procedure, not a new permission model.
- AI/automation doc impact: conditional; Reviewer lens routing may affect AI workflow instructions.
- Required doc paths: this packet; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/artifacts/SYSTEM_CONTEXT.md`; `.agents/workflows/reviewer.md`; starter Reviewer/workflow/template surfaces if affected.
- Docs must be updated before implementation: no, except this packet.
- Docs must be updated before closeout: yes, for any changed starter PMO or Reviewer contract surfaces.
- Docs parity status: pass

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Human clarification after PKT-04 | this packet | drafted | Planner |
| PMO 8-folder contract reduction | starter folder policy, contamination checks, PMO validators, PMO tests | planned | Developer, Tester |
| Day-start screen/generated classification | requirements/implementation-plan wording if changed; PM report tests | planned | Planner, Developer, Tester |
| Day-wrap-up durable Markdown classification | PM report builder/validator tests | planned | Developer, Tester |
| WBS structured tracking classification | WBS TSV tests | planned | Developer, Tester |
| Reviewer lens minimum checklist | root Reviewer workflow and starter Reviewer contract/template | planned | Developer, Reviewer |
| Root/starter parity | root tests, starter tests, harness validation | planned | Developer, Tester, Reviewer |

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human Owner opens the starter PMO folder and sees only a small, understandable surface; later, Reviewer checks a packet using four named lens checklists without reading a long manual.
- API contract: PMO folder policy, starter contamination diagnostics, PMO validation diagnostics, and Reviewer lens markers may change only to reduce human Markdown burden and clarify review minimums.
- Component responsibility: structured operating state owns high-volume PMO facts; PM reports summarize; WBS stores tabular tracking; Reviewer workflow owns review lens checklist; Planner owns approval boundaries.
- Allowed dependency direction: PM reports and WBS may cite structured state/evidence; generated summaries remain read models; Reviewer lenses guide review and do not replace Tester evidence, Planner approval, or security owner decisions.
- Data ownership: no copied-project product domain data model change; PMO operating-state storage remains harness-owned structured state.
- Public contract vs internal/scratch field: starter PMO seed folders, WBS shape, day-wrap-up output, and Reviewer lens names are public starter contracts; helper internals are internal.

## Security Review Request
- Security review evidence status: pass
- Security review evidence scope: review/closeout contract and PMO structured-state boundary
- Security review focus: reviewer security lens wording, secret/session/token exposure checklist coverage, PMO source-intake/sensitive evidence handling, and fail-closed expectations.
- Security review report path: `reference/reports/security/PKT-04A_SECURITY_REVIEW.json`
- Security review decision: pass
- Security review mode: required
- Required CSO phases: 0,1,2,5,8,12,13,14
- Accepted-risk authority: Human Owner for residual risk; Planner for scope split only
- Redaction status: required for any sensitive evidence examples
- Declared security/release paths: `.agents/workflows/reviewer.md`; `starter/standard-harness/_harness/**review*`; `starter/standard-harness/_harness/policies/project-operating-folders.yaml`; `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`; `starter/standard-harness/_harness/system/standard_harness/validation/pmo_reports.py`

## Acceptance Criteria
- `product/docs/pmo/` no longer requires eight human-facing Markdown-oriented seed folders.
- The selected starter PMO minimum human surface is explicit and compact.
- Day-start is classified as generated/screen-oriented first, with optional persisted export only if implementation selects it.
- Day-wrap-up remains a maximum-one-page durable human Markdown report.
- WBS remains TSV/CSV-compatible structured tracking.
- Risks, blockers, status, source-intake, and daily records are represented as structured records, indexes, report sections, or optional exports instead of mandatory human Markdown folders.
- Empty legacy `daily-wrap-up` is removed if still present.
- Reviewer workflow exposes the four named lenses with the minimum checklists: `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`.
- Reviewer lens wording remains short and does not become a long procedure manual.
- Orchestrator/Planner closeout can refer to the same lens names without absorbing Reviewer authority.
- Root and `starter/standard-harness/` reusable behavior remain synchronized; any intentional root-only or starter-only difference is documented and reviewed.
- PKT-04A does not implement PKT-05 long memory, provider orchestration, release, publish, package metadata changes, or starter promotion.
- Generated docs are regenerated only through harness commands.

## Verification Manifest
- Ready For Code: approved by Human Owner on 2026-06-28; route through Orchestrator for implementation, testing, review, and Planner closeout
- root: `npm test` passed, 468 tests
- root targeted: `node --test .harness\test\pkt04a-pmo-surface-reviewer-lens.test.js .harness\test\pkt04-pmo-daily-rhythm.test.js` passed, 9 tests
- standard-template: `python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter` passed
- starter targeted tests: `python -m unittest starter.standard-harness._harness.test.test_pmo_daily_reports starter.standard-harness._harness.test.test_pmo_wbs` passed, 8 tests
- targeted: PMO minimum human surface, structured-state classification, no duplicate legacy folder, Reviewer lens checklist, root/starter parity passed
- validator: `npm run harness:validate` passed before closeout metadata update with docs-parity warning only
- active context: transition commands regenerated state; final `npm run harness:sync-state` pending after closeout metadata update
- security: `reference/reports/security/PKT-04A_SECURITY_REVIEW.json` recorded pass
- browser: not-needed; no browser UI implementation or rendered web surface is in scope
- review closeout: `reference/reports/review/PKT-04A_REVIEW_REPORT.md` recorded pass across all four named lenses
- handoff: Orchestrator routed Planner -> Orchestrator -> Developer -> Tester -> Orchestrator -> Reviewer -> Orchestrator -> Planner; Planner closeout recorded

## Verification Scenarios
| Scenario | Expected Result | Evidence |
|---|---|---|
| Normal | Fresh starter exposes compact PMO human surface and structured-state classification. | PMO folder policy tests and starter validation |
| Error | Legacy duplicate `daily-wrap-up` or mandatory Markdown folders for risks/status/blockers/source-intake fail validation. | negative folder contract tests |
| Permission | Reviewer security lens includes auth/authz, secret/session/token, injection/path traversal, fail-closed, and residual-risk owner checks. | Reviewer contract tests |
| Regression | PKT-04 day-wrap-up, WBS, evidence-index links, and authority-boundary behavior remain intact. | focused regression tests |
| Manual Check | Human Owner can understand which PMO artifacts are read by humans and which are structured state without opening many folders. | Reviewer closeout report |

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/workflows/reviewer.md`; `reference/packets/PKT-04_PM_DAILY_RHYTHM_AND_WBS_LOOP.md`; `reference/reports/closeout/PKT-04_PLANNER_CLOSEOUT.md`; user clarification after PKT-04.
- Challenge status: pass
- Parent objective coverage: the packet covers only PMO surface simplification and Reviewer lens minimum checklists after PKT-04.
- Deferred scope with named follow-up: PKT-05 owns long-memory/question answering; PKT-06 owns provider orchestration; PKT-08 owns starter promotion.
- Acceptance proves behavior change: acceptance requires validator/test evidence for fewer mandatory PMO human folders and explicit Reviewer lens checklist markers, not wording-only claims.
- Failure fixture or failure condition: fail if `daily-wrap-up` remains, if risks/status/blockers/source-intake/daily-records are mandatory human Markdown folders, if day-start is treated as a required accumulating Markdown folder, or if Reviewer lens names/checklists are missing.
- Reviewer closeout hold basis: Reviewer may hold closeout for missing root/starter parity, missing negative folder tests, missing Reviewer lens tests, overlong Reviewer procedure text, stale generated state, or any claim that PKT-04A closes PKT-05 long memory.
- First-wave limit check: this packet intentionally keeps the change small and does not avoid the broader PKT-05 question-answering objective.
- Guidance-only sufficiency rationale: guidance-only is insufficient for PMO folder contract; runtime/policy/tests are required after Ready For Code. Reviewer lens text may be small docs-first contract but must be testable or validated.
- Challenge evidence artifact path: `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`
- Findings disposition: no blocking findings after challenge pass; packet records compact PMO decision, structured-state boundary, four Reviewer lenses, failure conditions, and deferred follow-ups.
- Required corrections applied: included v2.0 philosophy parity gate, explicit no Ready For Code, PMO human-vs-structured decision table, Reviewer lens checklist, root/starter boundary, and named follow-ups.
- No self-approval claim: adversarial planning review does not approve implementation, close Human Ready For Code, replace Tester evidence, replace Reviewer closeout, approve release, or approve starter promotion.

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Implementation delta summary: compact PMO surface implemented; day-start generated-view classification implemented; Reviewer lenses implemented in root/starter contracts.
- Source parity result: pass
- Refactor / residual debt disposition: no residual implementation debt; PKT-05 long memory remains a named deferred packet.
- UX conformance result: not-needed
- Topology / schema conformance result: pass
- System context conformance result: pass
- Modeling error handling result: pending
- Documentation impact / docs parity result: pass
- Memory impact review: not-needed; PKT-05 owns long memory
- Validation / security / cleanup evidence: pass
- Deferred follow-up item: PKT-05 through PKT-08 remain separately packetized follow-ups.
- Improvement candidate reference: PKT-04 human review friction: PMO folder surface looked too document-heavy.
- Proposed target layer: core
- Promotion status / linked follow-up item: PKT-08 owns starter promotion mechanics; PKT-04A must not package or release the starter.
- Closeout notes: implementation, testing, security review, Reviewer closeout, docs parity, cleanup evidence, and Planner closeout are recorded; final state sync remains pending.

## 16. Reopen Trigger
- Reopen this packet if implementation starts without explicit Ready For Code, if the starter still implies many PMO Markdown folders, if high-volume PMO state is not structured/indexed, if day-start is treated as a required accumulating Markdown folder, if durable day-wrap-up or WBS behavior regresses, if Reviewer lens checklists are missing or over-expanded, if PKT-05 long-memory scope is claimed, or if root/starter parity is skipped.

## Planner Handoff
- Current owner: Planner
- Current status: closed by Planner closeout.
- Next action: run final closeout preflight and state sync; then continue to the next Human Owner selected packet.
- Approval boundary: PKT-04A is closed for this packet only. Release, publish, package metadata changes, starter promotion, PKT-05 long memory, and unrelated packet scope remain unapproved.
