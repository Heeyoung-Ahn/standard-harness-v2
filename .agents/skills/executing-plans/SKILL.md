# Executing Plans

Use this skill when an approved work packet or explicitly approved implementation plan exists and the next action is execution.

## Use When
- The user explicitly approves a work packet and asks to implement it.
- An approved packet names tasks, acceptance criteria, and verification checks.
- The work needs task-by-task execution with evidence capture.

## Do Not Use When
- The packet or plan is not approved for implementation.
- The requested work changes scope beyond the approved packet.
- Route validation, security review, or approval boundaries are unclear.
- The work requires release, deployment, package export, destructive commands, or approval-state mutation outside the approved packet.

## Workflow
1. Restate the active packet or approved plan boundary.
2. Run the required route and readiness checks for the current harness.
3. Execute one task at a time.
4. Keep changes inside the approved file and behavior surface.
5. Use the matching guard or security skill before risky commands or prompt/control changes.
6. Run focused verification before broader verification.
7. Record changed files, test evidence, residual risk, and closeout recommendation.

## Evidence To Produce
- Active packet ID and approval source.
- Changed files and rationale.
- Verification commands and outcomes.
- Residual risks and follow-up recommendations.

## Authority Boundary
This skill executes only inside an approved boundary. It must not expand scope, infer approval, run blocked destructive commands, deploy, publish, or claim completion without verification evidence.
