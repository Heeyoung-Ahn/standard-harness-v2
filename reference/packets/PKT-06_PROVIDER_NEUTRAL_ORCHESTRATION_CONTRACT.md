# PKT-06 Provider-Neutral Orchestration Contract

This is a Planner-opened packet for Wave 6. It defines how Standard Harness v2 routes
approved packet work to subscribed local LLM runtimes such as Codex CLI and Claude Code
without making either provider the product identity.

This packet is Ready For Code by explicit Human Owner instruction after independent
packet-document review passed and Planner applied the required correction.

## Starter v2.0 Target And Philosophy Gate
- Implementation target: the clean Standard Harness v2 payload under `starter/standard-harness/`.
- Root-change boundary: root files may change only when the change supports starter v2.0 implementation, validation, or operation.
- v2.0 philosophy parity gate: this packet must preserve clean starter portability, provider-neutral product identity, packet-before-code, evidence-backed closeout, generated-state boundaries, context authority, and practical multi-provider role routing.
- Provider examples gate: Codex CLI and Claude Code are allowed examples and starter adapter targets, but provider-specific files, credentials, subscription state, or entry contracts must not become starter identity.
- Gate status: pass for planning. The packet follows closed PKT-05 and uses Requirements, Implementation Plan, and Architecture Guide as authority.

## Quick Decision Header
| Field | Decision | Rationale | Status |
| --- | --- | --- | --- |
| Work item | PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT | Build the Wave 6 provider-neutral orchestration contract for subscribed Codex/Claude-style workers. | selected |
| Ready For Code | approved | Human Owner instructed Planner to approve PKT-06 after packet-doc review corrections were applied. | approved |
| Human sync needed | no | The Human Owner's core requirement is recorded and Ready For Code approval is explicit. | closed |
| Packet type | harness-system | The packet changes starter adapter, workflow, evidence, and orchestration behavior. | selected |
| Risk level | high | Wrong orchestration can bypass approvals, leak credentials, over-trust LLM output, or make a provider-specific runtime the product identity. | selected |
| Gate profile | contract | The packet defines reusable provider adapter and orchestration contracts. | selected |
| Route class | packet-path | Requires implementation, tests, review, independent lenses, and Planner closeout before claims. | selected |
| Change zone | core | Provider-neutral orchestration is a core Standard Harness v2 operating surface. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code approval, route Developer, Tester, Reviewer, bounded remediation, four independent closeout lenses, and Planner closeout through Orchestrator. | selected |
| User-facing impact | low | No browser UI is required; the Human Owner-facing surface is CLI/service diagnostics, packet evidence, and harness records. | selected |
| Layer classification | core | This packet builds a reusable operating-layer capability. | selected |
| Active profile dependencies | none | No optional product profile is required. | closed |
| Profile evidence status | approved | No profile-specific evidence is required. | closed |
| UX archetype status | approved | No browser UI or visual workflow is in scope; CLI/service diagnostics and docs are the approved human-facing surface. | closed |
| UX deviation status | none | No UX deviation is proposed. | closed |
| Environment topology status | approved | Local-subscription CLI boundary is approved: user-installed/authenticated provider CLIs may be used only through explicit adapter configuration or manual-run bundle fallback; no cloud/deploy topology is in scope. | closed |
| Domain foundation status | approved | The domain is harness orchestration, adapter execution, evidence ingestion, and adjudication. | closed |
| System context status | approved | Adapter, workflow, review, evidence, state, and security boundaries are affected. | selected |
| Authoritative source intake status | approved | Sources are Requirements, Implementation Plan, Architecture Guide, PKT-05 closeout, and the Human Owner's subscription-routing requirement. | selected |
| Shared-source wave status | not-needed | This packet targets the clean starter payload directly; no sibling-project rollout is in scope. | closed |
| Packet exit gate status | approved | Closeout preflight, focused tests, starter regression, starter installed-runtime validation, root validation, root regression, CSO review, and all four independent closeout lenses passed. | closed |
| Existing system dependency | internal | Depends on adapter manifest/envelope/invocation, workflow runs, review/adjudication records, evidence indexes, context packs, and security/redaction policy. | selected |
| New authoritative source impact | analyzed | Human Owner clarified that subscribed Codex and Claude Code routing is the core business requirement for this packet. Existing Requirements already support this direction. | closed |
| Risk if started now | high | Starting before packet-doc review and explicit approval could implement provider-specific shortcuts or credential-unsafe behavior. | selected |
| Packet doc review status | pass | Independent packet-document review passed after the root regression verification gap was corrected. | closed |

