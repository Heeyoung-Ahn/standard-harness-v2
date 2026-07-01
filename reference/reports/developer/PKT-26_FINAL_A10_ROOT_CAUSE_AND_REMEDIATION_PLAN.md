# PKT-26 Final A10 Root Cause And Remediation Plan

- Packet: `PKT-26_CLOSEOUT_LEDGER_AND_REVIEW_GOVERNANCE_PRODUCTIZATION`
- Workflow basis: Orchestrator stop after Reviewer hold; Human Owner approved exactly one final loop.
- Scope: A10 trusted Conductor delegation boundary only.
- Status: plan ready before final Developer loop.

## Root Cause

The repeated A10 failures are not separate small bugs. They share one root cause:

> Trusted Conductor delegation authority is represented by caller-controlled runtime data instead of a service-owned, non-payload trust boundary.

Observed failure chain:

1. `ConductorApprovalService.create_grant()` creates a grant, but the trusted-service fact is not persisted in a separate authority surface.
2. `ConductorLedger.record_delegation_grant()` writes a `conductor.delegation_grant_recorded` event.
3. `build_runtime_closeout_ledger()` reads only `events.payload_json` for that event type.
4. `_trusted_grant_provenance()` accepts trusted-looking fields inside that payload.
5. Therefore a caller can bypass the intended trusted command/service boundary by either:
   - directly appending a forged `conductor.delegation_grant_recorded` event with forged `grant_provenance`; or
   - importing/reusing `_TrustedConductorGrant` so the wrapper emits trusted-looking provenance.

The previous remediations were partial because they cleaned one ingress path at a time. They did not move the authority check out of forgeable payload data.

## Accepted Findings

| Finding | Severity | Disposition |
| --- | --- | --- |
| Direct `HarnessStore.append_event()` can insert a forged trusted grant event | P1 | Accepted. Must be blocked by design, not by another payload-field check. |
| Importable `_TrustedConductorGrant` can forge service-created state | P1 | Accepted. Marker object must be removed from the authority proof path. |
| Positive A10 evidence covers only `bounded_remediation` | P2 | Accepted. Add `planner_route` and `blocked` positive fixtures. |
| Positive CLI `closeout-ledger-validate --packet-id` evidence is indirect | P2 | Accepted. Add direct positive CLI smoke. |

## Remediation Architecture

### Design Decision

Do not consume `conductor.delegation_grant_recorded` event payloads as trusted delegation authority.

Instead:

1. Add a service-owned `conductor_delegation_grants` table through the existing starter SQLite migration path.
2. Persist trusted grants into that table only from the trusted Conductor grant command/service path.
3. Keep `conductor.delegation_grant_recorded` events as audit/read-model traces only.
4. Make `build_runtime_closeout_ledger()` read trusted scoped delegation grants from `conductor_delegation_grants`, not from event payload JSON.
5. Remove `_TrustedConductorGrant` and `_is_trusted_conductor_grant()` from the authority proof path.

This changes the trust model from:

```text
event payload says it was trusted -> trusted
```

to:

```text
trusted Conductor grant service persisted a grant row -> trusted
```

Direct event insertion then becomes harmless because closeout validation no longer consumes those events for authority.

## File Plan

| File | Change |
| --- | --- |
| `starter/standard-harness/_harness/system/standard_harness/state/migrations.py` | Add `conductor_delegation_grants` table. |
| `starter/standard-harness/_harness/system/standard_harness/workflow/conductor.py` | Remove marker-object trust; add trusted grant persistence/query helpers tied to the service path. |
| `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_cli.py` | Route `conductor-grant-create` persistence through trusted grant service persistence. |
| `starter/standard-harness/_harness/system/standard_harness/validation/closeout_ledger.py` | Query trusted grants from `conductor_delegation_grants`; stop reading grant authority from `conductor.delegation_grant_recorded` payloads. |
| `starter/standard-harness/_harness/system/standard_harness/cli/main.py` | Preserve CLI surface; add positive `--packet-id` smoke coverage through tests, not behavior expansion. |
| `starter/standard-harness/_harness/test/test_pkt26_closeout_ledger_governance.py` | Add RED tests for direct event insertion and marker reuse removal; add positive `planner_route`, `blocked`, and CLI `--packet-id` smoke. |
| `starter/standard-harness/_harness/README.md` | Clarify trusted grant authority comes from service-owned grant persistence, while grant events are audit/read-model traces only. |

