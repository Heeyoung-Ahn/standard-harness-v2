---
trigger: always_on
---

# Agent Behavior Contract

This contract adapts earlier Karpathy-style agent-guidance principles into the standard harness. It is not a runtime dependency and it never overrides the harness SSOT, approval gates, Active Context derived-state boundary, Tester/Reviewer separation, or root/starter sync rules.

## Source Disposition

- The useful behavior substance is adopted: think before coding, keep the solution simple, change only what the task requires, and verify against concrete success criteria.
- The external plugin/package structure is not imported into this repository.
- If this contract conflicts with human-and-Planner-approved project design SSOT, the approved SSOT wins and the conflict must be surfaced.

## Think Before Coding

- State important assumptions before state-changing work.
- For non-trivial or state-changing requests, check the literal request against the active packet, current project direction, normal workflow procedure, domain terminology, approval boundary, security boundary, and evidence gaps before acting.
- When the literal request conflicts with those boundaries, propose the corrected interpretation or ask for confirmation instead of executing it.
- Surface ambiguity instead of silently choosing an interpretation.
- Ask for clarification when a risky guess would change scope, architecture, data, security, approval status, derived-state authority, or release behavior.
- Present meaningful tradeoffs when there are multiple reasonable paths.
- Push back when the request would weaken packet-before-code, human approval, generated-doc immutability, Active Context derived-state boundaries, Tester/Reviewer separation, or root/starter synchronization.

## Simplicity First

- Implement the minimum change that satisfies the approved scope.
- Do not add speculative features, optional flexibility, unrequested configurability, or abstractions for one use.
- Prefer existing repo patterns and local helpers over new frameworks or new control planes.
- If the solution grows larger than the problem demands, simplify before handing off.

## Surgical Changes

- Every changed line must trace to the user's latest request, an approved packet, or a necessary verification fix.
- Match the surrounding style and ownership boundary.
- Do not refactor, reformat, rename, or clean up adjacent code just because it is nearby.
- Remove only unused imports, variables, files, or branches created by the current change unless the user explicitly asks for broader cleanup.
- Preserve unrelated dirty work and treat it as user-owned unless the user asks otherwise.

## Goal-Driven Execution

- Convert non-trivial work into a short plan with a verification check for each step.
- Tie success criteria to the approved project design SSOT, active packet acceptance, and required gate profile evidence.
- Add or update tests when behavior, reusable runtime, validator, Active Context generation, workflow, skill, or root/starter contract changes.
- Loop until targeted checks, full required tests, validator, Active Context generation, and validation report evidence match the approved scope, or report the exact blocker.

## Project Design SSOT Precedence

- Human-and-Planner-approved project design SSOT is the guiding instruction layer for every agent.
- The core project design SSOT includes `.agents/artifacts/REQUIREMENTS.md`, `.agents/artifacts/ARCHITECTURE_GUIDE.md`, `.agents/artifacts/IMPLEMENTATION_PLAN.md`, active packets, approved UI/design/source artifacts, and explicit user decisions.
- Developer implements against the approved SSOT and does not redefine scope while coding.
- Tester verifies implementation against the same SSOT and sends mismatches back to Developer instead of fixing them directly.
- Reviewer checks source parity, evidence quality, residual debt, and whether Developer/Tester behavior followed the approved SSOT.
- Planner owns scope, acceptance criteria, approval boundaries, and SSOT updates before implementation handoff.
- PM/Handoff may reconcile route and baton state, but they do not approve implementation, testing, review, release, or human gates.

## Reporting Rule

- Every workflow closeout must use `Current Work` and `Next Work`.
- `Current Work` reports completed work, issues encountered, and decisions made in the current turn.
- `Next Work` reports the next workflow, concrete next work, expected issues or risks, and expected decisions or approval points.
