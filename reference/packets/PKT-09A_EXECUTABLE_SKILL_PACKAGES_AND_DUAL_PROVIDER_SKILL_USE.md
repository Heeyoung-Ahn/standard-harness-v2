# PKT-09A Executable Skill Packages And Dual-Provider Skill Use

> APPROVED PACKET. Ready For Code was explicitly approved by the Human Owner on 2026-06-29. This packet opens the follow-up lane after PKT-09 so the v2.0 starter can turn skill-routing contracts into executable, provider-neutral skill packages.

## Purpose
This packet converts the Human Owner's post-PKT-09 direction into a bounded implementation plan:
- build the definitive skill-package list from the 34 PKT-09 catalog skills, v1.0 root skills that fit v2.0, and superpowers skills whose behavior should be absorbed;
- make those skills practically usable as complete structured skill packages, not human-readable `SKILL.md` files;
- ensure the selected Conductor app and dual-provider CLI workers can automatically select and use the right skill packages through Conductor-routed work;
- leave actual superpowers plugin removal to the Human Owner after LLM implementation and equivalence evidence are complete.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE | PKT-09 created provider-neutral skill-routing contracts, but the 34 skills are not yet complete executable skill packages usable by dual-provider workers. | approved |
| Ready For Code | approved | Human Owner explicitly approved Ready For Code on 2026-06-29 after independent planner challenge and packet_doc_review passed. | approved |
| Human sync needed | no | The Human Owner has already clarified that human-readable skill docs are not required and that superpowers removal will be done by the Human Owner after LLM work. | approved |
| v2.0 philosophy parity gate | pass | Provider-neutral identity, structured skill contracts, selected-Conductor use, and dual-provider worker evidence were reviewed through independent closeout lenses. | approved |
| Gate profile | contract | This changes reusable skill package format, routing behavior, validation, and provider-worker handoff semantics. | approved |
| Risk class | high | Bad implementation could create dead skill packages, bypass process gates, overfit to one provider, or prematurely remove superpowers dependency safety checks. | approved |
| Route class | packet-path | Core starter harness behavior requires packet-governed implementation. | approved |
| Change zone | core | Skill package runtime, router, validator, and worker-routing integration are core harness surfaces. | approved |
| Delivery route mode | orchestrated-closeout | After Ready For Code, work should route Developer -> Tester -> Reviewer -> Planner closeout. | approved |
| User-facing impact | none | No UI or human-facing skill document is required; behavior is AI/automation-facing. | approved |
| Layer classification | core | Skill execution and routing are v2.0 starter core. | approved |
| Active profile dependencies | none | No optional profile is required. | approved |
| Profile evidence status | not-needed | No active optional profile is involved. | approved |
| UX archetype status | not-needed | No UI/UX surface is included. | approved |
| UX deviation status | none | No UI/UX archetype is involved. | approved |
| Environment topology status | not-needed | No deploy/cutover topology is included. | approved |
| Domain foundation status | approved | Domain is skill package inventory, package registry, routing, hard gates, evidence ledger, selected-Conductor use, and dual-provider worker handoff; no copied-project product data model is changed. | approved |
| System context status | approved | Existing system context is the starter harness skill/router/provider-worker architecture. | approved |
| Authoritative source intake status | approved | Source is the Human Owner's current instruction plus PKT-09 closeout and v2.0 planning artifacts. | approved |
| Shared-source wave status | not-needed | This packet is a sequencing insertion, not a multi-packet authoritative source wave. | approved |
| Packet exit gate status | approved | Human Owner approved PKT-09A closeout on 2026-06-29 after implementation, tests, security/dependency evidence, and four independent closeout review lenses passed after remediation. | approved |
| Improvement promotion status | proposed | This packet promotes PKT-09 residual skill-package friction into concrete starter work. | approved |
| Existing system dependency | none | This is an internal starter harness change, not integration with an external existing product system or database. | approved |
| New authoritative source impact | analyzed | User clarified no human-readable skill docs are required and superpowers removal is a Human action after LLM work. | approved |
| Risk if started now | high | Starting before package format and worker-use acceptance are reviewed could create incomplete packages or provider-specific behavior. | approved |
| Ship value status | pass | Executable package and worker-routing behavior are proven through package tests and independent review evidence. | approved |
| Required reviewer profiles | governance / staff-engineer / automation-governor / cso | Core routing, automation, provider-worker, and optional external plugin removal readiness require these perspectives. | approved |
| Packet doc review status | pass | Independent packet_doc_review failed initially, corrections were applied, and re-review passed before Ready For Code. | approved |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: skill inventory contract; executable package format; selected-Conductor use; dual-provider worker use; superpowers removal readiness
- Lane-type conditional sections: dependency/security evidence if package implementation vendors, installs, shells out to, or depends on any external plugin
- Lane-type not-needed sections: UI/UX; deployment topology; product DB/domain; human-readable skill documentation

