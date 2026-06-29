# Requirements

> AUTHORITATIVE. Governance requirements SSOT. Edit only through an approved planning boundary or packet.

## Status
- v2.0 charter baseline prepared from Human Owner direction and legacy v0.2 requirements.
- This document is the hope, direction, and goal of Standard Harness v2.0.
- It intentionally prioritizes the Human Owner's operating model over the previous additive requirements-list structure.
- Requirements baseline confirmed by the Human Owner on 2026-06-28.
- PLN-01 requirements freeze is approved for architecture sync, implementation-plan sync, and first packet planning.
- Not Ready For Code by itself; implementation still requires an approved packet with explicit `Ready For Code`.

## Summary
Standard Harness v2 is the clean, copyable starter payload under
`starter/standard-harness/`. It must preserve a provider-neutral harness system,
resettable project operating records, and human-facing product documents while preventing
root development history, generated state, evidence history, provider-specific entry
contracts, and secrets from entering the starter payload.

### 사용자 목표
- Build Standard Harness v2 as a clean starter payload whose project-specific goal is
  supplied during copied-starter initialization.

### 운영 목표
- Keep the copied project's operating model explicit, evidence-backed, and replaceable
  through project initialization without changing the reusable starter contract.

### 승인 목표
- Keep human approval focused on planning intent, packet boundaries, residual risk, and
  compact closeout surfaces instead of raw code or high-volume operating records.

## Product Thesis
This repository develops the clean Standard Harness v2 starter payload at
`starter/standard-harness/`. The root harness is the development operating system used
to plan, validate, and evolve that payload. The product must remain provider-neutral,
copyable into a new repository, and free from root development history.

Standard Harness v2.0 is built for a real constraint: LLMs can generate implementation,
tests, reviews, evidence, and documentation faster than a human can inspect them. The
answer is not to ask the Human Owner to read more files. The answer is to make the
project state governable by LLMs, auditable by humans, and grounded in planning intent,
trusted evidence, closeout reports, and long memory.

The v2.0 promise is:

> The Human Owner plans deeply, approves deliberately, asks questions, and judges risk.
> LLMs implement, test, review, close out, maintain memory, and explain project state.
> The harness preserves human intent and project continuity through packets, evidence,
> review gates, closeout reports, PM rhythm, and token-efficient long memory.

v2.0 must therefore optimize for:
- human planning depth,
- LLM execution speed,
- evidence-backed completion,
- compact human review surfaces,
- structured LLM-readable operating state,
- long-running context continuity,
- clean starter portability,
- independent packet-document review before implementation, so an LLM cannot turn
  hard planning into a weaker packet and then ask for `Ready For Code`.

Human planning intent is a hard authority boundary. When the Human Owner or Planner has
done detailed planning, an implementing LLM must not narrow, reinterpret, shortcut, or
close the work from its own convenience. Passing tests, matching vocabulary, or producing
plausible review prose is not enough when the implementation does not satisfy the approved
intent and packet acceptance.

## Product Anti-Goal
v2.0 must not become a system where the Human Owner is expected to inspect code,
intermediate operating records, or thousands of generated Markdown files. That model is
unusable for non-developers and still unrealistic for developers when LLMs produce work
at high speed.

v2.0 must also not become a system where LLMs freely generate prose and call it memory.
Memory, summaries, reviews, and closeout are useful only when they are connected to packet
intent, trusted evidence, authority labels, and reviewable decisions.

## V2 Direction
Standard Harness v2 is a development operating system for long-running,
LLM-assisted product work. It is not a prompt bundle, not a Codex-only workflow, and
not a harness that sits below one LLM runtime. It must sit above LLM runtimes as a
provider-neutral routing and governance layer.

## Good Harness Standard
The good-harness standard from legacy v0.2 is binding for this project:
- A good harness is a verifiable operating kernel that stops precisely at risky points and keeps ordinary development flow organized without excessive ceremony.
- A bad harness is a procedure system that only multiplies documents, checklists, prompts, and evidence files without proving real quality.
- v2 must therefore lower good principles into schemas, policies, validators, gates, evidence, and human approval boundaries instead of relying on prose alone.

## Product Direction
The v2 product direction is:
- coordinate human roles, LLM providers, tools, packets, evidence, tests, reviews, PM operations, and closeout through explicit operating contracts,
- orchestrate multiple subscribed LLM runtimes such as Codex/GPT and Claude Code through provider-neutral adapters and policies, while keeping provider assignments as configurable policy or examples rather than product identity,
- select Codex or Claude Code as a project Conductor at project start when the Human Owner wants an app-led operating surface; the Conductor talks with the Human Owner, assesses task risk and importance, and chooses direct handling, single CLI-agent delegation, or a cross-LLM verification loop,
- keep Conductor selection separate from approval authority: selecting a Conductor does
  not grant approval rights, and Ready For Code or Closeout approval may be created only
  by direct Human decision or by a selected Conductor with a valid scoped Human delegation
  executed through a trusted harness approval command or service,
