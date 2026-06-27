---
doc_id: CONTEXT_BUDGET_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 900
---
# Context Budget Rules

## Default Budget
- Day start brief: 800-1200 tokens.
- Micro/docs-only: <=800 tokens.
- Light: <=1500 tokens.
- Standard: <=3000 tokens.
- Strict/release: <=6000 tokens unless human approves more.

## Read Limits
- Default read set should be <=3 documents.
- Do not auto-read human full manuals.
- Do not auto-read all workflow files.
- Do not auto-read all profile files.
- Read raw logs only when digest status is fail/unknown/mismatch or user requests details.

## Compression
- Use `ACTIVE_CONTEXT.brief.md` by default.
- Use `ACTIVE_CONTEXT.standard.md` only when route-selected.
- Use `ACTIVE_CONTEXT.full.md` only for blocker resolution or explicit human request.
