# PKT-25 Provider Topology And Real-Smoke Contract

> PLANNING PACKET. Drafted by Planner for Ready-For-Code preparation only.
> Implementation, approval-state mutation, testing, and closeout remain blocked until
> independent packet challenge, independent `packet_doc_review`, and explicit
> `Ready For Code` approval are recorded.

## Purpose
Make provider topology a first-class starter contract so a copied project can record a
project-level Conductor inside a packet-scoped topology record and assign packet roles to
Codex CLI or Claude Code CLI per packet without relying on hard-coded role/provider
assumptions.

This packet directly addresses the A-lane E2E finding where the real-smoke validator
looked for `Reviewer=claude_code` even when the requested topology was
Conductor=`codex`, Worker 1=`codex`, Worker 2=`codex`. The local override
`reviewer_provider=codex` proved the behavior target, but the reviewed surface remains
too ad hoc and stringly typed for a durable v2.0 product contract.

## Source Intake
| Source | Planning impact |
|---|---|
| User decision: two packets | Split topology contract from closeout-ledger/productization governance. |
| User decision: Ready For Code 직전 수준 | Draft packet definition only; do not approve or start implementation. |
| User decision: project-start conductor, packet-level worker1/worker2 | Add explicit schema, CLI, persistence, and validation targets. |
| User decision: first Conductor is Codex; packet instructions can assign PM, Planner, Developer, Documenter, Tester, and Reviewer roles to Claude Code CLI or Codex CLI per packet | Expand topology from fixed worker slots to packet-scoped role assignments, while retaining worker aliases for compatibility. |
| User decision: mixed-provider review should be possible, for example one Claude Code CLI reviewer and one Codex CLI reviewer | Add multi-reviewer assignment shape with independent reviewer ids, lenses, providers, and evidence refs. |
| A-lane E2E review | Preserve `Reviewer=claude_code` default but support codex/codex topology through declared topology, not an ad hoc reviewer override. |
| PKT-20 closeout | Real authenticated provider readiness was not proven; this packet must not claim provider readiness without bounded smoke evidence. |
| Requirements `SHV2-REQ-048` | Conductor routing records must preserve provider-neutral identity and approval boundaries. |
| Human Owner decision after Remediation 4 challenge hold | A1/A9 are explicitly re-scoped to packet-scoped topology records; project-start UI/init flow productization remains outside PKT-25 unless a later packet approves it. |

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT` | First-class provider topology and real-smoke contract hardening. | selected |
| Ready For Code | approved | Human Owner explicitly approved PKT-25 RFC on 2026-07-01 and requested Orchestrator routing. | approved |
| Human sync needed | `no` | User decisions are captured; RFC remains a separate explicit approval boundary. | closed |
| Gate profile | contract | Harness-system topology and smoke validation surfaces require strict contract gates. | selected |
| User-facing impact | `no` | No product UI or browser-facing runtime is changed by this packet. | closed |
| Layer classification | `harness-system` | Starter `_harness`, CLI, schema, and provider-policy surfaces are in scope. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | approved | No optional profile evidence is required; this non-dependency was reviewed before RFC. | approved |
| UX archetype status | approved | This is not a UX/UI implementation packet; UX N/A is reviewed and closed before RFC. | approved |
| UX deviation status | none | No UX archetype applies. | closed |
| Environment topology status | approved | Project-level conductor and packet-level role/worker topology are explicitly scoped and reviewed. | approved |
| Domain foundation status | approved | No product domain foundation is changed; N/A disposition is reviewed before RFC. | approved |
| Authoritative source intake status | approved | User decisions, repo-bound A-lane source summary, PKT-20 closeout, and requirements are mapped. | approved |
| Shared-source wave status | approved | No sibling rollout or shared-source promotion is included; N/A disposition is reviewed before RFC. | approved |
| Packet exit gate status | pending | Exit evidence is required after implementation and review. | pending |
| Existing system dependency | starter _harness provider/adaptor surfaces | Topology must bind to existing provider manifest and conductor-worker surfaces. | selected |
| New authoritative source impact | analyzed | The A-lane E2E finding is evidence input only and does not approve implementation. | closed |
| Risk if started now | high | Implementation changes harness-system provider topology and smoke validation behavior. | hold until RFC |

## Packet Context
- Packet ID: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
- Packet type: `harness-system`
- Risk level: `high`
- Risk class: `high`
- Change zone: core
- Layer classification: `harness-system`
- Gate profile: `contract`
- Gate profile version: `harness-system@1+high@1+contract-boundary`
- Changed zones: starter `_harness`, starter tests, CLI/operator docs, provider topology schema/policy
- Delivery route mode: orchestrated-closeout
- Route class: packet-path
- Required reading before code: `.agents/runtime/ACTIVE_CONTEXT.json`; `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/workflows/orchestrator.md`; `.agents/workflows/developer.md`; `.agents/workflows/tester.md`; `.agents/workflows/reviewer.md`; `reference/reports/review/PKT-25_26-role-topology-planner-challenge-rerun.md`; `reference/reports/review/PKT-25_26-role-topology-packet-doc-review-rerun.md`.
- UX archetype reference: `not-needed; no product UI or browser-facing runtime is changed.`
- Selected UX archetype: `not-needed`.
- Environment topology reference: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md#proposed-contract`.
- Source environment: `root development harness and copied-starter provider/adaptor policy surfaces`.
- Target environment: `starter/standard-harness/_harness provider topology, CLI, schema, policy, and tests`.
- Execution target: `local root harness tests plus copied-starter validation where packet implementation touches starter surfaces`.
- Transfer boundary: `root development repo changes may update starter payload surfaces only; no release, publish, deployment, or sibling rollout is approved`.
- Rollback boundary: `revert PKT-25 implementation changes to provider topology schema, CLI, policy, tests, and docs; preserve packet/review evidence history`.
- Domain foundation reference: `not-needed; no product domain foundation is changed`.
- Schema impact classification: high
- Authoritative source intake reference: `reference/reports/artifact-sync/PKT-25_26_PROVIDER_TOPOLOGY_AND_CLOSEOUT_LEDGER.md`; `reference/reports/source/PKT-25_26_A_LANE_SOURCE_SUMMARY.md`.
- Authoritative source disposition: `approved`.
- Current implementation impact: `new first-class provider topology schema, persistence, CLI/operator docs, validation, and real-smoke readiness behavior must be implemented after Orchestrator routing`.
- Existing plan conflict: `none; PKT-25 refines Wave 6 provider-neutral orchestration direction without making Codex or Claude Code product identity`.
- Impacted packet set scope: multi-packet
- Authoritative source wave ledger reference: reference/reports/artifact-sync/PKT-25_26_PROVIDER_TOPOLOGY_AND_CLOSEOUT_LEDGER.md
- Source wave packet disposition: PKT-25 selected for topology implementation; PKT-26 dependent consumer for closeout-ledger productization
- Required gates:
  - independent Planner Packet Challenge Review before RFC
  - independent `packet_doc_review` before RFC
  - implementation-transition preflight after RFC
  - focused topology schema/service/CLI tests
  - fail-first real-smoke regression for the codex/codex reviewer mismatch
  - delegated approval hard-stop regression
  - starter validation and contamination check
  - security/authority-boundary review
  - closeout lenses: `challenge_review`, `adversarial_security_review`, `code_quality_review`, `evidence_review`
  - Reviewer adjudication and Planner closeout
