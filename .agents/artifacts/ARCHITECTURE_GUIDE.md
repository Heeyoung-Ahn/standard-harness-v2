# Architecture Guide

> AUTHORITATIVE architecture baseline for Standard Harness v2 starter payload planning.
> This document does not grant `Ready For Code`; implementation still requires a closed
> planning baseline and an explicitly approved packet.

## Status
- Architecture baseline rebased from the confirmed v2.0 requirements direction and the
  implementation plan on 2026-06-28.
- The architecture direction is to preserve the current v2 starter kernel and harden the
  missing product operating layer.
- Planning documents must be closed before the first implementation packet can open for
  `Ready For Code`.
- Not Ready For Code by itself.

## Purpose
This guide turns the confirmed Standard Harness v2 requirements and implementation plan
into architecture boundaries. It defines what the starter product is, what the root
development harness is, which zones own which records, which parts of the current v2
kernel should be preserved, and where later packets must add enforcement.

This file is not packet history, implementation evidence, closeout, wiki memory, PM
status, or generated context. Those belong to their own operating surfaces.

## Authoring Flow
Update this guide only through an approved planning boundary or packet when architecture
authority, starter boundaries, reusable harness responsibilities, or implementation-wave
sequencing changes. Project-specific architecture details for a copied starter may be
filled during initialization, but reusable starter-health guidance stays intact unless a
packet decision explicitly changes the starter contract.

## Product Architecture Thesis
Standard Harness v2 is a provider-neutral development operating harness that sits above
LLM runtimes. Its job is to route human intent, LLM work, tests, reviews, evidence,
closeout, long memory, PM rhythm, and compound improvement without binding the product to
Codex, Claude Code, Antigravity, or any other single provider.

The core human constraint is architectural, not cosmetic: LLMs produce code and
intermediate artifacts too quickly for a Human Owner to inspect everything. The harness
must therefore make project state governable by LLMs, auditable by humans, and grounded in
human-approved planning intent, trusted evidence, compact reports, and structured memory.

The target architecture is not a full rebuild. The current v2 starter already has a useful
kernel shape:
- clean `starter/standard-harness/` payload boundary,
- `_harness/`, `_ops/`, and `product/` zones,
- Python-based harness runtime under `_harness/system/standard_harness/`,
- policy, schema, catalog, validator, CLI, state, packet, evidence, gate, wiki, PMO,
  memory, adapter, review, and self-improvement modules,
- starter contamination checks and operating-folder policy.

The main gap is the operating layer above that kernel: risk-adaptive gates, documenter
closeout, evidence indexes, PM daily reports, long-memory question answering,
provider-neutral orchestration, skill routing, and compound feedback must become
enforced product behavior instead of scattered concepts.

## Planning Closure Rule
v2 follows the v1.0 discipline that planning documents must be closed before an
implementation packet can open.

Before the first implementation packet receives `Ready For Code`, the following planning
surfaces must be aligned and closed or explicitly deferred:
- `.agents/artifacts/REQUIREMENTS.md`: confirmed requirements baseline.
- `reference/planning/PLN-01_REQUIREMENTS_FREEZE.md`: formal requirements freeze record.
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`: architecture baseline and boundaries.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`: implementation sequencing and requirement
  coverage.
- first packet planning document: scope, acceptance, evidence, review, closeout, risk, and
  non-scope boundary.

This closure rule prevents partial planning notes from becoming implementation authority.
It also prevents root development assumptions, provider-specific habits, or legacy v1
structures from leaking into the clean starter payload.

## Repository Boundary
The repository has two different systems that must not be confused.

```text
Root development repository
  AGENTS.md                     Codex-only development-repo entry contract
  .agents/                      root planning, workflows, generated context, governance
  .harness/                     root development harness runtime and validation
  reference/                    legacy/reference material for this development repo
  starter/
    standard-harness/           clean Standard Harness v2 product payload
```

Root files operate this development repository. The product being built is only:

```text
starter/standard-harness/
```

Root `AGENTS.md`, root generated state, root evidence, root packets, root `.agents/`,
root `.harness/`, and root planning history are not starter payload material unless a
future approved starter-promotion packet explicitly reduces them into provider-neutral v2
contracts.

The starter payload must not contain `starter/standard-harness/AGENTS.md`.

## Starter Zone Architecture
The copied starter uses three primary zones. Folder names are contractual. File names
inside those folders are samples unless a schema, validator, CLI, or minimum starter
contract explicitly requires a file.

