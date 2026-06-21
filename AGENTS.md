# Standard Harness v2 Codex Entry Contract

This repository is the development repository for the Standard Harness v2 starter payload.

## Product Direction

Standard Harness v2 is not a direct copy of the existing `clean-starter-harness.zip`
system. The zip is the current production-use v1 harness and may be used as reference
material, but v2 must be designed and implemented from the v2 requirements,
architecture, and validation contracts in this repository.

The v1 harness grew through continuous improvement and contains valuable operating
principles, but it also carries accumulated refactoring pressure and harness friction.
When v1 material is useful, extract the underlying principle, simplify it, and
reimplement it in the v2 architecture. Do not paste or bulk-promote v1 payload,
runtime, `.agents`, `.harness`, plugin, reference, or generated-state files into this
repository without explicit user approval and a documented promotion plan.

V2.1 may inspect `clean-starter-harness.zip` as the current v1.0 harness reference,
but v1.0 must never redefine V2.1 goals, scope, priorities, architecture, or
definition of done. Any v1.0 concept considered for V2.1 must be modified,
completed, or reimplemented so it fits the V2.1 requirements, architecture, policy,
evidence, validation, and starter-boundary contracts.

## Primary Requirement Basis

The v2 product is grounded in:

- the user's 16 core harness principles below,
- the V2.1 canonical work plan in `docs/requirements/standard-harness-v2-1-integrated-work-plan.md`,
- the v0.2 integrated requirements in `docs/requirements/Standard_Harness_통합_요구사항_v0.2.md`,
- the LLM-derived good-harness and bad-harness criteria,
- the 260-requirement final-product baseline in `docs/requirements/`,
- the architecture and repository topology contracts in `docs/architecture/`.

Do not treat the v1 zip as the source of truth. Treat it as comparative evidence and
legacy reference only.

Before any V2.1-related code, docs, schema, policy, test, starter payload, or release
work, Codex MUST read `docs/requirements/standard-harness-v2-1-integrated-work-plan.md`
and use it as the controlling requirements + architecture + implementation plan.
The v0.2 integrated requirements are the primary requirement baseline.

Spreadsheet candidate requirements are excluded from the V2.1 intake basis. They MUST
NOT be used to add, reprioritize, or reinterpret V2.1 scope unless the user explicitly
reopens that intake.

## User's 16 Core Harness Principles

1. Test-driven implementation (TDD).
2. Prevent spaghetti code through domain-based design and DDD.
3. Product feature tests must be substantive, not superficial.
4. Web products need real browser validation.
5. Security and requirements review must be part of the workflow.
6. Harness friction must be observed and improved through a loop.
7. Compound engineering lessons must feed back into the system.
8. Long-term memory must be maintained deliberately.
9. Required skills should be selected and used automatically.
10. Maintenance documents must be generated and managed.
11. AI-based testing and review should be supported with bounded authority.
12. Long-running work should trigger refactoring proposals.
13. Overconfident AI claims must be controlled.
14. Blind obedience to user opinions must be resisted when technically unsafe.
15. Token overuse must be prevented.
16. Human manuals must be accurate.

## Working Rules For Codex

- Keep v2 changes aligned with the repository's requirements and architecture docs.
- For large structural changes, starter payload changes, or v1 artifact promotion,
  present the purpose, scope, source, target, validation plan, and rollback plan before
  editing files.
- Do not merge two harnesses by copying one into the other. Integration must be
  requirement-driven and traceable.
- Preserve the distinction between the development repository and
  `starter/standard-harness/` as the clean starter payload root.
- If a user correction conflicts with an earlier assumption, stop and re-evaluate the
  basis before continuing.

## V2.1 Execution Procedure

For V2.1 work, Codex MUST execute one XP workstream at a time. Do not implement
XP-00 through XP-10 in a single uninterrupted pass unless the user explicitly
authorizes that scope.

Before starting any XP:

1. Read `docs/requirements/standard-harness-v2-1-integrated-work-plan.md`.
2. Read the relevant HR sections in
   `docs/requirements/Standard_Harness_통합_요구사항_v0.2.md`.
3. Run `git status --short` and record the starting state.
4. Run `python -m unittest discover -s tests` and record the result.
5. If baseline tests fail or hang before the XP changes, stop and report the
   failure. Do not mix baseline repair with the XP unless explicitly approved.

For each XP:

1. Identify the HR IDs covered by the XP.
2. Classify affected artifacts as `reuse`, `modify`, `replace`, `create`, or
   `deprecate`.
3. Define migration/compatibility impact before changing schema, state, event,
   CLI, or starter payload behavior.
4. Write focused tests first and confirm RED where behavior changes are required.
5. Implement the minimal code, policy, schema, docs, and manual updates needed
   to satisfy the XP.
6. Run focused tests.
7. Run `python -m unittest discover -s tests`.
8. Update `_harness/requirements/hr-coverage-matrix.yaml`.
9. Record release-blocking validators, gate IDs, diagnostics, waiver policy, and
   enforcement point.
10. Record friction/metric signal behavior. If the XP introduces a new validator,
    gate, handoff path, wiki path, evidence path, or manual command path and does
    not define friction/metric signal behavior, the XP is not complete.
11. Commit only the intended files for that XP.

## V2.1 Stop Conditions

Stop and ask the Human Owner before proceeding if:

- An unresolved or changed design decision affects the XP design.
- A v1 artifact, v1 skill, plugin, `.agents`, `.harness`, generated state, or
  runtime file would be copied or promoted.
- External dependencies, browser automation packages, cloud SDKs, credentials,
  device credentials, browser login, or secret material are required.
- A schema migration cannot preserve or explicitly migrate existing V2 state.
- A product packet would modify `_harness/**`.
- A Wiki update would occur without a validated proposal and wiki-applier.
- SECRET or SENSITIVE evidence might enter Wiki, handoff context, or LLM context.
- A human decision would attempt to override HR-152 non-overridable items.
- The baseline test suite fails or hangs before XP work.
- `git status --short` contains unrelated dirty files.

## V2.1 First Execution Boundary

The first implementation goal should be XP-00 only unless the user explicitly
authorizes a broader scope. XP-00 must close the requirement baseline, P0 policy,
HR-003 guardrails, telemetry seed, minimum required skill list, and baseline
regression status before XP-01 begins.
