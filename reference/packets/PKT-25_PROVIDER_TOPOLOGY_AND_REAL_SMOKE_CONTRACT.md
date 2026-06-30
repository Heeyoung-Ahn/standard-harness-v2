# PKT-25 Provider Topology And Real-Smoke Contract

> PLANNING PACKET. Drafted by Planner for Ready-For-Code preparation only.
> Implementation, approval-state mutation, testing, and closeout remain blocked until
> independent packet challenge, independent `packet_doc_review`, and explicit
> `Ready For Code` approval are recorded.

## Purpose
Make provider topology a first-class starter contract so a copied project can select a
project-level Conductor at project start and assign `worker1` and `worker2` per packet
without relying on hard-coded role/provider assumptions.

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
| A-lane E2E review | Preserve `Reviewer=claude_code` default but support codex/codex topology through declared topology, not an ad hoc reviewer override. |
| PKT-20 closeout | Real authenticated provider readiness was not proven; this packet must not claim provider readiness without bounded smoke evidence. |
| Requirements `SHV2-REQ-048` | Conductor routing records must preserve provider-neutral identity and approval boundaries. |

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT` | First-class provider topology and real-smoke contract hardening. | selected |
| Ready For Code | pending | Independent reviews are recorded, but explicit RFC approval has not been granted. | pending |
| Human sync needed | `no` | User decisions are captured; RFC remains a separate explicit approval boundary. | closed |
| Gate profile | contract | Harness-system topology and smoke validation surfaces require strict contract gates. | selected |
| User-facing impact | `no` | No product UI or browser-facing runtime is changed by this packet. | closed |
| Layer classification | `harness-system` | Starter `_harness`, CLI, schema, and provider-policy surfaces are in scope. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required before RFC. | closed |
| UX archetype status | not-needed | This is not a UX/UI implementation packet. | closed |
| UX deviation status | none | No UX archetype applies. | closed |
| Environment topology status | in-scope | Project-level conductor and packet-level worker topology are the packet subject. | selected |
| Domain foundation status | not-needed | No product domain foundation is changed. | closed |
| Authoritative source intake status | complete | User decisions, A-lane E2E finding, PKT-20 closeout, and requirements are mapped. | closed |
| Shared-source wave status | not-needed | No sibling rollout or shared-source promotion is included. | closed |
| Packet exit gate status | pending | Exit evidence is required after implementation and review. | pending |
| Existing system dependency | starter _harness provider/adaptor surfaces | Topology must bind to existing provider manifest and conductor-worker surfaces. | selected |
| New authoritative source impact | analyzed | The A-lane E2E finding is evidence input only and does not approve implementation. | closed |
| Risk if started now | high | Implementation changes harness-system provider topology and smoke validation behavior. | hold until RFC |

## Packet Context
- Packet ID: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
- Packet type: `harness-system`
- Risk level: `high`
- Gate profile: `contract`
- Gate profile version: `harness-system@1+high@1+contract-boundary`
- Changed zones: starter `_harness`, starter tests, CLI/operator docs, provider topology schema/policy
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
- Route class: `planner-to-orchestrator` after RFC
- Delivery mode: `orchestrated-closeout`
- Starter impact: yes
- Provider identity impact: high; provider-specific examples must remain adapter policy, not product identity
- Ready For Code status: `pending`

## In Scope
- Add a first-class provider-topology contract for copied-starter operation:
  - project-level `conductor` selected during project start/init;
  - packet-level `worker1` and `worker2` assignments;
  - role labels such as Developer/Reviewer are mapped from packet topology instead of hard-coded provider defaults.
- Add schema and validation for supported provider ids, roles, and packet topology shape.
- Bind provider ids to adapter/provider manifest records such as
  `starter/standard-harness/_harness/system/standard_harness/adapters/manifest.py`
  and provider orchestration policy surfaces. Codex and Claude Code values are examples
  and supported local providers, not product identity or hard-coded starter defaults.
- Add CLI or command-surface support for setting and reading:
  - project conductor;
  - packet worker1 provider;
  - packet worker2 provider;
  - packet worker role mapping when the packet needs role-specific execution.
- Replace ad hoc real-smoke inputs such as `reviewer_provider` with a topology-derived contract, while keeping backward-compatible default behavior where no explicit topology exists.
- Update real-smoke readiness and captured-output validation so it consumes the declared topology consistently.
- Add negative checks for unsupported providers, blank provider values, mixed legacy/topology fields, and role/provider evidence mismatches.
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
  "conductor": { "provider": "codex" },
  "workers": {
    "worker1": { "provider": "codex", "role": "Developer" },
    "worker2": { "provider": "codex", "role": "Reviewer" }
  }
}
```

Contract rules:
- `conductor.provider` is selected at project start and persisted in project operating state.
- `worker1.provider` and `worker2.provider` are packet-scoped and may differ per packet.
- Role names are logical duties; provider ids are runtime/adaptor choices.
- The default topology remains backward compatible with existing sample behavior.
- Unsupported provider ids fail closed before smoke execution.
- A worker evidence record must match both logical worker id and declared provider.

