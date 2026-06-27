# Implementation Plan

> AUTHORITATIVE after planning approval. This plan sequences implementation for the
> clean Standard Harness v2 starter payload under `starter/standard-harness/`.

## Status
- Requirements baseline is confirmed by the Human Owner on 2026-06-28.
- This plan is the implementation direction derived from the confirmed requirements and
  the current v2.0 gap analysis.
- Not Ready For Code by itself. Each implementation wave still requires an approved
  packet with explicit `Ready For Code`.

## Product Target
The implementation target is the clean starter payload:

```text
starter/standard-harness/
```

The root harness is only the development operating system for building that payload.
Root development state, generated runtime state, root evidence, root packet history,
Codex-only entry contracts, and legacy reference history must not be copied into the
starter payload.

## Implementation Thesis
Do not rewrite Standard Harness v2 from scratch.

The current v2.0 starter already has the right kernel shape:
- clean `_harness/`, `_ops/`, and `product/` zones,
- Python-based starter CLI,
- SQLite event store,
- packet, requirement, artifact, evidence, claim, gate, closeout, projection, adapter,
  PMO, memory, friction, and improvement tables,
- starter contamination checks,
- gate profile policies,
- review governance policies,
- wiki proposal validation.

The main gap is not the kernel. The main gap is the product operating layer: the harness
does not yet provide a complete, ergonomic, evidence-backed loop for planning intent,
risk-adaptive execution, LLM testing/review, documenter closeout, PM daily continuity,
long memory, and Human Owner question answering.

Therefore, the implementation direction is:
- preserve the current v2.0 event-store kernel and clean starter boundary,
- strengthen risk-adaptive gate enforcement,
- build human report and evidence-index surfaces,
- connect PM, Documenter, Wiki, and long-memory loops,
- add provider-neutral orchestration gradually,
- use v1.0 only as a reference source for proven patterns, not as a file-copy source.

## Plan Completion Standard
This is a long-horizon implementation plan, not a short-term sprint checklist.

The plan is complete only when every confirmed requirement in
`.agents/artifacts/REQUIREMENTS.md` has:
- an implemented v2-native policy, schema, service, validator, CLI command, or documented
  product contract as appropriate,
- passing positive and negative verification evidence,
- clean starter validation evidence,
- no known contradiction with provider-neutral product identity,
- no contamination of the starter payload with root development state, provider-specific
  entry contracts, generated state, packet history, evidence history, secrets, or caches.

Partial completion of early waves must not be described as completion of Standard Harness
v2.0. Early waves produce usable foundations; the full requirements target is reached only
when the coverage matrix below is closed.

## Current Plan Summary
- Build the clean Standard Harness v2 starter payload through packetized waves.
- Preserve generated-doc immutability, packet-before-code, Active Context derived authority, clean starter boundaries, and provider-neutral product identity.
- Use this implementation plan as the long-range sequencing map; individual packets own
  implementation approval.

## Optional Profile Activation
- none

## Current Iteration
- PKT-01 Project Operating Folder Contract is the active first implementation packet.

## Dependency Order And Blocking Conditions
- Requirements freeze precedes architecture sync, implementation-plan sync, and packet
  implementation.
- PKT-01 folder contract precedes gate engine, documenter closeout, PM rhythm, long
  memory, provider orchestration, skill routing, and compound feedback work.
- No wave may claim completion without tests, starter validation, review evidence, and
  planner closeout for its packet scope.

## Root / Standard-Template Sync Requirements
- Root development records are not product payload.
- Reusable starter changes must be represented in `starter/standard-harness/` and verified
  as a clean copied starter.
- Root harness compatibility requirements must not override the starter's provider-neutral
  product identity.

## Starter Health Customization Boundary
Preserve this section and reusable starter-health guidance when customizing a copied
starter. Safe to customize: project-specific sequencing, optional profiles, implementation
milestones, technology choices, dependencies, verification commands, and open delivery
questions for the copied project.

Do not replace reusable starter-health guidance with product-only prose. Do not paste root
maintainer history, root evidence, generated state, packet logs, or project-specific
operating records into the starter implementation plan. If a product packet needs a
different implementation-plan boundary, record that as a packet decision before changing
these reusable guardrails.