```text
starter/standard-harness/
  _harness/       reusable harness system
  _ops/           copied-project operating records
  product/        product source, tests, and human-facing documents
```

### `_harness/`
`_harness/` is the reusable harness system. It owns:
- policies,
- schemas,
- catalogs,
- role and routing contracts,
- validation logic,
- CLI/runtime code,
- initialization and reset rules,
- provider-neutral adapter contracts,
- starter contamination rules.

`_harness/` must not contain product-specific requirements, packet results, evidence
history, local runtime state, temporary outputs, PM reports, wiki state, or human project
deliverables from a copied project.

Product packets must not modify `_harness/**`. A change to `_harness/**` is a harness
system change and must use a harness-system or starter-promotion packet with stricter
boundary validation.

### `_ops/`
`_ops/` is the LLM/validator-facing operating memory for a copied project. It owns:
- packet state,
- evidence indexes and raw evidence references,
- human decision records,
- review results and adjudication records,
- wiki proposals,
- applied wiki memory,
- active context projections,
- backlog,
- friction signals,
- metrics,
- structured PM operating records.

`_ops/` is resettable and initializable. Reset/init must never damage `_harness/` or
`product/`. In a clean starter payload, `_ops/` contains seed folders only, not real
project history, generated runtime state, local DB files, logs, caches, secrets, release
evidence, or product-specific artifacts.

High-volume LLM operating state belongs here in structured, indexed, token-efficient
formats such as JSON, YAML, TSV/CSV, SQLite hot state, manifests, indexes, and compact
context packs. It should not be converted into unbounded Markdown.

### `product/`
`product/` is the project deliverable zone for a copied starter. It owns:
- product source under `product/src/`,
- product-local tests under `product/tests/`,
- human-facing project documents under `product/docs/`.

Human-facing documents belong under `product/docs/`, not `_ops/` and not `_harness/`.
The intended document groups are:
- `product/docs/project/`: project-wide planning, requirements, architecture,
  implementation, API, database, and UI design documents.
- `product/docs/packets/`: packet-level human summaries and one closeout report per
  packet.
- `product/docs/pmo/`: compact PMO human surface. Required starter folders are
  `day-wrap-up` for durable Markdown and `wbs` for TSV/CSV-compatible tracking.
  Day-start is a generated/screen-oriented brief by default. Source-intake, daily
  records, status, risks, and blockers are structured/indexed operating records or
  report sections, not required Markdown folders.

Human-facing prose documents use Markdown. WBS and spreadsheet-compatible PMO material
uses TSV or CSV. Packet closeout reports are capped at two pages plus evidence index
links. Day-wrap-up reports are capped at one page. Day-start briefs are generated views
by default and capped at one page if persisted.

## Kernel Components
The current v2 starter kernel should be preserved and hardened rather than replaced.
Major component ownership is:

| Component Area | Starter Location | Architectural Role |
|---|---|---|
| CLI | `_harness/bin/harness_cli.py`, `_harness/system/standard_harness/cli/` | Operator entry point for init, validation, packet, memory, PM, and diagnostics commands. |
| State | `_harness/system/standard_harness/state/` | Event store, migrations, replay, backup, audit, recovery, and compatibility surfaces. |
| Domain | `_harness/system/standard_harness/domain/` | Packet, requirement, artifact, evidence, gate, closeout, and boundary entities. |
| Policy | `_harness/policies/`, `_harness/system/standard_harness/policy/` | Declarative rules for zones, risk, gates, permissions, evidence, token budget, reviews, and operating folders. |
| Validation | `_harness/system/standard_harness/validation/` | Deterministic checks for packets, evidence, reviews, context, security, wiki, and closeout. |
| Starter Integrity | `_harness/system/standard_harness/starter/` | Clean payload and contamination checks. |
| Operating Folders | `_harness/system/standard_harness/operating_folders.py` | Init/reset behavior derived from folder policy. |
| Evidence | `_harness/system/standard_harness/evidence/` | Evidence profiles, trust, and runtime evidence handling. |
| Reviews | `_harness/system/standard_harness/reviews/` | Review routing, bundles, and adjudication records. |
| Documenter | `_harness/system/standard_harness/documenter/` | Packet closeout and evidence-index-backed human report generation. |
| Wiki / Memory | `_harness/system/standard_harness/wiki/`, `_harness/system/standard_harness/memory/` | Proposal, validation, application, provenance, operational memory, and question-answering foundations. |
| PMO | `_harness/system/standard_harness/pmo/` | PM projections, day reports, WBS impact, and cost/status support. |
| Adapters / Orchestration | `_harness/system/standard_harness/adapters/`, `_harness/system/standard_harness/workflow/` | Provider-neutral role routing and LLM adapter contracts. |
| Skills / Roles | `_harness/system/standard_harness/skills/`, `_harness/system/standard_harness/roles/` | Skill catalog, automatic skill routing, and role cards. |
| Self Improvement | `_harness/system/standard_harness/self_improvement/` | Friction, recurring issue detection, improvement proposals, and starter-promotion candidates. |

