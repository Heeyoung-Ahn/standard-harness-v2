# PKT-10 Compound Feedback And Starter Promotion

> IMPLEMENTATION PACKET. Ready For Code approved by the Human Owner on 2026-06-29 after Planner Packet Challenge Review and independent packet_doc_review pass.

## Purpose
PKT-10 closes the Wave 9 planning lane for compound feedback and starter-promotion readiness. It turns repeated harness friction into structured friction signals, recurring friction groups, improvement proposals, and starter-promotion candidates without allowing any candidate to mutate the starter or publish a release without a later explicit approval boundary.

The attached GPT draft is accepted as planning input only. The authoritative sources remain the Human Owner's current instruction, Requirements `SHV2-REQ-016`, the Implementation Plan Wave 9 / PKT-10 row, the Architecture Guide self-improvement boundary, PKT-09A closeout deferral, and the root harness operating contract.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION | This is the final planned packet after PKT-09A and owns Wave 9 compound feedback / starter-promotion readiness. | selected |
| Ready For Code | approved | Human Owner approved RFC on 2026-06-29 after independent packet review. | approved |
| Human sync needed | yes | Actual promotion/release remains a later approval. | approved |
| v2.0 philosophy parity gate | planned | Converts repeated friction into structured evidence-backed improvement flow while preserving clean starter and human approval boundaries. | selected |
| Packet type | harness-system | The packet changes reusable starter self-improvement, validation, evidence, and promotion-readiness behavior. | selected |
| Gate profile | contract | The packet defines reusable lifecycle contracts and validator behavior for friction, proposals, and promotion candidates. | selected |
| Gate profile version | harness-system@contract/v1 | Contract-grade harness-system work with starter-promotion overlays. | selected |
| Risk class | high | A weak implementation could promote untrusted evidence, leak root history, mutate starter silently, or turn friction prose into approval authority. | selected |
| Route class | packet-path | Core starter harness behavior requires packet-governed implementation. | selected |
| Change zone | core | Expected changes affect `_harness/system/standard_harness/self_improvement`, schemas, policies, validators, CLI, tests, and planning evidence. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | selected |
| User-facing impact | none | No product UI, browser flow, or human-facing product screen changes are in scope; operator-visible status is CLI/record output only. | selected |
| Layer classification | core | Self-improvement and starter-promotion readiness are reusable starter core. | selected |
| Active profile dependencies | none | No optional profile is required. | selected |
| Profile evidence status | not-needed | No optional profile is active for this packet. | selected |
| UX archetype status | not-needed | No UI/UX surface is included. | selected |
| UX deviation status | none | No UI/UX archetype or deviation is involved. | selected |
| Environment topology status | not-needed | No deployment or release target is changed. | selected |
| Domain foundation status | approved | Domain is friction signal, recurring group, proposal lifecycle, promotion candidate lifecycle, evidence manifest, and safety gates. | selected |
| System context status | approved | Architecture Guide already assigns self-improvement ownership to `_harness/system/standard_harness/self_improvement`. | selected |
| Authoritative source intake status | approved | User attached a GPT draft for reference; Planner reconciled it against Requirements, Architecture, Implementation Plan, and PKT-09A closeout. | selected |
| Shared-source wave status | not-needed | Single packet, not a multi-source wave. | selected |
| Packet exit gate status | closed | Implementation, tests, security review, independent closeout lenses, Reviewer adjudication, Orchestrator closeout package, and Human closeout approval are recorded. | closed |
| Risk if started now | high | Starting without reviewed lifecycle and safety-gate acceptance could allow untrusted friction prose, raw evidence, or starter mutation to masquerade as promotion readiness. | selected |
| Existing system dependency | none | Internal starter harness self-improvement behavior; no external service, database, package registry, or live provider dependency is required. | selected |
| New authoritative source impact | analyzed | GPT draft is planning input only; Requirements, Architecture Guide, Implementation Plan, PKT-09A closeout, and current Human instruction remain authority. | selected |
| Packet doc review status | pass | Independent packet_doc_review initially found two blocking findings; Planner corrected them and independent re-review passed. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Quick Decision Header; Gate Profile Metadata; Modeling Impact; Friction Signal Contract; Recurring Detection Contract; Improvement Proposal Lifecycle; Starter-Promotion Candidate Lifecycle; Promotion Safety Gates; Acceptance; Verification Manifest; Planner Packet Challenge Review; Packet Document Review
- Lane-type conditional sections: TDD Evidence Contract; CSO Security Review; Feature Artifact Sync Matrix; Development Documentation Impact
- Lane-type not-needed sections: UI/UX; deployment topology; provider-specific runtime execution; actual release/publish

## 1. Goal
Implement a provider-neutral compound feedback loop in the starter harness:

