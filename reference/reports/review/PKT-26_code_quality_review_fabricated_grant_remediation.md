# PKT-26 Code Quality Review - Fabricated Grant Remediation

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Lens: `code_quality_review`
- Independent agent: `019f1c6f-2615-7323-b798-6ee20611d495` / Raman
- Status: hold
- Reviewed at: 2026-07-01
- Scope: Latest A10 fabricated `conductor.delegation_grant_recorded` remediation.

## Reviewed Files

- `reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md`
- `reference/reports/developer/PKT-26_DEVELOPER_REMEDIATION_REPORT.md`
- `reference/reports/test/PKT-26_TESTER_REPORT.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py`
- `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`
- `starter/standard-harness/_harness/test/test_pkt26_closeout_ledger_governance.py`

## Findings

### P1 - Fabricated direct grant events can still satisfy A10

- Surface: direct persisted event consumption by `build_runtime_closeout_ledger()`.
- Evidence: the lens reproduced a direct `store.append_event(event_type="conductor.delegation_grant_recorded", payload={... forged grant_provenance ...})` bypass.
- Observed result: `status=pass`, `loopDecision=bounded_remediation`, `diagnostics=[]`.
- Gap: `ConductorLedger.record_delegation_grant()` strips and injects `grant_provenance` only when callers use that wrapper, but the runtime builder reads persisted event payload JSON directly and `_trusted_grant_provenance()` trusts payload fields alone.

### P1 - Test gap at actual ledger-consumption boundary

- The added negative test covers raw dict input through `ConductorLedger.record_delegation_grant()`.
- It does not cover a forged persisted event already carrying trusted-looking provenance.

## Required Remediation

- Make trusted grant consumption verify an unforgeable or store-enforced service path, not just JSON payload provenance.
- Add a regression that direct runtime event insertion with forged `grant_provenance` remains blocked with `conductor_loop_judgment_requires_scoped_grant`.
- If `HarnessStore.append_event` is intentionally trusted/internal-only, document and enforce that API boundary; otherwise `build_runtime_closeout_ledger()` must not treat arbitrary `conductor.delegation_grant_recorded` payloads as trusted grants.

## Non-Blocking Risks

- `_TrustedConductorGrant` is a minimal in-process marker and fits the narrow remediation only if the trust boundary excludes hostile same-process code. It is not a security primitive.

## Verification

- Existing targeted suite: `py -3 -m unittest starter.standard-harness._harness.test.test_pkt26_closeout_ledger_governance`
- Result: pass; 17 tests.
- Additional PoC: direct forged event bypass reproduced the A10 failure described above.

## Reviewer Reliance

Reviewer must treat this lens as blocking code-quality evidence for PKT-26 closeout.