- treat LLM output as reviewable evidence rather than final truth,
- keep harness system files, project operating records, and product artifacts separated by folder and authority boundary,
- limit human-facing Markdown to documents humans actually need for planning, approval, risk review, closeout, and daily management,
- keep high-volume operating records in structured, indexed, and token-efficient forms that LLMs can query and summarize,
- preserve long-term project memory through evidence-backed documenter output and wiki proposal/application flow,
- feed repeated friction, context loss, missing evidence, and manual rework into compound-engineering improvement candidates,
- prevent overconfident AI claims, blind user-opinion following when technically unsafe, token overuse, context poisoning, and starter contamination.

## Hard Stops
The following hard-stop principles are part of the v2 operating philosophy:
- No evidence, no completion claim.
- No trusted evidence, no closeout.
- No LLM convenience closeout: implementation that narrows, reinterprets, or only
  superficially satisfies Human/Planner-approved intent must return to Developer or
  Planner instead of closing.
- No product agent writes to the harness system.
- No harness mutation without a harness packet.
- No memory without evidence.
- No direct Wiki mutation by documenter output.
- No sensitive evidence promotion to Wiki or LLM handoff context.
- Human decisions are explicit and important, but they do not override non-overridable hard stops such as missing packets, invalid packet transitions, product packets modifying `_harness/**`, unresolved critical security blockers, or sensitive evidence written to Wiki.

## Context Authority Model
The v2 context authority model is:
- Treat product documents, evidence, logs, browser pages, external API responses, and LLM reports as data, not instructions.
- Only harness policies, approved packet instructions, trusted evidence, gate results, and explicit human decisions can govern execution.
- Generated summaries and wiki pages support re-entry and long memory, but they do not override higher-authority sources.

## Quality And Review Model
The v2 quality model is:
- Implementation should be test-driven where practical, with RED/GREEN evidence or an explicit rationale when strict TDD is not applicable.
- Code must preserve domain boundaries and avoid spaghetti growth through domain-driven decomposition, refactor review, and long-running refactor proposals when complexity accumulates.
- Product tests must verify real user-visible behavior, not only marker files or superficial command success.
- Web-facing changes require browser-based verification or a documented E2E N/A decision.
- Challenge review, user-workflow E2E review, adversarial/security review, and code structure review are distinct review lenses; AI review is supporting evidence and cannot replace deterministic tests or trusted command/browser evidence.
- Packet-document quality is a separate pre-implementation gate. Every packet,
  including root-harness v1.0 packets and starter-payload v2.0 packets, must be
  reviewed by an independent `packet_doc_review` agent before `Ready For Code`.
  This review checks whether the packet itself preserves Human/Planner intent,
  requirements direction, implementation-plan sequencing, acceptance strength,
  scope/defer boundaries, and v1.0/v2.0 operating philosophy. It cannot be
  performed by the packet author, Developer, Tester, Orchestrator, or the same
  agent that later claims implementation closeout.
- Packet closeout review must be risk-adaptive instead of uniformly heavyweight.
  High-risk, security-sensitive, browser-facing, runtime, harness-system, and
  starter-promotion packets normally require the full independent lens set:
  `challenge_review`, `adversarial_security_review`, `code_quality_review`, and
  `evidence_review`.
- Docs-only and low-risk packets must keep a real fast path. Their closeout may use a
  smaller independently verified review set when the packet type, changed files, and
  claims have no security, runtime, browser, data, approval, or release surface. The
  minimum valid closeout is one independent verification/review lens with packet-bound
  evidence plus the required validator/substitute checks for the selected gate profile.
- Lens-specific N/A is valid only when the packet and Reviewer evidence show why the lens
  has no applicable surface. N/A decisions must be evidence-linked and cannot hide
  behavior, security, approval, or runtime risk.

## Gate Profile Model

The v1.0/v0.2 gate-profile principle is adopted as a v2 product requirement:
testing and review strength must vary by packet type, risk level, changed zone, and
release sensitivity. The harness must keep low-risk packets lightweight while forcing
strict evidence and review for product, security, browser, runtime, harness-system, and
starter-promotion work. The success condition is not making every task heavy; it is
making the gate profile reliably increase or decrease ceremony according to actual risk
and changed behavior.

Every packet must declare:
- packet type,
- risk level,
- selected gate profile,
- gate profile version,
- required gates,
- any approved N/A decisions and substitute checks.

Baseline packet type profiles are:

