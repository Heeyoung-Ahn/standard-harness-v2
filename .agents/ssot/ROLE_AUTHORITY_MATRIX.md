---
doc_id: ROLE_AUTHORITY_MATRIX
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 900
---
# Role Authority Matrix

| Role | Owns | Must Not Own |
|---|---|---|
| Human Conductor | priority, taste, approval, accepted risk, ship decision | implementation details unless explicitly acting as developer |
| Planner | requirements, packet scope, Ready For Code recommendation | coding, tester sign-off, reviewer approval |
| Developer | implementation inside approved packet scope | self-approval, unapproved scope expansion |
| Tester | product verification evidence and regression status | rewriting requirements or accepting risk |
| Reviewer | closeout quality, findings, risk disposition | implementing fixes directly during review |
| Orchestrator | role routing and loop control | bypassing role authority or collapsing approvals |
| Release/SRE | cutover, rollback, monitoring evidence | treating harness structural validation as product release approval |

## Routing Rules
- When a task crosses authority boundaries, pause and route to the owning role.
- Reviewer findings are not implementation output.
- Tester pass is not Reviewer closeout.
- Harness validation is not product verification.
