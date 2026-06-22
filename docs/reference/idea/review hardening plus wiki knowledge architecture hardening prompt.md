# V2.1 Review And Wiki Hardening Prompt

## Document Relationship

- Master plan: `V2.1 Hardening Master Plan.md`.
- V2.1 disposition: accepted as a combined prompt reference, but implementation should be split into separate branches.
- Split into: XP-10C Review Governance Gate and XP-05B Wiki Knowledge Architecture.
- Preceded by: XP-10B Release Evidence Integrity, XP-SecurityA, and XP-MetricsA.
- Source documents: `Review Hardening.md`, `Wiki Knowledge Architecture Hardening.md`, and `v2.1 additional hardening idea.md`.

---

Implement V2.1 additional hardening with two scoped items:

1. XP-10B Review Governance Gate
2. XP-05B Wiki Knowledge Architecture Hardening

This work must not include Planning Pipeline Hardening or Design Planning System implementation. Those are deferred to V2.2.

Branching:
Create dedicated branches before editing:

1. codex/v21-xp-10b-review-governance-gate
2. codex/v21-xp-05b-wiki-knowledge-hardening

Do not reuse an active hardening branch.
Do not mix unrelated changes.
Do not start if another V2.1 hardening branch or XP workstream is active.

Read first:

* AGENTS.md
* docs/requirements/standard-harness-v2-1-integrated-work-plan.md
* docs/requirements/standard-harness-integrated-requirements-v0.2.md
* docs/architecture/standard-harness-architecture-guide-v1.md
* docs/architecture/standard-harness-repository-topology-v1.md
* Existing review, challenge, evidence, wiki, context, skill, validation, closeout, release, and conformance code.
* Existing `_harness` policies, schemas, catalogs, validator catalog, HR coverage matrix, tests, and release docs.

Preflight:

1. Run `git status --short` and record the result.
2. If unrelated dirty files exist, stop and report.
3. Run `python -m unittest discover -s tests` and record the result.
4. If baseline tests fail or hang, stop and report. Do not mix baseline repair with this hardening scope.

Prerequisite hardening fixes:
Before implementing XP-10B or XP-05B, verify or fix the following V2.1 hardening issues:

1. Challenge review evidence must not contain placeholder reviewedCommit values such as `pending-*`.
2. Challenge/review evidence validators must verify that reviewedCommit is a real Git commit object.
3. Policy loading must use canonical repo/store root, not `Path.cwd()` or execution cwd.
4. Boundary path normalization must reject internal `..` traversal segments.
5. HR-130R must not be allowed to remain partial through an undocumented release exception.
6. Full regression result must be recorded as structured evidence with command, result, duration, log path, and timeout status.
7. Release validation must not rely only on catalog/coverage/document presence; it must include behavioral negative scenario checks where appropriate.

Part A: XP-10B Review Governance Gate

Purpose:
Promote implementation review from informal Markdown review into a formal closeout/release-blocking evidence gate.

Scope:
Implement review governance as V2.1 release hardening.
Do not implement reviewer assignment dashboards, multi-agent orchestration, external review tools, or v2.2 planning/design capabilities.

Required concepts:

1. Review Profile

   * Defines required and conditional review types by packet type, risk level, change zones, release candidate status, and migration/security sensitivity.

2. Review Bundle

   * Structured record linking packet, reviewedCommit, reviewedFiles, review profile, review results, findings, evidence logs, and final adjudication.

3. Review Finding

   * Structured finding record with severity, location, reproduction, impact, recommendation, status, fixedByCommit, and verifiedBy evidence.

4. Evidence Integrity Review

   * Verifies that review evidence is real, fresh, linked to actual commits, and supported by test logs.

5. Final Adjudication

   * Combines challenge, adversarial, code, evidence integrity, migration, operational, and release self-test findings into one final decision.

6. Release Gate Self-Test

   * Ensures release gate fails broken fixtures, not only passes valid fixtures.

Required artifacts:

