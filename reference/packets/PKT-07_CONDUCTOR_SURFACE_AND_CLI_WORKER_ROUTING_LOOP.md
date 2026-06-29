# PKT-07 Conductor Surface And CLI Worker Routing Loop

This is a Planner-opened packet for the next Wave 6 follow-up. It turns the latest
Human Owner direction into a concrete implementation boundary for app-facing Conductor
selection, dual-provider CLI worker routing, packet-authoring review loops, and delegated
approval execution.

This packet is Ready For Code by explicit Human Owner approval on 2026-06-29 after
independent `packet_doc_review` passed and pre-code authority-document contradictions were
resolved in the required SSOT surfaces.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root files may change only when the change supports starter v2.0 implementation, validation, or operation.
- v2.0 philosophy parity gate: this packet must preserve provider-neutral product identity, packet-before-code discipline, evidence-backed closeout, generated-state boundaries, context authority, clean starter portability, and explicit Human/Conductor approval boundaries.
- Provider examples gate: Codex app, Claude Code app, Codex CLI, and Claude Code CLI are allowed examples only. Provider-specific files, credentials, session state, or cache state must not become starter product identity.
- Gate status: pass for packet document review and Ready For Code. The packet follows
  closed PKT-06 and uses Requirements, Implementation Plan, Architecture Guide, latest
  Human Owner direction, explicit 2026-06-29 Human Ready For Code approval, and
  independent packet-document review as authority.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP | Build the practical Conductor and dual-provider worker operating loop that follows PKT-06. | selected |
| Ready For Code | approved | Explicit Human Owner approval was given on 2026-06-29 after independent `packet_doc_review` passed and required pre-code authority-document contradictions were corrected. | closed |
| Human sync needed | no | Human Owner approved Ready For Code and directed Orchestrator to proceed with PKT-07 after authority-document cleanup. | closed |
| Packet type | harness-system | The packet changes starter routing, authority, entry generation, worker delegation, evidence, and approval behavior. | selected |
| Risk level | high | Wrong authority modeling can bypass Human approval, weaken packet review, or make a provider-specific app the harness identity. | selected |
| Gate profile | contract | The packet defines reusable operating contracts and starter runtime policy. | selected |
| Route class | packet-path | Requires implementation, tests, review, independent lenses, and closeout evidence before claims. | selected |
| Change zone | core | Conductor approval and worker routing are core Standard Harness operating surfaces. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code approval, route Developer, Tester, Reviewer, bounded remediation, independent closeout lenses, and final Human or delegated-Conductor closeout approval through the approved delivery route. | selected |
| User-facing impact | low | The Human Owner-facing surface is CLI/service diagnostics, generated entry guidance, packet prompts, and approval records; no browser UI is added. | selected |
| Layer classification | core | This packet defines reusable core operating-layer behavior, not a project-specific feature. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | approved | No profile-specific evidence is required. | closed |
| UX archetype status | approved | No browser UI is required; the human-facing surface is CLI/service diagnostics, generated entry guidance, packet prompts, and approval records. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | approved | Local app and CLI surfaces are assumed to be user-installed and authenticated outside the repository; manual-run fallback remains valid. | closed |
| Domain foundation status | approved | The domain is Conductor selection, CLI worker routing, packet-authoring delegation, review/adjudication, and delegated approval execution. | selected |
| Authoritative source intake status | approved | Latest Human Owner direction is accepted as source intake for this packet. | selected |
| Shared-source wave status | not-needed | No sibling-project rollout is in scope. | closed |
| Packet exit gate status | pending | No implementation, verification, review, or closeout evidence exists yet. | pending |
| Existing system dependency | internal | Depends on PKT-06 provider orchestration contracts, packets, review records, evidence indexes, active context, starter init, and contamination checks. | selected |
| New authoritative source impact | analyzed | Human Owner changed approval authority: delegated Ready For Code and Closeout approval moves from Planner to Conductor. | selected |
| Risk if started now | high | Starting without packet-doc review and explicit approval could encode the wrong authority boundary or create provider-specific starter entry contracts. | selected |
| Packet doc review status | pass | Independent packet-document review passed and is recorded at `reference/reports/review/PKT-07-packet-doc-review.md`. | closed |

