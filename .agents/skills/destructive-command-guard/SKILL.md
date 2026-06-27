# Destructive Command Guard

Use this skill before commands or actions that can delete data, rewrite history, move broad file sets, modify production, expose secrets, or irreversibly change state.

## Use When
- A command includes delete, remove, clean, reset, checkout, move, rewrite, prune, migrate, publish, deploy, or credential-affecting behavior.
- A test or cleanup step may remove generated state.
- A packet explicitly calls for guard review before a risky command.

## Do Not Use When
- The action is read-only or a narrow non-destructive write already covered by the approved packet.
- The user has not approved the underlying destructive action.
- The command scope cannot be made exact and reversible.

## Guard Procedure
1. State the exact command or action.
2. Identify target paths, data, state, and rollback options.
3. Confirm the target is inside the intended workspace or explicitly approved location.
4. Prefer non-destructive alternatives and exact-path cleanup.
5. Refuse commands that are broad, recursive, wildcard-based, production-affecting, secret-exposing, or approval-ambiguous unless the user gives explicit narrow approval after risk disclosure.
6. Record the decision: allow, revise, or block.

## Evidence To Produce
- Command reviewed.
- Target scope.
- Risk and rollback note.
- Guard decision and required approval evidence.

## Authority Boundary
This skill is a guard only. It does not authorize destructive commands by itself. A block decision must not be run, and broad recursive deletion requires separate exact-scope approval and rollback evidence.
