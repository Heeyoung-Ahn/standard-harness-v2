# PKT-12 Schema Permission Boundary Cleanup

> READY FOR CODE. Human Owner approved PKT-12 Ready For Code in the active goal
> continuation after independent challenge review and independent `packet_doc_review`
> passed. Route implementation through Orchestrator.

## Purpose
Align the starter payload's risk taxonomy, schema identity labels, and copied-starter
permission boundaries so the clean Standard Harness v2 starter does not ship root
development repository concepts or ambiguous v2.0/v2.1 product identity.

## Quick Decision Header
| Item | Proposed | Why | Status |
|---|---|---|---|
| Work item | PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP | Second hardening packet after PKT-11 baseline closeout. | selected |
| Ready For Code | approved | Human Owner approved PKT-12 Ready For Code in the active goal continuation after required independent reviews passed. | closed |
| Human sync needed | no | Schema identity and copied-starter permission-boundary policy decisions are recorded for implementation. | closed |
| v2.0 philosophy parity gate | planned | Keeps Standard Harness v2 provider-neutral and clean-copyable by removing root-development leakage and ambiguous product identity. | selected |
| Packet type | harness-system | Starter schemas, policies, validators, and copied-starter boundaries are reusable harness system surfaces. | proposed |
| Risk level | high | Mistakes can break packet validation, loosen permissions, or ship root-only paths in copied starters. | selected |
| Risk class | high / contract | Starter schema and permission contracts can affect every copied project and packet validation path. | proposed |
| Gate profile | contract | Requires starter validation, root validation, security/boundary review, and copied-starter negative tests. | selected |
| Gate profile version | harness-system@contract/v1 | Contract-grade high-risk harness-system cleanup with starter impact. | selected |
| Route class | packet-path | Not fast-path eligible because it changes starter schemas and permission policies. | selected |
| Change zone | core | `_harness/schemas`, `_harness/policies`, validators, and tests are core starter contract. | selected |
| Delivery route mode | orchestrated-closeout | After Ready For Code, route Developer -> Tester -> Reviewer -> bounded remediation -> Planner closeout. | proposed |
| User-facing impact | copied-starter safety | Users receive clearer risk names and no root-development write zones inside copied starter policy. | selected |
| Layer classification | core | Applies to reusable starter contract. | selected |
| Active profile dependencies | none | No optional profile is required. | closed |
| Profile evidence status | not-needed | No optional profile is active for this packet. | closed |
| UX archetype status | approved | No UI/UX surface is included; non-UI disposition approved for implementation transition. | closed |
| UX deviation status | none | No UI/UX archetype or deviation is involved. | closed |
| Environment topology status | not-needed | No deploy/cutover topology is changed; local root and copied-starter validation are the verification boundary. | closed |
| Domain foundation status | approved | Domain is starter schema identity, risk taxonomy compatibility, permission zones, and copied-starter contamination boundary. | selected |
| System context status | approved | System Context and PKT-11 closure matrix define these as remaining v2.0 hardening lanes after baseline repair. | selected |
| Authoritative source intake status | approved | Source is the Human Owner's PKT-12 hardening concern plus PKT-11 closure matrix and implementation-plan hardening rows. | selected |
| Shared-source wave status | not-needed | This is not a multi-repository or sibling-project rollout; copied-starter smoke is local evidence. | closed |
| Existing system dependency | internal | Depends on current starter schema validation, permission/boundary validation, and gate profile policy. | selected |
| New authoritative source impact | analyzed | No new external source; source is Human Owner hardening concern plus PKT-11 closure matrix. | selected |
| Risk if started now | high | Current starter payload shows schema/permission drift that can mislead packet authors or copied-starter workers. | selected |
| Planner Packet Challenge Review | pass | Independent challenge review passed after packet corrections. | closed |
| Packet doc review | pass | Independent packet_doc_review passed after packet corrections. | closed |
| Packet doc review status | pass | Required document gate passed before Ready For Code request. | closed |
| Packet exit gate status | planned | Exit requires schema/policy tests, copied-starter negative tests, root validation, and strict review. | selected |

## Lane-Typed Minimum Contract
- Lane-type declaration: planning
- Lane-type universal minimum sections: goal; non-goal; in scope; out of scope; data / source impact; verification plan; refactor / residual debt disposition; packet exit quality gate; reopen trigger
- Lane-type required sections: Quick Decision Header; Hardening Concern Coverage; Source-Of-Truth Order; Compatibility Matrix; Acceptance; Verification Manifest; Planner Packet Challenge Review; Packet Document Review
- Lane-type conditional sections: Gate Profile Metadata; Required Gate And Lens Evidence
  Paths; Required Closeout Lens Mapping; Modeling Impact; Required Runtime Command
  Template; Expected Negative Fixtures
