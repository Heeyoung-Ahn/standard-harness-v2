---
doc_id: GUARD_MODE_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 700
---
# V2.4 Guard Mode Rules

Purpose: protect the workspace from destructive commands and scope creep.

## Modes

- `careful`: warn/block destructive shell commands.
- `freeze`: require an explicit edit boundary.
- `guard`: careful + freeze.

## Destructive command examples

- Recursive deletion, force push, hard reset, clean all, table drop/truncate.
- Kubernetes delete, Terraform destroy, Docker system prune.
- Broad permission changes or privilege escalation.

## Stop condition

If a destructive command is detected or an edit would leave the declared boundary, stop and require human/planner approval. Use `npm run harness:guard` or `npm run harness:freeze`.
