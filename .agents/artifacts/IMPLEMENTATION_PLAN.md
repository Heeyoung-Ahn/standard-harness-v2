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
- Require independent `packet_doc_review` before `Ready For Code` for every root-harness v1.0 and starter-payload v2.0 packet.
- Select closeout review lenses by gate profile: high-risk and sensitive packets normally
  require `challenge_review`, `adversarial_security_review`, `code_quality_review`, and
  `evidence_review`, while docs-only and low-risk packets keep a lightweight path with
  at least one independent verification/review lens plus evidence-backed N/A diagnostics.
- Use this implementation plan as the long-range sequencing map; individual packets own
  implementation approval.

## Optional Profile Activation
- none

## Current Iteration
- PKT-10 Compound Feedback And Starter Promotion is the active Orchestrator-routed
  implementation packet after explicit Human Owner Ready For Code approval on
  2026-06-29.
- PKT-01 Project Operating Folder Contract is closed for its approved scope.
- PKT-02A Naming And Status Reconciliation is closed for root-harness v1.0, starter-payload v2.0, and post-PKT-01 status truth cleanup.
- PKT-02B Implementation Plan Requirement Alignment is closed for its approved scope after Orchestrator closeout routing and Planner closeout.
- PKT-02 Risk-Adaptive Gate Profile Engine is closed after Orchestrator-routed implementation, testing, review, security evidence, and Planner closeout.
- PKT-03 Documenter Closeout And Evidence Index is closed after Orchestrator-routed implementation, testing, review, security evidence, and Planner closeout for closeout report/evidence-index behavior.
- PKT-04 PM Daily Rhythm And WBS Loop, PKT-04A PMO Surface And Reviewer Lens
  Alignment, PKT-04B Clean Starter Lifecycle Hardening, PKT-05 Long Memory And
  Question Answering Index, PKT-06 Provider-Neutral Orchestration Contract,
  PKT-07 Conductor Surface And CLI Worker Routing Loop, PKT-08 Risk-Adaptive Fast
  Path And Evidence Validation, PKT-09 Skill Routing And Operator Ergonomics, and
  PKT-09A Executable Skill Packages And Dual-Provider Skill Use are closed for their
  approved scopes.
- PKT-10 owns the Wave 9 SHV2-REQ-016 implementation lane for friction signals,
  recurring groups, improvement proposals, metrics, wiki/long-memory candidates, and
  starter-promotion candidates that stop at `approval-needed`.

## Dependency Order And Blocking Conditions
- Requirements freeze precedes architecture sync, implementation-plan sync, and packet
  implementation.
- PKT-01 folder contract is closed and remains the prerequisite for gate engine,
  documenter closeout, PM rhythm, long memory, provider orchestration, skill routing, and
  compound feedback work.
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
| Gate profile model | `gate-profiles.yaml` defines packet-type profiles, risk levels, overlays, review-lens triggers, and N/A rules. | PM and memory consumers still need to use the evidence index in later waves. | Keep PKT-02 resolver/validator behavior and PKT-03 closeout consumption; route PM consumption to PKT-04 and memory consumption to PKT-05. |
| Evidence and closeout | Closeout reports now target `product/docs/packets/` and validate linked `_ops/evidence/<packet-id>/` evidence indexes. PKT-04 PM reports and WBS output now cite evidence-index links. | Long-memory question answering does not yet consume the index. | Build long-memory source index next. |
| PM rhythm | PMO projection table/service exists, and PKT-04 adds one-page day-start/day-wrap-up report generation, PMO placement validation, stale-summary checks, authority-boundary diagnostics, and WBS TSV support. | Long-memory question answering still needs to cite PM summaries without treating them as truth authority. | Route PM-summary consumption to PKT-05. |
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

Implementation status: PKT-02 adds a root/starter gate profile engine contract. The root
runtime computes required gates in `.harness/runtime/state/gate-profile-engine.js` and
surfaces opt-in packet computation from packet preflight. The starter runtime mirrors the
same behavior in `standard_harness.policy.gate_profiles.GateProfilePolicy`, backed by
`_harness/policies/gate-profiles.yaml`.

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
- Every packet must pass independent packet-document review before Ready For Code, so
  requirements direction, implementation-plan sequencing, architecture/source SSOT,
  acceptance strength, verification scope, and v1.0/v2.0 operating philosophy are not
  weakened before implementation.
