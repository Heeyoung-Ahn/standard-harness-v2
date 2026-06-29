# PKT-15 Compound Loop And Starter Promotion Rehearsal

> READY FOR CODE APPROVED. Independent Planner Packet Challenge Review and independent
> `packet_doc_review` passed before Human Owner Ready For Code approval was recorded.
> Implementation must still preserve the packet scope, starter-promotion overlay,
> approval boundaries, and verification gates below.

## Purpose
Turn the PKT-10 self-improvement lifecycle into a real operating loop by wiring
`RuntimeFrictionCapture` into existing runtime call sites, promoting repeated friction into
evidence-linked improvement proposals and starter-promotion candidates, and rehearsing the
promotion path through dry-run and copied-starter smoke validation.

PKT-15 must prove the compound loop works without granting approval authority, publishing
a starter, or contaminating the copied starter payload with root development history,
generated state, provider-specific entry contracts, caches, local DB files, evidence
history, wiki state, or secrets.

## Quick Decision Header
| Item | Proposed | Why | Status |
| --- | --- | --- | --- |
| Work item | `PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL` | Final v2.0 hardening packet after PKT-14 closeout; owns automatic friction capture and starter-promotion rehearsal. | selected |
| Ready For Code | approved | Independent Planner Packet Challenge Review and independent `packet_doc_review` passed; Human Owner approved PKT-15 Ready For Code as part of the active v2.0 hardening goal on 2026-06-30. | closed |
| Packet type | `starter-promotion` | The packet changes reusable starter self-improvement behavior and rehearses promotion safety. | selected |
| Risk level | high | A weak implementation could silently mutate starter payload, promote untrusted evidence, or turn friction/proposal records into approval authority. | selected |
| Risk class | high / starter-promotion / contract | Runtime call-site capture, proposal promotion, dry-run, copied-starter smoke, and contamination checks are load-bearing starter contract surfaces. | selected |
| Gate profile | contract | Requires harness-system evidence plus starter-promotion contamination, copied-starter smoke, approval-needed hard stop, and independent review evidence. | selected |
| Gate overlay | starter-promotion | Adds contamination checks, copied-starter smoke, harness validation, independent review evidence, and approval-needed stop tests on top of the canonical contract gate. | selected |
| Gate profile version | `starter-promotion@contract/v1` | Uses strict promotion rehearsal gates; no fast path. | selected |
| Route class | packet-path | Not fast-path eligible; implementation must produce runtime behavior, tests, smoke evidence, and closeout lenses. | selected |
| Change zone | core | Self-improvement, validation, PM, review, closeout, context budget, root promotion tooling, and starter payload boundaries are core harness surfaces. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | selected |
| Risk if started now | high | Implementation must not start until independent planning reviews pass and explicit Ready For Code is recorded; promotion rehearsal without the starter-promotion overlay could create false promotion or contamination evidence. | selected |
| User-facing impact | none | No browser or product UI; operator impact is CLI/status/evidence behavior. | closed |
| Operator-facing CLI/status impact | yes | Promotion rehearsal and compound-loop evidence must be inspectable through existing or new named CLI/status surfaces. | selected |
| Layer classification | core | Reusable compound feedback and starter promotion safety are core v2 harness behavior. | selected |
| Existing dependency | internal | Builds on PKT-10 self-improvement services, PKT-11 baseline, PKT-12 boundary cleanup, PKT-13 operating-intelligence QA, and PKT-14 Conductor evidence boundaries. | selected |
| Existing system dependency | internal | Depends on `RuntimeFrictionCapture`, friction/proposal/candidate services, `promote-starter`, starter contamination checks, copied-starter verification commands, and operating QA indexing. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile is active for this packet. | closed |
| UX archetype status | not-needed | No browser UI or visual UX surface is included. | closed |
| UX/browser evidence | not needed | No browser surface. CLI/status JSON, evidence artifacts, and smoke command output are the interaction surfaces. | closed |
| Environment topology status | approved | Local-only rehearsal topology is approved for PKT-15; promotion rehearsal writes only to a local temporary/export target and must not publish, deploy, or mutate a release channel. | closed |
| Domain foundation status | approved | Domain is runtime friction capture, recurring detection, improvement proposal promotion, starter-promotion candidate lifecycle, dry-run, copied-starter smoke, and approval boundary. | selected |
| Authoritative source intake status | approved | Source is Human Owner hardening direction plus Implementation Plan PKT-15 rows, Requirements SHV2-REQ-002/003/016/022/033/034/042/045/046, Architecture Guide self-improvement and starter boundary sections, and PKT-14 closeout defer boundary. | selected |
| New authoritative source impact | analyzed | No new external source is introduced; PKT-15 implements previously approved hardening direction and PKT-14 defer scope. | selected |
| Shared-source wave status | not-needed | This is not a sibling-project rollout or release. | closed |
| Promotion execution / release | not-approved | Dry-run and copied-starter smoke are allowed only as rehearsal evidence; actual promotion, publish, release, and rollout remain separate Human approval boundaries. | selected |
| Planner Packet Challenge Review | pass | Independent challenge review verified source alignment, acceptance strength, risk, regression pressure, and authority boundaries before Ready For Code. | closed |
| Packet doc review | pass | Independent packet document review verified hardening matrix rows and readiness conditions were not weakened before Ready For Code. | closed |
| Packet exit gate status | pass | Implementation, tests, security/review, starter smoke, validation, and Planner closeout evidence are recorded. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority;
  Hardening Concern Coverage; PKT-15 Readiness Conditions; Call-Site Matrix; Modeling
  Impact; In Scope; Out Of Scope; Acceptance; Expected Negative Fixtures; Verification
  Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet
  Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Packet Exit
  Quality Gate; Reopen Trigger
- Lane-type conditional sections: Security Review Request; Starter-Promotion Overlay
  Evidence; Promotion Rehearsal Boundary
