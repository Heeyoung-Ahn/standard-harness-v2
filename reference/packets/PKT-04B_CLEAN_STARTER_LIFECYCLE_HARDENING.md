# PKT-04B Clean Starter Lifecycle Hardening

This is a Planner-opened corrective packet draft after PKT-04A closeout and the v1-to-v2
review. It separates development-runtime residue from clean starter export proof so v2.0
can continue without pretending the working tree must stay perfectly clean during every
local test run.

Implementation is approved only for the PKT-04B scope by explicit Human Owner Ready For
Code approval on 2026-06-28. This does not approve release, publish, starter promotion,
or PKT-05 work.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root files may change only when the change supports starter v2.0 implementation, validation, or operation.
- v2.0 philosophy parity gate: this packet must preserve clean starter portability, provider-neutral product identity, packet-before-code, evidence-backed closeout, generated-state boundaries, and practical developer ergonomics.
- Gate status: pass for planning. The packet addresses a P0 clean-starter reliability gap before PKT-05 long-memory work proceeds.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING | Separate dev/runtime/export modes and harden clean starter proof. | selected |
| Ready For Code | approved | Human Owner explicitly approved Ready For Code for PKT-04B on 2026-06-28 and requested Orchestrator routing. | approved |
| Human sync needed | no | Human Owner approved this corrective packet to run before PKT-05. | closed |
| Packet type | harness-system | The packet changes starter validation, export proof, and starter test expectations. | selected |
| Risk level | high | Incorrect validation can falsely certify a contaminated starter or overburden development with impractical cleanliness rules. | selected |
| Gate profile | contract | The packet changes reusable starter lifecycle contracts and validation semantics. | selected |
| Route class | packet-path | Requires implementation, tests, review, and Planner closeout before claims. | selected |
| Change zone | core | Starter clean/export validation is a core Standard Harness v2 boundary. | selected |
| Delivery route mode | orchestrated-closeout | If approved, route Developer, Tester, Reviewer, remediation, and Planner closeout through Orchestrator. | selected |
| User-facing impact | medium | A copied-starter user sees clearer validation behavior and fewer unmanaged temp artifacts. | selected |
| Layer classification | core | This packet protects the reusable starter operating layer. | selected |
| Active profile dependencies | none | No optional product profile is required. | closed |
| Profile evidence status | approved | No profile-specific evidence is required. | closed |
| UX archetype status | approved | No browser UI implementation is in scope; command wording may change only to explain validation modes. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | not-needed | No deployment topology change is in scope. | closed |
| Domain foundation status | approved | No copied-project product domain model is changed; this is harness lifecycle validation behavior. | closed |
| Authoritative source intake status | approved | Sources are user clarification, PKT-04A closeout, v1-to-v2 review, Requirements, and Implementation Plan. | selected |
| Shared-source wave status | not-needed | This packet targets the clean starter payload directly; no sibling-project rollout is in scope. | closed |
| Packet exit gate status | pending | Exit gate remains pending until implementation, tests, review, and Planner closeout evidence exist. | pending |
| Existing system dependency | internal | Depends on starter contamination checks, validation aggregator mode selection, operating folder policy, starter tests, and root/starter verification commands. | selected |
| New authoritative source impact | analyzed | User clarified that development residue may be acceptable if release/export proof remains clean and temp cleanup is controlled. | selected |
| Risk if started now | high | Starting without packet approval could weaken clean-starter gates or delete useful developer/runtime artifacts. | selected |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Packet Scope; Problem Statement; Acceptance Criteria; Verification Manifest; Planner Packet Challenge Review.
- Lane-type conditional sections: Development Documentation Impact; Feature Artifact Sync Matrix; Modeling Impact; Security Review Request.
- Lane-type not-needed sections: UI implementation; environment topology; release packaging; browser evidence; copied-project product domain data changes.
- Planner packet challenge required: yes
- Work item title: Clean Starter Lifecycle Hardening
- Parent objective: Keep Standard Harness v2 clean and copyable while allowing normal development and test runs to create local residue safely.
- Scope boundary: validation/export lifecycle semantics only.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`; `reference/reports/v2-current-analysis-for-v2-2.md`; `reference/reports/v2-current-analysis-evidence-ledger.md`; `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`; `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`; `starter/standard-harness/_harness/test/test_operating_folder_contract.py`.
- Required reading before code details:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`
  - `reference/reports/v2-current-analysis-for-v2-2.md`
  - `reference/reports/v2-current-analysis-evidence-ledger.md`
  - `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`
  - `starter/standard-harness/_harness/test/test_operating_folder_contract.py`