- Every packet closeout must produce the gate-profile-selected independent
  review/verification evidence. High-risk and sensitive packets normally require the full
  challenge, adversarial security, code quality, and evidence quality lens set; docs-only
  and low-risk packets may use a smaller set only when N/A decisions are evidence-linked
  and at least one independent verification/review lens remains.
- Security-data packets require security hard gate and human residual-risk decision when
  residual risk exists.
- Harness-system and starter-promotion packets require boundary/starter validation.
- N/A is rejected when changed files or claims contradict the N/A reason.
- Wave 2 provides the gate and role-evidence backbone for `SHV2-REQ-044`, but it does not
  close the full role-flow requirement by itself. Full closure also requires Documenter
  evidence from Wave 3, PM continuity evidence from Wave 4, and Orchestrator/provider
  routing evidence from Wave 6.

Verification:
- focused Python unit tests for gate resolver and validators
- starter CLI packet validation fixtures
- root `npm.cmd run harness:validate`

### Wave 3: Documenter Closeout And Evidence Index
Goal: turn packet completion into a compact human-readable report backed by structured evidence.

Implementation status: PKT-03 adds root/starter closeout report and evidence-index
contracts. The root runtime validates report placement, evidence index links, required
gate evidence quality, N/A records, raw dumps, length limits, and wiki proposal
boundaries in `.harness/runtime/state/closeout-evidence-index.js`. The starter mirrors
the behavior in `standard_harness.evidence.index.EvidenceIndexContract`,
`standard_harness.documenter.closeout_report.CloseoutReportDocumenter`, and
`standard_harness.wiki.proposals.validate_documenter_output_paths`.

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

Implementation status: closed by PKT-04 for the approved PM daily rhythm and WBS loop scope; PKT-04A narrows the starter PMO surface so high-volume PMO state stays structured instead of becoming many Markdown folders.

Scope:
- Day-start report: generated/screen-oriented brief by default; maximum one page if persisted.
- Day-wrap-up report: maximum one page.
- `product/docs/pmo/` required starter surface is compact: `day-wrap-up` for durable
  Markdown and `wbs` for TSV/CSV-compatible tracking.
- PMO source-intake materials, daily records, status, risks, and blockers are structured
  records, indexes, report sections, or optional exports without becoming mandatory
  Markdown folder surfaces.
- WBS and PM tracking remain TSV/CSV compatible.
- PM summaries coordinate; they do not approve implementation, testing, review, release,
  closeout, or human gates.

Implementation tasks:
- Add PM report generator from packet state, PMO projection, evidence index, source intake,
  status, blockers, risks, daily report records, and decisions.
- Add day-wrap-up output placement under `product/docs/pmo/`; day-start uses generated
  view placement unless a later packet explicitly selects a persisted export.
- Add WBS TSV update support.
- Add PMO placement/metadata validation for compact human folders, WBS TSV, generated
  day-start classification, and structured-state PMO records.
- Add freshness checks so stale PM summaries cannot override canonical state.

Acceptance:
- Day-start reports last state, next packet/decision, blockers, risks, and decisions needed.
- Day-wrap-up reports completed work, incomplete work, new risks, WBS changes, next work,
  blockers, and Human Owner questions.
- PMO source-intake materials, daily records, status, risks, and blockers have explicit
  structured or indexable references without requiring separate human Markdown folders.
- Each report stays within the one-page limit.
- PM outputs cite packet/evidence/state sources.

Verification:
- PM projection tests
- report length tests
- TSV generation tests
- PMO compact surface, structured-state, generated day-start, and legacy-folder tests
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

### Wave 6: Provider-Neutral Multi-LLM Orchestration And Conductor Routing
Goal: support Codex/GPT, Claude Code, and future providers above the LLM runtime layer.