- Lane-type not-needed sections: UX / browser evidence; deployment / release publication;
  live provider CLI execution
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-10 self-improvement baseline, PKT-11 through PKT-14 closeouts, starter self-improvement services, validation/review/PM/closeout/context call sites, starter CLI, root promote-starter command, and existing compound/promotion tests.
- Required reading detail:
  - `.agents/artifacts/REQUIREMENTS.md`
  - `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  - `.agents/artifacts/ARCHITECTURE_GUIDE.md`
  - `reference/packets/PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION.md`
  - `reference/reports/closeout/PKT-11_PLANNER_CLOSEOUT.md`
  - `reference/reports/closeout/PKT-12_PLANNER_CLOSEOUT.md`
  - `reference/reports/closeout/PKT-13_PLANNER_CLOSEOUT.md`
  - `reference/reports/closeout/PKT-14_PLANNER_CLOSEOUT.md`
  - `starter/standard-harness/_harness/system/standard_harness/self_improvement/friction.py`
  - `starter/standard-harness/_harness/system/standard_harness/self_improvement/recurring.py`
  - `starter/standard-harness/_harness/system/standard_harness/self_improvement/proposals.py`
  - `starter/standard-harness/_harness/system/standard_harness/self_improvement/starter_promotion.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/review_governance.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/final_closeout.py`
  - `starter/standard-harness/_harness/system/standard_harness/validation/pmo_reports.py`
  - `starter/standard-harness/_harness/system/standard_harness/context/budget.py`
  - `starter/standard-harness/_harness/system/standard_harness/context/packs.py`
  - `starter/standard-harness/_harness/system/standard_harness/pmo/reports.py`
  - `starter/standard-harness/_harness/system/standard_harness/reviews/adjudication.py`
  - `starter/standard-harness/_harness/system/standard_harness/documenter/closeout_report.py`
  - `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
  - `.harness/runtime/state/promote-starter.js`
  - `.harness/test/promote-starter.test.js`
  - `starter/standard-harness/_harness/test/test_compound_feedback_promotion.py`
- Source-of-truth order: approved packet, explicit Human Owner decisions, Requirements,
  Implementation Plan, Architecture Guide, trusted evidence, and closeout reports first.
  Friction records, proposals, promotion candidates, QA answers, PM reports, Wiki memory,
  and generated state are evidence/read models only and cannot approve promotion,
  release, closeout, residual risk, or Ready For Code.
- Environment topology reference: local root repository plus local copied-starter export
  target only; no remote deploy, release, publish, or cloud environment.
- Source environment: `C:\Newface\30 Github\standard-harness-v2`, including root runtime
  commands and `starter/standard-harness/` payload.
- Target environment: separate local promotion rehearsal target such as
  `C:\tmp\standard-harness-pkt15-dry-run` or `C:\tmp\standard-harness-pkt15-smoke`.
- Execution target: local harness commands, root Node tests, starter Python tests, and
  copied-starter smoke commands.
- Transfer boundary: only sanitized starter-promotion export/copy-smoke rehearsal may
  write to the target directory; no root `.git`, root `.agents`, generated state, local
  DB/cache, evidence history, wiki state, secrets, or provider-specific entry contracts
  may cross.
- Rollback boundary: revert PKT-15 packet-scoped code/docs/evidence changes and delete
  local `C:\tmp\standard-harness-pkt15-*` rehearsal targets if created.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`;
  `reference/packets/PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION.md`;
  `reference/reports/closeout/PKT-14_PLANNER_CLOSEOUT.md`.
- Schema impact classification: conditional
- Schema impact note: PKT-15 should prefer existing friction/proposal/candidate schema
  contracts. Schema edits are allowed only if implementation evidence proves the
  call-site or promotion rehearsal contract cannot be represented by existing schemas.
- Authoritative source intake reference: Human Owner v2.0 hardening direction;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-15 rows and readiness requirements;
  `.agents/artifacts/REQUIREMENTS.md` SHV2 requirements; Architecture Guide
  self-improvement and starter boundary sections; PKT-10 and PKT-14 closeout boundaries.
- Authoritative source disposition: accepted for packet planning; implementation must
  preserve packet-before-code, starter-promotion overlay, copied-starter clean boundary,
  and Human approval gates.
- Current implementation impact: PKT-10 provides services and tests for friction,
  recurring detection, proposals, candidates, and candidate safety; PKT-15 must wire those
  services into actual runtime call sites and root promotion rehearsal evidence.
- Existing plan conflict: none blocking; PKT-15 is the named follow-up for compound-loop
  and starter-promotion rehearsal after PKT-14 closeout.
- Impacted packet set scope: PKT-15 implementation only; PKT-10 is a baseline, PKT-13 is
  a queryability baseline, and PKT-14 is an E2E/adjudication baseline. Actual promotion,
  release, publish, and sibling rollout remain out of scope.

## Source Authority
- Human Owner hardening direction: automatic `RuntimeFrictionCapture` call-site
  integration, friction-to-improvement/starter-promotion compound loop, starter promotion
  dry-run, copied-starter smoke validation, and queryable operating intelligence are the
  remaining core hardening concerns.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-15 row:
  - Wire automatic `RuntimeFrictionCapture` call sites into validation, PM, review,
    closeout, and context-budget paths.
  - Promote repeated friction into improvement proposals and starter-promotion
    candidates.
  - Run dry-run and copied-starter smoke rehearsal.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` hardening matrix rows assigned to PKT-15:
  - Clean starter contamination checks must cover the full forbidden set.
  - Existing validation, PM, review, closeout, and context-budget paths must
    automatically call `RuntimeFrictionCapture`.
  - Repeated friction must close the loop into improvement proposal and
    starter-promotion candidate generation.
  - Starter promotion dry-run and copied-starter smoke validation must be proven as a
    real usage loop.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-15 readiness:
  - Include a call-site matrix with source module/function, trigger condition,
    `RuntimeFrictionCapture` method, recurrence key, evidence artifact, duplicate
    suppression rule, and test fixture.
  - Use `starter-promotion` gate profile or explicit overlay with contamination checks,
    copied-starter smoke, harness validation, independent review evidence, and
    approval-needed stop tests.
