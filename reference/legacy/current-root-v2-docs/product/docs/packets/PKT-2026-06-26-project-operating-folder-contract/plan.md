# PKT-2026-06-26 Project Operating Folder Contract

## Planner Open

- Planner: planner-agent
- Opened at: 2026-06-26
- Packet type: harness-system
- Risk level: medium
- Status: planned

## Objective

Establish the project operating folder contract for Standard Harness so that AI/validator operating records, harness rules, product code, human-facing project documents, packet documents, and PMO documents have clear ownership and authority boundaries.

The goal is not only to create folders. The goal is to make the folder model visible in policies, validators, workflow guidance, skill contracts, starter expectations, and human-facing documentation rules.

## Background

V2.1 has a strong validation kernel, but the current starter/product operating layout is not explicit enough for real project use. LLMs can produce code and evidence faster than humans can inspect raw operational logs. Human operators need readable projections under `product/docs/`, while `_harness/` and `_ops/` remain AI/validator-oriented system and operating areas.

## Scope

Implement or document the following contract:

```text
_harness/
  AI/validator-facing harness rules, policies, schemas, catalogs, and validation contracts.

_ops/
  AI/validator-facing operational ledger, packet state, evidence, decisions, wiki proposals,
  wiki/navigation projections, backlog, metrics, and generated operational records.

product/
  src/
    Product source code.

  tests/
    Product tests when a target project uses product-local tests.

  docs/
    project/
      Cross-project human-facing documents such as planning, architecture,
      implementation, API, database, and UI design.

    packets/
      Human-facing packet summaries and packet-level planning/review/closeout documents.

    pmo/
      Human-facing project management documents, including WBS-style tabular files,
      daily wrap-up reports, weekly status, risk register, and decision summaries.
```

## Non-Scope

- Do not copy V1.0 `.agents`, `.harness`, runtime, generated state, plugin, or starter payload files into this repository.
- Do not make `_ops/` the primary human documentation surface.
- Do not let `product/docs/**` override `_harness/**`, trusted evidence, gate results, or human decision records.
- Do not implement full V2.2 planning/design pipeline in this packet.
- Do not implement browser automation, CI integration, release train, or portfolio management in this packet.

## Required Contract Decisions

1. `_harness/` is the harness system authority area.
2. `_ops/` is the AI/validator operational ledger area.
3. `product/src/` is the product source area.
4. `product/docs/project/` contains documents that span the whole project.
5. `product/docs/packets/<packet-id>/` contains human-facing packet documents.
6. `product/docs/pmo/` contains PMO documents.
7. Human-facing prose documents are Markdown (`.md`).
8. WBS-style PMO tabular documents are CSV or TSV, with TSV preferred when fields may contain commas.
9. Human-facing documents are projections. They must cite canonical sources, evidence IDs, packet IDs, and generation/update metadata when relevant.
10. Wiki-usable documents must follow a metadata convention so they can be indexed or proposed for Wiki updates without becoming source of truth.

## Detailed Target Folder Contract

The implementation should converge on the following folder contract. Folder names are contractual. File names are samples except for the minimum execution and contract files required by starter validation.

```text
_harness/
  README.md
  bin/
    harness_cli.py

  system/
    standard_harness/

  policies/
    zones.yaml
    agent-permissions.yaml
    gate-profiles.yaml
    context-authority.yaml
    wiki-knowledge-policy.yaml
    product-docs-policy.yaml
    project-operating-folders.yaml

  schemas/
    packet.schema.json
    evidence.schema.json
    gate-result.schema.json
    wiki-page.schema.json
    wiki-proposal.schema.json
    product-doc.schema.json
    pmo-table.schema.json
    operating-folder-contract.schema.json

  catalog/
    skill-catalog.yaml
    minimum-required-skills.yaml
    workflow-catalog.yaml

  examples/
    role-routing.codex-claude.yaml
    project-operating-folder.example.yaml

  contracts/
    requirements-index.yaml
    traceability-matrix.yaml
    hr-coverage-matrix.yaml
```

`_harness/` is not a daily human document area. It is the AI/validator-facing ruleset and contract area. Product packets must not mutate it.