## 1. Goal
Create complete v2.0 skill packages that are usable by the starter harness, selected Conductor, and dual-provider workers without requiring `SKILL.md` files or the superpowers plugin at runtime.

## 2. Non-Goal
- Do not create human-readable `SKILL.md` files as the authority source.
- Do not copy the superpowers plugin into the starter.
- Do not delete the superpowers plugin in this packet; the Human Owner will remove it after LLM work and evidence are complete.
- Do not implement PKT-10 compound feedback, starter promotion, or broad rollout.
- Do not make Codex, Claude Code, or any one provider the product identity.

## 3. User Problem And Expected Outcome
- 현재 사용자가 겪는 문제: PKT-09 이후 34개 skill contract는 라우팅/검증 계약으로 존재하지만, 선택된 Conductor 앱과 dual-provider workers가 실제 작업 중 자동으로 선택하고 사용할 수 있는 완성형 skill package로 보기는 어렵다.
- 작업 후 사용자가 체감해야 하는 변화: Codex App 또는 Claude Code App이 Conductor로 선택되면 Conductor도 필요한 skill package를 자동 선택/사용하고, Codex CLI 또는 Claude Code CLI worker에게 작업을 보낼 때 worker도 같은 provider-neutral package descriptor를 통해 필요한 skill package를 자동 선택/사용하고 evidence ledger에 남길 수 있다.

## Ship Value Contract
- User-visible value: Human Owner no longer needs to know skill names or manually inject skill rules for the selected Conductor or dual-provider workers.
- Business / operational value: LLM weaknesses are reduced by process gates, package-level evidence, and cross-provider consistency.
- Non-code outcome: a definitive skill-package inventory and removal-readiness evidence for superpowers.
- Human taste decision: human-readable skill docs are not required; structured package contract is preferred.
- Ship decision: approved-for-implementation
- Value evidence: package inventory, package schema validation, worker auto-selection tests, no-superpowers runtime tests.

## 4. In Scope
- Build a definitive inventory from:
  - all 34 current v2.0 skill catalog entries;
  - root v1.0 `.agents/skills/*/SKILL.md` skills that fit v2.0 provider-neutral operation;
  - superpowers skills selected for behavioral absorption.
- Define a complete structured skill-package format.
- Create or update package descriptors for selected skills.
- Add package loader/registry behavior if the current catalog is insufficient.
- Integrate packages with skill router output, hard-gate validation, evidence ledger, and CLI skill-route behavior.
- Add selected-Conductor package selection/use so Codex App and Claude Code App Conductor examples consume the same provider-neutral package contract.
- Add dual-provider worker handoff support so worker prompts/context packs receive the selected package contract without full-context dumping.
- Add tests proving Codex-worker and Claude-worker policy examples can use the same provider-neutral skill package contract.
- Produce superpowers removal-readiness evidence and a Human Owner removal checklist.

## 5. Out Of Scope
- Human-readable `SKILL.md` package authoring.
- Direct removal of the superpowers plugin.
- Actual remote/cloud provider execution beyond local/provider-neutral fixtures.
- UI/browser work.
- PKT-10 compound feedback and starter promotion mechanics.
- Sibling-project rollout.

## 6. Detailed Behavior
- Trigger: selected Conductor app, Orchestrator, or CLI worker receives a task with intent/risk/workflow/packet context.
- Main flow:
  1. Conductor route selects required skill packages by intent, task type, risk, workflow, provider role, and evidence needs.
  2. Package registry returns compact executable package descriptors for the selected Conductor.
  3. Conductor records selected/used/skipped package decisions before direct handling or worker routing.
  4. Worker handoff includes only selected package contracts and authority boundaries.
  5. Worker records selected/used/skipped package decisions in the skill-use ledger.
  6. Validator blocks implementation, completion, debugging, review, security, dependency, destructive, or closeout claims when package evidence is missing.