Scope:
- Provider assignments are policy-selected examples, not product identity.
- Orchestration starts manual-first and adapter-backed, then can evolve into automated execution.
- Project startup can select Codex app or Claude Code app as the app-facing Conductor;
  the Conductor chooses direct handling, single CLI-agent delegation, or cross-LLM
  worker/verifier loops according to task risk and importance.
- LLM-to-LLM discussion becomes evidence only when converted into bounded review findings,
  adjudication records, or human-approved decisions.

Implementation tasks:
- Extend adapter manifest capabilities for roles, permissions, evidence modes, limitations,
  and failure modes.
- Add role routing policy for Planner, Developer, Tester, Reviewer, Documenter, PM, and
  Orchestrator.
- Add Conductor surface selection and routing policy that keeps app-facing conversation,
  CLI worker delegation, Conductor review, and next-Agent/User routing explicit.
- Add delegated approval validation so Ready For Code and Closeout approval execution can
  move from Planner to the selected Conductor only when a scoped Human delegation validates
  through a trusted harness approval command/service.
- Add cross-provider review/adjudication records.
- Add handoff prompt generation that preserves authority boundaries.

Acceptance:
- The harness can express "Claude as Orchestrator, Codex as Developer" as a policy example
  without making either provider the product identity.
- The harness can express "Codex app as Conductor, Claude Code CLI as worker, Codex CLI as
  verifier" and the inverse pattern without making any provider the product identity.
- Low-risk work may be handled by the Conductor, medium-risk work may be delegated to one
  CLI Agent, and high-risk work may require cross-LLM worker/verifier routing, all with
  packet and approval boundaries preserved.
- Conductor selection is stored separately from approval authority; selecting Codex app or
  Claude Code app as Conductor does not grant approval rights.
- Human direct approval remains the default, and Planner attempts to execute
  Human-delegated Ready For Code or Closeout approval are rejected with diagnostics.
- Provider-specific files do not become starter entry contracts.
- Cross-provider disagreement is captured as findings or adjudication, not final truth.

Verification:
- adapter manifest tests
- role routing tests
- adjudication record tests
- provider-specific contamination tests
- Conductor selection, delegated approval, Planner delegated-approval rejection, entry
  generation, manual-run fallback, command/path safety, and packet-authoring loop tests

### Wave 7: Risk-Adaptive Fast Path And Evidence Validation
Goal: make gate profiles increase or decrease ceremony according to real risk without
weakening hard stops, packet review, or behavior evidence.

Scope:
- Preserve independent `packet_doc_review` before Ready For Code for every packet.
- Keep docs-only and low-risk packets lightweight with the smallest valid closeout set.
- Require at least one independent verification/review lens for every packet closeout.
- Require evidence-linked N/A decisions for omitted closeout lenses.
- Reject fast-path claims when changed files, packet type, approval/security/runtime/data,
  browser, release, harness-system, or starter-promotion impact contradicts the fast-path
  rationale.
- Strengthen validators so behavior claims are proven by trusted command, runtime,
  browser/API observation, review disposition, or state-transition evidence, not by file
  existence alone.

Acceptance:
- valid docs-only and low-risk fixtures use the lightweight path successfully
- unsafe fast-path downgrade fixtures are rejected
- missing independent review/verification lens blocks closeout
- file-existence-only evidence cannot satisfy behavior verification
- high-risk and sensitive packets still enforce strict closeout behavior
- root and starter validation pass

Verification:
- gate profile selection tests
- review-lens selection and N/A diagnostic tests
- behavior-evidence validator negative tests
- root harness validation
- starter installed-runtime validation

### Wave 8: Skill Routing And Operator Ergonomics
Goal: make the harness usable in real projects without asking the Human Owner to know every skill.

Scope:
- Skills are selected automatically by task type, intent text, risk surface, role, and packet route.
- Skill execution records include permission scope, evidence contract, fallback behavior,
  and source authority.
- v1/current `.agents/skills` behavior is the priority source for starter skill
  contracts; superpowers patterns are absorbed only as optional external comparison
  source, not as a runtime dependency.

