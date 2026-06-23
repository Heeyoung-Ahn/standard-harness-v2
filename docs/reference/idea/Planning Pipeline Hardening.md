# V2.2 Planning Pipeline Hardening Prompt

## Document Relationship

- Master plan: `V2.1 Hardening Master Plan.md`.
- V2.1 disposition: deferred; do not implement during V2.1 hardening because it expands planning/product-intake scope.
- V2.2 role: defines the future Intent Capture and Specification Normalization layers.
- Feeds: `Design Planning Hardening.md`.
- Related to: `v22-hardening-strategy.md`.

---

/goal Create a goal with this objective:

Implement V2.1 Planning Pipeline Hardening for requirements interview, PRD writing, feature specification, flow modeling, and verifiable requirement normalization.

Start condition:
Do not start this goal if another V2.1 hardening branch or XP workstream is active.
Start only after:
- the current V2.1 hardening work is complete,
- intended changes are committed,
- `git status --short` is clean,
- baseline tests pass,
- XP-07 skill catalog expansion or an approved V2.1 hardening item allows planning-skill work.

Branching:
Create a dedicated branch before editing:
  codex/v21-planning-pipeline-hardening

Read first:
- AGENTS.md
- docs/requirements/standard-harness-v2-1-integrated-work-plan.md
- docs/requirements/standard-harness-integrated-requirements-v0.2.md
- docs/architecture/standard-harness-architecture-guide-v1.md
- docs/architecture/standard-harness-repository-topology-v1.md
- Existing `_harness/catalog/skill-catalog.yaml`
- Existing `_harness/catalog/minimum-required-skills.yaml`
- Existing skill router, skill registry, validators, tests, and HR coverage files.

Preflight:
1. Run `git status --short` and record the result.
2. If unrelated dirty files exist, stop and report.
3. Run `python -m unittest discover -s tests` and record the result.
4. If baseline tests fail or hang, stop and report.

Purpose:
Add a governed planning pipeline inspired by structured product-planning tools such as Manyfast, but do not add an external Manyfast dependency, account requirement, credential, browser login, cloud service, or MCP integration.

The planning pipeline should support:

1. Requirements interview
   - Extract user problem, target users, constraints, success criteria, non-goals, risks, assumptions, and open decisions.

2. PRD writing
   - Produce human-readable PRD drafts.
   - PRD Markdown is planning input/projection only.
   - PRD Markdown must not become the V2.1 source of truth or release authority.

3. Tree-structured feature specification
   - Decompose PRD into product area -> epic -> feature -> scenario -> acceptance criteria.
   - Preserve traceability to PRD sections and requirement candidates.

4. Flow modeling
   - Use Mermaid as the default local text-based visualization format.
   - Support workflow, user flow, sequence, and state diagrams.
   - Each flow must include metadata: flow ID, related requirement candidates, entry points, success path, failure paths, roles, evidence targets.

5. Verifiable requirement normalization
   - Convert PRD and planning artifacts into requirement candidates that can later be promoted into:
     - `_harness/requirements/**`
     - `_harness/policies/**`
     - `_harness/schemas/**`
     - validators
     - tests
     - coverage matrix entries

Core boundary:
Planning artifacts are not SSOT.
PRD, feature trees, Mermaid flows, and planning notes are candidate/projection artifacts only.
A requirement becomes enforceable only after promotion into structured requirement records, policies, schemas, validators, tests, and coverage.

Required skill candidates:
Add or prepare cataloged V2-native skill contracts for:

- `SKILL-REQUIREMENTS-INTERVIEW`
- `SKILL-PRD-WRITING`
- `SKILL-FEATURE-SPEC-DECOMPOSITION`
- `SKILL-FLOW-MODELING`
- `SKILL-PRD-TO-VERIFIABLE-REQUIREMENTS`

If XP-07 catalog expansion is not authorized, create only proposal/spec artifacts and stop before modifying the canonical skill catalog.

Required outputs:
Create or update the minimal artifacts needed, following existing repository conventions:
- Planning artifact schema or schemas.
- Requirement candidate schema or mapping contract.
- PRD template that separates narrative from verifiable requirements.
- Feature tree template or schema.
- Mermaid flow metadata contract.
- Planning skill catalog entries or proposal entries, depending on authorization.
- Validators that ensure planning artifacts cannot create release authority directly.
- Tests for PRD projection boundary, feature tree traceability, flow metadata, requirement candidate normalization, and skill catalog compliance.
- HR coverage matrix updates for this hardening scope.
- Aggregator integration if new validators/gates are added.

Test-first requirement:
1. Write focused failing tests first.
2. Confirm RED where behavior changes are required.
3. Implement minimal changes.
4. Run focused tests.
5. Run `python -m unittest discover -s tests`.

Stop conditions:
Stop and report if:
- baseline tests fail or hang,
- unrelated dirty files exist,
- XP-07/catalog expansion is required but not authorized,
- external Manyfast integration, credentials, browser login, network validation, or cloud service is required,
- PRD Markdown would become canonical source of truth,
- planning artifacts would directly create permissions, gates, requirements, or release authority,
- existing V2.1 closed defaults conflict with the proposed design.

Commit:
Commit only intended files.
Use a focused commit message:
  harden v21 planning pipeline

Final report:
Include:
- Starting git status
- Baseline regression result
- Changed files
- Artifact disposition summary
- Planning pipeline summary
- PRD/projection boundary summary
- Skill catalog changes or proposal status
- Validator/gate changes
- HR coverage updates
- Focused test command and result
- Full regression command and result
- Commit hash