## Gap Summary
| Area | Current v2.0 State | Gap Against Requirements | Direction |
|---|---|---|---|
| Clean starter payload | `starter/standard-harness/` has `_harness/`, `_ops/`, `product/` and passes starter validation when runtime caches are absent. | Good baseline, but copy/use smoke needs to remain part of every starter change. | Preserve and harden. |
| Folder contract | `_harness/policies/project-operating-folders.yaml` defines folders and contamination rules. | Needs stronger reset/init behavior and explicit report/document placement validation. | Harden as first implementation wave. |
| Packet kernel | `PacketService` supports packet type, risk level, gate profile version, approval, lifecycle, test plan, review plans, and closeout plan. | Packet creation CLI defaults are still thin; packet type/risk are not ergonomic enough for real operators. | Keep kernel, add packet authoring/preflight. |
| Gate profile model | `gate-profiles.yaml` defines packet-type profiles and N/A rules. | Risk level does not yet materially adjust gate strength in a complete runtime gate engine. | Add risk-adaptive gate resolver and validators. |
| Evidence and closeout | Evidence, claims, gate results, and closeout records exist. | Human closeout report contract is wrong location/shape; it must be max two pages in `product/docs/packets` with evidence index links. | Add Documenter report generator and evidence index. |
| PM rhythm | PMO projection table/service exists. | No complete one-page day-start/day-wrap-up report generator and no WBS TSV update loop. | Build PM daily report surface. |
| Long memory | Wiki proposal validator/applier and operational memory snapshots exist. | Wiki pages are not yet fully connected to closeout/report/evidence index flow. | Build Documenter -> Wiki proposal -> validated apply path. |
| Multi-LLM routing | Adapter manifest and workflow run records exist. | No practical provider-neutral orchestration workflow for assigning roles across Codex/GPT, Claude Code, and future providers. | Add manual-first routing contract, then adapter execution. |
| Skill routing | Skill catalog/router exists. | Current starter does not yet expose a complete skill auto-use workflow for copied projects. | Add catalog validation and handoff prompts after core packet loop. |
| Human question answering | Current context and operational memory projections exist. | No query-ready source index that reliably answers "what happened, why, evidence, risk, next". | Add compact status index after closeout and PM loop. |

## v1.0 Carry-Forward Policy
The v1.0 clean starter zip is a reference-only source. It must not be copied wholesale
into v2 because it contains `.agents/`, `.harness/`, `AGENTS.md`, Codex plugin surfaces,
and large reference/manual structures that conflict with the confirmed v2 product identity.

Allowed carry-forward:
- risk-adaptive gate behavior,
- packet preflight patterns,
- reviewer profiles and independent review concepts,
- browser evidence capture/audit concepts,
- day-start and day-wrap-up report behavior,
- context budget and active-context ideas,
- skill routing/catalog behavior,
- starter promotion and contamination audit behavior,
- operator manuals only after being reduced into v2-native contracts.

Forbidden carry-forward:
- provider-specific starter entry files such as `AGENTS.md`,
- root runtime state or generated state,
- v1 project history, packet history, evidence, reports, or local DB files,
- Codex-only product identity,
- large manual/reference dumps that recreate Markdown overload,
- direct copy of v1 `.agents` or `.harness` structures into v2 starter.

Every adopted v1 capability must be rebuilt as v2-native:

```text
policy/schema -> service -> validator -> CLI command -> tests -> starter validation
```

## Implementation Waves

### Wave 0: Planning Freeze And Baseline Sync
Goal: make confirmed requirements executable without starting implementation prematurely.

Scope:
- Treat `.agents/artifacts/REQUIREMENTS.md` as confirmed requirements baseline.
- Keep this implementation plan aligned to the confirmed requirements.
- Do not mark any implementation packet Ready For Code from this plan alone.

Acceptance:
- Requirements and implementation direction agree on clean starter target, provider-neutral
  identity, 3-zone folder structure, packet/gate/evidence/closeout loop, PM rhythm,
  long memory, and human report limits.
- Open decisions are carried as packet planning items, not hidden assumptions.