## Gate Profile Metadata
| Field | Value |
| --- | --- |
| Gate profile version | `harness-system@contract/v1` |
| Computed risk floor | high |
| Required gates | packet-doc-review; implementation-transition preflight; TDD red/green/refactor evidence; starter focused tests; starter regression; starter installed-runtime validation; root validation; root regression if root runtime/workflow docs change; security/adversarial review; provider/CLI surface review; four independent closeout review lenses; final approval-authority closeout |
| Approved N/A gates | browser evidence; deployment topology; release/publish; starter promotion; full automatic remote/cloud worker control |
| Packet-doc review requirement | mandatory before implementation transition; must be performed by an independent packet-document reviewer against Human Owner intent, Requirements, Implementation Plan, Architecture Guide, approval authority, acceptance strength, verification scope, v1 root constraints, and v2 product philosophy |
| Closeout lens requirement | mandatory before closeout; separate independent agents for `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review` |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Packet Scope; Problem Statement; Decision Gates; Acceptance Criteria; Verification Manifest; Planner Packet Challenge Review; Packet Document Review.
- Lane-type conditional sections: Feature Artifact Sync Matrix; Development Documentation Impact; Modeling Impact; Security Review Request; Provider/CLI Review.
- Lane-type not-needed sections: browser UI; release packaging; starter promotion; compound feedback.
- Planner packet challenge required: yes
- Work item title: Conductor Surface And CLI Worker Routing Loop
- Parent objective: Let the Human Owner choose Codex app or Claude Code app as the app-facing Conductor, route actual work to Codex CLI or Claude Code CLI workers when appropriate, and keep approval authority explicit.
- Scope boundary: Conductor selection, selected-provider entry generation for initialized projects, risk/importance routing policy, CLI worker assignment, packet-authoring dual-provider loop, Conductor adjudication, delegated approval records, and authority-boundary validation.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`; `starter/standard-harness/_harness/system/standard_harness/workflow/`; `starter/standard-harness/_harness/system/standard_harness/adapters/`; `starter/standard-harness/_harness/system/standard_harness/validation/`; `starter/standard-harness/_harness/system/standard_harness/starter/`.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md#multi-llm-orchestration-model`; `.agents/artifacts/ARCHITECTURE_GUIDE.md#provider-neutral-orchestration-architecture`; `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`
- Schema impact classification: high
- Schema impact note: Conductor selection records, delegated approval grants, routing decisions, worker task envelopes, packet-authoring review records, adjudication records, and generated entry metadata may require schema or validator updates.
- Authoritative source intake reference: latest Human Owner statements in this session about Codex/Claude app Conductor, CLI Workers, dual-provider packet creation, and Conductor-held delegated approvals.
- Authoritative source disposition: accepted for packet planning; implementation must update canonical authority docs and runtime behavior without granting implicit approval.
- Current implementation impact: approved for implementation transition; Ready For Code is explicit by Human Owner approval on 2026-06-29.
- Existing plan conflict: present. The previous initial roadmap used PKT-07 for Skill Routing. This packet should take PKT-07 because Conductor/worker routing must precede full skill-routing ergonomics. Skill Routing should move to a later packet unless Human Owner chooses otherwise.
- Impacted packet set scope: PKT-07 only. Skill Routing and Operator Ergonomics is deferred to a later packet.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed

## Problem Statement
PKT-06 built the lower provider-neutral orchestration contract: adapter manifests,
manual-run fallback, output envelopes, evidence provenance, and adjudication records.
It did not define the practical app-facing operating loop the Human Owner wants to use
day to day.

The Human Owner's target model is now clearer:
- At project start, choose Codex app or Claude Code app as the Conductor.
- The Conductor talks with the Human Owner and leads the project.
- For simple work, the Conductor may handle the work directly.
- For medium-risk work, the Conductor may route one CLI worker.
- For high-risk or important work, the Conductor may route a dual-provider loop where one CLI worker performs the work and the other independently verifies it.
- Packet creation can also use the dual-provider worker model: CLI Worker A acts as a Planner Agent, CLI Worker B acts as an independent `packet_doc_reviewer` Agent, and the Conductor reconciles their output into the final packet proposal.
- The approval authority previously given to Planner for Human-delegated Ready For Code and Closeout decisions must move to Conductor.

Without this packet, v2 still has a provider-neutral lower contract but no usable
Conductor-level operating workflow for real project startup, packet authoring, approval
delegation, or day-to-day routing.

## In Scope
- Add a project-start Conductor selection contract for Codex app or Claude Code app as replaceable provider examples.
- Record Conductor selection in structured starter operating state without making any provider the product identity.
- Generate only the selected initialized-project entry file when applicable:
  - Codex Conductor: project-root `AGENTS.md`.
  - Claude Code Conductor: project-root `CLAUDE.md`.
- Keep clean starter payload free of active provider-specific root entry files; reusable templates may live under `_harness/templates/` or another approved harness-system location.
- Ensure generated entry files point back to harness authority, packet boundaries, evidence gates, and Conductor/worker routing rules.
- Define risk/importance routing policy for:
  - Conductor direct handling,
  - single CLI Agent delegation,
  - cross-LLM worker/verifier loop,
  - dual-provider packet-authoring loop.
- Define CLI Worker A / CLI Worker B role assignment:
  - Worker A can be routed as Planner Agent for packet draft creation.
  - Worker B can be routed as independent `packet_doc_reviewer` Agent for packet review/challenge.
  - Other role assignments remain policy-selected and evidence-bound.
- Define Conductor adjudication records that reconcile Worker A and Worker B outputs without treating LLM consensus as truth.
- Move Human-delegated Ready For Code and Closeout approval execution from Planner to Conductor.
- Add scoped approval delegation records for Conductor approval:
  - delegating Human Owner,
  - Conductor identity/provider,
  - packet or packet class,
  - approval type,
  - risk ceiling,
  - validity window/session,
  - evidence prerequisites,
  - revocation state.
- Separate Conductor selection from approval authority. Selecting a Codex or Claude Code
  app Conductor does not grant approval authority by itself.
- Add trusted approval boundaries so only Human direct approval or a valid scoped
  Conductor delegation executed through trusted harness approval commands/services can
  create Ready For Code or Closeout approval records.
- Preserve Human direct approval as the default path.
- Preserve hard stops: missing packet, missing independent `packet_doc_review`, invalid transition, missing evidence, unresolved critical security blocker, sensitive evidence leakage, and provider-specific starter contamination.
- Add diagnostics when Planner, PM, Orchestrator, Worker, generated state, or LLM reports attempt to approve outside authority.
- Add focused tests for selection, entry generation, authority delegation, routing decisions, dual-provider packet authoring, adjudication, and fail-closed approval behavior.

