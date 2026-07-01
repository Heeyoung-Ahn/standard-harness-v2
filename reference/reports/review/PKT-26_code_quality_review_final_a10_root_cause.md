# PKT-26 Code Quality Review - Final A10 Root-Cause Remediation

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Lens: `code_quality_review`
- Independent agent: `019f1c94-8c4e-7d42-ab99-308eed1d4892` / Gauss
- Status: hold
- Reviewed at: 2026-07-01

## Findings

### P1 - `record_grant()` accepts arbitrary grant dictionaries as trusted authority

- Source refs: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`, `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`.
- Gap: `ConductorApprovalService.record_grant()` accepts an arbitrary `dict`, strips provenance, then sets `trusted_harness_surface=True` before writing `conductor_delegation_grants`. The trust boundary remains a public service method with caller-supplied grant content rather than a strongly service-owned create-and-persist boundary.
- Required action: reject raw grant dict persistence or make create+persist one authoritative operation that derives trusted fields internally.
- Required evidence: negative test where a forged dict passed directly to `ConductorApprovalService.record_grant()` cannot satisfy closeout authority.

### P2 - Idempotent replay does not verify/backfill the authority table row

- Source refs: `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`, `starter/standard-harness/_harness/system/standard_harness/state/migrations.py`, `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`.
- Gap: `record_grant()` returns early on an existing idempotency event and does not verify or backfill the new `conductor_delegation_grants` row.
- Required action: on idempotent replay, assert/upsert the authority table row or fail with a clear repair diagnostic.
- Required evidence: migration/idempotency regression coverage.

### P2 - Closeout validation does not apply full grant validation semantics

- Source refs: `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`, `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`.
- Gap: closeout validation checks trusted flag, active status, packet id, approval type, and conductor id. It does not apply existing grant validation semantics for validity window, risk ceiling, packet hash, or evidence prerequisites.
- Required action: reuse approval-service validation rules for ledger closeout, or obtain explicit Planner/Human risk acceptance for a narrower active-grant-row check.

## Evidence Checked

- Final A10 plan, Developer remediation report, Tester report.
- Migration, conductor service, conductor CLI helper, closeout ledger validator, and PKT-26 governance tests.
- Focused verification run reported by lens: `py -3 -m unittest starter.standard-harness._harness.test.test_pkt26_closeout_ledger_governance` passed; 21 tests.

## Limitations

- Read-only review only; no remediation was applied.
- Full starter suite and root `npm test` were not rerun by this lens; Tester evidence was used for those.

## Recommendation

Hold PKT-26 closeout for Developer remediation or explicit Planner/Human risk disposition. Because the final same-class A10 loop has been used, Orchestrator must not silently start another remediation loop.