- Lane-type not-needed sections: UX / browser evidence; Environment topology;
  Optional profile evidence; Deployment / release publication; Dependency / CLI intake
- Layer classification: core
- Required reading before code: `.agents/artifacts/REQUIREMENTS.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`; `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`;
  `starter/standard-harness/_harness/schemas/packet.schema.json`;
  `starter/standard-harness/_harness/policies/gate-profiles.yaml`;
  `starter/standard-harness/_harness/policies/agent-permissions.yaml`;
  `starter/standard-harness/_harness/policies/zones.yaml`; relevant validators/tests.
- UX archetype reference: not-needed; no UI/browser surface.
- Selected UX archetype: not-needed
- Domain foundation reference: `.agents/artifacts/REQUIREMENTS.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`;
  `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`;
  `starter/standard-harness/_harness/schemas/packet.schema.json`;
  `starter/standard-harness/_harness/policies/gate-profiles.yaml`;
  `starter/standard-harness/_harness/policies/agent-permissions.yaml`;
  `starter/standard-harness/_harness/policies/zones.yaml`
- Schema impact classification: high
- Schema impact note: packet schema risk enum, schema `$id`/title labels, and validation compatibility behavior are directly in scope.
- Authoritative source intake reference: Human Owner PKT-12 hardening direction on
  2026-06-30; PKT-11 closure matrix defers; `.agents/artifacts/IMPLEMENTATION_PLAN.md`
  v2.0 hardening PKT-12 rows.
- Authoritative source disposition: accepted for packet planning; implementation must
  preserve provider-neutral v2.0 product identity, copied-starter cleanliness, and
  packet-before-code boundaries.
- Current implementation impact: Ready For Code is approved for starter schema
  identity/risk enum, copied-starter permission/zones policy, validator/test updates, and
  required evidence capture inside PKT-12 scope.
- Existing plan conflict: none blocking after PKT-11 baseline; PKT-12 owns schema,
  taxonomy, permission-boundary, and contamination-fixture cleanup while PKT-13 through
  PKT-15 remain out of scope.
- Impacted packet set scope: PKT-12 only for implementation; PKT-11 provides baseline
  evidence and PKT-13 through PKT-15 are named defers, not implementation scope.

## Gate Profile Metadata
| Field | Value |
|---|---|
| Packet type | `harness-system` |
| Risk class | `high / contract` |
| Gate profile version | `harness-system@contract/v1` |
| Changed zones | starter schemas, starter policies, permission zones, validators/tests, copied-starter smoke fixtures |
| Base required gates | `harness-validation`, `starter-validation`, `boundary`, `manual-command-if-docs-changed`, `closeout` |
| High/contract additions | schema compatibility evidence, permission-boundary negative fixtures, security/boundary review, independent closeout review |
| Pre-implementation gates | Planner Packet Challenge Review, independent `packet_doc_review`, explicit Human Owner Ready For Code |
| Required command gates | root validation, starter Python test discovery, targeted schema/permission tests, copied-starter clean smoke |
| Required closeout lenses | canonical `challenge_review`, `adversarial_security_review`, `code_quality_review`, and `evidence_review`; PKT-12-specific schema/contract, permission/security, and copied-starter cleanliness questions are mapped under those lenses. |
| Residual-risk policy | Reviewer disposition alone cannot accept unresolved schema identity, permission leakage, or alias compatibility drift. Any unresolved drift requires named defer ownership, evidence, Reviewer disposition, and explicit Human Owner residual-risk/defer approval. |