## Out Of Scope
- No full automatic remote/cloud worker fleet.
- No browser automation of Codex app or Claude Code app.
- No credential capture, token storage, session cookie storage, provider cache storage, or provider login automation.
- No requirement that every copied project has Codex or Claude installed.
- No active `starter/standard-harness/AGENTS.md` or `starter/standard-harness/CLAUDE.md` as starter product identity.
- No bypass of provider subscription, terms, rate limits, approval prompts, or sandbox limits.
- No Skill Routing And Operator Ergonomics implementation beyond the hooks needed for Conductor/worker routing.
- No compound feedback, starter promotion, release, deployment, or publish behavior.
- No implementation approval by implication from this packet.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human Owner initializes a project, selects Codex app or Claude Code app as Conductor, optionally grants scoped approval authority, asks for a packet or task, and sees the Conductor route work to direct handling, one CLI Agent, or a cross-provider worker/verifier loop with evidence and approval boundaries preserved.
- API contract: runtime APIs or CLI output must expose Conductor id, provider label, selected surface, generated entry path, delegation grant id, risk/importance route decision, worker role assignment, input snapshot, output envelope refs, adjudication record, approval decision, and next route.
- Component responsibility: init/setup records Conductor selection; entry generator writes selected provider entry in initialized projects only; routing policy selects direct/single/dual path; adapter orchestration prepares worker requests; review/adjudication records disagreements; approval service validates Human or delegated Conductor authority; validators block unauthorized approvals.
- Data ownership: Conductor output, worker output, and adjudication are supporting evidence/read models; approved packets, trusted evidence, explicit Human decisions, valid delegation records, gate results, Tester evidence, Reviewer findings, and final approval records remain authority.
- Allowed dependency direction: setup/init, routing, adapter, validation, and approval services may read packet state, Conductor selection, delegation grants, adapter manifests, context snapshots, evidence records, and review records; canonical packet/evidence state must not depend on provider-specific output as approval authority.
- Public contract vs internal/scratch field: Conductor selection schema, delegation grant schema, routing decision schema, worker assignment envelope, adjudication record, approval diagnostics, and entry-generation boundary are public starter contracts; exact provider app behavior, CLI flags, and local provider cache layout are internal or configured outside the repo.
- Modeling risk: a convenient Conductor flow could accidentally make one provider the product identity, let Planner retain old delegated authority, skip independent packet review, or let Conductor approve without explicit delegation.
- Modeling disposition: implementation must fail closed unless selection, routing, packet review, evidence prerequisites, and approval delegation validate.

## Minimum Contract Sketch
The implementation must define explicit records or equivalent schema-backed state for the
following contracts. These sketches are minimum content, not final field names.

### ConductorSelectionRecord
- `conductor_id`
- `provider_example`: `codex` or `claude_code` as replaceable examples
- `surface`: `app`
- `selected_entry_file`: `AGENTS.md` or `CLAUDE.md`
- `selected_by`
- `selected_at`
- `status`: `active`, `changed`, or `revoked`

### ConductorApprovalActor
- `actor_type`: `human` or `conductor`
- `conductor_id` when `actor_type=conductor`
- `approval_channel`: trusted harness command/service, not LLM prose
- `authority_source`: Human direct decision id or delegation grant id

### DelegationGrantRecord
- `delegation_grant_id`
- `delegating_human_owner`
- `conductor_id`
- `packet_id` or packet-class scope
- `approval_type`: `ready_for_code`, `closeout`, or explicit future type
- `risk_ceiling`
- `evidence_prerequisites`
- `valid_from`
- `valid_until` or session/window boundary
- `status`
- `revoked_by`
- `revoked_at`
- `invalidated_reason`

Allowed delegation states:

```text
draft -> active -> consumed
draft -> active -> expired
draft -> active -> revoked
active -> invalidated_by_packet_change
active -> invalidated_by_risk_change
active -> invalidated_by_hard_stop
active -> invalidated_by_evidence_prerequisite_change
```

### RoutingDecisionRecord
- `routing_decision_id`
- `packet_id` or task id
- `risk_level`
- `importance_level`
- `selected_route`
- `rationale`
- `human_escalation_required`
- `selected_workers`
- `required_review_or_evidence`

### WorkerTaskEnvelope
- `worker_task_id`
- `assigned_role`
- `adapter_id`
- `provider_label`
- `input_snapshot_hash`
- `permission_roots`
- `context_refs`
- `expected_output_kind`
- `created_by_conductor_id`

### WorkerOutputEnvelopeRef
- `worker_task_id`
- `output_envelope_path`
- `artifact_manifest_refs`
- `evidence_refs`
- `diagnostics`
- `authority_level`: evidence/read-model only

### ConductorAdjudicationRecord
- `adjudication_id`
- `worker_outputs`
- `disagreements`
- `resolution`
- `unresolved_items`
- `next_route`
- `human_decision_required`

### ApprovalDecisionRecord
- `approval_decision_id`
- `approval_type`
- `actor`
- `authority_source`
- `packet_hash`
- `risk_level`
- `evidence_prerequisite_status`
- `decision`
- `created_by_trusted_harness_surface`

## Risk / Importance Routing Policy
The runtime policy must be deterministic enough to test. Exact product thresholds may be
configurable, but the first implementation must support this minimum decision table.

| Class | Typical Surface | Minimum Route | Human Escalation |
| --- | --- | --- | --- |
| R0 trivial | wording, formatting, non-authority note | Conductor direct handling with no approval-state mutation | no |
| R1 low | small docs/test addition without authority or runtime impact | single CLI worker or Conductor direct handling plus Conductor review | optional |
| R2 standard | normal feature, validator, or workflow behavior inside approved scope | implementer worker plus verifier or Conductor review | no unless residual risk appears |
| R3 high | approval, packet lifecycle, runtime routing, security, data, provider orchestration | cross-provider worker/verifier loop plus evidence gate | maybe; required for residual risk |
| R4 critical | approval authority migration, credential/session handling, release-sensitive behavior, hard-stop changes | dual-provider review plus explicit Human approval unless a valid scoped Conductor delegation specifically covers the action | yes by default |

