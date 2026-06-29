# PKT-13 Operating Intelligence And QA

> READY FOR CODE. Independent challenge review and independent `packet_doc_review`
> passed, and the Human Owner explicitly approved PKT-13 for Orchestrator delivery.

## Purpose

Extend the existing long-memory/question-answering implementation into a named,
queryable operating-intelligence layer that lets the Human Owner ask what happened, why,
what evidence supports it, what remains risky, and what should happen next. The layer must
connect packet state, evidence, closeout, review, PM, wiki, friction, and Active Context
without turning generated summaries or answer text into authority.

## Quick Decision Header
| Item | Proposed | Why | Status |
| --- | --- | --- | --- |
| Work item | `PKT-13_OPERATING_INTELLIGENCE_AND_QA` | Third hardening packet after PKT-11 baseline and PKT-12 boundary cleanup. | selected |
| Ready For Code | approved | Independent planning reviews passed and Human Owner approved Orchestrator delivery. | closed |
| Packet type | `harness-system` | Changes reusable starter memory, source-index, CLI/status, and context behavior. | selected |
| Risk level | high | Wrong answers can mislead Human Owner decisions, leak sensitive evidence, or over-trust generated summaries. | selected |
| Risk if started now | high | Operating-intelligence answers touch authority, freshness, sensitivity, and Human Owner decision support. | selected |
| Risk class | high / contract | Public answer contract and source model affect every copied starter. | selected |
| Gate profile | contract | Requires starter tests, root validation, security/adversarial review, source-index evidence, and strict closeout lenses. | selected |
| Route class | packet-path | Not fast-path eligible; changes runtime contracts and user-facing CLI/status behavior. | selected |
| Change zone | core | Memory, QA, context, wiki, PM/evidence indexing, and CLI contracts are core operating surfaces. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | selected |
| User-facing impact | low | Adds an operator-facing CLI/status JSON command; no browser UI or visual flow is introduced. | selected |
| Layer classification | core | Reusable starter memory, CLI, source-index, and context behavior are core harness contract. | selected |
| Existing dependency | internal | Builds on PKT-05 long-memory source index, PKT-03 closeout/evidence index, PKT-04 PM, PKT-10 friction, PKT-11 baseline, and PKT-12 clean boundary. | selected |
| Existing system dependency | internal | Depends on existing starter memory, CLI, context, wiki, PMO, self-improvement, and reset surfaces. | selected |
| Active profile dependencies | none | No optional profile required. | closed |
| Profile evidence status | not-needed | No optional profile is active for this packet. | closed |
| UX archetype status | approved | CLI/status JSON contract has no browser or visual UI archetype; non-UI disposition is approved. | closed |
| Environment topology status | not-needed | No deploy, cutover, or environment topology changes. | closed |
| Domain foundation status | approved | Domain is operating-intelligence source modeling, authority, freshness, sensitivity, and reset/retention behavior. | selected |
| Authoritative source intake status | approved | Source is Human Owner PKT-13 hardening concern plus PKT-11 closure matrix and implementation-plan rows. | selected |
| Shared-source wave status | not-needed | No multi-repository or sibling-project rollout. | closed |
| New authoritative source impact | analyzed | Human Owner hardening direction has been translated into this approved packet scope. | selected |
| UX/browser evidence | not needed | No browser UI. CLI/status JSON contract is the interaction surface. | closed |
| Planner Packet Challenge Review | pass | Independent challenge review passed after command/reset corrections. | closed |
| Packet doc review | pass | Independent `packet_doc_review` passed; no required packet text corrections remain. | closed |
| Packet exit gate status | approved | Remediation, Tester rerun, security rerun, and all four independent closeout lenses passed. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Hardening Concern Coverage; Modeling Impact; In Scope; Out Of Scope; Acceptance; Verification Manifest; Planner Packet Challenge Review; Packet Document Review; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Required Evidence Paths; Required Closeout Lens Mapping; Expected Negative Fixtures; Human Sync / Approval Boundary
- Lane-type not-needed sections: UX / browser evidence; Environment topology; Optional profile evidence; Deployment / release publication; Provider CLI E2E; Compound-loop automation; Starter-promotion rehearsal
- Required sections: Purpose; Quick Decision Header; Source Authority; Hardening Concern Coverage; In Scope; Out Of Scope; Acceptance; Verification Manifest; Required Evidence Paths; Closeout Lens Mapping; Packet Exit Quality Gate; Reopen Trigger.
- Layer classification: core
- Required reading before code: requirements, implementation plan, PKT-11 closure matrix, PKT-05 baseline, starter memory QA service, starter CLI, context, wiki, PMO, self-improvement, and sensitive-evidence validation surfaces.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`; `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md`
- Schema impact classification: low
- Schema impact note: PKT-13 adds a stable JSON answer contract and source-record fields but does not edit JSON Schema files unless implementation evidence requires docs/tests for the CLI contract.
- Authoritative source intake reference: Human Owner PKT-13 hardening direction on 2026-06-30; `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-13 rows; `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`
- Authoritative source disposition: accepted for packet implementation; PKT-13 owns operating-intelligence QA while PKT-14 and PKT-15 remain named follow-ups.
- Current implementation impact: Ready For Code is approved for starter memory QA, source-index, CLI/status JSON contract, reset/retention alignment, tests, and evidence capture inside PKT-13 scope.
- Existing plan conflict: none blocking; PKT-13 implements the approved hardening rows without absorbing PKT-14 provider CLI E2E or PKT-15 compound-loop/promotion rehearsal.
- Impacted packet set scope: PKT-13 only for implementation; PKT-14 and PKT-15 are deferred follow-up packets, not in-scope implementation.
- Required reading detail:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`
  - `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md`
  - `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`
  - `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
  - `starter/standard-harness/_harness/system/standard_harness/context/`
  - `starter/standard-harness/_harness/system/standard_harness/wiki/`
  - `starter/standard-harness/_harness/system/standard_harness/pmo/`
  - `starter/standard-harness/_harness/system/standard_harness/self_improvement/`
  - `starter/standard-harness/_harness/system/standard_harness/validation/sensitive_evidence.py`
