# PKT-18 Fresh Starter QA And Onboarding Smoke

> PROVISIONAL SEQUENCE DRAFT. Do not request Ready For Code or Orchestrator routing until
> PKT-17 closeout evidence is reviewed and this packet is re-planned against PKT-17 results.

> PLANNING PACKET. Ready For Code is pending until independent Planner Packet
> Challenge Review, independent `packet_doc_review`, and explicit approval evidence are
> recorded. This packet does not approve release, publish, starter promotion, residual
> risk, productization completion, or User UAT.

## Purpose
PKT-18 proves a freshly exported/copied starter behaves like a new project instead of a
continuation of this root hardening repository. It closes the post-PKT-16 risk that
operating QA can answer from inherited root packet history, stale evidence, wiki memory,
or generated state before a copied project has its own trusted sources.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE` | Required productization packet after PKT-17. | selected |
| Ready For Code | pending | Independent reviews and explicit approval evidence are required. | pending |
| Human sync needed | no-open-decisions | Scope follows Requirements and Implementation Plan; only Ready For Code remains after review pass. | selected |
| Packet type | `harness-system` | Fresh QA, onboarding, source trust, and abstain behavior are reusable harness behavior. | selected |
| Risk level | high | Stale inherited context can mislead a Human Owner at project start. | selected |
| Risk class | high / productization / context-authority | Fresh-source trust and QA abstain behavior are load-bearing. | selected |
| Gate profile | release | Productization readiness requires copied-starter smoke and authority-boundary evidence. | selected |
| Route class | packet-path | Runtime behavior, tests, smoke evidence, and review evidence are required. | selected |
| Change zone | core | Operating QA, onboarding, source trust, and starter initialization are core. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> independent lenses -> Reviewer -> Planner closeout. | selected |
| User-facing impact | none | Operator-facing CLI/onboarding text may change, but no product browser UI or end-user product surface is in scope. | closed |
| Layer classification | core | Fresh project QA is reusable starter core behavior. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | closed |
| UX archetype status | not-needed | No browser UI surface is included. | closed |
| UX deviation status | none | No UX deviation applies. | closed |
| Product readiness / UAT gate | not-needed | No product UI, role/session/account surface, or User UAT claim is included. | closed |
| Environment topology status | approved | Local clean export target under `C:\tmp`; no remote release target. | selected |
| Domain foundation status | approved | Domain is fresh copied-starter QA, source trust, abstain behavior, and onboarding smoke. | selected |
| System context status | approved | Operating QA, source indexes, initialization, reset, and memory authority are impacted. | selected |
| Authoritative source intake status | approved | Source is Requirements, Implementation Plan, Architecture Guide, PKT-16/17 boundaries. | selected |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Closeout evidence is not produced yet. | pending |
| Existing system dependency | internal | Builds on current starter QA, memory, init/reset, and source-index services. | selected |
| New authoritative source impact | analyzed | Implements approved post-PKT-16 productization scope. | closed |
| Risk if started now | high | Implementation must wait for PKT-17 clean export closeout, packet reviews, and Ready For Code approval. | selected |
| Release / publish / promotion execution | not-approved | No release, publish, or actual starter promotion is approved. | selected |
| Planner Packet Challenge Review | pending | Required before Ready For Code. | pending |
| Packet doc review | pending | Required before Ready For Code. | pending |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: Goal; Non-Goal; In Scope; Out Of Scope; Data / Source Impact; Verification Plan; Refactor / residual debt disposition; Packet Exit Quality Gate; Reopen Trigger
- Lane-type required sections: Purpose; Quick Decision Header; Source Authority; Fresh QA Contract; Acceptance; Expected Negative Fixtures; Verification Manifest; Required Evidence Paths; Required Closeout Lens Mapping; Planner Packet Challenge Review; Packet Document Review; Human Sync / Approval Boundary; Security Review Request; Packet Exit Quality Gate; Reopen Trigger
- Lane-type conditional sections: Development Documentation Impact; Starter smoke evidence
- Lane-type not-needed sections: UI/UX Detailed Design; browser evidence; release publication; live provider execution
- Layer classification: core
- Required reading before code: Requirements, Implementation Plan, Architecture Guide, PKT-16/17 closeout or packet boundaries, operating QA, memory/source-index, init/reset, starter smoke, and validation tests.
- Environment topology reference: local exported starter target under `C:\tmp`.
- Source environment: `C:\30_project\standard-harness-v2`.
- Target environment: disposable copied-starter target such as `C:\tmp\standard-harness-pkt18-fresh-*`.
- Execution target: local starter CLI, operating QA command, init/reset/sync-state/validate/status, root/starter tests.
- Transfer boundary: only disposable copied-starter source indexes, QA outputs, and smoke
  evidence under packet-bound paths may be created; inherited root packet/evidence/wiki
  memory must not become copied-project source authority.
- Rollback boundary: revert packet-scoped source/docs/evidence changes through git if needed;
  delete only exact disposable `C:\tmp\standard-harness-pkt18-*` targets under destructive-command guard.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`.
