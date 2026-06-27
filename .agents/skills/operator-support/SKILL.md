# Operator Support

Use this skill when the human operator needs concise status, approval options, risk, or next safe action.

## Use When
- The user asks what remains, what is blocked, what packet is next, or what can safely happen now.
- Current state, packet status, route, or verification evidence may be confusing.
- A non-engineer operator needs approval choices explained without implementation detail overload.

## Do Not Use When
- The user asks for implementation and an approved execution skill should run instead.
- The response would approve work, close packets, mutate state, or hide uncertainty.
- The status depends on generated summaries that conflict with approved sources.

## Workflow
1. Identify the current phase, active packet, and route.
2. State what is approved, not approved, blocked, or unverified.
3. Name the next safe action and any approval required.
4. Separate confirmed facts, assumptions, and residual risk.
5. Keep user-facing output concise and in the user's language.

## Evidence To Produce
- Status summary.
- Approval boundary.
- Next safe action.
- Open questions or blockers.

## Authority Boundary
This skill supports operator decisions. It must not make decisions for the operator, infer approval, or replace Planner, Reviewer, Tester, PM, or user authority.