- `.agents/artifacts/REQUIREMENTS.md`: SHV2-REQ-002, 003, 004, 016, 018, 021, 022, 023,
  033, 034, 042, 044, 045, 046, and 047.
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`: self-improvement owns friction, recurring
  issue detection, improvement proposals, and starter-promotion candidates; `_ops/` owns
  operating records; root history and generated state must not enter starter payload.
- PKT-14 closeout: PKT-15 owns automatic friction promotion and starter-promotion
  rehearsal; PKT-14 evidence cannot be used as proof this loop exists.

## Hardening Concern Coverage
These rows are copied into acceptance so implementation cannot close by only mentioning
the matrix.

| Concern | Requirement IDs | PKT-15 Required Closure Evidence |
| --- | --- | --- |
| Clean starter contamination checks do not explicitly cover the full forbidden set. | SHV2-REQ-002, 003, 004, 005, 018, 022 | Copied-starter smoke and negative fixtures reject `.agents`, `.harness`, `AGENTS.md`, root history, generated runtime state, packet evidence, wiki state, local DB files, caches, secrets, and provider-specific entry contracts. |
| Existing validation, PM, review, closeout, and context-budget paths do not automatically call `RuntimeFrictionCapture`. | SHV2-REQ-016, 034, 042 | Call-site integration tests prove automatic friction capture from those paths without relying on manual CLI-only entry. |
| Repeated friction is not yet a closed loop into improvement proposal and starter-promotion candidate generation. | SHV2-REQ-016, 033, 042 | Repeated friction produces evidence-linked improvement proposals and starter-promotion candidates that stop at `approval-needed`. |
| Starter promotion dry-run and copied-starter smoke validation are not yet proven as a real usage loop. | SHV2-REQ-002, 003, 016, 022, 045, 046 | Dry-run plus copied-starter smoke evidence proves promotion candidates can be rehearsed without contaminating the starter payload and with the starter-promotion gate overlay active. |

## PKT-15 Readiness Conditions
Before Ready For Code, this packet must satisfy all readiness checks below:
- The Call-Site Matrix below names exact runtime/service source surfaces, trigger
  conditions, `RuntimeFrictionCapture` methods, recurrence keys, evidence artifacts,
  duplicate-suppression rules, and test fixtures.
- Acceptance directly references every PKT-15 hardening matrix row and requirement ID.
- The Verification Manifest names concrete command templates for targeted tests, root
  validation, root regression, copied-starter smoke, promotion dry-run, and closeout
  review.
- Independent `packet_doc_review` must reject prose-only closure, fixture-only promotion
  claims, generated-summary authority, approval-needed-as-approval, and missing
  call-site integration evidence.
- The packet must use the `starter-promotion` overlay, including contamination checks,
  copied-starter smoke, harness validation, independent review evidence, and
  approval-needed stop tests.

## Call-Site Matrix
Developer may adjust exact function names only after reading the current implementation,
but may not remove a required surface without returning to Planner.

| Required Surface | Source Module / Function Target | Trigger Condition | `RuntimeFrictionCapture` Method | Recurrence Key | Evidence Artifact | Duplicate Suppression Rule | Test Fixture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Validation failure | `validation/aggregator.py::ValidationService.validate_all` and `ValidationService.validate_packet` | Any returned diagnostic with blocking/high failure semantics from state, starter, packet, projection, readiness, evidence, gate, approval, or challenge validation | `validation_failure` | `validation_failure:validator_failure:<diagnostic-error-code>` | `reference/reports/friction/PKT-15-call-site-validation.md` | Same packet/workflow, `ValidationService` method, diagnostic error code, and evidence ref records one signal per run/evidence id. | `PKT15-CALLSITE-VALIDATION-FAIL`: inject a failing diagnostic and assert a stored friction signal without changing failure semantics |
| Validation pass with warnings | `validation/aggregator.py::ValidationService.validate_all` and `ValidationService.validate_packet` warning/result adapter added by Developer when diagnostics are non-blocking | Validation returns non-blocking warning diagnostics while the command/result remains pass | `validation_pass_with_warnings` | `validation_pass_with_warnings:validation_pass_with_warnings:<warning-code>` | `reference/reports/friction/PKT-15-call-site-validation.md` | Warning-only pass records evidence but remains pass; duplicate warning/evidence pair is idempotent. | `PKT15-CALLSITE-VALIDATION-WARN`: assert pass result plus warning friction signal |
| Review finding / evidence gap | `validation/review_governance.py::ReviewGovernanceValidator.validate_release`; `reviews/adjudication.py::ChallengeReviewService.open_challenge`; `ChallengeReviewService.record_independent_review`; `ChallengeReviewService.record_adjudication` | Missing required independent review, missing evidence, rejected review evidence, or review finding that blocks release/closeout readiness | `review_finding_or_evidence_gap` | `review_finding_or_evidence_gap:missing_required_evidence:<lens-or-gate>` | `reference/reports/friction/PKT-15-call-site-review.md` | Same packet id, lens/gate id, and evidence ref records one signal. | `PKT15-CALLSITE-REVIEW-GAP`: missing lens evidence records signal and preserves review block |
| PM report status friction | `pmo/reports.py::PmoDailyReportService.build_day_start_report`, `PmoDailyReportService.build_day_wrap_up_report`, and `validation/pmo_reports.py::validate_pmo_report` | PM status/report detects repeated blocker, stale status, manual rework, missing WBS/status source, or invalid PM report structure | `pm_report_status_friction` | `pm_report_status_friction:manual_rework_repeated:<status-or-wbs-key>` | `reference/reports/friction/PKT-15-call-site-pm.md` | Same PM period, packet id, and blocker/status key records one signal. | `PKT15-CALLSITE-PM-STATUS`: PM status friction is recorded without approval mutation |
| Closeout state mismatch | `validation/final_closeout.py::FinalCloseoutValidator.validate_release` and `documenter/closeout_report.py::CloseoutReportDocumenter.validate_report` | Closeout claim conflicts with packet state, evidence index, generated context, required closeout fields, or final release/closeout requirements | `closeout_state_mismatch` | `closeout_state_mismatch:closeout_state_mismatch:<packet-id>` | `reference/reports/friction/PKT-15-call-site-closeout.md` | Same packet id and closeout evidence ref records one signal. | `PKT15-CALLSITE-CLOSEOUT-MISMATCH`: mismatched closeout status records signal and blocks closeout |
| Context token budget overrun | `context/packs.py::ContextPackBuilder.build`, `context/budget.py::TokenBudgetPolicy.budget_for`, and `context/budget.py::estimate_tokens` | Estimated or actual context exceeds budget, broad raw evidence load is attempted, or stale/generated source is pruned | `context_token_budget_overrun` | `context_token_budget_overrun:token_overuse:<context-pack-or-role>` | `reference/reports/friction/PKT-15-call-site-context.md` | Same role/context pack, budget policy, and source ref records one signal. | `PKT15-CALLSITE-CONTEXT-BUDGET`: budget overrun produces bounded output plus friction signal |
| Authority boundary violation | `validation/human_decision.py::HumanDecisionValidator.validate`, `validation/challenge_gate.py::ChallengeGateValidator.evaluate`, and `workflow/conductor_worker_e2e.py::ConductorWorkerE2ERunner.run` authority-boundary output | LLM/PM/Wiki/Conductor/friction/proposal/candidate tries to approve Ready For Code, closeout, release, residual risk, or promotion | `authority_boundary_violation` | `authority_boundary_violation:boundary_violation:<authority-surface>` | `reference/reports/friction/PKT-15-call-site-authority.md` | Same authority surface, attempted action, and evidence ref records one signal. | `PKT15-CALLSITE-AUTHORITY-BLOCK`: violation is rejected and only evidence signal is recorded |

If implementation discovery proves a named hook is not the actual runtime path, Developer must return to Planner with source evidence and a replacement row before implementing that surface. A helper may be added only when these canonical runtime methods call it directly and tests prove the canonical method path records the signal.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A validation/review/PM/closeout/context-budget failure occurs
  during real harness operation. The relevant service automatically records a structured
  friction signal with evidence. Repeated signals are grouped; an evidence-linked
  improvement proposal is created; an accepted proposal creates a starter-promotion
  candidate; dry-run and copied-starter smoke validate safety; the candidate stops at
  `approval-needed` and cannot mutate starter, release, or approve itself.
- Public command/status contract: Developer may add or harden a named CLI/status surface
  only if needed, but the operator must be able to inspect the compound-loop state and
  promotion rehearsal evidence. Candidate command names include
  `compound-feedback --json`, `promotion-rehearsal --json`, or existing equivalents.
- API contract: existing self-improvement services expose friction signals, recurring
  groups, improvement proposals, starter-promotion candidates, dry-run reports,
  validation results, metrics, and approval-needed status. PKT-15 must connect these
  services to runtime call sites and root promotion rehearsal without making any record an
  approval source.
- Component responsibility: validation/review/PM/closeout/context modules own detection;
  `RuntimeFrictionCapture` owns normalization; event store or `_ops/friction` records own
  persistence; recurring/proposal/candidate services own promotion lifecycle; root
  `promote-starter` owns dry-run/copy-smoke rehearsal; operating QA reads indexes only.
- Data ownership: friction signals, recurring groups, proposals, candidates, dry-run
  reports, copied-starter smoke results, and contamination findings are structured
  operating evidence. Human approval records remain separate authority for actual
  promotion/release decisions.
- Public contract vs internal/scratch field: public contract is the named operator
  CLI/status output, persisted event or `_ops` evidence records, promotion dry-run report,
  copied-starter smoke report, and operating QA source records. Temporary export targets,
  raw command output, local caches, and implementation-only helper fields are scratch
  evidence and must not become starter identity or approval authority.
- Allowed dependency direction: call sites may append friction evidence through bounded
  capture services; self-improvement may read friction and evidence references; promotion
  rehearsal may export to a separate target; no call site or candidate may mutate
  approval state, starter source, release state, generated state, or Human decisions.
- Failure condition: friction remains manual/CLI-only, repeated friction creates a
  candidate without evidence, candidate reaches approved/promoted status, dry-run mutates
  starter, copied-starter smoke passes with contamination, or operating QA treats
  proposal/candidate evidence as approval.

## In Scope
- Wire automatic `RuntimeFrictionCapture` calls into validation failure/warning, review
  gap, PM report/status friction, closeout mismatch, context-token-budget, and authority
  boundary surfaces.
- Persist or index friction signals through the existing durable event-store or `_ops`
  record path with evidence refs, source refs, recurrence keys, severity, suggested route,
  authority boundary, and duplicate suppression.
- Add focused integration tests for every Call-Site Matrix row.
- Ensure repeated friction groups can produce improvement proposals and starter-promotion
  candidates only when evidence and review/acceptance conditions are met.
- Prove single/unverified friction cannot create a starter-promotion candidate.
- Prove accepted proposals can produce candidates that move through dry-run and validation
  to `approval-needed` only, never `approved` or `promoted`.
- Use root `harness:promote-starter` dry-run and copied-starter smoke validation, or a
  clearly equivalent rehearsal command, against a separate target directory.
- Extend copied-starter smoke and contamination negative fixtures to cover `.agents`,
  `.harness`, `AGENTS.md`, root history, generated runtime state, packet evidence, wiki
  state, local DB files, caches, secrets, and provider-specific entry contracts.
- Feed compound-loop and rehearsal evidence into the PKT-13 operating-intelligence source
  model as queryable evidence-only records.

## Out Of Scope
- No actual starter promotion, release, publish, marketplace distribution, package
  release, sibling rollout, or remote deployment.
- No mutation of `starter/standard-harness/` as a promotion side effect. Code changes to
  starter payload are allowed only as packet-scoped implementation, not as promotion
  execution.
- No provider-specific product identity or provider-specific entry contract.
- No storage or copying of API keys, auth/session files, cookies, provider caches, local
  DB files, raw transcripts, or unredacted secrets.
- No reliance on generated summaries, PM reports, Wiki memory, QA answers, friction
  signals, proposals, candidates, Conductor adjudication, or LLM consensus as approval.
- No broad rewrite of PKT-13 operating QA or PKT-14 worker E2E; PKT-15 only adds source
  records needed to query compound-loop and rehearsal evidence.

## Acceptance
### Acceptance Trace Matrix
| Acceptance | Hardening Matrix Row Closed | Requirement IDs |
| --- | --- | --- |
| A1 Automatic Runtime Friction Capture | Existing validation, PM, review, closeout, and context-budget paths do not automatically call `RuntimeFrictionCapture`. | SHV2-REQ-016, SHV2-REQ-034, SHV2-REQ-042 |
| A2 Duplicate Suppression And Evidence Quality | Existing validation, PM, review, closeout, and context-budget paths do not automatically call `RuntimeFrictionCapture`; repeated friction must not be inflated by duplicate records. | SHV2-REQ-016, SHV2-REQ-018, SHV2-REQ-021, SHV2-REQ-034, SHV2-REQ-042 |
| A3 Closed Loop To Improvement Proposal | Repeated friction is not yet a closed loop into improvement proposal and starter-promotion candidate generation. | SHV2-REQ-016, SHV2-REQ-033, SHV2-REQ-042 |
| A4 Starter-Promotion Candidate Lifecycle | Repeated friction is not yet a closed loop into improvement proposal and starter-promotion candidate generation; approval-needed must remain a hard stop. | SHV2-REQ-016, SHV2-REQ-022, SHV2-REQ-033, SHV2-REQ-042, SHV2-REQ-045, SHV2-REQ-046 |
| A5 Promotion Dry-Run And Copied-Starter Smoke | Starter promotion dry-run and copied-starter smoke validation are not yet proven as a real usage loop. | SHV2-REQ-002, SHV2-REQ-003, SHV2-REQ-016, SHV2-REQ-022, SHV2-REQ-045, SHV2-REQ-046 |
| A6 Full Forbidden Contamination Set | Clean starter contamination checks do not explicitly cover the full forbidden set. | SHV2-REQ-002, SHV2-REQ-003, SHV2-REQ-004, SHV2-REQ-005, SHV2-REQ-018, SHV2-REQ-022 |
| A7 Operating Intelligence Queryability | Repeated friction and starter-promotion rehearsal evidence must be queryable as evidence-only operating intelligence. | SHV2-REQ-015, SHV2-REQ-016, SHV2-REQ-033, SHV2-REQ-039, SHV2-REQ-042, SHV2-REQ-047 |
| A8 Starter-Promotion Overlay And Closeout Gates | Starter promotion dry-run and copied-starter smoke validation must close under starter-promotion overlay gates. | SHV2-REQ-002, SHV2-REQ-003, SHV2-REQ-016, SHV2-REQ-022, SHV2-REQ-045, SHV2-REQ-046, SHV2-REQ-047 |

### A1. Automatic Runtime Friction Capture
- Every required row in the Call-Site Matrix is implemented or returns to Planner with a
  concrete replacement surface before code continues.
- Validation failure, validation warning, review/evidence gap, PM status friction,
  closeout mismatch, context-token-budget overrun, and authority-boundary violation paths
  automatically call `RuntimeFrictionCapture`; manual CLI-only capture is insufficient.
- The original gate behavior is preserved: failed validations still fail, warning-only
  validation can remain pass with friction evidence, review/closeout/authority blocks
  still block, and PM/report friction does not approve or close work.
- Evidence: `reference/reports/friction/PKT-15-call-site-*.md` plus focused tests.

### A2. Duplicate Suppression And Evidence Quality
- Duplicate suppression is keyed by packet/workflow/source surface, recurrence key,
  diagnostic or authority code, and evidence ref.
- Duplicate suppression must prevent repeated identical signals from inflating proposal
  eligibility while still allowing distinct evidence-backed occurrences to count.
- Signals without evidence refs, unknown surfaces, docs-only/manual-only capture, or
  unredacted sensitive evidence are rejected.
- Evidence: duplicate-suppression test report and durable event/idempotency evidence.

### A3. Closed Loop To Improvement Proposal
- Repeated evidence-backed friction is grouped by stable recurrence keys and can create
  an improvement proposal with source friction ids or group ids, affected surface,
  problem statement, expected improvement, risk, verification method, evidence refs, and
  required target packet boundary.
- A single unverified signal, prose-only friction, missing evidence, or docs-only capture
  cannot create a proposal that is eligible for starter promotion.
- Accepted proposals can create wiki/long-memory candidates only through proposal flow and
  must not directly mutate Wiki memory.
- Evidence: proposal lifecycle tests and `reference/reports/friction/PKT-15-proposal-loop.md`.

### A4. Starter-Promotion Candidate Lifecycle
- Only accepted evidence-linked proposals can create starter-promotion candidates.
- Candidate lifecycle is `candidate -> dry-run -> validation -> approval-needed`.
- Candidate status `approved`, `promoted`, or equivalent execution state is rejected in
  PKT-15.
- Candidate evidence manifests and changed-surface plans reject root history, generated
  state, local DB/cache files, packet evidence, wiki state, provider-specific entry
  contracts, raw logs/transcripts, and sensitive material.
- Evidence: candidate lifecycle tests and
  `reference/reports/promotion/PKT-15-candidate-lifecycle.md`.

### A5. Promotion Dry-Run And Copied-Starter Smoke
- Promotion rehearsal runs against a separate export target under an allowed temp or
  evidence directory, never the source repository.
- Dry-run output records include/exclude/review decisions and authority denial.
- Copied-starter smoke includes contamination audit and fresh starter validation lanes:
  dependency install plan or execution, payload tests, payload boundary, pre-init
  bootstrap hold, non-interactive init, sync-state, post-init validation, and status.
- If environment constraints prevent full `--verify` execution, PKT-15 must record the
  exact blocked lane, explicit N/A/manual-required rationale, and must not claim copied
  starter smoke pass.
- Evidence: `reference/reports/promotion/PKT-15-promotion-dry-run.json` and
  `reference/reports/promotion/PKT-15-copied-starter-smoke.md`.

### A6. Full Forbidden Contamination Set
- Negative fixtures prove copied-starter smoke rejects `.agents`, `.harness`, `AGENTS.md`,
  root history, generated runtime state, packet evidence, wiki state, local DB files,
  generic caches, provider caches, secrets, API key-like values/files, auth files,
  session files, cookie files, raw logs/transcripts, unredacted sensitive material, and
  provider-specific entry contracts.
- The copied starter remains clean, copyable, and immediately usable according to fresh
  starter fallback semantics; missing generated runtime state before init is not treated
  as product failure.
- Evidence: `reference/reports/promotion/PKT-15-contamination-negative-fixtures.md` and
  root `promote-starter` tests.

### A7. Operating Intelligence Queryability
- Compound-loop evidence, friction signals, proposal state, candidate state, dry-run
  status, copied-starter smoke status, contamination findings, and approval-needed
  boundary are queryable through the PKT-13 operating-intelligence model as evidence-only
  sources.
- The QA answer contract can answer: what friction happened, why it was grouped, what
  evidence supports it, what proposal/candidate exists, what dry-run/smoke result exists,
  and what next action is required.
- QA, PM, Wiki, Active Context, proposals, and candidates cannot approve Ready For Code,
  closeout, release, residual risk, or promotion.
- Evidence: `reference/reports/promotion/PKT-15-operating-qa.md` and focused QA tests.

### A8. Starter-Promotion Overlay And Closeout Gates
- Packet preflight and transition evidence show the starter-promotion overlay or
  equivalent strict contract gate is active.
- Root validation, root regression, targeted starter tests, promotion dry-run,
  copied-starter smoke, contamination negative fixtures, security review, Tester report,
  four independent closeout lenses, Reviewer adjudication, and Planner closeout are
  required before closeout.
- Any residual promotion/smoke/contamination limitation requires named defer owner,
  Reviewer disposition, and explicit Human Owner residual-risk/defer approval.

## Expected Negative Fixtures
| Fixture / Failure Condition | Expected Result | Evidence Path |
| --- | --- | --- |
| Call site only exposes docs/prose/manual capture. | Capture blocked with `docs_only_capture_entrypoint` or equivalent; no proposal eligibility. | `reference/reports/friction/PKT-15-call-site-validation.md` |
| Validation failure path emits no friction signal. | Focused test fails; packet cannot close. | `reference/reports/friction/PKT-15-call-site-validation.md` |
| Review gap or missing lens is recorded only in Reviewer prose. | Closeout blocked; automatic review/evidence-gap friction signal required. | `reference/reports/friction/PKT-15-call-site-review.md` |
| Repeated identical signal uses same evidence ref and recurrence key. | Duplicate suppressed; eligibility count not inflated. | `reference/reports/friction/PKT-15-duplicate-suppression.md` |
| Single unverified friction creates starter-promotion candidate. | Candidate creation blocked. | `reference/reports/friction/PKT-15-proposal-loop.md` |
| Candidate tries status `approved` or `promoted`. | Blocked with promotion execution out-of-scope diagnostic. | `reference/reports/promotion/PKT-15-candidate-lifecycle.md` |
| Dry-run mutates starter source. | Blocked; no validation or approval-needed transition. | `reference/reports/promotion/PKT-15-promotion-dry-run.json` |
| Copied-starter export contains `.agents`, `.harness`, `AGENTS.md`, root history, generated runtime state, packet evidence, wiki state, local DB, cache, secret, or provider-specific entry contract. | Contamination audit blocks smoke pass. | `reference/reports/promotion/PKT-15-contamination-negative-fixtures.md` |
| Copied-starter export contains API key-like files or values, auth/session/cookie files, provider cache paths, raw logs/transcripts, or unredacted sensitive material. | Contamination/security audit blocks smoke pass and records the exact forbidden class. | `reference/reports/promotion/PKT-15-contamination-negative-fixtures.md`; `reference/reports/security/PKT-15-security-review.json` |
| QA answer treats candidate approval-needed as promotion approval. | QA returns evidence-only boundary and next Human/trusted-harness decision requirement. | `reference/reports/promotion/PKT-15-operating-qa.md` |

## Verification Manifest
Default command templates. Developer may adjust exact flags only with evidence rationale.

Pre-RFC read-only/planning-open preview:

```powershell
npm.cmd run harness:packet-preflight -- --stage planning-open --packet reference\packets\PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md --work-item PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL
```

Pre-RFC review gates:
- Independent Planner Packet Challenge Review must pass and write
  `reference/reports/review/PKT-15-planner-challenge-review.md`.
- Independent `packet_doc_review` must pass and write
  `reference/reports/review/PKT-15-packet-doc-review.md`.
- Ready For Code remained `pending` until both reviews passed; Human Owner Ready For Code
  approval is now recorded.

State-changing route commands may run only after the review gates pass and explicit Human
Owner Ready For Code approval is recorded:

```powershell
npm.cmd run harness:first-packet -- --work-item PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL --packet reference\packets\PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md --apply
npm.cmd run harness:packet-preflight -- --packet reference\packets\PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md --stage implementation-transition
npm.cmd run harness:transition -- planner-to-orchestrator --work-item PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL --gate-profile contract --apply
```

Post-RFC implementation verification commands:

```powershell
npm.cmd run harness:validate
npm.cmd test
node --test .harness/test/promote-starter.test.js
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_compound_feedback_promotion.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt15_compound_loop_rehearsal.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"
npm.cmd run harness:promote-starter -- --dry-run --to C:\tmp\standard-harness-pkt15-dry-run
npm.cmd run harness:promote-starter -- --to C:\tmp\standard-harness-pkt15-smoke --verify --force
npm.cmd run harness:sync-state
npm.cmd run harness:packet-preflight -- --packet reference\packets\PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md --stage closeout
```

Evidence capture rule:
- Every command report must record command, working directory, exit code, timestamp, key
  result fields, and output artifact path.
- JSON-producing command output must be captured as JSON when the command emits pure JSON;
  when a command emits a human summary plus JSON, the Developer/Tester report must record
  the full command result and extract the authoritative JSON object into the named
  evidence path.
- Root validation output must be summarized in
  `reference/reports/validation/PKT-15-root-validation.json`; root regression in
  `reference/reports/validation/PKT-15-root-regression.md`; promotion dry-run JSON in
  `reference/reports/promotion/PKT-15-promotion-dry-run.json`; copied-starter smoke in
  `reference/reports/promotion/PKT-15-copied-starter-smoke.md`.
- If shell redirection would be unsafe or platform-dependent, Developer/Tester may write
  the evidence report manually from captured command output, but must include the command,
  exit code, and result summary rather than only saying the command passed.

Required verification:
- Every Call-Site Matrix row has a focused behavior test.
- Duplicate suppression and sensitive-evidence rejection have negative tests.
- Proposal/candidate lifecycle tests prove only evidence-backed accepted proposals can
  reach candidate/dry-run/validation/approval-needed.
- Promotion dry-run and copied-starter smoke are executed, or an exact non-pass limitation
  is recorded without overclaim.
- Root validation and root regression pass.
- Full starter regression passes.
- Security/authority-boundary review passes or records Human-approved residual risk.
- Four independent closeout lenses pass before Planner closeout.

Contract evidence markers:
- root: `npm.cmd test`, `node --test .harness/test/promote-starter.test.js`, and
  root validation/regression evidence in `reference/reports/validation/PKT-15-*`.
- standard-template: starter Python targeted and full regression commands pass, with
  evidence in `reference/reports/validation/PKT-15-starter-validation.md`.
- targeted: packet-specific call-site, duplicate suppression, proposal/candidate,
  dry-run, copied-starter smoke, contamination, and operating QA fixtures pass.
- validator: `npm.cmd run harness:validate`, validation report, and packet preflight
  evidence are captured with command, cwd, exit code, timestamp, and result summary.
- active context: `npm.cmd run harness:sync-state` refreshes Active Context after
  implementation and before closeout evidence is claimed.
- review closeout: Reviewer adjudication plus `challenge_review`,
  `adversarial_security_review`, `code_quality_review`, and `evidence_review` lens
  artifacts pass before Planner closeout.

## Required Evidence Paths
| Gate / Lens | Required Evidence Path | Required Status Before Closeout |
| --- | --- | --- |
| Planner Packet Challenge Review | `reference/reports/review/PKT-15-planner-challenge-review.md` | pass before Ready For Code request |
| Packet Document Review | `reference/reports/review/PKT-15-packet-doc-review.md` | pass before Ready For Code request |
| Artifact sync | `reference/reports/artifact-sync/PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md` | records artifact/doc impacts |
| Call-site validation friction evidence | `reference/reports/friction/PKT-15-call-site-validation.md` | pass |
| Call-site review friction evidence | `reference/reports/friction/PKT-15-call-site-review.md` | pass |
| Call-site PM friction evidence | `reference/reports/friction/PKT-15-call-site-pm.md` | pass |
| Call-site closeout friction evidence | `reference/reports/friction/PKT-15-call-site-closeout.md` | pass |
| Call-site context friction evidence | `reference/reports/friction/PKT-15-call-site-context.md` | pass |
| Call-site authority friction evidence | `reference/reports/friction/PKT-15-call-site-authority.md` | pass |
| Duplicate suppression | `reference/reports/friction/PKT-15-duplicate-suppression.md` | pass |
| Proposal loop | `reference/reports/friction/PKT-15-proposal-loop.md` | pass |
| Candidate lifecycle | `reference/reports/promotion/PKT-15-candidate-lifecycle.md` | pass |
| Promotion dry-run | `reference/reports/promotion/PKT-15-promotion-dry-run.json` | pass or explicit non-pass limitation with no smoke-pass claim |
| Copied-starter smoke | `reference/reports/promotion/PKT-15-copied-starter-smoke.md` | pass or exact limitation without overclaim |
| Contamination negative fixtures | `reference/reports/promotion/PKT-15-contamination-negative-fixtures.md` | pass |
| Operating-intelligence query evidence | `reference/reports/promotion/PKT-15-operating-qa.md` | pass |
| Root validation/regression | `reference/reports/validation/PKT-15-root-validation.json`; `reference/reports/validation/PKT-15-root-regression.md` | pass |
| Starter validation | `reference/reports/validation/PKT-15-starter-validation.md` | pass |
| Security/adversarial review | `reference/reports/security/PKT-15-security-review.json` | pass or Human-approved residual risk |
| Tester report | `reference/reports/test/PKT-15_TESTER_REPORT.md` | pass or defects routed |
| `challenge_review` closeout lens | `reference/reports/review/PKT-15-challenge-review-lens.md` | pass with Reviewer adjudication |
| `adversarial_security_review` closeout lens | `reference/reports/review/PKT-15-adversarial-security-review-lens.md` | pass with Reviewer adjudication |
| `code_quality_review` closeout lens | `reference/reports/review/PKT-15-code-quality-review-lens.md` | pass with Reviewer adjudication |
| `evidence_review` closeout lens | `reference/reports/review/PKT-15-evidence-review-lens.md` | pass with Reviewer adjudication |
| Reviewer adjudication | `reference/reports/review/PKT-15_REVIEW_REPORT.md` | pass after all evidence/lenses |
| Planner closeout | `reference/reports/closeout/PKT-15_PLANNER_CLOSEOUT.md` | records final v2.0 hardening closeout and any named follow-up |

## Required Closeout Lens Mapping
| Canonical Lens | PKT-15-Specific Questions |
| --- | --- |
| `challenge_review` | Does implementation prove automatic call-site capture, closed loop promotion, dry-run, copied-starter smoke, contamination negatives, and no overclaim of promotion approval? |
| `adversarial_security_review` | Can friction/proposal/candidate evidence, promotion export, smoke target, copied starter, secrets, local DB/cache files, root history, provider artifacts, or generated state bypass safety or approval boundaries? |
| `code_quality_review` | Are call sites integrated through `RuntimeFrictionCapture` and existing self-improvement services rather than duplicated ad hoc logic or broad cross-module coupling? |
| `evidence_review` | Do tests and reports prove actual behavior for every acceptance item, including negative fixtures, duplicate suppression, dry-run/copy-smoke status, and operating QA queryability? |

## TDD Evidence Contract
- TDD mode: exempt
- TDD exception reason: PKT-15 was delivered through the approved v2.0 hardening orchestration after packet-level planning reviews, with focused behavior tests, negative boundary tests, full starter regression, root regression, copied-starter smoke verification, security review, four independent closeout lenses, and Reviewer pass; no packet-local RED artifact was captured before implementation, so closeout records this as an explicit TDD process exception rather than fabricated RED/GREEN evidence.
- TDD approved by: Planner closeout exception for PKT-15 only, with Tester and Reviewer pass evidence.

## CSO Security Review
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-15-security-review.json
- Security review decision: pass
- Security review evidence scope: runtime friction capture call sites; duplicate suppression; improvement proposal and starter-promotion candidate lifecycle; promotion dry-run; copied-starter smoke; contamination negative fixtures; permission boundary search; authority flags.

## Independent Review Lens Evidence
- challenge_review agent: pkt15-challenge-review-lens
- challenge_review independence basis: independent review-lens evidence, not Developer, Tester, Orchestrator, generated summary, or main-session self-review.
- challenge_review evidence path: reference/reports/review/PKT-15-challenge-review-lens.md
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review reviewer disposition: accepted
- challenge_review not applicable rationale: not-needed
- adversarial_security_review agent: pkt15-adversarial-security-review-lens
- adversarial_security_review independence basis: independent review-lens evidence, not Developer, Tester, Orchestrator, generated summary, or main-session self-review.
- adversarial_security_review evidence path: reference/reports/review/PKT-15-adversarial-security-review-lens.md
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review reviewer disposition: accepted
- adversarial_security_review not applicable rationale: not-needed
- code_quality_review agent: pkt15-code-quality-review-lens
- code_quality_review independence basis: independent review-lens evidence, not Developer, Tester, Orchestrator, generated summary, or main-session self-review.
- code_quality_review evidence path: reference/reports/review/PKT-15-code-quality-review-lens.md
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: accepted
- code_quality_review not applicable rationale: not-needed
- evidence_review agent: pkt15-evidence-review-lens
- evidence_review independence basis: independent review-lens evidence, not Developer, Tester, Orchestrator, generated summary, or main-session self-review.
- evidence_review evidence path: reference/reports/review/PKT-15-evidence-review-lens.md
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: accepted
- evidence_review not applicable rationale: not-needed

## Security Review Request
- Required: yes, because PKT-15 is high / starter-promotion / contract work.
- Scope: automatic friction capture from runtime call sites, event/idempotency store,
  proposal/candidate eligibility, dry-run target boundary, copied-starter contamination,
  sensitive evidence, root/generated-state leakage, provider-specific identity, local DB
  and cache leakage, approval-needed hard stop, and operating QA authority boundary.
- Evidence path: `reference/reports/security/PKT-15-security-review.json`
- Required disposition: pass with Reviewer adjudication before closeout, or a residual
  risk/defer decision with explicit Human Owner approval.
- Hold conditions: any secret/local DB/cache/root/generated/provenance leak, direct
  starter mutation by rehearsal, candidate promotion execution, approval-needed treated
  as approval, missing copied-starter smoke, or call-site capture remaining manual-only.

## Planner Packet Challenge Review
- Challenge reviewer: Mill, independent explorer subagent
  `019f14d5-6be3-74f3-8976-e48fa87ff8c4`
- Challenge reviewer independence basis: read-only independent planning reviewer; not
  packet author, Developer, Tester, Orchestrator, generated summary, or main-session
  self-review; did not edit files or approve Ready For Code.
- Source refs reviewed: `.agents/artifacts/REQUIREMENTS.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`;
  `reference/packets/PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION.md`;
  `reference/reports/closeout/PKT-14_PLANNER_CLOSEOUT.md`;
  `reference/packets/PKT-15_COMPOUND_LOOP_AND_STARTER_PROMOTION_REHEARSAL.md`;
  current self-improvement, validation, review, closeout, PM, context, and promotion
  source surfaces.
- Parent objective coverage: pass; PKT-15 covers automatic runtime friction capture,
  friction-to-improvement/proposal/candidate loop, promotion dry-run, copied-starter
  smoke rehearsal, contamination negatives, and operating-intelligence evidence-only
  queryability.
- Deferred scope with named follow-up: not-needed
- Deferred scope note: actual starter promotion, release, publish, sibling rollout,
  remote deployment, provider identity, and residual-risk acceptance remain out of scope
  and require a future Human-approved packet if requested.
- Acceptance proves behavior change: pass after correction; A1-A8 now include an
  acceptance trace matrix with hardening rows and requirement IDs, canonical call-site
  targets, negative fixtures, dry-run/copy-smoke evidence, and approval-needed hard stops.
- Failure fixture or failure condition: manual/CLI-only capture, missing canonical
  call-site signal, duplicate inflation, single unverified promotion, candidate
  approved/promoted status, dry-run mutation, copied-starter contamination, sensitive
  evidence leakage, and QA approval overclaim.
- Reviewer closeout hold basis: missing automatic call-site evidence, missing
  duplicate-suppression evidence, missing proposal/candidate lifecycle proof, incomplete
  dry-run/copied-starter smoke, incomplete contamination forbidden-set negatives, security
  boundary failure, or any approval-needed-as-approval overclaim.
- First-wave limit check: pass; PKT-15 is limited to v2.0 hardening rehearsal and does
  not approve actual promotion or release.
- Guidance-only sufficiency rationale: guidance-only is insufficient; packet requires
  runtime call-site tests, durable friction/proposal/candidate evidence, dry-run,
  copied-starter smoke, contamination negatives, root/starter validation, security review,
  and closeout lenses.
- Challenge evidence artifact path: `reference/reports/review/PKT-15-planner-challenge-review.md`
- Challenge status: pass
- Findings disposition: initial blocking/high findings were corrected; final re-review
  returned no findings after second pass.
- Required corrections applied: yes; added acceptance trace matrix, exact call-site
  methods and fixture IDs, Planner-return rule, expanded contamination forbidden set, and
  no-promotion/no-release boundary confirmation.
- No self-approval claim: independent challenge reviewer is not the packet author; this
  review does not approve Ready For Code, implementation, closeout, release, residual
  risk, or starter promotion.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: Ohm, independent explorer subagent
  `019f14d5-a024-7183-b122-6b9deeaf524a`
- Packet doc reviewer independence basis: read-only independent packet document reviewer;
  not packet author, Developer, Tester, Orchestrator, generated summary, or main-session
  self-review; did not edit files or approve Ready For Code.
- Packet doc review evidence path: `reference/reports/review/PKT-15-packet-doc-review.md`
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass; acceptance covers SHV2-REQ-002, 003, 004, 005,
  015, 016, 018, 021, 022, 033, 034, 039, 042, 045, 046, and 047 for PKT-15 scope.
- Implementation-plan sequencing alignment: pass; PKT-15 follows PKT-14 closeout and
  owns only compound-loop/starter-promotion rehearsal work.
- Architecture/source SSOT alignment: pass; self-improvement, `_ops` evidence, root
  promotion rehearsal, and copied-starter boundaries match the Architecture Guide.
- Human/Planner intent preservation: pass; the packet preserves automatic capture,
  compound-loop, starter-promotion rehearsal, and approval boundaries from the Human
  hardening direction.
- v1.0 root-harness operating constraint coverage: pass; packet-before-code,
  generated-state boundary, root/starter separation, independent review, and no implicit
  approval are preserved.
- v2.0 product philosophy coverage: pass; provider-neutral harness identity and clean
  starter payload boundaries are preserved.
- Acceptance strength: pass after correction; hardening rows and requirement IDs are tied
  directly to A1-A8, call-site targets are concrete, and behavior evidence is required.
- Verification scope strength: pass after correction; command templates, evidence paths,
  negative fixtures, closeout lens proof, and evidence-capture/wrapping rules are named.
- Deferred/out-of-scope ownership: pass; actual starter promotion, release, publish,
  rollout, live provider execution, and residual-risk acceptance remain explicit Human
  approval boundaries outside PKT-15.
- Required corrections: split pre-RFC read-only preview from state-changing route
  commands, bind call-site rows to exact current class/method targets, add
  evidence-capture rules, and correct class/method names.
- Findings disposition: initial blocking/medium findings were corrected; final re-review
  returned no findings after second pass.
- No self-approval claim: independent packet document reviewer is not the packet author;
  this review does not approve Ready For Code, implementation, closeout, release,
  residual risk, or starter promotion.

## Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| Ready For Code sign-off | yes | Human Owner | approved | Recorded after Planner Packet Challenge Review and `packet_doc_review` passed on 2026-06-30. |
| Promotion rehearsal target cleanup | conditional | Developer / Orchestrator | pending | Temporary/export targets must stay outside source repo or be explicitly safe local paths such as `C:\tmp`. |
| Actual starter promotion / release / publish | yes | Human Owner | not-approved | PKT-15 can produce rehearsal evidence only. |
| Residual-risk/defer approval | yes if unresolved | Human Owner | not requested | Reviewer cannot accept unresolved promotion, contamination, or approval-boundary risk alone. |

## Refactor / Residual Debt Disposition
- PKT-15 may expose that some call sites do not have a single central hook. Developer may
  add minimal adapters or a shared capture helper, but must keep behavior scoped and
  preserve existing validation/review/PM/closeout semantics.
- If copied-starter smoke cannot run fully in the local environment, evidence must name
  the exact blocked lane and avoid claiming smoke pass. Human residual-risk/defer
  approval is required to close with a limitation.
- Later follow-up may improve UX or external distribution, but PKT-15 must close the v2.0
  hardening loop for automatic capture, proposal/candidate promotion, and local
  rehearsal evidence.

## 15. Packet Exit Quality Gate
- Packet exit quality gate reference: `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- Exit recommendation: approved
- Source parity result: pass
- Validation / security / cleanup evidence: pass
- Implementation delta summary: automatic friction capture call sites were integrated; duplicate suppression and repeated-friction proposal/candidate promotion were added; starter promotion dry-run and copied-starter smoke were hardened with clean seed governance docs.
- Refactor / residual debt disposition: no blocking residual debt. Actual starter promotion/release remains outside PKT-15 and requires separate Human approval.
- Documentation impact / docs parity result: pass; required evidence, tester report, review lenses, security report, and Planner closeout are recorded.
- Deferred follow-up item: none for approved PKT-15 scope.
- Closeout notes: PKT-15 produced rehearsal evidence only and does not grant release, publish, product verification, risk closure, residual-risk acceptance, or actual starter promotion. Source parity covers the PKT-15 hardening matrix rows and readiness conditions. Validation/security evidence includes root validation, root regression, starter validation, copied-starter smoke, contamination fixtures, and security review.

