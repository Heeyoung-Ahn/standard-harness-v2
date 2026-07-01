# PKT-25 Closeout Challenge Review

Agent: `019f1b3a-1118-7c61-87dd-833cb42589c3` / Faraday
Lens: `challenge_review`
Status: hold
Date: 2026-07-01

## Files Reviewed
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`
- `.agents/workflows/reviewer.md`
- `.agents/workflows/orchestrator.md`
- `.agents/artifacts/REQUIREMENTS.md`
- `.agents/artifacts/ARCHITECTURE_GUIDE.md`
- `reference/artifacts/PACKET_EXIT_QUALITY_GATE.md`

## Findings
1. High: A1/A2 were narrowed from first-class schema/persistence/CLI contract to descriptor-level real-smoke fixture evidence. The packet requires setting/reading project conductor and packet role assignments through persistence/CLI surfaces, but the implementation only consumes `--command-descriptor-json` in the existing `conductor-worker-e2e` command and Developer maps A1 to fixture coverage only. Required action: add or explicitly Planner-rescope durable topology persistence/reporting command surfaces.
2. High: A2 matrix coverage is incomplete. The packet requires all six logical roles against both `codex` and `claude_code`; the current fixture proves role presence and mixed Reviewers but not both providers for every logical role. Required action: add true role-provider matrix tests or rescope A2.
3. High: A5/A6 negative and evidence-matching requirements are only partially covered. Current diagnostics cover unsupported, blank, and legacy conflict only. Required action: add fail-closed cases for duplicate/ambiguous role assignment, duplicate reviewer ids, missing reviewer lens, invalid aliases, and role/provider evidence mismatch.
4. Medium: A8 starter validation is weakened by substituting manual file checks after the formal payload-boundary command failed. Required action: run the correct starter validation scope or get Planner disposition that substitute evidence is sufficient.
5. Medium: Review evidence path is stale/misleading. `reference/artifacts/REVIEW_REPORT.md` is not packet-bound PKT-25 closeout evidence. Required action: use packet-bound review evidence.

## Acceptance Coverage
- A1: hold.
- A2: hold.
- A3: pass.
- A4: pass.
- A5: hold.
- A6: hold.
- A7: partial pass.
- A8: hold.
- A9: partial pass.
- A10: partial pass.

## Residual Risks
- Fixture-level success may be mistaken for durable starter topology behavior.
- The old `reviewer_provider` workaround is reduced but not fully replaced by a first-class persisted topology surface.
- Current evidence supports continued remediation, not Reviewer closeout or Planner closeout.

## Disposition
Hold. No release, productization, starter promotion, or real-provider readiness is claimed.

