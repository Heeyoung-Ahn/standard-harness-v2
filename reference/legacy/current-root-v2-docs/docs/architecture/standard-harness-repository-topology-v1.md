# Standard Harness Repository Topology v1

## Purpose

This document defines the repository layout used to build Standard Harness v2 and to protect the clean starter payload from development artifacts.

The repository has two different responsibilities:

- develop, test, review, and document Standard Harness itself
- produce a clean starter payload that can be installed into another project

The starter payload is not the whole repository.

## Top-Level Layout

```text
standard-harness-v2/
  .harness/
    state/
    projections/
    local/
  starter/
    standard-harness/
  docs/
    requirements/
    architecture/
    implementation/
    decisions/
    reviews/
  src/
  tests/
  tools/
  scripts/
```

## Folder Responsibilities

### `.harness/`

This is the development repository's local harness operating state root.

It is used while building Standard Harness v2 itself.

Expected development content includes:

- `.harness/state/` for canonical local state such as `harness.sqlite3`
- `.harness/projections/` for generated local projections
- `.harness/local/` for machine-local runtime files that must not be promoted

The development repository's `.harness/` directory is not starter payload.

Starter-safe harness seed files must live under `starter/standard-harness/_harness/` and must be explicitly allowed by the starter payload manifest.

The two paths must not be treated as interchangeable:

```text
.harness/                         development repository operating state
starter/standard-harness/_harness/ starter payload harness system content
```

### `starter/standard-harness/`

This is the clean self-hosting starter payload root.

Only files intended to be copied into a target project may live here. A copied
`starter/standard-harness/` payload must be able to initialize Standard Harness state,
run starter validation, create a first packet, and support later harness improvement
packets without requiring the whole development repository.

Allowed starter content includes:

- `_harness/bin/harness_cli.py`
- `_harness/system/standard_harness/` runtime code
- `_harness/` README, policy, schema, catalog, contracts, and examples that are part of the starter contract
- clean `_ops/` seed folders without real packet or evidence history
- `product/src/`, `product/tests/`, and `product/docs/` seed folders
- starter entry documents such as `START_HERE.md`
- a top-level `README.md` that belongs to the product being built
- starter folder contract files

Forbidden starter content includes:

- local project evidence
- generated validation reports from this development repository
- packet state for building Standard Harness v2
- local operator scratch files
- external review attachments
- secrets, credentials, logs, cache files, or machine-local configuration
- experimental implementation files that are not promoted through the starter payload manifest

The starter folder contract is folder-first:

```text
starter/standard-harness/
  README.md
  START_HERE.md
  _harness/
    README.md
    bin/
    system/standard_harness/
    policies/
    schemas/
    catalog/
    contracts/
    examples/
  _ops/
    packets/
    evidence/
    decisions/records/
    wiki-proposals/
    wiki/
    backlog/
    metrics/
    active-context/
  product/
    src/
    tests/
    docs/
      project/planning/
      project/architecture/
      project/implementation/
      project/api/
      project/database/
      project/ui-design/
      packets/
      pmo/daily-wrap-up/
```

Directory names are contractual. File names are samples except for `README.md`,
`START_HERE.md`, `_harness/README.md`, `_harness/bin/harness_cli.py`,
`_harness/policies/project-operating-folders.yaml`, and
`_harness/schemas/operating-folder-contract.schema.json`.

The top-level starter `README.md` is product-owned after the starter is copied into a
target repository. Harness operating guidance belongs in `_harness/README.md`.

### `docs/requirements/`

This folder stores the approved requirement baseline and derived requirements package:

- final product requirements
- conformance map and conformance trace
- MVP cut
- architecture contract
- validation and eval contract
- review brief

These documents define product meaning and staging. They are not runtime state.

### `docs/architecture/`

This folder stores architecture guidance for implementing the harness:

- repository topology
- state kernel design
- event model
- projection model
- adapter boundary design
- evidence, gate, and closeout design
- starter payload boundary design

Architecture guide documents may refine implementation structure, but they must not weaken `docs/requirements/`.

### `docs/implementation/`

This folder stores implementation planning artifacts:

- MVP implementation plan
- implementation slices
- task sequencing
- test strategy
- migration and starter promotion steps

Implementation plans must reference requirement ids and conformance trace rows where applicable.

### `docs/decisions/`

This folder stores decision records for approved architecture, scope, policy, exception, and staging decisions.

Decision records are human approval history. They are not a substitute for canonical runtime state once the state kernel exists.

### `docs/reviews/`

This folder stores external review briefs, review responses, adjudication notes, and review summaries.

Reviews are evidence inputs and planning aids. Review existence is not review quality and does not by itself satisfy a gate.

### `src/`

This folder stores implementation code for the Standard Harness v2 development repository.

Code in `src/` is not automatically part of the starter payload.

### `tests/`

This folder stores tests for the Standard Harness v2 development repository, including contract tests, validation tests, and behavioral eval scaffolding.

Tests are development artifacts unless explicitly promoted into the starter payload.

### `tools/`

This folder stores local development tools used by maintainers and agents.

Tools may generate starter payload files, reports, or evidence, but generated outputs must not enter `starter/standard-harness/` unless allowed by the starter payload manifest.

### `scripts/`

This folder stores command wrappers and automation scripts.

Scripts that mutate starter content must support dry-run behavior before promotion workflows rely on them.

## Starter Promotion Rule

No file is considered part of the clean starter only because it exists under the repository root.

A file is starter payload only when all are true:

- it is under `starter/standard-harness/`
- it is allowed by the starter payload manifest
- it passes contamination checks
- it has validation evidence for the relevant starter contract

## Development Artifact Rule

Development artifacts must stay outside `starter/standard-harness/` unless promoted.

Examples of development-only artifacts:

- implementation plans
- local packet evidence
- test outputs
- generated reports from development validation
- external review files
- temporary migration experiments

## Reference Authority

This repository separates product meaning authority from operational state authority.

Product meaning authority:

```text
docs/requirements/
-> docs/decisions/
-> docs/architecture/
-> docs/implementation/
```

Operational state authority after the state kernel exists:

```text
.harness/state/
-> generated projections
-> generated reports
```

Implementation evidence authority:

```text
source code and tests
-> test and evidence artifacts registered in canonical state
```

Generated reports, local artifacts, and projections must not override approved requirements, decision records, or canonical runtime state.

## Initial Empty Folders

Some folders may initially contain no files.

Empty folder existence does not prove readiness, validation, or starter completeness. Readiness must be established by parsed content and structured diagnostics once the harness state kernel exists.
