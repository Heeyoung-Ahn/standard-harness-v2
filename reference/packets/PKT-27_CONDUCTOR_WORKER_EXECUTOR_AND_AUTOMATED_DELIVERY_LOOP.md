# PKT-27 Conductor Worker Executor And Automated Delivery Loop

> IMPLEMENTATION PACKET. Ready For Code is approved for PKT-27 implementation routing only
> after independent Planner Packet Challenge Review, independent `packet_doc_review`, and
> explicit Human Owner current-goal RFC direction were recorded. This packet is the required v2.0
> correction for the Multi-LLM Orchestration Model gap: the normal product workflow must
> not require the Human Owner to copy prompts into worker CLIs or paste CLI output back
> into the harness.

## Purpose
Productize the automatic Conductor-owned worker delivery loop for v2.0.

The selected Conductor must read harness state, packet boundary, provider topology, and
risk policy; decide direct handling, single worker delegation, or cross-provider
worker/verifier routing; invoke bounded Codex CLI and/or Claude Code CLI workers through a
provider-neutral executor; capture stdout, stderr, exit status, timeout/cancel status, and
artifacts; validate and persist structured output envelopes; adjudicate worker/verifier
results; and route the next Agent, Reviewer, Planner, or Human Owner step without relying
on Human copy/paste.

PKT-14 and PKT-20 are historical evidence for the defect, not sufficient closeout for
this requirement. PKT-14 closed deterministic/captured-output behavior and PKT-20 closed a
hold/unavailable/narrowed real-provider readiness claim. Neither proves the normal
automatic delivery loop required by SHV2-REQ-070.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | `PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP` | Required productization blocker for automatic multi-LLM delivery. | selected |
| Ready For Code | approved | Independent packet challenge, independent packet-doc review, and explicit Human Owner current-goal RFC approval evidence are recorded. | approved |
| Packet type | `harness-system` | Changes reusable starter Conductor, provider orchestration, worker execution, evidence, CLI/status, and tests. | selected |
| Risk level | critical | Incorrect implementation can execute provider CLIs unsafely, leak credentials, fake readiness, or imply approval authority. | selected |
| Risk class | critical / contract / provider / security | Command execution, provider identity, evidence, and approval boundaries are load-bearing. | selected |
| Risk if started now | controlled-after-rfc | Independent packet challenge, packet document review, and explicit Ready For Code approval are recorded; implementation remains bounded by implementation-transition preflight, PKT-27 scope, and Orchestrator routing. | selected |
| Gate profile | contract | Requires TDD, security review, full starter regression, independent closeout lenses, Reviewer adjudication, and Planner closeout. | selected |
| Route class | packet-path | Not fast-path eligible. | selected |
| Change zone | load-bearing | Governance truth and starter runtime execution paths are in scope. | selected |
| Layer classification | harness-system | Starter `_harness`, Conductor, provider orchestration, executor, evidence, CLI, and tests are in scope. | selected |
| Delivery route mode | orchestrated-closeout | After RFC, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | selected |
| Delivery route mode after RFC | orchestrated-closeout | Orchestrator must route Developer, Tester, Reviewer, bounded remediation, and Planner closeout. | selected |
| User-facing impact | none | No browser UI or end-user product feature is changed; operator CLI/status behavior changes are tracked separately. | closed |
| Operator-facing CLI/status impact | yes | Human Owner no longer performs prompt/result copy-paste for normal worker delegation. | selected |
| Starter impact | yes | `starter/standard-harness/_harness` public CLI/status behavior changes. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile evidence is required. | approved |
| UX archetype status | not-needed | No browser UI or visual UX surface is included. | approved |
| UX deviation status | none | No UX deviation applies. | closed |
| Environment topology status | approved | Local provider topology policy and CLI availability boundaries are part of PKT-27 acceptance. | selected |
| Domain foundation status | approved | Domain is Conductor worker execution, evidence envelopes, adjudication, and approval hard stops. | selected |
| Authoritative source intake status | approved | User correction, Requirements, Architecture Guide, Implementation Plan, PKT-14, and PKT-20 are mapped. | approved |
| Shared-source wave status | not-needed | No sibling rollout is included. | closed |
| Packet exit gate status | pending | Exit evidence is required after implementation, testing, security review, independent lenses, Reviewer adjudication, and Planner closeout. | pending |
| Guard report path | reference/reports/security/PKT-27-guard-report.json | Guard-mode edit boundary and destructive-command policy are recorded before implementation transition. | approved |
| Guard decision | allow-with-boundary | PKT-27 implementation may proceed only inside the named edit boundary; destructive commands, secret inspection, release, publish, deploy, and unbounded provider execution are not approved. | approved |
| Existing system dependency | internal | Builds on Conductor routing, provider topology, provider orchestration, envelope/evidence ledgers, and CLI/status surfaces. | selected |
| New authoritative source impact | analyzed | Current Human Owner direction corrects the Multi-LLM orchestration interpretation and is incorporated in SSOT. | approved |
| Release / publish / promotion | not-approved | This packet does not approve release, publish, starter promotion, residual risk, User UAT, or productization-complete by itself. | closed |