```text
friction signal -> recurring friction group -> improvement proposal -> starter-promotion candidate -> dry-run/validation -> approval-needed
```

The loop must preserve the difference between:
- recording friction,
- proposing an improvement,
- qualifying a starter-promotion candidate,
- and actually promoting, releasing, or publishing starter changes.

PKT-10 may produce promotion-ready candidate records that stop at `approval-needed`. It must not execute actual starter promotion, release, publish, rollout, or residual-risk acceptance.

## 2. Non-Goal
- Do not execute actual starter promotion.
- Do not publish or release the starter.
- Do not delete the superpowers plugin.
- Do not directly mutate starter files from a promotion candidate.
- Do not copy root development history, root packet history, evidence bodies, generated state, provider-specific entry files, caches, secrets, or local DB files into the starter.
- Do not make PM summaries, wiki pages, friction prose, or LLM discussion into approval authority.
- Do not implement broad cleanup or destructive actions.
- Do not create product UI/browser behavior.

## 3. User Problem And Expected Outcome
- Current problem: repeated harness friction can be noticed in chat, reviews, PM reports, validator failures, stale context, generated residue, or manual rework, but the path from repeated friction to reusable starter improvement is not yet structured or safely gated.
- Expected outcome: the starter can record friction as structured signals, group recurring friction, create evidence-linked proposals, qualify accepted proposals as starter-promotion candidates, and prove promotion readiness with dry-run and clean copied-starter validation while stopping for Human approval before any actual promotion.

## Ship Value Contract
- User-visible value: recurring operational friction becomes inspectable and actionable without forcing the Human Owner to inspect raw logs or every intermediate Markdown file.
- Operational value: repeated LLM/harness failure patterns become evidence-linked improvement candidates instead of ad hoc fixes.
- Safety value: starter-promotion candidates must prove dry-run, contamination, clean export, copied-starter smoke, and sensitive-evidence safety before reaching approval-needed.
- Non-code outcome: SHV2-REQ-016 closure evidence and requirement closure matrix are produced.
- Ship decision: Ready For Code approved; actual promotion/release remains deferred.
- Value evidence: friction/proposal/promotion lifecycle tests, safety-gate negative tests, clean copied-starter smoke, and closure matrix.

## 4. In Scope
- Define friction signal schema and registry.
- Seed initial friction types:
  - `pycache_residue`
  - `npm_node_path_failure`
  - `validation_pass_with_warnings`
  - `dirty_generated_state`
  - `packet_prose_without_durable_evidence`
  - `stale_active_context`
  - `missing_required_evidence`
  - `manual_rework_repeated`
  - `validator_failure`
  - `closeout_state_mismatch`
  - `token_overuse`
  - `boundary_violation`
- Add friction signal creation service/utility and CLI or validator entrypoint.
- Connect friction capture through enforced runtime/service entrypoints for validation failure, warning-only validation pass, review, PM/report, closeout, token-overuse, and boundary-violation surfaces.
- Connect accepted friction/proposal outcomes to wiki proposal / long-memory candidate evidence without allowing direct wiki mutation.
- Add recurring friction detector.
- Add improvement proposal registry and lifecycle: `proposed -> reviewed -> accepted | deferred | rejected`.
- Add starter-promotion candidate registry and lifecycle: `candidate -> dry-run -> validation -> approval-needed`.
- Require accepted improvement proposals and evidence manifests before promotion-candidate creation.
- Add metrics output for signal counts, recurring groups, proposal status, promotion-candidate status, blocked promotions, and safety-gate failures.
- Add promotion dry-run report, contamination check, clean-export validation, copied-starter smoke validation, sensitive-evidence/root-history/generated-residue checks.
- Add tests for positive and negative flows.
- Produce SHV2-REQ-016 closure evidence and a requirement closure matrix for the packet scope.
- Reconcile Implementation Plan Current Iteration / roadmap state if stale status remains after PKT-09A.

## 5. Out Of Scope
- PKT-09A executable skill package implementation changes.
- Superpowers plugin deletion.
- Actual starter promotion execution.
- Actual release, publish, rollout, PR creation, or deployment.
- Provider-specific starter identity.
- Legacy v1 file copying.
- Broad root cleanup or destructive cleanup.
- Human-facing Markdown expansion beyond packet/evidence/review reports needed for governance.
- Product acceptance or product feature verification.

## 6. Detailed Behavior
### 6.1 Friction Signal
- A friction signal records one bounded operational problem or risk signal.
- Required fields:
  - signal id
  - type
  - severity
  - source surface
  - source reference
  - recurrence key
  - evidence reference
  - suggested route
  - authority boundary
  - sensitive-evidence flag / redaction status
