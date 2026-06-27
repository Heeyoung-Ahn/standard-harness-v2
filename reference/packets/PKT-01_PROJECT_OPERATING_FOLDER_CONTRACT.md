# PKT-01 Project Operating Folder Contract

> CLOSED. Requirements freeze and Ready For Code were approved by the Human Owner.
> Implementation, testing, review, and Planner closeout completed on 2026-06-28.

## Purpose
Define and enforce the folder-level operating contract for the clean Standard Harness v2
starter payload under `starter/standard-harness/`.

This packet protects all later v2 work from confusing the root development harness with
the product payload, from polluting the copied starter with root history, and from placing
human documents, operating records, or harness-system files in the wrong zone.

## Packet Decision Header
| Item | Value | Status |
|---|---|---|
| Work item | Project Operating Folder Contract | selected |
| Requirements freeze | PLN-01 approved on 2026-06-28 | closed |
| Architecture baseline | `.agents/artifacts/ARCHITECTURE_GUIDE.md` rebased | closed |
| Implementation plan alignment | Wave 1 first packet | closed |
| Ready For Code | approved by Human Owner on 2026-06-28 | approved |
| Packet type | `harness-system` | closed |
| Risk level | `high` | closed |
| Gate profile | `harness-system` with starter-contamination checks | closed |
| Changed zones | root planning docs, `starter/standard-harness/_harness/**`, starter docs/tests | closed |
| Delivery route | Planner -> Developer -> Tester -> Reviewer -> Planner closeout | closed |
| Human sync needed | no remaining planning decision before implementation | closed |

## Source Authority
This packet is based on:
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `.agents/artifacts/IMPLEMENTATION_PLAN.md`
- `reference/planning/PLN-00_DEEP_INTERVIEW.md`
- `reference/planning/PLN-01_REQUIREMENTS_FREEZE.md`
- `reference/artifacts/PROJECT_STARTER_DOC_PACK.md`
- current `starter/standard-harness/` payload inventory

Legacy v1/v2 material is reference-only. It may inform concepts, but it must not be
copied wholesale into the starter payload.

## Goal
Make the v2 starter folder model enforceable, inspectable, and usable after copying the
starter into another repository.

The packet must establish:
- `_harness/` as reusable harness system material,
- `_ops/` as resettable copied-project operating memory,
- `product/` as product source, tests, and human-facing documents,
- `product/docs/` as the only human-facing project document surface,
- folder names as contractual,
- file names as samples unless required by schema, policy, CLI, or minimum starter
  contract,
- starter cleanliness as a validator-enforced property, not only prose.

## Non-Goals
This packet must not:
- implement the full risk-adaptive gate engine,
- implement the full documenter closeout report generator,
- implement PM day-start/day-wrap-up report generation,
- implement long-memory question answering,
- implement automatic multi-provider orchestration,
- implement the full skill router,
- publish or release the starter,
- copy legacy v1 `.agents`, `.harness`, `AGENTS.md`, generated state, evidence, packet
  history, or reports into starter.

## User Problem And Expected Outcome
The Human Owner wants `starter/standard-harness/` to be a clean starter payload that can
be copied tomorrow into another repository and used as the foundation for continuing
Standard Harness v2 development.

The current risk is that root development harness artifacts, legacy references, operating
records, human-facing project documents, and starter product files can be confused.

Expected outcome:
- any LLM entering this development repo can identify `starter/standard-harness/` as the
  product target,
- any copied starter can regenerate required operating folders,
- `_harness/` stays uncontaminated by copied-project work,
- `_ops/` can be reset without damaging `_harness/` or `product/`,
- human-facing documents are consistently placed under `product/docs/`,
- starter validation rejects root/provider/generated/history contamination.

## In Scope
The implementation may change only what is needed to enforce or document the folder
contract:
- `starter/standard-harness/_harness/policies/project-operating-folders.yaml`
- `starter/standard-harness/_harness/schemas/operating-folder-contract.schema.json`
- `starter/standard-harness/_harness/system/standard_harness/operating_folders.py`
- starter validation or contamination checks related to the folder contract
- CLI behavior for init/reset/validate if required by the folder contract
- focused tests for folder initialization, reset safety, placement, and contamination
- starter user-facing usage text only where needed to explain clean starter operation
- packet-local closeout evidence for this packet after implementation

Root planning documents may be updated only for PKT-01 status, sequencing, or approval
boundary parity. They must not be expanded into implementation logs.

## Out Of Scope
- Broad refactor of the starter runtime.
- Replacing the current Python kernel.
- Moving product runtime modules unrelated to folder enforcement.
- Changing the full gate-profile engine beyond the minimum required for this packet's
  own validation expectations.
- Creating provider-specific starter entry contracts.
- Adding `starter/standard-harness/AGENTS.md`.
- Adding real project history, generated runtime state, evidence history, wiki state,
  local DB files, logs, caches, secrets, or release records to starter.

## Required Folder Contract
The starter top-level contract is:

