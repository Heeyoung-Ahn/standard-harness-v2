# Harness Operating Contract

## Status
- Active governance contract for root development harness v1.0 Codex-only operation.
- Replaces the prior planning-draft status.
- This document is a reusable harness operating contract, not a project architecture document.
- This document does not replace workflow-local role contracts, current execution state, or project-specific packets.

## Purpose
This document defines the reusable harness operating rules that must stay stable across Codex App workflows and projects:
- workflow-entry rules
- approval boundaries
- packet-before-code discipline
- baton rules
- role separation
- conflict resolution across PM, Orchestrator, evidence gates, and runtime state

## Canonical Authority
This document is canonical authority for:
- workflow route resolution before work starts
- when work must stop instead of guessing
- when Planner fallback is allowed
- approval-boundary rules shared across workflows
- packet-before-code discipline
- baton minimum fields for `Next Work`
- role separation between Planner, Developer, Tester, Reviewer, PM, Orchestrator, and release/deploy owners
- conflict resolution procedure when workflows disagree

## Non-Authority
This document is not authority for:
- downstream project technical architecture
- current execution state
- packet status
- DB hot-state
- explicit user approval records
- workflow-local implementation detail that belongs inside `.agents/workflows/*`

Execution-state sources may win for current route facts, but they cannot override explicit user approval boundaries, Planner-owned scope, Reviewer-owned conformance findings, Tester-owned test evidence, or this contract's stop rules.

## Workflow Entry Rule
When the user request does not name a workflow:
1. resolve the route from current state, active owner, explicit handoff, or approved routing evidence;
2. continue only when one workflow is clearly supported;
3. stop when the route is unclear.

Do not guess a workflow for implementation, modification, approval, or closeout work.

Before non-trivial or state-changing work, compare the literal user request with the active packet, current project direction, workflow procedure, domain terminology, approval boundary, security boundary, and known evidence gaps. If they conflict, propose the corrected interpretation or ask for confirmation instead of executing the literal request.

## Planner Fallback Rule
Planner fallback is allowed only for non-mutating work such as planning, review of scope or architecture meaning, requirements organization, and decomposition of follow-up work.

Planner fallback is not allowed for implementation, document/code mutation that needs approval, testing, review closeout, or approval-state changes.

## Approval Boundary
- Rough planning direction is not implementation approval.
- Detailed agreement approval is not `Ready For Code` unless explicitly stated.
- Human approval points must remain explicit for work that changes implementation, approval state, release behavior, data behavior, or user-facing behavior.
- No workflow may claim approval implicitly from context, baton wording, PM summaries, Orchestrator summaries, or generated state.

## Packet-Before-Code Discipline
- Implementation does not start before the active packet closes the required planning boundary.
- Workflow, validator, runtime, user-facing, deploy, migration, and data-impact work keep their packet and evidence requirements.
- When approved direction changes, planning artifacts and packet boundaries must be updated before implementation continues.
- Detailed Human/Planner intent is not optional implementation guidance. Developer and Reviewer must treat approved intent and packet acceptance as the work definition. An LLM may not narrow scope, reinterpret the acceptance target, substitute fixture-only evidence for real behavior, or close work because the implementation is easier than the approved plan.

## Mandatory Packet Document Review
Every packet must pass independent `packet_doc_review` before `Ready For Code`.
This applies to root-harness v1.0 packets and starter-payload v2.0 packets.

`packet_doc_review` checks the packet document itself, before implementation:
- Human/Planner intent is preserved without scope narrowing.
- Requirements, implementation plan, architecture/source SSOT, and packet acceptance align.
- v1.0 root-harness operating constraints and v2.0 product direction are represented when applicable.
- Deferred/out-of-scope items have named ownership and do not hide required acceptance.
- Verification and closeout evidence expectations are strong enough to catch implementation shortcuts.

The packet author, Developer, Tester, Orchestrator, generated summaries, and main-session
self-review do not count as the independent packet document reviewer. Missing,
self-reviewed, duplicated, or unbound `packet_doc_review` evidence blocks `Ready For Code`
and any `planner-to-developer` or `planner-to-orchestrator` transition.