Verification:
- `npm.cmd run harness:validate`
- targeted read of `starter/standard-harness` boundary before opening PKT-01

### Wave 1: Project Operating Folder Contract
Goal: make the v2 starter folder model enforceable and understandable.

Scope:
- `_harness/` remains reusable harness system.
- `_ops/` remains resettable LLM/validator operating memory.
- `product/` remains product source, product tests, and human-facing documents.
- Human documents live under `product/docs/`.
- Folder names are contractual; file names are samples unless required by schema/validator.
- Starter must remain copyable and clean.

Implementation tasks:
- Update folder policy, schema, and validator coverage where needed.
- Add `_ops` reset/init contract without damaging `_harness` or `product`.
- Add placement validation for `product/docs/project`, `product/docs/packets`,
  and `product/docs/pmo`.
- Add starter smoke validation with bytecode/cache-safe execution guidance.

Acceptance:
- Fresh copied starter can run init and validate.
- Starter validation rejects `.agents`, `.harness` runtime state, `AGENTS.md`, caches,
  secrets, generated validation reports, and real packet/evidence history.
- Folder contract is enforced by validator, not only described in prose.

Verification:
- `python _harness/bin/harness_cli.py --json --harness-root . init`
- `PYTHONDONTWRITEBYTECODE=1 python _harness/bin/harness_cli.py --json --harness-root . validate --starter`
- root `npm.cmd run harness:validate`

### Wave 2: Risk-Adaptive Gate Profile Engine
Goal: make packet type and risk level drive real test/review strength.

Scope:
- Support `docs-only`, `product-feature`, `product-bugfix`, `product-refactor`,
  `security-data`, `harness-system`, and `starter-promotion`.
- Resolve required gates from packet type, risk level, changed zones, browser/UI claims,
  security/data sensitivity, harness-system changes, starter-promotion changes, and
  release sensitivity.
- Validate N/A decisions with substitute checks.
- Block closeout when selected gates are missing, stale, untrusted, or unresolved.

Implementation tasks:
- Add a gate resolver service that computes required gates.
- Add packet preflight diagnostics for missing gate declarations and invalid N/A.
- Add closeout diagnostics that compare required gates with passing gate results.
- Add risk level escalation: low, standard, high, critical/release-sensitive.
- Add tests for positive and negative cases across packet types.

Acceptance:
- Low-risk docs-only packets stay lightweight.
- Product-feature packets require test plan, evidence trust, test, E2E applicability,
  requirements review, security review, AI review, refactor review, and closeout where
  applicable.
- Security-data packets require security hard gate and human residual-risk decision when
  residual risk exists.
- Harness-system and starter-promotion packets require boundary/starter validation.
- N/A is rejected when changed files or claims contradict the N/A reason.

Verification:
- focused Python unit tests for gate resolver and validators
- starter CLI packet validation fixtures
- root `npm.cmd run harness:validate`

### Wave 3: Documenter Closeout And Evidence Index
Goal: turn packet completion into a compact human-readable report backed by structured evidence.

Scope:
- One closeout report per packet in `product/docs/packets/`.
- Report body is maximum two human-readable pages.
- Detailed proof lives in `_ops/evidence/**` and is linked through an evidence index.
- Documenter cannot directly mutate `_ops/wiki/**`.
- Wiki changes must go through validated proposals.

Implementation tasks:
- Replace or extend `CloseoutReportDocumenter` so human reports target
  `product/docs/packets/`.
- Add evidence index generation under `_ops/evidence/<packet-id>/`.
- Add report length/section validator.
- Add closeout report links to test evidence, regression evidence, browser/E2E evidence,
  review findings, gate results, security/risk decisions, wiki proposal, and PM impact.
- Add wiki proposal generation from closeout data.

Acceptance:
- Packet closeout report summarizes original intent, implemented result, acceptance,
  tests, reviews, risks, follow-up, wiki/memory update, and PM impact.
- Raw logs, screenshots, traces, and review bodies are not pasted into the report body.
- Missing evidence index links block closeout report validation.
- Wiki proposal validation blocks direct, sensitive, stale, or low-authority memory.

Verification:
- closeout report unit tests
- evidence index schema tests
- wiki proposal validator tests
- starter validation