## Required Gate And Lens Evidence Paths
| Gate / Lens | Required Evidence Path | Required Status Before Closeout |
|---|---|---|
| Planner Packet Challenge Review | `reference/reports/review/PKT-12-planner-challenge-review.md` | pass before Ready For Code request |
| Packet Document Review | `reference/reports/review/PKT-12-packet-doc-review.md` | pass before Ready For Code request |
| Root validation output | `reference/reports/validation/PKT-12-root-validation.json` | root validation pass after implementation |
| Validation report/context output | `reference/reports/validation/PKT-12-validation-report-context.md` | validation report and Active Context regenerated if implementation changes root operational state or validation summaries |
| Root regression output | `reference/reports/validation/PKT-12-root-regression.md` | root regression pass or scoped N/A with Reviewer acceptance |
| Starter validation output | `reference/reports/validation/PKT-12-starter-validation.md` | starter test discovery pass |
| Targeted schema/permission test output | `reference/reports/validation/PKT-12-targeted-tests.md` | focused taxonomy, identity, permission, and contamination tests pass |
| Validator rejection fixture output | `reference/reports/validation/PKT-12-validator-rejections.md` | expected rejection diagnostics captured |
| Risk taxonomy evidence | `reference/reports/schema/PKT-12-risk-taxonomy.md` | canonical and alias behavior verified |
| Schema identity evidence | `reference/reports/schema/PKT-12-schema-identity.md` | v2.0 product identity and schema-contract version policy verified |
| Permission boundary evidence | `reference/reports/security/PKT-12-permission-boundary.md` | copied-starter root path leakage rejected |
| Copied-starter contamination evidence | `reference/reports/starter/PKT-12-copied-starter-smoke.md` | clean copied-starter smoke and negative fixtures pass |
| Tester report | `reference/reports/test/PKT-12_TESTER_REPORT.md` | pass or defects routed |
| Security/boundary review | `reference/reports/security/PKT-12-security-review.json` | pass or Human-approved residual risk |
| Reviewer adjudication | `reference/reports/review/PKT-12_REVIEW_REPORT.md` | pass after all required evidence is reviewed |
| Planner closeout | `reference/reports/closeout/PKT-12_PLANNER_CLOSEOUT.md` | records whether PKT-13 may use PKT-12 as a stable boundary baseline |

## Required Closeout Lens Mapping
| Canonical Lens | PKT-12-Specific Questions |
|---|---|
| `challenge_review` | Does the implementation close the hardening concern rows without absorbing PKT-13, PKT-14, or PKT-15 scope? Are acceptance, failure fixtures, Human decisions, and residual-risk ownership concrete enough for closeout? |
| `adversarial_security_review` | Does the copied-starter permission boundary reject root path leakage, root-only roles, secrets, local DB files, generated state, provider-specific entry contracts, and root development artifacts? |
| `code_quality_review` | Are risk normalization, schema identity policy, permission zones, and contamination checks implemented in the smallest coherent surfaces without duplicating incompatible risk logic? |
| `evidence_review` | Do root validation, starter validation, targeted tests, copied-starter smoke, schema reports, security review, and Reviewer adjudication prove behavior rather than file existence or prose-only closure? |

## Source Authority
- Human Owner PKT-12 concern: runtime policy uses canonical `low`, `standard`, `high`,
  `critical` while starter packet schema includes `medium` and omits `standard`.
- Human Owner PKT-12 concern: several schema `$id`/title values still expose v2.1 labels in
  the v2.0 starter payload.
- Human Owner PKT-12 concern: copied starter policy includes root-development concepts such
  as `harness-developer`, `starter` logical zone, and `starter/standard-harness/**`.
- PKT-11 closeout matrix defers SHV2-REQ-002, 003, 008, 018, 022, 023, 045, and 046 to PKT-12.
- `.agents/artifacts/IMPLEMENTATION_PLAN.md` PKT-12 hardening row and readiness requirements.

## Hardening Concern Coverage
| Concern | Requirement IDs | Required Closure Evidence |
|---|---|---|
| Runtime risk taxonomy uses canonical `low`, `standard`, `high`, `critical`, but starter packet schema exposes `medium` and omits `standard`. | SHV2-REQ-023, 045, 046 | Schema, policy, validator, and tests agree on canonical names and alias handling. |
| Starter schema `$id`/title labels expose ambiguous `v2.1` identity in a v2.0 product payload. | SHV2-REQ-001, 002, 003, 005, 006 | Schema namespace/version policy is explicit; public schema identifiers/titles align or are documented/tested as non-product schema versions. |
| Copied starter permission policy includes root-development concepts such as `harness-developer`, `starter`, or `starter/standard-harness/**`. | SHV2-REQ-002, 003, 005, 007, 008, 018, 022 | Permission policy and boundary tests reject root development path leakage in a copied starter. |
| Clean starter contamination checks do not explicitly cover the full forbidden set. | SHV2-REQ-002, 003, 004, 005, 018, 022 | Negative fixtures cover root history, generated runtime state, packet evidence, wiki state, local DB files, caches, secrets, and provider-specific entry contracts. |

