# PKT-02B Implementation Plan Requirement Alignment

This is a Planner-opened planning packet before PKT-02 Risk-Adaptive Gate Profile Engine.
It converts the latest review findings into a bounded implementation-plan strengthening lane.

Ready For Code is approved by the Human Owner on 2026-06-28. This packet is routed
through Orchestrator closeout for implementation-plan mutation, verification, review, and
Planner closeout.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: This repository's implementation target is the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root 파일을 수정할 수는 있지만, 그 이유는 starter v2.0 구현/검증/운영을 위한 것이어야 합니다.
- v2.0 philosophy parity gate: before Ready For Code and closeout, confirm the packet preserves the clean starter payload, provider-neutral product identity, evidence-backed completion, compact human review surfaces, structured LLM operating state, and root/starter boundary.
- Gate status: satisfied for this closed packet. PKT-02B strengthened the implementation plan so later starter work remains requirements-aligned.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT | Open a bounded planning packet to strengthen `IMPLEMENTATION_PLAN.md` against confirmed requirements before PKT-02. | selected |
| Ready For Code | approved | Human Owner approved PKT-02B Ready For Code on 2026-06-28. | selected |
| Human sync needed | no | The Human Owner approved the proposed PKT-02B plan-alignment scope and route. | closed |
| Gate profile | contract | The packet touches authoritative planning/requirements traceability and future packet sequencing. | selected |
| Route class | packet-path | The plan-alignment work needs explicit scope, acceptance, challenge review, and validator evidence. | selected |
| Change zone | load-bearing | `IMPLEMENTATION_PLAN.md` controls sequencing and requirement-closure expectations. | selected |
| Delivery route mode | orchestrated-closeout | Human Owner requested Orchestrator closeout routing for implementation, verification, review, and Planner closeout. | selected |
| User-facing impact | none | No product UI/UX behavior change is in scope; the impact is operator planning clarity. | closed |
| Layer classification | core | Scope is root governance planning truth for the clean starter payload roadmap. | selected |
| Active profile dependencies | none | No optional profile must be activated. | closed |
| Profile evidence status | not-needed | No profile-specific evidence is required. | closed |
| UX archetype status | not-needed | No UI work is in scope. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | not-needed | No deployment or runtime topology change is in scope. | closed |
| Domain foundation status | not-needed | No product data/domain model change is in scope. | closed |
| Authoritative source intake status | approved | Source is the Reviewer-style requirements-vs-plan audit requested by the Human Owner on 2026-06-28. | selected |
| Shared-source wave status | not-needed | This packet is local to the planning baseline and PKT-02 sequence boundary. | closed |
| Packet exit gate status | approved | Developer, Tester, and Reviewer evidence supports Planner closeout for the approved PKT-02B scope. | closed |
| Existing system dependency | none | No existing external system dependency is affected. | closed |
| New authoritative source impact | analyzed | The review findings become a planning source for implementation-plan refinement. | selected |
| Risk if started now | medium | Editing roadmap semantics can accidentally approve PKT-02 or weaken requirement coverage boundaries. | selected |

## Packet Scope
- Lane-type declaration: planning
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Packet Scope; Problem Statement; Acceptance Criteria; Verification Manifest; Planner Packet Challenge Review.
- Lane-type conditional sections: Development Documentation Impact; Feature Artifact Sync Matrix.
- Lane-type not-needed sections: UI implementation, environment topology, release packaging, browser evidence, starter runtime changes.
- Planner packet challenge required: yes
- Work item title: Implementation Plan Requirement Alignment
- Parent objective: Keep the confirmed Standard Harness v2.0 requirements executable through a sufficiently precise implementation plan before PKT-02 opens.
- Scope boundary: strengthen `IMPLEMENTATION_PLAN.md` planning coverage only; do not implement PKT-02 gate engine behavior.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; this packet.
- UX archetype reference: not-needed
- Selected UX archetype: not-needed
- Domain foundation reference: not-needed
- Schema impact classification: none
- Authoritative source intake reference: Human Owner request in this Codex thread on 2026-06-28; Reviewer findings comparing `IMPLEMENTATION_PLAN.md` to `REQUIREMENTS.md`.
- Authoritative source disposition: accepted for packet planning; findings must be converted into concrete plan edits or explicit defer decisions before PKT-02 Ready For Code.
- Current implementation impact: planning only; PKT-02 remains unapproved.
- Existing plan conflict: `IMPLEMENTATION_PLAN.md` maps all requirement IDs but has weak closure boundaries for selected requirements and duplicate roadmap ordering.
- Impacted packet set scope: PKT-02B active planning packet and PKT-02 sequence boundary only.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed

## Problem Statement
The latest requirements-vs-plan review found that `IMPLEMENTATION_PLAN.md` broadly maps
all confirmed requirements, but several areas are too compressed to safely drive future
packets:

- `SHV2-REQ-026` PMO scope is narrower in the plan than in requirements.
- `SHV2-REQ-044` assigns the full role-flow requirement mainly to Wave 2 even though later waves own Documenter, PM, and Orchestrator portions.
- PKT-06 and PKT-07 share the same roadmap order.
- requirements open questions are not yet converted into explicit packet decision gates.

This packet opens a bounded planning lane to fix those planning weaknesses before PKT-02
is opened or approved.

## In Scope
- Update `IMPLEMENTATION_PLAN.md` so `SHV2-REQ-026` coverage includes source-intake materials, daily reports, status, risks, and blockers under PMO scope.
- Reword `SHV2-REQ-044` coverage so Wave 2 cannot claim full role-flow closure before Wave 3, Wave 4, and Wave 6 evidence exists.
- Fix the initial packet roadmap order so PKT-06 and PKT-07 are not both numbered `7`.
- Add explicit decision-gate notes for requirements open questions that affect PKT-02 through PKT-07 readiness.
- Keep PKT-02 as the next implementation candidate only after PKT-02B closes and PKT-02 receives its own explicit Ready For Code.
- Update `PROJECT_PROGRESS.md` and `REQUIREMENTS.md` only as needed for current planning status parity.
- Regenerate generated state surfaces only through harness commands.

## Out Of Scope
- No PKT-02 risk-adaptive gate implementation.
- No changes to starter runtime, Python runtime, package metadata, schema versions, or compatibility command namespaces.
- No `starter/standard-harness/AGENTS.md`.
- No release, publish, or starter promotion decision.
- No manual edits to generated state docs.
- No Ready For Code approval by implication.

## Candidate Files
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/PROJECT_PROGRESS.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `reference/reports/artifact-sync/PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT.md`
- `.agents/runtime/ACTIVE_CONTEXT.json` via regeneration only
- `.agents/runtime/ACTIVE_CONTEXT.md` via regeneration only
- `.agents/artifacts/VALIDATION_REPORT.json` via regeneration only
- `.agents/artifacts/VALIDATION_REPORT.md` via regeneration only

## Development Documentation Impact
- Project overview impact: update-required
- Setup/dev environment impact: none
- Architecture doc impact: cite-only
- Domain doc impact: none
- API/interface doc impact: none
- Database/data model doc impact: none
- Module guide impact: none
- Testing doc impact: none
- Deploy/operations doc impact: none
- History/decision doc impact: durable-decision
- Security/permission doc impact: none
- AI/automation doc impact: update-required
- Required doc paths: `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/PROJECT_PROGRESS.md`; `.agents/artifacts/REQUIREMENTS.md`
- Docs must be updated before implementation: yes
- Docs must be updated before closeout: yes
- Docs parity status: pass

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| PMO requirement coverage gap for `SHV2-REQ-026` | `.agents/artifacts/IMPLEMENTATION_PLAN.md` coverage matrix and Wave 4 scope | pass | Developer |
| Role-flow closure boundary gap for `SHV2-REQ-044` | `.agents/artifacts/IMPLEMENTATION_PLAN.md` coverage matrix and wave acceptance | pass | Developer |
| Duplicate PKT-06 / PKT-07 roadmap order | `.agents/artifacts/IMPLEMENTATION_PLAN.md` initial packet roadmap | pass | Developer |
| Requirements open questions not packetized as decision gates | `.agents/artifacts/IMPLEMENTATION_PLAN.md` wave/packet readiness notes | pass | Developer |
| Active planning status after packet open | `.agents/artifacts/PROJECT_PROGRESS.md`, generated Active Context | pass | Runtime after Planner open |