### Wave 4: PM Daily Rhythm And WBS Loop
Goal: give the Human Owner a daily control surface without forcing code or MD-file review.

Scope:
- Day-start report: maximum one page.
- Day-wrap-up report: maximum one page.
- WBS and PM tracking remain TSV/CSV compatible.
- PM summaries coordinate; they do not approve implementation, testing, review, release,
  closeout, or human gates.

Implementation tasks:
- Add PM report generator from packet state, PMO projection, evidence index, blockers,
  risks, and decisions.
- Add day-start and day-wrap-up output placement under `product/docs/pmo/`.
- Add WBS TSV update support.
- Add freshness checks so stale PM summaries cannot override canonical state.

Acceptance:
- Day-start reports last state, next packet/decision, blockers, risks, and decisions needed.
- Day-wrap-up reports completed work, incomplete work, new risks, WBS changes, next work,
  blockers, and Human Owner questions.
- Each report stays within the one-page limit.
- PM outputs cite packet/evidence/state sources.

Verification:
- PM projection tests
- report length tests
- TSV generation tests
- stale projection tests

### Wave 5: Long Memory And Human Question Answering
Goal: keep long-running project context available to LLMs without Markdown overload.

Scope:
- Long memory is evidence-backed and compact.
- Wiki is a validated projection, not free-form documentation.
- Human Owner asks questions instead of reading all generated artifacts.

Implementation tasks:
- Add source index for packet, evidence, closeout, wiki, PM, decision, and active-context records.
- Add operational memory snapshot generation from closeout and validated wiki proposals.
- Add query-oriented context pack generation with authority labels and freshness checks.
- Add sensitive evidence exclusion for wiki and handoff context.

Acceptance:
- The harness can answer what happened, why, what evidence supports it, what remains risky,
  and what should happen next from structured state.
- Generated summaries do not override `_harness` policies, packet scope, trusted evidence,
  gate results, or human decisions.
- Sensitive evidence cannot be promoted to wiki or handoff context.

Verification:
- memory snapshot tests
- wiki provenance tests
- context authority/freshness tests
- sensitive evidence tests

### Wave 6: Provider-Neutral Multi-LLM Orchestration
Goal: support Codex/GPT, Claude Code, and future providers above the LLM runtime layer.

Scope:
- Provider assignments are policy-selected examples, not product identity.
- Orchestration starts manual-first and adapter-backed, then can evolve into automated execution.
- LLM-to-LLM discussion becomes evidence only when converted into bounded review findings,
  adjudication records, or human-approved decisions.

Implementation tasks:
- Extend adapter manifest capabilities for roles, permissions, evidence modes, limitations,
  and failure modes.
- Add role routing policy for Planner, Developer, Tester, Reviewer, Documenter, PM, and
  Orchestrator.
- Add cross-provider review/adjudication records.
- Add handoff prompt generation that preserves authority boundaries.

Acceptance:
- The harness can express "Claude as Orchestrator, Codex as Developer" as a policy example
  without making either provider the product identity.
- Provider-specific files do not become starter entry contracts.
- Cross-provider disagreement is captured as findings or adjudication, not final truth.

Verification:
- adapter manifest tests
- role routing tests
- adjudication record tests
- provider-specific contamination tests

### Wave 7: Skill Routing And Operator Ergonomics
Goal: make the harness usable in real projects without asking the Human Owner to know every skill.

Scope:
- Skills are selected automatically by task type, risk surface, role, and packet route.
- Skill execution records include permission scope, evidence contract, fallback behavior,
  and source authority.

Implementation tasks:
- Harden skill catalog and router validation.
- Add task-to-skill coverage for planning, TDD, review, security, browser evidence,
  dependency audit, day start, day wrap-up, documenter, memory, and retrospective flows.
- Add handoff prompts that include only needed context.

Acceptance:
- Unknown required skills block with actionable diagnostics.
- Selected skills do not override packet, Planner, Tester, Reviewer, or human authority.
- Skill routing avoids default full-context loading.

Verification:
- skill catalog tests
- routing negative tests
- context budget tests

### Wave 8: Compound Engineering And Starter Promotion Feedback
Goal: make the harness improve as projects run longer.