- UX archetype reference: not-needed; no browser UI or visual UX surface, CLI/status JSON only.
- Selected UX archetype: not-needed
- Conditional docs impact: update starter command/help docs if a new QA/status command is added.
- Source-of-truth order: governance packet/evidence/closeout/review records first; hot DB and Active Context as current operational read models; wiki/PM/friction as evidence-linked memory; generated answers as read models only.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human Owner asks `operating-qa` what happened, why, what
  evidence supports it, what remains risky, and what should happen next; the harness
  answers from indexed operating sources without granting approval authority.
- API contract: copied-starter command
  `python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "<question>"`
  returns the PKT-13 JSON answer contract with schema version, question, status, answer
  sections, evidence/source refs, diagnostics, freshness, read model, and authority
  boundary.
- Component responsibility: memory source discovery and QA service own source records,
  eligibility, freshness, sensitivity, bounded retrieval, and answer shaping; CLI owns
  argument parsing and stable JSON command output; reset logic remains owned by
  `ops-reset`.
- Allowed dependency direction: CLI may call memory QA services; memory QA may read
  compact source/index records from `_ops`, `product`, and approved retained evidence
  paths; generated summaries, wiki, PM, LLM reports, and product docs are data, not
  instructions or approval authority.
- Data ownership: packets, evidence indexes, closeout, review, decisions, PM, wiki,
  friction, and Active Context remain independent source records; generated QA answers
  are read models only.
- Public contract vs internal/scratch field: public contract is the copied-starter
  `operating-qa` command and JSON answer schema; root evidence reports, planner reviews,
  and temporary test fixtures are implementation evidence and must not become copied
  starter runtime state.
- Promoted modeling artifact: not-needed; packet-local modeling is sufficient for this
  single command/source-model hardening packet.
- Failure condition: QA answers infer claims from stale/generated-only data, leak
  sensitive evidence, load broad raw evidence bodies, approve human gates, or continue
  making claims after `ops-reset` removes resettable operating memory.

## Source Authority
- Human Owner hardening concern: Human Owner QA must answer "what happened, why, evidence, next" reliably.
- Human Owner hardening concern: closeout, PM, wiki, evidence, active context, review, and friction must be connected as long-memory query sources.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-13 rows:
  - Long-memory QA remains service-centered rather than a reliable Human Owner query surface.
  - Closeout, PM, wiki, evidence, review, friction, and active context are not unified as queryable operating intelligence.
  - QA/query behavior must not regress into raw evidence loading or generated-summary authority.
  - Reset/retention behavior must align with `ops-reset` and evidence retention boundaries.