Closeout evidence:
- Planner Packet Challenge Review and independent `packet_doc_review` passed before Ready For Code.
- Human Owner Ready For Code approval is recorded.
- Call-Site Matrix rows have behavior evidence in `reference/reports/friction/PKT-15-*`.
- Root validation, root regression, targeted starter tests, and full starter regression passed.
- Promotion dry-run and copied-starter smoke passed.
- Contamination negative fixtures cover the forbidden set.
- Security review and four closeout lenses passed with Reviewer adjudication.
- Planner closeout records PKT-15 as closed for approved scope.

## Reopen Trigger
Reopen or return to Planner if:
- any required runtime path still depends on manual CLI-only friction capture;
- duplicate suppression inflates recurring friction eligibility;
- a proposal or candidate is created from prose-only, untrusted, or missing evidence;
- a candidate can reach `approved`, `promoted`, release, publish, or starter mutation
  state inside PKT-15;
- dry-run or copied-starter smoke contaminates the starter with root history, generated
  state, evidence history, wiki state, `.agents`, `.harness`, `AGENTS.md`, local DB/cache,
  secrets, or provider-specific entry contracts;
- operating QA, PM, Wiki, Active Context, friction, proposal, or candidate records are
  treated as approval authority;
- implementation absorbs release/publish/sibling rollout scope without a new Human
  approval boundary.