## Skill Routing Audit
- Resolve matching skills from the active `.agents/skills/*/SKILL.md` surface before substantive work when the user request, active workflow, packet route, risk surface, or role task indicates skill use.
- Announce selected skills before substantive work.
- When multiple compatible skills apply, use the minimal compatible set and apply the strictest approval, security, packet, and role boundary.
- On state-changing work or workflow handoff, report a closeout audit of used skills, considered-but-skipped skills, and not-needed decisions.
- If skill routing is ambiguous, stop for clarification or route to the proper workflow owner instead of guessing.

## Baton Rule
`Next Work` must remain a compact baton, not a second authority layer.

Minimum baton fields:
- next workflow
- next first action
- required SSOT
- approval boundary / do-not-cross

Do not use baton text to redefine architecture, reopen approval, or override workflow contracts.

## Role Separation
- Planner closes scope, constraints, acceptance, and approval boundaries.
- Developer implements against approved SSOT and packet scope.
- Tester verifies against approved SSOT and hands defects back to Developer.
- Reviewer checks source parity, evidence quality, residual debt, and closeout readiness.
- PM coordinates delivery status, priority, blocker, and handoff readability.
- Orchestrator routes approved post-plan delivery across Developer, Tester, Reviewer, bounded remediation, and Planner closeout.
- Conductor executes Human-delegated Ready For Code and Closeout approvals only when a
  scoped Human delegation record validates through a trusted harness approval command or
  service.

No role may silently absorb another role's approval authority.

## Mandatory Independent Review Lenses
Every packet closeout must include four independent review lens agents:
- `challenge_review`
- `adversarial_security_review`
- `code_quality_review`
- `evidence_review`

These agents run in parallel when practical and produce separate packet-bound evidence. The
same agent must not satisfy more than one lens for the same packet, and Developer, Tester,
Orchestrator, and Planner output must not be reused as any of the four independent lens
results. Reviewer closeout may summarize and adjudicate the lens outputs, but it cannot
replace them.

Lens-specific N/A is allowed only when the independent lens agent records a concrete
no-surface rationale and evidence path. Missing, self-reviewed, duplicated-agent, or
unbound lens evidence blocks Reviewer closeout and Planner closeout for every packet.
The `challenge_review` lens must explicitly check for LLM convenience closeout: scope
narrowing, acceptance reinterpretation, fixture-only behavior, vocabulary-only
conformance, or premature completion claims against the Human/Planner-approved intent.

## Decision Authority Matrix
Use the decision type to choose authority. Do not use a single global priority list when the conflict is about route, scope, evidence, approval, or execution-state drift.

| Decision Type | Authority | Supporting Sources | Who Must Stop |
|---|---|---|---|
| Explicit user instruction in current turn | User | current conversation | all workflows if conflicting |
| Ready For Code or Closeout approval | User directly, or Conductor when a scoped Human delegation record validates through a trusted harness approval command/service | approval record, delegation grant, active packet, packet hash, evidence prerequisites | Planner, Developer, Tester, Reviewer, PM, Orchestrator |
| Release or residual risk approval | User, or the explicitly named approval actor in the active packet when delegated by user | approval record, active packet, residual-risk evidence | Developer, Tester, Reviewer, PM, Orchestrator |
| Scope, requirements, architecture, acceptance criteria | Planner | requirements, implementation plan, active packet | PM, Orchestrator, Developer |
| Current status, blocker, priority, handoff readability | PM | Active Context, current state, handoff, packet status | Orchestrator if packet is not approved |
| Approved post-plan delivery routing | Orchestrator | Ready For Code, active packet, handoff payload, transition runtime, evidence paths | PM after route is concrete |
| Implementation inside approved scope | Developer | packet, task brief, source files | PM, Orchestrator |
| Test execution and defect evidence | Tester | test plan, test output, validation report | PM, Orchestrator, Developer for pass/fail claims |
| Packet-document readiness before implementation | Independent packet document reviewer | `packet_doc_review` evidence, requirements, implementation plan, active packet, SSOT | Planner |
| Conformance, source parity, evidence quality, closeout readiness | Reviewer | reviewer report, four independent review-lens evidence artifacts, evidence package, SSOT | PM, Orchestrator |
| Generated context freshness | Runtime/context command | generated docs, DB, artifacts | all workflows until regenerated |
| Baton text | No independent authority | latest valid handoff only | all workflows if baton conflicts with higher authority |