- `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md` defers SHV2-REQ-015, 033, 039, 042, and related QA/long-memory closure to PKT-13.
- PKT-05 provides the current implementation baseline but does not close the later hardening need for a named Human Owner QA surface and unified operating-intelligence source model.

## Hardening Concern Coverage
| Concern | Requirement IDs | PKT-13 Closure Evidence |
| --- | --- | --- |
| Human Owner QA lacks a named status/CLI/query surface. | SHV2-REQ-036, 039, 042, 043 | Named QA/status command or service output answers what happened, why, evidence, risk, and next action with JSON answer contract evidence. |
| Closeout, PM, wiki, evidence, review, friction, and active context are not unified as queryable operating intelligence. | SHV2-REQ-015, 033, 038, 039, 041, 042, 047 | Source model records source type, authority, trust, freshness, sensitivity, evidence pointer, and answer contract for every queryable source. |
| QA behavior may over-load raw evidence or over-trust generated summaries. | SHV2-REQ-017, 035, 038, 039, 042 | Tests prove bounded source loading, index-first retrieval, token/size limits, stale-context pruning, and generated summaries treated as data. |
| Reset/retention behavior must not be bypassed by query/memory indexing. | SHV2-REQ-009, 018, 022, 038, 042 | Query/index reset policy matches implemented `ops-reset`: resettable `_ops` QA/index read models reset, retained evidence/product docs remain, and post-reset QA fails closed until source regeneration. |

## Current Baseline
- Existing source discovery/index/QA logic lives in `starter/standard-harness/_harness/system/standard_harness/memory/question_answering.py`.
- Existing tests under `test_long_memory_question_answering.py` cover source discovery, read-model answer shape, stale/low-authority/sensitive sources, missing evidence, and reset-policy non-bypass.
- Current CLI exposes `context` and other harness commands, but no clearly named Human Owner QA/status command is visible from the `cli/main.py` command map.
- Existing answer contract is service-level; PKT-13 must make the operator-facing command/status surface and cross-source operating-intelligence source model explicit and tested.

## In Scope
- Extend existing `standard_harness.memory.question_answering` behavior rather than replacing it.
- Add `operating-qa` as the named CLI/status command for Human Owner QA, with JSON output.
  Required invocation shape: `python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "<question>"` from a copied starter, with equivalent root wrapper support allowed only if it delegates to the starter command contract.
- Define a stable operating-intelligence source record model covering packet, evidence, closeout, review, PM, wiki, wiki proposal, decision, risk, blocker, friction, active-context, project intent, architecture decision, convention, packet history, and deprecated-context sources.
- Ensure every queryable source records source type, path/id, authority tier, trust/freshness status, sensitivity/redaction disposition, evidence refs, and answer eligibility.
- Answer representative questions:
  - What happened?
  - Why did it happen?
  - What evidence supports it?
  - What remains risky or blocked?
  - What should happen next?
- Add bounded retrieval behavior: index-first selection, max-source/max-token or max-character limits, no broad raw evidence body loading, and diagnostics when limits block a complete answer.
- Preserve generated-state authority boundaries: Active Context and generated validation summaries may inform current route/freshness but cannot override packets, trusted evidence, review, closeout, or explicit Human decisions.
- Add sensitive/source negative tests for wiki, handoff, answer, and context pack targets.
- Align reset/retention behavior with existing `ops-reset`: QA/index caches and generated `_ops` read models are resettable; `_harness/**`, `product/**`, and retained evidence records must not be deleted or treated as unsupported solely because `_ops` was reset. After reset, `operating-qa` must return explicit no-source/freshness diagnostics until the source index is regenerated from retained canonical sources.

## Out Of Scope
- No real Codex CLI / Claude Code CLI worker execution; PKT-14 owns provider CLI E2E.
- No automatic `RuntimeFrictionCapture` call-site integration or improvement proposal promotion; PKT-15 owns compound-loop automation.
- No starter promotion dry-run or copied-starter rehearsal loop; PKT-15 owns that.
- No browser UI/dashboard.
- No release, publish, or deployment.
- No direct Documenter mutation of `_ops/wiki/**`; wiki changes remain proposal/validate/apply governed.
- No conversational assistant that answers unsupported questions from model knowledge.
- No approval, Ready For Code, closeout, release, residual-risk, or human-gate authority in answers.