## Gate Profile Metadata
| Field | Value |
| --- | --- |
| Gate profile version | `harness-system@contract/v1` |
| Computed risk floor | high |
| Required gates | packet-doc-review; implementation-transition preflight; TDD red/green/refactor evidence; starter focused tests; starter regression; starter installed-runtime validation; root validation; root regression; security/adversarial review; dependency/CLI surface review; four independent closeout review lenses; Planner closeout |
| Approved N/A gates | browser evidence; deployment topology; release/publish; starter promotion; skill routing; compound feedback; full automatic multi-provider cloud control |
| Packet-doc review requirement | mandatory before implementation transition; must be performed by an independent packet-document reviewer against Human Owner/Planner intent, Requirements, Implementation Plan, Architecture Guide, acceptance strength, verification scope, v1 root constraints, and v2 product philosophy |
| Closeout lens requirement | mandatory before Planner closeout; separate independent agents for `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review` |

## Packet Scope
- Lane-type declaration: narrow-runtime
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger.
- Lane-type required sections: Quick Decision Header; Packet Scope; Problem Statement; Decision Gates; Acceptance Criteria; Verification Manifest; Planner Packet Challenge Review; Packet Document Review.
- Lane-type conditional sections: Development Documentation Impact; Feature Artifact Sync Matrix; Modeling Impact; Security Review Request; Dependency/CLI Review.
- Lane-type not-needed sections: browser UI; release packaging; starter promotion; skill auto-routing; compound feedback.
- Planner packet challenge required: yes
- Work item title: Provider-Neutral Orchestration Contract
- Parent objective: Let the Human Owner use subscribed Codex and Claude Code workers for role-assigned harness work while the harness owns approvals, evidence, state records, review, and closeout.
- Scope boundary: provider-neutral adapter manifests, role-routing policy, local CLI execution/request contract, output envelope ingestion, evidence provenance, and adjudication records.
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md`; `starter/standard-harness/_harness/system/standard_harness/adapters/`; `starter/standard-harness/_harness/system/standard_harness/workflow/`; `starter/standard-harness/_harness/system/standard_harness/reviews/`; `starter/standard-harness/_harness/system/standard_harness/evidence/`; `starter/standard-harness/_harness/system/standard_harness/security/`.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md#multi-llm-orchestration-model`; `.agents/artifacts/ARCHITECTURE_GUIDE.md#provider-neutral-orchestration-architecture`
- Schema impact classification: high
- Schema impact note: orchestration run records, provider assignment policy, adapter manifests, local CLI execution descriptors, result envelopes, evidence provenance, and adjudication records may require schema or validator updates.
- Authoritative source intake reference: Requirements provider-neutral/multi-LLM sections; Implementation Plan Wave 6; Architecture Guide provider-neutral orchestration; Human Owner clarification that subscribed Codex and Claude Code routing is the packet's core.
- Authoritative source disposition: accepted for packet planning; Developer must preserve provider neutrality and credential-safe local execution boundaries.
- Current implementation impact: approved; Orchestrator may route implementation, verification, review, remediation, and Planner closeout inside this packet boundary.
- Existing plan conflict: none. Implementation Plan names PKT-06 as the next concrete packet after PKT-05.
- Impacted packet set scope: PKT-06 only. PKT-07 skill routing and PKT-08 compound feedback/starter promotion remain deferred.
- Authoritative source wave ledger reference: not-needed
- Source wave packet disposition: not-needed

## Problem Statement
Standard Harness v2 already has adapter manifest/envelope foundations, workflow run records,
review/adjudication records, evidence handling, and long-memory question answering. These
surfaces do not yet form a usable orchestration contract for the Human Owner's practical
operating model: using subscribed Codex and Claude Code workers to perform role-assigned
work while the harness remains the authority for scope, evidence, tests, reviews, and
closeout.

Without this packet, provider use remains manual and ad hoc. That leaves two bad failure
modes: the harness cannot actually operate multi-LLM work, or implementation hard-codes
Codex/Claude-specific shortcuts that violate v2 provider neutrality.

