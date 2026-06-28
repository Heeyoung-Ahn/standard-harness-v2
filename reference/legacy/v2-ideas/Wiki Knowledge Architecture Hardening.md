# V2.1 Wiki Knowledge Architecture Hardening Prompt

## Document Relationship

- Master plan: `V2.1 Hardening Master Plan.md`.
- V2.1 disposition: accepted as XP-05B Wiki Knowledge Architecture, after release evidence/security/metrics hardening.
- Role: source prompt for making Wiki/reference pages projection-only, provenance-backed, freshness-validated navigation artifacts.
- Feeds: `review hardening plus wiki knowledge architecture hardening prompt.md`.
- Future expansion: V2.2 Knowledge Continuity layer in `v22-hardening-strategy.md`.

---

/goal Create a goal with this objective:

Implement V2.1 Wiki Knowledge Architecture Hardening after the current V2.1 hardening work is complete.

Start condition:
Do not start this goal now if another V2.1 hardening branch or XP workstream is active.
Start only after:
- the current V2.1 hardening work is completed,
- intended changes are committed,
- `git status --short` is clean,
- baseline tests pass,
- this work is explicitly allowed as the next V2.1 hardening item.

Branching:
Create a dedicated branch before editing:
  codex/v21-wiki-knowledge-hardening

Do not reuse the active hardening branch.
Do not commit unrelated files.

Read first:
- AGENTS.md
- docs/requirements/standard-harness-v2-1-integrated-work-plan.md
- docs/requirements/standard-harness-integrated-requirements-v0.2.md
- docs/architecture/standard-harness-architecture-guide-v1.md
- docs/architecture/standard-harness-repository-topology-v1.md
- Existing `_harness` policies, schemas, catalogs, validators, and tests related to wiki, documenter, evidence, context, skills, friction, metrics, requirements coverage, and validation aggregation.
- Existing `_ops/wiki` and `_ops/wiki-proposals` files, if present.

Preflight:
1. Run `git status --short` and record the starting state.
2. If unrelated dirty files exist, stop and report.
3. Run `python -m unittest discover -s tests` and record the result.
4. If baseline tests fail or hang, stop and report. Do not mix baseline repair with this hardening scope.

Scope:
Implement Wiki Knowledge Architecture Hardening as an XP-05-centered hardening item.

This work may define compatibility contracts for XP-06 context authority, XP-07 skill routing, and XP-09 friction aggregation, but must not implement those later XP systems unless the current V2.1 plan already authorizes them.

Do not start XP-01+ product work or broaden V2.1 scope.
Do not implement runtime skill execution.
Do not implement the full context pack engine.
Do not implement the full recurring friction detector.
Do not alter starter payload contents unless the V2.1 topology explicitly requires a validated starter projection for this hardening item.

Core boundary:
Wiki pages, reference docs, and skill-facing docs are validated projections only.
They help humans and agents navigate knowledge, but they must not directly create permissions, gates, truth, workflow authority, or source-of-truth requirements.

The V2.1 source of truth remains:
- `_harness/contracts/**`
- `_harness/policies/**`
- `_harness/catalog/**`
- `_harness/schemas/**`
- validators
- tests
- trusted evidence and validated state paths

Do not import Anthropic’s “skill markdown folder” model as a V2.1 source of truth.
Use Anthropic-style ideas only as design reference for structured reference pages, thin routing, provenance, freshness, co-location validation, and correction harvesting.

Required behavior:

1. Wiki Page Standard Skeleton

Define and validate a standard skeleton for trusted Wiki/reference pages:

# [Domain / Workflow / Policy] Reference

## Quick Reference
## Business / Harness Context
## Authority Label / Source Tier
## Scope & Exclusions
## Canonical Source
## Required Workflow
## Gotchas
## Cross-References
## Freshness / Owner / Review Status
## Related HR / XP / Packet / Evidence

Validators must enforce at minimum:
- Authority Label / Source Tier
- Scope & Exclusions
- Canonical Source
- Gotchas
- Cross-References
- Freshness / Owner / Review Status
- Related HR / XP / Packet / Evidence

Authority rule:
A Wiki page may describe authority, but the Wiki page itself is never canonical authority.
If a Wiki/reference page claims to override requirements, policies, schemas, validators, gate results, trusted evidence, or human decision records, validation must fail.

2. Wiki Knowledge Router As Projection

Define the Wiki knowledge layer as a navigation router, not an execution skill and not a source of truth.

Expected artifacts, adjusted to existing repo conventions:
- `_ops/wiki/index.yaml`
- `_ops/wiki/skill-facing-index.md`
- `src/standard_harness/wiki/index.py`
- wiki page/index schemas or policies as needed

The skill-facing index must answer:
- For this role/task/workflow, which Wiki/reference pages should be read first?
- Which requirements, policies, schemas, catalogs, validators, and tests are canonical?
- Which pages are projections only?
- Which pages are current, stale, proposed, deprecated, or blocked from trusted context?

The skill-facing index must not grant authority, permissions, or execution rights.
It is a validated projection for navigation and context selection only.