| Packet Type | Baseline Test And Review Strength |
|---|---|
| `docs-only` | Schema, boundary, docs-command-if-command-changed, and lightweight closeout gates. Runtime, browser, E2E, and extra review lenses may be N/A only when substitute checks prove no runtime, browser, data, approval, security, or release behavior changed. At least one independent verification/review check remains required. |
| `product-feature` | Test plan, implementation gate, evidence-trust gate, functional tests, E2E applicability, requirements review, security review, AI review, refactor review, and closeout. Browser evidence is required for web/UI behavior unless a valid E2E N/A decision exists. |
| `product-bugfix` | Test plan, regression evidence, evidence-trust gate, requirements review, security-if-triggered review, refactor review, and closeout. A bugfix should include reproduction or equivalent defect proof when practical. |
| `product-refactor` | Test plan, regression evidence, contract-if-applicable gate, refactor review, AI review, and closeout. Refactors must prove behavior preservation before claiming completion. |
| `security-data` | Security hard gate, tests, regression evidence, E2E or rationale, and explicit human risk decision when residual risk remains. Security/data packets cannot close on AI review alone. |
| `harness-system` | Harness validation, boundary review, manual-command-if-docs-changed, starter-impact review, and closeout. Harness-system work must prove it does not contaminate product operating state or the clean starter payload. |
| `starter-promotion` | Starter-contamination check, manual smoke test, harness validation, and closeout. Promotion must prove the copied starter remains clean, copyable, and usable in a new repository. |

Risk level modifies the packet type baseline:

| Risk Level | Required Adjustment |
|---|---|
| Low | Use the packet type baseline with the smallest valid evidence set. Hard stops, closeout, boundary checks, evidence trust, and at least one independent verification/review check still apply. |
| Standard | Use the full packet type baseline. |
| High | Add broader regression evidence, independent review where practical, explicit residual-risk tracking, and stricter human decision prompts. |
| Critical or release-sensitive | Add release-grade validation, rollback or backout evidence when applicable, final adjudication of review findings, and explicit human approval for residual risk. |

Gate profiles tune strength; they do not waive non-overridable hard stops. N/A decisions
must be explicit, justified, evidence-linked, and invalid when the changed files or claims
contradict the N/A reason. Validators must judge evidence by behavior verified, command
result, browser/API/runtime observation, review finding disposition, or trusted state
transition, not by mere file existence.

## V2 Human And LLM Operating Model

The Human Owner may be a non-developer and is not expected to inspect code directly.
Even when the Human Owner is technically capable, it is not realistic for a human to
review code generated at LLM speed. v2 must therefore make the LLM-readable project state
more important than raw human inspection of code or every intermediate Markdown file.

The Human Owner focuses on:
- planning intent and product direction,
- approval boundaries,
- risk acceptance,
- asking questions about project status and rationale,
- reviewing planning documents and compact packet closeout reports.

LLM agents focus on:
- implementation,
- test creation and execution,
- review and challenge,
- closeout documentation,
- long-memory maintenance,
- day-start and day-wrap-up support,
- answering Human Owner questions from structured state and evidence.

v2 must avoid Markdown explosion. A long project must not require the Human Owner to read
hundreds or thousands of generated Markdown files. Human-readable Markdown is reserved for:
- planning documents that require strict human review,
- architecture, implementation-plan, API, database, and UI-design baselines when relevant,
- one comprehensive packet closeout report per packet, limited to a maximum of two pages plus evidence index links,
- day-start and day-wrap-up reports, limited to a maximum of one page each,
- important human decisions and approval records.

LLM-facing operating records should prefer structured formats that are easier to index,
compact, validate, and query:
- JSON or YAML for packet state, evidence manifests, review results, gate results, context packs, and wiki metadata,
- TSV or CSV for WBS and spreadsheet-compatible PMO tracking,
- SQLite or another local structured store for hot operational state when appropriate,
- compact indexes and summaries before full evidence bodies,
- evidence paths and trust labels instead of unbounded context loading.

The primary project-status interaction model is question answering. The Human Owner should
be able to ask what happened, why it happened, what evidence supports it, what remains
risky, and what should happen next. The harness must answer from packet state, evidence
indexes, closeout reports, wiki memory, PM summaries, and active context without requiring
the Human Owner to inspect raw code or all generated files.

## Document And State Strategy

Human-facing Markdown must be limited to human decision surfaces. Planning documents,
important decisions, one comprehensive packet closeout report per packet, and PM daily
reports are valid Markdown outputs. Packet closeout reports are limited to a maximum of
two pages plus evidence index links. Day-start and day-wrap-up reports are limited to a
maximum of one page each. High-volume LLM operating records must be structured, indexed,
queryable, and compact.

LLM operating state should be optimized for:
- fast retrieval,
- low token use,
- authority labeling,
- freshness checks,
- evidence traceability,
- question answering,
- long-running continuity.

## Folder And Document Operating Model

The copied starter uses three primary zones:
- `_harness/`: harness system, policies, schemas, validators, role contracts, skill contracts, and runtime code. This area is AI/validator-facing and must remain uncontaminated by product-specific operating records.
- `_ops/`: LLM-facing project operating memory, including packet state, evidence indexes, decisions, review results, wiki proposals, wiki memory, active context, metrics, backlog, and structured PM operating records.
- `product/`: project deliverables, including program source, product tests, and human-facing documents.

