/goal Create a goal with this objective:

Implement V2.1 Design Planning Hardening for wireframe projection, reusable design mockup systemization, and UI module contracts.

Start condition:
Do not start this goal if another V2.1 hardening branch or XP workstream is active.
Prefer starting this only after V2.1 Planning Pipeline Hardening is complete, committed, and the working tree is clean.

Branching:
Create a dedicated branch before editing:
  codex/v21-design-planning-hardening

Read first:
- AGENTS.md
- docs/requirements/standard-harness-v2-1-integrated-work-plan.md
- docs/requirements/standard-harness-integrated-requirements-v0.2.md
- docs/architecture/standard-harness-architecture-guide-v1.md
- docs/architecture/standard-harness-repository-topology-v1.md
- Existing skill catalog, context, wiki, validation, evidence, and browser validation contracts.
- Existing planning pipeline artifacts, if already implemented.

Preflight:
1. Run `git status --short` and record the result.
2. If unrelated dirty files exist, stop and report.
3. Run `python -m unittest discover -s tests` and record the result.
4. If baseline tests fail or hang, stop and report.

Purpose:
Add a governed design planning layer that turns confirmed PRD, feature specification, workflow, and user-flow artifacts into Designer Agent-ready wireframe and reusable design mockup contracts.

This work must improve implementation quality by ensuring common UI modules are designed once, locked by contract, reused across screens, and validated during implementation.

Core boundary:
Design artifacts are planning/design projections.
They guide implementation and browser validation, but they do not replace requirements, policies, schemas, validators, tests, or trusted evidence.

Do not implement product UI screens in this goal.
Do not introduce external Figma, Manyfast, cloud, SaaS, credential, or browser-login dependencies.
Do not make image mockups or Markdown wireframes the source of truth for business requirements.

Required behavior:

1. Wireframe Projection

Define a `SKILL-WIREFRAME-PROJECTION` contract or proposal.

Wireframe projection should capture:
- screen ID
- screen purpose
- related requirements
- related feature tree nodes
- related workflow/user-flow IDs
- primary user actions
- information hierarchy
- rough layout zones
- navigation entry/exit
- required states: default, loading, empty, error, permission-denied, success
- Designer Agent handoff notes

Wireframes are rough layout projections, not final design authority.

2. Design Mockup Systemization

Define a `SKILL-DESIGN-MOCKUP-SYSTEMIZATION` contract or proposal.

Design mockups should be implementation-ready references built from reusable modules, not one-off static pictures.

The design mockup contract must include:
- mockup ID
- screen IDs covered
- related requirements and flows
- reusable UI modules used
- layout constraints
- interaction states
- responsive behavior
- accessibility requirements
- implementation notes
- visual reference path or artifact reference
- browser validation expectations

3. Reusable UI Module Contract

Define a local UI module contract for common product modules such as:
- app shell
- left navigation
- top bar
- main content grid
- modal
- drawer
- dropdown / command menu
- table / data grid
- form field set
- detail panel
- toast / notification
- empty state
- error state
- permission state

Each UI module contract should include:
- module ID
- purpose
- used-by screens
- allowed variants
- fixed layout rules
- responsive behavior
- interaction states
- accessibility requirements
- do-not-change rules
- related requirements
- related flows
- visual reference

4. Design Locking and Reuse

Add validation behavior so implementation cannot casually drift from locked common modules.

Expected validation checks:
- every screen projection links to requirements and flows,
- every screen uses approved reusable modules where applicable,
- common modules have stable IDs and allowed variants,
- locked modules define do-not-change rules,
- required UI states are present,
- design mockup references are traceable,
- implementation/browser validation can compare expected screen/module coverage.

5. Designer Agent Handoff

Define the Designer Agent input package as a projection assembled from:
- PRD summary
- feature tree
- workflow/user-flow diagrams
- wireframe projection
- UI module contracts
- design constraints
- open decisions
- evidence/provenance metadata

The Designer Agent handoff must not grant authority to override requirements, policies, accessibility constraints, or gate outcomes.

Required skill candidates:
Add or prepare cataloged V2-native skill contracts for:
- `SKILL-WIREFRAME-PROJECTION`
- `SKILL-DESIGN-MOCKUP-SYSTEMIZATION`
- `SKILL-UI-MODULE-CONTRACT-VALIDATION`
- `SKILL-DESIGN-TO-BROWSER-VALIDATION-HANDOFF`

If XP-07 catalog expansion is not authorized, create only proposal/spec artifacts and stop before modifying the canonical skill catalog.

Required outputs:
Create or update the minimal artifacts needed, following existing repository conventions:
- Wireframe projection schema or template.
- Design mockup contract schema or template.
- UI module contract schema or template.
- Designer Agent handoff projection contract.
- Validation behavior for module reuse, locked common modules, required states, and traceability.
- Tests for wireframe linkage, design mockup contract, UI module reuse, locked module rules, Designer Agent handoff authority boundary, and browser validation handoff metadata.
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
- external design services, credentials, browser login, or network-dependent validation are required,
- design artifacts would become source of truth for requirements or release authority,
- implementation UI work would be mixed into this planning/design hardening scope,
- existing V2.1 closed defaults conflict with the proposed design.

Commit:
Commit only intended files.
Use a focused commit message:
  harden v21 design planning contracts

Final report:
Include:
- Starting git status
- Baseline regression result
- Changed files
- Artifact disposition summary
- Wireframe projection summary
- Design mockup contract summary
- UI module contract summary
- Designer Agent handoff boundary
- Validator/gate changes
- HR coverage updates
- Focused test command and result
- Full regression command and result
- Commit hash