## Core Data Flow
The v2 operating loop is packet-centered.

```text
Human Owner planning intent
  -> Planner packet scope, acceptance, non-goals, evidence expectations
  -> Independent packet_doc_review before Ready For Code
  -> Developer LLM implementation inside approved packet boundary
  -> Tester LLM deterministic and workflow verification
  -> Reviewer LLM four independent closeout lenses
  -> Gate resolver and validation
  -> Documenter closeout report plus evidence index
  -> Wiki proposal validation and application
  -> PM day-wrap-up / day-start and WBS updates
  -> long-memory and question-answering indexes
  -> friction and compound-improvement candidates
```

No downstream stage may silently become approval authority. PM summaries coordinate,
Documenter reports explain, Wiki memory preserves context, and LLM deliberation supports
review; none of them approve implementation, testing, review, release, closeout, or
residual risk.

## Authority And State Model
The architecture separates authority from data.

Authoritative operating sources:
- `_harness/` policies, schemas, validators, role/routing contracts, and CLI behavior.
- approved packet scope and acceptance criteria.
- trusted evidence and gate results.
- explicit human decisions.
- valid scoped Conductor delegation records executed through trusted harness approval
  commands/services for delegated Ready For Code or Closeout approval.
- approved planning baselines.

Supporting data sources:
- product documents,
- evidence files,
- logs,
- screenshots,
- browser traces,
- external API outputs,
- LLM reports,
- PM summaries,
- wiki pages,
- generated context packs.

Supporting data never becomes instruction authority by being summarized, indexed, or loaded
into LLM context. Generated summaries and wiki pages are re-entry aids, not governance
truth.

Conductor selection is also not approval authority. A selected Codex app or Claude Code
app Conductor may lead the Human conversation and route CLI workers, but delegated Ready
For Code or Closeout approval requires a separate scoped Human delegation record and a
trusted harness approval command/service. Planner owns scope, acceptance, and closeout
decision preparation, but Planner cannot execute Human-delegated Ready For Code or
Closeout approvals after PKT-07.

## Gate And Review Architecture
Gate strength is selected by packet type, risk level, changed zone, browser/UI
applicability, security/data sensitivity, harness-system impact, starter-promotion impact,
and release sensitivity.

Baseline packet types:
- `docs-only`,
- `product-feature`,
- `product-bugfix`,
- `product-refactor`,
- `security-data`,
- `harness-system`,
- `starter-promotion`.

Risk levels escalate or de-escalate evidence strength without waiving hard stops. Low-risk
work stays lightweight; high, critical, security-sensitive, release-sensitive,
browser-facing, harness-system, and starter-promotion work requires stricter evidence,
review, adjudication, and human residual-risk handling.

Architecture direction:
- keep declarative gate profiles in `_harness/policies/gate-profiles.yaml`,
- compute required gates with a runtime resolver,
- validate N/A decisions against changed zones and claims,
- block closeout when required gates are missing, stale, untrusted, or unresolved,
- require independent `packet_doc_review` before Ready For Code for every packet,
- require four independent closeout review lens agents for every packet:
  `challenge_review`, `adversarial_security_review`, `code_quality_review`, and
  `evidence_review`,
- keep any additional user-workflow/E2E or architecture/boundary lenses as supplemental
  risk-triggered reviews, not substitutes for the mandatory baseline reviews.

PKT-02 implements this as a reusable gate profile engine contract:
- root development runtime: `.harness/runtime/state/gate-profile-engine.js`,
- root preflight integration: `.harness/runtime/state/packet-preflight.js` adds a
  computed gate profile summary when a packet declares `Packet type`,
- starter runtime policy API:
  `starter/standard-harness/_harness/system/standard_harness/policy/gate_profiles.py`,