## Current Drift Evidence
| Surface | Current Drift | Source |
|---|---|---|
| `packet.schema.json` | `$id` is `standard-harness-v2.1/packet.schema.json`; title is `Standard Harness V2.1 Packet`; `riskLevel` enum is `low`, `medium`, `high`, `critical`. | `starter/standard-harness/_harness/schemas/packet.schema.json` |
| `gate-profiles.yaml` | canonical `riskLevels` are `low`, `standard`, `high`, `critical`; aliases map `normal` and `medium` to `standard`. | `starter/standard-harness/_harness/policies/gate-profiles.yaml` |
| schema IDs | `evidence`, `gate-result`, `human-decision`, `na-decision`, and `packet` schema `$id` values contain `standard-harness-v2.1`. | `starter/standard-harness/_harness/schemas/*.schema.json` |
| schema titles | `final-closeout-evidence` and `review-governance-evidence` schema titles contain `V2.1` wording even though their `$id` values do not. | `starter/standard-harness/_harness/schemas/final-closeout-evidence.schema.json`; `starter/standard-harness/_harness/schemas/review-governance-evidence.schema.json` |
| `agent-permissions.yaml` | role `harness-developer` can write `_harness/**`, `_ops/evidence/**`, and `starter/standard-harness/**`; logical zone includes `starter`. | `starter/standard-harness/_harness/policies/agent-permissions.yaml` |
| `zones.yaml` | logical zone `starter` maps to `starter/standard-harness/**`, and harness-system/starter-promotion rules include `starter`. | `starter/standard-harness/_harness/policies/zones.yaml` |

## Source-Of-Truth Order
1. Explicit Human Owner approval and PKT-12 Ready For Code scope.
2. Requirements and Implementation Plan hardening matrix.
3. Starter schema/policy contracts and validators.
4. Tests and copied-starter smoke evidence.
5. Generated summaries and Active Context as read models only.

## Compatibility Matrix
| Decision Area | Required Policy Before Implementation | Acceptance Impact |
|---|---|---|
| Canonical risk names | Canonical starter risk levels are `low`, `standard`, `high`, `critical`. | `packet.schema.json` must include `standard`; `medium` may remain only as documented alias input if validators normalize it and schemas/tests make that explicit. |
| Alias behavior | `normal` and `medium` are compatibility aliases for `standard`; `release-sensitive` is a critical overlay/alias, not a base risk level. | Tests must prove aliases normalize without lowering hard stops. |
| Schema identity | Public product identity is Standard Harness v2.0; schema versions may differ only if named as schema-contract versions, not product versions. | `$id`/title policy must either remove v2.1 product wording or document/test it as schema-contract versioning. |
| Copied-starter permissions | Copied starter must describe only `_harness`, `_ops`, and `product` zones, not root `starter/standard-harness/**`. | Policy/tests must reject root-development path leakage. |
| Root development role | Root-only development roles must not ship as copied-starter worker roles unless explicitly renamed/scoped to copied-starter semantics. | `harness-developer` either removed, renamed, or constrained with validator evidence. |

## Approved Human Decisions
| Decision | Approved Direction | Rationale |
|---|---|---|
| Schema identity policy | Remove product-facing `v2.1` / `V2.1` wording from affected starter schema `$id` and title fields unless implementation evidence proves a specific value is a non-product schema-contract version and Reviewer accepts it. | Standard Harness v2.0 product identity must remain unambiguous in copied starters. |
| Copied-starter permission boundary | Remove or rename root-development-only role/path concepts from copied-starter policy; copied-starter roles must not grant `starter/standard-harness/**` write access or expose root `harness-developer` semantics. | A copied starter should operate in its own repository root using `_harness`, `_ops`, and `product` zones, not the root development repository layout. |

## Implementation Surface Inventory
Default Developer ownership is limited to these surfaces unless Ready For Code scope is
explicitly amended:

