# PKT-04B Clean Starter Lifecycle Hardening

This is a Planner-opened corrective packet draft after PKT-04A closeout and the v1-to-v2
review. It separates development-runtime residue from clean starter export proof so v2.0
can continue without pretending the working tree must stay perfectly clean during every
local test run.

It does not approve implementation.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root files may change only when the change supports starter v2.0 implementation, validation, or operation.
- v2.0 philosophy parity gate: this packet must preserve clean starter portability, provider-neutral product identity, packet-before-code, evidence-backed closeout, generated-state boundaries, and practical developer ergonomics.
- Gate status: pass for planning. The packet addresses a P0 clean-starter reliability gap before PKT-05 long-memory work proceeds.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING | Separate dev/runtime/export modes and harden clean starter proof. | selected |
| Ready For Code | pending | User requested Planner packet creation only; implementation approval remains explicit. | pending |
| Human sync needed | yes | Human Owner must approve whether this corrective packet should run before PKT-05. | open |
| Packet type | harness-system | The packet changes starter validation, export proof, and starter test expectations. | selected |
| Risk level | high | Incorrect validation can falsely certify a contaminated starter or overburden development with impractical cleanliness rules. | selected |
| Gate profile | contract | The packet changes reusable starter lifecycle contracts and validation semantics. | selected |
| Route class | packet-path | Requires implementation, tests, review, and Planner closeout before claims. | selected |
| Change zone | core | Starter clean/export validation is a core Standard Harness v2 boundary. | selected |
| Delivery route mode | orchestrated-closeout | If approved, route Developer, Tester, Reviewer, remediation, and Planner closeout through Orchestrator. | selected |
| User-facing impact | medium | A copied-starter user sees clearer validation behavior and fewer unmanaged temp artifacts. | selected |
| Layer classification | core | This packet protects the reusable starter operating layer. | selected |
| Active profile dependencies | none | No optional product profile is required. | closed |
| Existing system dependency | internal | Depends on starter contamination checks, validation aggregator mode selection, operating folder policy, starter tests, and root/starter verification commands. | selected |
| New authoritative source impact | analyzed | User clarified that development residue may be acceptable if release/export proof remains clean and temp cleanup is controlled. | selected |
| Risk if started now | high | Starting without packet approval could weaken clean-starter gates or delete useful developer/runtime artifacts. | selected |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Parent objective: Keep Standard Harness v2 clean and copyable while allowing normal development and test runs to create local residue safely.
- Scope boundary: validation/export lifecycle semantics only.
- Required reading before code:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`
  - `reference/reports/v2-current-analysis-for-v2-2.md`
  - `reference/reports/v2-current-analysis-evidence-ledger.md`
  - `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`
  - `starter/standard-harness/_harness/test/test_operating_folder_contract.py`
- UX archetype reference: not-needed
- Domain foundation reference: not-needed
- Schema impact classification: high
- Current implementation impact: not approved; this packet only defines the corrective boundary.

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
| Smoke-test temp copy | Disposable validation copy used to prove init/validate/packet path. | May generate runtime state during test; deleted on success, kept only with explicit debug flag. | no, except as smoke evidence for the export artifact it came from |

## Temp Artifact Policy
- Smoke tests should use a bounded temp root, preferably repo-local `.tmp/starter-smoke/` or configured `C:\tmp\standard-harness-smoke\`.
- Successful smoke runs must delete their temp copy automatically.
- Failed smoke runs may preserve one bounded diagnostic directory with a clear path in the test output.
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

## Acceptance Criteria
- Development/runtime validation and clean export validation are explicitly distinguishable in command behavior, code path, or documented mode semantics.
- Clean export validation rejects `__pycache__` and `.pyc` files with a blocking diagnostic.
- Installed/runtime validation may tolerate approved runtime-generated state only when the command mode clearly says it is not clean export proof.
- Starter-native tests align with PKT-04A compact PMO contract and no longer require `source-intake`, `daily-reports`, `status`, `risks`, `blockers`, or `day-start` as required human Markdown folders.
- A negative test creates or simulates cache contamination and proves clean export validation fails.
- A smoke-test temp cleanup path deletes successful temp copies and preserves failed copies only by explicit debug/failure policy.
- Temp cleanup is path-bounded and cannot delete outside the configured smoke temp root.
- Documentation explains that tracked source and clean export artifacts must be clean, while local development residue is tolerated only as non-export state.
- PKT-04B does not claim PKT-05 long-memory, provider orchestration, starter promotion, release, or publish scope.

## Verification Manifest
- Ready For Code: pending explicit Human Owner approval.
- Required root regression: `node --test .harness\test\*.test.js` or `npm test` once local Node PATH is valid.
- Required root validation: `npm run harness:validate` or direct bundled-node equivalent.
- Required starter validation:
  - development/runtime mode check, if implemented,
  - clean export mode check against a clean candidate,
  - clean export negative check with cache contamination.
- Required starter tests: `python -m unittest discover _harness\test` from `starter/standard-harness/`.
- Required focused tests:
  - contamination checker rejects cache in clean export mode,
  - installed/runtime mode does not get reported as clean export proof,
  - PMO operating folder test matches PKT-04A,
  - temp smoke cleanup is bounded and deletes success copies.
- Security: secret/provider-entry contamination rejection remains covered.
- Browser: not-needed; no browser UI implementation is in scope.
- Review closeout: Reviewer must check challenge, adversarial/security, code-quality, and evidence lenses.

## Verification Scenarios
| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| Normal clean export | Clean candidate without generated residue passes clean export validation. | clean export validation output |
| Error: cache contamination | Candidate containing `__pycache__` or `.pyc` fails clean export validation. | negative test and diagnostic |
| Runtime project | Initialized copied project may have approved runtime state but is not labeled clean export proof. | validation mode output |
| PMO regression | Compact PMO required folders remain `day-wrap-up` and `wbs`; structured PMO categories are not required Markdown folders. | starter unittest and PMO validator tests |
| Temp cleanup | Successful smoke temp copy is deleted; failed/debug copy is bounded and reported. | temp cleanup test |
| Path safety | Cleanup refuses paths outside the configured smoke temp root. | negative path-safety test |

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer.
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: user clarification in current thread; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/packets/PKT-04A_PMO_SURFACE_AND_REVIEWER_LENS_ALIGNMENT.md`; `reference/reports/v2-current-analysis-for-v2-2.md`; current validation/test observations from this session.
- Challenge status: pass for packet draft.
- Parent objective coverage: the packet protects P0 clean/copyable starter requirements and preserves PKT-04A PMO compactness before PKT-05.
- Deferred scope with named follow-up: PKT-05 owns long-memory/question answering; PKT-06 owns provider orchestration; PKT-07 owns broader operator ergonomics; PKT-08 owns starter promotion mechanics.
- Acceptance proves behavior change: acceptance requires negative cache-contamination tests, mode-distinction evidence, starter unittest repair, and bounded temp cleanup checks.
- Failure fixture or failure condition: fail if clean export validation passes with `.pyc` or `__pycache__`; fail if runtime mode is reported as export proof; fail if starter PMO tests require removed human Markdown folders; fail if smoke cleanup can delete outside its configured root.
- Reviewer closeout hold basis: Reviewer may hold closeout for missing negative tests, unclear mode names, cleanup path-safety gaps, stale PMO test expectations, or any claim that this packet closes PKT-05, release, or starter promotion.
- First-wave limit check: the packet intentionally avoids CLI help redesign and permission-model cleanup unless required to explain validation modes.
- Guidance-only sufficiency rationale: guidance-only is insufficient; validator behavior and tests must change after Ready For Code.
- Challenge evidence artifact path: `reference/packets/PKT-04B_CLEAN_STARTER_LIFECYCLE_HARDENING.md`.
- Findings disposition: no blocking findings in this Planner draft after adding explicit mode table, temp cleanup policy, negative tests, out-of-scope boundary, and no Ready For Code claim.
- No self-approval claim: this challenge review does not approve implementation, close Human Ready For Code, replace Tester evidence, replace Reviewer closeout, approve release, or approve starter promotion.

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
- Current status: packet draft opened; Ready For Code pending.
- Next recommended workflow: Planner asks Human Owner for Ready For Code approval or requested edits.
- Next first action if approved: Orchestrator routes Developer to implement validation mode separation, cache-contamination negative tests, PMO test sync, and bounded smoke temp cleanup.
- Required SSOT: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; this packet; PKT-04A.
- Approval boundary: no implementation, testing closeout, release, publish, starter promotion, generated-state mutation, or PKT-05 work until explicit Ready For Code approval.
