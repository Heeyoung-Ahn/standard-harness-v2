# PKT-09 Skill Routing And Operator Ergonomics

This is a Planner-opened packet for the next v2.0 starter skill-routing wave. It turns
the Human Owner's PKT-09 direction into an implementation boundary: the v2.0 starter
must use the proven v1.0 `.agents/skills` surface as the primary source for starter
skill contracts, absorb the useful operating patterns from the external superpowers
plugin into provider-neutral harness contracts, and keep superpowers as an optional
comparison source rather than a required starter dependency.

This packet is **Ready For Code**. The Human Owner approved Ready For Code in this
Codex thread on 2026-06-29 after independent packet-document review passed.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root files may change only when the change supports starter v2.0 implementation, validation, or operation.
- v2.0 philosophy parity gate: this packet must preserve provider-neutral product identity, packet-before-code discipline, evidence-backed completion, compact human review surfaces, structured operating state, clean starter portability, and automatic skill use without making any external plugin a starter dependency.
- Gate status: Ready For Code approved; implementation-transition preflight required before Developer work.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS | Build the starter skill contract/router/validator plan from proven v1.0 skills and selected superpowers patterns. | selected |
| Ready For Code | approved | Human Owner explicitly approved PKT-09 Ready For Code in this Codex thread on 2026-06-29. | closed |
| Human sync needed | no | Ready For Code is approved; later closeout, release, superpowers deletion, and starter promotion approvals remain separate. | closed |
| Packet type | harness-system | Skill routing, hard gates, and skill-use evidence are reusable harness operating behavior. | selected |
| Risk level | high | Incorrect routing can skip planning, debugging, review, verification, or security process skills and weaken hard stops. | selected |
| Gate profile | contract | This packet defines starter skill contracts, router behavior, validator gates, and removal criteria for external skill dependency. | selected |
| Route class | packet-path | Requires implementation, tests, review, and closeout evidence before claims. | selected |
| Change zone | core | Skill routing and process gates are core operating surfaces. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code approval, route Developer, Tester, Reviewer, remediation, and Planner closeout through Orchestrator. | selected |
| User-facing impact | low | Human Owner sees better automatic skill selection and clearer evidence; no browser UI is added. | selected |
| Layer classification | core | This is reusable starter behavior, not project-specific customization. | selected |
| Active profile dependencies | none | No optional product profile is required. | closed |
| Profile evidence status | not-needed | No profile-specific evidence is required. | closed |
| UX archetype status | approved | No browser UI or visual workflow is in scope; the approved human-facing surface is CLI/service diagnostics and evidence records. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | approved | Local root/starter validation and focused tests are sufficient; no deployment topology changes. | closed |
| Domain foundation status | approved | Domain is skill catalog, routing, hard gates, evidence ledger, and operator ergonomics. | selected |
| Authoritative source intake status | approved | Human Owner provided PKT-09 design direction in this session. | selected |
| Shared-source wave status | not-needed | No sibling-project rollout is in scope. | closed |
| Packet exit gate status | pending | Exit gate remains pending until implementation, tests, review, and Human/Planner closeout evidence exist. | pending |
| Existing system dependency | internal | Depends on root `.agents/skills`, starter `_harness` skill/router/policy surfaces, gate profiles, and validation/preflight behavior. | selected |
| New authoritative source impact | analyzed | User clarified v1 skills are priority source, superpowers is absorption candidate only, and deletion requires explicit equivalence evidence. | selected |
| Risk if started now | high | Starting without packet review could overfit to superpowers, copy external dependency assumptions, or weaken existing v1 skill requirements. | selected |
| Packet doc review status | pass | Independent packet_doc_review initially found stale challenge metadata; Planner corrected it and independent re-review passed. | closed |