* `_harness/policies/review-profiles.yaml`
* `_harness/policies/review-severity-policy.yaml`
* `_harness/policies/review-adjudication-policy.yaml`
* `_harness/schemas/review-profile.schema.json`
* `_harness/schemas/review-bundle.schema.json`
* `_harness/schemas/review-result.schema.json`
* `_harness/schemas/review-finding.schema.json`
* `_harness/schemas/review-adjudication.schema.json`
* `_harness/schemas/release-negative-scenario.schema.json`
* `src/standard_harness/reviews/profile.py`
* `src/standard_harness/reviews/bundle.py`
* `src/standard_harness/reviews/findings.py`
* `src/standard_harness/validation/review_profile.py`
* `src/standard_harness/validation/review_bundle.py`
* `src/standard_harness/validation/review_evidence.py`
* `src/standard_harness/validation/review_adjudication.py`
* `src/standard_harness/validation/release_self_test.py`
* `docs/manual/standard-harness-review-governance-v21.md`

Required behavior:

* Required review missing → fail.
* reviewedCommit missing or not a real Git commit object → fail.
* reviewedCommit stale against reviewed files or closeout target → fail or stale diagnostic.
* reviewedFiles missing or inconsistent with changed files → fail or diagnostic.
* focused test log missing → fail.
* regression evidence missing for release-bound packet → fail.
* unresolved P0 finding → fail.
* unresolved P1 without accepted risk and adjudication → fail.
* final adjudication missing → fail.
* conditional pass without adjudication → fail.
* release negative scenario bundle not run → release fail.
* fake test evidence or placeholder evidence → fail.
* AI review alone cannot release; deterministic evidence and final adjudication are required.

Validator catalog:
Register at minimum:

* review-profile-validator
* review-bundle-validator
* review-evidence-integrity-validator
* review-adjudication-validator
* release-self-test-validator

Tests:
Write tests first and confirm RED where behavior changes are required.

Required focused tests:

* `tests.contract.test_review_profile_policy`
* `tests.contract.test_review_bundle_schema`
* `tests.contract.test_review_evidence_integrity`
* `tests.contract.test_review_adjudication_blocks_unresolved_p0`
* `tests.contract.test_review_gate_required_by_packet_profile`
* `tests.evals.test_review_gate_blocks_fake_commit`
* `tests.evals.test_review_gate_blocks_placeholder_commit`
* `tests.evals.test_review_gate_blocks_missing_test_log`
* `tests.evals.test_review_gate_blocks_stale_review`
* `tests.evals.test_release_gate_runs_review_negative_scenarios`

Closeout / release integration:

* Packet closeout must evaluate the required review profile when applicable.
* V2.1 release validation must check review governance completion for release-bound packets.
* Release validation must include at least static conformance plus behavioral negative self-test checks.

Part B: XP-05B Wiki Knowledge Architecture Hardening

Purpose:
Strengthen V2.1 long-term knowledge memory by making Wiki/reference pages validated projections with authority labels, provenance, freshness, owner, and cross-reference metadata.

Scope:
This is XP-05-centered hardening.
It may define compatibility contracts for XP-06 context authority, XP-07 skill routing, and XP-09 friction aggregation, but must not implement full context pack engine, runtime skill execution, or recurring friction detector unless already authorized by the current V2.1 plan.

Core boundary:
Wiki pages, reference docs, generated summaries, and skill-facing docs are validated projections only.
They help humans and agents navigate knowledge.
They must not directly create requirements, permissions, policies, gates, truth, workflow authority, release authority, or source-of-truth state.

Canonical authority remains:

* `_harness/requirements/**`
* `_harness/policies/**`
* `_harness/catalog/**`
* `_harness/schemas/**`
* validators
* tests
* trusted evidence
* validated state mutation paths
* human decision records

Required behavior:

1. Wiki Page Standard Skeleton
   Enforce at minimum:

   * Quick Reference
   * Business / Harness Context
   * Authority Label / Source Tier
   * Scope & Exclusions
   * Canonical Source
   * Required Workflow
   * Gotchas
   * Cross-References
   * Freshness / Owner / Review Status
   * Related HR / XP / Packet / Evidence

2. Projection-only authority

   * Wiki pages may describe authority but are never canonical authority.
   * If a Wiki/reference page claims to override requirements, policies, schemas, validators, gate results, trusted evidence, or human decisions, validation must fail.

