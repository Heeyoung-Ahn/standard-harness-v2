# PKT-09 Feature Artifact Sync

- Packet: `PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS`
- Workflow: Planner
- Scope: starter skill contract, automatic routing, process-skill hard gates, skill chaining, skill-use ledger, and superpowers optional-source disposition.
- Status: Ready For Code approved; implementation evidence pending.

| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Human Owner selected current `.agents/skills` as first-priority source | PKT-09 source priority model; implementation inventory of active skill catalog | packet records source priority; implementation inventory pending | Planner then Developer |
| Human Owner selected superpowers as comparison/absorption source only | PKT-09 superpowers absorption model; no-runtime-dependency validation | packet records optional-source boundary; implementation test pending | Planner then Developer |
| Automatic skill selection by intent | starter/root router contract, routing tests, context-budget checks | planned | Developer/Tester |
| Process skills before implementation | router ordering policy, validator hard gates, negative tests | planned | Developer/Tester/Reviewer |
| Hard gates for planning/debugging/review/verification | validator diagnostics, preflight/closeout integration, tests | planned | Developer/Tester |
| Required/next skill chaining | skill catalog schema, router chain guard, recursion/conflict tests | planned | Developer/Tester |
| Skill-use ledger | structured `_ops` record or equivalent starter evidence ledger | planned | Developer/Tester |
| Wave 8 skill-flow coverage | PKT-09 acceptance and verification scenarios for planning, TDD, review, security, browser evidence, dependency audit, day start, day wrap-up, documenter, memory, and retrospective | packet corrected after independent challenge review | Planner |
| SHV2-REQ-016 compound feedback ownership | Implementation Plan requirement coverage matrix and PKT-10 boundary | corrected to PKT-10/Wave 9; PKT-09 covers only retrospective/learning routing | Planner |
| Superpowers deletion criteria | packet acceptance, later cleanup packet, Human approval boundary | criteria recorded; deletion out of scope | Planner/Human |

## Drift Findings
- Requirements already contain SHV2-REQ-032 for automatic skill routing and SHV2-REQ-034 for overconfidence control.
- Implementation Plan already sequences PKT-09 after PKT-08 and before PKT-10, but its roadmap risk label was `standard`; the new hard-gate and external-source-removal criteria justify PKT-09 using high/core/contract gates in the packet.
- Architecture/source SSOT likely needs update during implementation because skill route output, hard-gate diagnostics, and ledger records are public starter contracts.

## Generated Context Status
- `ACTIVE_CONTEXT.json` is a generated re-entry summary only.
- No generated runtime summaries were edited for this planning turn.

## Required SSOT
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/workflows/planner.md`
- `.agents/workflows/reviewer.md`
- `reference/packets/PKT-09_SKILL_ROUTING_AND_OPERATOR_ERGONOMICS.md`

## Approval Boundary
- Implement only the PKT-09 approved scope. Human Owner explicitly approved Ready For Code after independent `packet_doc_review` passed.
- Do not delete superpowers, add a mandatory external plugin dependency, release/publish, or promote starter in PKT-09.

## Next First Action
- Run implementation-transition preflight.
- Route Developer implementation for the approved PKT-09 scope through Orchestrator.