## CSO Security Review
- Security review evidence status: pass
- Security review evidence scope: planning documentation alignment; implementation-plan coverage; packet decision gates; roadmap order; status parity; no auth, secret, permission, CI/CD, dependency, runtime, package metadata, schema, release, publish, or starter-promotion path change.
- Security review report path: reference/reports/security/PKT-02B_SECURITY_REVIEW.json
- Security review decision: pass
- Security review mode: scoped
- Required CSO phases: 0,1,12,13,14
- Finding quality required: file,line,evidence_quote_redacted,confidence,phase,fingerprint,exploit_scenario,impact,recommendation
- Accepted-risk authority: not-needed
- Redaction status: not-needed
- Declared security/release paths: none

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Operator can read `IMPLEMENTATION_PLAN.md` and know exactly which requirements are covered by which future packet before deciding whether PKT-02 is ready for code.
- API contract: no runtime API, CLI, or schema contract change is approved by this planning packet.
- Component responsibility: `REQUIREMENTS.md` owns confirmed requirements; `IMPLEMENTATION_PLAN.md` owns sequencing and closure evidence expectations; packets own implementation approval.
- Allowed dependency direction: implementation plan may cite requirements and architecture; requirements must not be silently rewritten by implementation-plan edits.
- Data ownership: no product data or operating DB schema ownership change.
- Public contract vs internal/scratch field: requirement coverage and packet sequence are operator-facing planning contracts; generated Active Context remains a read model.

## Acceptance Criteria
- `IMPLEMENTATION_PLAN.md` explicitly covers all `SHV2-REQ-026` PMO surfaces named in requirements: source-intake, WBS-compatible TSV/CSV, daily reports, day-start, day-wrap-up, status, risks, and blockers.
- `IMPLEMENTATION_PLAN.md` states that `SHV2-REQ-044` cannot close on Wave 2 alone and needs evidence across Wave 2, Wave 3, Wave 4, and Wave 6.
- PKT-06 and PKT-07 roadmap order is unambiguous.
- Open questions that can affect PKT-02 through PKT-07 readiness are mapped to packet decision gates or explicitly deferred with owner and timing.
- Status docs identify PKT-02B as the active planning packet and preserve PKT-02 as unapproved next implementation candidate.
- Generated docs are not manually edited.
- `npm run harness:packet-preflight -- --stage planning-open --packet reference/packets/PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT.md --work-item PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT` passes.
- `npm run harness:validate` and `npm run harness:sync-state` pass after packet opening.

