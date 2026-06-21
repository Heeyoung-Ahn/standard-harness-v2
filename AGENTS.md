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

## Primary Requirement Basis

The v2 product is grounded in:

- the user's 16 core harness principles below,
- the LLM-derived good-harness and bad-harness criteria,
- the 260-requirement final-product baseline in `docs/requirements/`,
- the architecture and repository topology contracts in `docs/architecture/`.

Do not treat the v1 zip as the source of truth. Treat it as comparative evidence and
legacy reference only.

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

