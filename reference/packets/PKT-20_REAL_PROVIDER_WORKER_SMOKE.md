# PKT-20 Real Provider Worker Smoke

> PLANNING PACKET. Ready For Code is pending until independent Planner Packet
> Challenge Review, independent `packet_doc_review`, and explicit approval evidence are
> recorded. Real authenticated provider execution additionally requires explicit Human
> Owner or trusted harness approval and available local provider tools.

## Purpose
PKT-20 proves real authenticated Codex CLI / Claude Code CLI worker smoke can run through
provider-neutral Conductor boundaries without making any provider the product identity.
It closes the productization gap left by deterministic worker fixtures: real provider
availability and execution must either be proven with approved local evidence or the
product claim must be narrowed.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-20_REAL_PROVIDER_WORKER_SMOKE` | Required productization packet for real provider readiness. | selected |
| Ready For Code | approved | Selected-Conductor delegated approval evidence is recorded after independent reviews and packet correction. | approved |
| Human sync needed | yes | Real authenticated provider execution needs explicit approval/tool availability boundary. | selected |
| Packet type | `harness-system` | Conductor/provider worker smoke is core harness behavior. | selected |
| Risk level | high | Provider tools, credentials, command execution, and approval boundaries are sensitive. | selected |
| Risk class | high / explicit approval / provider / security | Real provider execution can leak identity, credentials, or approval authority. | selected |
| Gate profile | release | Productization requires real smoke or explicit narrowed product claim. | selected |
| Route class | packet-path | Real execution evidence, security review, and validation are required. | selected |
| Change zone | core | Conductor/provider routing is core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code approval, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. Real provider execution remains separately approval-bound. | selected |
| User-facing impact | none | Operator CLI/status/evidence behavior may change, but no product browser UI or end-user product surface is in scope. | closed |
| Layer classification | core | Provider-neutral Conductor behavior is core. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No browser UI surface is included. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | not-needed | No product User UAT scope is included. | closed |
| Environment topology status | approved | Local provider tool/auth availability inspection boundary is approved and recorded; current evidence supports hold/narrowed claim rather than real smoke pass. | selected |
| Domain foundation status | approved | Domain is Conductor provider worker smoke, adjudication, and provider-neutral identity. | selected |
| System context status | approved | Conductor, worker envelopes, adapter contracts, command descriptors, and evidence capture are impacted. | selected |
| Authoritative source intake status | approved | Source is Requirements, Implementation Plan, Architecture Guide, and PKT-14/15 boundaries. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | approved | Developer, Tester, security, four independent closeout lenses, Reviewer adjudication, and Planner closeout are recorded. | closed |
| Existing system dependency | internal | Builds on current Conductor/provider worker services. | selected |
| New authoritative source impact | analyzed | Implements approved productization plan. | closed |
| Risk if started now | controlled | Independent reviews and Ready For Code approval are recorded; implementation must stay inside PKT-20 and real provider execution remains separately unapproved. | approved |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pass | Independent challenge review produced no findings after second pass. | closed |
| Packet doc review | pass | Independent rerun confirmed the corrected packet is Ready For Code-ready. | closed |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Real Provider Execution Boundary; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Environment topology approval; credential/session redaction; real CLI smoke approval
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; release publication; PM source ingestion
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-14 Conductor Worker E2E, PKT-15 promotion boundary, Conductor workflow/provider worker code, adapter examples, security review evidence.
- Environment topology reference: `reference/reports/test/PKT-20_LOCAL_TOOL_AUTH_AVAILABILITY.md`.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: local provider CLI tools only when approved and available.
- Execution target: bounded local Codex CLI / Claude Code CLI smoke through Conductor command envelopes when executable, or explicit approved hold/narrowed claim evidence when tools/auth are unavailable.
- Narrowed-claim boundary: if PKT-20 closes by hold, unavailable, or narrowed claim, real-provider readiness is not proven. Productization-complete claims must either exclude real-provider readiness or name a follow-up owner for real authenticated provider smoke.
- Transfer boundary: provider outputs may enter only packet-bound redacted evidence; credentials,
  sessions, caches, raw transcripts, and provider-specific entry files must not enter starter
  product identity or unbounded context.
- Rollback boundary: revert packet-scoped source/docs/evidence changes through git if needed;
  remove only packet-created local evidence/temp files with exact paths under destructive-command guard.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `reference/packets/PKT-14_CONDUCTOR_WORKER_E2E.md`.
- Existing schema source artifact: internal Conductor/worker envelope schemas.
- Table / column naming compatibility: not-needed.
- Data operation / ownership compatibility: provider output is evidence only and cannot approve gates.
- Migration / rollback / cutover compatibility: not-needed.
- Authoritative source intake reference: SHV2-REQ-019, 020, 048, 056, 057 and post-PKT-16 productization plan.
- Authoritative source disposition: accepted for packet planning; real execution still requires explicit approval.
- Current implementation impact: may change provider adapter examples, worker execution evidence, Conductor adjudication, and security diagnostics.
- Existing plan conflict: real provider execution cannot begin from planning approval alone.
- Impacted packet set scope: PKT-20 only.

## Goal
- Run real approved provider worker smoke through provider-neutral Conductor boundaries.
- Prove provider identity remains adapter-only.
- Prove delegated approval hard stops still hold.

## Non-Goal
- Do not make Codex, Claude Code, or any provider the product identity.
- Do not expose credentials, sessions, tokens, raw transcripts, or provider caches.
- Do not approve release/publish/promotion.

## Source Authority
- Requirements: SHV2-REQ-019, 020, 048, 056, 057.
- Implementation Plan: PKT-20 row.
- PKT-14/15 closeout boundaries for deterministic provider smoke and promotion safety.

## Real Provider Execution Boundary
Real CLI execution is allowed only after explicit approval and safe command envelope
validation. If tools/auth are unavailable or approval is withheld, PKT-20 must either hold
or record a narrowed product claim; fixture-only evidence cannot prove real-provider
readiness.

## Local Tool/Auth Availability Boundary
- Local tool/auth availability approval: approved by Human Owner in chat on 2026-06-30.
- Availability evidence path: `reference/reports/test/PKT-20_LOCAL_TOOL_AUTH_AVAILABILITY.md`.
- Codex CLI discovery: present, but `codex --version` failed with WindowsApps access denied.
- Codex config directory: present at `C:\Users\user\.codex`; contents were not read.
- Claude CLI discovery: not found.
- Claude config directories: not found.
- Planning disposition: current environment evidence supports an approval-bound hold or narrowed claim for real-provider readiness unless a later bounded smoke becomes executable.
- Safety boundary: no credential, token, session, cache content, raw transcript, network call, or actual provider worker smoke was executed or inspected.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: A maintainer checks whether real provider workers can execute through provider-neutral Conductor boundaries before productization-complete claims.
- API contract: provider worker command envelope, Conductor adjudication, provider output evidence record, approval-hard-stop diagnostics.
- Component responsibility: Conductor/provider worker routing owns bounded command envelopes and adjudication; Tester evidence owns pass/hold/unavailable classification; Security review owns redaction and contamination checks.
- Data ownership: provider output, command output, tool availability, and auth availability are packet-bound evidence only; credentials, tokens, sessions, caches, and raw transcripts are never copied into starter identity or unbounded context.
- Allowed dependency direction: Conductor may invoke provider adapters through bounded command descriptors; provider-specific artifacts must not become canonical harness identity or approval authority.
- Public contract vs internal/scratch field: public contract is provider-neutral pass/hold/unavailable evidence; provider command internals, local paths, and auth presence checks are internal evidence with redaction.
- Promoted artifact: not needed before implementation; packet-local model is sufficient for PKT-20 because no reusable schema change is planned unless implementation discovers one.

## Data / Source Impact
- Source impact classification: high
- Data impact classification: high
- Schema impact classification: conditional
- Source impact note: provider adapters, command descriptors, and evidence capture may change.
- Data impact note: provider outputs must be redacted and packet-bound.
- Schema impact note: prefer existing worker envelope/adjudication schema.

## In Scope
- Real CLI smoke when approved and tools are available.
- Provider-neutral contamination tests.
- Delegated approval hard-stop tests.
- Evidence that provider identity remains adapter-only.

## Out Of Scope
- Release/publish/promotion, PM ingestion, design trace, product UI.

## Acceptance
| ID | Acceptance Criterion | Evidence Required |
|---|---|---|
| A1 | Real provider smoke runs through Conductor or is explicitly held/narrowed with readiness excluded from the product claim. | Command evidence or approval-bound hold/narrowed record that classifies pass, hold, tool-unavailable, or approval-unavailable. |
| A2 | Provider identity remains adapter-only. | Provider-neutral contamination tests. |
| A3 | Credentials/session/raw transcript leakage is blocked. | Security review and redaction tests. |
| A4 | Delegated approval hard stops remain enforced. | Negative approval tests. |
| A5 | Productization completion remains incomplete until PKT-21 closes too, and if PKT-20 closes by hold/unavailable/narrowed claim, real-provider readiness is explicitly excluded from productization-complete claims or assigned to a named follow-up owner. | Planner closeout. |

## Expected Negative Fixtures
- Provider output claims approval and must fail.
- Missing real-execution approval starts a provider command and must fail.
- Provider-specific entry contract becomes product identity and must fail.
- Credential/session/cache evidence enters context and must fail.
- Productization-complete claim includes real-provider readiness after hold/unavailable/narrowed closeout and must fail.

## Verification Plan
- Real CLI smoke or explicit approval-bound hold/narrowing evidence.
- Provider-neutral contamination tests.
- Delegated approval hard-stop tests.
- Security review, root/starter regression, harness validation.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| Ready For Code | selected-Conductor delegated Ready For Code approval evidence | `reference/reports/planner/PKT-20_READY_FOR_CODE_DELEGATION.md` |
| Release-baseline boundary | confirm release, publish, starter promotion, productization-complete, and User UAT remain not approved | `reference/reports/review/PKT-20_REVIEW_REPORT.md` |
| Packaging boundary | confirm no packaging mutation, release bundle mutation, or starter promotion action is performed by PKT-20 | `reference/reports/review/PKT-20_REVIEW_REPORT.md` |
| Real provider smoke | approved Conductor CLI worker smoke | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Provider neutrality | adapter/provider contamination tests | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Approval hard stop | delegated approval rejection tests | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Security | credential/session/redaction review | `reference/reports/security/PKT-20-security-review.json` |
| Harness validator | `node .harness/runtime/state/harness-cli.js validate` | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Targeted Conductor/provider regression | `node --test .harness/test/v2-p2-conductor.test.js` and `node --test .harness/test/security-command-surfaces.test.js` | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Starter boundary regression | `node --test .harness/test/promote-starter.test.js` | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Review closeout | Reviewer adjudication checks source parity, evidence quality, hold/narrowed classification, and non-approval boundaries | `reference/reports/review/PKT-20_REVIEW_REPORT.md` |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-20-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-20-packet-doc-review.md` | required before Ready For Code |
| Ready For Code approval record | `reference/reports/planner/PKT-20_READY_FOR_CODE_DELEGATION.md` | approved before Orchestrator implementation routing |
| Developer report | `reference/reports/developer/PKT-20_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-20_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-20-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-20_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-20_PLANNER_CLOSEOUT.md` | required to mark closed |

