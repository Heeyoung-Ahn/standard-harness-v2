# PKT-16 Additional Hardening And Productization

> READY FOR CODE APPROVED. Human Owner approved PKT-16 Ready For Code on 2026-06-30
> after independent Planner Packet Challenge Review and independent packet_doc_review
> passed. Current closeout status is closed for the approved PKT-16 scope: Developer,
> Tester, independent closeout review lenses, Reviewer adjudication, security review,
> and Planner closeout are complete.
> This packet replaces the earlier release-baseline-only
> PKT-16 draft. It combines selected v2-ideas planning hardening with the remaining
> productization blockers that must close before any v2.0 release, publish, or starter
> promotion claim.

## Purpose
PKT-16 turns Standard Harness v2.0 from a closed hardening baseline into a stronger
productization candidate. Its first priority is to reduce the Human Owner's biggest
operating failure: implementation that looks plausible, passes local checks, but does
not match the user's actual intent.

The product philosophy is explicit: Standard Harness v2.0 exists to reduce the gap
between the initial delight of seeing what an LLM can do and the later disappointment
when the result is not what the user meant. The harness must make LLM strengths stronger
while compensating for LLM weaknesses. For v2.0, the two hard requirements are precise
planning and verifiable implementation of that planning.

This is the final broad hardening packet before productization/release work. After
PKT-16, new hardening work must be a named defect or release blocker with concrete
evidence and Human Owner approval, not another open-ended hardening wave.

It has two coordinated lanes:

1. Additional hardening from the v2-ideas planning pipeline: preserve user intent from
   rough intake through packet implementation, prevent scope narrowing, and protect the
   path to canonical requirements, feature/scenario/flow structure, projection-only
   planning artifacts, and packet trace.
2. Productization readiness: close the clean export, fresh copied-starter QA, and
   promotion dry-run review-lane blockers found by the PKT-16 release-baseline E2E report.

