---
doc_id: CONTEXT_ECONOMY_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 700
---
# V2.4 Context Economy Rules

Purpose: reduce token cost and harness friction while preserving evidence quality.

## Default read order

1. `.agents/runtime/ACTIVE_CONTEXT.brief.md`
2. `.agents/runtime/DOC_ROUTE.json`
3. Route-selected SSOT files only
4. Evidence digest
5. Raw logs only on fail, unknown, mismatch, or explicit human request

## Budgets

| Lane | Target tokens | Max routed documents |
|---|---:|---:|
| micro | 1200 | 3 |
| docs-only | 1200 | 3 |
| light | 1500 | 3 |
| standard | 2200 | 3 |
| strict | 4000 | 4 |
| release | 5000 | 4 |
| investigation | 3000 | 3 |

## Rules

- Do not auto-read human manuals or full raw logs.
- Use cached digest if the same source was already read and has not changed.
- Add risk overlays instead of upgrading every task to strict.
- Ask the human only for information not present in active context, packet, route-selected evidence, or the last approved decision.
