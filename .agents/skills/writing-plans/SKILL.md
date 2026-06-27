# Writing Plans

Use this skill when requirements are known enough to sequence work, but implementation should not start until scope, acceptance, and verification are explicit.

## Use When
- A packet, feature, remediation, refactor, or investigation needs task-level sequencing.
- The user asks for a plan, packet plan, implementation plan, or remaining-work plan.
- Existing requirements need conversion into bounded tasks and verification checks.
- A non-trivial change needs approval boundaries before code or state changes.

## Do Not Use When
- The user asks a simple factual question or a read-only status check.
- Requirements are too ambiguous to plan safely; use requirements or architecture guidance first.
- The request would approve implementation, close a packet, mutate approval state, deploy, publish, or bypass review.
- The plan would become a replacement for the active packet or approved source artifact.

## Workflow
1. Identify the authoritative source: user instruction, active packet, requirements, architecture, review finding, or test evidence.
2. State included scope and excluded scope.
3. Split work into small tasks with a clear owner or workflow route when applicable.
4. Add acceptance criteria for each task.
5. Add verification commands or manual checks for each task.
6. Name risk mode: simple, standard, guarded, or regulated.
7. Ask for explicit approval before implementation unless the user has already approved implementation.

## Evidence To Produce
- Task list with acceptance checks.
- Verification plan.
- Approval boundary and stop rules.
- Open questions or assumptions.

## Authority Boundary
This skill may draft and revise plans. It must not approve implementation, mark Ready For Code, close packets, mutate generated state manually, or override Planner/user approval.
