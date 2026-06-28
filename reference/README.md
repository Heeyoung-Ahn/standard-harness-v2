# Reference Layer

This folder contains non-core harness material that sits outside the constitutional load order.

Lifecycle classification is maintained in `reference/REFERENCE_LIFECYCLE_INDEX.md`.
Candidate-only cleanup notes are maintained in `reference/DEPRECATION_CANDIDATES.md`.
Test suite taxonomy and fixture ownership are maintained in `.harness/test/TEST_TAXONOMY.md`.

## Kickoff essentials

At project kickoff, most people only need:

- `planning/PLN-00_DEEP_INTERVIEW.md`
- `planning/PLN-01_REQUIREMENTS_FREEZE.md`
- `packets/PKT-01_WORK_ITEM_PACKET_TEMPLATE.md`
- the artifact templates that the active task explicitly needs

## Other contents

- `artifacts/`: optional artifact templates used when the task needs them; some are always reusable references and others are profile-dependent templates that stay optional until a packet or active profile asks for them
- `artifacts/HARNESS_FILE_ROUTE_AUDIT_MATRIX.md`: reusable audit map for checking which route reads which files and updates which surfaces
- `artifacts/daily/`: optional daily-note area that should be created only when an actual daily log is needed
- `artifacts/DECISION_LOG.md`, `HANDOFF_ARCHIVE.md`, `REVIEW_REPORT.md`, `WALKTHROUGH.md`: optional review/history artifacts created on first use rather than pre-shipped
- `manuals/human/HARNESS_MANUAL.md`: primary human operator manual; section 3 includes the generic fresh-start drill pattern for first full-flow rehearsal
- `profiles/`: optional profile packages for explicitly activated project types
- `packets/`: task-level approval packet templates and created packets
- `planning/`: kickoff interview, requirements-freeze, and lightweight planning materials such as `PLAN_CHECK_CANDIDATE.md`
- `reports/`: optional review or transfer report material that can be created later when a task needs it
- `mockups/`: optional visual review assets that can be created later when a task needs them
- `legacy/`: optional archive area for old or superseded reference material
- `legacy/v1/`: current v1.0 harness archive for route-selected comparison only; the ZIP is reference material, not starter payload
- `legacy/v2-ideas/`: archived V2.x hardening idea notes split out from the old root docs for easier lookup
- `legacy/current-root-v2-docs/`: archived V2.1 development repository knowledge from
  the previous root harness; use only when rebuilding or comparing Standard Harness v2
  starter-payload requirements, architecture, policies, or release evidence
- `skills-src/`: templates for generated active skills under `.agents/skills/*`; this is not a runtime skill surface

## Rule

Nothing under `reference/` is part of the default constitutional load order unless the active task explicitly requires it.