## Required Evidence Paths
| Gate / Lens | Required Evidence Path | Required Status Before Closeout |
| --- | --- | --- |
| Planner Packet Challenge Review | `reference/reports/review/PKT-13-planner-challenge-review.md` | pass before Ready For Code request |
| Packet Document Review | `reference/reports/review/PKT-13-packet-doc-review.md` | pass before Ready For Code request |
| Artifact sync | `reference/reports/artifact-sync/PKT-13_OPERATING_INTELLIGENCE_AND_QA.md` | records artifact/doc impacts |
| Source model evidence | `reference/reports/memory/PKT-13-source-model.md` | source type/authority/trust/freshness/sensitivity model verified |
| QA CLI/status evidence | `reference/reports/memory/PKT-13-qa-cli.md` | `operating-qa` command smoke and JSON contract pass |
| Token/context evidence | `reference/reports/memory/PKT-13-context-budget.md` | bounded retrieval and no raw evidence loading verified |
| Reset/retention evidence | `reference/reports/memory/PKT-13-reset-retention.md` | `ops-reset` and `operating-qa` behavior proves resettable query state without evidence-retention bypass |
| Negative source evidence | `reference/reports/validation/PKT-13-negative-sources.md` | stale, sensitive, low-authority, missing evidence, and prompt-like data rejected |
| Starter validation | `reference/reports/validation/PKT-13-starter-validation.md` | starter focused/full tests pass |
| Root validation/regression | `reference/reports/validation/PKT-13-root-validation.json`; `reference/reports/validation/PKT-13-root-regression.md` | root validation and applicable regression pass |
| Tester report | `reference/reports/test/PKT-13_TESTER_REPORT.md` | pass or defects routed |
| Security/adversarial review | `reference/reports/security/PKT-13-security-review.json` | pass or Human-approved residual risk |
| Reviewer adjudication | `reference/reports/review/PKT-13_REVIEW_REPORT.md` | pass after all evidence/lenses |
| Planner closeout | `reference/reports/closeout/PKT-13_PLANNER_CLOSEOUT.md` | records what PKT-14/15 may use as baseline |

## Required Closeout Lens Mapping
| Canonical Lens | PKT-13-Specific Questions |
| --- | --- |
| `challenge_review` | Does PKT-13 close Human Owner QA and operating-intelligence rows without absorbing PKT-14 real CLI E2E or PKT-15 friction/promotion loops? |
| `adversarial_security_review` | Can sensitive, secret, prompt-like, stale, or low-authority data enter wiki, handoff, context pack, or answer text? Can generated summaries override canonical evidence? |
| `code_quality_review` | Is the source model cohesive and bounded, or does it duplicate scattered indexing/query logic and broad raw file loading? |
| `evidence_review` | Do tests prove answer behavior and negative diagnostics, not merely that source files exist? Is root validation separated from product/starter proof? |

## Acceptance
### A1. Source Model
- Queryable source records cover packet state, evidence index, closeout, review, PM, wiki, wiki proposal, decision, risk, blocker, friction, active context, project intent, architecture decision, current convention, packet history, known friction, open risk, and deprecated context.
- Every source record includes source type, path/id, authority tier, trust status or equivalent, freshness status, sensitivity/redaction disposition, evidence refs, and answer eligibility.
- Missing required categories produce explicit `no_source:*` diagnostics instead of inferred claims.

### A2. Human Owner QA Contract
- `operating-qa` is the named Human Owner QA command.
- Required copied-starter invocation:
  `python _harness\bin\harness_cli.py --json --harness-root . operating-qa --question "<question>"`.
- Root wrapper support is optional, but if present it must preserve the same JSON result contract.
- The command returns JSON with at minimum:
  `schemaVersion`, `question`, `status`, `answer`, `whatHappened`, `why`, `evidenceRefs`, `risk`, `nextAction`, `sourceRefs`, `diagnostic_ids`, `omittedSourceDiagnostics`, `redactionDisposition`, `freshnessStatus`, `readModel`, and `authorityBoundary`.
