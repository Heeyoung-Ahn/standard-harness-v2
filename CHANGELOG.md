# Changelog

## Unreleased

### Added

- Post-MVP release-quality planning documents.
- KFIX-001 MVP integrity hardening plan and regression coverage.
- GitHub Actions CI workflow.
- Root README with setup, CLI, validation, and starter payload guidance.
- Release tag policy, MVP completion note, and deferred work issue plan.
- Final-product conformance report, inheritance traceability matrix, and docs command inventory.
- Final-product self-improvement friction and proposal lifecycle.
- Final-product state replay, recovery, SSOT, diff, completion, adapter, runtime, workflow, git, policy, PMO, cloud, and high-integrity services.

## 0.1.0-mvp

### Added

- Python standard-library CLI wrapper and command dispatcher.
- Repo-embedded SQLite state kernel.
- Append-only event log with idempotency keys and payload hashes.
- Packet lifecycle, approval records, and lifecycle transitions.
- Manual requirement, acceptance criterion, and artifact registries.
- Evidence manifest and claim ledger.
- Readiness diagnostics.
- Gate declaration, activation, and gate result model.
- Closeout records with blocked and closed outcomes.
- Current context projection with freshness metadata and persistence.
- Adapter manifest and output envelope skeleton.
- Starter manifest and contamination checks.
- Missing-evidence behavioral eval.
- First low-risk packet end-to-end integration flow.
- Validate command aggregator.

### Fixed

- Closeout now blocks false completion when acceptance criteria lack supported claims.
- Passing gate results now require evidence linked to each checked claim.
- Duplicate entity ids with new idempotency keys are rejected before event append.
- Stale `expected_state_version` writes are rejected.
- Registry writes enforce packet and cross-packet reference integrity.
- Readiness and validation report unregistered packet acceptance criteria.