- Existing schema source artifact: internal starter QA/source-index schemas or not-needed if no schema change.
- Table / column naming compatibility: not-needed.
- Data operation / ownership compatibility: fresh QA answers may cite only initialized project-specific trusted sources; inherited root memory is forbidden.
- Migration / rollback / cutover compatibility: not-needed.
- Authoritative source intake reference: SHV2-REQ-049, 050, 051, 052, 055 and post-PKT-16 productization plan.
- Authoritative source disposition: accepted for packet planning only; approval remains separate.
- Current implementation impact: may change QA source trust, abstain behavior, onboarding/status wording, init/reset/source-index tests.
- Existing plan conflict: none.
- Impacted packet set scope: PKT-18 only; PKT-19 through PKT-23 remain separate.
- Dependency precondition: PKT-18 cannot request Ready For Code until PKT-17 clean export
  implementation and closeout evidence prove an official clean export candidate path, or
  Planner records a narrower PKT-18 scope that does not depend on a clean export candidate.

## Goal
- Prove a fresh starter answers only from project-specific trusted sources.
- Fail closed or abstain when only inherited root hardening memory, stale evidence, or unsupported authority is available.
- Make first-project onboarding smoke reproducible after clean export/init.

## Non-Goal
- Do not release, publish, or promote the starter.
- Do not implement release-candidate packaging, real provider smoke, PM ingestion, or design trace.
- Do not claim User UAT readiness.

## Source Authority
- Requirements: SHV2-REQ-049, 050, 051, 052, 055, 057.
- Implementation Plan: PKT-18 row and post-PKT-16 productization completion rule.
- Architecture Guide: source trust, generated-state boundary, wiki/memory authority, and starter zones.
- PKT-16 release-baseline evidence: raw copied QA answered from inherited PKT-14 memory before reset.
- PKT-17 dependency: PKT-17 clean export closeout must provide the clean copied-starter
  candidate or evidence path used for PKT-18 fresh QA smoke.

## Fresh QA Contract
Fresh QA may answer only when initialized project-specific source indexes, packet records,
evidence, closeout reports, wiki memory, PM summaries, or Active Context sources exist and
are trusted for the copied project. If only inherited root hardening memory or stale
generated evidence is present, the answer must abstain or fail closed with diagnostics.

Minimum trusted copied-project source provenance:
- source path must be inside the clean exported/copied starter target after initialization;
- source record must carry copied-project packet, evidence, wiki, PM, or Active Context
  provenance, not root repository provenance;
- citations must include source type, packet/work item or project id when applicable,
  evidence path or generated-state path, freshness timestamp or event sequence, and trust
  decision;
- when copied-project sources and inherited-root sources both exist, copied-project trusted
  sources win and inherited-root sources must be ignored with a diagnostic;
- mixed-source answers must fail when root memory is newer, more complete, or more convenient
  but lacks copied-project provenance.

## Data / Source Impact
- Source impact classification: high
- Data impact classification: conditional
- Schema impact classification: conditional
- Source impact note: source trust, QA, init/reset, and starter status behavior may change.
- Data impact note: only local copied-starter evidence and source indexes are created.
- Schema impact note: prefer existing source-index/memory schemas.

