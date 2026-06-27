# PLN-00 Deep Interview

## Purpose
Close implementation-critical discovery before requirements freeze.

## Status
- Closed for requirements freeze from user direction and legacy v2 reference documents.
- Human Owner confirmed the requirements baseline on 2026-06-28.
- Not an implementation approval.

## Interview Checklist
| Area | Question | Answer | Status |
|---|---|---|---|
| Goal | What decision or workflow must the product improve? | The product must let a copied starter repo run long LLM-assisted projects with clear packet, evidence, review, memory, and improvement loops while keeping the harness system clean. | approved |
| Users | Who uses it and who approves it? | Human Owner approves scope/freeze; Planner owns requirements; Developer/Tester/Reviewer/Documenter/Wiki Applier execute bounded roles; LLM providers are routed adapters, not the product owner. | approved |
| Scope | What is in scope for MVP? | Clean starter payload contract, `_harness/_ops/product` folder boundary, packet/evidence/gate lifecycle, provider-neutral routing contract, documenter/wiki-proposal loop, friction/compound feedback hooks, starter contamination validation. | approved |
| Data / integration | What systems, files, APIs, or manual inputs are authoritative? | Current user decisions, root `AGENTS.md`, `.agents/artifacts/*`, root harness runtime state, and selected legacy v2 docs under `reference/legacy/current-root-v2-docs/`. External LLM outputs are evidence only. | approved |
| Operations | Where will it run and who maintains it? | Root harness operates this development repository. `starter/standard-harness/` is the reusable payload target copied into future repositories. Root maintainer/Codex work must not leak root-only state into starter. | approved |
| Risk | What can fail, leak, corrupt, or mislead users? | Starter contamination, provider lock-in, product evidence leaking into `_harness/`, generated summaries being treated as authority, missing packet closeout, stale wiki/memory, overconfident AI claims, token/context bloat. | approved |
| Approval | What exact approval opens the first implementation packet? | Requirements freeze is approved. The first implementation packet can be prepared, but implementation still requires the packet to be approved with explicit `Ready For Code`. | approved |

## Stable Answers
- The repository target is `starter/standard-harness/`, not the root harness itself.
- The root harness is the operating system used to develop and verify the payload.
- The starter payload must stay clean, copyable, and free from development history.
- Standard Harness v2 is provider-neutral and must sit above LLM runtimes as a routing/operating layer.
- Codex-specific root files may guide this development repo, but they must not become starter product contracts.
- Legacy v2 documents are reference material for requirements and architecture, not files to bulk-copy into starter.

## Initial Product Problem Statement
LLMs can generate code faster than humans can manually track. Standard Harness v2 must
make that speed governable by requiring explicit packet scope, test/evidence records,
review gates, documenter closeout, long-memory proposals, friction reporting, and clean
starter promotion boundaries.

## First Packet Candidates
| Candidate | Why It Is First-Class | Risk |
|---|---|---|
| Project Operating Folder Contract | Directly matches Human Owner direction and protects `_harness/_ops/product` semantics before further work. | If incomplete, later packets may place files in the wrong zone. |
| Starter Inventory And Boundary Validator | Proves current payload cleanliness before changing it. | May reveal current payload structure gaps that require follow-up packets. |
| Provider-Neutral Routing Contract | Prevents Codex-only or provider-specific assumptions from becoming product identity. | Needs careful wording to allow examples without provider lock-in. |

Selected first packet candidate: Project Operating Folder Contract, with a starter inventory preflight. It still requires explicit `Ready For Code` before implementation.

## Output Rule
Promote only stable answers into `.agents/artifacts/REQUIREMENTS.md`. Keep uncertainty visible as open questions or deferred items.