- UX archetype reference: not-needed
- Selected UX archetype: not-needed
- Domain foundation reference: not-needed
- Schema impact classification: high
- Schema impact note: validation mode naming, contamination diagnostics, and smoke temp cleanup helpers may change starter-visible runtime contracts.
- Authoritative source intake reference: user clarification that development residue can be tolerated outside clean export proof; `.agents/artifacts/REQUIREMENTS.md` clean starter and PMO compact-surface sections; `.agents/artifacts/IMPLEMENTATION_PLAN.md` Wave 1 and PKT-04A notes; `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`; v1-to-v2 review reports.
- Authoritative source disposition: accepted for packet planning; Developer must separate clean export proof from development/runtime validation and preserve PKT-04A compact PMO behavior.
- Current implementation impact: approved for Orchestrator-routed implementation inside this corrective boundary.
- Existing plan conflict: prior validation behavior can tolerate runtime cache in installed starter mode, and starter-native PMO tests still encode pre-PKT-04A broad folder expectations.
- Impacted packet set scope: PKT-04B only. PKT-05 long memory, PKT-06 provider orchestration, and PKT-08 starter promotion remain deferred.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed

## Problem Statement
The current v2 starter can be used and tested, but its clean-starter claim is structurally
ambiguous.

During normal Python CLI and unittest execution, `__pycache__` and `.pyc` files can appear
inside `starter/standard-harness/`. Current starter validation can still pass in installed
starter mode while those runtime-generated cache files are present. That is reasonable for
a working copied project, but unsafe for clean export or release claims.

A second issue appeared during review: the starter-native operating folder test still
expects the pre-PKT-04A broad PMO folder contract, while the approved PKT-04A contract
intentionally reclassified `source-intake`, `daily-reports`, `status`, `risks`, `blockers`,
and `day-start` away from required human Markdown folders.

The correct fix is not to require the development tree to stay perfectly clean at all
times. The correct fix is to separate:
- development working tree mode,
- installed/runtime project mode,
- clean export artifact mode,
- smoke-test temp copy mode.

## In Scope
- Define validation modes or equivalent flags so clean export proof is separate from installed/runtime validation.
- Ensure clean export validation hard-fails on `__pycache__`, `.pyc`, `.pytest_cache`, local sqlite DBs, logs, generated validation reports, root state, evidence history, and provider-specific entry contracts.
- Allow development/runtime residue only in explicitly named development or installed modes, and never treat that mode as clean export proof.
- Add or update tests proving a deliberately contaminated starter fails clean export validation.
- Update stale starter-native PMO folder tests to match the PKT-04A compact PMO contract.
- Preserve PKT-04A behavior: `day-wrap-up` and `wbs` are the compact required PMO surface; source intake, daily records, status, risks, blockers, and day-start are structured records, report sections, generated views, or optional exports.
- Define smoke-test temp handling: temp copies are deleted on success and preserved only on explicit failure/debug request.
- Prefer repo-local or configured temp roots with bounded cleanup over uncontrolled long-lived system temp directories.
- Document the operational distinction between development residue, tracked source, clean export artifact, and copied project runtime state.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A maintainer can run normal development or copied-starter validation without treating runtime residue as release proof, then run a distinct clean export proof that blocks contaminated starter artifacts.
- API contract: starter validation must expose distinguishable development/runtime and clean-export modes through command behavior, flags, code path, or documented mode semantics.
- Component responsibility: `StarterContaminationChecker` owns path contamination classification; validation aggregation/CLI owns mode selection and wording; starter tests own copied-starter runtime and clean-export evidence.
- Data ownership: `_ops` and local runtime state remain copied-project/runtime state; clean export artifacts must not contain generated state, evidence history, sqlite DBs, logs, caches, secrets, or provider entry contracts.
- Allowed dependency direction: validation aggregation and CLI may depend on starter contamination classification; contamination classification must not depend on validation aggregation, CLI command parsing, smoke temp helpers, or generated runtime state.
- Public contract vs internal/scratch field: validation mode names, blocking diagnostics, required PMO starter folders, and smoke cleanup behavior are starter-visible contracts; helper implementation details and temp directory internals are internal.
- Modeling risk: a vague single `--starter` validation path could continue to certify runtime mode as clean export proof.
- Modeling disposition: implementation must preserve four explicit lifecycle modes from this packet and return to Planner if mode naming or ownership boundaries need broader redesign.