Scope:
- Capture friction, repeated mistakes, missing evidence, token overuse, stale context,
  manual rework, and boundary violations.
- Convert repeated friction into improvement proposals and starter-promotion candidates.
- Starter promotion remains packet-gated and contamination-checked.

Implementation tasks:
- Connect friction records to evidence, PM reports, closeout, and wiki proposals.
- Add recurring friction detector.
- Add improvement proposal lifecycle.
- Add starter promotion candidate registry.
- Add promotion dry-run and copied-starter smoke validation.

Acceptance:
- Repeated harness friction produces evidence-linked improvement candidates.
- Starter-promotion candidates require evidence and cannot mutate starter silently.
- Promotion does not grant release, closeout, residual-risk, or implementation approval.

Verification:
- friction detector tests
- improvement proposal tests
- starter promotion dry-run tests
- copied-starter smoke tests

## Requirement Coverage Matrix
This matrix maps every confirmed requirement to at least one implementation wave. A wave
does not close the requirement by name alone; it must produce the required implementation,
tests, validation, and packet closeout evidence.

| Requirement | Primary Wave | Follow-up Wave | Closure Evidence |
|---|---|---|---|
| SHV2-REQ-001 | Wave 0 | Wave 1 | Implementation plan and starter validation prove `starter/standard-harness/` is the product target. |
| SHV2-REQ-002 | Wave 1 | Wave 8 | Clean starter validation, copied-starter smoke, and promotion checks pass. |
| SHV2-REQ-003 | Wave 1 | Wave 8 | Contamination validator rejects root history, generated state, evidence history, wiki state, DB files, caches, and secrets. |
| SHV2-REQ-004 | Wave 1 | Wave 6 | Starter validation rejects `starter/standard-harness/AGENTS.md` and other provider-specific entry contracts. |
| SHV2-REQ-005 | Wave 0 | Wave 1 | Root/starter boundary remains documented and starter contamination checks keep root `AGENTS.md` out of payload. |
| SHV2-REQ-006 | Wave 6 | Wave 7 | Provider-neutral adapter and role-routing tests pass without Codex, Claude Code, or any provider becoming product identity. |
| SHV2-REQ-007 | Wave 1 | none | Folder policy/schema/validator enforce `_harness/`, `_ops/`, and `product/` as primary zones. |
| SHV2-REQ-008 | Wave 1 | Wave 2 | Boundary validator prevents product-specific operating records from entering `_harness/`. |
| SHV2-REQ-009 | Wave 1 | Wave 4 | `_ops` init/reset contract preserves `_harness` and `product` while regenerating operating folders safely. |
| SHV2-REQ-010 | Wave 1 | none | `product/src`, `product/tests`, and `product/docs` placement validation passes. |
| SHV2-REQ-011 | Wave 2 | Wave 3 | Packet lifecycle, acceptance, evidence, gate, and closeout validators pass for representative packets. |
| SHV2-REQ-012 | Wave 2 | Wave 3 | Test-plan-first, evidence trust, deterministic test, and closeout negative tests pass. |
| SHV2-REQ-013 | Wave 2 | Wave 3 | Browser/E2E applicability gate accepts valid evidence or valid N/A and rejects invalid N/A. |
| SHV2-REQ-014 | Wave 2 | Wave 6 | Trigger-based requirements, challenge, security, refactor, boundary, and review governance gates pass. |
| SHV2-REQ-015 | Wave 3 | Wave 5 | Documenter closeout, wiki proposal, evidence index, and long-memory validation pass. |
| SHV2-REQ-016 | Wave 8 | none | Friction, improvement proposal, metrics, and starter-promotion candidate tests pass. |
| SHV2-REQ-017 | Wave 5 | Wave 7 | Context pack, authority label, token budget, and skill-routing context tests pass. |
| SHV2-REQ-018 | Wave 1 | Wave 5 | Secret/sensitive evidence tests block starter, wiki, handoff, and LLM-context leakage. |
| SHV2-REQ-019 | Wave 6 | Wave 7 | Multi-provider role routing and adapter manifest tests pass. |
| SHV2-REQ-020 | Wave 6 | none | Cross-provider review/adjudication records prove LLM discussion is bounded evidence, not final truth. |
| SHV2-REQ-021 | Wave 2 | Wave 3 | Evidence trust validator blocks untrusted closeout according to packet type and risk. |
| SHV2-REQ-022 | Wave 1 | Waves 2, 3, 5 | Hard-stop negative tests block missing packet, invalid transition, forbidden `_harness` mutation, critical security blockers, and sensitive wiki promotion. |
| SHV2-REQ-023 | Wave 2 | none | Gate resolver computes versioned profile from packet type, risk level, changed zone, and release sensitivity. |
| SHV2-REQ-024 | Wave 1 | none | Product source and human document folder validation passes. |
| SHV2-REQ-025 | Wave 1 | Wave 3 | Packet document placement and closeout/evidence organization validation pass without making sample file names contractual. |
| SHV2-REQ-026 | Wave 4 | none | PMO document placement, WBS TSV/CSV, day-start, and day-wrap-up tests pass. |
| SHV2-REQ-027 | Wave 4 | Wave 6 | PM outputs are generated as coordination summaries and fail if treated as approval authority. |
| SHV2-REQ-028 | Wave 2 | Wave 3 | TDD/test-plan evidence distinguishes RED/GREEN or rationale, regression evidence, and closeout support. |
| SHV2-REQ-029 | Wave 2 | Wave 7 | Domain/refactor gates and long-running refactor proposal checks pass. |
| SHV2-REQ-030 | Wave 2 | Wave 3 | Product functional-test validators reject marker-only or file-existence-only evidence. |
| SHV2-REQ-031 | Wave 2 | Wave 6 | Challenge, user-workflow/E2E, adversarial-security, and code-structure review gates trigger by packet type/risk. |
| SHV2-REQ-032 | Wave 7 | none | Skill router selects required skills by task/risk/role and records permission, evidence, manifest, fallback, and source authority. |
| SHV2-REQ-033 | Wave 3 | Wave 5 | Maintenance docs and wiki proposal/apply governance are generated from evidence-backed closeout. |
| SHV2-REQ-034 | Wave 2 | Waves 6, 7 | Review/adjudication and skill-routing tests record uncertainty and block unsupported or unsafe instructions. |
| SHV2-REQ-035 | Wave 5 | Wave 7 | Context authority, freshness, pruning, token budget, and untrusted-content tests pass. |
| SHV2-REQ-036 | Wave 3 | Waves 4, 5 | Human-facing closeout, PM report, and question-answering surfaces work without code inspection. |
| SHV2-REQ-037 | Wave 3 | Wave 4 | Closeout max two-page validator and PM max one-page validators pass. |
| SHV2-REQ-038 | Wave 1 | Waves 3, 4, 5 | High-volume operating state uses structured records, indexes, manifests, TSV/CSV, SQLite, and compact context packs. |
| SHV2-REQ-039 | Wave 5 | Wave 4 | Question-answering source index cites packet state, evidence, closeout, wiki, PM summaries, and active context. |
| SHV2-REQ-040 | Wave 0 | Wave 2 | Planning intent remains human-reviewable Markdown and implementation packets cannot proceed without reviewed planning baseline. |
| SHV2-REQ-041 | Wave 3 | none | Each packet can produce one max two-page closeout report plus evidence index links. |
| SHV2-REQ-042 | Wave 5 | Wave 8 | Long memory preserves compact evidence-backed project intent, decisions, conventions, packet history, frictions, risks, and deprecated context. |
| SHV2-REQ-043 | Wave 4 | none | Day-start/day-wrap-up reports provide daily continuity, WBS updates, blockers, risks, next work, and human decision prompts within one page. |
| SHV2-REQ-044 | Wave 2 | Waves 3, 4, 6 | Human/Planner, Developer, Tester, Reviewer, Documenter, PM, and Orchestrator flow is enforceable by packet/gate/role evidence. |
| SHV2-REQ-045 | Wave 2 | none | Baseline gate profiles exist and are validated for all required packet types. |
| SHV2-REQ-046 | Wave 2 | none | Risk escalation/de-escalation tests prove hard stops cannot be waived. |
| SHV2-REQ-047 | Wave 3 | Wave 4 | Evidence index links cover tests, regression, browser/E2E, reviews, gates, risk decisions, wiki/memory, and PM/WBS impact. |