## In Scope
- Define a provider-neutral role-routing policy that can assign Planner, Developer, Tester, Reviewer, Orchestrator, Documenter, or independent review lens work to configured provider adapters.
- Support Codex CLI and Claude Code CLI as policy examples and optional local adapter targets when the user has installed and authenticated those CLIs through their own subscription or account flow.
- Distinguish local subscription-authenticated CLI adapters from API-key adapters, manual adapters, and future provider adapters.
- Add or harden adapter manifests for provider, supported roles, execution modes, evidence modes, permission roots, command shape, timeout/cancel behavior, failure modes, and known limitations.
- Add or harden an orchestration run model that records packet id, assigned role, selected adapter, input context snapshot, command/request descriptor, permission boundary, output envelope, artifact manifest, evidence provenance, diagnostics, and adjudication state.
- Provide a manual-first local execution contract: if automatic non-interactive CLI execution is unavailable, blocked by authentication, or outside provider terms, the harness creates an operator-run bundle and ingests the resulting envelope/artifacts.
- Provide an optional local CLI execution path only when the provider CLI is present, authenticated outside the repository, explicitly configured, and allowed by the packet's permission and approval boundary.
- Ingest Codex/Claude worker outputs as bounded evidence, diffs, test outputs, review findings, or adjudication inputs, not as final truth.
- Preserve fail-closed behavior for missing Ready For Code, unsupported role assignment, untrusted output envelope, path escape, direct state mutation, stale input snapshot, missing evidence, timeout, cancellation, malformed JSON, or provider unavailable.
- Add adjudication records for cross-provider disagreements and parallel review outputs.
- Keep credentials, session tokens, subscription state, local provider caches, and provider-specific entry contracts out of starter payload and evidence.
- Add focused tests for routing, adapter manifest validation, CLI availability diagnostics, output envelope ingestion, path/permission denial, adjudication, and provider-neutral contamination checks.

## Out Of Scope
- No browser automation of Codex or Claude subscription web UIs.
- No credential capture, token storage, session cookie storage, or provider login automation inside the repository.
- No bypass of provider subscription, rate-limit, terms, approval, or sandbox limits.
- No requirement that every copied starter repository has Codex or Claude installed.
- No provider-specific file as starter identity, including `AGENTS.md`, Claude-only entry contracts, Codex-only root instructions, provider caches, or local account state.
- No full automatic multi-provider cloud control or remote worker fleet.
- No skill auto-routing workflow implementation; PKT-07 owns skill routing.
- No compound feedback or starter promotion implementation; PKT-08 owns that.
- No release, publish, package metadata change, deployment topology, or starter promotion.
- No implementation approval by implication from this planning packet.

## Modeling Impact
- Modeling impact status: required
- Critical User Journey: Human Owner approves a packet, selects or accepts a provider-neutral role routing plan, lets the harness route a role task to a configured Codex or Claude Code worker, then sees the result as harness evidence, diagnostics, review input, or adjudicated output.
- API contract: orchestration APIs or CLI output must expose packet id, role assignment, adapter id, provider label, execution mode, input snapshot hash, permission roots, command/request descriptor, output envelope status, artifact manifest, evidence provenance, diagnostics, and next boundary.
- Component responsibility: routing policy selects eligible adapters; adapter manifest validates capability and permission; execution adapter prepares or runs local CLI requests; invocation ledger records output; evidence service owns artifacts; review/adjudication service owns disagreement and review records; Planner/Reviewer remain authority for approval and closeout.
- Data ownership: provider outputs are evidence/read models only; packets, gate results, trusted evidence, explicit human decisions, Tester results, Reviewer findings, and Planner closeout remain authority.
- Allowed dependency direction: orchestration services may read packets, context packs, adapter manifests, role policies, evidence records, and review records; canonical packet/evidence state must not depend on provider-specific output as authority.
- Public contract vs internal/scratch field: adapter manifest shape, output envelope shape, orchestration run record, diagnostics, evidence provenance, and contamination rules are public starter contracts; exact command templates, provider CLI flags, retry tuning, and local cache layout are internal or configurable details.
- Provider-neutral execution identity: provider examples must be represented as replaceable adapter ids and policy samples, not hard-coded product names in core identity.
- Modeling risk: a convenient automation path could over-trust a provider, mutate state directly, leak secrets, or hide that a worker only produced fixture-level evidence.
- Modeling disposition: implementation must fail closed unless the selected adapter, approval boundary, input snapshot, permission roots, output envelope, and evidence provenance validate.