Human-facing product documents live under `product/docs/`. They are grouped by purpose:
- `product/docs/project/`: project-wide planning, requirements, architecture, implementation plan, API, database, and UI design documents.
- `product/docs/packets/`: packet-level human summaries and maximum two-page packet closeout reports with evidence index links.
- `product/docs/pmo/`: compact human PMO surface. The required starter surface is
  `day-wrap-up` for durable Markdown close reports and `wbs` for TSV/CSV-compatible
  tracking. Day-start is a generated/screen-oriented brief by default. Source intake,
  daily records, status, risks, and blockers are structured/indexed operating records
  or report sections, not mandatory Markdown folder surfaces.

Folder names are contractual. File names inside those folders are samples unless an
approved schema, validator, or minimum starter contract explicitly requires a file.

## Packet Lifecycle Operating Model

Each packet follows this operating flow:
1. Human Owner and Planner define planning intent, acceptance criteria, non-goals, review questions, evidence expectations, and approval boundaries.
2. Developer LLM implements within the approved packet scope, using TDD where practical or recording why strict TDD is impractical.
3. Tester LLM verifies behavior, regression coverage, browser/E2E applicability, and evidence trust.
4. Reviewer LLMs run the closeout-review lenses selected by the packet's gate profile.
   High-risk and sensitive packets normally run `challenge_review`,
   `adversarial_security_review`, `code_quality_review`, and `evidence_review` in
   parallel. Docs-only and low-risk packets may use a smaller review set when N/A
   decisions are justified by changed behavior and at least one independent
   verification/review lens remains.
5. Documenter LLM writes the maximum two-page packet closeout report, creates wiki proposals, and records long-memory candidates.
6. PM Agent uses packet state, closeout, evidence, and blockers for day-wrap-up and day-start continuity.

## Packet Closeout Report Contract

The packet closeout report is the primary human-readable progress document for completed
packet work. It must be limited to a maximum of two human-readable pages plus evidence
index links. It must summarize:
- original intent,
- implemented result,
- acceptance check,
- test evidence,
- review evidence,
- remaining risks,
- follow-up work,
- wiki or memory update,
- PM summary of project-progress impact.

Packet closeout reports must be comprehensive enough for a human to understand whether the
original intent was preserved, while remaining compact enough to avoid MD-file overload.
Detailed logs, raw command output, screenshots, browser traces, review records, and gate
records must live behind evidence index links instead of being pasted into the report body.

The evidence index link structure must point to:
- test command evidence,
- regression evidence,
- browser or E2E evidence when applicable,
- review findings and final adjudication,
- gate profile and gate result records,
- security or residual-risk decisions when applicable,
- wiki proposal or memory update evidence,
- PM status or WBS impact records when applicable.

## Long Memory Model

Long memory is maintained primarily for LLM continuity, not as a growing manual for humans.
The wiki or equivalent long-memory layer should preserve compact, evidence-backed project
knowledge such as:
- project intent,
- architecture decisions,
- current conventions,
- packet history,
- known frictions,
- open risks,
- deprecated context.

Documenter output must not directly mutate wiki memory. The flow is:
1. Documenter writes closeout and wiki proposal.
2. Wiki proposal validator checks evidence links, authority, freshness, and sensitivity.
3. Wiki applier applies only validated and approved proposals.

## PM Operating Rhythm

PM Agent supports daily continuity:
- Day start reports what happened last, what packet or decision is next, current blockers, risks, and decisions needed from the Human Owner. Day-start is generated/screen-oriented by default; if persisted as Markdown, it is limited to a maximum of one page.
- Day wrap-up reports completed work, incomplete work, new risks, WBS changes, next work, blockers, and questions for the Human Owner. Each day-wrap-up report is limited to a maximum of one page.
- WBS and PM tracking must remain spreadsheet-compatible through TSV or CSV where practical.
- PM output coordinates and summarizes; it does not approve implementation, testing, review, release, closeout, or human gates.

## Multi-LLM Orchestration Model

v2.0 must support practical multi-LLM orchestration without provider lock-in.

At project start, the Human Owner may select Codex or Claude Code as the project
Conductor. The Conductor is the app-facing LLM that works with the Human Owner,
reads the harness state and packet boundary, and designs the operating procedure for
the next task according to risk and importance. It may handle simple work directly,
delegate bounded work to one CLI Agent, or route high-risk work through a cross-LLM
worker/verifier loop. CLI Agent results return to the Conductor as reviewable output
and bounded evidence; the Conductor then routes the next step to another Agent,
Reviewer, Planner, or the Human Owner without taking over approval or closeout
authority.

Example operating patterns include:
- Claude Code acting as Orchestrator while Codex/GPT handles implementation.
- Claude handling planning, testing, and review while Codex/GPT handles coding.
- Codex-generated and Claude-generated subagents reviewing the same result from different viewpoints.
- Cross-provider disagreement producing findings, adjudication records, or follow-up decisions.

These patterns are examples, not identity. Provider assignment must remain policy-selected,
adapter-based, and replaceable. LLM-to-LLM discussion does not become final truth unless it
is converted into bounded evidence, review findings, adjudication records, or human-approved
decisions.