Implementation tasks:
- Harden skill catalog and router validation.
- Add task-to-skill coverage for planning, TDD, review, security, browser evidence,
  dependency audit, day start, day wrap-up, documenter, memory, and retrospective flows.
- Add process-priority ordering, bounded skill chaining, hard-gate diagnostics, and
  skill-use ledger output.
- Add CLI skill-route support for intent text without requiring the operator to know
  every skill name.
- Add handoff prompts that include only needed context.

Acceptance:
- Unknown required skills block with actionable diagnostics.
- Selected skills do not override packet, Planner, Tester, Reviewer, or human authority.
- Router tests prove Wave 8 intent coverage, hard-gate blocking, bounded chaining,
  no-superpowers runtime dependency, and ledger evidence.
- Skill routing avoids default full-context loading.

Verification:
- skill catalog tests
- routing negative tests
- hard-gate and chaining tests
- skill-use ledger tests
- context budget tests

### Wave 8A: Executable Skill Packages And Dual-Provider Skill Use
Goal: turn PKT-09 skill-routing contracts into complete structured skill packages that provider-neutral workers can actually use.

Scope:
- Build a definitive inventory from the 34 PKT-09 catalog skills, v1.0 root skills
  that fit v2.0, and selected superpowers absorption candidates.
- Create structured executable skill packages, not human-readable `SKILL.md` authority
  files.
- Ensure Codex App and Claude Code App Conductor routes receive the same provider-neutral
  selected package contract and record Conductor package-use evidence.
- Ensure Codex CLI and Claude Code CLI worker routes receive the same provider-neutral
  selected package contract from Conductor handoff and record worker package-use evidence.
- Keep superpowers plugin removal as a Human Owner action after LLM implementation and
  equivalence evidence.

Implementation tasks:
- Define package descriptor schema, package inventory disposition, and package registry
  behavior.
- Add package descriptors for `package-now` skills and merge/defer/reject rationale for
  all other candidates.
- Wire package descriptors into routing, worker handoff, hard-gate validation, and
  skill-use ledger output.
- Add selected-Conductor and dual-provider worker fixtures for automatic package selection/use.
- Add no-superpowers-runtime and removal-readiness evidence.

Acceptance:
- Every selected package is executable by structure: trigger, priority, authority,
  provider-worker use, evidence, fallback, chain, permission, and validation hooks.
- Catalog-only skills without package descriptors fail validation.
- Conductor fixtures prove provider-neutral package use for Codex App and Claude Code App examples.
- Worker fixtures prove provider-neutral package use for Codex CLI and Claude Code CLI examples.
- No-superpowers-required tests pass and deletion remains Human-owned.

Verification:
- package inventory tests
- package schema/registry tests
- selected-Conductor package-use tests
- dual-provider worker handoff tests
- hard-gate package evidence tests
- no-superpowers-runtime tests