- A warning-only validation pass can record a friction signal without changing the validation pass result.
- A friction signal alone cannot become a starter-promotion candidate.
- Minimum runtime/service capture surfaces for PKT-10:
  - validation failure
  - validation pass with warnings
  - review finding / review evidence gap
  - PM/report status friction
  - closeout state mismatch
  - context/token budget overrun
  - authority or starter-boundary violation
- Documentation-only or manual-only entrypoints do not satisfy PKT-10 acceptance. If implementation cannot wire one of the minimum surfaces, it must fail closeout or return to Planner with a named follow-up item, owner, and evidence showing why the omission is outside approved scope.

### 6.2 Recurring Friction Detector
- Groups friction by type, recurrence key, source surface, and evidence pattern.
- Computes recurrence count, latest occurrence, affected surfaces, severity trend, evidence completeness, and proposal eligibility.
- Single unverified friction remains recorded but not promotion-eligible.
- Recurring groups must preserve evidence references instead of copying raw evidence bodies.

### 6.3 Improvement Proposal Lifecycle
- Proposals require at least one friction signal or recurring group.
- Lifecycle:

```text
proposed -> reviewed -> accepted | deferred | rejected
```

- Required fields:
  - proposal id
  - source friction ids / group ids
  - problem statement
  - affected harness surface
  - expected improvement
  - risk level
  - verification method
  - review disposition
  - starter-promotion eligibility
- Only `accepted` proposals can create starter-promotion candidates.
- Deferred/rejected proposals must preserve rationale and cannot be promoted.

### 6.4 Starter-Promotion Candidate Lifecycle
- Candidate lifecycle:

```text
candidate -> dry-run -> validation -> approval-needed
```

- Candidate creation requires:
  - accepted improvement proposal
  - evidence manifest
  - changed surface plan
  - rollback/backout note
  - contamination/sensitive-evidence expectations
- Candidates cannot directly modify starter payload.
- Candidate dry-run produces a report before validation.
- Candidate validation must include contamination, clean export, copied-starter smoke, generated residue, sensitive evidence, and root-history checks.
- `approval-needed` means "ready for Human decision"; it is not approval, promotion, release, or publish.

### 6.6 Wiki / Long-Memory Linkage
- Friction and accepted proposals may create wiki proposal candidates or long-memory update candidates.
- PKT-10 must not apply wiki memory directly.
- Wiki/long-memory linkage must preserve evidence references, authority labels, redaction status, and proposal disposition.
- Sensitive evidence, raw logs, root history, generated state, or project-specific packet evidence must not be copied into wiki or long-memory context.

### 6.7 Metrics
- Metrics must summarize:
  - friction signal counts by type/severity/source
  - recurring group counts and promotion eligibility
  - proposal counts by lifecycle state
  - promotion candidate counts by lifecycle state
  - blocked promotion reasons
  - safety-gate failure counts
- Metrics are operational evidence only. They cannot approve promotion, release, residual risk, Ready For Code, or closeout.

### 6.5 Promotion Safety Gates
Promotion candidate validation must block when any of these are missing or failing:
- evidence manifest
- dry-run report
- contamination check
- clean-export validation
- copied-starter smoke validation
- sensitive evidence redaction/no-leak proof
- root history / project-specific history no-leak proof
- generated residue no-leak proof
- Human approval boundary

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A repeated friction pattern is captured from validation/review/PM/closeout; detector groups it; an improvement proposal is reviewed and accepted; a starter-promotion candidate is created; dry-run and validation prove safety; the candidate stops at `approval-needed` for Human decision.
- API contract: self-improvement surfaces must expose friction signals, recurring groups, improvement proposals, promotion candidates, evidence manifests, dry-run reports, validation results, and approval-needed status without executing promotion.
- Component responsibility: self_improvement owns signals/groups/proposals/candidates; validation owns safety gates; starter integrity owns contamination/clean-export checks; PM/closeout/review/validator hooks may emit signals; approval service or future promotion command owns later Human-approved execution out of scope.
- Allowed dependency direction: PM/review/validation/closeout may append friction signals through a bounded service; promotion candidates may read accepted proposals and evidence manifests; no candidate may mutate starter directly.
- Data ownership: structured registries and evidence manifests are authority for friction/proposal state. Human approval records remain separate authority for later promotion.
- Public contract vs internal/scratch field: schemas/lifecycles/CLI outputs are starter public contract; root PKT-10 reports are development evidence only.
- Promoted modeling artifact: update starter schemas/policies/services/tests if implementation confirms durable shape.
- Changed-file / classification evidence: expected under `starter/standard-harness/_harness/system/standard_harness/self_improvement/**`, `_harness/schemas/**`, `_harness/policies/**`, `_harness/system/standard_harness/validation/**`, `_harness/system/standard_harness/starter/**`, CLI surfaces, and tests.
- Field consolidation note: this packet closes Wave 9 and SHV2-REQ-016 without merging actual promotion execution into this packet.

