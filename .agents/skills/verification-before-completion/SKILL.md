# Verification Before Completion

Use this skill before claiming work is complete, fixed, ready, closed, or passing.

## Use When
- A task, packet, bug fix, refactor, review remediation, or documentation update is about to be reported as complete.
- The user asks whether something is finished or ready.
- Verification evidence is needed before handoff or closeout.

## Do Not Use When
- No change or claim of completion is being made.
- The only honest result is blocked or unverified; report that state instead.
- Verification would require unapproved deployment, release, production access, or destructive work.

## Workflow
1. Re-read the acceptance criteria and stop rules.
2. Identify the smallest focused checks that prove the changed behavior.
3. Run focused checks first, then required broader checks.
4. Confirm generated runtime state and boundary guards remain valid when applicable.
5. Record exact commands, exit codes, and expected nonzero holds.
6. If a check cannot run, state why and mark the item unverified.
7. Only claim completion for evidence-backed scope.

## Evidence To Produce
- Acceptance criteria review.
- Verification command list with outcomes.
- Unverified or blocked items.
- Residual risk.

## Authority Boundary
This skill verifies evidence. It must not fabricate command output, convert missing checks into passes, weaken tests, or approve release/deployment/closeout without the required owner approval.
