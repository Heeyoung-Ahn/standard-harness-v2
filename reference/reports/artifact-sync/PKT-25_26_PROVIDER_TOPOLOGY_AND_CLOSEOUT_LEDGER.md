# PKT-25 / PKT-26 Artifact Sync And Source Intake

Workflow: Planner  
Status: PKT-25 Ready For Code approved; PKT-26 remains planning/RFC-pending  
Scope: provider topology, real-smoke contract, closeout ledger, review governance, and
PKT-17 through PKT-23 cleanup lessons.

## Source Change / Planning Matrix
| Source input | Required artifact | Current status | Required owner |
|---|---|---|---|
| User selected two packets | `reference/packets/PKT-25...`, `reference/packets/PKT-26...` | created as planning drafts | Planner |
| User selected Ready For Code 직전 수준 | packet approval boundary | recorded as `Ready For Code status: pending` | Planner |
| User requested project-start Conductor and per-packet worker1/worker2 | provider topology packet | covered by PKT-25 as packet-scoped topology record/report; worker aliases retained as compatibility aliases under role assignments | Planner, then Orchestrator after RFC |
| User requested first Conductor as Codex | provider topology packet | covered by PKT-25 as packet-scoped `projectTopology.conductor.provider=codex`, not product identity or a completed project-start UI/init flow | Planner, then Orchestrator after RFC |
| User requested per-packet PM, Planner, Developer, Documenter, Tester, and Reviewer assignment to Claude Code CLI or Codex CLI | provider topology packet | covered by PKT-25 through packet-scoped role assignments | Planner, then Orchestrator after RFC |
| User requested mixed-provider packet reviews, for example Claude Code CLI plus Codex CLI reviewers | provider topology and closeout review evidence | PKT-25 owns reviewer assignment/evidence envelope; PKT-26 may consume the separate review records for adjudication | Planner, then Orchestrator after RFC |
| A-lane `Reviewer=claude_code` hardcoding | real-smoke regression target | covered by PKT-25 | Developer after RFC |
| A-lane ad hoc `reviewer_provider=codex` override | schema/policy hardening target | covered by PKT-25 through manifest-backed topology, not a string override | Developer after RFC |
| A-lane empty evidence/claims/gates ledger | closeout ledger target | covered by PKT-26 | Developer after RFC |
| A-lane retrospective failed packet-doc review | packet-doc timing and authoring target | covered by PKT-26 | Developer/Reviewer after RFC |
| A-lane wrapper-approved vs persisted-blocked closeout | effective decision precedence target | covered by PKT-26 | Developer/Tester after RFC |
| PKT-17 clean export release block | closeout/reporting diagnostics | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-18 inherited-memory exclusion | copied-starter source authority | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-19 release bundle non-approval | release authority boundary | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-20 real provider smoke hold/narrowed | closeout/report representation of provider-readiness outcomes | included in PKT-26; topology schema and real-smoke routing remain PKT-25-owned | Planner/Developer after RFC |
| PKT-21 PM source read-model boundary | authority-boundary diagnostics | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-22 projection-only design boundary | authority-boundary diagnostics | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-23 closeout-shape remediation | closeout evidence shape target | included in PKT-26 cleanup matrix | Developer after RFC |
| PKT-25 remediation-loop threshold question and follow-up instruction | closeout ledger and review-governance loop guard | added to PKT-26 as A9/A10 with same-finding second-remediation, third full-loop, and scoped Conductor-delegation fixtures | Planner, then Developer after RFC |
| Human Owner decision after PKT-25 Remediation 4 challenge hold | PKT-25 A1/A9 scope clarification | recorded in PKT-25 as Planner Rescope Decision; A1/A9 now close packet-scoped topology record/report only | Planner/Reviewer |

## Impacted Packet Set
| Packet path | Source wave packet disposition | Current status | Required owner |
|---|---|---|---|
| reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md | PKT-25 selected for topology implementation; PKT-26 dependent consumer for closeout-ledger productization | Ready For Code approved by Human Owner on 2026-07-01; may transition only through approved Orchestrator route | Orchestrator after transition |
| reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md | PKT-26 dependent consumer for closeout-ledger productization; PKT-25 remains topology authority | Planning/RFC-pending until explicit Human Owner approval | Planner |

## Drift Findings
1. Provider topology is now represented by PKT-25 as a packet-scoped topology
   record/report and evidence-envelope contract. PKT-25 owns the schema, persistence,
   CLI, role assignment surface, mixed-provider reviewer assignment surface, and
   real-smoke validation correction inside that scoped contract.
2. Closeout governance can currently produce credible behavior evidence while strict
   ledger support remains incomplete. PKT-26 owns the evidence -> claim -> gate -> review
   -> adjudication -> closeout support chain.
3. PKT-20's real-provider hold was an honest narrowed closeout, but the later A-lane run
   showed that bounded topology smoke still needs productized routing and diagnostics.
   PKT-25 owns topology/smoke routing; PKT-26 owns closeout/report interpretation of
   unavailable, blocked, narrowed, or proven readiness outcomes.
4. PKT-17 through PKT-23 are closed for their approved scopes; the new packets must reuse
   their lessons without reopening or silently re-approving prior scopes.
5. PKT-25 showed that repeated Reviewer remediation loops need a productized stop rule.
   PKT-26 now owns loop-threshold recording, User decision routing, and scoped
   Conductor-delegated loop judgment.

## Generated Context Status
- `.agents/runtime/ACTIVE_CONTEXT.json` currently routes to Reviewer for
  `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`; PKT-25 is in closeout review after
  implementation and PKT-26 remains planning/RFC-pending.
- Generated state is a read model only and was not manually edited.
- `reference/packets/PKT-24_SURVEY_APP_WEB_REVIEW.md` is a separate product survey-app
  review packet and is intentionally not reused for these harness improvements.

## Required SSOT
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/planner.md`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md`
- Repo-bound A-lane source summary in `reference/reports/source/PKT-25_26_A_LANE_SOURCE_SUMMARY.md`

## Approval Boundary
- PKT-25 Ready For Code is approved by explicit Human Owner message on 2026-07-01.
- PKT-25 implementation may start only after the harness transition selects the PKT-25 work item and Orchestrator route.
- PKT-26 remains planning/RFC-pending; no PKT-26 implementation is approved by the PKT-25 approval.
- Independent packet challenge and independent `packet_doc_review` have passed for PKT-25 and PKT-26, but explicit Ready For Code remains packet-specific.
- No release, publish, starter promotion, productization-complete, User UAT, residual-risk
  acceptance, or real-provider readiness is approved.

## Next First Action
Transition PKT-25 from approved planning to Orchestrator delivery once the active-lane
state no longer conflicts with PKT-24. Keep PKT-26 in planning until separately approved.