Dual-provider packet authoring uses the same table. R3 and R4 packet drafts should default
to Worker A as Planner Agent and Worker B as independent `packet_doc_reviewer`, preferably
cross-provider when both providers are available.

## Trusted Approval Boundary
- Conductor selection is not approval authority.
- LLM output cannot create approval records.
- LLM output cannot transition packet state.
- LLM output cannot mark `packet_doc_review` as passed.
- Worker output that says Human, Planner, Reviewer, or Conductor approved something is stored only as untrusted evidence text unless a trusted harness approval command/service creates the approval record.
- Ready For Code and Closeout approval records must come from Human direct approval or a valid scoped Conductor delegation executed through a trusted harness surface.
- Delegation grants are invalidated when packet hash changes, risk level increases beyond the grant ceiling, approval type does not match, evidence prerequisites change, the grant expires, Human revokes it, or a hard stop appears.

## Entry File Safety Rules
Generated initialized-project `AGENTS.md` or `CLAUDE.md` files must include:
- a pointer to harness authority and the selected Conductor role;
- packet-before-code and evidence-gate rules;
- a statement that worker output is evidence/read-model only;
- a statement that approval requires Human direct approval or a valid scoped Conductor delegation;
- a warning that provider examples are replaceable and not product identity.

Generated entry files must not include:
- instructions to ignore harness rules or higher-authority sources;
- auto-approval instructions;
- claims that provider output is final truth;
- credential, session, cookie, cache, or local account paths;
- instructions to bypass `packet_doc_review`, evidence gates, security review, or hard stops.

## Command, Path, And Manual-Run Safety Requirements
- Untrusted prompts, packet text, worker role text, file paths, and generated commands must not be interpolated into shell commands.
- Provider CLI invocation, if implemented, must use trusted executable configuration, argument arrays, command allowlists, canonical working directories, timeout/cancel behavior, and temp-file or stdin style input passing.
- `Invoke-Expression`, shell-built command strings, path escapes, absolute evidence refs outside approved roots, and symlink traversal must be rejected.
- Manual-run bundles must distinguish `not_run`, `operator_reported`, `evidence_attached`, `verified_by_harness`, and `rejected`.
- `operator_reported` alone cannot satisfy pass evidence or approval-state mutation.

## Decision Gates
| Open Question | Packet Decision | Required Implementation Boundary | Status |
| --- | --- | --- | --- |
| Which role owns delegated Ready For Code and Closeout approval? | Conductor owns delegated approval execution. Planner no longer approves on behalf of Human. | Update requirements, architecture, operating contract, workflow contracts, validators, and transition diagnostics so Human direct approval or scoped Conductor delegation are the valid approval paths. | selected |
| Can packet creation itself use dual-provider workers? | Yes. Worker A may act as Planner Agent to draft; Worker B may act as independent `packet_doc_reviewer` to review/challenge; Conductor reconciles the final proposal. | Worker B must remain independent of Worker A and the Conductor adjudication must be recorded. Ready For Code still requires Human approval or valid Conductor delegation. | selected |
| Should clean starter ship active provider entry files? | No. Clean starter must not ship active `AGENTS.md` or `CLAUDE.md` as product identity. | Generate selected entry file only during copied-project initialization or explicit Conductor setup; keep reusable templates provider-neutral and inactive. | selected |
| How much real CLI execution is required? | Use PKT-06 manual-first execution contract. Optional local CLI execution may be used only when explicitly configured and safe; otherwise produce operator-run bundles. | Do not store credentials or fake provider success. Missing or unavailable CLI returns diagnostic/manual fallback. | selected |
| What happens to existing Skill Routing packet? | Defer Skill Routing And Operator Ergonomics to the next available later packet after Conductor routing is closed. | Implementation Plan roadmap must be updated during this packet before closeout. | selected |