## Decision Gates
| Open Question | Packet Decision | Required Implementation Boundary | Status |
| --- | --- | --- | --- |
| Provider examples that remain provider-neutral | Codex CLI and Claude Code CLI are allowed as sample local CLI adapters because they map to the Human Owner's subscribed tools; they must be replaceable adapter examples, not starter identity. | No provider-specific entry contract, token, cache, or required installation may be copied into the starter. Provider names may appear in sample manifests, docs, tests, and policy fixtures only as examples. | closed for PKT-06 |
| Subscription-based CLI vs API-key execution | PKT-06 supports local subscription-authenticated CLI workers first, plus future API-key adapters as a separate mode. | Adapter records must distinguish `local_subscription_cli`, `api_key`, `manual`, and `future_provider` modes. The harness never stores subscription secrets. | closed for PKT-06 |
| Manual-first vs automatic execution | Manual-first is required; optional local non-interactive CLI execution may be added when explicitly configured and authenticated outside the repo. | If CLI execution is unavailable, unauthenticated, ambiguous, or unsafe, the harness must produce an operator-run bundle and blocked/manual diagnostic rather than faking automation. | closed for PKT-06 |
| Authoritative hot operating state store | Existing structured operating state, packets, evidence indexes, review records, and explicit decisions remain authority. Orchestration records are read/evidence records, not approval authority. | Provider outputs may request events or produce evidence, but cannot directly mutate state, approve gates, close packets, or override Reviewer/Planner/user authority. | closed for PKT-06 |
| Cross-provider disagreement | Disagreement becomes adjudication evidence or follow-up decision input. | LLM consensus is not truth; Reviewer or Planner must resolve according to packet and SSOT authority. | closed for PKT-06 |

## Development Documentation Impact
- Project overview impact: none.
- Setup/dev environment impact: update-required if local CLI configuration commands, adapter config locations, or command examples are added.
- Architecture doc impact: conditional; update if implementation changes the Architecture Guide's provider-neutral orchestration boundary.
- API/interface doc impact: contract-required for adapter manifest, output envelope, orchestration run record, and diagnostics.
- Testing doc impact: update-required if new CLI/test commands are added.
- Security/permission doc impact: review-required for credential/session handling, permission roots, path escape, and evidence redaction.
- AI/automation doc impact: update-required for provider routing, manual-run bundles, and adapter result ingestion.
- Required doc paths before closeout: this packet plus changed starter command/manual surfaces.
- Docs must be updated before implementation: no
- Docs must be updated before closeout: yes if command or public adapter contract changes

## Data / Source Impact
- Layer classification: core
- Core / profile / project boundary rationale: provider-neutral orchestration is a reusable harness-system contract, not copied-project packet data.
- Active profile dependencies: none
- Profile-specific evidence status: approved
- UX archetype reference: not-needed; no browser UI or visual workflow is implemented by this packet.
- Selected UX archetype: not-needed
- Archetype fit rationale: human-facing effect is through CLI/service diagnostics, packet evidence, and documentation, not a new UI surface.
- Environment topology reference: local-subscription-cli-boundary
- Source environment: user local machine or worktree with provider CLIs installed and authenticated outside the repository.
- Target environment: clean starter payload runtime under `starter/standard-harness/` plus copied-project `_ops` records when initialized.
- Execution target: local harness CLI/service and optional local non-interactive provider CLI invocation under explicit adapter configuration; otherwise manual operator-run bundle.
- Transfer boundary: provider worker output crosses into the harness only through validated output envelopes, artifact manifests, evidence provenance, and adjudication records.
- Rollback boundary: discard generated run bundles/artifacts and reject untrusted envelopes; canonical packet approval, trusted evidence, and state records must not be directly mutated by provider output.
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md#multi-llm-orchestration-model`
- System context reference: `.agents/artifacts/ARCHITECTURE_GUIDE.md#provider-neutral-orchestration-architecture`
- System boundary impact: adapter manifests, local execution descriptors, workflow orchestration records, evidence ingestion, review/adjudication, validation, and security/redaction.
- Shared module / hotspot impact: adapters, workflow, reviews, evidence, state replay/store, validation, security, and starter contamination checks.
- Schema impact classification: high
- Schema impact note: orchestration run records, provider assignment policy, adapter manifests, local CLI execution descriptors, result envelopes, evidence provenance, and adjudication records may require schema or validator updates.
- Markdown / docs impact: conditional; update human/operator docs only for new command/config surfaces.
- Documentation impact: conditional
- Docs parity needed: yes if public adapter commands, config, or result schemas change.
- generated docs 영향: Active Context and validation reports must be regenerated by runtime after state-changing transitions; generated docs are not manually edited.
- validator / cutover 영향: starter validation and packet preflight must detect provider-specific contamination, unsafe credentials, and invalid orchestration envelopes.
- Harness validation / product verification boundary: harness validation checks structure/state consistency only; provider orchestration behavior still needs focused tests and review evidence.
- Authoritative source refs: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; this packet.
- Existing plan conflict: none
- Impacted packet set scope: PKT-06 only