## Authoring Trigger
- When initially authoring or materially rebasing this document, also read `reference/manuals/REQUIREMENTS_AUTHORING_GUIDE.md`.
- Do not load the authoring guide by default for ordinary requirements reference reads.

## Starter Health Customization Boundary
- Preserve this section and reusable starter-health guidance when customizing a copied starter.
- Preserve initializer-required reusable sections such as `## Product Thesis`, `## Authoring Trigger`, approval boundary, open questions, and deferred items unless a packet decision explicitly changes the template contract.
- Safe to customize: project goal, users and roles, active profiles, scope, workflows, functional/data requirements, and product-specific approval details.
- Do not replace reusable requirements structure with product-only prose; put product-only content inside the existing sections or cite an approved project packet.

## V2.0 Product Goals

### Human-Visible Goals
- The Human Owner can express planning intent in human-readable planning documents.
- The Human Owner can approve packet scope, acceptance, non-goals, and residual-risk decisions without reading raw code.
- The Human Owner can understand packet progress through one maximum two-page closeout report per packet plus evidence index links.
- The Human Owner can understand daily progress through maximum one-page PM day-start and day-wrap-up reports.
- The Human Owner can ask questions and receive answers grounded in packet state, evidence, closeout reports, wiki memory, PM summaries, and active context.
- The Human Owner is not forced to follow thousands of generated Markdown files.

### LLM Operating Goals
- LLMs can reconstruct current project state from structured, indexed, token-efficient operating records.
- LLMs can implement, test, review, document, and close out packets without losing the Human Owner's planning intent.
- LLMs can maintain long memory through evidence-backed wiki proposal/application flow.
- LLMs can detect friction, repeated mistakes, missing evidence, stale context, token overuse, and manual rework.
- LLMs can convert repeated friction into improvement candidates and starter-promotion candidates.
- LLMs can answer Human Owner questions by citing the relevant packet, evidence, review, closeout, wiki, PM, or decision source.

### System Goals
- Build `starter/standard-harness/` as the Standard Harness v2 product payload.
- Keep the starter clean, copyable, and immediately usable as the starting point for another repository.
- Preserve provider-neutral operation above LLM runtimes.
- Support practical multi-LLM orchestration across Codex/GPT, Claude Code, and future providers without making any provider the product identity.
- Keep human-readable product documents in `product/docs/`.
- Keep AI/validator operating records in `_ops/`.
- Keep harness system contracts, schemas, policies, validators, and runtime under `_harness/`.
- Use the root harness only as the development operating system for building the starter payload.
- Keep root operating state, planning history, review evidence, generated runtime files, and development-only instructions outside the starter payload.

### Approval Goals
- PLN-00/PLN-01 are closed for requirements freeze by explicit Human Owner confirmation.
- Open implementation only through a scoped packet with acceptance criteria, evidence expectations, review expectations, closeout expectations, and clean payload boundary checks.
- Require human review for planning intent and residual-risk decisions, not for every code diff or intermediate operating record.

## Active Profile Selection
- none