## Gate Profile Metadata
| Field | Value |
| --- | --- |
| Gate profile version | `harness-system@contract/v1` |
| Computed risk floor | high |
| Required gates | packet-doc-review; implementation-transition preflight; v1 skill catalog inventory; superpowers source-disposition record; skill-contract schema tests; router trigger tests; Wave 8 skill-flow coverage tests; process-skill priority tests; hard-gate validator tests; skill chaining tests; skill-use ledger tests; context-budget tests; root validation; starter validation; closeout preflight |
| Approved N/A gates | browser evidence; deployment topology; release/publish; starter promotion; mandatory superpowers plugin dependency; real provider CLI execution |
| Packet-doc review requirement | mandatory before implementation transition; independent reviewer must check user intent preservation, v1 skill priority, superpowers optional-source boundary, acceptance strength, and deletion criteria. |
| Closeout lens requirement | PKT-09 itself is high/core/contract harness-system work and must close through all four independent closeout lenses: `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`. |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Gate Profile Metadata; Problem Statement; Source Priority Model; Superpowers Absorption Model; Deletion Criteria; Modeling Impact; Decision Gates; Acceptance Criteria; Verification Scenarios; Feature Artifact Sync Matrix; Planner Packet Challenge Review; Packet Document Review.
- Lane-type conditional sections: Security Review Request; TDD Evidence Contract; Development Documentation Impact.
- Lane-type not-needed sections: browser UI; deployment topology; release packaging; starter promotion; provider CLI execution.
- Planner packet challenge required: yes
- Work item title: Skill Routing And Operator Ergonomics
- Parent objective: Make the starter usable in real projects without requiring the Human Owner or Conductor to remember every skill name, while keeping process gates and provider-neutral operation enforceable.
- Scope boundary: starter skill contract design, v1 skill catalog intake, superpowers pattern absorption, automatic skill routing, process-skill priority, hard gate validation, skill chaining, and skill-use evidence ledger.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `.agents/workflows/reviewer.md`; root `.agents/skills/*/SKILL.md`; existing starter skill/router/policy modules; external superpowers skill references for trigger phrasing and process-gate patterns only.
- UX archetype reference: not-needed; no browser UI, visual flow, or interactive application surface is implemented by this packet.
- Selected UX archetype: not-needed
- Archetype fit rationale: human-facing impact is through command diagnostics, routing behavior, and evidence records rather than UI layout.
- Environment topology reference: local-root-and-starter-validation-boundary
- Source environment: local development repository and clean starter payload under `starter/standard-harness/`.
- Target environment: same local repository and starter payload; no deployment or external environment transfer is in scope.
- Execution target: root and starter skill catalog/router/validator/evidence-ledger behavior.
- Transfer boundary: no cloud, release, external provider, or plugin marketplace transfer; only packet-scoped root/starter files and evidence records change.
- Rollback boundary: revert packet-scoped root/starter runtime, policy, documentation, test, and evidence changes.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md#requirement-baseline`; `.agents/artifacts/IMPLEMENTATION_PLAN.md#wave-8-skill-routing-and-operator-ergonomics`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md#skill-routing-audit`
- Authoritative source intake reference: Human Owner PKT-09 direction in this Codex thread on 2026-06-29.
- Authoritative source disposition: accepted for packet planning; implementation must preserve v1 skill priority, superpowers optional-source boundary, and deletion deferral.
- Impacted packet set scope: PKT-09 owns Wave 8 skill-routing/operator-ergonomics flows only; PKT-10/Wave 9 owns SHV2-REQ-016 compound feedback and starter-promotion candidates; later cleanup owns any superpowers removal decision.
- Architecture: update-required
- Schema impact classification: high
- Schema impact note: starter skill contract, route result, hard gate diagnostics, chaining, and skill-use ledger records may require schema or policy changes.
- Current implementation impact: Ready For Code approved; implementation may proceed only within this packet through Orchestrator routing.
- Existing plan conflict: Implementation Plan names PKT-09 as Skill Routing And Operator Ergonomics with standard risk; this packet escalates effective risk to high because the Human Owner added hard-gate validator and external dependency removal criteria.

## Problem Statement
The v2.0 starter already has a packet, gate, evidence, and review backbone, but copied
projects still need an ergonomic way to select and apply task-specific skills. The Human
Owner should not need to remember exact skill names such as `day_wrap_up`,
`memory-search`, `feature-artifact-sync`, `security-review`, `dependency-audit`,
`operator-support`, or `requirements_deep_interview` before the harness can use them.