## Out Of Scope
- No PKT-05 long-memory or question-answering implementation.
- No provider-neutral orchestration implementation.
- No broad CLI help redesign, except minimal command text required to explain validation modes.
- No release, publish, package metadata change, or starter promotion.
- No removal of PMO tracking, source intake, risks, blockers, status, or day-start capability.
- No requirement that developers manually keep the working tree free of every runtime cache during normal local work.
- No `starter/standard-harness/AGENTS.md`.
- No Ready For Code approval by implication.

## Lifecycle Mode Decision
| Mode | Purpose | Residue Policy | May Prove Clean Starter? |
| --- | --- | --- | --- |
| Development working tree | Root/starter implementation and tests during v2 development. | Runtime cache and local temp residue may appear but must be ignored by git or cleaned before export. | no |
| Installed/runtime project | Copied starter after `init`, packet work, evidence, and context generation. | Some runtime state is expected in `_ops` and local state surfaces. | no |
| Clean export artifact | Copyable starter candidate for release/promotion. | No cache, generated state, evidence history, sqlite DB, logs, secrets, or provider entry contracts. | yes |
| Smoke-test temp copy | Disposable validation copy used to prove init/validate/packet path. | May generate runtime state during test; deleted on success; failed runs may preserve one bounded diagnostic copy; an explicit debug flag may preserve a success copy. | no, except as smoke evidence for the export artifact it came from |

