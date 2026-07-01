# PKT-25 Adversarial Security Review Rerun

Packet: `PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT`
Lens: `adversarial_security_review`
Independent agent: `019f1b4f-3e54-7c20-a9dc-3f4352f01deb` / Hypatia
Date: 2026-07-01
Status: HOLD

## Files Reviewed
- `.agents/runtime/ACTIVE_CONTEXT.json`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- `reference/reports/review/PKT-25-closeout-adversarial-security-review.md`
- `reference/reports/review/PKT-25-closeout-challenge-review.md`
- `reference/reports/review/PKT-25_REVIEW_REPORT.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`

## Prior Findings Disposition
- Prior HOLD 1, topology validation completeness: remediated for invalid conductor, unknown role keys, ambiguous non-reviewer lists, duplicate reviewer ids, missing reviewer lens, invalid aliases, adapter mismatch, and legacy/topology conflict.
- Prior HOLD 2, adapter id trust: remediated for evidence emission. Adapter IDs are now validated and normalized from `TOPOLOGY_PROVIDER_ADAPTER_IDS`, not descriptor text.
- Prior HOLD 3, legacy/topology conflict: remediated. Any nonblank `reviewer_provider` plus topology now emits `conflicting_provider_declaration:Reviewer`.
- Approval-state mutation boundary: mostly preserved. Top-level CLI/event/evidence outputs set `approvalStateMutationAllowed=false`.
- Productization, release, and real-provider overclaim: no overclaim found in packet, Tester report, or README.

## New Finding
1. Medium, closeout-blocking unless fixed or explicitly accepted: `provider-topology record/report` can persist and report arbitrary nested assignment fields from untrusted topology JSON, including authority-looking fields. `_normalized_topology_assignment` copies assignment fields and only rewrites `provider` and `adapterId`, so nested values such as `approvalStateMutationAllowed: true` or `authority` could survive into persisted topology and `provider-topology report`.

Required correction:
- Whitelist allowed topology assignment fields or fail closed on unknown/authority-like fields.
- Add a negative CLI test proving nested approval/authority claims are rejected or stripped.

## Residual Risks
- Real authenticated Codex CLI / Claude Code CLI readiness remains untested and correctly out of PKT-25 scope.
- Captured evidence scanning remains pattern-based, not complete DLP.

## Final Status
HOLD. Prior security HOLD findings are substantially remediated, but command/persistence input validation requires one additional Developer remediation before Reviewer closeout.
