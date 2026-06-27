# Day Wrap Up

Use this skill to close the day with a reliable restart point.

Run this skill through the `Project Manager` lens: reconcile what happened, preserve the next baton, and make the next responsible workflow explicit without claiming another workflow's approval authority.

`day_wrap_up` is PM-owned live baton reconciliation. Use `Documenter` only when the next explicit work is archive, durable history compaction, manual cleanup, or version-closeout hygiene.

## PM Boundary

- PM may reconcile status, blocker ownership, next workflow, and handoff readiness from canonical evidence.
- PM may recommend the next owner and first action.
- PM must not mark implementation, testing, review, release, or human approval gates complete unless the owning workflow or user has provided that evidence.

## Required Flow

1. gather explicit evidence
2. update the live state
3. record unresolved items honestly
4. review whether any repeated issue should become preventive memory
5. define the next responsible workflow
6. define the next first action
7. preserve restart intent in the latest handoff payload / compact Active Context projection when a next-session first action, improvement candidate, or unpersisted item should survive into `day_start`

## Read Order

1. `.agents/runtime/ACTIVE_CONTEXT.json`
2. the workflow file that owned today's work, or `.agents/workflows/project_manager.md` when the route is unclear
3. the active packet and approved source artifacts when today's work was packet-bound
4. `.agents/artifacts/CURRENT_STATE.md` and `.agents/artifacts/TASK_LIST.md` when updating baton state or checking route drift
5. validation evidence such as `.agents/artifacts/VALIDATION_REPORT.*`, `reference/artifacts/WALKTHROUGH.md`, or `reference/artifacts/REVIEW_REPORT.md` only when today's workflow required them
6. `.agents/artifacts/PREVENTIVE_MEMORY.md` only when a repeated issue qualifies for promotion review
7. the most recent note under `reference/artifacts/daily/` only when a human-facing daily note is already in use or clearly needed

## Reconciliation Gate

Do not claim a clean closeout if any of these remain ambiguous:

- next action
- next-session restart intent
- completion state of major work
- changed architecture direction
- unverified behavior change
- unresolved blocker owner or status
- unclear next responsible workflow or handoff route

## Preventive Memory Triage

When `.agents/artifacts/PREVENTIVE_MEMORY.md` has accumulated `Promotion Candidates` relevant to harness improvement, review them during day wrap-up.

PM may:

- identify duplicate, stale, note-only, rejected, promoted, and follow-up-needed candidates
- ask the user which candidates should be approved, deferred, rejected, merged, or kept as note-only
- after user approval, adjust only candidate status, list disposition, linked follow-up item, or triage notes inside `Promotion Candidates`

PM must not:

- edit `Active Preventive Rules`
- mark a candidate `promoted` without completed follow-up evidence
- implement the candidate as a harness change
- approve Ready For Code, review, release, or packet closeout

## Harness Improvement Threshold

If three or more actual harness improvement candidates are approved and still unimplemented, record a next-day Planner recommendation to bundle or prioritize harness improvement planning.

Count only candidates that meet all of these conditions:

- target layer is `core` or `optional profile`
- `Promotion Status` is `approved`
- the entry has a linked follow-up item or explicit follow-up-needed disposition
- the item is not already `promoted`, `rejected`, `note-only`, or project-only

This threshold is a priority signal for the next PM `day_start`; it is not approval to implement the improvements.

## Behavior Checks

- Apply `.agents/rules/agent_behavior.md` before changing live state or recommending closeout.
- Use `Think Before Coding`: name unresolved assumptions, ambiguity, SSOT conflicts, and approval gaps.
- Use `Simplicity First`: record only the current day's real delta and avoid speculative next-lane scope.
- Use `Surgical Changes`: reconcile state for the work that actually happened; do not rewrite unrelated history.
- Use `Goal-Driven Execution`: tie verification and next first action to concrete checks, the approved project design SSOT, active packet, and gate evidence.
- If Developer, Tester, or Reviewer work remains, preserve their authority and hand off instead of self-approving.

## Output Contract

Return a concise closeout with:

1. Completed Today
2. Still Open
3. Verification
4. Confirmations And Deferred Decisions
5. Next Recommended Workflow
6. Next Session First Action
7. Restart Continuity Evidence

## Rules

- Use the user's language for closeout and confirmation prompts.
- Prefer short confirmation questions when evidence does not fully close a conflict.
- Do not silently rewrite stable context from a guess.
- Treat the day's plan as closed only when the baton, next workflow, and next first action are explicit; do not create a separate daily-plan authority document.
- Record restart intent as coordination metadata, not authority. It can guide the next PM/day-start priority, but it must not approve a lane, Ready For Code, implementation, testing, review, release, or closeout.
- When a write fails or a preventive-memory candidate cannot be persisted, record the failed persistence as an unresolved restart-continuity evidence gap instead of hiding it.
- Prefer the latest handoff payload plus compact Active Context projection for restart continuity; `reference/artifacts/daily/*` remains fallback-only and non-authoritative.
- `reference/artifacts/daily/*` is optional. Create or update it only when a human-facing daily note is actually useful.
- `harness:validate` and `harness:validation-report` are required before forward handoff when today's work changed implementation, reusable runtime/state, or packet evidence that the owning workflow requires. Do not pretend they ran on planning-only days when they did not.
- Promote repeated issues into preventive memory only when the trigger, rule, and check method are explicit enough to reuse.
- Treat three or more approved, unimplemented actual harness improvement candidates as a signal to recommend next-day Planner improvement planning.
- If the next workflow owns planning, implementation, testing, review, deployment, or documentation work, report the handoff recommendation instead of performing that workflow's work inside this skill.