XP-07 boundary:
Do not implement runtime skill catalog execution or skill router behavior here.
If `_harness/catalog/skill-catalog.yaml` exists, validate only the Wiki projection relationship needed for navigation.

3. Provenance Footer Model

Define a common provenance footer model for Wiki pages and agent-facing projections.

Footer fields should include:
- Source tier: requirements | policy | schema | catalog | validator | trusted-evidence | wiki | generated-summary
- Freshness: current | stale | unknown
- Owner: human-owner or responsible role
- Evidence IDs: [...]
- Related HR/XP: [...]
- Review status: current | proposed | deprecated

Validators must detect trusted-context use where provenance is missing, stale, or authority-incompatible.

XP-06 boundary:
Prepare compatibility for context packs, handoff prompts, closeout reports, and validation reports, but do not implement the full context authority or token budget system unless already authorized by the current V2.1 plan.

4. Co-location Freshness Validation

Add or define local validation behavior so related structured artifacts and Wiki/reference projections stay synchronized.

Use mapping-based validation, not broad unconditional glob enforcement.

Expected rule:
A canonical artifact requires Wiki/reference freshness validation only when the Wiki index or projection map declares a relationship between that artifact and a Wiki/reference projection.

Supported relationship examples:
- `_harness/policies/**` -> related Wiki policy/reference projection
- `_harness/schemas/**` -> related schema/manual/wiki projection
- `src/standard_harness/validation/**` -> related validator catalog/wiki projection
- `_harness/catalog/skill-catalog.yaml` -> skill-facing index projection, if present

Wiki/reference pages claiming `current` status must point to canonical sources and evidence.
Stale or missing projections should emit diagnostics and friction signals as appropriate.

Do not add external CI services or external dependencies.
Integrate with existing local validator and aggregator patterns.

5. Correction Harvesting Compatibility

Map corrections and repeated confusion into the existing V2.1 friction/improvement loop without implementing the full XP-09 recurring detector.

Define friction/metric signal behavior for:
- stale wiki reference
- missing provenance
- correction harvested from review
- repeated agent confusion
- failed trusted-context validation
- missing or outdated skill-facing route

Required conceptual flow:
user correction / reviewer finding / gate failure / stale-doc finding
→ friction.signal
→ recurring detector
→ improvement candidate
→ Wiki proposal
→ validated wiki apply
→ eval/test or validator update

XP-09 boundary:
This hardening should define signal types and emission points used by Wiki validators.
Do not implement the full recurring detector, success metrics engine, or starter promotion flow unless already authorized by the current V2.1 plan.

Required outputs:
Create or update the minimal artifacts needed, following existing repository conventions:
- Wiki metadata schema or policy, if needed.
- Wiki page/reference skeleton or template.
- Wiki router/index contract.
- Skill-facing index projection behavior.
- Provenance footer model.
- Freshness/review status validation.
- Mapping-based co-location validation.
- Wiki-related friction/metric signal definitions.
- Focused tests for skeleton, router/index, provenance, freshness, co-location, projection-only authority, and friction signal behavior.
- HR coverage matrix updates for this hardening scope.
- Aggregator integration so new validators/gates appear in standard validation/reporting paths.

Test-first requirement:
1. Write focused failing tests first for the new Wiki skeleton/router/provenance/freshness/co-location/friction validation behavior.
2. Confirm RED where behavior changes are required.
3. Implement the minimal changes.
4. Run focused tests.
5. Run `python -m unittest discover -s tests`.

Release-blocking gates:
Add or update release-blocking validators/gates as appropriate for:
- trusted Wiki context provenance,
- canonical source traceability,
- freshness/review status,
- sensitive evidence exclusion,
- router/index compliance,
- projection-only authority boundary,
- mapping-based co-location freshness.

Stop conditions:
Stop and report before editing or continuing if:
- baseline tests fail or hang,
- `git status --short` contains unrelated dirty files,
- XP-05 prerequisites are not satisfied, including the sensitive evidence minimum guard required before Wiki proposal/application,
- the change would require copying or promoting v1 artifacts,
- the change would make Markdown the canonical source of truth,
- external dependencies, credentials, browser login, cloud services, or network-dependent validation are required,
- existing V2 compatibility cannot be preserved,
- a policy/schema decision conflicts with existing V2.1 closed defaults,
- Wiki update would occur without a validated proposal/apply path where the current architecture requires one,
- SECRET or SENSITIVE evidence might enter Wiki, handoff context, context packs, or LLM context.

Commit:
Commit only intended files for this hardening improvement.
Use a focused commit message:
  harden v21 wiki knowledge architecture

Final report:
Include:
- Starting git status
- Baseline regression result
- Changed files
- Artifact disposition summary
- Wiki knowledge architecture summary
- Canonical source / projection boundary summary
- Wiki page skeleton behavior
- Knowledge router / skill-facing index behavior
- Provenance footer behavior
- Co-location validation behavior
- Correction harvesting / friction signal behavior
- Release-blocking validators/gates added
- HR coverage updates
- Focused test command and result
- Full regression command and result
- Commit hash