- Alternate flow: if no matching package exists, route blocks with actionable diagnostic and candidate package recommendation.
- Empty state: no package list means hard fail; package registry cannot silently fall back to prose.
- Error state: duplicate/conflicting package triggers, missing required package fields, provider-specific dependency, or untrusted superpowers dependency blocks implementation transition.
- Loading/transition: context pack must avoid loading all package bodies by default.

## 7. Program Function Detail
- 입력: task intent, task type, role, provider, risk, workflow, packet path, changed-file classification, evidence flags.
- 처리: package inventory selection, package descriptor lookup, package chain expansion, Conductor package-use brief generation, hard-gate validation, worker handoff generation, ledger append.
- 출력: selected package ids, candidate package ids, skipped package rationales, process-priority order, bounded required/next package chain, package contract slices, Conductor-use instructions, worker-use instructions, evidence requirements, hard-gate diagnostics, ledger records.
- 권한/조건: selected packages cannot override User, Conductor delegated approval rules, Planner, Tester, Reviewer, Orchestrator, or packet authority.
- edge case: Codex Conductor and Claude Code Conductor examples must resolve to the same provider-neutral package contract for the same task context; if Conductor and worker disagree on package use, Conductor adjudicates using evidence and packet authority, not LLM consensus.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human asks Codex App or Claude Code App acting as Conductor for work; Conductor automatically selects/uses the correct skill package; Conductor routes to Codex CLI or Claude Code CLI worker when needed; worker automatically uses the correct skill package; verifier/alternate worker checks evidence; Conductor routes next action.
- API contract: package route output must expose selectedPackageIds, candidatePackageIds, skippedPackageRationales, processPriorityOrder, boundedPackageChain, packageDescriptors, conductorBrief, providerWorkerBrief, requiredEvidence, hardGateDiagnostics, skillUseLedgerPath, authorityBoundary, and no-superpowers-runtime-dependency.
- Component responsibility: catalog owns package metadata; package registry owns package descriptors; router owns selection and ordering; validator owns hard gates; Conductor package-use and worker handoff own provider-neutral package delivery; ledger owns evidence.
- Allowed dependency direction: provider workers may consume selected package descriptors; packages must not depend on provider-specific app files or global plugin state.
- Data ownership: package catalog/descriptors, route decisions, worker-use ledger, and validation/test evidence are authority. Superpowers remains comparison evidence only.
- Public contract vs internal/scratch field: package descriptor schema is public starter contract; test fixtures and comparison notes are internal evidence.
- Promoted modeling artifact: not-needed for planning; implementation may update architecture text if package registry contract becomes durable.
- Not-needed rationale:
- Changed-file / classification evidence: expected changes under `starter/standard-harness/_harness/catalog/**`, `_harness/schemas/**`, `_harness/system/standard_harness/skills/**`, provider/role handoff surfaces, and tests.
- Field consolidation note: This packet extends PKT-09 from skill routing into executable package use, while preserving provider-neutral identity and packet authority.

## 8. UI/UX Detailed Design
- UX archetype status: not-needed
- UX archetype reference: not-needed
- Selected UX archetype: not-needed
- 영향받는 화면: none
- interaction: none