3. Wiki Knowledge Router as Projection

   * `_ops/wiki/index.yaml` and `_ops/wiki/skill-facing-index.md` may guide reading order and context selection.
   * Skill-facing index must answer which pages to read first, which sources are canonical, which pages are projections, and which pages are current/stale/proposed/deprecated.
   * Skill-facing index must not grant permission, skill execution authority, or release authority.

4. Provenance Footer Model
   Required footer fields:

   * sourceTier
   * freshness
   * owner
   * evidenceIds
   * relatedHr
   * relatedXp
   * reviewStatus

5. Co-location Freshness Validation

   * Use mapping-based validation, not broad unconditional glob enforcement.
   * A canonical artifact requires Wiki/reference freshness validation only when the Wiki index or projection map declares the relationship.
   * Wiki pages claiming `current` must point to canonical sources and evidence.

6. Correction Harvesting Compatibility

   * Define friction/metric signal behavior for:

     * stale wiki reference
     * missing provenance
     * correction harvested from review
     * repeated agent confusion
     * failed trusted-context validation
     * missing or outdated skill-facing route
   * Do not implement the full recurring detector unless already authorized.

Required artifacts:
Create or update the minimal artifacts needed under existing repository conventions:

* Wiki metadata schema or policy
* Wiki page/reference skeleton or template
* Wiki router/index contract
* Skill-facing index projection behavior
* Provenance footer model
* Freshness/review status validation
* Mapping-based co-location validation
* Wiki-related friction/metric signal definitions
* Aggregator integration for new validators/gates
* HR coverage matrix updates

Suggested files:

* `_harness/schemas/wiki-page.schema.json`
* `_harness/schemas/wiki-index.schema.json`
* `_harness/policies/wiki-knowledge-policy.yaml`
* `_harness/policies/wiki-provenance-policy.yaml`
* `src/standard_harness/wiki/index.py`
* `src/standard_harness/wiki/provenance.py`
* `src/standard_harness/wiki/validator.py`
* `src/standard_harness/validation/wiki_knowledge.py`
* `src/standard_harness/validation/wiki_freshness.py`
* `docs/manual/standard-harness-wiki-knowledge-architecture-v21.md`

Required focused tests:

* `tests.contract.test_wiki_page_standard_skeleton`
* `tests.contract.test_wiki_projection_only_authority`
* `tests.contract.test_wiki_provenance_footer_required`
* `tests.contract.test_wiki_skill_facing_index_projection_only`
* `tests.contract.test_wiki_mapping_based_freshness_validation`
* `tests.contract.test_wiki_canonical_source_traceability`
* `tests.evals.test_wiki_page_cannot_override_policy_or_gate`
* `tests.evals.test_stale_wiki_reference_emits_friction_signal`
* `tests.evals.test_missing_wiki_provenance_blocks_trusted_context`

Release-blocking gates:
Add or update release-blocking validators/gates as appropriate for:

* trusted Wiki context provenance
* canonical source traceability
* freshness/review status
* sensitive evidence exclusion
* router/index compliance
* projection-only authority boundary
* mapping-based co-location freshness

Stop conditions:
Stop and report if:

* baseline tests fail or hang
* unrelated dirty files exist
* XP-05 prerequisites are not satisfied
* sensitive evidence minimum guard is missing
* a change would require copying or promoting v1 artifacts
* Markdown, Wiki pages, PRD drafts, generated summaries, or mockups would become canonical source of truth
* external dependencies, credentials, browser login, cloud services, or network-dependent validation are required
* policy/schema decisions conflict with existing V2.1 closed defaults
* Wiki update would occur without a validated proposal/apply path where required
* SECRET or SENSITIVE evidence might enter Wiki, handoff context, context packs, or LLM context

Test-first requirement:

1. Write focused failing tests first.
2. Confirm RED where behavior changes are required.
3. Implement minimal changes.
4. Run focused tests.
5. Run `python -m unittest discover -s tests`.
6. Run V2.1 conformance and release validation.

Commit:
Commit only intended files.
Use focused commit messages:

* `harden v21 review governance gate`
* `harden v21 wiki knowledge architecture`

Final report:
Include:

* Starting git status
* Baseline regression result
* Branch name
* Changed files
* Artifact disposition summary
* Validator/gate changes
* HR coverage updates
* Focused test commands and results
* Full regression command and result
* V2.1 conformance/release validation result
* Remaining risks
* Commit hash
