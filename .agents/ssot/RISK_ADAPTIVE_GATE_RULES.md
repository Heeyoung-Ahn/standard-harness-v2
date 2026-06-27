---
doc_id: RISK_ADAPTIVE_GATE_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 700
---
# V2.5 Risk-Adaptive Gate Rules

- Risk-adaptive checks are not optional side commands once a packet reaches implementation transition or closeout.
- `packet-preflight` enforces required overlay evidence at stage boundaries.
- `transition` blocks Planner-to-Developer and Planner-to-Orchestrator delivery when required overlay evidence is missing.
- `validation-report` surfaces the active packet's risk-adaptive gate stage, diagnostics, and required evidence.
- Use digest evidence first. Do not paste raw logs into packets unless a digest fails, is unknown, or a human explicitly asks.
- Do not code when the Reproduction Gate says investigate, abstain, close-no-op, or code-change need is unknown.
- Dependency-sensitive work requires dependency intake evidence before implementation delivery.
- Secret-sensitive work requires a secret scan decision before implementation delivery.
- Untrusted-content work requires content strip/digest evidence before implementation delivery.
- Guard-mode work requires a valid edit boundary and no destructive command before implementation delivery.
- Browser, evidence-quality, and release-canary overlays must be closed before closeout.