At the same time, PKT-09 must avoid two failure modes:
- treating the external superpowers plugin as a required v2.0 starter dependency; and
- copying only the vocabulary of superpowers while losing the useful behavior: intent
  based triggers, process skills before implementation, hard gates, skill chaining, and
  evidence of skill use or omission.

## Source Priority Model
| Source | Priority | Disposition |
| --- | --- | --- |
| Current root `.agents/skills/*/SKILL.md` | P0 primary source | Use as the baseline `v1_skill_catalog` because these skills reflect this project's tested operating requirements. |
| `reference/skills-src/*` | P0 generation source where present | Preserve generated-file boundary; edit source templates when the active skill is generated. |
| Existing starter `_harness` skill/router/policy code | P0 implementation surface | Extend provider-neutral starter runtime behavior; do not add starter `AGENTS.md`. |
| Requirements / Implementation Plan / Operating Contract | P0 authority source | Control scope, authority, hard stops, and evidence requirements. |
| External superpowers skills | P1 comparison and absorption source | Absorb patterns into provider-neutral contracts; do not make the plugin mandatory. |
| Provider-specific app or CLI behavior | P2 examples only | May be examples or tests, not product identity or hard dependency. |

The initial `v1_skill_catalog` must cover at least these current root skills:
`adversarial_review`, `architecture_design`, `code_review_checklist`,
`compound-learning`, `conflict_resolver`, `day_start`, `day_wrap_up`,
`dependency_audit`, `destructive-command-guard`, `epic_story_decompose`,
`executing-plans`, `feature-artifact-sync`, `forensic_investigation`,
`frontend_design`, `general_publish`, `github_deploy`, `korean-artifact-utf8-guard`,
`memory-search`, `operating-common-rollout`, `operator-support`,
`receiving-code-review`, `requesting-code-review`, `requirements_deep_interview`,
`retrospective`, `security-review`, `subagent-driven-development`,
`verification-before-completion`, `version_closeout`, and `writing-plans`.

## Superpowers Absorption Model
PKT-09 must explicitly absorb the following patterns when they fit the v2.0 operating
contract:
- Skill descriptions use trigger-centered `Use when ...` wording.
- Skills may auto-activate by intent, workflow, packet route, risk surface, or current gate, even when the user does not name the skill.
- Process skills take priority before implementation when the task involves planning, debugging, review, verification, security, dependency, destructive action, or closeout.
- Hard gates are validator-enforced where practical:
  - no implementation before planning/design boundary is closed;
  - no completion claim before fresh verification evidence;
  - no fix before root-cause investigation for debugging/test-failure work;
  - no review finding acceptance without technical verification and disposition.
- Skills can declare required sub-skills or next skills, but chaining must be bounded and explicit.
- Skill use, skipped candidate skills, exclusion rationale, and evidence path are recorded in a ledger.

The superpowers plugin itself remains an optional external source. The starter must work
without it.

## Superpowers Deletion / Removal Criteria
Do not remove or stop referencing superpowers immediately. A later cleanup may remove the
plugin dependency only after all of these are true:
- v1.0 skills plus absorbed superpowers patterns are represented in the v2.0 starter skill contract, router, validator, and evidence ledger.
- Automatic skill selection tests pass for planning, debugging, review, verification, security, dependency, operator-support, memory-search, and day-wrap-up scenarios.
- Validator tests catch missing hard gates for planning-before-implementation, verification-before-completion, root-cause-before-fix, and review-finding disposition.
- Representative completion, debugging, planning, and review scenarios produce equivalent operating quality without loading the superpowers plugin.
- File and behavior validation proves there is no duplicate routing, contradictory instruction, or provider/plugin-required starter dependency.
- A packet-bound review report explicitly recommends removal or no-longer-required status, and Human Owner approves that removal separately.

