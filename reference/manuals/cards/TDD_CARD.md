---
doc_id: TDD_CARD
audience: agent-and-human
authority: reference
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 700
---
# Tdd Card

Use this card only when selected by `DOC_ROUTE.json` or a human request.

## Minimal Procedure
1. Confirm the active lane.
2. Read the selected SSOT, not the human full manual.
3. Use digest evidence first.
4. Escalate to strict/release when risk or changed files require it.

## Do Not
- Do not auto-read `reference/manuals/human/**`.
- Do not paste raw logs into packet bodies.
- Do not treat harness validation as product verification.
