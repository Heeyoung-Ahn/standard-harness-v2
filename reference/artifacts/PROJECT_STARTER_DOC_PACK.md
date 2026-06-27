# Project Starter Doc Pack

## Purpose
Use this document as the kickoff intake checklist before PLN-00 and PLN-01 are closed.

This project is not an ordinary product application. The product being developed in this
repository is the clean Standard Harness v2 starter payload under
`starter/standard-harness/`. The root harness is the development operating system used
to build that payload.

## Source Basis
| Source | Use | Status |
|---|---|---|
| `reference/legacy/current-root-v2-docs/docs/requirements/standard-harness-integrated-requirements-v0.2.md` | V2 philosophy, HR requirements, boundaries, operating model | adopted as planning reference |
| `reference/legacy/current-root-v2-docs/docs/requirements/standard-harness-v2-1-integrated-work-plan.md` | V2.1 XP sequence, architecture target, release boundary, guardrails | adopted as planning reference |
| User direction in current thread | Clean starter payload boundary and provider-neutral direction | adopted as controlling instruction |
| `starter/standard-harness/` current contents | Current payload candidate to improve, validate, and promote | inspect before packet work |

## Product Baseline
| Field | Value | Status |
|---|---|---|
| Project name | Standard Harness v2 Starter Payload | drafted |
| Primary users | Human owner, planner, developer/tester/reviewer/documenter roles, and provider-neutral LLM execution adapters | drafted |
| Main goal | Build `starter/standard-harness/` into a clean, copyable, provider-neutral operating harness payload for long-running LLM-assisted product development | drafted |
| MVP scope | Establish the payload folder contract, operating workflow, packet/evidence/gate lifecycle, long-memory/documenter flow, starter boundary validation, and promotion path | drafted |
| Out of scope | Copying v1 artifacts wholesale, making Codex the product identity, storing development history in starter, or allowing product packets to mutate harness system files | drafted |
| Operating environment | Root repo harness: `.agents/`, `.harness/`, `reference/`; product payload target: `starter/standard-harness/` | drafted |
| Data / integration sources | Legacy v2 planning archive, current root harness runtime, package scripts, starter payload files, explicit user decisions | drafted |
| Security / permission baseline | No secrets or generated state in starter; sensitive evidence is redacted/classified; provider-specific entry contracts are root-only unless user later approves product-level adapter contracts | drafted |
| Approval owner | Human Owner | drafted |

## Non-Negotiable Product Boundaries
- `starter/standard-harness/` is the product target and clean starter payload.
- Starter must be copyable into a new repository without root development history, local runtime state, evidence, wiki state, packet closeout history, or provider-specific entry contracts.
- Do not create `starter/standard-harness/AGENTS.md`.
- Standard Harness v2 must sit above LLM runtimes as a provider-neutral routing harness. Codex, Claude Code, Antigravity, or any other runtime can be an adapter target, not the product identity.
- The root `AGENTS.md` is a development-repo Codex instruction only. It is not a starter product contract.
- Product work for the payload must be planned and verified from root harness operating artifacts, then promoted or directly edited only through an approved packet boundary.

## V2 Philosophy To Preserve
| Principle | Planning Meaning For This Repo |
|---|---|
| Development operating system | The harness coordinates people, LLMs, tools, packets, evidence, and decisions rather than acting as a prompt bundle. |
| Evidence over assertion | LLM output is reviewable evidence, not final truth. Tests, validators, decisions, and closeout records carry authority. |
| Packet-before-code | Implementation changes require a packet with scope, acceptance, gates, evidence, and closeout expectations. |
| Clean separation | Harness system, operating records, and product artifacts must have clear folder and authority boundaries. |
| Provider-neutral orchestration | Role routing and handoff policies must not be coupled to one LLM vendor or one entry filename. |
| Long memory through governance | Wiki and long-term memory are evidence-backed projections, not free-form generated summaries. |
| Friction feedback | Repeated misunderstanding, manual rework, missing evidence, token overuse, and boundary errors become improvement candidates. |
| Human approval boundary | Human decisions matter but cannot override non-overridable safety, boundary, or evidence gates. |

## Starter Payload Contract Target
The starter payload should continue to converge on this top-level contract:

```text
starter/standard-harness/
  _harness/   reusable harness system, policies, schemas, validators, runtime entry points
  _ops/       project operating records generated after the starter is copied and initialized
  product/    product code and human-facing product/project documents for the copied project
```

Within that contract:
- `_harness/` is reusable system material and should not accumulate copied-project operating history.
- `_ops/` is operating state/evidence/memory for the copied project and should be resettable or generated on initialization.
- `product/` is the copied project's product zone; human-facing documents belong under `product/docs/`.

## Initial Workstream Recommendation
| Order | Workstream | Goal | Entry Condition | Exit Evidence |
|---|---|---|---|---|
| 1 | Payload boundary baseline | Prove the current starter contains only clean reusable payload files | PLN-01 approved | payload boundary report and starter inventory |
| 2 | Folder contract hardening | Define `_harness/_ops/product` semantics, reset rules, and human-doc locations | payload inventory complete | folder contract docs/tests |
| 3 | Provider-neutral routing baseline | Replace provider identity assumptions with adapter/routing contracts | folder contract stable | role routing policy and examples |
| 4 | Packet/evidence/documenter loop | Ensure packet closeout produces evidence, wiki proposal, and improvement candidates | packet kernel stable | closeout/documenter/wiki proposal validation |
| 5 | Starter promotion/readiness | Export/verify clean starter candidate without root-only state | preceding gates pass | promote-starter dry run and contamination scan |

## Open Questions
- Should root harness work modify `starter/standard-harness/` directly in packet scope, or should all reusable changes flow through `harness:promote-starter` from root source material?
- Which LLM runtime adapters must be first-class examples in v2.2: Codex-only examples are disallowed as product identity, but example adapters may still be useful.
- What exact reset command should clean `_ops/` in a copied project without touching `_harness/` or `product/`?

## Deferred Items
- First implementation packet selection is resolved as PKT-01 Project Operating Folder Contract; implementation still requires explicit `Ready For Code`.
- Full multi-provider automatic control is not required for the first packet.
- Full compound-engineering automation can follow after base telemetry and improvement-candidate schemas exist.
- v1 zip behavior remains reference-only unless the Human Owner approves a traceable promotion plan.

## Handoff To Requirements
- Promote stable answers into `.agents/artifacts/REQUIREMENTS.md`.
- Keep unresolved items in `## Open Questions` or `## Deferred Items`.
- Do not open implementation packets until requirements freeze is approved.