```text
starter/standard-harness/
  _harness/       reusable harness system
  _ops/           copied-project operating records
  product/        product source, tests, and human-facing documents
```

Required zone meaning:

| Zone | Owner | Meaning | Must Not Contain |
|---|---|---|---|
| `_harness/` | harness system | policies, schemas, catalogs, validators, runtime, role/routing contracts, init/reset logic | product-specific operating records, packet results, evidence history, PM reports, wiki state, product deliverables |
| `_ops/` | copied-project operations | packets, evidence indexes, decisions, wiki proposals, wiki memory, backlog, metrics, active context, structured PM records | root development history, real starter-shipped project history, secrets, caches, local DB files in clean payload |
| `product/` | copied-project deliverables | product source, product tests, human-facing project documents | harness policies/runtime, root development history, LLM operating internals |

Required human-facing document folders:

```text
product/docs/project/planning/
product/docs/project/architecture/
product/docs/project/implementation/
product/docs/project/api/
product/docs/project/database/
product/docs/project/ui-design/
product/docs/packets/
product/docs/pmo/
```

PMO WBS files use TSV as the default spreadsheet-compatible sample. CSV remains allowed
when a project integration explicitly needs CSV.

## `_ops` Init And Reset Decision
PKT-01 uses this operating decision:

- `_ops/active-context/` should contain seed folders only in the clean starter.
- Active context files are generated after initialization or runtime execution.
- Reset/init must create missing required `_ops/**` and `product/docs/**` folders.
- Reset must not delete or mutate `_harness/**`.
- Reset must not delete or mutate `product/**` unless a later explicitly approved packet
  defines a separate product cleanup command.
- Clean starter validation must reject real packet history, evidence history, local DB
  files, logs, caches, generated validation reports, secrets, and provider-specific entry
  contracts.

## Provider Example Decision
Provider examples may remain under `_harness/examples/` when they are clearly marked as
non-authoritative examples. They must not become entry contracts, required provider
identity, or a substitute for provider-neutral adapter policy.

`starter/standard-harness/AGENTS.md` remains forbidden.

## Acceptance Criteria
PKT-01 can close only when all of these are true:

1. `_harness/`, `_ops/`, and `product/` are defined as contract-level zones in starter
   policy and documentation.
2. Required folder names are enforced by schema, policy, validator, or CLI behavior.
3. File names are treated as samples unless explicitly required by schema, policy, CLI, or
   minimum starter contract.
4. `product/docs/project`, `product/docs/packets`, and `product/docs/pmo` placement is
   enforced or validated.
5. WBS-compatible PMO files default to TSV while allowing CSV by explicit project need.
6. `_ops` init/reset creates required operating folders without touching `_harness/` or
   product deliverables.
7. Starter validation rejects root `.agents`, root `.harness`, `AGENTS.md`, generated
   runtime state, caches, local DB files, logs, secrets, real packet/evidence history, and
   release evidence.
8. Provider examples are non-authoritative and do not create provider lock-in.
9. A copied-starter smoke path is documented or tested.
10. No implementation completion is claimed without validation evidence.

## Required Verification
The Developer must define exact commands in implementation closeout, but the minimum
verification set is:

```powershell
npm.cmd run harness:validate
PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness init
PYTHONDONTWRITEBYTECODE=1 python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter
```

If starter Python runtime or validators change, add focused Python tests for the changed
service, validator, and CLI paths.

If root validation, promotion, or packet-state logic changes, add focused root tests and
run the matching root validation command.

Verification must include a negative contamination check for:
- `starter/standard-harness/AGENTS.md`,
- root `.agents`,
- root `.harness`,
- `__pycache__`,
- `.pytest_cache`,
- local SQLite DB files,
- logs,
- generated validation reports,
- secrets or `.env`,
- real packet/evidence history.

## Review Requirements
Reviewer must check:
- source parity with `REQUIREMENTS.md`, `ARCHITECTURE_GUIDE.md`, and
  `IMPLEMENTATION_PLAN.md`,
- starter cleanliness and copyability,
- provider-neutral identity,
- `_harness/_ops/product` authority separation,
- reset/init safety,
- human document placement under `product/docs/`,
- evidence quality for every acceptance item,
- whether any work exceeded PKT-01 scope.

Security review is required for contamination, secrets, sensitive evidence, and provider
entry-contract risks. Browser/E2E review is not applicable unless implementation changes a
web-facing surface; any N/A must be explicit in closeout.

## Development Documentation Impact
Documentation impact is required but scoped:
- update starter-facing instructions only when they explain init, validate, reset, or
  folder ownership needed by copied-starter users,
- keep root planning history out of starter,
- do not create broad manuals or generated process history in starter,
- do not use human-facing Markdown for high-volume operating records.

## Planner Packet Challenge Review
Findings after adversarial planning review: none remaining after correction.

Second-pass note:
- Source alignment rechecked against `REQUIREMENTS.md`, `ARCHITECTURE_GUIDE.md`, and
  `IMPLEMENTATION_PLAN.md`.