- N/A decisions:
  - product UI/browser runtime testing is N/A because this packet changes provider topology and smoke contract surfaces, not a product UI.
  - release, publish, starter promotion, productization-complete, User UAT, and residual-risk acceptance are not approved.
- Route intent after RFC: `planner-to-orchestrator`
- Delivery mode: `orchestrated-closeout`
- Starter impact: yes
- Provider identity impact: high; provider-specific examples must remain adapter policy, not product identity
- Ready For Code status: `approved`

## In Scope
- Add a first-class provider-topology contract for copied-starter operation:
  - project-level `conductor` recorded inside a packet-scoped topology record;
  - this project starts with `conductor.provider=codex`;
  - packet-level role assignments for `project_manager`, `planner`, `developer`,
    `documenter`, `tester`, and `reviewer`;
  - optional `worker1`/`worker2` aliases for backward-compatible two-worker packet
    instructions;
  - multi-reviewer assignments where each reviewer has an independent reviewer id,
    lens, provider, and evidence reference.
- Add schema and validation for supported provider ids, roles, reviewer entries, worker
  aliases, and packet topology shape.
- Bind provider ids to adapter/provider manifest records such as
  `starter/standard-harness/_harness/system/standard_harness/adapters/manifest.py`
  and provider orchestration policy surfaces. Codex and Claude Code values are examples
  and supported local providers, not product identity or hard-coded starter defaults.