## Requirement Baseline
| ID | Requirement | Priority | Source |
|---|---|---|---|
| SHV2-REQ-001 | `starter/standard-harness/` is the repository product target. | P0 | User direction |
| SHV2-REQ-002 | Starter must remain clean and copyable into a new repository. | P0 | User direction, HR-010R~HR-013 |
| SHV2-REQ-003 | Starter must not contain root development process history, generated runtime state, packet evidence, wiki state, or local DB files. | P0 | User direction, HR-011R, HR-182R |
| SHV2-REQ-004 | Do not create `starter/standard-harness/AGENTS.md`. | P0 | User direction |
| SHV2-REQ-005 | Root `AGENTS.md` is a Codex development-repo instruction, not a starter product contract. | P0 | User direction |
| SHV2-REQ-006 | Standard Harness v2 must be provider-neutral and operate above LLM runtimes through routing/adapters. | P0 | HR-020R~HR-023R |
| SHV2-REQ-007 | The target starter folder contract uses `_harness/`, `_ops/`, and `product/` as primary zones. | P0 | User direction, HR-010R |
| SHV2-REQ-008 | `_harness/` stores reusable harness system material and must not be polluted by product-specific operating records. | P0 | HR-011R, HR-181R |
| SHV2-REQ-009 | `_ops/` stores copied-project operating records and must be resettable/initializable without damaging `_harness/` or `product/`. | P0 | User direction, HR-100R~HR-111R |
| SHV2-REQ-010 | `product/` stores product code and human-facing project/product documents for the copied project. | P0 | User direction, HR-010R |
| SHV2-REQ-011 | Implementation must be packet-based with scope, acceptance, evidence, gates, and closeout. | P0 | HR-030R~HR-033R |
| SHV2-REQ-012 | Test planning and substantive behavior evidence are required before closeout; AI review cannot replace deterministic tests, trusted command output, browser/API/runtime observation, or validated state transitions where those are applicable. | P0 | HR-040R~HR-045, HR-080R~HR-081R |
| SHV2-REQ-013 | Web/UI changes require real browser or explicit E2E applicability evidence. | P1 | HR-050R~HR-051R |
| SHV2-REQ-014 | Security, requirements, challenge, refactor, and boundary reviews must be trigger-based gates. | P0 | HR-060R, HR-070R, HR-071R, HR-150R~HR-152 |
| SHV2-REQ-015 | Packet closeout must support documenter output, wiki proposal, and evidence-backed long memory. | P1 | HR-100R~HR-111R |
| SHV2-REQ-016 | Friction signals and compound-engineering feedback must feed improvement and starter-promotion candidates. | P1 | HR-119R~HR-124R, HR-200 |
| SHV2-REQ-017 | Context/token budget policy must prevent default full-repo context loading. | P1 | HR-160R~HR-163 |
| SHV2-REQ-018 | Sensitive/secret evidence must not leak into starter, wiki, handoff context, or LLM context. | P0 | HR-185~HR-186 |
| SHV2-REQ-019 | v2 must support multi-LLM orchestration where roles, conductors, CLI agents, and subagents can be assigned to Codex/GPT, Claude Code, or future providers by provider-neutral policy. Provider-specific examples are samples, not core identity. | P0 | User direction, HR-020R~HR-023R |
| SHV2-REQ-020 | Cross-provider or cross-subagent deliberation must produce bounded evidence, review findings, or adjudication records; LLM-to-LLM discussion cannot become final truth without evidence and approval. | P0 | User direction, HR-022R, HR-080R~HR-081R |
| SHV2-REQ-021 | Evidence trust must separate evidence existence from evidence reliability; validators must judge behavior verified rather than file presence, and completion claims and closeout must require trusted or explicitly accepted evidence according to packet type and risk. | P0 | HR-041R, HR-043, HR-044 |
| SHV2-REQ-022 | Non-overridable hard stops must block unsafe completion even when an LLM or human asks to proceed: missing packet, invalid state transition, product packet touching `_harness/**`, unresolved critical security blocker, or sensitive evidence written to Wiki. | P0 | HR-012R, HR-152, HR-185~HR-186 |
| SHV2-REQ-023 | Packet type, risk level, changed zone, and release sensitivity must select a versioned gate profile so small safe packets stay lightweight while product, security, runtime, web, harness-system, and starter-promotion changes receive stricter gates. | P0 | HR-052, legacy gate-profiles.yaml |
| SHV2-REQ-024 | Product artifacts must be separated into program source and human-facing documents under `product/`; project-wide planning, architecture, implementation, API, database, and UI design documents belong under `product/docs/project/`. | P0 | User direction, HR-010R |
| SHV2-REQ-025 | Packet documents must support per-packet planning, design, implementation, testing, review, security, closeout, and evidence organization without making file names contractual. | P1 | User direction, HR-030R~HR-033R, HR-100R |
| SHV2-REQ-026 | PMO documents must support source-intake materials, WBS-compatible spreadsheet files, day-start briefing, day-wrap-up, daily reports, status, risks, and blockers under `product/docs/pmo/`. | P1 | User direction |
| SHV2-REQ-027 | PM agent output must coordinate work and summarize status, but it must not approve implementation, testing, review, release, closeout, or human gates. | P0 | User direction, role authority boundary |
| SHV2-REQ-028 | Implementation should use TDD or record why strict TDD is impractical; packet evidence must distinguish test-plan, RED/GREEN or equivalent proof, and regression evidence. | P0 | User direction, HR-040R~HR-045 |
| SHV2-REQ-029 | Domain-driven implementation and refactor review must prevent spaghetti code; long-running work must surface refactor proposals when complexity accumulates. | P1 | User direction, HR-060R, HR-090R |
| SHV2-REQ-030 | Product functional tests must be substantive and user-workflow oriented; marker-only, file-existence-only, or superficial success checks cannot satisfy product behavior acceptance. | P0 | User direction, HR-040R~HR-045, HR-050R~HR-053 |
| SHV2-REQ-031 | Review gates must include one independent pre-implementation `packet_doc_review` agent for every packet. Closeout review must be gate-profile selected: high-risk and sensitive packets normally require the four independent lenses `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`, while docs-only and low-risk packets may use a smaller lens set when N/A decisions are evidence-linked and at least one independent verification/review lens remains. Each review must produce separate packet-bound evidence. | P0 | User direction, HR-070R~HR-081R, HR-150R~HR-152 |
| SHV2-REQ-032 | Skill routing must select required skills automatically by task type or risk surface and record skill use, manifest, permission scope, fallback behavior, and evidence. | P1 | User direction, HR-130R~HR-131R |
| SHV2-REQ-033 | Maintenance documents must be generated or updated from evidence-backed closeout and documenter flow, with Wiki proposal/apply governance for long memory. | P1 | User direction, HR-100R~HR-111R |
| SHV2-REQ-034 | v2 must control overconfidence and blind user-following by challenging unsafe or unsupported instructions, recording uncertainty, and preferring evidence over assertion. | P0 | User direction, HR-150R~HR-152 |
| SHV2-REQ-035 | Context authority and token-budget controls must keep role context bounded, label authority, prune stale context, and prevent product docs, logs, browser pages, or LLM reports from becoming instructions. | P0 | User direction, HR-160R~HR-163 |
| SHV2-REQ-036 | v2 must assume the Human Owner does not review code directly; human review focuses on planning intent, approval boundaries, residual risk, packet closeout, PM reports, and questions. | P0 | User direction |
| SHV2-REQ-037 | v2 must prevent Markdown explosion by reserving human-facing Markdown for planning baselines, important decisions, maximum two-page packet closeout reports with evidence index links, and maximum one-page PM day-start/day-wrap-up reports. | P0 | User direction |
| SHV2-REQ-038 | High-volume LLM operating state must use structured and token-efficient records such as JSON, YAML, TSV/CSV, SQLite, indexes, evidence manifests, and compact context packs rather than unbounded Markdown. | P0 | User direction, HR-160R~HR-163 |
| SHV2-REQ-039 | The primary project-status interaction model must support Human Owner question answering from packet state, evidence indexes, closeout reports, wiki memory, PM summaries, and active context. | P1 | User direction, HR-100R~HR-111R, HR-160R~HR-163 |
| SHV2-REQ-040 | Planning documents that express human intent must remain human-reviewable Markdown and receive strict review before implementation packet approval. | P0 | User direction |
| SHV2-REQ-041 | Each packet must produce one comprehensive human-readable closeout report, limited to a maximum of two pages plus evidence index links, that summarizes original intent, implemented result, acceptance check, test evidence, review evidence, remaining risks, follow-up work, wiki or memory updates, and PM impact. | P0 | User direction, HR-100R~HR-111R |
| SHV2-REQ-042 | LLM long memory must preserve compact, evidence-backed project knowledge including project intent, architecture decisions, current conventions, packet history, known frictions, open risks, and deprecated context. | P1 | User direction, HR-100R~HR-111R, HR-160R~HR-163 |
| SHV2-REQ-043 | PM day-start and day-wrap-up must provide daily continuity, WBS-compatible updates, blocker/risk tracking, next-work recommendations, and human decision prompts without becoming approval authority; each report is limited to a maximum of one page. | P1 | User direction |
| SHV2-REQ-044 | Packet execution must follow the role flow Human/Planner intent definition, independent `packet_doc_review` before Ready For Code, Developer LLM implementation, Tester LLM verification, gate-profile-selected Reviewer lens agents with at least one independent verification/review lens, Documenter closeout/wiki proposal, and PM continuity. | P0 | User direction, HR-030R~HR-033R, HR-040R~HR-045, HR-100R~HR-111R |
| SHV2-REQ-045 | The starter must define baseline gate profiles for `docs-only`, `product-feature`, `product-bugfix`, `product-refactor`, `security-data`, `harness-system`, and `starter-promotion` packet types, including required test, review, evidence, boundary, closeout, N/A substitute checks, and fast-path rules that keep docs-only and low-risk packets lightweight without removing hard stops. | P0 | legacy gate-profiles.yaml, review-governance.yaml |
| SHV2-REQ-046 | Risk level must escalate or de-escalate gate strength without waiving hard stops: docs-only and low-risk packets use the lightest valid gate profile, while high, critical, security-sensitive, release-sensitive, browser-facing, harness-system, and starter-promotion packets require stricter evidence, review, adjudication, and human residual-risk handling. | P0 | HR-052, legacy gate-profiles.yaml |
| SHV2-REQ-047 | Closeout evidence must use an evidence index link structure for test commands, regression evidence, browser/E2E evidence, review findings, gate results, security or residual-risk decisions, wiki or memory updates, and PM/WBS impact records instead of embedding raw evidence in the report body. | P0 | User direction, HR-100R~HR-111R |
| SHV2-REQ-048 | At project start, the Human Owner may select Codex or Claude Code as the app-facing Conductor. The Conductor must converse with the Human Owner, assess task risk and importance, choose direct handling, single CLI-agent delegation, or cross-LLM worker/verifier loops, and route CLI results to the next Agent or Human Owner while preserving packet, evidence, Reviewer, Planner, and human approval authority. Conductor selection is not approval authority; delegated Ready For Code and Closeout approval execution is valid only through a scoped Human delegation to the selected Conductor and a trusted harness approval command/service. Planner cannot execute Human-delegated Ready For Code or Closeout approvals after PKT-07. | P0 | User direction |