- Representative answers for the five Human Owner questions cite eligible source refs and evidence refs.
- Answers are labeled read models and explicitly cannot approve Ready For Code, implementation, closeout, release, residual risk, or human gates.

### A3. Bounded Retrieval And Context Budget
- Query behavior uses compact index/source records before reading raw evidence bodies.
- Tests prove max-source, max-character, or token-budget limits and diagnostics.
- Raw logs, raw browser pages, full evidence files, and long generated summaries are not loaded into answers unless explicitly selected and bounded by contract.
- Product docs, logs, browser pages, external responses, PM text, wiki text, and LLM reports are treated as data, not instructions.

### A4. Authority And Freshness
- Generated summaries, Active Context, PM summaries, wiki pages, and LLM reports cannot override packets, trusted evidence, review evidence, closeout, gate results, or explicit Human decisions.
- Stale wiki/context/PM/generated sources either produce blocking diagnostics or are excluded from claim-supporting answers.
- Current next-work answers may cite fresh Active Context only as operational route/read-model evidence, not as approval authority.

### A5. Sensitive Evidence And Reset/Retention Boundary
- Sensitive or secret sources are omitted from answer text, wiki promotion, handoff context, and context packs.
- Omission diagnostics identify the source and target without leaking sensitive body content.
- `ops-reset` is the reset authority for resettable `_ops` operating memory.
- `operating-qa` source-index caches, generated `_ops` QA state, active-context read models, and wiki/PM/friction operating read models are resettable.
- `_harness/**`, `product/**`, and retained evidence records are not reset by `ops-reset`.
- After `ops-reset`, `operating-qa` must not infer claims from missing reset state; it must return explicit `no_source:*`, freshness, or retained-evidence diagnostics until sources are regenerated.
- Tests prove reset does not bypass evidence-retention boundaries and does not delete product docs or retained evidence fixtures.

### A6. Scope Control
- PKT-13 does not run real Codex CLI / Claude Code CLI workers or claim real provider E2E.
- PKT-13 does not add automatic friction-capture call-site integration, improvement-proposal promotion, or starter-promotion rehearsal.
- PKT-13 does not create a browser UI or release/publish workflow.

## Expected Negative Fixtures
| Fixture / Failure Condition | Expected Result | Evidence Path |
| --- | --- | --- |
| Answer has only generated summary and no canonical evidence. | blocked with generated/low-authority and missing-evidence diagnostics. | `reference/reports/validation/PKT-13-negative-sources.md` |
| Stale wiki or stale Active Context claims current status. | blocked or excluded with stale-source diagnostics. | `reference/reports/validation/PKT-13-negative-sources.md` |
| Sensitive/secret evidence appears in answer, wiki, handoff, or context pack. | omitted with sensitive promotion diagnostics; no secret body in answer. | `reference/reports/security/PKT-13-security-review.json` |
| Question asks for approval, closeout, release, or residual-risk acceptance. | answer refuses authority and cites approval boundary. | `reference/reports/memory/PKT-13-qa-cli.md` |
| Too many sources or raw evidence bodies would exceed budget. | bounded answer or diagnostic; no broad raw loading. | `reference/reports/memory/PKT-13-context-budget.md` |
| `ops-reset` runs before QA source regeneration. | `operating-qa` returns no-source/freshness diagnostics and does not infer claims from reset state. | `reference/reports/memory/PKT-13-reset-retention.md` |
| Retained evidence/product docs exist across reset. | `ops-reset` leaves retained evidence/product docs intact and QA can cite them after source regeneration. | `reference/reports/memory/PKT-13-reset-retention.md` |
| Friction source exists but PKT-15 automation is absent. | source can be cited as evidence; no automatic proposal/promotion claim. | `reference/reports/memory/PKT-13-source-model.md` |

## Verification Manifest
Default command templates. Developer may adjust exact flags only with evidence rationale.

- Ready For Code: approved
- root: `npm.cmd run harness:validate`; `npm.cmd test`; root regression evidence if applicable.
- standard-template: focused and full starter Python test discovery.
- targeted: long-memory QA, operating-qa CLI, context-budget, negative source, and reset/retention tests.
- validator: harness validator pass after implementation and state regeneration.
- active context: regenerate with `npm.cmd run harness:sync-state` after transitions and closeout.
- review closeout: Tester report, security/adversarial review, four independent closeout lenses, Reviewer adjudication, and Planner closeout.