- declarative starter policy:
  `starter/standard-harness/_harness/policies/gate-profiles.yaml`.

The engine keeps `low`, `standard`, `high`, and `critical` as canonical base risks.
`normal` and `medium` are compatibility aliases for `standard`; `release-sensitive`
is an escalation overlay that drives critical-grade gates without becoming a fifth base
risk. Packet type baselines remain lightweight by default, and overlays add stricter
evidence only when the packet claims or changed zones require it.

AI review can support the gate package, but deterministic tests, browser evidence,
trusted command evidence, or explicit N/A substitute checks are required when applicable.

## Documenter, Evidence, And Human Report Architecture
The Documenter is not a general Markdown generator. It is a closeout agent that converts
packet state and trusted evidence into a compact human report and structured memory
inputs.

Architecture requirements:
- one packet closeout report per packet under `product/docs/packets/`,
- maximum two pages plus evidence index links,
- no raw logs, screenshots, traces, or review bodies pasted into the report body,
- evidence index stored under `_ops/evidence/<packet-id>/` or the approved packet evidence
  location,
- closeout report links to tests, regression, browser/E2E evidence, reviews, gate results,
  security or residual-risk decisions, wiki proposal, and PM/WBS impact.

Documenter output must not directly mutate `_ops/wiki/**`. It may create wiki proposals.
Wiki proposal validation and application are separate steps.

## Long Memory And Question-Answering Architecture
Long memory is primarily for LLM continuity and Human Owner question answering, not for
creating a growing manual that humans must read.

The memory layer should preserve compact, evidence-backed knowledge:
- project intent,
- architecture decisions,
- current conventions,
- packet history,
- known frictions,
- open risks,
- deprecated context.

The question-answering surface should answer:
- what happened,
- why it happened,
- what evidence supports it,
- what remains risky,
- what should happen next.

Answers must cite packet state, evidence indexes, closeout reports, wiki memory, PM
summaries, active context, or explicit decision records. Sensitive evidence must be
excluded from wiki, handoff context, and LLM context packs.

## PM Rhythm Architecture
PM output is a human control surface, not approval authority.

Day-start reports:
- maximum one page,
- last known state,
- next packet or decision,
- blockers,
- risks,
- decisions needed from the Human Owner.

Day-wrap-up reports:
- maximum one page,
- completed work,
- incomplete work,
- new risks,
- WBS changes,
- next work,
- blockers,
- questions for the Human Owner.

WBS and PMO tracking should be TSV or CSV where practical. PM reports must cite source
state and must not override packet scope, evidence gates, Reviewer findings, or human
decisions.

## Provider-Neutral Orchestration Architecture
v2 supports multi-LLM orchestration through policy and adapter contracts, not product
identity.

Allowed examples:
- Claude Code as Orchestrator with Codex/GPT as Developer.
- Claude handling planning, testing, and review while Codex/GPT handles coding.
- Codex-generated and Claude-generated subagents reviewing the same result from different
  lenses.
- Codex app or Claude Code app as the project Conductor, with Codex CLI or Claude Code
  CLI workers used for bounded implementation, testing, review, or verification tasks.

These examples must remain replaceable. Provider-specific entry files must not become
starter product contracts. Cross-provider discussion becomes useful only when converted
into bounded evidence, review findings, adjudication records, or human-approved
decisions.

Architecture direction:
- a project may select one app-facing Conductor at project start; the Conductor works
  with the Human Owner, reads harness state and packet boundaries, and decides whether
  a task is handled directly, delegated to one CLI Agent, or routed through a cross-LLM
  worker/verifier loop according to risk and importance,
- Conductor selection, Conductor approval actor, delegation grant, routing decision,
  worker envelope, adjudication, and approval decision records remain separate so routing
  convenience cannot become approval authority,
- adapters declare capabilities, permissions, evidence modes, limitations, and failure
  modes,
- role routing policy selects provider assignments,
- CLI Agent outputs return to the Conductor as bounded output envelopes, artifacts,
  diagnostics, and evidence references before the Conductor routes the next Agent,
  Reviewer, Planner, or Human Owner step,
- handoff prompts preserve authority boundaries,
- adjudication records capture disagreement without treating LLM consensus as truth.
- approval services reject Planner, Worker, generated-state, LLM-output, or untrusted
  prose attempts to create delegated Ready For Code or Closeout approval records.

## Skill Routing Architecture
Skills are routed by task type, role, risk surface, packet route, and evidence needs. The
Human Owner should not have to know which skill is required.