## Test Plan

1. RED: `test_direct_conductor_grant_event_payload_does_not_satisfy_trusted_grant`
   - Arrange complete runtime closeout support chain with delivery-loop threshold reached.
   - Insert forged `conductor.delegation_grant_recorded` using `HarnessStore.append_event()`.
   - Expect `status=blocked` and `conductor_loop_judgment_requires_scoped_grant`.

2. RED: `test_imported_private_marker_cannot_create_trusted_grant_authority`
   - Assert `_TrustedConductorGrant` is absent or cannot satisfy trusted grant authority.
   - If a caller uses `ConductorLedger.record_delegation_grant()` with raw grant data, expect blocked closeout.

3. GREEN: `test_runtime_ledger_builder_reads_authoritative_store_records`
   - Update helper to use trusted service-owned grant persistence.
   - Expect `loopDecision=bounded_remediation`.

4. GREEN: positive delegated decisions
   - `bounded_remediation`
   - `planner_route`
   - `blocked`

5. GREEN: positive CLI `--packet-id`
   - Build a full runtime store with trusted service-owned grant persistence.
   - Run `closeout-ledger-validate --packet-id <packet>`.
   - Expect JSON result with `status=pass`.

6. Regression:
   - PKT-26 focused tests.
   - Adjacent closeout/review tests.
   - Full starter unittest suite.
   - Clean export with `PYTHONDONTWRITEBYTECODE=1`.
   - Root `harness:validate`.
   - Root `npm test`.

## Simulation

| Scenario | Current behavior | Planned behavior | Expected diagnostic |
| --- | --- | --- | --- |
| Raw grant through `ConductorLedger.record_delegation_grant()` | blocked after latest remediation | remains blocked | `conductor_loop_judgment_requires_scoped_grant` |
| Direct forged `conductor.delegation_grant_recorded` event | passes | blocked because closeout builder ignores event payload authority | `conductor_loop_judgment_requires_scoped_grant` |
| Direct `_TrustedConductorGrant` import/reuse | passes | impossible/irrelevant because marker is removed from authority proof path | `conductor_loop_judgment_requires_scoped_grant` |
| Trusted grant command/service path | passes | passes via `conductor_delegation_grants` table | none |
| Valid grant with `bounded_remediation` | passes | passes | none |
| Valid grant with `planner_route` | not directly proven | passes | none |
| Valid grant with `blocked` | not directly proven | passes | none |
| Positive CLI `--packet-id` | indirect evidence only | directly proven | none |

## Final Plan Review

- Scope check: all changes are inside PKT-26 A10 closeout-ledger and Conductor delegation authority surfaces.
- No broad refactor: does not redesign the event store; only adds one service-owned trusted grant table and moves A10 consumption to it.
- No approval expansion: this does not grant Conductor approval authority. It only validates the presence of a scoped Human delegation record for loop-threshold judgment.
- Direct event risk: direct event payloads become audit-only for A10 authority and no longer satisfy closeout.
- Same-process risk: Python cannot provide a hard hostile same-process security boundary. The implemented boundary will be service/API misuse prevention: generic event writers and raw grant writers cannot create trusted A10 delegation authority; the trusted command/service path can.
- Evidence gap coverage: plan includes positive `planner_route`, `blocked`, and CLI `--packet-id` tests so final closeout does not rely on narrowed wording.

## Execution Decision

Human Owner approved exactly one final loop. Developer execution may proceed once Orchestrator records the final-loop handoff.