## In Scope
- Define a starter skill contract based on `v1_skill_catalog`.
- Add or update skill catalog schema/policy so trigger descriptions, skill authority, process priority, required/next skill chaining, permission scope, fallback behavior, and evidence requirements are machine-checkable.
- Add or update automatic skill router behavior so intent can select skills even when the user does not name them.
- Cover every Wave 8 task-to-skill flow named in the Implementation Plan: planning, TDD, review, security, browser evidence, dependency audit, day start, day wrap-up, documenter, memory, and retrospective.
- Add process-skill priority rules: planning/debugging/review/verification/security/dependency/destructive/closeout skills must run before implementation when triggered.
- Add hard-gate diagnostics for missing required process skills and invalid completion/debugging/review claims.
- Add skill-use ledger records for selected skills, skipped candidate skills, exclusion rationale, evidence path, and authority boundary.
- Add starter/root tests for automatic selection, hard-gate blocking, chaining, ledger creation, context-budget safety, and no-superpowers-required behavior.
- Update relevant operating docs or architecture references so root/starter skill surfaces and external-source disposition are clear.

## Out Of Scope
- No deletion of superpowers in this packet.
- No mandatory dependency on superpowers, Codex-specific global skills, Claude-specific files, or provider-specific app surfaces.
- No creation of `starter/standard-harness/AGENTS.md` or other provider-specific starter entry contract.
- No implementation of PKT-10 compound feedback or starter promotion.
- No release, publish, package, or sibling-project rollout.
- No full multi-provider CLI execution beyond policy/validator implications.
- No weakening of packet-before-code, independent packet_doc_review, Tester/Reviewer separation, or Human approval boundaries.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A Human Owner or Conductor asks for work in natural language; the harness identifies required skills from intent/risk/route, runs process gates before implementation, records skill-use evidence, and blocks unsafe claims when required skills or verification evidence are missing.
- API contract: skill route output must expose selected skills, candidate skills, skipped skills with rationale, process-priority ordering, required/next skill chain, hard-gate diagnostics, evidence ledger path, and authority boundary.
- Component responsibility: skill catalog owns static contract; router owns intent-to-skill selection and ordering; validator owns hard-gate diagnostics; ledger owns evidence of use/skip; workflow contracts own authority boundaries.
- Data ownership: approved skill catalog, route decisions, validator diagnostics, packet evidence, command results, and review findings are authority. External plugin prose is comparison evidence only.
- Allowed dependency direction: router/validator may read skill catalog, packet metadata, workflow route, risk/gate profile, changed-file classification, and evidence ledger. Skill body text must not override packet, workflow, Reviewer, Tester, or Human approval authority.
- Changed-file / classification evidence: changed path evidence is expected for starter `_harness` skill catalog/router/validator/ledger surfaces, root packet-preflight or validation tests as needed, and operating docs (`.agents/artifacts/IMPLEMENTATION_PLAN.md`, `.agents/artifacts/ARCHITECTURE_GUIDE.md`, `.agents/rules/HARNESS_OPERATING_CONTRACT.md`); ownership-map evidence classifies these as core harness paths, and actual changed-file evidence must be refreshed at implementation and closeout with trusted git/path classification.
- Public contract vs internal/scratch field: trigger wording, route result fields, hard-gate diagnostics, and ledger records are public starter contracts. Internal matching heuristics and test fixture names are implementation details.
- Modeling risk: an over-eager router may invoke conflicting skills; an under-eager router may skip required process gates; external plugin coupling may break provider-neutral starter identity.
- Modeling disposition: fail closed for ambiguous hard gates, unsafe implementation-before-process signals, and contradictory skill routing.

## Decision Gates
| Decision | Selected Direction | Do Not Cross | Status |
| --- | --- | --- | --- |
| What is the primary skill source? | Current root `.agents/skills` as `v1_skill_catalog`. | Do not treat superpowers as the primary source. | closed |
| Is superpowers required in starter? | No. It is an optional external source and comparison baseline. | Do not add a mandatory plugin dependency. | closed |
| Can skills auto-activate without explicit skill names? | Yes, by intent, risk surface, route, and workflow context. | Do not require the Human Owner to know exact skill names. | closed |
| Which skills run first? | Process skills for planning/debugging/review/verification/security/dependency/destructive/closeout run before implementation when triggered. | Do not start implementation when a required process skill gate is open. | closed |
| How are hard gates enforced? | Validator diagnostics and tests, not prose alone. | Do not rely only on prompt text for hard stops. | closed |
| How is skill chaining handled? | Explicit required/next skill declarations with bounded depth and evidence. | Do not allow unbounded recursive skill loading. | closed |
| When can superpowers be removed? | Only after equivalence tests, no-conflict validation, review recommendation, and separate Human approval. | Do not delete it in PKT-09. | closed |