- Acceptance and evidence coverage rechecked: each folder-contract claim now has a
  corresponding acceptance or verification expectation.
- Risk and regression pressure rechecked: starter contamination, provider lock-in,
  reset safety, and root/starter confusion are explicitly covered.
- Authority boundaries rechecked: PLN-01 approval is recorded, but `Ready For Code`
  remains withheld pending explicit Human Owner approval.
- Evidence path: this packet-local challenge ledger.

Residual risk:
- Exact implementation details for reset command naming and validation internals remain
  Developer-owned inside this packet.
- Full gate engine, PM reports, closeout generator, long memory, provider orchestration,
  and skill routing are intentionally deferred to later packets.

Recommended next route: Orchestrator delivery through Developer, Tester, Reviewer, and
Planner closeout.

## Human Approval Boundary
| Decision Item | Needed | Owner | Status | Notes |
|---|---|---|---|---|
| Requirements freeze | yes | Human Owner | approved | PLN-01 approved on 2026-06-28 |
| First packet selection | yes | Human Owner / Planner | approved | PKT-01 selected as first implementation packet |
| Folder contract planning scope | yes | Human Owner / Planner | approved | This document defines the implementation boundary |
| Ready For Code sign-off | yes | Human Owner | approved | Approved by user on 2026-06-28 |

This `Ready For Code` approval authorizes implementation only within this packet's scope.
It does not authorize release, publish, full gate engine work,
documenter/PM/long-memory/orchestration implementation, or residual-risk acceptance.

## Packet Exit Quality Gate
Before final closeout, the packet must provide:
- changed-file summary,
- acceptance-to-evidence mapping,
- command evidence,
- starter validation evidence,
- contamination negative-test evidence,
- review findings and adjudication,
- security/sensitive-evidence check,
- documentation parity note,
- closeout recommendation.

## Reopen Triggers
Reopen or return to Planner if:
- folder meanings change,
- `product/docs` placement changes,
- `_ops` reset behavior changes,
- provider example policy changes,
- implementation needs to touch areas outside this packet,
- starter gains root history, generated state, provider-specific entry files, evidence
  logs, secrets, local DB files, or caches,
- acceptance cannot be proven with concrete validation evidence.

## Implementation Closeout
Status: closed for PKT-01 scope on 2026-06-28.

Implemented changes:
- Added starter `ops-reset` CLI behavior.
- Added policy-driven `_ops` reset behavior that recreates `_ops/**` and required
  `product/docs/**` folders while preserving `_harness/**` and product deliverables.
- Added focused Python tests for reset safety, contamination detection, CLI output, folder
  policy document rules, and initialized copied-starter validation.
- Extended starter contamination checks for real packet history, real evidence history,
  and generated active context under `_ops/`.
- Adjusted copied-starter validation so initialized copies can validate expected
  generated runtime state while nested clean payload validation remains strict.
- Updated starter-facing usage text for `ops-reset`, clean starter operation, Markdown
  human documents, and TSV/CSV PMO files.
- Restored root harness compatibility anchors in planning artifacts without copying root
  operating history into the starter payload.

Evidence index:
- `reference/artifacts/WALKTHROUGH.md`
- `reference/artifacts/REVIEW_REPORT.md`

Verification passed:
- `$env:PYTHONDONTWRITEBYTECODE='1'; python -m unittest discover -s starter\standard-harness\_harness\test`
  - pass, 5 tests.
- `$env:PYTHONDONTWRITEBYTECODE='1'; python starter\standard-harness\_harness\bin\harness_cli.py --json --harness-root starter\standard-harness validate --starter`
  - pass, diagnostics empty.
- `npm.cmd test`
  - pass, 447 tests.
- `npm.cmd run harness:validate`
  - pass, `ok: true`, `structuralReady: true`, `cutoverReady: true`, no findings.
- Copied-starter smoke from temporary `C:\tmp` copy:
  - `init` pass.
  - `ops-reset` pass.
  - `validate --starter` pass, diagnostics empty.
- Clean payload contamination search:
  - no matches for `__pycache__`, `.pytest_cache`, `.harness`, local SQLite DB files,
    or `AGENTS.md` under `starter/standard-harness`.

Review result:
- Reviewer finding: no blocking findings remain.
- Browser/E2E: N/A, no web-facing surface changed.
- Release/publish: N/A, no release or publish performed.
- Security/boundary: pass for starter contamination, provider-specific entry-contract
  absence, and `_harness/_ops/product` separation.

Planner closeout decision:
- PKT-01 acceptance criteria are satisfied for the approved scope.
- Deferred capabilities remain intentionally outside this packet: full risk-adaptive gate
  engine, documenter closeout generator, PM daily rhythm, long-memory question answering,
  automatic provider orchestration, and full skill router.
- Reopen only if the folder contract, reset behavior, product docs placement, provider
  example policy, or starter cleanliness rules change.