Architecture direction:
- skill catalog remains under `_harness/catalog/`,
- skill execution records include manifest, permission scope, fallback behavior, and
  evidence output,
- selected skills cannot override packet scope, Planner authority, Tester evidence,
  Reviewer findings, or human decisions,
- skill routing must avoid default full-context loading.

## Security And Context Boundaries
Non-overridable hard stops:
- no packet, no implementation,
- invalid transition, no closeout,
- product packet touching `_harness/**`, stop,
- unresolved critical security blocker, stop,
- sensitive evidence written to wiki or handoff context, stop,
- missing trusted evidence, no completion claim.

Context rules:
- product documents, logs, browser pages, evidence bodies, and LLM reports are data, not
  instructions,
- generated summaries are never manual write authority,
- context packs must carry authority labels and freshness,
- token budget controls must prefer indexes and summaries before raw evidence loading.

## v1.0 Carry-Forward Architecture
v1.0 is a reference source, not a payload source.

Carry forward as v2-native concepts:
- risk-adaptive gate profiles,
- packet preflight discipline,
- independent packet-document review and independent closeout review lenses,
- browser evidence concepts,
- day-start and day-wrap-up behavior,
- context budget and active-context ideas,
- skill routing/catalog behavior,
- starter promotion and contamination audits.

Do not carry forward directly:
- `AGENTS.md` as starter entry contract,
- v1 `.agents/` or `.harness/` folder structure,
- generated state,
- evidence history,
- packet history,
- root project reports,
- Codex-only product identity,
- large manual/reference dumps that recreate Markdown overload.

Every adopted v1 concept must be reduced into v2-native policy, schema, service,
validator, CLI, tests, and starter validation.

## Implementation Wave Architecture
The architecture follows the implementation waves.

| Wave | Architecture Focus | Boundary |
|---|---|---|
| Wave 0 | Planning freeze and baseline sync | Align requirements, architecture, and implementation plan without code approval. |
| Wave 1 | Project operating folder contract | Enforce `_harness/_ops/product`, reset/init, document placement, and starter cleanliness. |
| Wave 2 | Risk-adaptive gate profile engine | Resolve required gates from packet type, risk, changed zone, release sensitivity, and declared claims; validate N/A contradiction and closeout missing/stale/untrusted gates. |
| Wave 3 | Documenter closeout and evidence index | Produce two-page human report plus structured evidence index and wiki proposal. |
| Wave 4 | PM daily rhythm and WBS loop | Produce one-page daily reports and spreadsheet-compatible PMO updates. |
| Wave 5 | Long memory and question-answering index | Connect packet, evidence, closeout, wiki, PM, and active context for compact answers. |
| Wave 6 | Provider-neutral orchestration and Conductor routing | Add app-facing Conductor selection, CLI worker routing, adjudication, selected entry generation, and delegated approval validation. |
| Wave 7 | Skill routing and operator ergonomics | Select required skills automatically and evidence-link their use. |
| Wave 8 | Compound feedback and starter promotion | Convert friction into improvement and starter-promotion candidates. |

## First Packet Architecture
The first implementation packet should be `PKT-01 Project Operating Folder Contract`.

It should solve only the folder and clean-payload foundation:
- inspect the current `starter/standard-harness/` payload,
- formalize `_harness/`, `_ops/`, and `product/` zone semantics,
- define `_ops` init/reset behavior,
- enforce `product/docs/project`, `product/docs/packets`, and `product/docs/pmo`
  placement,
- enforce that folder names are contractual and file names are samples unless required by
  schema or CLI,
- reject starter contamination such as root `.agents`, root `.harness`, `AGENTS.md`,
  generated state, caches, secrets, local DB files, real packet/evidence history, and
  provider-specific entry contracts,
- verify that starter can be copied and initialized without root development history.

It should not implement the full gate engine, closeout report generator, PM rhythm,
question-answering layer, provider orchestration, or skill router except where a minimal
hook is required to preserve the folder contract.

