# PKT-20 Real Provider Worker Smoke

> PROVISIONAL SEQUENCE DRAFT. Do not request Ready For Code or Orchestrator routing until
> PKT-17 closeout evidence is reviewed and this packet is re-planned against PKT-17 results.

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
| Ready For Code | pending | Independent reviews and explicit approval evidence are required. | pending |
| Human sync needed | yes | Real authenticated provider execution needs explicit approval/tool availability boundary. | pending |
| Packet type | `harness-system` | Conductor/provider worker smoke is core harness behavior. | selected |
| Risk level | high | Provider tools, credentials, command execution, and approval boundaries are sensitive. | selected |
| Risk class | high / explicit approval / provider / security | Real provider execution can leak identity, credentials, or approval authority. | selected |
| Gate profile | release | Productization requires real smoke or explicit narrowed product claim. | selected |
| Route class | packet-path | Real execution evidence, security review, and validation are required. | selected |
| Change zone | core | Conductor/provider routing is core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code and real-execution approval, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | Operator CLI/status/evidence behavior may change, but no product browser UI or end-user product surface is in scope. | closed |
| Layer classification | core | Provider-neutral Conductor behavior is core. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No browser UI surface is included. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | not-needed | No product User UAT scope is included. | closed |
| Environment topology status | pending | Local provider tools/auth availability and safe command envelope must be confirmed. | pending |
| Domain foundation status | approved | Domain is Conductor provider worker smoke, adjudication, and provider-neutral identity. | selected |
| System context status | approved | Conductor, worker envelopes, adapter contracts, command descriptors, and evidence capture are impacted. | selected |
| Authoritative source intake status | approved | Source is Requirements, Implementation Plan, Architecture Guide, and PKT-14/15 boundaries. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Closeout evidence is not produced yet. | pending |
| Existing system dependency | internal | Builds on current Conductor/provider worker services. | selected |
| New authoritative source impact | analyzed | Implements approved productization plan. | closed |
| Risk if started now | high | Implementation and real execution must wait for review and explicit approvals. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or starter promotion is approved. | selected |
| Planner Packet Challenge Review | pending | Required before Ready For Code. | pending |
| Packet doc review | pending | Required before Ready For Code. | pending |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Real Provider Execution Boundary; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Environment topology approval; credential/session redaction; real CLI smoke approval
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; release publication; PM source ingestion
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-14 Conductor Worker E2E, PKT-15 promotion boundary, Conductor workflow/provider worker code, adapter examples, security review evidence.
- Environment topology reference: pending local provider tool/auth availability and explicit real-execution approval.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: local provider CLI tools only when approved and available.
- Execution target: bounded local Codex CLI / Claude Code CLI smoke through Conductor command envelopes, or explicit approved N/A/narrowed claim evidence.
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
| A1 | Real provider smoke runs through Conductor or is explicitly held/narrowed. | Command evidence or approval-bound hold record. |
| A2 | Provider identity remains adapter-only. | Provider-neutral contamination tests. |
| A3 | Credentials/session/raw transcript leakage is blocked. | Security review and redaction tests. |
| A4 | Delegated approval hard stops remain enforced. | Negative approval tests. |
| A5 | Productization completion remains incomplete until PKT-21 closes too. | Planner closeout. |

## Expected Negative Fixtures
- Provider output claims approval and must fail.
- Missing real-execution approval starts a provider command and must fail.
- Provider-specific entry contract becomes product identity and must fail.
- Credential/session/cache evidence enters context and must fail.

## Verification Plan
- Real CLI smoke or explicit approval-bound hold/narrowing evidence.
- Provider-neutral contamination tests.
- Delegated approval hard-stop tests.
- Security review, root/starter regression, harness validation.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| Real provider smoke | approved Conductor CLI worker smoke | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Provider neutrality | adapter/provider contamination tests | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Approval hard stop | delegated approval rejection tests | `reference/reports/test/PKT-20_TESTER_REPORT.md` |
| Security | credential/session/redaction review | `reference/reports/security/PKT-20-security-review.json` |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-20_REAL_PROVIDER_WORKER_SMOKE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-20-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-20-packet-doc-review.md` | required before Ready For Code |
| Developer report | `reference/reports/developer/PKT-20_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-20_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-20-security-review.json` | required before closeout |
| Reviewer adjudication | `reference/reports/review/PKT-20_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-20_PLANNER_CLOSEOUT.md` | required to mark closed |

## Required Closeout Lens Mapping
| Lens | PKT-20 Question |
|---|---|
| `challenge_review` | Does evidence prove real-provider readiness rather than fixture-only behavior? |
| `adversarial_security_review` | Can provider credentials, sessions, raw outputs, or identity contaminate the product? |
| `code_quality_review` | Are provider commands bounded through Conductor envelopes and adapter contracts? |
| `evidence_review` | Does smoke evidence distinguish pass, hold, tool unavailable, and approval unavailable? |

## Planner Packet Challenge Review
- Challenge reviewer: pending independent planning reviewer.
- Challenge evidence path: `reference/reports/review/PKT-20-planner-challenge-review.md`
- Challenge status: pending.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: pending independent packet document reviewer.
- Packet doc review evidence path: `reference/reports/review/PKT-20-packet-doc-review.md`
- Packet doc review status: pending.

## Human Sync / Approval Boundary
- Open decisions: real provider execution approval and local tool/auth availability.
- Planner cannot execute Human-delegated approval on Planner authority.

## Security Review Request
- Security review required: yes.
- Focus: credentials, sessions, command safety, provider identity, output redaction, approval bypass.

## Refactor / Residual Debt Disposition
- Refactor only Conductor/provider/evidence paths needed for acceptance.

## Packet Exit Quality Gate
- Source parity status: pending
- Acceptance evidence status: pending
- Test evidence status: pending
- Security evidence status: pending
- Reviewer adjudication: pending
- Planner closeout: pending
- Exit recommendation: hold

## Reopen Trigger
Reopen if real provider execution needs new credential handling, external network policy, or release approval.
