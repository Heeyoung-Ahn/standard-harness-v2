# Day Start

Use this skill to recover the smallest correct execution context at the start of a session.

Run this skill through the `Project Manager` lens: restore execution state, identify the next responsible workflow, and hand the work to the right owner without taking over that owner's authority.

## Goal

Produce a compact start-of-session brief from the standardized harness without rebuilding the project state from memory.

The brief should make the first execution step obvious while preserving workflow authority boundaries.

## Read Order

1. `.agents/runtime/ACTIVE_CONTEXT.json`
2. the workflow file named by `ACTIVE_CONTEXT.nextWork.workflow`, or `.agents/workflows/project_manager.md` when the route is unclear
3. `ACTIVE_CONTEXT.restartContinuity` and `ACTIVE_CONTEXT.latestHandoff.restartContinuity` when present
4. the explicit `ACTIVE_CONTEXT.reentryContract.mustReadNext` items that are still unread
5. `.agents/artifacts/CURRENT_STATE.md` and `.agents/artifacts/TASK_LIST.md` only when the re-entry contract explicitly requires them or compatibility troubleshooting is needed
6. the active packet and approved source artifacts only when today's first action depends on them
7. `.agents/artifacts/PREVENTIVE_MEMORY.md` only if directly relevant
8. the most recent note under `reference/artifacts/daily/` when today's scope needs recent delta context
9. any immediately relevant repository evidence

## What To Extract

- context assurance: selected lane, next workflow, must-read-next list, and stale/missing fallback status
- current state and release target
- restart continuity: live route truth, restart intent, next-session first action, and evidence gaps as separate facts
- current judgment point: active/no-active-lane state, validation summary, blockers/decisions, route owner, and compact next action
- what changed recently
- blockers, risks, or pending confirmations
- today's likely top priorities
- whether today's plan is packet opening, packet execution, packet verification, packet closeout, or planning hold
- next recommended workflow and owner
- evidence gaps that would make the next action unsafe to start
- the first concrete action

## Harness Improvement Priority

Read `.agents/artifacts/PREVENTIVE_MEMORY.md` during day start when day wrap-up or Active Context indicates accumulated harness improvement candidates may affect today's priority.

If three or more actual harness improvement candidates are approved and still unimplemented, guide the day's priority toward harness improvement planning before ordinary next-candidate work, unless a higher-priority explicit blocker or user instruction overrides it.

Count only candidates that meet all of these conditions:

- target layer is `core` or `optional profile`
- `Promotion Status` is `approved`
- the entry has a linked follow-up item or explicit follow-up-needed disposition
- the item is not already `promoted`, `rejected`, `note-only`, or project-only

When the threshold is met:

- put harness improvement planning in `Today's Top Priorities`
- recommend `Planner` as the next workflow
- make the first action a planning step to bundle, prioritize, or open the approved improvement work
- do not approve, open, implement, test, review, or close the improvement packet inside day start

## Behavior Checks

- Apply `.agents/rules/agent_behavior.md` before recommending non-trivial work.
- Use `Think Before Coding`: state important assumptions, surface ambiguity, and flag SSOT conflicts instead of guessing.
- Use `Simplicity First`: recommend the smallest next workflow/action that can safely move the approved scope.
- Use `Surgical Changes`: do not fold unrelated cleanup or adjacent improvements into the first action.
- Use `Goal-Driven Execution`: make the first action verifiable against the approved project design SSOT, active packet, and gate evidence.
- Treat human-and-Planner-approved project design SSOT as binding for the next owner.

## Output Contract

Return a concise start brief with these sections:

1. Context Assurance
2. Current State
3. Restart Continuity
4. Current Judgment Point
5. What Changed Recently
6. What Needs Attention First
7. Today's Top Priorities
8. Next Recommended Workflow
9. Evidence Gaps
10. First Action

## Rules

- Use the user's language.
- Treat `.agents/runtime/ACTIVE_CONTEXT.json` plus the operational DB state as the live execution route; use `.agents/artifacts/CURRENT_STATE.md` only as a generated compatibility fallback when the re-entry contract asks for it or troubleshooting needs it.
- Start by echoing the `ACTIVE_CONTEXT` first-read contract: selected lane, next workflow, must-read-next list, and whether fallback reading was required.
- Treat the day's plan as a baton reconstructed from `ACTIVE_CONTEXT`, restart continuity projection, the active workflow, and the active packet; do not invent a separate daily-plan authority document.
- Report live route and restart intent separately. Restart intent can recommend priority or first action, but it must not approve a lane, Ready For Code, implementation, verification, review, release, or closeout.
- If `day_wrap_up` evidence mentions a restart intent but `ACTIVE_CONTEXT` lacks it, report a continuity evidence gap before ordinary next work.
- Default reads must stay compact: Active Context, PM workflow, day-start skill, latest handoff / compact continuity projection, and validation summary. Requirements, full validation JSON, full packet history, long-memory docs, and compatibility views are fallback-only unless triggered.
- If direct evidence contradicts the saved state, flag the mismatch instead of silently resolving it.
- Read preventive rules only when they directly affect today's scope.
- Use the three-candidate harness improvement threshold only as a PM priority signal, not as approval to implement improvements.
- Do not bulk-restate project history.
- Do not redefine requirements, approve gates, implement code, or verify behavior while using this skill.
- If the next owner is unclear, recommend `Project Manager` or `Handoff` reconciliation instead of guessing.
- End with one concrete first action.