## 9. Data / Source Impact
- Layer classification: core
- Core / profile / project boundary rationale: executable skill packages are reusable starter core.
- Active profile dependencies: none
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `reference/packets/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md`; `starter/standard-harness/_harness/catalog/skill-catalog.yaml`; `starter/standard-harness/_harness/catalog/minimum-required-skills.yaml`; root `.agents/skills/*/SKILL.md`; external superpowers skill references for absorption candidates only.
- Environment topology reference: not-needed
- Source environment: local repository
- Target environment: starter payload
- Execution target: starter package registry, router, validator, CLI, tests
- Transfer boundary: no release, publish, external provider deployment, or plugin removal
- Rollback boundary: revert package descriptor/registry/router/validator changes inside packet scope
- Domain foundation reference: not-needed
- System context reference: `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- System boundary impact: yes; skill package runtime, selected-Conductor package use, and dual-provider worker handoff
- Shared module / hotspot impact: yes; skill router, package registry, validation, CLI
- Schema impact classification: high
- Schema impact note: package descriptor schema and execution ledger schema may need updates.
- DB / state 영향: no persistent DB changes expected; evidence ledger file shape may change.
- Markdown / docs 영향: implementation plan and architecture parity may be updated; human skill docs are not required.
- Documentation impact: update-required
- Docs parity needed: yes
- Operator/manual update needed: not-needed unless CLI behavior changes in a user-visible way
- generated docs 영향: regenerate Active Context after state transitions only
- validator / cutover 영향: yes; validator must classify complete packages and no-superpowers readiness
- Harness validation / product verification boundary: harness validation checks structural/state consistency only; package usability must be proven by targeted worker/package tests.
- Authoritative source refs: Human Owner current instruction; PKT-09 closeout; Requirements SHV2-REQ-019, SHV2-REQ-032, SHV2-REQ-048, SHV2-REQ-017, SHV2-REQ-035, and SHV2-REQ-038; Implementation Plan Wave 8/PKT-09, Wave 8A/PKT-09A, and Wave 9/PKT-10 boundary.
- Authoritative source intake reference: this packet
- Authoritative source disposition: accepted for packet planning
- New planning source priority / disposition: Human Owner instruction overrides earlier assumption that PKT-09 leaves only routing contracts; it does not alter PKT-10 compound feedback ownership.
- Existing plan conflict: closed. Implementation Plan now includes Wave 8A / PKT-09A before PKT-10, so this packet is the current sequenced PKT-09 follow-up; PKT-10 remains compound feedback/starter promotion.
- Current implementation impact: PKT-09 contract catalog and router are starting point, not final complete package system.
- Required rework / defer rationale: superpowers plugin deletion remains deferred to Human Owner after LLM evidence.
- Impacted packet set scope: PKT-09A only; PKT-10 remains separate.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed
- Existing program / DB dependency: none
- Existing schema source artifact: not-needed
- Table / column naming compatibility: not-needed
- Data operation / ownership compatibility: not-needed
- Migration / rollback / cutover compatibility: not-needed
- Product source root: `starter/standard-harness/_harness/system/standard_harness`
- Product test root: `starter/standard-harness/_harness/test`
- Product runtime requirements: Python starter runtime, root harness validation for packet preflight where affected
- Harness/product boundary exceptions: root docs/tests may change only to plan, validate, or evidence starter v2.0 behavior.

## Context Impact Classification
- Domain context: citation-only
- System context: update-required
- Architecture: citation-only
- Project history: milestone
- Preventive memory: none
- Required context paths:
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/packets/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md`
- Context read level: cited-sections-only
- Context classification note: this is a core harness architecture extension but does not require a full architecture rebaseline before packet opening.

