# PKT-08 Feature Artifact Sync

Packet: `PKT-08_RISK_ADAPTIVE_FAST_PATH_AND_EVIDENCE_VALIDATION`
Status: planning artifact-sync report for pre-Ready-For-Code packet review

## Drift Findings
- Requirements already express the accepted risk-adaptive closeout direction.
- Implementation Plan has been updated to make PKT-08 the next packet and defer Skill Routing to PKT-09 and Compound Feedback / Starter Promotion to PKT-10.
- Root operating, reviewer, and architecture contracts still contain four-lens-for-every-packet language; this is intentional pending PKT-08 Ready For Code and implementation, and `ARCHITECTURE_GUIDE.md` is now an explicit update-required artifact for this packet.
- Starter gate/review/evidence validator surfaces still need implementation after Ready For Code.
- Generated runtime summaries may be stale and must be regenerated only through harness commands if operating state changes.

## Artifact Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Human accepted risk-adaptive closeout model | `.agents/artifacts/REQUIREMENTS.md` | updated before this packet | Planner |
| PKT-08 replaces previous Skill Routing order | `.agents/artifacts/IMPLEMENTATION_PLAN.md` | updated in planning | Planner |
| Independent `packet_doc_review` remains mandatory | `.agents/rules/HARNESS_OPERATING_CONTRACT.md`, `.agents/workflows/planner.md`, packet preflight | planned implementation; do not change before RFC | Developer after Human RFC |
| Closeout review lenses become gate-profile selected | `.agents/rules/HARNESS_OPERATING_CONTRACT.md`, `.agents/workflows/reviewer.md`, gate/review policy and tests | planned implementation | Developer/Reviewer after Human RFC |
| Architecture review-flow description changes from fixed four-lens closeout to risk-adaptive closeout | `.agents/artifacts/ARCHITECTURE_GUIDE.md` | planned implementation; explicitly required by packet | Developer/Reviewer after Human RFC |
| Docs-only/low-risk fast path stays lightweight | starter gate profile policy, packet/closeout validators, tests | planned implementation | Developer/Tester after Human RFC |
| Behavior evidence is not file existence | evidence validator, evidence index contract, tests | planned implementation | Developer/Tester after Human RFC |
| Unsafe fast-path downgrade is rejected | gate policy, changed-file/risk diagnostics, negative fixtures | planned implementation | Developer/Tester after Human RFC |
| PKT-08 self-closeout uses high/core strict path | packet closeout evidence and reviewer report | required at implementation closeout | Reviewer/Planner closeout |

## Generated Context Status
`ACTIVE_CONTEXT` is a generated re-entry summary. It may lag the updated planning artifacts
until `npm run harness:sync-state` is run through the harness. It is not write authority.

## Approval Boundary
This report does not approve Ready For Code. PKT-08 remains a Planner packet until the
Human Owner explicitly approves Ready For Code after independent packet-document review.

## Do Not Cross
- Do not implement root operating/reviewer contract changes before Human Ready For Code.
- Do not mark Skill Routing as part of PKT-08 implementation scope.
- Do not treat file creation as behavior evidence during PKT-08 implementation.
- Do not close PKT-08 itself through the low-risk/docs-only fast path.

## Next First Action
Complete independent Planner challenge review and independent `packet_doc_review`, then revise
the packet document before requesting Human Ready For Code.