### Wave 9: Compound Engineering And Starter Promotion Feedback
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
| SHV2-REQ-016 | Wave 9 | none | Friction, improvement proposal, metrics, and starter-promotion candidate tests pass under PKT-10 Compound Feedback And Starter Promotion; PKT-09 covers only skill routing that may trigger retrospective/learning routes. |
| SHV2-REQ-017 | Wave 5 | Wave 7 | Context pack, authority label, token budget, and skill-routing context tests pass. |
| SHV2-REQ-018 | Wave 1 | Wave 5 | Secret/sensitive evidence tests block starter, wiki, handoff, and LLM-context leakage. |
| SHV2-REQ-019 | Wave 6 | Wave 7 | Multi-provider role routing, Conductor selection, CLI-agent delegation, and adapter manifest tests pass. |
| SHV2-REQ-020 | Wave 6 | none | Cross-provider review/adjudication records prove LLM discussion is bounded evidence, not final truth. |
| SHV2-REQ-021 | Wave 2 | Wave 3 | Evidence trust validator blocks untrusted closeout according to packet type and risk. |
| SHV2-REQ-022 | Wave 1 | Waves 2, 3, 5 | Hard-stop negative tests block missing packet, invalid transition, forbidden `_harness` mutation, critical security blockers, and sensitive wiki promotion. |
| SHV2-REQ-023 | Wave 2 | none | Gate resolver computes versioned profile from packet type, risk level, changed zone, and release sensitivity. |
| SHV2-REQ-024 | Wave 1 | none | Product source and human document folder validation passes. |
| SHV2-REQ-025 | Wave 1 | Wave 3 | Packet document placement and closeout/evidence organization validation pass without making sample file names contractual. |
| SHV2-REQ-026 | Wave 4 | none | PKT-04 PMO placement, source-intake, WBS TSV, daily reports, day-start, day-wrap-up, status, risk, and blocker tests pass. |
| SHV2-REQ-027 | Wave 4 | Wave 6 | PKT-04 PM outputs are generated as coordination summaries and fail if treated as approval authority; Wave 6 owns provider-neutral orchestration boundaries. |
| SHV2-REQ-028 | Wave 2 | Wave 3 | TDD/test-plan evidence distinguishes RED/GREEN or rationale, regression evidence, and closeout support. |
| SHV2-REQ-029 | Wave 2 | Wave 8 | Domain/refactor gates and long-running refactor proposal checks pass. |
| SHV2-REQ-030 | Wave 2 | Wave 3 | Product functional-test validators reject marker-only or file-existence-only evidence. |
| SHV2-REQ-031 | Wave 2 | Wave 7 | Independent `packet_doc_review` blocks implementation transition when missing or non-pass; gate-profile-selected closeout lenses block closeout when required evidence is missing, duplicated, self-reviewed, unbound, or every independent verification/review lens is omitted. |
| SHV2-REQ-032 | Wave 8 | none | Skill router selects required skills by task/risk/role and records permission, evidence, manifest, fallback, and source authority. |
| SHV2-REQ-033 | Wave 3 | Wave 5 | Maintenance docs and wiki proposal/apply governance are generated from evidence-backed closeout. |
| SHV2-REQ-034 | Wave 2 | Waves 6, 8 | Review/adjudication and skill-routing tests record uncertainty and block unsupported or unsafe instructions. |
| SHV2-REQ-035 | Wave 5 | Wave 8 | Context authority, freshness, pruning, token budget, and untrusted-content tests pass. |
| SHV2-REQ-036 | Wave 3 | Waves 4, 5 | Human-facing closeout, PM report, and question-answering surfaces work without code inspection. |
| SHV2-REQ-037 | Wave 3 | Wave 4 | Closeout max two-page validator and PM max one-page validators pass. |
| SHV2-REQ-038 | Wave 1 | Waves 3, 4, 5 | High-volume operating state uses structured records, indexes, manifests, TSV/CSV, SQLite, and compact context packs. |
| SHV2-REQ-039 | Wave 5 | Wave 4 | Question-answering source index cites packet state, evidence, closeout, wiki, PM summaries, and active context. |
| SHV2-REQ-040 | Wave 0 | Wave 2 | Planning intent remains human-reviewable Markdown and implementation packets cannot proceed without reviewed planning baseline. |
| SHV2-REQ-041 | Wave 3 | none | Each packet can produce one max two-page closeout report plus evidence index links. |
| SHV2-REQ-042 | Wave 5 | Wave 9 | Long memory preserves compact evidence-backed project intent, decisions, conventions, packet history, frictions, risks, and deprecated context. |
| SHV2-REQ-043 | Wave 4 | none | PKT-04 day-start/day-wrap-up reports provide daily continuity, WBS updates, blockers, risks, next work, and human decision prompts within one page. |
| SHV2-REQ-044 | Wave 2 | Waves 3, 4, 6, 7 | Wave 2 supplies packet/gate/role evidence enforcement including independent pre-implementation packet review and closeout review-lens gates, but cannot close the requirement alone; full closure requires Human/Planner, Developer, Tester, Reviewer, Documenter, PM, Orchestrator, and risk-adaptive closeout evidence across Waves 2, 3, 4, 6, and 7. |
| SHV2-REQ-045 | Wave 2 | Wave 7 | Baseline gate profiles exist and are validated for all required packet types, including fast-path rules, N/A substitute checks, and minimum independent verification/review requirements. |
| SHV2-REQ-046 | Wave 2 | Wave 7 | Risk escalation/de-escalation tests prove hard stops cannot be waived and unsafe fast-path downgrade is rejected. |
| SHV2-REQ-047 | Wave 3 | Wave 4 | Evidence index links cover tests, regression, browser/E2E, reviews, gates, risk decisions, wiki/memory, and PM/WBS impact. |
| SHV2-REQ-048 | Wave 6 | Wave 8 | Conductor routing policy records app-facing Conductor selection, risk/importance routing choice, CLI worker/verifier assignment, Conductor review, and next Agent/User route without granting approval authority by selection alone. Delegated Ready For Code and Closeout approval execution requires scoped Human delegation to the selected Conductor through a trusted harness approval command/service, and Planner delegated-approval execution is rejected. |