## Verification Manifest
- Ready For Code: approved for PKT-02B by Human Owner on 2026-06-28.
- approved packet: this packet records the approved Planner scope for implementation-plan alignment.
- root: `npm run harness:validate`
- standard-template: not-needed unless approved edits touch starter payload planning surfaces.
- targeted test: compare `SHV2-REQ-026` and `SHV2-REQ-044` requirements text against the updated coverage matrix and wave scope.
- targeted: verify PKT-06 / PKT-07 roadmap order is unique.
- validator: `npm run harness:packet-preflight -- --stage planning-open --packet reference/packets/PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT.md --work-item PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT`
- active context: regenerate through `npm run harness:sync-state` after packet registration.
- review closeout: required after approved planning edits; not satisfied by packet opening.
- handoff: Planner routes approved PKT-02B to Orchestrator for implementation, verification, review, and Planner closeout.

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; previous Reviewer findings in this Codex thread.
- Challenge status: pass
- Parent objective coverage: the packet directly targets the plan/requirements alignment weaknesses that could make PKT-02 sequencing unsafe.
- Deferred scope with named follow-up: PKT-02 Risk-Adaptive Gate Profile Engine remains next implementation candidate after PKT-02B closes; PKT-02 still needs its own packet refinement and Ready For Code.
- Acceptance proves behavior change: acceptance requires concrete plan text changes and targeted trace checks, not file existence.
- Failure fixture or failure condition: fail if `SHV2-REQ-026` still omits PMO surfaces, if `SHV2-REQ-044` still appears closable by Wave 2 alone, if PKT-06/PKT-07 order remains duplicated, or if PKT-02 is treated as approved.
- Reviewer closeout hold basis: later Reviewer may block if plan edits do not preserve requirements wording, approval boundaries, or generated-doc immutability.
- First-wave limit check: this packet prevents PKT-02 from absorbing planning cleanup; it does not avoid the PKT-02 gate-engine objective.
- Guidance-only sufficiency rationale: this packet is planning-only; runtime enforcement belongs to later implementation packets named in the plan.
- Challenge evidence artifact path: `reference/packets/PKT-02B_IMPLEMENTATION_PLAN_REQUIREMENT_ALIGNMENT.md`
- Findings disposition: review findings converted into in-scope acceptance criteria and verification manifest items.
- Required corrections applied: applied in this packet draft.
- No self-approval claim: adversarial planning reviewer is not the Planner packet author; Ready For Code is approved only by the Human Owner, and this challenge review does not approve implementation, review closeout, release, or PKT-02.

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Implementation delta summary: `IMPLEMENTATION_PLAN.md` now expands PMO coverage for `SHV2-REQ-026`, clarifies the multi-wave closeout boundary for `SHV2-REQ-044`, gives PKT-06 and PKT-07 unique roadmap order, and maps requirements open questions to future packet decision gates.
- Source parity result: pass
- Refactor / residual debt disposition: not-needed
- UX conformance result: not-needed
- Topology / schema conformance result: not-needed
- System context conformance result: not-needed
- Modeling error handling result: none-found
- Documentation impact / docs parity result: pass
- Memory impact review: not-needed
- Validation / security / cleanup evidence: pass
- Deferred follow-up item: PKT-02 Risk-Adaptive Gate Profile Engine remains the next implementation candidate and still requires its own packet refinement plus explicit Ready For Code.
- Improvement candidate reference: none
- Proposed target layer: core
- Promotion status / linked follow-up item: none
- Closeout notes: PKT-02B closes implementation-plan alignment only; it does not approve PKT-02 implementation, starter runtime changes, release, publish, or starter promotion. Evidence paths: `reference/reports/implementation/PKT-02B_DEVELOPER_REPORT.md`, `reference/reports/testing/PKT-02B_TEST_REPORT.md`, `reference/reports/review/PKT-02B_REVIEW_REPORT.md`, `reference/reports/security/PKT-02B_SECURITY_REVIEW.json`, `reference/reports/closeout/PKT-02B_PLANNER_CLOSEOUT.md`, `.agents/artifacts/VALIDATION_REPORT.md`.

## 16. Reopen Trigger
- Reopen this packet if `IMPLEMENTATION_PLAN.md` again omits any `SHV2-REQ-026` PMO surface, implies `SHV2-REQ-044` can close on Wave 2 alone, reintroduces duplicate roadmap order, treats PKT-02 as approved without explicit Ready For Code, or removes future packet decision gates for requirements open questions.

## Planner Handoff
- Current owner: Planner
- Current status: Planner closeout approved
- Next action: Apply planner-closeout-hold transition, regenerate state, and keep PKT-02 as the next unapproved implementation candidate.
- Approval boundary: PKT-02B implementation-plan edits are closed; PKT-02, release, and starter promotion remain unapproved.
