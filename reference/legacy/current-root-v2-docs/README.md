# Current Root V2 Docs Archive

This archive preserves root-level Standard Harness v2 development knowledge from the
previous repository root harness.

The new root harness may change, but the product goal remains the same: continue
developing the clean Standard Harness payload under `starter/standard-harness/`.

## Preserved Sets

- `root/AGENTS.md`: current Codex-only development repository entry contract. This is
  not starter payload and must not be copied into `starter/standard-harness/`.
- `root/README.md`: current development repository overview and starter payload notes.
- `root/CHANGELOG.md`: current root project history.
- `docs/requirements/`: v2/v2.1 requirements, canonical work plan, conformance maps,
  CSV traces, and final-product requirement baselines.
- `docs/architecture/`: provider-neutral architecture and repository topology
  contracts.
- `docs/implementation/`, `docs/manual/`, `docs/release/`, `docs/decisions/`,
  `docs/reviews/`, `docs/superpowers/`: current implementation, validation,
  review, release, and historical planning documents.
- Historical reference material previously under `docs/reference/` is now easier to
  find under `reference/legacy/v1/` and `reference/legacy/v2-ideas/`.
- `_harness/contracts/`: current root harness requirement and trace contracts.
- `_harness/policies/`: current root harness policies that may be useful when aligning
  the replacement root harness with the starter payload goal.
- `product/docs/`: human-facing packet/project documentation created for the current
  productization work.

## Important Boundary

Do not treat this archive as clean starter payload. The clean starter payload remains
`starter/standard-harness/`.

Provider-specific entry files such as `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` are
development-environment files. They should not be added to the starter payload unless
the Human Owner explicitly changes the product direction.
