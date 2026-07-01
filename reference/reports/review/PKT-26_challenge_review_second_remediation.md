# PKT-26 Challenge Review - Second Remediation

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Lens: `challenge_review`
- Independent agent: `019f1c2e-11bd-7943-ac50-7895d3bddd5d` / Leibniz
- Status: hold
- Reviewed at: 2026-07-01

## Findings

### Blocking - A1 is still narrowed at the service boundary

- Source refs: `reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md` A1; `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`; `starter/standard-harness/_harness/test/test_pkt26_closeout_ledger_governance.py`.
- Gap: the positive runtime test now proves a runtime happy path without supplemental input, but `build_runtime_closeout_ledger(..., supplemental=...)` still allows caller-supplied packet-doc review, review lenses, adjudication, closeout, packet-exit, or delegation data to seed a ledger later stamped as trusted runtime provenance.
- Required action: remove `supplemental` from the trusted builder path, or make supplemental fields diagnostic/untrusted and unable to satisfy A1 support-chain links.
- Required evidence: negative regression where missing runtime closeout entries plus supplemental support-chain fields remains blocked.

### Blocking - A10 still has vocabulary-only trusted grant risk on the runtime event path

- Source refs: `reference/packets/PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION.md` A10; `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py`; `starter/standard-harness/_harness/test/test_pkt26_closeout_ledger_governance.py`.
- Gap: JSON/path self-attestation is blocked, but a raw `closeout_ledger.entry_recorded` payload with entry type `scoped_delegation` is force-marked as trusted by merge logic. The positive test uses that raw helper, not a dedicated scoped Human delegation grant service.
- Required action: validate A10 against an actual trusted grant/service record, or only accept `scoped_delegation` entries derived from that service.
- Required evidence: negative regression where raw closeout-ledger scoped-delegation payload fails, plus positive regression using the trusted grant/service path.

## Residual Scope

- A7 compact report and lens evidence binding appear materially improved.
- A9 loop thresholds appear preserved.
- Tests were not rerun by this lens; the lens reviewed source and Tester evidence.

## Recommended Route

Developer remediation is required if the Human Owner or delegated Conductor authorizes another loop. Otherwise this is a same-class repeated finding and should escalate under the PKT-26 loop-threshold rule.
