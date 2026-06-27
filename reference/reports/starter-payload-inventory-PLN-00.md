# Starter Payload Inventory: PLN-00

## Scope
Inventory the current clean starter payload candidate at `starter/standard-harness/`
before opening the first implementation packet.

## Inventory Summary
| Zone | Current State | Planning Interpretation |
|---|---|---|
| `_harness/` | present | reusable harness system zone |
| `_ops/` | present | copied-project operating record zone, currently seed directories and `.gitkeep` files |
| `product/` | present | copied-project product code and human-facing document zone |
| `README.md` | present | product README placeholder |
| `START_HERE.md` | present | copied-starter starting guide |
| `AGENTS.md` | absent | expected; Codex-only root entry contract must not be copied into starter |

## Current Top-Level Contract Candidate
```text
starter/standard-harness/
  _harness/
  _ops/
  product/
  README.md
  START_HERE.md
```

## Notable Existing Substructure
```text
_harness/
  bin/
  catalog/
  contracts/
  examples/
  policies/
  schemas/
  system/

_ops/
  active-context/
  backlog/
  decisions/records/
  evidence/
  metrics/
  packets/
  wiki/
  wiki-proposals/

product/
  docs/
    packets/
    pmo/daily-wrap-up/
    project/
      api/
      architecture/
      database/
      implementation/
      planning/
      ui-design/
  src/
  tests/
```

## Preliminary Findings
- The requested three-zone payload structure already exists.
- `starter/standard-harness/AGENTS.md` is absent, which matches the provider-neutral product direction.
- `_ops/` currently uses seed directories and `.gitkeep` files, which is acceptable for a clean starter if generated project history is absent.
- `product/docs/` already separates project-wide, packet, and PMO document zones.
- `_harness/examples/role-routing.codex-claude.yaml` is an example file. The first packet should verify that examples do not make Codex or Claude the product identity.

## Required Follow-Up In PKT-01
- Decide which folder names are contractual.
- State that file names inside folders are examples unless a packet makes a file contractual.
- Define `_ops/` reset/initialization behavior.
- Define whether `_ops/active-context/` is seed-only, generated, or retained.
- Define where WBS/PMO spreadsheet-compatible files belong.
- Add or verify a validator for forbidden starter artifacts such as root `AGENTS.md`, local DB files, generated context, evidence logs, secrets, and root-only history.

## Approval Boundary
This inventory does not approve starter mutation. It is planning evidence for opening
the first implementation packet after PLN-01 approval.
