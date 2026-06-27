---
doc_id: EVIDENCE_GATE_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 1500
---
# Evidence Gate Rules

## Default Evidence Policy
- Use evidence digest first.
- Evidence records cite path, command, exit code, timestamp, and hash when available.
- Long outputs stay in `reference/reports/**`.

## TDD
- Required for behavior-bearing standard/strict work.
- RED must fail for the expected reason.
- GREEN must pass after implementation.
- Refactor requires GREEN re-verification.

## Security / CSO
- Required for high/critical risk, auth, permission, secret, credential, dependency, CI/CD, webhook, approval workflow, and release/cutover security surfaces.
- Findings require file, line, redacted quote, confidence, impact, recommendation, and disposition.

## Parallel Work
- Default is serial.
- Parallel requires declared file map, conflict policy, worktree/shared isolation decision, merge evidence, and post-merge tests.

## Compound Learning
- Learning is brief by default.
- Strict/release closeout must capture reusable learning or a concrete not-needed reason.