```powershell
npm.cmd run harness:first-packet -- --work-item PKT-13_OPERATING_INTELLIGENCE_AND_QA --packet reference\packets\PKT-13_OPERATING_INTELLIGENCE_AND_QA.md --apply
npm.cmd run harness:transition -- planner-to-orchestrator --work-item PKT-13_OPERATING_INTELLIGENCE_AND_QA --gate-profile contract --apply
npm.cmd run harness:transition -- orchestrator-to-developer --work-item PKT-13_OPERATING_INTELLIGENCE_AND_QA --gate-profile contract --apply
npm.cmd run harness:validate
npm.cmd test
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_long_memory_question_answering.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt13_operating_intelligence_qa.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt05_security_and_transition_gates.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"
npm.cmd run harness:sync-state
```

Required verification:
- Root validation and root regression pass.
- Starter focused and full validation pass.
- `operating-qa` CLI/status smoke passes.
- Source model and context budget tests pass.
- Negative stale/sensitive/low-authority/missing-evidence fixtures pass.
- Reset/retention tests prove `ops-reset` does not bypass evidence retention and `operating-qa` fails closed after reset until sources are regenerated.
- Security/adversarial review passes or records Human-approved residual risk.
- Four independent closeout lenses pass before Planner closeout.

## Planner Packet Challenge Review
- Challenge reviewer: Goodall, independent explorer subagent
  `019f143b-dda5-7d51-a67d-ff490315f338`
- Challenge reviewer independence basis: read-only independent planning reviewer; not packet
  author, Developer, Tester, Orchestrator, generated summary, or main-session self-review;
  did not edit files or approve Ready For Code.
- Source refs reviewed: `reference/packets/PKT-13_OPERATING_INTELLIGENCE_AND_QA.md`;
  `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`;
  `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`;
  `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md`;
  current starter memory, CLI, context, wiki, PMO, self-improvement, and reset surfaces.
- Parent objective coverage: pass; PKT-13 covers Human Owner QA and queryable operating
  intelligence without claiming provider worker E2E, compound-loop automation, or starter
  promotion rehearsal.
- Deferred scope with named follow-up: pass; PKT-14 owns real Codex CLI / Claude Code CLI
  worker E2E and adjudication, and PKT-15 owns friction call-site integration,
  improvement proposal promotion, and starter-promotion rehearsal.
- Acceptance proves behavior change: pass; acceptance requires source-model coverage,
  named CLI JSON output, bounded retrieval, authority/freshness controls, sensitive-source
  omissions, reset/retention tests, root/starter validation, and four closeout lenses.
- Failure fixture or failure condition: unnamed QA command, ambiguous reset/retention,
  stale/generated-only answers, sensitive answer leakage, broad raw evidence loading,
  post-reset inferred claims, and accidental PKT-14/PKT-15 absorption.
- Reviewer closeout hold basis: missing source-model evidence, missing QA CLI smoke,
  missing bounded-retrieval tests, missing stale/sensitive negative fixtures, missing
  reset/retention evidence, root/starter validation failure, or unresolved closeout lens.
- First-wave limit check: pass; PKT-13 is limited to operating-intelligence QA and leaves
  provider worker E2E plus compound promotion loops to PKT-14 and PKT-15.
- Guidance-only sufficiency rationale: guidance-only is insufficient; PKT-13 requires
  runtime CLI/service behavior, source-index records, tests, and validation evidence.
- Challenge evidence artifact path: `reference/reports/review/PKT-13-planner-challenge-review.md`
- Challenge status: pass
- Findings disposition: initial blocking findings for unnamed QA command and ambiguous
  reset/retention contract were corrected; final independent rerun passed.
- Required corrections applied: yes
- No self-approval claim: independent reviewer is not the packet author; this review does
  not approve Ready For Code, implementation, closeout, release, or residual risk.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: Cicero, independent explorer subagent
  `019f143b-f3fa-77a0-97dd-92fbee36a944`
