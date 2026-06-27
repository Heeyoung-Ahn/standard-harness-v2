# Requesting Code Review

Use this skill after completing a meaningful task, before closing a packet, or before accepting risky changes.

## Use When
- A completed change touches shared behavior, prompt/control surfaces, tests, security, generated-state boundaries, or user-facing workflows.
- A packet requires independent review evidence.
- The implementer is stuck and needs a fresh bounded review question.

## Do Not Use When
- No concrete artifact or diff exists to review.
- The review would replace Tester, Reviewer, Planner, or user approval authority.
- The request would spawn subagents without explicit user request or packet authorization traceable to user approval.

## Workflow
1. Define the review scope and exclude unrelated work.
2. Provide the reviewer with the packet, acceptance criteria, changed files, and verification evidence.
3. Ask for findings ordered by severity with file or source references.
4. Treat critical and important findings as work to resolve or technically rebut before proceeding.
5. Record reviewer limitations and residual risks.

## Evidence To Produce
- Review request scope.
- Reviewer findings or zero-finding statement.
- Implementer disposition for each finding.
- Follow-up verification if changes are made.

## Authority Boundary
This skill requests review only. It must not claim independent review when only a mock or self-review occurred, and it must not approve implementation, close packets, or override Reviewer/Planner/user judgment.
