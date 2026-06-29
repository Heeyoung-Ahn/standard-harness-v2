# PKT-12 Planner Closeout

- Work item: `PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP`
- Packet: `reference/packets/PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP.md`
- Planner decision: closed
- Date: 2026-06-30

## Scope Closed

PKT-12 closed the schema/permission boundary cleanup scope approved for V2.0 hardening:

- Canonical risk taxonomy now uses `low`, `standard`, `high`, and `critical`; `medium` and `normal` remain compatibility aliases to `standard`.
- Unknown risk values fail closed to `critical` across packet creation, gate profile evaluation, and conductor routing.
- Starter schema `$id` and title fields no longer expose product-facing `v2.1` labels.
- Copied-starter permission surfaces no longer leak root development role, root starter path grants, root evidence/planning paths, or effective skill-route write authorization.
- Contamination checks reject nested root starter payload leakage, real `_ops/wiki/**` / `_ops/wiki-proposals/**` state, and generated cache artifacts.
- Clean-export evidence reports zero diagnostics, zero cache directories, and zero `.pyc` files.

## Evidence Accepted

- Tester report: `reference/reports/test/PKT-12_TESTER_REPORT.md`
- Reviewer adjudication: `reference/reports/review/PKT-12_REVIEW_REPORT.md`
- Required closeout lenses:
  - `reference/reports/review/PKT-12-closeout-challenge-review.md`
  - `reference/reports/review/PKT-12-closeout-adversarial-security-review.md`
  - `reference/reports/review/PKT-12-closeout-code-quality-review.md`
  - `reference/reports/review/PKT-12-closeout-evidence-review.md`
- Schema/risk evidence:
  - `reference/reports/schema/PKT-12-risk-taxonomy.md`
  - `reference/reports/schema/PKT-12-schema-identity.md`
- Security/starter evidence:
  - `reference/reports/security/PKT-12-permission-boundary.md`
  - `reference/reports/security/PKT-12-security-review.json`
  - `reference/reports/starter/PKT-12-copied-starter-smoke.md`
- Validation evidence:
  - `reference/reports/validation/PKT-12-root-validation.json`
  - `reference/reports/validation/PKT-12-root-regression.md`
  - `reference/reports/validation/PKT-12-starter-validation.md`
  - `reference/reports/validation/PKT-12-targeted-tests.md`
  - `reference/reports/validation/PKT-12-validator-rejections.md`
  - `reference/reports/validation/PKT-12-validation-report-context.md`

## Verification Accepted

- `py -3 -B -m unittest discover -s starter\standard-harness\_harness\test -p "test_*.py"` exited `0`; `113` tests ran, `112` passed, `1` skipped.
- `npm.cmd test` exited `0`; `483` tests passed.
- `npm.cmd run harness:validate` exited `0`; findings `0`.
- `npm.cmd run harness:sync-state` exited `0`; validate, validation-report, context, and status passed.
- Clean-export scan returned `diagnostic_count: 0`, `cache_dirs: 0`, and `pyc_files: 0`.

## Residual Risk

- The stale generated review excerpt under `.agents/runtime/review-report-excerpts/PKT-12_SCHEMA_PERMISSION_BOUNDARY_CLEANUP-review-report.md` references PKT-01 and is not accepted as PKT-12 evidence.
- Broader non-schema historical/internal `V2.1` wording is outside PKT-12 scope and remains available for a later identity-cleanup packet if Planner chooses.
- Optional later hardening may extend `validate_route_output_contract` to require `permissionBoundary` and `declaredSkillWriteZones` fields. This is not closeout-blocking because current route and worker-brief tests directly assert empty effective write permissions.

## Out Of Scope Confirmed

PKT-12 does not close PKT-13 long-memory QA, PKT-14 provider CLI E2E orchestration, or PKT-15 compound loop / starter-promotion rehearsal. Those remain separate hardening packets.

## Planner Closeout Decision

PKT-12 is closed for its approved scope. Subsequent hardening work may proceed from this baseline only after the generated state is refreshed and validation remains pass.
