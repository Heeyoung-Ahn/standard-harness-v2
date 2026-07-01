# PKT-26 Adversarial Security Review - Second Remediation

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Lens: `adversarial_security_review`
- Independent agent: `019f1c2e-25cd-79d0-99ec-c7c8228c619e` / Popper
- Status: hold
- Reviewed at: 2026-07-01

## Findings

### Blocking - raw service evaluation can self-attest trusted provenance

- Source refs: `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`.
- Gap: `CloseoutLedgerGovernance.evaluate()` accepts a caller-supplied dict with `ledgerProvenance.source="runtime-ledger"`, `trustedHarnessSurface=true`, and `scopedHumanDelegation.trusted_harness_surface=true` as trusted. The lens verified a crafted in-process ledger can return `status=pass` and `loopDecision=bounded_remediation`.
- Impact: this violates A10 because trusted command/service provenance must not be self-attestable from arbitrary in-process dicts.
- Required action: make trusted provenance/delegation non-self-attestable at the service boundary. Only `build_runtime_closeout_ledger()` or an explicit trusted runtime source object should be able to set trust markers that satisfy closeout-sensitive validation.
- Required evidence: negative service test where a raw dict self-attests trusted runtime provenance and scoped delegation but remains blocked.

### High - LLM output and unknown approval sources are silently ignored

- Source refs: `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`; `starter/standard-harness/_harness/test/test_pkt26_closeout_ledger_governance.py`.
- Gap: authority diagnostics cover known sources such as PM rows, projections, release bundles, clean export, QA answers, generated state, and inherited root memory. They do not cover `llm_output`, and unknown `sourceType` values with `claimsApproval=true` are ignored instead of failing closed.
- Required action: add `llm_output_cannot_approve_gate` or a generic `untrusted_authority_source_cannot_approve_gate`.
- Required evidence: tests for `sourceType="llm_output"` and unknown approval sources expecting fail-closed diagnostics.

## Checked Paths

- CLI `--ledger-json` and `--ledger-path` modes mark caller payloads untrusted before validation.
- Persisted blocked decision still wins over wrapper approval.
- README documents `--packet-id` as trusted and JSON/path modes as diagnostic-only untrusted modes.

## Residual Scope

- `--ledger-path` path containment under `harness_root` is not enforced for absolute paths or `..` traversal. This was not classified as a blocker because payloads remain untrusted and are not echoed, but it should be covered if fixture-mode file access is intended to be root-scoped.
- Real multi-agent CLI execution remains out of PKT-26 Tester scope.

## Recommended Route

Developer remediation is required if another bounded remediation loop is authorized. Otherwise this repeated A1/A10 class finding should escalate under the PKT-26 loop-threshold rule.
