# PKT-26 Final Authority Lifecycle Remediation Plan

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Workflow: Planner
- Status: Human Owner approved exactly one more bounded remediation after final A10 review hold.
- Source reports:
  - `reference/reports/orchestrator/PKT-26_BLOCKED_HUMAN_DIAGNOSTIC_FINAL_A10.md`
  - `reference/reports/review/PKT-26_REVIEWER_REPORT.md`

## Planner Disposition

PKT-26 A10 includes the full scoped Conductor approval authority lifecycle, not only the closeout-ledger consumption path.

Reason:

- Requirements and architecture define Ready For Code and Closeout approval as Human direct approval or selected Conductor approval backed by a valid scoped Human delegation through a trusted harness approval command/service.
- A closeout ledger that ignores forged events is insufficient if `conductor-approve` or `record_grant()` can still manufacture trusted approval authority from caller-controlled grant data.
- Therefore the final remediation scope includes grant creation, grant persistence, grant-file loading, approval consumption, idempotency replay, and closeout-ledger consumption.

## Authority Lifecycle Matrix

| Stage | Trusted Input | Forbidden Input | Trusted Sink | Required Negative Proof |
| --- | --- | --- | --- | --- |
| Grant creation | Service call fields validated by `ConductorApprovalService.create_grant()` | Unsafe `delegation_grant_id`; invalid status/window/risk | in-memory draft grant only | unsafe id rejected |
| Grant persistence | Service-created grant persisted by one trusted service operation | Raw caller dict; fabricated `trusted_harness_surface`; prior event without row | `conductor_delegation_grants` row plus audit event | raw `record_grant(dict)` cannot create trusted authority |
| Grant file | Record file emitted by trusted grant-create path | Arbitrary JSON file with trusted-looking fields | CLI readable grant reference | fabricated grant file cannot approve |
| Approval | Grant loaded from file must match service-owned row and full grant validation | File-only authority; stale/expired/wrong-risk/wrong-hash/missing prereq | approval decision and packet/closeout persistence | forged/expired/wrong-risk/wrong-hash grant-file approval rejected |
| Idempotency replay | Existing event plus matching authority row | Existing event without row | same grant record or repair failure | replay without row does not silently pass |
| Closeout ledger | Runtime-built ledger plus service-owned row passing full grant semantics | raw scoped_delegation event; forged grant event; active row with expired/window/risk/hash/prereq mismatch | loop-threshold decision | invalid grant row cannot satisfy A10 |

## Design Decision

Implement a single authority path:

```text
create_grant(...)
  -> record_grant(store, grant, ...)
       validates safe id and service-created token
       persists conductor_delegation_grants
       writes audit event
       writes grant record file
  -> load_grant_reference(store, path)
       loads file
       verifies matching row exists
       returns row-backed grant
  -> decide(...)
       applies full grant validation semantics
  -> closeout ledger
       consumes only row-backed grants and applies the same validation semantics
```

The remediation must not rely on caller-provided `trusted_harness_surface` or event payload provenance.

## Required Tests

RED tests before production changes:

- `test_raw_record_grant_dict_cannot_create_trusted_closeout_authority`
- `test_fabricated_grant_file_cannot_drive_conductor_approve`
- `test_unsafe_delegation_grant_id_is_rejected_before_file_write`
- `test_record_grant_idempotent_replay_without_authority_row_does_not_silently_pass`
- `test_expired_grant_row_cannot_satisfy_closeout_loop_judgment`
- `test_wrong_risk_or_missing_prerequisite_grant_row_cannot_satisfy_closeout_loop_judgment`

Positive tests after implementation:

- valid `conductor-grant-create` still writes a safe record and service-owned row;
- valid `conductor-approve --grant-file` succeeds only when the file maps to the matching row and full grant validation passes;
- valid closeout-ledger `--packet-id` still passes for `bounded_remediation`, `planner_route`, and `blocked`.

## Simulation

| Scenario | Expected Result |
| --- | --- |
| Direct forged grant event | blocked |
| Raw scoped delegation closeout entry | blocked |
| Raw `record_grant()` dict with trusted-looking fields | blocked |
| Arbitrary grant file with trusted-looking fields | `conductor-approve` rejected |
| Unsafe `delegation_grant_id` with `..` or separator | rejected before file write |
| Idempotency event exists but authority row missing | rejected or repaired, never silently trusted |
| Expired active row | blocked |
| Wrong risk ceiling | blocked |
| Missing evidence prerequisite | blocked |
| Valid service-created persisted grant | pass |

## Final Plan Review

- This scope directly addresses every final Reviewer P1/P2 finding.
- This is not a narrow PoC fix; it covers the ingress-to-sink authority lifecycle.
- This does not approve closeout or residual risk.
- Implementation must follow TDD and preserve RED/GREEN evidence.
- After implementation, Tester and all four independent review lenses must run again.
