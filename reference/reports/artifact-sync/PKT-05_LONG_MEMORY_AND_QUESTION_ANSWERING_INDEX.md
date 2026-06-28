# Artifact Sync Report: PKT-05 Long Memory And Question Answering Index

## Scope
Planner opened PKT-05 from the approved Requirements and Implementation Plan Wave 5.
This report records artifact impact for the explicitly approved Ready For Code route.

## Feature To Artifact Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Long-memory source index | `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md` | opened | Planner |
| Packet/evidence/closeout/wiki/PM/decision/active-context source index | starter memory/context/wiki modules and tests | planned | Developer, Tester |
| REQ-042 memory categories: intent, architecture decisions, conventions, packet history, frictions, risks, deprecated context | packet acceptance, source-index schema, memory tests, no-source diagnostics | planned | Developer, Tester |
| Authority-labeled question-answering result | starter service/CLI contract and tests | planned | Developer, Tester |
| Query index read-model authority and minimum result shape | packet modeling impact, starter service/CLI contract, source-ref tests | planned | Developer, Tester, Reviewer |
| Sensitive evidence exclusion | security policy/validator tests | planned | Developer, Tester, Reviewer |
| `_ops` reset command and evidence-retention open gate | PKT-05 decision gate; future reset/retention follow-up remains deferred unless separately approved | closed for PKT-05 | Planner |
| Context/token budget checks | context pack and validation tests | planned | Developer, Tester |
| Human-facing command docs | starter docs only if commands change | conditional | Developer, Reviewer |

## Decision Gate Disposition
| Open Question | Disposition | Artifact Impact |
| --- | --- | --- |
| Mandatory starter long-memory pages vs on-demand memory | Closed for PKT-05 with on-demand memory creation rules plus required source-index schema/metadata. | No mandatory starter seed wiki pages are required for v2.0; tests must cover no-source diagnostics. |
| Authoritative hot operating state store | Closed for PKT-05 by keeping structured operating state and canonical packet/evidence/wiki records authoritative; generated summaries and answers remain read models. | Answer/context behavior must cite underlying authority tiers and fail closed on stale or unsupported generated summaries. |
| Exact `_ops/` reset command and evidence-retention policy | Closed for PKT-05 as N/A/deferred for reset command implementation; memory/query indexing must not weaken evidence-retention policy. | Source/query index may reference resettable operating records only as read models and must preserve redaction/sensitivity and retention boundaries. |
| Authoritative query index for Human Owner answers | Closed for PKT-05 by defining the query index as a bounded read model, not canonical truth. | Implementation must expose minimum source-ref/result metadata and fail closed when canonical sources cannot support a claim. |

## Drift Findings
- Requirements and Implementation Plan both identify Wave 5 / PKT-05 as the next concrete packet after PM daily rhythm and closeout foundations.
- Runtime assignment `DEV-01` is a generic placeholder and does not supersede the Implementation Plan packet roadmap.
- No implementation is approved by this report.

## Generated Context Status
Generated docs and Active Context are read models. Regenerate them through harness runtime
after packet registration or route mutation; do not manually edit generated summaries.

## Approval Boundary
Human Owner approved Ready For Code for PKT-05. This report does not approve release,
publish, starter promotion, provider orchestration, skill routing, compound feedback work,
`_ops` reset command implementation, or retention-policy redefinition.

## Next First Action
Orchestrator should route PKT-05 through Developer, Tester, Reviewer, bounded remediation
if needed, and Planner closeout.