## Acceptance Criteria
- A `v1_skill_catalog` or equivalent starter skill-catalog artifact is built from current root `.agents/skills` and records source authority, generated/source-template boundary, trigger description, authority boundary, process priority, required/next skill chain, evidence contract, and fallback behavior.
- Trigger descriptions use a `Use when ...` style or an equivalent trigger-centered field that can be routed by intent.
- Router tests prove automatic selection for all Wave 8 flows: planning, TDD/test-plan support, review, security, browser evidence, dependency audit, day start, day wrap-up, documenter, memory, and retrospective.
- Router tests also prove automatic selection for the Human Owner's specifically named v1 skill priorities: `day_wrap_up`, `memory-search`, `feature-artifact-sync`, `security-review`, `dependency-audit`, `operator-support`, and `requirements_deep_interview`.
- Process-priority tests prove planning/debugging/review/verification skills are selected before implementation when triggered.
- Hard-gate validator tests block:
  - implementation before planning/design boundary;
  - completion claims before fresh verification evidence;
  - fixes before root-cause investigation for debugging/test-failure work;
  - unresolved review findings without technical disposition.
- Skill chaining tests prove required/next skill declarations are followed when applicable and bounded when a chain would recurse or conflict.
- Skill ledger tests prove selected skills, skipped candidate skills, exclusion rationale, evidence path, permission/authority boundary, and fallback behavior are recorded.
- No-superpowers-required tests prove the starter skill router and validators work without the superpowers plugin installed or referenced at runtime.
- Conflict tests prove duplicate routing or contradictory instruction between v1 skills and absorbed superpowers patterns is detected and reported.
- Root and starter validation pass after implementation.
- No starter contamination is introduced, including no `starter/standard-harness/AGENTS.md`.

## Verification Scenarios
| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| User asks for day wrap-up without naming skill | `day_wrap_up` route is selected and ledger records evidence/fallback boundary. | router test |
| User asks for day-start briefing without naming skill | `day_start` route is selected or a starter-equivalent day-start route is selected with ledger evidence. | router test |
| User asks for feature work that changes artifacts | `feature-artifact-sync` or equivalent artifact-drift process skill is selected before implementation. | process-priority test |
| User asks for a TDD-required implementation | TDD/test-plan support route is selected before implementation and records whether strict RED/GREEN evidence or an approved exception is required. | router and hard-gate test |
| User asks for browser-facing behavior | browser evidence route is selected or an explicit E2E/browser N/A gate is required before closeout. | router and N/A diagnostic test |
| User asks for documenter closeout or closeout report work | documenter route is selected after live implementation/test/review gates, not as an approval substitute. | router and authority-boundary test |
| User asks to preserve or query long memory | `memory-search` or equivalent memory route is selected with authority labels and evidence references. | router/context-budget test |
| Repeated friction or lesson candidate appears | `retrospective` or equivalent learning route is selected, while compound feedback/starter promotion remains deferred to PKT-10/Wave 9. | router and deferral test |
| User asks to debug a failing test | root-cause/debugging process gate blocks direct fix until investigation evidence exists. | hard-gate negative test |
| Agent claims completion without fresh verification | verification-before-completion gate blocks the claim. | validator negative test |
| Reviewer feedback arrives | receiving/review disposition skill route is selected before blindly applying changes. | router/chaining test |
| Skill requires a next skill | required/next skill chain is followed once and ledger records the chain. | chaining test |
| Chain conflicts or recurses | router blocks with actionable diagnostic. | negative test |
| Superpowers plugin absent | starter router tests still pass using v2-native contracts. | no-external-dependency test |
| Skill catalog contains duplicate or contradictory triggers | validator emits duplicate/conflict diagnostic. | catalog validation test |
| Starter validation | clean starter validation passes with no provider-specific entry files. | starter validation |

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Human Owner PKT-09 direction | This packet; Implementation Plan sequencing note if risk/status changes are promoted | packet planning in progress | Planner |
| Wave 8 task-to-skill flow coverage | PKT-09 acceptance and verification scenarios for planning, TDD, review, security, browser evidence, dependency audit, day start, day wrap-up, documenter, memory, and retrospective | corrected after independent challenge review | Planner |
| v1 skill priority source | skill catalog schema/policy; source inventory report; tests | planned | Developer/Tester |
| superpowers optional-source disposition | architecture/skill contract docs; source-disposition record; no-runtime-dependency test | planned | Developer/Reviewer |
| process-skill priority and hard gates | router, validator, tests, workflow contract references | planned | Developer/Tester/Reviewer |
| skill-use ledger | `_ops` evidence/ledger schema or equivalent starter operating record | planned | Developer/Tester |
| SHV2-REQ-016 compound feedback ownership | Implementation Plan coverage matrix and PKT-10 boundary | corrected to PKT-10/Wave 9 ownership | Planner |
| superpowers deletion criteria | packet acceptance and later cleanup follow-up | planned; deletion out of scope | Planner/Reviewer |