## 7. Data / Source Impact
- Layer classification: core
- Core / profile / project boundary rationale: self-improvement and promotion readiness are reusable starter core.
- Active profile dependencies: none
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `reference/packets/PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE.md`; this packet; relevant existing starter self_improvement, validation, starter integrity, PM, review, closeout, and CLI modules.
- Source environment: local repository
- Target environment: starter payload
- Execution target: starter self-improvement schemas/services/validators/CLI/tests
- Transfer boundary: no release, publish, rollout, or actual promotion
- Rollback boundary: revert PKT-10 self-improvement/promotion-readiness files inside packet scope
- Domain foundation reference: Architecture Guide self-improvement component and `_ops` friction ownership
- System context reference: `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- System boundary impact: yes; self-improvement lifecycle and promotion-readiness safety gates
- Schema impact classification: high
- DB / state impact: possible starter structured records or event-store entities for signals, proposals, and candidates; implementation must record exact persistence scope before closeout.
- Markdown / docs impact: packet evidence and closure matrix only; avoid extra human-facing docs unless required by validator or operator command output.
- Documentation impact: update-required if CLI/operator commands or schema contracts change.
- generated docs impact: regenerate Active Context after state transitions only.
- validator / cutover impact: yes; validator must reject unsafe promotion candidates and file-existence-only evidence.
- Harness/product boundary exceptions: root docs/tests may change only to plan, validate, or evidence starter v2.0 behavior.
- Authoritative source refs: Human Owner current instruction and attached GPT draft as planning input; Requirements `SHV2-REQ-016`, `SHV2-REQ-018`, `SHV2-REQ-021`, `SHV2-REQ-023`, `SHV2-REQ-042`, `SHV2-REQ-045`, `SHV2-REQ-046`; Implementation Plan Wave 9 / PKT-10; Architecture Guide self-improvement and starter-promotion boundaries; PKT-09A closeout.
- Authoritative source intake reference: current Human instruction; attached GPT PKT-10 draft; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `reference/packets/PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE.md`.
- Authoritative source disposition: accepted for packet planning after Planner reconciliation; GPT draft is not implementation authority by itself.
- Existing plan conflict: none. PKT-09A is closed; PKT-10 is next in the packet roadmap.
- Current implementation impact: expected to add or harden starter self_improvement schemas/services/validators/CLI/tests and planning evidence; actual promotion execution is deferred.
- Impacted packet set scope: PKT-10 only; PKT-09A remains closed and actual future promotion/release work requires a separate packet or approval boundary.
- Required rework / defer rationale: actual promotion execution and release remain deferred to later explicit Human approval.

## Context Impact Classification
- Domain context: update-required
- System context: update-required
- Architecture: update-required
- Project history: milestone when closed
- Preventive memory: optional, only if implementation uncovers repeated preventable friction
- Context read level: cited sections plus directly changed modules
- Context classification note: use structured registries/indexes before raw evidence; do not load all prior packet evidence by default.

## Development Documentation Impact
- Project overview impact: none
- Setup/dev environment impact: none expected
- Architecture doc impact: update-required
- Domain doc impact: contract-required through schemas/policies
- API/interface doc impact: contract-required if CLI output changes
- Database/data model doc impact: update-required if event-store schema changes
- Module guide impact: update-required if new self_improvement modules are introduced
- Testing doc impact: update-required through test evidence
- Deploy/operations doc impact: none
- History/decision doc impact: milestone at closeout
- Security/permission doc impact: review-required for sensitive evidence and root-history no-leak gates
- AI/automation doc impact: update-required if auto signal hooks are added
- Docs must be updated before implementation: no
- Docs must be updated before closeout: yes, if implementation changes public command/schema behavior

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
|---|---|---|---|
| Friction signal schema/registry | Starter schema, service tests, validator diagnostics, runtime/service capture hooks | planned | Developer / Tester |
| Recurring detector | Detector tests, proposal eligibility fixtures, token-overuse/boundary-violation grouping | planned | Developer / Tester |
| Improvement proposal lifecycle | Registry/service tests and negative lifecycle tests | planned | Developer / Tester |
| Starter-promotion candidate lifecycle | Candidate registry, dry-run, validation, no-direct-mutation tests | planned | Developer / Tester |
| Promotion safety gates | Contamination, clean-export, copied-starter smoke, sensitive/root-history/generated-residue tests | planned | Developer / Tester / Reviewer |
| Wiki / long-memory linkage | Wiki proposal candidate or memory-update candidate tests with no direct apply and no sensitive copying | planned | Developer / Tester / Reviewer |
| Metrics | Signal/group/proposal/candidate metrics tests and blocked-promotion reason coverage | planned | Developer / Tester |
| SHV2-REQ-016 closure | Closure evidence and requirement closure matrix | planned | Developer / Reviewer / Planner |

## 8. Acceptance
### 8.1 Friction Signal
- Friction signal schema and registry exist.
- Signals can be recorded from validation failure, warning-only validation pass, review, PM/report, closeout, token-overuse, and boundary-violation surfaces through enforced runtime/service entrypoints.
- Manual-only or documentation-only entrypoints fail PKT-10 acceptance.
- Signal records include source, type, severity, recurrence key, evidence reference, suggested route, authority boundary, and redaction/sensitive-evidence status.
- Signals preserve evidence references and do not copy sensitive raw evidence into starter, wiki, handoff, or LLM context.

### 8.2 Recurring Detection
- Detector groups repeated friction by stable recurrence key and type.
- Detector reports recurrence count, evidence completeness, affected surfaces, and proposal eligibility.
- A single unverified signal cannot become a starter-promotion candidate.
- Negative tests prove repeated friction without evidence remains non-promotable.

### 8.3 Improvement Proposal
- Proposal lifecycle exists and enforces `proposed -> reviewed -> accepted | deferred | rejected`.
- Proposal creation requires at least one signal or recurring group.
- Accepted proposals can create promotion candidates; deferred/rejected proposals cannot.
- Proposal records include problem, evidence, impact, risk, verification method, and review disposition.
- Accepted proposals can create wiki proposal / long-memory update candidates, but cannot directly apply wiki memory.

### 8.4 Starter-Promotion Candidate
- Candidate lifecycle exists and enforces `candidate -> dry-run -> validation -> approval-needed`.
- Candidate creation requires accepted proposal plus evidence manifest.
- Candidate cannot directly mutate starter payload.
- Dry-run is required before validation.
- Copied-starter smoke validation is required before `approval-needed`.
- Clean-export validation and contamination check are required.
- Sensitive evidence, root history, project-specific history, generated state, caches, and residue leakage are blocked.
- `approval-needed` is clearly not approval, release, publish, closeout, or residual-risk acceptance.

### 8.5 Wiki / Long-Memory And Metrics
- Accepted friction/proposal outcomes can produce wiki proposal candidates or long-memory update candidates with evidence references and authority labels.
- Direct wiki apply is blocked in PKT-10 scope.
- Sensitive evidence, raw root history, generated state, and project-specific packet evidence are blocked from wiki/long-memory candidate content.
- Metrics report signal, recurring group, proposal, promotion-candidate, blocked-promotion, and safety-gate failure counts.
- Metrics are explicitly non-authoritative for approval.

### 8.6 Requirement Closure And Roadmap
- SHV2-REQ-016 closure evidence exists and cites behavior tests, safety gates, and validation evidence.
- Requirement closure matrix is updated for PKT-10 scope.
- Implementation Plan Current Iteration stale statuses are either corrected or captured as named follow-up items.
- PKT-05/06/07/08/09/09A closeout statuses are checked for roadmap consistency.
- A follow-up item records that "v2.0 total completion rate" must be produced as a requirement coverage report, not a conversational percentage.
- No SHV2-REQ-016 closure claim is allowed if token-overuse capture, boundary-violation capture, metrics, or wiki/long-memory candidate linkage is missing without a named Planner-approved deferral.

## 9. Verification Plan
- Gate profile: contract
- Packet type: harness-system
- Packet type overlay note: starter-promotion safety gates are required because the packet qualifies promotion candidates, but actual promotion execution is out of scope.
- Risk class: high
- Route class: packet-path
- Change zone: core
- Delivery route mode: orchestrated-closeout
- Orchestration completion expectation: after Ready For Code, Orchestrator routes Developer, Tester, Reviewer, bounded remediation, and Planner closeout.
- Derived risk class: high
- Effective risk class: high
- Risk classification rationale: core self-improvement, validator, evidence, and starter-promotion readiness behavior.
- Critical human confirmation: actual starter promotion, release, publish, rollout, and residual-risk acceptance remain out of scope and require later explicit Human approval.
- Post-transition refresh: run `npm run harness:sync-state` after state-changing transitions or closeout.
- Verification manifest:
  - Ready For Code: approved
  - root: packet preflight, validation, root tests affected by packet/validator changes
  - starter: friction signal tests, recurring detector tests, proposal lifecycle tests, candidate lifecycle tests, dry-run tests, contamination/clean-export/copied-starter smoke tests, sensitive/root-history/generated-residue negative tests, wiki/long-memory candidate tests, metrics tests
  - targeted: single friction cannot promote; missing evidence manifest blocks candidate; deferred/rejected proposal cannot promote; candidate direct mutation blocked; dry-run missing blocks validation; copied-starter smoke missing blocks approval-needed; warning-only validation pass can record friction without failing validation; token overuse and boundary violation record friction; documentation-only entrypoint fails; direct wiki apply fails; metrics cannot approve
  - validator: strict harness validator pass
  - active context: regenerated after transition/closeout
  - packet doc review: independent packet_doc_review pass required before Ready For Code
  - review closeout: four independent closeout lenses because this is high/core/contract/starter-promotion-related work
- Harness validation note: validator pass is not behavior proof; cite targeted lifecycle and copied-starter smoke tests separately.

## Verification Scenarios
- Normal: two validation warning signals share a recurrence key; detector groups them; proposal is reviewed and accepted; candidate is created with evidence manifest; dry-run and validation pass; candidate reaches approval-needed without modifying starter.
- Error: candidate is requested from a single unverified signal; system blocks with non-promotable diagnostic.
- Error: accepted proposal lacks evidence manifest; candidate creation blocks.
- Error: dry-run missing; validation stage blocks.
- Error: copied-starter smoke missing; approval-needed blocks.
- Security: sensitive evidence is referenced but not copied; candidate blocks if raw secret or root evidence body would be promoted.
- Boundary: candidate cannot mutate starter directly or publish/release.
- Memory: accepted proposal can create a wiki proposal candidate, but direct wiki apply fails.
- Metrics: metrics summarize candidate state but cannot move a candidate to approval-needed.
- Regression: existing PKT-09A skill package behavior and existing clean starter validation remain intact.

## Verification Manifest
- Ready For Code: approved
- root: packet preflight, validation, and root tests affected by packet/validator changes
- standard-template: starter self-improvement, promotion-candidate, safety-gate, and clean copied-starter validation are required because this packet changes reusable starter behavior
- starter: friction signal tests, recurring detector tests, proposal lifecycle tests, candidate lifecycle tests, dry-run tests, contamination/clean-export/copied-starter smoke tests, sensitive/root-history/generated-residue negative tests, wiki/long-memory candidate tests, metrics tests
- targeted: single friction cannot promote; missing evidence manifest blocks candidate; deferred/rejected proposal cannot promote; candidate direct mutation blocked; dry-run missing blocks validation; copied-starter smoke missing blocks approval-needed; warning-only validation pass can record friction without failing validation; token overuse and boundary violation record friction; documentation-only entrypoint fails; direct wiki apply fails; metrics cannot approve
- validator: strict harness validator pass
- active context: regenerated after transition/closeout
- packet doc review: independent packet_doc_review pass
- review closeout: four independent closeout lenses because this is high/core/contract/starter-promotion-related work

## TDD Evidence Contract
- TDD mode: required
- Red test file: expected `starter/standard-harness/_harness/test/test_compound_feedback_promotion.py` or equivalent focused test file
- Red command: `python -m unittest starter\standard-harness\_harness\test\test_compound_feedback_promotion.py`
- Red exit code: expected nonzero before implementation
- Red failure kind: expected-contract-failure
- Red ran at: 2026-06-29
- Red output excerpt: expected-contract-failure before implementation; `MINIMUM_CAPTURE_SURFACES` import failed before PKT-10 code existed.
- Red output artifact: `reference/reports/tdd/PKT-10-red.md`
- Green command: same focused command plus starter discovery after implementation
- Green exit code: 0
- Green ran at: 2026-06-29
- Green output artifact: `reference/reports/tdd/PKT-10-green.md`
- Refactor verified: yes
- Behavior-level test: required
- Test-only production hook: no

## CSO Security Review
- Security review evidence status: required
- Security review evidence scope: sensitive evidence no-leak, root history no-leak, generated residue no-leak, promotion candidate no-direct-mutation, approval-needed boundary
- Security review report path: `reference/reports/security/PKT-10-security-review.json`
- Security review decision: pass
- Security review mode: scoped
- Required CSO phases: 0,1,12,13,14
- Accepted-risk authority: Human Owner
- Redaction status: required if any sensitive evidence fixture is used
- Declared security/release paths: promotion candidate safety gates and no-release boundary

## Parallel Execution Plan
- Parallel batch plan path: not-needed
- File-overlap policy: serial_downgrade unless Orchestrator records disjoint worker ownership.
- Merge-after-test evidence: required if parallel implementation is used.
- Cleanup evidence: required for temporary copied-starter smoke directories.

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: recommended
- challenge_review status: pass; evidence `reference/reports/review/PKT-10-independent-closeout-lenses.md`
- adversarial_security_review status: pass; evidence `reference/reports/review/PKT-10-independent-closeout-lenses.md`
- code_quality_review status: pass; evidence `reference/reports/review/PKT-10-independent-closeout-lenses.md`
- evidence_review status: pass; evidence `reference/reports/review/PKT-10-independent-closeout-lenses.md`
- N/A rationale: not applicable; high/core/contract/starter-promotion-related work requires all four lenses.

## Planner Packet Challenge Review
- Challenge reviewer: Volta, independent explorer subagent `019f1360-1bf9-72f3-b89f-013f5bc60cbf`
- Challenge reviewer independence basis: read-only independent subagent; not packet author, Developer, Tester, Orchestrator, generated summary, or main-session self-review; did not edit files or approve Ready For Code
- Source refs reviewed: `reference/packets/PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION.md`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `.agents/workflows/reviewer.md`; `reference/packets/PKT-09A_EXECUTABLE_SKILL_PACKAGES_AND_DUAL_PROVIDER_SKILL_USE.md`
- Challenge status: pass
- Parent objective coverage: pass; PKT-10 now covers Wave 9 / SHV2-REQ-016 friction signals, recurring groups, improvement proposals, starter-promotion candidates, token-overuse and boundary-violation capture, wiki/long-memory candidate linkage, and metrics.
- Deferred scope with named follow-up: actual starter promotion execution is deferred to `PKT-10-FUP-PROMOTION_EXECUTION` if Human Owner later approves real promotion; release/publish is deferred to `PKT-10-FUP_RELEASE_PUBLISH` or a release packet; v2.0 total completion-rate reporting is deferred to `PKT-10-FUP_REQUIREMENT_COVERAGE_REPORT` owned by Planner/PM after PKT-10 closeout.
- Acceptance proves behavior change: planned; acceptance requires lifecycle enforcement and negative tests, not file existence.
- Failure fixture or failure condition: single unverified friction cannot create promotion candidate; missing evidence manifest blocks candidate; dry-run missing blocks validation; copied-starter smoke missing blocks approval-needed; candidate direct mutation blocks.
- Reviewer closeout hold basis: hold if implementation records friction only as prose, allows file-existence-only evidence, allows direct starter mutation, reaches approval-needed without copied-starter smoke, leaks root/sensitive/generated state, or treats approval-needed as approval.
- First-wave limit check: not first-wave objective avoidance; this is the planned Wave 9/PKT-10 owner after PKT-09A closeout.
- Guidance-only sufficiency rationale: guidance-only is not sufficient; schema/service/validator/CLI/tests are required.
- Challenge evidence artifact path: reference/reports/review/PKT-10-planner-challenge-review.md
- Findings disposition: initial challenge review failed with three findings; Planner corrected parent coverage, runtime-enforcement, and deferred ownership gaps; re-review passed with no remaining findings.
- Required corrections applied: applied
- No self-approval claim: independent reviewer is not the packet author; this is not packet-author self-approval and does not approve implementation, Ready For Code, or closeout.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: Aristotle, independent explorer subagent `019f1360-5326-7fe1-a5a6-ddb816954a6a`
- Packet doc reviewer independence basis: read-only independent subagent; not packet author, Developer, Tester, Orchestrator, generated summary, or main-session self-review; did not edit files or approve Ready For Code
- Packet doc review evidence path: reference/reports/review/PKT-10-packet-doc-review.md
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass; packet now covers SHV2-REQ-016 including wiki/long-memory linkage, token-overuse, boundary-violation, metrics, and starter-promotion safety.
- Implementation-plan sequencing alignment: pass; PKT-10 is the Wave 9 packet after PKT-09A closeout.
- Architecture/source SSOT alignment: pass; self_improvement ownership, starter-promotion safety, no direct wiki apply, and no root-history promotion are preserved.
- Human/Planner intent preservation: pass; GPT draft is treated as planning input and actual promotion/release remains outside PKT-10.
- v1.0 root-harness operating constraint coverage: pass; root history, generated state, provider-specific identity, and raw evidence are not promoted.
- v2.0 product philosophy coverage: pass; structured records, evidence references, human approval boundaries, and provider-neutral starter identity are preserved.
- Acceptance strength: pass; acceptance requires lifecycle enforcement, runtime/service capture, copied-starter smoke, safety gates, and negative tests.
- Verification scope strength: pass; verification covers signal/group/proposal/candidate lifecycle, wiki/memory, metrics, no direct mutation, no raw evidence leakage, and approval-needed boundary.
- Deferred/out-of-scope ownership: pass; actual promotion, release/publish, and requirement coverage reporting have named follow-up items and owners.
- Required corrections: wiki/long-memory linkage, runtime capture surface minimums, token-overuse/boundary-violation coverage, metrics, and named follow-ups were added.
- Findings disposition: initial packet_doc_review failed with two findings; all corrections applied and re-review passed with no remaining findings.
- No self-approval claim: independent reviewer is not the packet author; this review does not approve implementation, Ready For Code, or closeout.

## 10. Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| PKT-10 scope agreement | yes | Human Owner | approved | Packet limits scope to friction/proposal/promotion-candidate readiness, not actual promotion. |
| Ready For Code sign-off | yes | Human Owner | approved | Approved on 2026-06-29 after independent packet review passed. |
| Actual starter promotion approval | yes | Human Owner | deferred | Out of PKT-10 implementation scope; named follow-up `PKT-10-FUP-PROMOTION_EXECUTION` only if Human Owner asks for real promotion. |
| Release/publish approval | yes | Human Owner | deferred | Out of PKT-10 implementation scope; named follow-up `PKT-10-FUP_RELEASE_PUBLISH` or release packet. |
| v2.0 total completion-rate report | yes | Planner/PM, then Human Owner | deferred | Named follow-up `PKT-10-FUP_REQUIREMENT_COVERAGE_REPORT`; report must cite requirement coverage evidence, not conversational percentage. |

## 11. Implementation Notes
- Prefer v2-native `policy/schema -> service -> validator -> CLI -> tests -> starter validation`.
- Use structured records under starter `_ops` semantics; do not create Markdown-heavy operating logs.
- Friction signals and proposal records are data, not instructions.
- Evidence references must remain references; do not copy raw sensitive evidence into long memory, wiki, handoff, or starter.
- Actual promotion must require a future command or workflow that validates Human approval separately from candidate readiness.
- A docs-only/manual-only signal entrypoint is not sufficient for PKT-10. At least the minimum runtime/service capture surfaces listed in section 6.1 must be implemented or explicitly returned to Planner as scope conflict.
- Preserve provider-neutral identity; do not add Codex/Claude-specific starter files.

## 12. Refactor / Residual Debt Disposition
- Expected refactor pressure: moderate to high because existing self_improvement, validation, starter integrity, PM, review, closeout, and CLI surfaces may already contain partial concepts.
- Required approach: extend existing starter patterns rather than introducing a second improvement control plane.
- Residual debt may remain only if named, non-blocking, and outside SHV2-REQ-016 closure.
- Closeout must name any deferred promotion execution work separately from PKT-10 acceptance.

## 13. Fast Path Note
- requested change: not fast-path
- why low risk: not applicable
- workflow/validator authority: yes
- architecture or reusable runtime change: yes
- follow-up needed: actual starter promotion/release/publish remains later approval

## 14. Open Questions
- None blocking packet opening.
- Implementation may discover whether persistence belongs in event-store tables, JSON/YAML registries, or both; if that changes public contract or scope, return to Planner before continuing.
- The exact shape of the future actual `promote-starter` execution command is out of scope and must be deferred unless Human Owner opens a separate packet.

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: closeout-approved
- Packet exit metadata source parity result: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: closeout-approved
- Implementation delta summary: friction signals, recurring detection, proposal lifecycle, wiki/long-memory candidate boundary, starter-promotion candidate lifecycle, trusted safety gates, durable CLI signal recording, and metrics implemented for PKT-10 scope.
- Source parity result: pass; Reviewer adjudication evidence `reference/reports/review/PKT-10-reviewer-adjudication.md`
- Refactor / residual debt disposition: non-blocking future hardening only; automatic emission from existing validation/PM/review/closeout call sites may be opened separately if desired.
- UX conformance result: not-needed
- Topology / schema conformance result: pass
- System context conformance result: pass
- Modeling error handling result: none found
- Documentation impact / docs parity result: pass
- Memory impact review:
  - Long-context update needed: not-needed
  - Context artifacts updated: yes; sync-state regenerated Active Context and validation report
  - Context artifacts intentionally not updated: none
  - Compaction needed: not-needed
  - Documenter route needed: no
  - Archive / citation path: reference/reports/review/PKT-10-orchestrator-closeout-package.md
  - Closeout hold: none
  - Validation / security / cleanup evidence: pass
- Deferred follow-up item: `PKT-10-FUP-PROMOTION_EXECUTION`, `PKT-10-FUP_RELEASE_PUBLISH`, and `PKT-10-FUP_REQUIREMENT_COVERAGE_REPORT`
- Improvement candidate reference: PKT-10 compound feedback loop
- Proposed target layer: starter core
- Promotion status / linked follow-up item: approval-needed candidates only; actual promotion deferred
- Closeout notes: Human Owner approved closeout on 2026-06-29. PKT-10 closes only compound feedback and starter-promotion candidate readiness through `approval-needed`; actual starter promotion, release, publish, rollout, and superpowers deletion remain out of scope.

## 16. Reopen Trigger
- Reopen if Human Owner wants PKT-10 to execute actual starter promotion instead of stopping at approval-needed.
- Reopen if implementation discovers that promotion candidates must mutate starter directly.
- Reopen if evidence manifests cannot prove behavior without raw sensitive evidence copying.
- Reopen if copied-starter smoke cannot be made deterministic within this packet.
- Reopen if self_improvement persistence scope changes public architecture beyond this packet.
- Reopen if packet_doc_review finds acceptance too broad or promotion safety unprovable.
