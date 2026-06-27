---
doc_id: AI_OPERATING_CONTRACT
audience: agent
authority: ssot
language: en
llm_read_policy: default
default_context: true
token_budget: 1200
---
# AI Operating Contract

## Read Policy
- Default read set is limited to `ACTIVE_CONTEXT.brief.md`, `DOC_ROUTE.json`, and the SSOT files selected by the route.
- Do not auto-read human manuals, full manuals, tutorials, or development basics.
- Do not auto-read raw logs, full security reports, full review reports, or archived material unless a digest reports `fail`, `unknown`, or `mismatch`.
- If a user explicitly asks for a human manual, read only the requested section or a routed summary first.

## Execution Rule
- Human conductor owns priority, taste, ship/hold/revise, accepted risk, and approval boundaries.
- Do not implement before Ready For Code unless the active lane is `micro` or `docs-only` and the lane rules permit it.
- Use the active lane to determine required gates.
- Escalate the lane when changed files, risk, profile, or evidence indicates a stricter path.

## Evidence Rule
- Evidence digest is the default evidence surface.
- Store long logs under `reference/reports/**`; cite path, command, exit code, and hash in packets.
- Completion claims require fresh verification unless the lane explicitly allows a documented exemption.

## Friction Rule
- Prefer lean routing, compact packet templates, and brief context by default.
- Strict gates are mandatory only when risk, profile, or changed files require them.
- Record repeated manual work as automation candidates instead of expanding every packet body.