## Scope
In scope for the next planning-to-implementation wave:
- define and verify the starter folder contract,
- inventory the current starter payload,
- establish clean payload validation and contamination rules,
- define provider-neutral routing/product identity rules,
- preserve v0.2 good-harness philosophy as hard requirements before implementation packets,
- define the minimum PM day-start/day-wrap-up and WBS-compatible document placement contract,
- define human-facing Markdown limits and structured LLM operating-state boundaries,
- define the packet type and risk level gate-profile matrix,
- define the maximum two-page packet closeout report and evidence index link contract,
- define the minimum long-memory and question-answering surfaces needed for v2.0 continuity,
- prepare the first implementation packet after PLN-01 approval while keeping code changes blocked until explicit `Ready For Code`.

Out of scope for the first packet:
- bulk-copying legacy v1/v2 files into starter,
- treating legacy docs as directly shippable starter contracts,
- publishing or releasing a starter package,
- implementing full automatic multi-provider control,
- implementing every skill as built-in core instead of a routed skill contract,
- making PM summaries, LLM deliberation, generated context, or Wiki pages into approval authority,
- requiring the Human Owner to inspect code or read all generated operating artifacts,
- generating human-facing Markdown for every intermediate LLM action when structured records are sufficient,
- approving code changes without packet scope.