The packet intentionally does not implement the broader design projection layer, reusable
UI module contracts, live provider execution, or portfolio/workstream model. Those are
valid follow-up candidates, but bundling them here would make the first additional
hardening packet too large to verify cleanly. Product-readiness-before-UAT is different:
it is part of the core v2.0 intent-preservation philosophy and is included here as a
reusable gate contract, not as a product-app-specific UAT run.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-16_RELEASE_BASELINE_RECONCILIATION` | Existing runtime work item ID retained for continuity; packet purpose is now additional hardening and productization. | selected |
| Existing file path | `reference/packets/PKT-16_RELEASE_BASELINE_RECONCILIATION.md` | Kept for continuity with current plan references and evidence paths. | selected |
| Ready For Code | approved | Human Owner approved PKT-16 Ready For Code on 2026-06-30 after independent challenge and packet_doc_review passed. | approved |
| Human sync needed | no | Human Owner approved the changed PKT-16 scope and Ready For Code. | closed |
| Packet type | `harness-system` | Planning authority, packet trace, validators, clean export, QA authority, and promotion policy are reusable harness-system surfaces. | selected |
| Risk level | high | Weak planning intake or release export can let non-authoritative drafts, stale memory, or contaminated starter payloads ship as v2.0 truth. | selected |
| Risk class | high / contract / release | The scope affects planning authority, packet scope integrity, starter export, QA memory, and promotion boundaries. | selected |
| Gate profile | release | Requires planning trace proof plus release/productization evidence. | selected |
| Gate profile version | `release+planning-hardening@v1` | Requires schema, validator, trace, negative authority, clean export, QA freshness, promotion dry-run, security, and review evidence. | selected |
| Route class | packet-path | Not fast-path eligible; runtime behavior, validators, and release boundaries must be proven. | selected |
| Change zone | core | Requirement intake, feature/flow trace, packet preflight, export, QA, and promotion are core harness surfaces. | selected |
| Delivery route mode | orchestrated-closeout | If Ready For Code is approved, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | selected |
| User-facing impact | none | No browser UI is in scope; operator CLI/docs wording may change but UX/browser evidence is not in scope. | selected |
| Layer classification | core | Planning authority, trace, export, QA, and promotion boundaries are core harness surfaces. | selected |
| Active profile dependencies | none | No optional profile is active. | closed |
| UX/design gate | deferred | Design projection and reusable UI module contracts are intentionally follow-up scope. | selected |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No browser/UI surface is in scope. | closed |
| UX deviation status | none | No UI archetype or deviation applies. | closed |
| Environment topology status | approved | Verification uses the root repo plus copied-starter/export targets under `C:\tmp`; no remote deploy/publish target. | selected |
| Domain foundation status | approved | Domain is additional planning hardening plus productization readiness for the reusable starter. | selected |
| Authoritative source intake status | approved | Source is the Human Owner rewrite request, attached v2-ideas summary, Requirements, Implementation Plan, Architecture Guide, and release-baseline E2E report. | selected |
| Shared-source wave status | not-needed | No sibling-project rollout or source wave is included. | closed |
| Packet exit gate status | closed | Developer/Tester evidence covers H10 product-readiness/UAT gate implementation; independent review-lens evidence, Reviewer adjudication, security review, and Planner closeout are complete. | closed |
| Existing system dependency | internal | Depends on starter requirement, packet, projection, validation, QA, reset, and promotion surfaces. | selected |
| New authoritative source impact | analyzed | The new v2-ideas intake changes PKT-16 scope but does not by itself approve implementation or SSOT rewrites. | selected |
| Risk if started now | high | Ready For Code is approved, but high/core/release risk requires Orchestrator routing and Required Gates evidence before closeout. | selected |
| Actual release / publish / promotion | not-approved | PKT-16 can prepare release readiness only; it cannot release, publish, or promote. | selected |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger
- Lane-type required sections: Purpose; Final Hardening Thesis; Quick Decision Header;
  Goal; Non-Goal; Source Authority; v2-Ideas Disposition; Additional Hardening Implementation Scope;
  Productization Implementation Scope; Modeling Impact; Data / Source Impact; In Scope;
  Out Of Scope; Acceptance; Verification Plan; Verification Manifest; Required Evidence
  Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document
  Review; Human Sync / Approval Boundary; Artifact Sync; Security Review Request; Packet
  Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Context Impact Classification; Development Documentation
  Impact through Data / Source Impact and Required Gates; Security Review Request.
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; deployment or
  publish execution; live provider execution.
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-16 release-baseline E2E report, Human Owner v2-ideas intake, selected v2-ideas references, starter CLI/domain/validation code, root promotion command, and promotion boundary tests.
- Required reading detail:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `reference/reports/release-baseline/PKT-16_RELEASE_BASELINE_RECONCILIATION.md`
  - Human Owner v2-ideas intake attached to the PKT-16 rewrite request
  - `reference/legacy/v2-ideas/Planning Pipeline Hardening.md`
  - `reference/legacy/v2-ideas/v22-hardening-strategy.md`
  - starter CLI/domain/validation code for requirements, packets, artifacts, evidence,
    projections, QA, reset, and validation
  - root promotion command and promotion boundary tests
- Source-of-truth order: explicit Human Owner direction, this packet after independent
  review/RFC, Requirements, Implementation Plan, Architecture Guide, trusted command
  evidence, Reviewer closeout, hot DB/generated state only as current operational read
  models.
- Environment topology reference: local root repository plus local copied-starter/export
  targets under `C:\tmp`; no remote deploy, publish, release channel, or external
  distribution environment.
- Source environment: `C:\30_project\standard-harness-v2`, including root runtime
  commands and `starter/standard-harness/` payload.
- Target environment: local temporary copied-starter/export targets such as
  `C:\tmp\standard-harness-pkt16-*`.
- Execution target: local harness commands, starter Python CLI commands, root Node tests,
  starter Python tests, and root promotion dry-run.
- Transfer boundary: only sanitized starter export/copy candidates may cross into the
  target; root `.git`, root `.agents`, `AGENTS.md`, generated state, local DB/cache,
  `_ops` packet/evidence/wiki history, secrets, and provider-specific entry contracts
  must not cross.
- Rollback boundary: PKT-16 implementation changes are reverted through git if needed;
  local `C:\tmp\standard-harness-pkt16-*` targets may be deleted by exact-path command
  under destructive-command guard.
- Authoritative source intake reference: Human Owner PKT-16 rewrite and product
  philosophy requests on 2026-06-30; attached v2-ideas summary; Requirements v2.0
  product target; Implementation Plan; Architecture Guide; PKT-16 release-baseline E2E
  command evidence.
- Authoritative source disposition: accepted for planning baseline only; implementation,
  Ready For Code, residual-risk acceptance, release, publish, and promotion remain
  separate approval boundaries.
- Current implementation impact: PKT-16 Ready For Code was approved and the expanded H10
  product-readiness-before-UAT validator slice now has Developer/Tester evidence,
  independent review-lens evidence, Reviewer adjudication, security review, and Planner
  closeout.
- Existing plan conflict: resolved - Implementation Plan now describes PKT-16 as
  Additional Hardening And Productization with H0-H10/P1-P4 scope, sequencing rationale,
  verification burden, and operator next action.
- Impacted packet set scope: PKT-16 only; design projection, UI module locking, browser
  handoff, provider execution, PM ingestion, evidence hardening, and workstream modeling
  are future packet candidates.
- Generated-state boundary: do not manually edit Active Context or generated docs.

## Goal
- Make the v2.0 product philosophy testable: reduce the LLM intent gap by making
  planning precise and implementation conformance verifiable.
- Add the minimum planning hardening layer that prevents rough intake, PRDs, feature
  trees, and flow notes from becoming implementation authority without promotion.
- Make Human Owner intent preservation the top hardening priority: implementation must
  not be able to pass closeout when it narrows, reinterprets, omits, or substitutes the
  user's actual requested outcome.
- Add structural trace from canonical requirements through feature/scenario/flow evidence
  targets into packets.
- Preserve packet-before-code and projection-only authority so planning artifacts can help
  Planner work without bypassing requirement promotion or packet review.
- Close the release/productization blockers for clean starter export, copied-starter QA
  freshness, and promotion dry-run review lanes.
- End broad hardening after this packet by routing any later issue to productization,
  release, or a small defect packet with named evidence and explicit approval.

## Non-Goal
- Do not approve implementation, Ready For Code, release, publish, actual starter
  promotion, residual-risk acceptance, live provider execution, sibling rollout, or
  remote deployment.
- Do not implement the Design Projection layer, reusable UI module/locked module
  contracts, browser validation handoff, or portfolio/workstream/release-train model in
  this packet.
- Do not rewrite the whole requirements system or replace the current event-store kernel.
- Do not make PRD, feature tree, flow diagram, wiki page, generated summary, PM report, or
  LLM report into authority.
- Do not create another broad hardening program after PKT-16. Later corrections must be
  narrow, evidence-backed productization/release blockers or explicit Human-approved
  follow-up defects.

## Final Hardening Thesis
PKT-16 is not another round of general improvement. It is the last broad hardening step
needed to make v2.0 useful as a product: a harness that reduces the gap between what an
LLM can impressively generate and what a user actually meant to build.

The packet therefore optimizes for two outcomes:
- precise planning: Human/Planner intent is captured as a concrete outcome, must-preserve
  intent, non-goals, forbidden reinterpretations, acceptance criteria, scenarios, flows,
  and evidence targets;
- verifiable implementation: Developer, Tester, Reviewer, and closeout evidence can prove
  whether the approved planning was implemented, not merely whether code changed or tests
  passed.

Closeout must leave v2.0 ready to move from hardening to productization/release work.
If a later broad hardening proposal appears, it is a planning failure unless it is
converted into a narrow defect packet with concrete evidence, owner, and approval.

## Source Authority
- Human Owner current product philosophy instruction: v2.0 exists to reduce the gap
  between impressive LLM capability and disappointing delivered results; the final
  broad hardening must focus on precise planning and verifiable implementation, then
  stop open-ended hardening and move toward productization/release.
- Human Owner current instruction: change PKT-16 from release-baseline-only to
  additional hardening plus productization; use the attached v2-ideas summary as the
  hardening source.
- Attached v2-ideas summary: prioritize operating-failure reduction; implement
  Requirement Candidate -> Promotion, Requirement -> Feature -> Scenario -> Acceptance
  hierarchy, Flow Metadata Contract, Planning Artifact Projection Boundary, and
  Planning-to-Packet trace before design/portfolio layers.
- `.agents/artifacts/REQUIREMENTS.md`: clean starter, provider-neutral identity,
  packet/evidence/closeout authority, structured operating state, question answering,
  gate profiles, packet document review, and human approval boundaries.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`: PKT-11 through PKT-15 hardening is closed
  for approved scope, while safe export/onboarding/release readiness remains
  productization work.
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`: preserve the v2 starter kernel; add missing
  operating-layer enforcement through policy/schema/service/validator/CLI/tests rather
  than prose-only guidance.
- `reference/reports/release-baseline/PKT-16_RELEASE_BASELINE_RECONCILIATION.md`: actual
  E2E evidence for clean export failure, stale copied-starter QA, reset behavior, and
  promotion dry-run review lanes.

## v2-Ideas Disposition
| v2-Ideas Candidate | PKT-16 Disposition | Rationale |
|---|---|---|
| Intent Fidelity / Implementation Conformance | in scope, top priority | Directly targets the Human Owner's biggest pain: implementation that diverges from intent while appearing complete. |
| Requirement Candidate -> Promotion | in scope | Separates raw user/source intake from canonical requirements so implementation cannot pick the convenient interpretation. |
| Requirement -> Feature -> Scenario -> Acceptance hierarchy | in scope | Keeps packet work tied to user value, scenario evidence, and acceptance instead of technical task labels only. |
| Flow Metadata Contract | in scope | Lets Tester/Reviewer know which roles, state changes, failure paths, and evidence targets a packet must prove. |
| Planning Artifact Projection Boundary | in scope | Prevents PRDs, feature trees, flows, and notes from bypassing requirement promotion or packet authority. |
| Planning-to-Packet trace | in scope | Blocks packet scope narrowing and makes Reviewer source-parity checks structural. |
| Design Projection Layer | deferred | Valuable, but it introduces screen/wireframe/browser surfaces and should be a separate design packet. |
| Reusable UI Module Contract / Locked Module | deferred | Valuable for UI drift control, but no UI implementation surface is in PKT-16. |
| Design-to-Packet / Browser validation handoff | deferred | Depends on Design Projection and should not be bundled into this planning-foundation packet. |
| Medium/large project operating layer | deferred | Packet dependency, workstream, release membership, and critical path validation need a separate operating-model packet. |

## Hardening Priority Order
| Priority | Hardening Focus | Why It Comes Here |
|---|---|---|
| 1 | Precise planning contract | If planning is vague, even a strong LLM can implement the wrong thing convincingly. |
| 2 | Intent fidelity and implementation conformance | The most expensive failure is work that appears complete but does not implement the user's intent. |
| 3 | Verifiable acceptance/scenario/evidence trace | Intent must become reviewable behavior, not just a packet title or prose summary. |
| 4 | Scope-narrowing and convenience-closeout guard | Developer, Tester, and Reviewer must reject shortcuts even when tests pass. |
| 5 | Requirement candidate promotion and projection authority | Rough intake can help planning, but only promoted requirements can drive implementation. |
| 6 | Productization blockers | Clean export, fresh QA, and promotion policy remain release blockers after intent-preservation hardening. |
| 7 | End-of-hardening productization exit | PKT-16 must stop broad hardening and route the project toward productization/release or narrow defect work. |

## Additional Hardening Implementation Scope
| ID | Included Hardening | Required Implementation Direction | Closeout Evidence |
|---|---|---|---|
| PKT16-H0 | Product philosophy and precise planning contract | Add required packet/planning fields that make the Human Owner's intended outcome, must-preserve intent, non-goals, forbidden reinterpretations, acceptance criteria, scenario/flow expectations, and evidence targets explicit before implementation approval. | Packet/preflight/review fixtures proving intent-sensitive work cannot proceed when precise planning fields are missing, vague, or contradicted by packet scope. |
| PKT16-H1 | Intent fidelity contract | Add a packet-local intent fidelity record that captures the Human Owner's requested outcome, must-preserve intent, explicit non-goals, forbidden reinterpretations, and examples of unacceptable shortcut implementations. | Packet/preflight tests and review fixtures proving a packet cannot proceed when must-preserve intent or forbidden reinterpretations are missing for intent-sensitive work. |
| PKT16-H2 | Implementation conformance gate | Add Developer/Tester/Reviewer checks that compare implementation claims against the original Human/Planner intent, not only against tests or changed files. | Negative fixtures where implementation passes tests but fails closeout because it narrowed or substituted the user outcome. |
| PKT16-H3 | Acceptance/scenario/evidence target model | Add minimal structured links from canonical requirement to product area/capability, feature, scenario, acceptance criterion, user flow, and evidence target. | Trace fixtures proving packets can cite these nodes and validators reject missing parent/acceptance/evidence links. |
| PKT16-H4 | Scope-narrowing and convenience-closeout guard | Detect and block packet closeout when implementation changes vocabulary but not behavior, implements a weaker subset, hides deferred scope, or treats fixture-only evidence as full acceptance. | Reviewer/preflight negative tests for vocabulary-only conformance, subset implementation, missing user flow evidence, and fixture-only closeout. |
| PKT16-H5 | Requirement candidate schema and promotion boundary | Add structured candidate records with states `draft`, `reviewed`, `promoted`, `rejected`, and `deferred`; promotion must require explicit links to canonical requirement, policy/schema/validator/test coverage, packet, and evidence target when applicable. | Schema/service tests, promotion positive/negative fixtures, validator rejection when PRD/meeting note is treated as authority. |
| PKT16-H6 | Flow metadata contract | Add flow metadata fields for flow id, related candidates/features, entry point, success path, failure paths, roles, state changes, evidence targets, E2E required flag, and screens touched when relevant. | Flow schema tests and packet preflight evidence that E2E/review expectations are derived from flow metadata without requiring UI design scope. |
| PKT16-H7 | Planning projection-only validators | Add PRD/feature-tree/flow projection contracts and validators that label projections as non-authoritative and reject projection artifacts that attempt to approve release, create requirements, or close packets. | Projection validator positive/negative tests and explicit diagnostics for forbidden authority claims. |
| PKT16-H8 | Planning-to-packet trace | Add packet trace fields/validation for requirement ids, candidate ids, feature ids, scenario ids, flow ids, acceptance ids, evidence target ids, and intent fidelity record ids. | Packet preflight tests that fail when a packet narrows approved scope or omits required trace for the selected planning source. |
| PKT16-H9 | End-of-hardening productization exit gate | Add closeout policy/validator expectations that prevent PKT-16 from ending as another open hardening backlog. Later broad hardening must be blocked unless converted into a narrow evidence-backed defect/release blocker with explicit Human Owner approval. | Closeout/preflight evidence proving all PKT16-H* and PKT16-P* rows are adjudicated and any remaining work is either productization/release work or a named approved defect packet. |
| PKT16-H10 | Product readiness before User UAT gate | Add reusable Developer Done, Tester Product Readiness Gate, risk-axis browser regression, Reviewer product-quality review, and User UAT entry contracts for user-facing product packets. Developer Done must mean implementation-complete only; User UAT must start only after real runtime/browser readiness, productness, and UAT account/initial-state evidence. | Policy/schema/workflow/validator tests proving user-facing packets cannot claim User UAT readiness from Developer Done alone; browser-state evidence expectations cover permission, session, account lifecycle, data reflection, viewer runtime, placeholder/diagnostic cleanup, and product-quality review. |

## Productization Implementation Scope
| ID | Productization Blocker | Evidence | Required Fix Direction |
|---|---|---|---|
| PKT16-P1 | Raw starter working directory is not clean-export ready. | Clean export validation failed on ignored `.harness`, `_ops` PKT-14 history, wiki/evidence records, local DB state, and Python caches. | Use an approved sanitized export/copy path or harden the raw starter payload and validator policy so release candidates exclude forbidden state. |
| PKT16-P2 | Raw copied starter QA can answer from inherited root/hardening memory. | Pre-reset `operating-qa` answered from PKT-14 Conductor worker evidence and wiki/risk sources. | Ensure fresh copied starters contain no root operating history or force/reset/bootstrap before QA can answer from project-specific trusted sources. |
| PKT16-P3 | Promotion dry-run still has unresolved release review lanes. | Dry-run passed with include/exclude/review counts but left review lanes for `_ops/**`, local DB state, product `.gitkeep`, `README.md`, and `START_HERE.md`. | Adjudicate review lanes and convert the decision into strict include/exclude/review policy before any actual export or promotion claim. |
| PKT16-P4 | Productization evidence can be overread as release approval. | PKT-15 and dry-run evidence closed rehearsal, not actual release. | Keep dry-run wording and validators explicit that no release, publish, approval, closeout, risk closure, product verification, or residual-risk acceptance is granted. |

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A maintainer turns rough intake into candidate requirements,
  promotes accepted intent into canonical requirements, traces that intent through
  features/scenarios/flows/evidence targets into packets, verifies implementation without
  scope narrowing, then exports a clean starter that cannot inherit root history or stale
  QA memory.
- API contract: implementation may add or extend starter CLI/preflight commands for
  candidate validation, trace validation, projection-only validation, copied-starter QA,
  clean export validation, and promotion dry-run diagnostics.
- Component responsibility: requirement/candidate domain owns lifecycle and promotion;
  projection validators own PRD/feature/flow authority checks; packet/preflight owns trace;
  memory/QA owns freshness; export and promotion tooling own release candidate policy.
- Data ownership: planning candidates and projections are operating records or planning
  artifacts until promoted; canonical requirements and approved packets remain authority.
- Allowed dependency direction: packets may cite promoted planning nodes; planning
  projections may not mutate canonical requirements, approval state, release state, or
  closeout state directly.
- Public contract vs internal/scratch field: public contract is canonical requirement,
  packet, trace, validator, clean export, QA, and promotion behavior; drafts,
  projections, local temp targets, command logs, and dry-run review lanes are supporting
  evidence or scratch until promoted/adjudicated.
- Schema impact classification: high
- Schema impact note: PKT-16 may add starter schemas/policies for candidate, feature,
  scenario, flow, evidence target, projection-only, and packet trace records. It should
  avoid broad schema churn outside those surfaces.

### Planner Architecture Boundary Decision
- Decision status: packet-local architecture binding for Ready For Code review.
- Architecture Guide update before Ready For Code: not required if implementation keeps
  the bindings below. Return to Planner if implementation needs a new public module,
  folder, CLI family, persistent store, or authority model not listed here.

| PKT-16 Surface | Existing Architecture Component | Public / Internal Boundary | Ready For Code Constraint |
|---|---|---|---|
| Precise planning contract and intent fidelity | Domain, Validation, Reviews | Public packet contract when promoted into packet scope; draft intake remains internal planning data. | Extend packet/preflight/review surfaces rather than creating a new planning authority plane. |
| Requirement candidate lifecycle and promotion | Domain, Policy, Validation | Candidate records are internal planning records until promoted; canonical requirements remain governance truth. | Promotion must require explicit canonical requirement or defer/reject disposition. |
| Feature/scenario/acceptance/flow/evidence trace | Domain, Evidence, Validation | Public only as packet trace/evidence target after Planner-approved promotion; sketches remain projection-only. | Trace must bind to packet acceptance and evidence targets without bypassing requirement authority. |
| Projection-only PRD/feature/flow validators | Policy, Validation, Reviews | Projection artifacts are supporting data, not approval or implementation authority. | Validators must reject projection artifacts that claim requirement, Ready For Code, release, or closeout authority. |
| Clean export and copied-starter QA freshness | Starter Integrity, Operating Folders, Memory, Validation | Release candidate evidence is packet-bound until Reviewer/Planner closeout; copied-starter QA must cite fresh project sources. | No root history, generated state, local DB/cache, stale memory, or provider entry contract may enter release evidence. |
| Promotion dry-run review lanes and release wording | Self Improvement, Policy, Validation, CLI | Dry-run output is evidence only; it grants no release, publish, approval, closeout, risk closure, or residual-risk acceptance. | Review lanes must be adjudicated into include/exclude/review policy before any actual promotion claim. |

## Data / Source Impact
- Layer classification: core
- Requirements impact: updated with SHV2-REQ-049 through SHV2-REQ-051 for the v2.0
  product philosophy, precise planning, and verifiable implementation requirements.
- Architecture impact: packet-local Planner Architecture Boundary Decision binds PKT-16
  surfaces to existing kernel components; Architecture Guide update is not required before
  Ready For Code unless implementation needs a new public module, folder, CLI family,
  persistent store, or authority model.
- Implementation Plan impact: updated to describe PKT-16 as Additional Hardening And
  Productization with H0-H10/P1-P4 scope and verification burden.
- Markdown/docs impact: starter/operator docs must update if commands or packet authoring
  guidance changes.
- Generated docs impact: regenerate only through supported harness commands after packet
  opening or state transitions; never manually edit generated docs.
- Security impact: high; the packet touches authority boundaries, source trust, stale
  memory leakage, export contamination, and release approval wording.
- Root/starter parity impact: required; reusable changes must land in the starter payload
  and be proven from a copied starter.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`;
  attached v2-ideas summary; `reference/reports/release-baseline/PKT-16_RELEASE_BASELINE_RECONCILIATION.md`.
- UX archetype reference: not-needed
- Selected UX archetype: not-needed

## Context Impact Classification
- Domain context: update-required
- System context: update-required
- Architecture: update-required
- Project history: milestone when closed
- Preventive memory: candidate only if implementation or closeout uncovers repeated preventable LLM intent-fidelity or evidence-gap failures
- Long memory: not-needed before implementation
- Context read level: cited-sections-only
- Context classification note: PKT-16 adds packet-local architecture bindings and may require Architecture Guide updates during implementation if public module, folder, CLI family, persistent store, or authority-model boundaries change. It does not rebaseline Architecture Guide before Ready For Code.

## In Scope
- Requirement candidate schema, lifecycle, and promotion boundary.
- Minimal requirement -> feature/capability -> scenario -> acceptance -> flow -> evidence
  target trace model.
- Flow metadata contract for verification and E2E applicability.
- Projection-only contracts for PRD, feature tree, and flow artifacts.
- Planning-to-packet trace fields and validators.
- Clean export or sanitized starter copy path.
- Fresh copied-starter QA source authority and reset/bootstrap behavior.
- Promotion dry-run review-lane adjudication and policy hardening.
- Regression preservation for init, installed-runtime validation, first packet creation,
  unsupported closeout guard, reset safety, and dry-run no-release wording.

## Out Of Scope
- Actual release, publish, distribution, or starter promotion.
- Live authenticated Codex CLI or Claude Code CLI worker execution.
- Design projection, screen/wireframe/mockup contracts, reusable UI module locking, or
  browser validation handoff.
- Portfolio, program, release train, workstream, dependency graph, lock-scope, branch, or
  critical-path operating model.
- Structured PM TSV/CSV/WBS ingestion expansion.
- Lower-level non-index `reference/**` evidence-reference hardening outside the trace
  surfaces explicitly named here.
- Manual editing of Active Context or generated state.
- Broad cleanup of root evidence/history outside the approved export/copy boundary.

## Acceptance
### Final Product Philosophy And Hardening Exit
- PKT-16 must reduce the LLM intent gap by making planning precise and implementation
  verification explicit; marker-only schema changes, vocabulary alignment, or prose-only
  guidance do not satisfy this acceptance.
- Every included hardening row must either strengthen precise planning, prove
  implementation conformance to planning, or remove a concrete productization blocker.
- PKT-16 closeout must not leave a broad hardening backlog. Remaining work must be
  productization/release work or a narrow named defect packet with evidence, owner, and
  explicit Human Owner approval.

### A0. Intent Fidelity And Implementation Conformance
- Every intent-sensitive packet must record the Human Owner's requested outcome,
  must-preserve intent, explicit non-goals, forbidden reinterpretations, and acceptance
  evidence that would prove the outcome in practice.
- Developer implementation claims must be checked against the original intent fidelity
  record before Tester or Reviewer can accept the result.
- A packet must fail preflight or closeout when implementation narrows scope, substitutes
  an easier behavior, matches only vocabulary, passes only fixtures, or omits the user
  workflow that motivated the packet.
- Reviewer closeout must be able to say which user intent slice was implemented, which
  evidence proves it, and what remains explicitly deferred.

### A1. Requirement Candidate Lifecycle
- Candidate records support `draft`, `reviewed`, `promoted`, `rejected`, and `deferred`.
- Promotion requires a valid canonical requirement target or explicit defer/reject reason.
- Promotion diagnostics list required linked surfaces: policy, schema, validator, test,
  coverage row, packet, and evidence target where applicable.

### A2. Projection-Only Authority Boundary
- PRDs, meeting notes, feature-tree drafts, flow diagrams, generated summaries, wiki pages,
  PM reports, and LLM reports cannot create canonical requirements, approve Ready For
  Code, approve release, close packets, or bypass packet review.
- Validators reject projection artifacts that claim authority beyond projection/supporting
  data status.

### A3. Requirement-To-Evidence Trace
- A packet can cite requirement, candidate, feature, scenario, acceptance, flow, and
  evidence target ids.
- Packet preflight reports missing or stale trace when a planning source requires it.
- Reviewer can determine which user outcome, scenario, and flow the packet claims to
  close without reading raw planning notes.

### A4. Flow Metadata
- Flow metadata records entry point, success path, failure paths, roles, state changes,
  evidence targets, E2E required status, and screens touched when applicable.
- Flow metadata can trigger E2E applicability or review expectations without importing
  Design Projection scope.

### A5. Clean Export Baseline
- The approved release/export path produces a candidate that passes
  `validate --starter --clean-export`.
- The candidate excludes `.harness`, root `.agents`, `AGENTS.md`, generated state, local
  DB files, `_ops` packet/evidence/wiki history, caches, logs, secrets, provider entry
  contracts, and root development history.

### A6. Copied Starter Installed Runtime
- A copied starter can run `init` and `validate --starter --installed-runtime`.
- Installed-runtime validation may tolerate approved runtime state, but it must not be
  used as clean export proof.

### A7. QA Freshness And Authority
- Before project evidence exists, `operating-qa` must not answer from inherited root
  packet history or root hardening memory.
- After reset with no project evidence, QA returns unsupported/blocked rather than stale
  inherited answers.
- QA output must retain authority boundaries for Ready For Code, closeout, release,
  residual risk, and human approval.

### A8. Closeout Guard And Reset Safety
- Unsupported closeout remains blocked when evidence, gates, review governance,
  independent review lenses, or filesystem cleanliness are missing.
- `ops-reset` removes copied-project operating records under `_ops`, recreates required
  operating folders, and preserves `_harness` plus product deliverables.

### A9. Promotion Dry-Run And Release Boundary
- Promotion dry-run passes without writing the target.
- Review lanes are adjudicated with evidence or converted into strict policy.
- Dry-run output continues to state that it grants no release, publish, approval,
  closeout, risk closure, product verification, or residual-risk acceptance.
- PKT-16 cannot claim productization complete while any hardening or productization
  blocker remains unresolved or explicitly deferred by Human Owner with Reviewer evidence.

## Verification Plan
- Planning-open preflight must report no blocking semantic-contract errors; unresolved
  Ready For Code, independent challenge review, and packet document review holds are
  expected until those reviews and Human approval exist.
- Add focused schema/service/validator tests for precise planning fields, candidate
  lifecycle, promotion links, intent fidelity records, implementation conformance,
  projection-only authority, feature/scenario/acceptance/flow trace, flow metadata,
  packet preflight trace, and end-of-hardening exit.
- Add negative tests proving implementation cannot close when it narrows the Human
  Owner's intent, substitutes weaker behavior, uses matching vocabulary without behavior,
  or relies on fixture-only proof for a broader approved outcome.
- Add negative tests proving PRD/feature/flow projections cannot create requirements,
  approve implementation, approve release, or close packets.
- Rerun copied-starter E2E from a fresh local target: clean export candidate, init,
  installed-runtime validation, first packet, QA before/after reset, unsupported closeout,
  reset preservation, and promotion dry-run.
- Negative productization tests must prove root `_ops` history, local DB/cache files,
  generated state, provider entry contracts, and stale QA memory cannot enter the release
  candidate or support fresh copied-starter QA answers.
- Reviewer closeout must adjudicate every PKT16-H* and PKT16-P* row before Planner
  closeout can mark PKT-16 closed.

## Verification Manifest
- Ready For Code: approved by Human Owner on 2026-06-30
- release-baseline: PKT-16 release-baseline E2E evidence is the productization blocker baseline and must be reconciled before closeout.
- packaging: clean export or sanitized starter copy validation must prove forbidden root/generated/local state is excluded before any release-ready claim.
- validator: strict harness validator, packet preflight, and release-boundary diagnostics must pass before closeout.
- planning hardening:
  - precise planning contract tests
  - intent fidelity record tests
  - implementation conformance gate tests
  - scope-narrowing/convenience-closeout negative tests
  - candidate lifecycle tests
  - promotion boundary tests
  - projection-only authority tests
  - feature/scenario/acceptance/flow schema tests
  - packet trace/preflight tests
  - end-of-hardening exit gate tests
- release/productization:
  - clean export validation
  - installed-runtime validation
  - first packet smoke
  - QA before/after reset
  - unsupported closeout guard
  - reset preservation
  - promotion dry-run
- root: `npm.cmd run harness:validate`
- targeted root Node tests: promotion/export/preflight tests touched by implementation
- starter Python regression: `PYTHONDONTWRITEBYTECODE=1 python -m unittest discover starter\standard-harness\_harness\test`
- active context: regenerate only through supported harness commands after packet opening
  or state transition, never manually
- review closeout: high/release/core closeout requires Reviewer adjudication and the full
  independent lens set unless a concrete N/A is independently accepted

## Required Gates
`release-plus-planning-hardening` is a packet-local overlay composition: `harness-system`
high-risk gates plus release-sensitive, starter-promotion, planning-trace, and
productization blockers. It does not create a new global gate profile.

| Gate | Trigger | Required Evidence Path | Owner | N/A / Substitute Check | Closeout Blocker |
|---|---|---|---|---|---|
| Independent packet challenge | High/core/release planning packet | `reference/reports/review/PKT-16-planner-challenge-review.md` | Planner / independent reviewer | N/A not allowed before RFC | yes |
| Independent packet_doc_review | Every packet before Ready For Code | `reference/reports/review/PKT-16-packet-doc-review.md` | Planner / independent reviewer | N/A not allowed before RFC | yes |
| Precise planning and intent fidelity | PKT16-H0/H1 | packet/preflight tests and review fixtures | Developer, Tester, Reviewer | no substitute for intent-sensitive scope | yes |
| Implementation conformance and shortcut rejection | PKT16-H2/H4 | negative fixtures for narrowed, vocabulary-only, subset-only, fixture-only closeout | Developer, Tester, Reviewer | no substitute for implementation claims | yes |
| Requirement candidate and projection authority | PKT16-H5/H7 | schema/service/validator tests and forbidden-authority fixtures | Developer, Tester, Reviewer | no substitute when projection artifacts are touched | yes |
| Trace and flow metadata | PKT16-H3/H6/H8 | feature/scenario/acceptance/flow/evidence trace tests and packet-preflight diagnostics | Developer, Tester, Reviewer | E2E may be N/A only when flow metadata proves no user-facing flow is touched | yes |
| End-of-hardening exit | PKT16-H9 | closeout/preflight evidence that follow-up is productization/release or narrow approved defect work | Reviewer, Planner | N/A not allowed | yes |
| Product readiness before User UAT | PKT16-H10 | Developer Done policy tests, Tester readiness gate fixtures, browser-state E2E expectation diagnostics, Reviewer product-quality checklist validation, and UAT entry evidence requirements | Developer, Tester, Reviewer | N/A only for packets with concrete no-user-facing/no-UAT surface rationale | yes |
| Clean export and starter contamination | PKT16-P1 | clean export validation from approved export/copy path | Developer, Tester, Reviewer | no raw-starter substitute unless Reviewer accepts equivalent sanitized export proof | yes |
| Fresh copied-starter QA | PKT16-P2 | copied-starter QA before/after reset evidence and stale-source negative test | Developer, Tester, Reviewer | no substitute for QA freshness when copied-starter QA is claimed | yes |
| Promotion dry-run review lanes | PKT16-P3 | dry-run output plus include/exclude/review-lane adjudication | Developer, Tester, Reviewer | no actual promotion allowed in PKT-16 | yes |
| Release boundary wording | PKT16-P4 | CLI/output/doc checks proving dry-run grants no release or approval | Developer, Tester, Reviewer | no substitute for release/publish wording checks | yes |
| Security and sensitive evidence | High/core/release/starter surfaces | `reference/reports/security/PKT-16-security-review.json` | Security reviewer / Reviewer | N/A only with explicit no-surface rationale and Reviewer acceptance | yes |
| Risk-adaptive closeout lenses | High/core/release/starter-promotion closeout | `challenge_review`, `adversarial_security_review`, `code_quality_review`, `evidence_review` artifacts | Reviewer | individual N/A not allowed unless packet records concrete no-surface rationale and evidence | yes |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Existing release baseline E2E report | `reference/reports/release-baseline/PKT-16_RELEASE_BASELINE_RECONCILIATION.md` | present |
| Artifact sync report | `reference/reports/artifact-sync/PKT-16_RELEASE_BASELINE_RECONCILIATION.md` | updated for new scope |
| Planner packet challenge review | `reference/reports/review/PKT-16-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-16-packet-doc-review.md` | required before Ready For Code |
| Developer implementation report | `reference/reports/developer/PKT-16_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-16_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-16-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-16_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-16_PLANNER_CLOSEOUT.md` | required to mark packet closed |

## Required Closeout Lens Mapping
| Lens | PKT-16 Question |
|---|---|
| `challenge_review` | Did implementation preserve the Human Owner's intent and enforce candidate promotion, projection-only authority, packet trace, clean export, and fresh QA behavior, or only add labels? |
| `adversarial_security_review` | Can drafts, generated summaries, root evidence, local DB/cache files, secrets, provider entry contracts, stale memory, or convenient reinterpretations become authority or enter the release candidate? |
| `code_quality_review` | Are planning hardening and productization fixes implemented through existing domain, policy, validator, CLI, and promotion services rather than ad hoc scripts? |
| `evidence_review` | Does every H/P row cite intent-conformance evidence, command evidence, negative fixtures, root/starter parity checks, and Reviewer-adjudicated residual risk? |

## Planner Packet Challenge Review
- Challenge reviewer: independent planning reviewer subagent
  `019f15e8-75ab-7e93-8f70-52762adfb649`.
- Challenge reviewer independence basis: read-only review; not the packet authoring
  session, Developer, Tester, Orchestrator, generated summary, or closeout Reviewer.
- Source refs reviewed: Human Owner current instruction, attached v2-ideas summary,
  Requirements, Implementation Plan, Architecture Guide, PKT-16 release-baseline E2E
  report, and prior PKT-11 through PKT-15 closeout boundaries.
- Challenge status: pass
- Parent objective coverage: PKT-16 covers the first additional hardening foundation and
  productization blocker closure before any v2.0 release-ready claim.
- Deferred scope with named follow-up: productization follow-up candidates are PKT-17
  Productization Readiness And Clean Export, PKT-18 Fresh Starter QA And Onboarding
  Smoke, PKT-19 Release Candidate Packaging And Evidence Bundle, PKT-20 Real Provider
  Worker Smoke, and PKT-21 Structured PM Source Intake. Design-maturity follow-up
  candidates are PKT-22 Design Projection And Browser Validation Foundation and PKT-23
  Reusable UI Module Contract And Locked Module.
- Acceptance proves behavior change: planned acceptance requires intent-conformance
  behavior, schema/service/validator behavior, negative authority tests, packet trace
  diagnostics, clean export evidence, fresh QA behavior, reset safety, and promotion
  dry-run adjudication.
- Failure fixture or failure condition: intent-narrowing implementation, vocabulary-only
  conformance, fixture-only closeout, PRD/projection authority escalation, missing
  requirement-to-flow trace, stale copied-starter QA answer, clean-export contamination,
  unsupported closeout success, and unresolved promotion review lanes must fail before
  implementation can close.
- Reviewer closeout hold basis: any missing H/P row evidence, missing negative authority
  fixture, missing root/starter parity, missing security review, stale QA source leakage,
  unresolved promotion review lane, or release-boundary overclaim.
- Guidance-only sufficiency rationale: guidance-only is insufficient for PKT-16
  implementation; all included rows require runtime, validator, CLI, test, or copied
  starter evidence.
- Challenge evidence artifact path: `reference/reports/review/PKT-16-planner-challenge-review.md`.
- Findings disposition: initial independent review found stale Implementation Plan
  sequencing and missing required-gate ledger; Planner corrections were applied and
  independent second-pass review found no remaining findings.
- Required corrections applied: Implementation Plan synced to PKT-16 Additional Hardening
  And Productization; packet-local Required Gates ledger added; packet-local Architecture
  Boundary Decision added; H10 product-readiness-before-UAT gate added after Human Owner
  clarified that User UAT bugs must be caught by pre-UAT product readiness gates.
- Main finding resolved in this rewrite: the earlier packet was release-baseline-only and
  did not include the new hardening intent. The rewritten packet now includes planning
  hardening rows H0-H10 and productization rows P1-P4.
- Scope-size challenge: v2-ideas includes design and medium-project operating layers that
  are valuable but too broad for this packet. They are deferred with explicit ownership so
  PKT-16 can stay testable.
- Acceptance challenge: every included hardening row requires behavior evidence, intent
  conformance, and negative authority tests; vocabulary-only conformance is not enough.
- First-wave limit check: PKT-16 is the planning-hardening foundation plus release
  productization packet. It must not absorb design projection, UI module contracts, live
  provider execution, PM ingestion, or workstream/release-train modeling.
- No self-approval claim: no self-approval; independent challenge review and independent
  packet document review remain required before Ready For Code.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: independent packet document reviewer subagent
  `019f15e8-be04-7f80-a441-e557cbeaa236`.
- Packet doc reviewer independence basis: read-only review; not the packet author,
  Developer, Tester, Orchestrator, generated summaries, or closeout Reviewer.
- Packet doc review evidence path: reference/reports/review/PKT-16-packet-doc-review.md
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: initial pass.
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: pass
- Verification scope strength: pass
- Deferred/out-of-scope ownership: pass
- Required corrections: pass - initial Finding 1 and Finding 2 corrected.
- Findings disposition: pass - independent second-pass review found no remaining findings.
- No self-approval claim: no self-approval; packet author and generated summaries cannot
  satisfy this review.
- Required review focus:
  - verify the changed Human Owner intent is preserved;
  - verify v2-ideas included/deferred disposition is defensible;
  - verify Requirements, Implementation Plan, and Architecture alignment or required sync
    gaps are called out before Ready For Code;
  - verify acceptance proves behavior change for H0-H10 and P1-P4;
  - verify release/promotion and residual-risk approval boundaries remain explicit.

## Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Scope acceptance for changed PKT-16 | yes | Human Owner | approved | Approved with PKT-16 Ready For Code instruction on 2026-06-30. |
| Ready For Code | yes | Human Owner | approved | Human Owner approved PKT-16 Ready For Code on 2026-06-30; route Orchestrator before implementation. |
| Residual risk / defer approval | yes if blockers remain | Human Owner | not requested | Reviewer cannot accept unresolved core/release blockers alone. |
| Actual release / publish / starter promotion | yes | Human Owner | not-approved | Separate explicit approval required after PKT-16 or later release packet. |
| Temporary target cleanup | conditional | Developer / Orchestrator | not-needed | No temporary target cleanup was required for PKT-16 closeout. |

## Security Review Request
- Required: yes
- Scope: planning authority injection, projection-to-authority escalation, requirement
  promotion abuse, packet trace narrowing, root/generated-state leakage, local DB/cache
  leakage, secrets, provider-specific entry contracts, `_ops` history, QA source
  inheritance, reset safety, promotion dry-run review lanes, and release approval
  boundaries.
- Required disposition: pass with Reviewer adjudication before closeout, or explicit
  Human-approved residual risk/defer.

## Artifact Sync
- Artifact sync report: `reference/reports/artifact-sync/PKT-16_RELEASE_BASELINE_RECONCILIATION.md`
- Requirements impact: updated with SHV2-REQ-049 through SHV2-REQ-051.
- Implementation Plan impact: updated before Ready For Code for PKT-16 Additional
  Hardening And Productization.
- Architecture impact: packet-local Architecture Boundary Decision added; Architecture
  Guide update remains conditional if implementation exceeds the listed bindings.
- Generated state impact: runtime regeneration only after packet opening or state
  transition.

## Refactor / Residual Debt Disposition
- Keep additions minimal and kernel-preserving: schema/policy -> service -> validator ->
  CLI/preflight -> tests -> starter validation.
- Do not introduce a parallel planning control plane. The new candidate/projection/trace
  surfaces support existing requirements, packet, evidence, and approval authority.
- Do not fold design projection, UI module locking, live provider execution, PM ingestion,
  or portfolio/workstream modeling into PKT-16 without explicit Human Owner scope change.

## Packet Exit Quality Gate
- Packet exit quality gate reference: `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- Exit recommendation: pass for Planner closeout
- Source parity result: pass
- Validation / security / cleanup evidence: pass; no temporary target cleanup was required
- Documentation impact / docs parity result: pass
- Closeout notes: PKT-16 is closed for the approved H0-H10/P1-P4 scope. This does not
  approve release, publish, starter promotion, residual-risk acceptance, or actual User
  UAT.

## Reopen Trigger
Reopen or return to Planner if:
- PRD, feature tree, flow projection, wiki, PM summary, generated summary, or LLM report
  can become canonical requirement, Ready For Code, release, or closeout authority without
  promotion and approval;
- packets can omit required planning trace while claiming a scoped requirement/feature/
  scenario/flow closure;
- flow metadata cannot identify required roles, state changes, failure paths, evidence
  targets, or E2E applicability for touched flows;
- raw starter copy still contains root operating history, generated state, local DB/cache,
  secrets, or provider entry contracts after implementation;
- fresh QA can answer from inherited root/hardening packet memory;
- `ops-reset` deletes `_harness` or product deliverables;
- unsupported closeout succeeds without evidence/review gates;
- promotion dry-run review lanes are treated as release approval;
- implementation claims release/publish/starter promotion without explicit Human approval.
