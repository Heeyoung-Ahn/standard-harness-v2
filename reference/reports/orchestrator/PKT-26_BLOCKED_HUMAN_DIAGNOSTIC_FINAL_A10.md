# PKT-26 Blocked Human Diagnostic - Final A10 Review Hold

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Workflow: Orchestrator
- Status: blocked-human decision required
- Created at: 2026-07-01
- Source report: `reference/reports/review/PKT-26_REVIEWER_REPORT.md`
- Trigger: final Human-approved same-class A10 Developer loop has been used; Reviewer hold remains.

## Current Route Truth

- Active owner: `orchestrator`
- Active status: `review`
- Ready For Code: approved
- Closeout readiness: not ready
- Autonomous remediation authority: exhausted for same-class A10 issues
- Required decision owner: Human Owner, or Conductor only if a valid scoped delegation exists

## What Would Go Wrong If Closed Now

Closing PKT-26 in the current state would productize an approval-boundary bypass in a harness packet whose purpose is to make closeout and review governance trustworthy.

Concrete risks:

1. Forged grant file can drive approval.
   - `conductor-approve --grant-file` can read arbitrary JSON.
   - If the JSON carries trusted-looking fields, the approval service can accept it and `persist_conductor_approval()` can write Ready For Code or closeout approval.
   - Impact: a non-Human, non-delegated actor could manufacture approval authority through a file path.

2. Raw grant dictionaries can become trusted rows.
   - `ConductorApprovalService.record_grant(store, grant=dict, ...)` accepts caller-supplied grant content.
   - The method strips provenance and sets trusted fields before inserting `conductor_delegation_grants`.
   - Impact: the new service-owned table is not a strong authority boundary if ordinary callers can write trusted rows through a public method.

3. Grant ids can affect filesystem writes.
   - `delegation_grant_id` is interpolated into `_ops/decisions/records/<id>.json`.
   - Separators, `..`, and absolute-path shapes are not rejected.
   - Impact: malformed grant ids can write outside the intended record namespace or corrupt decision-record layout.

4. Idempotent replay can drift from the authority table.
   - Existing idempotency events can cause `record_grant()` to return without verifying or backfilling `conductor_delegation_grants`.
   - Impact: event state and authority-table state can disagree, making replay/repair and audit behavior unreliable.

5. Closeout ledger validation is narrower than grant validation.
   - Current closeout validation checks trusted flag, active status, packet id, approval type, and conductor id.
   - It does not enforce validity window, risk ceiling, packet hash, or evidence prerequisites.
   - Impact: stale or under-scoped grants may satisfy closeout-ledger authority unless explicitly accepted as a narrower contract.

6. Evidence package is incomplete.
   - The final RED failure output is not preserved as a concrete artifact.
   - CLI help does not explain the trust-boundary distinction documented in README.
   - Impact: future maintainers cannot audit exactly which failure was proven before the fix, and operator help can mislead users about trusted versus fixture modes.

## Why The Repeated Loops Failed

The root process failure was not lack of effort; it was an incorrect analysis shape.

- Each remediation targeted the latest observed exploit path instead of enumerating every ingress-to-sink authority path.
- The work fixed `event payload -> closeout ledger` before proving the whole approval authority lifecycle:
  - `grant create`
  - `grant persist`
  - `grant file`
  - `grant approve`
  - `grant row replay`
  - `closeout ledger consume`
- The final fix moved authority into `conductor_delegation_grants`, but did not prove who can write trusted rows into that table.
- Tests were added around the reviewed PoC, but not around the full trust-boundary matrix.
- Reviewer lenses eventually caught the broader issue because they examined adjacent public paths, not only the closeout-ledger builder.

## What Is Already Closed

- Direct forged `conductor.delegation_grant_recorded` events no longer satisfy closeout-ledger authority.
- `_TrustedConductorGrant` marker-object authority was removed.
- Raw `scoped_delegation` ledger entries and supplemental data remain untrusted.
- Positive loop decisions are covered for `bounded_remediation`, `planner_route`, and `blocked`.
- Positive `closeout-ledger-validate --packet-id` smoke is covered.
- Tester re-verification passed focused, adjacent, starter, clean-export, root validation, and root npm regression checks.

## Decision Options

### Option A - Authorize One Additional Bounded Remediation

Use this only if the Human Owner accepts that the previous "final loop" limit is being explicitly overridden.

Required Developer scope:

- Replace raw-dict `record_grant()` trust with a create-and-persist authority path that derives trusted fields internally.
- Make `conductor-approve --grant-file` verify against service-owned grant rows or signed/generated records, not arbitrary JSON fields.
- Validate `delegation_grant_id` as a safe identifier and enforce the final path under `_ops/decisions/records`.
- Make idempotent replay verify/backfill/fail clearly when the authority row is absent.
- Apply full grant validation semantics to closeout-ledger consumption, or explicitly encode and document a Planner-approved narrower contract.
- Add negative tests for fabricated grant file, raw `record_grant()` dict, unsafe grant id, idempotency drift, expired/invalid grant semantics, and positive CLI/service paths.
- Preserve RED artifacts or narrow RED claims explicitly.
- Update CLI help parity for trusted versus fixture modes.

Required post-remediation evidence:

- Focused PKT-26 tests.
- Adjacent closeout/review regression.
- Full starter unittest suite.
- Clean-export with no starter cache residue.
- Root `harness:validate`.
- Root `npm test`.
- Four independent final review lenses.

### Option B - Route To Planner For Scope/Risk Disposition

Use this if the Human Owner wants Planner to decide whether the remaining issues are in PKT-26 scope, a follow-up packet, or an explicit residual-risk decision.

Planner must decide:

- Whether A10 requires the full approval authority lifecycle in PKT-26.
- Whether the closeout-ledger active-row semantics are acceptable or must reuse full grant validation.
- Whether evidence-package gaps can be corrected without another Developer loop.
- Whether a follow-up packet is acceptable despite current closeout hold.

### Option C - Pause PKT-26

Use this if no additional remediation or Planner risk disposition is approved now.

Result:

- PKT-26 remains `review`.
- Closeout is blocked.
- No commit/merge/push closeout should claim PKT-26 complete.

## Orchestrator Recommendation

Do not close PKT-26 in the current state.

The safest technical path is Option A, but it requires explicit Human Owner approval because the final same-class A10 loop was already used. If Human Owner does not want to override that limit, route to Planner for scope/risk disposition under Option B.