PKT-25 must emit a topology evidence envelope that PKT-26 can consume without redefining
topology. Minimum fields:

```json
{
  "schemaVersion": "standard-harness-provider-topology-evidence/v1",
  "packetId": "PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT",
  "conductor": { "provider": "codex", "adapterId": "codex-cli-local" },
  "workers": [
    {
      "workerId": "worker1",
      "role": "Developer",
      "provider": "codex",
      "adapterId": "codex-cli-local",
      "readinessState": "captured_output_pass",
      "evidenceRef": "_ops/evidence/<packet-id>/capture/worker1.json",
      "claimStatus": "non_claim_evidence"
    },
    {
      "workerId": "worker2",
      "role": "Reviewer",
      "provider": "codex",
      "adapterId": "codex-cli-local",
      "readinessState": "captured_output_pass",
      "evidenceRef": "_ops/evidence/<packet-id>/capture/worker2.json",
      "claimStatus": "non_claim_evidence"
    }
  ],
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

## Acceptance Criteria
| ID | Acceptance | Required evidence |
|---|---|---|
| A1 | Project init/start can persist and report `conductor.provider`. | CLI/unit test plus starter validation evidence. |
| A2 | Packet metadata can persist and report `worker1` and `worker2` provider assignments. | Packet service/schema test and CLI smoke. |
| A3 | Real-smoke readiness consumes declared topology and no longer assumes `Reviewer=claude_code` when worker2 is `codex`. | Fail-first fixture `codex_codex_reviewer_hardcode_red` must reproduce `captured_output_record_missing:Reviewer:claude_code`, then pass with topology-derived reviewer provider. |
| A4 | No explicit topology preserves existing default reviewer-provider behavior. | Backward-compatible default test. |
| A5 | Unsupported, blank, or conflicting provider declarations fail closed with actionable diagnostics. | Negative tests. |
| A6 | Captured-output validation checks logical worker id, role, provider, readiness state, non-claim status, and evidence reference consistently. | Captured evidence envelope fixture tests compatible with PKT-26 consumption. |
| A7 | Conductor selection remains separate from approval authority. | Delegated-approval hard-stop regression test. |
| A8 | Starter boundary validation proves no provider-specific entry contract becomes product identity. | Starter validation and contamination check. |

## Verification Plan
- Focused starter Python tests for provider topology schema, persistence, manifest-backed
  provider id validation, and smoke routing.
- Focused regression for codex/codex reviewer capture that previously failed with
  `captured_output_record_missing:Reviewer:claude_code`.
- Fail-first fixture name: `codex_codex_reviewer_hardcode_red`.
- GREEN fixture expectation: worker2 role `Reviewer`, provider `codex`, adapter id from
  provider manifest, captured output matched, and `claimStatus=non_claim_evidence`.
- Negative fixtures for unsupported provider ids and mixed legacy/topology fields.
- Delegated approval regression proving Planner cannot execute delegated approval and
  Conductor selection alone is not approval.
- Starter validation with bytecode/cache-safe execution.
- Root harness validation when root wrappers or reports are touched.

## Verification Manifest
- Ready For Code: pending; explicit approval is required before implementation transition.
- Root validation: required before RFC transition and closeout.
- Standard-template check: required for copied-starter provider topology surfaces.
- Targeted tests: provider topology schema/persistence/CLI tests, codex-codex reviewer hardcode regression, unsupported-provider negatives, delegated-approval hard-stop regression.
- Active context refresh: required after registration and every state-changing transition.
- Review closeout: independent packet challenge and packet-doc review are advisory pre-RFC evidence only; closeout requires security/authority review, challenge/code-quality/evidence lenses, Reviewer adjudication, and Planner closeout.

## Required Artifacts Before Ready For Code
| Artifact | Status | Owner |
|---|---|---|
| Packet challenge review | recorded with no open findings after correction addendum; does not approve RFC | independent challenge reviewer |
| Independent `packet_doc_review` | recorded with correction addendum; does not approve RFC | independent packet document reviewer |
| Artifact-sync report | draft in `reference/reports/artifact-sync/PKT-25_26_PROVIDER_TOPOLOGY_AND_CLOSEOUT_LEDGER.md` | Planner |
| Development documentation impact decision | closed in packet draft; Developer parity updates required if docs surfaces change | Planner / Developer |
| Implementation-transition preflight | required after RFC, before Developer work | Orchestrator |

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
- This packet is not Ready For Code.
- Do not start implementation until independent challenge review, independent
  `packet_doc_review`, and explicit `Ready For Code` approval are recorded.
- Do not use this packet to close PKT-20 real-provider readiness by inference.
- Do not treat a successful fixture smoke as real authenticated provider readiness.

## Candidate Handoff After RFC
- Recommended route: `Planner -> Orchestrator`.
- Orchestrator should route Developer, Tester, Reviewer, bounded remediation, and Planner
  closeout.
- The first implementation action should be a failing topology regression that reproduces
  the old codex/codex reviewer-provider mismatch.
