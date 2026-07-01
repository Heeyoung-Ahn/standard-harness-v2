# PKT-25 Closeout Challenge Review - Remediation 4

- Lens id: `challenge_review`
- Agent id: not available in runtime
- Date: 2026-07-01
- Status: HOLD

## Sources Read

- `.agents/rules/HARNESS_OPERATING_CONTRACT.md`
- `.agents/rules/agent_behavior.md`
- `.agents/workflows/reviewer.md`
- `.agents/skills/adversarial_review/SKILL.md`
- `.agents/skills/code_review_checklist/SKILL.md`
- `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md`
- `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md`
- `reference/reports/test/PKT-25_TESTER_REPORT.md`
- `reference/reports/tdd/PKT-25-provider-topology-red-green.md`
- `starter/standard-harness/_harness/system/standard_harness/workflow/conductor_worker_e2e.py`
- `starter/standard-harness/_harness/system/standard_harness/cli/main.py`
- `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py`
- `starter/standard-harness/_harness/README.md`

## Current-Turn Verification

- Focused provider topology suite: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 test\test_pkt14_conductor_worker_e2e.py` from `starter/standard-harness/_harness` passed: `Ran 21 tests ... OK`.
- Scoped starter clean-export validation: `PYTHONPATH=system PYTHONDONTWRITEBYTECODE=1 py -3 -m standard_harness.cli.main --json --harness-root .. validate --starter --clean-export` passed with `status=ok`, `diagnostics=[]`, `cleanExportProof=true`.
- Root harness validation could not be freshly reproduced in this shell: both `npm run harness:validate` and `npm.cmd run harness:validate` failed before harness execution because `node` was not visible on PATH. Tester report still records prior root validation evidence as pass.

## Findings

### F1 - Blocking - Project-start Conductor persistence is narrowed to packet-scoped topology evidence

- Source refs:
  - Packet purpose and source intent: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md:9-11`, `:24-25`
  - In-scope and contract rules: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md:103-108`, `:175-179`
  - Acceptance: `reference/packets/PKT-25_PROVIDER_TOPOLOGY_AND_REAL_SMOKE_CONTRACT.md:263`, `:271`
  - CLI implementation: `starter/standard-harness/_harness/system/standard_harness/cli/main.py:654-719`
  - Test evidence: `starter/standard-harness/_harness/test/test_pkt14_conductor_worker_e2e.py:665-723`
  - Developer mapping: `reference/reports/developer/PKT-25_DEVELOPER_REPORT.md:40`, `:48`
- Affected surface: project-level provider topology persistence/reporting, A1, A9, approved Human/Planner intent.
- Challenged claim: A1 and A9 are closeout-ready because `providerTopologyEvidence.projectTopology.conductor.provider=codex` and `provider-topology record/report` cover conductor persistence.
- Weakness: the packet requires a copied project to select a project-level Conductor at project start/init and persist/report `projectTopology.conductor.provider` as project operating state. The implemented CLI persists `provider_topology.recorded` events keyed by `--packet-id` and reports the latest row for that packet. The focused test proves packet-scoped record/report and canonical alias persistence, but it does not prove an init/start-level project Conductor selection, a project-scoped report independent of packet id, or invariance between project-level Conductor and independently varying packet-level roles. This is a scope narrowing from "project-start conductor, packet-level roles" to "packet topology event contains a conductor field."
- LLM convenience pattern: fixture/packet-event evidence is being used to satisfy a project-start operating-flow acceptance item. This is not merely missing wording; it changes the behavioral surface being claimed as complete.
- Required action/evidence: either implement and test a project-start/init-level conductor selection/reporting path, or obtain Planner/user correction that explicitly re-scopes A1/A9 to packet-scoped topology records. Required evidence should show project-level conductor persistence in operating state without requiring a packet id, plus packet-level role assignments that remain independently assignable under that project-level conductor.
- Recommended route: Orchestrator returns to Developer if implementation is required; Planner only if the intended A1/A9 contract is to be changed.

## Acceptance Coverage A1-A10 Judgment

| Acceptance | Judgment | Challenge basis |
|---|---|---|
| A1 | HOLD | Current evidence proves packet-scoped `provider-topology record/report`, not project init/start selection and project-scoped conductor persistence/reporting. |
| A2 | PASS with limitation | Six logical role assignments and both providers are covered by matrix tests and CLI record/report exists, but this does not close A1's project-start gap. |
| A3 | PASS | Focused regression consumes topology-derived Codex Reviewer and avoids the old `Reviewer=claude_code` assumption. |
| A4 | PASS | No-topology legacy reviewer default remains covered by focused suite evidence. |
| A5 | PASS | Unsupported, blank, conflicting, unknown, duplicate, alias, adapter, and nested-field negative cases are fail-closed in tests and implementation. |
| A6 | PASS | Post-remediation evidence includes `evidenceRef`, reviewer id/lens, adapter/provider, readiness state, non-claim status, and mismatch rejection for captured-output records. |
| A7 | PASS | No approval-state mutation path was found; evidence and README keep `approvalStateMutationAllowed=false` as non-approval evidence. |
| A8 | PASS | Current clean-export validation passed with `cleanExportProof=true`; README keeps providers as examples, not product identity. |
| A9 | HOLD | Fixture shows Codex conductor plus mixed packet roles, but because conductor persistence is packet-scoped, it does not prove the first project-start Conductor is recorded as project-level operating state. |
| A10 | PASS | Mixed-provider Reviewer assignments remain separated by reviewer id, lens, provider, evidence refs, and verifier run records. |

## Explicit LLM Convenience Closeout Check

- Scope narrowing: present and blocking for A1/A9. The project-start Conductor contract is narrowed to packet-scoped topology record/report evidence.
- Acceptance reinterpretation: present for A1/A9. "Project init/start can persist and report" is treated as "a packet topology event contains projectTopology.conductor."
- Fixture-only behavior: partially present. A3/A5/A6/A10 fixture coverage is appropriate for the bounded real-smoke contract, but A1/A9 need project-level operating-flow evidence rather than only fixture/packet-event evidence.
- Vocabulary-only conformance: not generally present. The code implements real validation and normalization behavior for topology declarations, aliases, reviewer lenses, evidence refs, and adapter ids. The remaining issue is authority/scope of persistence, not only wording.
- Premature completion claim: present if closeout proceeds without resolving F1.
- Human/Planner intent preservation: not fully preserved until project-start Conductor selection is either implemented as project-scoped operating state or explicitly re-scoped by Planner/user.

## Residual Risks And Limitations

- Real authenticated Codex CLI or Claude Code CLI provider readiness remains out of PKT-25 scope and must not be inferred from captured-output or fixture smoke success.
- I did not modify implementation files. This artifact is packet-bound review evidence only.
- Fresh root `npm` validation was not available in this shell because `node` was not visible; this review relies on the Tester report for prior root validation and on current focused Python plus clean-export validation.
- Existing worktree state is dirty with PKT-25 implementation and report artifacts; this review did not attempt to separate unrelated local state.

## Final Disposition

HOLD.

The post-remediation-4 alias canonicalization itself is acceptable, and most A1-A10 behavior has meaningful code/test evidence. Closeout should not pass because A1/A9 still appear to close a project-start/project-scoped Conductor persistence requirement with packet-scoped topology evidence. Resolve F1 through bounded Developer remediation or an explicit Planner/user scope correction before Reviewer closeout.