## Development Documentation Impact
- Project overview impact: none
- Setup/dev environment impact: none
- Architecture doc impact: cite-only
- Domain doc impact: none
- API/interface doc impact: contract-required
- Database/data model doc impact: none
- Module guide impact: update-required
- Testing doc impact: update-required
- Deploy/operations doc impact: none
- History/decision doc impact: milestone
- Security/permission doc impact: review-required
- AI/automation doc impact: update-required
- Required doc paths:
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md` if package registry contract changes
  - package schema/catalog files inside starter
- Docs must be updated before implementation: no
- Docs must be updated before closeout: yes
- Docs parity status: pass

## 10. Acceptance
- A definitive inventory classifies all current 34 v2.0 catalog skills, every root v1.0 skill that fits v2.0, and superpowers absorption candidates as `package-now`, `merge-into-existing`, `defer`, or `reject-with-rationale`.
- Every `package-now` skill has a complete structured package descriptor with trigger, process priority, authority boundary, provider-worker use contract, evidence contract, fallback behavior, required/next package chain, permission scope, and validation hooks.
- The package registry/loader can resolve package descriptors without reading `SKILL.md` files or requiring the superpowers plugin.
- Package route output preserves the PKT-09 route contract at package level: selected packages, candidate packages, skipped package rationale, process-priority order, bounded required/next package chain, hard-gate diagnostics, evidence ledger path, and authority boundary are all produced and validated.
- Codex App Conductor and Claude Code App Conductor fixtures both select/use the same provider-neutral package contract for the same task context and record Conductor package-use evidence.
- Codex CLI worker and Claude Code CLI worker fixtures both receive the same provider-neutral selected package contract from Conductor handoff and can record worker package-use evidence.
- Hard gates block implementation before planning, completion before verification, fixes before root cause, review acceptance before disposition, and destructive/security/dependency work before required package evidence.
- No-superpowers-required tests pass, and removal-readiness evidence clearly states what the Human Owner may remove after LLM work.
- Duplicate, contradictory, missing, or provider-specific package definitions fail validation with actionable diagnostics.
- Context-budget tests prove worker handoff sends only selected package slices, not the full package catalog or all skill bodies.

## Fast Path Note
- requested change: not fast-path
- why low risk: not applicable
- workflow/validator authority: yes
- architecture or reusable runtime change: yes
- follow-up needed: PKT-10 remains compound feedback and starter promotion

## 11. Open Questions
- None for packet opening. Package inventory may discover merge/defer/reject decisions during implementation; those decisions must be recorded in inventory evidence and returned to Planner if they change packet scope.

## Planner Packet Challenge Review
- Challenge reviewer: Peirce, independent explorer subagent `019f130f-bcf4-7ec3-a468-d0262c673f23`
- Challenge reviewer independence basis: read-only independent subagent; not packet author, Developer, Tester, Orchestrator, generated summary, or main-session self-review; did not edit files or approve Ready For Code
- Source refs reviewed: `reference/packets/PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE.md`; `reference/packets/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `.agents/runtime/ACTIVE_CONTEXT.json`
- Challenge status: pass
- Parent objective coverage: PKT-09A covers the executable skill-package follow-up after PKT-09 and before PKT-10.
- Deferred scope with named follow-up: PKT-10 owns compound feedback/starter promotion; Human Owner owns final superpowers removal action after LLM work.
- Acceptance proves behavior change: pass; acceptance requires inventory, structured package descriptors, package-level route parity, selected-Conductor package use, dual-provider worker handoff, hard gates, no-superpowers runtime tests, validation diagnostics, and context-budget tests.
- Failure fixture or failure condition: a catalog-only skill without executable package descriptor must fail; a provider worker that cannot auto-use selected packages must fail; superpowers runtime dependency must fail.
- Reviewer closeout hold basis: hold if packages are only inventory rows, if worker use is not tested, if superpowers becomes mandatory, or if removal-readiness is ambiguous.
- First-wave limit check: not a first-wave avoidance; this packet exists because PKT-09 intentionally stopped at routing contracts.
- Guidance-only sufficiency rationale: guidance-only is not sufficient; runtime/schema/tests are required.
- Required packet changes: none from challenge review; packet_doc_review corrections were rechecked by challenge reviewer.
- Challenge evidence artifact path: `reference/reports/review/PKT-09A-planner-challenge-review.md`
- Re-review evidence: pass after packet_doc_review corrections; no new challenge findings.
- Findings disposition: no challenge-review findings remained after second pass.
- Required corrections applied: not-needed for challenge review; packet_doc_review corrections applied separately.
- No self-approval claim: independent reviewer is not the packet author; this is not packet-author self-approval and does not approve implementation, Ready For Code, or closeout.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: Feynman, independent explorer subagent `019f130f-d10a-7171-ad23-809d78f2af34`
- Packet doc reviewer independence basis: read-only independent subagent; not packet author, Developer, Tester, Orchestrator, generated summary, or main-session self-review; did not edit files or approve Ready For Code
- Packet doc review evidence path: reference/reports/review/PKT-09A-packet-doc-review.md
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass; source refs include SHV2-REQ-019, SHV2-REQ-032, SHV2-REQ-048, SHV2-REQ-017, SHV2-REQ-035, and SHV2-REQ-038.
- Implementation-plan sequencing alignment: pass; Wave 8A / PKT-09A is now recorded as the current sequenced follow-up before PKT-10.
- Architecture/source SSOT alignment: pass; package route output preserves PKT-09 and architecture route fields at package level.
- Human/Planner intent preservation: pass; no-`SKILL.md` authority, selected-Conductor use, dual-provider worker use, and Human-owned superpowers removal remain explicit.
- v1.0 root-harness operating constraint coverage: pass; root v1.0 skill catalog is source input, not copied human-readable starter skill docs.
- v2.0 product philosophy coverage: pass; provider-neutral package contract avoids Codex/Claude product identity.
- Acceptance strength: pass after adding candidate/skipped/process-priority/chain package-route acceptance.
- Verification scope strength: pass after adding package candidate/skipped/process-priority/chain tests and targeted fixtures.
- Deferred/out-of-scope ownership: pass; PKT-10 owns compound feedback/starter promotion and Human Owner owns final superpowers plugin removal.
- Required corrections: package-route output fields, Wave 8A sequencing language, and source refs were corrected.
- Findings disposition: initial packet_doc_review failed with three findings; all were corrected and re-review passed with no unresolved findings.
- No self-approval claim: review does not approve implementation, Ready For Code, or closeout.