## In Scope
- Fresh copied-starter QA abstain/fail-closed behavior.
- Before/after reset and init source-trust tests.
- First-packet/onboarding smoke sufficient to guide a Human Owner without root memory.
- Evidence-source trust diagnostics.

## Out Of Scope
- Release packaging, real provider execution, PM bulk ingestion, UI/design contracts, and actual User UAT.

## Acceptance
| ID | Acceptance Criterion | Evidence Required |
|---|---|---|
| A1 | Fresh copied starter does not answer from inherited root hardening memory. | Negative QA fixture and Tester report. |
| A2 | QA abstains or fails closed when trusted project-specific sources are absent. | QA command evidence. |
| A3 | After init/source creation, QA cites only copied-project trusted sources. | Fresh source-index evidence. |
| A4 | Onboarding smoke guides first packet creation without implying approval. | Init/first-packet/status smoke evidence. |
| A5 | Productization remains incomplete after PKT-18. | Planner closeout. |
| A6 | PKT-17 clean export evidence is present before PKT-18 implementation starts. | PKT-17 closeout or clean-export candidate evidence path. |

## Expected Negative Fixtures
- QA answer cites PKT-14/PKT-16 root evidence in a fresh copy and must fail.
- Generated summaries or wiki memory without copied-project provenance shape the answer and must fail.
- Onboarding text implies Ready For Code, release, or closeout approval and must fail.
- Mixed copied-project source plus injected inherited-root memory chooses root memory and must fail.
- Raw `_ops` packet/evidence/wiki history from the root repo is present and must be ignored or blocked.
- Stale Active Context or generated runtime summary shapes the answer and must fail.
- PM summary claims approval authority and must be cited only as non-authoritative source or rejected.
- Evidence index path resolves outside the copied project and must fail provenance validation.
- Local state DB/cache or sensitive memory influences QA answer and must fail.

## Verification Plan
- Targeted QA/source-trust tests.
- Fresh copied-starter init/reset/QA/status smoke.
- Root/starter regression and harness validation.
- Independent closeout lenses, security review, Reviewer adjudication, Planner closeout.

## Verification Manifest
| Surface | Command / Check | Required Evidence Path |
|---|---|---|
| QA/source trust tests | targeted starter Python tests | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Inherited-memory citation fail | QA answer fixture that would cite PKT-14/PKT-16 root evidence must fail or abstain | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| No-trusted-source abstain | Fresh copied starter without project-specific trusted sources must abstain/fail closed | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Post-init copied-project citations | After init/source creation, QA may cite only copied-project trusted sources | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Onboarding no-approval wording | First-packet/onboarding text must not imply Ready For Code, release, closeout, or UAT approval | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Mixed-source precedence | Copied-project trusted source plus newer/more complete inherited-root source must ignore root source or fail closed | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Authority-source fixture matrix | raw `_ops`, stale Active Context, copied wiki/evidence indexes, PM authority claim, sensitive memory, local DB/cache, and path-provenance confusion are rejected or diagnostic-only | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Fresh starter smoke | init/reset/operating-qa/sync-state/validate/status | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Root regression | `npm test` | `reference/reports/test/PKT-18_TESTER_REPORT.md` |
| Harness validation | `npm run harness:validate` | `reference/reports/test/PKT-18_TESTER_REPORT.md` |