## Temp Artifact Policy
- Smoke tests should use a bounded temp root, preferably repo-local `.tmp/starter-smoke/` or configured `C:\tmp\standard-harness-smoke\`.
- Successful smoke runs must delete their temp copy automatically unless an explicit debug flag requests preservation.
- Failed smoke runs may preserve exactly one bounded diagnostic directory automatically, with a clear path in the test output.
- Debug preservation must not bypass the bounded temp root, one-copy diagnostic limit, TTL cleanup, or path-safety checks.
- A cleanup command or test helper must remove stale smoke directories older than the selected TTL.
- The cleanup behavior must avoid deleting outside the configured smoke temp root.

## Development Documentation Impact
- Project overview impact: none.
- Setup/dev environment impact: conditional; document validation mode usage if command names or flags change.
- Architecture doc impact: conditional; update only if the starter/export state model changes contract language.
- Implementation plan impact: conditional; update if this packet changes the packet roadmap or verification baseline.
- Testing doc impact: required if test commands or temp cleanup behavior change.
- Security/permission doc impact: conditional; clean export gate must continue to reject secrets and provider-specific entry contracts.
- AI/automation doc impact: conditional; update if harness commands or smoke helpers change.
- Required doc paths before closeout: this packet plus any changed command/manual surfaces.

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| User clarification that dev residue may be acceptable before clean export | this packet | drafted | Planner |
| Clean starter validation mode split | validation aggregator, contamination checker, CLI docs/tests | planned | Developer, Tester |
| Cache contamination clean-export hard fail | contamination checker, negative tests, validation evidence | planned | Developer, Tester |
| Temp smoke copy cleanup | smoke helper or test harness, docs, negative path-safety test | planned | Developer, Tester |
| PKT-04A PMO stale test sync | starter operating folder tests | planned | Developer, Tester |
| Export proof versus installed runtime proof | README/START_HERE/_harness README or command help if affected | planned | Developer, Reviewer |
| Broad SHV2-REQ-026 PMO wording could be read as mandatory Markdown folders | this packet interpretation; later Requirements parity edit if Planner rebaselines requirements | disposition added: PKT-04A/PKT-04B compact PMO explanation is authoritative for this packet; source intake, daily records, status, risks, blockers, and day-start remain structured/indexed support, not required Markdown folders | Planner, Reviewer |

## Acceptance Criteria
- Development/runtime validation and clean export validation are explicitly distinguishable in command behavior, code path, or documented mode semantics.
- Clean export validation rejects `__pycache__` and `.pyc` files with a blocking diagnostic.
- Clean export negative fixtures cover representative non-cache contamination too: local sqlite or db files, logs, generated validation reports, evidence/history state, and provider-specific entry contracts.
- Installed/runtime validation may tolerate approved runtime-generated state only when the command mode clearly says it is not clean export proof.
- Starter-native tests align with PKT-04A compact PMO contract and no longer require `source-intake`, `daily-reports`, `status`, `risks`, `blockers`, or `day-start` as required human Markdown folders.
- A negative test creates or simulates cache contamination and proves clean export validation fails.
- A smoke-test temp cleanup path deletes successful temp copies by default, preserves at most one failed diagnostic copy, and preserves successful copies only with an explicit debug flag.
- Temp cleanup is path-bounded and cannot delete outside the configured smoke temp root.
- Documentation explains that tracked source and clean export artifacts must be clean, while local development residue is tolerated only as non-export state.
- PKT-04B does not claim PKT-05 long-memory, provider orchestration, starter promotion, release, or publish scope.

## Verification Manifest
- Ready For Code: approved by explicit Human Owner approval on 2026-06-28.
- Required root regression: `node --test .harness\test\*.test.js` or `npm test` once local Node PATH is valid.
- Required root validation: `npm run harness:validate` or direct bundled-node equivalent.
- Required standard-template/starter validation: clean candidate validation for `starter/standard-harness/`; no separate `standard-template` target is in scope.
- Required starter validation:
  - development/runtime mode check, if implemented,
  - clean export mode check against a clean candidate,
  - clean export negative check with cache contamination,
  - clean export negative check with representative non-cache contamination: local sqlite or db files, logs, generated validation reports, evidence/history state, and provider-specific entry contracts.
- Required starter tests: `python -m unittest discover _harness\test` from `starter/standard-harness/`.
- Required focused tests:
  - contamination checker rejects cache in clean export mode,
  - contamination checker rejects representative non-cache contamination in clean export mode,
  - installed/runtime mode does not get reported as clean export proof,
  - PMO operating folder test matches PKT-04A,
  - temp smoke cleanup is bounded and deletes success copies.
- Required targeted validation: focused contamination, validation-mode, PMO folder contract, and temp cleanup tests.
- Required validator evidence: packet preflight, root validation, starter validation, and validation report after implementation.
- Required active context refresh: regenerate Active Context and validation report after implementation evidence is recorded.
- Security: secret/provider-entry contamination rejection remains covered.
- Browser: not-needed; no browser UI implementation is in scope.
- Review closeout: Reviewer must check challenge, adversarial/security, code-quality, and evidence lenses.

## Verification Scenarios
| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| Normal clean export | Clean candidate without generated residue passes clean export validation. | clean export validation output |
| Error: cache contamination | Candidate containing `__pycache__` or `.pyc` fails clean export validation. | negative test and diagnostic |
| Error: non-cache contamination | Candidate containing local sqlite or db files, logs, generated validation reports, evidence/history state, or provider entry contracts fails clean export validation. | negative test and diagnostic |
| Runtime project | Initialized copied project may have approved runtime state but is not labeled clean export proof. | validation mode output |
| PMO regression | Compact PMO required folders remain `day-wrap-up` and `wbs`; structured PMO categories are not required Markdown folders. | starter unittest and PMO validator tests |
| Temp cleanup | Successful smoke temp copy is deleted; failed/debug copy is bounded and reported. | temp cleanup test |
| Path safety | Cleanup refuses paths outside the configured smoke temp root. | negative path-safety test |

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer.
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: user clarification in current thread; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`; `reference/reports/v2-current-analysis-for-v2-2.md`; current validation/test observations from this session.
- Challenge status: pass
- Parent objective coverage: the packet protects P0 clean/copyable starter requirements and preserves PKT-04A PMO compactness before PKT-05.
- Deferred scope with named follow-up: PKT-05 owns long-memory/question answering; PKT-06 owns provider orchestration; PKT-07 owns broader operator ergonomics; PKT-08 owns starter promotion mechanics.
- Acceptance proves behavior change: acceptance requires negative cache-contamination tests, representative non-cache contamination tests, mode-distinction evidence, starter unittest repair, and bounded temp cleanup checks.
- Failure fixture or failure condition: fail if clean export validation passes with `.pyc`, `__pycache__`, local sqlite or db files, logs, generated validation reports, evidence/history state, or provider entry contracts; fail if runtime mode is reported as export proof; fail if starter PMO tests require removed human Markdown folders; fail if smoke cleanup can delete outside its configured root.
- Reviewer closeout hold basis: Reviewer may hold closeout for missing negative tests, unclear mode names, cleanup path-safety gaps, stale PMO test expectations, or any claim that this packet closes PKT-05, release, or starter promotion.
- First-wave limit check: the packet intentionally avoids CLI help redesign and permission-model cleanup unless required to explain validation modes.
- Guidance-only sufficiency rationale: guidance-only is insufficient; validator behavior and tests must change after Ready For Code.
- Challenge evidence artifact path: `reference/packets/PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING.md`.
- Findings disposition: no blocking findings in this Planner draft after adding explicit mode table, temp cleanup policy, representative negative tests, SHV2-REQ-026 PMO interpretation disposition, out-of-scope boundary, and no Ready For Code claim.
- Required corrections applied: applied; implementation-transition blockers identified in packet review were incorporated as mode distinction, representative negative fixtures, PMO interpretation disposition, temp cleanup policy, Quick Decision Header readiness fields, and Modeling Impact.
- No self-approval claim: independent reviewer, not packet author; this challenge review does not approve implementation, close Human Ready For Code, replace Tester evidence, replace Reviewer closeout, approve release, or approve starter promotion.

## Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata exit recommendation: pending
- Packet exit metadata source parity result: pending
- Packet exit metadata validation / security / cleanup evidence: pending
- Refactor / residual debt disposition: pending implementation and review.
- Deferred follow-up item: CLI help polish, starter permission-policy cleanup, non-shipped test reference disposition, PKT-05 long memory, PKT-08 starter promotion.

## Reopen Trigger
- Reopen this packet if clean export validation still tolerates cache files, if development/runtime mode is used as release proof, if smoke temp copies accumulate without bounded cleanup, if PKT-04A PMO compactness regresses, if implementation expands into PKT-05/PKT-08, or if release/promotion claims are made without separate approval.

## Planner Handoff
- Current owner: Planner.
- Current status: Ready For Code approved; Orchestrator routing requested.
- Next recommended workflow: Orchestrator.
- Next first action: Orchestrator routes Developer to implement validation mode separation, cache-contamination negative tests, PMO test sync, and bounded smoke temp cleanup.
- Required SSOT: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; this packet; PKT-04A.
- Approval boundary: no implementation, testing closeout, release, publish, starter promotion, generated-state mutation, or PKT-05 work until explicit Ready For Code approval.