## Development Documentation Impact
- Project overview impact: update-required if Conductor selection changes starter initialization guidance.
- Setup/dev environment impact: update-required for Conductor setup, provider entry generation, and CLI/manual-run worker guidance.
- Architecture doc impact: required; update provider-neutral orchestration architecture and authority model.
- Requirements doc impact: required; update SHV2-REQ-048 and approval authority wording.
- Implementation plan impact: required; revise PKT-07/PKT-08 sequence and closure evidence.
- Workflow/operating contract impact: required; update Planner, Conductor/Orchestrator-related authority boundaries, packet lifecycle, and Decision Authority Matrix.
- API/interface doc impact: contract-required for Conductor selection, delegation grant, routing decision, worker assignment, adjudication, and approval diagnostics.
- Testing doc impact: update-required if new CLI/test commands are added.
- Security/permission doc impact: review-required for delegated approval, provider entry files, local CLI use, and evidence redaction.
- AI/automation doc impact: update-required for Conductor, CLI worker, packet-authoring loop, and approval delegation.
- Required doc paths before Ready For Code: this packet; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`.
- Required doc paths before closeout: changed starter command/manual surfaces plus any workflow or setup documents touched by implementation.
- Docs must be updated before implementation: yes for approval-authority contradictions that would let Planner retain Human-delegated Ready For Code or Closeout approval authority.
- Docs must be updated before closeout: yes

## Data / Source Impact
- Layer classification: core
- Core / profile / project boundary rationale: Conductor and worker routing are reusable harness-system behavior, while chosen provider and generated project entry file are copied-project configuration.
- Active profile dependencies: none
- Profile-specific evidence status: approved
- UX archetype reference: not-needed; no browser UI is implemented by this packet.
- Selected UX archetype: not-needed
- Archetype fit rationale: human-facing effect is through app choice, CLI diagnostics, entry files, approval prompts, and packet documents rather than a browser UI.
- Environment topology reference: local-app-and-cli-boundary
- Source environment: user local machine or worktree with selected app and optional provider CLIs installed and authenticated outside the repository.
- Target environment: copied starter repository after initialization.
- Execution target: `starter/standard-harness/` runtime, starter init/setup behavior, and root governance/workflow docs that define reusable Standard Harness v2 authority.
- Transfer boundary: no external deployment or cloud transfer; local app/CLI execution remains user-installed and authenticated outside the repository, with manual-run bundles or bounded output envelopes crossing back into harness evidence.
- Rollback boundary: revert packet-scoped runtime, schema, validator, workflow, and documentation changes; remove only generated test/setup entry outputs created by the packet; never touch provider accounts, credentials, sessions, or caches.
- Root/starter parity status: required. Root workflow/authority docs and starter runtime behavior must agree without copying root AGENTS.md into starter.
- Security/data classification: approval-sensitive and provider-sensitive; no secrets or provider caches may enter starter, `_ops`, evidence, or generated context.

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Conductor selection at project start | Requirements, Architecture Guide, Implementation Plan, starter init/setup contract, tests | partial in Requirements/Architecture/Plan; runtime pending | Planner then Developer |
| Delegated approval moves from Planner to Conductor | Harness Operating Contract, workflow contracts, validation/transition diagnostics, approval records | not yet implemented; current docs still mention Planner delegation | Planner then Developer/Reviewer |
| Dual-provider packet authoring | Packet lifecycle docs, routing policy, packet_doc_review records, adjudication records | newly planned in this packet | Planner then Developer/Tester |
| Selected provider entry generation | starter templates, init command, contamination checks, setup docs | not implemented | Developer/Tester |
| Risk/importance routing policy | policy/schema/service/CLI diagnostics, tests | partially described; runtime pending | Developer/Tester |
| CLI worker output routing to Conductor | orchestration records, output envelopes, evidence/adjudication refs | PKT-06 lower contract exists; Conductor loop pending | Developer/Tester |
| Conductor identity and approval actor separation | schema/service/validation contracts, tests | planned in packet | Developer/Tester |
| Trusted approval boundary | transition/approval service validation, negative tests | planned in packet | Developer/Tester/Reviewer |
| Entry file safety and command/path safety | entry template validator, CLI execution guard, path canonicalization tests | planned in packet | Developer/Tester/Security Reviewer |

## Security Review Request
- Security review required: yes.
- Security review focus: delegated approval misuse, provider identity contamination, credential/session/cache exclusion, provider entry file generation, command injection, permission roots, path escape, output-envelope trust, sensitive evidence handling, and fail-closed approval diagnostics.
- Declared security-sensitive paths: `starter/standard-harness/_harness/system/standard_harness/adapters/**`; `starter/standard-harness/_harness/system/standard_harness/workflow/**`; `starter/standard-harness/_harness/system/standard_harness/validation/**`; `starter/standard-harness/_harness/system/standard_harness/starter/**`; generated entry templates and setup docs.
- Security evidence requirement: focused negative tests plus independent `adversarial_security_review`.
- Dependency/CLI review required: yes if implementation executes, shells out to, or documents required provider CLI commands.
- Security review status: pending.
- Security disposition: pending.

## Acceptance Criteria
- Project initialization or explicit setup can record one selected app-facing Conductor as a provider-neutral selection with Codex app and Claude Code app as replaceable examples.
- Clean starter does not contain active provider-specific root entry files.
- Initialized projects can generate only the selected entry file, `AGENTS.md` for Codex Conductor or `CLAUDE.md` for Claude Code Conductor, and that file points to harness authority instead of becoming product identity.
- Conductor selection and generated entry metadata are queryable from structured state.
- Conductor selection and Conductor approval actor are separate records or state concepts; selecting a Conductor app does not grant approval authority.
- Delegation grant records expose lifecycle states for draft, active, consumed, expired, revoked, packet-change invalidation, risk-change invalidation, hard-stop invalidation, and evidence-prerequisite invalidation.
- Risk/importance policy can choose Conductor direct handling, single CLI Agent delegation, cross-LLM worker/verifier loop, or dual-provider packet-authoring loop.
- CLI Worker A can be routed as Planner Agent for packet draft creation.
- CLI Worker B can be routed as independent `packet_doc_reviewer` Agent for packet review/challenge.
- Conductor adjudication reconciles Worker A and Worker B outputs and records unresolved disagreements without treating LLM agreement as truth.
- Human direct approval remains valid and default.
- Conductor can execute Ready For Code or Closeout approval only when a scoped Human delegation record validates.
- Planner cannot execute Human-delegated Ready For Code or Closeout approval after this packet is implemented.
- Delegation records include delegating Human Owner, Conductor identity, packet or packet class, approval type, risk ceiling, validity window/session, evidence prerequisites, and revocation state.
- Missing delegation, expired delegation, wrong Conductor, exceeded risk ceiling, missing packet-doc review, missing evidence prerequisite, or unresolved hard stop blocks Conductor approval.
- Existing packet hard stops remain non-overridable even when Human or Conductor requests approval.
- Worker output is ingested as bounded evidence, review findings, packet draft material, or adjudication input, not direct state truth.
- Worker output cannot create approval records, transition packet state, or mark `packet_doc_review` as passed.
- Approval decisions are accepted only from Human direct approval or valid scoped Conductor delegation through trusted harness approval commands/services.
- Provider CLIs unavailable or unauthenticated produce fail-closed diagnostics or manual-run bundles, not fake success.
- Generated entry files include required harness authority warnings and reject forbidden approval-bypass, provider-truth, credential-path, and packet-doc-review-bypass wording.
- Provider CLI command construction rejects shell interpolation, untrusted generated commands, path escapes, symlink escapes, and evidence refs outside approved roots.
- Manual-run fallback records cannot satisfy pass evidence until attached evidence is verified by the harness.
- Starter contamination checks reject active provider entry files, credentials, caches, local DBs, root state, and subscription artifacts in the clean starter payload.
- Requirements, Architecture Guide, Implementation Plan, Harness Operating Contract, and affected workflow contracts are updated before implementation transition when they contain approval-authority contradictions.
- Tests prove positive routes and negative authority/contamination cases.

## Verification Manifest
- Ready For Code: approved by explicit Human Owner approval on 2026-06-29.
- Required root validation: `node .harness/runtime/state/dev05-cli.js validate` or current root validation equivalent after implementation.
- Required root regression: `npm.cmd test` from the repository root when root harness runtime, workflow, validator, packet preflight, or shared test helpers change.
- Required validator: packet preflight plus harness validator/report must pass at implementation transition and closeout.
- Required starter validation: `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime` from `starter/standard-harness/`.
- Required standard-template validation: starter payload checks must pass from `starter/standard-harness/`; root-only evidence is insufficient.
- Required focused starter tests:
  - Conductor selection and query tests,
  - Conductor selection versus approval actor separation tests,
  - selected provider entry generation tests,
  - entry file required/forbidden pattern validation tests,
  - clean starter provider-entry contamination negative tests,
  - delegated approval grant validation tests,
  - delegated approval lifecycle and invalidation tests,
  - Planner delegated-approval rejection tests,
  - risk/importance routing policy tests,
  - trusted approval source rejection tests for LLM-authored approval claims,
  - CLI Worker A Planner draft routing tests,
  - CLI Worker B packet_doc_reviewer routing tests,
  - Conductor adjudication/disagreement tests,
  - unavailable CLI/manual-run fallback tests,
  - manual-run fake success rejection tests,
  - command injection and generated command rejection tests,
  - path traversal, symlink escape, and external evidence ref rejection tests,
  - worker output envelope authority-boundary tests.
- Required targeted validation: workflow authority, approval delegation, adapter routing, entry generation, validation diagnostics, security, and contamination tests.
- Required starter regression: `python -m unittest discover _harness\test` from `starter/standard-harness/`.
- Required packet preflight: planning-open before Ready For Code, implementation-transition after packet-doc review/approval, and closeout preflight after implementation evidence exists.
- Security: required for provider entry, delegated approval, CLI, and credential/session surfaces.
- Dependency/CLI surface review: required if implementation executes, shells out to, or documents provider CLI commands.
- Browser: not-needed; no browser UI automation is in scope.
- Browser evidence required: no
- Browser evidence status: not_required
- Browser evidence N/A rationale: PKT-07 changes starter runtime contracts, setup/entry files, CLI/service diagnostics, and approval/routing records only; it adds no browser UI, DOM flow, route, or visual behavior.
- Review closeout: Reviewer must check source alignment, acceptance evidence, delegated approval authority, provider neutrality, security/adversarial risk, docs parity, contamination checks, and the packet-bound results of `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`.
- Active context refresh: regenerate Active Context and validation report after state-changing transitions.

## Verification Scenarios
| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| Codex app selected as Conductor | Structured state records Codex as replaceable Conductor example and entry generation targets initialized-project `AGENTS.md`. | selection/entry tests |
| Claude Code app selected as Conductor | Structured state records Claude Code as replaceable Conductor example and entry generation targets initialized-project `CLAUDE.md`. | selection/entry tests |
| Clean starter scan | Active `AGENTS.md` or `CLAUDE.md` is absent from clean starter payload. | contamination test |
| Human grants Conductor Ready For Code delegation for one packet | Conductor approval validates only for that packet, approval type, risk ceiling, and validity window. | delegation test |
| Planner attempts delegated Ready For Code approval | Approval is rejected with authority diagnostic. | negative authority test |
| Conductor attempts Closeout approval without delegation | Approval is rejected. | negative authority test |
| Worker A drafts packet as Planner Agent | Draft output is recorded as packet draft evidence, not final approval. | worker routing test |
| Worker B reviews packet as packet_doc_reviewer | Review output is recorded as independent packet-doc review evidence. | packet_doc_review test |
| Worker A and Worker B disagree | Conductor adjudication record captures disagreement and routes unresolved decision to Human or authorized Conductor. | adjudication test |
| CLI unavailable | Harness produces manual-run fallback diagnostic and no success claim. | availability negative test |
| Generated entry tries to override harness authority | Validator rejects the entry template or setup output. | entry validation test |
| Worker output claims Human approval | Output is stored only as untrusted evidence text and cannot create approval state. | trusted approval negative test |
| Packet hash changes after delegation | Existing delegation is invalidated before approval execution. | delegation invalidation test |
| Risk rises above delegation ceiling | Conductor approval is rejected. | delegation invalidation test |
| Generated entry path escapes project root | Entry generation is rejected. | path traversal test |
| Symlink points entry or evidence output outside approved roots | Output is rejected. | symlink escape test |
| Untrusted prompt appears in shell command string | CLI execution is rejected before process launch. | command injection test |
| Manual-run bundle reports success without attached verified evidence | Result remains non-passing and cannot approve state. | manual-run fallback test |

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer.
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: latest Human Owner direction; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`.
- Challenge status: pass
- Parent objective coverage: the packet covers the missing Conductor-level operating loop after PKT-06 and captures the latest Human Owner authority decision.
- Deferred scope with named follow-up: PKT-08 owns Skill Routing And Operator Ergonomics; PKT-09 owns Compound Feedback And Starter Promotion; FUTURE-PKT-REMOTE-WORKER-CONTROL owns remote/cloud worker control if separately approved.
- Acceptance proves behavior change: acceptance requires Conductor selection records, selected entry generation, delegated approval validation, worker routing, packet-authoring review loop, adjudication, fail-closed diagnostics, and contamination tests.
- Failure fixture or failure condition: fail if Planner can still approve on behalf of Human, Conductor can approve without scoped delegation, clean starter ships active provider entry files, `packet_doc_review` can be skipped, provider output mutates state directly, or provider-specific identity becomes product identity.
- Reviewer closeout hold basis: Reviewer may hold closeout for unclear delegation boundaries, provider-specific starter contamination, missing negative tests, stale docs, missing packet-doc review, or scope creep into full skill routing.
- First-wave limit check: this packet proves the Conductor-level control loop and authority transfer, not full skill auto-routing or remote worker fleet automation.
- Guidance-only sufficiency rationale: guidance-only is insufficient; runtime policy, validation diagnostics, structured records, entry generation, and tests must change after Ready For Code.
- Challenge evidence artifact path: `reference/packets/PKT-07_CONDUCTOR_SURFACE_AND_CLI_WORKER_ROUTING_LOOP.md`
- Findings disposition: no blocking findings for packet opening after explicitly adding authority transfer, dual-provider packet authoring, selected entry generation boundary, fail-closed delegated approval, and deferred skill-routing scope.
- Required corrections applied: applied in this planning draft.
- No self-approval claim: this challenge does not close Human Ready For Code, replace independent packet-doc review, replace Tester evidence, replace Reviewer closeout, approve release, approve closeout, or approve starter promotion.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: independent-packet-doc-review-agent
- Packet doc reviewer independence basis: read-only reviewer of the packet document and listed SSOT refs only; not the packet author, Planner, Developer, Tester, Orchestrator, generated summary, or Conductor adjudicator.
- Packet doc review evidence path: `reference/reports/review/PKT-07-packet-doc-review.md`
- Packet doc review status: pass
- Packet doc review second-pass status: pass after Planner hardening additions
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass; PKT-07 preserves the Conductor/worker direction and explicitly treats old approval-authority wording as source drift to update.
- Implementation-plan sequencing alignment: pass; the packet identifies the PKT-07 numbering conflict with Skill Routing and defers Skill Routing because Conductor routing belongs before full ergonomics.
- Architecture/source SSOT alignment: pass; packet scope matches provider-neutral Conductor architecture, bounded worker output, adjudication, entry-file contamination limits, and packet-doc review gates.
- Human/Planner intent preservation: pass; it preserves app-facing Conductor choice, CLI worker routing, dual-provider packet authoring, and the move of Human-delegated approvals from Planner to Conductor.
- v1.0 root-harness operating constraint coverage: pass; packet preserves packet-before-code, no implicit approval, independent packet_doc_review, generated-state read-model boundaries, and no implementation before explicit Ready For Code.
- v2.0 product philosophy coverage: pass; packet keeps provider examples replaceable, clean starter free of active provider identity files, worker output as evidence/read models, and hard stops non-overridable.
- Acceptance strength: pass; acceptance covers positive routes and negative authority/contamination cases, including Planner rejection, scoped delegation validation, unavailable CLI fallback, adjudication, and provider-output authority boundaries.
- Verification scope strength: pass; verification requires root/starter validation, packet preflight, starter regression, focused tests, security review, provider/CLI review, closeout lenses, and explicit negative scenarios.
- Deferred/out-of-scope ownership: pass; deferred Skill Routing, compound feedback/starter promotion, remote/cloud worker control, and browser automation are named with follow-up ownership or future-packet boundaries.
- Required corrections: not-needed from the independent packet-document reviewer. Planner added non-blocking hardening details after review for approval actor separation, delegation lifecycle, routing determinism, entry-file safety, and command/path safety.
- Findings disposition: no blocking packet-document findings; Human Owner approved Ready For Code on 2026-06-29 after required pre-code authority-document contradictions were corrected.
- No self-approval claim: this packet_doc_review is a document-readiness judgment only and does not approve implementation, close Human approval, replace Planner authority, replace Tester/Reviewer evidence, or close the packet.

## CSO Security Review
- Security review evidence status: pass
- Security review evidence scope: Conductor delegated approval authority, Human hard-stop boundary, provider-neutral Conductor selection, CLI worker routing, command descriptor safety, entry-file generation, path escape hardening, read-model ledger events, and worker output trust boundary.
- Security review report path: reference/reports/security/PKT-07-security-review.json
- Security review decision: pass
- Security review mode: scoped
- Required CSO phases: 0,1,2,5,8,12,13,14
- Finding quality required: file,line,evidence_quote_redacted,confidence,phase,fingerprint,exploit_scenario,impact,recommendation
- Accepted-risk authority: final Human or valid delegated-Conductor closeout approval only
- Redaction status: raw-secrets-blocked
- Declared security/release paths: starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py; starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py; starter/standard-harness/_harness/system/standard_harness/adapters/contract_matrix.py; starter/standard-harness/_harness/system/standard_harness/state/replay.py
- Findings disposition: no blocking findings remain; future real Codex CLI or Claude Code CLI process execution requires a new command/process-isolation review.

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: parallel
- challenge_review agent: 019f1130-cf81-7462-91b4-e7cf6d14e874
- challenge_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- challenge_review evidence path: `reference/reports/review/PKT-07-independent-closeout-lenses.md`
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review limitations: none
- challenge_review reviewer disposition: pass after durable Conductor ledger, worker envelope/adjudication, command/path safety, and root validation drift remediation.
- challenge_review not applicable rationale:
- adversarial_security_review agent: 019f1130-e38d-7d71-81eb-4554e2efcf57
- adversarial_security_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- adversarial_security_review evidence path: `reference/reports/review/PKT-07-independent-closeout-lenses.md`
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review limitations: Windows symlink privilege skip is non-blocking because the regression exists and runs when host permissions allow symlink creation.
- adversarial_security_review reviewer disposition: pass after trusted delegation, verified evidence prerequisites, real-path hardening, unsafe command descriptor blocking, and root validation remediation.
- adversarial_security_review not applicable rationale:
- code_quality_review agent: 019f1130-f8a8-7721-9681-5499c0ef28a0
- code_quality_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- code_quality_review evidence path: `reference/reports/review/PKT-07-independent-closeout-lenses.md`
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review limitations: none
- code_quality_review reviewer disposition: pass after persisted/queryable state, hard-stop checks, delegation lifecycle, and worker envelope remediation.
- code_quality_review not applicable rationale:
- evidence_review agent: 019f1131-0d9d-7393-8f82-14ea605d9194
- evidence_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- evidence_review evidence path: `reference/reports/review/PKT-07-independent-closeout-lenses.md`
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review limitations: Windows symlink privilege skip is non-blocking; closeout authority remains separate from review evidence.
- evidence_review reviewer disposition: pass after four-lens report creation, root validation pass, expanded test evidence, security review, and updated packet evidence.
- evidence_review not applicable rationale:

## Refactor / Residual Debt Disposition
- Expected refactor pressure: moderate. Authority and routing logic likely crosses workflow, validation, starter init, and adapter modules.
- Residual debt allowed before closeout: none for approval-authority contradictions, provider identity contamination, skipped packet-doc review, or delegated approval validation.
- Named deferrals: Skill Routing And Operator Ergonomics; compound feedback and starter promotion; full remote/cloud worker control; browser automation of provider apps.

## 15. Packet Exit Quality Gate
- Packet exit metadata identifier: packet-exit-metadata
- Packet exit metadata version: standard-harness-packet-exit/v1
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: approved
- Packet exit metadata exit recommendation: approved
- Source parity result: pass
- Packet exit metadata source parity result: pass
- Validation / security / cleanup evidence: pass
- Packet exit metadata validation / security / cleanup evidence: pass
- Implementation delta summary: Added provider-neutral Conductor selection, initialized-project entry-file generation/validation, trusted delegation grant and approval decision records, Planner delegated-approval rejection, Human hard-stop validation, deterministic Conductor routing, worker task envelopes, worker output refs, adjudication records, Conductor ledger/read-model events, replay allowlist coverage, adapter real-path hardening, and provider execution command descriptor blocking.
- Refactor / residual debt disposition: no in-scope residual debt for approval authority, provider identity contamination, packet-doc review, delegated approval validation, worker output authority, or command descriptor safety; future real CLI process launch remains a named future security/command-isolation scope.
- Documentation impact / docs parity result: pass; Requirements, Implementation Plan, Architecture Guide, Harness Operating Contract, Planner workflow, packet, TDD evidence, Developer report, Tester report, CSO report, artifact-sync report, and independent closeout lens report were updated.
- Deferred follow-up item: Skill Routing And Operator Ergonomics packet after Conductor routing closes.
- Closeout notes: implementation, tests, security review, root validation, starter validation, and four independent closeout lenses pass. Final closeout approval remains subject to the active Human or valid delegated-Conductor approval boundary.

## Reopen Trigger
- Reopen this packet if Human Owner changes Conductor authority, supported provider surfaces, packet-authoring workflow, selected entry file policy, delegated approval scope, or CLI execution assumptions.
- Reopen if provider terms, Codex app/CLI behavior, Claude Code app/CLI behavior, adapter execution mode, credential/session handling, or output envelope shape changes in a way that affects this packet.
- Reopen if any reviewer finds provider-specific identity leakage, skipped packet-doc review, unauthorized approval, credential exposure, direct state mutation, fixture-only evidence, or scope creep into deferred skill routing.

## Planner Handoff
- Current owner: Orchestrator.
- Current status: Ready For Code approved by explicit Human Owner decision on 2026-06-29; pre-code authority-document contradictions resolved.
- Next recommended workflow: Orchestrator.
- Next first action: run implementation-transition preflight, then route Developer for PKT-07 implementation against this packet and listed SSOT.
- Required SSOT: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/rules/HARNESS_OPERATING_CONTRACT.md`; `.agents/workflows/planner.md`; `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`; this packet.
- Approval boundary: implementation may start only through Orchestrator after implementation-transition preflight passes. Do not close the packet, accept residual risk, release, publish, promote starter, or claim completion until Developer, Tester, Reviewer, four independent closeout lenses, security/provider review, validation evidence, and final Human or valid delegated-Conductor closeout approval are present.
