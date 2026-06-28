# System Context

This artifact is conditional canonical for long-term system boundary only when it is explicitly maintained and cited.

Use it to preserve:
- major system boundaries
- integration seams
- external dependencies
- ownership or hotspot mapping

Do not use it as current execution truth.

If it conflicts with `CURRENT_STATE`, `TASK_LIST`, packet status, DB hot-state, explicit user approval, or workflow handoff truth, those execution-state sources win.

## What To Record Here
- major subsystems and their responsibility boundaries
- external system integration points
- shared modules or services that multiple packets can affect
- ownership boundaries between runtime, product code, scripts, packaging, and operations
- hotspots where one change is likely to ripple into multiple files or workflows
- technical constraints that narrow implementation choices

## Good Development-Stage Examples
- A web app change also touches API handlers, background jobs, and notification delivery:
  record that request path, async processing, and outbound notification are one system boundary.
- A packet changes approval routing and also affects admin screens, permission checks, and audit logging:
  record that workflow state, authorization, and audit evidence are linked surfaces.
- A release/manual update also requires deployment config, onboarding docs, and environment checks to stay aligned:
  record that shipped docs, runtime configuration, and deployment validation form one delivery boundary.
- A domain packet depends on a legacy DB, an import script, and a reconciliation report:
  record the integration seam between product runtime, migration tooling, and external source-of-truth artifacts.
- A small change in summary formatting breaks dashboard parity or operator comprehension:
  record that generated summaries, operator-facing read models, validation output, and handoff surfaces are coupled outputs.

## Reusable Harness Boundary Notes

### Planner Packet Challenge Loop
- The packet-local evidence heading is `Planner Packet Challenge Review`.
- Planner packet quality, Ready For Code routing, packet-preflight implementation-transition checks, Reviewer closeout authority, and packet exit quality gate evidence are coupled control surfaces.
- Required challenge review is a packet-before-code boundary: low-risk padded `fast-path` work is exempt by default, while packet-path, strict-path, high/core/load-bearing/contract/release work needs independent/adversarial packet-quality evidence before implementation transition.
- Packet-preflight only enforces recorded challenge fields and deterministic guardrails; semantic judgment remains with the independent/adversarial reviewer, Planner revision, and Reviewer closeout hold authority.
- Reviewer may hold closeout when required challenge evidence is missing, failed, self-approved, lacks source refs/findings disposition, or leaves required corrections unresolved.

### Production-Forbidden Prototype Lane
- `prototypes/**`, separate prototype repos, and separate prototype worktrees are learning surfaces, not production implementation sources.
- Prototype packets own sandbox path, learning goal, CUJ/UX/customer-feedback evidence, production-copy prohibition, promotion target packet, and Modeling Impact requirement.
- Production packets may cite prototype learning, but production implementation must be re-approved under Modeling Impact and product packet scope before code is merged or reused.
- Reviewer closeout may hold when a packet claims prototype output as product verification, production readiness, release readiness, reusable implementation approval, or permits direct copy/merge into production.

### Shared Skill Marketplace Contract
- `reference/artifacts/SKILL_MARKETPLACE_CATALOG.md` is the compact discovery surface for reusable skills.
- Default context, default role briefs, and Planner read sets must not load all skill bodies.
- New projects receive pointers and selected active skills; skill bodies are loaded only when an active task, workflow, role, or user request triggers them.
- Skill output does not override packet authority, Ready For Code approval, Tester verification, Reviewer closeout, Planner closeout, or product acceptance.
- `conflict_resolver` remains minimum-contract-deferred for real multi-agent, multi-session, branch, queue, or merge collision handling until `OPS-SKILL-01A_CONFLICT_RESOLVER_MINIMUM_CONTRACT` or equivalent approval exists.

### Closeout Friction Evidence Surfaces
- npm registry diagnostics, browser evidence fallback, CSO/security review reports, serial/parallel batch plans, Orchestrator single-session closeout, packet-preflight, and command taxonomy are coupled operator-facing harness surfaces.
- npm TLS failures must distinguish Node/npm CA-chain trust from network/proxy failure; secure guidance must not recommend disabling SSL verification.
- Real-browser closeout evidence may use Codex Browser, Playwright, Edge CDP, or Chrome CDP, but pass evidence must exercise a local HTTP runtime URL instead of `file://`.
- Security review JSON should keep actual findings separate from deferred risks so out-of-scope rollout or promotion decisions do not inflate packet findings.
- Serial implementation is valid closeout evidence when the packet is intentionally not parallelized; a serial plan should state that no fan-out occurred rather than requiring mock parallel artifacts.

### Risk-Adaptive Gate Profile Engine
- Declarative gate policy lives in `starter/standard-harness/_harness/policies/gate-profiles.yaml`.
- Root computation lives in `.harness/runtime/state/gate-profile-engine.js` and is surfaced by packet preflight when a packet declares `Packet type`.
- Starter computation lives in `standard_harness.policy.gate_profiles.GateProfilePolicy`.
- Canonical base risks are `low`, `standard`, `high`, and `critical`; `normal` and `medium` map to `standard`, while `release-sensitive` is an overlay that escalates to critical-grade gates.
- N/A checks, changed-zone contradiction checks, and closeout missing/stale/untrusted gate diagnostics are coupled root/starter behavior and should stay parity-tested.

### PM Daily Rhythm And WBS Loop
- PM day-start is a generated/screen-oriented starter PMO brief under `_ops/views/pmo/day-start/` by default; PM day-wrap-up is the durable human Markdown output under `product/docs/pmo/day-wrap-up/`.
- PM reports are coordination-only; they must not approve implementation, testing, review, release, closeout, or residual risk.
- PM reports and WBS TSV rows must carry source or evidence links instead of raw evidence dumps.
- PM report validation treats stale source watermarks as blocking diagnostics.
- Required starter PMO folders are compact: `day-wrap-up` and `wbs`. Source-intake, daily records, status, risks, and blockers are structured/indexed state or report sections, not mandatory Markdown folders.

## What Not To Record Here
- today's active work item
- packet approval status
- temporary implementation checklist
- one-turn debugging notes
- exact current handoff owner
- narrow code diff detail that belongs in a packet, review note, or project history