```text
_ops/
      packets/
    <packet-id>/
      packet.json
      state.json
      gate-results.json
      claim-ledger.json
      closeout.json

  evidence/
    <packet-id>/
      command-logs/
      test-results/
      browser/
      reviews/
      security/
      closeout-report.md
      evidence-index.json

  decisions/
    records/
      <decision-id>.yaml
      <decision-id>.md

  wiki-proposals/
    <packet-id>/
      wiki-update-proposal.yaml
      wiki-update-proposal.md

  wiki/
    index.yaml
    architecture.md
    decision-log.md
    packet-history.md
    current-conventions.md
    known-frictions.md
    agent-lessons.md
    deprecated-context.md
    skill-facing-index.md

  backlog/
    harness-improvement-backlog.md
    starter-promotion-candidates.yaml

  metrics/
    hr200-success-metrics.json
    friction-summary.json

  active-context/
    planner-context.json
    developer-context.json
    reviewer-context.json
```

`_ops/` is the AI/validator operational ledger. It may contain Markdown, but Markdown here is evidence or operational projection, not the primary human reading surface.

```text
product/
  src/
    Product source code.

  tests/
    Product-local tests for target projects that keep tests under product.

  docs/
    project/
      planning/
        requirements.md
        assumptions.md
        non-goals.md
        open-decisions.md
        stakeholder-map.md
        success-criteria.md

      architecture/
        overview.md
        domain-model.md
        boundaries.md
        integration-map.md
        deployment-view.md

      implementation/
        current-plan.md
        implementation-log.md
        migration-plan.md
        dependency-notes.md

      api/
        api-contract.md
        endpoint-index.md

      database/
        database-design.md
        migration-notes.md
        data-dictionary.md

      ui-design/
        ui-design-system.md
        screen-map.md
        accessibility-notes.md

    packets/
      <packet-id>/
        summary.md
        plan.md
        design.md
        implementation.md
        test-review.md
        requirements-review.md
        security-review.md
        refactor-review.md
        closeout.md
        evidence-links.md

    pmo/
      wbs.tsv
      milestone-plan.tsv
      daily-wrap-up/
        YYYY-MM-DD.md
      weekly-status.md
      risk-register.md
      decision-summary.md
      dependency-board.tsv
```

`product/docs/` is the human-facing documentation surface. These files are projections from `_ops` and `_harness` sources. They help a human follow the project without reading every raw packet, test log, or gate result.

### Document Category Rules

| Area | Primary reader | File formats | Authority |
|---|---|---|---|
| `_harness/**` | validator, harness developer, AI planner | `.yaml`, `.json`, `.md` only when policy/manual-like | policy/schema/catalog authority |
| `_ops/**` | validator, agents, auditors | `.json`, `.yaml`, `.txt`, `.log`, `.md` | operational evidence and ledger |
| `product/docs/project/**` | human owner, PM, planner, reviewer | `.md` | human-facing project projection |
| `product/docs/packets/**` | human owner, reviewer, documenter | `.md` | human-facing packet projection |
| `product/docs/pmo/**` | human owner, PMO, planner | `.md`, `.csv`, `.tsv` | human-facing PMO projection |

Rules:

- Human prose documents must be Markdown.
- WBS and other spreadsheet-like PMO documents must be CSV or TSV.
- TSV is preferred for WBS when fields may contain commas.
- File names in examples are samples unless explicitly listed as starter-required execution or contract files.
- Every `product/docs/**` document that summarizes implementation, evidence, decisions, reviews, or closeout must link back to `_ops` source records.
- `product/docs/**` cannot override `_harness/**`, gate results, trusted evidence, or human decision records.
- Wiki-usable human documents must include metadata that can be consumed by a wiki proposal or wiki indexer.

### Workflow And Skill Contract Impacts

The folder contract must be visible in project-operating workflows and skills:

- Planner workflows create or update `product/docs/project/**` and `product/docs/packets/<packet-id>/plan.md`.
- Developer workflows write product code under `product/src/**` or mapped product zones, never `_harness/**` for product packets.
- Tester workflows register raw evidence under `_ops/evidence/<packet-id>/**` and may write human summaries under `product/docs/packets/<packet-id>/test-review.md`.
- Reviewer workflows write structured review evidence under `_ops/evidence/<packet-id>/reviews/**` and human summaries under `product/docs/packets/<packet-id>/requirements-review.md` or `refactor-review.md`.
- Security reviewer workflows write structured evidence under `_ops/evidence/<packet-id>/security/**` and human summaries under `product/docs/packets/<packet-id>/security-review.md`.
- Documenter workflows generate human-facing summaries under `product/docs/**`, but write Wiki proposals only under `_ops/wiki-proposals/**`.
- Wiki applier workflows mutate `_ops/wiki/**` only after validated proposals.
- PMO workflows generate `.md` reports and `.csv`/`.tsv` tabular files under `product/docs/pmo/**`.