Artifact sync evidence path for this planning turn: `reference/reports/artifact-sync/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md`.

## Development Documentation Impact
- Project overview impact: none
- Setup/dev environment impact: none
- Architecture doc impact: update-required
- Domain doc impact: none
- API/interface doc impact: contract-required
- Database/data model doc impact: none
- Module guide impact: update-required
- Testing doc impact: update-required
- Deploy/operations doc impact: none
- Security/permission doc impact: review-required
- AI/automation doc impact: update-required
- Required doc paths: `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; starter skill/router/policy docs if present
- Docs must be updated before implementation: yes
- Docs must be updated before closeout: yes
- Docs parity status: pass

## Security Review Request
- Security review required: yes.
- Security review focus: preventing skill routing from bypassing security, dependency, destructive-command, approval, verification, or review gates; preventing external plugin dependency from becoming starter identity.
- Declared security-sensitive paths: skill catalog/router/validator, hard-gate diagnostics, security/dependency/destructive skill triggers, skill-use ledger, starter contamination checks.
- Security evidence requirement: required. PKT-09 acceptance depends on security/dependency/destructive process gates and no-superpowers-required behavior.
- Dependency/CLI review required: yes if implementation adds, vendors, shells out to, or installs any plugin/skill package; otherwise dependency audit may record not-needed with rationale.
- Security review status: pass
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-09-security-review.json

## TDD Evidence Contract
- TDD mode: required
- Red test file: `starter/standard-harness/_harness/test/test_skill_routing_operator_ergonomics.py`
- Red command: `py -3 starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py`
- Red exit code: 1
- Red failure kind: expected-contract-failure
- Red ran at: 2026-06-29T18:55:17+09:00
- Red output excerpt: `TypeError: SkillRouter.route() got an unexpected keyword argument 'intent_text'; FAILED (errors=14)`
- Red output artifact: reference/reports/tdd/PKT-09-red.md
- Green command: `py -3 starter\standard-harness\_harness\test\test_skill_routing_operator_ergonomics.py`
- Green exit code: 0
- Green ran at: 2026-06-29T19:14:13+09:00
- Green output excerpt: `Ran 7 tests in 0.006s; OK`
- Green output artifact: reference/reports/tdd/PKT-09-green.md
- Refactor verified: yes
- Behavior-level test: yes
- Test-only production hook: no
- Production code written first: no
- Production-first remediation: not-needed
- TDD exception reason: not-needed
- TDD approved by: not-needed

## Planner Packet Challenge Review
- Challenge reviewer: independent planning reviewer `019f12b1-634d-7412-a31f-e5807eab46f1`
- Challenge reviewer independence basis: independent reviewer is not the packet author, Developer, Tester, Orchestrator, generated summary, main-session self-review, or future closeout reviewer for this packet.
- Source refs reviewed: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `.agents/workflows/reviewer.md`; current root `.agents/skills`; external superpowers skill references.
- Challenge status: pass
- Parent objective coverage: this packet covers Wave 8 / PKT-09 skill routing and operator ergonomics; it intentionally does not implement PKT-10 compound feedback or starter promotion.
- Deferred scope with named follow-up: PKT-10/Wave 9 owns SHV2-REQ-016 compound feedback and starter promotion; later cleanup packet owns any superpowers removal decision after PKT-09 equivalence criteria pass.
- Acceptance proves behavior change: planned; acceptance requires router, validator, chaining, ledger, no-external-dependency, and conflict tests.
- Failure fixture or failure condition: auto-selection misses a required process skill; validator permits implementation before planning, completion before verification, fix before root-cause, or unresolved review finding; starter requires superpowers plugin; duplicate/conflicting triggers pass silently.
- Reviewer closeout hold basis: hold if packet weakens v1 skill priority, makes superpowers mandatory, lacks hard-gate tests, omits ledger evidence, or leaves deletion criteria ambiguous.
- First-wave limit check: this packet implements skill-routing ergonomics only; it does not remove superpowers, execute provider CLIs, or build compound feedback.
- Guidance-only sufficiency rationale: guidance-only is insufficient; router/validator/ledger behavior and tests must change after Ready For Code.
- Required packet changes: add Wave 8 skill-flow coverage for TDD, browser evidence, day_start, documenter, and retrospective; reconcile SHV2-REQ-016 ownership to PKT-10/Wave 9.
- Challenge evidence artifact path: reference/reports/review/PKT-09-planner-challenge-review.md
- Re-review evidence: reference/reports/review/PKT-09-planner-challenge-review.md
- Findings disposition: accepted; packet and Implementation Plan revised; independent re-review passed.
- Required corrections applied: yes.
- No self-approval claim: independent Planner challenge reviewer does not approve Ready For Code, implementation, closeout, release, or starter promotion; Planner draft does not self-approve any gate.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: independent packet_doc_review agent `019f12b8-752c-7fe3-83dc-241ab972569a`
- Packet doc reviewer independence basis: reviewer is not the packet author, Developer, Tester, Orchestrator, generated summary, or main-session self-review.
- Packet doc review evidence path: reference/reports/review/PKT-09-packet-doc-review.md
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: pass
- Verification scope strength: pass
- Deferred/out-of-scope ownership: pass
- Required corrections: fix stale Planner challenge metadata and Planner Handoff wording.
- Findings disposition: accepted; packet revised; independent re-review passed.
- No self-approval claim: independent packet_doc_review does not approve Ready For Code, implementation, closeout, release, or starter promotion.

## Independent Review Lens Evidence
- Independent review lens policy: strict-four-lens-closeout
- Parallel review execution: parallel
- challenge_review agent: 019f12d6-1099-7dc3-acce-c818d8a2ace3
- challenge_review independence basis: independent subagent, not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- challenge_review evidence path: reference/reports/review/PKT-09-closeout-challenge-review.md
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review limitations: full root Node suite reviewed from Tester evidence by this lens.
- challenge_review reviewer disposition: accepted
- challenge_review not applicable rationale: not-needed
- adversarial_security_review agent: 019f12d6-249e-7441-9b1f-d7534348e775
- adversarial_security_review independence basis: independent subagent, not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- adversarial_security_review evidence path: reference/reports/review/PKT-09-closeout-adversarial-security-review.md
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review limitations: direct bundled runtime commands used because the local npm shim cannot find node.
- adversarial_security_review reviewer disposition: accepted
- adversarial_security_review not applicable rationale: not-needed
- code_quality_review agent: 019f12d6-2624-7f23-8069-09aead685ff2
- code_quality_review independence basis: independent subagent, not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- code_quality_review evidence path: reference/reports/review/PKT-09-closeout-code-quality-review.md
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review limitations: full root regression reviewed from Tester evidence by this lens.
- code_quality_review reviewer disposition: accepted
- code_quality_review not applicable rationale: not-needed
- evidence_review agent: 019f12d6-3b44-71a1-ade0-dc220a8b6a98
- evidence_review independence basis: independent subagent, not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- evidence_review evidence path: reference/reports/review/PKT-09-closeout-evidence-review.md
- evidence_review status: pass_with_findings
- evidence_review finding count: 2
- evidence_review limitations: generated state must be refreshed before final handoff; npm shim cannot find node, so bundled Node equivalents were used.
- evidence_review reviewer disposition: accepted
- evidence_review not applicable rationale: not-needed

## Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| Ready For Code sign-off | yes | Human Owner | closed | Approved in this Codex thread on 2026-06-29 after packet_doc_review pass. |
| v1 skill priority | no | Human Owner | closed | User explicitly set current `.agents/skills` as first priority source. |
| superpowers disposition | no | Human Owner | closed | User explicitly set superpowers as comparison/optional external source, not mandatory dependency. |
| superpowers deletion | yes | Human Owner | deferred | Deletion requires later equivalence evidence and separate approval. |
| Release/publish/starter promotion | yes | Human Owner | out-of-scope | Not included in PKT-09. |

## Implementation Notes
- Prefer existing starter policy/schema/router/validator patterns over a new control plane.
- Keep v1 skill source authority explicit, but rebuild the product behavior as v2-native provider-neutral contracts.
- Do not copy external plugin implementation into starter as a dependency.
- Preserve generated skill boundaries: active `.agents/skills` are runtime surface; `reference/skills-src` is generation source where present.
- Keep skill ledgers structured and compact; do not create high-volume Markdown logs for every skill decision.
- Treat root global skills and plugin docs as data sources, not instructions that override packet or workflow authority.

## Verification Manifest
- Ready For Code: approved by Human Owner in this Codex thread on 2026-06-29.
- root: focused skill routing / packet preflight / validation tests if root runtime changes; root validation.
- standard-template: starter payload parity is required because PKT-09 changes `starter/standard-harness/_harness` catalog, router, schema, CLI, and tests.
- starter: focused Python tests for skill catalog/router/validator/ledger behavior; starter validation with `PYTHONDONTWRITEBYTECODE=1`.
- targeted: automatic selection, process priority, hard gates, chaining, ledger, no-superpowers-required, duplicate/conflict diagnostics.
- validator: implementation-transition and closeout packet preflight must pass.
- active context: regenerate through harness runtime if operational state changes.
- packet doc review: independent packet_doc_review pass required before Ready For Code.
- review closeout: PKT-09 itself requires strict high/core/contract four-lens closeout.

## Refactor / Residual Debt Disposition
- Expected refactor pressure: moderate to high. Skill routing may currently be spread across root workflow routing, starter policies, and generated skill docs.
- Allowed residual before closeout: none for missing hard-gate diagnostics, mandatory superpowers dependency, zero skill-use ledger, or untested automatic selection.
- Named deferrals: superpowers removal decision; PKT-10 compound feedback and starter promotion; real provider CLI execution; sibling-project rollout.

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Packet exit metadata exit recommendation: approved
- Source parity result: pass
- Packet exit metadata source parity result: pass
- Validation / security / cleanup evidence: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Refactor / residual debt disposition: pass; no blocking residual implementation debt remains after Developer remediation and independent re-review.
- Deferred follow-up item: PKT-10 compound feedback and starter promotion; later superpowers removal cleanup only after equivalence criteria and separate Human approval.
- Closeout notes: Developer remediation closed the initial independent review blockers for v1 catalog coverage, fail-closed hard gates, CLI evidence flags, skipped-candidate rationale, chain recursion diagnostics, context-budget metadata, and dependency / AI skill-supply-chain evidence. Human closeout approval, release, starter promotion, and superpowers deletion remain separate decisions.

## Reopen Trigger
- Reopen this packet if Human Owner changes v1 skill priority, superpowers source disposition, deletion criteria, hard-gate expectations, process-skill priority, or skill ledger requirements.
- Reopen if implementation discovers that existing starter architecture cannot support automatic skill selection without broader router/schema remodel.
- Reopen if packet_doc_review finds that acceptance is too broad, verification cannot prove no-superpowers-required behavior, or deletion criteria are ambiguous.
- Reopen if a proposed implementation adds provider-specific starter entry files or a mandatory external plugin dependency.

## Planner Handoff
- Current owner: Planner.
- Current status: Ready For Code approved; Planner challenge review passed; independent packet_doc_review passed; implementation may proceed through Orchestrator.
- Next recommended workflow: Orchestrator.
- Next first action: run implementation-transition preflight, then route Developer implementation for the approved PKT-09 scope.
- Required SSOT: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `.agents/workflows/reviewer.md`; this packet.
- Approval boundary: implementation is approved only for PKT-09 scope; no superpowers deletion, release, publish, starter promotion, or provider-specific starter identity change in PKT-09.