## P2 Specialist Review Mode Contract
- Required reviewer profiles: governance / staff-engineer / automation-governor / cso
- Reviewer profile recommendation artifact: not-needed
- Mode review evidence: required at closeout
- Mode conflict resolution: Conductor/Planner authority and packet evidence win over LLM consensus
- CSO mode required: yes
- Data correctness mode required: no
- Governance mode required: yes
- Staff engineer mode required: yes
- Release/SRE mode required: no
- UX reviewer mode required: no

## 12. Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Layer classification agreement | no | Human Owner | closed | Core starter skill package system. |
| Detailed function agreement | no | Human Owner | closed | User requested inventory plus complete package creation, selected-Conductor use, and dual-provider worker use. |
| Authoritative source disposition approval | no | Human Owner | closed | User clarified v1, v2.0 catalog, and superpowers absorption sources. |
| superpowers removal action | yes | Human Owner | deferred | Human Owner will remove plugin after LLM work and evidence. |
| Ready For Code sign-off | yes | Human Owner | approved | Explicitly approved on 2026-06-29 in chat: "PKT-09A Ready for code 승인. Orchestrato로 진행하세요." |

## 13. Implementation Notes
- Do not create `starter/standard-harness/.agents/skills/*/SKILL.md`.
- Prefer structured descriptors such as package JSON/YAML under starter `_harness` and schema-backed validation.
- Preserve `sourcePriority=v1_skill_catalog` unless Planner explicitly changes source authority.
- Superpowers is comparison input only; runtime must pass without it installed.
- Dual-provider worker examples must remain provider-neutral policy/examples, not product identity.
- Worker prompts/context packs must receive selected package slices only.

## 14. Verification Plan
- Gate profile: contract
- Risk class: high
- Route class: packet-path
- Change zone: core
- Delivery route mode: orchestrated-closeout
- Orchestration completion expectation: after Ready For Code, Orchestrator routes Developer, Tester, Reviewer, bounded remediation, and Planner closeout.
- Remaining approval needed: none; Human Owner approved PKT-09A closeout on 2026-06-29.
- Derived risk class: high
- Effective risk class: high
- Risk classification rationale: core router/package/validator/provider-worker behavior.
- Critical human confirmation: superpowers removal action remains Human-owned and out of implementation scope.
- Critical confirmation owner: Human Owner
- Critical confirmation status: closed for packet planning; deferred for actual removal
- Critical confirmation evidence path: this packet
- Post-transition refresh: run `npm run harness:sync-state` after state-changing transitions or closeout.
- Verification manifest:
  - Ready For Code: approved
  - root: packet preflight, validation, root tests affected by packet/validator changes
  - standard-template: starter payload package registry/router/validator parity is required because this packet changes reusable starter behavior
  - starter: package schema tests, package inventory tests, router/package registry tests, selected-Conductor fixture tests, dual-provider worker fixture tests, package candidate/skipped/process-priority/chain tests, no-superpowers-required tests
  - targeted: catalog-only package negative fixture, missing package descriptor fixture, duplicate/conflict fixture, provider-specific dependency fixture, candidate-package fixture, skipped-rationale fixture, bounded package-chain fixture, Conductor package-use fixture, worker handoff fixture
  - validator: harness validator pass
  - active context: regenerated after transition/closeout
  - packet doc review: independent packet_doc_review pass
  - review closeout: four independent closeout lenses because this is high/core/contract work