## Required Evidence Paths
| Evidence | Path | Required Status |
|---|---|---|
| Artifact sync report | `reference/reports/artifact-sync/PKT-18_FRESH_STARTER_QA_AND_ONBOARDING_SMOKE.md` | required before Ready For Code |
| Planner challenge review | `reference/reports/review/PKT-18-planner-challenge-review.md` | required before Ready For Code |
| Packet document review | `reference/reports/review/PKT-18-packet-doc-review.md` | required before Ready For Code |
| PKT-17 clean export dependency | `reference/reports/closeout/PKT-17_PLANNER_CLOSEOUT.md` or PKT-17 clean-export candidate evidence cited by Reviewer | required before Ready For Code |
| Ready For Code approval record | packet-local Human approval wording or Human Owner delegated Planner approval evidence for the current v1.0 root context | required before Orchestrator implementation routing |
| Developer report | `reference/reports/developer/PKT-18_DEVELOPER_REPORT.md` | required before closeout |
| Tester report | `reference/reports/test/PKT-18_TESTER_REPORT.md` | required before closeout |
| Security review | `reference/reports/security/PKT-18-security-review.json` | required before closeout |
| Challenge review lens | `reference/reports/review/PKT-18-closeout-challenge-review.md` | required before Reviewer adjudication |
| Adversarial security lens | `reference/reports/review/PKT-18-closeout-adversarial-security-review.md` | required before Reviewer adjudication |
| Code quality lens | `reference/reports/review/PKT-18-closeout-code-quality-review.md` | required before Reviewer adjudication |
| Evidence review lens | `reference/reports/review/PKT-18-closeout-evidence-review.md` | required before Reviewer adjudication |
| Reviewer adjudication | `reference/reports/review/PKT-18_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-18_PLANNER_CLOSEOUT.md` | required to mark closed |

## Required Closeout Lens Mapping
| Lens | PKT-18 Question |
|---|---|
| `challenge_review` | Does fresh QA really abstain from inherited root memory? |
| `adversarial_security_review` | Can stale evidence, wiki, generated summaries, or sensitive memory leak into QA answers? |
| `code_quality_review` | Is source-trust behavior implemented through existing QA/source-index contracts? |
| `evidence_review` | Does evidence prove before/after source trust and onboarding smoke without approval overclaims? |

## Reviewer Closeout Hold Basis
Reviewer must hold PKT-18 closeout on any of:
- missing PKT-17 clean export candidate evidence or clean export closeout;
- missing inherited-memory before/after QA proof;
- missing no-trusted-source abstain proof;
- copied-project citations without source type, packet/project id, evidence path, freshness,
  and trust decision;
- mixed-source fixture that prefers inherited root memory;
- stale Active Context, generated summary, PM summary, wiki/evidence index, local DB/cache, or
  sensitive memory leakage into QA output;
- onboarding smoke that is guidance-only and not backed by init/source-index/status evidence;
- approval overclaim in QA or onboarding output;
- fixture-only closure without root/starter regression and harness validation.

## Planner Packet Challenge Review
- Challenge reviewer: independent planning reviewer subagent
  `019f179d-4304-7112-914a-56cf670d4cd6`.
- Challenge evidence path: `reference/reports/review/PKT-18-planner-challenge-review.md`
- Challenge status: hold pending second-pass review.
- Findings disposition: initial findings corrected in packet text: PKT-17 dependency,
  provenance/citation shape, mixed-source/authority-source negative fixtures, and Reviewer
  closeout hold basis were added.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code.
- Packet doc reviewer: pending independent packet document reviewer.
- Packet doc review evidence path: `reference/reports/review/PKT-18-packet-doc-review.md`
- Packet doc review status: pending.

## Human Sync / Approval Boundary
- Open decisions: none beyond Ready For Code approval after independent review pass.
- Planner may record explicit Human Ready For Code approval or Human Owner delegated Planner
  approval evidence for the current v1.0 root context. v2.0 starter Conductor concepts are not
  current root approval authority for PKT-18.

## Security Review Request
- Security review required: yes.
- Focus: stale memory leakage, source provenance, sensitive evidence, generated-state authority, and approval overclaims.

## Refactor / Residual Debt Disposition
- Refactor only QA/source-trust/onboarding paths needed for acceptance.

## Packet Exit Quality Gate
- Source parity status: pending
- Acceptance evidence status: pending
- Test evidence status: pending
- Security evidence status: pending
- Reviewer adjudication: pending
- Planner closeout: pending
- Exit recommendation: hold

## Reopen Trigger
Reopen if QA requires release packaging, real provider execution, PM bulk ingestion, or a new public source-index architecture beyond this packet.
