# PKT-25 Reviewer Report

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
Route: `Orchestrator -> Reviewer`
Date: 2026-07-01
Reviewer disposition: pass, ready for Planner closeout

## Evidence Reviewed
- Active packet: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- Developer report: `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- Tester report: `reference/reports/test/PKT-25_TESTER_REPORT.md`
- TDD report: `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- Challenge lens: `reference/reports/review/PKT-25-closeout-challenge-review.md`
- Adversarial security lens: `reference/reports/review/PKT-25-closeout-adversarial-security-review.md`

## Independent Review Lens Status
| Lens | Agent | Evidence path | Status | Finding count | Reviewer disposition |
|---|---|---|---|---:|---|
| `challenge_review` | `019f1b3a-1118-7c61-87dd-833cb42589c3` / Faraday | `reference/reports/review/PKT-25-closeout-challenge-review.md` | hold | 5 | blocking remediation required |
| `adversarial_security_review` | `019f1b3a-54af-70f2-aa89-030de1c38e4d` / Wegener | `reference/reports/review/PKT-25-closeout-adversarial-security-review.md` | hold | 3 | blocking remediation required |
| `code_quality_review` | not run | not yet produced | not-run | 0 | deferred until blocking remediation |
| `evidence_review` | not run | not yet produced | not-run | 0 | deferred until blocking remediation |

## Blocking Findings
1. A1/A2 durable topology surface gap: current implementation proves descriptor-level real-smoke consumption, but does not yet prove first-class project-start conductor persistence/reporting or packet role assignment persistence/reporting.
2. A2 role-provider matrix gap: tests do not prove all six logical roles against both `codex` and `claude_code`.
3. A5/A6 validation gap: fail-closed coverage is missing for unknown role keys, invalid project conductor, ambiguous non-reviewer lists, duplicate reviewer ids, missing reviewer lens, invalid worker aliases, and role/provider evidence mismatch.
4. A6 adapter identity gap: topology evidence currently trusts descriptor-supplied `adapterId` instead of binding emitted evidence to provider-policy adapter identity.
5. Legacy/topology conflict gap: simultaneous `reviewer_provider` and `providerTopology` is not rejected broadly enough.
6. A8 evidence gap: root-scoped `harness:payload-boundary` failure cannot be reported as clean-payload pass; Developer/Tester must provide correct scoped starter boundary evidence or obtain Planner disposition.

## Acceptance Judgment
- A1: hold.
- A2: hold.
- A3: pass.
- A4: pass.
- A5: hold.
- A6: hold.
- A7: partial pass; no approval mutation found, but closeout remains blocked by authority-boundary validation gaps.
- A8: hold until scoped starter boundary evidence is corrected or Planner disposition is recorded.
- A9: partial pass; fixture covers the example topology but durable persistence/reporting remains unproven.
- A10: partial pass; mixed reviewers are separated, but reviewer negative cases remain missing.

## Route Recommendation
Return to Developer through Orchestrator-controlled remediation. Required Developer actions:
- Add TDD RED/GREEN coverage for the missing negative classes and role-provider matrix.
- Bind evidence adapter ids to provider-policy adapter identity or fail closed on mismatches.
- Reject simultaneous legacy `reviewer_provider` with first-class topology unless Planner explicitly rescopes.
- Address A1/A2 durable topology persistence/reporting by implementation or Planner rescope.
- Replace the payload-boundary evidence gap with correct scoped starter boundary validation evidence or a Planner disposition.

## Closeout Boundary
Reviewer closeout is not passed. Planner closeout must not be attempted from this evidence state.

## Security Rerun 1
Evidence:
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-rerun.md`
- `reference/reports/review/PKT-25-closeout-challenge-review-rerun-invalid.md`

Disposition:
- `adversarial_security_review` rerun by `019f1b4f-3e54-7c20-a9dc-3f4352f01deb` / Hypatia is HOLD.
- `challenge_review` rerun attempt by `019f1b4e-ce7a-7e71-9005-14165eac7451` / Carver is not counted because the agent explicitly said it should not count as independent closeout evidence.

Blocking finding:
- `provider-topology record/report` must fail closed or strip unknown nested assignment fields such as `approvalStateMutationAllowed` before persisting topology records.

Route recommendation:
- Return to Developer through Orchestrator-controlled remediation.
- Required Developer action: add assignment-field whitelist/fail-closed validation and CLI negative test for nested authority-looking fields.

## Final Lens Rerun 1
Evidence:
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-final.md`
- `reference/reports/review/PKT-25-closeout-challenge-review-final-invalid.md`
- `reference/reports/review/PKT-25-closeout-challenge-review-final.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review.md`

