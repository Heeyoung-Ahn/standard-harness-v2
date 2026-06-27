---
doc_id: ROUTING_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 900
---
# Routing Rules

## Default Route
1. Read `ACTIVE_CONTEXT.brief.md`.
2. Read `DOC_ROUTE.json`.
3. Read only the SSOT files listed in `DOC_ROUTE.json.read`.
4. Execute the current lane and phase.

## Manual Routing
- Human manuals are not route inputs unless the user asks for explanation, training, or onboarding.
- For work execution, route to cards, lane rules, schema, and evidence digest first.
- For blockers, read the narrow fallback document listed in `DOC_ROUTE.json.fallback`.

## Escalation
- Missing Ready For Code evidence: route to Planner.
- Test or product verification failure: route to Developer, then Tester rerun.
- Security finding: route to CSO/security reviewer.
- Approval or audit uncertainty: route to Governance reviewer.
- Release risk: route to Release/SRE.