## Packet Decision Gates For Open Questions
Open questions from `REQUIREMENTS.md` remain allowed planning questions, but they must not
silently block or rewrite packet scope. Each affected packet must either close its gate,
record a valid N/A or defer disposition, or route the decision back to Planner before
implementation starts.

| Open Question | Decision Gate | Affected Packet(s) | Required Disposition Before Ready For Code |
|---|---|---|---|
| Root-to-starter changes directly in packet scope vs later `harness:promote-starter` flow | Starter sync and promotion boundary gate | PKT-02, PKT-10 | PKT-02 must not imply promotion; PKT-10 owns reusable starter-promotion mechanics unless a future packet explicitly changes that boundary. |
| Exact `_ops/` reset command and evidence-retention policy | Operating-state reset and evidence-retention gate | PKT-03, PKT-04, PKT-05 | Packet must state whether `_ops` reset/retention behavior is in scope, N/A, or deferred to a named follow-up before implementation. |
| Provider examples that remain provider-neutral | Provider-neutral example gate | PKT-06 | Packet must classify provider examples as policy examples only and prove no provider-specific file becomes starter identity. |
| Minimum PM artifacts required as starter contract vs sample files | PMO artifact minimum-contract gate | PKT-04 | closed by PKT-04 with required PMO folders, WBS TSV columns, one-page report limit, stale-summary checks, evidence-index links, and coordination-only authority validation. |
| Mandatory packet-document review and risk-adaptive closeout lenses | Review-lens trigger gate | PKT-02, PKT-08 | Packet must preserve independent `packet_doc_review` as a baseline pre-implementation gate, require at least one independent verification/review lens for every closeout, preserve strict full-lens behavior for high-risk and sensitive packets, and define valid N/A substitute checks for omitted lenses. |
| Two-page closeout report template and evidence index schema | Closeout report and evidence-index schema gate | PKT-03 | closed by PKT-03 with report length validation, evidence-index links, required-gate evidence checks, N/A records, raw-dump guard, and wiki-proposal boundaries. |
| Canonical risk level names | Risk taxonomy gate | PKT-02 | Packet must decide or explicitly defer canonical risk names before implementing gate resolver behavior. |
| Mandatory starter long-memory pages vs on-demand memory | Long-memory seed gate | PKT-05 | Packet must define required seed pages or on-demand creation rules before memory snapshot/query behavior is implemented. |
| Authoritative hot operating state store | Hot-state authority gate | PKT-05, PKT-06 | Packet must state which structured state source is authoritative for the implemented behavior and how generated summaries remain read models. |