Disposition:
- `adversarial_security_review` final rerun by `019f1b5c-3d92-7d01-a68d-e6eb7b5567e0` / Planck is PASS.
- `challenge_review` final rerun attempt by `019f1b5b-f050-7d40-a118-04c1539c605a` / Banach is not counted.
- `challenge_review` final rerun by `019f1b62-fed2-7cf1-b882-69c0d56179d9` / Kant is HOLD.
- `code_quality_review` by `019f1b63-34a2-76d1-925d-4695b566b849` / Dalton is HOLD.

Blocking findings:
- A6 evidence envelope must emit and validate per-role `evidenceRef`; reviewer lens mismatch must be detected instead of injected from declared route.
- `workerAliases` must whitelist allowed alias names and fields; nested authority-looking alias fields must fail closed before persistence.
- Provider-to-adapter manifest construction should be centralized from the topology provider policy mapping to avoid drift.

Route recommendation:
- Return to Developer through Orchestrator-controlled remediation.
- Do not run `evidence_review` or Planner closeout until these blocking lens findings are remediated and Tester evidence is refreshed.

## Remediation 3 Lens Rerun
Evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review-remediation3.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation3.md`

Disposition:
- `challenge_review` after Remediation 3 by `019f1b6f-a746-7993-ae35-f0bfc8ee14fe` / Dewey is PASS.
- `code_quality_review` after Remediation 3 by `019f1b6f-eb05-7b31-96b7-c59ab70b3596` / Beauvoir is HOLD.

Blocking finding:
- `workerAliases` validation and routing use different canonical forms. Accepted whitespace-padded alias `role` / `reviewerId` values can persist/report but be ignored by routing.

Orchestrator threshold note:
- The packet has already cycled through multiple Reviewer -> Developer -> Tester -> Reviewer remediation loops.
- Under `.agents/workflows/orchestrator.md`, continuing another autonomous remediation loop risks crossing the repeated full-loop stop condition.

Route recommendation:
- Stop before Planner closeout.
- Next authority should decide whether to allow one more bounded Developer remediation for alias canonicalization or route to Planner/user for threshold disposition.

## Security Remediation 2 Verification
Developer and Tester evidence:
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`

Remediation disposition:
- The nested assignment authority-field finding is implemented and verified.
- Topology assignment validation now fails closed on unknown nested fields such as `approvalStateMutationAllowed`.
- Normalized persisted topology assignments retain only whitelisted topology contract fields.
- CLI negative coverage proves `provider-topology record` rejects nested authority-looking fields before persistence.

Fresh verification rerun:
- Focused provider topology suite: pass, `Ran 19 tests ... OK`.
- Scoped starter clean-export: pass, `diagnostics=[]`, `status=ok`, `cleanExportProof=true`.
- Root regression: pass, `492 pass / 0 fail`.
- Harness validation: pass, `ok=true`; existing PKT-24 warning is non-blocking for PKT-25.

## Current Reviewer Disposition
Reviewer disposition: hold, independent lens evidence still incomplete

Blocking closeout gaps:
1. A valid independent `challenge_review` rerun after Security Remediation 2 is still missing. The prior rerun artifact is explicitly invalid and cannot count as independent closeout-lens evidence.
2. Independent `code_quality_review` evidence is not yet produced.
3. Independent `evidence_review` evidence is not yet produced.
4. The `adversarial_security_review` rerun that found the nested authority gap remains stale as a HOLD artifact until a valid independent security rerun or Reviewer-adjudicated replacement evidence confirms the remediation.

Route recommendation:
- Continue Orchestrator-controlled Reviewer routing only after valid independent lens artifacts are available.
- Do not attempt Planner closeout from this evidence state.

