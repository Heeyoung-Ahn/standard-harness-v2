# PKT-07 Feature Artifact Sync

## Scope
- Packet: `reference/packets/PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP.md`
- Workflow: Planner-to-Orchestrator
- Purpose: identify canonical artifact changes required by the Conductor surface, CLI worker routing loop, dual-provider packet authoring, and delegated approval authority transfer.

## Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
|---|---|---|---|
| Conductor selection at project start | Requirements, Architecture Guide, Implementation Plan, starter init/setup contract, tests | implemented as provider-neutral selection and entry metadata records | Developer |
| Delegated Ready For Code and Closeout approval moves from Planner to Conductor | Harness Operating Contract, workflow contracts, transition/validation diagnostics, approval records | implemented as trusted delegation grant and approval decision records; Planner delegated execution is rejected | Developer/Reviewer |
| Dual-provider packet authoring | Packet lifecycle docs, role routing policy, packet_doc_review evidence records, adjudication records | implemented as packet-authoring routing decisions and Conductor adjudication records | Developer/Reviewer |
| Selected provider entry generation | starter templates, initialization command, contamination checks, setup docs | implemented as initialized-project entry-file generation/validation; clean starter does not ship active provider entry files | Developer/Tester |
| Risk/importance routing policy | policy/schema/service/CLI diagnostics, tests | implemented as deterministic Conductor routing policy with worker task envelopes | Developer/Tester |
| CLI worker output routed back to Conductor | orchestration run records, output envelopes, evidence/adjudication refs | implemented as worker output refs and adjudication read-model events | Developer/Tester |
| Conductor selection vs approval actor separation | schema/service/validation contracts, tests | implemented and tested; selection does not grant approval authority | Developer/Tester |
| Delegation lifecycle and invalidation | approval service, validator, transition diagnostics, tests | implemented and tested for active, consumed, expired, revoked, and invalidated states | Developer/Tester/Reviewer |
| Trusted approval source boundary | approval command/service, worker output ingestion guard, negative tests | implemented and tested through trusted harness surface and verified evidence requirements | Developer/Tester/Reviewer |
| Entry file and command/path safety | entry template validator, command construction guard, path canonicalization checks, tests | implemented with path/content/command descriptor validation and real-path adapter hardening | Developer/Tester/Security Reviewer |

## Drift Findings
- Resolved pre-code: `SHV2-REQ-048` now separates Conductor selection from delegated approval authority and blocks Planner delegated approval execution after PKT-07.
- Resolved pre-code: `HARNESS_OPERATING_CONTRACT.md` now makes Human direct approval or scoped Conductor delegation the valid Ready For Code/Closeout approval path.
- Resolved pre-code: `.agents/workflows/planner.md` now records explicit Human decisions and routes valid Conductor approval records without executing Human-delegated approvals itself.
- Resolved pre-code: `.agents/artifacts/IMPLEMENTATION_PLAN.md` now assigns PKT-07 to Conductor Surface And CLI Worker Routing Loop and defers Skill Routing.
- Ready For Code is approved by explicit Human Owner decision on 2026-06-29 after packet-document review passed and pre-code authority-document contradictions were corrected.
- Generated context and validation reports are read models only and must be regenerated after approved state transitions; they must not be edited manually for this packet.

## Required SSOT
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/planner.md`
- `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`
- `reference/packets/PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP.md`

## Approval Boundary
- This artifact-sync report does not approve closeout, residual risk, release, publish, starter promotion, or final authority migration.
- Implementation may start only through Orchestrator after implementation-transition preflight passes.
- Runtime authority migration must still be implemented and verified before closeout.

## Do Not Cross
- Do not manually edit generated state docs.
- Do not manually override generated or hot-state summaries to fake route progress.
- Do not make active provider-specific entry files part of the clean starter payload.
- Do not let Planner retain Human-delegated Ready For Code or Closeout approval authority after PKT-07 implementation.

## Next First Action
- Complete independent closeout review lenses and final approval-authority closeout decision
  for PKT-07.