## Independent Review Lens Evidence
| Lens | Independent agent | Evidence path | Status |
|---|---|---|---|
| `challenge_review` | `019f18cc-938e-76a3-9b34-9fa380ab856c` | `reference/reports/review/PKT-20-closeout-challenge-review.md` | pass |
| `adversarial_security_review` | `019f18cc-cc0a-75d1-84ff-6966d6de2d75` | `reference/reports/review/PKT-20-closeout-adversarial-security-review.md` | pass-with-hold-narrowed-claim |
| `code_quality_review` | `019f18cc-fc68-76c2-91ec-48375badcd47` | `reference/reports/review/PKT-20-closeout-code-quality-review.md` | pass |
| `evidence_review` | `019f18d0-89ee-72e0-9d7d-cc60c27ccd20` | `reference/reports/review/PKT-20-closeout-evidence-review.md` | pass-with-limitations |
- challenge_review agent: `019f18cc-938e-76a3-9b34-9fa380ab856c`
- challenge_review independence basis: independent challenge reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review reviewer disposition: accepted
- challenge_review evidence path: reference/reports/review/PKT-20-closeout-challenge-review.md
- adversarial_security_review agent: `019f18cc-cc0a-75d1-84ff-6966d6de2d75`
- adversarial_security_review independence basis: independent adversarial security reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review reviewer disposition: accepted with provider-execution hold preserved.
- adversarial_security_review evidence path: reference/reports/review/PKT-20-closeout-adversarial-security-review.md
- code_quality_review agent: `019f18cc-fc68-76c2-91ec-48375badcd47`
- code_quality_review independence basis: independent code-quality reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: accepted
- code_quality_review evidence path: reference/reports/review/PKT-20-closeout-code-quality-review.md
- evidence_review agent: `019f18d0-89ee-72e0-9d7d-cc60c27ccd20`
- evidence_review independence basis: independent evidence reviewer was not the packet author, Developer, Tester, Reviewer adjudicator, or Planner closeout owner.
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: accepted with evidence granularity limitation preserved.
- evidence_review evidence path: reference/reports/review/PKT-20-closeout-evidence-review.md