## Remediation 4 Lens Rerun
Evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review-remediation4.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-remediation4.md`

Disposition:
- `challenge_review` after Remediation 4 by `019f1b83-e99b-7732-8f9c-5a5825274a37` / Aristotle is HOLD.
- `adversarial_security_review` after Remediation 4 by `019f1b84-283c-7f52-8c94-b5afaa086db9` / Kuhn is PASS.
- `code_quality_review` after Remediation 4 was not run because a blocking `challenge_review` finding already prevents closeout.
- `evidence_review` after Remediation 4 was not run because a blocking `challenge_review` finding already prevents closeout.

Blocking finding:
- A1/A9 still appear to close project-start or project-scoped Conductor persistence/reporting with packet-scoped `provider-topology record/report` evidence. The current evidence proves a packet topology event contains `projectTopology.conductor`, but does not prove init/start-level project Conductor selection, project-scoped reporting independent of packet id, or invariant project-level conductor state with independently varying packet-level role assignments.

Verification considered:
- Tester Remediation Verification 4 reports focused provider topology suite pass, clean-export starter validation pass, root regression pass, and harness validation pass.
- The `challenge_review` lens independently reran focused provider topology tests and clean-export validation, but recorded root npm validation as unavailable in that subagent shell because `node` was not visible on PATH.
- The `adversarial_security_review` lens independently reran the focused provider topology suite and found no remaining security or authority-boundary hold.

Current Reviewer disposition:
- Reviewer disposition: hold.
- Planner closeout must not be attempted.
- Additional autonomous Developer remediation must not start from this state because the user-approved extra bounded remediation has already been used and the Orchestrator loop threshold has already been identified.

Route recommendation:
- Stop at Orchestrator/Reviewer boundary and request Planner/user decision.
- Valid next decisions are either:
  - approve another bounded Developer remediation specifically for A1/A9 project-start Conductor persistence/reporting evidence; or
  - route to Planner to explicitly rescope A1/A9 if packet-scoped topology records are the intended contract.

## Planner Rescope Disposition
Evidence:
- Human Owner decision on 2026-07-01: route to Planner and approve explicit A1/A9 rescope to packet-scoped topology record contract.
- Packet update: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md#planner-rescope-decision`.

Disposition:
- A1/A9 are no longer interpreted as requiring a separate project-start UI/init flow, global project Conductor default, or project-scoped report independent of packet id.
- PKT-25 acceptance closes only the packet-scoped provider topology record/report and evidence-envelope contract.
- The Remediation 4 `challenge_review` HOLD is resolved by Planner/User scope decision, not by extra Developer remediation.

Reviewer next requirement:
- Re-run independent `challenge_review` against the updated packet scope.
- Run the remaining independent `code_quality_review` and `evidence_review` lenses after Remediation 4.
- If all required lenses pass, Reviewer may update disposition to pass and route to Planner closeout.