## Initial Packet Roadmap
| Order | Packet | Purpose | Risk Mode | Required Verification |
|---|---|---|---|---|
| 1 | PKT-01 Project Operating Folder Contract | Enforce clean starter folder semantics and reset/init boundary. | guarded | starter validation, folder policy tests, contamination checks |
| 2 | PKT-02A Naming And Status Reconciliation | Reconcile root-harness v1.0, starter-payload v2.0, legacy version-label wording, and current status truth. | contract | naming search, status parity, packet preflight, validator, root tests |
| 3 | PKT-02B Implementation Plan Requirement Alignment | Align requirement coverage, open-question gates, and packet ordering before PKT-02. | contract | requirement trace check, roadmap order check, packet preflight, validator |
| 4 | PKT-02 Risk-Adaptive Gate Profile Engine | Make packet type and risk level compute real required gates. | completed | gate resolver tests, packet validation tests, closeout negative tests, starter validation, full regression |
| 5 | PKT-03 Documenter Closeout And Evidence Index | Produce max two-page human closeout reports with linked evidence index. | completed | report schema/length tests, evidence index tests, wiki proposal tests, required-gate evidence tests, starter validation, full regression |
| 6 | PKT-04 PM Daily Rhythm And WBS Loop | Produce max one-page day-start/day-wrap-up reports and WBS TSV updates. | completed | PM report tests, WBS TSV tests, stale projection tests, authority-boundary tests, PMO placement tests, starter validation, full regression |
| 7 | PKT-05 Long Memory And Question Answering Index | Connect closeout, wiki, PM, evidence, and active context for compact answers. | guarded | memory/context tests, sensitive evidence tests |
| 8 | PKT-06 Provider-Neutral Orchestration Contract | Add manual-first multi-provider role routing and adjudication records. | guarded | adapter/routing tests, contamination tests |
| 9 | PKT-07 Conductor Surface And CLI Worker Routing Loop | Add app-facing Conductor selection, selected entry generation, CLI worker routing, packet-authoring review loop, Conductor adjudication, and delegated approval validation. | high | conductor selection tests, delegated approval tests, Planner rejection tests, worker routing tests, adjudication tests, entry/contamination tests, command/path safety tests, starter validation |
| 10 | PKT-08 Risk-Adaptive Fast Path And Evidence Validation | Keep docs-only and low-risk packets lightweight while enforcing hard stops, at least one independent verification/review lens, and behavior-based evidence validation. | high | gate profile tests, review-lens selection tests, N/A diagnostic tests, behavior-evidence negative tests, starter validation |
| 11 | PKT-09 Skill Routing And Operator Ergonomics | Make required skills discoverable, process-prioritized, and evidence-linked. | guarded | skill router tests, hard-gate tests, chaining tests, ledger tests, context budget tests |
| 12 | PKT-09A Executable Skill Packages And Dual-Provider Skill Use | Turn skill-routing contracts into complete structured packages that Codex/Claude Conductors and workers can auto-select and use. | high | package inventory tests, package registry tests, selected-Conductor tests, dual-provider worker handoff tests, no-superpowers-runtime tests |
| 13 | PKT-10 Compound Feedback And Starter Promotion | Convert friction into improvement and starter-promotion candidates. | guarded | friction/proposal tests, promote-starter smoke |

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
- independent `packet_doc_review` is missing, failed, pending, self-reviewed, or not tied to packet evidence,
- the packet does not name packet type, risk level, changed zones, acceptance criteria,
  evidence expectations, review expectations, and closeout expectations,
- a proposed change would copy v1 `.agents`, `.harness`, `AGENTS.md`, root runtime state,
  generated state, evidence, or history into starter,
- a product packet would mutate `_harness/**` without a harness-system packet,
- a PM, Documenter, Wiki, generated summary, or LLM discussion tries to become approval
  authority.

Stop before closeout when:
- any gate-profile-selected independent closeout review/verification artifact is missing,
  duplicated-agent, self-reviewed, unbound to packet evidence, pending, failed, or replaced
  by Orchestrator summary prose,
- Reviewer adjudication does not explicitly disposition the required lens outputs and any
  N/A substitute checks,
- Planner closeout would rely on tests, vocabulary alignment, or fluent explanation without
  source parity and evidence quality review.

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
- `PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION` is closed; latest closeout handoff is `planner -> planner`.
- Keep the reusable baseline on planning hold until a new approved lane is selected.
- Source packet: `reference/packets/PKT-10_COMPOUND_FEEDBACK_AND_STARTER_PROMOTION.md`.
- Preserve packet-before-code, active-context derived authority, generated-doc immutability, root/starter sync, Tester/Reviewer separation, and human approval gates.

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