## Initial Packet Roadmap
| Order | Packet | Purpose | Risk Mode | Required Verification |
|---|---|---|---|---|
| 1 | PKT-01 Project Operating Folder Contract | Enforce clean starter folder semantics and reset/init boundary. | guarded | starter validation, folder policy tests, contamination checks |
| 2 | PKT-02 Risk-Adaptive Gate Profile Engine | Make packet type and risk level compute real required gates. | guarded | gate resolver tests, packet validation tests, closeout negative tests |
| 3 | PKT-03 Documenter Closeout And Evidence Index | Produce max two-page human closeout reports with linked evidence index. | guarded | report schema/length tests, evidence index tests, wiki proposal tests |
| 4 | PKT-04 PM Daily Rhythm And WBS Loop | Produce max one-page day-start/day-wrap-up reports and WBS TSV updates. | standard | PM report tests, TSV tests, stale projection tests |
| 5 | PKT-05 Long Memory And Question Answering Index | Connect closeout, wiki, PM, evidence, and active context for compact answers. | guarded | memory/context tests, sensitive evidence tests |
| 6 | PKT-06 Provider-Neutral Orchestration Contract | Add manual-first multi-provider role routing and adjudication records. | guarded | adapter/routing tests, contamination tests |
| 7 | PKT-07 Skill Routing And Operator Ergonomics | Make required skills discoverable and evidence-linked. | standard | skill router tests, context budget tests |
| 8 | PKT-08 Compound Feedback And Starter Promotion | Convert friction into improvement and starter-promotion candidates. | guarded | friction/proposal tests, promote-starter smoke |