- Add CLI or command-surface support for setting and reading:
  - project conductor;
  - packet role provider assignments at packet instruction time;
  - packet multi-reviewer assignments;
  - optional packet worker aliases when the packet needs worker-slot wording.
- Replace ad hoc real-smoke inputs such as `reviewer_provider` with a topology-derived contract, while keeping backward-compatible default behavior where no explicit topology exists.
- Update real-smoke readiness and captured-output validation so it consumes the declared topology consistently.
- Add negative checks for unsupported providers, blank provider values, mixed legacy/topology fields, duplicate or ambiguous role assignments, missing reviewer independence fields, and role/provider evidence mismatches.
- Preserve delegated-approval boundaries: Conductor selection does not grant approval authority by itself.

## Out Of Scope
- Actual release, publish, starter promotion, or distribution.
- Broad closeout ledger remediation; owned by PKT-26.
- Claiming real authenticated provider readiness unless bounded real-smoke evidence is successfully produced inside this packet.
- Implementing a new provider adapter beyond currently supported local provider manifests and fixtures.
- Product survey app implementation; that remains the existing `PKT-24_SURVEY_APP_WEB_REVIEW` lane.

## Proposed Contract
Minimum topology record:

```json
{
  "projectTopology": {
    "conductor": { "provider": "codex", "adapterId": "codex-cli-local" }
  },
  "packetTopology": {
    "roles": {
      "project_manager": { "provider": "codex", "adapterId": "codex-cli-local" },
      "planner": { "provider": "claude_code", "adapterId": "claude-code-local" },
      "developer": { "provider": "codex", "adapterId": "codex-cli-local" },
      "documenter": { "provider": "codex", "adapterId": "codex-cli-local" },
      "tester": { "provider": "codex", "adapterId": "codex-cli-local" },
      "reviewer": [
        {
          "reviewerId": "reviewer_a",
          "provider": "claude_code",
          "adapterId": "claude-code-local",
          "reviewLens": "packet_doc_review"
        },
        {
          "reviewerId": "reviewer_b",
          "provider": "codex",
          "adapterId": "codex-cli-local",
          "reviewLens": "challenge_review"
        }
      ]
    },
    "workerAliases": {
      "worker1": { "role": "developer" },
      "worker2": { "role": "reviewer", "reviewerId": "reviewer_b" }
    }
  }
}
```

Contract rules:
- `projectTopology.conductor.provider` is recorded and reported as part of a
  packet-scoped provider topology record in project operating state.
- The first Conductor value for this planning lane is `codex`; that is a packet-scoped
  project-topology configuration example, not starter product identity, a global default,
  or a completed project-start UI/init flow.
- `packetTopology.roles` is packet-scoped and may differ per packet instruction.
- Supported packet role keys are `project_manager`, `planner`, `developer`,
  `documenter`, `tester`, and `reviewer`.
- Non-reviewer roles resolve to exactly one provider assignment per packet.
- `reviewer` may resolve to one or more reviewer assignments; each reviewer assignment
  must include a unique reviewer id and a review lens so mixed-provider review can be
  audited independently.