## Required Closeout Lens Mapping
| Lens | PKT-20 Question |
|---|---|
| `challenge_review` | Does evidence prove real-provider readiness rather than fixture-only behavior? |
| `adversarial_security_review` | Can provider credentials, sessions, raw outputs, or identity contaminate the product? |
| `code_quality_review` | Are provider commands bounded through Conductor envelopes and adapter contracts? |
| `evidence_review` | Does smoke evidence distinguish pass, hold, tool unavailable, and approval unavailable? |

## Planner Packet Challenge Review
- Challenge reviewer: Codex independent planning reviewer, read-only packet-quality pass.
- Challenge reviewer independence basis: not packet author, Developer, Tester, Orchestrator, Planner closeout owner, generated summary, or implementation reviewer; no files edited and no implementation/release authority claimed.
- Source refs reviewed: `reference/packets/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `reference/reports/artifact-sync/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md`; `reference/reports/test/PKT-20_LOCAL_TOOL_AUTH_AVAILABILITY.md`; PKT-14/15 boundaries as prior scope references.
- Parent objective coverage: pass. PKT-20 covers the real provider worker smoke gap and preserves the rule that productization remains incomplete until PKT-21 also closes.
- Deferred scope with named follow-up: pass. Structured PM source intake remains named to PKT-21; release, publish, starter promotion, and User UAT remain outside PKT-20.
- Acceptance proves behavior change: pass. Acceptance requires real Conductor smoke or an explicit approval-bound hold/narrowed claim, plus contamination, redaction, and delegated-approval hard-stop evidence.
- Failure fixture or failure condition: fixture-only real-provider pass claim; missing execution approval starts provider command; provider-specific entry contract becomes product identity; credential/session/cache/raw transcript enters context.
- Reviewer closeout hold basis: hold if evidence does not distinguish pass, hold, tool-unavailable, and approval-unavailable; if security/redaction evidence is missing; if delegated approval hard stops fail; or if productization completion is claimed before PKT-21.
- First-wave limit check: pass. PKT-20 targets the real-provider gap and blocks broader productization claims.
- Guidance-only sufficiency rationale: guidance-only is insufficient; packet requires real smoke evidence or explicit hold/narrowed claim, security review, negative fixtures, and Reviewer adjudication.
- Challenge evidence path: `reference/reports/review/PKT-20-planner-challenge-review.md`
- Challenge evidence artifact path: `reference/reports/review/PKT-20-planner-challenge-review.md`
- Findings disposition: no findings after second pass.
- Required corrections applied: not-needed.
- No self-approval claim: independent challenge review does not approve Ready For Code, implementation, release, publish, starter promotion, residual risk, productization complete, User UAT, credential access, or real provider smoke execution.
- Challenge status: pass

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: Independent packet-document rerun reviewer, current Codex session.
- Packet doc reviewer independence basis: reviewer is not the packet author, Developer, Tester, or Orchestrator; reviewer did not implement PKT-20, did not run provider smoke, did not approve Ready For Code, and made no file edits.
- Packet doc review evidence path: `reference/reports/review/PKT-20-packet-doc-review.md`
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
- Required corrections: none remaining after rerun.
- Findings disposition: prior delegated-approval, narrowed-claim, and root/starter verification findings are corrected.
- No self-approval claim: packet document review does not approve Ready For Code, implementation, release, publish, starter promotion, residual risk, productization complete, User UAT, credential access, or real provider smoke execution.

## Human Sync / Approval Boundary
- Open decisions: real provider execution remains approval-bound and may be held/narrowed if unavailable.
- Local tool/auth availability check: approved and recorded.
- Ready For Code delegation: Human Owner authorizes the selected Conductor to execute scoped Ready For Code approval for adjusted PKT-17 through PKT-23 packets after independent review and packet correction. Planner may prepare, record, and route validated approval evidence but does not execute delegated approval.
- Ready For Code approval evidence: `reference/reports/planner/PKT-20_READY_FOR_CODE_DELEGATION.md`.
- Closeout delegation: Human Owner authorizes the selected Conductor to execute scoped packet closeout approval for adjusted PKT-17 through PKT-23 after Orchestrator delivery evidence and independent review. Planner may record closeout and next-lane sequencing after validated closeout approval.
- Conductor approval boundary: delegated approval applies to packet Ready For Code and packet closeout only; it does not approve release, publish, starter promotion, residual-risk acceptance, productization completion, User UAT, credential access, raw transcript capture, real provider smoke execution, or provider identity promotion.

## Security Review Request
- Security review required: yes.
- Focus: credentials, sessions, command safety, provider identity, output redaction, approval bypass.
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-20-security-review.json

## Refactor / Residual Debt Disposition
- Refactor only Conductor/provider/evidence paths needed for acceptance.

## 15. Packet Exit Quality Gate
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Source parity status: pass
- Source parity result: pass
- Packet exit metadata source parity result: pass
- Acceptance evidence status: pass
- Test evidence status: pass
- Security evidence status: pass
- Validation / security / cleanup evidence: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Reviewer adjudication: pass
- Planner closeout: pass
- Exit recommendation: approved
- Packet exit metadata exit recommendation: approved
- Closeout notes: approved for PKT-20 scope only as hold/unavailable/narrowed claim; real-provider readiness remains unproven and productization-complete is not approved.

## Reopen Trigger
Reopen if real provider execution needs new credential handling, external network policy, or release approval.