## Verification Baseline
Each implementation packet must define its own exact commands. The common baseline is:

```powershell
npm.cmd run harness:validate
PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter
```

When a packet changes starter Python runtime, add focused Python tests for the changed
service/validator/CLI path. When a packet changes root Node harness validation or promotion
logic, add focused Node tests and run the matching root test command.

Starter validation must avoid creating bytecode/cache contamination. Use
`PYTHONDONTWRITEBYTECODE=1` for local starter CLI smoke commands.

## Stop Rules
Stop before implementation when:
- no approved packet exists,
- `Ready For Code` is missing,
- the packet does not name packet type, risk level, changed zones, acceptance criteria,
  evidence expectations, review expectations, and closeout expectations,
- a proposed change would copy v1 `.agents`, `.harness`, `AGENTS.md`, root runtime state,
  generated state, evidence, or history into starter,
- a product packet would mutate `_harness/**` without a harness-system packet,
- a PM, Documenter, Wiki, generated summary, or LLM discussion tries to become approval
  authority.

## Alternative Strategy: Full Rebuild
A full rebuild is not the recommended path.

Use a full rebuild only if a future architecture review proves at least one of these:
- the current event-store kernel cannot support packet/evidence/gate/closeout integrity,
- the clean starter boundary cannot be preserved without large structural reversal,
- risk-adaptive gates cannot be enforced without replacing the state model,
- provider-neutral orchestration requires a fundamentally different runtime core.

Current evidence does not support those conditions. The expected lower-cost path is
kernel preservation plus targeted operating-layer implementation.

## Operator Next Action
Review the rebased PKT-01 Project Operating Folder Contract and request explicit Human
Owner `Ready For Code` approval. PKT-01 should not implement risk-adaptive gates,
closeout reporting, PM rhythm, or orchestration except where needed to preserve the folder
contract and starter validation boundary.

## Long-Memory Boundary
Keep this file focused on implementation direction and packet sequencing.

Do not turn this file into:
- packet history,
- closeout report,
- test log,
- release note,
- wiki memory,
- root maintainer diary,
- reusable runtime rulebook.

Durable history belongs in `PROJECT_HISTORY.md`; preventive lessons belong in
`PREVENTIVE_MEMORY.md`; architecture decisions belong in `ARCHITECTURE_GUIDE.md` and
approved packet decisions.