## Feature Artifact Sync Matrix
| Source Change | Required Artifact | Current Status | Required Owner |
| --- | --- | --- | --- |
| Human Owner subscription-routing requirement | this packet | drafted | Planner |
| Wave 6 provider-neutral orchestration scope | this packet | drafted | Planner |
| Codex/Claude sample provider adapters | starter adapter policy/fixtures/tests | planned | Developer, Tester |
| Local subscription CLI execution mode | adapter manifest/envelope/orchestration schema and tests | planned | Developer, Tester |
| Manual-run bundle fallback | starter CLI/service behavior and tests | planned | Developer, Tester |
| Result ingestion into harness evidence/state | adapter invocation ledger, evidence records, adjudication records | planned | Developer, Tester |
| Credential/session exclusion | security/redaction/contamination tests | planned | Developer, Tester, Reviewer |
| Cross-provider disagreement | review/adjudication tests | planned | Developer, Tester, Reviewer |
| Provider-specific contamination guard | starter validation/contamination tests | planned | Developer, Tester |
| Human-facing docs for adapter setup | START_HERE or `_harness` manual surfaces if commands/config are added | conditional | Developer, Reviewer |

## Security Review Request
- Security review required: yes.
- Security review focus: credential/session/token exclusion, provider cache exclusion, permission roots, path escape, command injection, direct state mutation denial, output envelope trust, sensitive evidence handling, and fail-closed behavior for unavailable/unauthenticated providers.
- Declared security-sensitive paths: `starter/standard-harness/_harness/system/standard_harness/adapters/**`; `starter/standard-harness/_harness/system/standard_harness/workflow/**`; `starter/standard-harness/_harness/system/standard_harness/evidence/**`; `starter/standard-harness/_harness/system/standard_harness/security/**`; `starter/standard-harness/_harness/system/standard_harness/validation/**`.
- Security evidence requirement: focused negative tests plus independent `adversarial_security_review`.
- Dependency/CLI review required: yes; any provider CLI command integration must be reviewed as an external tool boundary and must not introduce a required product dependency.
- Security review status: pass.
- Security review evidence path: `reference/reports/security/PKT-06-security-review.json`.
- Security disposition: no provider CLI is executed by the implementation; local subscription adapters are modeled as explicit manifests/manual-run bundles, credential material is rejected in manifests, unavailable CLIs fail closed, adapter envelopes remain read-model/evidence input, and direct state mutation/path escape/missing provenance are blocked by existing boundary validation.

## CSO Security Review
- Security review evidence status: pass
- Security review report path: reference/reports/security/PKT-06-security-review.json
- Security review decision: pass
- Security review scope: provider-neutral adapter manifest, contract matrix validation, local subscription CLI/manual fallback policy, output envelope trust boundary, credential/session/token exclusion, direct state mutation denial, path/provenance boundary, and provider-neutral product identity.
- Required CSO phases: 0,1,2,5,8,12,13,14
- Raw secret material in report: no
- Findings disposition: no blocking findings; future real CLI command execution requires a new command-construction/process-isolation review.