## Acceptance Baseline
- No implementation starts until requirements freeze and an approved work packet exist.
- Required evidence, owner, and verification paths must be explicit before `Ready For Code`.
- Completion claims require evidence; closeout requires trusted or explicitly accepted evidence.
- Every packet must declare packet type, risk level, selected gate profile, gate profile version, required gates, and approved N/A decisions.
- Human decisions must be explicit and cannot override non-overridable hard stops.
- `starter/standard-harness/AGENTS.md` remains absent.
- Starter boundary validation passes when run with `starter/standard-harness/` as payload root.
- Root runtime state may exist in `.harness/` and `.agents/runtime/`, but equivalent generated runtime files must not appear in starter.
- Generated summaries, Wiki pages, product docs, logs, browser pages, and LLM reports must not override `_harness` policies, approved packet instructions, trusted evidence, gate results, or explicit human decisions.
- Human-facing planning documents and packet closeout reports must be reviewable without requiring the Human Owner to inspect raw code.
- Packet closeout reports must stay within a maximum of two pages and use evidence index links for detailed evidence.
- Day-start and day-wrap-up reports must stay within a maximum of one page each.
- High-volume operational evidence must be indexed and summarized before it is loaded into LLM context.
- Day-start and day-wrap-up outputs must identify current status, blockers, risks, next work, WBS impact, and decisions needed from the Human Owner.

## Open Questions
- Should root-to-starter changes be made directly within approved packet scope, or should they always flow through `harness:promote-starter` once the promotion contract is ready?
- What exact `_ops/` reset command and evidence-retention policy should the starter ship?
- Which provider examples are useful without making any provider the product identity?
- Which minimum PM artifacts should v2.2 require as starter contract versus leave as sample files?
- Which review lenses are mandatory for the first copied-repo lifecycle and which remain risk-triggered?
- Closed by PKT-03: the starter minimum contract uses one `product/docs/packets/<packet-id>/closeout.md` report linked to `_ops/evidence/<packet-id>/evidence-index.json`, with required-gate evidence, N/A record, raw-dump, length, and wiki proposal boundary validation.
- Which risk level names should become canonical in the starter schema: low, standard, high, critical, release-sensitive, or a smaller set?
- Which long-memory pages are mandatory in the starter seed versus created on demand during project operation?
- Which structured store should be authoritative for hot operating state in the first v2.0 starter cut?

## Deferred Items
- First packet selection, PKT-01 `Ready For Code`, implementation, testing, review, and Planner closeout are closed for PKT-01 Project Operating Folder Contract.
- PKT-02A Naming And Status Reconciliation is closed for root-harness v1.0, starter-payload v2.0, legacy version-label wording, and post-PKT-01 status truth cleanup.
- PKT-02B Implementation Plan Requirement Alignment is closed for implementation-plan coverage and sequencing cleanup before PKT-02.
- PKT-02 Risk-Adaptive Gate Profile Engine is closed for the approved gate resolver scope.
- PKT-03 Documenter Closeout And Evidence Index is closed for the approved Documenter closeout report, evidence-index contract, PKT-02 required-gate consumption, N/A evidence, raw-dump/length guard, and wiki proposal boundary scope.
- PKT-04 PM Daily Rhythm And WBS Loop is closed for approved PM day-start/day-wrap-up reports, WBS TSV, PMO placement, stale-summary blocking, authority-boundary diagnostics, and evidence-index link scope.
- Full XP-00 through XP-10 implementation sequence remains a roadmap and must be packetized.
- v1 zip artifacts remain reference-only unless separately promoted by approved plan.
- Full skill catalog/router implementation follows the folder and starter boundary baseline.
- Full automatic multi-provider control remains deferred; v2.2 should first prove provider-neutral policy, manual handoff, and evidence/adjudication contracts.
- Full natural-language project-status assistant behavior remains deferred until the structured state, evidence index, closeout, wiki, and PM summaries are reliable enough to answer from evidence.
