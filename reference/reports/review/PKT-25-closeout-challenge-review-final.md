# PKT-25 Challenge Review Final Rerun

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
Lens: `challenge_review`
Independent agent: `019f1b62-fed2-7cf1-b882-69c0d56179d9` / Kant
Date: 2026-07-01
Status: HOLD

## Files Reviewed
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- Developer, Tester, and TDD reports
- All `reference/reports/review/PKT-25-closeout-*.md` review reports
- Changed starter `_harness` CLI, workflow, tests, and README

## Findings
1. Blocking: A6 evidence envelope is still not contract-complete. `providerTopologyEvidence.roleAssignments` omits per-role `evidenceRef`, and capture matching does not validate captured `review_lens`. `_find_capture_record` matches only role/provider/adapter/reviewer id, and `_normalize_capture_record` injects the declared route lens.
2. Blocking: nested authority-field fail-closed remediation is incomplete for worker aliases. Assignment fields are whitelisted, but `workerAliases` are copied directly into normalized durable topology records, and alias diagnostics do not reject nested fields such as `approvalStateMutationAllowed`.

## Acceptance Coverage
| ID | Status |
|---|---|
| A1 | Pass: durable `provider-topology record/report` exists. |
| A2 | Pass: six-role matrix covers both providers. |
| A3 | Pass: codex/codex reviewer hardcode regression covered. |
| A4 | Pass: no-topology default behavior preserved. |
| A5 | HOLD: nested authority fields still pass through worker aliases. |
| A6 | HOLD: missing per-role `evidenceRef`; reviewer lens not validated from capture. |
| A7 | Pass: approval mutation remains false/read-only. |
| A8 | Pass with local rerun caveat: Tester reports clean-export pass. |
| A9 | Pass: Codex conductor with independent packet role providers covered. |
| A10 | Pass with A6 caveat: mixed reviewers are separated, but lens/evidence validation is incomplete. |

## Residual Risks
- Real authenticated Codex/Claude provider readiness, release, productization, starter promotion, and UAT remain correctly unproven and out of scope.

## Final Status
HOLD.