## Acceptance Criteria
- A provider-neutral routing policy can assign role work to configured adapters without hard-coding Codex or Claude as product identity.
- Codex CLI and Claude Code CLI appear only as replaceable sample local CLI adapters or policy examples.
- Adapter manifests distinguish provider, supported roles, execution mode, credential mode, evidence mode, read/write capability, permission roots, known limitations, failure modes, and artifact export capability.
- Local subscription-authenticated CLI mode does not store tokens, session files, subscription state, cookies, or provider caches in starter, `_ops`, evidence, generated context, or packet closeout.
- If Codex or Claude Code CLI is not installed, not authenticated, unavailable, or unsafe to execute, orchestration returns a fail-closed diagnostic and/or manual-run bundle instead of pretending execution succeeded.
- Optional automatic CLI execution requires explicit local configuration, approved packet boundary, permission roots, input snapshot hash, timeout/cancel behavior, and non-interactive output capture.
- Worker output is ingested as an adapter output envelope with artifact manifest, evidence provenance, diagnostics, and source snapshot metadata.
- Adapter output cannot directly mutate SQLite state, approve Ready For Code, close packets, accept residual risk, release/publish, or override Reviewer/Planner/user authority.
- Cross-provider disagreement produces adjudication records, review findings, or follow-up decisions; LLM-to-LLM agreement alone is not final truth.
- Path escape, command injection, direct state mutation, malformed envelope, stale input snapshot, missing evidence provenance, timeout, cancellation, and mock success are rejected or blocked with diagnostics.
- Orchestration records are queryable by packet id, role, adapter id, provider label, execution mode, status, evidence refs, and adjudication state.
- Tests prove both positive routing/ingestion behavior and negative fail-closed behavior.
- Starter contamination checks prove no provider-specific entry contract, credential, cache, local DB, root state, or subscription artifact enters the clean payload.
- PKT-06 does not claim skill auto-routing, compound feedback, starter promotion, release, deployment, or full automatic remote worker control.

## Verification Manifest
- Ready For Code: approved.
- Required root validation: `node .harness/runtime/state/dev05-cli.js validate` or current root validation equivalent after implementation.
- Required root regression: `npm.cmd test` from the repository root when root harness runtime, workflow, validator, packet preflight, or shared test helpers change; if implementation changes only starter payload files, Reviewer may accept a recorded N/A with root validation plus packet-preflight evidence and a no-root-runtime-change rationale.
- Required validator: packet preflight plus harness validator/report must pass at implementation transition and closeout.
- Required starter validation: `python _harness\bin\harness_cli.py --json --harness-root . validate --starter --installed-runtime` from `starter/standard-harness/`.
- Required standard-template validation: starter payload checks must pass from `starter/standard-harness/`; root-only evidence is insufficient.
- Required focused starter tests:
  - provider-neutral routing policy tests,
  - adapter manifest validation tests,
  - local subscription CLI availability/configuration diagnostic tests,
  - manual-run bundle fallback tests,
  - output envelope ingestion tests,
  - permission/path/direct-mutation rejection tests,
  - adjudication/disagreement tests,
  - credential/session/provider-cache contamination tests.
- Required targeted validation: adapter, workflow, review/adjudication, evidence, security, and contamination tests.
- Required starter regression: `python -m unittest discover _harness\test` from `starter/standard-harness/`.
- Required packet preflight: planning-open before Ready For Code, implementation-transition after packet-doc review/approval, and closeout preflight after implementation evidence exists.
- Security: required for provider CLI and credential/session surfaces.
- Dependency/CLI surface review: required if implementation executes, shells out to, or documents required provider CLI commands.
- Browser: not-needed; no browser UI automation is in scope.
- Browser evidence required: no
- Browser evidence status: not_required
- Browser evidence N/A rationale: PKT-06 changes Python starter runtime contracts, CLI/service diagnostics, and packet evidence only; it adds no browser UI, DOM flow, route, or visual behavior.
- Review closeout: Reviewer must check source alignment, acceptance evidence, provider neutrality, security/adversarial risk, docs parity, contamination checks, and the packet-bound results of `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`.
- Active context refresh: regenerate Active Context and validation report after state-changing transitions.

## Verification Scenarios
| Scenario | Expected Result | Evidence |
| --- | --- | --- |
| Codex sample adapter selected for Developer | Routing policy records a provider-neutral assignment and adapter id without making Codex starter identity. | routing tests |
| Claude Code sample adapter selected for Reviewer | Routing policy records the role assignment and produces an input snapshot and evidence boundary. | routing tests |
| CLI unavailable | Harness returns provider-unavailable/manual-run diagnostic and no success claim. | availability negative test |
| CLI authenticated outside repo | Harness records credential mode without storing token/session data. | security/contamination test |
| Worker output envelope valid | Output is recorded with artifact manifest and evidence provenance. | ingestion test |
| Worker output requests direct state write | Envelope is rejected and state remains unchanged. | boundary negative test |
| Path escape in artifact manifest | Output is rejected or blocked with path escape diagnostic. | permission negative test |
| Cross-provider disagreement | Disagreement is recorded as adjudication input and does not become truth automatically. | adjudication test |
| Mock or fixture success | Mock success cannot satisfy production execution evidence. | evidence quality test |
| Starter contamination scan | Provider-specific entry contracts, credentials, caches, and local account state are absent. | contamination test |