- `workerAliases.worker1` and `workerAliases.worker2` are compatibility aliases only;
  the canonical execution meaning comes from `packetTopology.roles`.
- Role names are logical duties; provider ids are runtime/adaptor choices.
- The default topology remains backward compatible with existing sample behavior.
- Unsupported provider ids fail closed before smoke execution.
- A role or reviewer evidence record must match logical role, provider, adapter id,
  reviewer id when present, and declared evidence reference.

PKT-25 must emit a topology evidence envelope that PKT-26 can consume without redefining
topology. Minimum fields:

```json
{
  "schemaVersion": "standard-harness-provider-topology-evidence/v1",
  "packetId": "PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT",
  "projectTopology": {
    "conductor": { "provider": "codex", "adapterId": "codex-cli-local" }
  },
  "roleAssignments": [
    {
      "role": "planner",
      "provider": "claude_code",
      "adapterId": "claude-code-local",
      "readinessState": "captured_output_pass",
      "evidenceRef": "_ops/evidence/<packet-id>/capture/planner.json",
      "claimStatus": "non_claim_evidence"
    },
    {
      "role": "reviewer",
      "reviewerId": "reviewer_a",
      "reviewLens": "packet_doc_review",
      "provider": "claude_code",
      "adapterId": "claude-code-local",
      "readinessState": "captured_output_pass",
      "evidenceRef": "_ops/evidence/<packet-id>/capture/reviewer_a.json",
      "claimStatus": "non_claim_evidence"
    },
    {
      "role": "reviewer",
      "reviewerId": "reviewer_b",
      "reviewLens": "challenge_review",
      "provider": "codex",
      "adapterId": "codex-cli-local",
      "readinessState": "captured_output_pass",
      "evidenceRef": "_ops/evidence/<packet-id>/capture/reviewer_b.json",
      "claimStatus": "non_claim_evidence"
    }
  ],
  "workerAliases": {
    "worker1": { "role": "developer" },
    "worker2": { "role": "reviewer", "reviewerId": "reviewer_b" }
  },
  "approvalStateMutationAllowed": false
}
```

Boundary rules:
- `readinessState` is evidence about topology/smoke routing only. It is not productization
  readiness, release readiness, real provider readiness, or closeout approval.
- PKT-25 owns topology schema, persistence, CLI, manifest validation, and real-smoke
  validation correction.
- PKT-26 owns closeout ledger support, persisted closeout decision interpretation, and
  report/diagnostic representation of provider-readiness outcomes.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: packet-scoped provider topology recording/reporting captures the
  project Conductor value and packet-scoped PM, Planner, Developer, Documenter, Tester,
  and Reviewer provider assignment as first-class starter operating evidence.
- API contract: topology configuration and reporting command surfaces must persist project conductor, packet role assignments, mixed reviewer assignments, compatibility worker aliases, and provider-neutral evidence envelope references.
- Component responsibility: PKT-25 owns provider topology schema, persistence, CLI/operator docs, provider manifest binding, real-smoke readiness, and captured-output validation; PKT-26 owns closeout ledger consumption only.
- Allowed dependency direction: topology resolution may read project conductor selection, packet role-provider assignments, provider manifests, and evidence records; provider-specific output must not write approval state or override packet/review/test authority.
- Data ownership: topology records are harness operating metadata, not product survey data, release approval state, or provider-specific product identity.
- Public contract vs internal/scratch field: role topology schema, CLI diagnostics, provider ids, reviewer-role evidence envelope, and readiness status are public starter contracts; local CLI command strings, provider cache paths, and captured raw output are internal evidence.
- Modeling evidence path: reference/reports/review/PKT-25_26-role-topology-correction-addendum.md