## Source Authority
- User direction: do not reduce the Multi-LLM Orchestration Model requirement; implement
  the expected Conductor-led workflow 100%.
- `.agents/artifacts/REQUIREMENTS.md`: SHV2-REQ-019, SHV2-REQ-020, SHV2-REQ-048,
  SHV2-REQ-057, and SHV2-REQ-070.
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`: Provider-Neutral Orchestration Architecture
  requires Conductor-owned worker invocation, output capture, evidence validation,
  adjudication, and next-route selection.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`: PKT-27 is a required productization blocker.
- Current code evidence:
  - `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
    consumes `captured_output` and returns `manual_required`/`execution_blocked` for real CLI paths.
  - `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`
    validates descriptors and records ledgers, but does not execute worker CLIs.
  - `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
    exposes `conductor-worker-e2e` flags but does not spawn worker processes.
  - `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
    tests captured-output/manual-required behavior instead of automatic executor behavior.

## Requirements Kernel
| Field | Decision |
|---|---|
| Goal | Make normal v2.0 multi-LLM orchestration an automatic Conductor-led delivery loop. |
| Users / roles | Human Owner, selected Conductor, Codex CLI worker, Claude Code CLI worker, Developer, Tester, Reviewer, Planner, Orchestrator. |
| Scope boundary | Implement bounded local CLI worker execution, evidence envelope capture, validation, adjudication, and next-route selection. |
| Workflow / behavior | Human orders the Conductor; Conductor chooses route; executor invokes worker CLIs; harness captures/validates/persists evidence; Conductor adjudicates and routes next step. |
| Evidence / approval state | Implementation requires explicit RFC, TDD, security review, Tester evidence, Reviewer adjudication, and Planner closeout. Worker/adjudication output remains evidence-only and never approval authority. |

## In Scope
- Add a focused worker executor service under the copied starter harness that:
  - accepts provider-neutral execution requests from Conductor/provider orchestration;
  - builds safe command descriptors from provider topology policy, role prompt, input
    snapshot, permission roots, timeout/cancel policy, redaction policy, and artifact root;
  - invokes approved local CLI executables without shell interpolation;
  - captures stdout, stderr, exit code, timeout, cancellation, duration, and artifact paths;
  - hashes artifacts and records input snapshot hash;
  - redacts or rejects secrets, tokens, cookies, auth/session material, provider caches,
    raw credentials, and root-development paths;
  - emits structured worker output envelopes.
- Integrate executor output with existing adapter/provider ledgers, evidence service,
  envelope validation, provider topology evidence, and Conductor adjudication.
- Replace the normal `conductor-worker-e2e` product path so it attempts automatic execution
  when policy, CLI availability, auth boundary, command safety, and approval preconditions
  are satisfied.
- Preserve deterministic fixture mode for tests/offline validation only.
- Preserve captured-output intake as explicit recovery/debug/import mode only, with output
  diagnostics that prevent it from satisfying automatic delivery-loop readiness.
- Add CLI/status JSON fields that distinguish:
  - `automatic_execution_pass`;
  - `automatic_execution_failed`;
  - `automatic_execution_timeout`;
  - `automatic_execution_blocked`;
  - `tool_unavailable`;
  - `approval_unavailable`;
  - `captured_output_recovery_only`;
  - `fixture_only`.
- Add cancellation/timeout behavior and evidence.
- Add provider-neutral contamination tests.
- Add approval hard-stop tests proving worker/verifier/Conductor output cannot approve
  Ready For Code, closeout, release, residual risk, User UAT, or productization-complete.
- Update operator docs/help for the new normal workflow and recovery-mode boundary.

## Out Of Scope
- Remote/cloud provider control outside approved local CLI worker execution.
- Storing provider credentials, tokens, sessions, cookies, raw transcripts, or provider
  cache contents.
- Making Codex, Claude Code, or any provider the product identity.
- Reopening PKT-14 or PKT-20 closeout claims. They remain historical evidence, not
  acceptance for PKT-27.
- Release, publish, starter promotion, residual-risk acceptance, User UAT, or
  productization-complete approval.
- Allowing worker output, verifier output, Conductor adjudication, PM summaries, generated
  state, release bundles, or projection artifacts to become approval authority.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human Owner gives the selected Conductor a task; Conductor routes
  worker execution; executor runs worker CLI; harness validates evidence; Conductor
  adjudicates and routes next work without Human prompt/result copy-paste.
- API contract: a copied-starter CLI/status command must expose a stable JSON result for
  automatic worker execution, including schema version, packet id, route decision,
  execution request ids, worker/verifier runs, envelopes, artifact hashes, diagnostics,
  evidence refs, adjudication, authority boundary, and next route.
- Component responsibility: Conductor owns route choice and next-route selection; provider topology policy owns provider/role assignment and executable eligibility; worker executor owns command construction, subprocess execution, capture, timeout, cancellation, redaction, and artifact hashing; envelope/evidence services own validation and persistence; Reviewer/Planner/human approval services own closeout and approval authority.
- Allowed dependency direction: CLI -> workflow services -> executor/evidence/adapters.
  Worker output may not directly mutate DB, generated state, approval state, packet state,
  release state, or files outside permission roots.
- Data ownership: worker outputs, verifier outputs, execution metadata, artifacts, hashes, and adjudications are packet-bound operating evidence only; they are not approval, release, productization, generated-summary, or provider-identity authority.
- Public contract vs internal/scratch field: public contract is the CLI/status JSON, diagnostics,
  structured envelopes, evidence refs, and authority-boundary fields. Raw subprocess
  output and temp execution directories are internal evidence and must be redacted or
  excluded from starter identity.

## Registered Packet Semantic Contract
- Layer classification: harness-system
- Required reading before code: `.agents/runtime/ACTIVE_CONTEXT.json`; `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`; `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`; `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py`; `starter/standard-harness/_harness/system/standard_harness/cli/main.py`; existing PKT-14 and provider orchestration tests.
- UX archetype reference: not-needed; no browser UI or visual UX surface.
- Selected UX archetype: not-needed
- Environment topology reference: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md` plus PKT-27 packet-local execution topology.
- Source environment: root development harness and copied starter under `starter/standard-harness/`.
- Target environment: copied starter local CLI worker execution surfaces under `starter/standard-harness/_harness`.
- Execution target: local bounded fake-provider commands for deterministic tests and local approved Codex CLI / Claude Code CLI worker commands when provider tools are available and policy permits.
- Transfer boundary: provider outputs may enter only packet-bound redacted evidence envelopes; credentials, sessions, caches, raw transcripts, and provider-specific entry files must not enter starter identity or unbounded context.
- Rollback boundary: revert PKT-27 source/docs/test changes through git; preserve packet and review evidence history.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/packets/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`.
- Schema impact classification: high
- Authoritative source intake reference: current Human Owner direction; `reference/reports/artifact-sync/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md`; PKT-14 and PKT-20 historical evidence.
- Authoritative source disposition: approved for planning; implementation still requires independent reviews and explicit RFC.
- Current implementation impact: starter worker execution must move from captured-output/manual-required behavior to executor-backed automatic CLI worker execution as the normal path.
- Existing plan conflict: resolved by updating Requirements, Architecture Guide, and Implementation Plan to make PKT-27 mandatory.
- Impacted packet set scope: single new implementation packet; PKT-14 and PKT-20 remain historical evidence and are not reopened.
- Critical human confirmation: Human Owner explicitly required no reduction of the Multi-LLM Orchestration Model and directed the work to proceed so the requirement can be implemented 100%.
- Critical confirmation owner: Human Owner
- Critical confirmation status: confirmed
- Critical confirmation evidence path: current conversation and `reference/reports/planner/PKT-27_CONFLICT_RESOLUTION_RECORD.md`

## Candidate Implementation Structure
| Surface | Expected change |
|---|---|
| `starter/standard-harness/_harness/system/standard_harness/workflow/worker_executor.py` | New focused executor service for command construction, subprocess execution, capture, redaction, timeout/cancel, artifact hashing, and output envelope creation. |
| `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py` | Replace normal real-provider path with executor-backed automatic execution; retain fixture and captured-output recovery modes with downgraded readiness. |
| `starter/standard-harness/_harness/system/standard_harness/workflow/provider_orchestration.py` | Add executor readiness/request integration while preserving policy and ledger ownership. |
| `starter/standard-harness/_harness/system/standard_harness/cli/main.py` | Add CLI flags/status fields for automatic execution, recovery mode, timeout, cancellation, and evidence output. |
| `starter/standard-harness/_harness/test/test_pkt27_worker_executor.py` | New TDD tests for executor safety, capture, timeout/cancel, artifact hashing, and redaction. |
| `starter/standard-harness/_harness/test/test_pkt27_automated_delivery_loop.py` | New E2E tests for Conductor -> executor -> envelope -> evidence -> adjudication -> next-route. |
| `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py` | Update legacy expectations so captured-output cannot satisfy normal automatic delivery-loop readiness. |
| `starter/standard-harness/_harness/README.md` | Explain normal automatic delivery loop and recovery/debug/import captured-output mode. |

## Acceptance Criteria
| ID | Acceptance | Required evidence |
|---|---|---|
| A1 | The normal Conductor worker path invokes a bounded local worker command through a worker executor when provider topology, command safety, timeout, artifact root, and approval preconditions are satisfied. | TDD red/green executor and E2E tests with a deterministic local fake provider command that behaves like a CLI worker. |
| A2 | The executor captures stdout, stderr, exit code, duration, timeout, cancellation, artifact paths, artifact hashes, and input snapshot hash into a structured output envelope. | Focused unit tests and persisted envelope fixture. |
| A3 | Worker/verifier envelopes are validated and persisted as evidence before Conductor adjudication. | Evidence ledger tests and E2E report showing evidence refs before adjudication. |
| A4 | Conductor adjudication routes the next Agent, Reviewer, Planner, or Human Owner step and does not become truth or approval authority. | Adjudication tests and approval-hard-stop negative tests. |
| A5 | Cross-provider worker/verifier loop supports provider-neutral assignments for Codex CLI and Claude Code CLI examples without making either provider product identity. | Provider topology tests must prove both Codex CLI and Claude Code CLI entries produce safe executor descriptors or explicit `tool_unavailable` evidence without product-identity contamination. |
| A6 | Captured-output intake is explicitly marked recovery/debug/import only and cannot set automatic delivery-loop readiness or productization-complete readiness to pass. | Negative tests expecting `captured_output_recovery_only` and readiness downgrade. |
| A7 | Fixture-only execution remains available for offline tests but cannot satisfy real automatic execution evidence. | Negative tests expecting `fixture_only` readiness downgrade. |
| A8 | Unsafe command descriptors are rejected: shell mode, pipes, redirects, subshells, shell interpolation, newlines, unapproved executable path, missing timeout, path escape, and permission-root escape. | Command safety negative matrix. |
| A9 | Credential/session/raw transcript leakage is blocked or redacted, including API keys, cookies, auth/session tokens, provider cache paths, and root development paths. | Security/redaction tests and security review. |
| A10 | Timeout and cancellation are enforced and surfaced as bounded evidence without hanging the Conductor loop. | Timeout/cancel tests with deterministic local fake worker. |
| A11 | CLI/status output clearly distinguishes automatic pass/fail/blocked/tool-unavailable/approval-unavailable/recovery/fixture states. | CLI contract test and README/help parity. |
| A12 | Full starter regression, root harness validation, validation report, and state sync pass after implementation. | Full starter unittest discovery, root `npm test`, `npm run harness:validate`, `npm run harness:validation-report`, and sync-state evidence. |

## Expected Negative Fixtures
| Fixture / Failure Condition | Expected diagnostic |
|---|---|
| captured output used as normal automatic execution evidence | `captured_output_recovery_only` |
| fixture output used as real automatic execution evidence | `fixture_only_not_delivery_loop_evidence` |
| shell command descriptor with pipe/redirect/subshell/newline | `unsafe_command_descriptor` |
| executable path outside approved topology policy | `worker_executable_not_approved` |
| command descriptor missing timeout | `worker_timeout_required` |
| worker writes artifact outside artifact root | `worker_artifact_outside_root` |
| artifact hash mismatch | `worker_artifact_hash_mismatch` |
| stale input snapshot | `worker_input_snapshot_stale` |
| stdout/stderr contains credential-like secret | `worker_output_secret_rejected` |
| timeout overclaimed as pass | `worker_timeout_not_pass` |
| nonzero exit overclaimed as pass | `worker_exit_nonzero_not_pass` |
| worker/verifier output attempts approval | `worker_output_cannot_approve` |
| Conductor adjudication attempts closeout/release approval | `conductor_adjudication_not_approval` |

## Verification Manifest
Default commands. Developer may adjust exact Python launcher only with evidence rationale.

Contract gate evidence markers required before closeout:

- Ready For Code: pending; must be explicitly approved before implementation starts.
- standard-template: packet preflight and starter standard-template regression must pass.
- targeted: PKT-27 executor and automated delivery-loop tests must pass.
- validator: `npm.cmd run harness:validate` and packet preflight must pass after implementation and closeout updates.
- validation-report: `npm.cmd run harness:validation-report` must be current and passing after implementation and before closeout review.
- active context: `npm.cmd run harness:sync-state` must refresh Active Context after gate transitions.
- review closeout: independent Reviewer closeout and Planner closeout evidence must be recorded before productization-complete.

```powershell
npm.cmd run harness:validate
npm.cmd run harness:validation-report
npm.cmd test
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_worker_executor.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt27_automated_delivery_loop.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_pkt14_conductor_worker_e2e.py"
py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"
python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness conductor-worker-e2e --packet PKT-27 --mode automatic
npm.cmd run harness:sync-state
```

## Required Evidence Paths
| Gate / Lens | Required Evidence Path | Required Status Before Closeout |
|---|---|---|
| Artifact sync | `reference/reports/artifact-sync/PKT-27_CONDUCTOR_WORKER_EXECUTOR_AND_AUTOMATED_DELIVERY_LOOP.md` | required before RFC |
| Planner challenge review | `reference/reports/review/PKT-27-planner-challenge-review.md` | independent pass required before RFC |
| Packet document review | `reference/reports/review/PKT-27-packet-doc-review.md` | independent pass required before RFC |
| Ready For Code approval | `reference/reports/planner/PKT-27_READY_FOR_CODE_APPROVAL.md` | required before implementation |
| TDD red/green | `reference/reports/tdd/PKT-27-red-green.md` | required before Developer completion |
| Developer report | `reference/reports/developer/PKT-27_DEVELOPER_REPORT.md` | required before Tester |
| Tester report | `reference/reports/tester/PKT-27_TESTER_REPORT.md` | required before Reviewer |
| Security review | `reference/reports/security/PKT-27-security-review.json` | required before Reviewer closeout |
| Closeout challenge lens | `reference/reports/review/PKT-27-closeout-challenge-review.md` | independent pass required before Reviewer adjudication |
| Closeout adversarial security lens | `reference/reports/review/PKT-27-closeout-adversarial-security-review.md` | independent pass required before Reviewer adjudication |
| Closeout regression lens | `reference/reports/review/PKT-27-closeout-regression-review.md` | independent pass required before Reviewer adjudication |
| Closeout requirements parity lens | `reference/reports/review/PKT-27-closeout-requirements-parity-review.md` | independent pass required before Reviewer adjudication |
| Reviewer adjudication | `reference/reports/review/PKT-27_REVIEW_REPORT.md` | required before Planner closeout |
| Planner closeout | `reference/reports/closeout/PKT-27_PLANNER_CLOSEOUT.md` | required before productization claim |

## Required Closeout Lens Mapping
| Lens | PKT-27 question |
|---|---|
| `challenge_review` | `reference/reports/review/PKT-27-closeout-challenge-review.md` | Did the implementation actually remove Human prompt/result copy-paste from the normal workflow, or did it preserve the manual path under new labels? |
| `adversarial_security_review` | `reference/reports/review/PKT-27-closeout-adversarial-security-review.md` | Can worker command descriptors, subprocess output, artifact paths, provider auth/session material, or captured-output recovery bypass safety or approval boundaries? |
| `code_quality_review` | `reference/reports/review/PKT-27-closeout-regression-review.md` | Is the executor isolated, testable, and integrated with existing Conductor/provider/evidence services without duplicating unrelated orchestration logic and without regressing starter behavior? |
| `evidence_review` | `reference/reports/review/PKT-27-closeout-requirements-parity-review.md` | Do tests and evidence prove every PKT-27 acceptance item, especially automatic execution, failure handling, timeout/cancel, evidence persistence, recovery-mode downgrade, and approval hard stops? |

## Planner Packet Challenge Review
- Challenge status: pass
- Challenge reviewer: independent Codex subagent `019f1d00-95a4-7982-8385-f4033b647fbb`.
- Challenge reviewer independence basis: separate spawned reviewer, no file edits, not the packet author, not Developer, not Tester, not Orchestrator, not Planner closeout.
- Source refs reviewed: user goal attachment, `REQUIREMENTS.md`, `ARCHITECTURE_GUIDE.md`, `IMPLEMENTATION_PLAN.md`, this packet, artifact sync report, conflict record, Active Context.
- Challenge evidence artifact path: `reference/reports/review/PKT-27-planner-challenge-review.md`.
- Parent objective coverage: closes the planning definition for the full SHV2-REQ-070 automatic Conductor-owned worker CLI delivery loop; implementation remains separate.
- Deferred scope with named follow-up: none for PKT-27 acceptance; release, publish, residual-risk acceptance, User UAT, and productization-complete approval are separate approval gates, not deferred implementation.
- Acceptance proves behavior change: yes; A1-A12 require automatic subprocess execution, structured envelopes, evidence persistence, recovery-mode downgrade, negative safety tests, and regression evidence.
- Failure fixture or failure condition: captured-output normal-readiness claim, fixture-only productization claim, unsafe command descriptor, unapproved executable, missing timeout, artifact escape, secret output, timeout/nonzero overclaim, and worker/adjudication approval claim must fail.
- Reviewer closeout hold basis: Reviewer must hold if automatic execution evidence, timeout/cancel evidence, provider descriptor/tool-unavailable evidence, security review, exact closeout lens files, validation-report, or full regression evidence is missing.
- First-wave limit check: not used; PKT-27 is not a first-wave partial implementation and cannot defer required automatic worker execution.
- Guidance-only sufficiency rationale: not applicable; runtime enforcement and behavior-level tests are required.
- Findings disposition: all findings accepted and incorporated in this packet.
- Required corrections applied: added validation-report evidence, tightened provider-example descriptor/tool-unavailable evidence, and clarified RFC actor authority.
- No self-approval claim: independent reviewer, not packet author; challenge review does not approve implementation, closeout, release, or residual risk.

## Packet Document Review
- Packet doc review status: pass
- Packet doc reviewer: independent Codex subagent `019f1d00-dc24-7580-b314-5541fc73c9ca`.
- Packet doc reviewer independence basis: separate spawned reviewer, no file edits, not the packet author, not Developer, not Tester, not Orchestrator, not Planner closeout.
- Packet doc review completed before Ready For Code: yes
- Source refs reviewed: user goal attachment, `AGENTS.md`, `HARNESS_OPERATING_CONTRACT.md`, `REQUIREMENTS.md`, `ARCHITECTURE_GUIDE.md`, `IMPLEMENTATION_PLAN.md`, and this packet.
- Packet doc review evidence path: reference/reports/review/PKT-27-packet-doc-review.md
- Requirements direction alignment: pass
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: behavior-level automatic execution evidence is required; fixture/captured-output relabeling cannot pass.
- Verification scope strength: test/review/evidence scope includes TDD, negative fixtures, security review, exact closeout lenses, validation-report, sync-state, and full starter regression.
- Deferred/out-of-scope ownership: none for required PKT-27 implementation; release/publish/UAT/productization approval remain separate approval authorities.
- Findings disposition: all findings accepted and incorporated in this packet.
- Required corrections applied: added validation-report evidence and replaced wildcard closeout lens evidence with exact required file mapping.
- No self-approval claim: independent reviewer, not packet author; packet-doc review does not approve implementation, closeout, release, or residual risk.

## Human Sync / Approval Boundary
- Human direction for full scope: recorded in current conversation.
- Ready For Code: approved for PKT-27 implementation routing only at `reference/reports/planner/PKT-27_READY_FOR_CODE_APPROVAL.md`.
- Planner authority: Planner records the Human Owner's explicit current-goal RFC direction; Planner does not create approval authority, approve closeout, or self-execute delegated Conductor approval.
- Independent challenge review and independent packet-doc review: completed for packet readiness after required corrections.
- Implementation: allowed only through Orchestrator routing after implementation-transition preflight.
- Real provider command execution: remains bounded by safe command descriptors, local
  tool availability, auth outside the repo, redaction, timeout, and approval policy.
- Approval authority: worker output, verifier output, Conductor adjudication, generated
  state, PM summaries, and captured-output recovery cannot approve implementation,
  closeout, release, publish, residual risk, User UAT, or productization-complete.

## Candidate Handoff After RFC
- Recommended route: `Planner -> Orchestrator`.
- Orchestrator should route Developer, Tester, Reviewer, bounded remediation, and Planner
  closeout.
- First implementation action: write failing tests proving captured-output recovery cannot
  satisfy automatic delivery-loop readiness and that no executor-backed automatic worker
  path exists yet.

## Reopen Trigger
Reopen or return to Planner if implementation attempts to:
- keep Human copy/paste as the normal workflow;
- mark captured-output or fixture-only execution as automatic delivery-loop readiness;
- execute provider CLIs with shell interpolation or unbounded paths;
- store or expose provider credentials, sessions, tokens, raw transcripts, or caches;
- let worker/verifier/Conductor output approve any gate;
- make a provider-specific contract the starter identity.