| Surface | Expected Files / Paths | Purpose |
|---|---|---|
| Starter schema identity and risk enum | `starter/standard-harness/_harness/schemas/packet.schema.json`; `evidence.schema.json`; `gate-result.schema.json`; `human-decision.schema.json`; `na-decision.schema.json`; `final-closeout-evidence.schema.json`; `review-governance-evidence.schema.json` | Align canonical risk enum and remove or classify v2.1 product wording. |
| Starter risk policy | `starter/standard-harness/_harness/policies/gate-profiles.yaml`; `starter/standard-harness/_harness/system/standard_harness/policy/gate_profiles.py`; `starter/standard-harness/_harness/system/standard_harness/policy/risk.py` | Keep canonical risk levels and alias normalization consistent. |
| Starter permission and zones policy | `starter/standard-harness/_harness/policies/agent-permissions.yaml`; `starter/standard-harness/_harness/policies/zones.yaml`; `starter/standard-harness/_harness/system/standard_harness/policy/permissions.py`; `starter/standard-harness/_harness/system/standard_harness/policy/zones.py` | Remove copied-starter root path leakage and root-only role confusion. |
| Boundary and contamination validators | `starter/standard-harness/_harness/system/standard_harness/validation/boundary.py`; `starter/standard-harness/_harness/system/standard_harness/validation/aggregator.py`; `starter/standard-harness/_harness/system/standard_harness/starter/contamination.py` | Reject root-development writes and copied-starter contamination fixtures. |
| Focused starter tests | `starter/standard-harness/_harness/test/test_gate_profile_engine.py`; `starter/standard-harness/_harness/test/test_operating_folder_contract.py`; `starter/standard-harness/_harness/test/test_compound_feedback_promotion.py`; new schema identity / permission boundary tests if needed | Prove taxonomy, schema identity, permission boundary, and clean-copy behavior. |
| Root tests, if root mirrors starter behavior | `.harness/test/*.test.js` | Keep root runtime validation and template sync behavior aligned when starter contract changes are mirrored. |

Any additional validator/test file touched during implementation must be added to
`reference/reports/test/PKT-12_TESTER_REPORT.md` with rationale before closeout.

## Modeling Impact
- Required: yes
- Modeling impact status: required
- Trigger: PKT-12 changes core starter schema, risk taxonomy, permission policy, zones, and copied-starter contamination validation.
- Scope: packet risk-level schema, gate profile risk aliases, schema `$id`/title identity policy, copied-starter agent permissions, logical zones, contamination negative fixtures, and copied-starter smoke evidence.
- Critical User Journey: a Human Owner copies `starter/standard-harness/` into a new repository, creates or validates a packet, and sees canonical risk names plus copied-starter permissions that do not mention root development paths, root roles, root evidence, or provider-specific entry contracts.
- API contract: starter schema and validator inputs must accept canonical `low`, `standard`, `high`, and `critical`; any compatibility aliases must normalize deterministically and must not lower high/critical/release/security gate behavior.
- Public contract vs internal/scratch field: public contract surfaces are starter schema
  `$id`/title, packet `riskLevel`, gate profile risk levels/aliases, copied-starter
  `agent-permissions.yaml`, copied-starter `zones.yaml`, and documented validator
  behavior; root-only planning evidence, local DB state, generated root summaries, and
  temporary test fixtures are internal and must not ship as copied-starter product
  contract.
- Component responsibility: starter schemas declare acceptable packet shapes; gate profile policy declares canonical risk levels and aliases; validators enforce normalization and boundary rejection; copied-starter smoke proves exported payload cleanliness; Reviewer adjudicates residual schema or permission risk.
- Allowed dependency direction: runtime validators may consume schema/policy contracts; starter policy must not depend on root repository paths, root operational DB state, generated root summaries, or provider-specific Codex entry contracts.
- Data ownership: starter schema/policy files own reusable product contract; root governance artifacts own planning evidence; generated summaries are read models only.
- Failure condition: a packet using canonical `standard` is rejected, `medium` is treated as a separate canonical base level, a copied starter contains `starter/standard-harness/**`, or a copied-starter role can write root-development paths.
- Non-goal boundary: PKT-12 does not build Human Owner QA, operating intelligence, real CLI worker E2E, friction capture call-site integration, or starter-promotion rehearsal loops.

## In Scope
- Update starter schemas and/or validators to align risk enum and alias behavior.
- Establish and document schema identity policy for v2.0 product vs schema-contract versions.
- Remove or constrain root-development permission concepts from copied-starter policy.
- Update boundary/permission tests and copied-starter smoke/negative fixtures.
- Update requirements/implementation evidence only where PKT-12 closure requires it.

## Out Of Scope
- No Human Owner QA/operating-intelligence query layer; belongs to PKT-13.
- No real Codex CLI / Claude Code CLI worker E2E; belongs to PKT-14.
- No automatic RuntimeFrictionCapture call-site integration or starter-promotion rehearsal; belongs to PKT-15.
- PKT-12 copied-starter smoke is limited to static copied-starter validation and
  negative fixtures. Starter promotion dry-run, copied-starter rehearsal loops,
  RuntimeFrictionCapture call-site integration, and starter-promotion candidate
  lifecycle proof remain PKT-15.