## Planner Packet Challenge Review
- Challenge reviewer: adversarial planning reviewer.
- Challenge reviewer independence basis: challenge pass reviews Planner-authored packet quality only and does not approve implementation.
- Source refs reviewed: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; `reference/packets/PKT-05_LONG_MEMORY_AND_QUESTION_ANSWERING_INDEX.md`; current starter adapter/workflow/review foundations.
- Challenge status: pass
- Parent objective coverage: the packet covers Wave 6 provider-neutral orchestration and the Human Owner's subscribed Codex/Claude worker-routing requirement.
- Deferred scope with named follow-up: PKT-07 owns skill auto-routing; PKT-08 owns compound feedback and starter promotion; future packets may expand remote/cloud worker control only after this local/manual-first contract is proven.
- Acceptance proves behavior change: acceptance requires routing records, adapter manifest validation, fail-closed CLI diagnostics, output envelope ingestion, adjudication, and contamination tests, not only documentation.
- Failure fixture or failure condition: fail if the implementation hard-codes Codex/Claude as product identity, stores provider credentials, claims success when CLI is unavailable, lets adapter output mutate state directly, or treats LLM agreement as truth.
- Reviewer closeout hold basis: Reviewer may hold closeout for provider-specific identity leakage, missing credential exclusion tests, missing manual fallback, weak envelope validation, missing adjudication evidence, fixture-only provider tests, or scope creep into PKT-07/PKT-08.
- First-wave limit check: this packet intentionally proves local/manual-first provider-neutral orchestration and evidence ingestion, not full automatic remote worker fleet control.
- Guidance-only sufficiency rationale: guidance-only is insufficient; routing policy, adapter contracts, orchestration records, envelope validation, diagnostics, and tests must change after Ready For Code.
- Challenge evidence artifact path: `reference/packets/PKT-06_PROVIDER_NEUTRAL_ORCHESTRATION_CONTRACT.md`
- Findings disposition: no blocking findings after explicitly adding subscription CLI mode, manual-first fallback, credential exclusion, output ingestion, adjudication, and provider-neutral contamination acceptance.
- Required corrections applied: applied in this planning draft.
- No self-approval claim: this challenge does not close Human Ready For Code, replace independent packet-doc review, replace Tester evidence, replace Reviewer closeout, approve release, or approve starter promotion.

## Packet Document Review
- Packet doc review policy: independent-reviewer-required-before-ready-for-code
- Packet doc reviewer: independent-packet-doc-review-agent-019f0e87
- Packet doc reviewer independence basis: independent read-only packet document reviewer; not packet author, Planner, Developer, Tester, Orchestrator, or generated summary.
- Packet doc review evidence path: `reference/reports/review/PKT-06-packet-doc-review.md`
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: pass
- Verification scope strength: pass after adding concrete root regression command/N/A boundary.
- Deferred/out-of-scope ownership: pass
- Required corrections: root regression gate was bound to `npm.cmd test` or constrained N/A path.
- Findings disposition: initial P2 resolved; no findings after second pass.
- No self-approval claim: independent reviewer, not packet author.

## TDD Evidence Contract
- TDD mode: required
- Red test file: starter/standard-harness/_harness/test/test_provider_neutral_orchestration.py
- Red command: python -m unittest _harness.test.test_provider_neutral_orchestration
- Red exit code: 1
- Red failure kind: expected-contract-failure
- Red ran at: 2026-06-28T23:05:00+09:00
- Red output excerpt: ModuleNotFoundError: No module named 'standard_harness.workflow.provider_orchestration'
- Red output artifact: reference/reports/tdd/PKT-06-red.md
- Green command: python -m unittest _harness.test.test_provider_neutral_orchestration
- Green exit code: 0
- Green ran at: 2026-06-28T23:10:00+09:00
- Green output excerpt: Ran 12 tests in 0.843s; OK
- Green output artifact: reference/reports/tdd/PKT-06-green.md
- Refactor verified: yes
- Behavior-level test: yes
- Test-only production hook: no

