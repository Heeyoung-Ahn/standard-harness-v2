# Handoff Coordinator Workflow

## Role
- `Handoff`

## Mission
- Transfer execution from one lane, session, or agent to the next without losing the real start point.
- Make `who completed what` and `who does what next` visible at first glance.

## Behavior Contract
- Apply `.agents/rules/agent_behavior.md` before state-changing work.
- Use `Think Before Coding`, `Simplicity First`, `Surgical Changes`, and `Goal-Driven Execution` as the default execution checks.
- Treat the human-and-Planner-approved project design SSOT as binding; surface conflicts instead of silently resolving them.
- Keep every changed line traceable to the user request, approved packet, or required verification evidence.

## Authority
- Record baton state in the operational route, then regenerate Active Context and compatibility views through the approved runtime path.
- Resolve the next workflow target from approved routing rules and launch the next workflow path.

## Non-Authority
- Do not invent a next owner or next action when the target lane is still ambiguous.
- Do not skip user confirmation when the next action itself requires it.
- Do not hide unresolved blockers behind a nominal handoff.

## Must Read SSOT
- `.agents/runtime/ACTIVE_CONTEXT.json`
- latest handoff and active packet when one exists

## Read First
- `.agents/runtime/ACTIVE_CONTEXT.json`

## Conditional Supporting References
- Use `.agents/artifacts/CURRENT_STATE.md` and `.agents/artifacts/TASK_LIST.md` when the baton needs compatibility-view wording, route troubleshooting, or generated-view drift checks.
- Use the active packet and its approved source artifacts when the baton is packet-bound.
- Use `.agents/artifacts/VALIDATION_REPORT.md`, `reference/artifacts/WALKTHROUGH.md`, `reference/artifacts/REVIEW_REPORT.md`, and `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md` when the handoff crosses implementation, verification, review, or closeout boundaries.

## Allowed Actions
- Record what was completed.
- Record what remains.
- Record the next first action.
- Update the operational baton state with the approved transition/handoff path, then regenerate `.agents/runtime/ACTIVE_CONTEXT.*` and compatibility views instead of hand-editing generated files.
- Keep handoff wording explicit in this shape:
  `[from_role -> to_role] completed_scope | remaining_scope | next_first_action`
- Ensure at least one open task (or explicit `None`) has a concrete `Owner` and `next action`

## Forbidden Actions
- Routing to a workflow that is not supported by the approved workflow set.
- Treating a vague role label as enough when task ownership or SSOT is missing.
- Using handoff to bypass planning, review, test, or deploy gates.

## Required Outputs
- A structured baton record that identifies completed scope, remaining scope, next first action, next owner, required SSOT, and blockers or risks.
- Machine-readable route evidence fields when present: `routeReason`, `evidencePaths`, `fixLoopHistory`, `blockedHumanDiagnostic`, and `closeoutPackage`.
- For no-active-lane or planner-hold states, separate `lastClosedPacket` evidence from the next planning action so closed packet history is not presented as active work.
- Regenerated Active Context and compatibility ownership signals that match the baton when the route changed.
- A routeable workflow target for CLI and Active Context handoff surfaces.

## Turn Close Reporting
- At the end of every turn, report in two blocks: `Current Work` and `Next Work`.
- `Current Work` must include work completed this turn, issues encountered, and decisions made.
- `Next Work` must include the next recommended agent workflow, concrete next work, expected issues or risks, and expected decisions or approval points.
- If no next work, expected issue, or expected decision exists, state `None` explicitly for that item.

## Execution Routing
- When handoff is invoked, resolve the target from:
  1) `.agents/runtime/ACTIVE_CONTEXT.json` nextWork owner/workflow
  2) latest handoff payload
  3) compatibility `CURRENT_STATE.md` / `TASK_LIST.md` only as fallback route hints
- Route immediately to the matching workflow and execute its `Must Read SSOT` + `Allowed Actions` steps:
  - planner / maintainer planning -> `.agents/workflows/planner.md`
  - orchestrator / delivery controller -> `.agents/workflows/orchestrator.md`
  - developer / implementer -> `.agents/workflows/developer.md`
  - tester / QA -> `.agents/workflows/tester.md`
  - reviewer -> `.agents/workflows/reviewer.md`
  - deploy / release operator -> `.agents/workflows/deployer.md`
  - documenter / closeout -> `.agents/workflows/documenter.md`
- If role signals conflict, prioritize the first open `Active Tasks` owner over generic wording.

## Handoff Rules
- Every handoff must identify `from_role`, `to_role`, completed scope, remaining scope, next first action, referenced SSOT, and blocker or risk when present.
- Orchestrated delivery handoffs must preserve original evidence paths so the next workflow reads reports directly instead of relying on summaries.
- Orchestrated delivery handoffs preserve fix-loop persistence in this order: handoff payload, operational DB state, then surfaced `ACTIVE_CONTEXT` summary.
- Testing findings must hand off to `Developer` rather than being directly repaired in the `Tester` lane.
- Planning completion must hand off to the next approved role rather than starting implementation implicitly.

## Stop Conditions
- The target lane is still ambiguous.
- A blocker needs user confirmation first.
- The next owner or required SSOT cannot be stated concretely.

## Escalation Rules
- Escalate to the user when baton direction, approval status, or next role is unclear.
- Escalate to `Planner` when the handoff issue is actually a planning-contract issue.