- No release/publish/starter promotion execution.
- No root `AGENTS.md` changes or creation of `starter/standard-harness/AGENTS.md`.

## Acceptance
### A1. Risk Taxonomy Alignment
- Starter packet schema, gate profile policy, validator normalization, and tests agree on canonical `low`, `standard`, `high`, `critical`.
- `medium` and `normal`, if accepted, are documented and tested aliases for `standard`.
- Alias behavior cannot lower high/critical/release/security hard stops.

### A2. Schema Identity
- Every affected schema `$id` and title is reviewed.
- The affected inventory includes every schema `$id` or title with `v2.1` / `V2.1`
  wording discovered by the implementation-time schema scan, including
  `packet.schema.json`, `evidence.schema.json`, `gate-result.schema.json`,
  `human-decision.schema.json`, `na-decision.schema.json`,
  `final-closeout-evidence.schema.json`, and
  `review-governance-evidence.schema.json`, unless a file is explicitly excluded with
  rationale, tests, and Reviewer acceptance.
- v2.1 labels are either removed from product-facing schema identity or documented as schema-contract versions with tests and Reviewer acceptance.
- v2.0 product identity remains unambiguous in starter docs and schema policy.

### A3. Copied-Starter Permission Boundary
- `agent-permissions.yaml` no longer grants copied-starter roles write access to `starter/standard-harness/**`.
- Root-only role names such as `harness-developer` are removed, renamed, or constrained so they cannot be mistaken for copied-starter runtime roles.
- `zones.yaml` no longer requires a root `starter` logical zone inside copied starter policy unless explicitly justified and tested as root-only/non-copied metadata.

### A4. Negative Fixtures
- Tests reject packet schemas with missing canonical `standard` support.
- Tests reject root-development path leakage in copied starter policy.
- Tests reject copied starter payloads containing root history, `.agents/`, `.harness/`,
  root `AGENTS.md`, generated runtime state, packet evidence, wiki state, local DB files,
  caches, secrets, provider-specific entry contracts, or
  `starter/standard-harness/AGENTS.md`.
- Expected rejection diagnostics are captured for at least:
  `risk_taxonomy_standard_missing`, `risk_taxonomy_medium_canonical_leak`,
  `schema_identity_v21_product_label`, `copied_starter_root_path_leak`,
  `copied_starter_root_role_leak`, and `copied_starter_forbidden_payload_file`.

### A5. Validation And Smoke
- Root validation passes after changes.
- Starter test suite or focused starter validation passes.
- Copied-starter clean smoke proves the starter remains copyable and immediately usable.
- Clean smoke is fixture-level validation for copied starter payload boundaries only; it
  must not claim PKT-15 starter-promotion rehearsal or dry-run closure.

### A6. Reviewability
- Independent closeout lenses verify schema, permission, security, and evidence quality.
- Any compatibility alias or schema-version residual risk has Reviewer disposition and Human residual-risk/defer approval if unresolved.

## Verification Manifest
- Ready For Code: approved by Human Owner in active goal continuation; route through
  Orchestrator.
- root: required; run root validation and applicable root regression tests; capture
  `reference/reports/validation/PKT-12-root-validation.json` and
  `reference/reports/validation/PKT-12-root-regression.md`.
- standard-template: required; run starter validation and copied-starter smoke; capture
  `reference/reports/validation/PKT-12-starter-validation.md` and
  `reference/reports/starter/PKT-12-copied-starter-smoke.md`.
- targeted: required; risk taxonomy, schema identity, permission boundary, and
  contamination negative tests; capture
  `reference/reports/validation/PKT-12-targeted-tests.md` and
  `reference/reports/validation/PKT-12-validator-rejections.md`.
- validator: required; schema/permission validators must reject known drift fixtures.
- active context: regenerate after implementation if root operational state changes.
- review closeout: required; strict closeout lenses and security/boundary review.

## Required Runtime Command Template
Developer may adjust exact flags only when packet evidence explains why. The default
sequence is:

```powershell
npm.cmd run harness:packet-preflight -- --packet reference\packets\PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP.md --stage implementation-transition
npm.cmd run harness:validate
npm.cmd run harness:validation-report
npm.cmd run harness:context
npm.cmd test
py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"
py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test_gate_profile_engine.py"
py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test_operating_folder_contract.py"
py -3 -m unittest discover -s starter\standard-harness\_harness\test -p "test_compound_feedback_promotion.py"
git status --short --branch
```