## Minimum Human-Facing Document Examples

Project-wide documents:

```text
product/docs/project/planning/requirements.md
product/docs/project/planning/assumptions.md
product/docs/project/planning/open-decisions.md
product/docs/project/architecture/overview.md
product/docs/project/implementation/current-plan.md
product/docs/project/api/api-contract.md
product/docs/project/database/database-design.md
product/docs/project/ui-design/ui-design-system.md
```

Packet documents:

```text
product/docs/packets/<packet-id>/summary.md
product/docs/packets/<packet-id>/plan.md
product/docs/packets/<packet-id>/implementation.md
product/docs/packets/<packet-id>/test-review.md
product/docs/packets/<packet-id>/security-review.md
product/docs/packets/<packet-id>/closeout.md
```

PMO documents:

```text
product/docs/pmo/wbs.tsv
product/docs/pmo/daily-wrap-up/YYYY-MM-DD.md
product/docs/pmo/weekly-status.md
product/docs/pmo/risk-register.md
product/docs/pmo/decision-summary.md
```

## Wiki Compatibility Rule

Any human-facing document that may feed Wiki or long-term memory should include a small metadata block or equivalent structured header:

```yaml
docType: project | packet | pmo
projection: true
authority: human-facing-summary
canonicalSources:
  - _harness/policies/...
  - _ops/evidence/...
relatedPackets:
  - PKT-...
relatedEvidence:
  - EV-...
reviewStatus: draft | current | superseded
owner: human-owner | planner-agent | documenter-agent
lastUpdated: YYYY-MM-DD
```

These documents may guide humans and agents, but cannot directly create requirements, permissions, gate results, policy, or release authority.

## Implementation Targets

The implementation should update the repository so this folder contract is enforced or visible in:

- `_harness/policies/zones.yaml`
- `_harness/policies/agent-permissions.yaml`
- `_harness/catalog/skill-catalog.yaml`
- `_harness/catalog/minimum-required-skills.yaml`
- starter folder expectations under `starter/standard-harness/`
- validation code that checks starter or operating folder shape
- docs/manual guidance
- tests proving the folder contract

## Acceptance Criteria

- AC-001: The starter/project operating folder contract defines `_harness`, `_ops`, `product/src`, and `product/docs`.
- AC-002: `product/docs/project`, `product/docs/packets`, and `product/docs/pmo` are distinct and documented.
- AC-003: Human-facing prose documents are required to be `.md`.
- AC-004: WBS-style PMO tables are required to be `.csv` or `.tsv`, with `.tsv` preferred.
- AC-005: Wiki-usable human documents have required metadata or front matter for source, authority, provenance, owner, freshness, and related packet/evidence.
- AC-006: `_ops` remains an AI/validator ledger and is not treated as the primary human-facing documentation surface.
- AC-007: Product packet changes remain blocked from modifying `_harness/**`.
- AC-008: Tests cover valid and invalid operating folder layouts.

## Test Plan

Focused tests to add or update:

```powershell
python -m unittest tests.contract.test_project_operating_folder_contract
python -m unittest tests.contract.test_starter_boundary
```

Regression:

```powershell
python -m unittest discover -s tests
```

## Evidence Plan

Expected closeout evidence:

- focused test output for project operating folder contract
- regression output
- diff showing policy, validator, starter, and documentation updates
- packet closeout summary under `product/docs/packets/PKT-2026-06-26-project-operating-folder-contract/closeout.md`

## Review Plan

- Requirements review: confirm this packet matches the human-facing documentation separation requirement.
- Boundary review: confirm `_harness`, `_ops`, and `product` authority boundaries remain protected.
- Security review: confirm no sensitive evidence is moved into human-facing documents.
- Refactor review: confirm new folder-contract validation does not duplicate unrelated starter contamination logic unnecessarily.

## Closeout Criteria

This packet can close only when:

- focused tests pass,
- full regression passes,
- the new folder contract is visible in policy and human documentation,
- generated human-facing docs rules are compatible with Wiki provenance expectations,
- no `_ops` operational ledger document is treated as higher authority than `_harness` policy, trusted evidence, gate results, or human decision records.