## Acceptance Criteria
| ID | Acceptance | Required evidence |
|---|---|---|
| A1 | Packet-scoped topology record/report can persist and report `projectTopology.conductor.provider`. Project-start UI/init flow implementation is not claimed by PKT-25. | CLI/unit test plus starter validation evidence. |
| A2 | Packet instructions can persist and report role provider assignments for PM, Planner, Developer, Documenter, Tester, and Reviewer using either Codex CLI or Claude Code CLI for each role. | Packet service/schema test and CLI smoke using a role-provider matrix fixture that covers all six logical role keys against both `codex` and `claude_code`. |
| A3 | Real-smoke readiness consumes declared topology and no longer assumes `Reviewer=claude_code` when worker2 is `codex`. | Fail-first fixture `codex_codex_reviewer_hardcode_red` must reproduce `captured_output_record_missing:Reviewer:claude_code`, then pass with topology-derived reviewer provider. |
| A4 | No explicit topology preserves existing default reviewer-provider behavior. | Backward-compatible default test. |
| A5 | Unsupported, blank, or conflicting provider declarations fail closed with actionable diagnostics. | Negative tests. |
| A6 | Captured-output validation checks logical role, optional worker alias, provider, adapter id, reviewer id/lens when present, readiness state, non-claim status, and evidence reference consistently. | Captured evidence envelope fixture tests compatible with PKT-26 consumption. |
| A7 | Conductor selection remains separate from approval authority. | Delegated-approval hard-stop regression test. |
| A8 | Starter boundary validation proves no provider-specific entry contract becomes product identity. | Starter validation and contamination check. |
| A9 | The first packet-scoped project-topology Conductor value can be recorded as Codex while packet-level role providers remain independently assignable. | Fixture proving `projectTopology.conductor.provider=codex` with packet Planner assigned to `claude_code` and Developer/Tester assigned to `codex`. |
| A10 | A packet can request two independent Reviewer agents with mixed providers, for example Claude Code CLI plus Codex CLI, and keep their findings separate for adjudication. | Multi-reviewer fixture proving unique reviewer ids, review lenses, provider ids, evidence refs, and no self-review collapse. |

## Verification Plan
- Focused starter Python tests for provider topology schema, persistence, manifest-backed
  provider id validation, and smoke routing.
- Role-provider matrix fixture proving PM, Planner, Developer, Documenter, Tester, and
  Reviewer can each be assigned at packet instruction time to either `codex` or
  `claude_code`.
- Mixed-provider review fixture proving one Claude Code CLI reviewer and one Codex CLI
  reviewer can produce separate captured-output records and independent review lenses.
- Focused regression for codex/codex reviewer capture that previously failed with
  `captured_output_record_missing:Reviewer:claude_code`.
- Fail-first fixture name: `codex_codex_reviewer_hardcode_red`.
- GREEN fixture expectation: worker2 role `Reviewer`, provider `codex`, adapter id from
  provider manifest, captured output matched, and `claimStatus=non_claim_evidence`.
- Negative fixtures for unsupported provider ids, duplicate non-reviewer role assignment,
  duplicate reviewer ids, missing reviewer lens, and mixed legacy/topology fields.
- Delegated approval regression proving Planner cannot execute delegated approval and
  Conductor selection alone is not approval.
- Starter validation with bytecode/cache-safe execution.
- Root harness validation when root wrappers or reports are touched.

## Verification Manifest
- Ready For Code: approved by Human Owner on 2026-07-01 for PKT-25 only.
- root: required before RFC transition and closeout.
- standard-template: required for copied-starter provider topology surfaces.
- targeted: provider topology schema/persistence/CLI tests, role-provider matrix CLI tests, mixed-provider reviewer tests, codex-codex reviewer hardcode regression, unsupported-provider negatives, delegated-approval hard-stop regression.
- validator: harness validator required after packet registration, after state transitions, and before closeout.
- active context: required after registration and every state-changing transition.
- review closeout: independent packet challenge and packet-doc review are advisory pre-RFC evidence only; closeout requires security/authority review, challenge/code-quality/evidence lenses, Reviewer adjudication, and Planner closeout.