## Rescope Final Lens Rerun
Evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review-rescope-final.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation4.md`

Disposition:
- `challenge_review` after Planner/User A1/A9 rescope by `019f1b96-785d-75f1-8b70-cf8100ac2c33` / Jason is PASS.
- `code_quality_review` after Remediation 4 by `019f1b96-f5e0-76c2-9bbd-d49ac0c82f0a` / Carson is HOLD.
- `evidence_review` was not run because the `code_quality_review` HOLD blocks closeout.
- A fresh final `adversarial_security_review` after this code-quality hold was not run because closeout is already blocked; the prior Remediation 4 security lens remains PASS for the reviewed authority/security surfaces.

Blocking finding:
- Reviewer role assignment fields `reviewerId` and `reviewLens` can pass validation with whitespace-padded values but are later used as raw strings in routing and captured-output matching. The reviewer reproduced a blocked capture lookup with `captured_output_record_missing:Reviewer:codex: reviewer_b `.

Required Developer action if the User approves another remediation:
- Canonicalize reviewer assignment `reviewerId` and `reviewLens` consistently during normalization, persistence/reporting, route metadata construction, and captured-output matching, or reject non-canonical whitespace values fail-closed.
- Add focused coverage for CLI record/report and real-smoke capture matching using whitespace-padded reviewer assignment fields.

Current Reviewer disposition:
- Reviewer disposition: hold.
- Planner closeout must not be attempted.
- Commit, merge, push, and branch deletion must not proceed as a closeout merge while this hold remains unresolved.

Loop-threshold note:
- This is the same canonicalization/state-consistency class as the earlier `workerAliases` HOLD, now on the reviewer assignment contract surface.
- Further Developer remediation requires explicit User decision or valid delegated Conductor judgment; it should not continue as autonomous Orchestrator looping.

## Remediation 5 Final Lens Rerun
Evidence:
- `reference/reports/review/PKT-25-closeout-challenge-review-remediation5.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review-remediation5.md`
- `reference/reports/review/PKT-25-closeout-code-quality-review-remediation5.md`
- `reference/reports/review/PKT-25-closeout-evidence-review-remediation5.md`

Disposition:
- `challenge_review` after Remediation 5 by `019f1baa-7b61-7091-a6d2-d51dd32255fd` / Leibniz is PASS.
- `adversarial_security_review` after Remediation 5 by `019f1baa-b125-77f2-a1ca-9d5e82bc0fd0` / Descartes is PASS.
- `code_quality_review` after Remediation 5 by `019f1baf-3764-7082-b8b6-7a91a571e272` / Mill is PASS.
- `evidence_review` after Remediation 5 by `019f1baf-6fd8-7892-8a88-30b23a05fe30` / Plato is PASS.

Four-lens evidence table:
| Lens | Independent agent | Evidence path | Status | Finding count | Limitations | Reviewer disposition |
|---|---|---|---|---:|---|---|
| `challenge_review` | `019f1baa-7b61-7091-a6d2-d51dd32255fd` / Leibniz | `reference/reports/review/PKT-25-closeout-challenge-review-remediation5.md` | PASS | 0 | Focused provider topology suite rerun; root checks accepted from Tester evidence. | accepted |
| `adversarial_security_review` | `019f1baa-b125-77f2-a1ca-9d5e82bc0fd0` / Descartes | `reference/reports/review/PKT-25-closeout-adversarial-security-review-remediation5.md` | PASS | 0 | No real authenticated provider execution; release/publish not approved. | accepted |
| `code_quality_review` | `019f1baf-3764-7082-b8b6-7a91a571e272` / Mill | `reference/reports/review/PKT-25-closeout-code-quality-review-remediation5.md` | PASS | 0 | Focused suite rerun; full root checks accepted from Tester evidence. | accepted |
| `evidence_review` | `019f1baf-6fd8-7892-8a88-30b23a05fe30` / Plato | `reference/reports/review/PKT-25-closeout-evidence-review-remediation5.md` | PASS | 0 | Clean-export and sync-state accepted from Tester evidence; root regression independently corroborated through bundled Node. | accepted |

Reviewer adjudication:
- The Remediation 4 A1/A9 challenge hold is resolved by the explicit Planner/User packet-scoped rescope recorded in the packet.
- The Remediation 4 code-quality hold is resolved by Remediation 5: reviewer assignment `reviewerId`, `reviewLens`, and `evidenceRef` are canonicalized before persistence/reporting, reviewer route construction, worker2 reviewer selection, captured-output matching, and evidence envelope emission.
- TDD evidence includes RED/GREEN 7 for raw padded reviewer assignment reporting and blocked capture matching, followed by GREEN focused suite pass with 22 tests.
- Tester Remediation Verification 5 records focused provider topology suite pass, scoped clean-export pass, root regression pass, validation-report pass, and sync-state pass.
- The four required independent closeout lenses are complete and passing after the final code change.

Acceptance judgment after Remediation 5:
| Acceptance | Reviewer result |
|---|---|
| A1 | pass; packet-scoped topology record/report is the approved scope and is covered by CLI record/report evidence. |
| A2 | pass; six logical roles are covered against the supported provider set. |
| A3 | pass; declared topology drives Codex Reviewer smoke behavior without `Reviewer=claude_code` hardcoding. |
| A4 | pass; no-topology default Reviewer behavior remains backward-compatible. |
| A5 | pass; unsupported, blank, conflicting, unknown, duplicate, alias, authority-looking, and mismatch cases fail closed. |
| A6 | pass; evidence envelope includes canonical role/provider/reviewer/lens/evidenceRef fields and capture checks. |
| A7 | pass; Conductor selection remains routing/evidence metadata and does not grant approval authority. |
| A8 | pass; scoped starter clean-export and actual starter boundary checks are sufficient for PKT-25. |
| A9 | pass; Codex conductor is recorded inside the packet-scoped topology record with independently assignable packet roles. |
| A10 | pass; mixed-provider Reviewers remain separated by reviewer id, lens, provider, and evidence refs. |

Pre-implementation review status:
- Planner Packet Challenge Review completed before Ready For Code with pass-after-corrections evidence: `reference/reports/review/PKT-25_26-role-topology-planner-challenge-rerun.md`.
- Independent `packet_doc_review` completed before Ready For Code with pass-after-corrections evidence: `reference/reports/review/PKT-25_26-role-topology-packet-doc-review-rerun.md`.
- Human Owner Ready For Code approval for PKT-25 is recorded in the packet.

Conformance and residual risk:
- Requirements and architecture conformance: pass for provider-neutral role topology, approval-boundary separation, clean starter boundary, and packet-scoped evidence.
- Implementation-plan conformance: pass for the approved PKT-25/PKT-26 improvement plan scope; PKT-26 consumption remains a separate packet.
- Documentation parity: pass for starter `_harness` README command/help examples, fail-closed rules, canonicalization, and non-approval boundary.
- Modeling-error handling: none found.
- Residual risks: real authenticated Codex CLI or Claude Code CLI readiness, release, publish, starter promotion, User UAT, productization completion, and PKT-26 closeout-ledger consumption remain outside PKT-25 and are not approved by this review.

Final Reviewer disposition:
- Reviewer disposition: pass.
- No blocking Reviewer findings remain for PKT-25.
- Route recommendation: proceed to Planner closeout. This does not approve release, publish, starter promotion, residual-risk acceptance, or real-provider readiness.
