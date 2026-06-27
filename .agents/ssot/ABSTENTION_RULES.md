---
doc_id: ABSTENTION_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 700
---
# V2.4 Abstention and Reproduction Rules

Purpose: prevent AI action bias. A code change is not a success condition unless the issue is reproduced, scoped, and approved for implementation.

## Required rule

Before behavior-bearing code changes, record a Reproduction Gate decision:

- Issue status: `confirmed`, `partial`, `stale`, `not-reproducible`, `unclear`, `already-fixed`, or `no-op`.
- Code change required: `yes`, `no`, `unknown`, or `not-needed`.
- Repro command, observed result, expected result, and scope must be captured in digest form.

## Allowed paths

| Reproduction result | Allowed next action |
|---|---|
| `confirmed` + code change required | Implement inside packet scope. |
| `partial` + named scope | Implement only the confirmed slice; defer the rest. |
| `stale`, `not-reproducible`, `already-fixed`, or `no-op` | Close or abstain with evidence digest; do not change code. |
| `unclear` | Investigation only; no implementation. |

## Stop condition

If the issue is not confirmed and the agent is about to edit code, stop and run `npm run harness:repro-check` or `npm run harness:abstain`.