## Required Artifacts Before Ready For Code
| Artifact | Status | Owner |
|---|---|---|
| Packet challenge review | pass after corrections; evidence `reference/reports/review/PKT-25_26-role-topology-planner-challenge-rerun.md`; correction disposition `reference/reports/review/PKT-25_26-role-topology-correction-addendum.md`; does not approve RFC by itself | independent challenge reviewer / Planner correction |
| Independent `packet_doc_review` | pass after corrections; evidence `reference/reports/review/PKT-25_26-role-topology-packet-doc-review-rerun.md`; correction disposition `reference/reports/review/PKT-25_26-role-topology-correction-addendum.md`; does not approve RFC by itself | independent packet document reviewer / Planner correction |
| Artifact-sync report | draft in `reference/reports/artifact-sync/PKT-25_26_PROVIDER_TOPOLOGY_AND_CLOSEOUT_LEDGER.md` | Planner |
| Development documentation impact decision | closed in packet draft; Developer parity updates required if docs surfaces change | Planner / Developer |
| Implementation-transition preflight | required after RFC, before Developer work | Orchestrator |

## Planner Packet Challenge Review
- Challenge status: pass
- Challenge reviewer: `019f1b04-2c80-7a51-8097-aa570faa619b` / Kepler.
- Challenge reviewer independence basis: independent subagent reviewed packet scope after Planner correction; not Planner, Developer, Tester, Orchestrator, generated summary, or packet author self-review.
- Source refs reviewed: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`; `reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md`; `reference/reports/artifact-sync/PKT-25_26_PROVIDER_TOPOLOGY_AND_CLOSEOUT_LEDGER.md`; `reference/reports/source/PKT-25_26_A_LANE_SOURCE_SUMMARY.md`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`.
- Parent objective coverage: PKT-25 covers first-class provider topology, first Codex Conductor configuration, packet-scoped role-provider assignment, mixed-provider reviewer evidence, and real-smoke reviewer-provider hardening.
- Deferred scope with named follow-up: PKT-26 owns closeout ledger/productization governance; release, publish, productization-complete, User UAT, and real-provider readiness remain outside PKT-25.
- Acceptance proves behavior change: A1-A10 require schema/persistence/CLI behavior, role-provider matrix coverage, mixed-provider reviewers, fail-first reviewer hardcode regression, delegated approval hard-stop, and starter contamination checks.
- Failure fixture or failure condition: `codex_codex_reviewer_hardcode_red` must reproduce `captured_output_record_missing:Reviewer:claude_code`; role-provider matrix and mixed-reviewer negative fixtures must fail closed on unsupported, duplicate, or ambiguous declarations.
- Reviewer closeout hold basis: Reviewer must hold closeout if topology evidence, role-provider matrix tests, mixed-reviewer evidence, delegated-approval hard-stop, security/authority review, docs parity, or starter validation is missing or failed.
- First-wave limit check: first implementation action is the failing topology regression; implementation remains limited to PKT-25 topology/schema/CLI/policy/test/docs surfaces.
- Guidance-only sufficiency rationale: not guidance-only; packet requires executable tests, CLI/service behavior, validation, evidence envelope, and closeout review evidence.
- Challenge evidence artifact path: `reference/reports/review/PKT-25_26-role-topology-planner-challenge-rerun.md`.
- Findings disposition: `pass_after_corrections`; no findings after second pass.
- Required corrections applied: yes; see `reference/reports/review/PKT-25_26-role-topology-correction-addendum.md`.
- No self-approval claim: this is independent packet challenge evidence only; it does not approve RFC by itself, implementation, testing, review closeout, release, UAT, residual risk, productization completion, or real provider readiness.