## Conflict Resolution Procedure
When any workflow detects conflicting route, scope, approval, evidence, baton, generated state, or owner claims:

1. **Classify the conflict.** Use one of: `route_owner_conflict`, `approval_boundary_conflict`, `scope_or_ssot_conflict`, `evidence_gate_conflict`, `execution_state_drift`, `pm_orchestrator_collision`.
2. **Freeze unsafe mutation.** Stop code, document mutation, test-result claims, release action, and approval-state changes when the conflict affects scope, approval, data behavior, user-facing behavior, deploy behavior, or closeout.
3. **Collect minimum evidence.** Read only the minimum sources required: `.agents/runtime/ACTIVE_CONTEXT.json`, active packet, latest handoff payload, `.agents/artifacts/REQUIREMENTS.md`, `.agents/artifacts/IMPLEMENTATION_PLAN.md`, the relevant workflow file, DB/transition status command when route or lock is disputed, and original evidence path when a test/review/security result drives the route.
4. **Apply the Decision Authority Matrix.** Select the decision owner by conflict type. Do not choose the workflow that is most convenient.
5. **Emit a `CONFLICT_RESOLUTION_RECORD`.** The resolving workflow records the winning authority, chosen route, refused route, reason, required SSOT, evidence paths, approval boundary, do-not-cross, and next first action.
6. **Route only after the record is concrete.** If next workflow, next first action, required SSOT, evidence path, or do-not-cross boundary cannot be stated concretely, route to Planner or user instead of guessing.
7. **Regenerate summaries instead of editing them.** If Active Context or generated docs are stale, regenerate through harness runtime. Never manually edit generated summaries.

## PM / Orchestrator Collision Rule
When PM and Orchestrator both appear eligible:

1. If `Ready For Code` is missing or ambiguous, PM does not route Developer directly and Orchestrator does not start delivery. Route to Planner.
2. If the packet is not approved for post-plan delivery, PM owns coordination and may recommend the next workflow.
3. If the packet is approved, route payload is concrete, and evidence paths are available, Orchestrator owns post-plan delivery routing.
4. If PM recommends a route that conflicts with Tester, Reviewer, validator, or transition evidence, Orchestrator must follow the evidence or escalate to Planner/user.
5. If Orchestrator encounters scope change, residual risk acceptance, disputed SSOT applicability, repeated blocking finding, or closeout decision, Orchestrator stops and routes to Planner/user.
6. PM may summarize and reconcile status after Orchestrator routing, but PM may not override Orchestrator's approved delivery loop unless a higher authority conflict is recorded.

## CONFLICT_RESOLUTION_RECORD

- conflictId: `CFR-YYYYMMDD-<slug>`
- conflictType: `route_owner_conflict | approval_boundary_conflict | scope_or_ssot_conflict | evidence_gate_conflict | execution_state_drift | pm_orchestrator_collision`
- detectedBy: `<workflow>`
- blockedMutation: `yes | no`
- sourcesRead:
  - `<path or command>`
- winningAuthority: `<User | Conductor | Planner | PM | Orchestrator | Developer | Tester | Reviewer | Runtime>`
- chosenRoute: `<workflow>`
- refusedRoute: `<workflow or none>`
- routeReason: `<one sentence>`
- requiredSsot:
  - `<path>`
- evidencePaths:
  - `<path>`
- approvalBoundary: `<explicit boundary>`
- doNotCross: `<what the next workflow must not do>`
- nextFirstAction: `<concrete action>`

## Human-Facing Writing Rule
Human-facing canonical artifacts should use short, direct, action-oriented wording. They should make it easy to see what to do, when to stop, and what not to change. Use strict governance terms only when needed; when humans are expected to read a strict term, add a plain-language explanation next to it.

Machine-facing rules, validator rules, and workflow-internal rules may keep stricter terminology for precision.