If local Python discovery requires an existing starter-specific environment setup,
Developer must use the existing starter test invocation pattern and record the concrete
command in
`reference/reports/validation/PKT-12-starter-validation.md`.

## Expected Negative Fixtures
| Fixture / Failure Condition | Expected Result | Evidence Path |
|---|---|---|
| Packet schema or validator rejects canonical `standard`. | Fails before fix; passes after canonical enum/normalization alignment. | `reference/reports/validation/PKT-12-validator-rejections.md` |
| `medium` is accepted as a separate canonical base level instead of aliasing to `standard`. | Validator/test reports `risk_taxonomy_medium_canonical_leak` or equivalent diagnostic. | `reference/reports/schema/PKT-12-risk-taxonomy.md` |
| Any product-facing schema `$id` or title exposes unapproved `v2.1` / `V2.1` wording. | Schema identity test reports `schema_identity_v21_product_label` or equivalent diagnostic. | `reference/reports/schema/PKT-12-schema-identity.md` |
| Copied starter policy contains `starter/standard-harness/**`. | Permission/boundary validator reports `copied_starter_root_path_leak` or equivalent diagnostic. | `reference/reports/security/PKT-12-permission-boundary.md` |
| Copied starter worker role exposes root-only `harness-developer` semantics. | Permission/boundary validator reports `copied_starter_root_role_leak` or equivalent diagnostic. | `reference/reports/security/PKT-12-permission-boundary.md` |
| Copied starter payload contains root history, `.agents/`, `.harness/`, root `AGENTS.md`, generated state, packet evidence, wiki state, DB files, caches, secrets, provider-specific entry contracts, or `starter/standard-harness/AGENTS.md`. | Contamination check reports `copied_starter_forbidden_payload_file` or equivalent diagnostic. | `reference/reports/starter/PKT-12-copied-starter-smoke.md` |

## Planner Packet Challenge Review
- Challenge reviewer: Volta, independent explorer subagent
  `019f1403-95ed-7dd2-8497-f241e15658a1`
- Challenge reviewer independence basis: read-only independent subagent; not packet
  author, Developer, Tester, Orchestrator, generated summary, or main-session self-review;
  did not edit files or approve Ready For Code.
- Source refs reviewed: `reference/packets/PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP.md`;
  `.agents/artifacts/REQUIREMENTS.md`; `.agents/artifacts/ARCHITECTURE_GUIDE.md`;
  `.agents/artifacts/IMPLEMENTATION_PLAN.md`;
  `reference/reports/requirements/PKT-11_REQUIREMENTS_CLOSURE_MATRIX.md`;
  `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`; current starter schema/policy/test
  and validator files under `starter/standard-harness/_harness/`.
- Parent objective coverage: pass; PKT-12 covers risk taxonomy, schema identity,
  copied-starter permission boundaries, and contamination fixture gaps.
- Deferred scope with named follow-up: pass; PKT-13 owns operating intelligence/QA,
  PKT-14 owns real/deterministic worker E2E, and PKT-15 owns automatic friction capture
  plus starter-promotion rehearsal/dry-run.
- Acceptance proves behavior change: pass; acceptance requires schema/policy/validator/test
  agreement, explicit alias behavior, rejection diagnostics, copied-starter permission
  rejection, starter validation, root validation, clean-smoke evidence, and four closeout
  lenses.
- Failure fixture or failure condition: canonical `standard` rejection, `medium`
  canonical leakage, unapproved `v2.1` schema identity, `starter/standard-harness/**`
  permission leakage, `harness-developer` root-role leakage, and forbidden copied-starter
  payload files.
- Reviewer closeout hold basis: missing required evidence path, uncaptured commands, open
  Human schema/permission decisions, incomplete schema inventory, copied-starter smoke
  overclaimed as PKT-15 rehearsal, or missing/unresolved four independent lenses.
- First-wave limit check: pass; copied-starter smoke is limited to static validation plus
  negative fixtures, with PKT-15 owning promotion rehearsal and dry-run lifecycle proof.
- Guidance-only sufficiency rationale: guidance-only is insufficient; PKT-12 requires
  runtime/schema/policy/validator/test behavior evidence.
- Challenge evidence artifact path: `reference/reports/review/PKT-12-planner-challenge-review.md`
- Challenge status: pass
- Findings disposition: prior loose evidence path/command, schema identity boundary,
  PKT-12/PKT-15 smoke split, canonical closeout lens mapping, Human permission-boundary
  row, schema inventory, validator/test inventory, and forbidden artifact literal findings
  are corrected.