## Independent Review Lens Evidence
- Independent review lens policy: four-independent-closeout-agents-required
- Parallel review execution: parallel
- challenge_review agent: 019f0e94-a55f-71f0-bb70-a058caa17b11
- challenge_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- challenge_review evidence path: `reference/reports/review/PKT-06-independent-closeout-lenses.md`
- challenge_review status: pass
- challenge_review finding count: 0
- challenge_review reviewer disposition: pass after remediation; prior findings closed by execution-readiness gating, queryable orchestration records, ledger envelope validation, and replay handling.
- adversarial_security_review agent: 019f0e94-c51a-7861-898e-a6c34a10b71c
- adversarial_security_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- adversarial_security_review evidence path: `reference/reports/review/PKT-06-independent-closeout-lenses.md`
- adversarial_security_review status: pass
- adversarial_security_review finding count: 0
- adversarial_security_review reviewer disposition: pass after remediation; trusted-root ingestion, credential/cache exclusion, execution-precondition gating, and negative security tests are closed for PKT-06 scope.
- code_quality_review agent: 019f0e94-daef-75f3-86a1-c426f9b8928a
- code_quality_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- code_quality_review evidence path: `reference/reports/review/PKT-06-independent-closeout-lenses.md`
- code_quality_review status: pass
- code_quality_review finding count: 0
- code_quality_review reviewer disposition: pass after remediation; provider orchestration ledger, replay handling, and ledger-path negative coverage are closed.
- evidence_review agent: 019f0e94-f1b5-7d42-9346-017bfa198d9e
- evidence_review independence basis: independent closeout lens reviewer; not Planner, Developer, Tester, Orchestrator, packet author, or generated summary.
- evidence_review evidence path: `reference/reports/review/PKT-06-independent-closeout-lenses.md`
- evidence_review status: pass
- evidence_review finding count: 0
- evidence_review reviewer disposition: pass for implementation/test evidence; closeout packaging is completed by this report and final closeout preflight/state refresh.

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
- Implementation delta summary: Added provider-neutral local-subscription orchestration policy, credential-mode manifest validation, expanded credential/cache/session rejection, fail-closed execution readiness, trusted-root/stale-snapshot envelope validation, provider orchestration run/adjudication event ledger, and replay-safe provider orchestration events.
- Refactor / residual debt disposition: no in-scope residual debt for PKT-06; future real Codex CLI / Claude Code CLI process execution remains a named future security/command-isolation review scope.
- Documentation impact / docs parity result: pass; packet, TDD evidence, CSO report, and independent closeout lens report updated. No browser UI, release, deployment, starter promotion, PKT-07 skill routing, or PKT-08 compound feedback docs are claimed.
- Deferred follow-up item: PKT-07 skill routing; PKT-08 compound feedback and starter promotion; possible future remote/cloud worker-control packet.
- Closeout notes: closeout preflight passed; four independent closeout lenses passed after remediation; Planner closeout may proceed inside PKT-06 scope.

## Reopen Trigger
- Reopen this packet if provider subscription/product terms, Codex CLI behavior, Claude Code CLI behavior, adapter execution mode, credential/session handling, output envelope shape, role-routing policy, adjudication rules, contamination checks, or Human Owner orchestration expectations change.
- Reopen if implementation discovers that local non-interactive CLI execution is unavailable or unsafe and the packet must narrow to manual-run bundle ingestion only.
- Reopen if any reviewer finds provider-specific identity leakage, credential exposure, direct state mutation, fixture-only evidence, or scope creep into skill routing/compound feedback/starter promotion.

## Planner Handoff
- Current owner: Planner.
- Current status: Ready For Code approved after independent packet-doc review pass and Planner correction.
- Next recommended workflow: Orchestrator.
- Next first action: run implementation-transition preflight and route approved PKT-06 through Developer, Tester, Reviewer, independent closeout lenses, bounded remediation, and Planner closeout.
- Required SSOT: `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`; this packet.
- Approval boundary: implementation, testing, review, remediation, and Planner closeout may proceed only inside PKT-06 scope; no release, publish, starter promotion, PKT-07 skill routing, PKT-08 compound feedback, full automatic remote/cloud worker control, browser automation of provider UIs, or credential/session storage is approved.