## Packet Document Review
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Packet doc reviewer: `019f1b04-695f-7311-95a0-573e0eebeb17` / Herschel.
- Packet doc reviewer independence basis: independent packet-doc review subagent reviewed the corrected packet/report set; not Planner, Developer, Tester, Orchestrator, generated summary, or packet author self-review.
- Packet doc review evidence path: reference/reports/review/PKT-25_26-role-topology-packet-doc-review-rerun.md
- Requirements direction alignment: pass; aligns with provider-neutral orchestration, independent review, and Conductor approval-boundary requirements.
- Implementation-plan sequencing alignment: pass; PKT-25 owns topology implementation and PKT-26 consumes topology evidence only.
- Architecture/source SSOT alignment: pass; provider ids remain manifest-backed examples and do not become product identity.
- Human/Planner intent preservation: pass; first Codex Conductor, per-packet PM/Planner/Developer/Documenter/Tester/Reviewer assignment, Planner-as-Claude example, and dual mixed-provider reviewers are preserved.
- v1.0 root-harness operating constraint coverage: pass; packet-before-code, generated-state non-authority, independent review, and explicit RFC boundaries are preserved.
- v2.0 product philosophy coverage: pass; Codex CLI and Claude Code CLI are configurable providers/examples, not starter product identity.
- Acceptance strength: pass; A1-A10 require executable behavior, negative fixtures, role-provider matrix coverage, and evidence envelope compatibility.
- Verification scope strength: pass; focused tests, fail-first regression, role-provider matrix fixture, mixed-provider reviewer fixture, delegated approval hard-stop, starter validation, and root validation are required.
- Deferred/out-of-scope ownership: pass; PKT-26 owns closeout ledger governance and all release/productization/UAT/real-provider-readiness claims stay out of scope.
- Findings disposition: `pass_after_corrections`; no findings after second pass.
- No self-approval claim: this packet-doc review is evidence only; it does not approve RFC by itself, implementation, testing, review closeout, release, UAT, residual risk, productization completion, or real provider readiness.

## Development Documentation Impact
Decision: docs impact is in scope.

Required doc surfaces:
- `starter/standard-harness/START_HERE.md` or equivalent copied-starter onboarding surface
  when project-start Conductor selection is exposed there.
- Operator CLI/help text for topology configuration commands.
- Any provider orchestration manual or generated command help that names default worker
  providers.

Docs parity verification:
- Developer must update affected docs/help text in the same packet when command surfaces
  or topology field names change.
- Tester/Reviewer must verify docs do not make Codex or Claude Code product identity and
  do not imply Conductor selection grants approval authority.

Operator docs must explain that project-level Conductor selection is not approval
  delegation unless a scoped Human delegation record validates through trusted commands.
- Provider examples must stay examples; they must not become Codex-only or Claude-only
  product identity.

## Approval Boundary
- This packet is Ready For Code approved for PKT-25 only by explicit Human Owner message
  on 2026-07-01.
- Implementation may start only through the approved `planner-to-orchestrator` transition
  and must remain inside PKT-25 scope.
- Do not use this packet to close PKT-20 real-provider readiness by inference.
- Do not treat a successful fixture smoke as real authenticated provider readiness.

## Planner Rescope Decision
- Decision status: approved by Human Owner on 2026-07-01 and recorded by Planner.
- Decision reason: Remediation 4 `challenge_review` held closeout because A1/A9 could be
  read as requiring a project-start or init-level Conductor selection/reporting flow.
- Rescoped contract: PKT-25 closes packet-scoped provider topology recording/reporting.
  The `projectTopology.conductor.provider` value is recorded and reported inside the
  packet-scoped topology record and evidence envelope.
- Not claimed by PKT-25: a separate project-start UI/init flow, project-scoped report
  independent of packet id, global default Conductor state, or real authenticated provider
  readiness.
- Reviewer closeout implication: the A1/A9 hold is resolved only against this rescoped
  packet contract. Future project-start Conductor UX/init productization requires a new
  approved packet if needed.

## Candidate Handoff After RFC
- Recommended route: `Planner -> Orchestrator`.
- Orchestrator should route Developer, Tester, Reviewer, bounded remediation, and Planner
  closeout.
- The first implementation action should be a failing topology regression that reproduces
  the old codex/codex reviewer-provider mismatch.
- The packet implementation plan must also include fixtures for the user-requested
  topology examples: project-start Codex Conductor, packet Planner assigned to Claude Code
  CLI, and dual Reviewer agents split across Claude Code CLI and Codex CLI.