- Verification scenario reminder:
  - normal: task intent routes to package, selected Conductor uses package, worker receives package when delegated, ledger records evidence
  - error: missing/duplicate/conflicting/provider-specific package blocks
  - permission: destructive/security/dependency package evidence required before action
  - regression: PKT-09 skill routing behavior remains intact
  - manual check: superpowers removal checklist is understandable and Human-owned
  - evidence location: `reference/reports/**/PKT-09A*`
- Harness validation note: validator/validation-report pass is not package usability proof; cite targeted package/worker tests separately.

## Verification Manifest
- Ready For Code: approved
- root: packet preflight, validation, and root tests affected by packet/validator changes
- standard-template: starter payload package registry/router/validator parity is required because this packet changes reusable starter behavior
- starter: package schema tests, package inventory tests, router/package registry tests, selected-Conductor fixture tests, dual-provider worker fixture tests, package candidate/skipped/process-priority/chain tests, no-superpowers-required tests
- targeted: catalog-only package negative fixture, missing package descriptor fixture, duplicate/conflict fixture, provider-specific dependency fixture, candidate-package fixture, skipped-rationale fixture, bounded package-chain fixture, Conductor package-use fixture, worker handoff fixture
- validator: harness validator pass
- active context: regenerated after transition/closeout
- packet doc review: independent packet_doc_review pass
- review closeout: four independent closeout lenses because this is high/core/contract work

## TDD Evidence Contract
- TDD mode: required
- Red test file: `starter/standard-harness/_harness/test/test_executable_skill_packages.py`
- Red command: `python -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py`
- Red exit code: 1
- Red failure kind: expected-contract-failure
- Red ran at: 2026-06-29
- Red output excerpt: `ModuleNotFoundError: No module named 'standard_harness.skills.packages'`
- Red output artifact: reference/reports/tdd/PKT-09A-red.md
- Red output sha256: not-recorded
- Green command: `python -m unittest starter\standard-harness\_harness\test\test_executable_skill_packages.py`
- Green exit code: 0
- Green ran at: 2026-06-29
- Green output excerpt: `Ran 4 tests ... OK`
- Green output artifact: reference/reports/tdd/PKT-09A-green.md
- Green output sha256: not-recorded
- Refactor verified: pass; targeted package/routing tests, full starter unittest discovery, root harness Node tests, skill docs dry-run, and strict validation ran
- Behavior-level test: yes
- Test-only production hook: no
- Production code written first: no
- Production-first remediation: not-needed
- TDD exception reason:
- TDD approved by:

## CSO Security Review
- Security review evidence status: pass
- Security review evidence scope: skill package authority, provider-worker handoff, destructive/security/dependency gates, optional external plugin removal readiness
- Security review report path: reference/reports/security/PKT-09A-security-review.json
- Security review decision: pass
- Security review mode: scoped
- Required CSO phases: 0,1,12,13,14
- Finding quality required: file,line,evidence_quote_redacted,confidence,phase,fingerprint,exploit_scenario,impact,recommendation
- Accepted-risk authority: Human Owner
- Redaction status: not-needed
- Declared security/release paths: starter package registry, router, validator, CLI worker handoff, superpowers removal readiness