## Decisions
| Decision | Status | Rationale |
|---|---|---|
| Preserve current v2 starter kernel instead of rebuilding from scratch. | architecture baseline | Current structure already matches the required three-zone kernel and contains usable policy/schema/runtime modules. |
| Treat `starter/standard-harness/` as the only product payload target. | closed by requirement | Root harness is a development OS and must not be copied as product. |
| Keep starter provider-neutral and omit `AGENTS.md`. | closed by requirement | v2 operates above LLM runtimes and must not depend on Codex identity. |
| Use `_harness/`, `_ops/`, and `product/` as contractual zones. | closed by requirement | This is the primary contamination and authority boundary. |
| Human-facing documents live under `product/docs/`. | closed by requirement | Humans review planning, compact closeout, PM reports, and decisions, not `_ops` internals. |
| Use structured operating records for high-volume LLM state. | closed by requirement | Prevents Markdown explosion and reduces token load. |
| Require all planning baselines to close before packet Ready For Code. | architecture baseline | Matches v1.0 discipline and prevents premature packet opening. |
| Open Project Operating Folder Contract first. | selected for PKT-01 | It protects all later packets from placing files in the wrong zone. |
| Use a policy-backed gate profile engine for Wave 2. | selected for PKT-02 | It reduces v1.0 gate-profile principles into v2-native root/starter resolver APIs, tests, and preflight diagnostics without copying v1 files wholesale. |

## Open Architecture Questions
These questions do not block the architecture baseline, but they must be resolved in the
named implementation waves before the related capability is claimed complete.

| Question | Owning Wave |
|---|---|
| What exact `_ops` reset command and retention behavior should ship? | Wave 1 |
| How should later packets persist computed gate results into the full evidence index and closeout report? | closed by PKT-03 for closeout validation; PM and memory consumers remain PKT-04/PKT-05 |
| What exact closeout report length metric counts as two human-readable pages? | closed by PKT-03 as a 120 non-empty body-line validation limit plus evidence index links |
| What exact evidence index schema should become the starter minimum contract? | closed by PKT-03 with required evidence id/type/path/status/trust/freshness/resolution/redaction/gate fields |
| Which PMO TSV/CSV columns are mandatory for WBS and daily tracking? | closed by PKT-04 with `wbs_id`, `parent_id`, `packet_id`, `title`, `status`, `owner_role`, `priority`, `risk_level`, `planned_start`, `planned_finish`, `evidence_index_path`, `closeout_report_path`, and `updated_at` |
| Which query index is authoritative for Human Owner project-status answers? | Wave 5 |
| What is the minimum useful provider adapter contract without automating provider control too early? | Wave 6 |
| Which skill-routing failures should block packets versus warn? | Wave 7 |
| What promotion evidence is sufficient to move repeated friction into starter changes? | Wave 8 |

## Architecture Stop Rules
Stop before implementation when:
- requirements freeze, architecture baseline, implementation plan, or first packet planning
  is not closed enough,
- `Ready For Code` is missing,
- independent `packet_doc_review` is missing, failed, pending, self-reviewed, or not tied
  to packet evidence,
- proposed work mutates `_harness/**` under a product packet,
- proposed work copies root `.agents`, root `.harness`, root `AGENTS.md`, root generated
  state, evidence, packet history, or local DB files into starter,
- proposed work makes a provider-specific file or runtime the starter product identity,
- evidence, PM summaries, wiki pages, or LLM discussions are treated as approval authority,
- sensitive evidence would enter wiki, handoff context, starter payload, or LLM context
  packs.

Stop before closeout when mandatory independent closeout review lenses are missing,
duplicated-agent, self-reviewed, unbound to packet evidence, pending, failed, or replaced
by Orchestrator summary prose.

## Architecture Memory Boundary
Architecture decisions live here and in approved packet decisions. Do not create a
competing ADR system for the first long-memory wave. Wiki memory may summarize approved
architecture decisions later, but it does not override this file or packet decisions.

Root maintainer history, root review evidence, root packet history, walkthrough evidence,
and development-repo operating records must not be pasted into this guide or promoted into
the starter as architecture memory. Convert only reusable architecture decisions through
approved packet decisions or starter-promotion work.

Active Context and generated docs may point here as source trace or fallback read
guidance, but they do not become write authority for architecture memory.

## Starter Health Customization Boundary
Preserve this section, `Purpose`, `Planning Closure Rule`, and `Architecture Memory
Boundary` when customizing a copied starter.

Safe to customize: component names, module boundaries, data flow, integrations,
constraints, tradeoffs, and open technical questions for the actual copied project.

Do not replace reusable starter-health guidance with product-only prose. Do not paste root
maintainer history, root evidence, generated state, packet logs, or project-specific
operating records into the starter architecture baseline. If a product packet needs
different architecture memory behavior, record that as a packet decision before changing
these reusable guardrails.
