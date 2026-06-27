---
doc_id: PACKET_LANE_RULES
audience: agent
authority: ssot
language: en
llm_read_policy: route_selected
default_context: false
token_budget: 1200
---
# Packet Lane Rules

| Lane | Use When | Required Minimum |
|---|---|---|
| micro | typo, wording, tiny docs, <=2 low-risk files | micro note, verification line |
| docs-only | documentation-only work with no runtime behavior change | docs verification, no TDD unless examples execute code |
| light | low-risk single-area change | compact packet, command evidence |
| standard | normal feature or bug fix | packet, TDD when behavior changes, tester evidence |
| strict | auth, approval, data correctness, DB, security, core runtime, high/critical risk | full packet, TDD evidence, specialist review, CSO when triggered |
| release | deploy, migration, rollback, monitoring, cutover | release packet, rollback, monitoring, SRE review |
| investigation | forensic analysis, root cause, incident exploration | investigation packet, evidence log, no implementation unless re-routed |

## Escalation Floor
- `high` or `critical` risk => strict unless release-specific.
- PRF-06 approval workflow => strict.
- PRF-02 authoritative source or PRF-10 BI with data logic => strict or standard with data reviewer.
- Any secret, auth, CI/CD, dependency, or webhook change => strict with CSO review.
- Release or rollback files => release.