- Required corrections applied: yes
- No self-approval claim: independent reviewer is not the packet author; this review does
  not approve Ready For Code, implementation, closeout, release, or residual risk.

## Packet Document Review
- Packet doc reviewer: Singer, independent explorer subagent
  `019f1403-abed-7d92-8d1b-b4c60b3d2e9a`
- Packet doc reviewer independence basis: independent packet document reviewer; not packet
  author, Developer, Tester, Orchestrator, generated summary, or main-session self-review;
  did not edit files, implement PKT-12, or make approval-state changes.
- Packet doc review evidence path: `reference/reports/review/PKT-12-packet-doc-review.md`
- Packet doc review status: pass
- Packet doc review completed before Ready For Code: yes
- Requirements direction alignment: pass
- Implementation-plan sequencing alignment: pass
- Architecture/source SSOT alignment: pass
- Human/Planner intent preservation: pass
- v1.0 root-harness operating constraint coverage: pass
- v2.0 product philosophy coverage: pass
- Acceptance strength: pass
- Verification scope strength: pass
- Deferred/out-of-scope ownership: pass
- Findings disposition: prior blocking findings are corrected; no required corrections
  remain before the next approval step.
- No self-approval claim: independent reviewer is not the packet author; this review does
  not approve Ready For Code, implementation, residual risk, closeout, or release.

## Human Sync / Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Schema identity policy | yes | Human Owner / Planner | closed | Approved direction: remove product-facing v2.1 labels unless implementation proves a non-product schema-contract version with Reviewer acceptance. |
| Copied-starter permission-boundary policy | yes | Human Owner / Planner | closed | Approved direction: remove or rename root-development-only role/path concepts; no `starter/standard-harness/**` copied-starter write grants. |
| Ready For Code sign-off | yes | Human Owner | closed | Approved in active goal continuation after independent challenge and packet_doc_review passed. |
| Residual-risk/defer approval | yes if unresolved drift remains | Human Owner | not requested | Reviewer alone cannot accept unresolved permission/schema boundary drift. |

## Refactor / Residual Debt Disposition
- Implementation may reveal duplicated risk normalization logic across schema, policy, conductor, and validators. Refactor only where necessary to keep canonical risk behavior single-purpose and testable.
- Do not fold PKT-13/14/15 implementation into this cleanup.

## 15. Packet Exit Quality Gate
- Packet exit quality gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Packet exit metadata gate reference: reference/artifacts/PACKET_EXIT_QUALITY_GATE.md
- Exit recommendation: pass; ready for Planner closeout after Reviewer adjudication.
- Packet exit metadata exit recommendation: pass.
- Source parity result: pass; implementation matches the approved PKT-12 schema identity, risk taxonomy, permission boundary, contamination, and reviewability scope.
- Packet exit metadata source parity result: pass.
- Validation / security / cleanup evidence: pass; root validation, root regression, starter validation, targeted tests, clean-export smoke, security review, and four closeout lenses are recorded under `reference/reports/**`.
- Packet exit metadata validation / security / cleanup evidence: pass.
- Implementation delta summary: canonical risk normalization now uses shared fail-closed runtime policy; schema product identity labels were cleaned; copied-starter permissions, zones, and skill routing no longer grant root development paths as effective authority; contamination rejects nested starter payload, real wiki state, and cache artifacts.
- Refactor / residual debt disposition: non-blocking residuals are tracked in `reference/reports/review/PKT-12_REVIEW_REPORT.md`; no Developer remediation is required before closeout.
- Documentation impact / docs parity result: pass; PKT-12 packet, validation, schema, security, starter, tester, and review evidence are aligned.
- Deferred follow-up item: PKT-13, PKT-14, PKT-15 remain out of scope.
- Closeout notes: Reviewer adjudication passes. Planner closeout may proceed without using the stale generated PKT-01 review excerpt as PKT-12 evidence.

## Reopen Trigger
Reopen or return to Planner if:
- implementation cannot resolve `medium`/`standard` compatibility without breaking existing packet records,
- v2.1 schema labels require a broader product-version policy decision,
- copied-starter permission cleanup affects real root development workflows outside the starter payload,
- validator or copied-starter smoke cannot prove root path leakage is blocked,
- PKT-13 through PKT-15 scope is accidentally implemented inside PKT-12.