- Packet doc reviewer independence basis: independent packet document reviewer; not packet
  author, Developer, Tester, Orchestrator, generated summary, or main-session self-review;
  did not edit files, implement PKT-13, or make approval-state changes.
- Packet doc review evidence path: `reference/reports/review/PKT-13-packet-doc-review.md`
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
- Required corrections: none
- Findings disposition: no blocking packet-quality findings remain before implementation.
- No self-approval claim: independent reviewer is not the packet author; this review does
  not approve Ready For Code, implementation, residual risk, closeout, or release.

## Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| Ready For Code sign-off | yes | Human Owner | closed | Human Owner approved PKT-13 Ready For Code and Orchestrator delivery after independent planning reviews passed. |
| QA command/result contract | yes | Human Owner/Planner | closed | Packet selects `operating-qa --question "<question>" --json` equivalent starter CLI contract. |
| Reset/retention disposition | yes | Human Owner/Planner | closed | Packet closes disposition against existing `ops-reset`: resettable QA/index `_ops` read models reset; retained evidence/product docs are preserved; post-reset QA fails closed until regeneration. |
| Residual-risk/defer approval | yes if unresolved | Human Owner | not requested | Reviewer cannot accept unresolved sensitive evidence, stale authority, or answer-contract drift alone. |

## CSO Security Review
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-13-security-review.json
- Security review decision: pass
- Security review scope: operating-qa source discovery, answer-contract authority boundary, sensitive evidence handling, prompt-like source handling, reset/fail-closed behavior, evidence-reference trust, and retained evidence-index validation.

## Independent Review Lens Evidence
- challenge_review agent: 019f1471-aea2-7b63-a19a-3bde35c876a4
- challenge_review independence basis: read-only independent closeout lens reviewer; not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- challenge_review evidence path: reference/reports/review/PKT-13-closeout-challenge-review-rerun.md
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review reviewer disposition: accepted
- adversarial_security_review agent: 019f1471-2cf1-7342-a957-bb5d0443d05f
- adversarial_security_review independence basis: read-only independent closeout lens reviewer; not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- adversarial_security_review evidence path: reference/reports/review/PKT-13-adversarial-security-review-rerun.md
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review reviewer disposition: accepted
- code_quality_review agent: 019f1471-c38e-7561-aaa2-3f92ebbd837a
- code_quality_review independence basis: read-only independent closeout lens reviewer; not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- code_quality_review evidence path: reference/reports/review/PKT-13-code-quality-review-rerun.md
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: accepted
- evidence_review agent: 019f1471-d19c-7443-9e43-e575a2c4ac58
- evidence_review independence basis: read-only independent closeout lens reviewer; not Developer, Tester, Orchestrator, Planner, generated summary, or main-session self-review.
- evidence_review evidence path: reference/reports/review/PKT-13-evidence-review-rerun.md
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: accepted

## 15. Packet Exit Quality Gate
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Source parity result: pass
- Validation / security / cleanup evidence: pass
- Planner closeout evidence: `reference/reports/closeout/PKT-13_PLANNER_CLOSEOUT.md`.
- Implementation delta summary: `operating-qa` CLI and operating-intelligence source model were implemented with bounded retrieval, prompt-like source omission, classifier fail-closed behavior, reset/retention alignment, retained evidence-index trust validation, and question-relevant source ordering before budget truncation.
- Refactor / residual debt disposition: no blocking implementation debt remains. Non-blocking follow-ups are structured PM/WBS source ingestion and lower-level non-index retained `reference/**` evidence-ref hardening for direct builder callers.
- Documentation impact / docs parity result: pass; `START_HERE.md` was updated for `operating-qa` and packet-bound evidence records the CLI/status contract.
- Deferred follow-up item: PKT-14 real provider CLI E2E and PKT-15 compound loop / starter-promotion rehearsal remain out of scope.

## Reopen Trigger
Reopen or return to Planner if:
- QA answers can rely on generated summaries, stale sources, or low-authority text as truth.
- Sensitive evidence can appear in answer text, wiki, handoff context, or context packs.
- The named QA command cannot be implemented without broad raw evidence loading.
- `ops-reset` / retention behavior is ambiguous or evidence retention can be bypassed.
- Implementation absorbs PKT-14 provider CLI E2E or PKT-15 friction/promotion automation.