## Parallel Execution Plan
- Parallel batch plan path: not-needed
- Parallel execution strategy: serial
- File-overlap policy: serial_downgrade
- Baseline test evidence: `reference/reports/tdd/PKT-09A-red.md`
- Dependency graph status: not-needed; no external dependency graph changed
- Worktree isolation evidence: not-needed unless implementation is split across workers
- Actual-file reconciliation: pass
- Merge order evidence: not-needed; implementation was serial
- Merge-after-test evidence: targeted tests, starter discovery, root tests, and strict validation passed
- Cleanup evidence: pass

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: parallel
- challenge_review agent: independent explorer agent
- challenge_review independence basis: separate read-only agent; initial fail routed to Developer remediation; re-review pass recorded
- challenge_review evidence path: reference/reports/review/PKT-09A-closeout-challenge-review.md
- challenge_review status: pass-after-remediation
- challenge_review finding count: 0 blocking after remediation
- challenge_review limitations: live provider CLI execution out of PKT-09A scope
- challenge_review reviewer disposition: pass-after-remediation
- challenge_review not applicable rationale:
- adversarial_security_review agent: independent explorer agent
- adversarial_security_review independence basis: separate read-only agent; initial fail routed to Developer remediation; re-review pass recorded
- adversarial_security_review evidence path: reference/reports/review/PKT-09A-closeout-adversarial-security-review.md
- adversarial_security_review status: pass-after-remediation
- adversarial_security_review finding count: 0 blocking after remediation
- adversarial_security_review limitations: authenticated live provider CLI execution out of PKT-09A scope
- adversarial_security_review reviewer disposition: pass-after-remediation
- adversarial_security_review not applicable rationale:
- code_quality_review agent: independent explorer agent
- code_quality_review independence basis: separate read-only agent; initial fail routed to Developer remediation; final edge-case re-review drove additional fix
- code_quality_review evidence path: reference/reports/review/PKT-09A-closeout-code-quality-review.md
- code_quality_review status: pass-after-remediation
- code_quality_review finding count: 0 blocking after remediation
- code_quality_review limitations: none beyond no live provider CLI execution scope
- code_quality_review reviewer disposition: pass-after-remediation
- code_quality_review not applicable rationale:
- evidence_review agent: independent explorer agent
- evidence_review independence basis: separate read-only agent; evidence consistency findings were remediated by lens/table updates
- evidence_review evidence path: reference/reports/review/PKT-09A-closeout-evidence-review.md
- evidence_review status: pass-after-remediation
- evidence_review finding count: 0 blocking after remediation
- evidence_review limitations: none after Human Owner closeout approval on 2026-06-29
- evidence_review reviewer disposition: pass-after-remediation
- evidence_review not applicable rationale:

## 50/50 Allocation Review
- Feature-building work: executable skill packages, selected-Conductor use, and dual-provider worker use
- System-improvement work: package schema, validation, no-superpowers readiness
- Reusable learning captured: package inventory and removal-readiness evidence
- Automation or harness improvement candidate: provider-neutral package registry and worker handoff
- Deferred system improvement: PKT-10 compound feedback and starter promotion
- System improvement ledger reference: .agents/artifacts/SYSTEM_IMPROVEMENT_LEDGER.md

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Implementation delta summary: added explicit package inventory, executable package descriptors, schema-grade validation, route fail-closed behavior, selected Conductor/worker package briefs, redacted ledger route output, and JSONL package-use append support.
- Source parity result: pass
- Refactor / residual debt disposition: no blocking residual debt; live provider CLI execution and superpowers plugin removal remain out-of-scope/deferred.
- UX conformance result: not-needed
- Topology / schema conformance result: pass
- System context conformance result: pass
- Modeling error handling result: pass
- Documentation impact / docs parity result: pass
- Memory impact review:
  - Long-context update needed: no
  - Context artifacts updated: yes, via harness transitions and sync-state
  - Context artifacts intentionally not updated: not-needed
  - Compaction needed: no
  - Documenter route needed: no
  - Archive / citation path: not-needed
  - Closeout hold: none; Human Owner approved PKT-09A closeout on 2026-06-29.
  - Validation / security / cleanup evidence: pass
- Deferred follow-up item: PKT-10 compound feedback and starter promotion; Human Owner superpowers plugin removal action
- Improvement candidate reference: this packet
- Proposed target layer: starter core
- Promotion status / linked follow-up item: proposed
- Closeout notes: implementation, Developer/Tester/Security/Dependency evidence, and four independent closeout lenses are pass-after-remediation; Human Owner approved final closeout on 2026-06-29. See TDD, Developer, Tester, dependency-audit, and security reports for PKT-09A evidence details.

## 16. Reopen Trigger
- Reopen this packet if the Human Owner changes the no-`SKILL.md` decision.
- Reopen if implementation discovers that package descriptors alone cannot support selected-Conductor or dual-provider worker use.
- Reopen if superpowers removal requires LLM-side deletion or migration work beyond Human Owner action.
- Reopen if package inventory changes PKT-10 compound feedback or starter promotion boundaries.
- Reopen if provider-specific files become required for starter operation.
- Reopen if packet_doc_review finds acceptance too broad or package usability unprovable.
